// ── Persistence ───────────────────────────────────────────────
function saveProfile() {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      name: player.name,
      selectedColorIndex,
      keybinds,
      profile
    }));
  } catch (error) {
    console.warn('[profile] failed to save profile to localStorage', error);
  }
}

function loadProfile() {
  try {
    let raw = localStorage.getItem(PROFILE_KEY);
    let usedLegacy = false;

    if (!raw) {
      raw = localStorage.getItem(LEGACY_PROFILE_KEY);
      usedLegacy = !!raw;
    }

    if (!raw) return;

    const data = JSON.parse(raw);

    if (data.name) player.name = String(data.name).slice(0, 16);

    if (Number.isInteger(data.selectedColorIndex)) {
      selectedColorIndex = data.selectedColorIndex;
    }

    if (data.keybinds && typeof data.keybinds === 'object') {
      keybinds = { ...defaultBinds, ...data.keybinds };
    }

if (data.profile && typeof data.profile === 'object') {
  profile.wlk = Number(data.profile.wlk) || 0;
  profile.musicMuted = !!data.profile.musicMuted;

  if (typeof data.profile.musicVolume === 'number') {
    profile.musicVolume = Math.min(1, Math.max(0, data.profile.musicVolume));
  }

  if (typeof data.profile.soundVolume === 'number') {
    profile.soundVolume = Math.min(1, Math.max(0, data.profile.soundVolume));
  }

  if (typeof data.profile.aimSensitivity === 'number') {
    profile.aimSensitivity = data.profile.aimSensitivity;
  }

  if (data.profile.ranked && typeof data.profile.ranked === 'object') {
        profile.ranked = normalizeRankedProfile(data.profile.ranked);
      }

      profile.store = { ...profile.store, ...(data.profile.store || {}) };
      profile.equipped = { ...profile.equipped, ...(data.profile.equipped || {}) };
    }

    const characterItems = Array.isArray(storeItems)
      ? storeItems.filter((item) => item && item.type === 'character')
      : [];
    if (characterItems.length) {
      const starterCharacterId = String(characterItems[0].id || '').trim();
      if (starterCharacterId && !profile.store[starterCharacterId]) {
        profile.store[starterCharacterId] = true;
      }

      const equippedCharacterId = String(profile?.equipped?.character || '').trim();
      const equippedCharacterOwned = !!(equippedCharacterId && profile.store[equippedCharacterId]);
      if (!equippedCharacterOwned) {
        const firstOwnedCharacter = characterItems.find((item) => profile.store[item.id]);
        profile.equipped.character = firstOwnedCharacter
          ? firstOwnedCharacter.id
          : starterCharacterId;
      }
    }

    if (usedLegacy) {
      saveProfile();
    }
  } catch {}

musicMuted = profile.musicMuted;

if (typeof profile.musicVolume !== 'number') {
  profile.musicVolume = 0.38;
}
profile.musicVolume = Math.min(1, Math.max(0, profile.musicVolume));

if (typeof profile.soundVolume !== 'number') {
  profile.soundVolume = 1;
}
profile.soundVolume = Math.min(1, Math.max(0, profile.soundVolume));

if (typeof profile.aimSensitivity !== 'number') profile.aimSensitivity = 0.7;
profile.ranked = normalizeRankedProfile(profile.ranked);
}

// ── Leaderboard ───────────────────────────────────────────────
const CUSTOM_MOUSE_CURSOR_SRC = '/docs/art/dagger.png';
const CUSTOM_MOUSE_CURSOR_MAX_SIZE = Number.POSITIVE_INFINITY;
const CUSTOM_MOUSE_CURSOR_ALPHA_THRESHOLD = 18;
const CURSOR_SWEEP_INTERVAL_MS = 10000;
const CURSOR_SWEEP_DURATION_MS = 850;
const CURSOR_SWEEP_FRAME_INTERVAL_MS = 70;
const CURSOR_SWEEP_ANGLE_RAD = -0.62;
const cursorSweepState = {
  baseCanvas: null,
  baseDataUrl: '',
  hotspotX: 0,
  hotspotY: 0,
  rafId: 0,
  intervalId: 0,
  active: false,
};

function clampCursorNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCursorCssVarName(mode) {
  if (mode === 'menu') return '--outra-cursor-menu';
  if (mode === 'pointer') return '--outra-cursor-pointer';
  if (mode === 'crosshair') return '--outra-cursor-crosshair';
  return '--outra-cursor-default';
}

function getCanvasCursorModeValue(mode = 'default') {
  const cssVarName = getCursorCssVarName(mode);
  const computed = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
  if (computed) return computed;
  if (mode === 'menu') return 'pointer';
  if (mode === 'pointer') return 'pointer';
  if (mode === 'crosshair') return 'crosshair';
  return 'default';
}

function setCanvasCursorMode(mode = 'default') {
  if (!canvas) return;
  if (isTouchDevice) {
    canvas.style.removeProperty('cursor');
    canvas.style.cursor = 'default';
    return;
  }
  if (mode === 'crosshair') {
    // We render a custom in-canvas reticle, so hide the OS cursor in combat.
    // Use !important so this still wins if a global menu cursor class is active.
    canvas.style.setProperty('cursor', 'none', 'important');
    return;
  }
  // Drop any previous !important override from crosshair mode.
  canvas.style.removeProperty('cursor');
  canvas.style.cursor = getCanvasCursorModeValue(mode);
}

function syncCursorPhaseClass() {
  if (typeof document === 'undefined' || !document.body) return;
  const multiplayerSnapshot = getMultiplayerPresentationSnapshot();
  const multiplayerArenaActive = !!(multiplayerSnapshot && multiplayerSnapshot.isArenaActive);
  const multiplayerDraftActive = !!(multiplayerSnapshot && multiplayerSnapshot.isDraftActive);
  const isLobbyOrDraft =
    !multiplayerArenaActive &&
    (gameState === 'lobby' || gameState === 'draft' || multiplayerDraftActive);
  document.body.classList.toggle('cursorCustomLobbyDraft', isLobbyOrDraft);
}

function setCustomMouseCursorCssVars(dataUrl, hotspotX, hotspotY) {
  if (!dataUrl) return;

  const x = Math.max(0, Math.round(hotspotX));
  const y = Math.max(0, Math.round(hotspotY));
  const rootStyle = document.documentElement.style;
  const cursorBase = `url("${dataUrl}") ${x} ${y}`;

  rootStyle.setProperty('--outra-cursor-menu', `${cursorBase}, pointer`);
}

function applyCustomMenuCursorFromDataUrl(dataUrl) {
  if (!dataUrl) return;
  setCustomMouseCursorCssVars(
    dataUrl,
    cursorSweepState.hotspotX,
    cursorSweepState.hotspotY
  );
}

function buildCustomCursorSweepFrameDataUrl(progress) {
  const baseCanvas = cursorSweepState.baseCanvas;
  if (!baseCanvas || !Number.isFinite(progress)) return cursorSweepState.baseDataUrl;

  const width = Math.max(1, baseCanvas.width);
  const height = Math.max(1, baseCanvas.height);
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;
  const frameCtx = frameCanvas.getContext('2d');
  if (!frameCtx) return cursorSweepState.baseDataUrl;

  frameCtx.clearRect(0, 0, width, height);
  frameCtx.drawImage(baseCanvas, 0, 0, width, height);

  const sweepCanvas = document.createElement('canvas');
  sweepCanvas.width = width;
  sweepCanvas.height = height;
  const sweepCtx = sweepCanvas.getContext('2d');
  if (!sweepCtx) return frameCanvas.toDataURL('image/png');

  const sweepHalfWidth = Math.max(3, width * 0.26);
  const sweepTravel = width * 2.6;
  const sweepCenter = (-width * 0.8) + (progress * sweepTravel);
  sweepCtx.clearRect(0, 0, width, height);
  sweepCtx.save();
  sweepCtx.translate(width * 0.5, height * 0.5);
  sweepCtx.rotate(CURSOR_SWEEP_ANGLE_RAD);
  const gradient = sweepCtx.createLinearGradient(
    sweepCenter - sweepHalfWidth,
    0,
    sweepCenter + sweepHalfWidth,
    0
  );
  gradient.addColorStop(0, 'rgba(118,38,255,0)');
  gradient.addColorStop(0.32, 'rgba(74,0,184,0.72)');
  gradient.addColorStop(0.46, 'rgba(128,30,255,0.92)');
  gradient.addColorStop(0.5, 'rgba(190,92,255,1)');
  gradient.addColorStop(0.54, 'rgba(128,30,255,0.94)');
  gradient.addColorStop(0.68, 'rgba(74,0,184,0.76)');
  gradient.addColorStop(1, 'rgba(118,38,255,0)');
  sweepCtx.fillStyle = gradient;
  sweepCtx.fillRect(-width * 1.8, -height * 1.8, width * 3.6, height * 3.6);
  sweepCtx.restore();
  sweepCtx.globalCompositeOperation = 'destination-in';
  sweepCtx.drawImage(baseCanvas, 0, 0, width, height);

  frameCtx.save();
  frameCtx.globalCompositeOperation = 'screen';
  frameCtx.drawImage(sweepCanvas, 0, 0, width, height);
  frameCtx.globalCompositeOperation = 'lighter';
  frameCtx.globalAlpha = 0.62;
  frameCtx.drawImage(sweepCanvas, 0, 0, width, height);
  frameCtx.restore();
  return frameCanvas.toDataURL('image/png');
}

function triggerCustomCursorSweep() {
  if (!cursorSweepState.baseCanvas || cursorSweepState.active) return;
  cursorSweepState.active = true;
  const startMs = performance.now();
  let lastRenderedAt = -Infinity;
  const animate = (nowMs) => {
    const progress = Math.max(0, Math.min(1, (nowMs - startMs) / CURSOR_SWEEP_DURATION_MS));
    if ((nowMs - lastRenderedAt) >= CURSOR_SWEEP_FRAME_INTERVAL_MS || progress >= 1) {
      const frameDataUrl = buildCustomCursorSweepFrameDataUrl(progress);
      applyCustomMenuCursorFromDataUrl(frameDataUrl);
      lastRenderedAt = nowMs;
    }
    if (progress < 1) {
      cursorSweepState.rafId = requestAnimationFrame(animate);
      return;
    }
    cursorSweepState.rafId = 0;
    cursorSweepState.active = false;
    applyCustomMenuCursorFromDataUrl(cursorSweepState.baseDataUrl);
  };
  cursorSweepState.rafId = requestAnimationFrame(animate);
}

function startCustomCursorSweepLoop() {
  if (typeof window === 'undefined') return;
  if (cursorSweepState.intervalId) {
    window.clearInterval(cursorSweepState.intervalId);
  }
  cursorSweepState.intervalId = window.setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    triggerCustomCursorSweep();
  }, CURSOR_SWEEP_INTERVAL_MS);
}

function findCursorImageMetrics(imageData, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let tipX = Number.POSITIVE_INFINITY;
  let tipY = Number.POSITIVE_INFINITY;
  let found = false;

  const pixels = imageData.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha < CUSTOM_MOUSE_CURSOR_ALPHA_THRESHOLD) continue;

      found = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      if ((x + y) < (tipX + tipY)) {
        tipX = x;
        tipY = y;
      }
    }
  }

  if (!found) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    tipX,
    tipY,
  };
}

function initCustomMouseCursor() {
  if (isTouchDevice || typeof document === 'undefined') return;

  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    const srcW = Math.max(1, img.naturalWidth || img.width || 1);
    const srcH = Math.max(1, img.naturalHeight || img.height || 1);

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = srcW;
    sourceCanvas.height = srcH;
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sourceCtx) return;

    sourceCtx.clearRect(0, 0, srcW, srcH);
    sourceCtx.drawImage(img, 0, 0, srcW, srcH);
    const imageData = sourceCtx.getImageData(0, 0, srcW, srcH);
    const metrics = findCursorImageMetrics(imageData, srcW, srcH);
    if (!metrics) return;

    const rawCropW = (metrics.maxX - metrics.minX + 1);
    const rawCropH = (metrics.maxY - metrics.minY + 1);
    const margin = Math.max(1, Math.round(Math.min(rawCropW, rawCropH) * 0.04));
    const cropX = Math.max(0, metrics.minX - margin);
    const cropY = Math.max(0, metrics.minY - margin);
    const cropW = Math.min(srcW - cropX, rawCropW + margin * 2);
    const cropH = Math.min(srcH - cropY, rawCropH + margin * 2);

    const scale = Math.min(1, CUSTOM_MOUSE_CURSOR_MAX_SIZE / Math.max(cropW, cropH));
    const outW = Math.max(8, Math.round(cropW * scale));
    const outH = Math.max(8, Math.round(cropH * scale));

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outW;
    outputCanvas.height = outH;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    outputCtx.imageSmoothingEnabled = true;
    outputCtx.clearRect(0, 0, outW, outH);
    outputCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

    const hotspotX = clampCursorNumber(
      Math.round((metrics.tipX - cropX) * (outW / cropW)),
      0,
      outW - 1
    );
    const hotspotY = clampCursorNumber(
      Math.round((metrics.tipY - cropY) * (outH / cropH)),
      0,
      outH - 1
    );
    const cursorDataUrl = outputCanvas.toDataURL('image/png');

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = outW;
    baseCanvas.height = outH;
    const baseCtx = baseCanvas.getContext('2d');
    if (baseCtx) {
      baseCtx.imageSmoothingEnabled = true;
      baseCtx.clearRect(0, 0, outW, outH);
      baseCtx.drawImage(outputCanvas, 0, 0, outW, outH);
      cursorSweepState.baseCanvas = baseCanvas;
    } else {
      cursorSweepState.baseCanvas = outputCanvas;
    }
    cursorSweepState.baseDataUrl = cursorDataUrl;
    cursorSweepState.hotspotX = hotspotX;
    cursorSweepState.hotspotY = hotspotY;
    applyCustomMenuCursorFromDataUrl(cursorSweepState.baseDataUrl);
    startCustomCursorSweepLoop();

    const mode = gameState === 'playing'
      ? 'crosshair'
      : gameState === 'draft'
      ? 'pointer'
      : 'default';
    setCanvasCursorMode(mode);
  };
  img.src = CUSTOM_MOUSE_CURSOR_SRC;
}

const LEADERBOARD_POINT_DELTA = 3;
const LEADERBOARD_MAX_ENTRIES = 1000;
const LEADERBOARD_FETCH_COOLDOWN_MS = 15000;
let leaderboardEntriesCache = [];
let leaderboardCacheInitialized = false;
let leaderboardFetchPromise = null;
let leaderboardHasSupabaseHydrated = false;
let leaderboardLastFetchAt = 0;

function normalizeLeaderboardName(name, fallback = 'Player') {
  const base = String(name || '').replace(/\s+/g, ' ').trim();
  const picked = base || String(fallback || '').trim() || 'Player';
  return picked.slice(0, 16);
}

function normalizeLeaderboardEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const displayName = normalizeLeaderboardName(raw.display_name ?? raw.name, 'Player');
  const userId = String(raw.user_id ?? raw.userId ?? '').trim();
  const points = Math.max(0, Math.floor(Number(raw.leaderboard_points ?? raw.points) || 0));
  const wins = Math.max(0, Math.floor(Number(raw.wins) || 0));
  const losses = Math.max(0, Math.floor(Number(raw.losses) || 0));
  const createdAt = String(raw.created_at ?? raw.createdAt ?? '').trim();
  const updatedAt = String(raw.updated_at ?? raw.updatedAt ?? '').trim();
  return {
    user_id: userId,
    name: displayName,
    points,
    wins,
    losses,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function sortLeaderboardEntries(entries) {
  entries.sort((a, b) => {
    const pointsDiff = (b.points || 0) - (a.points || 0);
    if (pointsDiff !== 0) return pointsDiff;
    const winsDiff = (b.wins || 0) - (a.wins || 0);
    if (winsDiff !== 0) return winsDiff;
    const createdA = Date.parse(a.created_at || '') || Number.MAX_SAFE_INTEGER;
    const createdB = Date.parse(b.created_at || '') || Number.MAX_SAFE_INTEGER;
    if (createdA !== createdB) return createdA - createdB;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  return entries;
}

function ensureLeaderboardCacheInitialized() {
  if (leaderboardCacheInitialized) return;
  leaderboardCacheInitialized = true;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let usedLegacy = false;
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      usedLegacy = !!raw;
    }

    const parsed = raw ? JSON.parse(raw) : [];
    const entries = Array.isArray(parsed)
      ? parsed.map((entry) => normalizeLeaderboardEntry(entry)).filter(Boolean)
      : [];
    leaderboardEntriesCache = sortLeaderboardEntries(entries);
    if (usedLegacy) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboardEntriesCache));
    }
  } catch (_error) {
    leaderboardEntriesCache = [];
  }
}

function saveLeaderboard(entries) {
  ensureLeaderboardCacheInitialized();
  const normalized = (Array.isArray(entries) ? entries : [])
    .map((entry) => normalizeLeaderboardEntry(entry))
    .filter(Boolean);
  leaderboardEntriesCache = sortLeaderboardEntries(normalized);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboardEntriesCache));
  } catch (_error) {
    // ignore storage failures
  }
}

function getLeaderboard() {
  ensureLeaderboardCacheInitialized();
  refreshLeaderboardFromSupabase();
  return leaderboardEntriesCache.slice();
}

function getCurrentLeaderboardIdentity() {
  const userId = String(window.playerProfile?.user_id || '').trim();
  const displayName = normalizeLeaderboardName(player?.name || window.playerProfile?.display_name || 'Player', 'Player');
  return { userId, displayName };
}

function findLeaderboardEntry(entries, userId, displayName) {
  if (!Array.isArray(entries)) return null;
  if (userId) {
    const byUserId = entries.find((entry) => String(entry.user_id || '').trim() === userId);
    if (byUserId) return byUserId;
  }
  const normalizedName = normalizeLeaderboardName(displayName, 'Player').toLowerCase();
  return entries.find((entry) => normalizeLeaderboardName(entry.name, 'Player').toLowerCase() === normalizedName) || null;
}

function mergeLeaderboardRow(row) {
  const normalized = normalizeLeaderboardEntry(row);
  if (!normalized) return null;

  const entries = getLeaderboard();
  const existing = findLeaderboardEntry(entries, normalized.user_id, normalized.name);
  if (existing) {
    existing.user_id = normalized.user_id || existing.user_id;
    existing.name = normalized.name || existing.name;
    existing.points = normalized.points;
    existing.wins = normalized.wins;
    existing.losses = normalized.losses;
    existing.created_at = normalized.created_at || existing.created_at;
    existing.updated_at = normalized.updated_at || existing.updated_at;
  } else {
    entries.push(normalized);
  }
  saveLeaderboard(entries);
  return normalized;
}

function refreshLeaderboardFromSupabase(options = {}) {
  const force = !!options.force;
  if (!force && leaderboardFetchPromise) return leaderboardFetchPromise;
  if (!force && leaderboardHasSupabaseHydrated && (Date.now() - leaderboardLastFetchAt) < LEADERBOARD_FETCH_COOLDOWN_MS) {
    return Promise.resolve(leaderboardEntriesCache.slice());
  }

  const playerService = window.outraPlayerService;
  const fetchFn = typeof playerService?.fetchLeaderboard === 'function'
    ? playerService.fetchLeaderboard
    : null;
  if (!fetchFn) return Promise.resolve(leaderboardEntriesCache.slice());

  leaderboardFetchPromise = (async () => {
    try {
      const rows = await fetchFn({ limit: LEADERBOARD_MAX_ENTRIES });
      if (Array.isArray(rows)) {
        saveLeaderboard(rows);
        leaderboardHasSupabaseHydrated = true;
        leaderboardLastFetchAt = Date.now();
        const { userId, displayName } = getCurrentLeaderboardIdentity();
        const myEntry = findLeaderboardEntry(leaderboardEntriesCache, userId, displayName);
        player.score = myEntry ? myEntry.points : 0;
        if (typeof renderLeaderboard === 'function') {
          renderLeaderboard();
        }
      }
      return leaderboardEntriesCache.slice();
    } catch (error) {
      console.warn('[leaderboard] failed to refresh from Supabase:', error);
      return leaderboardEntriesCache.slice();
    } finally {
      leaderboardFetchPromise = null;
    }
  })();

  return leaderboardFetchPromise;
}

async function applyLeaderboardMatchResult(didWin, options = {}) {
  didWin = !!didWin;
  ensureLeaderboardCacheInitialized();

  const { userId, displayName } = getCurrentLeaderboardIdentity();
  const nowIso = new Date().toISOString();
  const entries = getLeaderboard();
  let entry = findLeaderboardEntry(entries, userId, displayName);
  if (!entry) {
    entry = {
      user_id: userId,
      name: displayName,
      points: 0,
      wins: 0,
      losses: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };
    entries.push(entry);
  }

  entry.user_id = userId || entry.user_id || '';
  entry.name = displayName;
  entry.wins = Math.max(0, Math.floor(Number(entry.wins) || 0) + (didWin ? 1 : 0));
  entry.losses = Math.max(0, Math.floor(Number(entry.losses) || 0) + (didWin ? 0 : 1));
  entry.points = Math.max(0, Math.floor(Number(entry.points) || 0) + (didWin ? LEADERBOARD_POINT_DELTA : -LEADERBOARD_POINT_DELTA));
  entry.updated_at = nowIso;
  if (!entry.created_at) entry.created_at = nowIso;

  saveLeaderboard(entries);
  player.score = entry.points;
  if (typeof saveProfile === 'function') saveProfile();
  if (typeof renderLeaderboard === 'function') renderLeaderboard();
  if (typeof updateHud === 'function') updateHud();

  const playerService = window.outraPlayerService;
  const applyFn = typeof playerService?.applyLeaderboardMatchResult === 'function'
    ? playerService.applyLeaderboardMatchResult
    : null;
  if (!applyFn) return entry;

  try {
    const persisted = await applyFn(didWin ? 'win' : 'loss', {
      displayName,
      matchId: String(options?.matchId || '').trim(),
      source: String(options?.source || '').trim(),
    });
    if (!persisted) return entry;
    const merged = mergeLeaderboardRow({
      user_id: persisted.user_id,
      display_name: persisted.display_name,
      leaderboard_points: persisted.leaderboard_points,
      wins: persisted.wins,
      losses: persisted.losses,
      created_at: persisted.created_at,
      updated_at: persisted.updated_at,
    });
    if (merged) {
      player.score = merged.points;
      if (typeof saveProfile === 'function') saveProfile();
      if (typeof renderLeaderboard === 'function') renderLeaderboard();
      if (typeof updateHud === 'function') updateHud();
    }
    return merged || entry;
  } catch (error) {
    console.warn('[leaderboard] Supabase apply failed, kept local session values:', error);
    return entry;
  }
}

function awardWinRewards(name) {
  const safeName = normalizeLeaderboardName(name, player?.name || 'Player');
  if (safeName && player && typeof player === 'object') {
    player.name = safeName;
  }
  void applyLeaderboardMatchResult(true, { source: 'offline_win' });
}

function getPlayerPoints(name) {
  const entries = getLeaderboard();
  const userId = String(window.playerProfile?.user_id || '').trim();
  const entry = findLeaderboardEntry(entries, userId, name || player?.name || '');
  return entry ? Math.max(0, Math.floor(Number(entry.points) || 0)) : 0;
}

window.refreshLeaderboardFromSupabase = refreshLeaderboardFromSupabase;

// ── Ranked Helpers ────────────────────────────────────────────
function getRankedResultSummaryLegacyMmr(didWin, before, after, forcedDerank) {
  return `Legacy ranked path disabled (${didWin ? 'win' : 'loss'}).`;
  const parts = [];

  parts.push(`${didWin ? '+' : '-'}${didWin ? RANKED_CONFIG.winMmr : RANKED_CONFIG.lossMmr} MMR`);

  if (after.tier.key !== before.tier.key) {
    if (after.tierIndex > before.tierIndex) {
      parts.push(`PROMOTED TO ${after.tier.name.toUpperCase()}`);
    } else if (forcedDerank || after.tierIndex < before.tierIndex) {
      parts.push(`DERANKED TO ${after.tier.name.toUpperCase()}`);
    }
  } else if (after.promo && !before.promo) {
    parts.push('RANK UP MATCH');
  }

  return parts.join(' • ');
}

function applyRankedMatchResultLegacyMmr(didWin) {
  return applyRankedMatchResult(didWin, { source: 'legacy_redirect' });
  if (!profile.ranked) {
    profile.ranked = { mmr: 0, wins: 0, losses: 0, zeroStarLossBuffer: 0 };
  }

  const before = getRankedSnapshot();

  if (didWin) {
    profile.ranked.wins += 1;
    profile.ranked.mmr += RANKED_CONFIG.winMmr;
    profile.ranked.zeroStarLossBuffer = 0;
  } else {
    profile.ranked.losses += 1;

    const atZeroStars = before.stars <= 0;
    if (atZeroStars) {
      profile.ranked.zeroStarLossBuffer += 1;
    } else {
      profile.ranked.zeroStarLossBuffer = 0;
    }

    profile.ranked.mmr = Math.max(0, profile.ranked.mmr - RANKED_CONFIG.lossMmr);
  }

  let forcedDerank = false;
  const afterLossRaw = getRankedSnapshot();

  if (!didWin) {
    const sameTier = afterLossRaw.tier.key === before.tier.key;
    const stillAtZero = afterLossRaw.stars <= 0;

    if (
      sameTier &&
      stillAtZero &&
      profile.ranked.zeroStarLossBuffer > RANKED_CONFIG.derankProtectionLossesAtZero &&
      before.tierIndex > 0
    ) {
      const tiers = getRankProgressionTiers();
      const prevTier = tiers[before.tierIndex - 1];
      if (prevTier) {
        const prevTierStars = getTierStarCount(prevTier);
        profile.ranked.mmr = prevTier.min + Math.max(0, prevTierStars - 1) * RANKED_CONFIG.mmrPerStar;
        profile.ranked.zeroStarLossBuffer = 0;
        forcedDerank = true;
      }
    }
  }

  const after = getRankedSnapshot();
  saveProfile();
  return getRankedResultSummaryLegacyMmr(didWin, before, after, forcedDerank);
}

// ── Math Helpers ──────────────────────────────────────────────
// Ranked progression uses local runtime state and persists to Supabase when available.
const RANKED_MIN_RANK = 1;
const RANKED_MAX_RANK = 20;
const RANKED_DEFAULT_START_RANK = 20;
const RANKED_WIN_STREAK_BONUS_THRESHOLD = 3;
const RANKED_MULTIPLAYER_WIN_OUT_REWARD = 1;
const RANKED_MULTIPLAYER_LOSS_OUT_REWARD = 0;

function clampRankNumber(rankNumber) {
  return Math.max(RANKED_MIN_RANK, Math.min(RANKED_MAX_RANK, Math.floor(Number(rankNumber) || RANKED_DEFAULT_START_RANK)));
}

function getStarsForRankNumber(rankNumber) {
  const safeRank = clampRankNumber(rankNumber);
  const fromConfig = Number(window.OUTRA_RANKS?.getById?.(String(safeRank))?.stars);
  if (Number.isFinite(fromConfig) && fromConfig >= 0) return Math.floor(fromConfig);
  if (safeRank >= 16) return 2;
  if (safeRank >= 11) return 3;
  return 4;
}

function getRankTierByRankNumber(rankNumber) {
  const safeRank = clampRankNumber(rankNumber);
  const fromConfig = window.OUTRA_RANKS?.getById?.(String(safeRank));
  if (fromConfig) return fromConfig;
  return {
    id: String(safeRank),
    rankNumber: safeRank,
    name: `Rank ${safeRank}`,
    label: `Rank ${safeRank}`,
    stars: getStarsForRankNumber(safeRank),
    badge: window.OUTRA_RANKS?.placeholderBadge || '/docs/art/ranks/20.png',
  };
}

function createDefaultRankedProfile() {
  return {
    currentRank: RANKED_DEFAULT_START_RANK,
    currentStars: 0,
    winStreak: 0,
    wins: 0,
    losses: 0,
    totalMatches: 0,
    highestRank: RANKED_DEFAULT_START_RANK,
    lastProcessedMatchId: '',
  };
}

function buildRankedFromLegacyMmr(legacyRanked) {
  const defaultProfile = createDefaultRankedProfile();
  const mmr = Math.max(0, Number(legacyRanked?.mmr) || 0);
  const wins = Math.max(0, Number(legacyRanked?.wins) || 0);
  const losses = Math.max(0, Number(legacyRanked?.losses) || 0);
  const tier = window.OUTRA_RANKS?.getByMmr?.(mmr);
  const rankNumber = clampRankNumber(Number(tier?.rankNumber) || defaultProfile.currentRank);
  const tierMin = Number(tier?.minMmr);
  const mmrPerStar = Math.max(1, Number(window.OUTRA_RANKS?.mmrPerStar) || 20);
  const maxStars = getStarsForRankNumber(rankNumber);
  const stars = Number.isFinite(tierMin)
    ? Math.min(maxStars, Math.max(0, Math.floor((mmr - tierMin) / mmrPerStar)))
    : 0;
  return {
    ...defaultProfile,
    currentRank: rankNumber,
    currentStars: stars,
    wins,
    losses,
    totalMatches: Math.max(wins + losses, Number(legacyRanked?.totalMatches) || 0),
    highestRank: rankNumber,
  };
}

function normalizeRankedProfile(rawRanked) {
  const defaultProfile = createDefaultRankedProfile();
  if (!rawRanked || typeof rawRanked !== 'object') return { ...defaultProfile };

  const hasNewFormat = Number.isFinite(Number(rawRanked.currentRank));
  if (!hasNewFormat && Number.isFinite(Number(rawRanked.mmr))) {
    return buildRankedFromLegacyMmr(rawRanked);
  }

  const currentRank = clampRankNumber(rawRanked.currentRank);
  const maxStars = getStarsForRankNumber(currentRank);
  const currentStars = Math.max(0, Math.min(maxStars, Math.floor(Number(rawRanked.currentStars) || 0)));
  const wins = Math.max(0, Math.floor(Number(rawRanked.wins) || 0));
  const losses = Math.max(0, Math.floor(Number(rawRanked.losses) || 0));
  const totalMatches = Math.max(wins + losses, Math.floor(Number(rawRanked.totalMatches) || 0));
  const winStreak = Math.max(0, Math.floor(Number(rawRanked.winStreak) || 0));

  let highestRank = clampRankNumber(rawRanked.highestRank);
  if (highestRank > currentRank) highestRank = currentRank;

  return {
    currentRank,
    currentStars,
    winStreak,
    wins,
    losses,
    totalMatches,
    highestRank,
    lastProcessedMatchId: String(rawRanked.lastProcessedMatchId || '').trim(),
  };
}

function canApplyWinStreakBonus(rankNumber, nextWinStreak) {
  return rankNumber >= 6 && rankNumber <= 20 && nextWinStreak >= RANKED_WIN_STREAK_BONUS_THRESHOLD;
}

function canDemoteAcrossRankFloor(currentRank, nextRank) {
  if (currentRank <= 5 && nextRank > 5) return false;
  if (currentRank <= 10 && nextRank > 10) return false;
  if (currentRank <= 15 && nextRank > 15) return false;
  return true;
}

function getRankedSnapshot() {
  profile.ranked = normalizeRankedProfile(profile.ranked);
  const ranked = profile.ranked;
  const tier = getRankTierByRankNumber(ranked.currentRank);
  const maxStars = getStarsForRankNumber(ranked.currentRank);

  return {
    currentRank: ranked.currentRank,
    tier,
    tierIndex: Math.max(0, RANKED_MAX_RANK - ranked.currentRank),
    stars: ranked.currentStars,
    maxStars,
    promo: false,
    winStreak: ranked.winStreak,
    wins: ranked.wins,
    losses: ranked.losses,
    totalMatches: ranked.totalMatches,
    highestRank: ranked.highestRank,
  };
}

function getRankedResultSummary(result) {
  const parts = [];
  if (result.didWin) {
    parts.push(`+${result.starsDelta} star${result.starsDelta === 1 ? '' : 's'}`);
    if (result.streakBonusApplied) parts.push('WIN STREAK BONUS');
  } else if (result.lossProtected) {
    parts.push('NO STAR LOSS (PROTECTION)');
  } else {
    parts.push(`-${result.starsDelta} star${result.starsDelta === 1 ? '' : 's'}`);
  }

  if (result.promoted) {
    parts.push(`PROMOTED TO RANK ${result.after.currentRank}`);
  } else if (result.demoted) {
    parts.push(`DEMOTED TO RANK ${result.after.currentRank}`);
  }

  if (Number(result.currencyDelta) > 0) {
    parts.push(`+${Math.floor(Number(result.currencyDelta))} OUT`);
  }

  return parts.join(' • ');
}

function persistRankedResultToSupabase({ didWin, matchId, source, currencyDelta }) {
  const playerService = window.outraPlayerService;
  if (!playerService) return;

  const updatePlayerRankFn = typeof playerService.updatePlayerRank === 'function'
    ? playerService.updatePlayerRank
    : null;
  const awardOutFn = typeof playerService.awardOut === 'function'
    ? playerService.awardOut
    : null;
  if (!updatePlayerRankFn && !awardOutFn) return;

  const ranked = profile?.ranked || {};
  const hiddenMmr = Math.max(0, Math.floor(Number(window.playerProfile?.hidden_mmr) || 1000));
  const rankPayload = {
    rank_tier: Math.max(1, Math.min(20, Math.floor(Number(ranked.currentRank) || 20))),
    stars: Math.max(0, Math.floor(Number(ranked.currentStars) || 0)),
    wins: Math.max(0, Math.floor(Number(ranked.wins) || 0)),
    losses: Math.max(0, Math.floor(Number(ranked.losses) || 0)),
    hidden_mmr: hiddenMmr,
  };

  if (!window.playerProfile || typeof window.playerProfile !== 'object') {
    window.playerProfile = {};
  }
  window.playerProfile = {
    ...window.playerProfile,
    ...rankPayload,
    out_balance: Math.max(0, Math.floor(Number(profile?.wlk) || 0)),
  };

  // Client-triggered persistence/reward is temporary and should later be validated by trusted server match results.
  (async () => {
    try {
      if (updatePlayerRankFn) {
        const savedRank = await updatePlayerRankFn(rankPayload);
        if (savedRank && typeof playerService.syncRuntimeFromSupabaseProfile === 'function') {
          playerService.syncRuntimeFromSupabaseProfile(savedRank);
        }
      }

      if (awardOutFn && currencyDelta > 0) {
        const reason = didWin ? 'match_win' : 'match_loss';
        const rewardResult = await awardOutFn(currencyDelta, reason, { matchId, source });
        if (rewardResult && Number.isFinite(Number(rewardResult.out_balance))) {
          profile.wlk = Math.max(0, Math.floor(Number(rewardResult.out_balance)));
          if (window.playerProfile && typeof window.playerProfile === 'object') {
            window.playerProfile.out_balance = profile.wlk;
          }
          if (typeof saveProfile === 'function') saveProfile();
          if (typeof updateHud === 'function') updateHud();
          if (typeof renderStore === 'function') renderStore();
        }
      }
    } catch (error) {
      console.error('[ranked] supabase persistence failed:', error);
    }
  })();
}

