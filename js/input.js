let desktopWallPrimed = false;

// ── Joystick Factory ──────────────────────────────────────────
function makeStickController(stickEl, thumbEl, state) {
  const maxBase = () => Math.max(28, stickEl.clientWidth * 0.3);

  const reset = () => {
    thumbEl.style.transform = 'translate(0px, 0px)';
    state.active    = false;
    state.dx        = 0;
    state.dy        = 0;
    state.touchId   = null;
    state.mouseDown = false;
  };

  const updateFromPoint = (clientX, clientY) => {
    const rect = stickEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const max = maxBase();
    const dist = Math.hypot(dx, dy);

    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }

    const outX = dx / max;
    const outY = dy / max;

    if (Math.hypot(outX, outY) > 0.08) {
      state.dx = outX;
      state.dy = outY;
      state.active = true;
    } else {
      state.active = false;
      state.dx = 0;
      state.dy = 0;
    }

    thumbEl.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  stickEl.addEventListener('touchstart', (e) => {
    if (state.touchId !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    e.preventDefault();
    state.touchId = t.identifier;
    updateFromPoint(t.clientX, t.clientY);
  }, { passive: false });

  stickEl.addEventListener('touchmove', (e) => {
    const t = Array.from(e.changedTouches).find(touch => touch.identifier === state.touchId);
    if (!t) return;
    e.preventDefault();
    updateFromPoint(t.clientX, t.clientY);
  }, { passive: false });

  const endTouch = (e) => {
    const t = Array.from(e.changedTouches).find(touch => touch.identifier === state.touchId);
    if (!t) return;
    e.preventDefault();
    reset();
  };

  stickEl.addEventListener('touchend', endTouch, { passive: false });
  stickEl.addEventListener('touchcancel', endTouch, { passive: false });

  stickEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    state.mouseDown = true;
    updateFromPoint(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.mouseDown) return;
    updateFromPoint(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', () => {
    if (!state.mouseDown) return;
    reset();
  });

  reset();
  return reset;
}

