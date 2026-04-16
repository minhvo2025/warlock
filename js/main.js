// ── Game Loop ─────────────────────────────────────────────────
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  update(dt);

  if (window.outraThree && window.outraThree.update) {
    window.outraThree.update(dt);
  }

  render();
  requestAnimationFrame(loop);
}

// ── Init ──────────────────────────────────────────────────────
const resetMoveStick = makeStickController(moveJoystick, moveJoystickThumb, moveStick);

async function boot() {
  if (window.outraThree && window.outraThree.init) {
    window.outraThree.init();
  }

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
  buildRankedPanel();
  buildKeybindsUI();
  renderStore();
  renderInventory();

  nameInput.value = player.name;
  player.score = getPlayerPoints(player.name);
  if (typeof window.refreshLeaderboardFromSupabase === 'function') {
    window.refreshLeaderboardFromSupabase({ force: true })
      .catch((error) => {
        console.warn('[leaderboard] initial Supabase sync failed:', error);
      });
  }

  renderLeaderboard();
  updateAimSensitivityUI();
  updateMusicVolumeUI();
  updatePerformanceModeUI();
  setMusicMuted(musicMuted);

  if (window.outraMultiplayer && typeof window.outraMultiplayer.connect === 'function') {
    window.outraMultiplayer.connect();
  }
  if (window.outraPhaseAssets && typeof window.outraPhaseAssets.init === 'function') {
    window.outraPhaseAssets.init();
  }
  drawLobbyPreview();
  updateHud();
  resetMoveStick();
  enterLobby();
  refreshMobileControls();

  requestAnimationFrame(loop);
}

boot();