function applyRankedMatchResult(didWin, options = {}) {
  didWin = !!didWin;
  profile.ranked = normalizeRankedProfile(profile.ranked);
  const matchId = String(options?.matchId || '').trim();
  const source = String(options?.source || 'offline').trim() || 'offline';
  const sourceNormalized = source.toLowerCase();

  // Ranked progression is multiplayer-only.
  if (!sourceNormalized.startsWith('multiplayer')) {
    console.info(`[ranked] skipped non-multiplayer result source=${source} didWin=${didWin}`);
    return 'Ranked progression is multiplayer-only.';
  }

  if (matchId && profile.ranked.lastProcessedMatchId === matchId) {
    console.info(`[ranked] skipped duplicate result for match ${matchId} (source=${source})`);
    return 'No ranked change (already processed).';
  }

  void applyLeaderboardMatchResult(didWin, {
    matchId,
    source: sourceNormalized,
  });

  const before = getRankedSnapshot();
  const ranked = profile.ranked;
  let starsDelta = 0;
  let promoted = false;
  let demoted = false;
  let streakBonusApplied = false;
  let lossProtected = false;
  let currencyDelta = 0;

  ranked.totalMatches += 1;
  if (didWin) {
    ranked.wins += 1;
    ranked.winStreak += 1;

    let starsToAdd = 1;
    if (canApplyWinStreakBonus(ranked.currentRank, ranked.winStreak)) {
      starsToAdd += 1;
      streakBonusApplied = true;
    }

    starsDelta = starsToAdd;
    ranked.currentStars += starsToAdd;

    while (ranked.currentRank > RANKED_MIN_RANK) {
      const maxStarsAtRank = getStarsForRankNumber(ranked.currentRank);
      if (ranked.currentStars < maxStarsAtRank) break;
      ranked.currentStars -= maxStarsAtRank;
      ranked.currentRank -= 1;
      promoted = true;
    }

    if (ranked.currentRank === RANKED_MIN_RANK) {
      ranked.currentStars = Math.min(getStarsForRankNumber(RANKED_MIN_RANK), ranked.currentStars);
    }

    ranked.highestRank = Math.min(ranked.highestRank, ranked.currentRank);

    const configuredWinReward = Math.floor(
      Number(options?.winCurrencyReward ?? RANKED_MULTIPLAYER_WIN_OUT_REWARD) || 0
    );
    if (configuredWinReward > 0) {
      profile.wlk = Math.max(0, Math.floor(Number(profile.wlk) || 0) + configuredWinReward);
      currencyDelta = configuredWinReward;
    }
  } else {
    ranked.losses += 1;
    ranked.winStreak = 0;
    currencyDelta = Math.max(0, Math.floor(Number(options?.lossCurrencyReward ?? RANKED_MULTIPLAYER_LOSS_OUT_REWARD) || 0));
    if (currencyDelta > 0) {
      profile.wlk = Math.max(0, Math.floor(Number(profile.wlk) || 0) + currencyDelta);
    }

    if (ranked.currentRank >= 16) {
      lossProtected = true;
      starsDelta = 0;
    } else {
      ranked.currentStars -= 1;
      starsDelta = 1;

      while (ranked.currentStars < 0) {
        const nextRank = ranked.currentRank + 1;
        if (nextRank > RANKED_MAX_RANK || !canDemoteAcrossRankFloor(ranked.currentRank, nextRank)) {
          ranked.currentStars = 0;
          break;
        }
        ranked.currentRank = nextRank;
        ranked.currentStars += getStarsForRankNumber(ranked.currentRank);
        demoted = true;
      }
    }
  }

  ranked.currentRank = clampRankNumber(ranked.currentRank);
  ranked.currentStars = Math.max(0, Math.min(getStarsForRankNumber(ranked.currentRank), ranked.currentStars));
  ranked.highestRank = Math.min(clampRankNumber(ranked.highestRank), ranked.currentRank);
  if (matchId) ranked.lastProcessedMatchId = matchId;

  const after = getRankedSnapshot();
  const summary = getRankedResultSummary({
    didWin,
    before,
    after,
    starsDelta,
    currencyDelta,
    promoted,
    demoted,
    streakBonusApplied,
    lossProtected,
  });

  saveProfile();
  if (typeof updateHud === 'function') {
    updateHud();
  }
  if (typeof renderStore === 'function') {
    renderStore();
  }
  if (typeof buildRankedPanel === 'function') {
    buildRankedPanel();
  }
  persistRankedResultToSupabase({
    didWin,
    matchId,
    source: sourceNormalized,
    currencyDelta,
  });
  console.info(
    `[ranked] ${didWin ? 'win' : 'loss'} source=${source} rank=${before.currentRank}->${after.currentRank} `
    + `stars=${before.stars}/${before.maxStars}->${after.stars}/${after.maxStars} `
    + `streak=${after.winStreak}${streakBonusApplied ? ' (bonus)' : ''}${lossProtected ? ' (protected)' : ''}`
    + `${currencyDelta > 0 ? ` out=+${currencyDelta}` : ''}`
  );
  if (promoted) console.info(`[ranked] promotion to rank ${after.currentRank}`);
  if (demoted) console.info(`[ranked] demotion to rank ${after.currentRank}`);
  return summary;
}

function resetLocalRankedProfile() {
  profile.ranked = createDefaultRankedProfile();
  saveProfile();
  if (typeof buildRankedPanel === 'function') {
    buildRankedPanel();
  }
  console.info('[ranked] local ranked profile reset');
  return getRankedSnapshot();
}

window.applyRankedMatchResult = applyRankedMatchResult;
window.getRankedSnapshot = getRankedSnapshot;
window.resetLocalRankedProfile = resetLocalRankedProfile;

function distance(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
function normalized(dx, dy) { const len = Math.hypot(dx, dy) || 1; return { x: dx / len, y: dy / len }; }
// Matches the arena_platform.png silhouette (alpha bounds): 1620x1530.
// Keep this in sync with server/index.js octagon constants.
const ARENA_OCTAGON_HALF_WIDTH_SCALE = 1.0588235294117647;
const ARENA_OCTAGON_CORNER_LIMIT_SCALE = 1.715032679738562;

function getArenaOctagonMetrics(padding = 0) {
  const baseHalfHeight = Math.max(1, Number(arena.radius) || Number(arena.baseRadius) || 1);
  const baseHalfWidth = baseHalfHeight * ARENA_OCTAGON_HALF_WIDTH_SCALE;
  const baseCornerLimit = baseHalfHeight * ARENA_OCTAGON_CORNER_LIMIT_SCALE;
  const safePadding = Number.isFinite(Number(padding)) ? Number(padding) : 0;
  return {
    cx: Number(arena.cx) || 0,
    cy: Number(arena.cy) || 0,
    halfWidth: Math.max(0, baseHalfWidth - safePadding),
    halfHeight: Math.max(0, baseHalfHeight - safePadding),
    cornerLimit: Math.max(0, baseCornerLimit - (safePadding * Math.SQRT2)),
  };
}

function isPointInsideArenaOctagon(x, y, padding = 0) {
  const metrics = getArenaOctagonMetrics(padding);
  if (metrics.halfWidth <= 0 || metrics.halfHeight <= 0 || metrics.cornerLimit <= 0) return false;
  const dx = Math.abs((Number(x) || 0) - metrics.cx);
  const dy = Math.abs((Number(y) || 0) - metrics.cy);
  if (dx > metrics.halfWidth || dy > metrics.halfHeight) return false;
  return (dx + dy) <= metrics.cornerLimit;
}

function clampPointToArenaOctagon(x, y, padding = 0) {
  const px = Number(x) || 0;
  const py = Number(y) || 0;
  if (isPointInsideArenaOctagon(px, py, padding)) {
    return { x: px, y: py };
  }

  const metrics = getArenaOctagonMetrics(padding);
  const dx = px - metrics.cx;
  const dy = py - metrics.cy;
  if ((dx * dx + dy * dy) <= 0.000001) {
    return { x: metrics.cx, y: metrics.cy };
  }

  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const mid = (low + high) * 0.5;
    const mx = metrics.cx + (dx * mid);
    const my = metrics.cy + (dy * mid);
    if (isPointInsideArenaOctagon(mx, my, padding)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return {
    x: metrics.cx + (dx * low),
    y: metrics.cy + (dy * low),
  };
}

function insidePlatform(x, y, padding = 0) { return isPointInsideArenaOctagon(x, y, padding); }

// ── Collision ─────────────────────────────────────────────────
function getBlockingCircles() {
  const circles = [...obstacles];
  for (const wall of walls) {
    for (const seg of wall.segments) circles.push(seg);
  }
  return circles;
}

function circleHitsObstacle(x, y, r) {
  for (const obstacle of getBlockingCircles())
    if (distance(x, y, obstacle.x, obstacle.y) < r + obstacle.r) return obstacle;
  return null;
}

function lineCircleIntersect(x1, y1, x2, y2, cx, cy, cr) {
  const dx = x2 - x1, dy = y2 - y1, fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - cr * cr;
  let d = b * b - 4 * a * c;
  if (d < 0) return false;
  d = Math.sqrt(d);
  const t1 = (-b - d) / (2 * a), t2 = (-b + d) / (2 * a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

function hasObstacleBetween(x1, y1, x2, y2, ignoreRadius = 0) {
  for (const obstacle of getBlockingCircles())
    if (lineCircleIntersect(x1, y1, x2, y2, obstacle.x, obstacle.y, obstacle.r + ignoreRadius)) return true;
  return false;
}

function pushActorOutOfObstacle(actor) {
  const skin = 1.5;
  for (const obstacle of getBlockingCircles()) {
    const dx = actor.x - obstacle.x, dy = actor.y - obstacle.y;
    const dist = Math.hypot(dx, dy) || 1;
    const minDist = actor.r + obstacle.r + skin;
    if (dist < minDist) {
      const nx = dx / dist, ny = dy / dist;
      actor.x = obstacle.x + nx * minDist;
      actor.y = obstacle.y + ny * minDist;
      const intoNormal = actor.vx * nx + actor.vy * ny;
      if (intoNormal < 0) {
        actor.vx -= intoNormal * nx;
        actor.vy -= intoNormal * ny;
      }
    }
  }
}

// ── Movement ──────────────────────────────────────────────────
function moveActorWithSlide(actor, moveX, moveY, dt) {
  const moveLen = Math.hypot(moveX, moveY);
  if (moveLen <= 0.0001) return;
  const dirX = moveX / moveLen;
  const dirY = moveY / moveLen;
  const nowSec = performance.now() / 1000;
  const shieldSpeedMultiplier = Number(actor?.shieldUntil) > nowSec ? 0.60 : 1;
  const step = actor.speed * shieldSpeedMultiplier * Math.min(1, moveLen) * dt;
  let nextX = actor.x + dirX * step;
  let nextY = actor.y + dirY * step;
  const hit = circleHitsObstacle(nextX, nextY, actor.r);
  if (!hit) { actor.x = nextX; actor.y = nextY; return; }
  const nx = nextX - hit.x, ny = nextY - hit.y;
  const nLen = Math.hypot(nx, ny) || 1;
  const unx = nx / nLen, uny = ny / nLen;
  const dot = dirX * unx + dirY * uny;
  const slideX = dirX - dot * unx;
  const slideY = dirY - dot * uny;
  const slideLen = Math.hypot(slideX, slideY);
  if (slideLen > 0.0001) {
    const sx = slideX / slideLen, sy = slideY / slideLen;
    nextX = actor.x + sx * step;
    nextY = actor.y + sy * step;
    if (!circleHitsObstacle(nextX, nextY, actor.r)) {
      actor.x = nextX;
      actor.y = nextY;
    }
  }
}

function clampActorMovementToPlatform(actor) {
  const clampedBeforePush = clampPointToArenaOctagon(actor.x, actor.y, Number(actor?.r) || 0);
  actor.x = clampedBeforePush.x;
  actor.y = clampedBeforePush.y;
  pushActorOutOfObstacle(actor);
  const clampedAfterPush = clampPointToArenaOctagon(actor.x, actor.y, Number(actor?.r) || 0);
  actor.x = clampedAfterPush.x;
  actor.y = clampedAfterPush.y;
}

function updateActorPhysics(actor, dt) {
  actor.x += actor.vx * dt;
  actor.y += actor.vy * dt;
  actor.vx *= Math.pow(0.0008, dt);
  actor.vy *= Math.pow(0.0008, dt);
  if (Math.abs(actor.vx) < 3) actor.vx = 0;
  if (Math.abs(actor.vy) < 3) actor.vy = 0;
  pushActorOutOfObstacle(actor);
}

// ── Arena Geometry ────────────────────────────────────────────
const ARENA_RADIUS_SCALE = 1.04;
let appliedCanvasRenderScale = 1;

function getAdaptiveCanvasRenderScale() {
  // Keep canvas render scale fixed to avoid fractional-DPR rescale flicker
  // during multiplayer phase transitions.
  return 1;
}

function resizeCanvas() {
  const cssWidth = Math.max(1, Math.floor(Number(window.innerWidth) || 1));
  const cssHeight = Math.max(1, Math.floor(Number(window.innerHeight) || 1));
  const renderScale = getAdaptiveCanvasRenderScale();
  appliedCanvasRenderScale = renderScale;

  const targetWidth = Math.max(1, Math.round(cssWidth * renderScale));
  const targetHeight = Math.max(1, Math.round(cssHeight * renderScale));

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  fxCanvas.width = targetWidth;
  fxCanvas.height = targetHeight;

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  fxCanvas.style.width = `${cssWidth}px`;
  fxCanvas.style.height = `${cssHeight}px`;

  updateArenaGeometry(true);
  if (typeof invalidateDraftLayout === 'function') {
    invalidateDraftLayout({ settleFrames: 3 });
  }
}

function ensureAdaptiveCanvasRenderScale() {
  const nextScale = getAdaptiveCanvasRenderScale();
  if (Math.abs(nextScale - appliedCanvasRenderScale) <= 0.001) return;
  resizeCanvas();
}

function getCanvasClientScaleInfo() {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Number(rect?.width) || Number(canvas.clientWidth) || Number(canvas.width) || 1);
  const cssHeight = Math.max(1, Number(rect?.height) || Number(canvas.clientHeight) || Number(canvas.height) || 1);
  return {
    rect,
    scaleX: (Number(canvas.width) || 1) / cssWidth,
    scaleY: (Number(canvas.height) || 1) / cssHeight,
  };
}

function clientToCanvasPoint(clientX, clientY) {
  const { rect, scaleX, scaleY } = getCanvasClientScaleInfo();
  const x = (Number(clientX) - Number(rect?.left || 0)) * scaleX;
  const y = (Number(clientY) - Number(rect?.top || 0)) * scaleY;
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
}

function updateArenaGeometry(resetRadius = false) {
  arena.cx         = canvas.width / 2;
  arena.cy         = canvas.height / 2 + 8;
  arena.baseRadius = Math.max(230, Math.min(canvas.width, canvas.height) * 0.34) * ARENA_RADIUS_SCALE;
  if (resetRadius || !arena.radius) arena.radius = arena.baseRadius;
  arena.minRadius  = Math.max(150, arena.baseRadius * 0.58);
  playerSpawn.x    = arena.cx - arena.radius * 0.52;
  playerSpawn.y    = arena.cy;
  dummySpawn.x     = arena.cx + arena.radius * 0.52;
  dummySpawn.y     = arena.cy;
}

// Derived from arena_platform.png pillar bases (alpha bounds: 1620x1530).
// Offsets are normalized against arena half-height so local and multiplayer align.
const ARENA_PILLAR_COLLIDER_LAYOUT = Object.freeze([
  Object.freeze({ offsetX: -0.433, offsetY: -0.512, radiusScale: 0.090 }),
  Object.freeze({ offsetX: 0.429, offsetY: -0.513, radiusScale: 0.090 }),
  Object.freeze({ offsetX: -0.445, offsetY: 0.461, radiusScale: 0.090 }),
  Object.freeze({ offsetX: 0.438, offsetY: 0.460, radiusScale: 0.090 }),
]);

function buildObstacles() {
  obstacles.length = 0;
  const baseRadius = Math.max(1, Number(arena.radius) || Number(arena.baseRadius) || 1);
  for (const pillar of ARENA_PILLAR_COLLIDER_LAYOUT) {
    const r = Math.max(14, baseRadius * (Number(pillar?.radiusScale) || 0.09));
    const x = (Number(arena.cx) || 0) + (baseRadius * (Number(pillar?.offsetX) || 0));
    const y = (Number(arena.cy) || 0) + (baseRadius * (Number(pillar?.offsetY) || 0));
    if (!insidePlatform(x, y, r + 3)) continue;
    obstacles.push({
      x,
      y,
      r,
      hidden: true,
      kind: 'pillar',
    });
  }
}

// ── Effects ───────────────────────────────────────────────────
function isPerformanceModeEnabled() {
  return isPerformanceModeForced();
}

function isPerformanceModeForced() {
  return typeof FORCE_ARENA_PERFORMANCE_MODE !== 'undefined' && !!FORCE_ARENA_PERFORMANCE_MODE;
}

function getParticleSoftCap() {
  if (isPerformanceModeForced()) return 220;
  return isPerformanceModeEnabled() ? 320 : 760;
}

function getScaledEffectCount(count, minCount = 1) {
  const base = Math.max(0, Number(count) || 0);
  if (isPerformanceModeForced()) {
    return Math.max(minCount, Math.round(base * 0.45));
  }
  if (!isPerformanceModeEnabled()) return Math.round(base);
  return Math.max(minCount, Math.round(base * 0.55));
}

function addParticle(particle) {
  if (!particle || particles.length >= getParticleSoftCap()) return false;
  particles.push(particle);
  return true;
}

function spawnBurst(x, y, color, count = 16, speed = 180) {
  const spawnCount = getScaledEffectCount(count);
  for (let i = 0; i < spawnCount; i++)
    addParticle({
      x, y,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      life: 0.3 + Math.random() * 0.2,
      size: 2 + Math.random() * 4,
      color
    });
}

const DAMAGE_TEXT_PALETTE = Object.freeze({
  dealt: '#ff4f63',
  taken: '#ff4f63',
  neutral: '#ffe4bf',
  heal: '#7cff93',
  block: '#9fd8ff',
});

function spawnDamageText(x, y, amount, color = DAMAGE_TEXT_PALETTE.neutral, prefix = '-') {
  damageTexts.push({
    x,
    y: y - 12,
    value: `${prefix}${Math.round(amount)}`,
    life: 0.75,
    vy: -34,
    color,
    outlineColor: 'rgba(10,16,24,0.94)',
    shadowColor: 'rgba(0,0,0,0.4)',
    fontSize: 21,
    fontWeight: 900,
  });
}

const COMBAT_FEEL = Object.freeze({
  maxShakePx: 10,
  maxShakeDuration: 0.22,
  hitFlashDuration: 0.16,
  strongHitThreshold: 8.4,
  eliminationPulseDuration: 0.62,
});

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function triggerCombatScreenShake(intensity = 0.2, duration = 0.11) {
  const safeIntensity = clamp01(intensity);
  const safeDuration = Math.max(0.05, Math.min(COMBAT_FEEL.maxShakeDuration, Number(duration) || 0.11));
  const shake = combatFx.shake;
  shake.intensity = Math.max(shake.intensity * 0.76, safeIntensity);
  shake.duration = Math.max(shake.duration, safeDuration);
  shake.timeLeft = Math.max(shake.timeLeft, safeDuration);
  shake.elapsed = 0;

}

function getCombatScreenShakeOffset() {
  return {
    x: Number(combatFx.shake.x) || 0,
    y: Number(combatFx.shake.y) || 0,
  };
}

function triggerActorHitFlash(target = 'player', duration = COMBAT_FEEL.hitFlashDuration) {
  const safeDuration = Math.max(0.06, Math.min(0.22, Number(duration) || COMBAT_FEEL.hitFlashDuration));
  if (target === 'dummy') {
    combatFx.actorHitFlash.dummy = Math.max(combatFx.actorHitFlash.dummy, safeDuration);
    return;
  }
  combatFx.actorHitFlash.player = Math.max(combatFx.actorHitFlash.player, safeDuration);
}

function getActorHitFlash(target = 'player') {
  return target === 'dummy'
    ? Math.max(0, Number(combatFx.actorHitFlash.dummy) || 0)
    : Math.max(0, Number(combatFx.actorHitFlash.player) || 0);
}

function pushCombatImpactWave(x, y, options = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const duration = Math.max(0.12, Math.min(0.38, Number(options.duration) || 0.24));
  combatFx.impactWaves.push({
    x,
    y,
    life: duration,
    maxLife: duration,
    startRadius: Math.max(12, Number(options.startRadius) || 20),
    endRadius: Math.max(20, Number(options.endRadius) || 74),
    color: String(options.color || '255,190,120'),
    alpha: clamp01(options.alpha == null ? 0.66 : options.alpha),
    fillAlpha: clamp01(options.fillAlpha == null ? 0.2 : options.fillAlpha),
    width: Math.max(1, Number(options.width) || 2.8),
  });
  if (combatFx.impactWaves.length > 36) {
    combatFx.impactWaves.splice(0, combatFx.impactWaves.length - 36);
  }
}

function spawnFireblastObstacleImpactAt(x, y, options = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const burstCount = Math.max(6, Math.min(22, Number(options.burstCount) || 13));
  const burstSpeed = Math.max(40, Math.min(220, Number(options.burstSpeed) || 125));
  spawnBurst(x, y, 'rgba(255,188,120,0.94)', burstCount, burstSpeed);
  pushCombatImpactWave(x, y, {
    color: '255,186,122',
    duration: 0.17,
    startRadius: 9,
    endRadius: 46,
    alpha: 0.56,
    fillAlpha: 0.12,
    width: 2.2,
  });
  triggerCombatScreenShake(0.09, 0.08);
}

function getProjectileObstacleImpactPoint(projectile, obstacle, previousX, previousY) {
  const projectileX = Number(projectile?.x);
  const projectileY = Number(projectile?.y);
  if (!Number.isFinite(projectileX) || !Number.isFinite(projectileY)) {
    return { x: Number(previousX) || 0, y: Number(previousY) || 0 };
  }
  const obstacleX = Number(obstacle?.x);
  const obstacleY = Number(obstacle?.y);
  const obstacleRadius = Math.max(0, Number(obstacle?.r) || 0);
  if (!Number.isFinite(obstacleX) || !Number.isFinite(obstacleY) || obstacleRadius <= 0) {
    return { x: projectileX, y: projectileY };
  }

  let dx = projectileX - obstacleX;
  let dy = projectileY - obstacleY;
  let len = Math.hypot(dx, dy);
  if (len <= 0.0001 && Number.isFinite(Number(previousX)) && Number.isFinite(Number(previousY))) {
    dx = Number(previousX) - obstacleX;
    dy = Number(previousY) - obstacleY;
    len = Math.hypot(dx, dy);
  }
  if (len <= 0.0001) {
    dx = -(Number(projectile?.vx) || 1);
    dy = -(Number(projectile?.vy) || 0);
    len = Math.hypot(dx, dy) || 1;
  }

  const nx = dx / len;
  const ny = dy / len;
  const projectileRadius = Math.max(0, Number(projectile?.r) || 0);
  const edgeDistance = obstacleRadius + Math.min(7, projectileRadius * 0.45);
  return {
    x: obstacleX + nx * edgeDistance,
    y: obstacleY + ny * edgeDistance,
  };
}

function spawnFireblastObstacleImpact(projectile, obstacle, previousX, previousY) {
  const point = getProjectileObstacleImpactPoint(projectile, obstacle, previousX, previousY);
  spawnFireblastObstacleImpactAt(point.x, point.y);
}

function pushDirectionalWave(x, y, dx, dy, options = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const dir = normalized(Number(dx) || 0, Number(dy) || 0);
  const duration = Math.max(0.12, Math.min(0.36, Number(options.duration) || 0.22));
  combatFx.directionalWaves.push({
    x,
    y,
    dx: dir.x,
    dy: dir.y,
    life: duration,
    maxLife: duration,
    travel: Math.max(18, Number(options.travel) || 86),
    spread: Math.max(8, Number(options.spread) || 22),
    color: String(options.color || '184,220,255'),
    alpha: clamp01(options.alpha == null ? 0.56 : options.alpha),
    width: Math.max(1, Number(options.width) || 2.4),
  });
  if (combatFx.directionalWaves.length > 28) {
    combatFx.directionalWaves.splice(0, combatFx.directionalWaves.length - 28);
  }
}

function spawnGustCasterWindFx(x, y, options = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const scale = Math.max(0.65, Number(options.scale) || 1);

  pushCombatImpactWave(x, y, {
    color: '176,244,255',
    duration: 0.24,
    startRadius: 14 * scale,
    endRadius: 112 * scale,
    alpha: 0.76,
    fillAlpha: 0.2,
    width: 3.1,
  });
  pushCombatImpactWave(x, y, {
    color: '150,224,255',
    duration: 0.16,
    startRadius: 28 * scale,
    endRadius: 94 * scale,
    alpha: 0.52,
    fillAlpha: 0.09,
    width: 2.2,
  });

  const gustTrailCount = getScaledEffectCount(20, 12);
  for (let i = 0; i < gustTrailCount; i += 1) {
    const ang = (Math.PI * 2 * i) / Math.max(1, gustTrailCount) + ((Math.random() - 0.5) * 0.3);
    const radialSpeed = (170 + (Math.random() * 170)) * scale;
    const spinSpeed = ((Math.random() - 0.5) * 80) * scale;
    const baseRadius = (16 + Math.random() * 12) * scale;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    addParticle({
      x: x + (cos * baseRadius),
      y: y + (sin * baseRadius),
      vx: (cos * radialSpeed) + (-sin * spinSpeed),
      vy: (sin * radialSpeed) + (cos * spinSpeed),
      life: 0.13 + (Math.random() * 0.16),
      size: (2.4 + (Math.random() * 2.8)) * scale,
      color: Math.random() > 0.48
        ? 'rgba(172,246,255,0.88)'
        : 'rgba(196,250,255,0.8)',
    });
  }
}

function triggerEliminationPulse(x, y, winnerPlayerNumber = null, eliminatedPlayerNumber = null) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const duration = COMBAT_FEEL.eliminationPulseDuration;
  combatFx.eliminationPulse = {
    x,
    y,
    life: duration,
    maxLife: duration,
    winnerPlayerNumber: Number.isFinite(Number(winnerPlayerNumber)) ? Number(winnerPlayerNumber) : null,
    eliminatedPlayerNumber: Number.isFinite(Number(eliminatedPlayerNumber)) ? Number(eliminatedPlayerNumber) : null,
  };
}

function resetCombatFeedbackState() {
  combatFx.shake.x = 0;
  combatFx.shake.y = 0;
  combatFx.shake.intensity = 0;
  combatFx.shake.duration = 0;
  combatFx.shake.timeLeft = 0;
  combatFx.shake.elapsed = 0;
  combatFx.impactWaves.length = 0;
  combatFx.directionalWaves.length = 0;
  if (Array.isArray(combatFx.practiceSpellImageFx)) {
    combatFx.practiceSpellImageFx.length = 0;
  } else {
    combatFx.practiceSpellImageFx = [];
  }
  combatFx.actorHitFlash.player = 0;
  combatFx.actorHitFlash.dummy = 0;
  combatFx.eliminationPulse.life = 0;
  combatFx.eliminationPulse.maxLife = 0;
  combatFx.trailEmit.player = 0;
  combatFx.trailEmit.dummy = 0;
}

function updateTransientCombatVisuals(dt) {
  const delta = Math.max(0, Number(dt) || 0);
  if (delta <= 0) return;

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.life -= delta;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = damageTexts.length - 1; i >= 0; i -= 1) {
    const d = damageTexts[i];
    d.y += d.vy * delta;
    d.life -= delta;
    if (d.life <= 0) damageTexts.splice(i, 1);
  }
}

function getAbilityFeedbackPalette(abilityId = '', hitType = '') {
  const id = String(abilityId || '').trim().toLowerCase();
  const type = String(hitType || '').trim().toLowerCase();

  if (type.startsWith('prism_reflect')) {
    return {
      color: '146,244,228',
      burst: 'rgba(138,242,224,0.92)',
      textColor: '#d0fff6',
      text: 'REFLECT',
      shake: 0.16,
      waveTravel: 84,
    };
  }

  if (type.startsWith('prism_block')) {
    return {
      color: '130,236,212',
      burst: 'rgba(120,236,206,0.88)',
      textColor: '#cbfff2',
      text: 'BLOCK',
      shake: 0.14,
      waveTravel: 72,
    };
  }

  if (type === 'solar_explode' || type === 'solar_hit') {
    return {
      color: '255,214,128',
      burst: 'rgba(255,214,128,0.92)',
      textColor: '#ffeab8',
      text: type === 'solar_explode' ? 'FLARE' : 'SOLAR',
      shake: 0.2,
      waveTravel: 88,
    };
  }

  if (type.startsWith('rift_')) {
    return {
      color: '148,198,255',
      burst: 'rgba(148,198,255,0.9)',
      textColor: '#d4e6ff',
      text: 'RIFT',
      shake: 0.16,
      waveTravel: 84,
    };
  }

  if (type.startsWith('phantom_')) {
    return {
      color: '204,180,255',
      burst: 'rgba(204,180,255,0.9)',
      textColor: '#eadfff',
      text: 'PHANTOM',
      shake: 0.14,
      waveTravel: 80,
    };
  }

  if (type === 'shield_block') {
    return {
      color: '154,214,255',
      burst: 'rgba(146,214,255,0.92)',
      textColor: '#b7e4ff',
      text: 'BLOCK',
      shake: 0.1,
      waveTravel: 68,
    };
  }

  switch (id) {
    case 'fireblast':
      return { color: '255,168,96', burst: 'rgba(255,170,92,0.95)', textColor: '#ffd8a0', text: 'HIT', shake: 0.18, waveTravel: 72 };
    case 'blink':
      return { color: '195,162,255', burst: 'rgba(197,164,255,0.9)', textColor: '#ddc6ff', text: 'BLINK', shake: 0.12, waveTravel: 64 };
    case 'shield':
      return { color: '158,228,255', burst: 'rgba(158,228,255,0.84)', textColor: '#c8efff', text: 'BLOCK', shake: 0.1, waveTravel: 64 };
    case 'prism':
      return { color: '130,236,212', burst: 'rgba(120,236,206,0.9)', textColor: '#cbfff2', text: 'PRISM', shake: 0.14, waveTravel: 76 };
    case 'gust':
      return { color: '170,242,255', burst: 'rgba(170,242,255,0.9)', textColor: '#ccf7ff', text: 'GUST', shake: 0.2, waveTravel: 100 };
    case 'charge':
      return { color: '214,156,255', burst: 'rgba(214,156,255,0.95)', textColor: '#e4c4ff', text: 'CHARGE', shake: 0.34, waveTravel: 122 };
    case 'shock':
      return { color: '255,174,138', burst: 'rgba(255,174,138,0.94)', textColor: '#ffd0b4', text: 'SHOCK', shake: 0.28, waveTravel: 108 };
    case 'solar':
      return { color: '255,214,128', burst: 'rgba(255,214,128,0.92)', textColor: '#ffeab8', text: 'SOLAR', shake: 0.2, waveTravel: 88 };
    case 'rift':
      return { color: '148,198,255', burst: 'rgba(148,198,255,0.9)', textColor: '#d4e6ff', text: 'RIFT', shake: 0.16, waveTravel: 84 };
    case 'phantom':
      return { color: '204,180,255', burst: 'rgba(204,180,255,0.9)', textColor: '#eadfff', text: 'PHANTOM', shake: 0.14, waveTravel: 80 };
    case 'hook':
      return { color: '166,212,255', burst: 'rgba(166,212,255,0.9)', textColor: '#d2e9ff', text: 'HOOK', shake: 0.24, waveTravel: 96 };
    case 'wall':
      return { color: '168,206,255', burst: 'rgba(168,206,255,0.9)', textColor: '#d8e8ff', text: 'WALL', shake: 0.16, waveTravel: 84 };
    case 'rewind':
      return { color: '196,168,255', burst: 'rgba(196,168,255,0.92)', textColor: '#e2d3ff', text: 'REWIND', shake: 0.15, waveTravel: 90 };
    default:
      return { color: '220,220,255', burst: 'rgba(220,220,255,0.86)', textColor: '#eff1ff', text: 'HIT', shake: 0.14, waveTravel: 78 };
  }
}

function updateCombatFeedback(dt) {
  const delta = Math.max(0, Number(dt) || 0);
  if (delta <= 0) return;
  const nowSec = performance.now() / 1000;

  const shake = combatFx.shake;
  if (shake.timeLeft > 0) {
    shake.timeLeft = Math.max(0, shake.timeLeft - delta);
    shake.elapsed += delta;
    const t = shake.duration > 0 ? (shake.timeLeft / shake.duration) : 0;
    const amplitude = COMBAT_FEEL.maxShakePx * clamp01(shake.intensity) * (0.24 + (t * t * 0.76));
    const pulse = 18 + (shake.elapsed * 32);
    shake.x = Math.sin(pulse * 0.97) * amplitude;
    shake.y = Math.cos(pulse * 1.23) * amplitude * 0.82;
    if (shake.timeLeft <= 0) {
      shake.x = 0;
      shake.y = 0;
      shake.intensity = 0;
      shake.duration = 0;
      shake.elapsed = 0;
    }
  } else {
    shake.x = 0;
    shake.y = 0;
  }

  const solarDistortionRemaining = Math.max(0, (Number(player?.solarDistortionUntil) || 0) - nowSec);
  if (solarDistortionRemaining > 0) {
    const solarStrength = clamp01(solarDistortionRemaining / 1.2);
    const jitterAmplitude = 8.8 + (solarStrength * 16.4);
    const jitterTime = nowSec * (38 + (solarStrength * 36));
    const jitterX = (Math.sin(jitterTime * 1.27) * jitterAmplitude)
      + ((Math.random() - 0.5) * jitterAmplitude * 1.2);
    const jitterY = (Math.cos(jitterTime * 1.61) * jitterAmplitude * 0.92)
      + ((Math.random() - 0.5) * jitterAmplitude * 1.06);
    shake.x += jitterX;
    shake.y += jitterY;
  }

  combatFx.actorHitFlash.player = Math.max(0, combatFx.actorHitFlash.player - delta);
  combatFx.actorHitFlash.dummy = Math.max(0, combatFx.actorHitFlash.dummy - delta);

  for (let i = combatFx.impactWaves.length - 1; i >= 0; i -= 1) {
    const wave = combatFx.impactWaves[i];
    wave.life -= delta;
    if (wave.life <= 0) {
      combatFx.impactWaves.splice(i, 1);
    }
  }

  for (let i = combatFx.directionalWaves.length - 1; i >= 0; i -= 1) {
    const wave = combatFx.directionalWaves[i];
    wave.life -= delta;
    if (wave.life <= 0) {
      combatFx.directionalWaves.splice(i, 1);
    }
  }

  const practiceSpellImageFx = Array.isArray(combatFx.practiceSpellImageFx)
    ? combatFx.practiceSpellImageFx
    : [];
  for (let i = practiceSpellImageFx.length - 1; i >= 0; i -= 1) {
    const fx = practiceSpellImageFx[i];
    if (!fx || typeof fx !== 'object') {
      practiceSpellImageFx.splice(i, 1);
      continue;
    }
    fx.life = Math.max(0, (Number(fx.life) || 0) - delta);
    if (fx.life <= 0) {
      practiceSpellImageFx.splice(i, 1);
    }
  }

  if (combatFx.eliminationPulse.life > 0) {
    combatFx.eliminationPulse.life = Math.max(0, combatFx.eliminationPulse.life - delta);
  }
}

function clearRewindHistory() {
  rewindHistory.length = 0;
  rewindLastSampleAt = 0;
}

function seedRewindHistory() {
  const now = performance.now() / 1000;
  rewindHistory.length = 0;
  rewindHistory.push({ x: player.x, y: player.y, t: now });
  rewindLastSampleAt = now;
}

function recordRewindHistory(force = false) {
  if (!player.alive) return;
  const now = performance.now() / 1000;
  const last = rewindHistory[rewindHistory.length - 1];
  const movedEnough = !last || distance(player.x, player.y, last.x, last.y) >= 3;
  const timeEnough = !last || (now - rewindLastSampleAt) >= 0.03;
  if (force || movedEnough || timeEnough) {
    rewindHistory.push({ x: player.x, y: player.y, t: now });
    rewindLastSampleAt = now;
  }
  const keepAfter = now - Math.max(1.35, (player.rewindSeconds || 1.0) + 0.35);
  while (rewindHistory.length > 1 && rewindHistory[0].t < keepAfter) rewindHistory.shift();
}

function getRewindTarget(secondsBack = 1.0) {
  if (!rewindHistory.length) return null;
  const now = performance.now() / 1000;
  const targetTime = now - secondsBack;
  let best = rewindHistory[0];
  let bestDiff = Math.abs(best.t - targetTime);
  for (let i = 1; i < rewindHistory.length; i++) {
    const snap = rewindHistory[i];
    const diff = Math.abs(snap.t - targetTime);
    if (diff < bestDiff) {
      best = snap;
      bestDiff = diff;
    }
  }
  return best;
}

function getSafeRewindTarget(baseTarget) {
  if (baseTarget && !circleHitsObstacle(baseTarget.x, baseTarget.y, player.r) && insidePlatform(baseTarget.x, baseTarget.y, player.r)) {
    return baseTarget;
  }
  for (let i = rewindHistory.length - 1; i >= 0; i--) {
    const snap = rewindHistory[i];
    if (!circleHitsObstacle(snap.x, snap.y, player.r) && insidePlatform(snap.x, snap.y, player.r)) {
      return snap;
    }
  }
  return null;
}

function getWallPlacementData() {
  const dir = getPlayerAim();
  const perp = { x: -dir.y, y: dir.x };
  const wallLength = 150;
  const segmentRadius = 12;
  const segmentCount = 7;
  const centerDistance = player.r + 42;
  const duration = 3.5;
  const centerX = player.x + dir.x * centerDistance;
  const centerY = player.y + dir.y * centerDistance;
  const segments = [];

  for (let i = 0; i < segmentCount; i++) {
    const t = segmentCount === 1 ? 0 : (i / (segmentCount - 1)) - 0.5;
    const offset = t * wallLength;
    const sx = centerX + perp.x * offset;
    const sy = centerY + perp.y * offset;

    if (!insidePlatform(sx, sy, segmentRadius + 4)) return null;
    if (circleHitsObstacle(sx, sy, segmentRadius)) return null;
    if (distance(sx, sy, player.x, player.y) < player.r + segmentRadius + 8) return null;

    segments.push({ x: sx, y: sy, r: segmentRadius });
  }

  return { dir, perp, centerX, centerY, duration, segments };
}

// ── Player Colors ─────────────────────────────────────────────
function getAutoColorIndexFromName(name) {
  const source = String(name || 'Player').trim().toLowerCase() || 'player';
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % autoPlayerColors.length;
}

function getAutoColorForPlayerName(name) {
  return autoPlayerColors[getAutoColorIndexFromName(name)] || autoPlayerColors[0];
}

function applyPlayerColors() {
  const choice = getAutoColorForPlayerName(player.name);
  player.bodyColor = choice.body;
  player.wandColor = choice.wand;
}

// ── Upgrades ──────────────────────────────────────────────────
function getPotionHealAmount() { return profile.store.potionBoost ? 23 : 18; }
function getHookCooldown()     { return profile.store.cooldownCharm ? 1.5 : 1.8; }

// ── Combat ────────────────────────────────────────────────────
function healActor(actor, amount) {
  const before = actor.hp;
  actor.hp = Math.min(actor.maxHp, actor.hp + amount);
  const gained = actor.hp - before;
  if (gained > 0) {
    spawnDamageText(actor.x, actor.y - actor.r, gained, DAMAGE_TEXT_PALETTE.heal, '+');
    soundHeal();
  }
}

function getPlayerAim() { return normalized(player.aimX, player.aimY); }

const ARENA_CAST_SPRITE_DURATION_SEC = 1.0;
const ARENA_DASH_SPRITE_DURATION_SEC = Math.max(0.05, (25 / 30) - 0.2);
const ARENA_HIT_SPRITE_DURATION_SEC = (14 / 30);

function triggerArenaSpriteCastForActor(actor, nowSec = (performance.now() / 1000), durationSec = ARENA_CAST_SPRITE_DURATION_SEC) {
  if (!actor || typeof actor !== 'object') return;
  const safeNowSec = Number.isFinite(Number(nowSec)) ? Number(nowSec) : (performance.now() / 1000);
  const safeDurationSec = Math.max(0.05, Number(durationSec) || ARENA_CAST_SPRITE_DURATION_SEC);
  actor.castAnimStartedAt = safeNowSec;
  actor.castAnimUntil = safeNowSec + safeDurationSec;
}

function triggerArenaSpriteDashForActor(actor, nowSec = (performance.now() / 1000), durationSec = ARENA_DASH_SPRITE_DURATION_SEC) {
  if (!actor || typeof actor !== 'object') return;
  const safeNowSec = Number.isFinite(Number(nowSec)) ? Number(nowSec) : (performance.now() / 1000);
  const safeDurationSec = Math.max(0.05, Number(durationSec) || ARENA_DASH_SPRITE_DURATION_SEC);
  actor.dashAnimStartedAt = safeNowSec;
  actor.dashAnimUntil = safeNowSec + safeDurationSec;
}

function triggerArenaSpriteHitForActor(actor, nowSec = (performance.now() / 1000), durationSec = ARENA_HIT_SPRITE_DURATION_SEC) {
  if (!actor || typeof actor !== 'object') return;
  const safeNowSec = Number.isFinite(Number(nowSec)) ? Number(nowSec) : (performance.now() / 1000);
  const safeDurationSec = Math.max(0.05, Number(durationSec) || ARENA_HIT_SPRITE_DURATION_SEC);
  actor.hitAnimStartedAt = safeNowSec;
  actor.hitAnimUntil = safeNowSec + safeDurationSec;
}

function spawnArenaHitFlash(x, y, target) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const isPlayerTarget = target === 'player';
  pushCombatImpactWave(x, y, {
    color: isPlayerTarget ? '255,176,132' : '255,210,154',
    duration: 0.14,
    startRadius: 4,
    endRadius: 34,
    alpha: 0.42,
    fillAlpha: 0.12,
    width: 2.1,
  });
}