// ── Pull-to-Cast Mobile Button ────────────────────────────────
function bindPullCastButton(btn, handler, skillType) {
  const arrow = btn.querySelector('.mobileDragArrow');
  let touchId = null;
  let mouseDown = false;
  let aiming = false;

  function showArrow(dx, dy) {
    const len = Math.min(56, Math.max(18, Math.hypot(dx, dy)));
    const ang = Math.atan2(dy, dx);
    arrow.style.display = 'block';
    arrow.style.width = `${len}px`;
    arrow.style.transform = `translate(0px, -2px) rotate(${ang}rad)`;
  }

  function hideArrow() {
    arrow.style.display = 'none';
  }

  function setAimFromPoint(clientX, clientY) {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const sensitivity = Number(profile.aimSensitivity) || 0.7;
    const dx = (clientX - cx) * sensitivity;
    const dy = (clientY - cy) * sensitivity;
    const len = Math.hypot(dx, dy);

    if (len > 8) {
      player.aimX = dx / len;
      player.aimY = dy / len;
      mouse.x = player.x + player.aimX * 140;
      mouse.y = player.y + player.aimY * 140;
      showArrow(dx, dy);
      skillAimPreview.active = true;
      skillAimPreview.type = skillType;
      skillAimPreview.dx = player.aimX;
      skillAimPreview.dy = player.aimY;
    } else {
      hideArrow();
      skillAimPreview.active = false;
      skillAimPreview.type = null;
    }
  }

  function begin(clientX, clientY) {
    aiming = true;
    btn.classList.add('aiming');
    setAimFromPoint(clientX, clientY);
  }

  function finish(clientX, clientY) {
    if (!aiming) return;
    setAimFromPoint(clientX, clientY);
    btn.classList.remove('aiming');
    hideArrow();
    aiming = false;
    skillAimPreview.active = false;
    skillAimPreview.type = null;
    startMusicIfNeeded();
    handler();
  }

  function cancel() {
    btn.classList.remove('aiming');
    hideArrow();
    aiming = false;
    touchId = null;
    mouseDown = false;
    skillAimPreview.active = false;
    skillAimPreview.type = null;
  }

  btn.addEventListener('touchstart', (e) => {
    if (touchId !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    e.preventDefault();
    touchId = t.identifier;
    begin(t.clientX, t.clientY);
  }, { passive: false });

  btn.addEventListener('touchmove', (e) => {
    const t = Array.from(e.changedTouches).find(touch => touch.identifier === touchId);
    if (!t || !aiming) return;
    e.preventDefault();
    setAimFromPoint(t.clientX, t.clientY);
  }, { passive: false });

  btn.addEventListener('touchend', (e) => {
    const t = Array.from(e.changedTouches).find(touch => touch.identifier === touchId);
    if (!t || !aiming) return;
    e.preventDefault();
    finish(t.clientX, t.clientY);
    touchId = null;
  }, { passive: false });

  btn.addEventListener('touchcancel', (e) => {
    const t = Array.from(e.changedTouches).find(touch => touch.identifier === touchId);
    if (!t) return;
    e.preventDefault();
    cancel();
  }, { passive: false });

  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    mouseDown = true;
    begin(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (!mouseDown || !aiming) return;
    setAimFromPoint(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', (e) => {
    if (!mouseDown || !aiming) return;
    finish(e.clientX, e.clientY);
    mouseDown = false;
  });
}

function applySpellIconsMobile() {
  Object.entries(skillButtons).forEach(([key, btn]) => {
    if (!btn) return;

    let img = btn.querySelector('img.spellIcon');
    if (!img) {
      img = document.createElement('img');
      img.className = 'spellIcon';
      img.style.position = 'absolute';
      img.style.inset = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      img.style.pointerEvents = 'none';
      btn.appendChild(img);
    }

    if (SPELL_ICONS[key]) {
      img.src = SPELL_ICONS[key];
    }
  });
}

applySpellIconsMobile();

const MODIFIER_BIND_KEYS = new Set(['shift', 'control', 'alt', 'meta']);

function normalizeMouseButton(button) {
  const numericButton = Number(button);
  if (!Number.isFinite(numericButton) || numericButton < 0) return '';
  return `mouse${Math.floor(numericButton) + 1}`;
}

function isTokenBoundToAnyAction(token) {
  if (!token || !keybinds || typeof keybinds !== 'object') return false;
  const normalizedToken = normalizeKey(token);
  return Object.keys(bindLabels).some((action) => normalizeKey(keybinds[action]) === normalizedToken);
}

function commitBindToken(token, event = null) {
  if (!waitingForBind) return false;
  const normalizedToken = normalizeKey(token);
  if (!normalizedToken || MODIFIER_BIND_KEYS.has(normalizedToken)) return false;

  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation();
  }

  keybinds[waitingForBind] = normalizedToken;
  waitingForBind = null;
  buildKeybindsUI();
  saveProfile();
  updateHud();
  return true;
}

function releaseWallIfNeeded(norm) {
  if (norm !== keybinds.wall) return;
  if (desktopWallPrimed && gameState === 'playing') {
    startMusicIfNeeded();
    castPlayerSpell('wall');
  }
  desktopWallPrimed = false;
  if (skillAimPreview.type === 'wall') {
    skillAimPreview.active = false;
    skillAimPreview.type = null;
  }
}

function triggerBoundActionFromMouse(norm, event) {
  if (!norm) return false;

  if (norm === keybinds.menu) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    toggleMenu();
    return true;
  }

  if (gameState !== 'playing') return false;

  if (norm === keybinds.fire) {
    startMusicIfNeeded();
    if (typeof isLocalRiftPlacementActive === 'function' && typeof placeLocalRiftAtCursor === 'function') {
      if (isLocalRiftPlacementActive()) {
        placeLocalRiftAtCursor(mouse.x, mouse.y);
        return true;
      }
    }
    castPlayerSpell('fire');
    return true;
  }

  if (norm === keybinds.teleport) {
    startMusicIfNeeded();
    castPlayerSpell('blink');
    return true;
  }

  if (norm === keybinds.hook) {
    startMusicIfNeeded();
    castPlayerSpell('hook');
    return true;
  }

  if (norm === keybinds.shield) {
    startMusicIfNeeded();
    castPlayerSpell('shield');
    return true;
  }

  if (norm === keybinds.prism) {
    startMusicIfNeeded();
    castPlayerSpell('prism');
    return true;
  }

  if (norm === keybinds.charge) {
    startMusicIfNeeded();
    castPlayerSpell('charge');
    return true;
  }

  if (norm === keybinds.shock) {
    startMusicIfNeeded();
    castPlayerSpell('shock');
    return true;
  }

  if (norm === keybinds.gust) {
    startMusicIfNeeded();
    castPlayerSpell('gust');
    return true;
  }

  if (norm === keybinds.solar) {
    startMusicIfNeeded();
    castPlayerSpell('solar');
    return true;
  }

  if (norm === keybinds.rift) {
    startMusicIfNeeded();
    castPlayerSpell('rift');
    return true;
  }

  if (norm === keybinds.phantom) {
    startMusicIfNeeded();
    castPlayerSpell('phantom');
    return true;
  }

  if (norm === keybinds.wall) {
    if (!desktopWallPrimed) {
      desktopWallPrimed = true;
      skillAimPreview.active = true;
      skillAimPreview.type = 'wall';
      skillAimPreview.dx = player.aimX;
      skillAimPreview.dy = player.aimY;
    }
    return true;
  }

  if (norm === keybinds.rewind) {
    startMusicIfNeeded();
    castPlayerSpell('rewind');
    return true;
  }

  if (norm === keybinds.reset) {
    resetRound();
    return true;
  }

  return false;
}

