// ── Phase-Based Asset Loading Manager ─────────────────────────────────────────
(function () {
  const LOG_PREFIX = '[PhaseAssets]';
  const PHASES = {
    STARTUP: 'startup',
    LOBBY: 'lobby',
    FINDING: 'finding_opponent',
    DRAFT: 'draft_room',
    ARENA: 'arena_combat',
    MATCH_END: 'match_end',
  };

  const PACK_IDS = {
    CORE: 'core',
    LOBBY: 'lobby',
    DRAFT: 'draft',
    ARENA: 'arena',
  };

  const imageLoadCache = new Map();
  const packState = {
    [PACK_IDS.CORE]: createPackState(PACK_IDS.CORE),
    [PACK_IDS.LOBBY]: createPackState(PACK_IDS.LOBBY),
    [PACK_IDS.DRAFT]: createPackState(PACK_IDS.DRAFT),
    [PACK_IDS.ARENA]: createPackState(PACK_IDS.ARENA),
  };

  let initialized = false;
  let currentPhase = PHASES.STARTUP;
  let previousPhase = PHASES.STARTUP;
  let loadingOverlay = null;
  let loadingTitleEl = null;
  let loadingDetailEl = null;
  let manualBlockingCount = 0;

  function createPackState(id) {
    return {
      id,
      status: 'idle',
      loaded: false,
      loading: false,
      error: '',
      loadedAt: 0,
      promise: null,
    };
  }

  function normalizePath(path) {
    const raw = String(path || '').trim();
    if (!raw) return '';
    return raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`;
  }

  function preloadImage(path) {
    const normalizedPath = normalizePath(path);
    if (!normalizedPath) return Promise.resolve(false);

    const cached = imageLoadCache.get(normalizedPath);
    if (cached) return cached;

    const promise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = normalizedPath;
    });

    imageLoadCache.set(normalizedPath, promise);
    return promise;
  }

  function preloadImages(paths) {
    const unique = Array.from(new Set((Array.isArray(paths) ? paths : []).map((path) => normalizePath(path)).filter(Boolean)));
    if (!unique.length) return Promise.resolve(true);

    return Promise.allSettled(unique.map((path) => preloadImage(path)))
      .then((results) => results.every((entry) => entry.status === 'fulfilled' && entry.value !== false));
  }

  function updatePackLoading(packId) {
    const pack = packState[packId];
    if (!pack) return;
    pack.status = 'loading';
    pack.loading = true;
    pack.error = '';
  }

  function updatePackReady(packId) {
    const pack = packState[packId];
    if (!pack) return;
    pack.status = 'ready';
    pack.loaded = true;
    pack.loading = false;
    pack.error = '';
    pack.loadedAt = Date.now();
  }

  function updatePackError(packId, error) {
    const pack = packState[packId];
    if (!pack) return;
    pack.status = 'error';
    pack.loaded = false;
    pack.loading = false;
    pack.error = String(error?.message || error || 'unknown_error');
  }

  function getPackState(packId) {
    return packState[packId] || null;
  }

  function isPackReady(packId) {
    return !!getPackState(packId)?.loaded;
  }

  function withNoopFallback(promiseLike) {
    if (promiseLike && typeof promiseLike.then === 'function') return promiseLike;
    return Promise.resolve(true);
  }

  function getAudioApi() {
    return window.outraAudioAssets || null;
  }

  function getThreeApi() {
    return window.outraThree || null;
  }

  function loadCoreAssetsInternal() {
    const spellIcons = Object.values(window.SPELL_ICONS || {});
    const lobbyArt = window.OUTRA_3D_CONFIG?.lobbyArt || {};
    const rankEntries = Array.isArray(window.OUTRA_RANKS?.all) ? window.OUTRA_RANKS.all : [];
    const rankIcons = rankEntries.map((entry) => entry?.badge);
    const imageTargets = [
      ...spellIcons,
      lobbyArt.currency,
      lobbyArt.button,
      lobbyArt.ranks,
      '/docs/art/mouse.png',
      ...rankIcons,
    ];

    const audioApi = getAudioApi();
    const tasks = [
      preloadImages(imageTargets),
      audioApi?.preloadSoundFxPack ? audioApi.preloadSoundFxPack('core') : Promise.resolve(true),
    ];
    return Promise.allSettled(tasks)
      .then((results) => results.every((entry) => entry.status === 'fulfilled' && entry.value !== false));
  }

  function loadLobbyAssetsInternal() {
    const threeApi = getThreeApi();
    const audioApi = getAudioApi();
    const lobbyArt = window.OUTRA_3D_CONFIG?.lobbyArt || {};
    const tasks = [
      threeApi?.loadLobbyAssets ? withNoopFallback(threeApi.loadLobbyAssets()) : Promise.resolve(true),
      preloadImages([lobbyArt.bg, lobbyArt.button, lobbyArt.currency, lobbyArt.emberOrange, lobbyArt.emberPurple, lobbyArt.ranks]),
      audioApi?.preloadLobbyMusicAsset ? audioApi.preloadLobbyMusicAsset() : Promise.resolve(true),
      audioApi?.preloadSoundFxPack ? audioApi.preloadSoundFxPack('lobby') : Promise.resolve(true),
    ];
    return Promise.allSettled(tasks)
      .then((results) => results.every((entry) => entry.status === 'fulfilled' && entry.value !== false));
  }

  function loadDraftAssetsInternal() {
    const threeApi = getThreeApi();
    const audioApi = getAudioApi();
    const draftBg = window.OUTRA_3D_CONFIG?.draftRoom?.backgroundImage || '/docs/art/draft/bg.png';
    const tasks = [
      threeApi?.loadDraftAssets ? withNoopFallback(threeApi.loadDraftAssets()) : Promise.resolve(true),
      preloadImages([draftBg]),
      audioApi?.preloadSoundFxPack ? audioApi.preloadSoundFxPack('draft') : Promise.resolve(true),
    ];
    return Promise.allSettled(tasks)
      .then((results) => results.every((entry) => entry.status === 'fulfilled' && entry.value !== false));
  }

  function loadArenaAssetsInternal() {
    const threeApi = getThreeApi();
    const audioApi = getAudioApi();
    const tasks = [
      threeApi?.loadArenaAssets ? withNoopFallback(threeApi.loadArenaAssets()) : Promise.resolve(true),
      audioApi?.preloadSoundFxPack ? audioApi.preloadSoundFxPack('arena') : Promise.resolve(true),
    ];
    return Promise.allSettled(tasks)
      .then((results) => results.every((entry) => entry.status === 'fulfilled' && entry.value !== false));
  }

  function ensurePackLoaded(packId, reason = '') {
    const pack = getPackState(packId);
    if (!pack) return Promise.resolve(false);
    if (pack.loaded) return Promise.resolve(true);
    if (pack.promise) return pack.promise;

    const loader = packId === PACK_IDS.CORE
      ? loadCoreAssetsInternal
      : packId === PACK_IDS.LOBBY
      ? loadLobbyAssetsInternal
      : packId === PACK_IDS.DRAFT
      ? loadDraftAssetsInternal
      : loadArenaAssetsInternal;

    updatePackLoading(packId);
    pack.promise = Promise.resolve()
      .then(() => loader())
      .then((ok) => {
        if (ok) {
          updatePackReady(packId);
          console.info(`${LOG_PREFIX} ${packId} pack ready${reason ? ` (${reason})` : ''}`);
          return true;
        }
        updatePackError(packId, `${packId}_pack_incomplete`);
        return false;
      })
      .catch((error) => {
        updatePackError(packId, error);
        console.warn(`${LOG_PREFIX} ${packId} pack failed`, error);
        return false;
      })
      .finally(() => {
        pack.promise = null;
      });

    return pack.promise;
  }

  function unloadLobbyAssets(options = {}) {
    const threeApi = getThreeApi();
    if (threeApi?.unloadLobbyAssets) threeApi.unloadLobbyAssets(options);
    return true;
  }

  function unloadDraftAssets(options = {}) {
    const threeApi = getThreeApi();
    const audioApi = getAudioApi();
    if (threeApi?.unloadDraftAssets) threeApi.unloadDraftAssets(options);
    if (audioApi?.unloadSoundFxPack) audioApi.unloadSoundFxPack('draft', { releaseBuffers: !!options.releaseBuffers });
    return true;
  }

  function unloadArenaAssets(options = {}) {
    const threeApi = getThreeApi();
    if (threeApi?.unloadArenaAssets) threeApi.unloadArenaAssets(options);
    return true;
  }

  function ensureLoadingOverlay() {
    if (loadingOverlay && document.body?.contains(loadingOverlay)) return loadingOverlay;
    if (!document.body) return null;

    const styleId = 'phaseAssetLoadingStyle';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .phaseAssetLoadingOverlay {
          position: fixed;
          inset: 0;
          display: none;
          align-items: flex-start;
          justify-content: center;
          pointer-events: none;
          z-index: 2400;
          padding-top: 88px;
        }
        .phaseAssetLoadingOverlay.show {
          display: flex;
        }
        .phaseAssetLoadingCard {
          min-width: 280px;
          max-width: min(86vw, 560px);
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.16);
          background: linear-gradient(180deg, rgba(22, 30, 44, 0.92) 0%, rgba(10, 16, 26, 0.94) 100%);
          box-shadow: 0 12px 38px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(10px);
          color: #eef6ff;
          text-align: center;
          padding: 12px 16px;
        }
        .phaseAssetLoadingTitle {
          font: 800 17px/1.2 "Segoe UI", Arial, sans-serif;
          letter-spacing: 0.04em;
          color: #f7fbff;
          text-transform: uppercase;
        }
        .phaseAssetLoadingDetail {
          margin-top: 6px;
          font: 500 13px/1.3 "Segoe UI", Arial, sans-serif;
          color: rgba(230, 241, 255, 0.92);
        }
      `;
      document.head.appendChild(style);
    }

    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'phaseAssetLoadingOverlay';
    loadingOverlay.innerHTML = `
      <div class="phaseAssetLoadingCard" role="status" aria-live="polite">
        <div class="phaseAssetLoadingTitle" data-phase-loading-title>Loading</div>
        <div class="phaseAssetLoadingDetail" data-phase-loading-detail>Preparing assets...</div>
      </div>
    `;
    loadingTitleEl = loadingOverlay.querySelector('[data-phase-loading-title]');
    loadingDetailEl = loadingOverlay.querySelector('[data-phase-loading-detail]');
    document.body.appendChild(loadingOverlay);
    return loadingOverlay;
  }

  function showLoadingOverlay(title, detail) {
    const overlay = ensureLoadingOverlay();
    if (!overlay) return;
    if (loadingTitleEl) loadingTitleEl.textContent = String(title || 'Loading');
    if (loadingDetailEl) loadingDetailEl.textContent = String(detail || 'Preparing assets...');
    overlay.classList.add('show');
  }

  function hideLoadingOverlay() {
    if (!loadingOverlay) return;
    loadingOverlay.classList.remove('show');
  }

  function withBlockingLoading(title, detail, promise) {
    manualBlockingCount += 1;
    showLoadingOverlay(title, detail);
    return Promise.resolve(promise).finally(() => {
      manualBlockingCount = Math.max(0, manualBlockingCount - 1);
      if (!manualBlockingCount) {
        syncLoadingOverlayToPhase();
      }
    });
  }

  function resolveCurrentPhase() {
    const multiplayerApi = window.outraMultiplayer;
    const presentation = multiplayerApi && typeof multiplayerApi.getPresentationSnapshot === 'function'
      ? multiplayerApi.getPresentationSnapshot()
      : null;
    if (presentation?.active) {
      if (presentation.isArenaActive) {
        return presentation.isMatchEnd ? PHASES.MATCH_END : PHASES.ARENA;
      }
      if (presentation.isDraftActive) {
        return PHASES.DRAFT;
      }
    }

    const quickMatch = multiplayerApi && typeof multiplayerApi.getQuickMatchState === 'function'
      ? multiplayerApi.getQuickMatchState()
      : null;
    const quickMatchStatus = String(quickMatch?.status || '').trim().toLowerCase();
    if (
      quickMatchStatus === 'searching' ||
      quickMatchStatus === 'queued' ||
      quickMatchStatus === 'queueing' ||
      quickMatchStatus === 'matched'
    ) {
      return PHASES.FINDING;
    }

    const localState = String(typeof gameState !== 'undefined' ? gameState : '').trim().toLowerCase();
    if (localState === 'draft') return PHASES.DRAFT;
    if (localState === 'playing') return PHASES.ARENA;
    if (localState === 'result') return PHASES.MATCH_END;
    if (localState === 'lobby') return PHASES.LOBBY;
    return PHASES.STARTUP;
  }

  function onPhaseChanged(nextPhase, prevPhase) {
    if (nextPhase === prevPhase) return;
    console.info(`${LOG_PREFIX} phase ${prevPhase} -> ${nextPhase}`);

    if (nextPhase === PHASES.DRAFT) {
      unloadLobbyAssets({ releaseBuffers: false });
    } else if (nextPhase === PHASES.ARENA || nextPhase === PHASES.MATCH_END) {
      unloadDraftAssets({ releaseBuffers: false });
    }
  }

  function syncLoadingOverlayToPhase() {
    if (manualBlockingCount > 0) return;

    if (currentPhase === PHASES.DRAFT && !isPackReady(PACK_IDS.DRAFT)) {
      showLoadingOverlay('Loading Draft Room', 'Preparing draft assets...');
      return;
    }
    if ((currentPhase === PHASES.ARENA || currentPhase === PHASES.MATCH_END) && !isPackReady(PACK_IDS.ARENA)) {
      showLoadingOverlay('Loading Arena', 'Preparing combat assets...');
      return;
    }
    if (currentPhase === PHASES.FINDING && !isPackReady(PACK_IDS.DRAFT)) {
      showLoadingOverlay('Preparing Match', 'Loading draft room assets...');
      return;
    }

    hideLoadingOverlay();
  }

  function runPhaseLoads(phase) {
    ensurePackLoaded(PACK_IDS.CORE, `phase:${phase}`);
    ensurePackLoaded(PACK_IDS.LOBBY, `phase:${phase}`);

    if (phase === PHASES.LOBBY || phase === PHASES.STARTUP) {
      ensurePackLoaded(PACK_IDS.DRAFT, 'lobby_preload');
      return;
    }
    if (phase === PHASES.FINDING) {
      ensurePackLoaded(PACK_IDS.DRAFT, 'queue_wait');
      ensurePackLoaded(PACK_IDS.ARENA, 'queue_wait');
      return;
    }
    if (phase === PHASES.DRAFT) {
      ensurePackLoaded(PACK_IDS.DRAFT, 'draft_active');
      ensurePackLoaded(PACK_IDS.ARENA, 'draft_to_arena_preload');
      return;
    }
    if (phase === PHASES.ARENA || phase === PHASES.MATCH_END) {
      ensurePackLoaded(PACK_IDS.ARENA, 'arena_active');
    }
  }

  function tick() {
    if (!initialized) return;
    const phase = resolveCurrentPhase();
    if (phase !== currentPhase) {
      previousPhase = currentPhase;
      currentPhase = phase;
      onPhaseChanged(currentPhase, previousPhase);
    }

    runPhaseLoads(currentPhase);
    syncLoadingOverlayToPhase();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    ensureLoadingOverlay();
    ensurePackLoaded(PACK_IDS.CORE, 'init');
    ensurePackLoaded(PACK_IDS.LOBBY, 'init');
    tick();
  }

  function ensureDraftAssetsReady(options = {}) {
    const title = options.title || 'Loading Draft Room';
    const detail = options.detail || 'Preparing draft assets...';
    const reason = options.reason || 'draft_gate';
    const loadPromise = Promise.allSettled([
      ensurePackLoaded(PACK_IDS.CORE, reason),
      ensurePackLoaded(PACK_IDS.DRAFT, reason),
    ]).then((results) => results.every((entry) => entry.status === 'fulfilled' && entry.value !== false));
    return options.blocking ? withBlockingLoading(title, detail, loadPromise) : loadPromise;
  }

  function ensureArenaAssetsReady(options = {}) {
    const title = options.title || 'Loading Arena';
    const detail = options.detail || 'Preparing combat assets...';
    const reason = options.reason || 'arena_gate';
    const loadPromise = Promise.allSettled([
      ensurePackLoaded(PACK_IDS.CORE, reason),
      ensurePackLoaded(PACK_IDS.ARENA, reason),
    ]).then((results) => results.every((entry) => entry.status === 'fulfilled' && entry.value !== false));
    return options.blocking ? withBlockingLoading(title, detail, loadPromise) : loadPromise;
  }

  function getStateSnapshot() {
    const snapshot = {
      initialized: !!initialized,
      phase: currentPhase,
      previousPhase,
      packs: {},
    };
    Object.keys(packState).forEach((id) => {
      const pack = packState[id];
      snapshot.packs[id] = {
        status: pack.status,
        loaded: !!pack.loaded,
        loading: !!pack.loading,
        error: String(pack.error || ''),
        loadedAt: Number(pack.loadedAt) || 0,
      };
    });
    const threeApi = getThreeApi();
    if (threeApi && typeof threeApi.getAssetPackState === 'function') {
      snapshot.three = threeApi.getAssetPackState();
    }
    const audioApi = getAudioApi();
    if (audioApi && typeof audioApi.getSoundFxPackState === 'function') {
      snapshot.audio = audioApi.getSoundFxPackState();
    }
    return snapshot;
  }

  window.outraPhaseAssets = {
    init,
    tick,
    loadCoreAssets: () => ensurePackLoaded(PACK_IDS.CORE, 'manual_core'),
    loadLobbyAssets: () => ensurePackLoaded(PACK_IDS.LOBBY, 'manual_lobby'),
    loadDraftAssets: () => ensurePackLoaded(PACK_IDS.DRAFT, 'manual_draft'),
    loadArenaAssets: () => ensurePackLoaded(PACK_IDS.ARENA, 'manual_arena'),
    unloadLobbyAssets,
    unloadDraftAssets,
    unloadArenaAssets,
    ensureDraftAssetsReady,
    ensureArenaAssetsReady,
    isDraftAssetsReady: () => isPackReady(PACK_IDS.DRAFT),
    isArenaAssetsReady: () => isPackReady(PACK_IDS.ARENA),
    getStateSnapshot,
    showLoadingState: (title, detail) => showLoadingOverlay(title, detail),
    hideLoadingState: () => hideLoadingOverlay(),
  };
})();