function damagePlayer(amount) {
  if (!player.alive) return;
  const now = performance.now() / 1000;
  if (isPlayerLocallyPhantomUntargetable(now)) return;
  if (now < player.shieldUntil) {
    spawnDamageText(player.x, player.y - player.r, 0, DAMAGE_TEXT_PALETTE.block, 'Block');
    pushCombatImpactWave(player.x, player.y, {
      color: '154,214,255',
      duration: 0.16,
      startRadius: player.r + 9,
      endRadius: player.r + 40,
      alpha: 0.52,
      fillAlpha: 0.12,
      width: 2.1,
    });
    return;
  }
  player.hp = Math.max(0, player.hp - amount);
  triggerArenaSpriteHitForActor(player, now);
  triggerActorHitFlash('player', COMBAT_FEEL.hitFlashDuration);
  pushCombatImpactWave(player.x, player.y, {
    color: '255,176,132',
    duration: 0.2,
    startRadius: player.r + 8,
    endRadius: player.r + 52,
    alpha: 0.6,
    fillAlpha: 0.14,
    width: 2.8,
  });
  triggerCombatScreenShake(0.2, 0.11);
  spawnDamageText(player.x, player.y - player.r, amount, DAMAGE_TEXT_PALETTE.taken);
  soundHit();
  if (player.hp <= 0) killPlayer('HP reached 0');
}

function damageDummy(amount) {
  if (!dummyEnabled || !dummy.alive) return;
  const now = performance.now() / 1000;
  dummy.hp = Math.max(0, dummy.hp - amount);

  triggerArenaSpriteHitForActor(dummy, now);
  triggerActorHitFlash('dummy', COMBAT_FEEL.hitFlashDuration);
  pushCombatImpactWave(dummy.x, dummy.y, {
    color: '255,176,132',
    duration: 0.2,
    startRadius: dummy.r + 8,
    endRadius: dummy.r + 52,
    alpha: 0.6,
    fillAlpha: 0.14,
    width: 2.8,
  });
  triggerCombatScreenShake(0.2, 0.11);
  spawnDamageText(dummy.x, dummy.y - dummy.r, amount, DAMAGE_TEXT_PALETTE.dealt);
  soundHit();
  if (dummy.hp <= 0) killDummy('HP reached 0');
}

// ── Generic Spell Casting ─────────────────────────────────────
function canCastSpell(spellId) {
  const now = performance.now() / 1000;
  const def = SPELL_DEFS[spellId];
  if (!def) return false;
  if (gameState !== 'playing' || !player.alive) return false;
  if (now < (Number(player.phantomVanishUntil) || 0)) return false;
  if (isArenaPreFightLocked()) return false;
  if (spellId !== 'fire' && !activeSpellLoadout.includes(spellId)) return false;
  const readyAt = player[def.cooldownKey] || 0;
  return now >= readyAt;
}

function mapLocalSpellIdToMultiplayerAbilityId(spellId) {
  switch (String(spellId || '').trim().toLowerCase()) {
    case 'fire': return 'fireblast';
    case 'hook': return 'hook';
    case 'blink': return 'blink';
    case 'shield': return 'shield';
    case 'prism': return 'prism';
    case 'charge': return 'charge';
    case 'shock': return 'shock';
    case 'gust': return 'gust';
    case 'solar': return 'solar';
    case 'rift': return 'rift';
    case 'phantom': return 'phantom';
    case 'wall': return 'wall';
    case 'rewind': return 'rewind';
    default: return '';
  }
}

function tryCastMultiplayerArenaSpell(spellId) {
  const runtimeSnapshot = getMultiplayerArenaRuntimeSnapshot();
  if (!isMultiplayerArenaRuntimeActive(runtimeSnapshot)) return false;
  const api = window.outraMultiplayer;
  if (!api || typeof api.castAbility !== 'function') return false;
  const abilityId = mapLocalSpellIdToMultiplayerAbilityId(spellId);
  if (!abilityId) return false;
  api.castAbility(abilityId);
  return true;
}

function castPlayerSpell(spellId) {
  if (tryCastMultiplayerArenaSpell(spellId)) {
    if (String(spellId || '').trim().toLowerCase() === 'charge') {
      // Multiplayer uses server-driven effect state; play local dash sprite instantly
      // so charge cast has immediate readable feedback.
      triggerArenaSpriteDashForActor(player);
    }
    return;
  }
  if (spellId !== 'rift' && player.riftPlacementActive) {
    clearLocalRiftPlacement();
  }
  if (spellId !== 'rift' && !canCastSpell(spellId)) return;

  switch (spellId) {
    case 'fire':
      shootFire();
      break;
    case 'hook':
      castHookFromPlayer();
      break;
    case 'blink':
      tryTeleport();
      break;
    case 'shield':
      castShield();
      break;
    case 'prism':
      castPrism();
      break;
    case 'charge':
      castArcaneCharge();
      break;
    case 'shock':
      castShockBlast();
      break;
    case 'gust':
      castGust();
      break;
    case 'solar':
      castSolar();
      break;
    case 'rift':
      armLocalRiftPlacement();
      break;
    case 'phantom':
      castPhantom();
      break;
    case 'wall':
      castWall();
      break;
    case 'rewind':
      castRewind();
      break;
  }
}

// ── Skills ────────────────────────────────────────────────────
const LOCAL_UNIT_TO_PX = Math.max(1, player.teleportDistance / 6);
const PRISM_LOCAL_DURATION_SEC = 0.6;
const PRISM_LOCAL_SHIELD_OFFSET_PX = 0.40 * LOCAL_UNIT_TO_PX;
const PRISM_LOCAL_SHIELD_THICKNESS_PX = 0.2736 * LOCAL_UNIT_TO_PX;
const PRISM_LOCAL_SHIELD_COS_HALF_ARC = Math.cos((120 * Math.PI / 180) * 0.5);
const SOLAR_LOCAL_PROJECTILE_RADIUS_PX = 0.38 * LOCAL_UNIT_TO_PX;
const SOLAR_LOCAL_IMPACT_RADIUS_PX = 1.35 * LOCAL_UNIT_TO_PX;
const SOLAR_LOCAL_SPEED_PX_PER_SEC = 16.2 * LOCAL_UNIT_TO_PX;
const SOLAR_LOCAL_RANGE_PX = 12.0 * LOCAL_UNIT_TO_PX;
const SOLAR_LOCAL_LIFETIME_SEC = SOLAR_LOCAL_RANGE_PX / Math.max(1, SOLAR_LOCAL_SPEED_PX_PER_SEC);
const SOLAR_LOCAL_DAMAGE = 13;
const SOLAR_LOCAL_KNOCKBACK_PX = 2.5 * LOCAL_UNIT_TO_PX;
const SOLAR_LOCAL_DEBUFF_SEC = 1.2;
const RIFT_LOCAL_RANGE_A_PX = 7.0 * LOCAL_UNIT_TO_PX;
const RIFT_LOCAL_RANGE_B_PX = 12.0 * LOCAL_UNIT_TO_PX;
const RIFT_LOCAL_PORTAL_RADIUS_PX = 0.9 * LOCAL_UNIT_TO_PX;
const RIFT_LOCAL_DURATION_SEC = 4.0;
const RIFT_LOCAL_TELEPORT_DELAY_SEC = 0.08;
const RIFT_LOCAL_REUSE_LOCKOUT_SEC = 0.5;
const RIFT_LOCAL_PENDING_TIMEOUT_SEC = 6.0;
const RIFT_LOCAL_EXIT_VELOCITY_MULTIPLIER = 0.70;
const PHANTOM_LOCAL_VANISH_SEC = 0.3;
const PHANTOM_LOCAL_ILLUSION_SEC = 2.0;
const PHANTOM_LOCAL_SPLIT_RADIUS_PX = 0.65 * LOCAL_UNIT_TO_PX;
const PHANTOM_LOCAL_ILLUSION_SPEED_PX_PER_SEC = Math.max(72, Number(player?.speed) * 0.72);

function isPlayerLocallyPhantomUntargetable(nowSec = performance.now() / 1000) {
  return nowSec < (Number(player.phantomVanishUntil) || 0);
}

function resolveLocalRiftPortalPlacement(originX, originY, direction, maxDistancePx, portalRadiusPx) {
  const dir = normalized(Number(direction?.x) || 0, Number(direction?.y) || 0);
  const maxDistance = Math.max(0, Number(maxDistancePx) || 0);
  const portalRadius = Math.max(6, Number(portalRadiusPx) || 10);
  const steps = 24;

  for (let step = steps; step >= 0; step -= 1) {
    const t = step / steps;
    const distancePx = maxDistance * t;
    const x = originX + dir.x * distancePx;
    const y = originY + dir.y * distancePx;
    if (!insidePlatform(x, y, portalRadius + 4)) continue;
    if (circleHitsObstacle(x, y, portalRadius)) continue;
    return { x, y };
  }

  return null;
}

function resolveLocalRiftPortalPlacementAtTarget(originX, originY, targetX, targetY, maxDistancePx, portalRadiusPx) {
  const ox = Number(originX) || 0;
  const oy = Number(originY) || 0;
  const tx = Number(targetX);
  const ty = Number(targetY);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null;

  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0.001) return null;

  const direction = { x: dx / dist, y: dy / dist };
  const desiredDistance = Math.min(Math.max(0, Number(maxDistancePx) || 0), dist);
  return resolveLocalRiftPortalPlacement(
    ox,
    oy,
    direction,
    desiredDistance,
    portalRadiusPx
  );
}

function hasLocalRiftPendingPortal(nowSec = performance.now() / 1000) {
  const pendingPortalA = player.riftPendingPortalA && typeof player.riftPendingPortalA === 'object'
    ? player.riftPendingPortalA
    : null;
  if (!pendingPortalA) return false;
  return nowSec < (Number(player.riftPendingExpiresAt) || 0);
}

function isLocalRiftPlacementActive(nowSec = performance.now() / 1000) {
  if (!player.riftPlacementActive) return false;
  if (gameState !== 'playing' || !player.alive) {
    player.riftPlacementActive = false;
    return false;
  }
  if (hasLocalRiftPendingPortal(nowSec)) {
    return true;
  }
  if (nowSec >= (Number(player.riftReadyAt) || 0)) {
    return true;
  }
  player.riftPlacementActive = false;
  return false;
}

function armLocalRiftPlacement() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive) return false;
  if (!hasLocalRiftPendingPortal(now) && now < (Number(player.riftReadyAt) || 0)) return false;
  player.riftPlacementActive = true;
  return true;
}

function clearLocalRiftPlacement() {
  player.riftPlacementActive = false;
}

function placeLocalRiftAtCursor(targetX = mouse.x, targetY = mouse.y) {
  if (!isLocalRiftPlacementActive()) return false;
  const placed = castRift({ x: targetX, y: targetY });
  if (!placed) return false;
  if (!hasLocalRiftPendingPortal()) {
    clearLocalRiftPlacement();
  }
  return true;
}

function castRift(targetPoint = null) {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive) return false;
  const pendingPortalA = player.riftPendingPortalA && typeof player.riftPendingPortalA === 'object'
    ? { x: Number(player.riftPendingPortalA.x) || 0, y: Number(player.riftPendingPortalA.y) || 0 }
    : null;
  const pendingActive = pendingPortalA && now < (Number(player.riftPendingExpiresAt) || 0);
  if (!pendingActive && now < (Number(player.riftReadyAt) || 0)) return false;

  const targetX = Number(targetPoint?.x);
  const targetY = Number(targetPoint?.y);
  const hasTargetPoint = Number.isFinite(targetX) && Number.isFinite(targetY);
  const aim = getPlayerAim();

  if (pendingActive) {
    const portalB = hasTargetPoint
      ? resolveLocalRiftPortalPlacementAtTarget(
        pendingPortalA.x,
        pendingPortalA.y,
        targetX,
        targetY,
        RIFT_LOCAL_RANGE_B_PX,
        RIFT_LOCAL_PORTAL_RADIUS_PX
      )
      : resolveLocalRiftPortalPlacement(
        pendingPortalA.x,
        pendingPortalA.y,
        aim,
        RIFT_LOCAL_RANGE_B_PX,
        RIFT_LOCAL_PORTAL_RADIUS_PX
      );
    if (!portalB) {
      return false;
    }

    rifts.push({
      riftId: `local-rift-${Math.floor(now * 1000)}`,
      owner: 'player',
      portalA: pendingPortalA,
      portalB,
      portalRadius: Math.max(6, RIFT_LOCAL_PORTAL_RADIUS_PX),
      linkedAt: now,
      expiresAt: now + RIFT_LOCAL_DURATION_SEC,
      pendingTeleports: [],
      portalEntriesRemainingBySide: { A: 1, B: 1 },
      reuseLockoutUntil: { player: 0, dummy: 0 }
    });
    if (rifts.length > 8) {
      rifts.splice(0, rifts.length - 8);
    }

    player.riftPendingPortalA = null;
    player.riftPendingExpiresAt = 0;
    player.riftReadyAt = now + player.riftCooldown;
    spawnBurst(portalB.x, portalB.y, 'rgba(138,190,255,0.78)', 10, 105);
    pushCombatImpactWave(portalB.x, portalB.y, {
      color: '142,194,255',
      duration: 0.2,
      startRadius: 12,
      endRadius: 52,
      alpha: 0.5,
      fillAlpha: 0.1,
      width: 2.1,
    });
    triggerArenaSpriteCastForActor(player, now);
    return true;
  }

  const portalA = hasTargetPoint
    ? resolveLocalRiftPortalPlacementAtTarget(
      player.x,
      player.y,
      targetX,
      targetY,
      RIFT_LOCAL_RANGE_A_PX,
      RIFT_LOCAL_PORTAL_RADIUS_PX
    )
    : resolveLocalRiftPortalPlacement(
      player.x,
      player.y,
      aim,
      RIFT_LOCAL_RANGE_A_PX,
      RIFT_LOCAL_PORTAL_RADIUS_PX
    );
  if (!portalA) return false;

  player.riftPendingPortalA = portalA;
  player.riftPendingExpiresAt = now + RIFT_LOCAL_PENDING_TIMEOUT_SEC;
  player.riftReadyAt = now;
  spawnBurst(portalA.x, portalA.y, 'rgba(138,190,255,0.74)', 9, 95);
  triggerArenaSpriteCastForActor(player, now);
  return true;
}

function createLocalPhantomSplitOffset() {
  const angle = Math.random() * Math.PI * 2;
  const distancePx = PHANTOM_LOCAL_SPLIT_RADIUS_PX * (0.4 + (Math.random() * 0.6));
  return {
    x: Math.cos(angle) * distancePx,
    y: Math.sin(angle) * distancePx
  };
}

function createLocalPhantomIllusionVelocity() {
  const angle = Math.random() * Math.PI * 2;
  const speed = PHANTOM_LOCAL_ILLUSION_SPEED_PX_PER_SEC * (0.7 + (Math.random() * 0.35));
  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed
  };
}

function getNextLocalPhantomIllusionRetargetAt(nowSec = performance.now() / 1000) {
  return nowSec + (0.14 + (Math.random() * 0.22));
}

function getLocalPhantomIllusionFacing(illusionX, illusionY, fallbackX = 1, fallbackY = 0) {
  const ix = Number(illusionX);
  const iy = Number(illusionY);
  if (dummyEnabled && dummy?.alive && Number.isFinite(ix) && Number.isFinite(iy)) {
    const toOpponentX = (Number(dummy.x) || 0) - ix;
    const toOpponentY = (Number(dummy.y) || 0) - iy;
    if ((Math.abs(toOpponentX) + Math.abs(toOpponentY)) > 0.0001) {
      return normalized(toOpponentX, toOpponentY);
    }
  }
  return normalized(fallbackX, fallbackY);
}

function castPhantom() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive || now < (Number(player.phantomReadyAt) || 0)) return;

  const splitOffset = createLocalPhantomSplitOffset();
  player.phantomReadyAt = now + player.phantomCooldown;
  player.phantomVanishUntil = now + PHANTOM_LOCAL_VANISH_SEC;
  player.phantomIllusionUntil = player.phantomVanishUntil + PHANTOM_LOCAL_ILLUSION_SEC;
  player.phantomSplitApplied = false;
  player.phantomOriginX = Number(player.x) || 0;
  player.phantomOriginY = Number(player.y) || 0;
  player.phantomSplitOffsetX = splitOffset.x;
  player.phantomSplitOffsetY = splitOffset.y;
  player.phantomIllusionX = player.phantomOriginX;
  player.phantomIllusionY = player.phantomOriginY;
  player.phantomIllusionVelX = 0;
  player.phantomIllusionVelY = 0;
  player.phantomIllusionRetargetAt = 0;
  player.phantomIllusionLastAt = now;
  player.vx = 0;
  player.vy = 0;

  for (let i = phantomIllusions.length - 1; i >= 0; i -= 1) {
    if (String(phantomIllusions[i]?.owner || '') === 'player') {
      phantomIllusions.splice(i, 1);
    }
  }
  spawnBurst(player.x, player.y, 'rgba(214,196,255,0.72)', 12, 98);
  triggerArenaSpriteCastForActor(player, now);
}

function updateLocalRiftRuntime() {
  const now = performance.now() / 1000;

  if ((Number(player.riftPendingExpiresAt) || 0) > 0 && now >= (Number(player.riftPendingExpiresAt) || 0)) {
    player.riftPendingPortalA = null;
    player.riftPendingExpiresAt = 0;
    if (player.riftPlacementActive) {
      clearLocalRiftPlacement();
    }
  }

  for (let i = rifts.length - 1; i >= 0; i -= 1) {
    const rift = rifts[i];
    if (!rift || now >= (Number(rift.expiresAt) || 0)) {
      rifts.splice(i, 1);
      continue;
    }

    if (!Array.isArray(rift.pendingTeleports)) rift.pendingTeleports = [];
    if (!rift.portalEntriesRemainingBySide || typeof rift.portalEntriesRemainingBySide !== 'object') {
      rift.portalEntriesRemainingBySide = { A: 1, B: 1 };
    }
    if (!rift.reuseLockoutUntil || typeof rift.reuseLockoutUntil !== 'object') {
      rift.reuseLockoutUntil = { player: 0, dummy: 0 };
    }

    for (let entryIndex = rift.pendingTeleports.length - 1; entryIndex >= 0; entryIndex -= 1) {
      const entry = rift.pendingTeleports[entryIndex];
      if (!entry || now < (Number(entry.executeAt) || 0)) continue;
      const actor = entry.key === 'dummy' ? dummy : player;
      const actorEnabled = entry.key === 'dummy'
        ? (dummyEnabled && dummy.alive)
        : player.alive;
      if (!actorEnabled) {
        rift.pendingTeleports.splice(entryIndex, 1);
        continue;
      }

      const fromPortal = entry.from === 'A' ? rift.portalA : rift.portalB;
      const toPortal = entry.from === 'A' ? rift.portalB : rift.portalA;
      const travelDir = normalized(
        (Number(toPortal?.x) || 0) - (Number(fromPortal?.x) || 0),
        (Number(toPortal?.y) || 0) - (Number(fromPortal?.y) || 0)
      );
      const outDistance = (Number(rift.portalRadius) || 10) + (Number(actor.r) || 16) + 8;
      actor.x = (Number(toPortal?.x) || 0) + (travelDir.x * outDistance);
      actor.y = (Number(toPortal?.y) || 0) + (travelDir.y * outDistance);
      pushActorOutOfObstacle(actor);
      actor.vx = (Number(entry.vx) || 0) * RIFT_LOCAL_EXIT_VELOCITY_MULTIPLIER;
      actor.vy = (Number(entry.vy) || 0) * RIFT_LOCAL_EXIT_VELOCITY_MULTIPLIER;
      rift.reuseLockoutUntil[entry.key] = now + RIFT_LOCAL_REUSE_LOCKOUT_SEC;
      rift.pendingTeleports.splice(entryIndex, 1);
      spawnBurst(actor.x, actor.y, 'rgba(142,194,255,0.82)', 9, 96);
    }

    const candidates = [
      { key: 'player', actor: player, enabled: player.alive },
      { key: 'dummy', actor: dummy, enabled: dummyEnabled && dummy.alive }
    ];
    for (const candidate of candidates) {
      if (!candidate.enabled) continue;
      if ((Number(rift.reuseLockoutUntil[candidate.key]) || 0) > now) continue;
      if (rift.pendingTeleports.some((entry) => entry && entry.key === candidate.key)) continue;

      const actorX = Number(candidate.actor.x) || 0;
      const actorY = Number(candidate.actor.y) || 0;
      const radius = Math.max(6, Number(rift.portalRadius) || 10);
      const inA = distance(actorX, actorY, Number(rift.portalA?.x) || 0, Number(rift.portalA?.y) || 0) <= radius;
      const inB = distance(actorX, actorY, Number(rift.portalB?.x) || 0, Number(rift.portalB?.y) || 0) <= radius;
      if (!inA && !inB) continue;
      const fromPortal = inA ? 'A' : 'B';
      const sideUsesRemaining = Number(rift.portalEntriesRemainingBySide?.[fromPortal]) || 0;
      if (sideUsesRemaining <= 0) continue;

      rift.pendingTeleports.push({
        key: candidate.key,
        from: fromPortal,
        executeAt: now + RIFT_LOCAL_TELEPORT_DELAY_SEC,
        vx: Number(candidate.actor.vx) || 0,
        vy: Number(candidate.actor.vy) || 0
      });
      rift.portalEntriesRemainingBySide[fromPortal] = Math.max(0, sideUsesRemaining - 1);
      rift.reuseLockoutUntil[candidate.key] = now + RIFT_LOCAL_REUSE_LOCKOUT_SEC;
    }

    const sideARemaining = Number(rift.portalEntriesRemainingBySide?.A) || 0;
    const sideBRemaining = Number(rift.portalEntriesRemainingBySide?.B) || 0;
    if (sideARemaining <= 0 && sideBRemaining <= 0 && rift.pendingTeleports.length <= 0) {
      rifts.splice(i, 1);
      continue;
    }
  }
}

function updateLocalPhantomRuntime() {
  const now = performance.now() / 1000;
  const vanishUntil = Number(player.phantomVanishUntil) || 0;
  const illusionUntil = Number(player.phantomIllusionUntil) || 0;
  const hasPhantomState = vanishUntil > 0 || illusionUntil > 0;
  if (!hasPhantomState) return;

  if (now < vanishUntil) {
    player.vx = 0;
    player.vy = 0;
    if (Number.isFinite(player.phantomOriginX) && Number.isFinite(player.phantomOriginY)) {
      player.x = player.phantomOriginX;
      player.y = player.phantomOriginY;
    }
    return;
  }

  if (!player.phantomSplitApplied && illusionUntil > now) {
    const originX = Number(player.phantomOriginX) || Number(player.x) || 0;
    const originY = Number(player.phantomOriginY) || Number(player.y) || 0;
    const splitX = Number(player.phantomSplitOffsetX) || 0;
    const splitY = Number(player.phantomSplitOffsetY) || 0;
    const realX = originX + splitX;
    const realY = originY + splitY;
    if (insidePlatform(realX, realY, player.r + 2) && !circleHitsObstacle(realX, realY, player.r)) {
      player.x = realX;
      player.y = realY;
    } else {
      player.x = originX;
      player.y = originY;
    }
    player.phantomSplitApplied = true;
    const initialIllusionX = originX - splitX;
    const initialIllusionY = originY - splitY;
    if (
      insidePlatform(initialIllusionX, initialIllusionY, player.r + 2)
      && !circleHitsObstacle(initialIllusionX, initialIllusionY, player.r)
    ) {
      player.phantomIllusionX = initialIllusionX;
      player.phantomIllusionY = initialIllusionY;
    } else {
      player.phantomIllusionX = originX;
      player.phantomIllusionY = originY;
    }
    const initialVelocity = createLocalPhantomIllusionVelocity();
    player.phantomIllusionVelX = initialVelocity.x;
    player.phantomIllusionVelY = initialVelocity.y;
    player.phantomIllusionRetargetAt = getNextLocalPhantomIllusionRetargetAt(now);
    player.phantomIllusionLastAt = now;
    spawnBurst(player.x, player.y, 'rgba(204,180,255,0.8)', 12, 110);
  }

  for (let i = phantomIllusions.length - 1; i >= 0; i -= 1) {
    const entry = phantomIllusions[i];
    if (String(entry?.owner || '') === 'player') {
      phantomIllusions.splice(i, 1);
    }
  }

  if (illusionUntil > now) {
    if (!Number.isFinite(Number(player.phantomIllusionX)) || !Number.isFinite(Number(player.phantomIllusionY))) {
      const splitX = Number(player.phantomSplitOffsetX) || 0;
      const splitY = Number(player.phantomSplitOffsetY) || 0;
      player.phantomIllusionX = player.x - (splitX * 2);
      player.phantomIllusionY = player.y - (splitY * 2);
    }

    const lastAt = Number(player.phantomIllusionLastAt) || now;
    const deltaSec = Math.max(0, Math.min(0.08, now - lastAt));
    let velX = Number(player.phantomIllusionVelX) || 0;
    let velY = Number(player.phantomIllusionVelY) || 0;
    let retargetAt = Number(player.phantomIllusionRetargetAt) || 0;

    if (Math.hypot(velX, velY) < 1) {
      const nextVelocity = createLocalPhantomIllusionVelocity();
      velX = nextVelocity.x;
      velY = nextVelocity.y;
      retargetAt = getNextLocalPhantomIllusionRetargetAt(now);
    } else if (retargetAt <= now) {
      const nextVelocity = createLocalPhantomIllusionVelocity();
      velX = nextVelocity.x;
      velY = nextVelocity.y;
      retargetAt = getNextLocalPhantomIllusionRetargetAt(now);
    }

    const currentX = Number(player.phantomIllusionX) || 0;
    const currentY = Number(player.phantomIllusionY) || 0;
    let nextX = currentX + (velX * deltaSec);
    let nextY = currentY + (velY * deltaSec);
    const blocked = !insidePlatform(nextX, nextY, player.r + 2)
      || circleHitsObstacle(nextX, nextY, Math.max(8, Number(player.r) || 18));
    if (blocked) {
      nextX = currentX;
      nextY = currentY;
      const nextVelocity = createLocalPhantomIllusionVelocity();
      velX = nextVelocity.x;
      velY = nextVelocity.y;
      retargetAt = Math.min(retargetAt, now + 0.12);
    }

    player.phantomIllusionX = nextX;
    player.phantomIllusionY = nextY;
    player.phantomIllusionVelX = velX;
    player.phantomIllusionVelY = velY;
    player.phantomIllusionRetargetAt = retargetAt;
    player.phantomIllusionLastAt = now;

    const facing = getLocalPhantomIllusionFacing(nextX, nextY, velX, velY);
    phantomIllusions.push({
      illusionId: 'local-player-phantom',
      owner: 'player',
      x: nextX,
      y: nextY,
      r: Math.max(10, Number(player.r) || 18),
      facingX: facing.x,
      facingY: facing.y,
      expiresAt: illusionUntil
    });
    return;
  }

  player.phantomVanishUntil = 0;
  player.phantomIllusionUntil = 0;
  player.phantomSplitApplied = false;
  player.phantomOriginX = player.x;
  player.phantomOriginY = player.y;
  player.phantomSplitOffsetX = 0;
  player.phantomSplitOffsetY = 0;
  player.phantomIllusionX = player.x;
  player.phantomIllusionY = player.y;
  player.phantomIllusionVelX = 0;
  player.phantomIllusionVelY = 0;
  player.phantomIllusionRetargetAt = 0;
  player.phantomIllusionLastAt = 0;
}

