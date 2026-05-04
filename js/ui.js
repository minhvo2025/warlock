// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeKey(key) { return key === ' ' ? 'space' : String(key).toLowerCase(); }

function prettyKey(key) {
  if (!key) return 'Unbound';
  if (key === ' ' || key === 'space') return 'Space';
  if (key === 'escape') return 'Esc';
  if (key === 'arrowup') return 'Arrow Up';
  if (key === 'arrowdown') return 'Arrow Down';
  if (key === 'arrowleft') return 'Arrow Left';
  if (key === 'arrowright') return 'Arrow Right';
  if (/^mouse\d+$/.test(key)) {
    return `Mouse${key.slice(5)}`;
  }
  return key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
}

// â”€â”€ Spell Tooltip Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SPELL_TOOLTIP_DATA = {
  fire: {
    name: 'Fireblast',
    desc: 'Fast fire projectile',
    stats: '20 dmg ï¿½ long range ï¿½ knockback',
  },
  hook: {
    name: 'Hook',
    desc: 'Pulls enemy to you',
    stats: '20 dmg ï¿½ 150 range',
  },
  blink: {
    name: 'Blink',
    desc: 'Instant short teleport',
    stats: '150 range ï¿½ mobility',
  },
  shield: {
    name: 'Shield',
    desc: 'Blocks damage briefly',
    stats: '1.0s shield ï¿½ defensive',
  },
  prism: {
    name: 'Prism',
    desc: 'Frontal cone defense that blocks attacks and reflects some projectiles.',
    stats: '0.6s frontal cone ï¿½ reflects Fireblast/Hook/Gust',
  },
  charge: {
    name: 'Arcane Charge',
    desc: 'Dash forward with impact',
    stats: '16 dmg ï¿½ 150 range',
  },
  shock: {
    name: 'Shock Blast',
    desc: 'Front cone burst',
    stats: '14 dmg ï¿½ 115 range',
  },
  gust: {
    name: 'Gust',
    desc: 'Push enemies around you',
    stats: '4 dmg ï¿½ 120 radius',
  },
  solar: {
    name: 'Solar',
    desc: 'Damaging flare projectile that briefly distorts enemy vision.',
    stats: '13 dmg ï¿½ 1.35u burst ï¿½ 1.2s distortion',
  },
  rift: {
    name: 'Rift',
    desc: 'Place two linked portals that both players can use.',
    stats: '2-step placement | 4.0s linked portals',
  },
  phantom: {
    name: 'Phantom',
    desc: 'Briefly vanish, then split with an illusion to confuse enemies.',
    stats: '0.3s vanish | 1.0s illusion',
  },
  wall: {
    name: 'Wall',
    desc: 'Creates temporary barrier',
    stats: '150 width ï¿½ blocks path',
  },
  rewind: {
    name: 'Rewind',
    desc: 'Return to old position',
    stats: '1.0s rewind ï¿½ no heal',
  },
};

const LEADERBOARD_RANK_ICON_PATHS = {
  1: 'docs/art/Lobby/1.png',
  2: 'docs/art/Lobby/2.png',
  3: 'docs/art/Lobby/3.png',
};

const leaderboardRankIconStatus = {
  1: 'pending',
  2: 'pending',
  3: 'pending',
};

let leaderboardLastSignature = '';
let rankedPanelLastSignature = '';
let lobbyLeftProfileLastSignature = '';
let keybindsLastSignature = '';
let inventoryLastSignature = '';
let storeLastSignature = '';
let lobbyLeftActionsBound = false;
const ARENA_CONCEPT_HUD_ENABLED = typeof OUTRA_ENABLE_ARENA_CONCEPT_HUD === 'boolean'
  ? OUTRA_ENABLE_ARENA_CONCEPT_HUD
  : true;
const ARENA_CONCEPT_FALLBACK_SPELLS = ['hook', 'blink', 'shield'];
const ARENA_CONCEPT_STANDARD_SPELLS = ['fire'];

const LOBBY_LEFT_PROFILE_DEFAULTS = Object.freeze({
  displayTitle: '',
  username: 'Flamebound9414',
  rankLabel: 'RANK 5',
  rankTitle: 'Inferno Commander',
  avatarTexture: '/docs/art/character/profile.png',
  rankIconTexture: '/docs/art/ranks/5.png',
});

const lobbyLeftProfileOverrides = {
  displayTitle: LOBBY_LEFT_PROFILE_DEFAULTS.displayTitle,
  username: LOBBY_LEFT_PROFILE_DEFAULTS.username,
  rankLabel: LOBBY_LEFT_PROFILE_DEFAULTS.rankLabel,
  rankTitle: LOBBY_LEFT_PROFILE_DEFAULTS.rankTitle,
  avatarTexture: LOBBY_LEFT_PROFILE_DEFAULTS.avatarTexture,
  rankIconTexture: LOBBY_LEFT_PROFILE_DEFAULTS.rankIconTexture,
};

function preloadLeaderboardRankIcons() {
  Object.entries(LEADERBOARD_RANK_ICON_PATHS).forEach(([rankKey, src]) => {
    const rank = Number(rankKey);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      leaderboardRankIconStatus[rank] = 'loaded';
    };
    img.onerror = () => {
      leaderboardRankIconStatus[rank] = 'failed';
    };
    img.src = src;
  });
}

preloadLeaderboardRankIcons();

let spellTooltipEl = null;
let rankTooltipEl = null;
let rankTooltipAutoHideBound = false;

function ensureSpellTooltip() {
  if (spellTooltipEl && document.body.contains(spellTooltipEl)) return spellTooltipEl;

  spellTooltipEl = document.createElement('div');
  spellTooltipEl.id = 'spellTooltip';
  spellTooltipEl.className = 'spellTooltip hidden';
  spellTooltipEl.innerHTML = `
    <div class="spellTooltipName"></div>
    <div class="spellTooltipDesc"></div>
    <div class="spellTooltipStats"></div>
  `;
  document.body.appendChild(spellTooltipEl);
  return spellTooltipEl;
}

function showSpellTooltip(spellId, x, y) {
  const tooltip = ensureSpellTooltip();
  const data = SPELL_TOOLTIP_DATA[spellId];
  if (!data) return;

  tooltip.querySelector('.spellTooltipName').textContent = data.name;
  tooltip.querySelector('.spellTooltipDesc').textContent = data.desc;
  tooltip.querySelector('.spellTooltipStats').textContent = data.stats;

  tooltip.classList.remove('hidden');
  positionSpellTooltip(x, y);
}

function positionSpellTooltip(x, y) {
  const tooltip = ensureSpellTooltip();
  const pad = 14;

  const rect = tooltip.getBoundingClientRect();
  let left = x - rect.width / 2;
  let top = y - rect.height - 18;

  if (left < pad) left = pad;
  if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
  if (top < pad) top = y + 18;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideSpellTooltip() {
  if (!spellTooltipEl) return;
  spellTooltipEl.classList.add('hidden');
}

function getAllRanksForTooltip() {
  const fromConfig = Array.isArray(window.OUTRA_RANKS?.all) ? window.OUTRA_RANKS.all : [];
  if (!fromConfig.length) return [];

  return fromConfig.map((tier) => ({
    id: tier.id,
    rankText: Number.isFinite(Number(tier?.rankNumber)) ? `Rank ${Number(tier.rankNumber)}` : 'Master',
    label: getRankLabelFromTier(tier),
    badge: getRankBadgeAssetPath(tier),
    fallback: getRankBadgeFallbackToken(tier),
  }));
}

function ensureRankTooltip() {
  if (rankTooltipEl && document.body.contains(rankTooltipEl)) return rankTooltipEl;

  const ranks = getAllRanksForTooltip();
  rankTooltipEl = document.createElement('div');
  rankTooltipEl.id = 'rankTooltip';
  rankTooltipEl.className = 'rankTooltip hidden';
  rankTooltipEl.innerHTML = `
    <div class="rankTooltipTitle">All Ranks</div>
    <div class="rankTooltipRows">
      ${ranks.map((entry) => `
        <div class="rankTooltipRow" data-rank-tooltip-row="${escapeHtml(entry.id)}">
          <span class="rankTooltipIconWrap">
            <img
              class="rankTooltipIcon"
              src="${escapeHtml(entry.badge)}"
              alt="${escapeHtml(entry.rankText)} icon"
              data-rank-tooltip-icon="1"
              decoding="async"
              draggable="false"
            />
            <span class="rankTooltipIconFallback">${escapeHtml(entry.fallback)}</span>
          </span>
          <span class="rankTooltipText">
            <span class="rankTooltipRankText">${escapeHtml(entry.rankText)}</span>
            <span class="rankTooltipLabel">${escapeHtml(entry.label)}</span>
          </span>
        </div>
      `).join('')}
    </div>
  `;
  document.body.appendChild(rankTooltipEl);

  rankTooltipEl.querySelectorAll('[data-rank-tooltip-icon="1"]').forEach((img) => {
    const icon = img;
    const applyFallback = () => {
      const wrap = icon.closest('.rankTooltipIconWrap');
      if (wrap) wrap.classList.add('rankTooltipIconFailed');
    };
    icon.addEventListener('error', applyFallback);
    if (icon.complete && icon.naturalWidth === 0) {
      applyFallback();
    }
  });

  return rankTooltipEl;
}

function positionRankTooltip(clientX, clientY) {
  const tooltip = ensureRankTooltip();
  const pad = 14;
  const rect = tooltip.getBoundingClientRect();
  let left = clientX + 16;
  let top = clientY - rect.height * 0.25;

  if (left + rect.width > window.innerWidth - pad) left = clientX - rect.width - 16;
  if (left < pad) left = pad;
  if (top < pad) top = pad;
  if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showRankTooltip(clientX, clientY) {
  const tooltip = ensureRankTooltip();
  tooltip.classList.remove('hidden');
  positionRankTooltip(clientX, clientY);
}

function hideRankTooltip() {
  if (!rankTooltipEl) return;
  rankTooltipEl.classList.add('hidden');
}

function bindRankTooltipAutoHide() {
  if (rankTooltipAutoHideBound) return;
  rankTooltipAutoHideBound = true;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideRankTooltip();
  });

  window.addEventListener('blur', () => {
    hideRankTooltip();
  });
}

bindRankTooltipAutoHide();

function bindDesktopSpellTooltips() {
  Object.keys(SPELL_TOOLTIP_DATA).forEach((spellId) => {
    const cell = document.getElementById(`dspell-${spellId}`);
    if (!cell || cell.dataset.tooltipBound === '1') return;

    cell.dataset.tooltipBound = '1';

    cell.addEventListener('mouseenter', (e) => {
      if (isTouchDevice) return;
      showSpellTooltip(spellId, e.clientX, e.clientY);
    });

    cell.addEventListener('mousemove', (e) => {
      if (isTouchDevice) return;
      positionSpellTooltip(e.clientX, e.clientY);
    });

    cell.addEventListener('mouseleave', () => {
      hideSpellTooltip();
    });
  });
}

// â”€â”€ Tab Switching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let draftOrderBuilt = false;
let draftOrderSignature = '';
const DRAFT_PLAYER_IDS = ['A', 'B'];
const DRAFT_PLAYER_AVATAR_BY_ID = Object.freeze({
  A: '/docs/art/character/profile.png',
  B: '/docs/art/character/profile.png',
});
const DRAFT_DEFAULT_RANK_ID = '20';
const DRAFT_EMOTE_LABELS = Object.freeze({
  greetings: 'Greetings',
  good_game: 'Good game',
  easy_win: 'Easy Win',
});
const DRAFT_EMOTE_UNLOCK_STORE_KEYS = Object.freeze({
  good_game: 'emoteGoodGame',
  easy_win: 'emoteEasyWin',
});
const draftEmoteHideTimers = {
  A: 0,
  B: 0,
};
let draftEmoteBindingsReady = false;
const DRAFT_OVERLAY_STICKY_MS = (() => {
  const configured = Number(window.OUTRA_MULTIPLAYER_PHASE_STICKY_MS);
  if (!Number.isFinite(configured)) return 1500;
  return Math.max(240, configured);
})();
const DRAFT_TURN_FLASH_MIN_GAP_MS = 420;
let draftOverlayLastServerActiveAt = 0;
const draftUiSpellFxState = {
  initialized: false,
  prevPicks: {
    A: [],
    B: [],
  },
  lastActivePlayerId: '',
  hoverSpellId: '',
  hoverStartedAt: 0,
  pendingSpellId: '',
  pendingPlayerId: '',
  pendingStartedAt: 0,
  lastTurnFlashAt: 0,
};

const MP_ABILITY_TO_UI_SPELL = Object.freeze({
  fireblast: 'fire',
  blink: 'blink',
  shield: 'shield',
  prism: 'prism',
  gust: 'gust',
  charge: 'charge',
  shock: 'shock',
  solar: 'solar',
  rift: 'rift',
  phantom: 'phantom',
  wall: 'wall',
  rewind: 'rewind',
  hook: 'hook',
});

function getMultiplayerPresentationSnapshot() {
  const api = window.outraMultiplayer;
  if (!api || typeof api.getPresentationSnapshot !== 'function') return null;
  const snapshot = api.getPresentationSnapshot();
  if (!snapshot || snapshot.active !== true) return null;
  return snapshot;
}

