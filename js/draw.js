// ── Cosmetics ─────────────────────────────────────────────────
function drawCosmetics(drawCtx, x, y, scale = 1) {
  if (profile.equipped.boots) {
    drawCtx.fillStyle = '#6a472d';
    drawCtx.fillRect(x - 22 * scale, y + 20 * scale, 14 * scale, 18 * scale);
    drawCtx.fillRect(x +  8 * scale, y + 20 * scale, 14 * scale, 18 * scale);
  }
  if (profile.equipped.sweater) {
    drawCtx.fillStyle = '#7b274c';
    if (typeof drawCtx.roundRect === 'function') {
      drawCtx.beginPath();
      drawCtx.roundRect(x - 28 * scale, y - 8 * scale, 56 * scale, 42 * scale, 12 * scale);
      drawCtx.fill();
    } else {
      drawCtx.fillRect(x - 28 * scale, y - 8 * scale, 56 * scale, 42 * scale);
    }
  }
  const hat = profile.equipped.hat;
  if (hat === 'wizardHat') {
    drawCtx.fillStyle = '#3f2a7d';
    drawCtx.beginPath();
    drawCtx.moveTo(x - 24 * scale, y - 18 * scale);
    drawCtx.lineTo(x,              y - 72 * scale);
    drawCtx.lineTo(x + 24 * scale, y - 18 * scale);
    drawCtx.closePath();
    drawCtx.fill();
    drawCtx.fillRect(x - 28 * scale, y - 20 * scale, 56 * scale, 8 * scale);
  } else if (hat === 'beanie') {
    drawCtx.fillStyle = '#2f7b5b';
    drawCtx.beginPath();
    drawCtx.arc(x, y - 24 * scale, 24 * scale, Math.PI, 0);
    drawCtx.fill();
    drawCtx.fillRect(x - 24 * scale, y - 24 * scale, 48 * scale, 10 * scale);
  } else if (hat === 'crown') {
    drawCtx.fillStyle = '#d8b11e';
    drawCtx.beginPath();
    drawCtx.moveTo(x - 24 * scale, y - 18 * scale);
    drawCtx.lineTo(x - 16 * scale, y - 36 * scale);
    drawCtx.lineTo(x -  4 * scale, y - 18 * scale);
    drawCtx.lineTo(x,              y - 40 * scale);
    drawCtx.lineTo(x +  4 * scale, y - 18 * scale);
    drawCtx.lineTo(x + 16 * scale, y - 36 * scale);
    drawCtx.lineTo(x + 24 * scale, y - 18 * scale);
    drawCtx.closePath();
    drawCtx.fill();
  } else if (hat === 'strawHat') {
    drawCtx.fillStyle = '#cba25f';
    drawCtx.beginPath();
    drawCtx.ellipse(x, y - 26 * scale, 34 * scale, 8 * scale, 0, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.fillRect(x - 18 * scale, y - 46 * scale, 36 * scale, 20 * scale);
  }
}

const NYRA_LOBBY_ANIM_KEY = 'nyra_lobby_loop';
const NYRA_LOBBY_FRAME_RATE = 30;
const NYRA_LOBBY_FRAME_WIDTH = 512;
const NYRA_LOBBY_FRAME_HEIGHT = 512;
const NYRA_LOBBY_DRAW_SCALE = 0.8;
const NYRA_LOBBY_MIN_DRAW_SCALE = 0.4;
const NYRA_LOBBY_MAX_WIDTH_FILL = 0.92;
const NYRA_LOBBY_SHEET_SEQUENCE = Object.freeze([
  {
    key: 'nyra_lobby_0_40',
    path: '/docs/art/character/Nyra/Nyra_lobby/nyra_lobby_0_40.png',
    frameStart: 0,
    frameEnd: 40,
    columns: 7,
  },
  {
    key: 'nyra_lobby_41_80',
    path: '/docs/art/character/Nyra/Nyra_lobby/nyra_lobby_41_80.png',
    frameStart: 0,
    frameEnd: 39,
    columns: 7,
  },
  {
    key: 'nyra_lobby_81_120',
    path: '/docs/art/character/Nyra/Nyra_lobby/nyra_lobby_81_120.png',
    frameStart: 0,
    frameEnd: 39,
    columns: 7,
  },
  {
    key: 'nyra_lobby_121_149',
    path: '/docs/art/character/Nyra/Nyra_lobby/nyra_lobby_121_149.png',
    frameStart: 0,
    frameEnd: 28,
    columns: 6,
  },
]);

const LOBBY_PREVIEW_FALLBACK_STATIC_IMAGE_PATHS = Object.freeze([
  '/docs/art/character/Nyra/Nyra_lobby.png',
  '/docs/art/character/Nyra/Nyra.png',
  '/docs/art/character/Warlock_reference.png',
]);

const LOBBY_PREVIEW_FLOAT_AMPLITUDE_PX = 11;
const LOBBY_PREVIEW_FLOAT_SPEED = 0.0017;
const NYRA_LOBBY_CYCLE_PAUSE_MS = 0;
const LOBBY_PREVIEW_CIRCLE_FADE_IN_SPEED = 8.5;
const LOBBY_PREVIEW_CIRCLE_FADE_OUT_SPEED = 6.2;
const LOBBY_PREVIEW_CIRCLE_SIZE_MULTIPLIER = 1.08;
// Compensates the viewport being moved lower in CSS so Nyra stays visually anchored.
const LOBBY_PREVIEW_WINDOW_SHIFT_UP_PX = 185;
const NYRA_LOBBY_HORIZONTAL_OFFSET_PX = -10;
const NYRA_LOBBY_VERTICAL_OFFSET_PX = 85;
const LOBBY_PREVIEW_TOP_SAFE_RATIO = 0.01;
const LOBBY_PREVIEW_BOTTOM_SAFE_RATIO = 0.015;
const LOBBY_PREVIEW_BG_ROAD_ANCHOR_Y_NORMALIZED = 0.92;
const LOBBY_PREVIEW_BG_ROAD_ANCHOR_FALLBACK_Y_RATIO = 0.9;
const LOBBY_PREVIEW_ROAD_SHADOW_BOTTOM_SAFE_RATIO = 0.02;
const LOBBY_PREVIEW_ROAD_SHADOW_X_RATIO = 0.29;
const LOBBY_PREVIEW_ROAD_SHADOW_Y_RATIO = 0.064;
const LOBBY_PREVIEW_ROAD_SHADOW_SCALE_VARIANCE = 0.24;
const LOBBY_PREVIEW_ROAD_SHADOW_BASE_ALPHA = 0.56;
const LOBBY_PREVIEW_ROAD_SHADOW_ALPHA_VARIANCE = 0.2;
const LOBBY_BG_PORTAL_OVERLAY_X_NORMALIZED = 0.44186;
const LOBBY_BG_PORTAL_OVERLAY_Y_NORMALIZED = 0.302083;
const LOBBY_BG_PORTAL_OVERLAY_WIDTH_NORMALIZED = 0.101744;
const LOBBY_BG_PORTAL_OVERLAY_HEIGHT_NORMALIZED = 0.338542;
const LOBBY_PREVIEW_SHOW_NYRA_PNG_OUTLINE = false;
const LOBBY_PREVIEW_SHOW_VIEWPORT_OUTLINE = false;

const lobbyPreviewFallbackImageRuntime = {
  image: null,
  src: '',
  loaded: false,
  failed: false,
  pathIndexTried: -1,
};

const nyraLobbyAnimator = {
  key: NYRA_LOBBY_ANIM_KEY,
  frameDurationMs: 1000 / NYRA_LOBBY_FRAME_RATE,
  frameSequence: [],
  sheetRuntime: NYRA_LOBBY_SHEET_SEQUENCE.map((sheet) => ({
    ...sheet,
    image: null,
    loaded: false,
    failed: false,
  })),
  initialized: false,
  loading: false,
  ready: false,
  failed: false,
  elapsedMs: 0,
  frameIndex: 0,
  lastUpdateMs: 0,
  cyclePauseRemainingMs: 0,
};

let lobbyPreviewAnimationFrame = 0;
let lobbyPreviewFloorCircleActive = false;
let lobbyPreviewFloorCircleBlend = 0;
let lobbyPreviewFloorCircleLastUpdateMs = 0;
let lobbyPortalOverlayPlacementSignature = '';

function buildNyraLobbyFrameSequence() {
  const sequence = [];
  nyraLobbyAnimator.sheetRuntime.forEach((sheet, sheetIndex) => {
    const start = Math.max(0, Math.floor(Number(sheet.frameStart) || 0));
    const end = Math.max(start, Math.floor(Number(sheet.frameEnd) || 0));
    for (let frame = start; frame <= end; frame += 1) {
      sequence.push({
        key: sheet.key,
        sheetIndex,
        frame,
      });
    }
  });
  return sequence;
}

function resetNyraLobbyAnimatorPlayback(nowMs = 0) {
  nyraLobbyAnimator.elapsedMs = 0;
  nyraLobbyAnimator.frameIndex = 0;
  nyraLobbyAnimator.lastUpdateMs = Number.isFinite(nowMs) ? nowMs : 0;
  nyraLobbyAnimator.cyclePauseRemainingMs = 0;
}

function beginNyraLobbySheetLoads() {
  if (nyraLobbyAnimator.initialized) return;
  nyraLobbyAnimator.initialized = true;
  nyraLobbyAnimator.loading = true;
  nyraLobbyAnimator.failed = false;

  nyraLobbyAnimator.frameSequence = buildNyraLobbyFrameSequence();
  if (!nyraLobbyAnimator.frameSequence.length) {
    nyraLobbyAnimator.failed = true;
    nyraLobbyAnimator.loading = false;
    console.error(`[LobbyNyraAnimator] ${NYRA_LOBBY_ANIM_KEY} has no frames; using fallback image.`);
    return;
  }

  let pending = nyraLobbyAnimator.sheetRuntime.length;
  if (!pending) {
    nyraLobbyAnimator.failed = true;
    nyraLobbyAnimator.loading = false;
    console.error(`[LobbyNyraAnimator] No spritesheets configured for ${NYRA_LOBBY_ANIM_KEY}; using fallback image.`);
    return;
  }

  const finalize = () => {
    if (pending > 0) return;
    nyraLobbyAnimator.loading = false;
    const allLoaded = nyraLobbyAnimator.sheetRuntime.every((sheet) => sheet.loaded && sheet.image);
    nyraLobbyAnimator.ready = allLoaded && !nyraLobbyAnimator.failed;
    if (!nyraLobbyAnimator.ready) {
      console.error(`[LobbyNyraAnimator] Failed to initialize ${NYRA_LOBBY_ANIM_KEY}; using fallback image.`);
    } else {
      resetNyraLobbyAnimatorPlayback(performance.now());
    }
    requestLobbyPreviewRedraw();
  };

  nyraLobbyAnimator.sheetRuntime.forEach((sheet) => {
    const img = new Image();
    sheet.image = img;
    sheet.loaded = false;
    sheet.failed = false;
    img.decoding = 'async';
    img.onload = () => {
      if (sheet.image !== img) return;
      sheet.loaded = true;
      sheet.failed = false;
      pending -= 1;
      finalize();
    };
    img.onerror = () => {
      if (sheet.image !== img) return;
      sheet.loaded = false;
      sheet.failed = true;
      nyraLobbyAnimator.failed = true;
      console.error(`[LobbyNyraAnimator] Failed to load spritesheet "${sheet.key}" from ${sheet.path}`);
      pending -= 1;
      finalize();
    };
    img.src = sheet.path;
  });
}

function updateNyraLobbyAnimator(nowMs) {
  if (!nyraLobbyAnimator.ready || !nyraLobbyAnimator.frameSequence.length) return;
  if (!Number.isFinite(nowMs)) return;
  if (!Number.isFinite(nyraLobbyAnimator.lastUpdateMs) || nyraLobbyAnimator.lastUpdateMs <= 0) {
    nyraLobbyAnimator.lastUpdateMs = nowMs;
    return;
  }

  let dtMs = nowMs - nyraLobbyAnimator.lastUpdateMs;
  nyraLobbyAnimator.lastUpdateMs = nowMs;
  if (!Number.isFinite(dtMs) || dtMs <= 0) return;
  dtMs = Math.min(180, dtMs);

  if (nyraLobbyAnimator.cyclePauseRemainingMs > 0) {
    nyraLobbyAnimator.cyclePauseRemainingMs = Math.max(
      0,
      nyraLobbyAnimator.cyclePauseRemainingMs - dtMs
    );
    nyraLobbyAnimator.frameIndex = 0;
    nyraLobbyAnimator.elapsedMs = 0;
    return;
  }

  nyraLobbyAnimator.elapsedMs += dtMs;
  const frameDurationMs = Math.max(1, nyraLobbyAnimator.frameDurationMs);
  if (nyraLobbyAnimator.elapsedMs < frameDurationMs) return;

  const totalFrames = nyraLobbyAnimator.frameSequence.length;
  if (!Number.isFinite(totalFrames) || totalFrames <= 0) return;

  const frameSteps = Math.floor(nyraLobbyAnimator.elapsedMs / frameDurationMs);
  nyraLobbyAnimator.elapsedMs -= frameSteps * frameDurationMs;
  const nextAbsoluteIndex = (Math.floor(nyraLobbyAnimator.frameIndex) || 0) + frameSteps;
  const loopsCompleted = Math.floor(nextAbsoluteIndex / totalFrames);
  nyraLobbyAnimator.frameIndex = nextAbsoluteIndex % totalFrames;

  if (loopsCompleted > 0) {
    nyraLobbyAnimator.frameIndex = 0;
    nyraLobbyAnimator.elapsedMs = 0;
    nyraLobbyAnimator.cyclePauseRemainingMs = NYRA_LOBBY_CYCLE_PAUSE_MS;
  }
}

function getNyraLobbyFrame(nowMs) {
  if (!nyraLobbyAnimator.initialized) beginNyraLobbySheetLoads();
  if (!nyraLobbyAnimator.ready || !nyraLobbyAnimator.frameSequence.length) return null;

  updateNyraLobbyAnimator(nowMs);

  const safeIndex = Math.max(
    0,
    Math.min(nyraLobbyAnimator.frameSequence.length - 1, Math.floor(nyraLobbyAnimator.frameIndex) || 0)
  );
  const frameRef = nyraLobbyAnimator.frameSequence[safeIndex];
  if (!frameRef) return null;
  const sheet = nyraLobbyAnimator.sheetRuntime[frameRef.sheetIndex];
  if (!sheet || !sheet.image || !sheet.loaded) return null;

  const column = frameRef.frame % sheet.columns;
  const row = Math.floor(frameRef.frame / sheet.columns);
  return {
    image: sheet.image,
    sx: column * NYRA_LOBBY_FRAME_WIDTH,
    sy: row * NYRA_LOBBY_FRAME_HEIGHT,
    sw: NYRA_LOBBY_FRAME_WIDTH,
    sh: NYRA_LOBBY_FRAME_HEIGHT,
  };
}

function scheduleLobbyPreviewAnimationFrame() {
  if (lobbyPreviewAnimationFrame) return;
  lobbyPreviewAnimationFrame = requestAnimationFrame(() => {
    lobbyPreviewAnimationFrame = 0;
    if (!isLobbyPreviewRenderActive()) return;
    drawLobbyPreview();
  });
}

function isLobbyPreviewRenderActive() {
  if (typeof gameState !== 'string' || gameState !== 'lobby') return false;
  if (typeof getMultiplayerPresentationSnapshot === 'function') {
    const snapshot = getMultiplayerPresentationSnapshot();
    if (
      snapshot &&
      snapshot.active &&
      (snapshot.isDraftActive || snapshot.isArenaActive || snapshot.isArenaPending || snapshot.isMatchEnd)
    ) {
      return false;
    }
  }
  return true;
}

let lobbyPreviewWakeTimer = 0;

function scheduleLobbyPreviewWakeCheck() {
  if (lobbyPreviewWakeTimer) return;
  if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') return;
  lobbyPreviewWakeTimer = window.setTimeout(() => {
    lobbyPreviewWakeTimer = 0;
    if (typeof gameState !== 'string' || gameState !== 'lobby') return;
    if (typeof drawLobbyPreview !== 'function') return;
    drawLobbyPreview();
  }, 140);
}

function requestLobbyPreviewRedraw() {
  if (typeof drawLobbyPreview !== 'function') return;
  if (!isLobbyPreviewRenderActive()) return;
  drawLobbyPreview();
}

function setLobbyPreviewFloorCircleActive(active) {
  lobbyPreviewFloorCircleActive = !!active;
  requestLobbyPreviewRedraw();
}

window.setLobbyPreviewFloorCircleActive = setLobbyPreviewFloorCircleActive;

function updateLobbyPreviewFloorCircleBlend(nowMs) {
  if (!Number.isFinite(nowMs)) return lobbyPreviewFloorCircleBlend;
  if (!Number.isFinite(lobbyPreviewFloorCircleLastUpdateMs) || lobbyPreviewFloorCircleLastUpdateMs <= 0) {
    lobbyPreviewFloorCircleLastUpdateMs = nowMs;
  }
  const dtSec = Math.max(0, Math.min(0.1, (nowMs - lobbyPreviewFloorCircleLastUpdateMs) / 1000));
  lobbyPreviewFloorCircleLastUpdateMs = nowMs;

  const target = lobbyPreviewFloorCircleActive ? 1 : 0;
  const speed = target > lobbyPreviewFloorCircleBlend
    ? LOBBY_PREVIEW_CIRCLE_FADE_IN_SPEED
    : LOBBY_PREVIEW_CIRCLE_FADE_OUT_SPEED;
  const step = Math.max(0, Math.min(1, dtSec * speed));
  lobbyPreviewFloorCircleBlend += (target - lobbyPreviewFloorCircleBlend) * step;
  if (Math.abs(target - lobbyPreviewFloorCircleBlend) < 0.001) {
    lobbyPreviewFloorCircleBlend = target;
  }
  return lobbyPreviewFloorCircleBlend;
}

function estimateLobbyCircleOuterRadiusY(drawH) {
  const maxPulseMix = 1;
  const maxBlend = 1;
  const pulseFactorY = 1 + ((0.02 + (maxPulseMix * 0.05)) * maxBlend);
  const baseRadiusY = Math.max(14, drawH * 0.028) * LOBBY_PREVIEW_CIRCLE_SIZE_MULTIPLIER;
  return (baseRadiusY * pulseFactorY) + 2;
}

function resolveNyraLobbyResponsiveLayout(canvasW, canvasH, sourceW, sourceH) {
  const safeSourceH = Math.max(1, Number(sourceH) || NYRA_LOBBY_FRAME_HEIGHT);
  const groundBaseY = (canvasH * 0.88) - LOBBY_PREVIEW_WINDOW_SHIFT_UP_PX;
  const topSafeInset = Math.max(6, canvasH * LOBBY_PREVIEW_TOP_SAFE_RATIO);
  const bottomSafeInset = Math.max(8, canvasH * LOBBY_PREVIEW_BOTTOM_SAFE_RATIO);
  const scale = NYRA_LOBBY_DRAW_SCALE;
  const drawH = safeSourceH * scale;
  const circleExtentY = estimateLobbyCircleOuterRadiusY(drawH);
  const shiftMin = topSafeInset - (groundBaseY - LOBBY_PREVIEW_FLOAT_AMPLITUDE_PX - drawH);
  const shiftMax = (canvasH - bottomSafeInset) - (groundBaseY + LOBBY_PREVIEW_FLOAT_AMPLITUDE_PX + circleExtentY);
  return {
    scale,
    // Fallback preference: keep feet/circle visible even on extremely constrained heights.
    baselineShiftDown: shiftMin <= shiftMax
      ? Math.min(shiftMax, Math.max(shiftMin, 0))
      : shiftMax,
  };
}

function beginLobbyPreviewFallbackImageLoad(pathIndex = 0) {
  const previewPaths = LOBBY_PREVIEW_FALLBACK_STATIC_IMAGE_PATHS;
  const safeIndex = Number.isFinite(pathIndex) ? Math.trunc(pathIndex) : 0;
  const path = previewPaths[safeIndex];
  if (!path) {
    lobbyPreviewFallbackImageRuntime.failed = true;
    return;
  }

  const img = new Image();
  lobbyPreviewFallbackImageRuntime.image = img;
  lobbyPreviewFallbackImageRuntime.src = path;
  lobbyPreviewFallbackImageRuntime.loaded = false;
  lobbyPreviewFallbackImageRuntime.failed = false;
  lobbyPreviewFallbackImageRuntime.pathIndexTried = safeIndex;
  img.decoding = 'async';

  img.onload = () => {
    if (lobbyPreviewFallbackImageRuntime.image !== img) return;
    lobbyPreviewFallbackImageRuntime.loaded = true;
    lobbyPreviewFallbackImageRuntime.failed = false;
    requestLobbyPreviewRedraw();
  };

  img.onerror = () => {
    if (lobbyPreviewFallbackImageRuntime.image !== img) return;
    lobbyPreviewFallbackImageRuntime.loaded = false;
    lobbyPreviewFallbackImageRuntime.failed = true;
    const nextIndex = safeIndex + 1;
    if (nextIndex < previewPaths.length) {
      beginLobbyPreviewFallbackImageLoad(nextIndex);
      return;
    }
    requestLobbyPreviewRedraw();
  };

  img.src = path;
}

function getLobbyPreviewFallbackImage() {
  if (
    lobbyPreviewFallbackImageRuntime.loaded &&
    lobbyPreviewFallbackImageRuntime.image
  ) {
    return lobbyPreviewFallbackImageRuntime.image;
  }
  if (!lobbyPreviewFallbackImageRuntime.image && !lobbyPreviewFallbackImageRuntime.failed) {
    beginLobbyPreviewFallbackImageLoad(0);
    return null;
  }
  return null;
}

function shouldUseStaticLobbyPreviewImage() {
  return true;
}

if (shouldUseStaticLobbyPreviewImage()) {
  beginNyraLobbySheetLoads();
  beginLobbyPreviewFallbackImageLoad(0);
}

function syncLobbyPortalOverlayPlacement() {
  if (typeof document === 'undefined') return;

  const bgImage = document.querySelector('#overlay .lobbyBgImage');
  const portalLayers = Array.from(document.querySelectorAll('#overlay .lobbyBgPortalImage'));
  if (!bgImage || !portalLayers.length || typeof bgImage.getBoundingClientRect !== 'function') return;
  if (!bgImage.complete) return;

  const bgRect = bgImage.getBoundingClientRect();
  if (
    !Number.isFinite(bgRect.left) ||
    !Number.isFinite(bgRect.top) ||
    !Number.isFinite(bgRect.width) ||
    !Number.isFinite(bgRect.height) ||
    bgRect.width <= 0 ||
    bgRect.height <= 0
  ) {
    return;
  }

  const naturalW = Math.max(1, Number(bgImage.naturalWidth || bgImage.width) || 1);
  const naturalH = Math.max(1, Number(bgImage.naturalHeight || bgImage.height) || 1);
  const coverScale = Math.max(bgRect.width / naturalW, bgRect.height / naturalH);
  const renderedW = naturalW * coverScale;
  const renderedH = naturalH * coverScale;
  const offsetX = (bgRect.width - renderedW) * 0.5;
  const offsetY = (bgRect.height - renderedH) * 0.5;

  const leftPx = bgRect.left + offsetX + (renderedW * LOBBY_BG_PORTAL_OVERLAY_X_NORMALIZED);
  const topPx = bgRect.top + offsetY + (renderedH * LOBBY_BG_PORTAL_OVERLAY_Y_NORMALIZED);
  const widthPx = renderedW * LOBBY_BG_PORTAL_OVERLAY_WIDTH_NORMALIZED;
  const heightPx = renderedH * LOBBY_BG_PORTAL_OVERLAY_HEIGHT_NORMALIZED;
  const centerXPx = leftPx + (widthPx * 0.5);
  const centerYPx = topPx + (heightPx * 0.56);
  const overlayRoot = document.getElementById('overlay');
  const markPlacementReady = () => {
    if (!overlayRoot || !overlayRoot.classList) return;
    if (!overlayRoot.classList.contains('portalPlacementReady')) {
      overlayRoot.classList.add('portalPlacementReady');
    }
  };

  const nextSignature =
    `${leftPx.toFixed(2)}|${topPx.toFixed(2)}|${widthPx.toFixed(2)}|${heightPx.toFixed(2)}`;
  if (nextSignature === lobbyPortalOverlayPlacementSignature) {
    markPlacementReady();
    return;
  }

  const leftCss = `${leftPx.toFixed(2)}px`;
  const topCss = `${topPx.toFixed(2)}px`;
  const widthCss = `${widthPx.toFixed(2)}px`;
  const heightCss = `${heightPx.toFixed(2)}px`;
  const centerXCss = `${centerXPx.toFixed(2)}px`;
  const centerYCss = `${centerYPx.toFixed(2)}px`;

  if (overlayRoot && overlayRoot.style) {
    overlayRoot.style.setProperty('--portal-center-x', centerXCss);
    overlayRoot.style.setProperty('--portal-center-y', centerYCss);
    overlayRoot.style.setProperty('--portal-width', widthCss);
    overlayRoot.style.setProperty('--portal-height', heightCss);
  }

  for (const portalLayer of portalLayers) {
    portalLayer.style.left = leftCss;
    portalLayer.style.top = topCss;
    portalLayer.style.width = widthCss;
    portalLayer.style.height = heightCss;
  }
  markPlacementReady();
  lobbyPortalOverlayPlacementSignature = nextSignature;
}

function syncLobbyPreviewCanvasViewport() {
  if (!previewCanvas || !previewCtx) {
    return { width: 0, height: 0 };
  }

  const cssWidth = Math.max(1, Math.round(previewCanvas.clientWidth || previewCanvas.width || 320));
  const cssHeight = Math.max(1, Math.round(previewCanvas.clientHeight || previewCanvas.height || 240));
  const dpr = Math.max(1, Math.min((window.devicePixelRatio || 1), 2));
  const targetWidth = Math.max(1, Math.round(cssWidth * dpr));
  const targetHeight = Math.max(1, Math.round(cssHeight * dpr));

  if (previewCanvas.width !== targetWidth || previewCanvas.height !== targetHeight) {
    previewCanvas.width = targetWidth;
    previewCanvas.height = targetHeight;
  }

  previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: cssWidth, height: cssHeight };
}

// ── Lobby Preview ─────────────────────────────────────────────
function resolveLobbyPreviewRoadShadowClientY() {
  if (typeof document === 'undefined') return Number.NaN;

  syncLobbyPortalOverlayPlacement();

  const bgImage = document.querySelector('#overlay .lobbyBgImage');
  if (!bgImage || typeof bgImage.getBoundingClientRect !== 'function') return Number.NaN;

  const bgRect = bgImage.getBoundingClientRect();
  if (
    !Number.isFinite(bgRect.top) ||
    !Number.isFinite(bgRect.width) ||
    !Number.isFinite(bgRect.height) ||
    bgRect.width <= 0 ||
    bgRect.height <= 0
  ) {
    return Number.NaN;
  }

  const naturalW = Math.max(1, Number(bgImage.naturalWidth || bgImage.width) || 1);
  const naturalH = Math.max(1, Number(bgImage.naturalHeight || bgImage.height) || 1);
  const coverScale = Math.max(bgRect.width / naturalW, bgRect.height / naturalH);
  const renderedH = naturalH * coverScale;
  const offsetY = (bgRect.height - renderedH) * 0.5;
  const roadLocalY = renderedH * LOBBY_PREVIEW_BG_ROAD_ANCHOR_Y_NORMALIZED;
  return bgRect.top + offsetY + roadLocalY;
}

function resolveLobbyPreviewRoadShadowCanvasY(canvasH) {
  if (!previewCanvas || typeof previewCanvas.getBoundingClientRect !== 'function') {
    return canvasH * LOBBY_PREVIEW_BG_ROAD_ANCHOR_FALLBACK_Y_RATIO;
  }

  const previewRect = previewCanvas.getBoundingClientRect();
  if (!Number.isFinite(previewRect.top) || previewRect.height <= 0) {
    return canvasH * LOBBY_PREVIEW_BG_ROAD_ANCHOR_FALLBACK_Y_RATIO;
  }

  const roadClientY = resolveLobbyPreviewRoadShadowClientY();
  let roadCanvasY = Number.isFinite(roadClientY)
    ? (roadClientY - previewRect.top)
    : (canvasH * LOBBY_PREVIEW_BG_ROAD_ANCHOR_FALLBACK_Y_RATIO);

  const bottomSafeInset = Math.max(10, canvasH * LOBBY_PREVIEW_ROAD_SHADOW_BOTTOM_SAFE_RATIO);
  roadCanvasY = Math.min(canvasH - bottomSafeInset, roadCanvasY);
  roadCanvasY = Math.max(10, roadCanvasY);
  return roadCanvasY;
}