function getActorPrismDirection(actor, fallbackX = 1, fallbackY = 0) {
  const baseX = Number(actor?.prismDirX);
  const baseY = Number(actor?.prismDirY);
  if (Number.isFinite(baseX) && Number.isFinite(baseY) && (Math.abs(baseX) + Math.abs(baseY)) > 0.0001) {
    return normalized(baseX, baseY);
  }
  const aimX = Number(actor?.aimX);
  const aimY = Number(actor?.aimY);
  if (Number.isFinite(aimX) && Number.isFinite(aimY) && (Math.abs(aimX) + Math.abs(aimY)) > 0.0001) {
    return normalized(aimX, aimY);
  }
  return normalized(fallbackX, fallbackY);
}

function getLocalPrismShieldGeometry(actor, fallbackX = 1, fallbackY = 0) {
  if (!actor) return null;
  const now = performance.now() / 1000;
  if (now >= (Number(actor.prismUntil) || 0)) return null;
  const actorRadius = Math.max(10, Number(actor.r) || 0);
  const innerRadius = actorRadius + Math.max(1, PRISM_LOCAL_SHIELD_OFFSET_PX);
  const outerRadius = innerRadius + Math.max(1, PRISM_LOCAL_SHIELD_THICKNESS_PX);
  return {
    x: Number(actor.x) || 0,
    y: Number(actor.y) || 0,
    forward: getActorPrismDirection(actor, fallbackX, fallbackY),
    innerRadius,
    outerRadius
  };
}

function isPointInsideLocalPrismShieldBand(
  actor,
  pointX,
  pointY,
  radiusPadding = 0,
  fallbackX = 1,
  fallbackY = 0
) {
  const geometry = getLocalPrismShieldGeometry(actor, fallbackX, fallbackY);
  if (!geometry) return false;
  const safePadding = Math.max(0, Number(radiusPadding) || 0);
  const toPointX = Number(pointX) - geometry.x;
  const toPointY = Number(pointY) - geometry.y;
  const dist = Math.hypot(toPointX, toPointY);
  const innerBound = Math.max(0, geometry.innerRadius - safePadding);
  const outerBound = geometry.outerRadius + safePadding;
  if (dist <= 0.001 || dist < innerBound || dist > outerBound) return false;

  const toPointNormX = toPointX / dist;
  const toPointNormY = toPointY / dist;
  const dot = (geometry.forward.x * toPointNormX) + (geometry.forward.y * toPointNormY);
  return dot >= PRISM_LOCAL_SHIELD_COS_HALF_ARC;
}

function isPathIntersectingLocalPrismShieldBand(
  actor,
  fromX,
  fromY,
  toX,
  toY,
  radiusPadding = 0,
  fallbackX = 1,
  fallbackY = 0
) {
  if (isPointInsideLocalPrismShieldBand(actor, fromX, fromY, radiusPadding, fallbackX, fallbackY)) return true;
  if (isPointInsideLocalPrismShieldBand(actor, toX, toY, radiusPadding, fallbackX, fallbackY)) return true;
  const dx = (Number(toX) || 0) - (Number(fromX) || 0);
  const dy = (Number(toY) || 0) - (Number(fromY) || 0);
  const travelDistance = Math.hypot(dx, dy);
  if (travelDistance <= 0.001) return false;
  const safePadding = Math.max(0, Number(radiusPadding) || 0);
  const sampleStep = Math.max(4, safePadding * 0.65);
  const sampleCount = Math.max(1, Math.min(18, Math.ceil(travelDistance / sampleStep)));
  for (let i = 1; i < sampleCount; i += 1) {
    const t = i / sampleCount;
    const sampleX = (Number(fromX) || 0) + (dx * t);
    const sampleY = (Number(fromY) || 0) + (dy * t);
    if (isPointInsideLocalPrismShieldBand(actor, sampleX, sampleY, radiusPadding, fallbackX, fallbackY)) {
      return true;
    }
  }
  return false;
}

function castPrism() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive || now < player.prismReadyAt) return;
  const facing = getPlayerAim();
  player.prismReadyAt = now + player.prismCooldown;
  player.prismUntil = now + PRISM_LOCAL_DURATION_SEC;
  player.prismDirX = facing.x;
  player.prismDirY = facing.y;
  soundShield();
  spawnBurst(player.x, player.y, 'rgba(116,236,206,0.86)', 12, 110);
  pushCombatImpactWave(player.x, player.y, {
    color: '128,236,212',
    duration: 0.18,
    startRadius: player.r + 8,
    endRadius: player.r + 46,
    alpha: 0.52,
    fillAlpha: 0.1,
    width: 2.4,
  });
  triggerArenaSpriteCastForActor(player, now);
}

function castSolar() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive || now < player.solarReadyAt) return;
  const dir = getPlayerAim();
  player.solarReadyAt = now + player.solarCooldown;
  soundFire();
  spawnBurst(player.x, player.y, 'rgba(255,216,132,0.88)', 10, 92);
  projectiles.push({
    owner: 'player',
    abilityId: 'solar',
    x: player.x + dir.x * (player.r + SOLAR_LOCAL_PROJECTILE_RADIUS_PX + 6),
    y: player.y + dir.y * (player.r + SOLAR_LOCAL_PROJECTILE_RADIUS_PX + 6),
    vx: dir.x * SOLAR_LOCAL_SPEED_PX_PER_SEC,
    vy: dir.y * SOLAR_LOCAL_SPEED_PX_PER_SEC,
    r: Math.max(6, SOLAR_LOCAL_PROJECTILE_RADIUS_PX),
    life: SOLAR_LOCAL_LIFETIME_SEC,
    damage: SOLAR_LOCAL_DAMAGE,
    knockback: SOLAR_LOCAL_KNOCKBACK_PX,
    impactRadius: SOLAR_LOCAL_IMPACT_RADIUS_PX,
  });
  triggerArenaSpriteCastForActor(player, now);
}

function tryHandleLocalPrismProjectileIntercept(projectile, targetActor, previousPoint = null) {
  if (!projectile || !targetActor) return { intercepted: false, reflected: false };
  const pointX = Number(projectile.x) || 0;
  const pointY = Number(projectile.y) || 0;
  const projectileRadius = Math.max(1, Number(projectile.r) || 0);
  const previousX = Number.isFinite(Number(previousPoint?.x)) ? Number(previousPoint.x) : pointX;
  const previousY = Number.isFinite(Number(previousPoint?.y)) ? Number(previousPoint.y) : pointY;
  const incomingX = -(Number(projectile.vx) || 0);
  const incomingY = -(Number(projectile.vy) || 0);
  const intersectsShieldBand = isPathIntersectingLocalPrismShieldBand(
    targetActor,
    previousX,
    previousY,
    pointX,
    pointY,
    projectileRadius,
    incomingX,
    incomingY
  );
  if (!intersectsShieldBand) {
    return { intercepted: false, reflected: false };
  }

  const abilityId = String(projectile.abilityId || 'fireblast').trim().toLowerCase();
  const canReflect = abilityId === 'fireblast' || abilityId === 'hook' || abilityId === 'gust';
  const prismDir = getActorPrismDirection(targetActor, incomingX, incomingY);

  if (canReflect) {
    const speed = Math.max(1, Math.hypot(Number(projectile.vx) || 0, Number(projectile.vy) || 0));
    const actorRadius = Math.max(10, Number(targetActor.r) || 0);
    const reflectSpawnOffset = Math.max(
      actorRadius + projectileRadius + 4,
      actorRadius + PRISM_LOCAL_SHIELD_OFFSET_PX + PRISM_LOCAL_SHIELD_THICKNESS_PX + projectileRadius + 2
    );
    projectile.owner = targetActor === player ? 'player' : 'dummy';
    projectile.vx = prismDir.x * speed;
    projectile.vy = prismDir.y * speed;
    projectile.x = targetActor.x + prismDir.x * reflectSpawnOffset;
    projectile.y = targetActor.y + prismDir.y * reflectSpawnOffset;
    projectile.life = Math.max(0.01, Number(projectile.life) || 0.01);
    spawnBurst(projectile.x, projectile.y, 'rgba(120,236,206,0.88)', 9, 84);
    return { intercepted: true, reflected: true };
  }

  spawnBurst(pointX, pointY, 'rgba(120,236,206,0.88)', 9, 84);
  return { intercepted: true, reflected: false };
}

function explodeSolarProjectileLocal(projectile, reason = 'impact') {
  if (!projectile) return;
  const ownerActor = projectile.owner === 'player' ? player : dummy;
  const targetActor = projectile.owner === 'player' ? dummy : player;
  const canHitTarget = targetActor && targetActor.alive && (targetActor !== dummy || dummyEnabled);
  const impactRadius = Math.max(8, Number(projectile.impactRadius) || SOLAR_LOCAL_IMPACT_RADIUS_PX);

  spawnBurst(projectile.x, projectile.y, 'rgba(255,214,128,0.94)', 14, 128);
  pushCombatImpactWave(projectile.x, projectile.y, {
    color: '255,214,128',
    duration: 0.2,
    startRadius: 14,
    endRadius: impactRadius * 1.5,
    alpha: 0.58,
    fillAlpha: 0.16,
    width: 2.4,
  });

  if (!canHitTarget) return;
  const dist = distance(projectile.x, projectile.y, targetActor.x, targetActor.y);
  if (dist > impactRadius + targetActor.r) return;

  if (isPointInsideLocalPrismShieldBand(
    targetActor,
    projectile.x,
    projectile.y,
    Math.max(0, Number(projectile.r) || 0),
    -(Number(projectile.vx) || 0),
    -(Number(projectile.vy) || 0)
  )) {
    spawnBurst(targetActor.x, targetActor.y, 'rgba(120,236,206,0.84)', 8, 84);
    return;
  }

  const away = normalized(targetActor.x - (Number(ownerActor?.x) || projectile.x), targetActor.y - (Number(ownerActor?.y) || projectile.y));
  if (targetActor === player) {
    spawnArenaHitFlash(projectile.x, projectile.y, 'player');
    damagePlayer(Math.max(0, Number(projectile.damage) || SOLAR_LOCAL_DAMAGE));
    player.vx += away.x * Math.max(0, Number(projectile.knockback) || SOLAR_LOCAL_KNOCKBACK_PX);
    player.vy += away.y * Math.max(0, Number(projectile.knockback) || SOLAR_LOCAL_KNOCKBACK_PX);
    player.solarDistortionUntil = Math.max(Number(player.solarDistortionUntil) || 0, (performance.now() / 1000) + SOLAR_LOCAL_DEBUFF_SEC);
  } else if (targetActor === dummy) {
    spawnArenaHitFlash(projectile.x, projectile.y, 'dummy');
    damageDummy(Math.max(0, Number(projectile.damage) || SOLAR_LOCAL_DAMAGE));
    dummy.vx += away.x * Math.max(0, Number(projectile.knockback) || SOLAR_LOCAL_KNOCKBACK_PX);
    dummy.vy += away.y * Math.max(0, Number(projectile.knockback) || SOLAR_LOCAL_KNOCKBACK_PX);
    dummy.solarDistortionUntil = Math.max(Number(dummy.solarDistortionUntil) || 0, (performance.now() / 1000) + SOLAR_LOCAL_DEBUFF_SEC);
  }

  if (reason !== 'range_end') {
    triggerCombatScreenShake(1, 0.22);
  }
}

function shootFire() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive || now < player.fireReadyAt) return;
  const dir = getPlayerAim();
  player.fireReadyAt = now + player.fireCooldown;
  soundFire();
  triggerArenaSpriteCastForActor(player, now);
  projectiles.push({
    owner: 'player',
    abilityId: 'fireblast',
    x: player.x + dir.x * (player.r + 10),
    y: player.y + dir.y * (player.r + 10),
    vx: dir.x * 620, vy: dir.y * 620,
    r: 7, life: 1.3, damage: 20, knockback: 360
  });
}

function shootFireFromDummy() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !dummyEnabled || !dummy.alive || now < dummy.fireReadyAt) return;
  if (hasObstacleBetween(dummy.x, dummy.y, player.x, player.y, 2)) return;
  const dir = normalized(player.x - dummy.x, player.y - dummy.y);
  dummy.fireReadyAt = now + dummy.fireCooldown;
  soundFire();
  triggerArenaSpriteCastForActor(dummy, now);

  projectiles.push({
    owner: 'dummy',
    abilityId: 'fireblast',
    x: dummy.x + dir.x * (dummy.r + 10),
    y: dummy.y + dir.y * (dummy.r + 10),
    vx: dir.x * 520, vy: dir.y * 520,
    r: 7, life: 1.35, damage: 14, knockback: 250
  });
}

function castHookFromPlayer() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive || now < player.hookReadyAt) return;
  const dir = getPlayerAim();
  player.hookReadyAt = now + player.hookCooldown;
  soundHook();
  triggerArenaSpriteCastForActor(player, now);
  spawnBurst(player.x, player.y, 'rgba(182,228,255,0.9)', 10, 135);
  pushDirectionalWave(player.x, player.y, dir.x, dir.y, {
    color: '170,218,255',
    duration: 0.18,
    travel: 94,
    spread: 18,
    alpha: 0.5,
    width: 2.2,
  });
  hooks.push({
    owner: 'player', state: 'flying',
    x: player.x, y: player.y, sx: player.x, sy: player.y,
    tx: player.x + dir.x * (player.teleportDistance * 1.5),
    ty: player.y + dir.y * (player.teleportDistance * 1.5),
    progress: 0, speed: 3.03, damage: 20
  });
}

function castHookFromDummy() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !dummyEnabled || !dummy.alive || now < dummy.hookReadyAt) return;
  const dist = distance(dummy.x, dummy.y, player.x, player.y);
  if (dist > 325 || hasObstacleBetween(dummy.x, dummy.y, player.x, player.y, 0)) return;
  dummy.hookReadyAt = now + dummy.hookCooldown;
  soundHook();

  triggerArenaSpriteCastForActor(dummy, now);
  spawnBurst(dummy.x, dummy.y, 'rgba(255,208,170,0.88)', 10, 128);
  pushDirectionalWave(dummy.x, dummy.y, player.x - dummy.x, player.y - dummy.y, {
    color: '255,196,156',
    duration: 0.18,
    travel: 90,
    spread: 18,
    alpha: 0.48,
    width: 2.2,
  });

  hooks.push({
    owner: 'dummy', state: 'flying',
    x: dummy.x, y: dummy.y, sx: dummy.x, sy: dummy.y,
    tx: player.x, ty: player.y,
    progress: 0, speed: 3.22, damage: 16
  });
}

function castShield() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive || now < player.shieldReadyAt) return;
  player.shieldReadyAt = now + player.shieldCooldown;
  player.shieldUntil   = now + 1.0;
  soundShield();
  triggerArenaSpriteCastForActor(player, now);
  spawnBurst(player.x, player.y, 'rgba(130,190,255,0.9)', 18, 140);
}

function stopArcaneCharge(spawnImpact = false) {
  if (!player.chargeActive) return;
  player.chargeActive = false;
  player.chargeTimer = 0;
  player.vx *= 0.18;
  player.vy *= 0.18;
  if (spawnImpact) spawnBurst(player.x, player.y, 'rgba(180,120,255,0.9)', 12, 150);
}

function castArcaneCharge() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive || now < player.chargeReadyAt || player.chargeActive) return;
  const dir = getPlayerAim();
  player.chargeReadyAt = now + player.chargeCooldown;
  triggerArenaSpriteDashForActor(player, now);
  player.chargeActive = true;
  player.chargeDirX = dir.x;
  player.chargeDirY = dir.y;
  player.chargeTimer = player.teleportDistance / 760;
  player.chargeHit = false;
  player.vx = dir.x * 760;
  player.vy = dir.y * 760;
  soundCharge();
  spawnBurst(player.x, player.y, 'rgba(180,120,255,0.95)', 16, 170);
}

function castShockBlast() {
  const now = performance.now() / 1000;

  if (
    gameState !== 'playing' ||
    !player.alive ||
    now < player.shockReadyAt
  ) return;

  const dir = getPlayerAim();
  player.shockReadyAt = now + player.shockCooldown;

  triggerArenaSpriteCastForActor(player, now);

  soundShock();
  const usePracticeSpellImageFx = shouldUsePracticeSpellImageFx();

  const range = 115;
  const angle = Math.PI / 3;
  const damage = 14;
  const knockback = 680;

  if (dummyEnabled && dummy.alive) {
    const dx = dummy.x - player.x;
    const dy = dummy.y - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= range) {
      const nd = normalized(dx, dy);
      const dot = nd.x * dir.x + nd.y * dir.y;

      if (dot > Math.cos(angle / 2)) {
        spawnArenaHitFlash(dummy.x, dummy.y, 'dummy');
        damageDummy(damage);
        dummy.vx += nd.x * knockback;
        dummy.vy += nd.y * knockback;
        if (usePracticeSpellImageFx) {
          spawnPracticeSpellImageFx('shock', {
            x: dummy.x,
            y: dummy.y,
            dirX: nd.x,
            dirY: nd.y,
            maxLife: 0.24,
            width: 138,
            height: 138,
            alpha: 0.82,
            scaleFrom: 0.96,
            scaleTo: 1.18,
          });
        } else {
          spawnBurst(dummy.x, dummy.y, 'rgba(255,200,120,0.95)', 18, 200);
        }
      }
    }
  }

  if (usePracticeSpellImageFx) {
    spawnPracticeSpellImageFx('shock', {
      x: player.x + (dir.x * (player.r + 30)),
      y: player.y + (dir.y * (player.r + 30)),
      dirX: dir.x,
      dirY: dir.y,
      maxLife: 0.3,
      width: 228,
      height: 176,
      alpha: 0.92,
      scaleFrom: 0.88,
      scaleTo: 1.12,
    });
  } else {
    spawnBurst(player.x, player.y, 'rgba(255,180,120,0.7)', 12, 120);
  }
}

function castGust() {
  const now = performance.now() / 1000;

  if (
    gameState !== 'playing' ||
    !player.alive ||
    now < player.gustReadyAt
  ) return;

  player.gustReadyAt = now + player.gustCooldown;

  triggerArenaSpriteCastForActor(player, now);

  soundGust();

  const radius = 120;
  const damage = 4;
  const knockback = 540;

  spawnBurst(player.x, player.y, 'rgba(170,245,255,0.92)', 18, radius * 1.7);
  spawnGustCasterWindFx(player.x, player.y, { scale: 1 });

  if (dummyEnabled && dummy.alive) {
    const dx = dummy.x - player.x;
    const dy = dummy.y - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= radius + dummy.r) {
      const dir = dist > 0.001 ? normalized(dx, dy) : { x: 1, y: 0 };
      spawnArenaHitFlash(dummy.x, dummy.y, 'dummy');
      damageDummy(damage);
      dummy.vx += dir.x * knockback;
      dummy.vy += dir.y * knockback;
      spawnBurst(dummy.x, dummy.y, 'rgba(190,250,255,0.96)', 16, 180);
      if (dummyBehavior === 'active' && dist < 90) {
        dummy.targetX = dummy.x + dir.x * 120;
        dummy.targetY = dummy.y + dir.y * 120;
      }
    }
  }
}

function castWall() {
  const now = performance.now() / 1000;

  if (gameState !== 'playing' || !player.alive || now < player.wallReadyAt) return;

  const placement = getWallPlacementData();
  if (!placement) return;

  player.wallReadyAt = now + player.wallCooldown;

  triggerArenaSpriteCastForActor(player, now);

  soundWall();
  const usePracticeSpellImageFx = shouldUsePracticeSpellImageFx();

  walls.push({
    x: placement.centerX,
    y: placement.centerY,
    dirX: placement.dir.x,
    dirY: placement.dir.y,
    perpX: placement.perp.x,
    perpY: placement.perp.y,
    life: placement.duration,
    maxLife: placement.duration,
    segments: placement.segments,
  });

  if (!usePracticeSpellImageFx) {
    for (const seg of placement.segments) {
      spawnBurst(seg.x, seg.y, 'rgba(165, 210, 255, 0.88)', 6, 90);
    }
  }
}

function castRewind() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive || now < player.rewindReadyAt) return;

  const target = getSafeRewindTarget(getRewindTarget(player.rewindSeconds || 1.0));
  if (!target) return;

  player.rewindReadyAt = now + player.rewindCooldown;
  stopArcaneCharge(false);
  player.vx = 0;
  player.vy = 0;

  triggerArenaSpriteCastForActor(player, now);

  soundRewind();

  const fromX = player.x;
  const fromY = player.y;
  const dx = target.x - fromX;
  const dy = target.y - fromY;

  const rewindTrailCount = getScaledEffectCount(14, 8);
  for (let i = 0; i < rewindTrailCount; i++) {
    const p = i / Math.max(1, rewindTrailCount - 1);
    addParticle({
      x: fromX + dx * p + (Math.random() - 0.5) * 8,
      y: fromY + dy * p + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      life: 0.20 + Math.random() * 0.10,
      size: 3 + Math.random() * 3,
      color: 'rgba(180,120,255,0.88)'
    });
  }

  spawnBurst(fromX, fromY, 'rgba(170,120,255,0.92)', 16, 170);
  player.x = target.x;
  player.y = target.y;
  spawnBurst(player.x, player.y, 'rgba(220,180,255,0.96)', 18, 190);
  recordRewindHistory(true);
}

function updateArcaneCharge(dt) {
  if (!player.chargeActive || !player.alive) return;
  if (gameState !== 'playing' && gameState !== 'result') {
    stopArcaneCharge(false);
    return;
  }

  const dir = normalized(player.chargeDirX, player.chargeDirY);
  const speed = 760;
  const knockbackImpulse = 960;
  const stepDt = dt / 4;

  for (let step = 0; step < 4; step++) {
    if (!player.chargeActive) break;

    const nextX = player.x + dir.x * speed * stepDt;
    const nextY = player.y + dir.y * speed * stepDt;
    const obstacle = circleHitsObstacle(nextX, nextY, player.r);
    if (obstacle) {
      stopArcaneCharge(true);
      break;
    }

    player.x = nextX;
    player.y = nextY;
    player.vx = dir.x * speed;
    player.vy = dir.y * speed;

    // Reduce Charge purple particle density by 50% while preserving style.
    if ((step % 2) === 0) {
      addParticle({
        x: player.x - dir.x * (player.r + 6),
        y: player.y - dir.y * (player.r + 6),
        vx: -dir.x * 80 + (Math.random() - 0.5) * 70,
        vy: -dir.y * 80 + (Math.random() - 0.5) * 70,
        life: 0.18 + Math.random() * 0.06,
        size: 4 + Math.random() * 3,
        color: 'rgba(190,140,255,0.92)'
      });
    }

    if (!player.chargeHit && dummyEnabled && dummy.alive && distance(player.x, player.y, dummy.x, dummy.y) <= player.r + dummy.r + 8) {
      player.chargeHit = true;
      spawnArenaHitFlash(dummy.x, dummy.y, 'dummy');
      damageDummy(16);
      dummy.vx += dir.x * knockbackImpulse;
      dummy.vy += dir.y * knockbackImpulse;
      spawnBurst(dummy.x, dummy.y, 'rgba(210,150,255,0.95)', 18, 210);
      soundChargeHit();
      stopArcaneCharge(false);
      break;
    }
  }

  player.chargeTimer -= dt;
  if (player.chargeTimer <= 0) stopArcaneCharge(false);
}

function getBlinkTargetPreview() {
  const dir = getPlayerAim();
  let tx = player.x + dir.x * player.teleportDistance;
  let ty = player.y + dir.y * player.teleportDistance;
  const clamped = clampPointToArenaOctagon(tx, ty, Number(player?.r) || 0);
  tx = clamped.x;
  ty = clamped.y;
  const blocked = !!circleHitsObstacle(tx, ty, player.r);
  return { x: tx, y: ty, blocked };
}

function tryTeleport() {
  const now = performance.now() / 1000;
  if (gameState !== 'playing' || !player.alive || now < player.teleportReadyAt) return;
  const target = getBlinkTargetPreview();
  if (target.blocked) return;
  const fromX = Number(player.x) || 0;
  const fromY = Number(player.y) || 0;
  player.teleportReadyAt = now + player.teleportCooldown;
  triggerArenaSpriteCastForActor(player, now);
  soundTeleport();
  spawnBlinkTeleportImageFx(fromX, fromY, target.x, target.y, {
    actorRadius: Number(player.r) || 18,
  });
  player.x = target.x;
  player.y = target.y;
  recordRewindHistory(true);
}

// ── AI ────────────────────────────────────────────────────────
function moveDummyAI(dt) {
  if (!dummyEnabled || !dummy.alive || !player.alive || gameState !== 'playing') return;
  if (dummyBehavior !== 'active') return;

  dummy.aiSwitchTimer -= dt;
  dummy.aiMoveTimer   -= dt;
  const distToPlayer = distance(dummy.x, dummy.y, player.x, player.y);

  if (dummy.aiSwitchTimer <= 0) {
    dummy.aiStrafeDir   = Math.random() < 0.5 ? -1 : 1;
    dummy.aiSwitchTimer = 1.2 + Math.random() * 1.3;
  }
  if (dummy.aiMoveTimer <= 0) {
    const away = normalized(dummy.x - player.x, dummy.y - player.y);
    const side = { x: -away.y * dummy.aiStrafeDir, y: away.x * dummy.aiStrafeDir };
    let desiredDist = 180;
    if (distToPlayer < 130) desiredDist = 220;
    if (distToPlayer > 250) desiredDist = 150;
    let tx = player.x + away.x * desiredDist + side.x * 70;
    let ty = player.y + away.y * desiredDist + side.y * 70;
    const clampedTarget = clampPointToArenaOctagon(tx, ty, (Number(dummy?.r) || 0) + 8);
    tx = clampedTarget.x;
    ty = clampedTarget.y;
    if (!circleHitsObstacle(tx, ty, dummy.r)) {
      dummy.targetX = tx;
      dummy.targetY = ty;
    }
    dummy.aiMoveTimer = 0.35 + Math.random() * 0.35;
  }

  const dir    = normalized(dummy.targetX - dummy.x, dummy.targetY - dummy.y);
  const travel = distance(dummy.x, dummy.y, dummy.targetX, dummy.targetY);
  if (travel > 8) moveActorWithSlide(dummy, dir.x, dir.y, dt);
  clampActorMovementToPlatform(dummy);

  if (distToPlayer < 280 && !hasObstacleBetween(dummy.x, dummy.y, player.x, player.y, 3)) {
    shootFireFromDummy();
    if (distToPlayer < 220 && Math.random() < 0.008) castHookFromDummy();
  }
}

// ── Potions ───────────────────────────────────────────────────
function findValidSpawnNear(x, y, radius) {
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const px    = x + Math.cos(angle) * radius;
    const py    = y + Math.sin(angle) * radius;
    if (insidePlatform(px, py, 18) && !circleHitsObstacle(px, py, 18)) return { x: px, y: py };
  }
  return { x: arena.cx, y: arena.cy };
}

function spawnPotion() {
  if (potions.length >= 2 || gameState !== 'playing') return;
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 30 + Math.random() * Math.max(30, arena.radius - 70);
    const x     = arena.cx + Math.cos(angle) * dist;
    const y     = arena.cy + Math.sin(angle) * dist;
    if (!insidePlatform(x, y, 18) || circleHitsObstacle(x, y, 14)) continue;
    if (distance(x, y, player.x, player.y) < 60 || (dummyEnabled && distance(x, y, dummy.x, dummy.y) < 60)) continue;
    potions.push({ x, y, r: 12, heal: getPotionHealAmount(), life: 10 });
    break;
  }
}

function updatePotions(dt) {
  if (gameState !== 'playing') return;
  potionSpawnTimer -= dt;
  if (potionSpawnTimer <= 0) {
    spawnPotion();
    potionSpawnTimer = 6 + Math.random() * 5;
  }
  for (let i = potions.length - 1; i >= 0; i--) {
    const potion = potions[i];
    potion.life -= dt;
    if (potion.life <= 0) { potions.splice(i, 1); continue; }
    if (player.alive && distance(player.x, player.y, potion.x, potion.y) <= player.r + potion.r) {
      healActor(player, potion.heal);
      spawnBurst(potion.x, potion.y, 'rgba(120,255,160,0.9)', 14, 110);
      potions.splice(i, 1);
      continue;
    }
    if (dummyEnabled && dummy.alive && distance(dummy.x, dummy.y, potion.x, potion.y) <= dummy.r + potion.r) {
      healActor(dummy, potion.heal);
      spawnBurst(potion.x, potion.y, 'rgba(120,255,160,0.9)', 14, 110);
      potions.splice(i, 1);
    }
  }
}

// ── Arena Shrink ──────────────────────────────────────────────
function updateArenaShrink(dt) {
  if (gameState !== 'playing' || arena.shrinkEnabled === false) return;
  arena.shrinkTimer -= dt;
  if (arena.shrinkTimer <= 0) {
    arena.radius      = Math.max(arena.minRadius, arena.radius - arena.shrinkStep);
    arena.shrinkTimer = arena.shrinkInterval;
    updateArenaGeometry(false);
    buildObstacles();
    if (dummyEnabled) clampActorMovementToPlatform(dummy);
    for (let i = potions.length - 1; i >= 0; i--)
      if (!insidePlatform(potions[i].x, potions[i].y, potions[i].r)) potions.splice(i, 1);
  }
}

// ── Match Flow ────────────────────────────────────────────────
function killPlayer(reason) {
  if (!player.alive) return;
  stopArcaneCharge(false);
  player.alive = false;
  player.deadReason = reason;
  spawnBurst(player.x, player.y, 'rgba(255,90,50,0.95)', 24, 260);
  pushCombatImpactWave(player.x, player.y, {
    color: '255,116,88',
    duration: 0.36,
    startRadius: player.r + 16,
    endRadius: player.r + 120,
    alpha: 0.78,
    fillAlpha: 0.18,
    width: 3.6,
  });
  triggerEliminationPulse(player.x, player.y, null, 1);
  triggerCombatScreenShake(0.54, 0.2);
  endMatch(false);
}

function killDummy(reason) {
  if (!dummy.alive) return;
  dummy.alive = false;
  dummy.deadReason = reason;
  spawnBurst(dummy.x, dummy.y, 'rgba(255,180,70,0.95)', 24, 260);
  pushCombatImpactWave(dummy.x, dummy.y, {
    color: '255,164,88',
    duration: 0.36,
    startRadius: dummy.r + 16,
    endRadius: dummy.r + 120,
    alpha: 0.78,
    fillAlpha: 0.18,
    width: 3.6,
  });
  triggerEliminationPulse(dummy.x, dummy.y, 1, 2);
  triggerCombatScreenShake(0.54, 0.2);
  endMatch(true);
}

function endMatch(playerWon) {
  if (gameState !== 'playing') return;
  gameState = 'result';
  winnerReward = null;

  void applyLeaderboardMatchResult(!!playerWon, { source: 'offline_match_end' });

  if (playerWon) {
    soundWin();
    winnerText = `${player.name} wins! +3 pts`;
    winnerReward = { currency: 1 };
    profile.wlk = Math.max(0, Math.floor(Number(profile.wlk) || 0) + 1);
    if (typeof saveProfile === 'function') saveProfile();
    if (typeof renderStore === 'function') renderStore();
    if (typeof renderInventory === 'function') renderInventory();
  } else {
    soundLose();
    winnerText = dummyEnabled
      ? 'Dummy wins! -3 pts'
      : 'Round ended -3 pts';
  }

  resultTimer = 2.2;
  updateHud();
}

function spawnDummy(mode = 'active') {
  dummyEnabled = true;
  dummyBehavior = mode;

  const d = findValidSpawnNear(dummySpawn.x, dummySpawn.y, 0);

  Object.assign(dummy, {
    x: d.x, y: d.y, vx: 0, vy: 0,
    hp: dummy.maxHp, alive: dummyEnabled, deadReason: dummyEnabled ? '' : 'removed',
    fireReadyAt: 0, hookReadyAt: 0,
    shieldUntil: 0,
    prismUntil: 0,
    solarDistortionUntil: 0,
    phantomVanishUntil: 0,
    castAnimStartedAt: 0,
    castAnimUntil: 0,
    dashAnimStartedAt: 0,
    dashAnimUntil: 0,
    hitAnimStartedAt: 0,
    hitAnimUntil: 0,
    prismDirX: -1,
    prismDirY: 0,
    aiSwitchTimer: 0, aiMoveTimer: 0, targetX: d.x, targetY: d.y
  });
}