function toUiSpellFromMultiplayer(spellOrAbilityId) {
  const normalized = String(spellOrAbilityId || '').trim().toLowerCase();
  if (!normalized) return '';
  return MP_ABILITY_TO_UI_SPELL[normalized] || normalized;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDraftPlayerId(playerId) {
  return String(playerId || '').trim().toUpperCase() === 'B' ? 'B' : 'A';
}

function clearDraftUiSpellFxState() {
  draftUiSpellFxState.initialized = false;
  draftUiSpellFxState.prevPicks.A = [];
  draftUiSpellFxState.prevPicks.B = [];
  draftUiSpellFxState.lastActivePlayerId = '';
  draftUiSpellFxState.hoverSpellId = '';
  draftUiSpellFxState.hoverStartedAt = 0;
  draftUiSpellFxState.pendingSpellId = '';
  draftUiSpellFxState.pendingPlayerId = '';
  draftUiSpellFxState.pendingStartedAt = 0;
  draftUiSpellFxState.lastTurnFlashAt = 0;
  draftState.holdSpellId = null;
  draftState.holdTime = 0;
}

function queueDraftPickFxFromSync(playerId, slotIndex, spellId) {
  if (typeof queueDraftPickConfirmationFx !== 'function') return;
  const normalizedPlayerId = normalizeDraftPlayerId(playerId);
  const normalizedSpellId = toUiSpellFromMultiplayer(spellId);
  if (!normalizedSpellId) return;
  queueDraftPickConfirmationFx(normalizedSpellId, normalizedPlayerId, slotIndex);
}

function syncDraftVisualRuntimeFromSnapshot(order, picksA, picksB, spellPool) {
  const spellOrder = Array.isArray(draftState.spellOrder) && draftState.spellOrder.length
    ? draftState.spellOrder.map((spellId) => toUiSpellFromMultiplayer(spellId)).filter(Boolean)
    : ['charge', 'prism', 'solar', 'rift', 'phantom', 'shock', 'gust', 'wall', 'rewind', 'shield', 'hook', 'blink'];
  const picksByPlayer = {
    A: Array.isArray(picksA) ? picksA : [],
    B: Array.isArray(picksB) ? picksB : [],
  };
  const pickedByPlayerCounts = {
    A: {},
    B: {},
  };

  for (const playerId of DRAFT_PLAYER_IDS) {
    for (const spellId of picksByPlayer[playerId]) {
      const normalizedSpellId = toUiSpellFromMultiplayer(spellId);
      if (!normalizedSpellId) continue;
      pickedByPlayerCounts[playerId][normalizedSpellId] = (pickedByPlayerCounts[playerId][normalizedSpellId] || 0) + 1;
    }
  }

  draftState.order = Array.isArray(order) && order.length ? order.slice() : ['A', 'B', 'B', 'A', 'A', 'B'];
  draftState.spells = spellOrder.map((spellId) => {
    const entry = spellPool && typeof spellPool === 'object' ? spellPool[spellId] : null;
    const countA = Number(pickedByPlayerCounts.A[spellId]) || 0;
    const countB = Number(pickedByPlayerCounts.B[spellId]) || 0;
    const fallbackTotal = 1;
    const remainingCopies = Number(entry?.remainingCopies);
    const totalCopies = Number(entry?.totalCopies);
    const total = Number.isFinite(totalCopies) ? Math.max(0, totalCopies) : fallbackTotal;
    const fallbackRemaining = Math.max(0, total - countA - countB);
    const remaining = Number.isFinite(remainingCopies)
      ? Math.max(0, Math.min(total, remainingCopies))
      : fallbackRemaining;
    const takenBy = countA > countB ? 'A' : countB > countA ? 'B' : countA > 0 ? (draftUiSpellFxState.pendingPlayerId || '') : null;
    return {
      id: spellId,
      label: typeof getDraftSpellLabel === 'function' ? (getDraftSpellLabel(spellId) || spellId.toUpperCase()) : spellId.toUpperCase(),
      takenBy,
      disabled: remaining <= 0,
      remainingCopies: remaining,
      totalCopies: total,
    };
  });
  if (typeof preloadDraftSpellOrbIcons === 'function') {
    preloadDraftSpellOrbIcons(spellOrder);
  }

  if (typeof getDraftLayout === 'function') {
    draftState.layout = getDraftLayout();
  }

  const seats = draftState.layout?.seats || {};
  for (const playerId of DRAFT_PLAYER_IDS) {
    const seat = seats[playerId];
    if (!seat) continue;
    if (!draftState.players[playerId]) {
      draftState.players[playerId] = { x: seat.x, y: seat.y, vx: 0, vy: 0, moveTimer: 0, dirX: 0, dirY: 0 };
    }
    draftState.players[playerId].x = seat.x;
    draftState.players[playerId].y = seat.y;
    draftState.players[playerId].vx = 0;
    draftState.players[playerId].vy = 0;
    draftState.players[playerId].moveTimer = 0;
    draftState.players[playerId].dirX = 0;
    draftState.players[playerId].dirY = 0;
  }
}

function syncDraftStateFromMultiplayer(multiplayerSnapshot) {
  const draft = multiplayerSnapshot?.draft;
  if (!draft || typeof draft !== 'object') return;

  const order = Array.isArray(draft.order) && draft.order.length
    ? draft.order.map((playerId) => normalizeDraftPlayerId(playerId))
    : ['A', 'B', 'B', 'A', 'A', 'B'];
  const activeIndexRaw = Number(draft.activeIndex);
  const activeIndex = Number.isFinite(activeIndexRaw)
    ? clampNumber(activeIndexRaw, 0, Math.max(0, order.length - 1))
    : 0;

  const rawPicksA = Array.isArray(draft.picks?.A) ? draft.picks.A : [];
  const rawPicksB = Array.isArray(draft.picks?.B) ? draft.picks.B : [];
  const picksA = rawPicksA.map((spellId) => toUiSpellFromMultiplayer(spellId)).filter(Boolean);
  const picksB = rawPicksB.map((spellId) => toUiSpellFromMultiplayer(spellId)).filter(Boolean);
  const mappedLocalPlayerId = normalizeDraftPlayerId(draft.localPlayerId || 'A');
  const mappedNames = {
    A: String(draft.playerNames?.A || '').trim(),
    B: String(draft.playerNames?.B || '').trim()
  };
  const spellPool = draft.spellPool && typeof draft.spellPool === 'object'
    ? draft.spellPool
    : {};
  let playedPickSoundThisSync = false;

  draftState.order = order;
  draftState.activeIndex = activeIndex;
  draftState.turnIndex = activeIndex;
  draftState.localPlayerId = mappedLocalPlayerId;
  draftState.complete = !!draft.complete;
  draftState.turnDuration = Math.max(0, Number(draft.turnDurationSeconds) || draftState.turnDuration || 0);
  draftState.timeLeft = Math.max(0, Number(draft.timeLeftSeconds) || 0);
  draftState.turnTimeLeft = draftState.timeLeft;
  draftState.holdDuration = Math.max(0.36, Number(draftState.holdDuration) || 0.6);
  draftState.picks = {
    A: picksA.slice(0, 3),
    B: picksB.slice(0, 3)
  };
  draftState.playerNames = mappedNames;
  draftState.spellPool = spellPool;
  syncDraftVisualRuntimeFromSnapshot(order, picksA, picksB, spellPool);

  const activePlayerId = order[activeIndex] || null;
  if (!draftUiSpellFxState.initialized) {
    draftUiSpellFxState.prevPicks.A = picksA.slice();
    draftUiSpellFxState.prevPicks.B = picksB.slice();
    draftUiSpellFxState.lastActivePlayerId = activePlayerId || '';
    draftUiSpellFxState.initialized = true;
    return;
  }

  for (const playerId of DRAFT_PLAYER_IDS) {
    const previousPicks = Array.isArray(draftUiSpellFxState.prevPicks[playerId]) ? draftUiSpellFxState.prevPicks[playerId] : [];
    const nextPicks = playerId === 'A' ? picksA : picksB;
    const maxLength = Math.max(previousPicks.length, nextPicks.length);
    for (let index = 0; index < maxLength; index += 1) {
      const prevSpellId = toUiSpellFromMultiplayer(previousPicks[index]);
      const nextSpellId = toUiSpellFromMultiplayer(nextPicks[index]);
      if (!nextSpellId || prevSpellId === nextSpellId) continue;
      queueDraftPickFxFromSync(playerId, index, nextSpellId);
      if (!playedPickSoundThisSync && typeof soundDraftPick === 'function') {
        soundDraftPick();
        playedPickSoundThisSync = true;
      }
      if (
        draftUiSpellFxState.pendingSpellId
        && draftUiSpellFxState.pendingPlayerId === playerId
        && draftUiSpellFxState.pendingSpellId === nextSpellId
      ) {
        draftUiSpellFxState.pendingSpellId = '';
        draftUiSpellFxState.pendingPlayerId = '';
        draftUiSpellFxState.pendingStartedAt = 0;
      }
    }
  }
  if (playedPickSoundThisSync && typeof stopDraftSpellHoverSound === 'function') {
    stopDraftSpellHoverSound();
  }

  if (
    draftUiSpellFxState.lastActivePlayerId !== activePlayerId
    && typeof queueDraftTurnFlash === 'function'
    && activePlayerId
    && (performance.now() - Number(draftUiSpellFxState.lastTurnFlashAt || 0)) >= DRAFT_TURN_FLASH_MIN_GAP_MS
  ) {
    queueDraftTurnFlash(activePlayerId);
    draftUiSpellFxState.lastTurnFlashAt = performance.now();
  }
  draftUiSpellFxState.lastActivePlayerId = activePlayerId || '';
  draftUiSpellFxState.prevPicks.A = picksA.slice();
  draftUiSpellFxState.prevPicks.B = picksB.slice();
}

function ensureDraftOrderUi() {
  if (!draftOrderListEl) return;

  const order = Array.isArray(draftState.order) ? draftState.order : [];
  const signature = order.join('|');
  if (!order.length) {
    draftOrderListEl.innerHTML = '';
    draftOrderBuilt = true;
    draftOrderSignature = '';
    return;
  }

  if (draftOrderBuilt && draftOrderListEl.children.length === order.length && draftOrderSignature === signature) return;

  draftOrderListEl.innerHTML = order.map((slot, idx) => `
    <span class="draftOrderChip" data-draft-order-index="${idx}" data-draft-order-player="${escapeHtml(slot)}">
      <span class="draftOrderChipTurn">${idx + 1}</span>
      <span class="draftOrderChipPlayer">${escapeHtml(slot)}</span>
    </span>
  `).join('');
  draftOrderBuilt = true;
  draftOrderSignature = signature;
}

function clearDraftEmoteToast(playerId) {
  const safeId = String(playerId || '').trim().toUpperCase();
  if (!safeId) return;

  const toastEl = document.querySelector(`[data-draft-emote-toast="${safeId}"]`);
  if (toastEl) {
    toastEl.classList.remove('show');
    toastEl.textContent = '';
  }

  if (draftEmoteHideTimers[safeId]) {
    clearTimeout(draftEmoteHideTimers[safeId]);
    draftEmoteHideTimers[safeId] = 0;
  }
}

function clearAllDraftEmoteToasts() {
  for (const playerId of DRAFT_PLAYER_IDS) {
    clearDraftEmoteToast(playerId);
  }
}

function isDraftEmoteUnlocked(emoteKey) {
  const safeKey = String(emoteKey || '').trim().toLowerCase();
  if (!safeKey) return false;
  if (safeKey === 'greetings') return true;

  const storeKey = DRAFT_EMOTE_UNLOCK_STORE_KEYS[safeKey];
  if (!storeKey) return false;
  return !!(profile?.store?.[storeKey]);
}

function syncDraftEmoteButtons() {
  if (!draftOverlay) return;

  draftOverlay.querySelectorAll('[data-draft-emote-strip]').forEach((strip) => {
    let visibleCount = 0;
    strip.querySelectorAll('[data-draft-emote-btn]').forEach((btn) => {
      const raw = btn.getAttribute('data-draft-emote-btn') || '';
      const parts = raw.split(':');
      const emoteKey = parts[1] || '';
      const unlocked = isDraftEmoteUnlocked(emoteKey);

      btn.hidden = !unlocked;
      btn.disabled = !unlocked;
      btn.setAttribute('aria-hidden', unlocked ? 'false' : 'true');
      if (unlocked) visibleCount += 1;
    });

    strip.setAttribute('data-visible-count', String(Math.max(1, visibleCount)));
  });
}

function showDraftEmoteToast(playerId, emoteKey) {
  const safeId = String(playerId || '').trim().toUpperCase();
  const key = String(emoteKey || '').trim().toLowerCase();
  const emoteLabel = DRAFT_EMOTE_LABELS[key] || '';
  if (!safeId || !emoteLabel) return;

  const toastEl = document.querySelector(`[data-draft-emote-toast="${safeId}"]`);
  if (!toastEl) return;

  if (draftEmoteHideTimers[safeId]) {
    clearTimeout(draftEmoteHideTimers[safeId]);
    draftEmoteHideTimers[safeId] = 0;
  }

  toastEl.textContent = emoteLabel;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');

  draftEmoteHideTimers[safeId] = setTimeout(() => {
    clearDraftEmoteToast(safeId);
  }, 1450);
}

function ensureDraftEmoteBindings() {
  if (draftEmoteBindingsReady || !draftOverlay) return;
  draftEmoteBindingsReady = true;

  draftOverlay.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest('[data-draft-emote-btn]');
    if (!btn) return;

    const raw = btn.getAttribute('data-draft-emote-btn') || '';
    const [playerId, emoteKey] = raw.split(':');
    if (!playerId || !emoteKey) return;
    const mpSnapshot = getMultiplayerPresentationSnapshot();
    const draftActive = gameState === 'draft' || !!mpSnapshot?.isDraftActive;
    if (!draftActive) return;
    if (!isDraftEmoteUnlocked(emoteKey)) return;

    showDraftEmoteToast(playerId, emoteKey);
  });
}

function getDraftUiSpellLabel(spellId) {
  if (!spellId) return 'Spell';
  const fallback = (SPELL_DEFS[spellId] && SPELL_DEFS[spellId].name)
    ? SPELL_DEFS[spellId].name
    : String(spellId).toUpperCase();
  if (typeof getDraftSpellLabel !== 'function') return fallback;
  return getDraftSpellLabel(spellId) || fallback;
}