window.addEventListener('mousedown', (e) => {
  if (!waitingForBind) return;
  const mouseToken = normalizeMouseButton(e.button);
  if (!mouseToken) return;
  commitBindToken(mouseToken, e);
}, true);

// ── Keyboard ──────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  const norm = normalizeKey(e.key);

  if (waitingForBind) {
    commitBindToken(norm, e);
    return;
  }

  keys[norm] = true;

  if (gameState === 'playing' && norm === keybinds.fire) {
    e.preventDefault();
    startMusicIfNeeded();
    if (typeof isLocalRiftPlacementActive === 'function' && typeof placeLocalRiftAtCursor === 'function') {
      if (isLocalRiftPlacementActive()) {
        placeLocalRiftAtCursor(mouse.x, mouse.y);
        return;
      }
    }
    castPlayerSpell('fire');
  }

  if (gameState !== 'lobby' && norm === keybinds.teleport) {
    e.preventDefault();
    startMusicIfNeeded();
    castPlayerSpell('blink');
  }

  if (gameState === 'playing' && norm === keybinds.hook) {
    startMusicIfNeeded();
    castPlayerSpell('hook');
  }

  if (gameState === 'playing' && norm === keybinds.shield) {
    startMusicIfNeeded();
    castPlayerSpell('shield');
  }

  if (gameState === 'playing' && norm === keybinds.prism) {
    startMusicIfNeeded();
    castPlayerSpell('prism');
  }

  if (gameState === 'playing' && norm === keybinds.charge) {
    startMusicIfNeeded();
    castPlayerSpell('charge');
  }

  if (gameState === 'playing' && norm === keybinds.shock) {
    startMusicIfNeeded();
    castPlayerSpell('shock');
  }

  if (gameState === 'playing' && norm === keybinds.gust) {
    startMusicIfNeeded();
    castPlayerSpell('gust');
  }

  if (gameState === 'playing' && norm === keybinds.solar) {
    startMusicIfNeeded();
    castPlayerSpell('solar');
  }

  if (gameState === 'playing' && norm === keybinds.rift) {
    startMusicIfNeeded();
    castPlayerSpell('rift');
  }

  if (gameState === 'playing' && norm === keybinds.phantom) {
    startMusicIfNeeded();
    castPlayerSpell('phantom');
  }

  if (gameState === 'playing' && norm === keybinds.wall) {
    e.preventDefault();
    if (!desktopWallPrimed) {
      desktopWallPrimed = true;
      skillAimPreview.active = true;
      skillAimPreview.type = 'wall';
      skillAimPreview.dx = player.aimX;
      skillAimPreview.dy = player.aimY;
    }
  }

  if (gameState === 'playing' && norm === keybinds.rewind) {
    e.preventDefault();
    startMusicIfNeeded();
    castPlayerSpell('rewind');
  }

  if ((gameState === 'playing' || gameState === 'result') && norm === keybinds.reset) resetRound();

  if (norm === keybinds.menu) {
    e.preventDefault();
    toggleMenu();
  }
});

window.addEventListener('keyup', (e) => {
  const norm = normalizeKey(e.key);
  keys[norm] = false;

  releaseWallIfNeeded(norm);
});

