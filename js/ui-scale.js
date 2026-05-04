(function () {
  const ROOT = document.documentElement;
  const TARGET_WIDTH = 1920;
  const TARGET_HEIGHT = 1080;
  const DEFAULT_MIN_SCALE = 0.78;
  const DEFAULT_MAX_SCALE = 1.18;

  let rafId = 0;
  let debugEl = null;
  let lastState = null;

  function toFinite(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function clamp(value, minValue, maxValue) {
    return Math.min(maxValue, Math.max(minValue, value));
  }

  function formatScale(value) {
    return String(Number(toFinite(value, 1).toFixed(4)));
  }

  function isDevEnvironment() {
    const host = String(window.location && window.location.hostname || '').toLowerCase();
    return host === 'localhost'
      || host === '127.0.0.1'
      || host === '0.0.0.0'
      || host.endsWith('.local');
  }

  function getConfig() {
    const cfg = (window.OUTRA_UI_SCALE_CONFIG && typeof window.OUTRA_UI_SCALE_CONFIG === 'object')
      ? window.OUTRA_UI_SCALE_CONFIG
      : {};

    const disabledByFlag = window.OUTRA_DISABLE_UI_SCALE === true
      || window.OUTRA_UI_SCALE_DISABLED === true
      || cfg.enabled === false;

    return {
      enabled: !disabledByFlag,
      minScale: clamp(toFinite(cfg.minScale, DEFAULT_MIN_SCALE), 0.5, 1.2),
      maxScale: clamp(toFinite(cfg.maxScale, DEFAULT_MAX_SCALE), 0.7, 1.8),
      debug: (cfg.debug === true || window.OUTRA_UI_SCALE_DEBUG === true) && isDevEnvironment(),
    };
  }

  function getViewportCssSize() {
    const vv = window.visualViewport;
    const width = Math.max(
      1,
      toFinite(vv && vv.width, toFinite(window.innerWidth, 1))
    );
    const height = Math.max(
      1,
      toFinite(vv && vv.height, toFinite(window.innerHeight, 1))
    );
    return { width, height };
  }

  function setRootVars(vars) {
    ROOT.style.setProperty('--ui-scale-enabled', vars.enabled ? '1' : '0');
    ROOT.style.setProperty('--ui-scale-base', formatScale(vars.baseScale));
    ROOT.style.setProperty('--ui-scale', formatScale(vars.uiScale));
    ROOT.style.setProperty('--ui-scale-text', formatScale(vars.textScale));
    ROOT.style.setProperty('--ui-scale-topbar', formatScale(vars.topbarScale));
    ROOT.style.setProperty('--ui-scale-lobby', formatScale(vars.lobbyScale));
    ROOT.style.setProperty('--ui-scale-panel', formatScale(vars.panelScale));
    ROOT.style.setProperty('--ui-scale-spell', formatScale(vars.spellScale));
    ROOT.style.setProperty('--ui-scale-draft', formatScale(vars.draftScale));
    ROOT.style.setProperty('--ui-scale-modal', formatScale(vars.modalScale));
    ROOT.style.setProperty('--ui-scale-dpr', formatScale(vars.dpr));
    ROOT.style.setProperty('--ui-scale-vw', formatScale(vars.viewportCssWidth));
    ROOT.style.setProperty('--ui-scale-vh', formatScale(vars.viewportCssHeight));
  }

  function buildFallbackState() {
    return {
      enabled: false,
      baseScale: 1,
      uiScale: 1,
      textScale: 1,
      topbarScale: 1,
      lobbyScale: 1,
      panelScale: 1,
      spellScale: 1,
      draftScale: 1,
      modalScale: 1,
      dpr: 1,
      viewportCssWidth: toFinite(window.innerWidth, 0),
      viewportCssHeight: toFinite(window.innerHeight, 0),
      effectiveWidth: toFinite(window.innerWidth, 0),
      effectiveHeight: toFinite(window.innerHeight, 0),
    };
  }

  function computeState(cfg) {
    if (!cfg.enabled) return buildFallbackState();

    const viewport = getViewportCssSize();
    const dpr = Math.max(0.5, toFinite(window.devicePixelRatio, 1));
    const effectiveWidth = viewport.width * dpr;
    const effectiveHeight = viewport.height * dpr;

    const rawScale = Math.min(
      effectiveWidth / TARGET_WIDTH,
      effectiveHeight / TARGET_HEIGHT
    );
    const minScale = Math.min(cfg.minScale, cfg.maxScale);
    const maxScale = Math.max(cfg.minScale, cfg.maxScale);
    const uiScale = clamp(rawScale, minScale, maxScale);

    return {
      enabled: true,
      baseScale: rawScale,
      uiScale,
      textScale: clamp(uiScale, 0.9, 1.12),
      topbarScale: clamp(uiScale, 0.88, 1.12),
      lobbyScale: clamp(uiScale, 0.84, 1.16),
      panelScale: clamp(uiScale, 0.84, 1.14),
      spellScale: clamp(uiScale, 0.88, 1.12),
      draftScale: clamp(uiScale, 0.84, 1.12),
      modalScale: clamp(uiScale, 0.9, 1.14),
      dpr,
      viewportCssWidth: viewport.width,
      viewportCssHeight: viewport.height,
      effectiveWidth,
      effectiveHeight,
    };
  }

  function removeDebugReadout() {
    if (!debugEl) return;
    debugEl.remove();
    debugEl = null;
  }

  function ensureDebugReadout() {
    if (debugEl) return debugEl;
    const el = document.createElement('div');
    el.id = 'uiScaleDebug';
    el.style.position = 'fixed';
    el.style.left = '10px';
    el.style.bottom = '10px';
    el.style.zIndex = '120';
    el.style.padding = '6px 8px';
    el.style.borderRadius = '8px';
    el.style.background = 'rgba(8, 12, 20, 0.78)';
    el.style.border = '1px solid rgba(170, 200, 255, 0.32)';
    el.style.color = '#d8e7ff';
    el.style.font = '12px/1.25 monospace';
    el.style.letterSpacing = '0.01em';
    el.style.pointerEvents = 'none';
    el.style.whiteSpace = 'pre-line';
    document.body.appendChild(el);
    debugEl = el;
    return el;
  }

  function renderDebugReadout(cfg, state) {
    if (!cfg.debug) {
      removeDebugReadout();
      return;
    }
    const el = ensureDebugReadout();
    el.textContent =
      `UI scale ${state.uiScale.toFixed(3)} (raw ${state.baseScale.toFixed(3)})\n`
      + `dpr ${state.dpr.toFixed(2)} | css ${Math.round(state.viewportCssWidth)}x${Math.round(state.viewportCssHeight)}\n`
      + `eff ${Math.round(state.effectiveWidth)}x${Math.round(state.effectiveHeight)}`;
  }

  function applyNow() {
    try {
      const cfg = getConfig();
      const nextState = computeState(cfg);
      setRootVars(nextState);
      renderDebugReadout(cfg, nextState);
      lastState = nextState;
    } catch (_error) {
      const fallback = buildFallbackState();
      setRootVars(fallback);
      removeDebugReadout();
      lastState = fallback;
    }
  }

  function scheduleApply() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      applyNow();
    });
  }

  function bindListeners() {
    window.addEventListener('resize', scheduleApply, { passive: true });
    window.addEventListener('orientationchange', scheduleApply, { passive: true });
    window.addEventListener('pageshow', scheduleApply, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) scheduleApply();
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', scheduleApply, { passive: true });
      window.visualViewport.addEventListener('scroll', scheduleApply, { passive: true });
    }
  }

  bindListeners();
  applyNow();

  window.outraUiScale = {
    recompute: scheduleApply,
    getState() {
      return Object.assign({}, lastState || buildFallbackState());
    },
    setEnabled(enabled) {
      const cfg = (window.OUTRA_UI_SCALE_CONFIG && typeof window.OUTRA_UI_SCALE_CONFIG === 'object')
        ? window.OUTRA_UI_SCALE_CONFIG
        : {};
      window.OUTRA_UI_SCALE_CONFIG = Object.assign({}, cfg, { enabled: !!enabled });
      scheduleApply();
    },
  };
})();