function drawLobbyPreview() {
  if (!previewCtx || !previewCanvas) return;
  // Multiplayer keeps gameState as "lobby" while match presentation is active.
  // Avoid running hidden lobby-preview rendering during those match phases.
  if (!isLobbyPreviewRenderActive()) {
    if (typeof gameState === 'string' && gameState === 'lobby') {
      // Retry soon so preview can recover once stale phase flags clear after match transitions.
      scheduleLobbyPreviewWakeCheck();
    }
    return;
  }
  const nowMs = performance.now();
  updateLobbyPreviewFloorCircleBlend(nowMs);

  const viewport = syncLobbyPreviewCanvasViewport();
  const canvasW = viewport.width;
  const canvasH = viewport.height;
  if (canvasW <= 0 || canvasH <= 0) return;

  if (isLobbyPreviewRenderActive()) {
    scheduleLobbyPreviewAnimationFrame();
  }

  previewCtx.clearRect(0, 0, canvasW, canvasH);

  const drawViewportOutline = () => {
    if (!LOBBY_PREVIEW_SHOW_VIEWPORT_OUTLINE) return;
    // Debug outline for the full preview viewport/canvas bounds.
    previewCtx.save();
    previewCtx.setLineDash([9, 7]);
    previewCtx.lineWidth = 2;
    previewCtx.strokeStyle = 'rgba(255, 174, 92, 0.95)';
    previewCtx.strokeRect(1, 1, Math.max(1, canvasW - 2), Math.max(1, canvasH - 2));
    previewCtx.setLineDash([]);
    previewCtx.restore();
  };

  const useStaticImage = shouldUseStaticLobbyPreviewImage();
  if (useStaticImage && !nyraLobbyAnimator.initialized) {
    beginNyraLobbySheetLoads();
  }
  const nyraFrame = useStaticImage ? getNyraLobbyFrame(nowMs) : null;
  const lobbyImage = nyraFrame?.image || (useStaticImage ? getLobbyPreviewFallbackImage() : null);
  if (lobbyImage) {
    const floatOffsetY = Math.sin(nowMs * LOBBY_PREVIEW_FLOAT_SPEED) * LOBBY_PREVIEW_FLOAT_AMPLITUDE_PX;
    const pulse = 0.5 + (Math.sin((nowMs * LOBBY_PREVIEW_FLOAT_SPEED * 0.62) + 0.7) * 0.5);
    const glowPulse = 0.5 + (Math.sin((nowMs * LOBBY_PREVIEW_FLOAT_SPEED * 1.68) + 1.2) * 0.5);

    const groundX = (canvasW * 0.5) + NYRA_LOBBY_HORIZONTAL_OFFSET_PX;
    const groundBaseY = (canvasH * 0.88) - LOBBY_PREVIEW_WINDOW_SHIFT_UP_PX;
    const sourceW = nyraFrame
      ? nyraFrame.sw
      : Math.max(1, Number(lobbyImage.naturalWidth || lobbyImage.width) || 1);
    const sourceH = nyraFrame
      ? nyraFrame.sh
      : Math.max(1, Number(lobbyImage.naturalHeight || lobbyImage.height) || 1);
    const maxDrawW = canvasW * 0.76;
    const maxDrawH = canvasH * 0.9;
    let scale = nyraFrame
      ? NYRA_LOBBY_DRAW_SCALE
      : Math.max(0.01, Math.min(maxDrawW / sourceW, maxDrawH / sourceH));
    let baselineShiftDown = 0;
    if (nyraFrame) {
      const responsiveLayout = resolveNyraLobbyResponsiveLayout(canvasW, canvasH, sourceW, sourceH);
      scale = responsiveLayout.scale;
      baselineShiftDown = responsiveLayout.baselineShiftDown;
    }
    const drawW = sourceW * scale;
    const drawH = sourceH * scale;
    const drawX = groundX - (drawW * 0.5);
    if (!nyraFrame) {
      const topSafeInset = Math.max(6, canvasH * LOBBY_PREVIEW_TOP_SAFE_RATIO);
      // Keep full float amplitude while guaranteeing the highest point doesn't clip.
      const minDrawYAtTopOfFloat = (groundBaseY - LOBBY_PREVIEW_FLOAT_AMPLITUDE_PX) - drawH;
      baselineShiftDown = Math.max(0, topSafeInset - minDrawYAtTopOfFloat);
    }
    const groundY = groundBaseY + baselineShiftDown + floatOffsetY + NYRA_LOBBY_VERTICAL_OFFSET_PX;
    const drawY = groundY - drawH;
    const roadShadowYBase = resolveLobbyPreviewRoadShadowCanvasY(canvasH);
    const floatProgress = Math.max(
      -1,
      Math.min(1, floatOffsetY / Math.max(1, LOBBY_PREVIEW_FLOAT_AMPLITUDE_PX))
    );
    const shadowScale = 1 + (floatProgress * LOBBY_PREVIEW_ROAD_SHADOW_SCALE_VARIANCE);
    const shadowRadiusX = Math.max(74, drawW * LOBBY_PREVIEW_ROAD_SHADOW_X_RATIO) * shadowScale;
    const shadowRadiusY = Math.max(16, drawH * LOBBY_PREVIEW_ROAD_SHADOW_Y_RATIO) * Math.max(
      0.78,
      1 + (floatProgress * (LOBBY_PREVIEW_ROAD_SHADOW_SCALE_VARIANCE * 0.55))
    );
    const roadShadowBottomInsetPx = Math.max(10, shadowRadiusY + 3);
    const roadShadowTopInsetPx = Math.max(10, shadowRadiusY + 3);
    const roadShadowY = Math.max(
      roadShadowTopInsetPx,
      Math.min(canvasH - roadShadowBottomInsetPx, roadShadowYBase)
    );
    const shadowAlpha = Math.max(
      0.16,
      Math.min(
        0.84,
        LOBBY_PREVIEW_ROAD_SHADOW_BASE_ALPHA + (floatProgress * LOBBY_PREVIEW_ROAD_SHADOW_ALPHA_VARIANCE)
      )
    );

    previewCtx.save();
    previewCtx.imageSmoothingEnabled = true;

    const roadShadowGradient = previewCtx.createRadialGradient(
      groundX,
      roadShadowY,
      shadowRadiusY * 0.22,
      groundX,
      roadShadowY,
      shadowRadiusX
    );
    roadShadowGradient.addColorStop(0, `rgba(0, 0, 0, ${(shadowAlpha * 1.06).toFixed(3)})`);
    roadShadowGradient.addColorStop(0.42, `rgba(0, 0, 0, ${(shadowAlpha * 0.92).toFixed(3)})`);
    roadShadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    previewCtx.fillStyle = roadShadowGradient;
    previewCtx.beginPath();
    previewCtx.ellipse(groundX, roadShadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
    previewCtx.fill();
    const innerShadowRadiusX = shadowRadiusX * 0.56;
    const innerShadowRadiusY = shadowRadiusY * 0.56;
    const roadShadowInnerGradient = previewCtx.createRadialGradient(
      groundX,
      roadShadowY,
      innerShadowRadiusY * 0.14,
      groundX,
      roadShadowY,
      innerShadowRadiusX
    );
    roadShadowInnerGradient.addColorStop(0, `rgba(0, 0, 0, ${(shadowAlpha * 0.58).toFixed(3)})`);
    roadShadowInnerGradient.addColorStop(0.5, `rgba(0, 0, 0, ${(shadowAlpha * 0.38).toFixed(3)})`);
    roadShadowInnerGradient.addColorStop(0.84, `rgba(0, 0, 0, ${(shadowAlpha * 0.14).toFixed(3)})`);
    roadShadowInnerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    previewCtx.fillStyle = roadShadowInnerGradient;
    previewCtx.beginPath();
    previewCtx.ellipse(
      groundX,
      roadShadowY,
      innerShadowRadiusX,
      innerShadowRadiusY,
      0,
      0,
      Math.PI * 2
    );
    previewCtx.fill();

    if (nyraFrame) {
      previewCtx.drawImage(
        lobbyImage,
        nyraFrame.sx,
        nyraFrame.sy,
        nyraFrame.sw,
        nyraFrame.sh,
        drawX,
        drawY,
        drawW,
        drawH
      );
    } else {
      previewCtx.drawImage(lobbyImage, drawX, drawY, drawW, drawH);
    }

    if (LOBBY_PREVIEW_SHOW_NYRA_PNG_OUTLINE) {
      // Debug outline for the exact Nyra sprite/frame bounds drawn in the preview canvas.
      previewCtx.lineWidth = 2;
      previewCtx.setLineDash([10, 8]);
      previewCtx.strokeStyle = 'rgba(120, 228, 255, 0.92)';
      previewCtx.strokeRect(
        Math.round(drawX) + 0.5,
        Math.round(drawY) + 0.5,
        Math.max(1, Math.round(drawW)),
        Math.max(1, Math.round(drawH))
      );
      previewCtx.setLineDash([]);
    }

    previewCtx.restore();
    drawViewportOutline();
    return;
  }

  // In static-image lobby mode we intentionally avoid the old prototype
  // fallback character while the image is still loading.
  if (useStaticImage) {
    drawViewportOutline();
    return;
  }

  // minimal fallback only, no fake boxed window
  const x = canvasW / 2;
  const y = canvasH * 0.68;

  previewCtx.fillStyle = player.bodyColor;
  previewCtx.beginPath();
  previewCtx.arc(x, y, 34, 0, Math.PI * 2);
  previewCtx.fill();

  drawCosmetics(previewCtx, x, y, 1);

  previewCtx.fillStyle = player.wandColor;
  previewCtx.save();
  previewCtx.translate(x, y);
  previewCtx.rotate(-0.3);
  previewCtx.fillRect(4, -4, 34, 8);
  previewCtx.restore();
  drawViewportOutline();
}

// ── Arena ─────────────────────────────────────────────────────
// Practice/arena sprite prototype (player only)
const PRACTICE_PLAYER_SPRITE_PATH = 'docs/art/character/Nyra/Nyra_run/Nyra_run.png';
const PRACTICE_PLAYER_SPRITE_FALLBACK_PATH = 'docs/art/character/Nyra/Nyra_run/Nyra_run.png';
const PRACTICE_PLAYER_SPRITE_FRAME_WIDTH = 192;
const PRACTICE_PLAYER_SPRITE_FRAME_HEIGHT = 192;
const PRACTICE_PLAYER_SPRITE_FRAMES_PER_ROW = 5;
const PRACTICE_PLAYER_SPRITE_FRAME_START = 0;
const PRACTICE_PLAYER_SPRITE_FRAME_END = 22;
const PRACTICE_PLAYER_SPRITE_FPS = 30;
const PRACTICE_PLAYER_SPRITE_FEET_ORIGIN_Y = 0.7;
const PRACTICE_PLAYER_SPRITE_DEFAULT_DRAW_OFFSET_Y = 9;
const PRACTICE_PLAYER_SPRITE_DRAW_OFFSET_Y = PRACTICE_PLAYER_SPRITE_DEFAULT_DRAW_OFFSET_Y;
const PRACTICE_PLAYER_SPRITE_SCALE = 1;
const MULTIPLAYER_ARENA_SPRITE_SCALE_MULTIPLIER = 1;
const PRACTICE_PLAYER_SHADOW_FOOT_OFFSET_Y = 14;
const PRACTICE_PLAYER_SPRITE_DRAW_HEIGHT = 105;
const BASE_ARENA_SPRITE_DRAW_HEIGHT = 96;
const ARENA_SPRITE_OVERLAY_RADIUS_BOOST_FACTOR = 0.3;
const ARENA_SPRITE_SHADOW_OFFSET_BOOST_FACTOR = 0.17;
const ARENA_ACTOR_RING_RADIUS_SCALE = 1.2;
const ARENA_ACTOR_OVERLAY_VERTICAL_NUDGE_Y = 20;
const ARENA_NYRA_VISUAL_Y_OFFSET_PX = 5;
const PRACTICE_PLAYER_HEALTHBAR_SPRITE_TOP_OFFSET_Y = 12;
const PRACTICE_PLAYER_NAMETAG_SPRITE_TOP_OFFSET_Y = 20;
const PRACTICE_PLAYER_IDLE_SPRITE_PATH = 'docs/art/character/Nyra/Nyra_idle/Nyra_idle.png';
const PRACTICE_PLAYER_IDLE_SPRITE_FRAME_WIDTH = 192;
const PRACTICE_PLAYER_IDLE_SPRITE_FRAME_HEIGHT = 192;
const PRACTICE_PLAYER_IDLE_SPRITE_FRAMES_PER_ROW = 6;
const PRACTICE_PLAYER_IDLE_SPRITE_FRAME_START = 0;
const PRACTICE_PLAYER_IDLE_SPRITE_FRAME_END = 26;
const PRACTICE_PLAYER_IDLE_SPRITE_FPS = 30;
const PRACTICE_PLAYER_CAST_SPRITE_PATH = 'docs/art/character/Nyra/Nyra_cast/nyra_cast.png';
const PRACTICE_PLAYER_CAST_SPRITE_FRAME_WIDTH = 192;
const PRACTICE_PLAYER_CAST_SPRITE_FRAME_HEIGHT = 192;
const PRACTICE_PLAYER_CAST_SPRITE_FRAMES_PER_ROW = 5;
const PRACTICE_PLAYER_CAST_SPRITE_FRAME_START = 0;
const PRACTICE_PLAYER_CAST_SPRITE_FRAME_END = 19;
const PRACTICE_PLAYER_CAST_SPRITE_FPS = 30;
const PRACTICE_PLAYER_CAST_SPRITE_START_OFFSET_SEC = 0.15;
const PRACTICE_PLAYER_CAST_SPRITE_END_OFFSET_SEC = Math.max(
  0,
  (1 - (((PRACTICE_PLAYER_CAST_SPRITE_FRAME_END - PRACTICE_PLAYER_CAST_SPRITE_FRAME_START) + 1) / PRACTICE_PLAYER_CAST_SPRITE_FPS)) + 0.1
);
const PRACTICE_PLAYER_DASH_SPRITE_PATH = 'docs/art/character/Nyra/Nyra_dash/Nyra_dash.png';
const PRACTICE_PLAYER_DASH_SPRITE_FRAME_WIDTH = 192;
const PRACTICE_PLAYER_DASH_SPRITE_FRAME_HEIGHT = 192;
const PRACTICE_PLAYER_DASH_SPRITE_FRAMES_PER_ROW = 6;
const PRACTICE_PLAYER_DASH_SPRITE_FRAME_START = 0;
const PRACTICE_PLAYER_DASH_SPRITE_FRAME_END = 26;
const PRACTICE_PLAYER_DASH_SPRITE_FPS = 30;
const PRACTICE_PLAYER_HIT_SPRITE_PATH = 'docs/art/character/Nyra/Nyra_hit/Nyra_hit.png';
const PRACTICE_PLAYER_HIT_SPRITE_FRAME_WIDTH = 192;
const PRACTICE_PLAYER_HIT_SPRITE_FRAME_HEIGHT = 192;
const PRACTICE_PLAYER_HIT_SPRITE_FRAMES_PER_ROW = 4;
const PRACTICE_PLAYER_HIT_SPRITE_FRAME_START = 0;
const PRACTICE_PLAYER_HIT_SPRITE_FRAME_END = 13;
const PRACTICE_PLAYER_HIT_SPRITE_FPS = 30;
const PRACTICE_PLAYER_HIT_SPRITE_START_OFFSET_SEC = 0;
const PRACTICE_PLAYER_HIT_SPRITE_END_OFFSET_SEC = 0;
const PRACTICE_PLAYER_CHARGE_TRAIL_COPIES = 3;
const PRACTICE_PLAYER_CHARGE_TRAIL_SPACING = 26;
const PRACTICE_PLAYER_CHARGE_TRAIL_SAMPLE_INTERVAL_SEC = 0.028;
const PRACTICE_PLAYER_CHARGE_TRAIL_MIN_SAMPLE_DISTANCE = 4;
const PRACTICE_PLAYER_CHARGE_TRAIL_FADE_OUT_SEC = 1.0;
const PRACTICE_PLAYER_CHARGE_TRAIL_ALPHA_MULTIPLIER = 1.5;
// fire.png sprite sheet: 768x768, 3x3 grid, using frames 0..7 (8 frames).
const FIREBALL_SPRITE_PATH = '/docs/art/spells/Spell_fx/fire.png';
const FIREBALL_SPRITE_FRAME_WIDTH = 256;
const FIREBALL_SPRITE_FRAME_HEIGHT = 256;
const FIREBALL_SPRITE_FRAMES_PER_ROW = 3;
const FIREBALL_SPRITE_FRAME_START = 0;
const FIREBALL_SPRITE_FRAME_END = 7;
const FIREBALL_SPRITE_FPS = 30;
const FIREBALL_SPRITE_DRAW_SCALE = 5.6;
const FIREBALL_SPRITE_OPACITY = 0.75;
const PRACTICE_SPELL_FX_IMAGE_PATHS = Object.freeze({
  hook: ['/docs/art/spells/Spell_fx/hook.png'],
  shock: ['/docs/art/spells/Spell_fx/shock.png'],
  wall: ['/docs/art/spells/Spell_fx/wall.png'],
});

const practicePlayerSpriteRuntime = {
  image: null,
  src: '',
  loaded: false,
  failed: false,
  frame: PRACTICE_PLAYER_SPRITE_FRAME_START,
  animElapsedSec: 0,
  dashAnimElapsedSec: 0,
  idleAnimElapsedSec: 0,
  lastTickSec: 0,
  lastX: 0,
  lastY: 0,
  hasLastPos: false,
  chargeTrailSamples: [],
  chargeTrailSampleTimerSec: 0,
  chargeTrailLastSampleX: 0,
  chargeTrailLastSampleY: 0,
  chargeTrailWasActive: false,
  chargeTrailFadeRemainingSec: 0,
  chargeTrailDirX: 1,
  chargeTrailDirY: 0,
  facingAngle: 0,
};

const practiceDummySpriteRuntime = {
  frame: PRACTICE_PLAYER_SPRITE_FRAME_START,
  animElapsedSec: 0,
  dashAnimElapsedSec: 0,
  idleAnimElapsedSec: 0,
  lastTickSec: 0,
  lastX: 0,
  lastY: 0,
  hasLastPos: false,
  facingAngle: 0,
};

const practicePlayerCastSpriteRuntime = {
  image: null,
  src: '',
  loaded: false,
  failed: false,
};

const practicePlayerDashSpriteRuntime = {
  image: null,
  src: '',
  loaded: false,
  failed: false,
};

const practicePlayerIdleSpriteRuntime = {
  image: null,
  src: '',
  loaded: false,
  failed: false,
};

const practicePlayerHitSpriteRuntime = {
  image: null,
  src: '',
  loaded: false,
  failed: false,
};

const phantomIllusionSpriteRuntimes = new Map();

const fireballSpriteRuntime = {
  image: null,
  src: '',
  loaded: false,
  failed: false,
};

const practiceSpellFxImageRuntime = {
  hook: {
    image: null,
    src: '',
    loaded: false,
    failed: false,
  },
  shock: {
    image: null,
    src: '',
    loaded: false,
    failed: false,
  },
  wall: {
    image: null,
    src: '',
    loaded: false,
    failed: false,
  },
};

function isPracticeRoomSpritePlayerEnabled() {
  const multiplayerArenaActive = !!getMultiplayerArenaRuntimeVisualState();
  const localArenaState = gameState === 'playing' || gameState === 'result';
  return multiplayerArenaActive || localArenaState;
}

function getArenaSpriteDrawScale() {
  const multiplayerArenaActive = !!getMultiplayerArenaRuntimeVisualState();
  const scaleMultiplier = multiplayerArenaActive
    ? MULTIPLAYER_ARENA_SPRITE_SCALE_MULTIPLIER
    : 1;
  return PRACTICE_PLAYER_SPRITE_SCALE * scaleMultiplier;
}

function getArenaSpriteDrawHeight() {
  return Math.max(2, Math.round(PRACTICE_PLAYER_SPRITE_DRAW_HEIGHT * getArenaSpriteDrawScale()));
}

function getArenaSpriteOverlayRadiusBoost() {
  if (!isPracticeRoomSpritePlayerEnabled()) return 0;
  const drawHeight = getArenaSpriteDrawHeight();
  const extraHeight = Math.max(0, drawHeight - BASE_ARENA_SPRITE_DRAW_HEIGHT);
  return Math.round(extraHeight * ARENA_SPRITE_OVERLAY_RADIUS_BOOST_FACTOR);
}

function getArenaSpriteShadowFootOffsetY(drawHeight = getArenaSpriteDrawHeight()) {
  const safeDrawHeight = Number.isFinite(Number(drawHeight)) && Number(drawHeight) > 0
    ? Number(drawHeight)
    : getArenaSpriteDrawHeight();
  if (!isPracticeRoomSpritePlayerEnabled()) return PRACTICE_PLAYER_SHADOW_FOOT_OFFSET_Y;
  const extraHeight = Math.max(0, safeDrawHeight - BASE_ARENA_SPRITE_DRAW_HEIGHT);
  return PRACTICE_PLAYER_SHADOW_FOOT_OFFSET_Y + Math.round(extraHeight * ARENA_SPRITE_SHADOW_OFFSET_BOOST_FACTOR);
}

function getArenaSpriteTopY(actorY, drawHeight = getArenaSpriteDrawHeight()) {
  const safeY = Number(actorY) || 0;
  const safeDrawHeight = Number.isFinite(Number(drawHeight)) && Number(drawHeight) > 0
    ? Number(drawHeight)
    : getArenaSpriteDrawHeight();
  return safeY - (safeDrawHeight * PRACTICE_PLAYER_SPRITE_FEET_ORIGIN_Y) + PRACTICE_PLAYER_SPRITE_DRAW_OFFSET_Y;
}

function getArenaSpriteOverlayAnchorOffsetY() {
  if (!isPracticeRoomSpritePlayerEnabled()) return 0;
  return PRACTICE_PLAYER_SPRITE_DRAW_OFFSET_Y - PRACTICE_PLAYER_SPRITE_DEFAULT_DRAW_OFFSET_Y;
}

function resetPracticePlayerSpriteAnimationState() {
  practicePlayerSpriteRuntime.frame = PRACTICE_PLAYER_SPRITE_FRAME_START;
  practicePlayerSpriteRuntime.animElapsedSec = 0;
  practicePlayerSpriteRuntime.dashAnimElapsedSec = 0;
  practicePlayerSpriteRuntime.idleAnimElapsedSec = 0;
  practicePlayerSpriteRuntime.lastTickSec = 0;
  practicePlayerSpriteRuntime.hasLastPos = false;
  practicePlayerSpriteRuntime.facingAngle = 0;
  resetPracticePlayerChargeTrailSamples();
}

function resetPracticeDummySpriteAnimationState() {
  practiceDummySpriteRuntime.frame = PRACTICE_PLAYER_SPRITE_FRAME_START;
  practiceDummySpriteRuntime.animElapsedSec = 0;
  practiceDummySpriteRuntime.dashAnimElapsedSec = 0;
  practiceDummySpriteRuntime.idleAnimElapsedSec = 0;
  practiceDummySpriteRuntime.lastTickSec = 0;
  practiceDummySpriteRuntime.lastX = 0;
  practiceDummySpriteRuntime.lastY = 0;
  practiceDummySpriteRuntime.hasLastPos = false;
  practiceDummySpriteRuntime.facingAngle = 0;
}

function resetPracticePlayerChargeTrailSamples() {
  practicePlayerSpriteRuntime.chargeTrailSamples = [];
  practicePlayerSpriteRuntime.chargeTrailSampleTimerSec = 0;
  practicePlayerSpriteRuntime.chargeTrailLastSampleX = 0;
  practicePlayerSpriteRuntime.chargeTrailLastSampleY = 0;
  practicePlayerSpriteRuntime.chargeTrailWasActive = false;
  practicePlayerSpriteRuntime.chargeTrailFadeRemainingSec = 0;
  practicePlayerSpriteRuntime.chargeTrailDirX = 1;
  practicePlayerSpriteRuntime.chargeTrailDirY = 0;
  practicePlayerSpriteRuntime.facingAngle = 0;
}

function beginPracticePlayerSpriteLoad(path, allowFallback = true) {
  if (!path || typeof path !== 'string') return;

  const img = new Image();
  practicePlayerSpriteRuntime.image = img;
  practicePlayerSpriteRuntime.src = path;
  practicePlayerSpriteRuntime.loaded = false;
  practicePlayerSpriteRuntime.failed = false;
  img.decoding = 'async';

  img.onload = () => {
    if (practicePlayerSpriteRuntime.image !== img) return;
    practicePlayerSpriteRuntime.loaded = true;
    practicePlayerSpriteRuntime.failed = false;
  };

  img.onerror = () => {
    if (practicePlayerSpriteRuntime.image !== img) return;
    practicePlayerSpriteRuntime.loaded = false;
    practicePlayerSpriteRuntime.failed = true;
    if (allowFallback && path !== PRACTICE_PLAYER_SPRITE_FALLBACK_PATH) {
      beginPracticePlayerSpriteLoad(PRACTICE_PLAYER_SPRITE_FALLBACK_PATH, false);
    }
  };

  img.src = path;
}

function getPracticePlayerSpriteSheet() {
  if (practicePlayerSpriteRuntime.loaded && practicePlayerSpriteRuntime.image) {
    return practicePlayerSpriteRuntime.image;
  }
  if (!practicePlayerSpriteRuntime.image) {
    beginPracticePlayerSpriteLoad(PRACTICE_PLAYER_SPRITE_PATH, true);
  }
  return null;
}

function beginPracticePlayerIdleSpriteLoad(path = PRACTICE_PLAYER_IDLE_SPRITE_PATH) {
  if (!path || typeof path !== 'string') return;

  const img = new Image();
  practicePlayerIdleSpriteRuntime.image = img;
  practicePlayerIdleSpriteRuntime.src = path;
  practicePlayerIdleSpriteRuntime.loaded = false;
  practicePlayerIdleSpriteRuntime.failed = false;
  img.decoding = 'async';

  img.onload = () => {
    if (practicePlayerIdleSpriteRuntime.image !== img) return;
    practicePlayerIdleSpriteRuntime.loaded = true;
    practicePlayerIdleSpriteRuntime.failed = false;
  };

  img.onerror = () => {
    if (practicePlayerIdleSpriteRuntime.image !== img) return;
    practicePlayerIdleSpriteRuntime.loaded = false;
    practicePlayerIdleSpriteRuntime.failed = true;
  };

  img.src = path;
}

function getPracticePlayerIdleSpriteSheet() {
  if (practicePlayerIdleSpriteRuntime.loaded && practicePlayerIdleSpriteRuntime.image) {
    return practicePlayerIdleSpriteRuntime.image;
  }
  if (!practicePlayerIdleSpriteRuntime.image && !practicePlayerIdleSpriteRuntime.failed) {
    beginPracticePlayerIdleSpriteLoad();
  }
  return null;
}

function beginPracticePlayerCastSpriteLoad(path = PRACTICE_PLAYER_CAST_SPRITE_PATH) {
  if (!path || typeof path !== 'string') return;

  const img = new Image();
  practicePlayerCastSpriteRuntime.image = img;
  practicePlayerCastSpriteRuntime.src = path;
  practicePlayerCastSpriteRuntime.loaded = false;
  practicePlayerCastSpriteRuntime.failed = false;
  img.decoding = 'async';

  img.onload = () => {
    if (practicePlayerCastSpriteRuntime.image !== img) return;
    practicePlayerCastSpriteRuntime.loaded = true;
    practicePlayerCastSpriteRuntime.failed = false;
  };

  img.onerror = () => {
    if (practicePlayerCastSpriteRuntime.image !== img) return;
    practicePlayerCastSpriteRuntime.loaded = false;
    practicePlayerCastSpriteRuntime.failed = true;
  };

  img.src = path;
}

function getPracticePlayerCastSpriteSheet() {
  if (practicePlayerCastSpriteRuntime.loaded && practicePlayerCastSpriteRuntime.image) {
    return practicePlayerCastSpriteRuntime.image;
  }
  if (!practicePlayerCastSpriteRuntime.image && !practicePlayerCastSpriteRuntime.failed) {
    beginPracticePlayerCastSpriteLoad();
  }
  return null;
}

function beginPracticePlayerDashSpriteLoad(path = PRACTICE_PLAYER_DASH_SPRITE_PATH) {
  if (!path || typeof path !== 'string') return;

  const img = new Image();
  practicePlayerDashSpriteRuntime.image = img;
  practicePlayerDashSpriteRuntime.src = path;
  practicePlayerDashSpriteRuntime.loaded = false;
  practicePlayerDashSpriteRuntime.failed = false;
  img.decoding = 'async';

  img.onload = () => {
    if (practicePlayerDashSpriteRuntime.image !== img) return;
    practicePlayerDashSpriteRuntime.loaded = true;
    practicePlayerDashSpriteRuntime.failed = false;
  };

  img.onerror = () => {
    if (practicePlayerDashSpriteRuntime.image !== img) return;
    practicePlayerDashSpriteRuntime.loaded = false;
    practicePlayerDashSpriteRuntime.failed = true;
  };

  img.src = path;
}

function getPracticePlayerDashSpriteSheet() {
  if (practicePlayerDashSpriteRuntime.loaded && practicePlayerDashSpriteRuntime.image) {
    return practicePlayerDashSpriteRuntime.image;
  }
  if (!practicePlayerDashSpriteRuntime.image && !practicePlayerDashSpriteRuntime.failed) {
    beginPracticePlayerDashSpriteLoad();
  }
  return null;
}

function beginPracticePlayerHitSpriteLoad(path = PRACTICE_PLAYER_HIT_SPRITE_PATH) {
  if (!path || typeof path !== 'string') return;

  const img = new Image();
  practicePlayerHitSpriteRuntime.image = img;
  practicePlayerHitSpriteRuntime.src = path;
  practicePlayerHitSpriteRuntime.loaded = false;
  practicePlayerHitSpriteRuntime.failed = false;
  img.decoding = 'async';

  img.onload = () => {
    if (practicePlayerHitSpriteRuntime.image !== img) return;
    practicePlayerHitSpriteRuntime.loaded = true;
    practicePlayerHitSpriteRuntime.failed = false;
  };

  img.onerror = () => {
    if (practicePlayerHitSpriteRuntime.image !== img) return;
    practicePlayerHitSpriteRuntime.loaded = false;
    practicePlayerHitSpriteRuntime.failed = true;
  };

  img.src = path;
}

function getPracticePlayerHitSpriteSheet() {
  if (practicePlayerHitSpriteRuntime.loaded && practicePlayerHitSpriteRuntime.image) {
    return practicePlayerHitSpriteRuntime.image;
  }
  if (!practicePlayerHitSpriteRuntime.image && !practicePlayerHitSpriteRuntime.failed) {
    beginPracticePlayerHitSpriteLoad();
  }
  return null;
}

function beginFireballSpriteLoad(path = FIREBALL_SPRITE_PATH) {
  if (!path || typeof path !== 'string') return;
  const normalizedPath = path.startsWith('/') ? path : `/${path.replace(/^\/+/, '')}`;
  if (
    fireballSpriteRuntime.src === normalizedPath
    && (fireballSpriteRuntime.loaded || fireballSpriteRuntime.failed || fireballSpriteRuntime.image)
  ) {
    return;
  }

  const img = new Image();
  fireballSpriteRuntime.image = img;
  fireballSpriteRuntime.src = normalizedPath;
  fireballSpriteRuntime.loaded = false;
  fireballSpriteRuntime.failed = false;
  img.decoding = 'async';

  img.onload = () => {
    if (fireballSpriteRuntime.image !== img) return;
    fireballSpriteRuntime.loaded = true;
    fireballSpriteRuntime.failed = false;
  };

  img.onerror = () => {
    if (fireballSpriteRuntime.image !== img) return;
    fireballSpriteRuntime.loaded = false;
    fireballSpriteRuntime.failed = true;
  };

  img.src = normalizedPath;
}

function getFireballSpriteSheet() {
  if (fireballSpriteRuntime.loaded && fireballSpriteRuntime.image) {
    return fireballSpriteRuntime.image;
  }
  if (!fireballSpriteRuntime.image && !fireballSpriteRuntime.failed) {
    beginFireballSpriteLoad();
  }
  return null;
}

function isPracticeSpellFxImageModeActive() {
  const multiplayerArenaActive = !!getMultiplayerArenaRuntimeVisualState();
  const localArenaState = gameState === 'playing' || gameState === 'result';
  return multiplayerArenaActive || localArenaState;
}

function beginPracticeSpellFxImageLoad(effectId, pathIndex = 0) {
  const id = String(effectId || '').trim().toLowerCase();
  const state = practiceSpellFxImageRuntime[id];
  const pathList = PRACTICE_SPELL_FX_IMAGE_PATHS[id];
  if (!state || !Array.isArray(pathList) || pathIndex < 0 || pathIndex >= pathList.length) {
    return;
  }

  const rawPath = String(pathList[pathIndex] || '').trim();
  if (!rawPath) return;
  const normalizedPath = rawPath.startsWith('/')
    ? rawPath
    : `/${rawPath.replace(/^\/+/, '')}`;

  const img = new Image();
  state.image = img;
  state.src = normalizedPath;
  state.loaded = false;
  state.failed = false;
  img.decoding = 'async';

  img.onload = () => {
    if (state.image !== img) return;
    state.loaded = true;
    state.failed = false;
  };

  img.onerror = () => {
    if (state.image !== img) return;
    state.loaded = false;
    state.failed = true;
    if (pathIndex + 1 < pathList.length) {
      beginPracticeSpellFxImageLoad(id, pathIndex + 1);
    }
  };

  img.src = normalizedPath;
}

function getPracticeSpellFxImage(effectId) {
  const id = String(effectId || '').trim().toLowerCase();
  const state = practiceSpellFxImageRuntime[id];
  if (!state) return null;
  if (state.loaded && state.image) return state.image;
  if (!state.image && !state.failed) {
    beginPracticeSpellFxImageLoad(id, 0);
  }
  return null;
}

function getFireballAnimationFrame(nowSec) {
  const frameCount = (FIREBALL_SPRITE_FRAME_END - FIREBALL_SPRITE_FRAME_START) + 1;
  if (frameCount <= 0) return FIREBALL_SPRITE_FRAME_START;
  const safeNowSec = Number.isFinite(Number(nowSec))
    ? Number(nowSec)
    : ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);
  const frameOffset = Math.floor(Math.max(0, safeNowSec) * FIREBALL_SPRITE_FPS) % frameCount;
  return FIREBALL_SPRITE_FRAME_START + frameOffset;
}

function drawFireballProjectileSprite(projectile, nowSec) {
  const spriteSheet = getFireballSpriteSheet();
  if (!spriteSheet) return false;

  const frame = getFireballAnimationFrame(nowSec);
  const frameColumn = frame % FIREBALL_SPRITE_FRAMES_PER_ROW;
  const frameRow = Math.floor(frame / FIREBALL_SPRITE_FRAMES_PER_ROW);
  const sourceX = frameColumn * FIREBALL_SPRITE_FRAME_WIDTH;
  const sourceY = frameRow * FIREBALL_SPRITE_FRAME_HEIGHT;

  const projectileX = Number(projectile?.x) || 0;
  const projectileY = Number(projectile?.y) || 0;
  const projectileRadius = Math.max(3, Number(projectile?.r) || 7);
  const drawSize = Math.max(30, projectileRadius * FIREBALL_SPRITE_DRAW_SCALE);

  const velocityX = Number(projectile?.vx) || 0;
  const velocityY = Number(projectile?.vy) || 0;
  let angle = 0;
  if (Math.hypot(velocityX, velocityY) > 0.001) {
    angle = Math.atan2(velocityY, velocityX);
  } else {
    const fromX = Number.isFinite(Number(projectile?.prevX)) ? Number(projectile.prevX) : projectileX;
    const fromY = Number.isFinite(Number(projectile?.prevY)) ? Number(projectile.prevY) : projectileY;
    const travelX = projectileX - fromX;
    const travelY = projectileY - fromY;
    if (Math.hypot(travelX, travelY) > 0.001) {
      angle = Math.atan2(travelY, travelX);
    }
  }

  ctx.save();
  ctx.translate(projectileX, projectileY);
  ctx.rotate(angle);

  const glowRadius = drawSize * 0.58;
  const glow = ctx.createRadialGradient(0, 0, Math.max(1, glowRadius * 0.2), 0, 0, glowRadius);
  glow.addColorStop(0, 'rgba(255, 228, 158, 0.44)');
  glow.addColorStop(0.66, 'rgba(255, 170, 88, 0.22)');
  glow.addColorStop(1, 'rgba(255, 120, 56, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = FIREBALL_SPRITE_OPACITY;
  ctx.drawImage(
    spriteSheet,
    sourceX,
    sourceY,
    FIREBALL_SPRITE_FRAME_WIDTH,
    FIREBALL_SPRITE_FRAME_HEIGHT,
    -drawSize * 0.5,
    -drawSize * 0.5,
    drawSize,
    drawSize
  );

  ctx.restore();
  return true;
}

function getPracticePlayerSpriteDeltaSec() {
  const nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);
  if (!Number.isFinite(practicePlayerSpriteRuntime.lastTickSec) || practicePlayerSpriteRuntime.lastTickSec <= 0) {
    practicePlayerSpriteRuntime.lastTickSec = nowSec;
    return 0;
  }
  const dtSec = Math.max(0, Math.min(0.12, nowSec - practicePlayerSpriteRuntime.lastTickSec));
  practicePlayerSpriteRuntime.lastTickSec = nowSec;
  return dtSec;
}

function getArenaActorSpriteDeltaSec(runtime) {
  const nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);
  if (!runtime || !Number.isFinite(runtime.lastTickSec) || runtime.lastTickSec <= 0) {
    if (runtime) runtime.lastTickSec = nowSec;
    return 0;
  }
  const dtSec = Math.max(0, Math.min(0.12, nowSec - runtime.lastTickSec));
  runtime.lastTickSec = nowSec;
  return dtSec;
}

function isArenaActorSpriteMoving(actor, runtime, dtSec) {
  if (!actor || !runtime) return false;
  const vx = Number(actor?.vx) || 0;
  const vy = Number(actor?.vy) || 0;
  const velocityMoving = Math.hypot(vx, vy) > 6;

  const px = Number(actor?.x) || 0;
  const py = Number(actor?.y) || 0;
  let positionMoving = false;
  if (runtime.hasLastPos) {
    const dx = px - runtime.lastX;
    const dy = py - runtime.lastY;
    const minTravel = Math.max(0.45, (Number(dtSec) || 0) * 8);
    positionMoving = Math.hypot(dx, dy) > minTravel;
  }
  runtime.lastX = px;
  runtime.lastY = py;
  runtime.hasLastPos = true;

  return velocityMoving || positionMoving;
}

function isPhantomIllusionSpriteMoving(illusion, runtime, dtSec, nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000)) {
  if (!illusion || !runtime) return false;
  const vx = Number(illusion?.vx) || 0;
  const vy = Number(illusion?.vy) || 0;
  const velocityMoving = Math.hypot(vx, vy) > 1.5;

  const px = Number(illusion?.x) || 0;
  const py = Number(illusion?.y) || 0;
  let positionMoving = true;
  if (runtime.hasLastPos) {
    const dx = px - runtime.lastX;
    const dy = py - runtime.lastY;
    const minTravel = Math.max(0.015, (Number(dtSec) || 0) * 1.25);
    positionMoving = Math.hypot(dx, dy) > minTravel;
  }
  runtime.lastX = px;
  runtime.lastY = py;
  runtime.hasLastPos = true;
  if (positionMoving || velocityMoving) {
    runtime.lastMoveAtSec = nowSec;
  }

  // Keep animation alive briefly between sparse net updates to avoid
  // collapsing back to a static frame.
  const lastMoveAtSec = Number(runtime.lastMoveAtSec) || 0;
  const movedRecently = (nowSec - lastMoveAtSec) <= 0.22;
  const facingMagnitude = Math.hypot(Number(illusion?.facingX) || 0, Number(illusion?.facingY) || 0);
  const facingSuggestsMovement = facingMagnitude > 0.15 && movedRecently;

  return velocityMoving || positionMoving || facingSuggestsMovement;
}

function getArenaActorSpriteFrameIndex(runtime, isMoving, dtSec) {
  if (!runtime) return PRACTICE_PLAYER_SPRITE_FRAME_START;
  const frameCount = (PRACTICE_PLAYER_SPRITE_FRAME_END - PRACTICE_PLAYER_SPRITE_FRAME_START) + 1;
  if (!isMoving) {
    runtime.animElapsedSec = 0;
    runtime.frame = PRACTICE_PLAYER_SPRITE_FRAME_START;
    return PRACTICE_PLAYER_SPRITE_FRAME_START;
  }

  runtime.animElapsedSec += Math.max(0, Number(dtSec) || 0);
  const frameOffset = Math.floor(runtime.animElapsedSec * PRACTICE_PLAYER_SPRITE_FPS) % frameCount;
  const frame = PRACTICE_PLAYER_SPRITE_FRAME_START + frameOffset;
  runtime.frame = frame;
  return frame;
}

function getArenaActorIdleSpriteFrameIndex(runtime, isIdle, dtSec) {
  if (!runtime) return PRACTICE_PLAYER_IDLE_SPRITE_FRAME_START;
  const frameCount = (PRACTICE_PLAYER_IDLE_SPRITE_FRAME_END - PRACTICE_PLAYER_IDLE_SPRITE_FRAME_START) + 1;
  if (frameCount <= 0) return PRACTICE_PLAYER_IDLE_SPRITE_FRAME_START;
  if (!isIdle) {
    runtime.idleAnimElapsedSec = 0;
    return PRACTICE_PLAYER_IDLE_SPRITE_FRAME_START;
  }

  runtime.idleAnimElapsedSec += Math.max(0, Number(dtSec) || 0);
  const frameOffset = Math.floor(runtime.idleAnimElapsedSec * PRACTICE_PLAYER_IDLE_SPRITE_FPS) % frameCount;
  return PRACTICE_PLAYER_IDLE_SPRITE_FRAME_START + frameOffset;
}

function getPhantomIllusionSpriteFrameIndex(runtime, isMoving, dtSec) {
  if (!runtime) return PRACTICE_PLAYER_SPRITE_FRAME_START;
  const frameCount = (PRACTICE_PLAYER_SPRITE_FRAME_END - PRACTICE_PLAYER_SPRITE_FRAME_START) + 1;
  if (!isMoving) {
    const frozenFrame = Number.isFinite(Number(runtime.frame))
      ? Number(runtime.frame)
      : PRACTICE_PLAYER_SPRITE_FRAME_START;
    return Math.max(PRACTICE_PLAYER_SPRITE_FRAME_START, Math.min(PRACTICE_PLAYER_SPRITE_FRAME_END, Math.floor(frozenFrame)));
  }

  runtime.animElapsedSec += Math.max(0, Number(dtSec) || 0);
  const frameOffset = Math.floor(runtime.animElapsedSec * PRACTICE_PLAYER_SPRITE_FPS) % frameCount;
  const frame = PRACTICE_PLAYER_SPRITE_FRAME_START + frameOffset;
  runtime.frame = frame;
  return frame;
}

function resolveArenaActorSpriteFacingAngle(actor, runtime, isMoving) {
  const fallbackAngle = Number.isFinite(Number(runtime?.facingAngle))
    ? Number(runtime.facingAngle)
    : 0;
  if (!actor) return fallbackAngle;

  let dirX = Number(actor?.aimX) || 0;
  let dirY = Number(actor?.aimY) || 0;
  if (Math.abs(dirX) + Math.abs(dirY) > 0.0001) {
    return getPracticeSpriteFacingAngleFromVector(dirX, dirY, fallbackAngle);
  }

  dirX = Number(actor?.chargeDirX) || 0;
  dirY = Number(actor?.chargeDirY) || 0;
  if (!actor?.chargeActive || (Math.abs(dirX) + Math.abs(dirY) < 0.0001)) {
    dirX = Number(actor?.vx) || 0;
    dirY = Number(actor?.vy) || 0;
  }
  if (Math.abs(dirX) + Math.abs(dirY) < 0.0001 && !isMoving) {
    return fallbackAngle;
  }

  return getPracticeSpriteFacingAngleFromVector(dirX, dirY, fallbackAngle);
}

function isPracticePlayerSpriteMoving(dtSec) {
  const vx = Number(player?.vx) || 0;
  const vy = Number(player?.vy) || 0;
  const velocityMoving = Math.hypot(vx, vy) > 6;

  const px = Number(player?.x) || 0;
  const py = Number(player?.y) || 0;
  let positionMoving = false;
  if (practicePlayerSpriteRuntime.hasLastPos) {
    const dx = px - practicePlayerSpriteRuntime.lastX;
    const dy = py - practicePlayerSpriteRuntime.lastY;
    const minTravel = Math.max(0.45, (Number(dtSec) || 0) * 8);
    positionMoving = Math.hypot(dx, dy) > minTravel;
  }
  practicePlayerSpriteRuntime.lastX = px;
  practicePlayerSpriteRuntime.lastY = py;
  practicePlayerSpriteRuntime.hasLastPos = true;

  return velocityMoving || positionMoving;
}

function getPracticePlayerSpriteFrameIndex(isMoving, dtSec) {
  const frameCount = (PRACTICE_PLAYER_SPRITE_FRAME_END - PRACTICE_PLAYER_SPRITE_FRAME_START) + 1;
  if (!isMoving) {
    practicePlayerSpriteRuntime.animElapsedSec = 0;
    practicePlayerSpriteRuntime.frame = PRACTICE_PLAYER_SPRITE_FRAME_START;
    return PRACTICE_PLAYER_SPRITE_FRAME_START;
  }

  practicePlayerSpriteRuntime.animElapsedSec += Math.max(0, Number(dtSec) || 0);
  const frameOffset = Math.floor(practicePlayerSpriteRuntime.animElapsedSec * PRACTICE_PLAYER_SPRITE_FPS) % frameCount;
  const frame = PRACTICE_PLAYER_SPRITE_FRAME_START + frameOffset;
  practicePlayerSpriteRuntime.frame = frame;
  return frame;
}

function isArenaActorDashSpriteActive(actor, nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000)) {
  if (!actor) return false;
  const dashAnimUntil = Number(actor.dashAnimUntil) || 0;
  if (dashAnimUntil > 0) {
    return nowSec < dashAnimUntil;
  }
  return !!actor.chargeActive;
}