function getDraftUiSpellIconPath(spellId) {
  if (!spellId) return '';
  const path = SPELL_ICONS?.[spellId];
  return typeof path === 'string' ? path : '';
}

function syncDraftPickSlotVisual(slotEl, spellId) {
  if (!slotEl) return;
  if (!spellId) {
    delete slotEl.dataset.spellIconPath;
    return;
  }

  const label = getDraftUiSpellLabel(spellId);
  const iconPath = getDraftUiSpellIconPath(spellId);
  const fallbackIcon = (SPELL_DEFS[spellId] && SPELL_DEFS[spellId].icon) ? SPELL_DEFS[spellId].icon : '*';
  const currentPath = slotEl.dataset.spellIconPath || '';
  const hasImage = !!slotEl.querySelector('.draftPickIconImg');

  if (!iconPath) {
    slotEl.dataset.spellIconPath = '';
    return;
  }

  if (currentPath === iconPath && hasImage) return;

  slotEl.innerHTML = `
    <span class="draftPickIconWrap">
      <img class="draftPickIconImg" src="${escapeHtml(iconPath)}" alt="${escapeHtml(label)}" loading="lazy" decoding="async" />
      <span class="draftPickIconFallback">${escapeHtml(fallbackIcon)}</span>
    </span>
    <span class="draftPickName">${escapeHtml(label)}</span>
  `;

  const iconImg = slotEl.querySelector('.draftPickIconImg');
  const iconFallback = slotEl.querySelector('.draftPickIconFallback');
  if (iconFallback) iconFallback.style.display = 'none';
  if (iconImg) {
    iconImg.addEventListener('error', () => {
      iconImg.remove();
      if (iconFallback) iconFallback.style.display = 'inline-flex';
    }, { once: true });
  }

  slotEl.dataset.spellIconPath = iconPath;
}

function getDraftPlayerAvatarPath(playerId) {
  return DRAFT_PLAYER_AVATAR_BY_ID[playerId] || DRAFT_PLAYER_AVATAR_BY_ID.A;
}

function getDraftPlayerDisplayName(playerId) {
  const localPlayerId = draftState.localPlayerId || 'A';
  if (playerId === localPlayerId) {
    const localName = typeof player?.name === 'string' ? player.name.trim() : '';
    return localName || `Player ${playerId}`;
  }

  const mappedName = draftState?.playerNames?.[playerId];
  if (typeof mappedName === 'string' && mappedName.trim()) {
    return mappedName.trim();
  }

  return playerId === 'B' ? 'Opponent' : `Player ${playerId}`;
}

function getDraftPlayerRankTier(playerId) {
  const localPlayerId = draftState.localPlayerId || 'A';
  if (playerId === localPlayerId && typeof getRankedSnapshot === 'function') {
    const snapshot = getRankedSnapshot();
    if (snapshot?.tier) return snapshot.tier;
  }

  return window.OUTRA_RANKS?.getById?.(DRAFT_DEFAULT_RANK_ID)
    || window.OUTRA_RANKS?.all?.[0]
    || null;
}

function syncDraftPlayerAvatar(panel, playerId) {
  if (!panel) return;

  const avatarWrap = panel.querySelector(`[data-draft-player-avatar-wrap="${playerId}"]`);
  const avatarImg = panel.querySelector(`[data-draft-player-avatar="${playerId}"]`);
  const avatarFallback = panel.querySelector('.draftPlayerAvatarFallback');
  if (avatarFallback) avatarFallback.textContent = playerId;
  if (!avatarWrap || !avatarImg) return;

  if (avatarImg.dataset.fallbackBound !== '1') {
    avatarImg.dataset.fallbackBound = '1';

    avatarImg.addEventListener('error', () => {
      avatarWrap.classList.add('avatar-failed');
    });

    avatarImg.addEventListener('load', () => {
      if (avatarImg.naturalWidth > 0 && avatarImg.naturalHeight > 0) {
        avatarWrap.classList.remove('avatar-failed');
      }
    });
  }

  const avatarPath = getDraftPlayerAvatarPath(playerId);
  if (avatarImg.dataset.avatarPath !== avatarPath) {
    avatarImg.dataset.avatarPath = avatarPath;
    avatarImg.src = avatarPath;
  }

  if (avatarImg.complete && avatarImg.naturalWidth === 0) {
    avatarWrap.classList.add('avatar-failed');
  }
}

function syncDraftPlayerRankBadge(panel, playerId) {
  if (!panel) return;

  const rankWrap = panel.querySelector(`[data-draft-player-rank="${playerId}"]`);
  if (!rankWrap) return;

  const tier = getDraftPlayerRankTier(playerId);
  const normalizedTier = tier || {
    id: DRAFT_DEFAULT_RANK_ID,
    label: `Rank ${DRAFT_DEFAULT_RANK_ID}`,
    rankNumber: Number(DRAFT_DEFAULT_RANK_ID),
    badge: window.OUTRA_RANKS?.placeholderBadge || '/docs/art/ranks/20.png',
  };
  const signature = [
    String(normalizedTier.id || ''),
    String(normalizedTier.badge || ''),
    String(normalizedTier.label || normalizedTier.name || ''),
  ].join('|');

  if (rankWrap.dataset.rankSignature !== signature) {
    rankWrap.dataset.rankSignature = signature;
    rankWrap.innerHTML = renderRankBadgeDisplay(normalizedTier, { size: 52 });
    bindRankBadgeDisplayFallbacks(rankWrap);
  }
}

function renderDraftPlayerPanel(playerId, activePlayer, activeIndex, order, isComplete) {
  const panel = document.querySelector(`[data-draft-player-panel="${playerId}"]`);
  if (!panel) return;

  const localPlayerId = draftState.localPlayerId || 'A';
  const picks = Array.isArray(draftState.picks?.[playerId]) ? draftState.picks[playerId] : [];
  const isActive = !isComplete && activePlayer === playerId;
  const isLocal = localPlayerId === playerId;
  const isLocked = picks.length >= 3 || isComplete;

  panel.classList.toggle('is-active', isActive);
  panel.classList.toggle('is-local', isLocal);
  panel.classList.toggle('is-complete', isLocked);
  syncDraftPlayerAvatar(panel, playerId);
  syncDraftPlayerRankBadge(panel, playerId);

  const metaEl = panel.querySelector(`[data-draft-player-meta="${playerId}"]`);
  if (metaEl) {
    const displayName = getDraftPlayerDisplayName(playerId);
    metaEl.textContent = isLocal ? `${displayName} (You)` : displayName;
  }

  const stateEl = panel.querySelector(`[data-draft-player-state="${playerId}"]`);
  if (stateEl) {
    let stateText = 'WAITING';
    if (isActive) {
      stateText = 'PICKING';
    } else if (isLocked) {
      stateText = 'LOCKED';
    } else {
      const nextTurn = order.findIndex((slot, idx) => idx > activeIndex && slot === playerId);
      stateText = nextTurn === -1 ? 'DONE' : `UP ${nextTurn + 1}`;
    }
    stateEl.textContent = stateText;
  }

  for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
    const slotEl = panel.querySelector(`[data-draft-player-slot="${playerId}-${slotIndex}"]`);
    if (!slotEl) continue;

    const spellId = picks[slotIndex];
    const spellToken = spellId ? String(spellId) : '';
    slotEl.classList.toggle('filled', !!spellId);
    slotEl.classList.toggle('empty', !spellId);

    if (slotEl.dataset.spellId !== spellToken) {
      if (spellId) {
        const icon = (SPELL_DEFS[spellId] && SPELL_DEFS[spellId].icon) ? SPELL_DEFS[spellId].icon : 'âœ¦';
        const label = getDraftUiSpellLabel(spellId);
        slotEl.innerHTML = `<span class="draftPickIcon">${escapeHtml(icon)}</span><span class="draftPickName">${escapeHtml(label)}</span>`;
        slotEl.setAttribute('title', label);
      } else {
        slotEl.innerHTML = '<span class="draftPickPlaceholder">Empty</span>';
        slotEl.removeAttribute('title');
      }
      slotEl.dataset.spellId = spellToken;
    }

    if (spellId) {
      syncDraftPickSlotVisual(slotEl, spellId);
    } else {
      delete slotEl.dataset.spellIconPath;
    }
  }
}

function requestMultiplayerDraftPick(spellId) {
  const api = window.outraMultiplayer;
  if (!api || typeof api.requestDraftPick !== 'function') return false;
  const normalizedSpellId = toUiSpellFromMultiplayer(spellId);
  const localPlayerId = normalizeDraftPlayerId(draftState.localPlayerId || 'A');
  if (normalizedSpellId) {
    draftUiSpellFxState.pendingSpellId = normalizedSpellId;
    draftUiSpellFxState.pendingPlayerId = localPlayerId;
    draftUiSpellFxState.pendingStartedAt = performance.now();
    draftUiSpellFxState.hoverSpellId = normalizedSpellId;
    draftUiSpellFxState.hoverStartedAt = performance.now();
  }
  api.requestDraftPick(spellId);
  return true;
}

function updateDraftOverlayUi(multiplayerSnapshot = null) {
  if (!draftOverlay) return;
  const snapshot = multiplayerSnapshot || getMultiplayerPresentationSnapshot();
  const nowMs = performance.now();
  const wasDraftVisible = draftOverlay.classList.contains('show');
  const snapshotDraftActive = !!snapshot?.isDraftActive;
  if (snapshotDraftActive) {
    draftOverlayLastServerActiveAt = nowMs;
    syncDraftStateFromMultiplayer(snapshot);
  }

  const shouldStickToDraft =
    !!snapshot?.active
    && !snapshot?.isArenaActive
    && !snapshot?.isArenaPending
    && !snapshot?.isMatchEnd
    && draftOverlayLastServerActiveAt > 0
    && (nowMs - draftOverlayLastServerActiveAt) <= DRAFT_OVERLAY_STICKY_MS;
  const isDraft = gameState === 'draft' || snapshotDraftActive || shouldStickToDraft;
  if (!isDraft) {
    draftOverlayLastServerActiveAt = 0;
  }
  draftOverlay.classList.toggle('show', isDraft);
  draftOverlay.setAttribute('aria-hidden', isDraft ? 'false' : 'true');
  if (isDraft && !wasDraftVisible && typeof invalidateDraftLayout === 'function') {
    invalidateDraftLayout({ settleFrames: 3 });
  }
  if (!isDraft) {
    clearDraftUiSpellFxState();
    clearAllDraftEmoteToasts();
    if (wasDraftVisible && typeof invalidateDraftLayout === 'function') {
      invalidateDraftLayout();
    }
    return;
  }

  ensureDraftEmoteBindings();
  syncDraftEmoteButtons();
  ensureDraftOrderUi();

  const isComplete = !!draftState.complete;
  const order = Array.isArray(draftState.order) && draftState.order.length
    ? draftState.order
    : ['A'];
  const activeIndex = Math.max(0, Math.min(order.length - 1, Number(draftState.activeIndex) || 0));
  const activePlayer = isComplete
    ? null
    : (order[activeIndex] || (draftState.localPlayerId || 'A'));
  const localPlayerId = draftState.localPlayerId || 'A';
  const turnNumber = activeIndex + 1;
  const timeLeft = Math.max(0, Number(draftState.timeLeft) || 0);
  const wholeSecondsLeft = isComplete ? 0 : Math.ceil(timeLeft);

  if (draftTurnBadgeEl) {
    draftTurnBadgeEl.classList.remove('local-turn', 'complete-turn');
    if (isComplete) {
      draftTurnBadgeEl.textContent = 'DRAFT COMPLETE';
      draftTurnBadgeEl.classList.add('complete-turn');
    } else {
      const isLocalTurn = activePlayer === localPlayerId;
      draftTurnBadgeEl.textContent = isLocalTurn ? 'YOUR TURN' : `PLAYER ${activePlayer} TURN`;
      draftTurnBadgeEl.classList.toggle('local-turn', isLocalTurn);
    }
  }

  if (draftTurnTextEl) {
    draftTurnTextEl.textContent = isComplete
      ? 'ALL PICKS LOCKED'
      : `TURN ${turnNumber}/${order.length} - PLAYER ${activePlayer} PICKING`;
  }

  if (draftCountdownEl) {
    draftCountdownEl.textContent = String(wholeSecondsLeft);
  }

  if (draftTimerCardEl) {
    draftTimerCardEl.classList.remove('timer-mid', 'timer-low');
    if (!isComplete) {
      if (timeLeft <= 3) {
        draftTimerCardEl.classList.add('timer-low');
      } else if (timeLeft <= 6) {
        draftTimerCardEl.classList.add('timer-mid');
      }
    }
  }

  if (draftHelperTextEl) {
    draftHelperTextEl.textContent = isComplete
      ? 'Starting match...'
      : (activePlayer === localPlayerId
          ? 'Hover ~1s or click a spell to lock your pick'
          : `Waiting for Player ${activePlayer}`);
  }

  if (draftOrderProgressEl) {
    const currentPick = isComplete ? order.length : turnNumber;
    draftOrderProgressEl.textContent = `Pick ${currentPick}/${order.length}`;
  }

  for (const playerId of DRAFT_PLAYER_IDS) {
    renderDraftPlayerPanel(playerId, activePlayer, activeIndex, order, isComplete);
  }

  if (!draftOrderListEl) return;
  draftOrderListEl.querySelectorAll('.draftOrderChip').forEach((chip, idx) => {
    const chipPlayer = chip.getAttribute('data-draft-order-player') || '';
    chip.classList.toggle('active', !isComplete && idx === activeIndex);
    chip.classList.toggle('done', isComplete || idx < activeIndex);
    chip.classList.toggle('upcoming', !isComplete && idx > activeIndex);
    chip.classList.toggle('local', chipPlayer === localPlayerId);
  });
}