function removeDummy() {
  dummyEnabled = false;
  dummy.alive = false;
  dummy.deadReason = 'removed';
}

function resetRound() {
  updateArenaGeometry(true);
  arena.shrinkTimer    = arena.shrinkInterval;
  buildObstacles();
  player.hookCooldown  = getHookCooldown();

  const p = findValidSpawnNear(playerSpawn.x, playerSpawn.y, 0);
  const d = findValidSpawnNear(dummySpawn.x,  dummySpawn.y,  0);

  Object.assign(player, {
    x: p.x, y: p.y, vx: 0, vy: 0,
    hp: player.maxHp, alive: true, deadReason: '',
    fireReadyAt: 0, hookReadyAt: 0, teleportReadyAt: 0, shieldReadyAt: 0, prismReadyAt: 0, chargeReadyAt: 0, shockReadyAt: 0, gustReadyAt: 0, solarReadyAt: 0, riftReadyAt: 0, phantomReadyAt: 0, wallReadyAt: 0, rewindReadyAt: 0,
    shieldUntil: 0, prismUntil: 0, solarDistortionUntil: 0, riftPendingExpiresAt: 0, riftPendingPortalA: null, riftPlacementActive: false, phantomVanishUntil: 0, phantomIllusionUntil: 0, phantomSplitApplied: false,
    phantomOriginX: p.x, phantomOriginY: p.y, phantomSplitOffsetX: 0, phantomSplitOffsetY: 0,
    phantomIllusionX: p.x, phantomIllusionY: p.y, phantomIllusionVelX: 0, phantomIllusionVelY: 0, phantomIllusionRetargetAt: 0, phantomIllusionLastAt: 0,
    chargeActive: false, chargeDirX: 0, chargeDirY: 0, chargeTimer: 0, chargeHit: false,
    dashAnimStartedAt: 0, dashAnimUntil: 0,
    castAnimStartedAt: 0, castAnimUntil: 0,
    hitAnimStartedAt: 0, hitAnimUntil: 0,
    aimX: 1, aimY: 0, prismDirX: 1, prismDirY: 0
  });

  Object.assign(dummy, {
    x: d.x, y: d.y, vx: 0, vy: 0,
    hp: dummy.maxHp, alive: dummyEnabled, deadReason: dummyEnabled ? '' : 'removed',
    fireReadyAt: 0, hookReadyAt: 0,
    shieldUntil: 0, prismUntil: 0, solarDistortionUntil: 0, phantomVanishUntil: 0,
    dashAnimStartedAt: 0, dashAnimUntil: 0,
    castAnimStartedAt: 0, castAnimUntil: 0,
    hitAnimStartedAt: 0, hitAnimUntil: 0,
    prismDirX: -1, prismDirY: 0,
    aiSwitchTimer: 0, aiMoveTimer: 0, targetX: d.x, targetY: d.y
  });

  projectiles.length  = 0;
  particles.length    = 0;
  damageTexts.length  = 0;
  hooks.length        = 0;
  walls.length        = 0;
  rifts.length        = 0;
  phantomIllusions.length = 0;
  potions.length      = 0;
  lavaTick            = 0;
  potionSpawnTimer    = 5 + Math.random() * 3;
  winnerText          = '';
  winnerReward        = null;
  resultTimer         = 0;
  lavaSoundTimer      = 0;
  resetCombatFeedbackState();
  resetMoveStick();
  skillAimPreview.active = false;
  skillAimPreview.type   = null;
  mouse.x = player.x + 120;
  mouse.y = player.y;
  clearRewindHistory();
  seedRewindHistory();
}

function getDraftSpellLabel(spellId) {
  const labels = {
    hook: 'Hook',
    blink: 'Blink',
    shield: 'Shield',
    prism: 'Prism',
    charge: 'Charge',
    shock: 'Shock',
    gust: 'Gust',
    solar: 'Solar',
    rift: 'Rift',
    phantom: 'Phantom',
    wall: 'Wall',
    rewind: 'Rewind',
  };

  return labels[spellId] || spellId;
}

function getDraftRoomLayoutTuning() {
  const roomCfg = window.OUTRA_VISUAL_CONFIG?.draftRoom || {};
  const layoutCfg = roomCfg.layout || {};
  const platformFitRadius = Math.max(
    1,
    Number.isFinite(Number(layoutCfg.platformFitRadius))
      ? Number(layoutCfg.platformFitRadius)
      : 1
  );

  return {
    centerOffsetX: Number.isFinite(Number(layoutCfg.centerOffsetX)) ? Number(layoutCfg.centerOffsetX) : 0,
    centerOffsetY: Number.isFinite(Number(layoutCfg.centerOffsetY)) ? Number(layoutCfg.centerOffsetY) : 0,
    gridOffsetX: Number.isFinite(Number(layoutCfg.gridOffsetX)) ? Number(layoutCfg.gridOffsetX) : 0,
    gridOffsetY: Number.isFinite(Number(layoutCfg.gridOffsetY)) ? Number(layoutCfg.gridOffsetY) : -6,
    gridInsidePadding: Number.isFinite(Number(layoutCfg.gridInsidePadding)) ? Number(layoutCfg.gridInsidePadding) : 26,
    tileWidth: Number.isFinite(Number(layoutCfg.tileWidth)) ? Number(layoutCfg.tileWidth) : 142,
    tileHeight: Number.isFinite(Number(layoutCfg.tileHeight)) ? Number(layoutCfg.tileHeight) : 68,
    tileGapX: Number.isFinite(Number(layoutCfg.tileGapX)) ? Number(layoutCfg.tileGapX) : 18,
    tileGapY: Number.isFinite(Number(layoutCfg.tileGapY)) ? Number(layoutCfg.tileGapY) : 20,
    moveRadiusScale: Number.isFinite(Number(layoutCfg.moveRadiusScale)) ? Number(layoutCfg.moveRadiusScale) : 0.92,
    moveRadiusPadding: Number.isFinite(Number(layoutCfg.moveRadiusPadding)) ? Number(layoutCfg.moveRadiusPadding) : -6,
    seatRadiusScale: Number.isFinite(Number(layoutCfg.seatRadiusScale)) ? Number(layoutCfg.seatRadiusScale) : 0.62,
    seatRadiusOffset: Number.isFinite(Number(layoutCfg.seatRadiusOffset)) ? Number(layoutCfg.seatRadiusOffset) : 0,
    sideSeatMode: layoutCfg.sideSeatMode !== false,
    sideSeatXFactor: Number.isFinite(Number(layoutCfg.sideSeatXFactor)) ? Number(layoutCfg.sideSeatXFactor) : 0.18,
    sideSeatYFactor: Number.isFinite(Number(layoutCfg.sideSeatYFactor)) ? Number(layoutCfg.sideSeatYFactor) : 0.24,
    sideSeatUsePanelAnchors: layoutCfg.sideSeatUsePanelAnchors !== false,
    sideSeatPanelOffsetY: Number.isFinite(Number(layoutCfg.sideSeatPanelOffsetY)) ? Number(layoutCfg.sideSeatPanelOffsetY) : 34,
    platformFitRadius,
    seatOffsets: roomCfg.playerSeatOffsets && typeof roomCfg.playerSeatOffsets === 'object'
      ? roomCfg.playerSeatOffsets
      : {},
  };
}

function getDraftSeatFromPanel(playerId, fallbackX, fallbackY, yOffset = 34) {
  const panelEl = document.querySelector(`[data-draft-player-panel="${playerId}"]`);
  if (!panelEl) {
    return { x: fallbackX, y: fallbackY };
  }

  const rect = panelEl.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) {
    return { x: fallbackX, y: fallbackY };
  }

  const panelCenterClientX = rect.left + rect.width * 0.5;
  const panelTargetClientY = rect.top - yOffset;
  const point = clientToCanvasPoint(panelCenterClientX, panelTargetClientY);
  return {
    x: Math.max(24, Math.min(canvas.width - 24, point.x)),
    y: Math.max(24, Math.min(canvas.height - 24, point.y)),
  };
}

function getDraftParticipantIds() {
  const order = Array.isArray(draftState.order) ? draftState.order : [];
  const seen = new Set();
  const ids = [];

  for (const id of order) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  const localId = draftState.localPlayerId || 'A';
  if (!ids.length) {
    ids.push(localId);
  } else if (!seen.has(localId)) {
    ids.unshift(localId);
  }

  return ids;
}

const draftLayoutCache = {
  key: '',
  layout: null,
  settleFrames: 0,
};

function getDraftLayoutTuningSignature(tune) {
  const seatOffsets = tune?.seatOffsets && typeof tune.seatOffsets === 'object'
    ? Object.keys(tune.seatOffsets).sort().map((id) => {
        const offset = tune.seatOffsets[id] || {};
        return `${id}:${Number(offset.x) || 0},${Number(offset.y) || 0}`;
      }).join(';')
    : '';

  return [
    Number(tune.centerOffsetX) || 0,
    Number(tune.centerOffsetY) || 0,
    Number(tune.gridOffsetX) || 0,
    Number(tune.gridOffsetY) || 0,
    Number(tune.gridInsidePadding) || 0,
    Number(tune.tileWidth) || 0,
    Number(tune.tileHeight) || 0,
    Number(tune.tileGapX) || 0,
    Number(tune.tileGapY) || 0,
    Number(tune.moveRadiusScale) || 0,
    Number(tune.moveRadiusPadding) || 0,
    Number(tune.seatRadiusScale) || 0,
    Number(tune.seatRadiusOffset) || 0,
    tune.sideSeatMode ? 1 : 0,
    Number(tune.sideSeatXFactor) || 0,
    Number(tune.sideSeatYFactor) || 0,
    tune.sideSeatUsePanelAnchors ? 1 : 0,
    Number(tune.sideSeatPanelOffsetY) || 0,
    Number(tune.platformFitRadius) || 1,
    seatOffsets,
  ].join('|');
}

function getDraftLayoutCacheKey() {
  const spellIds = Array.isArray(draftState.spellOrder) ? draftState.spellOrder : [];
  const participantIds = getDraftParticipantIds();
  const tune = getDraftRoomLayoutTuning();
  return [
    Math.round(Number(canvas?.width) || 0),
    Math.round(Number(canvas?.height) || 0),
    Math.round((Number(window.devicePixelRatio) || 1) * 100) / 100,
    String(draftState.localPlayerId || ''),
    spellIds.join(','),
    participantIds.join(','),
    getDraftLayoutTuningSignature(tune),
  ].join('::');
}

function invalidateDraftLayout(options = {}) {
  draftLayoutCache.key = '';
  draftLayoutCache.layout = null;
  draftState.layout = null;
  const settleFrames = Math.max(0, Math.floor(Number(options.settleFrames) || 0));
  if (settleFrames > draftLayoutCache.settleFrames) {
    draftLayoutCache.settleFrames = settleFrames;
  }
}

function getDraftLayout(options = {}) {
  const key = getDraftLayoutCacheKey();
  const shouldRebuild =
    !!options.force ||
    !draftLayoutCache.layout ||
    draftLayoutCache.key !== key ||
    draftLayoutCache.settleFrames > 0;

  if (shouldRebuild) {
    draftLayoutCache.layout = buildDraftLayout();
    draftLayoutCache.key = key;
    if (draftLayoutCache.settleFrames > 0) {
      draftLayoutCache.settleFrames -= 1;
    }
  }

  draftState.layout = draftLayoutCache.layout;
  return draftLayoutCache.layout;
}

function buildDraftLayout() {
  const tune = getDraftRoomLayoutTuning();
  const cx = canvas.width * 0.5 + tune.centerOffsetX;
  const cy = canvas.height * 0.57 + tune.centerOffsetY;
  const platformRadius = Math.max(170, Math.min(canvas.width, canvas.height) * 0.24);
  const spellIds = Array.isArray(draftState.spellOrder) ? draftState.spellOrder : [];
  const columnCount = Math.max(1, Math.min(4, spellIds.length || 4));
  const rowCount = Math.max(1, Math.ceil(Math.max(1, spellIds.length) / columnCount));
  const effectivePlatformRadius = platformRadius * Math.max(1, tune.platformFitRadius || 1);

  let gapX = Math.max(8, Number(tune.tileGapX) || 20);
  let gapY = Math.max(10, Number(tune.tileGapY) || 24);
  let tileW = Math.max(64, Number(tune.tileWidth) || 154);
  let tileH = Math.max(34, Number(tune.tileHeight) || 74);
  const maxLayoutWidth = Math.max(320, canvas.width - 40);
  const baseLayoutWidth = tileW * columnCount + gapX * Math.max(0, columnCount - 1);

  if (baseLayoutWidth > maxLayoutWidth) {
    const scale = maxLayoutWidth / baseLayoutWidth;
    tileW = Math.max(64, tileW * scale);
    tileH = Math.max(34, tileH * scale);
    gapX = Math.max(8, gapX * scale);
    gapY = Math.max(8, gapY * scale);
  }

  const allowedGridRadius = Math.max(
    48,
    effectivePlatformRadius - Math.max(0, tune.gridInsidePadding)
  );
  let layoutWidth = tileW * columnCount + gapX * Math.max(0, columnCount - 1);
  let layoutHeight = tileH * rowCount + gapY * Math.max(0, rowCount - 1);

  function fitGridInsideDraftCircle() {
    const halfDiagonal = Math.hypot(layoutWidth * 0.5, layoutHeight * 0.5);
    if (halfDiagonal <= allowedGridRadius) return;

    const scale = allowedGridRadius / Math.max(halfDiagonal, 1);
    tileW = Math.max(38, tileW * scale);
    tileH = Math.max(24, tileH * scale);
    gapX = Math.max(4, gapX * scale);
    gapY = Math.max(4, gapY * scale);

    layoutWidth = tileW * columnCount + gapX * Math.max(0, columnCount - 1);
    layoutHeight = tileH * rowCount + gapY * Math.max(0, rowCount - 1);
  }

  fitGridInsideDraftCircle();
  fitGridInsideDraftCircle();

  tileW = Math.max(38, Math.round(tileW));
  tileH = Math.max(24, Math.round(tileH));
  gapX = Math.max(4, Math.round(gapX));
  gapY = Math.max(4, Math.round(gapY));

  layoutWidth = tileW * columnCount + gapX * Math.max(0, columnCount - 1);
  layoutHeight = tileH * rowCount + gapY * Math.max(0, rowCount - 1);

  let clampedGridOffsetX = tune.gridOffsetX;
  let clampedGridOffsetY = tune.gridOffsetY;
  const halfDiagonal = Math.hypot(layoutWidth * 0.5, layoutHeight * 0.5);
  const maxOffset = Math.max(0, allowedGridRadius - halfDiagonal);
  const offsetLength = Math.hypot(clampedGridOffsetX, clampedGridOffsetY);
  if (offsetLength > maxOffset && offsetLength > 0.0001) {
    const scale = maxOffset / offsetLength;
    clampedGridOffsetX *= scale;
    clampedGridOffsetY *= scale;
  }

  const startX = cx - layoutWidth * 0.5 + clampedGridOffsetX;
  const startY = cy - layoutHeight * 0.5 + clampedGridOffsetY;

  const tileRects = [];
  for (let i = 0; i < spellIds.length; i += 1) {
    const row = Math.floor(i / columnCount);
    const col = i % columnCount;
    const x = startX + col * (tileW + gapX);
    const y = startY + row * (tileH + gapY);
    tileRects.push({
      id: spellIds[i],
      label: getDraftSpellLabel(spellIds[i]),
      x,
      y,
      w: tileW,
      h: tileH,
      cx: x + tileW * 0.5,
      cy: y + tileH * 0.5,
    });
  }

  const participantIds = getDraftParticipantIds();
  const moveRadiusBase = effectivePlatformRadius;
  const moveRadius = Math.min(
    moveRadiusBase - 6,
    Math.max(36, moveRadiusBase * tune.moveRadiusScale + tune.moveRadiusPadding)
  );
  const seatRadiusMax = Math.max(18, moveRadius - 10);
  const seatRadius = Math.max(
    18,
    Math.min(
      seatRadiusMax,
      platformRadius * tune.seatRadiusScale + tune.seatRadiusOffset
    )
  );
  const seats = {};
  const useSideSeatLayout = participantIds.length === 2 && !!tune.sideSeatMode;

  if (participantIds.length === 1) {
    const id = participantIds[0];
    seats[id] = { x: cx, y: cy - seatRadius };
  } else if (useSideSeatLayout) {
    const sideXFactor = Math.max(0.12, Math.min(0.42, Number(tune.sideSeatXFactor) || 0.18));
    const sideYFactor = Math.max(0.12, Math.min(0.48, Number(tune.sideSeatYFactor) || 0.24));
    const sideY = canvas.height * sideYFactor;
    const leftX = canvas.width * sideXFactor;
    const rightX = canvas.width * (1 - sideXFactor);
    const usePanelAnchors = !!tune.sideSeatUsePanelAnchors;
    const panelOffsetY = Number.isFinite(Number(tune.sideSeatPanelOffsetY)) ? Number(tune.sideSeatPanelOffsetY) : 34;
    for (let i = 0; i < participantIds.length; i += 1) {
      const id = participantIds[i];
      const isLeft = id === 'A' || (id !== 'B' && i === 0);
      const fallbackX = isLeft ? leftX : rightX;
      const fallbackY = sideY;
      seats[id] = usePanelAnchors
        ? getDraftSeatFromPanel(id, fallbackX, fallbackY, panelOffsetY)
        : { x: fallbackX, y: fallbackY };
    }
  } else if (participantIds.length === 2) {
    const twoPlayerSeatAngles = { A: -Math.PI * 0.5, B: Math.PI * 0.5 };
    const fallbackAngles = [-Math.PI * 0.5, Math.PI * 0.5];
    for (let i = 0; i < participantIds.length; i += 1) {
      const id = participantIds[i];
      const angle = Number.isFinite(twoPlayerSeatAngles[id]) ? twoPlayerSeatAngles[id] : fallbackAngles[i];
      seats[id] = {
        x: cx + Math.cos(angle) * seatRadius,
        y: cy + Math.sin(angle) * seatRadius,
      };
    }
  } else {
    for (let i = 0; i < participantIds.length; i += 1) {
      const id = participantIds[i];
      const angle = -Math.PI * 0.5 + (i / participantIds.length) * Math.PI * 2;
      seats[id] = {
        x: cx + Math.cos(angle) * seatRadius,
        y: cy + Math.sin(angle) * seatRadius,
      };
    }
  }

  for (const id of participantIds) {
    const seat = seats[id];
    if (!seat) continue;
    const offset = tune.seatOffsets?.[id] || {};
    if (Number.isFinite(Number(offset.x))) seat.x += Number(offset.x);
    if (Number.isFinite(Number(offset.y))) seat.y += Number(offset.y);

    if (useSideSeatLayout) continue;

    const fromCx = seat.x - cx;
    const fromCy = seat.y - cy;
    const dist = Math.hypot(fromCx, fromCy);
    const maxSeatRadius = Math.max(10, moveRadius - 4);
    if (dist > maxSeatRadius && dist > 0.0001) {
      const scale = maxSeatRadius / dist;
      seat.x = cx + fromCx * scale;
      seat.y = cy + fromCy * scale;
    }
  }

  return {
    cx,
    cy,
    platformRadius,
    tileRects,
    seats,
    participantIds,
    moveRadius,
  };
}

function getDraftActivePlayerId() {
  const order = Array.isArray(draftState.order) ? draftState.order : [];
  if (!order.length) return null;
  const idx = Math.max(0, Math.min(order.length - 1, Number(draftState.turnIndex) || 0));
  return order[idx] || null;
}

function getDraftSpellById(spellId) {
  return (Array.isArray(draftState.spells) ? draftState.spells : []).find((spell) => spell.id === spellId) || null;
}

function getDraftAvailableSpells() {
  return (Array.isArray(draftState.spells) ? draftState.spells : []).filter((spell) => !spell.disabled);
}

function queueDraftTurnFlash(playerId) {
  const id = String(playerId || '').trim().toUpperCase();
  if (!id) return;
  draftState.turnFlash = {
    playerId: id,
    startedAt: performance.now(),
    durationMs: 420,
  };
}

function ensureDraftPickFxState() {
  if (!draftState.pickFx || typeof draftState.pickFx !== 'object') {
    draftState.pickFx = {};
  }
  if (!Array.isArray(draftState.pickFx.transfers)) draftState.pickFx.transfers = [];
  if (!Array.isArray(draftState.pickFx.ringPulses)) draftState.pickFx.ringPulses = [];
  if (!Array.isArray(draftState.pickFx.tileBursts)) draftState.pickFx.tileBursts = [];
  return draftState.pickFx;
}

function getDraftPickSlotCanvasTarget(pickerId, slotIndex) {
  if (!Number.isFinite(Number(slotIndex))) return null;
  if (typeof document === 'undefined' || !canvas) return null;

  const safePlayerId = String(pickerId || '').trim().toUpperCase();
  const safeSlotIndex = Math.max(0, Math.min(2, Math.floor(Number(slotIndex) || 0)));
  const slotEl = document.querySelector(`[data-draft-player-slot="${safePlayerId}-${safeSlotIndex}"]`);
  if (!slotEl) return null;

  const slotRect = slotEl.getBoundingClientRect();
  const slotCenterClientX = slotRect.left + slotRect.width * 0.5;
  const slotCenterClientY = slotRect.top + slotRect.height * 0.5;
  const point = clientToCanvasPoint(slotCenterClientX, slotCenterClientY);
  const x = point.x;
  const y = point.y;

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(0, Math.min(canvas.width, x)),
    y: Math.max(0, Math.min(canvas.height, y)),
  };
}

function queueDraftPickConfirmationFx(spellId, pickerId, slotIndex = -1) {
  const fx = ensureDraftPickFxState();
  const nowMs = performance.now();
  const layout = draftState.layout;
  const tile = Array.isArray(layout?.tileRects)
    ? layout.tileRects.find((t) => t.id === spellId)
    : null;
  const actor = draftState.players?.[pickerId] || null;
  const slotTarget = getDraftPickSlotCanvasTarget(pickerId, slotIndex);

  if (tile) {
    fx.tileBursts.push({
      tileId: spellId,
      startedAt: nowMs,
      durationMs: 360,
    });
  }

  if (tile && (slotTarget || (actor && Number.isFinite(actor.x) && Number.isFinite(actor.y)))) {
    fx.transfers.push({
      fromX: tile.cx,
      fromY: tile.cy,
      toX: Number.isFinite(slotTarget?.x) ? slotTarget.x : actor.x,
      toY: Number.isFinite(slotTarget?.y) ? slotTarget.y : actor.y,
      startedAt: nowMs,
      durationMs: 360,
      pickerId,
      spellId: String(spellId || ''),
      slotIndex: Number.isFinite(Number(slotIndex)) ? Math.floor(Number(slotIndex)) : -1,
    });
  }

  if (actor && Number.isFinite(actor.x) && Number.isFinite(actor.y)) {
    fx.ringPulses.push({
      pickerId,
      startedAt: nowMs,
      durationMs: 320,
    });
  }

  if (fx.transfers.length > 16) fx.transfers.splice(0, fx.transfers.length - 16);
  if (fx.ringPulses.length > 16) fx.ringPulses.splice(0, fx.ringPulses.length - 16);
  if (fx.tileBursts.length > 16) fx.tileBursts.splice(0, fx.tileBursts.length - 16);
}

function moveDraftActor(actor, moveX, moveY, speed, dt, layout) {
  if (!actor || !layout) return;

  let dx = Number(moveX) || 0;
  let dy = Number(moveY) || 0;
  const len = Math.hypot(dx, dy);
  if (len > 0.0001) {
    dx /= len;
    dy /= len;
    actor.x += dx * speed * dt;
    actor.y += dy * speed * dt;
  }

  actor.x = Math.max(24, Math.min(canvas.width - 24, actor.x));
  actor.y = Math.max(24, Math.min(canvas.height - 24, actor.y));

  const fromCx = actor.x - layout.cx;
  const fromCy = actor.y - layout.cy;
  const dist = Math.hypot(fromCx, fromCy) || 1;
  if (dist > layout.moveRadius) {
    actor.x = layout.cx + (fromCx / dist) * layout.moveRadius;
    actor.y = layout.cy + (fromCy / dist) * layout.moveRadius;
  }

  return;
}

function isDraftTileTriggerHit(actor, tile) {
  if (!actor || !tile) return false;
  if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return false;
  if (!Number.isFinite(tile.x) || !Number.isFinite(tile.y)) return false;
  if (!Number.isFinite(tile.w) || !Number.isFinite(tile.h)) return false;

  // Keep trigger anchored to the tile box itself (no vertical bias), so it does not activate above the tile.
  const inset = 3;
  const minX = tile.x + inset;
  const maxX = tile.x + tile.w - inset;
  const minY = tile.y + inset;
  const maxY = tile.y + tile.h - inset;

  const actorRadius = Math.max(8, Math.min(18, Number(player?.r) || 18));

  // Primary check: actor anchor point is inside tile box.
  if (actor.x >= minX && actor.x <= maxX && actor.y >= minY && actor.y <= maxY) return true;

  // Secondary check: small overlap radius for edge forgiveness without early "above tile" activation.
  const closestX = Math.max(minX, Math.min(maxX, actor.x));
  const closestY = Math.max(minY, Math.min(maxY, actor.y));
  const dx = actor.x - closestX;
  const dy = actor.y - closestY;
  const triggerRadius = Math.max(4, actorRadius * 0.32);
  return (dx * dx + dy * dy) <= triggerRadius * triggerRadius;
}

function getDraftTileUnderPlayer(actor, layout) {
  if (!actor || !layout || !Array.isArray(layout.tileRects)) return null;
  for (const tile of layout.tileRects) {
    const spell = getDraftSpellById(tile.id);
    if (!spell || spell.disabled) continue;
    if (isDraftTileTriggerHit(actor, tile)) {
      return tile;
    }
  }
  return null;
}

function getDraftTileUnderCursor(layout) {
  if (!layout || !Array.isArray(layout.tileRects)) return null;
  if (!Number.isFinite(Number(mouse?.x)) || !Number.isFinite(Number(mouse?.y))) return null;

  const px = Number(mouse.x);
  const py = Number(mouse.y);
  for (const tile of layout.tileRects) {
    const spell = getDraftSpellById(tile.id);
    if (!spell || spell.disabled) continue;

    const inset = 3;
    const minX = tile.x + inset;
    const maxX = tile.x + tile.w - inset;
    const minY = tile.y + inset;
    const maxY = tile.y + tile.h - inset;
    if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
      return tile;
    }
  }
  return null;
}

function getMultiplayerPresentationSnapshot() {
  const api = window.outraMultiplayer;
  if (!api || typeof api.getPresentationSnapshot !== 'function') return null;
  const snapshot = api.getPresentationSnapshot();
  if (!snapshot || snapshot.active !== true) return null;
  return snapshot;
}

function getMultiplayerDraftPresentationSnapshot() {
  const snapshot = getMultiplayerPresentationSnapshot();
  if (!snapshot || !snapshot.isDraftActive) return null;
  return snapshot;
}

function advanceDraftTurn() {
  const order = Array.isArray(draftState.order) ? draftState.order : [];
  const orderLength = Math.max(1, order.length);

  draftState.turnIndex += 1;
  draftState.activeIndex = Math.max(0, Math.min(orderLength - 1, draftState.turnIndex));
  draftState.turnTimeLeft = Math.max(0.5, Number(draftState.turnDuration) || 8);
  draftState.holdSpellId = null;
  draftState.holdTime = 0;

  if (draftState.turnIndex >= orderLength || !getDraftAvailableSpells().length) {
    draftState.complete = true;
    draftState.completeAt = 0;
    draftState.turnTimeLeft = 0;
    draftState.timeLeft = 0;
    draftState.turnFlash = null;
  } else {
    queueDraftTurnFlash(getDraftActivePlayerId());
  }
}

function commitDraftPick(spellId) {
  if (draftState.complete) return false;

  const activePlayerId = getDraftActivePlayerId();
  if (!activePlayerId) return false;

  const spell = getDraftSpellById(spellId);
  if (!spell || spell.disabled) return false;

  const picks = draftState.picks[activePlayerId] || [];
  if (picks.length >= 3) {
    advanceDraftTurn();
    if (typeof updateDraftOverlayUi === 'function') updateDraftOverlayUi();
    if (typeof updateHud === 'function') updateHud();
    return false;
  }

  spell.takenBy = activePlayerId;
  spell.disabled = true;
  picks.push(spell.id);
  draftState.picks[activePlayerId] = picks;

  queueDraftPickConfirmationFx(spell.id, activePlayerId, picks.length - 1);
  soundDraftPick();
  stopDraftSpellHoverSound();
  advanceDraftTurn();
  if (typeof updateDraftOverlayUi === 'function') updateDraftOverlayUi();
  if (typeof updateHud === 'function') updateHud();
  return true;
}

function tryDraftPickAtCursor() {
  const multiplayerDraftSnapshot = getMultiplayerDraftPresentationSnapshot();
  const multiplayerDraftActive = !!multiplayerDraftSnapshot;
  if (gameState !== 'draft' && !multiplayerDraftActive) return false;
  if (menuOpen || draftState.complete) return false;

  const activePlayerId = getDraftActivePlayerId();
  if (!activePlayerId || activePlayerId !== draftState.localPlayerId) return false;

  const layout = draftState.layout || getDraftLayout();
  if (!layout) return false;

  const tile = getDraftTileUnderCursor(layout);
  if (!tile) return false;

  if (multiplayerDraftActive) {
    let requested = false;
    if (typeof requestMultiplayerDraftPick === 'function') {
      requested = !!requestMultiplayerDraftPick(tile.id);
    } else {
      const api = window.outraMultiplayer;
      if (api && typeof api.requestDraftPick === 'function') {
        api.requestDraftPick(tile.id);
        requested = true;
      }
    }
    if (requested) {
      draftState.holdSpellId = null;
      draftState.holdTime = 0;
    }
    return requested;
  }

  const picked = commitDraftPick(tile.id);
  if (picked) {
    draftState.holdSpellId = null;
    draftState.holdTime = 0;
  }
  return picked;
}

function autoAssignDraftPick() {
  const available = getDraftAvailableSpells();
  if (!available.length) {
    advanceDraftTurn();
    return;
  }

  const next = available[Math.floor(Math.random() * available.length)];
  commitDraftPick(next.id);
}

function getDraftLoadoutForLocalPlayer() {
  const selected = Array.from(
    new Set((draftState.picks[draftState.localPlayerId] || []).filter((id) => draftState.spellOrder.includes(id)))
  );

  return ['fire', ...selected.slice(0, 3)];
}

function getFullArenaLoadout() {
  return ['fire', 'hook', 'blink', 'shield', 'prism', 'charge', 'shock', 'gust', 'solar', 'rift', 'phantom', 'wall', 'rewind'];
}

function resetDraftPhase() {
  const orderLength = Math.max(1, Array.isArray(draftState.order) ? draftState.order.length : 0);
  const turnDuration = Math.max(0.5, Number(draftState.turnDuration) || 8);
  const totalDuration = orderLength * turnDuration;
  const participantIds = getDraftParticipantIds();

  draftState.turnIndex = 0;
  draftState.activeIndex = 0;
  draftState.turnTimeLeft = turnDuration;
  draftState.elapsed = 0;
  draftState.totalDuration = totalDuration;
  draftState.timeLeft = turnDuration;
  draftState.holdSpellId = null;
  draftState.holdTime = 0;
  draftState.complete = false;
  draftState.completeAt = 0;
  draftState.turnFlash = null;
  const fxState = ensureDraftPickFxState();
  fxState.transfers.length = 0;
  fxState.ringPulses.length = 0;
  fxState.tileBursts.length = 0;

  draftState.spells = (Array.isArray(draftState.spellOrder) ? draftState.spellOrder : []).map((id) => ({
    id,
    label: getDraftSpellLabel(id),
    takenBy: null,
    disabled: false,
  }));
  if (typeof preloadDraftSpellOrbIcons === 'function') {
    preloadDraftSpellOrbIcons(draftState.spellOrder);
  }

  const nextPicks = {};
  for (const id of participantIds) {
    nextPicks[id] = [];
  }
  draftState.picks = nextPicks;
  invalidateDraftLayout({ settleFrames: 3 });
  draftState.layout = getDraftLayout({ force: true });

  for (const id of participantIds) {
    const seat = draftState.layout?.seats?.[id] || { x: canvas.width * 0.5, y: canvas.height * 0.5 };
    if (!draftState.players[id]) {
      draftState.players[id] = { x: seat.x, y: seat.y, vx: 0, vy: 0, moveTimer: 0, dirX: 0, dirY: 0 };
    }
    draftState.players[id].x = seat.x;
    draftState.players[id].y = seat.y;
    draftState.players[id].vx = 0;
    draftState.players[id].vy = 0;
    draftState.players[id].moveTimer = 0;
    draftState.players[id].dirX = 0;
    draftState.players[id].dirY = 0;
  }

  queueDraftTurnFlash(getDraftActivePlayerId());
}