function getArenaActorDashSpriteFrameIndex(runtime, isDashActive, dtSec) {
  if (!runtime) return PRACTICE_PLAYER_DASH_SPRITE_FRAME_START;
  const frameCount = (PRACTICE_PLAYER_DASH_SPRITE_FRAME_END - PRACTICE_PLAYER_DASH_SPRITE_FRAME_START) + 1;
  if (frameCount <= 0) return PRACTICE_PLAYER_DASH_SPRITE_FRAME_START;
  if (!isDashActive) {
    runtime.dashAnimElapsedSec = 0;
    return PRACTICE_PLAYER_DASH_SPRITE_FRAME_START;
  }
  runtime.dashAnimElapsedSec += Math.max(0, Number(dtSec) || 0);
  const frameOffset = Math.floor(runtime.dashAnimElapsedSec * PRACTICE_PLAYER_DASH_SPRITE_FPS) % frameCount;
  return PRACTICE_PLAYER_DASH_SPRITE_FRAME_START + frameOffset;
}

function isArenaActorCastSpriteActive(actor, nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000)) {
  if (!actor) return false;
  const castEndSec = Number(actor.castAnimUntil) || 0;
  if (castEndSec <= 0) return false;
  const castStartSec = Number(actor.castAnimStartedAt) || nowSec;
  const visibleEndSec = Math.max(castStartSec, castEndSec - PRACTICE_PLAYER_CAST_SPRITE_END_OFFSET_SEC);
  return nowSec < visibleEndSec;
}

function getArenaActorCastSpriteFrameIndex(actor, nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000)) {
  const frameCount = (PRACTICE_PLAYER_CAST_SPRITE_FRAME_END - PRACTICE_PLAYER_CAST_SPRITE_FRAME_START) + 1;
  if (frameCount <= 0) return PRACTICE_PLAYER_CAST_SPRITE_FRAME_START;
  const castStartSec = Number(actor?.castAnimStartedAt) || nowSec;
  const elapsedSec = Math.max(0, nowSec - castStartSec) + PRACTICE_PLAYER_CAST_SPRITE_START_OFFSET_SEC;
  const frameOffset = Math.min(
    frameCount - 1,
    Math.max(0, Math.floor(elapsedSec * PRACTICE_PLAYER_CAST_SPRITE_FPS))
  );
  return PRACTICE_PLAYER_CAST_SPRITE_FRAME_START + frameOffset;
}

function isArenaActorHitSpriteActive(actor, nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000)) {
  if (!actor) return false;
  const hitStartSec = Number(actor?.hitAnimStartedAt) || 0;
  if (hitStartSec <= 0) return false;
  const frameCount = (PRACTICE_PLAYER_HIT_SPRITE_FRAME_END - PRACTICE_PLAYER_HIT_SPRITE_FRAME_START) + 1;
  const totalDurationSec = frameCount > 0
    ? (frameCount / Math.max(1, PRACTICE_PLAYER_HIT_SPRITE_FPS))
    : 0;
  const visibleDurationSec = Math.max(
    0.01,
    totalDurationSec - PRACTICE_PLAYER_HIT_SPRITE_START_OFFSET_SEC - PRACTICE_PLAYER_HIT_SPRITE_END_OFFSET_SEC
  );
  return nowSec < (hitStartSec + visibleDurationSec);
}

function getArenaActorHitSpriteFrameIndex(actor, nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000)) {
  const frameCount = (PRACTICE_PLAYER_HIT_SPRITE_FRAME_END - PRACTICE_PLAYER_HIT_SPRITE_FRAME_START) + 1;
  if (frameCount <= 0) return PRACTICE_PLAYER_HIT_SPRITE_FRAME_START;
  const hitStartSec = Number(actor?.hitAnimStartedAt) || nowSec;
  const totalDurationSec = frameCount / Math.max(1, PRACTICE_PLAYER_HIT_SPRITE_FPS);
  const maxSampleSec = Math.max(
    PRACTICE_PLAYER_HIT_SPRITE_START_OFFSET_SEC,
    totalDurationSec - PRACTICE_PLAYER_HIT_SPRITE_END_OFFSET_SEC
  );
  const visibleDurationSec = Math.max(
    0.01,
    maxSampleSec - PRACTICE_PLAYER_HIT_SPRITE_START_OFFSET_SEC
  );
  const elapsedSec = Math.max(0, Math.min(visibleDurationSec, nowSec - hitStartSec));
  const sampleSec = Math.min(
    maxSampleSec,
    PRACTICE_PLAYER_HIT_SPRITE_START_OFFSET_SEC + elapsedSec
  );
  const frameOffset = Math.min(
    frameCount - 1,
    Math.max(0, Math.floor(sampleSec * PRACTICE_PLAYER_HIT_SPRITE_FPS))
  );
  return PRACTICE_PLAYER_HIT_SPRITE_FRAME_START + frameOffset;
}

function getPracticeSpriteFacingAngleFromVector(rawX, rawY, fallbackAngle = 0) {
  const dx = Number(rawX) || 0;
  const dy = Number(rawY) || 0;
  if (Math.abs(dx) + Math.abs(dy) < 0.0001) return fallbackAngle;
  // Sprite baseline faces "south" (positive Y), so rotate by aim angle minus 90deg.
  return Math.atan2(dy, dx) - (Math.PI * 0.5);
}

function resolvePracticePlayerSpriteFacingAngle(isMoving) {
  const runtime = practicePlayerSpriteRuntime;
  const fallbackAngle = Number.isFinite(Number(runtime.facingAngle))
    ? Number(runtime.facingAngle)
    : 0;

  // Arena readability: local player should face cursor direction first.
  const mouseX = Number(mouse?.x);
  const mouseY = Number(mouse?.y);
  const playerX = Number(player?.x);
  const playerY = Number(player?.y);
  if (
    Number.isFinite(mouseX) &&
    Number.isFinite(mouseY) &&
    Number.isFinite(playerX) &&
    Number.isFinite(playerY)
  ) {
    const pointerDx = mouseX - playerX;
    const pointerDy = mouseY - playerY;
    if (Math.abs(pointerDx) + Math.abs(pointerDy) > 0.0001) {
      return getPracticeSpriteFacingAngleFromVector(pointerDx, pointerDy, fallbackAngle);
    }
  }

    // Arena sprites face the cursor aim direction first.
  let dirX = Number(player?.aimX) || 0;
  let dirY = Number(player?.aimY) || 0;
  if (Math.abs(dirX) + Math.abs(dirY) > 0.0001) {
    return getPracticeSpriteFacingAngleFromVector(dirX, dirY, fallbackAngle);
  }

  // Fallbacks when aim is unavailable.
  dirX = Number(player?.chargeDirX) || 0;
  dirY = Number(player?.chargeDirY) || 0;
  if (!player?.chargeActive || (Math.abs(dirX) + Math.abs(dirY) < 0.0001)) {
    dirX = Number(player?.vx) || 0;
    dirY = Number(player?.vy) || 0;
  }
  if (Math.abs(dirX) + Math.abs(dirY) < 0.0001 && !isMoving) {
    return fallbackAngle;
  }

  return getPracticeSpriteFacingAngleFromVector(dirX, dirY, fallbackAngle);
}

function drawPracticeSpriteFrame(
  spriteSheet,
  sourceX,
  sourceY,
  drawX,
  drawY,
  drawWidth,
  drawHeight,
  facingAngle = 0,
  sourceFrameWidth = PRACTICE_PLAYER_SPRITE_FRAME_WIDTH,
  sourceFrameHeight = PRACTICE_PLAYER_SPRITE_FRAME_HEIGHT
) {
  if (!spriteSheet) return;

  const centerX = drawX + (drawWidth * 0.5);
  const centerY = drawY + (drawHeight * 0.5);
  const angle = Number.isFinite(Number(facingAngle)) ? Number(facingAngle) : 0;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);

  ctx.drawImage(
    spriteSheet,
    sourceX,
    sourceY,
    sourceFrameWidth,
    sourceFrameHeight,
    -drawWidth * 0.5,
    -drawHeight * 0.5,
    drawWidth,
    drawHeight
  );

  ctx.restore();
}

function updatePracticePlayerChargeTrailSamples(chargeActive, dtSec, drawX, drawY, sourceX, sourceY, facingAngle) {
  const runtime = practicePlayerSpriteRuntime;
  const safeDt = Math.max(0, Number(dtSec) || 0);

  if (!chargeActive) {
    if (runtime.chargeTrailWasActive) {
      runtime.chargeTrailWasActive = false;
      runtime.chargeTrailSampleTimerSec = 0;
      runtime.chargeTrailFadeRemainingSec = PRACTICE_PLAYER_CHARGE_TRAIL_FADE_OUT_SEC;
    }

    if (runtime.chargeTrailFadeRemainingSec > 0) {
      runtime.chargeTrailFadeRemainingSec = Math.max(0, runtime.chargeTrailFadeRemainingSec - safeDt);
      if (runtime.chargeTrailFadeRemainingSec <= 0) {
        runtime.chargeTrailSamples = [];
      }
    } else if (runtime.chargeTrailSamples.length) {
      runtime.chargeTrailSamples = [];
    }
    return;
  }

  const safeX = Number(drawX) || 0;
  const safeY = Number(drawY) || 0;
  runtime.chargeTrailFadeRemainingSec = PRACTICE_PLAYER_CHARGE_TRAIL_FADE_OUT_SEC;

  let trailDirX = Number(player.chargeDirX) || 0;
  let trailDirY = Number(player.chargeDirY) || 0;
  if (Math.hypot(trailDirX, trailDirY) < 0.001) {
    trailDirX = Number(player.vx) || 0;
    trailDirY = Number(player.vy) || 0;
  }
  const liveTrailDir = normalized(trailDirX, trailDirY);
  runtime.chargeTrailDirX = liveTrailDir.x;
  runtime.chargeTrailDirY = liveTrailDir.y;

  if (!runtime.chargeTrailWasActive) {
    runtime.chargeTrailWasActive = true;
    runtime.chargeTrailSampleTimerSec = 0;
    runtime.chargeTrailSamples = [{
      x: safeX,
      y: safeY,
      sourceX: Number(sourceX) || 0,
      sourceY: Number(sourceY) || 0,
      facingAngle: Number.isFinite(Number(facingAngle))
        ? Number(facingAngle)
        : (Number.isFinite(Number(runtime.facingAngle)) ? Number(runtime.facingAngle) : 0),
    }];
    runtime.chargeTrailLastSampleX = safeX;
    runtime.chargeTrailLastSampleY = safeY;
    return;
  }

  runtime.chargeTrailSampleTimerSec += safeDt;
  if (runtime.chargeTrailSampleTimerSec < PRACTICE_PLAYER_CHARGE_TRAIL_SAMPLE_INTERVAL_SEC) return;

  let sampleCount = Math.floor(
    runtime.chargeTrailSampleTimerSec / PRACTICE_PLAYER_CHARGE_TRAIL_SAMPLE_INTERVAL_SEC
  );
  runtime.chargeTrailSampleTimerSec -= sampleCount * PRACTICE_PLAYER_CHARGE_TRAIL_SAMPLE_INTERVAL_SEC;

  while (sampleCount > 0) {
    sampleCount -= 1;

    const dx = safeX - runtime.chargeTrailLastSampleX;
    const dy = safeY - runtime.chargeTrailLastSampleY;
    const minDist = Math.max(
      PRACTICE_PLAYER_CHARGE_TRAIL_MIN_SAMPLE_DISTANCE,
      PRACTICE_PLAYER_CHARGE_TRAIL_SPACING * 0.5
    );
    if (Math.hypot(dx, dy) < minDist) continue;

    runtime.chargeTrailSamples.push({
      x: safeX,
      y: safeY,
      sourceX: Number(sourceX) || 0,
      sourceY: Number(sourceY) || 0,
      facingAngle: Number.isFinite(Number(facingAngle))
        ? Number(facingAngle)
        : (Number.isFinite(Number(runtime.facingAngle)) ? Number(runtime.facingAngle) : 0),
    });

    if (runtime.chargeTrailSamples.length > PRACTICE_PLAYER_CHARGE_TRAIL_COPIES) {
      runtime.chargeTrailSamples.shift();
    }

    runtime.chargeTrailLastSampleX = safeX;
    runtime.chargeTrailLastSampleY = safeY;
  }
}

function drawPracticePlayerChargeTrail(spriteSheet, drawWidth, drawHeight, drawX, drawY, sourceX, sourceY, facingAngle) {
  const runtime = practicePlayerSpriteRuntime;
  const samples = practicePlayerSpriteRuntime.chargeTrailSamples;
  const total = samples.length;
  if (!total) return;

  const fadeRatio = player.chargeActive
    ? 1
    : Math.max(
      0,
      Math.min(1, (runtime.chargeTrailFadeRemainingSec || 0) / PRACTICE_PLAYER_CHARGE_TRAIL_FADE_OUT_SEC)
    );
  if (fadeRatio <= 0) return;

  let trailDirX = Number(runtime.chargeTrailDirX) || 0;
  let trailDirY = Number(runtime.chargeTrailDirY) || 0;
  const trailDir = normalized(trailDirX, trailDirY);

  for (let i = 0; i < PRACTICE_PLAYER_CHARGE_TRAIL_COPIES; i += 1) {
    const fromSampleIndex = total - PRACTICE_PLAYER_CHARGE_TRAIL_COPIES + i;
    const sample = fromSampleIndex >= 0
      ? samples[fromSampleIndex]
      : null;
    const slot = i + 1;
    const t = slot / PRACTICE_PLAYER_CHARGE_TRAIL_COPIES;
    const alpha = 0.14 + (0.26 * t);

    const px = sample
      ? sample.x
      : (drawX - (trailDir.x * PRACTICE_PLAYER_CHARGE_TRAIL_SPACING * (PRACTICE_PLAYER_CHARGE_TRAIL_COPIES - i)));
    const py = sample
      ? sample.y
      : (drawY - (trailDir.y * PRACTICE_PLAYER_CHARGE_TRAIL_SPACING * (PRACTICE_PLAYER_CHARGE_TRAIL_COPIES - i)));
    const sx = sample ? sample.sourceX : sourceX;
    const sy = sample ? sample.sourceY : sourceY;
    const sampleFacingAngle = Number.isFinite(Number(sample?.facingAngle))
      ? Number(sample.facingAngle)
      : (Number.isFinite(Number(facingAngle))
        ? Number(facingAngle)
        : (Number.isFinite(Number(runtime.facingAngle)) ? Number(runtime.facingAngle) : 0));

    ctx.save();
    const boostedAlpha = (alpha * fadeRatio) * PRACTICE_PLAYER_CHARGE_TRAIL_ALPHA_MULTIPLIER;
    ctx.globalAlpha = Math.max(0.1, Math.min(0.58, boostedAlpha));
    drawPracticeSpriteFrame(
      spriteSheet,
      sx,
      sy,
      px,
      py,
      drawWidth,
      drawHeight,
      sampleFacingAngle
    );
    ctx.restore();
  }
}