function setMenuTab(tab) {
  activeMenuTab = tab;

  document.querySelectorAll('[data-menu-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.menuTab === tab);
  });

  document.querySelectorAll('.menuPage').forEach((page) => {
    page.classList.remove('active');
  });

  const page = document.getElementById('menu' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (page) page.classList.add('active');
}

function openStoreModal() {
  const modal = document.getElementById('storeModal');
  if (!modal) return;

  activeLobbyTab = 'store';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('storeOpen');

  document.querySelectorAll('[data-lobby-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lobbyTab === 'store');
  });

  renderStore();
  renderInventory();
}

function closeStoreModal() {
  const modal = document.getElementById('storeModal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('storeOpen');

  activeLobbyTab = 'play';
  document.querySelectorAll('[data-lobby-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lobbyTab === 'play');
  });
}

function setLobbyTab(tab) {
  activeLobbyTab = tab;

  document.querySelectorAll('[data-lobby-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lobbyTab === tab);
  });

  if (tab === 'store') {
    openStoreModal();
    return;
  }

  closeStoreModal();

  document.querySelectorAll('.lobbyPage').forEach((page) => {
    page.classList.remove('active');
  });

  const page = document.getElementById('lobby' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (page) page.classList.add('active');

  if (tab === 'play') {
    drawLobbyPreview();
  }
}

// â”€â”€ Mobile Controls Visibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function refreshMobileControls() {
  const snapshot = getMultiplayerPresentationSnapshot();
  const inArenaPhase = gameState === 'playing'
    || gameState === 'result'
    || !!snapshot?.isArenaActive;
  mobileControls.classList.toggle('show', isTouchDevice && inArenaPhase);
}

// â”€â”€ Ranked Panel (replaces color chooser) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getRankStarsHtml(stars, totalStars) {
  const safeTotalStars = Math.max(0, Number(totalStars) || 0);
  if (safeTotalStars <= 0) return '';

  let html = '';
  for (let i = 0; i < safeTotalStars; i++) {
    html += `<span style="font-size:18px; letter-spacing:1px; color:${i < stars ? '#ffd36b' : 'rgba(255,255,255,0.24)'}">â˜…</span>`;
  }
  return html;
}

function getRankLabelFromTier(tier) {
  if (typeof tier?.name === 'string' && tier.name.trim()) {
    return tier.name.trim();
  }

  if (typeof tier?.label === 'string' && tier.label.trim()) {
    const rawLabel = tier.label.trim();
    const emDashSplit = rawLabel.split('\u2014');
    if (emDashSplit.length > 1) {
      const suffix = emDashSplit.slice(1).join('\u2014').trim();
      if (suffix) return suffix;
    }
    const cleaned = rawLabel.replace(/^Rank\s+\d+\s*[-:]\s*/i, '').trim();
    return cleaned || rawLabel;
  }

  return 'Unranked';
}

function getRankBadgeAssetPath(tier) {
  if (typeof tier?.badge === 'string' && tier.badge) return tier.badge;
  const fromConfig = window.OUTRA_RANKS?.getById?.(tier?.id)?.badge;
  if (typeof fromConfig === 'string' && fromConfig) return fromConfig;
  const rankNumber = Number(tier?.rankNumber);
  if (Number.isFinite(rankNumber)) return `/docs/art/ranks/${rankNumber}.png`;
  return window.OUTRA_RANKS?.placeholderBadge || '/docs/art/ranks/20.png';
}

function getRankBadgeFallbackToken(tier) {
  if (Number.isFinite(Number(tier?.rankNumber))) return String(Number(tier.rankNumber));
  return 'M';
}

function getLobbyLeftProfileElements() {
  return {
    displayTitleEl: document.getElementById('lobbyProfileDisplayTitle'),
    usernameEl: document.getElementById('lobbyProfileUsername'),
    rankLabelEl: document.getElementById('lobbyProfileRankLabel'),
    rankTitleEl: document.getElementById('lobbyProfileRankTitle'),
    avatarEl: document.getElementById('lobbyProfileAvatar'),
    rankIconImgEl: document.getElementById('lobbyProfileRankIconImg'),
    rankIconFallbackEl: document.getElementById('lobbyProfileRankIconFallback'),
  };
}

function getLobbyLeftProfileData() {
  const snapshot = typeof getRankedSnapshot === 'function' ? getRankedSnapshot() : null;
  const tier = snapshot?.tier || null;
  const resolvedDisplayName = String(window.playerProfile?.display_name || player?.name || '').trim();
  const rankNumber = Number.isFinite(Number(tier?.rankNumber)) ? Number(tier.rankNumber) : 5;
  const rankIconTier = tier || { id: String(rankNumber), rankNumber };
  const rankTitle = tier ? getRankLabelFromTier(tier) : lobbyLeftProfileOverrides.rankTitle;
  const rankLabel = Number.isFinite(rankNumber) ? `RANK ${rankNumber}` : lobbyLeftProfileOverrides.rankLabel;
  const rankIconTexture = String(getRankBadgeAssetPath(rankIconTier) || lobbyLeftProfileOverrides.rankIconTexture || LOBBY_LEFT_PROFILE_DEFAULTS.rankIconTexture).trim();

  return {
    displayTitle: String(lobbyLeftProfileOverrides.displayTitle || LOBBY_LEFT_PROFILE_DEFAULTS.displayTitle).trim() || LOBBY_LEFT_PROFILE_DEFAULTS.displayTitle,
    username: resolvedDisplayName || String(lobbyLeftProfileOverrides.username || LOBBY_LEFT_PROFILE_DEFAULTS.username).trim(),
    rankLabel,
    rankTitle: String(rankTitle || lobbyLeftProfileOverrides.rankTitle || LOBBY_LEFT_PROFILE_DEFAULTS.rankTitle).trim(),
    avatarTexture: String(lobbyLeftProfileOverrides.avatarTexture || LOBBY_LEFT_PROFILE_DEFAULTS.avatarTexture).trim(),
    rankIconTexture,
  };
}

function renderLobbyLeftProfile(profileData = null, force = false) {
  const elements = getLobbyLeftProfileElements();
  if (!elements.displayTitleEl || !elements.usernameEl || !elements.rankLabelEl || !elements.rankTitleEl) return;

  const data = profileData && typeof profileData === 'object'
    ? profileData
    : getLobbyLeftProfileData();

  const signature = JSON.stringify({
    displayTitle: data.displayTitle,
    username: data.username,
    rankLabel: data.rankLabel,
    rankTitle: data.rankTitle,
    avatarTexture: data.avatarTexture,
    rankIconTexture: data.rankIconTexture,
  });
  if (!force && signature === lobbyLeftProfileLastSignature) return;
  lobbyLeftProfileLastSignature = signature;

  elements.displayTitleEl.textContent = data.displayTitle;
  elements.usernameEl.textContent = data.username;
  elements.rankLabelEl.textContent = data.rankLabel;
  elements.rankTitleEl.textContent = data.rankTitle;

  if (elements.avatarEl && data.avatarTexture) {
    elements.avatarEl.src = data.avatarTexture;
  }

  const fallbackMatch = String(data.rankLabel || '').match(/\d+/);
  const fallbackToken = fallbackMatch ? `R${fallbackMatch[0]}` : 'R';
  const hasRankIconTexture = !!data.rankIconTexture;

  if (elements.rankIconImgEl) {
    if (hasRankIconTexture) {
      elements.rankIconImgEl.src = data.rankIconTexture;
      elements.rankIconImgEl.hidden = false;
    } else {
      elements.rankIconImgEl.hidden = true;
      elements.rankIconImgEl.removeAttribute('src');
    }
  }

  if (elements.rankIconFallbackEl) {
    elements.rankIconFallbackEl.textContent = fallbackToken;
    elements.rankIconFallbackEl.hidden = hasRankIconTexture;
  }
}

function bindLobbyLeftActions() {
  if (lobbyLeftActionsBound) return;
  lobbyLeftActionsBound = true;

  const rankingsBtn = document.getElementById('leftRankingsBtn');
  if (rankingsBtn) {
    rankingsBtn.addEventListener('click', () => {
      if (typeof playMenuClickSound === 'function') {
        playMenuClickSound();
      } else if (typeof soundClick === 'function') {
        soundClick();
      }
      console.info('[Lobby] Rankings panel is not implemented yet.');
    });
  }

  const settingsBtn = document.getElementById('leftSettingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (typeof playMenuClickSound === 'function') {
        playMenuClickSound();
      } else if (typeof soundClick === 'function') {
        soundClick();
      }
      if (typeof setMenuTab === 'function') setMenuTab('settings');
      if (typeof openMenu === 'function') {
        openMenu();
        return;
      }
      if (typeof toggleMenu === 'function') {
        toggleMenu();
      }
    });
  }
}

window.setLobbyLeftProfileConfig = function setLobbyLeftProfileConfig(nextConfig = {}) {
  if (!nextConfig || typeof nextConfig !== 'object') return;
  Object.assign(lobbyLeftProfileOverrides, nextConfig);
  rankedPanelLastSignature = '';
  renderLobbyLeftProfile(null, true);
};

function renderRankBadgeDisplay(tier, options = {}) {
  const size = Math.max(24, Number(options.size) || 64);
  const badgePath = escapeHtml(getRankBadgeAssetPath(tier));
  const label = escapeHtml(String(tier?.label || tier?.name || 'Rank'));
  const fallbackToken = escapeHtml(getRankBadgeFallbackToken(tier));

  return `
    <div class="rankBadge rankBadgeDisplay" style="width:${size}px; height:${size}px;" aria-label="${label}">
      <img
        class="rankIcon rankBadgeDisplayIcon"
        src="${badgePath}"
        alt="${label} badge"
        data-rank-display-badge="1"
        decoding="async"
        draggable="false"
      />
      <span class="rankFallback rankBadgeDisplayFallback">${fallbackToken}</span>
    </div>
  `;
}

function bindRankBadgeDisplayFallbacks(scope) {
  const root = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
  root.querySelectorAll('[data-rank-display-badge="1"]').forEach((img) => {
    if (img.dataset.bound === '1') return;
    img.dataset.bound = '1';

    const applyFallback = () => {
      const badge = img.closest('.rankBadgeDisplay');
      if (badge) badge.classList.add('rankIconFailed');
    };

    img.addEventListener('error', applyFallback);
    if (img.complete && img.naturalWidth === 0) {
      applyFallback();
    }

    const badge = img.closest('.rankBadgeDisplay');
    if (badge && badge.dataset.rankTooltipBound !== '1') {
      badge.dataset.rankTooltipBound = '1';

      badge.addEventListener('mouseenter', (e) => {
        if (isTouchDevice) return;
        showRankTooltip(e.clientX, e.clientY);
      });

      badge.addEventListener('mousemove', (e) => {
        if (isTouchDevice) return;
        positionRankTooltip(e.clientX, e.clientY);
      });

      badge.addEventListener('mouseleave', () => {
        hideRankTooltip();
      });
    }
  });
}

function buildRankedPanel() {
  bindLobbyLeftActions();
  const profileData = getLobbyLeftProfileData();
  const renderSignature = JSON.stringify(profileData);
  if (renderSignature === rankedPanelLastSignature) return;
  rankedPanelLastSignature = renderSignature;
  hideRankTooltip();
  renderLobbyLeftProfile(profileData, true);

  // Legacy mount stays empty so old rank card art is no longer used on the left side.
  if (colorRow) {
    colorRow.innerHTML = '';
  }
}

// â”€â”€ Keybinds UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildKeybindsUI() {
  const signature = Object.keys(bindLabels)
    .map((action) => `${action}:${String(keybinds[action] || '')}`)
    .join('|') + `|waiting:${String(waitingForBind || '')}`;
  if (signature === keybindsLastSignature) return;
  keybindsLastSignature = signature;

  bindList.innerHTML = '';
  Object.keys(bindLabels).forEach(action => {
    const row = document.createElement('div');
    row.className = 'bindRow';

    const label = document.createElement('div');
    label.textContent = bindLabels[action];

    const btn = document.createElement('button');
    btn.className = 'secondary bindBtn' + (waitingForBind === action ? ' waiting' : '');
    btn.textContent = waitingForBind === action ? 'Press a key or mouse...' : prettyKey(keybinds[action]);
    btn.addEventListener('click', () => {
      waitingForBind = action;
      buildKeybindsUI();
    });

    row.appendChild(label);
    row.appendChild(btn);
    bindList.appendChild(row);
  });
}