// ── Mouse ─────────────────────────────────────────────────────
function resolveCanvasPointFromClient(clientX, clientY) {
  if (typeof clientToCanvasPoint === 'function') {
    return clientToCanvasPoint(clientX, clientY);
  }
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Number(rect?.width) || Number(canvas.clientWidth) || Number(canvas.width) || 1);
  const cssHeight = Math.max(1, Number(rect?.height) || Number(canvas.clientHeight) || Number(canvas.height) || 1);
  const scaleX = (Number(canvas.width) || 1) / cssWidth;
  const scaleY = (Number(canvas.height) || 1) / cssHeight;
  return {
    x: (Number(clientX) - Number(rect?.left || 0)) * scaleX,
    y: (Number(clientY) - Number(rect?.top || 0)) * scaleY,
  };
}

canvas.addEventListener('mousemove', (e) => {
  const point = resolveCanvasPointFromClient(e.clientX, e.clientY);
  mouse.x = point.x;
  mouse.y = point.y;

  if (!isTouchDevice) {
    const aim = normalized(mouse.x - player.x, mouse.y - player.y);
    player.aimX = aim.x;
    player.aimY = aim.y;

    if (desktopWallPrimed) {
      skillAimPreview.active = true;
      skillAimPreview.type = 'wall';
      skillAimPreview.dx = aim.x;
      skillAimPreview.dy = aim.y;
    }
  }
});

canvas.addEventListener('mousedown', (e) => {
  const point = resolveCanvasPointFromClient(e.clientX, e.clientY);
  mouse.x = point.x;
  mouse.y = point.y;
  const mouseNorm = normalizeMouseButton(e.button);
  if (mouseNorm) {
    keys[mouseNorm] = true;
  }

  const mpSnapshot = (window.outraMultiplayer && typeof window.outraMultiplayer.getPresentationSnapshot === 'function')
    ? window.outraMultiplayer.getPresentationSnapshot()
    : null;
  const multiplayerDraftActive = !!(mpSnapshot && mpSnapshot.active && mpSnapshot.isDraftActive);
  const multiplayerArenaActive = !!(mpSnapshot && mpSnapshot.active && mpSnapshot.isArenaActive);
  if ((gameState === 'draft' || multiplayerDraftActive) && e.button === 0) {
    tryDraftPickAtCursor();
    return;
  }

  if (multiplayerArenaActive) {
    if (e.button === 0 && window.outraMultiplayer) {
      const riftPlacementActive = typeof window.outraMultiplayer.isRiftPlacementModeActive === 'function'
        ? window.outraMultiplayer.isRiftPlacementModeActive()
        : false;
      if (riftPlacementActive && typeof window.outraMultiplayer.placeRiftAtCursor === 'function') {
        startMusicIfNeeded();
        window.outraMultiplayer.placeRiftAtCursor();
        return;
      }
      if (typeof window.outraMultiplayer.castFireblast === 'function') {
        startMusicIfNeeded();
        window.outraMultiplayer.castFireblast();
      }
    }
    return;
  }

  if (gameState !== 'playing') return;
  if (mouseNorm && triggerBoundActionFromMouse(mouseNorm, e)) return;

  // Legacy secondary shortcut: keep RMB blink if no bind explicitly uses Mouse3.
  if (mouseNorm === 'mouse3' && !isTokenBoundToAnyAction(mouseNorm)) {
    startMusicIfNeeded();
    castPlayerSpell('blink');
  }
});

window.addEventListener('mouseup', (e) => {
  const mouseNorm = normalizeMouseButton(e.button);
  if (!mouseNorm) return;
  keys[mouseNorm] = false;
  releaseWallIfNeeded(mouseNorm);
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ── Touch (canvas) ────────────────────────────────────────────
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  if (!t) return;
  const point = resolveCanvasPointFromClient(t.clientX, t.clientY);
  mouse.x = point.x;
  mouse.y = point.y;
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (!t) return;
  const point = resolveCanvasPointFromClient(t.clientX, t.clientY);
  mouse.x = point.x;
  mouse.y = point.y;
}, { passive: true });

function openMenu() {
  menuOpen = true;
  menuPanel.style.display = 'block';
  setCanvasCursorMode('menu');

  requestAnimationFrame(() => {
    menuPanel.classList.add('open');
    document.body.classList.add('menuVisible');
  });

  setMenuTab(activeMenuTab);
}

