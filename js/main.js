// ── Game Loop ─────────────────────────────────────────────────
const perfOverlayEl = document.getElementById('perfOverlay');
const perfOverlayState = {
  sampleStartedAt: performance.now(),
  frameCount: 0,
  fps: 0,
  frameMsEma: 0,
  text: '',
  visible: false,
};

function smoothPerfMetric(currentValue, nextValue, alpha = 0.16) {
  const safeNext = Math.max(0, Math.min(250, Number(nextValue) || 0));
  if (currentValue <= 0) return safeNext;
  return currentValue + (safeNext - currentValue) * alpha;
}

function isPerfOverlayInGameContext() {
  if (gameState === 'playing' || gameState === 'result' || gameState === 'draft') return true;

  const api = window.outraMultiplayer;
  if (!api || typeof api.getPresentationSnapshot !== 'function') return false;
  const snapshot = api.getPresentationSnapshot();
  return !!(
    snapshot &&
    snapshot.active &&
    (snapshot.isArenaActive || snapshot.isArenaPending || snapshot.isDraftActive || snapshot.isMatchEnd)
  );
}

function updatePerfOverlay(rawFrameMs, nowMs) {
  if (!perfOverlayEl) return;

  perfOverlayState.frameMsEma = smoothPerfMetric(perfOverlayState.frameMsEma, rawFrameMs);

  perfOverlayState.frameCount += 1;
  const elapsedMs = Math.max(1, nowMs - perfOverlayState.sampleStartedAt);
  if (elapsedMs >= 250) {
    perfOverlayState.fps = (perfOverlayState.frameCount * 1000) / elapsedMs;
    perfOverlayState.frameCount = 0;
    perfOverlayState.sampleStartedAt = nowMs;

    const nextText =
      `FPS ${Math.max(0, perfOverlayState.fps).toFixed(0)} | ${Math.max(0, perfOverlayState.frameMsEma).toFixed(1)}ms`;
    if (nextText !== perfOverlayState.text) {
      perfOverlayState.text = nextText;
      perfOverlayEl.textContent = nextText;
    }
  }

  const shouldShow = isPerfOverlayInGameContext();
  if (shouldShow !== perfOverlayState.visible) {
    perfOverlayState.visible = shouldShow;
    perfOverlayEl.style.display = shouldShow ? 'block' : 'none';
  }
}

function loop(now) {
  const rawFrameMs = Math.max(0, now - lastTime);
  const dt = Math.min(rawFrameMs / 1000, 0.033);
  lastTime = now;

  update(dt);
  render();
  updatePerfOverlay(rawFrameMs, now);
  requestAnimationFrame(loop);
}

// ── Init ──────────────────────────────────────────────────────
const resetMoveStick = makeStickController(moveJoystick, moveJoystickThumb, moveStick);

async function boot() {
  if (typeof initCustomMouseCursor === 'function') {
    initCustomMouseCursor();
  }

  loadProfile();
  if (window.outraPlayerService && typeof window.outraPlayerService.initPlayer === 'function') {
    try {
      const playerProfile = await window.outraPlayerService.initPlayer();
      if (playerProfile) {
        console.log('[Supabase] Player profile loaded:', playerProfile);
      }
    } catch (error) {
      console.error('[Supabase] initPlayer failed:', error);
    }
  }

  applyPlayerColors();
  resizeCanvas();

  nameInput.value = player.name;
  player.score = getPlayerPoints(player.name);
  if (typeof window.refreshLeaderboardFromSupabase === 'function') {
    window.refreshLeaderboardFromSupabase({ force: true })
      .catch((error) => {
        console.warn('[leaderboard] initial Supabase sync failed:', error);
      });
  }

  updateAimSensitivityUI();
  updateMusicVolumeUI();
  updateSoundVolumeUI();
  setMusicMuted(musicMuted);

  if (window.outraMultiplayer && typeof window.outraMultiplayer.connect === 'function') {
    window.outraMultiplayer.connect();
  }
  if (window.outraPhaseAssets && typeof window.outraPhaseAssets.init === 'function') {
    window.outraPhaseAssets.init();
  }
  resetMoveStick();
  enterLobby();

  requestAnimationFrame(loop);
}

boot();