function updateDraftPhase(dt) {
  const multiplayerDraftSnapshot = getMultiplayerDraftPresentationSnapshot();
  const multiplayerDraftActive = !!multiplayerDraftSnapshot;

  if (gameState !== 'draft' && !multiplayerDraftActive) {
    stopDraftSpellHoverSound();
    return;
  }

  const layout = getDraftLayout();
  const participantIds = Array.isArray(layout?.participantIds) && layout.participantIds.length
    ? layout.participantIds
    : getDraftParticipantIds();

  for (const id of participantIds) {
    const actor = draftState.players[id];
    if (!actor) continue;
    const seat = layout?.seats?.[id];
    if (!seat) continue;
    actor.x = seat.x;
    actor.y = seat.y;
    actor.vx = 0;
    actor.vy = 0;
    actor.moveTimer = 0;
    actor.dirX = 0;
    actor.dirY = 0;
  }

  draftState.elapsed += dt;

  if (!draftState.complete) {
    draftState.completeAt = 0;
    const activePlayer = getDraftActivePlayerId();
    if (activePlayer === draftState.localPlayerId) {
      const tile = getDraftTileUnderCursor(layout);
      if (!tile) {
        stopDraftSpellHoverSound();
        draftState.holdSpellId = null;
        draftState.holdTime = 0;
      } else {
        startDraftSpellHoverSound();
        if (draftState.holdSpellId !== tile.id) {
          draftState.holdSpellId = tile.id;
          draftState.holdTime = 0;
        }
        draftState.holdTime += dt;
        const holdThreshold = multiplayerDraftActive
          ? Math.max(0.85, Number(draftState.holdDuration) || 0.6)
          : Math.max(0.1, Number(draftState.holdDuration) || 0.6);
        if (draftState.holdTime >= holdThreshold) {
          if (multiplayerDraftActive) {
            let requested = false;
            if (typeof requestMultiplayerDraftPick === 'function') {
              requested = !!requestMultiplayerDraftPick(tile.id);
            } else {
              const api = window.outraMultiplayer;
              if (api && typeof api.requestDraftPick === 'function') {
                api.requestDraftPick(tile.id);
                requested = true;
              }
            }
            if (requested) {
              draftState.holdSpellId = null;
              draftState.holdTime = 0;
            }
          } else {
            commitDraftPick(tile.id);
          }
        }
      }
    } else {
      stopDraftSpellHoverSound();
      draftState.holdSpellId = null;
      draftState.holdTime = 0;
    }

    if (!multiplayerDraftActive) {
      draftState.turnTimeLeft = Math.max(0, draftState.turnTimeLeft - dt);
      if (draftState.turnTimeLeft <= 0 && !draftState.complete) {
        autoAssignDraftPick();
      }
    } else {
      draftState.turnTimeLeft = Math.max(0, Number(draftState.timeLeft) || 0);
    }
  } else {
    stopDraftSpellHoverSound();
    draftState.holdSpellId = null;
    draftState.holdTime = 0;
    const nowSec = performance.now() / 1000;
    if (!Number.isFinite(draftState.completeAt) || draftState.completeAt <= 0) {
      draftState.completeAt = nowSec;
    } else if (
      !multiplayerDraftActive
      && nowSec - draftState.completeAt >= Math.max(0, Number(draftState.autoStartDelay) || 1)
    ) {
      startMatch();
      return;
    }
  }

  draftState.activeIndex = Math.max(0, Math.min(draftState.order.length - 1, draftState.turnIndex));
  draftState.timeLeft = draftState.complete ? 0 : draftState.turnTimeLeft;
}

let pendingDraftAssetGate = false;
let pendingArenaAssetGate = false;

function enterLobby() {
  stopDraftSpellHoverSound();
  if (typeof clearArenaFloatingStones === 'function') {
    clearArenaFloatingStones();
  }
  pendingDraftAssetGate = false;
  pendingArenaAssetGate = false;
  gameState      = 'lobby';
  menuOpen       = false;
  waitingForBind = null;
  winnerText     = '';
  winnerReward   = null;
  resultTimer    = 0;
  overlay.style.display   = 'flex';
  hud.style.display       = 'none';
  topbar.style.display    = 'none';
  menuPanel.style.display = 'none';
  setCanvasCursorMode('default');
  syncCursorPhaseClass();
  renderLeaderboard();
  renderStore();
  renderInventory();
  nameInput.value = player.name;
  buildRankedPanel();
  if (window.outraRightLobbyUI && typeof window.outraRightLobbyUI.activate === 'function') {
    window.outraRightLobbyUI.activate();
  }
  buildKeybindsUI();
  drawLobbyPreview();
  setLobbyTab(activeLobbyTab);
  setMenuTab(activeMenuTab);
  player.score = getPlayerPoints(player.name);
  arenaIntro.active = false;
  arenaIntro.elapsed = 0;
  updateAimSensitivityUI();
  updateHud();
  if (typeof refreshLobbyQuickMatchUi === 'function') {
    refreshLobbyQuickMatchUi();
  }
  refreshMobileControls();
}

function enterDraftRoom(options = {}) {
  const skipAssetGate = !!options.skipAssetGate;
  if (typeof clearArenaFloatingStones === 'function') {
    clearArenaFloatingStones();
  }
  const phaseAssetApi = window.outraPhaseAssets;
  if (
    !skipAssetGate &&
    phaseAssetApi &&
    typeof phaseAssetApi.isDraftAssetsReady === 'function' &&
    typeof phaseAssetApi.ensureDraftAssetsReady === 'function' &&
    !phaseAssetApi.isDraftAssetsReady()
  ) {
    if (!pendingDraftAssetGate) {
      pendingDraftAssetGate = true;
      phaseAssetApi.ensureDraftAssetsReady({
        blocking: true,
        reason: 'enter_draft_room',
        title: 'Loading Draft Room',
        detail: 'Preparing draft assets...'
      }).then(() => {
        if (gameState !== 'draft') {
          enterDraftRoom({ ...options, skipAssetGate: true });
        }
      }).finally(() => {
        pendingDraftAssetGate = false;
      });
    }
    return;
  }

  player.name = (nameInput.value || 'Player').trim().slice(0, 16) || 'Player';
  applyPlayerColors();
  saveProfile();
  player.score = getPlayerPoints(player.name);

  gameState      = 'draft';
  menuOpen       = false;
  waitingForBind = null;

  overlay.style.display   = 'none';
  hud.style.display       = 'none';
  topbar.style.display    = 'flex';
  menuPanel.style.display = 'none';
  setCanvasCursorMode('pointer');
  syncCursorPhaseClass();
  stopDraftSpellHoverSound();
  if (window.outraRightLobbyUI && typeof window.outraRightLobbyUI.deactivate === 'function') {
    window.outraRightLobbyUI.deactivate();
  }

  skillAimPreview.active = false;
  skillAimPreview.type = null;
  arenaIntro.active = false;
  arenaIntro.elapsed = 0;
  resetDraftPhase();

  updateAimSensitivityUI();
  updateHud();
  refreshMobileControls();
}

function startArenaIntroCountdown() {
  arenaIntro.active = true;
  arenaIntro.elapsed = 0;
}

function updateArenaIntroCountdown(dt) {
  if (!arenaIntro.active || gameState !== 'playing') return;

  arenaIntro.elapsed += dt;
  const preDelay = Math.max(0, Number(arenaIntro.preDelay) || 0);
  const countdownSeconds = Math.max(0, Number(arenaIntro.countdownSeconds) || 0);
  const fightDuration = Math.max(0, Number(arenaIntro.fightDuration) || 0);
  const postFightDelay = Math.max(0, Number(arenaIntro.postFightDelay) || 0);
  const totalDuration = preDelay + countdownSeconds + fightDuration + postFightDelay;
  if (arenaIntro.elapsed >= totalDuration) {
    arenaIntro.elapsed = totalDuration;
    arenaIntro.active = false;
  }
}

function getArenaIntroOverlayLabel() {
  if (gameState !== 'playing' || !arenaIntro.active) return '';

  const preDelay = Math.max(0, Number(arenaIntro.preDelay) || 0);
  const countdownSeconds = Math.max(0, Number(arenaIntro.countdownSeconds) || 0);
  const elapsed = Math.max(0, Number(arenaIntro.elapsed) || 0);
  if (elapsed < preDelay) return '';

  const phaseTime = elapsed - preDelay;
  if (phaseTime < countdownSeconds) {
    const secondsLeft = Math.ceil(countdownSeconds - phaseTime);
    return String(Math.max(1, secondsLeft));
  }

  if (phaseTime < countdownSeconds + Math.max(0, Number(arenaIntro.fightDuration) || 0)) {
    return 'FIGHT';
  }

  return '';
}

function isArenaPreFightLocked() {
  if (gameState !== 'playing' || !arenaIntro.active) return false;
  const preDelay = Math.max(0, Number(arenaIntro.preDelay) || 0);
  const countdownSeconds = Math.max(0, Number(arenaIntro.countdownSeconds) || 0);
  const fightDuration = Math.max(0, Number(arenaIntro.fightDuration) || 0);
  const postFightDelay = Math.max(0, Number(arenaIntro.postFightDelay) || 0);
  return arenaIntro.elapsed < preDelay + countdownSeconds + fightDuration + postFightDelay;
}

function startMatch(options = {}) {
  const skipAssetGate = !!options.skipAssetGate;
  const phaseAssetApi = window.outraPhaseAssets;
  if (
    !skipAssetGate &&
    phaseAssetApi &&
    typeof phaseAssetApi.isArenaAssetsReady === 'function' &&
    typeof phaseAssetApi.ensureArenaAssetsReady === 'function' &&
    !phaseAssetApi.isArenaAssetsReady()
  ) {
    if (!pendingArenaAssetGate) {
      pendingArenaAssetGate = true;
      phaseAssetApi.ensureArenaAssetsReady({
        blocking: true,
        reason: 'start_match',
        title: 'Loading Arena',
        detail: 'Preparing combat assets...'
      }).then(() => {
        const resolvedOptions = { ...options, skipAssetGate: true };
        startMatch(resolvedOptions);
      }).finally(() => {
        pendingArenaAssetGate = false;
      });
    }
    return;
  }

  stopDraftSpellHoverSound();
  const skipArenaIntro = !!options.skipArenaIntro;
  startMusicIfNeeded();
  const fromDraft = gameState === 'draft';
  if (fromDraft && !draftState.complete) return;
  player.name = (nameInput.value || 'Player').trim().slice(0, 16) || 'Player';
  applyPlayerColors();
  saveProfile();
  player.score = getPlayerPoints(player.name);
  activeSpellLoadout = fromDraft
    ? getDraftLoadoutForLocalPlayer()
    : getFullArenaLoadout();
  resetRound();
  if (typeof resetArenaFloatingStonesForMatchStart === 'function') {
    const localMatchId = String(options?.matchId || '').trim();
    resetArenaFloatingStonesForMatchStart({
      mode: 'local',
      matchId: localMatchId,
      deterministic: !!localMatchId,
    });
  }
  gameState               = 'playing';
  arenaIntro.active = false;
  arenaIntro.elapsed = 0;
  if (!skipArenaIntro) {
    startArenaIntroCountdown();
  }
  overlay.style.display   = 'none';
  topbar.style.display    = 'flex';
  menuPanel.style.display = 'none';
  setCanvasCursorMode('crosshair');
  syncCursorPhaseClass();
  if (window.outraRightLobbyUI && typeof window.outraRightLobbyUI.deactivate === 'function') {
    window.outraRightLobbyUI.deactivate();
  }
  updateAimSensitivityUI();
  updateHud();
  refreshMobileControls();
}

// ── Main Update ───────────────────────────────────────────────
const MP_ARENA_DEFAULT_BOUNDARY_RADIUS = 14;
const MP_TELEPORT_CAST_DISTANCE_UNITS = 1.45;
const MP_REMOTE_POSITION_LERP_FACTOR = 0.15;
const MP_REMOTE_POSITION_SNAP_DISTANCE = 200;
const MP_LOCAL_POSITION_RECONCILE_LERP = 0.22;
const MP_LOCAL_POSITION_SNAP_DISTANCE = 170;
const MP_LOCAL_POSITION_RECONCILE_DEADZONE = 1.25;
const MP_PROJECTILE_EXTRAPOLATION_MAX_MS = 95;
const MP_PROJECTILE_POSITION_LERP = 0.45;
const MP_PROJECTILE_SNAP_DISTANCE = 120;
const multiplayerArenaBridgeState = {
  active: false,
  seenProjectileIds: new Set(),
  seenWallIds: new Set(),
  seenHitIds: new Set(),
  floatingStoneBlockedProjectileIds: new Set(),
  projectilesById: new Map(),
  hooksById: new Map(),
  wallsById: new Map(),
  riftsById: new Map(),
  phantomIllusionsById: new Map(),
  lastMyChargeActive: false,
  lastOppChargeActive: false,
  lastMyShieldActive: false,
  lastOppShieldActive: false,
  lastMyPrismActive: false,
  lastOppPrismActive: false,
  lastMyPhantomActive: false,
  lastOppPhantomActive: false,
  lastMyBlinkReadyAt: 0,
  lastOppBlinkReadyAt: 0,
  myServerTarget: null,
  lastMyMappedPos: null,
  lastOppMappedPos: null,
  lastMatchPhase: '',
  lastRoundPhase: '',
  lastMatchId: '',
  lastTrailAt: {
    player: 0,
    dummy: 0,
  },
};

function resetMultiplayerArenaBridgeTransientState(options = {}) {
  const preserveMatchIdentity = options && options.preserveMatchIdentity === true;
  multiplayerArenaBridgeState.seenProjectileIds.clear();
  multiplayerArenaBridgeState.seenWallIds.clear();
  multiplayerArenaBridgeState.seenHitIds.clear();
  multiplayerArenaBridgeState.floatingStoneBlockedProjectileIds.clear();
  multiplayerArenaBridgeState.projectilesById.clear();
  multiplayerArenaBridgeState.hooksById.clear();
  multiplayerArenaBridgeState.wallsById.clear();
  multiplayerArenaBridgeState.riftsById.clear();
  multiplayerArenaBridgeState.phantomIllusionsById.clear();
  multiplayerArenaBridgeState.lastMyChargeActive = false;
  multiplayerArenaBridgeState.lastOppChargeActive = false;
  multiplayerArenaBridgeState.lastMyShieldActive = false;
  multiplayerArenaBridgeState.lastOppShieldActive = false;
  multiplayerArenaBridgeState.lastMyPrismActive = false;
  multiplayerArenaBridgeState.lastOppPrismActive = false;
  multiplayerArenaBridgeState.lastMyPhantomActive = false;
  multiplayerArenaBridgeState.lastOppPhantomActive = false;
  multiplayerArenaBridgeState.lastMyBlinkReadyAt = 0;
  multiplayerArenaBridgeState.lastOppBlinkReadyAt = 0;
  multiplayerArenaBridgeState.myServerTarget = null;
  multiplayerArenaBridgeState.lastMyMappedPos = null;
  multiplayerArenaBridgeState.lastOppMappedPos = null;
  multiplayerArenaBridgeState.lastMatchPhase = '';
  multiplayerArenaBridgeState.lastTrailAt.player = 0;
  multiplayerArenaBridgeState.lastTrailAt.dummy = 0;
  multiplayerArenaBridgeState.lastRoundPhase = '';
  if (!preserveMatchIdentity) {
    multiplayerArenaBridgeState.lastMatchId = '';
  }

  projectiles.length = 0;
  hooks.length = 0;
  obstacles.length = 0;
  walls.length = 0;
  rifts.length = 0;
  phantomIllusions.length = 0;
  particles.length = 0;
  damageTexts.length = 0;
  player.chargeActive = false;
  dummy.chargeActive = false;
  player.shieldUntil = 0;
  dummy.shieldUntil = 0;
  player.prismUntil = 0;
  dummy.prismUntil = 0;
  player.solarDistortionUntil = 0;
  dummy.solarDistortionUntil = 0;
  player.riftPendingExpiresAt = 0;
  player.riftPendingPortalA = null;
  player.riftPlacementActive = false;
  player.phantomVanishUntil = 0;
  player.phantomIllusionUntil = 0;
  player.phantomSplitApplied = false;
  player.phantomIllusionX = Number(player.x) || 0;
  player.phantomIllusionY = Number(player.y) || 0;
  player.phantomIllusionVelX = 0;
  player.phantomIllusionVelY = 0;
  player.phantomIllusionRetargetAt = 0;
  player.phantomIllusionLastAt = 0;
  dummy.phantomVanishUntil = 0;
  player.prismDirX = Number(player.aimX) || 1;
  player.prismDirY = Number(player.aimY) || 0;
  dummy.prismDirX = Number(dummy.aimX) || -1;
  dummy.prismDirY = Number(dummy.aimY) || 0;
  dummy.name = 'Dummy';
  dummy.targetX = Number.isFinite(dummy.x) ? dummy.x : 0;
  dummy.targetY = Number.isFinite(dummy.y) ? dummy.y : 0;
  resetCombatFeedbackState();
}

function getMultiplayerArenaRuntimeSnapshot() {
  const api = window.outraMultiplayer;
  if (!api || typeof api.getRuntimeSnapshot !== 'function') return null;
  const snapshot = api.getRuntimeSnapshot();
  if (!snapshot || snapshot.active !== true) return null;
  return snapshot;
}

function isMultiplayerArenaRuntimeActive(snapshot) {
  return !!(snapshot && snapshot.active && snapshot.isArenaActive);
}

function getGameFrameContext() {
  if (typeof window === 'undefined') return null;
  const context = window.__OUTRA_FRAME_CONTEXT;
  if (!context || typeof context !== 'object') return null;
  return context;
}

function syncGameFrameContextForUpdate() {
  const nowSec = performance.now() / 1000;
  const existing = getGameFrameContext();
  const nextId = Math.max(0, Number(existing?.id) || 0) + 1;
  const nextContext = {
    id: nextId,
    nowSec,
  };
  if (typeof window !== 'undefined') {
    window.__OUTRA_FRAME_CONTEXT = nextContext;
  }
  return nextContext;
}

function getGameFrameTimeSec(fallbackSec = (performance.now() / 1000)) {
  const context = getGameFrameContext();
  const contextTimeSec = Number(context?.nowSec);
  if (Number.isFinite(contextTimeSec) && contextTimeSec >= 0) {
    return contextTimeSec;
  }
  return Number.isFinite(Number(fallbackSec))
    ? Number(fallbackSec)
    : (performance.now() / 1000);
}

function getGameFrameId() {
  const context = getGameFrameContext();
  const contextId = Number(context?.id);
  if (!Number.isFinite(contextId) || contextId <= 0) return null;
  return Math.floor(contextId);
}

function getSharedFloatingStoneHitCircles(multiplayerSnapshot = null) {
  if (typeof getArenaFloatingStoneHitCircles !== 'function') return [];
  const frameTimeSec = getGameFrameTimeSec();
  const frameId = getGameFrameId();
  return getArenaFloatingStoneHitCircles(frameTimeSec, {
    frameId,
    multiplayerSnapshot,
  }) || [];
}

function handleMultiplayerCastAckFeedback(event) {
  const detail = event?.detail && typeof event.detail === 'object'
    ? event.detail
    : null;
  if (!detail || detail.ok !== true) return;

  const abilityId = String(detail.abilityId || '').trim().toLowerCase();
  if (abilityId !== 'shock') return;
  if (detail?.response?.hit === true) return;

  const snapshot = getMultiplayerArenaRuntimeSnapshot();
  if (!isMultiplayerArenaRuntimeActive(snapshot)) return;

  const myNumber = Number(snapshot?.myPlayerNumber);
  if (!Number.isFinite(myNumber) || myNumber <= 0) return;
  const sourcePoint = getMappedPlayerPositionByNumber(snapshot, myNumber);
  if (!sourcePoint) return;

  const dir = normalizeRuntimeAim(
    snapshot?.myAimDirection,
    Number(player?.aimX) || 1,
    Number(player?.aimY) || 0
  );
  spawnPracticeSpellImageFx('shock', {
    x: sourcePoint.x + (dir.x * ((Number(player?.r) || 18) + 26)),
    y: sourcePoint.y + (dir.y * ((Number(player?.r) || 18) + 26)),
    dirX: dir.x,
    dirY: dir.y,
    maxLife: 0.28,
    width: 220,
    height: 168,
    alpha: 0.88,
    scaleFrom: 0.9,
    scaleTo: 1.12,
  });
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('outra:multiplayer-cast-ack', handleMultiplayerCastAckFeedback);
}

function shouldUsePracticeSpellImageFx() {
  const multiplayerArenaActive = isMultiplayerArenaRuntimeActive(getMultiplayerArenaRuntimeSnapshot());
  const localArenaState = gameState === 'playing' || gameState === 'result';
  return multiplayerArenaActive || localArenaState;
}