// â”€â”€ Leaderboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderLeaderboard() {
  if (!leaderboardList) return;
  // Legacy leaderboard mount is currently hidden in lobby v2; skip expensive DOM work until it is shown again.
  if (leaderboardList.hidden || leaderboardList.getAttribute('aria-hidden') === 'true') return;

  const entries = getLeaderboard().slice().sort((a, b) => {
    const pointsDiff = (Number(b?.points) || 0) - (Number(a?.points) || 0);
    if (pointsDiff !== 0) return pointsDiff;
    const winsDiff = (Number(b?.wins) || 0) - (Number(a?.wins) || 0);
    if (winsDiff !== 0) return winsDiff;
    const createdA = Date.parse(String(a?.created_at || '')) || Number.MAX_SAFE_INTEGER;
    const createdB = Date.parse(String(b?.created_at || '')) || Number.MAX_SAFE_INTEGER;
    if (createdA !== createdB) return createdA - createdB;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
  const profileUserId = String(window.playerProfile?.user_id || '').trim();
  const profileDisplayName = String(window.playerProfile?.display_name || player?.name || '').trim().toLowerCase();
  let myIndex = -1;
  if (profileUserId) {
    myIndex = entries.findIndex((entry) => String(entry?.user_id || '').trim() === profileUserId);
  }
  if (myIndex < 0 && profileDisplayName) {
    myIndex = entries.findIndex((entry) => String(entry?.name || '').trim().toLowerCase() === profileDisplayName);
  }

  const visibleRows = entries.map((entry, index) => ({
    index,
    rank: index + 1,
    entry,
    isMe: index === myIndex,
  }));

  const signature = visibleRows
    .map((row) => `${row.rank}:${row.entry?.user_id || ''}:${row.entry?.name}:${row.entry?.points}:${row.entry?.wins || 0}:${row.entry?.losses || 0}:${row.isMe ? 1 : 0}`)
    .join('|') || '__empty__';

  if (signature === leaderboardLastSignature) return;
  leaderboardLastSignature = signature;

  if (!entries.length) {
    leaderboardList.innerHTML = '<div class="subtle">No leaderboard entries yet.</div>';
    return;
  }

  const getRankBadgeHtml = (rank) => {
    if (rank >= 1 && rank <= 3) {
      const status = leaderboardRankIconStatus[rank];
      if (status === 'failed') {
        return `
          <div class="rankBadge rankDefault" aria-label="Rank ${rank}">
            <span class="rankFallback">${rank}</span>
          </div>
        `;
      }

      return `
        <div class="rankBadge rankIconBadge rankIconBadge--${rank}" aria-label="Rank ${rank}">
          <img
            class="rankIcon"
            src="${LEADERBOARD_RANK_ICON_PATHS[rank]}"
            alt="Rank ${rank} icon"
            data-rank-icon="${rank}"
            decoding="async"
            draggable="false"
          />
          <span class="rankFallback">${rank}</span>
        </div>
      `;
    }

    return `
      <div class="rankBadge rankDefault" aria-label="Rank ${rank}">
        <span class="rankFallback">${rank}</span>
      </div>
    `;
  };

  leaderboardList.innerHTML = visibleRows.map((row) => {
    const rowClass = [
      'aaaLbRow',
      row.rank === 1 ? 'aaaLbRow--top1' : '',
      row.isMe ? 'aaaLbRow--me' : '',
    ].filter(Boolean).join(' ');
    const entry = row.entry || {};
    return `
      <div class="${rowClass}">
        ${getRankBadgeHtml(row.rank)}
        <div class="lbMeta">
          <div class="lbName">${escapeHtml(entry.name)}${row.isMe ? ' <span class="lbYouTag">YOU</span>' : ''}</div>
          <div class="lbPoints">${Number(entry.points) || 0} pts</div>
          <div class="lbRecord">${Number(entry.wins) || 0}W â€¢ ${Number(entry.losses) || 0}L</div>
        </div>
      </div>
    `;
  }).join('');

  leaderboardList.querySelectorAll('.rankIcon').forEach((img) => {
    if (img.dataset.bound === '1') return;
    img.dataset.bound = '1';
    const applyFallback = () => {
      const rank = Number(img.dataset.rankIcon);
      if (rank >= 1 && rank <= 3) {
        leaderboardRankIconStatus[rank] = 'failed';
      }
      const badge = img.closest('.rankIconBadge');
      if (badge) badge.classList.add('rankIconFailed');
    };
    img.addEventListener('error', applyFallback);
    if (img.complete && img.naturalWidth === 0) {
      applyFallback();
    }
  });
}

// â”€â”€ Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CHARACTER_RARITY_PRIORITY = Object.freeze({
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
});

const CHARACTER_RARITY_LABELS = Object.freeze({
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
});

let selectedStoreCharacterId = '';

function normalizeCharacterRarity(rarity) {
  const key = String(rarity || '').trim().toLowerCase();
  return CHARACTER_RARITY_LABELS[key] ? key : 'common';
}

function getCharacterRarityLabel(rarity) {
  return CHARACTER_RARITY_LABELS[normalizeCharacterRarity(rarity)];
}

function getCharacterRarityClass(rarity) {
  return `storeRarity-${normalizeCharacterRarity(rarity)}`;
}

function getCharacterStoreItems() {
  if (!Array.isArray(storeItems)) return [];
  return storeItems
    .filter((item) => item && item.type === 'character')
    .slice()
    .sort((a, b) => {
      const rarityDiff =
        (CHARACTER_RARITY_PRIORITY[normalizeCharacterRarity(a.rarity)] ?? 0)
        - (CHARACTER_RARITY_PRIORITY[normalizeCharacterRarity(b.rarity)] ?? 0);
      if (rarityDiff !== 0) return rarityDiff;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
}

function getCharacterStoreItemById(id) {
  const targetId = String(id || '').trim();
  if (!targetId) return null;
  return storeItems.find((item) => item && item.type === 'character' && item.id === targetId) || null;
}

function resolveCharacterPreviewPath(item) {
  const previewPath = Array.isArray(item?.previewImages)
    ? item.previewImages.find((path) => typeof path === 'string' && path.trim())
    : '';
  const thumbnailPath = String(item?.thumbnail || '').trim();
  return String(previewPath || thumbnailPath || '/docs/art/character/zarok/zarok.png').trim();
}

function ensureEquippedCharacterId(characters) {
  if (!Array.isArray(characters) || !characters.length) return '';

  const equippedId = String(profile?.equipped?.character || '').trim();
  const equippedValid = !!(
    equippedId &&
    profile.store[equippedId] &&
    characters.some((item) => item.id === equippedId)
  );
  if (equippedValid) return equippedId;

  const firstOwned = characters.find((item) => profile.store[item.id]);
  const fallbackId = firstOwned ? firstOwned.id : String(characters[0].id || '');
  profile.equipped.character = fallbackId;
  return fallbackId;
}

function ensureSelectedStoreCharacterId(characters) {
  if (!Array.isArray(characters) || !characters.length) return '';

  if (selectedStoreCharacterId && characters.some((item) => item.id === selectedStoreCharacterId)) {
    return selectedStoreCharacterId;
  }

  const equippedId = ensureEquippedCharacterId(characters);
  if (equippedId && characters.some((item) => item.id === equippedId)) {
    selectedStoreCharacterId = equippedId;
    return selectedStoreCharacterId;
  }

  selectedStoreCharacterId = String(characters[0].id || '');
  return selectedStoreCharacterId;
}

function equipCharacterSkin(id) {
  const character = getCharacterStoreItemById(id);
  if (!character || !profile.store[character.id]) return;

  profile.equipped.character = character.id;
  selectedStoreCharacterId = character.id;
  saveProfile();
  renderStore();
  renderInventory();
  drawLobbyPreview();
  updateHud();
}

function unlockCharacterSkin(id) {
  const character = getCharacterStoreItemById(id);
  if (!character || profile.store[character.id]) return;

  const cost = Math.max(0, Number(character.cost) || 0);
  const currentBalance = Math.max(0, Math.floor(Number(profile.wlk) || 0));
  if (currentBalance < cost) return;

  profile.wlk = currentBalance - cost;
  if (typeof character.apply === 'function') {
    character.apply(profile);
  } else {
    profile.store[character.id] = true;
  }

  if (!profile.store[profile.equipped.character]) {
    profile.equipped.character = character.id;
  }
  selectedStoreCharacterId = character.id;

  saveProfile();
  renderStore();
  renderInventory();
  drawLobbyPreview();
  updateHud();
}

function renderInventory() {
  if (!inventoryList) return;

  const characters = getCharacterStoreItems();
  const equippedCharacterId = ensureEquippedCharacterId(characters);
  const ownedCharacters = characters.filter((item) => !!profile.store[item.id]);
  const slotCount = Math.max(8, ownedCharacters.length);
  const renderSignature = [
    equippedCharacterId,
    slotCount,
    ownedCharacters.map((item) => `${item.id}:${normalizeCharacterRarity(item.rarity)}`).join(','),
  ].join('|');
  if (renderSignature === inventoryLastSignature) return;
  inventoryLastSignature = renderSignature;

  if (!ownedCharacters.length) {
    inventoryList.innerHTML = `
      <div class="inventoryGridWrap">
        <div class="inventoryGridHead">
          <span class="inventoryGridLabel">Skins</span>
          <span class="inventoryGridCount">0/0</span>
        </div>
        <div class="hint">No skins unlocked yet.</div>
      </div>
    `;
    return;
  }

  const slots = [];
  for (let i = 0; i < slotCount; i += 1) {
    const item = ownedCharacters[i];
    if (!item) {
      slots.push('<div class="inventorySlot inventorySlotEmpty" aria-hidden="true"></div>');
      continue;
    }

    const equipped = item.id === equippedCharacterId;
    const rarityLabel = getCharacterRarityLabel(item.rarity);
    const actionAttr = equipped ? '' : `data-inv-character-equip="${escapeHtml(item.id)}"`;
    slots.push(
      `<button class="inventorySlot${equipped ? ' equipped' : ''}" data-slot-type="character" type="button" ${actionAttr} ${equipped ? 'disabled' : ''}>
        <span class="inventorySlotEmblem ${getCharacterRarityClass(item.rarity)}" aria-hidden="true">${escapeHtml(rarityLabel.charAt(0))}</span>
        <span class="inventorySlotMeta">
          <span class="inventorySlotTag">${escapeHtml(rarityLabel)}</span>
          <span class="inventorySlotName">${escapeHtml(item.name)}</span>
        </span>
        ${equipped ? '<span class="inventorySlotEquipped">EQ</span>' : ''}
      </button>`
    );
  }

  inventoryList.innerHTML = `
    <div class="inventoryGridWrap">
      <div class="inventoryGridHead">
        <span class="inventoryGridLabel">Skins</span>
        <span class="inventoryGridCount">${ownedCharacters.length}/${slotCount}</span>
      </div>
      <div class="inventoryGrid">${slots.join('')}</div>
    </div>
  `;

  inventoryList.querySelectorAll('[data-inv-character-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof soundClick === 'function') soundClick();
      equipCharacterSkin(btn.getAttribute('data-inv-character-equip'));
    });
  });
}

// â”€â”€ Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderStore() {
  if (!storeList) return;

  const currencyIconPath = escapeHtml(
    window.OUTRA_VISUAL_CONFIG?.lobbyArt?.currency || 'docs/art/Lobby/Currency.png'
  );
  const currentBalance = Math.max(0, Math.floor(Number(profile.wlk) || 0));

  if (wlkLobbyEl) {
    wlkLobbyEl.innerHTML = `
      <img src="${currencyIconPath}" alt="" class="currencyIcon storeCurrencyIcon" />
      <span class="storeCurrencyValue" data-out-balance>${currentBalance}</span>
    `;
  }
  if (wlkLobbyTopEl) wlkLobbyTopEl.textContent = String(currentBalance);

  const characters = getCharacterStoreItems();
  if (!characters.length) {
    if (storeLastSignature === '__empty__') return;
    storeLastSignature = '__empty__';
    storeList.innerHTML = '<div class="hint">Character skins will appear here.</div>';
    return;
  }

  const selectedId = ensureSelectedStoreCharacterId(characters);
  const selectedCharacter = characters.find((item) => item.id === selectedId) || characters[0];
  const selectedOwned = !!profile.store[selectedCharacter.id];
  const selectedEquipped = String(profile?.equipped?.character || '') === selectedCharacter.id;
  const selectedCost = Math.max(0, Number(selectedCharacter.cost) || 0);
  const canBuySelected = !selectedOwned && currentBalance >= selectedCost;
  const selectedRarityLabel = getCharacterRarityLabel(selectedCharacter.rarity);
  const selectedRarityClass = getCharacterRarityClass(selectedCharacter.rarity);
  const selectedPreviewSrc = escapeHtml(resolveCharacterPreviewPath(selectedCharacter));
  const renderSignature = [
    currentBalance,
    selectedId,
    String(profile?.equipped?.character || ''),
    characters.map((item) => `${item.id}:${profile.store[item.id] ? 1 : 0}`).join(','),
  ].join('|');
  if (renderSignature === storeLastSignature) return;
  storeLastSignature = renderSignature;

  let actionHtml = '';
  if (!selectedOwned) {
    const shortfall = Math.max(0, selectedCost - currentBalance);
    actionHtml = `
      <button
        class="secondary storeCharacterActionBtn"
        type="button"
        data-store-character-buy="${escapeHtml(selectedCharacter.id)}"
        ${canBuySelected ? '' : 'disabled'}
      >${canBuySelected ? 'Unlock Skin' : `Need ${shortfall} more OUT`}</button>
    `;
  } else if (!selectedEquipped) {
    actionHtml = `
      <button
        class="secondary storeCharacterActionBtn"
        type="button"
        data-store-character-equip="${escapeHtml(selectedCharacter.id)}"
      >Equip Skin</button>
    `;
  } else {
    actionHtml = `
      <button class="secondary storeCharacterActionBtn" type="button" disabled>Equipped</button>
    `;
  }

  storeList.innerHTML = `
    <div class="storeCharacterLayout">
      <div class="storeCharacterRail" aria-label="Character list">
        ${characters.map((item) => {
    const selected = item.id === selectedCharacter.id;
    const owned = !!profile.store[item.id];
    const equipped = String(profile?.equipped?.character || '') === item.id;
    const rarityLabel = getCharacterRarityLabel(item.rarity);
    const rarityClass = getCharacterRarityClass(item.rarity);
    const thumbSrc = escapeHtml(String(item.thumbnail || resolveCharacterPreviewPath(item)));
    const stateLabel = equipped ? 'Equipped' : (owned ? 'Owned' : 'Locked');
    return `
            <button
              class="storeCharacterEntry${selected ? ' is-selected' : ''}"
              type="button"
              data-character-select="${escapeHtml(item.id)}"
              aria-pressed="${selected ? 'true' : 'false'}"
            >
              <span class="storeCharacterThumbWrap">
                <img
                  class="storeCharacterThumb"
                  src="${thumbSrc}"
                  alt="${escapeHtml(item.name)} thumbnail"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                />
              </span>
              <span class="storeCharacterEntryCopy">
                <span class="storeCharacterNameLine">
                  <span class="storeCharacterName">${escapeHtml(item.name)}</span>
                  <span class="storeCharacterRarityTag ${rarityClass}">${escapeHtml(rarityLabel)}</span>
                </span>
                <span class="storeCharacterSummary">${escapeHtml(item.description)}</span>
                <span class="storeCharacterState">${escapeHtml(stateLabel)}</span>
              </span>
            </button>
          `;
  }).join('')}
      </div>

      <section class="storeCharacterPreviewPanel" aria-live="polite">
        <div class="storeCharacterPreviewFrame">
          <img
            class="storeCharacterPreviewImage"
            src="${selectedPreviewSrc}"
            alt="${escapeHtml(selectedCharacter.name)} preview"
            decoding="async"
            draggable="false"
          />
        </div>
        <div class="storeCharacterPreviewBody">
          <div class="storeCharacterPreviewTop">
            <div class="storeCharacterPreviewName">${escapeHtml(selectedCharacter.name)}</div>
            <span class="storeCharacterRarityTag ${selectedRarityClass}">${escapeHtml(selectedRarityLabel)}</span>
          </div>
          <p class="storeCharacterPreviewDescription">${escapeHtml(selectedCharacter.description)}</p>

          <div class="storeCharacterPreviewMeta">
            <span class="storePriceTag">
              <img src="${currencyIconPath}" alt="" class="storePriceIcon" />
              <span>${selectedCost}</span>
            </span>
            <span class="storeCharacterOwnership ${selectedOwned ? 'is-owned' : 'is-locked'}">
              ${selectedEquipped ? 'Currently equipped' : (selectedOwned ? 'Unlocked' : 'Locked')}
            </span>
          </div>

          <div class="storeCharacterActionRow">
            ${actionHtml}
          </div>
        </div>
      </section>
    </div>
  `;

  storeList.querySelectorAll('[data-character-select]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = String(btn.getAttribute('data-character-select') || '').trim();
      if (!targetId || targetId === selectedStoreCharacterId) return;
      if (typeof soundClick === 'function') soundClick();
      selectedStoreCharacterId = targetId;
      renderStore();
    });
  });

  const buyBtn = storeList.querySelector('[data-store-character-buy]');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      if (typeof soundClick === 'function') soundClick();
      unlockCharacterSkin(buyBtn.getAttribute('data-store-character-buy'));
    });
  }

  const equipBtn = storeList.querySelector('[data-store-character-equip]');
  if (equipBtn) {
    equipBtn.addEventListener('click', () => {
      if (typeof soundClick === 'function') soundClick();
      equipCharacterSkin(equipBtn.getAttribute('data-store-character-equip'));
    });
  }
}