function closeMenu() {
  menuOpen = false;
  menuPanel.classList.remove('open');
  document.body.classList.remove('menuVisible');
  const mpSnapshot = (typeof getMultiplayerPresentationSnapshot === 'function')
    ? getMultiplayerPresentationSnapshot()
    : (
      window.outraMultiplayer
      && typeof window.outraMultiplayer.getPresentationSnapshot === 'function'
      ? window.outraMultiplayer.getPresentationSnapshot()
      : null
    );
  const multiplayerArenaActive = !!(mpSnapshot && mpSnapshot.active && mpSnapshot.isArenaActive);
  if (gameState === 'playing' || multiplayerArenaActive) setCanvasCursorMode('crosshair');
  else if (gameState === 'draft') setCanvasCursorMode('pointer');
  else setCanvasCursorMode('default');

  setTimeout(() => {
    if (!menuOpen) menuPanel.style.display = 'none';
  }, 180);
}

function toggleMenu() {
  if (menuOpen) closeMenu();
  else openMenu();
}

function playMenuClickSound() {
  // Menu clicks are intentionally silent.
}

function tryEnableGodMode() {
  if (godModeEnabled) {
    if (window.outraMultiplayer && typeof window.outraMultiplayer.setDebugToolsEnabled === 'function') {
      window.outraMultiplayer.setDebugToolsEnabled(true);
    }
    updateGodModeMenuState();
    updateHud();
    return;
  }

  const entered = window.prompt('Enter GOD MODE password:');
  if (entered === null) return;
  if (String(entered).trim() !== 'iddqd') {
    window.alert('Wrong GOD MODE password.');
    return;
  }

  godModeEnabled = true;
  updateGodModeMenuState();
  if (window.outraMultiplayer && typeof window.outraMultiplayer.setDebugToolsEnabled === 'function') {
    window.outraMultiplayer.setDebugToolsEnabled(true);
  }
  if (window.outraMultiplayer && typeof window.outraMultiplayer.setDebugPanelVisible === 'function') {
    window.outraMultiplayer.setDebugPanelVisible(false);
  }
  updateHud();
}

document.addEventListener('pointerdown', (e) => {
  if (!menuOpen) return;
  if (!menuPanel.classList.contains('open')) return;

  const clickedInsideMenu = menuPanel.contains(e.target);
  const clickedMenuButton =
    menuBtn.contains(e.target) ||
    (lobbyMenuBtn && lobbyMenuBtn.contains(e.target));

  if (!clickedInsideMenu && !clickedMenuButton) {
    closeMenu();
  }
});

// ── UI Button Events ──────────────────────────────────────────
if (hudToggleBtn) {
  hudToggleBtn.addEventListener('click', () => {
    hudVisible = !hudVisible;
    updateHud();
  });
}

menuBtn.addEventListener('click', () => {
  playMenuClickSound();
  toggleMenu();
});

if (lobbyMenuBtn) {
  lobbyMenuBtn.addEventListener('click', () => {
    playMenuClickSound();
    toggleMenu();
  });
}

document.querySelectorAll('[data-menu-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    playMenuClickSound();
    setMenuTab(btn.dataset.menuTab);
  });
});

document.querySelectorAll('[data-lobby-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    setLobbyTab(btn.dataset.lobbyTab);
  });
});

const lobbyFriendsBtn = document.getElementById('lobbyFriendsBtn');
const lobbyMessagesBtn = document.getElementById('lobbyMessagesBtn');
let lobbyTopQuickBubbleEl = null;
let lobbyTopQuickBubbleHideTimer = 0;

function ensureLobbyTopQuickBubble() {
  if (lobbyTopQuickBubbleEl && document.body.contains(lobbyTopQuickBubbleEl)) {
    return lobbyTopQuickBubbleEl;
  }

  const bubble = document.createElement('div');
  bubble.className = 'lobbyTopQuickBubble';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  bubble.dataset.placement = 'bottom';
  document.body.appendChild(bubble);
  lobbyTopQuickBubbleEl = bubble;
  return bubble;
}