function drawPracticePlayerSpriteGroundShadow(actorX, actorY, actorRadius, options = {}) {
  const safeX = Number(actorX) || 0;
  const safeY = Number(actorY) || 0;
  const safeRadius = Math.max(10, Number(actorRadius) || 18);
  const safeFacingAngle = Number.isFinite(Number(options.facingAngle))
    ? Number(options.facingAngle)
    : 0;
  const drawHeight = Number.isFinite(Number(options.drawHeight)) && Number(options.drawHeight) > 0
    ? Number(options.drawHeight)
    : getArenaSpriteDrawHeight();
  const explicitShadowX = Number(options.shadowX);
  const explicitShadowY = Number(options.shadowY);
  const explicitShadowRadius = Number(options.shadowRadius);
  const shadowOffsetY = Number.isFinite(Number(options.shadowOffsetY))
    ? Number(options.shadowOffsetY)
    : 0;
  const centerToFeet = Math.max(2, drawHeight * Math.max(0, PRACTICE_PLAYER_SPRITE_FEET_ORIGIN_Y - 0.5));
  const overlayAnchorOffsetY = getArenaSpriteOverlayAnchorOffsetY();

  // By default, anchor to rotating feet. When explicit shadow coordinates are provided,
  // pin the shadow directly under the current sprite feet position.
  const hasExplicitShadowAnchor = Number.isFinite(explicitShadowX) && Number.isFinite(explicitShadowY);
  const shadowX = hasExplicitShadowAnchor
    ? explicitShadowX
    : (safeX - (Math.sin(safeFacingAngle) * centerToFeet));
  const shadowY = hasExplicitShadowAnchor
    ? (explicitShadowY + shadowOffsetY)
    : (safeY + overlayAnchorOffsetY + ((Math.cos(safeFacingAngle) - 1) * centerToFeet) + getArenaSpriteShadowFootOffsetY(drawHeight) + shadowOffsetY);
  const shadowRadius = Number.isFinite(explicitShadowRadius) && explicitShadowRadius > 0
    ? explicitShadowRadius
    : Math.max(8, safeRadius * 0.78);
  const gradient = ctx.createRadialGradient(
    shadowX,
    shadowY,
    shadowRadius * 0.2,
    shadowX,
    shadowY,
    shadowRadius * 1.25
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.46)');
  gradient.addColorStop(0.72, 'rgba(0, 0, 0, 0.24)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(shadowX, shadowY, shadowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPracticePlayerBaseCircle(actorX, actorY, actorRadius) {
  const overlayAnchorOffsetY = getArenaSpriteOverlayAnchorOffsetY();
  const anchorY = actorY + overlayAnchorOffsetY;
  const radiusBoost = getArenaSpriteOverlayRadiusBoost();
  const innerRadius = (actorRadius + 4 + radiusBoost) * ARENA_ACTOR_RING_RADIUS_SCALE;
  const outerRadius = (actorRadius + 8 + radiusBoost) * ARENA_ACTOR_RING_RADIUS_SCALE;
  ctx.save();
  ctx.strokeStyle = 'rgba(112, 245, 143, 0.82)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(actorX, anchorY, innerRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(112, 245, 143, 0.26)';
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.arc(actorX, anchorY, outerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPracticePlayerSpriteBody() {
  if (!isPracticeRoomSpritePlayerEnabled()) {
    resetPracticePlayerSpriteAnimationState();
    return false;
  }

  const actorX = Number(player?.x) || 0;
  const actorY = Number(player?.y) || 0;
  const actorRadius = Math.max(10, Number(player?.r) || 18);
  const multiplayerArena = !!getMultiplayerArenaRuntimeVisualState();
  const dtSec = getPracticePlayerSpriteDeltaSec();
  const isMoving = isPracticePlayerSpriteMoving(dtSec);
  const facingAngle = resolvePracticePlayerSpriteFacingAngle(isMoving);
  const drawHeight = getArenaSpriteDrawHeight();
  const drawWidth = Math.max(
    2,
    Math.round((PRACTICE_PLAYER_SPRITE_FRAME_WIDTH / PRACTICE_PLAYER_SPRITE_FRAME_HEIGHT) * drawHeight)
  );

  // Draw the readability ring first, then shadow, so the shadow sits directly
  // under Nyra instead of getting buried behind the ring.
  if (!multiplayerArena) {
    drawPracticePlayerBaseCircle(actorX, actorY, actorRadius);
  }

  const nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);
  const hitSpriteSheet = getPracticePlayerHitSpriteSheet();
  const hitActive = !!hitSpriteSheet && isArenaActorHitSpriteActive(player, nowSec);
  const dashSpriteSheet = getPracticePlayerDashSpriteSheet();
  const dashActive = !!dashSpriteSheet && isArenaActorDashSpriteActive(player, nowSec);
  const castSpriteSheet = getPracticePlayerCastSpriteSheet();
  const castActive = !!castSpriteSheet && isArenaActorCastSpriteActive(player, nowSec);
  const idleSpriteSheet = getPracticePlayerIdleSpriteSheet();
  const idleActive = !hitActive && !dashActive && !castActive && !isMoving && !!idleSpriteSheet;
  const spriteSheet = hitActive
    ? hitSpriteSheet
    : (dashActive
      ? dashSpriteSheet
      : (castActive ? castSpriteSheet : (idleActive ? idleSpriteSheet : getPracticePlayerSpriteSheet())));
  if (!spriteSheet) return true;

  const frameWidth = hitActive
    ? PRACTICE_PLAYER_HIT_SPRITE_FRAME_WIDTH
    : (dashActive
      ? PRACTICE_PLAYER_DASH_SPRITE_FRAME_WIDTH
      : (castActive
      ? PRACTICE_PLAYER_CAST_SPRITE_FRAME_WIDTH
      : (idleActive ? PRACTICE_PLAYER_IDLE_SPRITE_FRAME_WIDTH : PRACTICE_PLAYER_SPRITE_FRAME_WIDTH)));
  const frameHeight = hitActive
    ? PRACTICE_PLAYER_HIT_SPRITE_FRAME_HEIGHT
    : (dashActive
      ? PRACTICE_PLAYER_DASH_SPRITE_FRAME_HEIGHT
      : (castActive
      ? PRACTICE_PLAYER_CAST_SPRITE_FRAME_HEIGHT
      : (idleActive ? PRACTICE_PLAYER_IDLE_SPRITE_FRAME_HEIGHT : PRACTICE_PLAYER_SPRITE_FRAME_HEIGHT)));
  const framesPerRow = hitActive
    ? PRACTICE_PLAYER_HIT_SPRITE_FRAMES_PER_ROW
    : (dashActive
      ? PRACTICE_PLAYER_DASH_SPRITE_FRAMES_PER_ROW
      : (castActive
      ? PRACTICE_PLAYER_CAST_SPRITE_FRAMES_PER_ROW
      : (idleActive ? PRACTICE_PLAYER_IDLE_SPRITE_FRAMES_PER_ROW : PRACTICE_PLAYER_SPRITE_FRAMES_PER_ROW)));
  const frame = hitActive
    ? getArenaActorHitSpriteFrameIndex(player, nowSec)
    : (dashActive
      ? getArenaActorDashSpriteFrameIndex(practicePlayerSpriteRuntime, true, dtSec)
      : (castActive
      ? getArenaActorCastSpriteFrameIndex(player, nowSec)
      : (idleActive
        ? getArenaActorIdleSpriteFrameIndex(practicePlayerSpriteRuntime, true, dtSec)
        : getPracticePlayerSpriteFrameIndex(isMoving, dtSec))));
  if (!dashActive) {
    getArenaActorDashSpriteFrameIndex(practicePlayerSpriteRuntime, false, dtSec);
  }
  if (!idleActive) {
    getArenaActorIdleSpriteFrameIndex(practicePlayerSpriteRuntime, false, dtSec);
  } else {
    getPracticePlayerSpriteFrameIndex(false, dtSec);
  }
  const frameColumn = frame % framesPerRow;
  const frameRow = Math.floor(frame / framesPerRow);
  const sourceX = frameColumn * frameWidth;
  const sourceY = frameRow * frameHeight;
  const drawX = actorX - (drawWidth * 0.5);
  const nyraVisualYOffset = ARENA_NYRA_VISUAL_Y_OFFSET_PX;
  const drawY = getArenaSpriteTopY(actorY, drawHeight) + nyraVisualYOffset;
  practicePlayerSpriteRuntime.facingAngle = facingAngle;
  drawPracticePlayerSpriteGroundShadow(actorX, actorY, actorRadius, {
    facingAngle,
    drawHeight,
    shadowOffsetY: nyraVisualYOffset,
    shadowRadius: Math.max(8, actorRadius * 0.82),
  });

  if (!castActive && !hitActive) {
    // During Arcane Charge in local practice, keep a short queue of
    // sampled positions so the afterimages appear one-by-one behind the player.
    updatePracticePlayerChargeTrailSamples(
      player.chargeActive,
      dtSec,
      drawX,
      drawY,
      sourceX,
      sourceY,
      facingAngle
    );
    if (
      practicePlayerSpriteRuntime.chargeTrailSamples.length > 0
      && (player.chargeActive || practicePlayerSpriteRuntime.chargeTrailFadeRemainingSec > 0)
    ) {
      drawPracticePlayerChargeTrail(
        spriteSheet,
        drawWidth,
        drawHeight,
        drawX,
        drawY,
        sourceX,
        sourceY,
        facingAngle
      );
    }
  }

  drawPracticeSpriteFrame(
    spriteSheet,
    sourceX,
    sourceY,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
    facingAngle,
    frameWidth,
    frameHeight
  );

  return true;
}

function drawPracticeDummySpriteBody() {
  if (!isPracticeRoomSpritePlayerEnabled()) {
    resetPracticeDummySpriteAnimationState();
    return false;
  }
  if (!dummyEnabled || !dummy?.alive) {
    resetPracticeDummySpriteAnimationState();
    return false;
  }

  const nowSec = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);
  const hitSpriteSheet = getPracticePlayerHitSpriteSheet();
  const hitActive = !!hitSpriteSheet && isArenaActorHitSpriteActive(dummy, nowSec);
  const dashSpriteSheet = getPracticePlayerDashSpriteSheet();
  const dashActive = !!dashSpriteSheet && isArenaActorDashSpriteActive(dummy, nowSec);
  const castSpriteSheet = getPracticePlayerCastSpriteSheet();
  const castActive = !!castSpriteSheet && isArenaActorCastSpriteActive(dummy, nowSec);
  const idleSpriteSheet = getPracticePlayerIdleSpriteSheet();

  const actorX = Number(dummy?.x) || 0;
  const actorY = Number(dummy?.y) || 0;
  const actorRadius = Math.max(10, Number(dummy?.r) || 18);

  const dtSec = getArenaActorSpriteDeltaSec(practiceDummySpriteRuntime);
  const isMoving = isArenaActorSpriteMoving(dummy, practiceDummySpriteRuntime, dtSec);
  const idleActive = !hitActive && !dashActive && !castActive && !isMoving && !!idleSpriteSheet;
  const facingAngle = resolveArenaActorSpriteFacingAngle(dummy, practiceDummySpriteRuntime, isMoving);
  const drawHeight = getArenaSpriteDrawHeight();
  const drawWidth = Math.max(
    2,
    Math.round((PRACTICE_PLAYER_SPRITE_FRAME_WIDTH / PRACTICE_PLAYER_SPRITE_FRAME_HEIGHT) * drawHeight)
  );
  const frameWidth = hitActive
    ? PRACTICE_PLAYER_HIT_SPRITE_FRAME_WIDTH
    : (dashActive
      ? PRACTICE_PLAYER_DASH_SPRITE_FRAME_WIDTH
      : (castActive
      ? PRACTICE_PLAYER_CAST_SPRITE_FRAME_WIDTH
      : (idleActive ? PRACTICE_PLAYER_IDLE_SPRITE_FRAME_WIDTH : PRACTICE_PLAYER_SPRITE_FRAME_WIDTH)));
  const frameHeight = hitActive
    ? PRACTICE_PLAYER_HIT_SPRITE_FRAME_HEIGHT
    : (dashActive
      ? PRACTICE_PLAYER_DASH_SPRITE_FRAME_HEIGHT
      : (castActive
      ? PRACTICE_PLAYER_CAST_SPRITE_FRAME_HEIGHT
      : (idleActive ? PRACTICE_PLAYER_IDLE_SPRITE_FRAME_HEIGHT : PRACTICE_PLAYER_SPRITE_FRAME_HEIGHT)));
  const framesPerRow = hitActive
    ? PRACTICE_PLAYER_HIT_SPRITE_FRAMES_PER_ROW
    : (dashActive
      ? PRACTICE_PLAYER_DASH_SPRITE_FRAMES_PER_ROW
      : (castActive
      ? PRACTICE_PLAYER_CAST_SPRITE_FRAMES_PER_ROW
      : (idleActive ? PRACTICE_PLAYER_IDLE_SPRITE_FRAMES_PER_ROW : PRACTICE_PLAYER_SPRITE_FRAMES_PER_ROW)));
  const frame = hitActive
    ? getArenaActorHitSpriteFrameIndex(dummy, nowSec)
    : (dashActive
      ? getArenaActorDashSpriteFrameIndex(practiceDummySpriteRuntime, true, dtSec)
      : (castActive
      ? getArenaActorCastSpriteFrameIndex(dummy, nowSec)
      : (idleActive
        ? getArenaActorIdleSpriteFrameIndex(practiceDummySpriteRuntime, true, dtSec)
        : getArenaActorSpriteFrameIndex(practiceDummySpriteRuntime, isMoving, dtSec))));
  if (!dashActive) {
    getArenaActorDashSpriteFrameIndex(practiceDummySpriteRuntime, false, dtSec);
  }
  if (!idleActive) {
    getArenaActorIdleSpriteFrameIndex(practiceDummySpriteRuntime, false, dtSec);
  } else {
    getArenaActorSpriteFrameIndex(practiceDummySpriteRuntime, false, dtSec);
  }
  const frameColumn = frame % framesPerRow;
  const frameRow = Math.floor(frame / framesPerRow);
  const sourceX = frameColumn * frameWidth;
  const sourceY = frameRow * frameHeight;
  const activeSpriteSheet = hitActive
    ? hitSpriteSheet
    : (dashActive
      ? dashSpriteSheet
      : (castActive
      ? castSpriteSheet
      : (idleActive ? idleSpriteSheet : getPracticePlayerSpriteSheet())));
  if (!activeSpriteSheet) return true;
  const drawX = actorX - (drawWidth * 0.5);
  const drawY = getArenaSpriteTopY(actorY, drawHeight);
  practiceDummySpriteRuntime.facingAngle = facingAngle;
  drawPracticePlayerSpriteGroundShadow(actorX, actorY, actorRadius, {
    facingAngle,
    drawHeight,
    shadowRadius: Math.max(8, actorRadius * 0.82),
  });

  drawPracticeSpriteFrame(
    activeSpriteSheet,
    sourceX,
    sourceY,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
    facingAngle,
    frameWidth,
    frameHeight
  );

  return true;
}

const lavaRenderCache = {
  staticCanvas: null,
  staticCtx: null,
  dynamicCanvas: null,
  dynamicCtx: null,
  staticKey: '',
  dynamicKey: '',
  lastDynamicUpdateSec: 0,
  lastPerformanceMode: null,
};

const ARENA_LAVA_BG_IMAGE_PATH = '/docs/art/draft/lava.jpeg';
const ARENA_PLATFORM_IMAGE_PATH = '/docs/art/draft/arena_platform.png';
const ARENA_PLATFORM_DEPTH_FX_DEFAULT_ENABLED = true;
const ARENA_PLATFORM_OCTAGON_HALF_WIDTH_SCALE = 1.0588235294117647;
const ARENA_PLATFORM_OCTAGON_CORNER_LIMIT_SCALE = 1.715032679738562;
const arenaLavaBackgroundImageCache = {
  src: '',
  loaded: false,
  failed: false,
  img: null,
};
const arenaPlatformImageCache = {
  src: '',
  loaded: false,
  failed: false,
  img: null,
  alphaBounds: null,
};

function getArenaFloorVisualOffsetY() {
  const configured = Number(window.OUTRA_VISUAL_CONFIG?.arenaFloor?.visualOffsetY);
  return Number.isFinite(configured) ? configured : 0;
}

function getArenaPlatformVisualOffsetY() {
  const configured = Number(window.OUTRA_VISUAL_CONFIG?.arenaFloor?.platformVisualOffsetY);
  return Number.isFinite(configured) ? configured : getArenaFloorVisualOffsetY();
}

const STONE_ATLAS_IMAGE_PATH = '/docs/art/draft/stones.png';
const ARENA_FLOATING_STONE_COUNT = 5;
const STONE_ATLAS_REGIONS = Object.freeze([
  Object.freeze({ id: 'boulder_west_01', x: 2, y: 9, w: 320, h: 238, weight: 0.9 }),
  Object.freeze({ id: 'boulder_center_01', x: 190, y: 180, w: 209, h: 174, weight: 1.0 }),
  Object.freeze({ id: 'boulder_southwest_01', x: 6, y: 252, w: 176, h: 187, weight: 1.0 }),
  Object.freeze({ id: 'boulder_east_01', x: 324, y: 8, w: 176, h: 153, weight: 1.0 }),
  Object.freeze({ id: 'chunk_east_mid_01', x: 365, y: 305, w: 128, h: 126, weight: 1.05 }),
  Object.freeze({ id: 'chunk_north_mid_01', x: 181, y: 351, w: 128, h: 117, weight: 1.1 }),
  Object.freeze({ id: 'chunk_east_02', x: 398, y: 160, w: 102, h: 124, weight: 1.15 }),
  Object.freeze({ id: 'chunk_west_02', x: 12, y: 199, w: 75, h: 72, weight: 1.2 }),
  Object.freeze({ id: 'pebble_north_01', x: 300, y: 127, w: 58, h: 53, weight: 1.22 }),
  Object.freeze({ id: 'pebble_north_02', x: 342, y: 392, w: 52, h: 53, weight: 1.2 }),
  Object.freeze({ id: 'pebble_north_03', x: 306, y: 348, w: 50, h: 51, weight: 1.2 }),
  Object.freeze({ id: 'pebble_west_01', x: 4, y: 159, w: 39, h: 43, weight: 1.15 }),
  Object.freeze({ id: 'pebble_south_01', x: 32, y: 415, w: 39, h: 38, weight: 1.15 }),
  Object.freeze({ id: 'pebble_east_01', x: 460, y: 284, w: 32, h: 39, weight: 1.1 }),
  Object.freeze({ id: 'pebble_mid_01', x: 149, y: 259, w: 34, h: 34, weight: 1.12 }),
  Object.freeze({ id: 'pebble_mid_02', x: 311, y: 425, w: 30, h: 33, weight: 1.08 }),
  Object.freeze({ id: 'pebble_mid_03', x: 143, y: 431, w: 30, h: 31, weight: 1.06 }),
  Object.freeze({ id: 'pebble_mid_04', x: 395, y: 438, w: 29, h: 28, weight: 1.02 }),
  Object.freeze({ id: 'pebble_mid_05', x: 12, y: 380, w: 28, h: 26, weight: 1.0 }),
  Object.freeze({ id: 'pebble_mid_06', x: 195, y: 311, w: 27, h: 25, weight: 1.0 }),
]);
const ARENA_FLOATING_STONE_ANCHORS = Object.freeze([
  Object.freeze({ side: 'west', angle: 2.72, radiusMul: 1.44 }),
  Object.freeze({ side: 'west', angle: 2.94, radiusMul: 1.54 }),
  Object.freeze({ side: 'west', angle: 3.18, radiusMul: 1.62 }),
  Object.freeze({ side: 'west', angle: 3.42, radiusMul: 1.46 }),
  Object.freeze({ side: 'east', angle: -0.46, radiusMul: 1.46 }),
  Object.freeze({ side: 'east', angle: -0.16, radiusMul: 1.58 }),
  Object.freeze({ side: 'east', angle: 0.12, radiusMul: 1.64 }),
  Object.freeze({ side: 'east', angle: 0.35, radiusMul: 1.48 }),
  Object.freeze({ side: 'north', angle: -2.04, radiusMul: 1.42 }),
  Object.freeze({ side: 'north', angle: -1.80, radiusMul: 1.62 }),
  Object.freeze({ side: 'north', angle: -1.58, radiusMul: 1.72 }),
  Object.freeze({ side: 'north', angle: -1.32, radiusMul: 1.64 }),
  Object.freeze({ side: 'north', angle: -1.08, radiusMul: 1.48 }),
]);

function hashStringToUint32(text) {
  const input = String(text || '');
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createDeterministicRandom(seedKey) {
  let state = (hashStringToUint32(seedKey) ^ 0x9e3779b9) >>> 0;
  if (state === 0) state = 0x6d2b79f5;

  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getArenaFrameContext() {
  if (typeof window === 'undefined') return null;
  const context = window.__OUTRA_FRAME_CONTEXT;
  if (!context || typeof context !== 'object') return null;
  return context;
}

function getArenaFrameTimeSec(fallbackSec = (performance.now() * 0.001)) {
  const context = getArenaFrameContext();
  const contextTimeSec = Number(context?.nowSec);
  if (Number.isFinite(contextTimeSec) && contextTimeSec >= 0) {
    return contextTimeSec;
  }
  return Number.isFinite(Number(fallbackSec))
    ? Number(fallbackSec)
    : (performance.now() * 0.001);
}

function getArenaFrameId() {
  const context = getArenaFrameContext();
  const contextId = Number(context?.id);
  if (!Number.isFinite(contextId) || contextId <= 0) return null;
  return Math.floor(contextId);
}

class ArenaFloatingStones {
  constructor() {
    this.mode = '';
    this.matchKey = '';
    this.localMatchCounter = 0;
    this.instances = [];
    this.atlasCache = {
      src: '',
      loaded: false,
      failed: false,
      img: null,
    };
    this.frameCache = {
      frameId: null,
      timeSec: 0,
      mode: '',
      matchKey: '',
      layouts: [],
      hitCircles: null,
    };
  }

  getAtlasPath() {
    const configuredPath = window.OUTRA_VISUAL_CONFIG?.arenaFloatingStones?.image;
    const path = typeof configuredPath === 'string' && configuredPath.trim()
      ? configuredPath.trim()
      : STONE_ATLAS_IMAGE_PATH;
    return String(path || '').trim();
  }

  getAtlasImage() {
    const path = this.getAtlasPath();
    if (!path) return null;

    const cache = this.atlasCache;
    if (cache.src === path && cache.img) {
      return cache.loaded ? cache.img : null;
    }

    const img = new Image();
    cache.src = path;
    cache.loaded = false;
    cache.failed = false;
    cache.img = img;
    img.decoding = 'async';

    img.onload = () => {
      if (this.atlasCache.img !== img) return;
      this.atlasCache.loaded = true;
      this.atlasCache.failed = false;
    };

    img.onerror = () => {
      if (this.atlasCache.img !== img) return;
      this.atlasCache.loaded = false;
      this.atlasCache.failed = true;
    };

    img.src = path;
    return null;
  }

  getAtlasState() {
    const path = this.getAtlasPath();
    if (!path) return 'atlas:none';

    const cache = this.atlasCache;
    if (cache.src !== path || !cache.img) return `${path}|init`;
    if (cache.loaded) return `${path}|ready`;
    if (cache.failed) return `${path}|failed`;
    return `${path}|loading`;
  }

  getCacheState() {
    return [
      this.getAtlasState(),
      this.mode || 'none',
      this.matchKey || 'none',
      this.instances.length,
    ].join('|');
  }

  invalidateFrameCache() {
    this.frameCache.frameId = null;
    this.frameCache.timeSec = 0;
    this.frameCache.mode = '';
    this.frameCache.matchKey = '';
    this.frameCache.layouts = [];
    this.frameCache.hitCircles = null;
  }

  clear() {
    this.instances.length = 0;
    this.mode = '';
    this.matchKey = '';
    this.invalidateFrameCache();
  }

  pickWeightedRegion(rng, pool) {
    if (!pool.length) return null;
    let totalWeight = 0;
    for (const region of pool) {
      totalWeight += Math.max(0.01, Number(region.weight) || 1);
    }

    let cursor = rng() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      const region = pool[i];
      cursor -= Math.max(0.01, Number(region.weight) || 1);
      if (cursor > 0 && i < pool.length - 1) continue;
      pool.splice(i, 1);
      return region;
    }

    return pool.pop() || null;
  }

  createInstances(rng, mode, matchKey) {
    const regions = STONE_ATLAS_REGIONS.slice();
    const anchors = ARENA_FLOATING_STONE_ANCHORS.slice();
    const instances = [];

    for (let i = 0; i < ARENA_FLOATING_STONE_COUNT; i++) {
      if (!regions.length || !anchors.length) break;
      const region = this.pickWeightedRegion(rng, regions);
      const anchorIndex = Math.floor(rng() * anchors.length);
      const anchor = anchors.splice(Math.max(0, Math.min(anchorIndex, anchors.length - 1)), 1)[0];
      if (!region || !anchor) continue;

      const area = Math.max(1, region.w * region.h);
      let scaleBase = 0.3 + (rng() * 0.16);
      if (area < 7000) scaleBase = 0.56 + (rng() * 0.24);
      else if (area < 18000) scaleBase = 0.42 + (rng() * 0.2);

      instances.push({
        region,
        side: anchor.side,
        angle: anchor.angle + ((rng() - 0.5) * 0.14),
        radiusMul: anchor.radiusMul + ((rng() - 0.5) * 0.08),
        scale: scaleBase,
        alpha: 1,
        phase: rng() * Math.PI * 2,
        floatSpeed: 0.34 + (rng() * 0.38),
        floatAmp: 5 + (rng() * 8),
        driftSpeed: 0.11 + (rng() * 0.16),
        driftAmpX: 5 + (rng() * 12),
        driftAmpY: 3 + (rng() * 8),
        tilt: (rng() - 0.5) * 0.22,
        rotAmp: 0.01 + (rng() * 0.026),
        rotSpeed: 0.16 + (rng() * 0.17),
        pulseSpeed: 0.45 + (rng() * 0.3),
      });
    }

    this.instances = instances;
    this.mode = mode;
    this.matchKey = matchKey;
    this.invalidateFrameCache();
  }

  resetForMatch(options = {}) {
    const isMultiplayer = options.mode === 'multiplayer';
    const mode = isMultiplayer ? 'multiplayer' : 'local';
    const rawMatchId = String(options.matchId || '').trim();
    const deterministic = options.deterministic === true;

    let matchKey = '';
    if (isMultiplayer && rawMatchId) {
      matchKey = `mp:${rawMatchId}`;
    } else if (!isMultiplayer && rawMatchId) {
      matchKey = `local:${rawMatchId}`;
    } else if (isMultiplayer) {
      if (this.mode === 'multiplayer' && this.matchKey.startsWith('mp:fallback:')) {
        matchKey = this.matchKey;
      } else {
        this.localMatchCounter += 1;
        matchKey = `mp:fallback:${Date.now().toString(36)}:${this.localMatchCounter}`;
      }
    } else {
      this.localMatchCounter += 1;
      matchKey = `local:match:${this.localMatchCounter}`;
    }

    const alreadyBuilt = this.mode === mode && this.matchKey === matchKey && this.instances.length === ARENA_FLOATING_STONE_COUNT;
    if (alreadyBuilt) return;

    const rng = deterministic
      ? createDeterministicRandom(`arena-floating-stones|${matchKey}`)
      : Math.random;
    this.createInstances(rng, mode, matchKey);
  }

  ensureForArenaFrame(multiplayerSnapshot) {
    if (multiplayerSnapshot && multiplayerSnapshot.active && multiplayerSnapshot.isArenaActive) {
      const matchId = String(multiplayerSnapshot.matchId || '').trim();
      this.resetForMatch({
        mode: 'multiplayer',
        matchId,
        deterministic: !!matchId,
      });
      return;
    }

    const localArenaActive = typeof gameState === 'string' && (gameState === 'playing' || gameState === 'result');
    if (localArenaActive) {
      if (this.mode !== 'local' || this.instances.length !== ARENA_FLOATING_STONE_COUNT) {
        this.resetForMatch({ mode: 'local', deterministic: false });
      }
      return;
    }

    this.clear();
  }

  computeStoneLayouts(timeSec = (performance.now() * 0.001)) {
    if (!this.instances.length) return [];

    const now = Number.isFinite(Number(timeSec)) ? Number(timeSec) : (performance.now() * 0.001);
    const baseRadius = Math.max(1, Number(arena.baseRadius) || Number(arena.radius) || 1);
    const radiusScale = Math.max(0.78, Math.min(1.3, baseRadius / 330));
    const layouts = [];

    for (const stone of this.instances) {
      const region = stone?.region;
      if (!region) continue;

      const orbitRadius = baseRadius * stone.radiusMul;
      const baseX = arena.cx + (Math.cos(stone.angle) * orbitRadius);
      const baseY = arena.cy + (Math.sin(stone.angle) * orbitRadius);
      const driftX = Math.sin((now * stone.driftSpeed) + stone.phase) * stone.driftAmpX;
      const driftY = Math.cos((now * stone.driftSpeed * 0.85) + (stone.phase * 1.13)) * stone.driftAmpY;
      const floatY = Math.sin((now * stone.floatSpeed) + (stone.phase * 1.7)) * stone.floatAmp;
      const pulse = 1 + (Math.sin((now * stone.pulseSpeed) + (stone.phase * 0.7)) * 0.028);

      const drawScale = stone.scale * radiusScale * pulse;
      const drawW = Math.max(22, region.w * drawScale);
      const drawH = Math.max(20, region.h * drawScale);
      const drawX = baseX + driftX;
      const drawY = baseY + driftY + floatY;
      const angle = stone.tilt + (Math.sin((now * stone.rotSpeed) + stone.phase) * stone.rotAmp);

      layouts.push({
        stone,
        x: drawX,
        y: drawY,
        w: drawW,
        h: drawH,
        angle,
      });
    }

    return layouts;
  }

  prepareFrame(options = {}) {
    const hasExplicitTime =
      options &&
      options.timeSec != null &&
      Number.isFinite(Number(options.timeSec));
    const now = hasExplicitTime
      ? Number(options.timeSec)
      : getArenaFrameTimeSec();

    const explicitFrameId = Number(options?.frameId);
    const frameId = Number.isFinite(explicitFrameId)
      ? Math.floor(explicitFrameId)
      : (hasExplicitTime ? null : getArenaFrameId());

    const hasSnapshotOverride = Object.prototype.hasOwnProperty.call(options || {}, 'multiplayerSnapshot');
    const multiplayerSnapshot = hasSnapshotOverride
      ? options.multiplayerSnapshot
      : (typeof getMultiplayerArenaRuntimeVisualState === 'function'
        ? getMultiplayerArenaRuntimeVisualState()
        : null);
    this.ensureForArenaFrame(multiplayerSnapshot);

    const cache = this.frameCache;
    const sameStoneSet = cache.mode === this.mode && cache.matchKey === this.matchKey;
    const canReuseByFrameId =
      sameStoneSet &&
      Number.isFinite(frameId) &&
      cache.frameId === frameId;
    const canReuseByTime =
      sameStoneSet &&
      frameId == null &&
      cache.frameId == null &&
      Math.abs((Number(cache.timeSec) || 0) - now) <= 0.000001;
    if (canReuseByFrameId || canReuseByTime) {
      return cache;
    }

    cache.frameId = Number.isFinite(frameId) ? frameId : null;
    cache.timeSec = now;
    cache.mode = this.mode;
    cache.matchKey = this.matchKey;
    cache.layouts = this.computeStoneLayouts(now);
    cache.hitCircles = null;
    return cache;
  }

  getStoneLayouts(timeSec = null, options = {}) {
    const safeOptions = options && typeof options === 'object' ? options : {};
    const cache = this.prepareFrame({ ...safeOptions, timeSec });
    return Array.isArray(cache.layouts) ? cache.layouts : [];
  }

  getHitCircles(timeSec = null, options = {}) {
    const safeOptions = options && typeof options === 'object' ? options : {};
    const cache = this.prepareFrame({ ...safeOptions, timeSec });
    if (Array.isArray(cache.hitCircles)) {
      return cache.hitCircles;
    }

    const layouts = Array.isArray(cache.layouts) ? cache.layouts : [];
    cache.hitCircles = layouts.map((entry) => ({
      x: entry.x,
      y: entry.y,
      // Use a compact hit radius so collisions feel intentional and readable.
      r: Math.max(10, Math.min(entry.w, entry.h) * 0.22),
      id: String(entry?.stone?.region?.id || ''),
    }));
    return cache.hitCircles;
  }

  draw(timeSec = null, options = {}) {
    const image = this.getAtlasImage();
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    const layouts = this.getStoneLayouts(timeSec, options);
    if (!layouts.length) return;

    ctx.save();
    for (const entry of layouts) {
      const stone = entry.stone;
      const region = stone?.region;
      if (!region) continue;

      ctx.save();
      ctx.translate(entry.x, entry.y);
      ctx.rotate(entry.angle);
      ctx.globalAlpha = stone.alpha;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.34)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(
        image,
        region.x, region.y, region.w, region.h,
        -entry.w * 0.5, -entry.h * 0.5, entry.w, entry.h
      );
      ctx.restore();
    }
    ctx.restore();
  }
}

const arenaFloatingStones = new ArenaFloatingStones();

function resetArenaFloatingStonesForMatchStart(options = {}) {
  arenaFloatingStones.resetForMatch(options);
}

function clearArenaFloatingStones() {
  arenaFloatingStones.clear();
}

function getArenaFloatingStoneHitCircles(timeSec = null, options = {}) {
  return arenaFloatingStones.getHitCircles(timeSec, options);
}

function getArenaLavaBackgroundImagePath() {
  const configuredPath = window.OUTRA_VISUAL_CONFIG?.arenaFloor?.lavaBackgroundImage;
  const path = typeof configuredPath === 'string' && configuredPath.trim()
    ? configuredPath.trim()
    : ARENA_LAVA_BG_IMAGE_PATH;
  return String(path || '').trim();
}

function getArenaLavaBackgroundImage() {
  const path = getArenaLavaBackgroundImagePath();
  if (!path) return null;

  const cached = arenaLavaBackgroundImageCache;
  if (cached.src === path && cached.img) {
    return cached.loaded ? cached.img : null;
  }

  const img = new Image();
  cached.src = path;
  cached.loaded = false;
  cached.failed = false;
  cached.img = img;
  img.decoding = 'async';

  img.onload = () => {
    if (arenaLavaBackgroundImageCache.img !== img) return;
    cached.loaded = true;
    cached.failed = false;
  };

  img.onerror = () => {
    if (arenaLavaBackgroundImageCache.img !== img) return;
    cached.loaded = false;
    cached.failed = true;
  };

  img.src = path;
  return null;
}

function getArenaLavaBackgroundImageCacheState() {
  const path = getArenaLavaBackgroundImagePath();
  if (!path) return 'none';

  const cached = arenaLavaBackgroundImageCache;
  if (cached.src !== path || !cached.img) return `${path}|init`;
  if (cached.loaded) return `${path}|ready`;
  if (cached.failed) return `${path}|failed`;
  return `${path}|loading`;
}

function drawArenaLavaBackgroundImage() {
  const image = getArenaLavaBackgroundImage();
  if (!image || !image.naturalWidth || !image.naturalHeight) return false;

  const sourceW = Math.max(1, Number(image.naturalWidth) || 1);
  const sourceH = Math.max(1, Number(image.naturalHeight) || 1);
  const targetW = Math.max(1, Number(canvas.width) || 1);
  const targetH = Math.max(1, Number(canvas.height) || 1);
  const visualOffsetY = getArenaFloorVisualOffsetY();
  const coverTargetH = targetH + (Math.abs(visualOffsetY) * 2);
  const scale = Math.max(targetW / sourceW, coverTargetH / sourceH);
  const drawW = sourceW * scale;
  const drawH = sourceH * scale;
  const drawX = (targetW - drawW) * 0.5;
  const drawY = ((targetH - drawH) * 0.5) + visualOffsetY;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();
  return true;
}

function getArenaPlatformImagePath() {
  const configuredPath = window.OUTRA_VISUAL_CONFIG?.arenaFloor?.image;
  const path = typeof configuredPath === 'string' && configuredPath.trim()
    ? configuredPath.trim()
    : ARENA_PLATFORM_IMAGE_PATH;
  return String(path || '').trim();
}

function getArenaPlatformImage() {
  const path = getArenaPlatformImagePath();
  if (!path) return null;

  const cached = arenaPlatformImageCache;
  if (cached.src === path && cached.img) {
    return cached.loaded ? cached.img : null;
  }

  const img = new Image();
  cached.src = path;
  cached.loaded = false;
  cached.failed = false;
  cached.img = img;
  cached.alphaBounds = null;
  img.decoding = 'async';

  img.onload = () => {
    if (arenaPlatformImageCache.img !== img) return;
    cached.loaded = true;
    cached.failed = false;
  };

  img.onerror = () => {
    if (arenaPlatformImageCache.img !== img) return;
    cached.loaded = false;
    cached.failed = true;
  };

  img.src = path;
  return null;
}

function getArenaPlatformImageCacheState() {
  const path = getArenaPlatformImagePath();
  if (!path) return 'none';

  const cached = arenaPlatformImageCache;
  if (cached.src !== path || !cached.img) return `${path}|init`;
  if (cached.loaded) return `${path}|ready`;
  if (cached.failed) return `${path}|failed`;
  return `${path}|loading`;
}

function resolveArenaPlatformImageDrawMetrics(centerX, centerY, radius) {
  const image = getArenaPlatformImage();
  if (!image || !image.naturalWidth || !image.naturalHeight) return null;

  const cached = arenaPlatformImageCache;
  let bounds = cached.alphaBounds;
  if (
    !bounds
    && cached.img === image
    && image.naturalWidth > 0
    && image.naturalHeight > 0
  ) {
    try {
      const probe = document.createElement('canvas');
      probe.width = image.naturalWidth;
      probe.height = image.naturalHeight;
      const probeCtx = probe.getContext('2d', { willReadFrequently: true });
      if (probeCtx) {
        probeCtx.clearRect(0, 0, probe.width, probe.height);
        probeCtx.drawImage(image, 0, 0);
        const pixels = probeCtx.getImageData(0, 0, probe.width, probe.height).data;
        let minX = probe.width;
        let minY = probe.height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < probe.height; y++) {
          for (let x = 0; x < probe.width; x++) {
            const alpha = pixels[((y * probe.width + x) * 4) + 3];
            if (alpha <= 8) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
        if (maxX >= minX && maxY >= minY) {
          bounds = {
            x: minX,
            y: minY,
            w: (maxX - minX + 1),
            h: (maxY - minY + 1),
          };
        } else {
          bounds = {
            x: 0,
            y: 0,
            w: image.naturalWidth,
            h: image.naturalHeight,
          };
        }
        cached.alphaBounds = bounds;
      }
    } catch (_error) {
      bounds = null;
    }
  }

  const sourceX = Number(bounds?.x) || 0;
  const sourceY = Number(bounds?.y) || 0;
  const sourceW = Math.max(1, Number(bounds?.w) || image.naturalWidth);
  const sourceH = Math.max(1, Number(bounds?.h) || image.naturalHeight);
  const sourceCenterX = sourceX + (sourceW * 0.5);
  const sourceCenterY = sourceY + (sourceH * 0.5);
  const sourceHalfHeight = Math.max(1, sourceH * 0.5);
  const scale = Math.max(0.01, radius / sourceHalfHeight);
  const drawWidth = sourceW * scale;
  const drawHeight = sourceH * scale;
  const drawX = centerX - ((sourceCenterX - sourceX) * scale);
  const drawY = centerY - ((sourceCenterY - sourceY) * scale);

  return {
    image,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  };
}

function drawArenaPlatformImage(centerX, centerY, radius) {
  const metrics = resolveArenaPlatformImageDrawMetrics(centerX, centerY, radius);
  if (!metrics) return false;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    metrics.image,
    metrics.sourceX, metrics.sourceY, metrics.sourceW, metrics.sourceH,
    metrics.drawX, metrics.drawY, metrics.drawWidth, metrics.drawHeight
  );
  ctx.restore();
  return true;
}

function isArenaPlatformDepthFxEnabled() {
  if (typeof window !== 'undefined' && window.OUTRA_DISABLE_PLATFORM_DEPTH_FX === true) {
    return false;
  }
  const configured = window.OUTRA_VISUAL_CONFIG?.arenaFloor?.platformDepthFxEnabled;
  if (typeof configured === 'boolean') return configured;
  return ARENA_PLATFORM_DEPTH_FX_DEFAULT_ENABLED;
}

function buildArenaPlatformOctagonVertices(radius, expand = 0) {
  const safeRadius = Math.max(1, Number(radius) || 1);
  const safeExpand = Number.isFinite(Number(expand)) ? Number(expand) : 0;
  const halfHeight = Math.max(1, safeRadius + safeExpand);
  const halfWidth = Math.max(1, (safeRadius * ARENA_PLATFORM_OCTAGON_HALF_WIDTH_SCALE) + safeExpand);
  const cornerLimit = Math.max(1, (safeRadius * ARENA_PLATFORM_OCTAGON_CORNER_LIMIT_SCALE) + (safeExpand * Math.SQRT2));
  const xAtTop = Math.max(0, Math.min(halfWidth, cornerLimit - halfHeight));
  const yAtRight = Math.max(0, Math.min(halfHeight, cornerLimit - halfWidth));
  return [
    { x: -xAtTop, y: -halfHeight },
    { x: xAtTop, y: -halfHeight },
    { x: halfWidth, y: -yAtRight },
    { x: halfWidth, y: yAtRight },
    { x: xAtTop, y: halfHeight },
    { x: -xAtTop, y: halfHeight },
    { x: -halfWidth, y: yAtRight },
    { x: -halfWidth, y: -yAtRight },
  ];
}

function traceArenaPlatformOctagonPath(centerX, centerY, radius, expand = 0, yOffset = 0, reverse = false) {
  const vertices = buildArenaPlatformOctagonVertices(radius, expand);
  if (!Array.isArray(vertices) || vertices.length < 3) return false;
  const points = reverse ? vertices.slice().reverse() : vertices;
  const safeCenterX = Number(centerX) || 0;
  const safeCenterY = (Number(centerY) || 0) + (Number(yOffset) || 0);
  ctx.moveTo(safeCenterX + points[0].x, safeCenterY + points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(safeCenterX + points[i].x, safeCenterY + points[i].y);
  }
  ctx.closePath();
  return true;
}

function getArenaPlatformWorldVertices(centerX, centerY, radius, expand = 0, offsetX = 0, offsetY = 0) {
  const safeCenterX = Number(centerX) || 0;
  const safeCenterY = Number(centerY) || 0;
  const vertices = buildArenaPlatformOctagonVertices(radius, expand);
  return vertices.map((point) => ({
    x: safeCenterX + (Number(point?.x) || 0) + (Number(offsetX) || 0),
    y: safeCenterY + (Number(point?.y) || 0) + (Number(offsetY) || 0),
  }));
}

function drawArenaPlatformSideFace(topVertices, bottomVertices, edgeIndex, fillStyle, strokeStyle = '') {
  if (!Array.isArray(topVertices) || !Array.isArray(bottomVertices)) return;
  const count = Math.min(topVertices.length, bottomVertices.length);
  if (count < 3) return;
  const start = ((Number(edgeIndex) || 0) % count + count) % count;
  const end = (start + 1) % count;
  const topA = topVertices[start];
  const topB = topVertices[end];
  const bottomA = bottomVertices[start];
  const bottomB = bottomVertices[end];
  if (!topA || !topB || !bottomA || !bottomB) return;

  ctx.beginPath();
  ctx.moveTo(topA.x, topA.y);
  ctx.lineTo(topB.x, topB.y);
  ctx.lineTo(bottomB.x, bottomB.y);
  ctx.lineTo(bottomA.x, bottomA.y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawArenaPlatformImageDepthSilhouette(centerX, centerY, radius) {
  const metrics = resolveArenaPlatformImageDrawMetrics(centerX, centerY, radius);
  if (!metrics) return false;

  const safeRadius = Math.max(1, Number(radius) || 1);
  const depthOffsetY = Math.max(10, safeRadius * 0.058);
  const leftDepthOffsetX = -Math.max(9, depthOffsetY * 0.92);
  const leftDepthOffsetY = Math.max(3, depthOffsetY * 0.22);
  const {
    image,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  } = metrics;

  const drawClippedDepth = ({
    clipX,
    clipY,
    clipW,
    clipH,
    clipPath = null,
    offsetX,
    offsetY,
    alpha = 0.78,
    blurAlpha = 0.22,
  }) => {
    ctx.save();
    ctx.beginPath();
    if (typeof clipPath === 'function') {
      clipPath(ctx);
    } else {
      ctx.rect(clipX, clipY, clipW, clipH);
    }
    ctx.clip();

    ctx.save();
    ctx.globalAlpha = blurAlpha;
    ctx.filter = 'brightness(0) blur(9px)';
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceW, sourceH,
      drawX + offsetX * 1.18,
      drawY + offsetY * 1.14,
      drawWidth,
      drawHeight
    );
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = 'brightness(0) saturate(0)';
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceW, sourceH,
      drawX + offsetX,
      drawY + offsetY,
      drawWidth,
      drawHeight
    );
    ctx.restore();

    ctx.restore();
  };

  drawClippedDepth({
    clipX: drawX - drawWidth * 0.04,
    clipY: drawY + drawHeight * 0.60,
    clipW: drawWidth * 1.08,
    clipH: drawHeight * 0.48,
    offsetX: 0,
    offsetY: depthOffsetY,
    alpha: 0.82,
    blurAlpha: 0.24,
  });

  drawClippedDepth({
    clipX: drawX - drawWidth * 0.14,
    clipY: drawY + drawHeight * 0.10,
    clipW: drawWidth * 0.44,
    clipH: drawHeight * 0.90,
    clipPath: (targetCtx) => {
      const outerX = drawX - drawWidth * 0.14;
      const innerX = drawX + drawWidth * 0.44;
      const sideTopY = drawY + drawHeight * 0.205;
      const bottomY = drawY + drawHeight * 1.02;
      targetCtx.moveTo(innerX, sideTopY);
      targetCtx.lineTo(innerX, bottomY);
      targetCtx.lineTo(outerX, bottomY);
      targetCtx.lineTo(outerX, sideTopY);
      targetCtx.closePath();
    },
    offsetX: leftDepthOffsetX,
    offsetY: leftDepthOffsetY,
    alpha: 0.84,
    blurAlpha: 0.23,
  });

  return true;
}

function drawArenaPlatformDepthFxUnderlay(centerX, centerY, radius, _timeSec = 0) {
  const safeRadius = Math.max(1, Number(radius) || 1);
  const safeCenterX = Number(centerX) || 0;
  const safeCenterY = Number(centerY) || 0;

  if (drawArenaPlatformImageDepthSilhouette(safeCenterX, safeCenterY, safeRadius)) {
    return;
  }

  // Directional depth: light reads from upper-right, so thickness appears only on
  // the left and bottom edges instead of as a uniform outline around the deck.
  const expand = Math.max(2, safeRadius * 0.018);
  const depthOffsetX = -Math.max(5, safeRadius * 0.026);
  const depthOffsetY = Math.max(9, safeRadius * 0.066);
  const topVertices = getArenaPlatformWorldVertices(safeCenterX, safeCenterY, safeRadius, expand);
  const bottomVertices = getArenaPlatformWorldVertices(
    safeCenterX,
    safeCenterY,
    safeRadius,
    expand,
    depthOffsetX,
    depthOffsetY
  );

  const castShadow = ctx.createRadialGradient(
    safeCenterX - safeRadius * 0.18,
    safeCenterY + safeRadius * 0.58,
    safeRadius * 0.16,
    safeCenterX - safeRadius * 0.12,
    safeCenterY + safeRadius * 0.72,
    safeRadius * 1.34
  );
  castShadow.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
  castShadow.addColorStop(0.48, 'rgba(0, 0, 0, 0.24)');
  castShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.fillStyle = castShadow;
  ctx.beginPath();
  ctx.ellipse(
    safeCenterX - safeRadius * 0.12,
    safeCenterY + safeRadius * 0.78,
    safeRadius * 1.02,
    safeRadius * 0.32,
    -0.08,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  const leftFaceGradient = ctx.createLinearGradient(
    safeCenterX - safeRadius * 1.08,
    safeCenterY - safeRadius * 0.54,
    safeCenterX - safeRadius * 0.86 + depthOffsetX,
    safeCenterY + safeRadius * 0.56 + depthOffsetY
  );
  leftFaceGradient.addColorStop(0, 'rgba(37, 40, 48, 0.64)');
  leftFaceGradient.addColorStop(0.52, 'rgba(16, 18, 24, 0.88)');
  leftFaceGradient.addColorStop(1, 'rgba(7, 9, 13, 0.96)');

  const bottomFaceGradient = ctx.createLinearGradient(
    safeCenterX,
    safeCenterY + safeRadius * 0.34,
    safeCenterX + depthOffsetX,
    safeCenterY + safeRadius + depthOffsetY
  );
  bottomFaceGradient.addColorStop(0, 'rgba(34, 36, 43, 0.66)');
  bottomFaceGradient.addColorStop(0.5, 'rgba(14, 16, 22, 0.92)');
  bottomFaceGradient.addColorStop(1, 'rgba(4, 6, 10, 0.98)');

  const lowerLeftFaceGradient = ctx.createLinearGradient(
    safeCenterX - safeRadius * 0.72,
    safeCenterY + safeRadius * 0.24,
    safeCenterX - safeRadius * 0.22 + depthOffsetX,
    safeCenterY + safeRadius + depthOffsetY
  );
  lowerLeftFaceGradient.addColorStop(0, 'rgba(34, 37, 46, 0.62)');
  lowerLeftFaceGradient.addColorStop(0.56, 'rgba(12, 15, 21, 0.9)');
  lowerLeftFaceGradient.addColorStop(1, 'rgba(4, 6, 10, 0.98)');

  ctx.save();
  drawArenaPlatformSideFace(topVertices, bottomVertices, 6, leftFaceGradient, 'rgba(0, 0, 0, 0.18)');
  drawArenaPlatformSideFace(topVertices, bottomVertices, 5, lowerLeftFaceGradient, 'rgba(0, 0, 0, 0.2)');
  drawArenaPlatformSideFace(topVertices, bottomVertices, 4, bottomFaceGradient, 'rgba(0, 0, 0, 0.22)');
  drawArenaPlatformSideFace(topVertices, bottomVertices, 3, bottomFaceGradient, 'rgba(0, 0, 0, 0.16)');

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const edgeIndex of [6, 5, 4, 3]) {
    const start = edgeIndex;
    const end = (edgeIndex + 1) % topVertices.length;
    ctx.moveTo(topVertices[start].x, topVertices[start].y);
    ctx.lineTo(topVertices[end].x, topVertices[end].y);
  }
  ctx.stroke();
  ctx.restore();
}

function getLavaCacheKey(timeSec = 0) {
  const lavaBackgroundState = getArenaLavaBackgroundImageCacheState();
  const platformState = getArenaPlatformImageCacheState();
  const platformDepthFxState = isArenaPlatformDepthFxEnabled() ? 'depthfx:on' : 'depthfx:off';
  const floorVisualOffsetY = getArenaFloorVisualOffsetY();
  const platformVisualOffsetY = getArenaPlatformVisualOffsetY();
  const floatingStonesState = arenaFloatingStones.getCacheState();
  return [
    canvas.width,
    canvas.height,
    arena.cx.toFixed(2),
    arena.cy.toFixed(2),
    arena.radius.toFixed(2),
    floorVisualOffsetY.toFixed(2),
    platformVisualOffsetY.toFixed(2),
    lavaBackgroundState,
    platformState,
    platformDepthFxState,
    floatingStonesState,
  ].join('|');
}

function ensureLavaCacheCanvas(type) {
  const canvasKey = type === 'static' ? 'staticCanvas' : 'dynamicCanvas';
  const ctxKey = type === 'static' ? 'staticCtx' : 'dynamicCtx';

  if (!lavaRenderCache[canvasKey]) {
    lavaRenderCache[canvasKey] = document.createElement('canvas');
    lavaRenderCache[ctxKey] = lavaRenderCache[canvasKey].getContext('2d');
  }

  const layerCanvas = lavaRenderCache[canvasKey];
  if (layerCanvas.width !== canvas.width || layerCanvas.height !== canvas.height) {
    layerCanvas.width = canvas.width;
    layerCanvas.height = canvas.height;
  }

  return lavaRenderCache[ctxKey];
}

function drawArenaStaticLayer(targetCtx, timeSec = 0) {
  const prevCtx = ctx;
  ctx = targetCtx;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const drewLavaBackground = drawArenaLavaBackgroundImage();
  if (!drewLavaBackground) {
    ctx.fillStyle = '#2a120a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const platformVisualCenterY = arena.cy + getArenaPlatformVisualOffsetY();
  const depthFxEnabled = isArenaPlatformDepthFxEnabled();
  if (depthFxEnabled) {
    drawArenaPlatformDepthFxUnderlay(arena.cx, platformVisualCenterY, arena.radius, timeSec);
  }
  const drewPlatformImage = drawArenaPlatformImage(arena.cx, platformVisualCenterY, arena.radius);
  if (!drewPlatformImage) {
    ctx.fillStyle = '#3a4047';
    ctx.beginPath();
    ctx.arc(arena.cx, platformVisualCenterY, arena.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx = prevCtx;
}

function isMultiplayerDraftVisualPhase() {
  const api = window.outraMultiplayer;
  if (!api || typeof api.getPresentationSnapshot !== 'function') {
    isMultiplayerDraftVisualPhase.lastActiveAt = 0;
    return false;
  }
  const snapshot = api.getPresentationSnapshot();
  const nowMs = performance.now();
  if (snapshot && snapshot.active && snapshot.isDraftActive) {
    isMultiplayerDraftVisualPhase.lastActiveAt = nowMs;
    return true;
  }

  const lastActiveAt = Number(isMultiplayerDraftVisualPhase.lastActiveAt) || 0;
  const configuredStickyMs = Number(window.OUTRA_MULTIPLAYER_PHASE_STICKY_MS);
  const stickyWindowMs = Number.isFinite(configuredStickyMs)
    ? Math.max(240, configuredStickyMs)
    : 1500;
  const snapshotGapGraceMs = Math.max(120, Math.min(420, Math.floor(stickyWindowMs * 0.28)));

  if (!snapshot || !snapshot.active) {
    if (lastActiveAt > 0 && (nowMs - lastActiveAt) <= snapshotGapGraceMs) {
      return true;
    }
    isMultiplayerDraftVisualPhase.lastActiveAt = 0;
    return false;
  }

  if (snapshot.isArenaActive || snapshot.isArenaPending || snapshot.isMatchEnd) {
    isMultiplayerDraftVisualPhase.lastActiveAt = 0;
    return false;
  }

  const stickyDraft = !!(
    lastActiveAt > 0
    && (nowMs - lastActiveAt) <= stickyWindowMs
  );
  if (stickyDraft) {
    return true;
  }

  return false;
}

function getMultiplayerArenaRuntimeVisualState() {
  const api = window.outraMultiplayer;
  if (!api || typeof api.getRuntimeSnapshot !== 'function') return null;
  const snapshot = api.getRuntimeSnapshot();
  if (!snapshot || snapshot.active !== true || !snapshot.isArenaActive) return null;
  return snapshot;
}

function drawMultiplayerArenaHazardHint() {
  const snapshot = getMultiplayerArenaRuntimeVisualState();
  if (!snapshot) return;

  const boundary = snapshot.arenaBoundary && typeof snapshot.arenaBoundary === 'object'
    ? snapshot.arenaBoundary
    : { center: { x: 0, y: 0 }, radius: 12 };
  const center = boundary.center && typeof boundary.center === 'object'
    ? boundary.center
    : { x: 0, y: 0 };
  const boundaryRadius = Math.max(0.01, Number(boundary.radius) || 12);
  const scale = Math.max(1, Number(arena.radius) || Number(arena.baseRadius) || 1) / boundaryRadius;
  const cx = arena.cx + (Number(center.x) || 0) * scale;
  const cy = arena.cy + (Number(center.y) || 0) * scale;
  const radiusPx = boundaryRadius * scale;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.0044);

  ctx.save();
  ctx.strokeStyle = `rgba(255, 158, 78, ${0.28 + pulse * 0.16})`;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 228, 166, ${0.14 + pulse * 0.10})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, radiusPx - 8), 0, Math.PI * 2);
  ctx.stroke();

  const players = [
    { pos: snapshot.myPosition, color: '255,122,88' },
    { pos: snapshot.opponentPosition, color: '122,194,255' },
  ];
  for (const entry of players) {
    const pos = entry.pos && typeof entry.pos === 'object' ? entry.pos : null;
    if (!pos) continue;
    const px = cx + ((Number(pos.x) || 0) - (Number(center.x) || 0)) * scale;
    const py = cy + ((Number(pos.y) || 0) - (Number(center.y) || 0)) * scale;
    const dist = Math.hypot(px - cx, py - cy);
    const ratio = dist / Math.max(1, radiusPx);
    if (ratio < 0.76) continue;

    const warn = Math.max(0, Math.min(1, (ratio - 0.76) / 0.24));
    const haloRadius = 22 + warn * 14 + pulse * 2;
    const halo = ctx.createRadialGradient(px, py, 0, px, py, haloRadius);
    halo.addColorStop(0, `rgba(${entry.color}, ${0.14 + warn * 0.24})`);
    halo.addColorStop(1, `rgba(${entry.color}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, haloRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArena() {
  const frameContext = getArenaFrameContext();
  const frameTimeSec = Number.isFinite(Number(frameContext?.nowSec))
    ? Number(frameContext.nowSec)
    : (performance.now() * 0.001);
  const frameId = Number.isFinite(Number(frameContext?.id))
    ? Number(frameContext.id)
    : null;
  const time = frameTimeSec;
  const multiplayerSnapshot = getMultiplayerArenaRuntimeVisualState();
  arenaFloatingStones.prepareFrame({
    timeSec: frameTimeSec,
    frameId,
    multiplayerSnapshot,
  });

  const cacheKey = getLavaCacheKey(time);
  const staticCtx = ensureLavaCacheCanvas('static');

  if (lavaRenderCache.staticKey !== cacheKey) {
    staticCtx.clearRect(0, 0, canvas.width, canvas.height);
    drawArenaStaticLayer(staticCtx, time);
    lavaRenderCache.staticKey = cacheKey;
  }

  if (lavaRenderCache.staticCanvas) ctx.drawImage(lavaRenderCache.staticCanvas, 0, 0);
  arenaFloatingStones.draw(time, {
    frameId,
    multiplayerSnapshot,
  });
}

// ── Obstacles ─────────────────────────────────────────────────
function drawObstacles() {
  for (const obstacle of obstacles) {
    if (obstacle?.hidden) continue;
    ctx.fillStyle = '#59616c';
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#98a2ad';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(obstacle.x + 4, obstacle.y + 5, obstacle.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWalls() {
  const usePracticeSpellFxImages = isPracticeSpellFxImageModeActive();
  const wallFxImage = usePracticeSpellFxImages ? getPracticeSpellFxImage('wall') : null;

  for (const wall of walls) {
    const alpha = Math.max(0.3, Math.min(1, wall.life / wall.maxLife));
    const start = wall.segments[0];
    const end = wall.segments[wall.segments.length - 1];
    if (wallFxImage && start && end) {
      const dx = (Number(end.x) || 0) - (Number(start.x) || 0);
      const dy = (Number(end.y) || 0) - (Number(start.y) || 0);
      const lineLength = Math.max(20, Math.hypot(dx, dy) + 20);
      const centerX = ((Number(start.x) || 0) + (Number(end.x) || 0)) * 0.5;
      const centerY = ((Number(start.y) || 0) + (Number(end.y) || 0)) * 0.5;
      const angle = Math.atan2(dy, dx);
      let maxRadius = 0;
      for (const seg of wall.segments) {
        maxRadius = Math.max(maxRadius, Number(seg?.r) || 0);
      }
      const thickness = Math.max(28, maxRadius * 4.4);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.globalAlpha = Math.max(0.18, 0.82 * alpha);
      ctx.drawImage(
        wallFxImage,
        -lineLength * 0.5,
        -thickness * 0.5,
        lineLength,
        thickness
      );
      ctx.globalAlpha = Math.max(0.12, 0.36 * alpha);
      ctx.drawImage(
        wallFxImage,
        -lineLength * 0.54,
        -thickness * 0.74,
        lineLength * 1.08,
        thickness * 1.48
      );
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(145, 195, 255, ${0.92 * alpha})`;
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.strokeStyle = `rgba(235, 245, 255, ${0.65 * alpha})`;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    for (const seg of wall.segments) {
      ctx.fillStyle = `rgba(110, 165, 235, ${0.18 * alpha})`;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, seg.r + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(158, 204, 255, ${0.92 * alpha})`;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, seg.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── Potions ───────────────────────────────────────────────────
function drawPracticeSpellImageFx() {
  if (!isPracticeSpellFxImageModeActive()) return;
  const fxList = Array.isArray(combatFx?.practiceSpellImageFx)
    ? combatFx.practiceSpellImageFx
    : [];
  if (!fxList.length) return;

  for (const fx of fxList) {
    if (!fx || typeof fx !== 'object') continue;
    const image = getPracticeSpellFxImage(fx.type);
    if (!image) continue;

    const maxLife = Math.max(0.001, Number(fx.maxLife) || 0.001);
    const lifeRatio = Math.max(0, Math.min(1, (Number(fx.life) || 0) / maxLife));
    if (lifeRatio <= 0.001) continue;

    const x = Number(fx.x);
    const y = Number(fx.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const dirX = Number(fx.dirX) || 0;
    const dirY = Number(fx.dirY) || 0;
    const angle = Math.atan2(dirY, dirX);
    const progress = 1 - lifeRatio;
    const scaleFrom = Math.max(0.2, Number(fx.scaleFrom) || 0.9);
    const scaleTo = Math.max(0.2, Number(fx.scaleTo) || 1.08);
    const scale = scaleFrom + ((scaleTo - scaleFrom) * progress);
    const width = Math.max(12, (Number(fx.width) || 140) * scale);
    const height = Math.max(12, (Number(fx.height) || 120) * scale);
    const alpha = Math.max(0, Math.min(1, Number(fx.alpha) || 0.9)) * Math.pow(lifeRatio, 0.72);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, -width * 0.5, -height * 0.5, width, height);
    ctx.restore();
  }
}

function getTimedLifeAlpha(expiresAtRaw, fallbackDurationSec = 1) {
  const raw = Number(expiresAtRaw) || 0;
  if (raw <= 0) return 1;
  let remainingSec = 0;
  if (raw > 1000000) {
    remainingSec = Math.max(0, (raw - Date.now()) / 1000);
  } else {
    remainingSec = Math.max(0, raw - (performance.now() / 1000));
  }
  if (remainingSec <= 0) return 0;
  return Math.max(0.2, Math.min(1, remainingSec / Math.max(0.001, fallbackDurationSec)));
}

function drawRiftPendingPlacement() {
  const pendingPortal = player?.riftPendingPortalA && typeof player.riftPendingPortalA === 'object'
    ? player.riftPendingPortalA
    : null;
  if (!pendingPortal) return;
  const expiresAt = Number(player?.riftPendingExpiresAt) || 0;
  const lifeAlpha = getTimedLifeAlpha(expiresAt, 6);
  if (lifeAlpha <= 0.001) return;

  const x = Number(pendingPortal.x);
  const y = Number(pendingPortal.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const radius = Math.max(8, Number(player?.r) || 18);
  const pulse = 0.5 + (0.5 * Math.sin(performance.now() * 0.01));

  ctx.save();
  ctx.strokeStyle = `rgba(146, 200, 255, ${0.42 + (0.3 * lifeAlpha)})`;
  ctx.lineWidth = 2.1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = `rgba(255, 170, 102, ${0.2 + (0.24 * lifeAlpha)})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y, radius * (0.75 + (0.1 * pulse)), 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(142, 194, 255, ${0.22 + (0.18 * lifeAlpha)})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(Number(player?.x) || x, Number(player?.y) || y);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

function drawRifts() {
  if (!Array.isArray(rifts) || !rifts.length) return;
  const pulse = 0.5 + (0.5 * Math.sin(performance.now() * 0.0075));

  for (const rift of rifts) {
    if (!rift) continue;
    const portalA = rift.portalA && typeof rift.portalA === 'object' ? rift.portalA : null;
    const portalB = rift.portalB && typeof rift.portalB === 'object' ? rift.portalB : null;
    if (!portalA || !portalB) continue;
    const lifeAlpha = getTimedLifeAlpha(rift.expiresAt, 4);
    if (lifeAlpha <= 0.001) continue;
    const radius = Math.max(7, Number(rift.portalRadius) || 12);

    ctx.save();
    ctx.strokeStyle = `rgba(138, 190, 255, ${0.28 + (0.24 * pulse * lifeAlpha)})`;
    ctx.lineWidth = Math.max(2, radius * 0.28);
    ctx.beginPath();
    ctx.moveTo(portalA.x, portalA.y);
    ctx.lineTo(portalB.x, portalB.y);
    ctx.stroke();

    const portals = [portalA, portalB];
    for (const portal of portals) {
      const glow = ctx.createRadialGradient(portal.x, portal.y, Math.max(1, radius * 0.28), portal.x, portal.y, radius * 2.25);
      glow.addColorStop(0, `rgba(190, 222, 255, ${0.5 * lifeAlpha})`);
      glow.addColorStop(0.45, `rgba(142, 194, 255, ${0.34 * lifeAlpha})`);
      glow.addColorStop(1, 'rgba(142, 194, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, radius * 2.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(142, 194, 255, ${0.72 * lifeAlpha})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 176, 112, ${0.42 * lifeAlpha})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, radius * (0.62 + (0.09 * pulse)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPhantomIllusions() {
  if (!Array.isArray(phantomIllusions) || !phantomIllusions.length) {
    if (phantomIllusionSpriteRuntimes.size) {
      phantomIllusionSpriteRuntimes.clear();
    }
    return;
  }
  const nowMs = Date.now();
  const nowSec = performance.now() / 1000;
  const multiplayerArena = !!getMultiplayerArenaRuntimeVisualState();
  const practiceSpriteMode = isPracticeRoomSpritePlayerEnabled();
  const activeIllusionIds = new Set();

  for (const illusion of phantomIllusions) {
    if (!illusion) continue;
    const expiresAt = Number(illusion.expiresAt) || 0;
    if (expiresAt > 0 && expiresAt > 1000000 && nowMs >= expiresAt) continue;
    if (expiresAt > 0 && expiresAt <= 1000000 && nowSec >= expiresAt) continue;

    const x = Number(illusion.x);
    const y = Number(illusion.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const radius = Math.max(10, Number(illusion.r) || Number(player?.r) || 18);
    const lifeAlpha = getTimedLifeAlpha(expiresAt, 1);
    const owner = String(illusion.owner || '').trim().toLowerCase();
    const casterOwnedIllusion = owner === 'player';
    if (multiplayerArena) {
      const mirroredActor = owner === 'dummy'
        ? dummy
        : player;
      if (mirroredActor) {
        drawHealthBar(
          {
            x,
            y,
            r: Math.max(10, Number(mirroredActor.r) || radius),
            hp: Number(mirroredActor.hp) || 0,
            maxHp: Math.max(1, Number(mirroredActor.maxHp) || 1)
          },
          owner === 'dummy' ? '#ff8c5a' : '#62f36d'
        );
        drawNameTag({
          x,
          y,
          r: Math.max(10, Number(mirroredActor.r) || radius),
          name: String(mirroredActor.name || '')
        });
      }
      if (!casterOwnedIllusion) {
        // Opponent-facing phantom illusion ring must match the real opponent ring exactly.
        drawActorReadabilityRing(
          { x, y, r: Math.max(10, Number(mirroredActor?.r) || Number(dummy?.r) || radius) },
          '255, 170, 108',
          0.68
        );
      }
      if (!practiceSpriteMode) {
        continue;
      }
    }
    if (practiceSpriteMode) {
      const spriteSheet = getPracticePlayerSpriteSheet();
      if (spriteSheet) {
        const illusionId = String(illusion.illusionId || '').trim()
          || `${owner || 'unknown'}:${Math.round(x)}:${Math.round(y)}`;
        activeIllusionIds.add(illusionId);

        let spriteRuntime = phantomIllusionSpriteRuntimes.get(illusionId);
        if (!spriteRuntime) {
          spriteRuntime = {
            frame: PRACTICE_PLAYER_SPRITE_FRAME_START,
            animElapsedSec: 0,
            lastTickSec: 0,
            lastX: x,
            lastY: y,
            hasLastPos: false,
            lastMoveAtSec: nowSec,
            facingAngle: 0,
          };
          phantomIllusionSpriteRuntimes.set(illusionId, spriteRuntime);
        }

        const dtSec = getArenaActorSpriteDeltaSec(spriteRuntime);
        const isMoving = isPhantomIllusionSpriteMoving(illusion, spriteRuntime, dtSec, nowSec);
        const frame = getPhantomIllusionSpriteFrameIndex(spriteRuntime, isMoving, dtSec);
        const frameColumn = frame % PRACTICE_PLAYER_SPRITE_FRAMES_PER_ROW;
        const frameRow = Math.floor(frame / PRACTICE_PLAYER_SPRITE_FRAMES_PER_ROW);
        const sourceX = frameColumn * PRACTICE_PLAYER_SPRITE_FRAME_WIDTH;
        const sourceY = frameRow * PRACTICE_PLAYER_SPRITE_FRAME_HEIGHT;
        const drawHeight = getArenaSpriteDrawHeight();
        const drawWidth = Math.max(
          2,
          Math.round((PRACTICE_PLAYER_SPRITE_FRAME_WIDTH / PRACTICE_PLAYER_SPRITE_FRAME_HEIGHT) * drawHeight)
        );
        const drawX = x - (drawWidth * 0.5);
        const drawY = y - (drawHeight * PRACTICE_PLAYER_SPRITE_FEET_ORIGIN_Y) + PRACTICE_PLAYER_SPRITE_DRAW_OFFSET_Y;
        const fallbackFacingAngle = owner === 'dummy'
          ? getPracticeSpriteFacingAngleFromVector(Number(dummy?.aimX) || 0, Number(dummy?.aimY) || 0, 0)
          : (
            Number.isFinite(Number(spriteRuntime.facingAngle))
              ? Number(spriteRuntime.facingAngle)
              : 0
          );
        const illusionFacingAngle = getPracticeSpriteFacingAngleFromVector(
          Number(illusion.facingX) || 0,
          Number(illusion.facingY) || 0,
          fallbackFacingAngle
        );
        spriteRuntime.facingAngle = illusionFacingAngle;
        ctx.save();
        ctx.globalAlpha = 1;
        drawPracticeSpriteFrame(
          spriteSheet,
          sourceX,
          sourceY,
          drawX,
          drawY,
          drawWidth,
          drawHeight,
          illusionFacingAngle
        );
        ctx.restore();
        continue;
      }
    }

    if (casterOwnedIllusion) continue;

    const tint = owner === 'player' ? '200,174,255' : '214,192,255';

    ctx.save();
    ctx.fillStyle = `rgba(${tint}, ${0.12 + (0.16 * lifeAlpha)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(${tint}, ${0.52 * lifeAlpha})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const illusionId of Array.from(phantomIllusionSpriteRuntimes.keys())) {
    if (!activeIllusionIds.has(illusionId)) {
      phantomIllusionSpriteRuntimes.delete(illusionId);
    }
  }
}

function drawPotions() {
  for (const potion of potions) {
    ctx.fillStyle = '#45e37b';
    ctx.beginPath();
    ctx.arc(potion.x, potion.y, potion.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(230,255,235,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(potion.x - 2, potion.y - 6, 4, 12);
    ctx.fillRect(potion.x - 6, potion.y - 2, 12, 4);
  }
}

// ── Actors ────────────────────────────────────────────────────
function drawHealthBar(actor, color) {
  const actorX = Number(actor?.x) || 0;
  const actorY = Number(actor?.y) || 0;
  const actorRadius = Math.max(10, Number(actor?.r) || 18);
  const width = 56, height = 8;
  const x = actorX - width / 2;
  const y = isPracticeRoomSpritePlayerEnabled()
    ? (getArenaSpriteTopY(actorY) - PRACTICE_PLAYER_HEALTHBAR_SPRITE_TOP_OFFSET_Y)
    : (actorY - actorRadius - 22);
  const adjustedY = y + ARENA_ACTOR_OVERLAY_VERTICAL_NUDGE_Y;
  const maxHp = Math.max(1, Number(actor?.maxHp) || 1);
  const ratio = Math.max(0, Math.min(1, (Number(actor?.hp) || 0) / maxHp));

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, adjustedY, width, height);

  ctx.fillStyle = color;
  ctx.fillRect(x + 1, adjustedY + 1, (width - 2) * ratio, height - 2);

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, adjustedY, width, height);
}

function drawNameTag(actor) {
  const actorX = Number(actor?.x) || 0;
  const actorY = Number(actor?.y) || 0;
  const actorRadius = Math.max(10, Number(actor?.r) || 18);
  const y = isPracticeRoomSpritePlayerEnabled()
    ? (getArenaSpriteTopY(actorY) - PRACTICE_PLAYER_NAMETAG_SPRITE_TOP_OFFSET_Y)
    : (actorY - actorRadius - 30);
  const adjustedY = y + ARENA_ACTOR_OVERLAY_VERTICAL_NUDGE_Y;
  ctx.textAlign = 'center';
  ctx.font = '12px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(String(actor?.name || ''), actorX, adjustedY);
  ctx.textAlign = 'left';
}

function drawActorReadabilityRing(actor, color, alpha = 0.82) {
  const overlayAnchorOffsetY = getArenaSpriteOverlayAnchorOffsetY();
  const anchorY = actor.y + overlayAnchorOffsetY;
  const radiusBoost = getArenaSpriteOverlayRadiusBoost();
  const innerRadius = (actor.r + 5 + radiusBoost) * ARENA_ACTOR_RING_RADIUS_SCALE;
  const outerRadius = (actor.r + 9 + radiusBoost) * ARENA_ACTOR_RING_RADIUS_SCALE;
  ctx.save();
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(actor.x, anchorY, innerRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${color}, ${Math.max(0, alpha - 0.46)})`;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.arc(actor.x, anchorY, outerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawShieldDomeForActor(actor, color = '255,198,92') {
  const now = performance.now() / 1000;
  const shieldUntil = Number(actor?.shieldUntil) || 0;
  if (shieldUntil <= now) return;

  const x = Number(actor?.x) || 0;
  const y = Number(actor?.y) || 0;
  const radius = Math.max(10, Number(actor?.r) || 18);
  const remaining = Math.max(0, shieldUntil - now);
  const lifeAlpha = Math.max(0.35, Math.min(1, remaining / 1));
  const time = performance.now() * 0.001;
  const pulse = 0.5 + (0.5 * Math.sin(time * 6.8));
  const domeRadius = radius + 12;
  const sweepAngle = (time * 1.2) % (Math.PI * 2);
  const shieldOpacityScale = 0.7;
  const alphaScaled = (value) => Math.max(0, Math.min(1, (Number(value) || 0) * shieldOpacityScale));

  ctx.save();

  // Top-down aura so the caster looks enclosed under a dome from above.
  const outerAura = ctx.createRadialGradient(
    x,
    y,
    Math.max(1, domeRadius * 0.28),
    x,
    y,
    domeRadius * 2.2
  );
  outerAura.addColorStop(0, `rgba(255,236,162,${alphaScaled(0.22 + (0.14 * lifeAlpha))})`);
  outerAura.addColorStop(0.52, `rgba(255,176,80,${alphaScaled(0.2 + (0.13 * lifeAlpha))})`);
  outerAura.addColorStop(1, 'rgba(255,150,66,0)');
  ctx.fillStyle = outerAura;
  ctx.beginPath();
  ctx.arc(x, y, domeRadius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  const domeFill = ctx.createRadialGradient(
    x - domeRadius * 0.3,
    y - domeRadius * 0.5,
    Math.max(1, domeRadius * 0.16),
    x,
    y,
    domeRadius * 1.12
  );
  domeFill.addColorStop(0, `rgba(255,255,232,${alphaScaled(0.34 + (0.2 * lifeAlpha))})`);
  domeFill.addColorStop(0.38, `rgba(255,220,132,${alphaScaled(0.28 + (0.2 * lifeAlpha))})`);
  domeFill.addColorStop(1, `rgba(255,150,70,${alphaScaled(0.14 + (0.12 * lifeAlpha))})`);
  ctx.fillStyle = domeFill;
  ctx.beginPath();
  ctx.arc(x, y, domeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,232,172,${alphaScaled(0.36 + (0.24 * pulse * lifeAlpha))})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, domeRadius * (0.62 + (0.03 * pulse)), 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${color}, ${alphaScaled(0.64 + (0.3 * lifeAlpha))})`;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.arc(x, y, domeRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Shine sweep rotating over the dome surface.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, domeRadius, 0, Math.PI * 2);
  ctx.clip();
  const sweepStartX = x + Math.cos(sweepAngle) * domeRadius * 1.5;
  const sweepStartY = y + Math.sin(sweepAngle) * domeRadius * 1.5;
  const sweepEndX = x - Math.cos(sweepAngle) * domeRadius * 1.5;
  const sweepEndY = y - Math.sin(sweepAngle) * domeRadius * 1.5;
  const sweepGradient = ctx.createLinearGradient(
    sweepStartX,
    sweepStartY,
    sweepEndX,
    sweepEndY
  );
  sweepGradient.addColorStop(0, 'rgba(255,255,255,0)');
  sweepGradient.addColorStop(0.48, `rgba(255,255,245,${alphaScaled(0.24 + (0.18 * lifeAlpha))})`);
  sweepGradient.addColorStop(0.56, `rgba(255,224,144,${alphaScaled(0.42 + (0.26 * lifeAlpha))})`);
  sweepGradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sweepGradient;
  ctx.fillRect(
    x - domeRadius * 1.8,
    y - domeRadius * 1.8,
    domeRadius * 3.6,
    domeRadius * 3.6
  );

  ctx.restore();

  ctx.fillStyle = `rgba(255,244,196,${alphaScaled(0.16 + (0.12 * lifeAlpha))})`;
  ctx.beginPath();
  ctx.arc(x - domeRadius * 0.26, y - domeRadius * 0.3, domeRadius * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPrismConeForActor(actor, baseColor = '86,154,255') {
  const now = performance.now() / 1000;
  const prismUntil = Number(actor?.prismUntil) || 0;
  if (prismUntil <= now) return;

  const remaining = Math.max(0, prismUntil - now);
  const lifeAlpha = Math.max(0.2, Math.min(1, remaining / 0.6));
  const halfAngle = (120 * Math.PI / 180) * 0.5;
  const forward = typeof getActorPrismDirection === 'function'
    ? getActorPrismDirection(actor, Number(actor?.aimX) || 1, Number(actor?.aimY) || 0)
    : normalized(Number(actor?.aimX) || 1, Number(actor?.aimY) || 0);

  const originX = Number(actor.x) || 0;
  const originY = Number(actor.y) || 0;
  const actorRadius = Math.max(10, Number(actor?.r) || 0);
  const shieldGap = Math.max(10, actorRadius * 0.36);
  const innerRadius = actorRadius + shieldGap;
  const outerRadius = innerRadius + Math.max(5, actorRadius * 0.38);
  const facingAngle = Math.atan2(forward.y, forward.x);
  const startAngle = facingAngle - halfAngle;
  const endAngle = facingAngle + halfAngle;
  const accentColor = '255,168,92';
  const accentPulse = 0.5 + (0.5 * Math.sin(performance.now() * 0.02));

  ctx.save();
  ctx.beginPath();
  ctx.arc(originX, originY, outerRadius, startAngle, endAngle);
  ctx.arc(originX, originY, innerRadius, endAngle, startAngle, true);
  ctx.closePath();
  ctx.fillStyle = `rgba(${baseColor}, ${0.09 + lifeAlpha * 0.12})`;
  ctx.fill();

  ctx.strokeStyle = `rgba(${baseColor}, ${0.58 + lifeAlpha * 0.28})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(originX, originY, outerRadius, startAngle, endAngle);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${baseColor}, ${0.26 + lifeAlpha * 0.2})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(originX, originY, innerRadius, startAngle, endAngle);
  ctx.stroke();

  const midRadius = (innerRadius + outerRadius) * 0.5;
  const pulseAlpha = 0.24 + (Math.sin(performance.now() * 0.016) * 0.06) + (lifeAlpha * 0.12);
  ctx.strokeStyle = `rgba(${baseColor}, ${Math.max(0.12, pulseAlpha)})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(originX, originY, midRadius, startAngle + 0.07, endAngle - 0.07);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${accentColor}, ${0.2 + (accentPulse * 0.16) + (lifeAlpha * 0.18)})`;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(originX, originY, Math.max(innerRadius + 1, outerRadius - 0.9), startAngle + 0.15, endAngle - 0.15);
  ctx.stroke();

  const tipRadius = Math.max(innerRadius + 1, outerRadius - 1.2);
  const tipAX = originX + Math.cos(startAngle) * tipRadius;
  const tipAY = originY + Math.sin(startAngle) * tipRadius;
  const tipBX = originX + Math.cos(endAngle) * tipRadius;
  const tipBY = originY + Math.sin(endAngle) * tipRadius;
  ctx.fillStyle = `rgba(${accentColor}, ${0.16 + (accentPulse * 0.1) + (lifeAlpha * 0.16)})`;
  ctx.beginPath();
  ctx.arc(tipAX, tipAY, 1.6, 0, Math.PI * 2);
  ctx.arc(tipBX, tipBY, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSolarDistortionOverlay() {
  const now = performance.now() / 1000;
  const distortionUntil = Number(player?.solarDistortionUntil) || 0;
  if (distortionUntil <= now) return;

  const remaining = distortionUntil - now;
  const strength = Math.max(0, Math.min(1, remaining / 1.2));
  const t = performance.now() * 0.001;
  const flashStrength = Math.pow(strength, 0.3);
  const pulse = 0.5 + (Math.sin(t * 26) * 0.5);
  const strobe = Math.pow(0.5 + (Math.sin(t * 37.5) * 0.5), 1.45);
  const centerJitterX = Math.sin(t * 22.8) * (14 + flashStrength * 28);
  const centerJitterY = Math.cos(t * 24.4) * (10 + flashStrength * 22);
  const centerX = (canvas.width * 0.5) + centerJitterX;
  const centerY = (canvas.height * 0.5) + centerJitterY;

  ctx.save();
  const sourceCanvas = ctx.canvas;
  const smearOffset = (8 + (flashStrength * 22)) * (0.7 + (strobe * 0.45));
  ctx.globalAlpha = 0.17 + (flashStrength * 0.2);
  ctx.drawImage(sourceCanvas, smearOffset, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, sourceCanvas.width, sourceCanvas.height);
  ctx.globalAlpha = 0.14 + (flashStrength * 0.17);
  ctx.drawImage(sourceCanvas, -smearOffset * 0.72, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, sourceCanvas.width, sourceCanvas.height);

  ctx.globalAlpha = 0.44 + (flashStrength * 0.24) + (strobe * 0.1);
  const tint = ctx.createRadialGradient(
    centerX,
    centerY,
    Math.max(28, Math.min(canvas.width, canvas.height) * 0.04),
    centerX,
    centerY,
    Math.max(canvas.width, canvas.height) * 0.86
  );
  tint.addColorStop(0, 'rgba(255,255,255,1)');
  tint.addColorStop(0.28, 'rgba(255,251,244,1)');
  tint.addColorStop(0.62, 'rgba(255,241,210,0.98)');
  tint.addColorStop(1, 'rgba(255,223,160,0.94)');
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.24 + (flashStrength * 0.26) + (pulse * 0.08);
  ctx.strokeStyle = 'rgba(255, 252, 236, 0.9)';
  ctx.lineWidth = 2.8 + flashStrength * 2.2;
  const lineCount = 16;
  for (let i = 0; i < lineCount; i += 1) {
    const y = ((i + 1) / (lineCount + 1)) * canvas.height;
    const amplitude = 18 + (flashStrength * 30) + (i * 1.1);
    const wave = 0.019 + i * 0.0034;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 14) {
      const yy = y + Math.sin((x * wave) + (t * (8.8 + i * 0.44))) * amplitude;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  const bandHeight = (canvas.height * (0.2 + (flashStrength * 0.12)));
  const bandY = ((Math.sin(t * 4.4) * 0.5 + 0.5) * (canvas.height + bandHeight)) - bandHeight;
  ctx.globalAlpha = 0.2 + (flashStrength * 0.16) + (strobe * 0.1);
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, bandY + bandHeight);
  bandGrad.addColorStop(0, 'rgba(255,255,255,0)');
  bandGrad.addColorStop(0.5, 'rgba(255,255,255,0.78)');
  bandGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, canvas.width, bandHeight);

  ctx.globalAlpha = 0.34 + (flashStrength * 0.22) + (strobe * 0.11);
  ctx.fillStyle = 'rgba(255,250,242,0.94)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.2 + (flashStrength * 0.2);
  const vignette = ctx.createRadialGradient(
    centerX,
    centerY,
    Math.max(40, Math.min(canvas.width, canvas.height) * 0.16),
    centerX,
    centerY,
    Math.max(canvas.width, canvas.height) * 0.72
  );
  vignette.addColorStop(0, 'rgba(255,255,255,0.04)');
  vignette.addColorStop(0.64, 'rgba(255,240,198,0.12)');
  vignette.addColorStop(1, 'rgba(190,126,36,0.36)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawPlayer() {
  const multiplayerArena = !!getMultiplayerArenaRuntimeVisualState();
  const now = performance.now() / 1000;
  if (now < (Number(player?.phantomVanishUntil) || 0)) {
    drawHealthBar(player, '#62f36d');
    drawNameTag(player);
    ctx.save();
    ctx.strokeStyle = 'rgba(204,180,255,0.62)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // In multiplayer, keep circle/readability layer behind sprite + shadow.
  if (multiplayerArena) {
    drawActorReadabilityRing(player, '110, 228, 255', 0.72);
  }
  drawPracticePlayerSpriteBody();

  // Player sprite/overlay rendering on canvas (practice + multiplayer).
  // Keep HP/readability overlays for clear combat readability.
  drawHealthBar(player, '#62f36d');
  drawNameTag(player);

  drawShieldDomeForActor(player, '255,198,92');

  drawPrismConeForActor(player, '86,154,255');

  if (player.chargeActive) {
    ctx.save();
    ctx.strokeStyle = 'rgba(196,150,255,0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = 'rgba(196,150,255,1)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const hitFlashLife = Math.max(0, Number(getActorHitFlash('player')) || 0);
  if (hitFlashLife > 0) {
    const flashBaseDuration = (
      typeof COMBAT_FEEL !== 'undefined'
      && Number.isFinite(Number(COMBAT_FEEL.hitFlashDuration))
    )
      ? Number(COMBAT_FEEL.hitFlashDuration)
      : 0.16;
    const alpha = Math.min(1, hitFlashLife / Math.max(0.001, flashBaseDuration));
    ctx.save();
    ctx.fillStyle = `rgba(255, 186, 160, ${0.16 + alpha * 0.2})`;
    ctx.strokeStyle = `rgba(255, 208, 188, ${0.48 + alpha * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 11 + ((1 - alpha) * 3), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawDummy() {
  const multiplayerArena = !!getMultiplayerArenaRuntimeVisualState();
  const now = performance.now() / 1000;
  if (now < (Number(dummy?.phantomVanishUntil) || 0)) {
    return;
  }

  // In multiplayer, keep circle/readability layer behind sprite + shadow.
  if (multiplayerArena) {
    drawActorReadabilityRing(dummy, '255, 170, 108', 0.68);
  }
  drawPracticeDummySpriteBody();

  // Opponent sprite/overlay rendering on canvas (practice + multiplayer).
  // Keep HP/readability overlays for parity and combat clarity.
  drawHealthBar(dummy, '#ff8c5a');
  drawNameTag(dummy);

  drawShieldDomeForActor(dummy, '255,198,92');

  drawPrismConeForActor(dummy, '78,144,244');

  const hitFlashLife = Math.max(0, Number(getActorHitFlash('dummy')) || 0);
  if (hitFlashLife > 0) {
    const flashBaseDuration = (
      typeof COMBAT_FEEL !== 'undefined'
      && Number.isFinite(Number(COMBAT_FEEL.hitFlashDuration))
    )
      ? Number(COMBAT_FEEL.hitFlashDuration)
      : 0.16;
    const alpha = Math.min(1, hitFlashLife / Math.max(0.001, flashBaseDuration));
    ctx.save();
    ctx.fillStyle = `rgba(255, 186, 160, ${0.16 + alpha * 0.2})`;
    ctx.strokeStyle = `rgba(255, 208, 188, ${0.48 + alpha * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(dummy.x, dummy.y, dummy.r + 11 + ((1 - alpha) * 3), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Projectiles ───────────────────────────────────────────────
function drawProjectiles() {
  const nowSec = performance.now() / 1000;
  for (const p of projectiles) {
    const abilityId = String(p.abilityId || '').trim().toLowerCase();
    const isSolar = abilityId === 'solar';
    const velocityX = Number(p.vx) || 0;
    const velocityY = Number(p.vy) || 0;
    const velocityMagnitude = Math.hypot(velocityX, velocityY);
    const dirX = velocityMagnitude > 0.001 ? (velocityX / velocityMagnitude) : 0;
    const dirY = velocityMagnitude > 0.001 ? (velocityY / velocityMagnitude) : 0;
    const trailLength = Math.max(6, Math.min(26, (Number(p.r) || 5) * 1.7 + (velocityMagnitude * 0.035)));

    if (isSolar) {
      const glow = ctx.createRadialGradient(p.x, p.y, Math.max(1, p.r * 0.25), p.x, p.y, p.r * 2.1);
      glow.addColorStop(0, 'rgba(255, 244, 188, 0.98)');
      glow.addColorStop(0.48, 'rgba(255, 212, 122, 0.78)');
      glow.addColorStop(1, 'rgba(255, 176, 84, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 226, 146, 0.96)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 250, 214, 0.68)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    const tailStartX = Number.isFinite(Number(p.prevX))
      ? Number(p.prevX)
      : (p.x - (dirX * trailLength));
    const tailStartY = Number.isFinite(Number(p.prevY))
      ? Number(p.prevY)
      : (p.y - (dirY * trailLength));
    const trail = ctx.createLinearGradient(tailStartX, tailStartY, p.x, p.y);
    if (p.owner === 'player') {
      trail.addColorStop(0, 'rgba(255,170,88,0)');
      trail.addColorStop(1, 'rgba(255,170,88,0.78)');
    } else {
      trail.addColorStop(0, 'rgba(140,224,255,0)');
      trail.addColorStop(1, 'rgba(140,224,255,0.78)');
    }
    ctx.save();
    ctx.strokeStyle = trail;
    ctx.lineWidth = Math.max(2, p.r * 0.75);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailStartX, tailStartY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();

    if (abilityId === 'fireblast' && drawFireballProjectileSprite(p, nowSec)) {
      continue;
    }

    ctx.fillStyle = p.owner === 'player' ? '#ff8a2b' : '#6fd8ff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.owner === 'player' ? 'rgba(255,200,80,0.6)' : 'rgba(160,230,255,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── Hooks ─────────────────────────────────────────────────────
function drawHooks() {
  const nowSec = performance.now() / 1000;
  const hookSpriteImage = getPracticeSpellFxImage('hook');
  for (const h of hooks) {
    const caster = h.owner === 'player' ? player : dummy;
    if (h.owner === 'dummy' && !dummyEnabled) continue;
    if (!caster) continue;

    const fromX = Number(caster.x) || 0;
    const fromY = Number(caster.y) || 0;
    const tipX = Number(h.x) || fromX;
    const tipY = Number(h.y) || fromY;
    const dx = tipX - fromX;
    const dy = tipY - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.001) continue;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const sideX = -dirY;
    const sideY = dirX;
    const tipAngle = Math.atan2(dy, dx);
    const isPulling = String(h.state || '').toLowerCase() === 'pulling';
    const ownerIsPlayer = h.owner === 'player';

    const colorCore = ownerIsPlayer
      ? 'rgba(196,230,255,0.94)'
      : 'rgba(255,220,196,0.94)';
    const colorChain = ownerIsPlayer
      ? 'rgba(170,214,255,0.9)'
      : 'rgba(255,196,156,0.9)';
    const colorEdge = ownerIsPlayer
      ? 'rgba(116,186,255,0.58)'
      : 'rgba(255,154,104,0.56)';
    const glowBase = ownerIsPlayer
      ? '136,198,255'
      : '255,176,128';
    const pulse = 0.5 + (0.5 * Math.sin((nowSec * 11.5) + (dist * 0.04)));

    ctx.save();
    ctx.lineCap = 'round';

    const tetherGlow = ctx.createLinearGradient(fromX, fromY, tipX, tipY);
    tetherGlow.addColorStop(0, `rgba(${glowBase}, 0.08)`);
    tetherGlow.addColorStop(0.58, `rgba(${glowBase}, ${isPulling ? 0.28 : 0.2})`);
    tetherGlow.addColorStop(1, `rgba(${glowBase}, ${isPulling ? 0.48 : 0.34})`);
    ctx.strokeStyle = tetherGlow;
    ctx.lineWidth = isPulling ? 8.2 : 6.1;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.strokeStyle = colorChain;
    ctx.lineWidth = isPulling ? 3.6 : 3.0;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.52)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fromX + sideX * 0.8, fromY + sideY * 0.8);
    ctx.lineTo(tipX + sideX * 0.8, tipY + sideY * 0.8);
    ctx.stroke();

    const linkSpacing = 11;
    const linkCount = Math.max(3, Math.floor(dist / linkSpacing));
    for (let linkIndex = 0; linkIndex <= linkCount; linkIndex += 1) {
      const t = linkCount > 0 ? (linkIndex / linkCount) : 0;
      const travelPulse = (nowSec * (isPulling ? 17 : 12)) + (linkIndex * 0.95);
      const wiggle = (isPulling ? 2.8 : 1.7) * Math.sin(travelPulse);
      const linkX = fromX + (dx * t) + (sideX * wiggle);
      const linkY = fromY + (dy * t) + (sideY * wiggle);
      const linkRadius = (isPulling ? 2.9 : 2.45) + (0.42 * Math.sin(travelPulse + 1.15));

      ctx.fillStyle = colorCore;
      ctx.beginPath();
      ctx.arc(linkX, linkY, Math.max(1.35, linkRadius), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = colorEdge;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.arc(linkX, linkY, Math.max(1.35, linkRadius), 0, Math.PI * 2);
      ctx.stroke();
    }

    const tipRadius = isPulling ? 7.8 : 6.4;
    const tipGlow = ctx.createRadialGradient(
      tipX,
      tipY,
      0,
      tipX,
      tipY,
      tipRadius * (2.4 + (0.35 * pulse))
    );
    tipGlow.addColorStop(0, `rgba(${glowBase}, ${isPulling ? 0.42 : 0.3})`);
    tipGlow.addColorStop(1, `rgba(${glowBase}, 0)`);
    ctx.fillStyle = tipGlow;
    ctx.beginPath();
    ctx.arc(tipX, tipY, tipRadius * (2.4 + (0.35 * pulse)), 0, Math.PI * 2);
    ctx.fill();

    if (hookSpriteImage) {
      const spriteLength = Math.max(18, tipRadius * (isPulling ? 6.1 : 5.4));
      const spriteHeight = Math.max(12, tipRadius * (isPulling ? 3.2 : 2.85));
      // hook.png faces left->right; anchor its right side to the hook tip/front
      // so the chain remains visually attached behind it.
      const tipAnchorX = spriteLength * 0.9;

      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(tipAngle);
      ctx.globalAlpha = ownerIsPlayer ? 0.96 : 0.94;
      ctx.drawImage(
        hookSpriteImage,
        -tipAnchorX,
        -spriteHeight * 0.5,
        spriteLength,
        spriteHeight
      );
      ctx.restore();
    } else {
      ctx.fillStyle = colorCore;
      ctx.beginPath();
      ctx.arc(tipX, tipY, tipRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = colorEdge;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(tipX, tipY, tipRadius + 2.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(tipAngle);
      ctx.fillStyle = ownerIsPlayer
        ? 'rgba(228,245,255,0.92)'
        : 'rgba(255,236,214,0.92)';
      ctx.beginPath();
      ctx.moveTo(tipRadius + 2.8, 0);
      ctx.lineTo(-1.8, -3.35);
      ctx.lineTo(-1.8, 3.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (isPulling) {
      ctx.strokeStyle = `rgba(${glowBase}, ${0.42 + (0.18 * pulse)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(tipX, tipY, tipRadius + 5 + (pulse * 1.5), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Particles ─────────────────────────────────────────────────
function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.45));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCombatImpactWaves() {
  const waves = Array.isArray(combatFx?.impactWaves) ? combatFx.impactWaves : [];
  const directional = Array.isArray(combatFx?.directionalWaves) ? combatFx.directionalWaves : [];
  if (!waves.length && !directional.length) return;

  ctx.save();
  ctx.lineCap = 'round';

  for (const wave of waves) {
    const lifeRatio = wave.maxLife > 0 ? Math.max(0, wave.life / wave.maxLife) : 0;
    if (lifeRatio <= 0) continue;
    const t = 1 - lifeRatio;
    const radius = (Number(wave.startRadius) || 0) + ((Number(wave.endRadius) || 0) - (Number(wave.startRadius) || 0)) * t;
    const alpha = (Number(wave.alpha) || 0.5) * lifeRatio;
    const fillAlpha = (Number(wave.fillAlpha) || 0.14) * lifeRatio;
    const color = String(wave.color || '255,210,166');

    ctx.strokeStyle = `rgba(${color}, ${alpha})`;
    ctx.lineWidth = Math.max(1, Number(wave.width) || 2.4);
    ctx.beginPath();
    ctx.arc(Number(wave.x) || 0, Number(wave.y) || 0, Math.max(1, radius), 0, Math.PI * 2);
    ctx.stroke();

    if (fillAlpha > 0.01) {
      ctx.fillStyle = `rgba(${color}, ${fillAlpha})`;
      ctx.beginPath();
      ctx.arc(Number(wave.x) || 0, Number(wave.y) || 0, Math.max(1, radius * 0.72), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const wave of directional) {
    const lifeRatio = wave.maxLife > 0 ? Math.max(0, wave.life / wave.maxLife) : 0;
    if (lifeRatio <= 0) continue;
    const t = 1 - lifeRatio;
    const centerX = (Number(wave.x) || 0) + (Number(wave.dx) || 0) * (Number(wave.travel) || 80) * t;
    const centerY = (Number(wave.y) || 0) + (Number(wave.dy) || 0) * (Number(wave.travel) || 80) * t;
    const sideX = -(Number(wave.dy) || 0);
    const sideY = Number(wave.dx) || 0;
    const spread = (Number(wave.spread) || 20) * (0.6 + t * 0.75);
    const halfLen = (Number(wave.spread) || 20) * (0.55 + t * 0.65);
    const alpha = (Number(wave.alpha) || 0.5) * lifeRatio;
    const color = String(wave.color || '184,220,255');

    ctx.strokeStyle = `rgba(${color}, ${alpha})`;
    ctx.lineWidth = Math.max(1, Number(wave.width) || 2.2);
    ctx.beginPath();
    ctx.moveTo(centerX - (Number(wave.dx) || 0) * halfLen - sideX * spread, centerY - (Number(wave.dy) || 0) * halfLen - sideY * spread);
    ctx.lineTo(centerX + (Number(wave.dx) || 0) * halfLen, centerY + (Number(wave.dy) || 0) * halfLen);
    ctx.lineTo(centerX - (Number(wave.dx) || 0) * halfLen + sideX * spread, centerY - (Number(wave.dy) || 0) * halfLen + sideY * spread);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEliminationPulse() {
  const pulse = combatFx?.eliminationPulse;
  if (!pulse || (Number(pulse.life) || 0) <= 0) return;

  const life = Math.max(0, Number(pulse.life) || 0);
  const maxLife = Math.max(0.0001, Number(pulse.maxLife) || 0.001);
  const t = 1 - (life / maxLife);
  const radius = 120 + (220 * t);
  const alpha = Math.max(0, (1 - t) * 0.36);

  ctx.save();
  const grad = ctx.createRadialGradient(
    Number(pulse.x) || 0,
    Number(pulse.y) || 0,
    0,
    Number(pulse.x) || 0,
    Number(pulse.y) || 0,
    radius
  );
  grad.addColorStop(0, `rgba(255, 196, 124, ${alpha})`);
  grad.addColorStop(0.5, `rgba(255, 148, 106, ${alpha * 0.56})`);
  grad.addColorStop(1, 'rgba(255, 126, 92, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(Number(pulse.x) || 0, Number(pulse.y) || 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Skill Aim Preview ─────────────────────────────────────────

function getWallPreviewData() {
  const dir = normalized(skillAimPreview.dx || player.aimX, skillAimPreview.dy || player.aimY);
  const perp = { x: -dir.y, y: dir.x };
  const wallLength = 150;
  const segmentRadius = 12;
  const segmentCount = 7;
  const centerDistance = player.r + 42;
  const centerX = player.x + dir.x * centerDistance;
  const centerY = player.y + dir.y * centerDistance;
  const segments = [];
  let blocked = false;

  for (let i = 0; i < segmentCount; i++) {
    const t = segmentCount === 1 ? 0 : (i / (segmentCount - 1)) - 0.5;
    const offset = t * wallLength;
    const sx = centerX + perp.x * offset;
    const sy = centerY + perp.y * offset;
    const invalid = !insidePlatform(sx, sy, segmentRadius + 4) || !!circleHitsObstacle(sx, sy, segmentRadius) || distance(sx, sy, player.x, player.y) < player.r + segmentRadius + 8;
    if (invalid) blocked = true;
    segments.push({ x: sx, y: sy, r: segmentRadius, blocked: invalid });
  }

  return { dir, perp, centerX, centerY, halfLen: wallLength * 0.5, segments, blocked };
}

function getRewindPreviewTarget() {
  const snap = getSafeRewindTarget(getRewindTarget(player.rewindSeconds || 1.0));
  if (!snap) return null;
  return snap;
}

function getRiftPlacementPreviewConfig() {
  const localUnitToPx = Math.max(1, (Number(player?.teleportDistance) || 150) / 6);
  return {
    rangeA: 7.0 * localUnitToPx,
    rangeB: 12.0 * localUnitToPx,
    portalRadius: Math.max(6, 0.9 * localUnitToPx)
  };
}

function isRiftPlacementPreviewActive(multiplayerArenaActive) {
  if (!player?.alive) return false;
  if (multiplayerArenaActive) {
    return !!(window.outraMultiplayer && typeof window.outraMultiplayer.isRiftPlacementModeActive === 'function' && window.outraMultiplayer.isRiftPlacementModeActive());
  }
  if (typeof isLocalRiftPlacementActive === 'function') {
    return !!isLocalRiftPlacementActive();
  }
  return !!player?.riftPlacementActive;
}

function resolveRiftPlacementStep() {
  const now = performance.now() / 1000;
  const pendingPortal = player?.riftPendingPortalA && typeof player.riftPendingPortalA === 'object'
    ? player.riftPendingPortalA
    : null;
  const pendingActive = !!pendingPortal && now < (Number(player?.riftPendingExpiresAt) || 0);
  return {
    step: pendingActive ? 'B' : 'A',
    pendingPortalA: pendingActive
      ? { x: Number(pendingPortal.x) || 0, y: Number(pendingPortal.y) || 0 }
      : null
  };
}

function resolveRiftPreviewPlacementAtTarget(originX, originY, targetX, targetY, maxDistancePx, portalRadiusPx) {
  const ox = Number(originX) || 0;
  const oy = Number(originY) || 0;
  const tx = Number(targetX);
  const ty = Number(targetY);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null;

  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0.001) return null;
  const dirX = dx / dist;
  const dirY = dy / dist;
  const maxDistance = Math.max(0, Number(maxDistancePx) || 0);
  const desiredDistance = Math.min(maxDistance, dist);
  const portalRadius = Math.max(6, Number(portalRadiusPx) || 10);
  const steps = 24;

  for (let step = steps; step >= 0; step -= 1) {
    const t = step / steps;
    const distancePx = desiredDistance * t;
    const x = ox + dirX * distancePx;
    const y = oy + dirY * distancePx;
    if (!insidePlatform(x, y, portalRadius + 4)) continue;
    if (circleHitsObstacle(x, y, portalRadius)) continue;
    return { x, y };
  }

  return null;
}

function drawRiftPlacementPreview(multiplayerArenaActive) {
  if (!isRiftPlacementPreviewActive(multiplayerArenaActive)) return;

  const stepState = resolveRiftPlacementStep();
  const cfg = getRiftPlacementPreviewConfig();
  const origin = stepState.step === 'B' && stepState.pendingPortalA
    ? stepState.pendingPortalA
    : { x: Number(player.x) || 0, y: Number(player.y) || 0 };
  const maxRange = stepState.step === 'B' ? cfg.rangeB : cfg.rangeA;
  const previewPlacement = resolveRiftPreviewPlacementAtTarget(
    origin.x,
    origin.y,
    Number(mouse?.x) || origin.x,
    Number(mouse?.y) || origin.y,
    maxRange,
    cfg.portalRadius
  );

  const dx = (Number(mouse?.x) || origin.x) - origin.x;
  const dy = (Number(mouse?.y) || origin.y) - origin.y;
  const dist = Math.hypot(dx, dy) || 1;
  const clampedTarget = {
    x: origin.x + (dx / dist) * Math.min(maxRange, dist),
    y: origin.y + (dy / dist) * Math.min(maxRange, dist)
  };
  const target = previewPlacement || clampedTarget;
  const valid = !!previewPlacement;
  const lineColor = valid ? '148,198,255' : '255,136,136';
  const portalBaseColor = valid ? '148,198,255' : '255,146,146';

  ctx.save();

  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = `rgba(${lineColor}, 0.42)`;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, maxRange, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${lineColor}, ${valid ? 0.62 : 0.78})`;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (stepState.pendingPortalA) {
    ctx.strokeStyle = `rgba(255, 176, 112, ${valid ? 0.38 : 0.28})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(stepState.pendingPortalA.x, stepState.pendingPortalA.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(
    target.x,
    target.y,
    Math.max(1, cfg.portalRadius * 0.25),
    target.x,
    target.y,
    cfg.portalRadius * 2.3
  );
  glow.addColorStop(0, `rgba(${portalBaseColor}, 0.42)`);
  glow.addColorStop(1, `rgba(${portalBaseColor}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(target.x, target.y, cfg.portalRadius * 2.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = `rgba(${portalBaseColor}, ${valid ? 0.92 : 0.88})`;
  ctx.beginPath();
  ctx.arc(target.x, target.y, cfg.portalRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = `rgba(255, 176, 112, ${valid ? 0.56 : 0.26})`;
  ctx.beginPath();
  ctx.arc(target.x, target.y, cfg.portalRadius * 0.64, 0, Math.PI * 2);
  ctx.stroke();

  const stateLabel = stepState.step === 'A'
    ? 'RIFT PLACEMENT: PLACE PORTAL A'
    : 'RIFT PLACEMENT: PLACE PORTAL B';
  const helperLabel = valid
    ? 'LMB Place Portal'
    : 'Invalid Spot';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 14px Arial';

  const labelY = Math.max(24, canvas.height * 0.07);
  const labelW = Math.max(220, ctx.measureText(stateLabel).width + 24);
  const labelH = 28;
  ctx.fillStyle = 'rgba(8, 14, 24, 0.68)';
  drawDraftRoundedRect((canvas.width - labelW) * 0.5, labelY - (labelH * 0.5), labelW, labelH, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(215, 233, 255, 0.96)';
  ctx.fillText(stateLabel, canvas.width * 0.5, labelY);

  ctx.font = '700 12px Arial';
  const helperW = Math.max(108, ctx.measureText(helperLabel).width + 18);
  const helperH = 22;
  const helperX = target.x;
  const helperY = target.y - (cfg.portalRadius + 20);
  ctx.fillStyle = `rgba(8, 14, 24, ${valid ? 0.62 : 0.7})`;
  drawDraftRoundedRect(helperX - helperW * 0.5, helperY - helperH * 0.5, helperW, helperH, 7);
  ctx.fill();
  ctx.fillStyle = valid ? 'rgba(214, 232, 255, 0.95)' : 'rgba(255, 190, 190, 0.96)';
  ctx.fillText(helperLabel, helperX, helperY);

  ctx.restore();
}

function drawSkillAimPreview() {
  const multiplayerArenaActive = !!getMultiplayerArenaRuntimeVisualState();
  if (!skillAimPreview.active || (!multiplayerArenaActive && gameState === 'lobby') || !player.alive) return;
  const dir = normalized(skillAimPreview.dx, skillAimPreview.dy);

  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);

  if (skillAimPreview.type === 'shield') {
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(120,190,255,0.7)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 12, 0, Math.PI * 2);
    ctx.stroke();

  } else if (skillAimPreview.type === 'fire' || skillAimPreview.type === 'hook') {
    const len  = skillAimPreview.type === 'fire' ? 140 : 225;
    const endX = player.x + dir.x * len;
    const endY = player.y + dir.y * len;

    ctx.strokeStyle = skillAimPreview.type === 'fire'
      ? 'rgba(255,160,70,0.28)'
      : 'rgba(190,230,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 24, 0, Math.PI * 2);
    ctx.strokeStyle = skillAimPreview.type === 'fire'
      ? 'rgba(255,140,60,0.14)'
      : 'rgba(180,220,255,0.14)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(endX, endY, skillAimPreview.type === 'fire' ? 8 : 10, 0, Math.PI * 2);
    ctx.strokeStyle = skillAimPreview.type === 'fire'
      ? 'rgba(255,200,120,0.75)'
      : 'rgba(220,245,255,0.75)';
    ctx.stroke();

  } else if (skillAimPreview.type === 'shock') {
    const len = 115;
    const spread = 0.6;

    ctx.strokeStyle = 'rgba(255,180,120,0.35)';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);

    ctx.lineTo(
      player.x + (dir.x * Math.cos(spread) - dir.y * Math.sin(spread)) * len,
      player.y + (dir.y * Math.cos(spread) + dir.x * Math.sin(spread)) * len
    );

    ctx.moveTo(player.x, player.y);

    ctx.lineTo(
      player.x + (dir.x * Math.cos(-spread) - dir.y * Math.sin(-spread)) * len,
      player.y + (dir.y * Math.cos(-spread) + dir.x * Math.sin(-spread)) * len
    );

    ctx.stroke();

  } else if (skillAimPreview.type === 'blink') {
    const target = getBlinkTargetPreview();

    ctx.strokeStyle = target.blocked ? 'rgba(255,110,110,0.24)' : 'rgba(170,140,255,0.24)';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(target.x, target.y, player.r + 8, 0, Math.PI * 2);
    ctx.strokeStyle = target.blocked ? 'rgba(255,120,120,0.8)' : 'rgba(186,166,255,0.82)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(target.x, target.y, player.r - 2, 0, Math.PI * 2);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = target.blocked ? 'rgba(255,90,90,1)' : 'rgba(170,140,255,1)';
    ctx.fill();

  } else if (skillAimPreview.type === 'charge') {
    const len = player.teleportDistance;
    const endX = player.x + dir.x * len;
    const endY = player.y + dir.y * len;

    ctx.strokeStyle = 'rgba(200,150,255,0.30)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(endX, endY, player.r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(225,190,255,0.80)';
    ctx.stroke();

    ctx.globalAlpha = 0.13;
    ctx.fillStyle = 'rgba(190,145,255,1)';
    ctx.beginPath();
    ctx.arc(endX, endY, player.r + 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (skillAimPreview.type === 'wall') {
    const preview = getWallPreviewData();

    ctx.setLineDash([]);
    ctx.strokeStyle = preview.blocked ? 'rgba(255,130,130,0.82)' : 'rgba(170,210,255,0.82)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(preview.centerX - preview.perp.x * preview.halfLen, preview.centerY - preview.perp.y * preview.halfLen);
    ctx.lineTo(preview.centerX + preview.perp.x * preview.halfLen, preview.centerY + preview.perp.y * preview.halfLen);
    ctx.stroke();

    ctx.strokeStyle = preview.blocked ? 'rgba(255,220,220,0.68)' : 'rgba(235,245,255,0.52)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(preview.centerX - preview.perp.x * preview.halfLen, preview.centerY - preview.perp.y * preview.halfLen);
    ctx.lineTo(preview.centerX + preview.perp.x * preview.halfLen, preview.centerY + preview.perp.y * preview.halfLen);
    ctx.stroke();

    for (const seg of preview.segments) {
      ctx.fillStyle = seg.blocked ? 'rgba(255,120,120,0.28)' : 'rgba(170,210,255,0.18)';
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, seg.r + 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skillAimPreview.type === 'rewind') {
    const target = getRewindPreviewTarget();
    if (target) {
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = 'rgba(186,166,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(220,190,255,0.88)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(target.x, target.y, player.r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ── Damage Texts ──────────────────────────────────────────────
function drawDamageTexts() {
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  for (const d of damageTexts) {
    const alpha = Math.max(0, d.life / 0.75);
    const fontSize = Math.max(14, Number(d.fontSize) || 20);
    const weightValue = Number(d.fontWeight);
    const fontWeight = Number.isFinite(weightValue)
      ? String(Math.max(500, Math.min(900, Math.round(weightValue))))
      : String(d.fontWeight || '900');
    ctx.font = `${fontWeight} ${fontSize}px Arial`;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = d.shadowColor || 'rgba(0,0,0,0.34)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = d.outlineColor || 'rgba(10,16,24,0.94)';
    ctx.lineWidth = Math.max(2.4, fontSize * 0.2);
    ctx.strokeText(d.value, d.x, d.y);
    ctx.fillStyle = d.color || '#ffd36b';
    ctx.fillText(d.value, d.x, d.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

// ── Crosshair ─────────────────────────────────────────────────
function hideArenaCursorReticle() {
  const reticleEl = typeof arenaCursorReticleEl !== 'undefined'
    ? arenaCursorReticleEl
    : document.getElementById('arenaCursorReticle');
  if (!reticleEl) return;
  reticleEl.classList.remove('is-visible');
  reticleEl.setAttribute('aria-hidden', 'true');
}

function syncArenaCursorReticle(mouseX, mouseY) {
  const reticleEl = typeof arenaCursorReticleEl !== 'undefined'
    ? arenaCursorReticleEl
    : document.getElementById('arenaCursorReticle');
  if (!reticleEl || !canvas) return;

  const rect = canvas.getBoundingClientRect();
  const canvasW = Math.max(1, Number(canvas.width) || 1);
  const canvasH = Math.max(1, Number(canvas.height) || 1);
  const clientX = Number(rect.left) + mouseX * (Number(rect.width) / canvasW);
  const clientY = Number(rect.top) + mouseY * (Number(rect.height) / canvasH);
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    hideArenaCursorReticle();
    return;
  }

  const transform = `translate3d(${clientX.toFixed(2)}px, ${clientY.toFixed(2)}px, 0) translate(-50%, -50%)`;
  if (reticleEl.style.transform !== transform) {
    reticleEl.style.transform = transform;
  }
  reticleEl.classList.add('is-visible');
  reticleEl.setAttribute('aria-hidden', 'false');
}

function drawCrosshair() {
  const multiplayerArenaActive = !!getMultiplayerArenaRuntimeVisualState();
  const shouldShowArenaReticle =
    !isTouchDevice &&
    !menuOpen &&
    (gameState === 'playing' || gameState === 'result' || multiplayerArenaActive);
  if (!shouldShowArenaReticle) {
    hideArenaCursorReticle();
    return;
  }
  const mouseX = Number(mouse?.x);
  const mouseY = Number(mouse?.y);
  if (!Number.isFinite(mouseX) || !Number.isFinite(mouseY)) {
    hideArenaCursorReticle();
    return;
  }

  syncArenaCursorReticle(mouseX, mouseY);
}

// ── Result Overlay ────────────────────────────────────────────
const resultOverlayCurrencyIcon = {
  img: null,
  src: '',
  state: 'idle', // idle | loading | loaded | failed
};

function getResultOverlayCurrencyIconPath() {
  return window.OUTRA_VISUAL_CONFIG?.lobbyArt?.currency || '/docs/art/Lobby/Currency.png';
}

function ensureResultOverlayCurrencyIcon() {
  const desiredSrc = String(getResultOverlayCurrencyIconPath() || '').trim();
  if (!desiredSrc) return null;

  if (resultOverlayCurrencyIcon.src !== desiredSrc) {
    resultOverlayCurrencyIcon.src = desiredSrc;
    resultOverlayCurrencyIcon.state = 'idle';
    resultOverlayCurrencyIcon.img = null;
  }

  if (resultOverlayCurrencyIcon.state === 'loaded' && resultOverlayCurrencyIcon.img) {
    return resultOverlayCurrencyIcon.img;
  }

  if (resultOverlayCurrencyIcon.state === 'loading') return null;
  if (resultOverlayCurrencyIcon.state === 'failed') return null;

  const img = new Image();
  img.decoding = 'async';
  resultOverlayCurrencyIcon.state = 'loading';
  img.onload = () => {
    if (resultOverlayCurrencyIcon.src !== desiredSrc) return;
    resultOverlayCurrencyIcon.img = img;
    resultOverlayCurrencyIcon.state = 'loaded';
  };
  img.onerror = () => {
    if (resultOverlayCurrencyIcon.src !== desiredSrc) return;
    resultOverlayCurrencyIcon.img = null;
    resultOverlayCurrencyIcon.state = 'failed';
  };
  img.src = desiredSrc;

  return null;
}

function fillRoundedRect(x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    return;
  }
  ctx.fillRect(x, y, w, h);
}

function drawResultOverlay() {
  if (gameState !== 'result') return;
  const centerX = canvas.width * 0.5;
  const centerY = canvas.height * 0.5;
  const panelW = Math.min(860, canvas.width * 0.9);
  const panelH = Math.min(300, canvas.height * 0.44);
  const panelX = centerX - panelW * 0.5;
  const panelY = centerY - panelH * 0.5;
  const panelR = 22;

  const currencyGain = Math.max(0, Math.floor(Number(winnerReward?.currency) || 0));
  const currencyIcon = currencyGain > 0 ? ensureResultOverlayCurrencyIcon() : null;

  let titleLine = winnerText || 'Round ended';
  let detailLine = '';
  const separators = [' • ', ' â€¢ '];
  for (const sep of separators) {
    const idx = titleLine.indexOf(sep);
    if (idx >= 0) {
      detailLine = titleLine.slice(idx + sep.length).trim();
      titleLine = titleLine.slice(0, idx).trim();
      break;
    }
  }

  ctx.save();

  const vignette = ctx.createRadialGradient(
    centerX,
    centerY,
    Math.max(120, panelW * 0.12),
    centerX,
    centerY,
    Math.max(canvas.width, canvas.height) * 0.76
  );
  vignette.addColorStop(0, 'rgba(8, 12, 20, 0.22)');
  vignette.addColorStop(1, 'rgba(3, 4, 8, 0.68)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelGrad.addColorStop(0, 'rgba(20, 30, 48, 0.94)');
  panelGrad.addColorStop(1, 'rgba(8, 12, 20, 0.95)');
  ctx.fillStyle = panelGrad;
  fillRoundedRect(panelX, panelY, panelW, panelH, panelR);

  ctx.strokeStyle = 'rgba(255, 218, 142, 0.42)';
  ctx.lineWidth = 2;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, panelR);
    ctx.stroke();
  } else {
    ctx.strokeRect(panelX, panelY, panelW, panelH);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '900 48px Arial';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.58)';
  ctx.fillStyle = '#f6e7c8';
  ctx.shadowColor = 'rgba(255, 186, 86, 0.34)';
  ctx.shadowBlur = 22;
  ctx.strokeText(titleLine, centerX, panelY + panelH * 0.36);
  ctx.fillText(titleLine, centerX, panelY + panelH * 0.36);

  if (detailLine) {
    ctx.shadowBlur = 14;
    ctx.font = '800 20px Arial';
    ctx.fillStyle = 'rgba(255, 224, 178, 0.95)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.54)';
    ctx.lineWidth = 5;
    ctx.strokeText(detailLine, centerX, panelY + panelH * 0.53);
    ctx.fillText(detailLine, centerX, panelY + panelH * 0.53);
  }

  if (currencyGain > 0) {
    const rewardY = panelY + panelH * (detailLine ? 0.72 : 0.62);
    const pillW = Math.max(170, Math.min(260, panelW * 0.32));
    const pillH = 44;
    const pillX = centerX - pillW * 0.5;

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 194, 102, 0.14)';
    fillRoundedRect(pillX, rewardY - pillH * 0.5, pillW, pillH, 999);
    ctx.strokeStyle = 'rgba(255, 204, 122, 0.54)';
    ctx.lineWidth = 1.5;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(pillX, rewardY - pillH * 0.5, pillW, pillH, 999);
      ctx.stroke();
    } else {
      ctx.strokeRect(pillX, rewardY - pillH * 0.5, pillW, pillH);
    }

    const iconSize = 24;
    const text = `+${currencyGain}`;
    ctx.font = '900 24px Arial';
    const textWidth = ctx.measureText(text).width;
    const groupW = (currencyIcon ? (iconSize + 10) : 0) + textWidth;
    let drawX = centerX - groupW * 0.5;

    if (currencyIcon) {
      ctx.drawImage(currencyIcon, drawX, rewardY - iconSize * 0.5, iconSize, iconSize);
      drawX += iconSize + 10;
    }

    ctx.fillStyle = '#ffe9bf';
    ctx.shadowColor = 'rgba(255, 186, 86, 0.32)';
    ctx.shadowBlur = 12;
    ctx.fillText(text, drawX + textWidth * 0.5, rewardY + 1);
  }

  ctx.shadowBlur = 0;
  ctx.font = '700 18px Arial';
  ctx.fillStyle = 'rgba(230, 238, 255, 0.9)';
  ctx.fillText('Returning to lobby...', centerX, panelY + panelH - 34);

  ctx.restore();
  ctx.textAlign = 'left';
}

function drawArenaStartCountdownOverlay() {
  if (typeof getArenaIntroOverlayLabel !== 'function') return;
  const label = getArenaIntroOverlayLabel();
  if (!label) return;

  const isFight = label === 'FIGHT';
  const centerX = canvas.width * 0.5;
  const centerY = canvas.height * 0.48;
  const size = isFight
    ? Math.max(78, canvas.width * 0.108)
    : Math.max(104, canvas.width * 0.132);

  ctx.save();

  ctx.fillStyle = isFight ? 'rgba(5, 10, 18, 0.16)' : 'rgba(4, 8, 14, 0.22)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(size)}px Arial`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = isFight ? 8 : 10;
  ctx.strokeStyle = isFight ? 'rgba(12, 62, 32, 0.74)' : 'rgba(42, 24, 10, 0.82)';
  ctx.shadowColor = isFight ? 'rgba(126, 255, 158, 0.44)' : 'rgba(255, 176, 92, 0.38)';
  ctx.shadowBlur = isFight ? 30 : 24;
  ctx.fillStyle = isFight ? '#9affb4' : '#ffe6bf';

  ctx.strokeText(label, centerX, centerY);
  ctx.fillText(label, centerX, centerY);

  if (typeof isArenaPreFightLocked === 'function' && isArenaPreFightLocked()) {
    ctx.shadowBlur = 0;
    ctx.font = '700 18px Arial';
    ctx.fillStyle = 'rgba(237, 243, 255, 0.9)';
    ctx.fillText('Movement and spells locked', centerX, centerY + size * 0.56);
  }

  ctx.restore();
}

function getReconnectForfeitCountdownState() {
  if (typeof getMultiplayerPresentationSnapshot !== 'function') return null;
  const snapshot = getMultiplayerPresentationSnapshot();
  if (!snapshot || !snapshot.active) return null;
  if (!snapshot.isArenaActive) return null;

  const reconnect = snapshot.reconnect && typeof snapshot.reconnect === 'object'
    ? snapshot.reconnect
    : null;
  if (!reconnect || !reconnect.pausedByDisconnect) return null;

  const disconnectedPlayers = Array.isArray(reconnect.disconnectedPlayers)
    ? reconnect.disconnectedPlayers
    : [];
  if (!disconnectedPlayers.length) return null;

  const nowMs = Date.now();
  let maxRemainingMs = 0;
  for (const entry of disconnectedPlayers) {
    const directRemaining = Number(entry?.remainingMs);
    const expiresAt = Number(entry?.reconnectGraceExpiresAt);
    const computedRemaining = Number.isFinite(directRemaining)
      ? Math.max(0, directRemaining)
      : (Number.isFinite(expiresAt) ? Math.max(0, expiresAt - nowMs) : 0);
    if (computedRemaining > maxRemainingMs) {
      maxRemainingMs = computedRemaining;
    }
  }

  return {
    disconnectedCount: disconnectedPlayers.length,
    remainingMs: maxRemainingMs,
    secondsLeft: Math.max(0, Math.ceil(maxRemainingMs / 1000)),
  };
}

function drawReconnectForfeitCountdownOverlay() {
  const countdownState = getReconnectForfeitCountdownState();
  if (!countdownState) return;
  if (gameState === 'result') return;

  const centerX = canvas.width * 0.5;
  const centerY = canvas.height * 0.5;
  const panelW = Math.min(700, canvas.width * 0.84);
  const panelH = Math.min(260, canvas.height * 0.34);
  const panelX = centerX - panelW * 0.5;
  const panelY = centerY - panelH * 0.5;

  const heading = countdownState.disconnectedCount > 1
    ? 'Players Disconnected'
    : 'Opponent Disconnected';
  const timerText = `${countdownState.secondsLeft}s`;

  ctx.save();

  const backdrop = ctx.createRadialGradient(
    centerX,
    centerY,
    Math.max(60, panelW * 0.12),
    centerX,
    centerY,
    Math.max(canvas.width, canvas.height) * 0.74
  );
  backdrop.addColorStop(0, 'rgba(18, 6, 6, 0.26)');
  backdrop.addColorStop(1, 'rgba(6, 3, 3, 0.58)');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelGrad.addColorStop(0, 'rgba(56, 16, 16, 0.90)');
  panelGrad.addColorStop(1, 'rgba(20, 8, 8, 0.94)');
  ctx.fillStyle = panelGrad;
  drawDraftRoundedRect(panelX, panelY, panelW, panelH, 20);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 150, 150, 0.56)';
  ctx.lineWidth = 2;
  drawDraftRoundedRect(panelX, panelY, panelW, panelH, 20);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '900 38px Arial';
  ctx.fillStyle = 'rgba(255, 226, 226, 0.98)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeText(heading, centerX, panelY + panelH * 0.28);
  ctx.fillText(heading, centerX, panelY + panelH * 0.28);

  ctx.font = '900 78px Arial';
  ctx.fillStyle = 'rgba(255, 196, 148, 0.98)';
  ctx.shadowColor = 'rgba(255, 120, 82, 0.34)';
  ctx.shadowBlur = 20;
  ctx.strokeStyle = 'rgba(22, 8, 8, 0.64)';
  ctx.lineWidth = 8;
  ctx.strokeText(timerText, centerX, panelY + panelH * 0.56);
  ctx.fillText(timerText, centerX, panelY + panelH * 0.56);

  ctx.shadowBlur = 0;
  ctx.font = '700 20px Arial';
  ctx.fillStyle = 'rgba(255, 226, 210, 0.95)';
  ctx.fillText('Reconnecting...', centerX, panelY + panelH * 0.78);
  ctx.font = '600 16px Arial';
  ctx.fillStyle = 'rgba(255, 208, 192, 0.88)';
  ctx.fillText('Match ends when countdown reaches zero.', centerX, panelY + panelH * 0.90);

  ctx.restore();
}

// ── Main Render ───────────────────────────────────────────────
const renderLayerState = {
  fxLayerVisible: true,
};
function setFxLayerVisibility(shouldShow) {
  const nextVisible = !!shouldShow;
  if (renderLayerState.fxLayerVisible === nextVisible) return;
  renderLayerState.fxLayerVisible = nextVisible;
  if (fxCanvas && fxCanvas.style) {
    fxCanvas.style.display = nextVisible ? 'block' : 'none';
  }
  if (!nextVisible) {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  }
}

function render() {
  const shouldRenderDraft = gameState === 'draft' || isMultiplayerDraftVisualPhase();
  const multiplayerArenaActive = !!getMultiplayerArenaRuntimeVisualState();
  const shouldRenderArenaVisuals = !shouldRenderDraft
    && (gameState === 'playing' || gameState === 'result' || multiplayerArenaActive);
  const useSplitFxLayer = false;
  const useFxLayer = useSplitFxLayer;
  if (!shouldRenderDraft) {
    hideDraftSpellIconOverlay();
  }
  if (!shouldRenderArenaVisuals) {
    hideArenaCursorReticle();
  }
  setFxLayerVisibility(useFxLayer);
  if (typeof window !== 'undefined') {
    window.__OUTRA_RENDER_LAYER_MODE = useFxLayer ? 2 : 1;
  }
  bgCtx.clearRect(0, 0, canvas.width, canvas.height);
  if (useFxLayer) {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  }
  const shouldShake = !shouldRenderDraft && (gameState === 'playing' || gameState === 'result' || multiplayerArenaActive);
  const shakeOffset = shouldShake && typeof getCombatScreenShakeOffset === 'function'
    ? getCombatScreenShakeOffset()
    : { x: 0, y: 0 };
  const shakeX = Number(shakeOffset?.x) || 0;
  const shakeY = Number(shakeOffset?.y) || 0;
  const hasShake = Math.abs(shakeX) > 0.01 || Math.abs(shakeY) > 0.01;
  if (hasShake) {
    bgCtx.save();
    bgCtx.translate(shakeX, shakeY);
    if (useFxLayer) {
      fxCtx.save();
      fxCtx.translate(shakeX, shakeY);
    }
  }
  if (shouldRenderDraft) {
    clearArenaFloatingStones();
    const drawDraftAsSplitLayers = useSplitFxLayer;
    ctx = bgCtx;
    drawDraftRoom(drawDraftAsSplitLayers ? 'background' : 'full');
    if (drawDraftAsSplitLayers) {
      ctx = fxCtx;
      drawDraftRoom('foreground');
    }
    ctx = bgCtx;
    if (hasShake) {
      if (useFxLayer) {
        fxCtx.restore();
      }
      bgCtx.restore();
    }
    return;
  }
  // Performance guard: skip expensive arena/background rendering while we're in non-arena phases
  // (e.g. lobby/menu/store overlays) where these layers are not visible to the player.
  if (!shouldRenderArenaVisuals) {
    clearArenaFloatingStones();
    if (hasShake) {
      if (useFxLayer) {
        fxCtx.restore();
      }
      bgCtx.restore();
    }
    ctx = bgCtx;
    return;
  }
  // Background canvas: arena / lava only
  ctx = bgCtx;
  drawArena();
  drawEliminationPulse();
  // Render gameplay FX directly on the background canvas unless a split overlay is needed.
  ctx = useFxLayer ? fxCtx : bgCtx;
  drawObstacles();
  drawWalls();
  drawPracticeSpellImageFx();
  drawRiftPendingPlacement();
  drawRifts();
  drawPhantomIllusions();
  drawPotions();
  drawParticles();
  drawHooks();
  drawProjectiles();
  if (dummyEnabled && dummy.alive) drawDummy();
  drawPlayer();
  drawCombatImpactWaves();
  drawSkillAimPreview();
  drawRiftPlacementPreview(multiplayerArenaActive);
  drawDamageTexts();
  drawCrosshair();
  drawSolarDistortionOverlay();
  drawArenaStartCountdownOverlay();
  drawReconnectForfeitCountdownOverlay();
  drawResultOverlay();
  // Restore default drawing context
  if (hasShake) {
    if (useFxLayer) {
      fxCtx.restore();
    }
    bgCtx.restore();
  }
  ctx = bgCtx;
}

function draftRoundedRectPath(targetCtx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w * 0.5, h * 0.5));

  if (typeof targetCtx.roundRect === 'function') {
    targetCtx.beginPath();
    targetCtx.roundRect(x, y, w, h, rr);
    return;
  }

  targetCtx.beginPath();
  targetCtx.moveTo(x + rr, y);
  targetCtx.lineTo(x + w - rr, y);
  targetCtx.quadraticCurveTo(x + w, y, x + w, y + rr);
  targetCtx.lineTo(x + w, y + h - rr);
  targetCtx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  targetCtx.lineTo(x + rr, y + h);
  targetCtx.quadraticCurveTo(x, y + h, x, y + h - rr);
  targetCtx.lineTo(x, y + rr);
  targetCtx.quadraticCurveTo(x, y, x + rr, y);
  targetCtx.closePath();
}

function drawDraftRoundedRect(x, y, w, h, r) {
  draftRoundedRectPath(ctx, x, y, w, h, r);
}

const DRAFT_VISUAL_STYLE = {
  bgTop: '#070a10',
  bgMid: '#0a101a',
  bgBottom: '#04070d',
  platformLift: 0.06,
  platformShadowAlpha: 0.52,
  platformShadowScaleX: 1.05,
  platformShadowScaleY: 0.28,
  platformCoreTop: '#3a4662',
  platformCoreMid: '#263349',
  platformCoreBottom: '#111b2c',
  gridFramePadX: 34,
  gridFramePadY: 22,
  gridFrameRadius: 20,
  tileRadius: 12,
  tileIdlePulseSpeed: 1.45,
  tileGlowPulseSpeed: 2.1,
  channelAccent: 'rgba(104, 236, 194, 1)',
};

const DRAFT_SPELL_ORB_RGB = {
  hook: '120,196,255',
  blink: '176,156,255',
  shield: '126,230,206',
  prism: '128,236,212',
  charge: '255,210,126',
  shock: '255,148,140',
  gust: '142,236,214',
  solar: '255,214,128',
  rift: '148,198,255',
  phantom: '204,180,255',
  wall: '202,178,146',
  rewind: '206,168,255',
};

const draftSpellOrbIconCache = Object.create(null);
const draftTileRenderCache = new Map();
const draftOrbRenderCache = new Map();
const DRAFT_TILE_RENDER_CACHE_LIMIT = 96;
const DRAFT_ORB_RENDER_CACHE_LIMIT = 96;
const draftSpellIconOverlayState = {
  elements: new Map(),
  labels: new Map(),
};
const DRAFT_BACKGROUND_IMAGE_PATH = '/docs/art/draft/bg.png';
const draftBackgroundImageCache = {
  src: '',
  loaded: false,
  failed: false,
  img: null,
};
const draftBackgroundRenderCache = {
  key: '',
  canvas: null,
};

function invalidateDraftBackgroundRenderCache() {
  draftBackgroundRenderCache.key = '';
  draftBackgroundRenderCache.canvas = null;
}

function drawImageCoverToContext(targetCtx, image, dx, dy, dw, dh) {
  if (!image || !image.naturalWidth || !image.naturalHeight || dw <= 0 || dh <= 0) return false;

  const scale = Math.max(dw / image.naturalWidth, dh / image.naturalHeight);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (image.naturalWidth - sw) * 0.5;
  const sy = (image.naturalHeight - sh) * 0.5;

  targetCtx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  return true;
}

function drawImageCover(image, dx, dy, dw, dh) {
  return drawImageCoverToContext(ctx, image, dx, dy, dw, dh);
}

function getDraftBackgroundImage() {
  const configuredPath = window.OUTRA_VISUAL_CONFIG?.draftRoom?.backgroundImage;
  const path = typeof configuredPath === 'string' && configuredPath.trim()
    ? configuredPath.trim()
    : DRAFT_BACKGROUND_IMAGE_PATH;

  if (!path) return null;

  const cached = draftBackgroundImageCache;
  if (cached.src === path && cached.img) {
    return cached.loaded ? cached.img : null;
  }

  const img = new Image();
  cached.src = path;
  cached.loaded = false;
  cached.failed = false;
  cached.img = img;
  img.decoding = 'async';
  img.onload = () => {
    if (draftBackgroundImageCache.img !== img) return;
    cached.loaded = true;
    cached.failed = false;
    invalidateDraftBackgroundRenderCache();
  };
  img.onerror = () => {
    if (draftBackgroundImageCache.img !== img) return;
    cached.loaded = false;
    cached.failed = true;
    invalidateDraftBackgroundRenderCache();
  };
  img.src = path;

  return null;
}

function draftEaseOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

function getDraftOrbConfig() {
  const roomCfg = window.OUTRA_VISUAL_CONFIG?.draftRoom || {};
  const orbCfg = roomCfg.orb || {};
  const stateBrightness = orbCfg.stateBrightness || {};

  return {
    height: Number.isFinite(Number(orbCfg.height)) ? Number(orbCfg.height) : 16,
    bobAmplitude: Number.isFinite(Number(orbCfg.bobAmplitude)) ? Number(orbCfg.bobAmplitude) : 5.5,
    bobSpeed: Number.isFinite(Number(orbCfg.bobSpeed)) ? Number(orbCfg.bobSpeed) : 1.35,
    scale: Number.isFinite(Number(orbCfg.scale)) ? Number(orbCfg.scale) : 1,
    glowIntensity: Number.isFinite(Number(orbCfg.glowIntensity)) ? Number(orbCfg.glowIntensity) : 1,
    stateBrightness: {
      idle: Number.isFinite(Number(stateBrightness.idle)) ? Number(stateBrightness.idle) : 1,
      selectable: Number.isFinite(Number(stateBrightness.selectable)) ? Number(stateBrightness.selectable) : 1.14,
      channeling: Number.isFinite(Number(stateBrightness.channeling)) ? Number(stateBrightness.channeling) : 1.36,
      taken: Number.isFinite(Number(stateBrightness.taken)) ? Number(stateBrightness.taken) : 0.42,
    },
  };
}

function getDraftSpellOrbRgb(spellId) {
  return DRAFT_SPELL_ORB_RGB[spellId] || '156,184,255';
}

function hideDraftSpellIconOverlay() {
  const overlayEl = typeof draftSpellIconOverlayEl !== 'undefined'
    ? draftSpellIconOverlayEl
    : document.getElementById('draftSpellIconOverlay');
  if (!overlayEl) return;
  overlayEl.setAttribute('aria-hidden', 'true');
  for (const iconEl of draftSpellIconOverlayState.elements.values()) {
    iconEl.style.display = 'none';
  }
  for (const labelEl of draftSpellIconOverlayState.labels.values()) {
    labelEl.style.display = 'none';
  }
}

function getDraftSpellIconOverlayImage(spellId) {
  const overlayEl = typeof draftSpellIconOverlayEl !== 'undefined'
    ? draftSpellIconOverlayEl
    : document.getElementById('draftSpellIconOverlay');
  if (!overlayEl || !spellId) return null;

  let iconEl = draftSpellIconOverlayState.elements.get(spellId);
  if (iconEl) return iconEl;

  iconEl = document.createElement('img');
  iconEl.className = 'draftSpellIconOverlayImg';
  iconEl.alt = '';
  iconEl.decoding = 'async';
  iconEl.loading = 'eager';
  iconEl.draggable = false;
  iconEl.dataset.spellId = spellId;
  overlayEl.appendChild(iconEl);
  draftSpellIconOverlayState.elements.set(spellId, iconEl);
  return iconEl;
}

function getDraftSpellIconOverlayLabel(spellId) {
  const overlayEl = typeof draftSpellIconOverlayEl !== 'undefined'
    ? draftSpellIconOverlayEl
    : document.getElementById('draftSpellIconOverlay');
  if (!overlayEl || !spellId) return null;

  let labelEl = draftSpellIconOverlayState.labels.get(spellId);
  if (labelEl) return labelEl;

  labelEl = document.createElement('div');
  labelEl.className = 'draftSpellIconOverlayLabel';
  labelEl.dataset.spellId = spellId;
  overlayEl.appendChild(labelEl);
  draftSpellIconOverlayState.labels.set(spellId, labelEl);
  return labelEl;
}

function snapDraftIconCssPx(value, dpr) {
  const safeDpr = Math.max(1, Number(dpr) || 1);
  return Math.round((Number(value) || 0) * safeDpr) / safeDpr;
}

function syncDraftSpellIconOverlay(entries) {
  const overlayEl = typeof draftSpellIconOverlayEl !== 'undefined'
    ? draftSpellIconOverlayEl
    : document.getElementById('draftSpellIconOverlay');
  if (!overlayEl || !canvas || !Array.isArray(entries) || !entries.length) {
    hideDraftSpellIconOverlay();
    return;
  }

  const canvasRect = canvas.getBoundingClientRect();
  const canvasW = Math.max(1, Number(canvas.width) || 1);
  const canvasH = Math.max(1, Number(canvas.height) || 1);
  const scaleX = Math.max(0.001, Number(canvasRect.width) / canvasW || 1);
  const scaleY = Math.max(0.001, Number(canvasRect.height) / canvasH || 1);
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  const activeIconIds = new Set();
  const activeLabelIds = new Set();

  overlayEl.setAttribute('aria-hidden', 'false');

  for (const entry of entries) {
    const spellId = String(entry.spellId || '').trim();
    const iconPath = String(entry.iconPath || '').trim();
    if (!spellId) continue;

    if (iconPath) {
      const iconEl = getDraftSpellIconOverlayImage(spellId);
      if (iconEl) {
        activeIconIds.add(spellId);
        if (iconEl.dataset.src !== iconPath) {
          iconEl.dataset.src = iconPath;
          iconEl.src = iconPath;
        }

        const centerX = Number(canvasRect.left) + entry.x * scaleX;
        const centerY = Number(canvasRect.top) + entry.y * scaleY;
        const rawSize = Math.max(12, entry.size * Math.max(scaleX, scaleY));
        const size = Math.max(12, snapDraftIconCssPx(rawSize, dpr));
        const left = snapDraftIconCssPx(centerX - size * 0.5, dpr);
        const top = snapDraftIconCssPx(centerY - size * 0.5, dpr);
        const leftCss = `${left.toFixed(3)}px`;
        const topCss = `${top.toFixed(3)}px`;
        const sizeCss = `${size.toFixed(3)}px`;
        const opacityCss = (Number.isFinite(Number(entry.opacity)) ? Number(entry.opacity) : 1).toFixed(3);
        if (iconEl.style.display !== 'block') iconEl.style.display = 'block';
        if (iconEl.style.left !== leftCss) iconEl.style.left = leftCss;
        if (iconEl.style.top !== topCss) iconEl.style.top = topCss;
        if (iconEl.style.width !== sizeCss) iconEl.style.width = sizeCss;
        if (iconEl.style.height !== sizeCss) iconEl.style.height = sizeCss;
        if (iconEl.style.opacity !== opacityCss) iconEl.style.opacity = opacityCss;
      }
    }

    const label = String(entry.label || '').trim();
    if (label) {
      const labelEl = getDraftSpellIconOverlayLabel(spellId);
      if (!labelEl) continue;

      activeLabelIds.add(spellId);
      if (labelEl.textContent !== label) labelEl.textContent = label;

      const centerX = Number(canvasRect.left) + (Number(entry.labelX) || Number(entry.x) || 0) * scaleX;
      const centerY = Number(canvasRect.top) + (Number(entry.labelY) || Number(entry.y) || 0) * scaleY;
      const width = Math.max(32, snapDraftIconCssPx((Number(entry.labelWidth) || 70) * scaleX, dpr));
      const left = snapDraftIconCssPx(centerX, dpr);
      const top = snapDraftIconCssPx(centerY, dpr);
      const leftCss = `${left.toFixed(3)}px`;
      const topCss = `${top.toFixed(3)}px`;
      const widthCss = `${width.toFixed(3)}px`;
      const opacityCss = (Number.isFinite(Number(entry.labelOpacity)) ? Number(entry.labelOpacity) : 1).toFixed(3);
      const colorCss = String(entry.labelColor || '').trim();
      if (labelEl.style.display !== 'block') labelEl.style.display = 'block';
      if (labelEl.style.left !== leftCss) labelEl.style.left = leftCss;
      if (labelEl.style.top !== topCss) labelEl.style.top = topCss;
      if (labelEl.style.width !== widthCss) labelEl.style.width = widthCss;
      if (labelEl.style.opacity !== opacityCss) labelEl.style.opacity = opacityCss;
      if (colorCss && labelEl.style.color !== colorCss) labelEl.style.color = colorCss;
    }
  }

  for (const [spellId, iconEl] of draftSpellIconOverlayState.elements) {
    if (!activeIconIds.has(spellId)) {
      iconEl.style.display = 'none';
    }
  }

  for (const [spellId, labelEl] of draftSpellIconOverlayState.labels) {
    if (!activeLabelIds.has(spellId)) {
      labelEl.style.display = 'none';
    }
  }
}

function invalidateDraftTileRenderCache() {
  draftTileRenderCache.clear();
  draftOrbRenderCache.clear();
}

function createDraftRenderCanvas(width, height) {
  const w = Math.max(1, Math.ceil(Number(width) || 1));
  const h = Math.max(1, Math.ceil(Number(height) || 1));
  if (typeof OffscreenCanvas === 'function') {
    return new OffscreenCanvas(w, h);
  }
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvasEl = document.createElement('canvas');
    canvasEl.width = w;
    canvasEl.height = h;
    return canvasEl;
  }
  return null;
}

function getDraftBackgroundRender(options) {
  const {
    cx,
    cy,
    platformRadius,
    gridCx,
    gridCy,
    gridRadius,
    style,
  } = options;
  const draftBackgroundImage = getDraftBackgroundImage();
  const key = [
    Math.round(Number(canvas.width) || 0),
    Math.round(Number(canvas.height) || 0),
    Math.round(cx),
    Math.round(cy),
    Math.round(platformRadius),
    Math.round(gridCx),
    Math.round(gridCy),
    Math.round(gridRadius),
    draftBackgroundImageCache.loaded ? draftBackgroundImageCache.src : 'no-image',
  ].join('|');

  if (draftBackgroundRenderCache.key === key && draftBackgroundRenderCache.canvas) {
    return draftBackgroundRenderCache.canvas;
  }

  const renderCanvas = createDraftRenderCanvas(canvas.width, canvas.height);
  if (!renderCanvas || typeof renderCanvas.getContext !== 'function') return null;
  const renderCtx = renderCanvas.getContext('2d');
  if (!renderCtx) return null;

  if (draftBackgroundImage) {
    drawImageCoverToContext(renderCtx, draftBackgroundImage, 0, 0, canvas.width, canvas.height);
  }

  const bg = renderCtx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, style.bgTop);
  bg.addColorStop(0.56, style.bgMid);
  bg.addColorStop(1, style.bgBottom);
  renderCtx.save();
  renderCtx.globalAlpha = draftBackgroundImage ? 0.44 : 1;
  renderCtx.fillStyle = bg;
  renderCtx.fillRect(0, 0, canvas.width, canvas.height);
  renderCtx.restore();

  const vignette = renderCtx.createRadialGradient(
    cx,
    cy - platformRadius * 0.30,
    platformRadius * 0.26,
    cx,
    cy,
    Math.max(canvas.width, canvas.height) * 0.82
  );
  vignette.addColorStop(0, 'rgba(92, 114, 168, 0.16)');
  vignette.addColorStop(0.55, 'rgba(34, 46, 74, 0.08)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
  renderCtx.fillStyle = vignette;
  renderCtx.fillRect(0, 0, canvas.width, canvas.height);

  const gridFocus = renderCtx.createRadialGradient(
    gridCx,
    gridCy,
    gridRadius * 0.18,
    gridCx,
    gridCy,
    gridRadius * 1.15
  );
  gridFocus.addColorStop(0, 'rgba(140, 168, 228, 0.15)');
  gridFocus.addColorStop(0.62, 'rgba(78, 104, 160, 0.04)');
  gridFocus.addColorStop(1, 'rgba(78, 104, 160, 0)');
  renderCtx.fillStyle = gridFocus;
  renderCtx.fillRect(0, 0, canvas.width, canvas.height);

  draftBackgroundRenderCache.key = key;
  draftBackgroundRenderCache.canvas = renderCanvas;
  return renderCanvas;
}

function getDraftTileOrbGeometry(tile, orbCfg, tileState) {
  const selectScale = tileState === 'selectable' ? 1.04 : 1;
  const orbRadius = Math.max(12, Math.min(tile.w, tile.h) * 0.27) * orbCfg.scale * selectScale;
  return {
    orbRadius,
    iconRadius: orbRadius * 0.80,
    orbCx: tile.cx,
    orbCy: tile.cy - orbCfg.height - tile.h * 0.03,
  };
}

function getDraftTileStatePalette(tileState, idlePulse = 0.5, holdRatio = 0, finalChannelRatio = 0) {
  const statePalette = {
    idle: {
      top: 'rgba(34, 45, 68, 0.90)',
      bottom: 'rgba(16, 22, 36, 0.94)',
      edge: `rgba(132, 166, 228, ${0.22 + idlePulse * 0.08})`,
      inner: 'rgba(88, 120, 184, 0.18)',
      label: 'rgba(232, 240, 255, 0.96)',
      glow: `rgba(84, 126, 204, ${0.04 + idlePulse * 0.04})`,
    },
    selectable: {
      top: 'rgba(44, 62, 96, 0.92)',
      bottom: 'rgba(20, 34, 58, 0.96)',
      edge: 'rgba(208, 228, 255, 0.50)',
      inner: 'rgba(120, 162, 230, 0.22)',
      label: 'rgba(248, 252, 255, 0.99)',
      glow: `rgba(122, 182, 255, ${0.12 + idlePulse * 0.08})`,
    },
    channeling: {
      top: 'rgba(36, 74, 84, 0.94)',
      bottom: 'rgba(16, 44, 54, 0.96)',
      edge: `rgba(184, 255, 232, ${0.46 + holdRatio * 0.16 + finalChannelRatio * 0.12})`,
      inner: `rgba(112, 228, 198, ${0.28 + finalChannelRatio * 0.14})`,
      label: 'rgba(242, 255, 248, 0.99)',
      glow: `rgba(96, 236, 198, ${0.20 + holdRatio * 0.14 + finalChannelRatio * 0.18})`,
    },
    taken: {
      top: 'rgba(28, 32, 40, 0.94)',
      bottom: 'rgba(14, 18, 24, 0.96)',
      edge: 'rgba(112, 124, 148, 0.18)',
      inner: 'rgba(74, 86, 110, 0.12)',
      label: 'rgba(168, 176, 194, 0.92)',
      glow: 'rgba(0, 0, 0, 0)',
    },
  };
  return statePalette[tileState] || statePalette.idle;
}

function getDraftTileRenderCacheKey(tile, tileState, holder, orbCfg, iconImage, useDomIcon = false) {
  const stateBrightness = orbCfg.stateBrightness || {};
  return [
    tile.id,
    tile.label,
    Math.round(tile.w),
    Math.round(tile.h),
    tileState,
    String(holder || '').trim().toUpperCase(),
    useDomIcon ? 'dom-icon' : (iconImage ? 'icon' : 'fallback'),
    SPELL_ICONS?.[tile.id] || '',
    Number(orbCfg.height) || 0,
    Number(orbCfg.scale) || 1,
    Number(orbCfg.glowIntensity) || 1,
    Number(stateBrightness.idle) || 1,
    Number(stateBrightness.selectable) || 1,
    Number(stateBrightness.channeling) || 1,
    Number(stateBrightness.taken) || 1,
  ].join('|');
}

function getDraftOrbRenderCacheKey(tile, tileState, orbCfg, iconImage, orbRadius) {
  const stateBrightness = orbCfg.stateBrightness || {};
  return [
    tile.id,
    tile.label,
    tileState,
    iconImage ? 'icon' : 'fallback',
    SPELL_ICONS?.[tile.id] || '',
    Math.round((Number(orbRadius) || 0) * 100),
    Number(orbCfg.glowIntensity) || 1,
    Number(stateBrightness.idle) || 1,
    Number(stateBrightness.selectable) || 1,
    Number(stateBrightness.channeling) || 1,
    Number(stateBrightness.taken) || 1,
  ].join('|');
}

function drawDraftOrbCachedContent(orbCtx, options) {
  const {
    tile,
    orbCfg,
    spellRgb,
    tileState,
    iconImage,
    orbRadius,
    centerX,
    centerY,
  } = options;
  const idlePulse = 0.5;
  const finalChannelRatio = 0;
  const stateBrightness = orbCfg.stateBrightness[tileState] || 1;
  const iconRadius = orbRadius * 0.80;

  orbCtx.save();
  orbCtx.textAlign = 'center';
  orbCtx.textBaseline = 'middle';

  const glowPulseBoost = tileState === 'selectable' ? 1.14 : 1;
  const glowStrength = Math.max(0.1, orbCfg.glowIntensity * stateBrightness * glowPulseBoost);
  const glowNearAlpha = Math.max(0, Math.min(1, 0.16 * glowStrength));
  const glowMidAlpha = Math.max(0, Math.min(1, 0.08 * glowStrength));
  const orbGlow = orbCtx.createRadialGradient(
    centerX,
    centerY,
    orbRadius * 0.16,
    centerX,
    centerY,
    orbRadius * 2.25
  );
  orbGlow.addColorStop(0, `rgba(${spellRgb}, ${glowNearAlpha})`);
  orbGlow.addColorStop(0.55, `rgba(${spellRgb}, ${glowMidAlpha})`);
  orbGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  orbCtx.fillStyle = orbGlow;
  orbCtx.beginPath();
  orbCtx.arc(centerX, centerY, orbRadius * 2.25, 0, Math.PI * 2);
  orbCtx.fill();

  const orbCore = orbCtx.createLinearGradient(centerX, centerY - orbRadius, centerX, centerY + orbRadius);
  orbCore.addColorStop(0, `rgba(230, 242, 255, ${0.64 * stateBrightness})`);
  orbCore.addColorStop(0.52, `rgba(92, 124, 170, ${0.36 * stateBrightness})`);
  orbCore.addColorStop(1, `rgba(20, 32, 52, ${0.90 * stateBrightness})`);
  orbCtx.fillStyle = orbCore;
  orbCtx.beginPath();
  orbCtx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
  orbCtx.fill();

  orbCtx.strokeStyle = tileState === 'taken'
    ? 'rgba(142, 156, 184, 0.40)'
    : `rgba(234, 246, 255, ${0.56 + finalChannelRatio * 0.20})`;
  orbCtx.lineWidth = tileState === 'channeling' ? 2.3 : 1.8;
  orbCtx.beginPath();
  orbCtx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
  orbCtx.stroke();

  orbCtx.save();
  orbCtx.beginPath();
  orbCtx.arc(centerX, centerY, iconRadius, 0, Math.PI * 2);
  orbCtx.clip();

  if (iconImage) {
    const iconSize = iconRadius * 2.28;
    orbCtx.globalAlpha = tileState === 'taken' ? 0.42 : Math.min(1, 0.92 + (stateBrightness - 1) * 0.28);
    orbCtx.drawImage(iconImage, centerX - iconSize * 0.5, centerY - iconSize * 0.5, iconSize, iconSize);
  } else {
    const fallbackGrad = orbCtx.createLinearGradient(centerX, centerY - iconRadius, centerX, centerY + iconRadius);
    fallbackGrad.addColorStop(0, `rgba(${spellRgb}, 0.40)`);
    fallbackGrad.addColorStop(1, `rgba(${spellRgb}, 0.12)`);
    orbCtx.fillStyle = fallbackGrad;
    orbCtx.fillRect(centerX - iconRadius, centerY - iconRadius, iconRadius * 2, iconRadius * 2);
    orbCtx.fillStyle = tileState === 'taken' ? 'rgba(216, 222, 236, 0.54)' : 'rgba(238, 245, 255, 0.95)';
    orbCtx.font = 'bold 12px Arial';
    const fallbackIcon = SPELL_DEFS?.[tile.id]?.icon || tile.label.slice(0, 1);
    orbCtx.fillText(fallbackIcon, centerX, centerY + 0.5);
  }
  orbCtx.restore();

  const orbGloss = orbCtx.createLinearGradient(
    centerX,
    centerY - orbRadius * 1.05,
    centerX,
    centerY + orbRadius * 0.10
  );
  orbGloss.addColorStop(0, 'rgba(255,255,255,0.36)');
  orbGloss.addColorStop(1, 'rgba(255,255,255,0)');
  orbCtx.save();
  orbCtx.beginPath();
  orbCtx.arc(centerX, centerY, orbRadius * 0.92, Math.PI * 1.08, Math.PI * 1.92);
  orbCtx.lineTo(centerX, centerY);
  orbCtx.closePath();
  orbCtx.fillStyle = orbGloss;
  orbCtx.fill();
  orbCtx.restore();

  if (tileState === 'selectable') {
    orbCtx.strokeStyle = `rgba(${spellRgb}, ${0.32 + idlePulse * 0.20})`;
    orbCtx.lineWidth = 1.5;
    orbCtx.beginPath();
    orbCtx.arc(centerX, centerY, orbRadius + 3.5, 0, Math.PI * 2);
    orbCtx.stroke();
  } else if (tileState === 'taken') {
    orbCtx.strokeStyle = 'rgba(198, 206, 224, 0.36)';
    orbCtx.lineWidth = 1.7;
    orbCtx.beginPath();
    orbCtx.moveTo(centerX - orbRadius * 0.52, centerY - orbRadius * 0.52);
    orbCtx.lineTo(centerX + orbRadius * 0.52, centerY + orbRadius * 0.52);
    orbCtx.moveTo(centerX + orbRadius * 0.52, centerY - orbRadius * 0.52);
    orbCtx.lineTo(centerX - orbRadius * 0.52, centerY + orbRadius * 0.52);
    orbCtx.stroke();
  }

  orbCtx.restore();
}

function getDraftOrbRender(tile, options) {
  const { orbCfg, tileState, iconImage, spellRgb } = options;
  const { orbRadius } = getDraftTileOrbGeometry(tile, orbCfg, tileState);
  const key = getDraftOrbRenderCacheKey(tile, tileState, orbCfg, iconImage, orbRadius);
  const cached = draftOrbRenderCache.get(key);
  if (cached) return cached;

  const pad = Math.max(16, Math.ceil(orbRadius * 2.45 + 6));
  const renderCanvas = createDraftRenderCanvas(pad * 2, pad * 2);
  if (!renderCanvas || typeof renderCanvas.getContext !== 'function') return null;
  const orbCtx = renderCanvas.getContext('2d');
  if (!orbCtx) return null;

  drawDraftOrbCachedContent(orbCtx, {
    tile,
    orbCfg,
    spellRgb,
    tileState,
    iconImage,
    orbRadius,
    centerX: pad,
    centerY: pad,
  });

  const entry = {
    canvas: renderCanvas,
    pad,
    orbRadius,
  };
  if (draftOrbRenderCache.size >= DRAFT_ORB_RENDER_CACHE_LIMIT) {
    const firstKey = draftOrbRenderCache.keys().next().value;
    if (firstKey) draftOrbRenderCache.delete(firstKey);
  }
  draftOrbRenderCache.set(key, entry);
  return entry;
}

function drawDraftTileCachedContent(tileCtx, tile, options) {
  const {
    style,
    orbCfg,
    spellRgb,
    tileState,
    holder,
    holderColor,
    iconImage,
  } = options;
  const includeOrb = options.includeOrb !== false;
  const useDomIcon = !!options.useDomIcon && !!SPELL_ICONS?.[tile.id];
  const idlePulse = 0.5;
  const holdRatio = 0;
  const finalChannelRatio = 0;
  const tileBurstStrength = 0;
  const stateBrightness = orbCfg.stateBrightness[tileState] || 1;
  const palette = getDraftTileStatePalette(tileState, idlePulse, holdRatio, finalChannelRatio);
  const { orbRadius, iconRadius, orbCx, orbCy } = getDraftTileOrbGeometry(tile, orbCfg, tileState);

  tileCtx.save();
  tileCtx.textAlign = 'center';
  tileCtx.textBaseline = 'middle';
  tileCtx.font = 'bold 12px Arial';

  tileCtx.save();
  tileCtx.shadowColor = palette.glow;
  tileCtx.shadowBlur = tileState === 'channeling'
    ? 14
    : tileState === 'selectable'
      ? 12
      : 6;
  tileCtx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  draftRoundedRectPath(tileCtx, tile.x + 2, tile.y + 3, tile.w - 4, tile.h - 3, style.tileRadius - 1);
  tileCtx.fill();
  tileCtx.restore();

  const tileGrad = tileCtx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + tile.h);
  tileGrad.addColorStop(0, palette.top);
  tileGrad.addColorStop(1, palette.bottom);
  draftRoundedRectPath(tileCtx, tile.x, tile.y, tile.w, tile.h, style.tileRadius);
  tileCtx.fillStyle = tileGrad;
  tileCtx.fill();

  const shade = tileCtx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + tile.h);
  shade.addColorStop(0, 'rgba(255,255,255,0.10)');
  shade.addColorStop(0.44, 'rgba(255,255,255,0.00)');
  shade.addColorStop(1, 'rgba(0,0,0,0.24)');
  draftRoundedRectPath(tileCtx, tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2, style.tileRadius - 1);
  tileCtx.fillStyle = shade;
  tileCtx.fill();

  if (includeOrb) {
  const glowPulseBoost = tileState === 'selectable' ? 1.14 : 1;
  const glowStrength = Math.max(0.1, orbCfg.glowIntensity * stateBrightness * glowPulseBoost);
  const glowNearAlpha = Math.max(0, Math.min(1, 0.16 * glowStrength + tileBurstStrength * 0.16));
  const glowMidAlpha = Math.max(0, Math.min(1, 0.08 * glowStrength + tileBurstStrength * 0.10));
  const orbGlow = tileCtx.createRadialGradient(
    orbCx,
    orbCy,
    orbRadius * 0.16,
    orbCx,
    orbCy,
    orbRadius * 2.25
  );
  orbGlow.addColorStop(0, `rgba(${spellRgb}, ${glowNearAlpha})`);
  orbGlow.addColorStop(0.55, `rgba(${spellRgb}, ${glowMidAlpha})`);
  orbGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  tileCtx.fillStyle = orbGlow;
  tileCtx.beginPath();
  tileCtx.arc(orbCx, orbCy, orbRadius * 2.25, 0, Math.PI * 2);
  tileCtx.fill();

  const orbCore = tileCtx.createLinearGradient(orbCx, orbCy - orbRadius, orbCx, orbCy + orbRadius);
  orbCore.addColorStop(0, `rgba(230, 242, 255, ${0.64 * stateBrightness})`);
  orbCore.addColorStop(0.52, `rgba(92, 124, 170, ${0.36 * stateBrightness})`);
  orbCore.addColorStop(1, `rgba(20, 32, 52, ${0.90 * stateBrightness})`);
  tileCtx.fillStyle = orbCore;
  tileCtx.beginPath();
  tileCtx.arc(orbCx, orbCy, orbRadius, 0, Math.PI * 2);
  tileCtx.fill();

  tileCtx.strokeStyle = tileState === 'taken'
    ? 'rgba(142, 156, 184, 0.40)'
    : 'rgba(234, 246, 255, 0.56)';
  tileCtx.lineWidth = tileState === 'channeling' ? 2.3 : 1.8;
  tileCtx.beginPath();
  tileCtx.arc(orbCx, orbCy, orbRadius, 0, Math.PI * 2);
  tileCtx.stroke();

  tileCtx.save();
  tileCtx.beginPath();
  tileCtx.arc(orbCx, orbCy, iconRadius, 0, Math.PI * 2);
  tileCtx.clip();

  if (iconImage && !useDomIcon) {
    const iconSize = iconRadius * 2.28;
    tileCtx.globalAlpha = tileState === 'taken' ? 0.42 : Math.min(1, 0.92 + (stateBrightness - 1) * 0.28);
    tileCtx.drawImage(iconImage, orbCx - iconSize * 0.5, orbCy - iconSize * 0.5, iconSize, iconSize);
  } else if (!useDomIcon) {
    const fallbackGrad = tileCtx.createLinearGradient(orbCx, orbCy - iconRadius, orbCx, orbCy + iconRadius);
    fallbackGrad.addColorStop(0, `rgba(${spellRgb}, 0.40)`);
    fallbackGrad.addColorStop(1, `rgba(${spellRgb}, 0.12)`);
    tileCtx.fillStyle = fallbackGrad;
    tileCtx.fillRect(orbCx - iconRadius, orbCy - iconRadius, iconRadius * 2, iconRadius * 2);
    tileCtx.fillStyle = tileState === 'taken' ? 'rgba(216, 222, 236, 0.54)' : 'rgba(238, 245, 255, 0.95)';
    tileCtx.font = 'bold 12px Arial';
    const fallbackIcon = SPELL_DEFS?.[tile.id]?.icon || tile.label.slice(0, 1);
    tileCtx.fillText(fallbackIcon, orbCx, orbCy + 0.5);
  }
  tileCtx.restore();

  const orbGloss = tileCtx.createLinearGradient(
    orbCx,
    orbCy - orbRadius * 1.05,
    orbCx,
    orbCy + orbRadius * 0.10
  );
  orbGloss.addColorStop(0, 'rgba(255,255,255,0.36)');
  orbGloss.addColorStop(1, 'rgba(255,255,255,0)');
  tileCtx.save();
  tileCtx.beginPath();
  tileCtx.arc(orbCx, orbCy, orbRadius * 0.92, Math.PI * 1.08, Math.PI * 1.92);
  tileCtx.lineTo(orbCx, orbCy);
  tileCtx.closePath();
  tileCtx.fillStyle = orbGloss;
  tileCtx.fill();
  tileCtx.restore();

  if (tileState === 'selectable') {
    tileCtx.strokeStyle = `rgba(${spellRgb}, 0.42)`;
    tileCtx.lineWidth = 1.5;
    tileCtx.beginPath();
    tileCtx.arc(orbCx, orbCy, orbRadius + 3.5, 0, Math.PI * 2);
    tileCtx.stroke();
  } else if (tileState === 'taken') {
    tileCtx.strokeStyle = 'rgba(198, 206, 224, 0.36)';
    tileCtx.lineWidth = 1.7;
    tileCtx.beginPath();
    tileCtx.moveTo(orbCx - orbRadius * 0.52, orbCy - orbRadius * 0.52);
    tileCtx.lineTo(orbCx + orbRadius * 0.52, orbCy + orbRadius * 0.52);
    tileCtx.moveTo(orbCx + orbRadius * 0.52, orbCy - orbRadius * 0.52);
    tileCtx.lineTo(orbCx - orbRadius * 0.52, orbCy + orbRadius * 0.52);
    tileCtx.stroke();
  }
  }

  tileCtx.strokeStyle = palette.edge;
  tileCtx.lineWidth = tileState === 'channeling' ? 1.8 : tileState === 'selectable' ? 1.5 : 1.1;
  draftRoundedRectPath(tileCtx, tile.x, tile.y, tile.w, tile.h, style.tileRadius);
  tileCtx.stroke();

  tileCtx.strokeStyle = palette.inner;
  tileCtx.lineWidth = 0.8;
  draftRoundedRectPath(tileCtx, tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 4, style.tileRadius - 2);
  tileCtx.stroke();

  if (tileState === 'selectable' || tileState === 'channeling') {
    const accent = tileState === 'channeling'
      ? style.channelAccent
      : 'rgba(184, 226, 255, 0.76)';
    const cornerLen = 7;
    tileCtx.strokeStyle = accent;
    tileCtx.lineWidth = 1.2;
    tileCtx.beginPath();
    tileCtx.moveTo(tile.x + 6, tile.y + 10);
    tileCtx.lineTo(tile.x + 6, tile.y + 6);
    tileCtx.lineTo(tile.x + 6 + cornerLen, tile.y + 6);
    tileCtx.moveTo(tile.x + tile.w - 6, tile.y + 10);
    tileCtx.lineTo(tile.x + tile.w - 6, tile.y + 6);
    tileCtx.lineTo(tile.x + tile.w - 6 - cornerLen, tile.y + 6);
    tileCtx.moveTo(tile.x + 6, tile.y + tile.h - 10);
    tileCtx.lineTo(tile.x + 6, tile.y + tile.h - 6);
    tileCtx.lineTo(tile.x + 6 + cornerLen, tile.y + tile.h - 6);
    tileCtx.moveTo(tile.x + tile.w - 6, tile.y + tile.h - 10);
    tileCtx.lineTo(tile.x + tile.w - 6, tile.y + tile.h - 6);
    tileCtx.lineTo(tile.x + tile.w - 6 - cornerLen, tile.y + tile.h - 6);
    tileCtx.stroke();
  }

  if (tileState === 'taken') {
    tileCtx.save();
    draftRoundedRectPath(tileCtx, tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2, style.tileRadius - 1);
    tileCtx.clip();
    tileCtx.strokeStyle = 'rgba(148, 158, 178, 0.16)';
    tileCtx.lineWidth = 1;
    for (let hx = tile.x - tile.h; hx < tile.x + tile.w + tile.h; hx += 10) {
      tileCtx.beginPath();
      tileCtx.moveTo(hx, tile.y + tile.h);
      tileCtx.lineTo(hx + tile.h, tile.y);
      tileCtx.stroke();
    }
    tileCtx.restore();
  }

  // Spell names live in the DOM overlay so they stay above the sharp icon layer.

  if (tileState === 'taken') {
    const holderId = String(holder || '').trim().toUpperCase();
    if (holderId) {
      const badgeW = 16;
      const badgeH = 14;
      const badgeX = tile.x + 6;
      const badgeY = tile.y + tile.h - badgeH - 5;
      tileCtx.fillStyle = 'rgba(10, 14, 22, 0.58)';
      draftRoundedRectPath(tileCtx, badgeX, badgeY, badgeW, badgeH, 4);
      tileCtx.fill();

      tileCtx.strokeStyle = 'rgba(168, 184, 210, 0.24)';
      tileCtx.lineWidth = 1;
      draftRoundedRectPath(tileCtx, badgeX, badgeY, badgeW, badgeH, 4);
      tileCtx.stroke();

      tileCtx.save();
      tileCtx.textAlign = 'center';
      tileCtx.textBaseline = 'middle';
      tileCtx.fillStyle = holderColor;
      tileCtx.font = 'bold 10px Arial';
      tileCtx.fillText(holderId, badgeX + badgeW * 0.5, badgeY + badgeH * 0.5 + 0.5);
      tileCtx.restore();
    }
  } else if (tileState === 'channeling') {
    tileCtx.fillStyle = 'rgba(222, 255, 246, 0.88)';
    tileCtx.font = 'bold 10px Arial';
    tileCtx.fillText('CHANNELING', tile.cx, tile.y + tile.h - 11);
  } else if (tileState === 'selectable') {
    tileCtx.fillStyle = 'rgba(192, 224, 255, 0.72)';
    tileCtx.font = 'bold 10px Arial';
    tileCtx.fillText('SELECTABLE', tile.cx, tile.y + tile.h - 10);
  }

  tileCtx.restore();
}

function getDraftTileRender(tile, options) {
  const orbGeometry = getDraftTileOrbGeometry(tile, options.orbCfg, options.tileState);
  const orbLocalTop = tile.h * 0.5 - options.orbCfg.height - tile.h * 0.03 - orbGeometry.orbRadius * 2.35;
  const pad = Math.max(24, Math.ceil(Math.max(0, -orbLocalTop) + 8));
  const key = getDraftTileRenderCacheKey(
    tile,
    options.tileState,
    options.holder,
    options.orbCfg,
    options.iconImage,
    !!options.useDomIcon
  );
  const cached = draftTileRenderCache.get(key);
  if (cached) return cached;

  const renderCanvas = createDraftRenderCanvas(tile.w + pad * 2, tile.h + pad * 2);
  if (!renderCanvas || typeof renderCanvas.getContext !== 'function') return null;
  const tileCtx = renderCanvas.getContext('2d');
  if (!tileCtx) return null;

  const localTile = {
    ...tile,
    x: pad,
    y: pad,
    cx: pad + tile.w * 0.5,
    cy: pad + tile.h * 0.5,
  };
  drawDraftTileCachedContent(tileCtx, localTile, options);

  const entry = {
    canvas: renderCanvas,
    pad,
  };
  if (draftTileRenderCache.size >= DRAFT_TILE_RENDER_CACHE_LIMIT) {
    const firstKey = draftTileRenderCache.keys().next().value;
    if (firstKey) draftTileRenderCache.delete(firstKey);
  }
  draftTileRenderCache.set(key, entry);
  return entry;
}

function getDraftSpellOrbIcon(spellId) {
  const path = SPELL_ICONS?.[spellId];
  if (!path) return null;

  const cached = draftSpellOrbIconCache[spellId];
  if (cached && cached.src === path) {
    return cached.loaded ? cached.img : null;
  }

  const img = new Image();
  const entry = {
    src: path,
    loaded: false,
    failed: false,
    img,
  };
  const markLoaded = () => {
    if (entry.loaded) return;
    entry.loaded = true;
    entry.failed = false;
    invalidateDraftTileRenderCache();
  };
  const markFailed = () => {
    entry.loaded = false;
    entry.failed = true;
    invalidateDraftTileRenderCache();
  };
  img.decoding = 'async';
  img.onload = markLoaded;
  img.onerror = markFailed;
  img.src = path;
  if (typeof img.decode === 'function') {
    img.decode().then(markLoaded).catch(() => {
      if (!entry.loaded) {
        entry.failed = true;
      }
    });
  }
  draftSpellOrbIconCache[spellId] = entry;
  return null;
}

function preloadDraftSpellOrbIcons(spellIds) {
  if (!Array.isArray(spellIds)) return;
  const seen = new Set();
  for (const spellId of spellIds) {
    if (!spellId || seen.has(spellId)) continue;
    seen.add(spellId);
    getDraftSpellOrbIcon(spellId);
  }
}

function drawDraftTurnFlashOverlay() {
  if (typeof getMultiplayerPresentationSnapshot === 'function') {
    const snapshot = getMultiplayerPresentationSnapshot();
    if (snapshot && snapshot.active && snapshot.isDraftActive) {
      // Multiplayer already has persistent turn UI badges; suppress center flash to avoid
      // network-jitter-driven strobing when turn state updates arrive unevenly.
      draftState.turnFlash = null;
      return;
    }
  }

  const flash = draftState?.turnFlash;
  if (!flash || typeof flash !== 'object') return;

  const playerId = String(flash.playerId || '').trim().toUpperCase();
  if (!playerId) {
    draftState.turnFlash = null;
    return;
  }

  const startedAt = Number(flash.startedAt) || 0;
  const durationMs = Math.max(120, Number(flash.durationMs) || 420);
  const elapsedMs = performance.now() - startedAt;
  if (elapsedMs < 0 || elapsedMs >= durationMs) {
    draftState.turnFlash = null;
    return;
  }

  const t = Math.max(0, Math.min(1, elapsedMs / durationMs));
  const fade = 1 - draftEaseOutCubic(t);
  const scale = 0.9 + t * 0.18;
  const x = canvas.width * 0.5;
  const y = canvas.height * 0.5;
  const fontSize = Math.max(120, Math.round(Math.min(canvas.width, canvas.height) * 0.26 * scale));
  const turnColors = {
    A: { fill: 'rgba(128, 206, 255, 1)', stroke: 'rgba(42, 96, 154, 1)', glow: 'rgba(96, 176, 255, 0.6)' },
    B: { fill: 'rgba(255, 194, 122, 1)', stroke: 'rgba(152, 88, 38, 1)', glow: 'rgba(255, 156, 86, 0.54)' },
    C: { fill: 'rgba(192, 168, 255, 1)', stroke: 'rgba(94, 72, 156, 1)', glow: 'rgba(170, 132, 255, 0.54)' },
    D: { fill: 'rgba(255, 150, 188, 1)', stroke: 'rgba(152, 60, 94, 1)', glow: 'rgba(255, 116, 160, 0.54)' },
  };
  const color = turnColors[playerId] || turnColors.A;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, fade));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${fontSize}px Arial`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(5, Math.round(fontSize * 0.08));
  ctx.shadowColor = color.glow;
  ctx.shadowBlur = Math.max(12, fontSize * 0.18 * fade);
  ctx.strokeStyle = color.stroke;
  ctx.fillStyle = color.fill;
  ctx.strokeText(playerId, x, y);
  ctx.fillText(playerId, x, y);
  ctx.restore();
}

function drawDraftRoom(mode = 'full') {
  const renderBackground = mode !== 'foreground';
  const renderForeground = mode !== 'background';

  const layout = draftState.layout || {
    cx: canvas.width * 0.5,
    cy: canvas.height * 0.57,
    platformRadius: Math.max(170, Math.min(canvas.width, canvas.height) * 0.24),
    tileRects: [],
    seats: {},
  };
  const cx = layout.cx;
  const cy = layout.cy;
  const platformRadius = layout.platformRadius;
  const tileRects = Array.isArray(layout.tileRects) ? layout.tileRects : [];
  const participantIds = Array.isArray(layout.participantIds) && layout.participantIds.length
    ? layout.participantIds
    : (() => {
        const fromSeats = Object.keys(layout?.seats || {});
        if (fromSeats.length) return fromSeats;
        const fromOrder = [];
        const seen = new Set();
        for (const id of Array.isArray(draftState.order) ? draftState.order : []) {
          if (typeof id !== 'string' || !id || seen.has(id)) continue;
          seen.add(id);
          fromOrder.push(id);
        }
        return fromOrder;
      })();
  const draftNow = performance.now() * 0.001;
  const style = DRAFT_VISUAL_STYLE;
  const orbCfg = getDraftOrbConfig();
  const nowMs = performance.now();
  const activePlayerId = (Array.isArray(draftState.order) && draftState.order.length)
    ? draftState.order[Math.max(0, Math.min(draftState.order.length - 1, Number(draftState.turnIndex) || 0))]
    : null;
  const activeActor = activePlayerId ? draftState.players?.[activePlayerId] : null;
  const pickFx = draftState.pickFx && typeof draftState.pickFx === 'object'
    ? draftState.pickFx
    : { transfers: [], ringPulses: [], tileBursts: [] };

  const activeTransfers = Array.isArray(pickFx.transfers)
    ? pickFx.transfers.filter((fx) => nowMs - (fx.startedAt || 0) <= (fx.durationMs || 0) + 40)
    : [];
  const activeRingPulses = Array.isArray(pickFx.ringPulses)
    ? pickFx.ringPulses.filter((fx) => nowMs - (fx.startedAt || 0) <= (fx.durationMs || 0) + 40)
    : [];
  const activeTileBursts = Array.isArray(pickFx.tileBursts)
    ? pickFx.tileBursts.filter((fx) => nowMs - (fx.startedAt || 0) <= (fx.durationMs || 0) + 40)
    : [];

  if (Array.isArray(pickFx.transfers)) pickFx.transfers = activeTransfers;
  if (Array.isArray(pickFx.ringPulses)) pickFx.ringPulses = activeRingPulses;
  if (Array.isArray(pickFx.tileBursts)) pickFx.tileBursts = activeTileBursts;

  let gridMinX = cx - platformRadius * 0.66;
  let gridMinY = cy - platformRadius * 0.40;
  let gridMaxX = cx + platformRadius * 0.66;
  let gridMaxY = cy + platformRadius * 0.40;
  if (tileRects.length) {
    gridMinX = Math.min(...tileRects.map((tile) => tile.x));
    gridMinY = Math.min(...tileRects.map((tile) => tile.y));
    gridMaxX = Math.max(...tileRects.map((tile) => tile.x + tile.w));
    gridMaxY = Math.max(...tileRects.map((tile) => tile.y + tile.h));
  }
  const gridCx = (gridMinX + gridMaxX) * 0.5;
  const gridCy = (gridMinY + gridMaxY) * 0.5;
  const gridRadius = Math.max(100, Math.hypot(gridMaxX - gridMinX, gridMaxY - gridMinY) * 0.58);
  const gridPulse = 0.5 + 0.5 * Math.sin(draftNow * style.tileGlowPulseSpeed);

  if (renderBackground) {
    const cachedDraftBackground = getDraftBackgroundRender({
      cx,
      cy,
      platformRadius,
      gridCx,
      gridCy,
      gridRadius,
      style,
    });
    if (cachedDraftBackground) {
      ctx.drawImage(cachedDraftBackground, 0, 0);
    } else {
    const draftBackgroundImage = getDraftBackgroundImage();
    if (draftBackgroundImage) {
      drawImageCover(draftBackgroundImage, 0, 0, canvas.width, canvas.height);
    }

    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, style.bgTop);
    bg.addColorStop(0.56, style.bgMid);
    bg.addColorStop(1, style.bgBottom);
    ctx.save();
    ctx.globalAlpha = draftBackgroundImage ? 0.44 : 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const vignette = ctx.createRadialGradient(
      cx,
      cy - platformRadius * 0.30,
      platformRadius * 0.26,
      cx,
      cy,
      Math.max(canvas.width, canvas.height) * 0.82
    );
    vignette.addColorStop(0, 'rgba(92, 114, 168, 0.16)');
    vignette.addColorStop(0.55, 'rgba(34, 46, 74, 0.08)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridFocus = ctx.createRadialGradient(
      gridCx,
      gridCy,
      gridRadius * 0.18,
      gridCx,
      gridCy,
      gridRadius * 1.15
    );
    gridFocus.addColorStop(0, `rgba(140, 168, 228, ${0.12 + gridPulse * 0.06})`);
    gridFocus.addColorStop(0.62, 'rgba(78, 104, 160, 0.04)');
    gridFocus.addColorStop(1, 'rgba(78, 104, 160, 0)');
    ctx.fillStyle = gridFocus;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawLegacyDraftDeck = false;
    if (drawLegacyDraftDeck) {
      const deckY = cy - platformRadius * style.platformLift;

      ctx.fillStyle = `rgba(0, 0, 0, ${style.platformShadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy + platformRadius * 0.70,
        platformRadius * style.platformShadowScaleX,
        platformRadius * style.platformShadowScaleY,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      const underside = ctx.createLinearGradient(
        cx,
        deckY + platformRadius * 0.26,
        cx,
        deckY + platformRadius * 0.92
      );
      underside.addColorStop(0, 'rgba(20, 30, 48, 0.88)');
      underside.addColorStop(1, 'rgba(6, 10, 18, 0.95)');
      ctx.fillStyle = underside;
      ctx.beginPath();
      ctx.ellipse(
        cx,
        deckY + platformRadius * 0.38,
        platformRadius * 0.90,
        platformRadius * 0.24,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      const platform = ctx.createRadialGradient(
        cx,
        deckY - platformRadius * 0.24,
        platformRadius * 0.14,
        cx,
        deckY,
        platformRadius * 1.05
      );
      platform.addColorStop(0, style.platformCoreTop);
      platform.addColorStop(0.52, style.platformCoreMid);
      platform.addColorStop(1, style.platformCoreBottom);
      ctx.fillStyle = platform;
      ctx.beginPath();
      ctx.arc(cx, deckY, platformRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(182, 206, 255, 0.24)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(cx, deckY, platformRadius - 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(88, 118, 178, 0.40)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, deckY, platformRadius * 0.76, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(70, 102, 160, 0.28)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(cx, deckY, platformRadius * 0.56, 0, Math.PI * 2);
      ctx.stroke();
    }
    }
  }

  if (!renderForeground) {
    return;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px Arial';

  const draftPickerColors = {
    A: 'rgba(120, 198, 255, 0.98)',
    B: 'rgba(255, 188, 110, 0.98)',
    C: 'rgba(186, 156, 255, 0.98)',
    D: 'rgba(255, 132, 170, 0.98)',
  };
  const draftSpells = Array.isArray(draftState.spells) ? draftState.spells : [];
  const draftSpellById = new Map(draftSpells.map((spell) => [spell.id, spell]));
  const draftIconOverlayEntries = [];

  for (const tile of tileRects) {
    const spell = draftSpellById.get(tile.id) || null;
    const isTaken = !!spell?.disabled;
    const holder = spell?.takenBy || '';
    const isHoldTarget = !isTaken && draftState.holdSpellId === tile.id && activePlayerId === draftState.localPlayerId;
    const holdRatio = isHoldTarget
      ? Math.max(0, Math.min(1, (draftState.holdTime || 0) / Math.max(0.1, draftState.holdDuration || 0.6)))
      : 0;
    const isSelectable = !isTaken && !draftState.complete;
    const isTriggerHit = typeof isDraftTileTriggerHit === 'function'
      ? isDraftTileTriggerHit(activeActor, tile)
      : (
          !!activeActor &&
          activeActor.x >= tile.x + 8 &&
          activeActor.x <= tile.x + tile.w - 8 &&
          activeActor.y >= tile.y + 6 &&
          activeActor.y <= tile.y + tile.h - 6
        );
    const isActiveStanding =
      !!activeActor &&
      isSelectable &&
      isTriggerHit;
    const idlePulse = 0.5 + 0.5 * Math.sin(
      draftNow * style.tileIdlePulseSpeed + tile.cx * 0.018 + tile.cy * 0.013
    );
    const finalChannelRatio = isHoldTarget
      ? Math.max(0, Math.min(1, (holdRatio - 0.76) / 0.24))
      : 0;
    const tileBurstFx = activeTileBursts.find((fx) => fx.tileId === tile.id) || null;
    const tileBurstStrength = tileBurstFx
      ? Math.max(
          0,
          1 - draftEaseOutCubic(
            Math.max(0, Math.min(1, (nowMs - tileBurstFx.startedAt) / Math.max(1, tileBurstFx.durationMs || 1)))
          )
        )
      : 0;

    let tileState = 'idle';
    if (isTaken) tileState = 'taken';
    else if (isHoldTarget) tileState = 'channeling';
    else if (isActiveStanding) tileState = 'selectable';

    const cachedSpellRgb = getDraftSpellOrbRgb(tile.id);
    const cachedIconPath = String(SPELL_ICONS?.[tile.id] || '').trim();
    const useDomIcon = !!cachedIconPath;
    const cachedIconImage = useDomIcon ? null : getDraftSpellOrbIcon(tile.id);
    const cachedHolderId = String(holder || '').trim().toUpperCase();
    const cachedHolderColor = draftPickerColors[cachedHolderId] || 'rgba(198, 206, 220, 0.92)';
    const cachedTileRender = getDraftTileRender(tile, {
      style,
      orbCfg,
      spellRgb: cachedSpellRgb,
      tileState,
      holder: cachedHolderId,
      holderColor: cachedHolderColor,
      iconImage: cachedIconImage,
      useDomIcon,
    });

    if (cachedTileRender) {
      ctx.drawImage(
        cachedTileRender.canvas,
        Math.round(tile.x - cachedTileRender.pad),
        Math.round(tile.y - cachedTileRender.pad)
      );

      const { orbRadius, orbCx, orbCy } = getDraftTileOrbGeometry(tile, orbCfg, tileState);
      const labelPalette = getDraftTileStatePalette(tileState);
      draftIconOverlayEntries.push({
        spellId: tile.id,
        iconPath: useDomIcon ? cachedIconPath : '',
        x: orbCx,
        y: orbCy,
        size: orbRadius * 0.80 * 2.28,
        opacity: tileState === 'taken' ? 0.46 : Math.min(1, 0.92 + ((orbCfg.stateBrightness[tileState] || 1) - 1) * 0.28),
        label: tile.label,
        labelX: tile.cx,
        labelY: tile.y + tile.h - 17,
        labelWidth: Math.max(40, tile.w - 10),
        labelOpacity: tileState === 'taken' ? 0.82 : 1,
        labelColor: labelPalette.label,
      });

      if (tileState === 'channeling' && holdRatio > 0) {
        const startA = -Math.PI * 0.5;
        const endA = startA + Math.PI * 2 * holdRatio;
        ctx.strokeStyle = `rgba(198, 255, 236, ${0.58 + finalChannelRatio * 0.28})`;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(orbCx, orbCy, orbRadius + 4, startA, endA);
        ctx.stroke();
      }

      if (isHoldTarget && finalChannelRatio > 0) {
        const chargeOverlay = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + tile.h);
        chargeOverlay.addColorStop(0, `rgba(190, 255, 236, ${0.06 + finalChannelRatio * 0.16})`);
        chargeOverlay.addColorStop(1, `rgba(116, 236, 198, ${0.03 + finalChannelRatio * 0.14})`);
        drawDraftRoundedRect(tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2, style.tileRadius - 1);
        ctx.fillStyle = chargeOverlay;
        ctx.fill();
      }

      if (tileState === 'taken' && tileBurstStrength > 0) {
        const settleGlow = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + tile.h);
        settleGlow.addColorStop(0, `rgba(172, 226, 255, ${0.08 + tileBurstStrength * 0.24})`);
        settleGlow.addColorStop(1, `rgba(110, 164, 224, ${0.02 + tileBurstStrength * 0.16})`);
        drawDraftRoundedRect(tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2, style.tileRadius - 1);
        ctx.fillStyle = settleGlow;
        ctx.fill();
      }

      if (tileState === 'channeling') {
        const overlayW = Math.max(0, (tile.w - 6) * holdRatio);
        ctx.fillStyle = `rgba(102, 236, 194, ${0.14 + holdRatio * 0.20})`;
        drawDraftRoundedRect(tile.x + 3, tile.y + 3, overlayW, tile.h - 6, style.tileRadius - 2);
        ctx.fill();

        const barW = Math.max(14, (tile.w - 14) * holdRatio);
        const barX = tile.x + 7;
        const barY = tile.y + tile.h - 9;
        ctx.fillStyle = 'rgba(104, 236, 194, 0.98)';
        drawDraftRoundedRect(barX, barY, barW, 4, 2);
        ctx.fill();

        const tipX = Math.min(tile.x + tile.w - 7, barX + barW);
        ctx.fillStyle = 'rgba(224, 255, 244, 0.90)';
        drawDraftRoundedRect(tipX - 2, barY - 1, 4, 6, 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(222, 255, 246, 0.88)';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('CHANNELING', tile.cx, tile.y + tile.h - 11);
      }

      continue;
    }

    const spellRgb = getDraftSpellOrbRgb(tile.id);
    const stateBrightness = orbCfg.stateBrightness[tileState] || 1;
    const bobOffset = 0;
    const channelScale = tileState === 'channeling' ? (1 + finalChannelRatio * 0.16) : 1;
    const selectScale = tileState === 'selectable' ? 1.04 : 1;
    const orbRadius = Math.max(12, Math.min(tile.w, tile.h) * 0.27) * orbCfg.scale * channelScale * selectScale;
    const orbCx = tile.cx;
    const orbCy = tile.cy - orbCfg.height + bobOffset - tile.h * 0.03;
    const iconRadius = orbRadius * 0.80;

    const statePalette = {
      idle: {
        top: 'rgba(34, 45, 68, 0.90)',
        bottom: 'rgba(16, 22, 36, 0.94)',
        edge: `rgba(132, 166, 228, ${0.22 + idlePulse * 0.08})`,
        inner: 'rgba(88, 120, 184, 0.18)',
        label: 'rgba(232, 240, 255, 0.96)',
        glow: `rgba(84, 126, 204, ${0.04 + idlePulse * 0.04})`,
      },
      selectable: {
        top: 'rgba(44, 62, 96, 0.92)',
        bottom: 'rgba(20, 34, 58, 0.96)',
        edge: 'rgba(208, 228, 255, 0.50)',
        inner: 'rgba(120, 162, 230, 0.22)',
        label: 'rgba(248, 252, 255, 0.99)',
        glow: `rgba(122, 182, 255, ${0.12 + idlePulse * 0.08})`,
      },
      channeling: {
        top: 'rgba(36, 74, 84, 0.94)',
        bottom: 'rgba(16, 44, 54, 0.96)',
        edge: `rgba(184, 255, 232, ${0.46 + holdRatio * 0.16 + finalChannelRatio * 0.12})`,
        inner: `rgba(112, 228, 198, ${0.28 + finalChannelRatio * 0.14})`,
        label: 'rgba(242, 255, 248, 0.99)',
        glow: `rgba(96, 236, 198, ${0.20 + holdRatio * 0.14 + finalChannelRatio * 0.18})`,
      },
      taken: {
        top: 'rgba(28, 32, 40, 0.94)',
        bottom: 'rgba(14, 18, 24, 0.96)',
        edge: 'rgba(112, 124, 148, 0.18)',
        inner: 'rgba(74, 86, 110, 0.12)',
        label: 'rgba(168, 176, 194, 0.92)',
        glow: 'rgba(0, 0, 0, 0)',
      },
    };
    const palette = statePalette[tileState];

    ctx.save();
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = tileState === 'channeling'
      ? (14 + holdRatio * 10)
      : tileState === 'selectable'
        ? (10 + idlePulse * 5)
        : (5 + idlePulse * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    drawDraftRoundedRect(tile.x + 2, tile.y + 3, tile.w - 4, tile.h - 3, style.tileRadius - 1);
    ctx.fill();
    ctx.restore();

    const tileGrad = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + tile.h);
    tileGrad.addColorStop(0, palette.top);
    tileGrad.addColorStop(1, palette.bottom);
    drawDraftRoundedRect(tile.x, tile.y, tile.w, tile.h, style.tileRadius);
    ctx.fillStyle = tileGrad;
    ctx.fill();

    const shade = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + tile.h);
    shade.addColorStop(0, 'rgba(255,255,255,0.10)');
    shade.addColorStop(0.44, 'rgba(255,255,255,0.00)');
    shade.addColorStop(1, 'rgba(0,0,0,0.24)');
    drawDraftRoundedRect(tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2, style.tileRadius - 1);
    ctx.fillStyle = shade;
    ctx.fill();

    const glowPulseBoost = tileState === 'channeling'
      ? (1 + holdRatio * 0.45 + finalChannelRatio * 0.35)
      : tileState === 'selectable'
        ? (1.08 + idlePulse * 0.12)
        : (0.94 + idlePulse * 0.08);
    const glowStrength = Math.max(0.1, orbCfg.glowIntensity * stateBrightness * glowPulseBoost);

    const glowNearAlpha = Math.max(0, Math.min(1, 0.16 * glowStrength + tileBurstStrength * 0.16));
    const glowMidAlpha = Math.max(0, Math.min(1, 0.08 * glowStrength + tileBurstStrength * 0.10));
    const orbGlow = ctx.createRadialGradient(
      orbCx,
      orbCy,
      orbRadius * 0.16,
      orbCx,
      orbCy,
      orbRadius * (2.25 + tileBurstStrength * 0.35)
    );
    orbGlow.addColorStop(0, `rgba(${spellRgb}, ${glowNearAlpha})`);
    orbGlow.addColorStop(0.55, `rgba(${spellRgb}, ${glowMidAlpha})`);
    orbGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orbGlow;
    ctx.beginPath();
    ctx.arc(orbCx, orbCy, orbRadius * 2.25, 0, Math.PI * 2);
    ctx.fill();

    const orbCore = ctx.createLinearGradient(orbCx, orbCy - orbRadius, orbCx, orbCy + orbRadius);
    orbCore.addColorStop(0, `rgba(230, 242, 255, ${0.64 * stateBrightness})`);
    orbCore.addColorStop(0.52, `rgba(92, 124, 170, ${0.36 * stateBrightness})`);
    orbCore.addColorStop(1, `rgba(20, 32, 52, ${0.90 * stateBrightness})`);
    ctx.fillStyle = orbCore;
    ctx.beginPath();
    ctx.arc(orbCx, orbCy, orbRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = tileState === 'taken'
      ? 'rgba(142, 156, 184, 0.40)'
      : `rgba(234, 246, 255, ${0.56 + finalChannelRatio * 0.20})`;
    ctx.lineWidth = tileState === 'channeling' ? 2.3 : 1.8;
    ctx.beginPath();
    ctx.arc(orbCx, orbCy, orbRadius, 0, Math.PI * 2);
    ctx.stroke();

    const iconImage = getDraftSpellOrbIcon(tile.id);
    draftIconOverlayEntries.push({
      spellId: tile.id,
      label: tile.label,
      labelX: tile.cx,
      labelY: tile.y + tile.h - 17,
      labelWidth: Math.max(40, tile.w - 10),
      labelOpacity: tileState === 'taken' ? 0.82 : 1,
      labelColor: palette.label,
    });
    ctx.save();
    ctx.beginPath();
    ctx.arc(orbCx, orbCy, iconRadius, 0, Math.PI * 2);
    ctx.clip();

    if (iconImage) {
      const iconSize = iconRadius * 2.28;
      ctx.globalAlpha = tileState === 'taken' ? 0.42 : Math.min(1, 0.92 + (stateBrightness - 1) * 0.28);
      ctx.drawImage(iconImage, orbCx - iconSize * 0.5, orbCy - iconSize * 0.5, iconSize, iconSize);
    } else {
      const fallbackGrad = ctx.createLinearGradient(orbCx, orbCy - iconRadius, orbCx, orbCy + iconRadius);
      fallbackGrad.addColorStop(0, `rgba(${spellRgb}, 0.40)`);
      fallbackGrad.addColorStop(1, `rgba(${spellRgb}, 0.12)`);
      ctx.fillStyle = fallbackGrad;
      ctx.fillRect(orbCx - iconRadius, orbCy - iconRadius, iconRadius * 2, iconRadius * 2);
      ctx.fillStyle = tileState === 'taken' ? 'rgba(216, 222, 236, 0.54)' : 'rgba(238, 245, 255, 0.95)';
      ctx.font = 'bold 12px Arial';
      const fallbackIcon = SPELL_DEFS?.[tile.id]?.icon || tile.label.slice(0, 1);
      ctx.fillText(fallbackIcon, orbCx, orbCy + 0.5);
    }
    ctx.restore();

    const orbGloss = ctx.createLinearGradient(
      orbCx,
      orbCy - orbRadius * 1.05,
      orbCx,
      orbCy + orbRadius * 0.10
    );
    orbGloss.addColorStop(0, 'rgba(255,255,255,0.36)');
    orbGloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(orbCx, orbCy, orbRadius * 0.92, Math.PI * 1.08, Math.PI * 1.92);
    ctx.lineTo(orbCx, orbCy);
    ctx.closePath();
    ctx.fillStyle = orbGloss;
    ctx.fill();
    ctx.restore();

    if (tileState === 'channeling') {
      const startA = -Math.PI * 0.5;
      const endA = startA + Math.PI * 2 * holdRatio;
      ctx.strokeStyle = `rgba(198, 255, 236, ${0.58 + finalChannelRatio * 0.28})`;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbRadius + 4, startA, endA);
      ctx.stroke();
    } else if (tileState === 'selectable') {
      ctx.strokeStyle = `rgba(${spellRgb}, ${0.32 + idlePulse * 0.20})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbRadius + 3.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tileState === 'taken') {
      ctx.strokeStyle = 'rgba(198, 206, 224, 0.36)';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(orbCx - orbRadius * 0.52, orbCy - orbRadius * 0.52);
      ctx.lineTo(orbCx + orbRadius * 0.52, orbCy + orbRadius * 0.52);
      ctx.moveTo(orbCx + orbRadius * 0.52, orbCy - orbRadius * 0.52);
      ctx.lineTo(orbCx - orbRadius * 0.52, orbCy + orbRadius * 0.52);
      ctx.stroke();
    }

    if (isHoldTarget && finalChannelRatio > 0) {
      const chargeOverlay = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + tile.h);
      chargeOverlay.addColorStop(0, `rgba(190, 255, 236, ${0.06 + finalChannelRatio * 0.16})`);
      chargeOverlay.addColorStop(1, `rgba(116, 236, 198, ${0.03 + finalChannelRatio * 0.14})`);
      drawDraftRoundedRect(tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2, style.tileRadius - 1);
      ctx.fillStyle = chargeOverlay;
      ctx.fill();
    }

    if (tileState === 'taken' && tileBurstStrength > 0) {
      const settleGlow = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + tile.h);
      settleGlow.addColorStop(0, `rgba(172, 226, 255, ${0.08 + tileBurstStrength * 0.24})`);
      settleGlow.addColorStop(1, `rgba(110, 164, 224, ${0.02 + tileBurstStrength * 0.16})`);
      drawDraftRoundedRect(tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2, style.tileRadius - 1);
      ctx.fillStyle = settleGlow;
      ctx.fill();
    }

    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = tileState === 'channeling' ? 1.8 : tileState === 'selectable' ? 1.5 : 1.1;
    drawDraftRoundedRect(tile.x, tile.y, tile.w, tile.h, style.tileRadius);
    ctx.stroke();

    ctx.strokeStyle = palette.inner;
    ctx.lineWidth = 0.8;
    drawDraftRoundedRect(tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 4, style.tileRadius - 2);
    ctx.stroke();

    if (tileState === 'selectable' || tileState === 'channeling') {
      const accent = tileState === 'channeling'
        ? style.channelAccent
        : `rgba(184, 226, 255, ${0.65 + idlePulse * 0.20})`;
      const cornerLen = 7;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tile.x + 6, tile.y + 10);
      ctx.lineTo(tile.x + 6, tile.y + 6);
      ctx.lineTo(tile.x + 6 + cornerLen, tile.y + 6);
      ctx.moveTo(tile.x + tile.w - 6, tile.y + 10);
      ctx.lineTo(tile.x + tile.w - 6, tile.y + 6);
      ctx.lineTo(tile.x + tile.w - 6 - cornerLen, tile.y + 6);
      ctx.moveTo(tile.x + 6, tile.y + tile.h - 10);
      ctx.lineTo(tile.x + 6, tile.y + tile.h - 6);
      ctx.lineTo(tile.x + 6 + cornerLen, tile.y + tile.h - 6);
      ctx.moveTo(tile.x + tile.w - 6, tile.y + tile.h - 10);
      ctx.lineTo(tile.x + tile.w - 6, tile.y + tile.h - 6);
      ctx.lineTo(tile.x + tile.w - 6 - cornerLen, tile.y + tile.h - 6);
      ctx.stroke();
    }

    if (tileState === 'taken') {
      ctx.save();
      drawDraftRoundedRect(tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2, style.tileRadius - 1);
      ctx.clip();
      ctx.strokeStyle = 'rgba(148, 158, 178, 0.16)';
      ctx.lineWidth = 1;
      for (let hx = tile.x - tile.h; hx < tile.x + tile.w + tile.h; hx += 10) {
        ctx.beginPath();
        ctx.moveTo(hx, tile.y + tile.h);
        ctx.lineTo(hx + tile.h, tile.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Spell names live in the DOM overlay so they stay above the sharp icon layer.

    if (tileState === 'taken') {
      const holderId = String(holder || '').trim().toUpperCase();
      if (holderId) {
        const holderColor = draftPickerColors[holderId] || 'rgba(198, 206, 220, 0.92)';
        const badgeW = 16;
        const badgeH = 14;
        const badgeX = tile.x + 6;
        const badgeY = tile.y + tile.h - badgeH - 5;
        ctx.fillStyle = 'rgba(10, 14, 22, 0.58)';
        drawDraftRoundedRect(badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fill();

        ctx.strokeStyle = 'rgba(168, 184, 210, 0.24)';
        ctx.lineWidth = 1;
        drawDraftRoundedRect(badgeX, badgeY, badgeW, badgeH, 4);
        ctx.stroke();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = holderColor;
        ctx.font = 'bold 10px Arial';
        ctx.fillText(holderId, badgeX + badgeW * 0.5, badgeY + badgeH * 0.5 + 0.5);
        ctx.restore();
      }
    } else if (tileState === 'channeling') {
      const overlayW = Math.max(0, (tile.w - 6) * holdRatio);
      ctx.fillStyle = `rgba(102, 236, 194, ${0.14 + holdRatio * 0.20})`;
      drawDraftRoundedRect(tile.x + 3, tile.y + 3, overlayW, tile.h - 6, style.tileRadius - 2);
      ctx.fill();

      const barW = Math.max(14, (tile.w - 14) * holdRatio);
      const barX = tile.x + 7;
      const barY = tile.y + tile.h - 9;
      ctx.fillStyle = 'rgba(104, 236, 194, 0.98)';
      drawDraftRoundedRect(barX, barY, barW, 4, 2);
      ctx.fill();

      const tipX = Math.min(tile.x + tile.w - 7, barX + barW);
      ctx.fillStyle = 'rgba(224, 255, 244, 0.90)';
      drawDraftRoundedRect(tipX - 2, barY - 1, 4, 6, 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(222, 255, 246, 0.88)';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('CHANNELING', tile.cx, tile.y + tile.h - 11);
    } else if (tileState === 'selectable') {
      ctx.fillStyle = 'rgba(192, 224, 255, 0.72)';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('SELECTABLE', tile.cx, tile.y + tile.h - 10);
    }
  }

  syncDraftSpellIconOverlay(draftIconOverlayEntries);

  for (const fx of activeTransfers) {
    const duration = Math.max(1, Number(fx.durationMs) || 1);
    const t = Math.max(0, Math.min(1, (nowMs - (fx.startedAt || 0)) / duration));
    const tailT = Math.max(0, t - 0.22);

    const targetActor = draftState.players?.[fx.pickerId];
    const toX = Number.isFinite(fx.toX) ? fx.toX : (Number.isFinite(targetActor?.x) ? targetActor.x : 0);
    const toY = Number.isFinite(fx.toY) ? fx.toY : (Number.isFinite(targetActor?.y) ? targetActor.y : 0);
    const fromX = Number.isFinite(fx.fromX) ? fx.fromX : toX;
    const fromY = Number.isFinite(fx.fromY) ? fx.fromY : toY;
    const spellRgb = getDraftSpellOrbRgb(fx.spellId);
    const dist = Math.hypot(toX - fromX, toY - fromY) || 1;
    const dirX = (toX - fromX) / dist;
    const dirY = (toY - fromY) / dist;
    const sideX = -dirY;
    const sideY = dirX;
    const arcAmp = Math.max(18, Math.min(84, dist * 0.22));

    const sampleArcPoint = (progress) => {
      const p = Math.max(0, Math.min(1, progress));
      const e = draftEaseOutCubic(p);
      const sideOffset = Math.sin(p * Math.PI) * arcAmp;
      return {
        x: fromX + (toX - fromX) * e + sideX * sideOffset,
        y: fromY + (toY - fromY) * e + sideY * sideOffset,
      };
    };

    const head = sampleArcPoint(t);
    const tail = sampleArcPoint(tailT);
    const headX = head.x;
    const headY = head.y;
    const tailX = tail.x;
    const tailY = tail.y;
    const controlX = (tailX + headX) * 0.5 + sideX * arcAmp * 0.26;
    const controlY = (tailY + headY) * 0.5 + sideY * arcAmp * 0.26;
    const alpha = 1 - t;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(${spellRgb}, ${0.20 + alpha * 0.44})`;
    ctx.lineWidth = 11 + alpha * 7.5;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.quadraticCurveTo(controlX, controlY, headX, headY);
    ctx.stroke();

    ctx.strokeStyle = `rgba(236, 248, 255, ${0.34 + alpha * 0.52})`;
    ctx.lineWidth = 4.3 + alpha * 2.2;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.quadraticCurveTo(controlX, controlY, headX, headY);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${spellRgb}, ${0.36 + alpha * 0.54})`;
    ctx.lineWidth = 2 + alpha * 1.4;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.quadraticCurveTo(controlX, controlY, headX, headY);
    ctx.stroke();

    for (let i = 0; i < 4; i += 1) {
      const sparkT = Math.max(0, t - i * 0.055);
      const spark = sampleArcPoint(sparkT);
      const sparkAlpha = (0.14 + (1 - i / 4) * 0.42) * alpha;
      const sparkRadius = Math.max(1.4, 2.2 + (1 - i / 4) * 2.4 + alpha * 1.6);
      ctx.fillStyle = `rgba(${spellRgb}, ${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, sparkRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    const headRadius = 4 + alpha * 4.6;
    const headGlow = ctx.createRadialGradient(headX, headY, 0, headX, headY, headRadius * 3.8);
    headGlow.addColorStop(0, `rgba(255,255,255,${0.56 + alpha * 0.38})`);
    headGlow.addColorStop(0.34, `rgba(${spellRgb}, ${0.42 + alpha * 0.42})`);
    headGlow.addColorStop(1, `rgba(${spellRgb}, 0)`);
    ctx.fillStyle = headGlow;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius * 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(244, 252, 255, ${0.72 + alpha * 0.22})`;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    const targetPulse = Math.max(0, Math.sin((nowMs - (fx.startedAt || 0)) * 0.03));
    const targetHalo = 6 + targetPulse * 3 + alpha * 2;
    ctx.strokeStyle = `rgba(${spellRgb}, ${0.18 + targetPulse * 0.14})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(toX, toY, targetHalo, 0, Math.PI * 2);
    ctx.stroke();

    if (t >= 0.72) {
      const land = Math.max(0, Math.min(1, (t - 0.72) / 0.28));
      const landAlpha = (1 - land) * 0.86;
      const impactRadius = 12 + land * 22;

      ctx.strokeStyle = `rgba(${spellRgb}, ${0.22 + landAlpha * 0.40})`;
      ctx.lineWidth = 2 + (1 - land) * 1.8;
      ctx.beginPath();
      ctx.arc(toX, toY, impactRadius, 0, Math.PI * 2);
      ctx.stroke();

      const impactGlow = ctx.createRadialGradient(toX, toY, 0, toX, toY, impactRadius * 2.2);
      impactGlow.addColorStop(0, `rgba(255,255,255,${0.06 + landAlpha * 0.32})`);
      impactGlow.addColorStop(0.42, `rgba(${spellRgb}, ${0.04 + landAlpha * 0.24})`);
      impactGlow.addColorStop(1, `rgba(${spellRgb}, 0)`);
      ctx.fillStyle = impactGlow;
      ctx.beginPath();
      ctx.arc(toX, toY, impactRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawDraftTurnFlashOverlay();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