// â”€â”€ Spell Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function applySpellIconsDesktop() {
  Object.entries(SPELL_ICONS).forEach(([key, path]) => {
    const cell = document.getElementById(`dspell-${key}`);
    if (!cell) return;

    let img = cell.querySelector('img.spellIcon');
    if (!img) {
      img = document.createElement('img');
      img.className = 'spellIcon';
      img.decoding = 'async';
      img.loading = 'eager';
      img.alt = '';
      img.style.position = 'absolute';
      img.style.inset = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '16px';
      img.style.pointerEvents = 'none';
      img.style.zIndex = '0';
      cell.appendChild(img);
    }

    const nextPath = String(path || '').trim();
    if (!nextPath) return;
    if (img.dataset.spellIconSrc !== nextPath) {
      img.dataset.spellIconSrc = nextPath;
      img.src = nextPath;
    }
  });

  bindDesktopSpellTooltips();
}

// â”€â”€ HUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function triggerReadyFlash(el) {
  if (!el) return;
  el.classList.remove('readyFlash');
  void el.offsetWidth;
  el.classList.add('readyFlash');
}

function syncArenaSpellCooldownSlot(cooldownEl, cooldownSeconds) {
  const slotEl = cooldownEl?.closest?.('.arenaSpellSlot') || null;
  if (!slotEl || !cooldownEl) return;

  const cd = Math.max(0, Number(cooldownSeconds) || 0);
  const wasOnCooldown = slotEl.classList.contains('onCooldown');

  if (cd > 0.02) {
    slotEl.classList.add('onCooldown');
    cooldownEl.textContent = String(Math.ceil(cd));
    slotEl.dataset.readyFlashed = '0';
    return;
  }

  slotEl.classList.remove('onCooldown');
  cooldownEl.textContent = '';

  if (wasOnCooldown && slotEl.dataset.readyFlashed !== '1') {
    triggerReadyFlash(slotEl);
    slotEl.dataset.readyFlashed = '1';
  }
}

function syncArenaFireSpellCooldowns(leftCooldownSeconds, rightCooldownSeconds) {
  syncArenaSpellCooldownSlot(arenaLeftFireSpellCooldownEl, leftCooldownSeconds);
  syncArenaSpellCooldownSlot(arenaRightFireSpellCooldownEl, rightCooldownSeconds);
}

function updateSkillCooldownButtons(multiplayerSnapshot = null) {
  const snapshot = multiplayerSnapshot || getMultiplayerPresentationSnapshot();
  const multiplayerArena = snapshot?.isArenaActive ? snapshot.arena : null;
  const now = performance.now() / 1000;
  const cooldowns = {};
  const effectiveLoadout = Array.isArray(multiplayerArena?.loadout) && multiplayerArena.loadout.length
    ? multiplayerArena.loadout
    : activeSpellLoadout;
  const availableSpells = new Set(effectiveLoadout);

  Object.keys(skillButtons).forEach((spellId) => {
    const isAvailable = spellId === 'fire' || availableSpells.has(spellId);
    const desktopCell = document.getElementById(`dspell-${spellId}`);
    const mobileBtn = skillButtons[spellId];

    if (desktopCell) {
      desktopCell.classList.toggle('spellDisabled', !isAvailable);
    }

    if (mobileBtn) {
      mobileBtn.classList.toggle('spellDisabled', !isAvailable);
      mobileBtn.disabled = !isAvailable;
    }
  });

  effectiveLoadout.forEach((spellId) => {
    const def = SPELL_DEFS[spellId];
    if (!def) return;
    if (multiplayerArena) {
      let cooldownValue = Math.max(0, Number(multiplayerArena.cooldownSecondsBySpell?.[spellId]) || 0);
      if (spellId === 'shield' && multiplayerArena.shieldActive) {
        cooldownValue = Math.max(
          cooldownValue,
          Math.max(0, Number(multiplayerArena.shieldRemainingSeconds) || 0)
        );
      }
      cooldowns[spellId] = cooldownValue;
      return;
    }

    if (spellId === 'shield' && now < player.shieldUntil) {
      cooldowns[spellId] = player.shieldUntil - now;
    } else {
      cooldowns[spellId] = Math.max(0, (player[def.cooldownKey] || 0) - now);
    }
  });

  Object.entries(skillButtons).forEach(([key, btn]) => {
    if (!btn) return;

    const cdOverlay = btn.querySelector('.mobileBtnCooldown');
    if (!cdOverlay) return;

    const cd = cooldowns[key] || 0;
    const wasOnCooldown = btn.classList.contains('onCooldown');

    if (cd > 0.02) {
      btn.classList.add('onCooldown');
      cdOverlay.textContent = String(Math.ceil(cd));
      btn.dataset.readyFlashed = '0';
    } else {
      btn.classList.remove('onCooldown');
      cdOverlay.textContent = '';

      if (wasOnCooldown && btn.dataset.readyFlashed !== '1') {
        triggerReadyFlash(btn);
        btn.dataset.readyFlashed = '1';
      }
    }
  });

  Object.entries(cooldowns).forEach(([key, cd]) => {
    const cell = document.getElementById(`dspell-${key}`);
    const cdEl = document.getElementById(`dcd-${key}`);
    if (!cell || !cdEl) return;

    const wasOnCooldown = cell.classList.contains('onCooldown');

    if (cd > 0.02) {
      cell.classList.add('onCooldown');
      cdEl.textContent = String(Math.ceil(cd));
      cell.dataset.readyFlashed = '0';
    } else {
      cell.classList.remove('onCooldown');
      cdEl.textContent = '';

      if (wasOnCooldown && cell.dataset.readyFlashed !== '1') {
        triggerReadyFlash(cell);
        cell.dataset.readyFlashed = '1';
      }
    }
  });

  const localFireCooldown = cooldowns.fire || 0;
  const opponentFireCooldown = multiplayerArena
    ? Math.max(0, Number(multiplayerArena.opponentCooldownSecondsBySpell?.fire) || 0)
    : Math.max(0, (Number(dummy?.fireReadyAt) || 0) - now);
  syncArenaFireSpellCooldowns(localFireCooldown, opponentFireCooldown);

  const keyMap = {
    hook: 'dkey-hook',
    blink: 'dkey-blink',
    shield: 'dkey-shield',
    prism: 'dkey-prism',
    charge: 'dkey-charge',
    shock: 'dkey-shock',
    gust: 'dkey-gust',
    solar: 'dkey-solar',
    rift: 'dkey-rift',
    phantom: 'dkey-phantom',
    wall: 'dkey-wall',
    rewind: 'dkey-rewind'
  };

  const bindMap = {
    hook: keybinds.hook,
    blink: keybinds.teleport,
    shield: keybinds.shield,
    prism: keybinds.prism,
    charge: keybinds.charge,
    shock: keybinds.shock,
    gust: keybinds.gust,
    solar: keybinds.solar,
    rift: keybinds.rift,
    phantom: keybinds.phantom,
    wall: keybinds.wall,
    rewind: keybinds.rewind
  };

  if (multiplayerArena) {
    const draftedSpells = effectiveLoadout.filter((spellId) => spellId !== 'fire').slice(0, 3);
    const keyBySpell = {
      [draftedSpells[0]]: 'Q',
      [draftedSpells[1]]: 'E',
      [draftedSpells[2]]: 'R'
    };
    Object.entries(keyMap).forEach(([skill, elId]) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const mappedKey = keyBySpell[skill] || 'â€”';
      el.textContent = mappedKey;
    });
    const fireKeyEl = document.querySelector('#dspell-fire .deskSpellKey');
    if (fireKeyEl) fireKeyEl.textContent = 'M1';
    setArenaConceptHudText(arenaLeftFireSpellKeyEl, 'M1');
    setArenaConceptHudText(arenaRightFireSpellKeyEl, 'M1');
  } else {
    Object.entries(keyMap).forEach(([skill, elId]) => {
      const el = document.getElementById(elId);
      if (el) el.textContent = prettyKey(bindMap[skill]);
    });
    const fireKeyEl = document.querySelector('#dspell-fire .deskSpellKey');
    const fireKeyText = prettyKey(keybinds.fire);
    if (fireKeyEl) fireKeyEl.textContent = fireKeyText;
    setArenaConceptHudText(arenaLeftFireSpellKeyEl, fireKeyText);
    setArenaConceptHudText(arenaRightFireSpellKeyEl, fireKeyText);
  }
}

const desktopSpellBarHome = {
  parent: null,
  nextSibling: null,
};

function shouldDockDesktopSpellBarInArenaCard() {
  if (typeof window === 'undefined') return true;
  if (typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(min-width: 981px)').matches;
}

function setArenaSpellBarDocked(spellBar, shouldDock) {
  if (!spellBar) return false;

  const mount = arenaSpellBarMountEl || document.getElementById('arenaSpellBarMount');
  if (!desktopSpellBarHome.parent && spellBar.parentNode) {
    desktopSpellBarHome.parent = spellBar.parentNode;
    desktopSpellBarHome.nextSibling = spellBar.nextSibling;
  }

  const canDock = !!shouldDock && !!mount;
  if (canDock) {
    if (spellBar.parentNode !== mount) {
      mount.appendChild(spellBar);
    }
  } else if (desktopSpellBarHome.parent && spellBar.parentNode !== desktopSpellBarHome.parent) {
    if (
      desktopSpellBarHome.nextSibling
      && desktopSpellBarHome.nextSibling.parentNode === desktopSpellBarHome.parent
    ) {
      desktopSpellBarHome.parent.insertBefore(spellBar, desktopSpellBarHome.nextSibling);
    } else {
      desktopSpellBarHome.parent.appendChild(spellBar);
    }
  }

  const isDocked = canDock && spellBar.parentNode === mount;
  spellBar.classList.toggle('arenaProfileSpellBar', isDocked);
  if (document?.body) {
    document.body.classList.toggle('arenaSpellBarDocked', isDocked);
  }
  return isDocked;
}

function syncArenaSpellBarLayout(multiplayerSnapshot = null) {
  const spellBar = document.getElementById('desktopSpellBar');
  if (!spellBar) return;

  const snapshot = multiplayerSnapshot || getMultiplayerPresentationSnapshot();
  const inArenaPhase = gameState === 'playing'
    || gameState === 'result'
    || !!snapshot?.isArenaActive;
  const shouldShowSpellBar = inArenaPhase && !isTouchDevice;
  const isDocked = setArenaSpellBarDocked(
    spellBar,
    shouldShowSpellBar && shouldDockDesktopSpellBarInArenaCard()
  );
  spellBar.style.display = shouldShowSpellBar ? (isDocked ? 'grid' : 'flex') : 'none';

  const effectiveLoadout = Array.isArray(snapshot?.arena?.loadout) && snapshot.arena.loadout.length
    ? snapshot.arena.loadout
    : activeSpellLoadout;
  const isDraftLoadout = Array.isArray(effectiveLoadout)
    && effectiveLoadout.includes('fire')
    && effectiveLoadout.length <= 4;
  const shouldUseCompactLoadout = isDraftLoadout || isDocked;
  const visibleDraftSpells = new Set(
    shouldUseCompactLoadout
      ? effectiveLoadout.filter((spellId) => spellId !== 'fire').slice(0, 3)
      : []
  );

  const desktopSpellOrder = ['fire', 'hook', 'blink', 'shield', 'prism', 'charge', 'shock', 'gust', 'solar', 'rift', 'phantom', 'wall', 'rewind'];
  for (const spellId of desktopSpellOrder) {
    const cell = document.getElementById(`dspell-${spellId}`);
    if (!cell) continue;

    if (!inArenaPhase) {
      cell.style.display = '';
      continue;
    }

    if (!shouldUseCompactLoadout) {
      cell.style.display = '';
      continue;
    }

    const shouldShow = isDocked
      ? visibleDraftSpells.has(spellId)
      : (spellId === 'fire' || visibleDraftSpells.has(spellId));
    cell.style.display = shouldShow ? '' : 'none';
  }

  spellBar.classList.toggle('draftSpellBarOnlyPicks', inArenaPhase && shouldUseCompactLoadout);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    syncArenaSpellBarLayout();
  }, { passive: true });
}