function showLobbyTopQuickBubble(anchorEl, text) {
  if (!anchorEl || !text) return;

  const bubble = ensureLobbyTopQuickBubble();
  bubble.textContent = text;
  bubble.classList.remove('show');
  bubble.dataset.placement = 'bottom';
  bubble.style.left = '0px';
  bubble.style.top = '0px';
  void bubble.offsetWidth;
  bubble.classList.add('show');

  const anchorRect = anchorEl.getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();
  const viewportPadding = 10;
  const gap = 10;
  let left = anchorRect.left + (anchorRect.width * 0.5) - (bubbleRect.width * 0.5);
  left = Math.max(
    viewportPadding,
    Math.min(left, window.innerWidth - bubbleRect.width - viewportPadding)
  );

  let top = anchorRect.bottom + gap;
  const useTopPlacement = top + bubbleRect.height + viewportPadding > window.innerHeight;
  if (useTopPlacement) {
    top = anchorRect.top - bubbleRect.height - gap;
    bubble.dataset.placement = 'top';
  } else {
    bubble.dataset.placement = 'bottom';
  }

  bubble.style.left = `${Math.round(left)}px`;
  bubble.style.top = `${Math.round(top)}px`;

  if (lobbyTopQuickBubbleHideTimer) {
    window.clearTimeout(lobbyTopQuickBubbleHideTimer);
  }
  lobbyTopQuickBubbleHideTimer = window.setTimeout(() => {
    if (!bubble) return;
    bubble.classList.remove('show');
  }, 1700);
}

if (lobbyFriendsBtn) {
  lobbyFriendsBtn.addEventListener('click', (event) => {
    playMenuClickSound();
    showLobbyTopQuickBubble(event.currentTarget, 'Friendlist coming soon');
  });
}

if (lobbyMessagesBtn) {
  lobbyMessagesBtn.addEventListener('click', (event) => {
    playMenuClickSound();
    showLobbyTopQuickBubble(event.currentTarget, 'DM coming soon');
  });
}

const storeCloseBtn = document.getElementById('storeCloseBtn');
const storeModalBackdrop = document.getElementById('storeModalBackdrop');

if (storeCloseBtn) {
  storeCloseBtn.addEventListener('click', () => {
    closeStoreModal();
  });
}

if (storeModalBackdrop) {
  storeModalBackdrop.addEventListener('click', () => {
    closeStoreModal();
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('storeOpen')) {
    e.preventDefault();
    closeStoreModal();
  }
});

resumeBtn.addEventListener('click', () => {
  playMenuClickSound();
  closeMenu();
});

toArenaBtn.addEventListener('click', () => {
  playMenuClickSound();
  closeMenu();
  if (gameState === 'draft') {
    gameState = 'lobby';
  }
  startMatch({ skipArenaIntro: true });
});

toLobbyBtn.addEventListener('click', () => {
  playMenuClickSound();
  closeMenu();
  enterLobby();
});

if (leaveGameBtn) {
  leaveGameBtn.addEventListener('click', () => {
    playMenuClickSound();
    closeMenu();
    const api = getQuickMatchApi();
    if (api && typeof api.leaveGame === 'function') {
      const requested = api.leaveGame();
      if (requested !== false) {
        enterLobby();
      }
      return;
    }
    enterLobby();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    playMenuClickSound();
    resetRound();
    closeMenu();
  });
}

musicToggleBtn.addEventListener('click', () => {
  playMenuClickSound();
  startMusicIfNeeded();
  setMusicMuted(!musicMuted);
  updateHud();
});

if (godModeBtn) {
  godModeBtn.addEventListener('click', () => {
    playMenuClickSound();
    tryEnableGodMode();
  });
}

standingDummyBtn.addEventListener('click', () => {
  playMenuClickSound();
  spawnDummy('standing');
  updateHud();
});

activeDummyBtn.addEventListener('click', () => {
  playMenuClickSound();
  spawnDummy('active');
  updateHud();
});

removeDummyBtn.addEventListener('click', () => {
  playMenuClickSound();
  removeDummy();
  updateHud();
});

menuResetBindsBtn.addEventListener('click', () => {
  playMenuClickSound();
  keybinds = { ...defaultBinds };
  waitingForBind = null;
  buildKeybindsUI();
  saveProfile();
  updateHud();
});

if (aimSensitivitySlider) {
  aimSensitivitySlider.addEventListener('input', () => {
    profile.aimSensitivity = Math.min(1.4, Math.max(0.35, Number(aimSensitivitySlider.value) || 0.7));
    updateAimSensitivityUI();
    saveProfile();
  });
}