function spawnPracticeSpellImageFx(type, options = {}) {
  if (!shouldUsePracticeSpellImageFx()) return false;
  if (!combatFx || !Array.isArray(combatFx.practiceSpellImageFx)) return false;

  const effectType = String(type || '').trim().toLowerCase();
  if (!effectType) return false;

  const x = Number(options.x);
  const y = Number(options.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

  const dir = normalized(Number(options.dirX) || 0, Number(options.dirY) || 0);
  const maxLife = Math.max(0.05, Number(options.maxLife) || Number(options.life) || 0.28);
  const life = Math.max(0.01, Math.min(maxLife, Number(options.life) || maxLife));

  const defaultSize = effectType === 'shock'
    ? { width: 196, height: 164 }
    : { width: 148, height: 148 };
  const width = Math.max(12, Number(options.width) || defaultSize.width);
  const height = Math.max(12, Number(options.height) || defaultSize.height);
  const alpha = Math.max(0, Math.min(1, Number(options.alpha) || 0.9));
  const scaleFrom = Math.max(0.2, Number(options.scaleFrom) || 0.9);
  const scaleTo = Math.max(0.2, Number(options.scaleTo) || 1.08);

  combatFx.practiceSpellImageFx.push({
    type: effectType,
    x,
    y,
    dirX: dir.x,
    dirY: dir.y,
    life,
    maxLife,
    width,
    height,
    alpha,
    scaleFrom,
    scaleTo,
  });

  if (combatFx.practiceSpellImageFx.length > 28) {
    combatFx.practiceSpellImageFx.splice(0, combatFx.practiceSpellImageFx.length - 28);
  }
  return true;
}

function spawnBlinkTeleportImageFx(fromX, fromY, toX, toY, options = {}) {
  const sx = Number(fromX);
  const sy = Number(fromY);
  const tx = Number(toX);
  const ty = Number(toY);
  if (![sx, sy, tx, ty].every(Number.isFinite)) return false;

  const dir = normalized(tx - sx, ty - sy);
  const actorRadius = Math.max(8, Number(options.actorRadius) || Number(player?.r) || 18);
  const yOffset = Math.max(6, actorRadius * 0.74);
  const fromFlashX = sx;
  const fromFlashY = sy + yOffset;
  const toFlashX = tx;
  const toFlashY = ty + yOffset;

  // Blink particles: enforce a 50/50 white/purple split.
  spawnBurst(fromFlashX, fromFlashY, 'rgba(255,255,255,0.98)', 10, 250);
  spawnBurst(fromFlashX, fromFlashY, 'rgba(194,140,255,0.9)', 10, 250);
  pushCombatImpactWave(fromFlashX, fromFlashY, {
    color: '255,255,255',
    duration: 0.16,
    startRadius: Math.max(12, actorRadius * 0.62),
    endRadius: Math.max(34, actorRadius * 2.2),
    alpha: 0.95,
    fillAlpha: 0.4,
    width: 3.2,
  });

  spawnBurst(toFlashX, toFlashY, 'rgba(255,255,255,1)', 13, 290);
  spawnBurst(toFlashX, toFlashY, 'rgba(198,146,255,0.94)', 13, 290);
  pushCombatImpactWave(toFlashX, toFlashY, {
    color: '255,255,255',
    duration: 0.18,
    startRadius: Math.max(14, actorRadius * 0.72),
    endRadius: Math.max(42, actorRadius * 2.7),
    alpha: 1,
    fillAlpha: 0.5,
    width: 3.6,
  });
  triggerCombatScreenShake(0.13, 0.08);
  return true;
}

function getMultiplayerArenaScale(snapshot) {
  const boundaryRadius = Math.max(
    0.01,
    Number(snapshot?.arenaBoundary?.radius) || MP_ARENA_DEFAULT_BOUNDARY_RADIUS
  );
  return Math.max(1, Number(arena.radius) || Number(arena.baseRadius) || 1) / boundaryRadius;
}

function mapMultiplayerArenaPointToCanvas(snapshot, position) {
  const source = position && typeof position === 'object' ? position : null;
  if (!source) return null;
  const px = Number(source.x);
  const py = Number(source.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  const center = snapshot?.arenaBoundary?.center && typeof snapshot.arenaBoundary.center === 'object'
    ? snapshot.arenaBoundary.center
    : { x: 0, y: 0 };
  const cx = Number(center.x) || 0;
  const cy = Number(center.y) || 0;
  const scale = getMultiplayerArenaScale(snapshot);

  return {
    x: arena.cx + (px - cx) * scale,
    y: arena.cy + (py - cy) * scale
  };
}

function mapMultiplayerArenaVectorToCanvas(snapshot, vector) {
  const source = vector && typeof vector === 'object' ? vector : null;
  if (!source) return null;
  const vx = Number(source.x);
  const vy = Number(source.y);
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) return null;
  const scale = getMultiplayerArenaScale(snapshot);
  return { x: vx * scale, y: vy * scale };
}

function normalizeRuntimeAim(vector, fallbackX = 1, fallbackY = 0) {
  const vx = Number(vector?.x);
  const vy = Number(vector?.y);
  if (!Number.isFinite(vx) || !Number.isFinite(vy) || (Math.abs(vx) + Math.abs(vy)) < 0.0001) {
    return normalized(fallbackX, fallbackY);
  }
  return normalized(vx, vy);
}

function getLocalMultiplayerMoveIntent() {
  if (menuOpen) return { x: 0, y: 0 };
  const keyMoveX = (keys[keybinds.right] ? 1 : 0) - (keys[keybinds.left] ? 1 : 0);
  const keyMoveY = (keys[keybinds.down] ? 1 : 0) - (keys[keybinds.up] ? 1 : 0);
  const useStick = !!(moveStick && moveStick.active);
  const moveX = useStick ? (Number(moveStick.dx) || 0) : keyMoveX;
  const moveY = useStick ? (Number(moveStick.dy) || 0) : keyMoveY;
  return { x: moveX, y: moveY };
}

function triggerArenaCastForPlayer(snapshot, playerNumber, abilityId = '') {
  const myNumber = Number(snapshot?.myPlayerNumber);
  if (!Number.isFinite(myNumber)) return;

  const actorIsPlayer = Number(playerNumber) === myNumber;
  const normalizedAbilityId = String(abilityId || '').trim().toLowerCase();
  // Charge keeps its own dash readability, so avoid overriding it with cast frames.
  if (normalizedAbilityId !== 'charge') {
    triggerArenaSpriteCastForActor(actorIsPlayer ? player : dummy);
  }

}

function triggerArenaDashForPlayer(snapshot, playerNumber) {
  const myNumber = Number(snapshot?.myPlayerNumber);
  if (!Number.isFinite(myNumber)) return;
  const actorIsPlayer = Number(playerNumber) === myNumber;
  triggerArenaSpriteDashForActor(actorIsPlayer ? player : dummy);
}

function triggerArenaHitForPlayer(snapshot, playerNumber, options = {}) {
  const myNumber = Number(snapshot?.myPlayerNumber);
  const targetNumber = Number(playerNumber);
  if (!Number.isFinite(myNumber) || !Number.isFinite(targetNumber) || targetNumber <= 0) return;
  const animateSprite = options?.animateSprite !== false;
  const actorIsPlayer = targetNumber === myNumber;
  if (animateSprite) {
    triggerArenaSpriteHitForActor(actorIsPlayer ? player : dummy);
  }
}

function getRuntimePlayerPositionByNumber(snapshot, playerNumber) {
  const myNumber = Number(snapshot?.myPlayerNumber);
  const targetNumber = Number(playerNumber);
  if (!Number.isFinite(myNumber) || !Number.isFinite(targetNumber) || targetNumber <= 0) return null;
  if (targetNumber === myNumber) return snapshot?.myPosition || null;
  return snapshot?.opponentPosition || null;
}

function getMappedPlayerPositionByNumber(snapshot, playerNumber) {
  return mapMultiplayerArenaPointToCanvas(
    snapshot,
    getRuntimePlayerPositionByNumber(snapshot, playerNumber)
  );
}

function resolveServerEffectUntilSec(remainingMs, absoluteUntilMs, nowPerfSec = (performance.now() / 1000)) {
  const remainingFromPayloadMs = Math.max(0, Number(remainingMs) || 0);
  const absoluteUntil = Number(absoluteUntilMs) || 0;
  const remainingFromAbsoluteMs = absoluteUntil > 0
    ? Math.max(0, absoluteUntil - Date.now())
    : 0;
  const resolvedRemainingMs = Math.max(remainingFromPayloadMs, remainingFromAbsoluteMs);
  return resolvedRemainingMs > 0 ? (nowPerfSec + (resolvedRemainingMs / 1000)) : 0;
}

function emitKnockbackTrail(actor, actorKey = 'player') {
  if (!actor || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return;
  const speed = Math.hypot(Number(actor.vx) || 0, Number(actor.vy) || 0);
  if (speed < COMBAT_FEEL.strongHitThreshold) return;

  const now = performance.now() / 1000;
  const throttleKey = actorKey === 'dummy' ? 'dummy' : 'player';
  const lastAt = Number(multiplayerArenaBridgeState.lastTrailAt?.[throttleKey]) || 0;
  if (now - lastAt < 0.035) return;
  multiplayerArenaBridgeState.lastTrailAt[throttleKey] = now;

  const dir = normalized(Number(actor.vx) || 0, Number(actor.vy) || 0);
  const trailColor = throttleKey === 'player'
    ? 'rgba(190,228,255,0.44)'
    : 'rgba(255,208,162,0.44)';

  addParticle({
    x: actor.x - dir.x * (actor.r * 0.8),
    y: actor.y - dir.y * (actor.r * 0.8),
    vx: (-dir.x * 60) + ((Math.random() - 0.5) * 42),
    vy: (-dir.y * 60) + ((Math.random() - 0.5) * 42),
    life: 0.12,
    size: 2.2 + Math.random() * 2.8,
    color: trailColor
  });
}

function triggerAbilityCastOriginFeedback(snapshot, ownerPlayerNumber, abilityId = '') {
  const sourcePoint = getMappedPlayerPositionByNumber(snapshot, ownerPlayerNumber);
  if (!sourcePoint) return;

  const palette = getAbilityFeedbackPalette(abilityId, 'cast');
  spawnBurst(sourcePoint.x, sourcePoint.y, palette.burst, 9, 120);
  pushCombatImpactWave(sourcePoint.x, sourcePoint.y, {
    color: palette.color,
    duration: 0.17,
    startRadius: 18,
    endRadius: 52,
    alpha: 0.46,
    fillAlpha: 0.1,
    width: 2.1,
  });

  if (abilityId === 'gust') {
    spawnGustCasterWindFx(sourcePoint.x, sourcePoint.y, { scale: 0.88 });
    return;
  }

  if (abilityId === 'hook') {
    const sourceAim = Number(ownerPlayerNumber) === Number(snapshot?.myPlayerNumber)
      ? snapshot?.myAimDirection
      : snapshot?.opponentAimDirection;
    const dir = normalizeRuntimeAim(sourceAim, 1, 0);
    pushDirectionalWave(sourcePoint.x, sourcePoint.y, dir.x, dir.y, {
      color: palette.color,
      duration: 0.18,
      travel: 98,
      spread: 16,
      alpha: 0.52,
      width: 2.2,
    });
    return;
  }

  if (abilityId === 'shock' || abilityId === 'charge') {
    const sourceAim = Number(ownerPlayerNumber) === Number(snapshot?.myPlayerNumber)
      ? snapshot?.myAimDirection
      : snapshot?.opponentAimDirection;
    const dir = normalizeRuntimeAim(sourceAim, 1, 0);
    pushDirectionalWave(sourcePoint.x, sourcePoint.y, dir.x, dir.y, {
      color: palette.color,
      duration: 0.18,
      travel: palette.waveTravel,
      spread: 24,
      alpha: 0.48,
      width: 2.2,
    });
    if (abilityId === 'shock') {
      spawnPracticeSpellImageFx('shock', {
        x: sourcePoint.x + (dir.x * ((Number(player?.r) || 18) + 26)),
        y: sourcePoint.y + (dir.y * ((Number(player?.r) || 18) + 26)),
        dirX: dir.x,
        dirY: dir.y,
        maxLife: 0.3,
        width: 228,
        height: 176,
        alpha: 0.9,
        scaleFrom: 0.88,
        scaleTo: 1.12,
      });
    }
  }
}

function playMultiplayerAbilitySound(abilityId, context = 'cast') {
  const id = String(abilityId || '').trim().toLowerCase();
  const phase = String(context || '').trim().toLowerCase();

  if (id === 'fireblast') {
    soundFire();
    return;
  }

  if (id === 'shield') {
    if (phase === 'cast' || phase === 'activate' || phase === 'block') {
      soundShield();
    }
    return;
  }

  if (id === 'prism') {
    if (phase === 'cast' || phase === 'activate' || phase === 'block' || phase === 'reflect') {
      soundShield();
    }
    return;
  }

  if (id === 'solar') {
    if (phase === 'cast' || phase === 'hit' || phase === 'explode') {
      soundFire();
    }
    return;
  }

  if (id === 'rift') {
    if (phase === 'cast' || phase === 'link' || phase === 'teleport') {
      soundShield();
    }
    return;
  }

  if (id === 'phantom') {
    if (phase === 'cast' || phase === 'vanish' || phase === 'split') {
      soundShield();
    }
    return;
  }

  if (id === 'charge') {
    if (phase === 'cast' || phase === 'activate') {
      soundCharge();
    }
  }
}

function triggerRewindFeedback(snapshot, hitEvent) {
  const metadata = hitEvent?.metadata && typeof hitEvent.metadata === 'object'
    ? hitEvent.metadata
    : null;
  const fromMapped = mapMultiplayerArenaPointToCanvas(snapshot, metadata?.from);
  const toMapped = mapMultiplayerArenaPointToCanvas(snapshot, metadata?.to);
  if (!fromMapped && !toMapped) return;

  const palette = getAbilityFeedbackPalette('rewind', 'rewind_used');
  if (fromMapped) {
    spawnBurst(fromMapped.x, fromMapped.y, 'rgba(180,150,255,0.78)', 10, 90);
    pushCombatImpactWave(fromMapped.x, fromMapped.y, {
      color: '190,160,255',
      duration: 0.16,
      startRadius: 14,
      endRadius: 44,
      alpha: 0.4,
      fillAlpha: 0.08,
      width: 2,
    });
  }
  if (toMapped) {
    spawnBurst(toMapped.x, toMapped.y, palette.burst, 12, 125);
    pushCombatImpactWave(toMapped.x, toMapped.y, {
      color: palette.color,
      duration: 0.2,
      startRadius: 18,
      endRadius: 60,
      alpha: 0.58,
      fillAlpha: 0.14,
      width: 2.5,
    });
    spawnArenaHitFlash(toMapped.x, toMapped.y, Number(hitEvent?.targetPlayerNumber) === Number(snapshot?.myPlayerNumber) ? 'player' : 'dummy');
  }
  if (fromMapped && toMapped) {
    const ghostSteps = 4;
    for (let i = 1; i <= ghostSteps; i += 1) {
      const t = i / (ghostSteps + 1);
      addParticle({
        x: fromMapped.x + ((toMapped.x - fromMapped.x) * t),
        y: fromMapped.y + ((toMapped.y - fromMapped.y) * t),
        vx: 0,
        vy: 0,
        life: 0.12 + (0.03 * i),
        size: 2.4,
        color: 'rgba(195,168,255,0.52)',
      });
    }
  }
  triggerCombatScreenShake(0.15, 0.09);
}

function triggerMultiplayerHitFeedback(snapshot, hitEvent) {
  const targetNumber = Number(hitEvent?.targetPlayerNumber);
  const sourceNumber = Number(hitEvent?.sourcePlayerNumber);
  const myNumber = Number(snapshot?.myPlayerNumber);
  const abilityId = String(hitEvent?.abilityId || '').trim().toLowerCase();
  const hitType = String(hitEvent?.type || '').trim().toLowerCase();
  const solarHitCount = Math.max(0, Number(hitEvent?.metadata?.hitCount) || 0);
  const knockback = {
    x: Number(hitEvent?.knockback?.x) || 0,
    y: Number(hitEvent?.knockback?.y) || 0,
  };
  const targetMapped = getMappedPlayerPositionByNumber(snapshot, targetNumber);
  const sourceMapped = getMappedPlayerPositionByNumber(snapshot, sourceNumber);
  const palette = getAbilityFeedbackPalette(abilityId, hitType);
  const hasTargetPlayer = Number.isFinite(targetNumber) && targetNumber > 0;
  const isSolarMissExplosion = hitType === 'solar_explode' && solarHitCount <= 0;
  const isGustCastOnly = hitType === 'gust_cast';

  if (hitType.startsWith('prism_reflect')) {
    playMultiplayerAbilitySound('prism', 'reflect');
  } else if (hitType.startsWith('prism_block')) {
    playMultiplayerAbilitySound('prism', 'block');
  } else if (hitType.startsWith('rift_')) {
    playMultiplayerAbilitySound('rift', hitType === 'rift_teleport' ? 'teleport' : 'cast');
  } else if (hitType.startsWith('phantom_')) {
    playMultiplayerAbilitySound('phantom', hitType === 'phantom_vanish' ? 'vanish' : 'split');
  } else if (hitType === 'solar_explode') {
    playMultiplayerAbilitySound('solar', 'explode');
  } else if (hitType === 'solar_hit') {
    playMultiplayerAbilitySound('solar', 'hit');
  }

  if (hitType === 'solar_hit' && targetNumber === myNumber) {
    const debuffUntilMs = Number(hitEvent?.metadata?.debuffUntil) || 0;
    const debuffDurationMs = Number(hitEvent?.metadata?.debuffDurationMs) || 1200;
    const fallbackRemainingMs = debuffUntilMs > 0 ? 0 : Math.max(0, debuffDurationMs);
    const debuffUntilSec = resolveServerEffectUntilSec(
      fallbackRemainingMs,
      debuffUntilMs,
      performance.now() / 1000
    );
    player.solarDistortionUntil = Math.max(Number(player.solarDistortionUntil) || 0, debuffUntilSec);
    triggerCombatScreenShake(1, 0.22);
  }

  if ((hitType === 'gust_hit' || hitType === 'gust_cast') && sourceMapped) {
    spawnGustCasterWindFx(sourceMapped.x, sourceMapped.y, { scale: isGustCastOnly ? 1 : 0.9 });
  }

  if (hitType === 'fireblast_blocked') {
    const impactPoint = mapMultiplayerArenaPointToCanvas(snapshot, hitEvent?.metadata?.position);
    if (impactPoint) {
      spawnFireblastObstacleImpactAt(impactPoint.x, impactPoint.y, {
        burstCount: 13,
        burstSpeed: 125,
      });
    }
    return;
  }

  if (abilityId === 'shock' && sourceMapped) {
    const dir = targetMapped
      ? normalized(targetMapped.x - sourceMapped.x, targetMapped.y - sourceMapped.y)
      : normalizeRuntimeAim(
        Number(sourceNumber) === Number(myNumber)
          ? snapshot?.myAimDirection
          : snapshot?.opponentAimDirection,
        1,
        0
      );
    spawnPracticeSpellImageFx('shock', {
      x: sourceMapped.x + (dir.x * ((Number(player?.r) || 18) + 24)),
      y: sourceMapped.y + (dir.y * ((Number(player?.r) || 18) + 24)),
      dirX: dir.x,
      dirY: dir.y,
      maxLife: 0.28,
      width: 220,
      height: 168,
      alpha: 0.88,
      scaleFrom: 0.9,
      scaleTo: 1.12,
    });
    if (hasTargetPlayer && targetMapped) {
      spawnPracticeSpellImageFx('shock', {
        x: targetMapped.x,
        y: targetMapped.y,
        dirX: dir.x,
        dirY: dir.y,
        maxLife: 0.24,
        width: 142,
        height: 142,
        alpha: 0.82,
        scaleFrom: 0.96,
        scaleTo: 1.18,
      });
    }
  }

  if (hasTargetPlayer && targetMapped) {
    spawnArenaHitFlash(targetMapped.x, targetMapped.y, targetNumber === myNumber ? 'player' : 'dummy');
    spawnBurst(targetMapped.x, targetMapped.y, palette.burst, hitType === 'shield_block' ? 10 : 14, 150);
    pushCombatImpactWave(targetMapped.x, targetMapped.y, {
      color: palette.color,
      duration: hitType === 'shield_block' ? 0.17 : 0.23,
      startRadius: 18,
      endRadius: hitType === 'shield_block' ? 58 : 84,
      alpha: hitType === 'shield_block' ? 0.52 : 0.72,
      fillAlpha: hitType === 'shield_block' ? 0.12 : 0.2,
      width: hitType === 'shield_block' ? 2.2 : 3.2,
    });
    if (hitType !== 'rewind_used') {
      const metadataDamage = Number(hitEvent?.metadata?.damage);
      const isDamageNumber = Number.isFinite(metadataDamage) && metadataDamage > 0;
      const damageLabel = isDamageNumber
        ? `-${Math.round(metadataDamage)}`
        : String(palette.text || 'HIT');
      let damageColor = palette.textColor || DAMAGE_TEXT_PALETTE.neutral;
      if (isDamageNumber) {
        if (targetNumber === myNumber) {
          damageColor = DAMAGE_TEXT_PALETTE.taken;
        } else if (sourceNumber === myNumber) {
          damageColor = DAMAGE_TEXT_PALETTE.dealt;
        } else {
          damageColor = DAMAGE_TEXT_PALETTE.neutral;
        }
      }
      if (isDamageNumber) {
        // Match practice damage-counter readability exactly.
        spawnDamageText(targetMapped.x, targetMapped.y - 18, metadataDamage, damageColor);
      } else {
        damageTexts.push({
          x: targetMapped.x,
          y: targetMapped.y - 30,
          value: damageLabel,
          life: 0.75,
          vy: -34,
          color: damageColor,
          outlineColor: 'rgba(10,16,24,0.94)',
          shadowColor: 'rgba(0,0,0,0.4)',
          fontSize: 21,
          fontWeight: 900,
        });
      }
    }
    if (knockback.x !== 0 || knockback.y !== 0) {
      pushDirectionalWave(targetMapped.x, targetMapped.y, knockback.x, knockback.y, {
        color: palette.color,
        duration: 0.2,
        travel: palette.waveTravel,
        spread: 24,
        alpha: 0.54,
        width: 2.3,
      });
    }
  }

  if (sourceMapped && hitType !== 'shield_block' && !isSolarMissExplosion) {
    pushCombatImpactWave(sourceMapped.x, sourceMapped.y, {
      color: palette.color,
      duration: 0.15,
      startRadius: 12,
      endRadius: 42,
      alpha: 0.36,
      fillAlpha: 0.06,
      width: 1.9,
    });
  }

  if (hitType === 'hook_pull' && sourceMapped && targetMapped) {
    const linkDir = normalized(targetMapped.x - sourceMapped.x, targetMapped.y - sourceMapped.y);
    pushDirectionalWave(sourceMapped.x, sourceMapped.y, linkDir.x, linkDir.y, {
      color: '176,214,255',
      duration: 0.18,
      travel: Math.max(52, distance(sourceMapped.x, sourceMapped.y, targetMapped.x, targetMapped.y)),
      spread: 14,
      alpha: 0.5,
      width: 2.1,
    });
  } else if (hitType === 'rewind_used') {
    triggerRewindFeedback(snapshot, hitEvent);
  }

  if (hasTargetPlayer && targetNumber === myNumber) {
    triggerActorHitFlash('player');
  } else if (hasTargetPlayer) {
    triggerActorHitFlash('dummy');
  }

  if (!isSolarMissExplosion && !isGustCastOnly) {
    triggerCombatScreenShake(hitType === 'charge_hit' ? 0.3 : palette.shake, hitType === 'charge_hit' ? 0.15 : 0.11);
  }
}

function triggerMatchPhaseFeedback(snapshot) {
  const currentPhase = String(snapshot?.matchPhase || '').trim().toLowerCase();
  const previousPhase = String(multiplayerArenaBridgeState.lastMatchPhase || '').trim().toLowerCase();
  if (currentPhase === previousPhase) return;

  multiplayerArenaBridgeState.lastMatchPhase = currentPhase;
  if (currentPhase !== 'match_end') return;

  const eliminatedPlayerNumber = Number(snapshot?.eliminatedPlayerNumber);
  const winnerPlayerNumber = Number(snapshot?.winnerPlayerNumber);
  const eliminatedPoint = getMappedPlayerPositionByNumber(snapshot, eliminatedPlayerNumber);
  if (eliminatedPoint) {
    spawnBurst(eliminatedPoint.x, eliminatedPoint.y, 'rgba(255,170,112,0.96)', 22, 210);
    pushCombatImpactWave(eliminatedPoint.x, eliminatedPoint.y, {
      color: '255,170,112',
      duration: 0.34,
      startRadius: 18,
      endRadius: 132,
      alpha: 0.82,
      fillAlpha: 0.22,
      width: 3.6,
    });
    triggerEliminationPulse(eliminatedPoint.x, eliminatedPoint.y, winnerPlayerNumber, eliminatedPlayerNumber);
  }
  triggerCombatScreenShake(0.56, 0.2);
}

function syncMultiplayerArenaActors(snapshot, dt = 0) {
  const safeDt = Math.max(0, Math.min(0.05, Number(dt) || 0));
  const myMapped = mapMultiplayerArenaPointToCanvas(snapshot, snapshot?.myPosition);
  const oppMapped = mapMultiplayerArenaPointToCanvas(snapshot, snapshot?.opponentPosition);
  const myVel = mapMultiplayerArenaVectorToCanvas(snapshot, snapshot?.myVelocity);
  const oppVel = mapMultiplayerArenaVectorToCanvas(snapshot, snapshot?.opponentVelocity);
  const myAim = normalizeRuntimeAim(snapshot?.myAimDirection, player.aimX || 1, player.aimY || 0);
  const oppAim = normalizeRuntimeAim(snapshot?.opponentAimDirection, -1, 0);
  const opponentName = String(snapshot?.opponentDisplayName || '').trim();
  const nowSec = performance.now() / 1000;
  const nowMs = Date.now();
  const myChargeActiveNow = !!snapshot?.myActiveEffects?.chargeActive;
  const oppChargeActiveNow = !!snapshot?.opponentActiveEffects?.chargeActive;
  const myBlinkReadyAt = Math.max(0, Number(snapshot?.myBlinkReadyAt) || 0);
  const oppBlinkReadyAt = Math.max(0, Number(snapshot?.opponentBlinkReadyAt) || 0);
  const myBlinkCooldownStarted =
    myBlinkReadyAt > 0
    && myBlinkReadyAt !== multiplayerArenaBridgeState.lastMyBlinkReadyAt
    && myBlinkReadyAt > nowMs;
  const oppBlinkCooldownStarted =
    oppBlinkReadyAt > 0
    && oppBlinkReadyAt !== multiplayerArenaBridgeState.lastOppBlinkReadyAt
    && oppBlinkReadyAt > nowMs;
  const forceMyBlinkSnap =
    myBlinkCooldownStarted
    && !myChargeActiveNow
    && !multiplayerArenaBridgeState.lastMyChargeActive;
  const forceOppBlinkSnap =
    oppBlinkCooldownStarted
    && !oppChargeActiveNow
    && !multiplayerArenaBridgeState.lastOppChargeActive;

  if (myMapped) {
    multiplayerArenaBridgeState.myServerTarget = { x: myMapped.x, y: myMapped.y };
    if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) {
      player.x = myMapped.x;
      player.y = myMapped.y;
    }
  } else {
    multiplayerArenaBridgeState.myServerTarget = null;
  }
  player.vx = myVel ? myVel.x : 0;
  player.vy = myVel ? myVel.y : 0;
  player.aimX = myAim.x;
  player.aimY = myAim.y;
  player.shieldUntil = snapshot?.myActiveEffects?.shieldActive
    ? (nowSec + Math.max(0, Number(snapshot.myActiveEffects.shieldRemainingMs) || 0) / 1000)
    : 0;
  player.prismUntil = resolveServerEffectUntilSec(
    snapshot?.myActiveEffects?.prismRemainingMs,
    snapshot?.myActiveEffects?.prismUntil,
    nowSec
  );
  const myPrismDirection = normalizeRuntimeAim(
    snapshot?.myActiveEffects?.prismDirection,
    myAim.x,
    myAim.y
  );
  player.prismDirX = myPrismDirection.x;
  player.prismDirY = myPrismDirection.y;
  player.solarDistortionUntil = resolveServerEffectUntilSec(
    snapshot?.myActiveEffects?.solarDistortionRemainingMs,
    snapshot?.myActiveEffects?.solarDistortionUntil,
    nowSec
  );
  player.riftPendingPortalA = mapMultiplayerArenaPointToCanvas(snapshot, snapshot?.myActiveEffects?.riftPendingPortalA);
  player.riftPendingExpiresAt = resolveServerEffectUntilSec(
    snapshot?.myActiveEffects?.riftPendingRemainingMs,
    snapshot?.myActiveEffects?.riftPendingExpiresAt,
    nowSec
  );
  player.phantomVanishUntil = resolveServerEffectUntilSec(
    snapshot?.myActiveEffects?.phantomVanishRemainingMs,
    snapshot?.myActiveEffects?.phantomVanishUntil,
    nowSec
  );
  player.chargeActive = myChargeActiveNow;
  const myChargeDir = normalizeRuntimeAim(snapshot?.myActiveEffects?.chargeDirection, myAim.x, myAim.y);
  player.chargeDirX = myChargeDir.x;
  player.chargeDirY = myChargeDir.y;

  dummyEnabled = !!oppMapped;
  if (oppMapped) {
    // Remote actor smoothing: keep server-authoritative target, render with lerp.
    dummy.targetX = oppMapped.x;
    dummy.targetY = oppMapped.y;

    if (!Number.isFinite(dummy.x) || !Number.isFinite(dummy.y)) {
      dummy.x = dummy.targetX;
      dummy.y = dummy.targetY;
    } else {
      const dx = dummy.targetX - dummy.x;
      const dy = dummy.targetY - dummy.y;
      const dist = Math.hypot(dx, dy);

      // Hard-snap when desync is large to avoid long catch-up trails.
      if (
        dist > MP_REMOTE_POSITION_SNAP_DISTANCE
        || (forceOppBlinkSnap && dist > MP_LOCAL_POSITION_RECONCILE_DEADZONE)
      ) {
        dummy.x = dummy.targetX;
        dummy.y = dummy.targetY;
      } else {
        dummy.x += dx * MP_REMOTE_POSITION_LERP_FACTOR;
        dummy.y += dy * MP_REMOTE_POSITION_LERP_FACTOR;
      }
    }
  } else {
    dummy.targetX = dummy.x;
    dummy.targetY = dummy.y;
  }
  dummy.vx = oppVel ? oppVel.x : 0;
  dummy.vy = oppVel ? oppVel.y : 0;
  dummy.name = opponentName || 'Opponent';
  dummy.aimX = oppAim.x;
  dummy.aimY = oppAim.y;
  dummy.shieldUntil = snapshot?.opponentActiveEffects?.shieldActive
    ? (nowSec + Math.max(0, Number(snapshot.opponentActiveEffects.shieldRemainingMs) || 0) / 1000)
    : 0;
  dummy.prismUntil = resolveServerEffectUntilSec(
    snapshot?.opponentActiveEffects?.prismRemainingMs,
    snapshot?.opponentActiveEffects?.prismUntil,
    nowSec
  );
  const oppPrismDirection = normalizeRuntimeAim(
    snapshot?.opponentActiveEffects?.prismDirection,
    oppAim.x,
    oppAim.y
  );
  dummy.prismDirX = oppPrismDirection.x;
  dummy.prismDirY = oppPrismDirection.y;
  dummy.solarDistortionUntil = resolveServerEffectUntilSec(
    snapshot?.opponentActiveEffects?.solarDistortionRemainingMs,
    snapshot?.opponentActiveEffects?.solarDistortionUntil,
    nowSec
  );
  dummy.phantomVanishUntil = resolveServerEffectUntilSec(
    snapshot?.opponentActiveEffects?.phantomVanishRemainingMs,
    snapshot?.opponentActiveEffects?.phantomVanishUntil,
    nowSec
  );
  dummy.chargeActive = oppChargeActiveNow;
  const oppChargeDir = normalizeRuntimeAim(snapshot?.opponentActiveEffects?.chargeDirection, oppAim.x, oppAim.y);
  dummy.chargeDirX = oppChargeDir.x;
  dummy.chargeDirY = oppChargeDir.y;

  const isMatchEnd = String(snapshot?.matchPhase || '').toLowerCase() === 'match_end' || !!snapshot?.isMatchEnd;
  const myNumber = Number(snapshot?.myPlayerNumber);
  const oppNumber = Number(snapshot?.opponentPlayerNumber);
  const eliminated = Number(snapshot?.eliminatedPlayerNumber);
  const oppConnected = snapshot?.opponentConnected !== false;
  player.alive = !isMatchEnd || eliminated !== myNumber;
  dummy.alive = !!oppMapped && oppConnected && (!isMatchEnd || eliminated !== oppNumber);
  const phase = String(snapshot?.matchPhase || '').trim().toLowerCase();
  const canPredictLocalMovement = (
    phase === 'combat'
    && player.alive
    && snapshot?.myConnected !== false
    && safeDt > 0
  );
  if (canPredictLocalMovement) {
    if (!player.chargeActive) {
      const moveIntent = getLocalMultiplayerMoveIntent();
      if ((Math.abs(moveIntent.x) + Math.abs(moveIntent.y)) > 0.0001) {
        moveActorWithSlide(player, moveIntent.x, moveIntent.y, safeDt);
      }
    }
    // Integrate server-auth velocity locally so knockback/pulls feel continuous between snapshots.
    updateActorPhysics(player, safeDt);
  }

  const myServerTarget = multiplayerArenaBridgeState.myServerTarget;
  if (myServerTarget) {
    const dx = myServerTarget.x - player.x;
    const dy = myServerTarget.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (
      dist > MP_LOCAL_POSITION_SNAP_DISTANCE
      || (forceMyBlinkSnap && dist > MP_LOCAL_POSITION_RECONCILE_DEADZONE)
    ) {
      player.x = myServerTarget.x;
      player.y = myServerTarget.y;
    } else if (dist > MP_LOCAL_POSITION_RECONCILE_DEADZONE) {
      player.x += dx * MP_LOCAL_POSITION_RECONCILE_LERP;
      player.y += dy * MP_LOCAL_POSITION_RECONCILE_LERP;
    }
  }
  const myMaxHealth = Number(snapshot?.myMaxHealth);
  if (Number.isFinite(myMaxHealth) && myMaxHealth > 0) {
    player.maxHp = myMaxHealth;
  }
  const myCurrentHealth = Number(snapshot?.myCurrentHealth);
  if (Number.isFinite(myCurrentHealth)) {
    player.hp = Math.max(0, Math.min(player.maxHp, myCurrentHealth));
  } else {
    player.hp = player.alive ? player.maxHp : 0;
  }

  const oppMaxHealth = Number(snapshot?.opponentMaxHealth);
  if (Number.isFinite(oppMaxHealth) && oppMaxHealth > 0) {
    dummy.maxHp = oppMaxHealth;
  }
  const oppCurrentHealth = Number(snapshot?.opponentCurrentHealth);
  if (Number.isFinite(oppCurrentHealth)) {
    dummy.hp = Math.max(0, Math.min(dummy.maxHp, oppCurrentHealth));
  } else {
    dummy.hp = dummy.alive ? dummy.maxHp : 0;
  }

  if (player.alive) {
    emitKnockbackTrail(player, 'player');
  }
  if (dummyEnabled && dummy.alive) {
    emitKnockbackTrail(dummy, 'dummy');
  }
}

function syncMultiplayerArenaCollections(snapshot) {
  const myNumber = Number(snapshot?.myPlayerNumber);
  const runtimeProjectiles = Array.isArray(snapshot?.projectiles) ? snapshot.projectiles : [];
  const runtimeWalls = Array.isArray(snapshot?.walls) ? snapshot.walls : [];
  const runtimeRoundPillars = Array.isArray(snapshot?.roundPillars) ? snapshot.roundPillars : [];
  const runtimeRifts = Array.isArray(snapshot?.rifts) ? snapshot.rifts : [];
  const runtimePhantomIllusions = Array.isArray(snapshot?.phantomIllusions) ? snapshot.phantomIllusions : [];
  const scale = getMultiplayerArenaScale(snapshot);
  const nowMs = Date.now();
  const snapshotTimestamp = Number(snapshot?.matchStateTimestamp);
  const snapshotAgeMs = Number.isFinite(snapshotTimestamp) && snapshotTimestamp > 0
    ? Math.max(0, Math.min(MP_PROJECTILE_EXTRAPOLATION_MAX_MS, nowMs - snapshotTimestamp))
    : 0;
  const projectileExtrapolationSeconds = snapshotAgeMs / 1000;
  const projectileMap = multiplayerArenaBridgeState.projectilesById;
  const floatingStoneBlockedProjectileIds = multiplayerArenaBridgeState.floatingStoneBlockedProjectileIds;
  const hookMap = multiplayerArenaBridgeState.hooksById;
  const wallMap = multiplayerArenaBridgeState.wallsById;
  const riftMap = multiplayerArenaBridgeState.riftsById;
  const phantomIllusionMap = multiplayerArenaBridgeState.phantomIllusionsById;
  const floatingStoneHitCircles = getSharedFloatingStoneHitCircles(snapshot);
  const nextProjectileIds = new Set();
  const runtimeProjectileIds = new Set();
  const nextHookIds = new Set();
  const nextWallIds = new Set();
  const nextRiftIds = new Set();
  const nextPhantomIllusionIds = new Set();

  obstacles.length = 0;
  for (let index = 0; index < runtimeRoundPillars.length; index += 1) {
    const pillar = runtimeRoundPillars[index];
    const mappedCenter = mapMultiplayerArenaPointToCanvas(snapshot, pillar?.position);
    if (!mappedCenter) continue;
    const mappedRadius = Math.max(8, (Math.max(0.05, Number(pillar?.radius) || 0.9) * scale));
    obstacles.push({
      x: mappedCenter.x,
      y: mappedCenter.y,
      r: mappedRadius,
      hidden: true,
      kind: 'pillar',
    });
  }

  for (let index = 0; index < runtimeProjectiles.length; index += 1) {
    const projectile = runtimeProjectiles[index];
    const baseMapped = mapMultiplayerArenaPointToCanvas(snapshot, projectile?.position);
    if (!baseMapped) continue;

    const owner = Number(projectile?.ownerPlayerNumber) === myNumber ? 'player' : 'dummy';
    const abilityId = String(projectile?.abilityId || '').trim().toLowerCase();
    const r = Math.max(4, (Math.max(0.08, Number(projectile?.hitRadius) || 0.28) * scale));
    const sourceId = String(projectile?.projectileId || '').trim();
    const direction = normalizeRuntimeAim(projectile?.direction, 0, 0);
    const speedPerSec = Math.max(0, Number(projectile?.speed) || 0) * scale;
    const velocityX = direction.x * speedPerSec;
    const velocityY = direction.y * speedPerSec;
    const predictedX = baseMapped.x + (velocityX * projectileExtrapolationSeconds);
    const predictedY = baseMapped.y + (velocityY * projectileExtrapolationSeconds);

    if (abilityId === 'hook') {
      const hookId = sourceId || `hook-${owner}-${index}`;
      nextHookIds.add(hookId);

      let hookEntry = hookMap.get(hookId);
      if (!hookEntry) {
        hookEntry = { owner, x: 0, y: 0, state: 'flying' };
        hookMap.set(hookId, hookEntry);
        hooks.push(hookEntry);
      }

      hookEntry.owner = owner;
      hookEntry.x = predictedX;
      hookEntry.y = predictedY;
      hookEntry.state = 'flying';
      continue;
    }

    const projectileId = sourceId || `projectile-${abilityId || 'fire'}-${owner}-${index}`;
    runtimeProjectileIds.add(projectileId);
    if (abilityId === 'fireblast') {
      if (floatingStoneBlockedProjectileIds.has(projectileId)) {
        const blockedEntry = projectileMap.get(projectileId);
        if (blockedEntry) {
          projectileMap.delete(projectileId);
          const blockedIndex = projectiles.indexOf(blockedEntry);
          if (blockedIndex >= 0) projectiles.splice(blockedIndex, 1);
        }
        continue;
      }
      if (floatingStoneHitCircles.length) {
        const knownEntry = projectileMap.get(projectileId);
        let hitStone = null;
        for (const stone of floatingStoneHitCircles) {
          const hitRadius = Math.max(1, r + (Number(stone?.r) || 0));
          if (distance(predictedX, predictedY, Number(stone?.x) || 0, Number(stone?.y) || 0) > hitRadius) continue;
          hitStone = stone;
          break;
        }
        if (hitStone) {
          floatingStoneBlockedProjectileIds.add(projectileId);
          const hitEntry = projectileMap.get(projectileId);
          if (hitEntry) {
            projectileMap.delete(projectileId);
            const hitIndex = projectiles.indexOf(hitEntry);
            if (hitIndex >= 0) projectiles.splice(hitIndex, 1);
          }
          spawnBurst(predictedX, predictedY, 'rgba(255,188,120,0.94)', 12, 110);
          pushCombatImpactWave(predictedX, predictedY, {
            color: '255,186,122',
            duration: 0.16,
            startRadius: 10,
            endRadius: 42,
            alpha: 0.5,
            fillAlpha: 0.1,
            width: 2.1,
          });
          continue;
        }
      }
    }
    nextProjectileIds.add(projectileId);

    let projectileEntry = projectileMap.get(projectileId);
    if (!projectileEntry) {
      projectileEntry = {
        owner,
        x: predictedX,
        y: predictedY,
        prevX: predictedX,
        prevY: predictedY,
        targetX: predictedX,
        targetY: predictedY,
        vx: velocityX,
        vy: velocityY,
        r,
        abilityId
      };
      projectileMap.set(projectileId, projectileEntry);
      projectiles.push(projectileEntry);
    } else {
      const fromX = Number.isFinite(projectileEntry.x) ? projectileEntry.x : predictedX;
      const fromY = Number.isFinite(projectileEntry.y) ? projectileEntry.y : predictedY;
      projectileEntry.prevX = fromX;
      projectileEntry.prevY = fromY;
      projectileEntry.targetX = predictedX;
      projectileEntry.targetY = predictedY;

      const deltaX = predictedX - fromX;
      const deltaY = predictedY - fromY;
      const deltaDist = Math.hypot(deltaX, deltaY);
      if (deltaDist > MP_PROJECTILE_SNAP_DISTANCE) {
        projectileEntry.x = predictedX;
        projectileEntry.y = predictedY;
      } else {
        projectileEntry.x = fromX + (deltaX * MP_PROJECTILE_POSITION_LERP);
        projectileEntry.y = fromY + (deltaY * MP_PROJECTILE_POSITION_LERP);
      }
    }

    projectileEntry.owner = owner;
    projectileEntry.vx = velocityX;
    projectileEntry.vy = velocityY;
    projectileEntry.r = r;
    projectileEntry.abilityId = abilityId;
  }

  for (const [projectileId, projectileEntry] of projectileMap) {
    if (nextProjectileIds.has(projectileId)) continue;
    projectileMap.delete(projectileId);
    const projectileIndex = projectiles.indexOf(projectileEntry);
    if (projectileIndex >= 0) projectiles.splice(projectileIndex, 1);
  }
  if (projectiles.length > projectileMap.size) {
    const trackedProjectileEntries = new Set(projectileMap.values());
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      if (!trackedProjectileEntries.has(projectiles[i])) {
        projectiles.splice(i, 1);
      }
    }
  }
  for (const projectileId of floatingStoneBlockedProjectileIds) {
    if (runtimeProjectileIds.has(projectileId)) continue;
    floatingStoneBlockedProjectileIds.delete(projectileId);
  }

  for (const [hookId, hookEntry] of hookMap) {
    if (nextHookIds.has(hookId)) continue;
    hookMap.delete(hookId);
    const hookIndex = hooks.indexOf(hookEntry);
    if (hookIndex >= 0) hooks.splice(hookIndex, 1);
  }

  for (let index = 0; index < runtimeWalls.length; index += 1) {
    const wall = runtimeWalls[index];
    const center = mapMultiplayerArenaPointToCanvas(snapshot, wall?.position);
    if (!center) continue;

    const expiresAt = Number(wall?.expiresAt) || 0;
    const spawnedAt = Number(wall?.spawnedAt) || 0;
    if (expiresAt > 0 && nowMs >= expiresAt) continue;

    const wallId = String(wall?.wallId || '').trim() || `wall-${index}`;
    nextWallIds.add(wallId);

    const dir = normalizeRuntimeAim(wall?.direction, 1, 0);
    const side = { x: -dir.y, y: dir.x };
    const halfLength = Math.max(0.2, Number(wall?.halfLength) || 1.9) * scale;
    const halfThickness = Math.max(0.1, Number(wall?.halfThickness) || 0.36) * scale;
    const segmentRadius = Math.max(6, halfThickness);
    const segmentCount = 7;

    let wallEntry = wallMap.get(wallId);
    if (!wallEntry) {
      wallEntry = { segments: [], life: 0, maxLife: 0 };
      wallMap.set(wallId, wallEntry);
      walls.push(wallEntry);
    }

    if (!Array.isArray(wallEntry.segments)) {
      wallEntry.segments = [];
    }
    wallEntry.segments.length = segmentCount;

    for (let i = 0; i < segmentCount; i += 1) {
      const t = segmentCount <= 1 ? 0 : (i / (segmentCount - 1)) - 0.5;
      const offset = t * halfLength * 2;
      let segment = wallEntry.segments[i];
      if (!segment) {
        segment = { x: 0, y: 0, r: segmentRadius };
        wallEntry.segments[i] = segment;
      }
      segment.x = center.x + side.x * offset;
      segment.y = center.y + side.y * offset;
      segment.r = segmentRadius;
    }

    const maxLife = Math.max(0.1, (Math.max(spawnedAt + 100, expiresAt) - spawnedAt) / 1000);
    const life = expiresAt > 0 ? Math.max(0, (expiresAt - nowMs) / 1000) : maxLife;
    wallEntry.life = life;
    wallEntry.maxLife = maxLife;
  }

  for (const [wallId, wallEntry] of wallMap) {
    if (nextWallIds.has(wallId)) continue;
    wallMap.delete(wallId);
    const wallIndex = walls.indexOf(wallEntry);
    if (wallIndex >= 0) walls.splice(wallIndex, 1);
  }

  for (let index = 0; index < runtimeRifts.length; index += 1) {
    const rift = runtimeRifts[index];
    const portalA = mapMultiplayerArenaPointToCanvas(snapshot, rift?.portalA);
    const portalB = mapMultiplayerArenaPointToCanvas(snapshot, rift?.portalB);
    if (!portalA || !portalB) continue;

    const expiresAt = Number(rift?.expiresAt) || 0;
    if (expiresAt > 0 && nowMs >= expiresAt) continue;
    const riftId = String(rift?.riftId || '').trim() || `rift-${index}`;
    nextRiftIds.add(riftId);

    let riftEntry = riftMap.get(riftId);
    if (!riftEntry) {
      riftEntry = {
        riftId,
        owner: 'player',
        portalA: { x: 0, y: 0 },
        portalB: { x: 0, y: 0 },
        portalRadius: Math.max(6, 0.9 * scale),
        linkedAt: 0,
        expiresAt: 0
      };
      riftMap.set(riftId, riftEntry);
      rifts.push(riftEntry);
    }

    riftEntry.owner = Number(rift?.ownerPlayerNumber) === myNumber ? 'player' : 'dummy';
    riftEntry.portalA = { x: portalA.x, y: portalA.y };
    riftEntry.portalB = { x: portalB.x, y: portalB.y };
    riftEntry.portalRadius = Math.max(6, (Math.max(0.05, Number(rift?.portalRadius) || 0.9) * scale));
    riftEntry.linkedAt = Number(rift?.linkedAt) || 0;
    riftEntry.expiresAt = expiresAt;
  }

  for (const [riftId, riftEntry] of riftMap) {
    if (nextRiftIds.has(riftId)) continue;
    riftMap.delete(riftId);
    const riftIndex = rifts.indexOf(riftEntry);
    if (riftIndex >= 0) rifts.splice(riftIndex, 1);
  }

  for (let index = 0; index < runtimePhantomIllusions.length; index += 1) {
    const illusion = runtimePhantomIllusions[index];
    const mapped = mapMultiplayerArenaPointToCanvas(snapshot, illusion?.position);
    if (!mapped) continue;
    const illusionId = String(illusion?.illusionId || '').trim() || `phantom-${index}`;
    const expiresAt = Number(illusion?.expiresAt) || 0;
    if (expiresAt > 0 && nowMs >= expiresAt) continue;
    nextPhantomIllusionIds.add(illusionId);

    let illusionEntry = phantomIllusionMap.get(illusionId);
    if (!illusionEntry) {
      illusionEntry = {
        illusionId,
        owner: 'player',
        x: 0,
        y: 0,
        r: Math.max(10, Number(player.r) || 18),
        facingX: 1,
        facingY: 0,
        expiresAt: 0
      };
      phantomIllusionMap.set(illusionId, illusionEntry);
      phantomIllusions.push(illusionEntry);
    }

    const facing = normalizeRuntimeAim(illusion?.facing, 1, 0);
    illusionEntry.owner = Number(illusion?.ownerPlayerNumber) === myNumber ? 'player' : 'dummy';
    illusionEntry.x = mapped.x;
    illusionEntry.y = mapped.y;
    illusionEntry.r = Math.max(10, Number(player.r) || 18);
    illusionEntry.facingX = facing.x;
    illusionEntry.facingY = facing.y;
    illusionEntry.expiresAt = expiresAt;
  }

  for (const [illusionId, illusionEntry] of phantomIllusionMap) {
    if (nextPhantomIllusionIds.has(illusionId)) continue;
    phantomIllusionMap.delete(illusionId);
    const illusionIndex = phantomIllusions.indexOf(illusionEntry);
    if (illusionIndex >= 0) phantomIllusions.splice(illusionIndex, 1);
  }
}