function updateGodModeMenuState() {
  const devButtons = [
    standingDummyBtn,
    activeDummyBtn,
    removeDummyBtn,
    toArenaBtn,
    draftRoomBtn,
  ];
  for (const button of devButtons) {
    if (!button) continue;
    button.hidden = !godModeEnabled;
  }

  if (godModeBtn) {
    const labelEl = godModeBtn.querySelector('.menuBtnLabel');
    if (labelEl) {
      labelEl.textContent = godModeEnabled ? 'GOD MODE: ON' : 'GOD MODE';
    } else {
      godModeBtn.textContent = godModeEnabled ? 'GOD MODE: ON' : 'GOD MODE';
    }
  }
}

function updateLeaveGameMenuState(multiplayerSnapshot = null) {
  const snapshot = multiplayerSnapshot || getMultiplayerPresentationSnapshot();
  const inMultiplayerMatchFlow = !!snapshot?.active
    && (
      snapshot.isDraftActive
      || snapshot.isArenaActive
      || snapshot.isArenaPending
      || snapshot.isMatchEnd
    );
  if (leaveGameBtn) {
    leaveGameBtn.hidden = !inMultiplayerMatchFlow;
  }
  if (toLobbyBtn) {
    toLobbyBtn.hidden = inMultiplayerMatchFlow;
  }
}

function setArenaConceptHudText(el, value) {
  if (!el) return;
  const next = String(value ?? '');
  if (el.textContent !== next) {
    el.textContent = next;
  }
}

function normalizeArenaConceptSpellList(loadout) {
  if (!Array.isArray(loadout)) return [];
  const normalized = [];
  const seen = new Set();
  loadout.forEach((entry) => {
    const mapped = toUiSpellFromMultiplayer(entry);
    const spellId = String(mapped || '').trim().toLowerCase();
    if (!spellId || spellId === 'fire' || seen.has(spellId)) return;
    seen.add(spellId);
    normalized.push(spellId);
  });
  return normalized.slice(0, 3);
}

function completeArenaConceptSpellList(spells) {
  const output = Array.isArray(spells) ? [...spells] : [];
  for (const fallbackSpellId of ARENA_CONCEPT_FALLBACK_SPELLS) {
    if (output.length >= 3) break;
    if (!output.includes(fallbackSpellId)) output.push(fallbackSpellId);
  }
  while (output.length < 3) output.push('');
  return output.slice(0, 3);
}

function getArenaConceptLocalRankData() {
  const rankedSnapshot = typeof getRankedSnapshot === 'function' ? getRankedSnapshot() : null;
  const tier = rankedSnapshot?.tier || null;
  const rankNumber = Number(tier?.rankNumber);
  const rankLabel = Number.isFinite(rankNumber) ? `RANK ${rankNumber}` : 'RANK ?';
  const rankTitle = tier ? getRankLabelFromTier(tier) : 'Unranked';
  return { rankLabel, rankTitle };
}

function renderArenaConceptScoreMarkers(container, earned, total) {
  if (!container) return;
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeEarned = Math.max(0, Math.min(safeTotal, Number(earned) || 0));
  const key = `${safeEarned}/${safeTotal}`;
  if (container.dataset.markerKey === key) return;
  container.dataset.markerKey = key;
  container.replaceChildren();
  for (let i = 0; i < safeTotal; i += 1) {
    const marker = document.createElement('span');
    marker.className = 'arenaScoreMarker';
    if (i < safeEarned) marker.classList.add('is-earned');
    container.appendChild(marker);
  }
}

function updateArenaConceptSpellSlots(iconEls, fallbackEls, spellIds) {
  const icons = Array.isArray(iconEls) ? iconEls : [];
  const fallbacks = Array.isArray(fallbackEls) ? fallbackEls : [];
  const spells = Array.isArray(spellIds) ? spellIds : [];
  const slotCount = Math.max(3, icons.length, fallbacks.length, spells.length);
  for (let i = 0; i < slotCount; i += 1) {
    const iconEl = icons[i] || null;
    const fallbackEl = fallbacks[i] || null;
    const slotEl = iconEl?.closest?.('.arenaSpellSlot') || fallbackEl?.closest?.('.arenaSpellSlot') || null;
    const spellId = String(spells[i] || '').trim().toLowerCase();
    const spellDef = spellId ? SPELL_DEFS?.[spellId] : null;
    const spellLabel = spellId === 'fire'
      ? 'Fireball'
      : (spellDef?.name || (spellId ? spellId.toUpperCase() : 'Empty'));
    const iconPath = spellId ? String(SPELL_ICONS?.[spellId] || '').trim() : '';
    const fallbackToken = spellId
      ? String(spellDef?.icon || spellLabel.slice(0, 2)).toUpperCase()
      : '--';

    if (fallbackEl) {
      setArenaConceptHudText(fallbackEl, fallbackToken);
    }

    if (iconEl) {
      if (iconPath) {
        if (iconEl.dataset.spellIconSrc !== iconPath) {
          iconEl.dataset.spellIconSrc = iconPath;
          iconEl.src = iconPath;
        }
        if (iconEl.alt !== spellLabel) iconEl.alt = spellLabel;
      } else {
        if (iconEl.dataset.spellIconSrc !== '') {
          iconEl.dataset.spellIconSrc = '';
          iconEl.removeAttribute('src');
        }
        if (iconEl.alt !== '') iconEl.alt = '';
      }
    }

    if (slotEl) {
      slotEl.classList.toggle('has-icon', !!iconPath);
      if (spellId) {
        slotEl.dataset.spellId = spellId;
        slotEl.setAttribute('aria-label', spellLabel);
        slotEl.title = spellLabel;
      } else {
        delete slotEl.dataset.spellId;
        slotEl.setAttribute('aria-label', 'Empty');
        slotEl.removeAttribute('title');
      }
    }
  }
}