if (musicVolumeSlider) {
  musicVolumeSlider.addEventListener('input', () => {
    startMusicIfNeeded();
    setMusicVolume(musicVolumeSlider.value);
    updateHud();
  });
}

if (soundVolumeSlider) {
  soundVolumeSlider.addEventListener('input', () => {
    setSoundVolume(soundVolumeSlider.value);
    updateHud();
  });
}

function getQuickMatchApi() {
  return window.outraMultiplayer || null;
}

function resolveQuickMatchSnapshot(explicitSnapshot = null) {
  if (explicitSnapshot && typeof explicitSnapshot === 'object') {
    return explicitSnapshot;
  }
  const api = getQuickMatchApi();
  if (!api || typeof api.getQuickMatchState !== 'function') return null;
  return api.getQuickMatchState();
}

function getQuickMatchStatus(snapshot = null) {
  const resolved = snapshot && typeof snapshot === 'object'
    ? snapshot
    : resolveQuickMatchSnapshot();
  return String(resolved?.status || 'idle').trim().toLowerCase();
}

function setStartButtonQuickMatchState({ isLobbyState, isSearching, isMatched }) {
  if (!startBtn) return;

  const labelEl = startBtn.querySelector('.enterArenaText');
  const inQueue = isLobbyState && isSearching;
  const canInteract = isLobbyState && !isMatched;

  startBtn.disabled = !canInteract;
  startBtn.classList.toggle('isSearching', inQueue);
  startBtn.classList.toggle('isCancelMode', inQueue);
  startBtn.setAttribute('aria-busy', inQueue ? 'true' : 'false');
  startBtn.setAttribute('aria-label', inQueue ? 'Cancel matchmaking queue' : 'Enter Arena');

  const nextText = inQueue ? 'Cancel' : 'Enter Arena';
  if (labelEl && labelEl.textContent !== nextText) {
    labelEl.textContent = nextText;
  } else if (!labelEl) {
    startBtn.textContent = nextText;
  }
}

function refreshLobbyQuickMatchUi(explicitSnapshot = null) {
  const snapshot = resolveQuickMatchSnapshot(explicitSnapshot);
  const status = getQuickMatchStatus(snapshot);
  const isSearching = status === 'searching';
  const isMatched = status === 'matched';
  const isLobbyState = gameState === 'lobby';

  setStartButtonQuickMatchState({ isLobbyState, isSearching, isMatched });

  if (!quickMatchStateText) return;
  quickMatchStateText.classList.toggle('isSearching', isLobbyState && isSearching);
  if (!isLobbyState) {
    quickMatchStateText.textContent = '';
    return;
  }

  if (isSearching) {
    const queueDepth = Math.max(0, Number(snapshot?.queueDepth) || 0);
    quickMatchStateText.textContent = queueDepth > 1
      ? `Finding Opponent... (${queueDepth} in queue)`
      : 'Finding Opponent...';
    return;
  }

  if (isMatched) {
    quickMatchStateText.textContent = 'Opponent found. Entering Draft Room...';
    return;
  }

  quickMatchStateText.textContent = '';
}

function queueQuickMatchFromLobby() {
  const api = getQuickMatchApi();
  if (!api || typeof api.queueQuickMatch !== 'function') {
    if (quickMatchStateText) {
      quickMatchStateText.textContent = 'Multiplayer unavailable.';
    }
    return;
  }
  const queued = api.queueQuickMatch();
  if (queued !== false) {
    refreshLobbyQuickMatchUi({ status: 'searching' });
  }
}

function cancelQuickMatchFromLobby() {
  const api = getQuickMatchApi();
  if (!api || typeof api.cancelQuickMatch !== 'function') return false;
  const canceled = api.cancelQuickMatch();
  if (canceled === false) return false;
  refreshLobbyQuickMatchUi({ status: 'idle' });
  return true;
}

if (startBtn) {
  startBtn.addEventListener('click', (e) => {
    e.preventDefault();
    playMenuClickSound();
    const status = getQuickMatchStatus();
    if (status === 'searching') {
      cancelQuickMatchFromLobby();
      return;
    }
    if (status === 'matched') {
      return;
    }
    queueQuickMatchFromLobby();
  });
}