function syncMultiplayerArenaFeedback(snapshot) {
  const myNumber = Number(snapshot?.myPlayerNumber);
  const oppNumber = Number(snapshot?.opponentPlayerNumber);
  const runtimeProjectiles = Array.isArray(snapshot?.projectiles) ? snapshot.projectiles : [];
  const runtimeWalls = Array.isArray(snapshot?.walls) ? snapshot.walls : [];
  const runtimeHits = Array.isArray(snapshot?.hitEvents) ? snapshot.hitEvents : [];

  triggerMatchPhaseFeedback(snapshot);

  for (const projectile of runtimeProjectiles) {
    const projectileId = String(projectile?.projectileId || '');
    if (!projectileId || multiplayerArenaBridgeState.seenProjectileIds.has(projectileId)) continue;
    multiplayerArenaBridgeState.seenProjectileIds.add(projectileId);
    const abilityId = String(projectile?.abilityId || '').trim().toLowerCase();
    triggerArenaCastForPlayer(snapshot, projectile?.ownerPlayerNumber, abilityId);
    playMultiplayerAbilitySound(abilityId, 'cast');
    triggerAbilityCastOriginFeedback(
      snapshot,
      projectile?.ownerPlayerNumber,
      abilityId
    );
  }

  for (const wall of runtimeWalls) {
    const wallId = String(wall?.wallId || '');
    if (!wallId || multiplayerArenaBridgeState.seenWallIds.has(wallId)) continue;
    multiplayerArenaBridgeState.seenWallIds.add(wallId);
    triggerArenaCastForPlayer(snapshot, wall?.ownerPlayerNumber, 'wall');
    const wallCenter = mapMultiplayerArenaPointToCanvas(snapshot, wall?.position);
    if (wallCenter) {
      const style = getAbilityFeedbackPalette('wall', 'cast');
      spawnBurst(wallCenter.x, wallCenter.y, style.burst, 14, 120);
      pushCombatImpactWave(wallCenter.x, wallCenter.y, {
        color: style.color,
        duration: 0.22,
        startRadius: 20,
        endRadius: 80,
        alpha: 0.6,
        fillAlpha: 0.14,
        width: 2.8,
      });
      const wallDir = normalizeRuntimeAim(wall?.direction, 1, 0);
      const wallScale = getMultiplayerArenaScale(snapshot);
      const wallLength = Math.max(84, (Math.max(0.2, Number(wall?.halfLength) || 1.9) * 2) * wallScale);
      const wallThickness = Math.max(34, (Math.max(0.1, Number(wall?.halfThickness) || 0.36) * 2) * wallScale * 2.4);
      spawnPracticeSpellImageFx('wall', {
        x: wallCenter.x,
        y: wallCenter.y,
        dirX: wallDir.x,
        dirY: wallDir.y,
        maxLife: 0.34,
        width: wallLength,
        height: wallThickness,
        alpha: 0.74,
        scaleFrom: 0.86,
        scaleTo: 1.08,
      });
      triggerCombatScreenShake(0.16, 0.1);
    }
  }

  for (const hitEvent of runtimeHits) {
    const hitId = String(hitEvent?.hitId || '');
    if (!hitId || multiplayerArenaBridgeState.seenHitIds.has(hitId)) continue;
    multiplayerArenaBridgeState.seenHitIds.add(hitId);
    const hitType = String(hitEvent?.type || '').toLowerCase();
    if (hitType !== 'rewind_used') {
      triggerArenaHitForPlayer(snapshot, hitEvent?.targetPlayerNumber, {
        animateSprite: hitType !== 'shield_block',
      });
      if (hitType === 'shield_block') {
        playMultiplayerAbilitySound('shield', 'block');
      }
    } else {
      triggerArenaCastForPlayer(snapshot, hitEvent?.sourcePlayerNumber, 'rewind');
    }
    triggerMultiplayerHitFeedback(snapshot, hitEvent);
  }

  const myCharge = !!snapshot?.myActiveEffects?.chargeActive;
  const oppCharge = !!snapshot?.opponentActiveEffects?.chargeActive;
  const myShield = !!snapshot?.myActiveEffects?.shieldActive;
  const oppShield = !!snapshot?.opponentActiveEffects?.shieldActive;
  const myPrism = !!snapshot?.myActiveEffects?.prismActive;
  const oppPrism = !!snapshot?.opponentActiveEffects?.prismActive;
  if (myCharge && !multiplayerArenaBridgeState.lastMyChargeActive) {
    playMultiplayerAbilitySound('charge', 'activate');
    triggerArenaDashForPlayer(snapshot, myNumber);
    const source = getMappedPlayerPositionByNumber(snapshot, myNumber);
    const dir = normalizeRuntimeAim(snapshot?.myActiveEffects?.chargeDirection, snapshot?.myAimDirection?.x || 1, snapshot?.myAimDirection?.y || 0);
    if (source) {
      pushDirectionalWave(source.x, source.y, dir.x, dir.y, {
        color: '214,156,255',
        duration: 0.2,
        travel: 118,
        spread: 22,
        alpha: 0.62,
        width: 2.8,
      });
      spawnBurst(source.x, source.y, 'rgba(214,156,255,0.9)', 14, 140);
    }
  }
  if (oppCharge && !multiplayerArenaBridgeState.lastOppChargeActive) {
    playMultiplayerAbilitySound('charge', 'activate');
    triggerArenaDashForPlayer(snapshot, oppNumber);
    const source = getMappedPlayerPositionByNumber(snapshot, oppNumber);
    const dir = normalizeRuntimeAim(snapshot?.opponentActiveEffects?.chargeDirection, snapshot?.opponentAimDirection?.x || -1, snapshot?.opponentAimDirection?.y || 0);
    if (source) {
      pushDirectionalWave(source.x, source.y, dir.x, dir.y, {
        color: '214,156,255',
        duration: 0.2,
        travel: 118,
        spread: 22,
        alpha: 0.62,
        width: 2.8,
      });
      spawnBurst(source.x, source.y, 'rgba(214,156,255,0.9)', 14, 140);
    }
  }
  if (myShield && !multiplayerArenaBridgeState.lastMyShieldActive) {
    playMultiplayerAbilitySound('shield', 'activate');
    const source = getMappedPlayerPositionByNumber(snapshot, myNumber);
    if (source) {
      const shieldStyle = getAbilityFeedbackPalette('shield', 'cast');
      pushCombatImpactWave(source.x, source.y, {
        color: shieldStyle.color,
        duration: 0.2,
        startRadius: player.r + 10,
        endRadius: player.r + 54,
        alpha: 0.54,
        fillAlpha: 0.14,
        width: 2.6,
      });
    }
  }
  if (oppShield && !multiplayerArenaBridgeState.lastOppShieldActive) {
    playMultiplayerAbilitySound('shield', 'activate');
    const source = getMappedPlayerPositionByNumber(snapshot, oppNumber);
    if (source) {
      const shieldStyle = getAbilityFeedbackPalette('shield', 'cast');
      pushCombatImpactWave(source.x, source.y, {
        color: shieldStyle.color,
        duration: 0.2,
        startRadius: dummy.r + 10,
        endRadius: dummy.r + 54,
        alpha: 0.54,
        fillAlpha: 0.14,
        width: 2.6,
      });
    }
  }
  if (myPrism && !multiplayerArenaBridgeState.lastMyPrismActive) {
    playMultiplayerAbilitySound('prism', 'activate');
    const source = getMappedPlayerPositionByNumber(snapshot, myNumber);
    const dir = normalizeRuntimeAim(snapshot?.myActiveEffects?.prismDirection, snapshot?.myAimDirection?.x || 1, snapshot?.myAimDirection?.y || 0);
    if (source) {
      pushDirectionalWave(source.x, source.y, dir.x, dir.y, {
        color: '130,236,212',
        duration: 0.2,
        travel: 92,
        spread: 20,
        alpha: 0.48,
        width: 2.2,
      });
      spawnBurst(source.x, source.y, 'rgba(120,236,206,0.86)', 12, 102);
    }
  }
  if (oppPrism && !multiplayerArenaBridgeState.lastOppPrismActive) {
    playMultiplayerAbilitySound('prism', 'activate');
    const source = getMappedPlayerPositionByNumber(snapshot, oppNumber);
    const dir = normalizeRuntimeAim(snapshot?.opponentActiveEffects?.prismDirection, snapshot?.opponentAimDirection?.x || -1, snapshot?.opponentAimDirection?.y || 0);
    if (source) {
      pushDirectionalWave(source.x, source.y, dir.x, dir.y, {
        color: '130,236,212',
        duration: 0.2,
        travel: 92,
        spread: 20,
        alpha: 0.48,
        width: 2.2,
      });
      spawnBurst(source.x, source.y, 'rgba(120,236,206,0.86)', 12, 102);
    }
  }
  const myPhantomActive = !!snapshot?.myActiveEffects?.phantomUntargetableActive;
  const oppPhantomActive = !!snapshot?.opponentActiveEffects?.phantomUntargetableActive;
  if (myPhantomActive && !multiplayerArenaBridgeState.lastMyPhantomActive) {
    const source = getMappedPlayerPositionByNumber(snapshot, myNumber);
    if (source) {
      spawnBurst(source.x, source.y, 'rgba(206,182,255,0.78)', 12, 98);
      pushCombatImpactWave(source.x, source.y, {
        color: '204,180,255',
        duration: 0.18,
        startRadius: 12,
        endRadius: 58,
        alpha: 0.48,
        fillAlpha: 0.1,
        width: 2.2,
      });
    }
  }
  if (oppPhantomActive && !multiplayerArenaBridgeState.lastOppPhantomActive) {
    const source = getMappedPlayerPositionByNumber(snapshot, oppNumber);
    if (source) {
      spawnBurst(source.x, source.y, 'rgba(206,182,255,0.78)', 12, 98);
      pushCombatImpactWave(source.x, source.y, {
        color: '204,180,255',
        duration: 0.18,
        startRadius: 12,
        endRadius: 58,
        alpha: 0.48,
        fillAlpha: 0.1,
        width: 2.2,
      });
    }
  }
  multiplayerArenaBridgeState.lastMyChargeActive = myCharge;
  multiplayerArenaBridgeState.lastOppChargeActive = oppCharge;
  multiplayerArenaBridgeState.lastMyShieldActive = myShield;
  multiplayerArenaBridgeState.lastOppShieldActive = oppShield;
  multiplayerArenaBridgeState.lastMyPrismActive = myPrism;
  multiplayerArenaBridgeState.lastOppPrismActive = oppPrism;
  multiplayerArenaBridgeState.lastMyPhantomActive = myPhantomActive;
  multiplayerArenaBridgeState.lastOppPhantomActive = oppPhantomActive;

  const scale = getMultiplayerArenaScale(snapshot);
  const jumpThreshold = Math.max(16, MP_TELEPORT_CAST_DISTANCE_UNITS * scale);
  const maxBlinkJump = Math.max(jumpThreshold + 12, jumpThreshold * 1.9);
  const nowMs = Date.now();
  const myBlinkReadyAt = Math.max(0, Number(snapshot?.myBlinkReadyAt) || 0);
  const oppBlinkReadyAt = Math.max(0, Number(snapshot?.opponentBlinkReadyAt) || 0);
  const myBlinkDataAvailable =
    myBlinkReadyAt > 0
    || multiplayerArenaBridgeState.lastMyBlinkReadyAt > 0;
  const oppBlinkDataAvailable =
    oppBlinkReadyAt > 0
    || multiplayerArenaBridgeState.lastOppBlinkReadyAt > 0;
  const myBlinkCooldownStarted =
    myBlinkReadyAt > 0
    && myBlinkReadyAt !== multiplayerArenaBridgeState.lastMyBlinkReadyAt
    && myBlinkReadyAt > nowMs;
  const oppBlinkCooldownStarted =
    oppBlinkReadyAt > 0
    && oppBlinkReadyAt !== multiplayerArenaBridgeState.lastOppBlinkReadyAt
    && oppBlinkReadyAt > nowMs;
  const myMapped = mapMultiplayerArenaPointToCanvas(snapshot, snapshot?.myPosition);
  const oppMapped = mapMultiplayerArenaPointToCanvas(snapshot, snapshot?.opponentPosition);
  if (multiplayerArenaBridgeState.lastMyMappedPos && myMapped) {
    const jump = distance(
      multiplayerArenaBridgeState.lastMyMappedPos.x,
      multiplayerArenaBridgeState.lastMyMappedPos.y,
      myMapped.x,
      myMapped.y
    );
    const myBlinkStartDetected =
      myBlinkCooldownStarted
      && jump > MP_LOCAL_POSITION_RECONCILE_DEADZONE
      && !myCharge
      && !multiplayerArenaBridgeState.lastMyChargeActive;
    const myBlinkJumpFallbackDetected =
      jump > jumpThreshold
      && jump <= maxBlinkJump
      && !myCharge
      && !multiplayerArenaBridgeState.lastMyChargeActive
      && !myBlinkDataAvailable;
    if (
      myBlinkStartDetected
      || myBlinkJumpFallbackDetected
    ) {
      triggerArenaCastForPlayer(snapshot, myNumber, 'blink');
      spawnBlinkTeleportImageFx(
        multiplayerArenaBridgeState.lastMyMappedPos.x,
        multiplayerArenaBridgeState.lastMyMappedPos.y,
        myMapped.x,
        myMapped.y,
        {
          actorRadius: Number(player?.r) || 18,
        }
      );
    }
  }
  if (multiplayerArenaBridgeState.lastOppMappedPos && oppMapped) {
    const jump = distance(
      multiplayerArenaBridgeState.lastOppMappedPos.x,
      multiplayerArenaBridgeState.lastOppMappedPos.y,
      oppMapped.x,
      oppMapped.y
    );
    const oppBlinkStartDetected =
      oppBlinkCooldownStarted
      && jump > MP_LOCAL_POSITION_RECONCILE_DEADZONE
      && !oppCharge
      && !multiplayerArenaBridgeState.lastOppChargeActive;
    const oppBlinkJumpFallbackDetected =
      jump > jumpThreshold
      && jump <= maxBlinkJump
      && !oppCharge
      && !multiplayerArenaBridgeState.lastOppChargeActive
      && !oppBlinkDataAvailable;
    if (
      oppBlinkStartDetected
      || oppBlinkJumpFallbackDetected
    ) {
      triggerArenaCastForPlayer(snapshot, oppNumber, 'blink');
      spawnBlinkTeleportImageFx(
        multiplayerArenaBridgeState.lastOppMappedPos.x,
        multiplayerArenaBridgeState.lastOppMappedPos.y,
        oppMapped.x,
        oppMapped.y,
        {
          actorRadius: Number(dummy?.r) || 18,
        }
      );
    }
  }
  multiplayerArenaBridgeState.lastMyBlinkReadyAt = myBlinkReadyAt;
  multiplayerArenaBridgeState.lastOppBlinkReadyAt = oppBlinkReadyAt;
  multiplayerArenaBridgeState.lastMyMappedPos = myMapped;
  multiplayerArenaBridgeState.lastOppMappedPos = oppMapped;
}

function syncMultiplayerArenaEmbodiment(dt = 0) {
  const snapshot = getMultiplayerArenaRuntimeSnapshot();
  if (!isMultiplayerArenaRuntimeActive(snapshot)) {
    if (multiplayerArenaBridgeState.active) {
      multiplayerArenaBridgeState.active = false;
      resetMultiplayerArenaBridgeTransientState();
      if (typeof clearArenaFloatingStones === 'function') {
        clearArenaFloatingStones();
      }
    }
    return false;
  }

  multiplayerArenaBridgeState.active = true;
  const currentMatchId = String(snapshot?.matchId || '').trim();
  const isNewMultiplayerMatch =
    !!currentMatchId &&
    multiplayerArenaBridgeState.lastMatchId !== currentMatchId;
  if (
    isNewMultiplayerMatch &&
    multiplayerArenaBridgeState.lastMatchId
  ) {
    resetMultiplayerArenaBridgeTransientState({ preserveMatchIdentity: true });
  }
  if (isNewMultiplayerMatch && typeof resetArenaFloatingStonesForMatchStart === 'function') {
    resetArenaFloatingStonesForMatchStart({
      mode: 'multiplayer',
      matchId: currentMatchId,
      deterministic: true,
    });
  }
  if (currentMatchId) {
    multiplayerArenaBridgeState.lastMatchId = currentMatchId;
  }

  const roundPhase = String(snapshot?.matchPhase || '').trim().toLowerCase();
  if (
    roundPhase &&
    multiplayerArenaBridgeState.lastRoundPhase &&
    roundPhase !== multiplayerArenaBridgeState.lastRoundPhase &&
    (roundPhase === 'combat_countdown' || roundPhase === 'draft')
  ) {
    resetMultiplayerArenaBridgeTransientState({ preserveMatchIdentity: true });
  }
  multiplayerArenaBridgeState.lastRoundPhase = roundPhase;

  arena.radius = Math.max(1, Number(arena.baseRadius) || Number(arena.radius) || 1);
  arena.shrinkTimer = arena.shrinkInterval;

  syncMultiplayerArenaActors(snapshot, dt);
  syncMultiplayerArenaFeedback(snapshot);
  syncMultiplayerArenaCollections(snapshot);
  return true;
}

function update(dt) {
  ensureAdaptiveCanvasRenderScale();
  syncGameFrameContextForUpdate();
  if (window.outraPhaseAssets && typeof window.outraPhaseAssets.tick === 'function') {
    window.outraPhaseAssets.tick();
  }
  updateMusic(dt);
  const multiplayerPresentationSnapshot = getMultiplayerPresentationSnapshot();
  const multiplayerDraftSnapshot = multiplayerPresentationSnapshot && multiplayerPresentationSnapshot.isDraftActive
    ? multiplayerPresentationSnapshot
    : null;
  if (!menuOpen && multiplayerPresentationSnapshot) {
    if (multiplayerPresentationSnapshot.isArenaActive) {
      setCanvasCursorMode('crosshair');
    } else if (multiplayerPresentationSnapshot.isDraftActive) {
      setCanvasCursorMode('pointer');
    }
    syncCursorPhaseClass();
  }

  if (multiplayerPresentationSnapshot && multiplayerPresentationSnapshot.isArenaPending) {
    stopDraftSpellHoverSound();
    updateTransientCombatVisuals(dt);
    updateCombatFeedback(dt);
    updateHud();
    return;
  }

  if (gameState !== 'draft' && !multiplayerDraftSnapshot) {
    stopDraftSpellHoverSound();
  }

  if (syncMultiplayerArenaEmbodiment(dt)) {
    updateTransientCombatVisuals(dt);
    updateCombatFeedback(dt);
    updateHud();
    return;
  }

  if (gameState === 'draft' || multiplayerDraftSnapshot) {
    if (!menuOpen || draftState.complete) {
      updateDraftPhase(dt);
    } else {
      stopDraftSpellHoverSound();
    }
    updateTransientCombatVisuals(dt);
    updateCombatFeedback(dt);
    updateHud();
    return;
  }

  if (gameState === 'lobby' || menuOpen) {
    updateTransientCombatVisuals(dt);
    updateCombatFeedback(dt);
    updateHud();
    return;
  }

  if (gameState === 'result') {
    resultTimer -= dt;
    if (resultTimer <= 0) enterLobby();
  }

  updateArenaIntroCountdown(dt);
  const arenaPreFightLocked = isArenaPreFightLocked();

  if (!arenaPreFightLocked) {
    updateArenaShrink(dt);
    updatePotions(dt);
  }

  const keyMoveX = (keys[keybinds.right] ? 1 : 0) - (keys[keybinds.left] ? 1 : 0);
  const keyMoveY = (keys[keybinds.down]  ? 1 : 0) - (keys[keybinds.up]   ? 1 : 0);
  const moveX    = moveStick.active ? moveStick.dx : keyMoveX;
  const moveY    = moveStick.active ? moveStick.dy : keyMoveY;

  if (!isTouchDevice) {
    const aim    = normalized(mouse.x - player.x, mouse.y - player.y);
    player.aimX  = aim.x;
    player.aimY  = aim.y;
  }

  if (gameState === 'playing' || gameState === 'result') {
    updateLocalRiftRuntime();
    updateLocalPhantomRuntime();
  }

  if ((gameState === 'playing' || gameState === 'result') && player.alive) {
    const phantomVanishActive = isPlayerLocallyPhantomUntargetable();
    if (gameState === 'playing' && arenaPreFightLocked) {
      player.vx = 0;
      player.vy = 0;
    } else if (phantomVanishActive) {
      player.vx = 0;
      player.vy = 0;
    } else if (player.chargeActive) {
      updateArcaneCharge(dt);
    } else {
      if ((moveX || moveY) && gameState === 'playing') moveActorWithSlide(player, moveX, moveY, dt);
      updateActorPhysics(player, dt);
    }
    if (!phantomVanishActive) {
      recordRewindHistory();
    }
  }

  if (dummyEnabled && (gameState === 'playing' || gameState === 'result') && dummy.alive) {
    if (gameState === 'playing' && arenaPreFightLocked) {
      dummy.vx = 0;
      dummy.vy = 0;
    } else {
      moveDummyAI(dt);
      updateActorPhysics(dummy, dt);
    }
  }

  const dummyInBounds = insidePlatform(dummy.x, dummy.y);
  if (dummyEnabled && dummy.alive && !dummyInBounds) {
    damageDummy(10 * dt * 4);
    lavaSoundTimer -= dt;
    if (lavaSoundTimer <= 0) { soundLava(); lavaSoundTimer = 0.26; }
  }
  if (dummyEnabled && dummy.alive && !insidePlatform(dummy.x, dummy.y, -120)) {
    killDummy('fell fully into lava');
  }

  const playerInBounds = insidePlatform(player.x, player.y);
  if (player.alive && !playerInBounds && !isPlayerLocallyPhantomUntargetable()) {
    lavaTick -= dt;
    if (lavaTick <= 0) { damagePlayer(8); soundLava(); lavaTick = 0.28; }
  } else {
    lavaTick = 0;
  }
  if (player.alive && !insidePlatform(player.x, player.y, -120) && !isPlayerLocallyPhantomUntargetable()) {
    killPlayer('fell fully into lava');
  }

  const floatingStoneHitCircles = getSharedFloatingStoneHitCircles();

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const previousX = Number(p.x) || 0;
    const previousY = Number(p.y) || 0;
    const projectileAbilityId = String(p.abilityId || '').trim().toLowerCase();
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    const projectileTrailCount = isPerformanceModeEnabled() ? 1 : 2;
    const isSolarProjectile = projectileAbilityId === 'solar';
    for (let n = 0; n < projectileTrailCount; n++) {
      addParticle({
        x: p.x, y: p.y,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0.18,
        size: 2 + Math.random() * 2,
        color: isSolarProjectile
          ? 'rgba(255,214,132,0.88)'
          : (p.owner === 'player' ? 'rgba(255,140,40,0.9)' : 'rgba(130,220,255,0.9)')
      });
    }

    if (projectileAbilityId === 'fireblast' && floatingStoneHitCircles.length) {
      let hitStone = null;
      for (const stone of floatingStoneHitCircles) {
        const hitRadius = Math.max(1, (Number(p.r) || 0) + (Number(stone?.r) || 0));
        if (distance(p.x, p.y, Number(stone?.x) || 0, Number(stone?.y) || 0) > hitRadius) continue;
        hitStone = stone;
        break;
      }

      if (hitStone) {
        spawnBurst(p.x, p.y, 'rgba(255,188,120,0.94)', 12, 110);
        pushCombatImpactWave(p.x, p.y, {
          color: '255,186,122',
          duration: 0.16,
          startRadius: 10,
          endRadius: 42,
          alpha: 0.5,
          fillAlpha: 0.1,
          width: 2.1,
        });
        projectiles.splice(i, 1);
        continue;
      }
    }

    const hitObstacle = circleHitsObstacle(p.x, p.y, p.r);
    if (hitObstacle) {
      if (projectileAbilityId === 'solar') {
        explodeSolarProjectileLocal(p, 'wall');
      } else if (projectileAbilityId === 'fireblast') {
        spawnFireblastObstacleImpact(p, hitObstacle, previousX, previousY);
      } else {
        spawnBurst(p.x, p.y, 'rgba(255,200,120,0.9)', 10, 120);
      }
      projectiles.splice(i, 1);
      continue;
    }

    if (dummyEnabled && p.owner === 'player' && dummy.alive) {
      const prismIntercept = tryHandleLocalPrismProjectileIntercept(p, dummy, { x: previousX, y: previousY });
      if (prismIntercept.intercepted) {
        if (!prismIntercept.reflected) {
          projectiles.splice(i, 1);
        }
        continue;
      }
    }

    if (p.owner === 'dummy' && player.alive && !isPlayerLocallyPhantomUntargetable()) {
      const prismIntercept = tryHandleLocalPrismProjectileIntercept(p, player, { x: previousX, y: previousY });
      if (prismIntercept.intercepted) {
        if (!prismIntercept.reflected) {
          projectiles.splice(i, 1);
        }
        continue;
      }
    }

    if (dummyEnabled && p.owner === 'player' && dummy.alive && distance(p.x, p.y, dummy.x, dummy.y) <= p.r + dummy.r) {
      if (projectileAbilityId === 'solar') {
        explodeSolarProjectileLocal(p, 'impact');
        projectiles.splice(i, 1);
        continue;
      }
      const dir = normalized(dummy.x - player.x, dummy.y - player.y);
      spawnArenaHitFlash(p.x, p.y, 'dummy');
      damageDummy(p.damage);
      dummy.vx += dir.x * p.knockback;
      dummy.vy += dir.y * p.knockback;
      spawnBurst(p.x, p.y, 'rgba(255,170,70,0.95)', 14, 160);
      projectiles.splice(i, 1);
      continue;
    }

    if (p.owner === 'dummy' && player.alive && !isPlayerLocallyPhantomUntargetable() && distance(p.x, p.y, player.x, player.y) <= p.r + player.r) {
      if (projectileAbilityId === 'solar') {
        explodeSolarProjectileLocal(p, 'impact');
        projectiles.splice(i, 1);
        continue;
      }
      const dir = normalized(player.x - dummy.x, player.y - dummy.y);
      spawnArenaHitFlash(p.x, p.y, 'player');
      damagePlayer(p.damage);
      player.vx += dir.x * p.knockback;
      player.vy += dir.y * p.knockback;
      spawnBurst(p.x, p.y, 'rgba(255,170,70,0.95)', 14, 160);
      projectiles.splice(i, 1);
      continue;
    }

    const projectileCullPadding = Math.max(
      240,
      Math.max(1, Number(arena.baseRadius) || Number(arena.radius) || 1) * 0.9
    );
    if (p.life <= 0 || !insidePlatform(p.x, p.y, -projectileCullPadding)) {
      if (projectileAbilityId === 'solar') {
        explodeSolarProjectileLocal(p, 'range_end');
      }
      projectiles.splice(i, 1);
    }
  }

  for (let i = hooks.length - 1; i >= 0; i--) {
    const h = hooks[i];
    const targetActor = h.owner === 'player' ? dummy : player;
    const caster = h.owner === 'player' ? player : dummy;

    if (h.owner === 'player' && h.state === 'pulling' && (!dummyEnabled || !dummy.alive)) {
      hooks.splice(i, 1);
      continue;
    }

    if (h.owner === 'dummy' && (!dummyEnabled || !dummy.alive)) {
      hooks.splice(i, 1);
      continue;
    }

    if (h.state === 'flying') {
      h.progress += dt * h.speed;
      h.x = h.sx + (h.tx - h.sx) * Math.min(1, h.progress);
      h.y = h.sy + (h.ty - h.sy) * Math.min(1, h.progress);
      const hookDir = normalized((h.tx - h.sx), (h.ty - h.sy));

      if (Math.random() < 0.62) {
        addParticle({
          x: h.x - (hookDir.x * (6 + Math.random() * 5)) + ((Math.random() - 0.5) * 3.2),
          y: h.y - (hookDir.y * (6 + Math.random() * 5)) + ((Math.random() - 0.5) * 3.2),
          vx: (-hookDir.x * 36) + ((Math.random() - 0.5) * 24),
          vy: (-hookDir.y * 36) + ((Math.random() - 0.5) * 24),
          life: 0.09 + (Math.random() * 0.06),
          size: 1.5 + (Math.random() * 1.6),
          color: h.owner === 'player'
            ? 'rgba(174,220,255,0.72)'
            : 'rgba(255,196,158,0.72)'
        });
      }

      if (circleHitsObstacle(h.x, h.y, 4)) {
        spawnBurst(
          h.x,
          h.y,
          h.owner === 'player' ? 'rgba(166,212,255,0.9)' : 'rgba(255,188,146,0.9)',
          8,
          96
        );
        pushCombatImpactWave(h.x, h.y, {
          color: h.owner === 'player' ? '166,212,255' : '255,188,146',
          duration: 0.16,
          startRadius: 12,
          endRadius: 42,
          alpha: 0.44,
          fillAlpha: 0.08,
          width: 2,
        });
        hooks.splice(i, 1);
        continue;
      }

      const targetUntargetable = targetActor === player && isPlayerLocallyPhantomUntargetable();
      if (dummyEnabled && targetActor.alive && !targetUntargetable && distance(h.x, h.y, targetActor.x, targetActor.y) <= targetActor.r + 6) {
        h.state = 'pulling';
        if (h.owner === 'player') {
          spawnArenaHitFlash(h.x, h.y, 'dummy');
          damageDummy(h.damage);
        } else {
          spawnArenaHitFlash(h.x, h.y, 'player');
          damagePlayer(h.damage);
        }
        spawnBurst(h.x, h.y, 'rgba(180,220,255,0.9)', 12, 120);
        pushCombatImpactWave(h.x, h.y, {
          color: '176,214,255',
          duration: 0.2,
          startRadius: 14,
          endRadius: 58,
          alpha: 0.52,
          fillAlpha: 0.12,
          width: 2.3,
        });
        pushDirectionalWave(caster.x, caster.y, targetActor.x - caster.x, targetActor.y - caster.y, {
          color: '176,214,255',
          duration: 0.18,
          travel: Math.max(44, distance(caster.x, caster.y, targetActor.x, targetActor.y)),
          spread: 15,
          alpha: 0.48,
          width: 2.1,
        });
        triggerCombatScreenShake(0.14, 0.08);
      } else if (h.progress >= 1) {
        spawnBurst(
          h.x,
          h.y,
          h.owner === 'player' ? 'rgba(166,212,255,0.86)' : 'rgba(255,190,152,0.86)',
          7,
          86
        );
        hooks.splice(i, 1);
        continue;
      }
    } else {
      const dir = normalized(caster.x - targetActor.x, caster.y - targetActor.y);
      const pullSpeed = h.owner === 'player' ? 980 : 930;

      if (Math.random() < 0.38) {
        addParticle({
          x: h.x + ((Math.random() - 0.5) * 5.2),
          y: h.y + ((Math.random() - 0.5) * 5.2),
          vx: (-dir.x * 26) + ((Math.random() - 0.5) * 20),
          vy: (-dir.y * 26) + ((Math.random() - 0.5) * 20),
          life: 0.08 + (Math.random() * 0.07),
          size: 1.6 + (Math.random() * 1.8),
          color: h.owner === 'player'
            ? 'rgba(196,232,255,0.74)'
            : 'rgba(255,214,188,0.72)'
        });
      }

      targetActor.vx = dir.x * pullSpeed;
      targetActor.vy = dir.y * pullSpeed;
      targetActor.x += dir.x * pullSpeed * dt;
      targetActor.y += dir.y * pullSpeed * dt;
      pushActorOutOfObstacle(targetActor);
      h.x = targetActor.x;
      h.y = targetActor.y;

      if (distance(targetActor.x, targetActor.y, caster.x, caster.y) <= caster.r + targetActor.r + 6) {
        targetActor.x = caster.x + dir.x * (caster.r + targetActor.r + 6);
        targetActor.y = caster.y + dir.y * (caster.r + targetActor.r + 6);
        spawnBurst(caster.x, caster.y, 'rgba(188,220,255,0.84)', 8, 100);
        hooks.splice(i, 1);
        continue;
      }

      if (circleHitsObstacle(targetActor.x, targetActor.y, targetActor.r) || !targetActor.alive || !caster.alive) {
        hooks.splice(i, 1);
      }
    }
  }

  for (let i = walls.length - 1; i >= 0; i--) {
    const wall = walls[i];
    wall.life -= dt;

    if (wall.life <= 0) {
      for (const seg of wall.segments) {
        spawnBurst(seg.x, seg.y, 'rgba(140, 190, 255, 0.45)', 3, 55);
      }
      walls.splice(i, 1);
    }
  }

  updateTransientCombatVisuals(dt);

  updateCombatFeedback(dt);
  updateHud();
}