function formatArenaConceptClock(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function setArenaConceptHp(fillEl, textEl, currentHp, maxHp) {
  const safeMax = Math.max(1, Number(maxHp) || 1);
  const safeCurrent = Math.max(0, Math.min(safeMax, Number(currentHp) || 0));
  setArenaConceptHudText(textEl, `${Math.ceil(safeCurrent)} / ${Math.ceil(safeMax)}`);
  if (fillEl) {
    const pct = Math.max(0, Math.min(100, (safeCurrent / safeMax) * 100));
    const widthText = `${pct.toFixed(1)}%`;
    if (fillEl.style.width !== widthText) {
      fillEl.style.width = widthText;
    }
  }
}

function updateArenaConceptHud(multiplayerSnapshot, inArenaPhase) {
  if (!arenaMatchHudEl) {
    if (document?.body) document.body.classList.remove('arenaConceptHudActive');
    return;
  }

  const shouldShow = ARENA_CONCEPT_HUD_ENABLED && inArenaPhase;
  arenaMatchHudEl.classList.toggle('show', shouldShow);
  arenaMatchHudEl.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  if (document?.body) {
    document.body.classList.toggle('arenaConceptHudActive', shouldShow);
  }
  if (!shouldShow) return;

  const multiplayerRuntime = typeof getMultiplayerArenaRuntimeSnapshot === 'function'
    ? getMultiplayerArenaRuntimeSnapshot()
    : null;
  const multiplayerFlowActive = !!multiplayerSnapshot?.active && (
    !!multiplayerSnapshot?.isArenaActive
    || !!multiplayerSnapshot?.isArenaPending
    || !!multiplayerSnapshot?.isRoundEnd
    || !!multiplayerSnapshot?.isMatchEnd
    || !!multiplayerSnapshot?.isCountdownActive
  );
  const multiplayerArenaActive = !!multiplayerSnapshot?.active && !!multiplayerSnapshot?.isArenaActive;

  const localNameRaw = String(window.playerProfile?.display_name || player?.name || 'Player').trim() || 'Player';
  const fallbackOpponentName = !multiplayerFlowActive
    ? (dummyEnabled ? (dummyBehavior === 'standing' ? 'Standing Dummy' : 'Practice Dummy') : 'No Dummy')
    : 'Opponent';
  const opponentNameRaw = String(dummy?.name || fallbackOpponentName).trim() || fallbackOpponentName;

  let leftScore = Math.max(0, Number(player?.score) || 0);
  let rightScore = 0;
  let roundsNeeded = 2;
  let scoreMetaTop = 'SOLO';
  let scoreRound = gameState === 'result'
    ? 'RESULT'
    : (arena.shrinkEnabled === false ? 'Practice\nStable' : 'Practice');
  let scoreTimer = arena.shrinkEnabled === false
    ? ''
    : formatArenaConceptClock(Math.ceil(Math.max(0, Number(arena.shrinkTimer) || 0)));

  if (multiplayerFlowActive) {
    const bo3 = multiplayerSnapshot?.bo3 && typeof multiplayerSnapshot.bo3 === 'object'
      ? multiplayerSnapshot.bo3
      : {};
    const winsMap = bo3.roundWinsByPlayerNumber && typeof bo3.roundWinsByPlayerNumber === 'object'
      ? bo3.roundWinsByPlayerNumber
      : {};
    const myNumber = Number(multiplayerRuntime?.myPlayerNumber);
    const opponentNumber = Number(multiplayerRuntime?.opponentPlayerNumber);
    const fallbackWinsLeft = Math.max(0, Number(winsMap?.[1]) || 0);
    const fallbackWinsRight = Math.max(0, Number(winsMap?.[2]) || 0);
    leftScore = Number.isFinite(myNumber) ? Math.max(0, Number(winsMap?.[myNumber]) || 0) : fallbackWinsLeft;
    rightScore = Number.isFinite(opponentNumber) ? Math.max(0, Number(winsMap?.[opponentNumber]) || 0) : fallbackWinsRight;
    roundsNeeded = Math.max(1, Number(bo3.roundsNeededToWin) || 2);
    const roundNumber = Math.max(1, Number(bo3.roundNumber) || 1);
    scoreMetaTop = String(bo3.matchFormat || 'bo3').toUpperCase();
    scoreRound = `ROUND ${roundNumber}`;

    if (multiplayerSnapshot?.isMatchEnd) {
      scoreTimer = 'MATCH END';
    } else if (multiplayerSnapshot?.isRoundEnd) {
      const intermissionSec = Math.ceil(
        Math.max(0, Number(bo3.roundIntermissionRemainingMs) || 0) / 1000
      );
      scoreTimer = intermissionSec > 0 ? `NEXT ${intermissionSec}s` : 'ROUND END';
    } else if (multiplayerSnapshot?.isCountdownActive) {
      scoreTimer = 'READY';
    } else {
      scoreTimer = 'COMBAT';
    }
  }

  const localRank = getArenaConceptLocalRankData();
  const opponentRankLabel = multiplayerFlowActive ? 'RANK ?' : 'RANK BOT';
  const opponentRankTitle = multiplayerFlowActive
    ? 'Challenger'
    : (dummyEnabled ? 'Practice Dummy' : 'Inactive');

  const localSpellSource = multiplayerFlowActive
    ? (Array.isArray(multiplayerSnapshot?.arena?.loadout) ? multiplayerSnapshot.arena.loadout : activeSpellLoadout)
    : activeSpellLoadout;
  const localSpells = completeArenaConceptSpellList(normalizeArenaConceptSpellList(localSpellSource));

  let opponentSpells = [];
  if (multiplayerFlowActive) {
    const localDraftPlayerId = multiplayerSnapshot?.draft?.localPlayerId === 'B' ? 'B' : 'A';
    const opponentDraftPlayerId = localDraftPlayerId === 'A' ? 'B' : 'A';
    opponentSpells = normalizeArenaConceptSpellList(multiplayerSnapshot?.draft?.picks?.[opponentDraftPlayerId]);
  } else {
    opponentSpells = normalizeArenaConceptSpellList(activeSpellLoadout);
  }
  if (!opponentSpells.length) {
    opponentSpells = [...localSpells];
  }
  opponentSpells = completeArenaConceptSpellList(opponentSpells);

  const leftHpCurrent = multiplayerArenaActive
    ? Math.max(0, Number(multiplayerSnapshot?.arena?.myHealth) || 0)
    : Math.max(0, Number(player?.hp) || 0);
  const leftHpMax = multiplayerArenaActive
    ? Math.max(1, Number(multiplayerSnapshot?.arena?.myMaxHealth) || 100)
    : Math.max(1, Number(player?.maxHp) || 100);
  const rightHpCurrent = multiplayerArenaActive
    ? Math.max(0, Number(multiplayerSnapshot?.arena?.opponentHealth) || 0)
    : Math.max(0, Number(dummy?.hp) || 0);
  const rightHpMax = multiplayerArenaActive
    ? Math.max(1, Number(multiplayerSnapshot?.arena?.opponentMaxHealth) || 100)
    : Math.max(1, Number(dummy?.maxHp) || 100);

  const localNameDisplay = localNameRaw.toUpperCase();
  const opponentNameDisplay = opponentNameRaw.toUpperCase();
  const localGlyph = (localNameRaw.match(/[A-Za-z0-9]/)?.[0] || 'L').toUpperCase();
  const opponentGlyph = (opponentNameRaw.match(/[A-Za-z0-9]/)?.[0] || 'R').toUpperCase();

  setArenaConceptHudText(arenaScoreMetaTopEl, scoreMetaTop);
  setArenaConceptHudText(arenaScoreRoundEl, scoreRound);
  setArenaConceptHudText(arenaScoreTimerEl, scoreTimer);
  setArenaConceptHudText(arenaScoreLeftNameEl, localNameDisplay);
  setArenaConceptHudText(arenaScoreLeftValueEl, leftScore);
  setArenaConceptHudText(arenaScoreRightNameEl, opponentNameDisplay);
  setArenaConceptHudText(arenaScoreRightValueEl, rightScore);
  renderArenaConceptScoreMarkers(arenaScoreLeftMarkersEl, leftScore, roundsNeeded);
  renderArenaConceptScoreMarkers(arenaScoreRightMarkersEl, rightScore, roundsNeeded);

  setArenaConceptHudText(arenaLeftPortraitGlyphEl, localGlyph);
  setArenaConceptHudText(arenaLeftPanelNameEl, localNameDisplay);
  setArenaConceptHudText(arenaLeftRankLabelEl, localRank.rankLabel);
  setArenaConceptHudText(arenaLeftRankTitleEl, String(localRank.rankTitle || 'Unranked').toUpperCase());
  setArenaConceptHp(arenaLeftHpFillEl, arenaLeftHpTextEl, leftHpCurrent, leftHpMax);
  updateArenaConceptSpellSlots(arenaLeftSpellIconEls, arenaLeftSpellFallbackEls, localSpells);
  updateArenaConceptSpellSlots(
    [arenaLeftFireSpellIconEl],
    [arenaLeftFireSpellFallbackEl],
    ARENA_CONCEPT_STANDARD_SPELLS
  );

  setArenaConceptHudText(arenaRightPortraitGlyphEl, opponentGlyph);
  setArenaConceptHudText(arenaRightPanelNameEl, opponentNameDisplay);
  setArenaConceptHudText(arenaRightRankLabelEl, opponentRankLabel);
  setArenaConceptHudText(arenaRightRankTitleEl, opponentRankTitle.toUpperCase());
  setArenaConceptHp(arenaRightHpFillEl, arenaRightHpTextEl, rightHpCurrent, rightHpMax);
  updateArenaConceptSpellSlots(arenaRightSpellIconEls, arenaRightSpellFallbackEls, opponentSpells);
  updateArenaConceptSpellSlots(
    [arenaRightFireSpellIconEl],
    [arenaRightFireSpellFallbackEl],
    ARENA_CONCEPT_STANDARD_SPELLS
  );
}

function updateHud() {
  const multiplayerSnapshot = getMultiplayerPresentationSnapshot();
  const nowMs = performance.now();
  const snapshotDraftActive = !!multiplayerSnapshot?.isDraftActive;
  if (snapshotDraftActive) {
    draftOverlayLastServerActiveAt = nowMs;
  }
  const stickyDraftMatchFlow =
    !!multiplayerSnapshot?.active
    && !multiplayerSnapshot?.isArenaActive
    && !multiplayerSnapshot?.isArenaPending
    && !multiplayerSnapshot?.isMatchEnd
    && draftOverlayLastServerActiveAt > 0
    && (nowMs - draftOverlayLastServerActiveAt) <= DRAFT_OVERLAY_STICKY_MS;
  const multiplayerMatchFlowActive = !!multiplayerSnapshot?.active && (
    !!multiplayerSnapshot?.isArenaActive
    || !!multiplayerSnapshot?.isArenaPending
    || !!multiplayerSnapshot?.isMatchEnd
    || snapshotDraftActive
    || stickyDraftMatchFlow
  );
  if (document?.body) {
    document.body.classList.toggle('mpMatchFlowActive', multiplayerMatchFlowActive);
    const devicePixelRatioValue = Number(window.devicePixelRatio) || 1;
    const fractionalDevicePixelRatio = Math.abs(devicePixelRatioValue - Math.round(devicePixelRatioValue)) > 0.01;
    // Fractional DPR (for example 1.25) can trigger expensive compositor paths in match HUD layers.
    // Enable a lighter style profile only during multiplayer match flow on those displays.
    document.body.classList.toggle(
      'mpCompositorLite',
      multiplayerMatchFlowActive && fractionalDevicePixelRatio
    );
  }
  const inArenaPhase = gameState === 'playing'
    || gameState === 'result'
    || !!multiplayerSnapshot?.isArenaActive;
  updateDraftOverlayUi(multiplayerSnapshot);
  updateArenaConceptHud(multiplayerSnapshot, inArenaPhase);

  if (inArenaPhase && !isTouchDevice) {
    applySpellIconsDesktop();
  }

  const multiplayerArenaActive = !!multiplayerSnapshot?.active && !!multiplayerSnapshot?.isArenaActive;
  if (multiplayerArenaActive) {
    const opponentLabel = String(dummy?.name || '').trim() || 'Opponent';
    hpEl.textContent = `Your HP: ${Math.ceil(player.hp)}` + (player.alive ? '' : ' (dead)');
    dummyHpEl.textContent = !dummyEnabled
      ? `${opponentLabel} HP: -`
      : dummy.alive
        ? `${opponentLabel} HP: ${Math.ceil(dummy.hp)}`
        : `${opponentLabel} HP: 0 (dead)`;
  } else {
    hpEl.textContent = `HP: ${Math.ceil(player.hp)}` + (player.alive ? '' : ' (dead)');
    dummyHpEl.textContent = !dummyEnabled
      ? 'Dummy HP: removed'
      : dummy.alive
        ? `${dummyBehavior === 'standing' ? 'Standing Dummy' : 'Active Dummy'} HP: ${Math.ceil(dummy.hp)}`
        : `Dummy HP: dead (${dummy.deadReason})`;
  }

  if (standingDummyBtn) {
    standingDummyBtn.textContent = dummyEnabled && dummyBehavior === 'standing'
      ? 'Standing Dummy On'
      : 'Start Standing Dummy';
  }

  if (activeDummyBtn) {
    activeDummyBtn.textContent = dummyEnabled && dummyBehavior === 'active'
      ? 'Active Dummy On'
      : 'Start Active Dummy';
  }

  if (removeDummyBtn) {
    removeDummyBtn.textContent = dummyEnabled ? 'Remove Dummy' : 'No Dummy';
  }

  if (hudToggleBtn) {
    hudToggleBtn.textContent = hudVisible ? 'Hide Info' : 'Show Info';
  }
  playerNameHudEl.textContent = `Name: ${player.name}`;
  if (lobbyTopNameEl) {
    lobbyTopNameEl.textContent = player.name || 'Player';
  }
  scoreHudEl.textContent = `Score: ${player.score}`;
  const currencyValueText = String(Math.max(0, Math.floor(Number(profile.wlk) || 0)));
  wlkHudEl.textContent = `OUT: ${currencyValueText}`;
  if (wlkTopbarEl) wlkTopbarEl.textContent = currencyValueText;
  if (wlkLobbyTopEl) wlkLobbyTopEl.textContent = currencyValueText;
  if (wlkLobbyEl) {
    const storeValueEl = wlkLobbyEl.querySelector('.storeCurrencyValue');
    if (storeValueEl) storeValueEl.textContent = currencyValueText;
  }
  roundTimerHudEl.textContent = arena.shrinkEnabled === false
    ? 'Arena Stable'
    : `Shrink In: ${Math.ceil(arena.shrinkTimer)}s`;

  controlsHudEl.textContent = isTouchDevice
    ? 'Touch: Move stick | Pull skill and release to cast | Top-right Menu'
    : `Fire: ${prettyKey(keybinds.fire)} | Hook: ${prettyKey(keybinds.hook)} | Teleport: ${prettyKey(keybinds.teleport)} | Shield: ${prettyKey(keybinds.shield)} | Charge: ${prettyKey(keybinds.charge)} | Shock: ${prettyKey(keybinds.shock)} | Gust: ${prettyKey(keybinds.gust)} | Wall: hold ${prettyKey(keybinds.wall)} and release | Rewind: ${prettyKey(keybinds.rewind)} | Menu: ${prettyKey(keybinds.menu)}`;

  const musicLabelText = `Music: ${musicMuted ? 'Off' : 'On'}`;
  const musicLabelEl = musicToggleBtn?.querySelector?.('.menuBtnLabel');
  if (musicLabelEl) {
    musicLabelEl.textContent = musicLabelText;
  } else if (musicToggleBtn) {
    musicToggleBtn.textContent = musicLabelText;
  }
  if (musicToggleBtn) {
    musicToggleBtn.classList.toggle('musicToggleOn', !musicMuted);
    musicToggleBtn.classList.toggle('musicToggleOff', musicMuted);
  }
  hud.style.display = (inArenaPhase && hudVisible) ? 'block' : 'none';

  syncArenaSpellBarLayout(multiplayerSnapshot);

  updateSkillCooldownButtons(multiplayerSnapshot);

  if (gameState === 'lobby') {
    buildRankedPanel();
  }
  updateGodModeMenuState();
  updateLeaveGameMenuState(multiplayerSnapshot);
}

// â”€â”€ Aim Sensitivity UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateAimSensitivityUI() {
  const value = Math.min(1.4, Math.max(0.35, Number(profile.aimSensitivity) || 0.7));
  profile.aimSensitivity = value;

  if (aimSensitivitySlider) {
    aimSensitivitySlider.value = value.toFixed(2);
  }

  if (aimSensitivityValue) {
    aimSensitivityValue.textContent = `${value.toFixed(2)}x`;
  }
}

function updateMusicVolumeUI() {
  const raw = Number(profile.musicVolume);
  const value = Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 0.38));
  profile.musicVolume = value;

  if (musicVolumeSlider) {
    musicVolumeSlider.value = value.toFixed(2);
  }

  if (musicVolumeValue) {
    musicVolumeValue.textContent = `${Math.round(value * 100)}%`;
  }
}

function updateSoundVolumeUI() {
  const raw = Number(profile.soundVolume);
  const value = Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 1));
  profile.soundVolume = value;

  if (soundVolumeSlider) {
    soundVolumeSlider.value = value.toFixed(2);
  }

  if (soundVolumeValue) {
    soundVolumeValue.textContent = `${Math.round(value * 100)}%`;
  }
}

const lobbyDepthFx = {
  initialized: false,
  enabled: !isTouchDevice,
  currentX: 0,
  currentY: 0,
  targetX: 0,
  targetY: 0,
  rafId: 0,
};

function queueLobbyDepthFrame() {
  if (lobbyDepthFx.rafId) return;
  lobbyDepthFx.rafId = requestAnimationFrame(stepLobbyDepthFx);
}

function setLobbyParallaxTargetFromPointer(clientX, clientY) {
  const nx = (clientX / Math.max(1, window.innerWidth)) - 0.5;
  const ny = (clientY / Math.max(1, window.innerHeight)) - 0.5;

  // Keep parallax subtle: roughly 3-5px at edges.
  lobbyDepthFx.targetX = Math.max(-5, Math.min(5, nx * 10));
  lobbyDepthFx.targetY = Math.max(-5, Math.min(5, ny * 10));
  queueLobbyDepthFrame();
}

function resetLobbyParallaxTarget() {
  lobbyDepthFx.targetX = 0;
  lobbyDepthFx.targetY = 0;
  queueLobbyDepthFrame();
}

function stepLobbyDepthFx() {
  lobbyDepthFx.rafId = 0;

  if (!overlay) return;

  if (!lobbyDepthFx.enabled || gameState !== 'lobby') {
    lobbyDepthFx.targetX = 0;
    lobbyDepthFx.targetY = 0;
  }

  lobbyDepthFx.currentX += (lobbyDepthFx.targetX - lobbyDepthFx.currentX) * 0.1;
  lobbyDepthFx.currentY += (lobbyDepthFx.targetY - lobbyDepthFx.currentY) * 0.1;

  overlay.style.setProperty('--lobby-bg-x', `${lobbyDepthFx.currentX.toFixed(2)}px`);
  overlay.style.setProperty('--lobby-bg-y', `${lobbyDepthFx.currentY.toFixed(2)}px`);

  const stillMoving =
    Math.abs(lobbyDepthFx.targetX - lobbyDepthFx.currentX) > 0.02 ||
    Math.abs(lobbyDepthFx.targetY - lobbyDepthFx.currentY) > 0.02 ||
    Math.abs(lobbyDepthFx.currentX) > 0.02 ||
    Math.abs(lobbyDepthFx.currentY) > 0.02;

  if (stillMoving) {
    queueLobbyDepthFrame();
  }
}

function initLobbyDepthEffects() {
  if (lobbyDepthFx.initialized) return;
  lobbyDepthFx.initialized = true;

  if (!overlay) return;

  overlay.addEventListener('pointermove', (e) => {
    if (!lobbyDepthFx.enabled || gameState !== 'lobby') return;
    setLobbyParallaxTargetFromPointer(e.clientX, e.clientY);
  }, { passive: true });

  overlay.addEventListener('pointerleave', () => {
    resetLobbyParallaxTarget();
  }, { passive: true });

  window.addEventListener('blur', () => {
    resetLobbyParallaxTarget();
  });

  window.addEventListener('resize', () => {
    resetLobbyParallaxTarget();
  });
}