if (draftRoomBtn) {
  draftRoomBtn.addEventListener('click', (e) => {
    e.preventDefault();
    playMenuClickSound();
    if (menuOpen) closeMenu();
    const api = getQuickMatchApi();
    if (api && typeof api.cancelQuickMatch === 'function') {
      api.cancelQuickMatch();
    }
    enterDraftRoom();
  });
}

window.addEventListener('outra:quickmatch-state', (event) => {
  refreshLobbyQuickMatchUi(event?.detail || null);
});
window.setTimeout(() => {
  refreshLobbyQuickMatchUi();
}, 0);

if (typeof window.setLobbyPreviewFloorCircleActive === 'function') {
  window.setLobbyPreviewFloorCircleActive(false);
}
const previewViewport = document.getElementById('previewViewport');
const overlayRoot = document.getElementById('overlay');
if (previewViewport) {
  previewViewport.classList.remove('arenaAuraActive');
  previewViewport.classList.remove('arenaHoverCircleActive');
}
if (overlayRoot) {
  overlayRoot.classList.remove('arenaPortalActive');
  overlayRoot.classList.remove('enterArenaPortalFxActive');
}

function setArenaHoverCircleActive(active) {
  const isActive = !!active;
  if (overlayRoot) {
    overlayRoot.classList.toggle('enterArenaPortalFxActive', isActive);
  }
  if (previewViewport) {
    previewViewport.classList.remove('arenaAuraActive');
    previewViewport.classList.remove('arenaHoverCircleActive');
  }
  if (typeof window.setLobbyPreviewFloorCircleActive === 'function') {
    window.setLobbyPreviewFloorCircleActive(false);
  }
}

if (startBtn) {
  startBtn.addEventListener('pointerenter', () => {
    if (startBtn.disabled || startBtn.classList.contains('isSearching') || startBtn.classList.contains('isCancelMode')) {
      setArenaHoverCircleActive(false);
      return;
    }
    setArenaHoverCircleActive(true);
  });
  startBtn.addEventListener('pointerleave', () => {
    setArenaHoverCircleActive(false);
  });
  startBtn.addEventListener('pointercancel', () => {
    setArenaHoverCircleActive(false);
  });
  startBtn.addEventListener('pointerdown', () => {
    setArenaHoverCircleActive(false);
  });
}

nameInput.addEventListener('input', () => {
  if (nameInput.readOnly) return;
  player.name = (nameInput.value || 'Player').trim().slice(0, 16) || 'Player';
  drawLobbyPreview();
});

nameInput.addEventListener('keydown', (e) => {
  if (nameInput.readOnly) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    queueQuickMatchFromLobby();
  }
});

// ── Mobile Skill Buttons ──────────────────────────────────────
bindPullCastButton(mobileFireBtn, () => castPlayerSpell('fire'), 'fire');
bindPullCastButton(mobileHookBtn, () => castPlayerSpell('hook'), 'hook');
bindPullCastButton(mobileTeleportBtn, () => castPlayerSpell('blink'), 'blink');
bindPullCastButton(mobileShieldBtn, () => castPlayerSpell('shield'), 'shield');
bindPullCastButton(mobilePrismBtn, () => castPlayerSpell('prism'), 'prism');
bindPullCastButton(mobileChargeBtn, () => castPlayerSpell('charge'), 'charge');
bindPullCastButton(mobileShockBtn, () => castPlayerSpell('shock'), 'shock');
bindPullCastButton(mobileGustBtn, () => castPlayerSpell('gust'), 'gust');
bindPullCastButton(mobileSolarBtn, () => castPlayerSpell('solar'), 'solar');
bindPullCastButton(mobileRiftBtn, () => castPlayerSpell('rift'), 'rift');
bindPullCastButton(mobilePhantomBtn, () => castPlayerSpell('phantom'), 'phantom');
bindPullCastButton(mobileWallBtn, () => castPlayerSpell('wall'), 'wall');
bindPullCastButton(mobileRewindBtn, () => castPlayerSpell('rewind'), 'rewind');

// ── Window Resize ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  resizeCanvas();
  refreshMobileControls();
  drawLobbyPreview();
});

// Enforce normal-user defaults on boot; admin actions unlock via GOD MODE only.
updateGodModeMenuState();
if (window.outraMultiplayer && typeof window.outraMultiplayer.setDebugToolsEnabled === 'function') {
  window.outraMultiplayer.setDebugToolsEnabled(!!godModeEnabled);
}
