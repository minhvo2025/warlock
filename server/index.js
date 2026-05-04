const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const crypto = require('crypto');
const {
  getWallHalfLength,
  getWallHalfThickness,
  getWallDirection,
  isWallActive,
  isPointInsideWall,
  findBlockingWallForPoint,
  findBlockingWallForMovement,
  resolvePointAgainstWalls
} = require('./wallCollision');
const {
  ABILITY_IDS,
  getSpellTuning,
  getAllSpellTuning,
  setSpellTuningOverride,
  resetSpellTuningOverride,
  getSpellIdentitySummary
} = require('./spellTuning');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';
const MAX_PLAYERS_PER_ROOM = 2;
const PLAYER_DISPLAY_NAME_MAX_LENGTH = 16;
const PLAYER_DISPLAY_NAME_FALLBACK = 'Player';
const ROOM_CODE_LENGTH = 5;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_STATES = Object.freeze({
  WAITING: 'waiting',
  READY_CHECK: 'ready_check',
  DRAFT: 'draft',
  COMBAT: 'combat',
  MATCH_END: 'match_end',
  STARTING: 'starting',
  IN_MATCH: 'in_match'
});
const MATCH_PHASE_DRAFT = 'draft';
const MATCH_PHASE_COMBAT_COUNTDOWN = 'combat_countdown';
const MATCH_PHASE_COMBAT = 'combat';
const MATCH_PHASE_ROUND_END = 'round_end';
const MATCH_PHASE_MATCH_END = 'match_end';
const MATCH_FORMAT_BO3 = 'bo3';
const MATCH_ROUNDS_NEEDED_TO_WIN = 2;
const MATCH_MAX_ROUNDS = 3;
const ROUND_END_INTERMISSION_MS = 2800;
const PLAYER_BASE_MOVE_SPEED = 8;
const PLAYER_MOVE_SPEED = PLAYER_BASE_MOVE_SPEED * 1.4;
// Increased from 30 Hz -> 60 Hz for smoother multiplayer simulation
const MATCH_TICK_MS = 1000 / 60;
const MATCH_STATE_BROADCAST_MS = 20; // ~50 network snapshots/sec while sim runs at 60 Hz
const MATCH_MAX_DELTA_MS = 100;
const ARENA_BOUNDARY_CENTER = Object.freeze({ x: 0, y: 0 });
const ARENA_BOUNDARY_RADIUS = 14;
// Matches arena_platform.png alpha bounds (1620x1530).
// Keep in sync with js/game.js octagon constants.
const ARENA_OCTAGON_HALF_WIDTH_SCALE = 1.0588235294117647;
const ARENA_OCTAGON_CORNER_LIMIT_SCALE = 1.715032679738562;
const ARENA_HARD_OUT_OF_BOUNDS_RADIUS = ARENA_BOUNDARY_RADIUS + 4.8;
const LAVA_DAMAGE_INTERVAL_MS = 250;
const LAVA_DAMAGE_PER_TICK = 10;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_RADIUS = 0.72;
// Derived from arena_platform.png pillar bases (alpha bounds 1620x1530).
// Offsets are normalized by arena half-height to match local client colliders.
const ROUND_PILLAR_LAYOUT = Object.freeze([
  Object.freeze({ offsetX: -0.433, offsetY: -0.512, radiusScale: 0.090 }),
  Object.freeze({ offsetX: 0.429, offsetY: -0.513, radiusScale: 0.090 }),
  Object.freeze({ offsetX: -0.445, offsetY: 0.461, radiusScale: 0.090 }),
  Object.freeze({ offsetX: 0.438, offsetY: 0.460, radiusScale: 0.090 })
]);
const ROUND_PILLAR_COUNT = ROUND_PILLAR_LAYOUT.length;
const ROUND_PILLAR_RADIUS_MIN = 0.88;
const ROUND_PILLAR_RADIUS_MAX = 1.28;
const ROUND_PILLAR_MIN_CENTER_DISTANCE = 2.15;
const ROUND_PILLAR_SPAWN_CLEARANCE = 3.1;
const ROUND_PILLAR_MIN_SEPARATION = 1.2;
const ROUND_PILLAR_BOUNDARY_PADDING = 0.34;
const ROUND_PILLAR_MAX_ATTEMPTS = 360;
const PLAYER_KNOCKBACK_DAMPING_PER_SECOND = 6.9;
const ABILITY_REQUEST_MIN_INTERVAL_MS = 70;
const ABILITY_REQUEST_CACHE_TTL_MS = 12000;
const DRAFT_PICK_MIN_INTERVAL_MS = 80;
const DRAFT_REQUEST_CACHE_TTL_MS = 12000;
const COMBAT_START_COUNTDOWN_SECONDS = 3;
const COMBAT_START_COUNTDOWN_MS = COMBAT_START_COUNTDOWN_SECONDS * 1000;
const MATCH_HIT_EVENT_HISTORY_LIMIT = 18;
const RECONNECT_GRACE_MS = 25000;
const DRAFT_TURN_MS = 12000;
const ENABLE_TUNING_ADMIN = process.env.OUTRA_ENABLE_TUNING_ADMIN === '1' || process.env.NODE_ENV !== 'production';
// Keeps detailed per-tick/per-input logs in development while allowing quiet production runtime.
const ENABLE_VERBOSE_RUNTIME_LOGS = process.env.OUTRA_VERBOSE_RUNTIME_LOGS === '1' || process.env.NODE_ENV !== 'production';
const KILL_CREDIT_TIMEOUT_MS = 2600;
const DRAFT_SPELL_POOL = Object.freeze([
  'charge',
  'prism',
  'solar',
  'rift',
  'phantom',
  'shock',
  'gust',
  'wall',
  'rewind',
  'shield',
  'hook',
  'blink'
]);
const DRAFT_SPELL_COPY_LIMITS = Object.freeze({
  hook: 1,
  blink: 1,
  shield: 1,
  charge: 1,
  prism: 1,
  solar: 1,
  rift: 1,
  phantom: 1,
  shock: 1,
  gust: 1,
  wall: 1,
  rewind: 1
});
const DRAFT_TURN_ORDER = Object.freeze([1, 2, 2, 1, 1, 2]);
const SPAWN_POSITIONS = Object.freeze({
  1: Object.freeze({ x: -5.8, y: 0 }),
  2: Object.freeze({ x: 5.8, y: 0 })
});
const PHASE_TRANSITIONS = Object.freeze({
  [MATCH_PHASE_DRAFT]: Object.freeze([MATCH_PHASE_COMBAT_COUNTDOWN, MATCH_PHASE_MATCH_END]),
  [MATCH_PHASE_COMBAT_COUNTDOWN]: Object.freeze([MATCH_PHASE_COMBAT, MATCH_PHASE_MATCH_END]),
  [MATCH_PHASE_COMBAT]: Object.freeze([MATCH_PHASE_ROUND_END, MATCH_PHASE_MATCH_END]),
  [MATCH_PHASE_ROUND_END]: Object.freeze([MATCH_PHASE_COMBAT_COUNTDOWN, MATCH_PHASE_MATCH_END]),
  [MATCH_PHASE_MATCH_END]: Object.freeze([])
});
const ABILITY_DEFS = Object.freeze({
  [ABILITY_IDS.FIREBLAST]: Object.freeze({
    id: ABILITY_IDS.FIREBLAST,
    event: 'cast_fireblast',
    requiresDrafted: false
  }),
  [ABILITY_IDS.BLINK]: Object.freeze({
    id: ABILITY_IDS.BLINK,
    event: 'cast_blink',
    requiresDrafted: true
  }),
  [ABILITY_IDS.SHIELD]: Object.freeze({
    id: ABILITY_IDS.SHIELD,
    event: 'cast_shield',
    requiresDrafted: true
  }),
  [ABILITY_IDS.PRISM]: Object.freeze({
    id: ABILITY_IDS.PRISM,
    event: 'cast_prism',
    requiresDrafted: true
  }),
  [ABILITY_IDS.GUST]: Object.freeze({
    id: ABILITY_IDS.GUST,
    event: 'cast_gust',
    requiresDrafted: true
  }),
  [ABILITY_IDS.CHARGE]: Object.freeze({
    id: ABILITY_IDS.CHARGE,
    event: 'cast_charge',
    requiresDrafted: true
  }),
  [ABILITY_IDS.SHOCK]: Object.freeze({
    id: ABILITY_IDS.SHOCK,
    event: 'cast_shock',
    requiresDrafted: true
  }),
  [ABILITY_IDS.HOOK]: Object.freeze({
    id: ABILITY_IDS.HOOK,
    event: 'cast_hook',
    requiresDrafted: true
  }),
  [ABILITY_IDS.SOLAR]: Object.freeze({
    id: ABILITY_IDS.SOLAR,
    event: 'cast_solar',
    requiresDrafted: true
  }),
  [ABILITY_IDS.RIFT]: Object.freeze({
    id: ABILITY_IDS.RIFT,
    event: 'cast_rift',
    requiresDrafted: true
  }),
  [ABILITY_IDS.PHANTOM]: Object.freeze({
    id: ABILITY_IDS.PHANTOM,
    event: 'cast_phantom',
    requiresDrafted: true
  }),
  [ABILITY_IDS.WALL]: Object.freeze({
    id: ABILITY_IDS.WALL,
    event: 'cast_wall',
    requiresDrafted: true
  }),
  [ABILITY_IDS.REWIND]: Object.freeze({
    id: ABILITY_IDS.REWIND,
    event: 'cast_rewind',
    requiresDrafted: true
  })
});

const rooms = new Map();
const playerRoomBySocketId = new Map();
const reconnectGraceTimers = new Map();
const quickMatchQueue = [];

function getAbilityTuning(abilityId) {
  return getSpellTuning(abilityId) || {};
}

function getAbilityCooldownMs(abilityId) {
  return Math.max(0, Number(getAbilityTuning(abilityId).cooldownMs) || 0);
}

function getAbilityCastDelayMs(abilityId) {
  return Math.max(0, Number(getAbilityTuning(abilityId).castDelayMs) || 0);
}

function getAbilityNumber(abilityId, key, fallback = 0, min = 0) {
  const tuning = getAbilityTuning(abilityId);
  const parsed = Number(tuning?.[key]);
  if (!Number.isFinite(parsed)) return Math.max(min, Number(fallback) || 0);
  return Math.max(min, parsed);
}

function getAbilityRole(abilityId) {
  const role = String(getAbilityTuning(abilityId)?.role || '').trim().toLowerCase();
  return role || 'utility';
}

function getAbilityDamage(abilityId) {
  return getAbilityNumber(abilityId, 'damage', 0, 0);
}

function getWallHalfLengthDefault() {
  return getAbilityNumber(ABILITY_IDS.WALL, 'halfLength', 1.9, 0.05);
}

function getWallHalfThicknessDefault() {
  return getAbilityNumber(ABILITY_IDS.WALL, 'halfThickness', 0.36, 0.03);
}

function getWallDurationMsDefault() {
  return getAbilityNumber(ABILITY_IDS.WALL, 'durationMs', 4500, 100);
}

function getFireblastHitRadiusDefault() {
  return getAbilityNumber(ABILITY_IDS.FIREBLAST, 'hitRadius', 0.34, 0.05);
}

function getHookHitRadiusDefault() {
  return getAbilityNumber(ABILITY_IDS.HOOK, 'hitRadius', 0.38, 0.05);
}

function getSolarHitRadiusDefault() {
  return getAbilityNumber(ABILITY_IDS.SOLAR, 'hitRadius', 0.38, 0.05);
}

function getSolarImpactRadiusDefault() {
  return getAbilityNumber(ABILITY_IDS.SOLAR, 'impactRadius', 1.35, 0.1);
}

function getSolarDebuffDurationMsDefault() {
  return getAbilityNumber(ABILITY_IDS.SOLAR, 'debuffDurationMs', 1200, 50);
}

function getRiftPortalRadiusDefault() {
  return getAbilityNumber(ABILITY_IDS.RIFT, 'portalRadius', 0.9, 0.05);
}

function getRiftTeleportDelayMsDefault() {
  return getAbilityNumber(ABILITY_IDS.RIFT, 'teleportDelayMs', 80, 1);
}

function getRiftExitVelocityMultiplierDefault() {
  return getAbilityNumber(ABILITY_IDS.RIFT, 'exitVelocityMultiplier', 0.70, 0);
}

function getRiftReuseLockoutMsDefault() {
  return getAbilityNumber(ABILITY_IDS.RIFT, 'perPlayerReuseLockoutMs', 500, 0);
}

function getRiftUnfinishedTimeoutMsDefault() {
  return getAbilityNumber(ABILITY_IDS.RIFT, 'unfinishedPlacementTimeoutMs', 6000, 100);
}

function normalizeRoomCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizePlayerDisplayName(value, fallback = PLAYER_DISPLAY_NAME_FALLBACK) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safeFallback = String(fallback || PLAYER_DISPLAY_NAME_FALLBACK).trim() || PLAYER_DISPLAY_NAME_FALLBACK;
  const picked = raw || safeFallback;
  return picked.slice(0, PLAYER_DISPLAY_NAME_MAX_LENGTH);
}

function resolvePlayerDisplayName(socket, payload) {
  const payloadObject = payload && typeof payload === 'object' ? payload : null;
  const payloadName = payloadObject?.displayName || payloadObject?.name;
  const socketName = socket?.data?.displayName;
  const authName = socket?.handshake?.auth?.displayName;
  const queryName = socket?.handshake?.query?.displayName;
  const resolved = normalizePlayerDisplayName(
    payloadName || socketName || authName || queryName,
    PLAYER_DISPLAY_NAME_FALLBACK
  );
  if (socket && socket.data) {
    socket.data.displayName = resolved;
  }
  return resolved;
}

function clonePosition(position) {
  if (!position || typeof position !== 'object') return null;
  return {
    x: Number(position.x) || 0,
    y: Number(position.y) || 0
  };
}

function sanitizeVector(vector) {
  if (!vector || typeof vector !== 'object') return { x: 0, y: 0 };
  const x = Number(vector.x);
  const y = Number(vector.y);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function logLifecycle(scope, event, fields = {}) {
  const details = Object.entries(fields)
    .filter(([, value]) => typeof value !== 'undefined')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
  if (details) {
    console.log(`[${scope}] ${event} ${details}`);
    return;
  }
  console.log(`[${scope}] ${event}`);
}

function logRuntimeVerbose(message) {
  if (!ENABLE_VERBOSE_RUNTIME_LOGS) return;
  console.log(message);
}

function getQuickMatchQueueIndexBySocketId(socketId) {
  const normalizedSocketId = String(socketId || '');
  if (!normalizedSocketId) return -1;
  return quickMatchQueue.findIndex((entry) => String(entry?.socketId || '') === normalizedSocketId);
}

function getQueuedSocketById(socketId) {
  const normalizedSocketId = String(socketId || '');
  if (!normalizedSocketId) return null;
  const candidateSocket = io?.sockets?.sockets?.get(normalizedSocketId) || null;
  if (!candidateSocket || candidateSocket.connected !== true) return null;
  return candidateSocket;
}

function emitQuickMatchState(socket, status, extra = {}) {
  if (!socket) return;
  socket.emit('quick_match_state', {
    status: String(status || 'idle'),
    queueDepth: quickMatchQueue.length,
    ...extra
  });
}

function removeSocketFromQuickMatchQueue(socketId, reason = 'removed', emitEvent = false) {
  const index = getQuickMatchQueueIndexBySocketId(socketId);
  if (index < 0) return null;
  const [removedEntry] = quickMatchQueue.splice(index, 1);
  if (removedEntry) {
    logLifecycle('queue', 'removed', {
      socket: removedEntry.socketId,
      reason,
      queueDepth: quickMatchQueue.length
    });
    if (emitEvent) {
      const queuedSocket = getQueuedSocketById(removedEntry.socketId);
      if (queuedSocket) {
        emitQuickMatchState(queuedSocket, 'idle', {
          reason
        });
        queuedSocket.emit('quick_match_canceled', {
          status: 'idle',
          reason,
          queueDepth: quickMatchQueue.length
        });
      }
    }
  }
  return removedEntry || null;
}

function pruneQuickMatchQueue() {
  for (let index = quickMatchQueue.length - 1; index >= 0; index -= 1) {
    const entry = quickMatchQueue[index];
    const entrySocketId = String(entry?.socketId || '');
    if (!entrySocketId) {
      quickMatchQueue.splice(index, 1);
      continue;
    }
    if (!getQueuedSocketById(entrySocketId)) {
      quickMatchQueue.splice(index, 1);
      continue;
    }
    const existingRoomCode = playerRoomBySocketId.get(entrySocketId);
    if (existingRoomCode) {
      quickMatchQueue.splice(index, 1);
    }
  }
}

function findNextQueuedOpponent(excludedSocketId) {
  const normalizedExcludedId = String(excludedSocketId || '');
  pruneQuickMatchQueue();
  while (quickMatchQueue.length > 0) {
    const nextEntry = quickMatchQueue.shift();
    if (!nextEntry) continue;
    const nextSocketId = String(nextEntry.socketId || '');
    if (!nextSocketId || nextSocketId === normalizedExcludedId) continue;
    const queuedSocket = getQueuedSocketById(nextSocketId);
    if (!queuedSocket) continue;
    if (playerRoomBySocketId.has(nextSocketId)) continue;
    return {
      ...nextEntry,
      socket: queuedSocket
    };
  }
  return null;
}

function createQuickMatchRoomAndStartDraft(socketA, socketB, options = {}) {
  if (!socketA || !socketB) return null;
  const nameA = normalizePlayerDisplayName(
    options?.playerADisplayName || socketA?.data?.displayName,
    PLAYER_DISPLAY_NAME_FALLBACK
  );
  const nameB = normalizePlayerDisplayName(
    options?.playerBDisplayName || socketB?.data?.displayName,
    PLAYER_DISPLAY_NAME_FALLBACK
  );
  const roomCode = createUniqueRoomCode();
  const createdAt = Date.now();
  const room = {
    code: roomCode,
    players: [
      createRoomPlayer(socketA.id, 1, nameA),
      createRoomPlayer(socketB.id, 2, nameB)
    ],
    match: null,
    state: ROOM_STATES.WAITING,
    createdAt
  };
  rooms.set(roomCode, room);
  playerRoomBySocketId.set(socketA.id, roomCode);
  playerRoomBySocketId.set(socketB.id, roomCode);
  socketA.join(roomCode);
  socketB.join(roomCode);

  setRoomState(room, ROOM_STATES.STARTING, 'quick_match_found');
  createMatchForRoom(room);
  emitRoomUpdate(room);
  emitMatchStarted(room);
  emitMatchState(room, Date.now());
  return room;
}

function createAbilityAnalyticsEntry(abilityId) {
  return {
    abilityId: normalizeSpellId(abilityId) || String(abilityId || ''),
    role: getAbilityRole(abilityId),
    castRequested: 0,
    castAccepted: 0,
    castRejected: 0,
    cooldownRejected: 0,
    castExecuted: 0,
    hitsLanded: 0,
    eliminations: 0
  };
}

function ensureMatchAnalytics(match) {
  if (!match || typeof match !== 'object') {
    return {
      byAbility: {},
      playerLastImpactByNumber: {}
    };
  }
  if (!match.analytics || typeof match.analytics !== 'object') {
    match.analytics = {
      byAbility: {},
      playerLastImpactByNumber: {},
      createdAt: Number(match.startedAt) || Date.now(),
      lastUpdatedAt: Date.now()
    };
  }
  if (!match.analytics.byAbility || typeof match.analytics.byAbility !== 'object') {
    match.analytics.byAbility = {};
  }
  if (!match.analytics.playerLastImpactByNumber || typeof match.analytics.playerLastImpactByNumber !== 'object') {
    match.analytics.playerLastImpactByNumber = {};
  }
  Object.values(ABILITY_DEFS).forEach((abilityDef) => {
    const abilityId = normalizeSpellId(abilityDef?.id);
    if (!abilityId) return;
    if (!match.analytics.byAbility[abilityId]) {
      match.analytics.byAbility[abilityId] = createAbilityAnalyticsEntry(abilityId);
    }
  });
  match.analytics.lastUpdatedAt = Date.now();
  return match.analytics;
}

function trackAbilityMetric(match, abilityId, metric, amount = 1) {
  const normalizedAbilityId = normalizeSpellId(abilityId);
  if (!normalizedAbilityId || !metric) return;
  const analytics = ensureMatchAnalytics(match);
  if (!analytics.byAbility[normalizedAbilityId]) {
    analytics.byAbility[normalizedAbilityId] = createAbilityAnalyticsEntry(normalizedAbilityId);
  }
  const entry = analytics.byAbility[normalizedAbilityId];
  const currentValue = Number(entry[metric]) || 0;
  entry[metric] = currentValue + (Number(amount) || 0);
  analytics.lastUpdatedAt = Date.now();
}

function trackPlayerRecentImpact(match, targetPlayerNumber, sourcePlayerNumber, abilityId, timestamp = Date.now()) {
  const normalizedAbilityId = normalizeSpellId(abilityId);
  const targetNumber = Number(targetPlayerNumber) || 0;
  const sourceNumber = Number(sourcePlayerNumber) || 0;
  if (!match || !normalizedAbilityId || targetNumber <= 0 || sourceNumber <= 0) return;
  const analytics = ensureMatchAnalytics(match);
  analytics.playerLastImpactByNumber[targetNumber] = {
    abilityId: normalizedAbilityId,
    sourcePlayerNumber: sourceNumber,
    targetPlayerNumber: targetNumber,
    timestamp: Number(timestamp) || Date.now()
  };
  analytics.lastUpdatedAt = Date.now();
}

function getRecentImpactForPlayer(match, targetPlayerNumber, now = Date.now()) {
  if (!match) return null;
  const analytics = ensureMatchAnalytics(match);
  const targetNumber = Number(targetPlayerNumber) || 0;
  if (targetNumber <= 0) return null;
  const impact = analytics.playerLastImpactByNumber[targetNumber];
  if (!impact || typeof impact !== 'object') return null;
  const impactTimestamp = Number(impact.timestamp) || 0;
  const currentTimestamp = Number(now) || Date.now();
  if (impactTimestamp <= 0) return null;
  if ((currentTimestamp - impactTimestamp) > KILL_CREDIT_TIMEOUT_MS) return null;
  return impact;
}

function buildAbilityAnalyticsSnapshot(match) {
  const analytics = ensureMatchAnalytics(match);
  const snapshot = {};
  Object.keys(analytics.byAbility).forEach((abilityId) => {
    const entry = analytics.byAbility[abilityId];
    snapshot[abilityId] = {
      role: String(entry?.role || 'utility'),
      castRequested: Number(entry?.castRequested) || 0,
      castAccepted: Number(entry?.castAccepted) || 0,
      castRejected: Number(entry?.castRejected) || 0,
      cooldownRejected: Number(entry?.cooldownRejected) || 0,
      castExecuted: Number(entry?.castExecuted) || 0,
      hitsLanded: Number(entry?.hitsLanded) || 0,
      eliminations: Number(entry?.eliminations) || 0
    };
  });
  return snapshot;
}

function logSpellTuningSnapshot(reason = 'snapshot') {
  const tuning = getAllSpellTuning();
  Object.keys(tuning).forEach((abilityId) => {
    const entry = tuning[abilityId];
    if (!entry || typeof entry !== 'object') return;
    logLifecycle('tuning', 'spell_config', {
      reason,
      ability: abilityId,
      role: entry.role || 'utility',
      cooldownMs: Number(entry.cooldownMs) || 0,
      castDelayMs: Number(entry.castDelayMs) || 0,
      range: Number(entry.range) || 0,
      distance: Number(entry.distance) || 0,
      durationMs: Number(entry.durationMs) || 0,
      knockbackImpulse: Number(entry.knockbackImpulse) || 0
    });
  });
}

function logMatchAnalyticsSummary(room, match, endedAt = Date.now(), reason = 'match_end') {
  if (!room || !match) return;
  const analyticsSnapshot = buildAbilityAnalyticsSnapshot(match);
  const durationMs = Math.max(0, (Number(endedAt) || Date.now()) - (Number(match.startedAt) || Number(endedAt) || Date.now()));
  logLifecycle('analytics', 'match_summary', {
    code: room.code,
    matchId: match.matchId,
    reason,
    durationMs,
    winner: Number(match.winnerPlayerNumber) || 0,
    eliminated: Number(match.eliminatedPlayerNumber) || 0
  });
  Object.keys(analyticsSnapshot).forEach((abilityId) => {
    const entry = analyticsSnapshot[abilityId];
    const casts = Number(entry.castAccepted) || 0;
    const hits = Number(entry.hitsLanded) || 0;
    const eliminations = Number(entry.eliminations) || 0;
    if (casts <= 0 && hits <= 0 && eliminations <= 0) return;
    logLifecycle('analytics', 'spell_summary', {
      code: room.code,
      matchId: match.matchId,
      ability: abilityId,
      role: entry.role,
      castRequested: entry.castRequested,
      castAccepted: casts,
      castRejected: entry.castRejected,
      cooldownRejected: entry.cooldownRejected,
      castExecuted: entry.castExecuted,
      hitsLanded: hits,
      eliminations
    });
  });
}

function normalizeInputVector(input) {
  const rawX = Number(input?.x);
  const rawY = Number(input?.y);
  const x = Number.isFinite(rawX) ? clamp(rawX, -1, 1) : 0;
  const y = Number.isFinite(rawY) ? clamp(rawY, -1, 1) : 0;
  const magnitude = Math.hypot(x, y);
  if (magnitude <= 0) return { x: 0, y: 0 };
  if (magnitude <= 1) return { x, y };
  return {
    x: x / magnitude,
    y: y / magnitude
  };
}

function inputsEqual(inputA, inputB) {
  if (!inputA || !inputB) return false;
  return inputA.x === inputB.x && inputA.y === inputB.y;
}

function dotProduct(vectorA, vectorB) {
  const a = sanitizeVector(vectorA);
  const b = sanitizeVector(vectorB);
  return (a.x * b.x) + (a.y * b.y);
}

function positionsEqual(positionA, positionB) {
  if (!positionA || !positionB) return false;
  return positionA.x === positionB.x && positionA.y === positionB.y;
}

function buildSpawnPositions() {
  const player1 = clonePosition(SPAWN_POSITIONS[1]) || { x: -5.8, y: 0 };
  const player2 = clonePosition(SPAWN_POSITIONS[2]) || { x: 5.8, y: 0 };

  // Safety guard: never allow both players to spawn at the exact same coordinates.
  if (positionsEqual(player1, player2)) {
    player2.x += 10;
    console.log('[match] spawn_adjustment applied reason=identical_spawn_positions');
  }

  return { player1, player2 };
}

function createRoomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[index];
  }
  return code;
}

function createUniqueRoomCode() {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const code = createRoomCode();
    if (!rooms.has(code)) return code;
  }
  return `${Date.now().toString(36).toUpperCase().slice(-ROOM_CODE_LENGTH)}`;
}

function createMatchId(roomCode) {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${roomCode}-${timePart}-${randomPart}`;
}

function createProjectileId(match) {
  match.nextProjectileSequence = (Number(match.nextProjectileSequence) || 0) + 1;
  return `${match.matchId}-P${match.nextProjectileSequence}`;
}

function createWallId(match) {
  match.nextWallSequence = (Number(match.nextWallSequence) || 0) + 1;
  return `${match.matchId}-W${match.nextWallSequence}`;
}

function createRiftId(match) {
  match.nextRiftSequence = (Number(match.nextRiftSequence) || 0) + 1;
  return `${match.matchId}-R${match.nextRiftSequence}`;
}

function createRoundPillarId(match) {
  match.nextRoundPillarSequence = (Number(match.nextRoundPillarSequence) || 0) + 1;
  return `${match.matchId}-O${match.nextRoundPillarSequence}`;
}

function markProjectileResolved(match, projectileId, timestamp = Date.now()) {
  if (!match || !projectileId) return;
  const resolvedMap = ensureActionCache(match, 'resolvedProjectileIds');
  resolvedMap[String(projectileId)] = Number(timestamp) || Date.now();
}

function isProjectileResolved(match, projectileId) {
  if (!match || !projectileId) return false;
  const resolvedMap = ensureActionCache(match, 'resolvedProjectileIds');
  return Boolean(resolvedMap[String(projectileId)]);
}

function pruneResolvedProjectiles(match, now = Date.now(), ttlMs = 12000) {
  if (!match) return;
  const resolvedMap = ensureActionCache(match, 'resolvedProjectileIds');
  const minTimestamp = (Number(now) || Date.now()) - Math.max(0, Number(ttlMs) || 0);
  Object.keys(resolvedMap).forEach((projectileId) => {
    if ((Number(resolvedMap[projectileId]) || 0) < minTimestamp) {
      delete resolvedMap[projectileId];
    }
  });
}

function createHitId(match) {
  match.nextHitSequence = (Number(match.nextHitSequence) || 0) + 1;
  return `${match.matchId}-H${match.nextHitSequence}`;
}

function normalizeSpellId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z_]/g, '');
}

function normalizeRequestId(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, '')
    .slice(0, 96);
}

function ensureActionCache(entity, key) {
  if (!entity || typeof entity !== 'object') return {};
  const current = entity[key];
  if (!current || typeof current !== 'object') {
    entity[key] = {};
    return entity[key];
  }
  return current;
}

function pruneRequestCache(cacheMap, now, ttlMs) {
  if (!cacheMap || typeof cacheMap !== 'object') return;
  const minTimestamp = (Number(now) || Date.now()) - Math.max(0, Number(ttlMs) || 0);
  Object.keys(cacheMap).forEach((requestId) => {
    const entry = cacheMap[requestId];
    const timestamp = Number(entry?.timestamp || entry?.at || 0);
    if (timestamp < minTimestamp) {
      delete cacheMap[requestId];
    }
  });
}

function isAllowedPhaseTransition(fromPhase, toPhase) {
  const from = String(fromPhase || '');
  const to = String(toPhase || '');
  if (!from || !to) return false;
  if (from === to) return true;
  const allowed = PHASE_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

function createDraftPoolState() {
  const pool = {};
  DRAFT_SPELL_POOL.forEach((spellId) => {
    pool[spellId] = {
      totalCopies: Number(DRAFT_SPELL_COPY_LIMITS[spellId]) || 0,
      remainingCopies: Number(DRAFT_SPELL_COPY_LIMITS[spellId]) || 0
    };
  });
  return pool;
}

function ensureDraftPoolEntries(draft) {
  if (!draft || typeof draft !== 'object') return {};
  if (!draft.pool || typeof draft.pool !== 'object') {
    draft.pool = {};
  }

  DRAFT_SPELL_POOL.forEach((spellId) => {
    const entry = draft.pool[spellId];
    const configuredCopies = Number(DRAFT_SPELL_COPY_LIMITS[spellId]) || 0;
    const totalCopiesRaw = Number(entry?.totalCopies);
    const remainingCopiesRaw = Number(entry?.remainingCopies);
    const totalCopies = Number.isFinite(totalCopiesRaw) && totalCopiesRaw > 0
      ? totalCopiesRaw
      : configuredCopies;
    let remainingCopies = Number.isFinite(remainingCopiesRaw)
      ? Math.max(0, remainingCopiesRaw)
      : totalCopies;
    if (remainingCopies > totalCopies) {
      remainingCopies = totalCopies;
    }

    draft.pool[spellId] = {
      totalCopies,
      remainingCopies
    };
  });

  return draft.pool;
}

function createDraftState(startedAt) {
  const startedTimestamp = Number(startedAt) || Date.now();
  const turnDurationMs = DRAFT_TURN_MS;
  const turnEndsAt = startedTimestamp + turnDurationMs;
  return {
    status: 'active',
    turnOrder: [...DRAFT_TURN_ORDER],
    currentTurnIndex: 0,
    currentTurnPlayerNumber: Number(DRAFT_TURN_ORDER[0]) || 1,
    turnDurationMs,
    turnStartedAt: startedTimestamp,
    turnEndsAt,
    pool: createDraftPoolState(),
    picksByPlayerNumber: {
      1: [],
      2: []
    },
    pickHistory: [],
    completedAt: null
  };
}

function createReconnectToken() {
  return crypto.randomBytes(24).toString('hex');
}

function createPlayerId() {
  return `P-${crypto.randomBytes(8).toString('hex')}`;
}

function normalizeReconnectToken(value) {
  return String(value || '').trim();
}

function getReconnectTimerKey(roomCode, playerId) {
  return `${String(roomCode || '')}:${String(playerId || '')}`;
}

function clearReconnectGraceTimer(roomCode, playerId) {
  const key = getReconnectTimerKey(roomCode, playerId);
  const timer = reconnectGraceTimers.get(key);
  if (!timer) return;
  clearTimeout(timer);
  reconnectGraceTimers.delete(key);
}

function clearReconnectTimersForRoom(roomCode) {
  const prefix = `${String(roomCode || '')}:`;
  reconnectGraceTimers.forEach((timer, key) => {
    if (!key.startsWith(prefix)) return;
    clearTimeout(timer);
    reconnectGraceTimers.delete(key);
  });
}

function createRoomPlayer(socketId, slot, displayName = PLAYER_DISPLAY_NAME_FALLBACK) {
  return {
    playerId: createPlayerId(),
    reconnectToken: createReconnectToken(),
    socketId,
    slot,
    name: normalizePlayerDisplayName(displayName, PLAYER_DISPLAY_NAME_FALLBACK),
    ready: false,
    matchPlayerNumber: null,
    connected: true,
    disconnectedAt: null,
    reconnectGraceExpiresAt: null
  };
}

function getPlayerBySocketId(room, socketId) {
  return room.players.find((player) => player.socketId === socketId) || null;
}

function getPlayerByPlayerId(room, playerId) {
  return room.players.find((player) => player.playerId === playerId) || null;
}

function getPlayerByReconnectToken(room, reconnectToken) {
  const normalizedToken = normalizeReconnectToken(reconnectToken);
  if (!normalizedToken) return null;
  return room.players.find((player) => player.reconnectToken === normalizedToken) || null;
}

function getMatchPlayerBySocketId(match, socketId) {
  return match?.players?.find((player) => player.socketId === socketId) || null;
}

function getMatchPlayerByPlayerId(match, playerId) {
  return match?.players?.find((player) => player.playerId === playerId) || null;
}

function getMatchPlayerByNumber(match, matchPlayerNumber) {
  return match?.players?.find((player) => Number(player.matchPlayerNumber) === Number(matchPlayerNumber)) || null;
}

function getDraftCurrentTurnPlayerNumber(match) {
  const turnOrder = Array.isArray(match?.draft?.turnOrder) ? match.draft.turnOrder : [];
  const currentTurnIndex = Number(match?.draft?.currentTurnIndex) || 0;
  return Number(turnOrder[currentTurnIndex]) || null;
}

function getValidDraftSpellsForMatchPlayer(match, matchPlayer) {
  if (!match || !matchPlayer || match.phase !== MATCH_PHASE_DRAFT) return [];
  const draftPool = ensureDraftPoolEntries(match.draft);
  const draftedSpells = new Set(
    (Array.isArray(matchPlayer.draftedSpells) ? matchPlayer.draftedSpells : [])
      .map((spellId) => normalizeSpellId(spellId))
      .filter(Boolean)
  );

  return DRAFT_SPELL_POOL.filter((spellId) => {
    const poolEntry = draftPool?.[spellId];
    const remainingCopies = Number(poolEntry?.remainingCopies) || 0;
    if (remainingCopies <= 0) return false;
    if (draftedSpells.has(spellId)) return false;
    return true;
  });
}

function getConnectedPlayerCount(room) {
  return (Array.isArray(room?.players) ? room.players : [])
    .filter((player) => player.connected !== false)
    .length;
}

function areAllMatchPlayersConnected(match) {
  const matchPlayers = Array.isArray(match?.players) ? match.players : [];
  return matchPlayers.length > 0 && matchPlayers.every((player) => player.connected !== false);
}

function normalizePlayerSlots(room) {
  room.players.forEach((player, index) => {
    player.slot = index + 1;
  });
}

function resetReadyAndMatchRole(room) {
  room.players.forEach((player) => {
    player.ready = false;
    player.matchPlayerNumber = null;
  });
}

function createFireblastProjectile(match, ownerPlayer, direction, now) {
  const spawnOffset = getAbilityNumber(ABILITY_IDS.FIREBLAST, 'spawnOffset', 0.9, 0);
  const speed = getAbilityNumber(ABILITY_IDS.FIREBLAST, 'speed', 14, 0.01);
  const hitRadius = getAbilityNumber(ABILITY_IDS.FIREBLAST, 'hitRadius', 0.34, 0.05);
  const lifetimeMs = getAbilityNumber(ABILITY_IDS.FIREBLAST, 'lifetimeMs', 1400, 10);
  const normalizedDirection = normalizeInputVector(direction);
  const spawnBase = clonePosition(ownerPlayer.position) || { x: 0, y: 0 };
  const spawnPosition = {
    x: spawnBase.x + normalizedDirection.x * spawnOffset,
    y: spawnBase.y + normalizedDirection.y * spawnOffset
  };

  return {
    projectileId: createProjectileId(match),
    abilityId: ABILITY_IDS.FIREBLAST,
    ownerPlayerNumber: ownerPlayer.matchPlayerNumber,
    position: spawnPosition,
    direction: normalizedDirection,
    speed,
    hitRadius,
    spawnedAt: now,
    expiresAt: now + lifetimeMs
  };
}

function createHookProjectile(match, ownerPlayer, direction, now) {
  const spawnOffset = getAbilityNumber(ABILITY_IDS.HOOK, 'spawnOffset', 0.92, 0);
  const speed = getAbilityNumber(ABILITY_IDS.HOOK, 'speed', 18, 0.01);
  const hitRadius = getAbilityNumber(ABILITY_IDS.HOOK, 'hitRadius', 0.38, 0.05);
  const lifetimeMs = getAbilityNumber(ABILITY_IDS.HOOK, 'lifetimeMs', 900, 10);
  const normalizedDirection = normalizeInputVector(direction);
  const spawnBase = clonePosition(ownerPlayer.position) || { x: 0, y: 0 };
  const spawnPosition = {
    x: spawnBase.x + normalizedDirection.x * spawnOffset,
    y: spawnBase.y + normalizedDirection.y * spawnOffset
  };

  return {
    projectileId: createProjectileId(match),
    abilityId: ABILITY_IDS.HOOK,
    ownerPlayerNumber: ownerPlayer.matchPlayerNumber,
    position: spawnPosition,
    direction: normalizedDirection,
    speed,
    hitRadius,
    spawnedAt: now,
    expiresAt: now + lifetimeMs
  };
}

function createSolarProjectile(match, ownerPlayer, direction, now) {
  const spawnOffset = getAbilityNumber(ABILITY_IDS.SOLAR, 'spawnOffset', 0.92, 0);
  const speed = getAbilityNumber(ABILITY_IDS.SOLAR, 'speed', 16.2, 0.01);
  const hitRadius = getSolarHitRadiusDefault();
  const lifetimeMs = getAbilityNumber(ABILITY_IDS.SOLAR, 'lifetimeMs', Math.round((12 / 16.2) * 1000), 10);
  const normalizedDirection = normalizeInputVector(direction);
  const spawnBase = clonePosition(ownerPlayer.position) || { x: 0, y: 0 };
  const spawnPosition = {
    x: spawnBase.x + normalizedDirection.x * spawnOffset,
    y: spawnBase.y + normalizedDirection.y * spawnOffset
  };

  return {
    projectileId: createProjectileId(match),
    abilityId: ABILITY_IDS.SOLAR,
    ownerPlayerNumber: ownerPlayer.matchPlayerNumber,
    position: spawnPosition,
    direction: normalizedDirection,
    speed,
    hitRadius,
    spawnedAt: now,
    expiresAt: now + lifetimeMs
  };
}

function getOpponentPlayer(match, ownerPlayerNumber) {
  return (Array.isArray(match?.players) ? match.players : [])
    .find((player) => Number(player?.matchPlayerNumber) !== Number(ownerPlayerNumber)) || null;
}

function getArenaOctagonMetrics(radius = ARENA_BOUNDARY_RADIUS, padding = 0) {
  const safeRadius = Math.max(0.01, Number(radius) || ARENA_BOUNDARY_RADIUS);
  const safePadding = Number.isFinite(Number(padding)) ? Number(padding) : 0;
  const halfHeight = Math.max(0, safeRadius - safePadding);
  const halfWidth = Math.max(0, (safeRadius * ARENA_OCTAGON_HALF_WIDTH_SCALE) - safePadding);
  const cornerLimit = Math.max(0, (safeRadius * ARENA_OCTAGON_CORNER_LIMIT_SCALE) - (safePadding * Math.SQRT2));
  return { halfWidth, halfHeight, cornerLimit };
}

function isPointInsideArenaOctagon(position, padding = 0, radius = ARENA_BOUNDARY_RADIUS) {
  const pos = clonePosition(position) || { x: 0, y: 0 };
  const metrics = getArenaOctagonMetrics(radius, padding);
  if (metrics.halfWidth <= 0 || metrics.halfHeight <= 0 || metrics.cornerLimit <= 0) return false;
  const dx = Math.abs(pos.x - ARENA_BOUNDARY_CENTER.x);
  const dy = Math.abs(pos.y - ARENA_BOUNDARY_CENTER.y);
  if (dx > metrics.halfWidth || dy > metrics.halfHeight) return false;
  return (dx + dy) <= metrics.cornerLimit;
}

function isOutsideArenaBoundary(position) {
  return !isPointInsideArenaOctagon(position, 0, ARENA_BOUNDARY_RADIUS);
}

function getDistanceFromArenaCenter(position) {
  const pos = clonePosition(position) || { x: 0, y: 0 };
  const dx = pos.x - ARENA_BOUNDARY_CENTER.x;
  const dy = pos.y - ARENA_BOUNDARY_CENTER.y;
  return Math.hypot(dx, dy);
}

function isInLavaHazard(position) {
  return !isPointInsideArenaOctagon(position, 0, ARENA_BOUNDARY_RADIUS);
}

function isBeyondHardOutOfBounds(position) {
  const extraPadding = ARENA_HARD_OUT_OF_BOUNDS_RADIUS - ARENA_BOUNDARY_RADIUS;
  return !isPointInsideArenaOctagon(position, -extraPadding, ARENA_BOUNDARY_RADIUS);
}

function clampPositionInsideArena(position, padding = 0) {
  const pos = clonePosition(position) || { x: 0, y: 0 };
  const safePadding = Number.isFinite(Number(padding)) ? Number(padding) : 0;
  if (isPointInsideArenaOctagon(pos, safePadding, ARENA_BOUNDARY_RADIUS)) {
    return pos;
  }
  const dx = pos.x - ARENA_BOUNDARY_CENTER.x;
  const dy = pos.y - ARENA_BOUNDARY_CENTER.y;
  if ((dx * dx + dy * dy) <= 0.000001) {
    return { x: ARENA_BOUNDARY_CENTER.x, y: ARENA_BOUNDARY_CENTER.y };
  }
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const mid = (low + high) * 0.5;
    const candidate = {
      x: ARENA_BOUNDARY_CENTER.x + (dx * mid),
      y: ARENA_BOUNDARY_CENTER.y + (dy * mid),
    };
    if (isPointInsideArenaOctagon(candidate, safePadding, ARENA_BOUNDARY_RADIUS)) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return {
    x: ARENA_BOUNDARY_CENTER.x + (dx * low),
    y: ARENA_BOUNDARY_CENTER.y + (dy * low)
  };
}

function ensureMatchRoundPillars(match) {
  if (!match || typeof match !== 'object') return [];
  if (!Array.isArray(match.roundPillars)) {
    match.roundPillars = [];
  }
  return match.roundPillars;
}

function getRoundPillarRadius(pillar, fallbackRadius = ROUND_PILLAR_RADIUS_MIN) {
  return Math.max(0.05, Number(pillar?.radius) || fallbackRadius);
}

function findBlockingRoundPillarForPoint(point, match, options = {}) {
  const safePoint = clonePosition(point);
  if (!safePoint) return null;
  const padding = Math.max(0, Number(options?.padding) || 0);
  const pillars = ensureMatchRoundPillars(match);
  for (const pillar of pillars) {
    const center = clonePosition(pillar?.position);
    if (!center) continue;
    const combinedRadius = getRoundPillarRadius(pillar) + padding;
    const dx = safePoint.x - center.x;
    const dy = safePoint.y - center.y;
    if ((dx * dx + dy * dy) <= (combinedRadius * combinedRadius)) {
      return pillar;
    }
  }
  return null;
}

function distanceSqPointToSegment(point, segmentStart, segmentEnd) {
  const p = clonePosition(point);
  const a = clonePosition(segmentStart);
  const b = clonePosition(segmentEnd);
  if (!p || !a || !b) return Number.POSITIVE_INFINITY;
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abLenSq = (abx * abx) + (aby * aby);
  if (abLenSq <= 1e-8) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return (dx * dx) + (dy * dy);
  }
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const t = clamp(((apx * abx) + (apy * aby)) / abLenSq, 0, 1);
  const cx = a.x + (abx * t);
  const cy = a.y + (aby * t);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return (dx * dx) + (dy * dy);
}

function findBlockingRoundPillarForMovement(previousPoint, currentPoint, match, options = {}) {
  const from = clonePosition(previousPoint) || clonePosition(currentPoint);
  const to = clonePosition(currentPoint) || clonePosition(previousPoint);
  if (!to) return null;
  const padding = Math.max(0, Number(options?.padding) || 0);
  const pillars = ensureMatchRoundPillars(match);
  for (const pillar of pillars) {
    const center = clonePosition(pillar?.position);
    if (!center) continue;
    const combinedRadius = getRoundPillarRadius(pillar) + padding;
    const combinedRadiusSq = combinedRadius * combinedRadius;
    const toDx = to.x - center.x;
    const toDy = to.y - center.y;
    if ((toDx * toDx + toDy * toDy) <= combinedRadiusSq) {
      return pillar;
    }
    if (from) {
      const fromDx = from.x - center.x;
      const fromDy = from.y - center.y;
      if ((fromDx * fromDx + fromDy * fromDy) <= combinedRadiusSq) {
        return pillar;
      }
      if (distanceSqPointToSegment(center, from, to) <= combinedRadiusSq) {
        return pillar;
      }
    }
  }
  return null;
}

function resolvePointAgainstRoundPillars(nextPoint, previousPoint, match, options = {}) {
  const fallback = clonePosition(previousPoint) || { x: 0, y: 0 };
  const resolved = clonePosition(nextPoint) || clonePosition(previousPoint) || { x: 0, y: 0 };
  const padding = Math.max(0, Number(options?.padding) || 0);
  let safePoint = { ...resolved };
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const blockingPillar = findBlockingRoundPillarForPoint(safePoint, match, { padding });
    if (!blockingPillar) break;
    const center = clonePosition(blockingPillar?.position);
    if (!center) break;
    const targetDistance = getRoundPillarRadius(blockingPillar) + padding + 0.001;
    let dx = safePoint.x - center.x;
    let dy = safePoint.y - center.y;
    let distance = Math.hypot(dx, dy);
    if (distance <= 1e-6) {
      const fallbackDirection = normalizeInputVector({
        x: safePoint.x - fallback.x,
        y: safePoint.y - fallback.y
      });
      dx = fallbackDirection.x;
      dy = fallbackDirection.y;
      distance = Math.hypot(dx, dy);
      if (distance <= 1e-6) {
        dx = 1;
        dy = 0;
        distance = 1;
      }
    }
    safePoint = {
      x: center.x + ((dx / distance) * targetDistance),
      y: center.y + ((dy / distance) * targetDistance)
    };
  }
  return safePoint;
}

function resolvePointAgainstArenaBlockers(nextPoint, previousPoint, match, options = {}) {
  const padding = Math.max(0, Number(options?.padding) || 0);
  const timestamp = Number(options?.timestamp) || Date.now();
  const wallResolvedPoint = resolvePointAgainstWalls(
    nextPoint,
    previousPoint,
    match?.walls,
    buildWallCollisionOptions(padding, timestamp)
  );
  const pillarResolvedPoint = resolvePointAgainstRoundPillars(
    wallResolvedPoint,
    previousPoint,
    match,
    { padding }
  );
  return resolvePointAgainstWalls(
    pillarResolvedPoint,
    previousPoint,
    match?.walls,
    buildWallCollisionOptions(padding, timestamp)
  );
}

function resolveSlidingMovementAgainstRoundPillar(previousPoint, desiredPoint, blockingPillar, match, options = {}) {
  const from = clonePosition(previousPoint);
  const desired = clonePosition(desiredPoint);
  const center = clonePosition(blockingPillar?.position);
  if (!from || !desired || !center) return null;

  const padding = Math.max(0, Number(options?.padding) || 0);
  const timestamp = Number(options?.timestamp) || Date.now();

  const moveX = desired.x - from.x;
  const moveY = desired.y - from.y;
  const moveDistance = Math.hypot(moveX, moveY);
  if (moveDistance <= 1e-6) return null;

  let normalX = desired.x - center.x;
  let normalY = desired.y - center.y;
  let normalLength = Math.hypot(normalX, normalY);
  if (normalLength <= 1e-6) {
    normalX = from.x - center.x;
    normalY = from.y - center.y;
    normalLength = Math.hypot(normalX, normalY);
  }
  if (normalLength <= 1e-6) {
    normalX = -moveY;
    normalY = moveX;
    normalLength = Math.hypot(normalX, normalY);
  }
  if (normalLength <= 1e-6) return null;
  normalX /= normalLength;
  normalY /= normalLength;

  const moveDirX = moveX / moveDistance;
  const moveDirY = moveY / moveDistance;
  const intoNormal = (moveDirX * normalX) + (moveDirY * normalY);
  let slideX = moveDirX - (intoNormal * normalX);
  let slideY = moveDirY - (intoNormal * normalY);
  let slideLength = Math.hypot(slideX, slideY);

  if (slideLength <= 1e-6) {
    slideX = -normalY;
    slideY = normalX;
    if (((slideX * moveDirX) + (slideY * moveDirY)) < 0) {
      slideX = -slideX;
      slideY = -slideY;
    }
    slideLength = Math.hypot(slideX, slideY);
  }
  if (slideLength <= 1e-6) return null;

  slideX /= slideLength;
  slideY /= slideLength;
  const slideTarget = {
    x: from.x + (slideX * moveDistance),
    y: from.y + (slideY * moveDistance)
  };

  const wallOptions = buildWallCollisionOptions(padding, timestamp);
  if (findBlockingWallForMovement(from, slideTarget, match?.walls, wallOptions)) {
    return null;
  }
  if (findBlockingRoundPillarForPoint(slideTarget, match, { padding })) {
    return null;
  }

  const resolvedSlideTarget = resolvePointAgainstArenaBlockers(
    slideTarget,
    from,
    match,
    { padding, timestamp }
  );
  if (!resolvedSlideTarget) return null;

  if (findBlockingWallForMovement(from, resolvedSlideTarget, match?.walls, wallOptions)) {
    return null;
  }
  if (findBlockingRoundPillarForPoint(resolvedSlideTarget, match, { padding })) {
    return null;
  }

  return resolvedSlideTarget;
}

function isRoundPillarSpawnBlocked(candidate, radius, existingPillars, spawnPoints) {
  const point = clonePosition(candidate);
  if (!point) return true;
  const safeRadius = Math.max(0.05, Number(radius) || ROUND_PILLAR_RADIUS_MIN);
  if (!isPointInsideArenaOctagon(point, safeRadius + ROUND_PILLAR_BOUNDARY_PADDING, ARENA_BOUNDARY_RADIUS)) {
    return true;
  }
  const centerDistance = getDistanceFromArenaCenter(point);
  if (centerDistance < (ROUND_PILLAR_MIN_CENTER_DISTANCE + (safeRadius * 0.25))) return true;

  const spawnList = Array.isArray(spawnPoints) ? spawnPoints : [];
  for (const spawnPoint of spawnList) {
    const spawn = clonePosition(spawnPoint);
    if (!spawn) continue;
    const dx = point.x - spawn.x;
    const dy = point.y - spawn.y;
    const minimumDistance = safeRadius + PLAYER_RADIUS + ROUND_PILLAR_SPAWN_CLEARANCE;
    if ((dx * dx + dy * dy) < (minimumDistance * minimumDistance)) {
      return true;
    }
  }

  const placedPillars = Array.isArray(existingPillars) ? existingPillars : [];
  for (const otherPillar of placedPillars) {
    const otherCenter = clonePosition(otherPillar?.position);
    if (!otherCenter) continue;
    const otherRadius = getRoundPillarRadius(otherPillar);
    const dx = point.x - otherCenter.x;
    const dy = point.y - otherCenter.y;
    const minimumDistance = safeRadius + otherRadius + ROUND_PILLAR_MIN_SEPARATION;
    if ((dx * dx + dy * dy) < (minimumDistance * minimumDistance)) {
      return true;
    }
  }

  return false;
}

function createRoundPillarCandidate(radius, angle, distanceFromCenter) {
  return {
    x: ARENA_BOUNDARY_CENTER.x + (Math.cos(angle) * distanceFromCenter),
    y: ARENA_BOUNDARY_CENTER.y + (Math.sin(angle) * distanceFromCenter),
    radius
  };
}

function generateRoundPillarsForMatchRound(match, timestamp = Date.now()) {
  if (!match) return [];
  const now = Number(timestamp) || Date.now();
  const generatedPillars = [];
  const fallbackRadius = Math.max(
    0.05,
    (Math.max(ROUND_PILLAR_RADIUS_MIN, ROUND_PILLAR_RADIUS_MAX) + Math.min(ROUND_PILLAR_RADIUS_MIN, ROUND_PILLAR_RADIUS_MAX)) * 0.5
  );

  for (const layoutPillar of ROUND_PILLAR_LAYOUT) {
    const radius = Math.max(
      0.05,
      Number(layoutPillar?.radius)
      || ((Number(layoutPillar?.radiusScale) || 0) * ARENA_BOUNDARY_RADIUS)
      || fallbackRadius
    );
    const candidate = clampPositionInsideArena(
      {
        x: ARENA_BOUNDARY_CENTER.x + ((Number(layoutPillar?.offsetX) || 0) * ARENA_BOUNDARY_RADIUS),
        y: ARENA_BOUNDARY_CENTER.y + ((Number(layoutPillar?.offsetY) || 0) * ARENA_BOUNDARY_RADIUS)
      },
      radius + ROUND_PILLAR_BOUNDARY_PADDING
    );
    generatedPillars.push({
      pillarId: createRoundPillarId(match),
      position: candidate,
      radius,
      spawnedAt: now
    });
  }

  return generatedPillars;
}

function getPlayerMaxHealth(matchPlayer) {
  const parsed = Number(matchPlayer?.maxHealth);
  return Math.max(1, Number.isFinite(parsed) ? parsed : PLAYER_MAX_HEALTH);
}

function getPlayerCurrentHealth(matchPlayer) {
  const maxHealth = getPlayerMaxHealth(matchPlayer);
  const parsed = Number(matchPlayer?.currentHealth);
  const resolved = Number.isFinite(parsed) ? parsed : maxHealth;
  return Math.max(0, Math.min(maxHealth, resolved));
}


function createWallEntity(match, ownerPlayerNumber, position, direction, now) {
  const halfLength = getAbilityNumber(ABILITY_IDS.WALL, 'halfLength', 1.9, 0.05);
  const halfThickness = getAbilityNumber(ABILITY_IDS.WALL, 'halfThickness', 0.36, 0.03);
  const durationMs = getAbilityNumber(ABILITY_IDS.WALL, 'durationMs', 4500, 100);
  return {
    wallId: createWallId(match),
    ownerPlayerNumber: Number(ownerPlayerNumber) || 0,
    position: clonePosition(position) || { x: 0, y: 0 },
    direction: getWallDirection({ direction }),
    halfLength,
    halfThickness,
    spawnedAt: Number(now) || Date.now(),
    expiresAt: (Number(now) || Date.now()) + durationMs
  };
}

function pruneExpiredWalls(match, timestamp = Date.now()) {
  if (!match) return;
  const now = Number(timestamp) || Date.now();
  const currentWalls = Array.isArray(match.walls) ? match.walls : [];
  const activeWalls = [];
  currentWalls.forEach((wall) => {
    if (isWallActive(wall, now)) {
      activeWalls.push(wall);
      return;
    }
    logLifecycle('ability', 'wall_expired', {
      code: match.roomCode,
      wallId: wall.wallId || '-',
      owner: Number(wall.ownerPlayerNumber) || 0
    });
  });
  match.walls = activeWalls;
}

function ensurePlayerPositionHistory(matchPlayer, timestamp = Date.now()) {
  if (!matchPlayer || typeof matchPlayer !== 'object') return [];
  if (!Array.isArray(matchPlayer.positionHistory)) {
    matchPlayer.positionHistory = [];
  }

  const now = Number(timestamp) || Date.now();
  const historyIntervalMs = getAbilityNumber(ABILITY_IDS.REWIND, 'historyIntervalMs', 70, 10);
  const historyWindowMs = getAbilityNumber(ABILITY_IDS.REWIND, 'historyMs', 2200, 100);
  const history = matchPlayer.positionHistory;
  const position = clonePosition(matchPlayer.position) || { x: 0, y: 0 };
  const lastEntry = history.length ? history[history.length - 1] : null;
  const shouldPush = !lastEntry
    || (now - Number(lastEntry.timestamp || 0)) >= historyIntervalMs
    || Math.hypot(position.x - Number(lastEntry.x || 0), position.y - Number(lastEntry.y || 0)) >= 0.08;

  if (shouldPush) {
    history.push({
      x: position.x,
      y: position.y,
      timestamp: now
    });
  }

  const minTimestamp = now - historyWindowMs;
  while (history.length > 1 && Number(history[0].timestamp || 0) < minTimestamp) {
    history.shift();
  }
  return history;
}

function hasSpellInLoadout(matchPlayer, spellId) {
  const normalizedSpellId = normalizeSpellId(spellId);
  if (!normalizedSpellId) return false;
  const draftedLoadout = Array.isArray(matchPlayer?.loadoutSpells) ? matchPlayer.loadoutSpells : [];
  const fullLoadout = Array.isArray(matchPlayer?.loadout) ? matchPlayer.loadout : [];
  const combined = [...draftedLoadout, ...fullLoadout]
    .map((entry) => normalizeSpellId(entry))
    .filter(Boolean);
  return combined.includes(normalizedSpellId);
}

function getAbilityDef(abilityId) {
  const normalizedAbilityId = normalizeSpellId(abilityId);
  if (!normalizedAbilityId) return null;
  return ABILITY_DEFS[normalizedAbilityId] || null;
}

function normalizeAbilityCooldownMap(value) {
  if (!value || typeof value !== 'object') return {};
  const map = {};
  Object.keys(value).forEach((abilityId) => {
    const normalizedAbilityId = normalizeSpellId(abilityId);
    if (!normalizedAbilityId) return;
    const readyAt = Number(value[abilityId]) || 0;
    map[normalizedAbilityId] = readyAt;
  });
  return map;
}

function getAbilityReadyAt(matchPlayer, abilityId) {
  const normalizedAbilityId = normalizeSpellId(abilityId);
  if (!normalizedAbilityId || !matchPlayer) return 0;
  const cooldowns = normalizeAbilityCooldownMap(matchPlayer.abilityCooldowns);
  const fromMap = Number(cooldowns[normalizedAbilityId]) || 0;
  if (fromMap > 0) return fromMap;

  if (normalizedAbilityId === ABILITY_IDS.FIREBLAST) {
    return Number(matchPlayer.nextFireblastAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.BLINK) {
    return Number(matchPlayer.nextBlinkAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.SHIELD) {
    return Number(matchPlayer.nextShieldAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.PRISM) {
    return Number(matchPlayer.nextPrismAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.GUST) {
    return Number(matchPlayer.nextGustAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.CHARGE) {
    return Number(matchPlayer.nextChargeAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.SHOCK) {
    return Number(matchPlayer.nextShockAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.HOOK) {
    return Number(matchPlayer.nextHookAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.SOLAR) {
    return Number(matchPlayer.nextSolarAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.RIFT) {
    return Number(matchPlayer.nextRiftAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.PHANTOM) {
    return Number(matchPlayer.nextPhantomAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.WALL) {
    return Number(matchPlayer.nextWallAt) || 0;
  }
  if (normalizedAbilityId === ABILITY_IDS.REWIND) {
    return Number(matchPlayer.nextRewindAt) || 0;
  }
  return 0;
}

function setAbilityReadyAt(matchPlayer, abilityId, readyAt) {
  const normalizedAbilityId = normalizeSpellId(abilityId);
  if (!normalizedAbilityId || !matchPlayer) return;
  const nextReadyAt = Math.max(0, Number(readyAt) || 0);
  const currentMap = normalizeAbilityCooldownMap(matchPlayer.abilityCooldowns);
  currentMap[normalizedAbilityId] = nextReadyAt;
  matchPlayer.abilityCooldowns = currentMap;

  if (normalizedAbilityId === ABILITY_IDS.FIREBLAST) {
    matchPlayer.nextFireblastAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.BLINK) {
    matchPlayer.nextBlinkAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.SHIELD) {
    matchPlayer.nextShieldAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.PRISM) {
    matchPlayer.nextPrismAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.GUST) {
    matchPlayer.nextGustAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.CHARGE) {
    matchPlayer.nextChargeAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.SHOCK) {
    matchPlayer.nextShockAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.HOOK) {
    matchPlayer.nextHookAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.SOLAR) {
    matchPlayer.nextSolarAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.RIFT) {
    matchPlayer.nextRiftAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.PHANTOM) {
    matchPlayer.nextPhantomAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.WALL) {
    matchPlayer.nextWallAt = nextReadyAt;
  } else if (normalizedAbilityId === ABILITY_IDS.REWIND) {
    matchPlayer.nextRewindAt = nextReadyAt;
  }
}

function getAbilityRemainingMs(matchPlayer, abilityId, now = Date.now()) {
  const readyAt = getAbilityReadyAt(matchPlayer, abilityId);
  if (readyAt <= 0) return 0;
  return Math.max(0, readyAt - (Number(now) || Date.now()));
}

function getPlayerActiveShieldUntil(matchPlayer) {
  const fromLegacy = Number(matchPlayer?.activeShieldUntil) || 0;
  const fromEffects = Number(matchPlayer?.activeEffects?.shieldUntil) || 0;
  return Math.max(fromLegacy, fromEffects, 0);
}

function setPlayerActiveShieldUntil(matchPlayer, shieldUntil) {
  const nextShieldUntil = Math.max(0, Number(shieldUntil) || 0);
  matchPlayer.activeShieldUntil = nextShieldUntil;
  matchPlayer.activeEffects = {
    ...(matchPlayer.activeEffects || {}),
    shieldUntil: nextShieldUntil
  };
}

function isShieldActive(matchPlayer, timestamp = Date.now()) {
  return getPlayerActiveShieldUntil(matchPlayer) > (Number(timestamp) || Date.now());
}

function getPlayerActivePrismUntil(matchPlayer) {
  const fromLegacy = Number(matchPlayer?.activePrismUntil) || 0;
  const fromEffects = Number(matchPlayer?.activeEffects?.prismUntil) || 0;
  return Math.max(fromLegacy, fromEffects, 0);
}

function setPlayerActivePrismUntil(matchPlayer, prismUntil) {
  const nextPrismUntil = Math.max(0, Number(prismUntil) || 0);
  matchPlayer.activePrismUntil = nextPrismUntil;
  matchPlayer.activeEffects = {
    ...(matchPlayer.activeEffects || {}),
    prismUntil: nextPrismUntil
  };
}

function isPrismActive(matchPlayer, timestamp = Date.now()) {
  return getPlayerActivePrismUntil(matchPlayer) > (Number(timestamp) || Date.now());
}

function getPlayerSolarDistortionUntil(matchPlayer) {
  const fromLegacy = Number(matchPlayer?.solarDistortionUntil) || 0;
  const fromEffects = Number(matchPlayer?.activeEffects?.solarDistortionUntil) || 0;
  return Math.max(fromLegacy, fromEffects, 0);
}

function setPlayerSolarDistortionUntil(matchPlayer, distortionUntil) {
  const nextDistortionUntil = Math.max(0, Number(distortionUntil) || 0);
  matchPlayer.solarDistortionUntil = nextDistortionUntil;
  matchPlayer.activeEffects = {
    ...(matchPlayer.activeEffects || {}),
    solarDistortionUntil: nextDistortionUntil
  };
}

function isSolarDistortionActive(matchPlayer, timestamp = Date.now()) {
  return getPlayerSolarDistortionUntil(matchPlayer) > (Number(timestamp) || Date.now());
}

function getPlayerRiftPendingState(matchPlayer) {
  const pending = matchPlayer?.activeEffects?.riftPending;
  if (!pending || typeof pending !== 'object') return null;
  const portalA = clonePosition(pending.portalA);
  if (!portalA) return null;
  const expiresAt = Number(pending.expiresAt) || 0;
  const createdAt = Number(pending.createdAt) || 0;
  return {
    portalA,
    createdAt,
    expiresAt
  };
}

function setPlayerRiftPendingState(matchPlayer, pendingState) {
  if (!matchPlayer) return;
  const normalizedPending = pendingState && typeof pendingState === 'object'
    ? {
      portalA: clonePosition(pendingState.portalA) || null,
      createdAt: Number(pendingState.createdAt) || Date.now(),
      expiresAt: Number(pendingState.expiresAt) || 0
    }
    : null;
  matchPlayer.activeEffects = {
    ...(matchPlayer.activeEffects || {}),
    riftPending: normalizedPending
  };
}

function clearPlayerRiftPendingState(matchPlayer) {
  if (!matchPlayer) return;
  matchPlayer.activeEffects = {
    ...(matchPlayer.activeEffects || {}),
    riftPending: null
  };
}

function getPlayerPhantomState(matchPlayer) {
  const phantom = matchPlayer?.activeEffects?.phantom;
  if (!phantom || typeof phantom !== 'object') return null;
  return phantom;
}

function setPlayerPhantomState(matchPlayer, phantomState) {
  if (!matchPlayer) return;
  matchPlayer.activeEffects = {
    ...(matchPlayer.activeEffects || {}),
    phantom: phantomState && typeof phantomState === 'object'
      ? { ...phantomState }
      : null
  };
}

function clearPlayerPhantomState(matchPlayer) {
  if (!matchPlayer) return;
  setPlayerPhantomState(matchPlayer, null);
}

function getPlayerPhantomVanishUntil(matchPlayer) {
  const phantom = getPlayerPhantomState(matchPlayer);
  return Math.max(0, Number(phantom?.vanishUntil) || 0);
}

function isPlayerPhantomUntargetable(matchPlayer, timestamp = Date.now()) {
  const now = Number(timestamp) || Date.now();
  return getPlayerPhantomVanishUntil(matchPlayer) > now;
}

function isPlayerTargetableForCombatHit(matchPlayer, timestamp = Date.now()) {
  if (!matchPlayer) return false;
  if (matchPlayer.connected === false) return false;
  if (getPlayerCurrentHealth(matchPlayer) <= 0) return false;
  if (isPlayerPhantomUntargetable(matchPlayer, timestamp)) return false;
  return true;
}

function getPrismFacingDirection(matchPlayer, fallbackDirection = { x: 1, y: 0 }) {
  const fromAim = normalizeInputVector(matchPlayer?.aim);
  if (fromAim.x !== 0 || fromAim.y !== 0) return fromAim;
  return normalizeInputVector(fallbackDirection);
}

function isPointInsidePrismCone(matchPlayer, incomingPoint, timestamp = Date.now()) {
  if (!matchPlayer) return false;
  const now = Number(timestamp) || Date.now();
  if (!isPrismActive(matchPlayer, now)) return false;
  const point = clonePosition(incomingPoint);
  const source = clonePosition(matchPlayer.position);
  if (!point || !source) return false;
  const dx = point.x - source.x;
  const dy = point.y - source.y;
  const distance = Math.hypot(dx, dy);
  const coneRange = getAbilityNumber(ABILITY_IDS.PRISM, 'range', 4.2, 0.1);
  if (distance > coneRange) return false;
  if (distance <= 0.0001) return true;
  const toPoint = { x: dx / distance, y: dy / distance };
  const facing = getPrismFacingDirection(matchPlayer, { x: -toPoint.x, y: -toPoint.y });
  const halfAngleDeg = Math.max(1, getAbilityNumber(ABILITY_IDS.PRISM, 'coneAngleDeg', 80, 1) * 0.5);
  const cosThreshold = Math.cos((halfAngleDeg * Math.PI) / 180);
  return dotProduct(facing, toPoint) >= cosThreshold;
}

function getPrismShieldGeometry(matchPlayer, timestamp = Date.now(), fallbackDirection = { x: 1, y: 0 }) {
  if (!matchPlayer) return null;
  const now = Number(timestamp) || Date.now();
  if (!isPrismActive(matchPlayer, now)) return null;
  const center = clonePosition(matchPlayer.position);
  if (!center) return null;
  const facing = getPrismFacingDirection(matchPlayer, fallbackDirection);
  const shieldOffsetFromCaster = getAbilityNumber(ABILITY_IDS.PRISM, 'shieldOffsetFromCaster', 0.40, 0);
  const shieldThickness = getAbilityNumber(ABILITY_IDS.PRISM, 'shieldThickness', 0.2736, 0.01);
  const shieldArcDeg = getAbilityNumber(ABILITY_IDS.PRISM, 'shieldArcDeg', 120, 1);
  const innerRadius = Math.max(PLAYER_RADIUS + 0.01, PLAYER_RADIUS + shieldOffsetFromCaster);
  const outerRadius = innerRadius + Math.max(0.01, shieldThickness);
  const halfAngleDeg = Math.max(1, shieldArcDeg * 0.5);
  const cosThreshold = Math.cos((halfAngleDeg * Math.PI) / 180);
  return {
    center,
    facing,
    innerRadius,
    outerRadius,
    cosThreshold
  };
}

function isPointInsidePrismShieldBand(matchPlayer, point, timestamp = Date.now(), options = {}) {
  const safePoint = clonePosition(point);
  if (!safePoint) return false;
  const radiusPadding = Math.max(0, Number(options?.radiusPadding) || 0);
  const fallbackDirection = normalizeInputVector(options?.fallbackDirection || { x: 1, y: 0 });
  const geometry = getPrismShieldGeometry(matchPlayer, timestamp, fallbackDirection);
  if (!geometry) return false;
  const dx = safePoint.x - geometry.center.x;
  const dy = safePoint.y - geometry.center.y;
  const distance = Math.hypot(dx, dy);
  const innerBound = Math.max(0, geometry.innerRadius - radiusPadding);
  const outerBound = geometry.outerRadius + radiusPadding;
  if (distance < innerBound || distance > outerBound) return false;
  if (distance <= 0.0001) return false;
  const toPoint = { x: dx / distance, y: dy / distance };
  return dotProduct(geometry.facing, toPoint) >= geometry.cosThreshold;
}

function isPathIntersectingPrismShieldBand(matchPlayer, previousPoint, currentPoint, timestamp = Date.now(), options = {}) {
  const from = clonePosition(previousPoint) || clonePosition(currentPoint);
  const to = clonePosition(currentPoint) || clonePosition(previousPoint);
  if (!to) return false;
  const radiusPadding = Math.max(0, Number(options?.radiusPadding) || 0);
  const fallbackDirection = normalizeInputVector(options?.fallbackDirection || { x: 1, y: 0 });

  if (isPointInsidePrismShieldBand(matchPlayer, from, timestamp, { radiusPadding, fallbackDirection })) return true;
  if (isPointInsidePrismShieldBand(matchPlayer, to, timestamp, { radiusPadding, fallbackDirection })) return true;
  if (!from) return false;

  const travelDx = to.x - from.x;
  const travelDy = to.y - from.y;
  const travelDistance = Math.hypot(travelDx, travelDy);
  if (travelDistance <= 0.0001) return false;
  const sampleStep = Math.max(0.04, radiusPadding * 0.65);
  const sampleCount = clamp(Math.ceil(travelDistance / sampleStep), 1, 18);
  for (let index = 1; index < sampleCount; index += 1) {
    const t = index / sampleCount;
    const samplePoint = {
      x: from.x + (travelDx * t),
      y: from.y + (travelDy * t)
    };
    if (isPointInsidePrismShieldBand(matchPlayer, samplePoint, timestamp, { radiusPadding, fallbackDirection })) {
      return true;
    }
  }
  return false;
}

function ensureMatchRifts(match) {
  if (!match || typeof match !== 'object') return [];
  if (!Array.isArray(match.rifts)) {
    match.rifts = [];
  }
  return match.rifts;
}

function isRiftPortalPointBlocked(match, point, portalRadius, timestamp = Date.now(), ignoreRiftId = '') {
  const now = Number(timestamp) || Date.now();
  const safePoint = clonePosition(point);
  if (!safePoint) return true;
  if (isInLavaHazard(safePoint)) return true;
  const blockingWall = findBlockingWallForPoint(
    safePoint,
    match?.walls,
    buildWallCollisionOptions(Math.max(0.02, Number(portalRadius) || 0.02), now)
  );
  if (blockingWall) return true;
  const blockingPillar = findBlockingRoundPillarForPoint(
    safePoint,
    match,
    { padding: Math.max(0.02, Number(portalRadius) || 0.02) }
  );
  if (blockingPillar) return true;

  const activeRifts = ensureMatchRifts(match);
  const safePortalRadius = Math.max(0.05, Number(portalRadius) || 0.05);
  for (const rift of activeRifts) {
    if (!rift || String(rift.riftId || '') === String(ignoreRiftId || '')) continue;
    if ((Number(rift.expiresAt) || 0) <= now) continue;
    const portalA = clonePosition(rift.portalA);
    const portalB = clonePosition(rift.portalB);
    if (!portalA || !portalB) continue;
    const otherRadius = Math.max(0.05, Number(rift.portalRadius) || safePortalRadius);
    const minDistance = safePortalRadius + otherRadius + 0.16;
    if (Math.hypot(safePoint.x - portalA.x, safePoint.y - portalA.y) < minDistance) return true;
    if (Math.hypot(safePoint.x - portalB.x, safePoint.y - portalB.y) < minDistance) return true;
  }
  return false;
}

function findRiftPortalPlacement(match, origin, direction, maxDistance, portalRadius, timestamp = Date.now(), ignoreRiftId = '') {
  const now = Number(timestamp) || Date.now();
  const baseOrigin = clonePosition(origin);
  if (!baseOrigin) return null;
  const dir = normalizeInputVector(direction);
  const maxRange = Math.max(0, Number(maxDistance) || 0);
  const safetyPadding = Math.max(0.05, Number(portalRadius) || 0.05) + 0.02;
  const candidateCount = 24;

  for (let index = 0; index <= candidateCount; index += 1) {
    const t = 1 - (index / candidateCount);
    const distance = maxRange * t;
    const rawCandidate = (dir.x === 0 && dir.y === 0)
      ? baseOrigin
      : {
        x: baseOrigin.x + (dir.x * distance),
        y: baseOrigin.y + (dir.y * distance)
      };
    const clampedCandidate = clampPositionInsideArena(rawCandidate, safetyPadding);
    const resolvedCandidate = resolvePointAgainstArenaBlockers(
      clampedCandidate,
      baseOrigin,
      match,
      {
        padding: Math.max(0.02, Number(portalRadius) || 0.02),
        timestamp: now
      }
    );
    if (!isRiftPortalPointBlocked(match, resolvedCandidate, portalRadius, now, ignoreRiftId)) {
      return resolvedCandidate;
    }
  }

  return null;
}

function createRiftPair(match, ownerPlayerNumber, portalA, portalB, now) {
  const durationMs = getAbilityNumber(ABILITY_IDS.RIFT, 'durationMs', 4000, 100);
  const portalRadius = getRiftPortalRadiusDefault();
  return {
    riftId: createRiftId(match),
    ownerPlayerNumber: Number(ownerPlayerNumber) || 0,
    portalA: clonePosition(portalA) || { x: 0, y: 0 },
    portalB: clonePosition(portalB) || { x: 0, y: 0 },
    portalRadius,
    teleportDelayMs: getRiftTeleportDelayMsDefault(),
    exitVelocityMultiplier: getRiftExitVelocityMultiplierDefault(),
    perPlayerReuseLockoutMs: getRiftReuseLockoutMsDefault(),
    linkedAt: Number(now) || Date.now(),
    expiresAt: (Number(now) || Date.now()) + durationMs,
    pendingTeleports: [],
    portalEntriesRemainingBySide: { A: 1, B: 1 },
    reuseLockoutUntilByPlayerNumber: {}
  };
}

function normalizeRiftPortalKey(portalKey) {
  return String(portalKey || '').toUpperCase() === 'B' ? 'B' : 'A';
}

function ensureRiftPortalEntriesRemainingBySide(rift) {
  const source = rift?.portalEntriesRemainingBySide;
  const normalized = source && typeof source === 'object'
    ? source
    : { A: 1, B: 1 };
  const sideA = Math.max(0, Number(normalized.A));
  const sideB = Math.max(0, Number(normalized.B));
  const resolved = {
    A: Number.isFinite(sideA) ? sideA : 1,
    B: Number.isFinite(sideB) ? sideB : 1
  };
  if (rift) {
    rift.portalEntriesRemainingBySide = resolved;
  }
  return resolved;
}

function queueRiftTeleport(rift, player, fromPortalKey, tickTimestamp) {
  if (!rift || !player) return false;
  const now = Number(tickTimestamp) || Date.now();
  const playerNumber = Number(player.matchPlayerNumber) || 0;
  if (playerNumber <= 0) return false;
  const fromPortal = normalizeRiftPortalKey(fromPortalKey);
  const entriesRemainingBySide = ensureRiftPortalEntriesRemainingBySide(rift);
  if ((Number(entriesRemainingBySide[fromPortal]) || 0) <= 0) return false;
  const pendingQueue = Array.isArray(rift.pendingTeleports) ? rift.pendingTeleports : [];
  if (pendingQueue.some((entry) => Number(entry?.playerNumber) === playerNumber)) return false;

  const teleportDelayMs = Math.max(1, Number(rift.teleportDelayMs) || getRiftTeleportDelayMsDefault());
  const toPortalKey = fromPortal === 'A' ? 'B' : 'A';
  const entryVelocity = sanitizeVector(player.velocity);
  const entryFacing = normalizeInputVector(player.aim);
  pendingQueue.push({
    playerNumber,
    fromPortal,
    toPortal: toPortalKey,
    queuedAt: now,
    executeAt: now + teleportDelayMs,
    entryVelocity,
    entryFacing
  });
  rift.pendingTeleports = pendingQueue;
  rift.portalEntriesRemainingBySide = {
    ...entriesRemainingBySide,
    [fromPortal]: Math.max(0, (Number(entriesRemainingBySide[fromPortal]) || 0) - 1)
  };
  rift.reuseLockoutUntilByPlayerNumber = {
    ...(rift.reuseLockoutUntilByPlayerNumber || {}),
    [playerNumber]: now + teleportDelayMs
  };
  return true;
}

function processRiftPendingTeleports(room, match, rift, tickTimestamp) {
  if (!rift || !match) return;
  const now = Number(tickTimestamp) || Date.now();
  const queue = Array.isArray(rift.pendingTeleports) ? rift.pendingTeleports : [];
  if (!queue.length) return;
  const remaining = [];

  queue.forEach((teleport) => {
    const executeAt = Number(teleport?.executeAt) || 0;
    if (executeAt > now) {
      remaining.push(teleport);
      return;
    }
    const playerNumber = Number(teleport?.playerNumber) || 0;
    const player = getMatchPlayerByNumber(match, playerNumber);
    if (!player || !isPlayerTargetableForCombatHit(player, now)) {
      return;
    }

    const destinationPortal = String(teleport?.toPortal || '').toUpperCase() === 'A'
      ? clonePosition(rift.portalA)
      : clonePosition(rift.portalB);
    if (!destinationPortal) return;

    const exitFacing = normalizeInputVector(teleport?.entryFacing);
    const safeExitFacing = (exitFacing.x !== 0 || exitFacing.y !== 0)
      ? exitFacing
      : normalizeInputVector(player.aim);
    const outwardDistance = Math.max(0.05, Number(rift.portalRadius) || getRiftPortalRadiusDefault()) + PLAYER_RADIUS + 0.06;
    const rawDestination = {
      x: destinationPortal.x + (safeExitFacing.x * outwardDistance),
      y: destinationPortal.y + (safeExitFacing.y * outwardDistance)
    };
    const clampedDestination = clampPositionInsideArena(rawDestination, PLAYER_RADIUS + 0.02);
    const safeDestination = resolvePointAgainstArenaBlockers(
      clampedDestination,
      player.position,
      match,
      {
        padding: PLAYER_RADIUS,
        timestamp: now
      }
    );

    player.position = safeDestination;
    const entryVelocity = sanitizeVector(teleport?.entryVelocity);
    const exitVelocityMultiplier = Math.max(0, Number(rift.exitVelocityMultiplier) || getRiftExitVelocityMultiplierDefault());
    player.velocity = {
      x: entryVelocity.x * exitVelocityMultiplier,
      y: entryVelocity.y * exitVelocityMultiplier
    };
    if (safeExitFacing.x !== 0 || safeExitFacing.y !== 0) {
      player.aim = safeExitFacing;
    }
    player.lastUpdated = now;
    ensurePlayerPositionHistory(player, now);

    const reuseLockoutMs = Math.max(0, Number(rift.perPlayerReuseLockoutMs) || getRiftReuseLockoutMsDefault());
    rift.reuseLockoutUntilByPlayerNumber = {
      ...(rift.reuseLockoutUntilByPlayerNumber || {}),
      [playerNumber]: now + reuseLockoutMs
    };

    const teleportEvent = createCombatEvent(match, {
      type: 'rift_teleport',
      abilityId: ABILITY_IDS.RIFT,
      sourcePlayerNumber: Number(rift.ownerPlayerNumber) || 0,
      targetPlayerNumber: playerNumber,
      timestamp: now,
      metadata: {
        riftId: String(rift.riftId || ''),
        fromPortal: String(teleport?.fromPortal || ''),
        toPortal: String(teleport?.toPortal || ''),
        exitVelocityMultiplier
      }
    });
    pushMatchHitEvent(match, teleportEvent);
    logLifecycle('ability', 'rift_teleport', {
      code: room.code,
      riftId: rift.riftId,
      player: playerNumber
    });
  });

  rift.pendingTeleports = remaining;
}

function handleRiftRuntimeTick({ room, match, tickTimestamp }) {
  if (!room || !match) return;
  const now = Number(tickTimestamp) || Date.now();

  (Array.isArray(match.players) ? match.players : []).forEach((player) => {
    const pending = getPlayerRiftPendingState(player);
    if (!pending) return;
    if (Number(pending.expiresAt) > now) return;
    clearPlayerRiftPendingState(player);
    logLifecycle('ability', 'rift_pending_expired', {
      code: room.code,
      player: player.matchPlayerNumber
    });
  });

  const rifts = ensureMatchRifts(match);
  const activeRifts = [];
  rifts.forEach((rift) => {
    if (!rift) return;
    if ((Number(rift.expiresAt) || 0) <= now) return;

    processRiftPendingTeleports(room, match, rift, now);
    const entriesRemainingBySide = ensureRiftPortalEntriesRemainingBySide(rift);
    const portalRadius = Math.max(0.05, Number(rift.portalRadius) || getRiftPortalRadiusDefault());
    const lockouts = rift.reuseLockoutUntilByPlayerNumber && typeof rift.reuseLockoutUntilByPlayerNumber === 'object'
      ? rift.reuseLockoutUntilByPlayerNumber
      : {};
    rift.reuseLockoutUntilByPlayerNumber = lockouts;

    (Array.isArray(match.players) ? match.players : []).forEach((player) => {
      if (!isPlayerTargetableForCombatHit(player, now)) return;
      const playerNumber = Number(player.matchPlayerNumber) || 0;
      if (playerNumber <= 0) return;
      const lockoutUntil = Number(lockouts[playerNumber]) || 0;
      if (lockoutUntil > now) return;
      if (Array.isArray(rift.pendingTeleports) && rift.pendingTeleports.some((entry) => Number(entry?.playerNumber) === playerNumber)) {
        return;
      }

      const playerPosition = clonePosition(player.position);
      const portalA = clonePosition(rift.portalA);
      const portalB = clonePosition(rift.portalB);
      if (!playerPosition || !portalA || !portalB) return;
      const inPortalA = Math.hypot(playerPosition.x - portalA.x, playerPosition.y - portalA.y) <= portalRadius;
      const inPortalB = Math.hypot(playerPosition.x - portalB.x, playerPosition.y - portalB.y) <= portalRadius;
      if (!inPortalA && !inPortalB) return;
      const fromPortal = inPortalA ? 'A' : 'B';
      if ((Number(entriesRemainingBySide[fromPortal]) || 0) <= 0) return;

      const queued = queueRiftTeleport(rift, player, fromPortal, now);
      if (!queued) return;
      const enterEvent = createCombatEvent(match, {
        type: 'rift_enter',
        abilityId: ABILITY_IDS.RIFT,
        sourcePlayerNumber: Number(rift.ownerPlayerNumber) || 0,
        targetPlayerNumber: playerNumber,
        timestamp: now,
        metadata: {
          riftId: String(rift.riftId || ''),
          portal: fromPortal
        }
      });
      pushMatchHitEvent(match, enterEvent);
    });

    const pendingCount = Array.isArray(rift.pendingTeleports) ? rift.pendingTeleports.length : 0;
    const sideARemaining = Number(rift.portalEntriesRemainingBySide?.A) || 0;
    const sideBRemaining = Number(rift.portalEntriesRemainingBySide?.B) || 0;
    if (sideARemaining <= 0 && sideBRemaining <= 0 && pendingCount <= 0) {
      return;
    }

    activeRifts.push(rift);
  });
  match.rifts = activeRifts;
}

function createPhantomSplitOffset(splitRadius) {
  const radius = Math.max(0.05, Number(splitRadius) || 0.65);
  const angle = Math.random() * Math.PI * 2;
  const distance = radius * (0.45 + (Math.random() * 0.55));
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance
  };
}

function createPhantomIllusionVelocity(speed = PLAYER_BASE_MOVE_SPEED * 0.7) {
  const safeSpeed = Math.max(0.2, Number(speed) || (PLAYER_BASE_MOVE_SPEED * 0.7));
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.cos(angle) * safeSpeed,
    y: Math.sin(angle) * safeSpeed
  };
}

function getNextPhantomIllusionRetargetAt(now = Date.now()) {
  const baseNow = Number(now) || Date.now();
  return baseNow + 240 + Math.round(Math.random() * 320);
}

function getPhantomIllusionFacingTowardOpponent(match, ownerPlayer, illusionPosition, fallbackDirection = { x: 1, y: 0 }) {
  const sourcePosition = clonePosition(illusionPosition) || clonePosition(ownerPlayer?.position);
  const opponent = getOpponentPlayer(match, ownerPlayer?.matchPlayerNumber);
  const opponentPosition = clonePosition(opponent?.position);

  if (sourcePosition && opponentPosition) {
    const directionToOpponent = normalizeInputVector({
      x: opponentPosition.x - sourcePosition.x,
      y: opponentPosition.y - sourcePosition.y
    });
    if (directionToOpponent.x !== 0 || directionToOpponent.y !== 0) {
      return directionToOpponent;
    }
  }

  const ownerAim = normalizeInputVector(ownerPlayer?.aim);
  if (ownerAim.x !== 0 || ownerAim.y !== 0) {
    return ownerAim;
  }

  const fallback = normalizeInputVector(fallbackDirection);
  if (fallback.x !== 0 || fallback.y !== 0) {
    return fallback;
  }

  return { x: 1, y: 0 };
}

function handlePhantomRuntimeTick({ room, match, tickTimestamp }) {
  if (!room || !match) return;
  const now = Number(tickTimestamp) || Date.now();
  const illusionLifetimeMs = getAbilityNumber(ABILITY_IDS.PHANTOM, 'illusionLifetimeMs', 2000, 50);
  const illusionSpeed = Math.max(0.2, PLAYER_BASE_MOVE_SPEED * 0.68);

  (Array.isArray(match.players) ? match.players : []).forEach((player) => {
    const phantom = getPlayerPhantomState(player);
    if (!phantom) return;

    const vanishUntil = Number(phantom.vanishUntil) || 0;
    if (vanishUntil > now) {
      const origin = clonePosition(phantom.origin) || clonePosition(player.position);
      if (origin) {
        player.position = origin;
      }
      player.velocity = { x: 0, y: 0 };
      player.input = { x: 0, y: 0 };
      player.lastUpdated = now;
      return;
    }

    const hasSplitApplied = phantom.splitApplied === true;
    if (!hasSplitApplied) {
      const splitOffset = sanitizeVector(phantom.splitOffset);
      const origin = clonePosition(phantom.origin) || clonePosition(player.position) || { x: 0, y: 0 };
      const rawRealPosition = {
        x: origin.x + splitOffset.x,
        y: origin.y + splitOffset.y
      };
      const clampedRealPosition = clampPositionInsideArena(rawRealPosition, PLAYER_RADIUS + 0.02);
      const safeRealPosition = resolvePointAgainstArenaBlockers(
        clampedRealPosition,
        player.position,
        match,
        {
          padding: PLAYER_RADIUS,
          timestamp: now
        }
      );
      player.position = safeRealPosition;
      player.velocity = { x: 0, y: 0 };
      player.input = { x: 0, y: 0 };
      player.lastUpdated = now;
      ensurePlayerPositionHistory(player, now);

      const illusionOffset = {
        x: -splitOffset.x * 2,
        y: -splitOffset.y * 2
      };
      const initialIllusionPosition = clampPositionInsideArena({
        x: safeRealPosition.x + illusionOffset.x,
        y: safeRealPosition.y + illusionOffset.y
      }, 0.02);
      const illusionVelocity = createPhantomIllusionVelocity(illusionSpeed);
      const illusionFacing = getPhantomIllusionFacingTowardOpponent(
        match,
        player,
        initialIllusionPosition,
        illusionVelocity
      );

      setPlayerPhantomState(player, {
        ...phantom,
        vanishUntil: 0,
        splitApplied: true,
        illusionOffset,
        illusionPosition: initialIllusionPosition,
        illusionFacing,
        illusionVelocity,
        illusionRetargetAt: getNextPhantomIllusionRetargetAt(now),
        illusionLastUpdatedAt: now,
        illusionExpiresAt: now + illusionLifetimeMs
      });

      const splitEvent = createCombatEvent(match, {
        type: 'phantom_split',
        abilityId: ABILITY_IDS.PHANTOM,
        sourcePlayerNumber: player.matchPlayerNumber,
        targetPlayerNumber: player.matchPlayerNumber,
        timestamp: now,
        metadata: {
          illusionLifetimeMs,
          splitRadius: Math.hypot(splitOffset.x, splitOffset.y)
        }
      });
      pushMatchHitEvent(match, splitEvent);
      return;
    }

    const illusionExpiresAt = Number(phantom.illusionExpiresAt) || 0;
    if (illusionExpiresAt <= now) {
      clearPlayerPhantomState(player);
      return;
    }

    const previousIllusionPosition = clonePosition(phantom.illusionPosition)
      || clonePosition(player.position)
      || { x: 0, y: 0 };
    const lastUpdatedAt = Number(phantom.illusionLastUpdatedAt) || now;
    const deltaSec = Math.max(0, Math.min(0.08, (now - lastUpdatedAt) / 1000));
    let illusionVelocity = sanitizeVector(phantom.illusionVelocity);
    let illusionRetargetAt = Number(phantom.illusionRetargetAt) || 0;

    if (illusionVelocity.x === 0 && illusionVelocity.y === 0) {
      illusionVelocity = createPhantomIllusionVelocity(illusionSpeed);
    }

    if (illusionRetargetAt <= now) {
      illusionVelocity = createPhantomIllusionVelocity(illusionSpeed);
      illusionRetargetAt = getNextPhantomIllusionRetargetAt(now);
    }

    const proposedIllusionPosition = {
      x: previousIllusionPosition.x + (illusionVelocity.x * deltaSec),
      y: previousIllusionPosition.y + (illusionVelocity.y * deltaSec)
    };
    const clampedIllusionPosition = clampPositionInsideArena(proposedIllusionPosition, 0.06);
    const resolvedIllusionPosition = resolvePointAgainstArenaBlockers(
      clampedIllusionPosition,
      previousIllusionPosition,
      match,
      {
        padding: 0.05,
        timestamp: now
      }
    );
    const movedDistance = Math.hypot(
      resolvedIllusionPosition.x - previousIllusionPosition.x,
      resolvedIllusionPosition.y - previousIllusionPosition.y
    );
    if (deltaSec > 0.001 && movedDistance < (illusionSpeed * deltaSec * 0.2)) {
      illusionVelocity = createPhantomIllusionVelocity(illusionSpeed);
      illusionRetargetAt = Math.min(illusionRetargetAt, now + 120);
    }

    const nextFacing = getPhantomIllusionFacingTowardOpponent(
      match,
      player,
      resolvedIllusionPosition,
      illusionVelocity
    );
    setPlayerPhantomState(player, {
      ...phantom,
      vanishUntil: 0,
      splitApplied: true,
      illusionPosition: resolvedIllusionPosition,
      illusionFacing: nextFacing,
      illusionVelocity,
      illusionRetargetAt,
      illusionLastUpdatedAt: now
    });
  });
}

function buildAbilityCooldownSnapshot(matchPlayer, now = Date.now()) {
  const cooldowns = {};
  Object.values(ABILITY_DEFS).forEach((abilityDef) => {
    const abilityId = abilityDef.id;
    cooldowns[abilityId] = getAbilityRemainingMs(matchPlayer, abilityId, now);
  });
  return cooldowns;
}

function buildAbilityReadyAtSnapshot(matchPlayer) {
  const readyAt = {};
  Object.values(ABILITY_DEFS).forEach((abilityDef) => {
    readyAt[abilityDef.id] = getAbilityReadyAt(matchPlayer, abilityDef.id);
  });
  return readyAt;
}

function transitionMatchPhase(room, nextPhase, reason = 'phase_transition', timestamp = Date.now()) {
  if (!room?.match) return false;
  const match = room.match;
  const previousPhase = String(match.phase || '');
  const targetPhase = String(nextPhase || '');
  if (!targetPhase) return false;
  if (previousPhase === targetPhase) {
    logLifecycle('phase', 'transition_ignored_same_phase', {
      code: room.code,
      phase: targetPhase,
      reason
    });
    return true;
  }
  if (!isAllowedPhaseTransition(previousPhase, targetPhase)) {
    logLifecycle('phase', 'transition_rejected_invalid', {
      code: room.code,
      from: previousPhase || '-',
      to: targetPhase,
      reason
    });
    return false;
  }

  match.phase = targetPhase;
  match.lastTickAt = Number(timestamp) || Date.now();
  match.lastBroadcastAt = Number(timestamp) || Date.now();
  logLifecycle('phase', 'transition', {
    code: room.code,
    from: previousPhase || '-',
    to: targetPhase,
    reason
  });
  return true;
}

function resetTransientMatchPlayerState(matchPlayer, timestamp = Date.now()) {
  if (!matchPlayer || typeof matchPlayer !== 'object') return;
  const now = Number(timestamp) || Date.now();
  matchPlayer.input = { x: 0, y: 0 };
  matchPlayer.velocity = { x: 0, y: 0 };
  matchPlayer.lastUpdated = now;
  setPlayerActiveShieldUntil(matchPlayer, 0);
  setPlayerActivePrismUntil(matchPlayer, 0);
  setPlayerSolarDistortionUntil(matchPlayer, 0);
  clearPlayerRiftPendingState(matchPlayer);
  clearPlayerPhantomState(matchPlayer);
  matchPlayer.activeEffects = {
    ...(matchPlayer.activeEffects || {}),
    shieldUntil: 0,
    prismUntil: 0,
    solarDistortionUntil: 0,
    charge: null,
    riftPending: null,
    phantom: null
  };
}

function ensureRoundWinsByPlayerNumber(match) {
  if (!match || typeof match !== 'object') {
    return { 1: 0, 2: 0 };
  }
  if (!match.roundWinsByPlayerNumber || typeof match.roundWinsByPlayerNumber !== 'object') {
    match.roundWinsByPlayerNumber = { 1: 0, 2: 0 };
  }
  const wins = match.roundWinsByPlayerNumber;
  wins[1] = Math.max(0, Number(wins[1]) || 0);
  wins[2] = Math.max(0, Number(wins[2]) || 0);
  return wins;
}

function getMatchRoundsNeededToWin(match) {
  return Math.max(1, Number(match?.roundsNeededToWin) || MATCH_ROUNDS_NEEDED_TO_WIN);
}

function clearTransientRoundMatchState(match, timestamp = Date.now()) {
  if (!match) return;
  const now = Number(timestamp) || Date.now();
  match.projectiles = [];
  match.walls = [];
  match.roundPillars = [];
  match.rifts = [];
  match.pendingAbilityCasts = [];
  match.hitEvents = [];
  match.resolvedProjectileIds = {};
  match.isPaused = false;
  match.pauseReason = '';
  match.pausedByPlayerNumber = null;
  match.pausedAt = null;
  if (match.analytics && typeof match.analytics === 'object') {
    match.analytics.playerLastImpactByNumber = {};
    match.analytics.lastUpdatedAt = now;
  }
}

function resetMatchPlayerForRoundStart(match, matchPlayer, timestamp = Date.now()) {
  if (!match || !matchPlayer) return;
  const now = Number(timestamp) || Date.now();
  const playerNumber = Number(matchPlayer.matchPlayerNumber) || 0;
  const spawnPosition = playerNumber === 1
    ? clonePosition(match.spawnPositions?.player1)
    : playerNumber === 2
      ? clonePosition(match.spawnPositions?.player2)
      : null;

  resetTransientMatchPlayerState(matchPlayer, now);
  if (spawnPosition) {
    matchPlayer.position = spawnPosition;
  }
  matchPlayer.velocity = { x: 0, y: 0 };
  matchPlayer.input = { x: 0, y: 0 };
  matchPlayer.aim = playerNumber === 2 ? { x: -1, y: 0 } : { x: 1, y: 0 };
  matchPlayer.lastAimUpdated = now;
  matchPlayer.eliminated = false;
  matchPlayer.lastHitAt = 0;
  matchPlayer.hitInvulnerableUntil = 0;
  matchPlayer.currentHealth = getPlayerMaxHealth(matchPlayer);
  matchPlayer.lastDamagedAt = 0;
  matchPlayer.lastDamageCause = '';
  matchPlayer.lastDamageAbilityId = '';
  matchPlayer.lastDamageSourcePlayerNumber = 0;
  matchPlayer.lastLavaDamageAt = 0;
  Object.values(ABILITY_DEFS).forEach((abilityDef) => {
    setAbilityReadyAt(matchPlayer, abilityDef.id, 0);
  });
  matchPlayer.positionHistory = [];
  ensurePlayerPositionHistory(matchPlayer, now);
  matchPlayer.actionRateLimits = {};
  matchPlayer.recentAbilityRequests = {};
  matchPlayer.recentDraftRequests = {};
  matchPlayer.lastUpdated = now;
}

function resetCombatStateForRoundStart(match, timestamp = Date.now()) {
  if (!match) return;
  const now = Number(timestamp) || Date.now();
  clearTransientRoundMatchState(match, now);
  match.roundPillars = generateRoundPillarsForMatchRound(match, now);
  (Array.isArray(match.players) ? match.players : []).forEach((player) => {
    resetMatchPlayerForRoundStart(match, player, now);
  });
  match.eliminatedPlayerNumber = null;
  match.winnerPlayerNumber = null;
  match.eliminationCause = null;
  match.matchEndReason = null;
  match.endedAt = null;
  match.roundEndAt = null;
  match.nextRoundStartsAt = null;
}

function resolveRoundOutcome(match, eliminatedPlayer, winnerPlayer) {
  if (!match) return { winnerNumber: null, eliminatedNumber: null };
  let eliminatedNumber = Number(eliminatedPlayer?.matchPlayerNumber) || 0;
  let winnerNumber = Number(winnerPlayer?.matchPlayerNumber) || 0;

  if (eliminatedNumber > 0 && (winnerNumber <= 0 || winnerNumber === eliminatedNumber)) {
    winnerNumber = Number(getOpponentPlayer(match, eliminatedNumber)?.matchPlayerNumber) || 0;
  }
  if (winnerNumber > 0 && (eliminatedNumber <= 0 || eliminatedNumber === winnerNumber)) {
    eliminatedNumber = Number(getOpponentPlayer(match, winnerNumber)?.matchPlayerNumber) || 0;
  }

  if (winnerNumber <= 0 || eliminatedNumber <= 0 || winnerNumber === eliminatedNumber) {
    const connectedPlayers = (Array.isArray(match.players) ? match.players : [])
      .filter((player) => Number(player?.matchPlayerNumber) > 0)
      .map((player) => Number(player.matchPlayerNumber));
    const fallbackWinner = connectedPlayers.includes(1) ? 1 : connectedPlayers[0] || 1;
    const fallbackEliminated = fallbackWinner === 1 ? 2 : 1;
    return {
      winnerNumber: fallbackWinner,
      eliminatedNumber: fallbackEliminated
    };
  }

  return { winnerNumber, eliminatedNumber };
}

function startRoundCountdown(room, roundNumber, reason = 'round_start', timestamp = Date.now()) {
  if (!room?.match) return false;
  const match = room.match;
  if (match.phase === MATCH_PHASE_MATCH_END) return false;
  const now = Number(timestamp) || Date.now();
  const nextRoundNumber = clamp(
    Number(roundNumber) || 1,
    1,
    Math.max(MATCH_MAX_ROUNDS, Number(match.maxRounds) || MATCH_MAX_ROUNDS)
  );

  resetCombatStateForRoundStart(match, now);
  match.roundNumber = nextRoundNumber;
  match.currentRoundStartedAt = now;
  match.combatStartsAt = now + COMBAT_START_COUNTDOWN_MS;
  match.combatCountdownSeconds = COMBAT_START_COUNTDOWN_SECONDS;
  const didTransition = transitionMatchPhase(
    room,
    MATCH_PHASE_COMBAT_COUNTDOWN,
    reason,
    now
  );
  if (!didTransition) return false;

  setRoomState(room, ROOM_STATES.COMBAT, reason);
  logLifecycle('round', 'countdown_started', {
    code: room.code,
    matchId: match.matchId,
    round: match.roundNumber,
    combatStartsAt: match.combatStartsAt,
    countdownSeconds: match.combatCountdownSeconds
  });
  return true;
}

function finalizeMatchEnd(room, {
  winnerNumber = null,
  eliminatedNumber = null,
  reason = 'match_end',
  timestamp = Date.now()
} = {}) {
  const match = room?.match;
  if (!match) return false;
  if (match.phase === MATCH_PHASE_MATCH_END) return false;
  const endedAt = Number(timestamp) || Date.now();
  const didTransition = transitionMatchPhase(room, MATCH_PHASE_MATCH_END, reason, endedAt);
  if (!didTransition) return false;
  setRoomState(room, ROOM_STATES.MATCH_END, reason);

  const safeWinnerNumber = Number(winnerNumber) || null;
  const safeEliminatedNumber = Number(eliminatedNumber) || null;
  clearTransientRoundMatchState(match, endedAt);
  match.eliminatedPlayerNumber = safeEliminatedNumber;
  match.winnerPlayerNumber = safeWinnerNumber;
  match.endedAt = endedAt;
  match.matchEndReason = String(reason || 'match_end');
  match.eliminationCause = String(reason || 'match_end');
  match.roundEndAt = endedAt;
  match.nextRoundStartsAt = null;
  match.lastRoundWinnerPlayerNumber = safeWinnerNumber;
  match.lastRoundEndedAt = endedAt;
  match.lastRoundEndReason = String(reason || 'match_end');

  (Array.isArray(match.players) ? match.players : []).forEach((player) => {
    resetTransientMatchPlayerState(player, endedAt);
    player.eliminated = Number(player?.matchPlayerNumber) === safeEliminatedNumber;
  });

  logLifecycle('match', 'winner_declared', {
    code: room.code,
    winner: safeWinnerNumber,
    eliminated: safeEliminatedNumber,
    reason: match.eliminationCause,
    endedAt
  });
  logMatchAnalyticsSummary(room, match, endedAt, reason);
  return true;
}

function transitionMatchToEnd(room, eliminatedPlayer, winnerPlayer, reason, timestamp) {
  const match = room?.match;
  if (!match) return false;
  if (match.phase === MATCH_PHASE_MATCH_END) return false;

  const endedAt = Number(timestamp) || Date.now();
  const normalizedReason = String(reason || 'match_end');
  const { winnerNumber, eliminatedNumber } = resolveRoundOutcome(match, eliminatedPlayer, winnerPlayer);
  const recentImpact = getRecentImpactForPlayer(match, eliminatedNumber, endedAt);
  if (recentImpact && Number(recentImpact.sourcePlayerNumber) === winnerNumber) {
    trackAbilityMetric(match, recentImpact.abilityId, 'eliminations', 1);
    logLifecycle('analytics', 'elimination_credit', {
      code: room.code,
      matchId: match.matchId,
      ability: recentImpact.abilityId,
      winner: winnerNumber,
      eliminated: eliminatedNumber,
      msSinceImpact: Math.max(0, endedAt - (Number(recentImpact.timestamp) || endedAt))
    });
  }

  const isForfeitLike = normalizedReason.includes('forfeit');
  const isBo3 = String(match.matchFormat || '').toLowerCase() === MATCH_FORMAT_BO3;
  const shouldResolveAsRound = isBo3 && match.phase === MATCH_PHASE_COMBAT && !isForfeitLike;

  if (!shouldResolveAsRound) {
    return finalizeMatchEnd(room, {
      winnerNumber,
      eliminatedNumber,
      reason: normalizedReason,
      timestamp: endedAt
    });
  }

  const roundWins = ensureRoundWinsByPlayerNumber(match);
  roundWins[winnerNumber] = Math.max(0, Number(roundWins[winnerNumber]) || 0) + 1;
  const winnerRoundWins = Number(roundWins[winnerNumber]) || 0;
  const roundsNeededToWin = getMatchRoundsNeededToWin(match);

  clearTransientRoundMatchState(match, endedAt);
  match.eliminatedPlayerNumber = eliminatedNumber;
  match.winnerPlayerNumber = winnerNumber;
  match.eliminationCause = normalizedReason;
  match.roundEndAt = endedAt;
  match.endedAt = null;
  match.matchEndReason = null;
  match.lastRoundWinnerPlayerNumber = winnerNumber;
  match.lastRoundEndedAt = endedAt;
  match.lastRoundEndReason = normalizedReason;

  (Array.isArray(match.players) ? match.players : []).forEach((player) => {
    resetTransientMatchPlayerState(player, endedAt);
    player.eliminated = Number(player?.matchPlayerNumber) === eliminatedNumber;
  });

  const hasMatchWinner = winnerRoundWins >= roundsNeededToWin;
  if (hasMatchWinner) {
    return finalizeMatchEnd(room, {
      winnerNumber,
      eliminatedNumber,
      reason: normalizedReason,
      timestamp: endedAt
    });
  }

  const didTransition = transitionMatchPhase(room, MATCH_PHASE_ROUND_END, 'round_completed', endedAt);
  if (!didTransition) return false;

  match.nextRoundStartsAt = endedAt + ROUND_END_INTERMISSION_MS;
  setRoomState(room, ROOM_STATES.COMBAT, 'round_completed');
  logLifecycle('round', 'ended', {
    code: room.code,
    matchId: match.matchId,
    round: Number(match.roundNumber) || 1,
    winner: winnerNumber,
    eliminated: eliminatedNumber,
    score: `${Number(roundWins[1]) || 0}-${Number(roundWins[2]) || 0}`,
    nextRoundStartsAt: match.nextRoundStartsAt
  });
  return true;
}

function createFireblastHitEvent(match, projectile, targetPlayer, now, metadata = null) {
  const fireblastKnockbackImpulse = getAbilityNumber(ABILITY_IDS.FIREBLAST, 'knockbackImpulse', 10.2, 0);
  const knockback = {
    x: projectile.direction.x * fireblastKnockbackImpulse,
    y: projectile.direction.y * fireblastKnockbackImpulse
  };
  return {
    hitId: createHitId(match),
    type: 'fireblast_hit',
    abilityId: ABILITY_IDS.FIREBLAST,
    timestamp: now,
    projectileId: projectile.projectileId,
    sourcePlayerNumber: projectile.ownerPlayerNumber,
    targetPlayerNumber: targetPlayer.matchPlayerNumber,
    knockback,
    metadata: metadata && typeof metadata === 'object' ? metadata : null
  };
}

function createCombatEvent(match, {
  type = 'combat_event',
  abilityId = '',
  sourcePlayerNumber = null,
  targetPlayerNumber = null,
  projectileId = '',
  timestamp = Date.now(),
  knockback = { x: 0, y: 0 },
  metadata = null
} = {}) {
  return {
    hitId: createHitId(match),
    type: String(type || 'combat_event'),
    abilityId: normalizeSpellId(abilityId),
    timestamp: Number(timestamp) || Date.now(),
    projectileId: String(projectileId || ''),
    sourcePlayerNumber: Number(sourcePlayerNumber) || 0,
    targetPlayerNumber: Number(targetPlayerNumber) || 0,
    knockback: { ...sanitizeVector(knockback) },
    metadata: metadata && typeof metadata === 'object' ? metadata : null
  };
}

function pushMatchHitEvent(match, hitEvent) {
  if (!Array.isArray(match.hitEvents)) {
    match.hitEvents = [];
  }
  match.hitEvents.push(hitEvent);
  const abilityId = normalizeSpellId(hitEvent?.abilityId);
  const type = String(hitEvent?.type || '');
  const sourcePlayerNumber = Number(hitEvent?.sourcePlayerNumber) || 0;
  const targetPlayerNumber = Number(hitEvent?.targetPlayerNumber) || 0;
  const timestamp = Number(hitEvent?.timestamp) || Date.now();
  const isOffensiveHit = type === 'fireblast_hit'
    || type === 'gust_hit'
    || type === 'shock_hit'
    || type === 'charge_hit'
    || type === 'hook_pull'
    || type === 'solar_hit';
  if (abilityId && isOffensiveHit) {
    trackAbilityMetric(match, abilityId, 'hitsLanded', 1);
    if (sourcePlayerNumber > 0 && targetPlayerNumber > 0) {
      trackPlayerRecentImpact(match, targetPlayerNumber, sourcePlayerNumber, abilityId, timestamp);
    }
  }
  if (match.hitEvents.length > MATCH_HIT_EVENT_HISTORY_LIMIT) {
    match.hitEvents.splice(0, match.hitEvents.length - MATCH_HIT_EVENT_HISTORY_LIMIT);
  }
}

function applyDamageToPlayer({
  room,
  match,
  targetPlayer,
  sourcePlayer = null,
  sourcePlayerNumber = null,
  abilityId = '',
  amount = 0,
  cause = 'spell_damage',
  timestamp = Date.now()
} = {}) {
  if (!room || !match || !targetPlayer) {
    return {
      applied: false,
      amount: 0,
      beforeHealth: 0,
      afterHealth: 0,
      eliminated: false
    };
  }

  const damageAmount = Math.max(0, Number(amount) || 0);
  if (damageAmount <= 0) {
    return {
      applied: false,
      amount: 0,
      beforeHealth: getPlayerCurrentHealth(targetPlayer),
      afterHealth: getPlayerCurrentHealth(targetPlayer),
      eliminated: false
    };
  }

  if (match.phase !== MATCH_PHASE_COMBAT) {
    return {
      applied: false,
      amount: 0,
      beforeHealth: getPlayerCurrentHealth(targetPlayer),
      afterHealth: getPlayerCurrentHealth(targetPlayer),
      eliminated: false
    };
  }

  const now = Number(timestamp) || Date.now();
  if (isPlayerPhantomUntargetable(targetPlayer, now)) {
    return {
      applied: false,
      amount: 0,
      beforeHealth: getPlayerCurrentHealth(targetPlayer),
      afterHealth: getPlayerCurrentHealth(targetPlayer),
      eliminated: false
    };
  }
  const maxHealth = getPlayerMaxHealth(targetPlayer);
  const beforeHealth = getPlayerCurrentHealth(targetPlayer);
  if (beforeHealth <= 0) {
    return {
      applied: false,
      amount: 0,
      beforeHealth,
      afterHealth: beforeHealth,
      eliminated: false
    };
  }

  if (isShieldActive(targetPlayer, now)) {
    return {
      applied: false,
      amount: 0,
      beforeHealth,
      afterHealth: beforeHealth,
      eliminated: false
    };
  }

  const afterHealth = Math.max(0, beforeHealth - damageAmount);
  const normalizedAbilityId = normalizeSpellId(abilityId) || '';
  const resolvedSourceNumber = Number(sourcePlayerNumber)
    || Number(sourcePlayer?.matchPlayerNumber)
    || 0;

  targetPlayer.maxHealth = maxHealth;
  targetPlayer.currentHealth = afterHealth;
  targetPlayer.lastDamagedAt = now;
  targetPlayer.lastDamageCause = String(cause || 'spell_damage');
  targetPlayer.lastDamageAbilityId = normalizedAbilityId;
  targetPlayer.lastDamageSourcePlayerNumber = resolvedSourceNumber;

  logLifecycle('damage', 'applied', {
    code: room.code,
    target: targetPlayer.matchPlayerNumber,
    source: resolvedSourceNumber || '-',
    cause: targetPlayer.lastDamageCause,
    ability: normalizedAbilityId || '-',
    amount: damageAmount,
    before: beforeHealth,
    after: afterHealth
  });

  if (afterHealth > 0) {
    return {
      applied: true,
      amount: damageAmount,
      beforeHealth,
      afterHealth,
      eliminated: false
    };
  }

  logLifecycle('damage', 'health_zero', {
    code: room.code,
    target: targetPlayer.matchPlayerNumber,
    cause: targetPlayer.lastDamageCause
  });

  const winnerPlayer = resolvedSourceNumber > 0
    ? getMatchPlayerByNumber(match, resolvedSourceNumber)
    : getOpponentPlayer(match, targetPlayer.matchPlayerNumber);
  const eliminated = transitionMatchToEnd(
    room,
    targetPlayer,
    winnerPlayer,
    targetPlayer.lastDamageCause || 'spell_damage',
    now
  );
  if (eliminated) {
    logLifecycle('damage', 'eliminated_by_health', {
      code: room.code,
      target: targetPlayer.matchPlayerNumber,
      winner: Number(winnerPlayer?.matchPlayerNumber) || 0,
      cause: targetPlayer.lastDamageCause
    });
  }

  return {
    applied: true,
    amount: damageAmount,
    beforeHealth,
    afterHealth,
    eliminated
  };
}

function applyLavaDamageTick(room, match, tickTimestamp) {
  if (!room || !match || match.phase !== MATCH_PHASE_COMBAT) return false;
  const now = Number(tickTimestamp) || Date.now();
  let appliedAnyDamage = false;

  (Array.isArray(match.players) ? match.players : []).forEach((player) => {
    if (!player || player.connected === false) return;
    if (getPlayerCurrentHealth(player) <= 0) return;
    if (isPlayerPhantomUntargetable(player, now)) return;
    if (!isInLavaHazard(player.position)) return;

    const lastLavaDamageAt = Number(player.lastLavaDamageAt) || 0;
    if (lastLavaDamageAt > 0 && (now - lastLavaDamageAt) < LAVA_DAMAGE_INTERVAL_MS) return;

    player.lastLavaDamageAt = now;
    logLifecycle('lava', 'tick', {
      code: room.code,
      target: player.matchPlayerNumber,
      intervalMs: LAVA_DAMAGE_INTERVAL_MS,
      damage: LAVA_DAMAGE_PER_TICK
    });

    const damageResult = applyDamageToPlayer({
      room,
      match,
      targetPlayer: player,
      sourcePlayer: null,
      sourcePlayerNumber: 0,
      abilityId: '',
      amount: LAVA_DAMAGE_PER_TICK,
      cause: 'lava_damage',
      timestamp: now
    });
    if (damageResult.applied) {
      appliedAnyDamage = true;
      const lavaEvent = createCombatEvent(match, {
        type: 'lava_damage',
        abilityId: '',
        sourcePlayerNumber: 0,
        targetPlayerNumber: player.matchPlayerNumber,
        timestamp: now,
        knockback: { x: 0, y: 0 },
        metadata: {
          damage: damageResult.amount,
          healthBefore: damageResult.beforeHealth,
          healthAfter: damageResult.afterHealth
        }
      });
      pushMatchHitEvent(match, lavaEvent);
    }
  });

  return appliedAnyDamage;
}

function getRoomReconnectStatus(room, now = Date.now()) {
  const disconnectedPlayers = (Array.isArray(room?.players) ? room.players : [])
    .filter((player) => player.connected === false)
    .map((player) => {
      const reconnectGraceExpiresAt = Number(player.reconnectGraceExpiresAt) || 0;
      const remainingMs = reconnectGraceExpiresAt > 0
        ? Math.max(0, reconnectGraceExpiresAt - now)
        : 0;
      return {
        playerId: player.playerId,
        slot: Number(player.slot) || null,
        matchPlayerNumber: Number(player.matchPlayerNumber) || null,
        disconnectedAt: Number(player.disconnectedAt) || null,
        reconnectGraceExpiresAt: reconnectGraceExpiresAt || null,
        remainingMs
      };
    });

  return {
    graceMs: RECONNECT_GRACE_MS,
    disconnectedPlayers
  };
}

function setMatchPauseState(match, paused, reason = '', pausedByPlayerNumber = null, timestamp = Date.now()) {
  if (
    !match
    || (
      match.phase !== MATCH_PHASE_COMBAT
      && match.phase !== MATCH_PHASE_COMBAT_COUNTDOWN
      && match.phase !== MATCH_PHASE_ROUND_END
    )
  ) {
    return;
  }

  if (paused) {
    if (match.isPaused === true && match.pauseReason === reason && Number(match.pausedByPlayerNumber) === Number(pausedByPlayerNumber)) {
      return;
    }
    match.isPaused = true;
    match.pauseReason = String(reason || 'paused');
    match.pausedByPlayerNumber = Number(pausedByPlayerNumber) || null;
    match.pausedAt = Number(timestamp) || Date.now();
    match.players.forEach((player) => {
      player.input = { x: 0, y: 0 };
    });
    return;
  }

  if (match.isPaused !== true) return;
  match.isPaused = false;
  match.pauseReason = '';
  match.pausedByPlayerNumber = null;
  match.pausedAt = null;
  match.lastTickAt = Number(timestamp) || Date.now();
}

function areAllPlayersReady(room) {
  return room.players.length === MAX_PLAYERS_PER_ROOM
    && getConnectedPlayerCount(room) === MAX_PLAYERS_PER_ROOM
    && room.players.every((player) => player.ready === true && player.connected !== false);
}

function getStateForRoom(room) {
  if (room.match) {
    if (room.match.phase === MATCH_PHASE_DRAFT) return ROOM_STATES.DRAFT;
    if (room.match.phase === MATCH_PHASE_MATCH_END) return ROOM_STATES.MATCH_END;
    if (room.match.phase === MATCH_PHASE_COMBAT_COUNTDOWN) return ROOM_STATES.COMBAT;
    if (room.match.phase === MATCH_PHASE_COMBAT) return ROOM_STATES.COMBAT;
    if (room.match.phase === MATCH_PHASE_ROUND_END) return ROOM_STATES.COMBAT;
    return ROOM_STATES.IN_MATCH;
  }
  if (room.players.length < MAX_PLAYERS_PER_ROOM) return ROOM_STATES.WAITING;
  if (getConnectedPlayerCount(room) < MAX_PLAYERS_PER_ROOM) return ROOM_STATES.WAITING;
  if (areAllPlayersReady(room)) return ROOM_STATES.STARTING;
  return ROOM_STATES.READY_CHECK;
}

function setRoomState(room, nextState, reason = 'sync') {
  const previousState = room.state || ROOM_STATES.WAITING;
  room.state = nextState;
  if (previousState !== nextState) {
    logLifecycle('room', 'state_change', {
      code: room.code,
      from: previousState,
      to: nextState,
      reason
    });
  }
  return room.state;
}

function refreshRoomState(room, reason = 'sync') {
  return setRoomState(room, getStateForRoom(room), reason);
}

function createMatchForRoom(room) {
  if (!room) return null;
  if (room.match) {
    logLifecycle('match', 'create_ignored_existing_match', {
      code: room.code,
      phase: room.match.phase || '-'
    });
    return room.match;
  }

  const startedAt = Date.now();

  room.players.forEach((player) => {
    player.matchPlayerNumber = player.slot;
    player.connected = true;
    player.disconnectedAt = null;
    player.reconnectGraceExpiresAt = null;
    clearReconnectGraceTimer(room.code, player.playerId);
    console.log(`[match] player_assignment code=${room.code} socket=${player.socketId} slot=${player.slot} matchPlayerNumber=${player.matchPlayerNumber}`);
  });

  const matchId = createMatchId(room.code);
  const spawnPositions = buildSpawnPositions();

  const matchPlayers = room.players.map((player) => ({
    playerId: player.playerId,
    name: normalizePlayerDisplayName(player.name, PLAYER_DISPLAY_NAME_FALLBACK),
    reconnectToken: player.reconnectToken,
    socketId: player.socketId,
    slot: player.slot,
    ready: Boolean(player.ready),
    matchPlayerNumber: player.matchPlayerNumber,
    position: player.matchPlayerNumber === 1
      ? clonePosition(spawnPositions.player1)
      : clonePosition(spawnPositions.player2),
    velocity: { x: 0, y: 0 },
    input: { x: 0, y: 0 },
    aim: player.matchPlayerNumber === 1 ? { x: 1, y: 0 } : { x: -1, y: 0 },
    lastAimUpdated: startedAt,
    lastHitAt: 0,
    hitInvulnerableUntil: 0,
    currentHealth: PLAYER_MAX_HEALTH,
    maxHealth: PLAYER_MAX_HEALTH,
    lastDamagedAt: 0,
    lastDamageCause: '',
    lastDamageAbilityId: '',
    lastDamageSourcePlayerNumber: 0,
    lastLavaDamageAt: 0,
    eliminated: false,
    connected: player.connected !== false,
    disconnectedAt: null,
    reconnectGraceExpiresAt: null,
    draftedSpells: [],
    loadoutSpells: [],
    loadout: ['fireblast'],
    abilityCooldowns: {
      fireblast: 0,
      blink: 0,
      shield: 0,
      prism: 0,
      gust: 0,
      charge: 0,
      shock: 0,
      hook: 0,
      solar: 0,
      rift: 0,
      phantom: 0,
      wall: 0,
      rewind: 0
    },
    actionRateLimits: {},
    recentAbilityRequests: {},
    recentDraftRequests: {},
    activeEffects: {
      shieldUntil: 0,
      prismUntil: 0,
      solarDistortionUntil: 0,
      charge: null,
      riftPending: null,
      phantom: null
    },
    lastUpdated: startedAt,
    nextFireblastAt: 0,
    nextBlinkAt: 0,
    nextShieldAt: 0,
    nextPrismAt: 0,
    nextGustAt: 0,
    nextChargeAt: 0,
    nextShockAt: 0,
    nextHookAt: 0,
    nextSolarAt: 0,
    nextRiftAt: 0,
    nextPhantomAt: 0,
    nextWallAt: 0,
    nextRewindAt: 0,
    activeShieldUntil: 0,
    activePrismUntil: 0,
    solarDistortionUntil: 0,
    positionHistory: []
  }));

  matchPlayers.forEach((player) => {
    ensurePlayerPositionHistory(player, startedAt);
  });

  const draftState = createDraftState(startedAt);

  room.match = {
    matchId,
    roomCode: room.code,
    startedAt,
    matchFormat: MATCH_FORMAT_BO3,
    roundsNeededToWin: MATCH_ROUNDS_NEEDED_TO_WIN,
    maxRounds: MATCH_MAX_ROUNDS,
    roundNumber: 1,
    roundWinsByPlayerNumber: {
      1: 0,
      2: 0
    },
    currentRoundStartedAt: null,
    roundEndAt: null,
    nextRoundStartsAt: null,
    lastRoundWinnerPlayerNumber: null,
    lastRoundEndedAt: null,
    lastRoundEndReason: '',
    phase: MATCH_PHASE_DRAFT,
    combatStartsAt: null,
    combatCountdownSeconds: COMBAT_START_COUNTDOWN_SECONDS,
    draft: draftState,
    players: matchPlayers,
    spawnPositions,
    projectiles: [],
    walls: [],
    roundPillars: [],
    rifts: [],
    pendingAbilityCasts: [],
    resolvedProjectileIds: {},
    nextProjectileSequence: 0,
    nextWallSequence: 0,
    nextRoundPillarSequence: 0,
    nextRiftSequence: 0,
    nextHitSequence: 0,
    hitEvents: [],
    analytics: {
      byAbility: {},
      playerLastImpactByNumber: {},
      createdAt: startedAt,
      lastUpdatedAt: startedAt
    },
    eliminatedPlayerNumber: null,
    winnerPlayerNumber: null,
    eliminationCause: null,
    endedAt: null,
    isPaused: false,
    pauseReason: '',
    pausedByPlayerNumber: null,
    pausedAt: null,
    lastTickAt: startedAt,
    lastBroadcastAt: 0,
    lastMoveLogAt: 0,
    matchStartedEmittedAt: 0,
    cleanupAt: null
  };
  ensureMatchAnalytics(room.match);

  logLifecycle('match', 'created', {
    code: room.code,
    matchId,
    startedAt: room.match.startedAt
  });
  setRoomState(room, ROOM_STATES.DRAFT, 'draft_started');
  logLifecycle('draft', 'started', {
    code: room.code,
    turnOrder: DRAFT_TURN_ORDER.join('->'),
    turnMs: DRAFT_TURN_MS
  });
  logLifecycle('draft', 'current_turn', {
    code: room.code,
    turnIndex: 0,
    player: draftState.currentTurnPlayerNumber
  });
  return room.match;
}

function buildPhantomIllusionSnapshotForPlayer(player, now = Date.now()) {
  const phantom = getPlayerPhantomState(player);
  if (!phantom) return null;
  const illusionExpiresAt = Number(phantom.illusionExpiresAt) || 0;
  if (illusionExpiresAt <= (Number(now) || Date.now())) return null;
  const illusionPosition = clonePosition(phantom.illusionPosition);
  if (!illusionPosition) return null;
  const ownerPlayerNumber = Number(player?.matchPlayerNumber) || 0;
  return {
    ownerPlayerNumber,
    illusionId: `${ownerPlayerNumber}-phantom`,
    position: illusionPosition,
    facing: { ...normalizeInputVector(phantom.illusionFacing) },
    offset: { ...sanitizeVector(phantom.illusionOffset) },
    expiresAt: illusionExpiresAt,
    remainingMs: Math.max(0, illusionExpiresAt - (Number(now) || Date.now()))
  };
}

function buildPlayerActiveEffectsSnapshot(player, now = Date.now()) {
  const phantom = getPlayerPhantomState(player);
  const phantomVanishUntil = getPlayerPhantomVanishUntil(player);
  const phantomIllusion = buildPhantomIllusionSnapshotForPlayer(player, now);
  const riftPending = getPlayerRiftPendingState(player);
  const riftPendingExpiresAt = Number(riftPending?.expiresAt) || 0;
  return {
    shieldUntil: getPlayerActiveShieldUntil(player),
    shieldRemainingMs: Math.max(0, getPlayerActiveShieldUntil(player) - now),
    shieldActive: isShieldActive(player, now),
    prismUntil: getPlayerActivePrismUntil(player),
    prismRemainingMs: Math.max(0, getPlayerActivePrismUntil(player) - now),
    prismActive: isPrismActive(player, now),
    prismDirection: { ...getPrismFacingDirection(player, { x: 1, y: 0 }) },
    solarDistortionUntil: getPlayerSolarDistortionUntil(player),
    solarDistortionRemainingMs: Math.max(0, getPlayerSolarDistortionUntil(player) - now),
    solarDistortionActive: isSolarDistortionActive(player, now),
    chargeActive: Boolean(player?.activeEffects?.charge?.active),
    chargeRemainingDistance: Math.max(0, Number(player?.activeEffects?.charge?.remainingDistance) || 0),
    chargeDirection: { ...normalizeInputVector(player?.activeEffects?.charge?.direction) },
    riftPendingActive: Boolean(riftPending),
    riftPendingPortalA: clonePosition(riftPending?.portalA),
    riftPendingExpiresAt,
    riftPendingRemainingMs: riftPendingExpiresAt > 0 ? Math.max(0, riftPendingExpiresAt - now) : 0,
    phantomVanishUntil,
    phantomVanishRemainingMs: Math.max(0, phantomVanishUntil - now),
    phantomUntargetableActive: isPlayerPhantomUntargetable(player, now),
    phantomIllusion
  };
}

function serializeMatch(match) {
  if (!match) return null;
  const now = Date.now();
  const draftPool = match?.draft ? ensureDraftPoolEntries(match.draft) : null;
  return {
    matchId: match.matchId,
    roomCode: match.roomCode,
    startedAt: match.startedAt,
    matchFormat: String(match.matchFormat || MATCH_FORMAT_BO3),
    roundNumber: Math.max(1, Number(match.roundNumber) || 1),
    roundsNeededToWin: Math.max(1, Number(match.roundsNeededToWin) || MATCH_ROUNDS_NEEDED_TO_WIN),
    roundWinsByPlayerNumber: {
      1: Math.max(0, Number(match.roundWinsByPlayerNumber?.[1]) || 0),
      2: Math.max(0, Number(match.roundWinsByPlayerNumber?.[2]) || 0)
    },
    currentRoundStartedAt: Number(match.currentRoundStartedAt) || null,
    roundEndAt: Number(match.roundEndAt) || null,
    nextRoundStartsAt: Number(match.nextRoundStartsAt) || null,
    roundIntermissionRemainingMs: Number(match.nextRoundStartsAt) > 0
      ? Math.max(0, Number(match.nextRoundStartsAt) - now)
      : 0,
    lastRoundWinnerPlayerNumber: Number(match.lastRoundWinnerPlayerNumber) || null,
    lastRoundEndedAt: Number(match.lastRoundEndedAt) || null,
    lastRoundEndReason: String(match.lastRoundEndReason || ''),
    phase: match.phase,
    combatStartsAt: Number(match.combatStartsAt) || null,
    combatCountdownSeconds: Number(match.combatCountdownSeconds) || COMBAT_START_COUNTDOWN_SECONDS,
    combatCountdownRemainingMs: Number(match.combatStartsAt) > 0
      ? Math.max(0, Number(match.combatStartsAt) - now)
      : 0,
    isPaused: Boolean(match.isPaused),
    pauseReason: String(match.pauseReason || ''),
    pausedByPlayerNumber: Number(match.pausedByPlayerNumber) || null,
    pausedAt: Number(match.pausedAt) || null,
    players: match.players.map((player) => ({
      name: normalizePlayerDisplayName(player.name, PLAYER_DISPLAY_NAME_FALLBACK),
      socketId: player.socketId,
      slot: player.slot,
      ready: Boolean(player.ready),
      matchPlayerNumber: player.matchPlayerNumber,
      position: clonePosition(player.position),
      velocity: { ...sanitizeVector(player.velocity) },
      input: { ...normalizeInputVector(player.input) },
      aim: { ...normalizeInputVector(player.aim) },
      lastAimUpdated: player.lastAimUpdated,
      lastHitAt: Number(player.lastHitAt) || 0,
      hitInvulnerableUntil: Number(player.hitInvulnerableUntil) || 0,
      currentHealth: getPlayerCurrentHealth(player),
      maxHealth: getPlayerMaxHealth(player),
      lastDamagedAt: Number(player.lastDamagedAt) || 0,
      lastDamageCause: String(player.lastDamageCause || ''),
      lastDamageAbilityId: normalizeSpellId(player.lastDamageAbilityId) || '',
      lastDamageSourcePlayerNumber: Number(player.lastDamageSourcePlayerNumber) || 0,
      lastLavaDamageAt: Number(player.lastLavaDamageAt) || 0,
      eliminated: Boolean(player.eliminated),
      connected: player.connected !== false,
      disconnectedAt: Number(player.disconnectedAt) || null,
      reconnectGraceExpiresAt: Number(player.reconnectGraceExpiresAt) || null,
      reconnectGraceRemainingMs: Number(player.reconnectGraceExpiresAt) > 0
        ? Math.max(0, Number(player.reconnectGraceExpiresAt) - now)
        : 0,
      draftedSpells: (Array.isArray(player.draftedSpells) ? player.draftedSpells : [])
        .map((spellId) => normalizeSpellId(spellId))
        .filter(Boolean),
      loadoutSpells: (Array.isArray(player.loadoutSpells) ? player.loadoutSpells : [])
        .map((spellId) => normalizeSpellId(spellId))
        .filter(Boolean),
      loadout: (Array.isArray(player.loadout) ? player.loadout : [])
        .map((spellId) => normalizeSpellId(spellId))
        .filter(Boolean),
      abilityCooldowns: buildAbilityCooldownSnapshot(player, now),
      abilityReadyAt: buildAbilityReadyAtSnapshot(player),
      activeEffects: buildPlayerActiveEffectsSnapshot(player, now),
      nextFireblastAt: Number(player.nextFireblastAt) || 0,
      nextBlinkAt: Number(player.nextBlinkAt) || 0,
      nextShieldAt: Number(player.nextShieldAt) || 0,
      nextPrismAt: Number(player.nextPrismAt) || 0,
      nextGustAt: Number(player.nextGustAt) || 0,
      nextChargeAt: Number(player.nextChargeAt) || 0,
      nextShockAt: Number(player.nextShockAt) || 0,
      nextHookAt: Number(player.nextHookAt) || 0,
      nextSolarAt: Number(player.nextSolarAt) || 0,
      nextRiftAt: Number(player.nextRiftAt) || 0,
      nextPhantomAt: Number(player.nextPhantomAt) || 0,
      nextWallAt: Number(player.nextWallAt) || 0,
      nextRewindAt: Number(player.nextRewindAt) || 0,
      lastUpdated: player.lastUpdated
    })),
    spawnPositions: {
      player1: clonePosition(match.spawnPositions?.player1),
      player2: clonePosition(match.spawnPositions?.player2)
    },
    projectiles: (Array.isArray(match.projectiles) ? match.projectiles : []).map((projectile) => {
      const projectileAbilityId = normalizeSpellId(projectile.abilityId || ABILITY_IDS.FIREBLAST) || ABILITY_IDS.FIREBLAST;
      const defaultSpeed = projectileAbilityId === ABILITY_IDS.HOOK
        ? getAbilityNumber(ABILITY_IDS.HOOK, 'speed', 18, 0.01)
        : projectileAbilityId === ABILITY_IDS.SOLAR
          ? getAbilityNumber(ABILITY_IDS.SOLAR, 'speed', 16.2, 0.01)
          : getAbilityNumber(ABILITY_IDS.FIREBLAST, 'speed', 14, 0.01);
      const defaultHitRadius = projectileAbilityId === ABILITY_IDS.HOOK
        ? getHookHitRadiusDefault()
        : projectileAbilityId === ABILITY_IDS.SOLAR
          ? getSolarHitRadiusDefault()
          : getFireblastHitRadiusDefault();
      return {
        projectileId: projectile.projectileId,
        abilityId: projectileAbilityId,
        ownerPlayerNumber: projectile.ownerPlayerNumber,
        position: clonePosition(projectile.position),
        direction: { ...normalizeInputVector(projectile.direction) },
        speed: Number(projectile.speed) || defaultSpeed,
        hitRadius: Number(projectile.hitRadius) || defaultHitRadius,
        spawnedAt: projectile.spawnedAt,
        expiresAt: projectile.expiresAt
      };
    }),
    walls: (Array.isArray(match.walls) ? match.walls : []).map((wall) => ({
      wallId: String(wall.wallId || ''),
      ownerPlayerNumber: Number(wall.ownerPlayerNumber) || 0,
      position: clonePosition(wall.position),
      direction: { ...getWallDirection(wall) },
      halfLength: getWallHalfLength(wall, getWallHalfLengthDefault()),
      halfThickness: getWallHalfThickness(wall, getWallHalfThicknessDefault()),
      spawnedAt: Number(wall.spawnedAt) || 0,
      expiresAt: Number(wall.expiresAt) || 0
    })),
    roundPillars: ensureMatchRoundPillars(match).map((pillar) => ({
      pillarId: String(pillar?.pillarId || ''),
      position: clonePosition(pillar?.position),
      radius: getRoundPillarRadius(pillar),
      spawnedAt: Number(pillar?.spawnedAt) || 0
    })),
    rifts: ensureMatchRifts(match).map((rift) => ({
      riftId: String(rift?.riftId || ''),
      ownerPlayerNumber: Number(rift?.ownerPlayerNumber) || 0,
      portalA: clonePosition(rift?.portalA),
      portalB: clonePosition(rift?.portalB),
      portalRadius: Math.max(0.05, Number(rift?.portalRadius) || getRiftPortalRadiusDefault()),
      linkedAt: Number(rift?.linkedAt) || 0,
      expiresAt: Number(rift?.expiresAt) || 0
    })),
    phantomIllusions: (Array.isArray(match.players) ? match.players : [])
      .map((player) => buildPhantomIllusionSnapshotForPlayer(player, now))
      .filter(Boolean),
    hitEvents: (Array.isArray(match.hitEvents) ? match.hitEvents : []).map((hitEvent) => ({
      hitId: String(hitEvent.hitId || ''),
      timestamp: Number(hitEvent.timestamp) || 0,
      projectileId: String(hitEvent.projectileId || ''),
      type: String(hitEvent.type || 'combat_event'),
      abilityId: normalizeSpellId(hitEvent.abilityId),
      sourcePlayerNumber: Number(hitEvent.sourcePlayerNumber) || 0,
      targetPlayerNumber: Number(hitEvent.targetPlayerNumber) || 0,
      knockback: { ...sanitizeVector(hitEvent.knockback) },
      metadata: hitEvent.metadata && typeof hitEvent.metadata === 'object' ? hitEvent.metadata : null
    })),
    abilityAnalytics: buildAbilityAnalyticsSnapshot(match),
    eliminatedPlayerNumber: Number(match.eliminatedPlayerNumber) || null,
    winnerPlayerNumber: Number(match.winnerPlayerNumber) || null,
    eliminationCause: String(match.eliminationCause || match.matchEndReason || ''),
    endedAt: Number(match.endedAt) || null,
    draft: match.draft
      ? {
        status: String(match.draft.status || 'active'),
        currentTurnIndex: Number(match.draft.currentTurnIndex) || 0,
        currentTurnPlayerNumber: Number(match.draft.currentTurnPlayerNumber) || null,
        turnDurationMs: Number(match.draft.turnDurationMs) || DRAFT_TURN_MS,
        turnStartedAt: Number(match.draft.turnStartedAt) || null,
        turnEndsAt: Number(match.draft.turnEndsAt) || null,
        turnRemainingMs: Number(match.draft.turnEndsAt) > 0
          ? Math.max(0, Number(match.draft.turnEndsAt) - now)
          : 0,
        turnOrder: Array.isArray(match.draft.turnOrder) ? match.draft.turnOrder.map((value) => Number(value) || 0) : [],
        pool: DRAFT_SPELL_POOL.reduce((acc, spellId) => {
          const poolEntry = draftPool?.[spellId];
          acc[spellId] = {
            totalCopies: Number(poolEntry?.totalCopies) || Number(DRAFT_SPELL_COPY_LIMITS[spellId]) || 0,
            remainingCopies: Number(poolEntry?.remainingCopies) || 0
          };
          return acc;
        }, {}),
        picksByPlayerNumber: {
          1: (Array.isArray(match.draft.picksByPlayerNumber?.[1]) ? match.draft.picksByPlayerNumber[1] : [])
            .map((spellId) => normalizeSpellId(spellId))
            .filter(Boolean),
          2: (Array.isArray(match.draft.picksByPlayerNumber?.[2]) ? match.draft.picksByPlayerNumber[2] : [])
            .map((spellId) => normalizeSpellId(spellId))
            .filter(Boolean)
        },
        pickHistory: Array.isArray(match.draft.pickHistory)
          ? match.draft.pickHistory.map((entry) => ({
            turnIndex: Number(entry?.turnIndex) || 0,
            playerNumber: Number(entry?.playerNumber) || 0,
            spellId: normalizeSpellId(entry?.spellId),
            reason: String(entry?.reason || 'manual'),
            timestamp: Number(entry?.timestamp) || 0
          }))
          : [],
        completedAt: Number(match.draft.completedAt) || null
      }
      : null,
    arenaBoundary: {
      type: 'circle',
      center: clonePosition(ARENA_BOUNDARY_CENTER),
      radius: ARENA_BOUNDARY_RADIUS
    }
  };
}

function serializeCombatState(match) {
  if (!match) return null;
  const now = Date.now();
  return {
    matchId: match.matchId,
    roomCode: match.roomCode,
    startedAt: match.startedAt,
    matchFormat: String(match.matchFormat || MATCH_FORMAT_BO3),
    roundNumber: Math.max(1, Number(match.roundNumber) || 1),
    roundsNeededToWin: Math.max(1, Number(match.roundsNeededToWin) || MATCH_ROUNDS_NEEDED_TO_WIN),
    roundWinsByPlayerNumber: {
      1: Math.max(0, Number(match.roundWinsByPlayerNumber?.[1]) || 0),
      2: Math.max(0, Number(match.roundWinsByPlayerNumber?.[2]) || 0)
    },
    currentRoundStartedAt: Number(match.currentRoundStartedAt) || null,
    roundEndAt: Number(match.roundEndAt) || null,
    nextRoundStartsAt: Number(match.nextRoundStartsAt) || null,
    roundIntermissionRemainingMs: Number(match.nextRoundStartsAt) > 0
      ? Math.max(0, Number(match.nextRoundStartsAt) - now)
      : 0,
    lastRoundWinnerPlayerNumber: Number(match.lastRoundWinnerPlayerNumber) || null,
    lastRoundEndedAt: Number(match.lastRoundEndedAt) || null,
    lastRoundEndReason: String(match.lastRoundEndReason || ''),
    phase: match.phase,
    combatStartsAt: Number(match.combatStartsAt) || null,
    combatCountdownSeconds: Number(match.combatCountdownSeconds) || COMBAT_START_COUNTDOWN_SECONDS,
    combatCountdownRemainingMs: Number(match.combatStartsAt) > 0
      ? Math.max(0, Number(match.combatStartsAt) - now)
      : 0,
    isPaused: Boolean(match.isPaused),
    pauseReason: String(match.pauseReason || ''),
    pausedByPlayerNumber: Number(match.pausedByPlayerNumber) || null,
    pausedAt: Number(match.pausedAt) || null,
    players: match.players.map((player) => ({
      name: normalizePlayerDisplayName(player.name, PLAYER_DISPLAY_NAME_FALLBACK),
      socketId: player.socketId,
      slot: player.slot,
      ready: Boolean(player.ready),
      matchPlayerNumber: player.matchPlayerNumber,
      position: clonePosition(player.position),
      velocity: { ...sanitizeVector(player.velocity) },
      aim: { ...normalizeInputVector(player.aim) },
      currentHealth: getPlayerCurrentHealth(player),
      maxHealth: getPlayerMaxHealth(player),
      eliminated: Boolean(player.eliminated),
      connected: player.connected !== false,
      draftedSpells: (Array.isArray(player.draftedSpells) ? player.draftedSpells : [])
        .map((spellId) => normalizeSpellId(spellId))
        .filter(Boolean),
      loadoutSpells: (Array.isArray(player.loadoutSpells) ? player.loadoutSpells : [])
        .map((spellId) => normalizeSpellId(spellId))
        .filter(Boolean),
      loadout: (Array.isArray(player.loadout) ? player.loadout : [])
        .map((spellId) => normalizeSpellId(spellId))
        .filter(Boolean),
      abilityCooldowns: buildAbilityCooldownSnapshot(player, now),
      abilityReadyAt: buildAbilityReadyAtSnapshot(player),
      activeEffects: {
        ...buildPlayerActiveEffectsSnapshot(player, now),
        charge: {
          active: Boolean(player?.activeEffects?.charge?.active),
          remainingDistance: Math.max(0, Number(player?.activeEffects?.charge?.remainingDistance) || 0),
          direction: { ...normalizeInputVector(player?.activeEffects?.charge?.direction) }
        }
      },
      nextBlinkAt: Number(player.nextBlinkAt) || 0,
      lastUpdated: player.lastUpdated
    })),
    spawnPositions: {
      player1: clonePosition(match.spawnPositions?.player1),
      player2: clonePosition(match.spawnPositions?.player2)
    },
    projectiles: (Array.isArray(match.projectiles) ? match.projectiles : []).map((projectile) => {
      const projectileAbilityId = normalizeSpellId(projectile.abilityId || ABILITY_IDS.FIREBLAST) || ABILITY_IDS.FIREBLAST;
      const defaultSpeed = projectileAbilityId === ABILITY_IDS.HOOK
        ? getAbilityNumber(ABILITY_IDS.HOOK, 'speed', 18, 0.01)
        : projectileAbilityId === ABILITY_IDS.SOLAR
          ? getAbilityNumber(ABILITY_IDS.SOLAR, 'speed', 16.2, 0.01)
          : getAbilityNumber(ABILITY_IDS.FIREBLAST, 'speed', 14, 0.01);
      const defaultHitRadius = projectileAbilityId === ABILITY_IDS.HOOK
        ? getHookHitRadiusDefault()
        : projectileAbilityId === ABILITY_IDS.SOLAR
          ? getSolarHitRadiusDefault()
          : getFireblastHitRadiusDefault();
      return {
        projectileId: projectile.projectileId,
        abilityId: projectileAbilityId,
        ownerPlayerNumber: projectile.ownerPlayerNumber,
        position: clonePosition(projectile.position),
        direction: { ...normalizeInputVector(projectile.direction) },
        speed: Number(projectile.speed) || defaultSpeed,
        hitRadius: Number(projectile.hitRadius) || defaultHitRadius,
        spawnedAt: projectile.spawnedAt,
        expiresAt: projectile.expiresAt
      };
    }),
    walls: (Array.isArray(match.walls) ? match.walls : []).map((wall) => ({
      wallId: String(wall.wallId || ''),
      ownerPlayerNumber: Number(wall.ownerPlayerNumber) || 0,
      position: clonePosition(wall.position),
      direction: { ...getWallDirection(wall) },
      halfLength: getWallHalfLength(wall, getWallHalfLengthDefault()),
      halfThickness: getWallHalfThickness(wall, getWallHalfThicknessDefault()),
      spawnedAt: Number(wall.spawnedAt) || 0,
      expiresAt: Number(wall.expiresAt) || 0
    })),
    roundPillars: ensureMatchRoundPillars(match).map((pillar) => ({
      pillarId: String(pillar?.pillarId || ''),
      position: clonePosition(pillar?.position),
      radius: getRoundPillarRadius(pillar),
      spawnedAt: Number(pillar?.spawnedAt) || 0
    })),
    rifts: ensureMatchRifts(match).map((rift) => ({
      riftId: String(rift?.riftId || ''),
      ownerPlayerNumber: Number(rift?.ownerPlayerNumber) || 0,
      portalA: clonePosition(rift?.portalA),
      portalB: clonePosition(rift?.portalB),
      portalRadius: Math.max(0.05, Number(rift?.portalRadius) || getRiftPortalRadiusDefault()),
      linkedAt: Number(rift?.linkedAt) || 0,
      expiresAt: Number(rift?.expiresAt) || 0
    })),
    phantomIllusions: (Array.isArray(match.players) ? match.players : [])
      .map((player) => buildPhantomIllusionSnapshotForPlayer(player, now))
      .filter(Boolean),
    hitEvents: (Array.isArray(match.hitEvents) ? match.hitEvents : []).map((hitEvent) => ({
      hitId: String(hitEvent.hitId || ''),
      timestamp: Number(hitEvent.timestamp) || 0,
      projectileId: String(hitEvent.projectileId || ''),
      type: String(hitEvent.type || 'combat_event'),
      abilityId: normalizeSpellId(hitEvent.abilityId),
      sourcePlayerNumber: Number(hitEvent.sourcePlayerNumber) || 0,
      targetPlayerNumber: Number(hitEvent.targetPlayerNumber) || 0,
      knockback: { ...sanitizeVector(hitEvent.knockback) },
      metadata: hitEvent.metadata && typeof hitEvent.metadata === 'object' ? hitEvent.metadata : null
    })),
    arenaBoundary: {
      type: 'circle',
      center: clonePosition(ARENA_BOUNDARY_CENTER),
      radius: ARENA_BOUNDARY_RADIUS
    },
    eliminatedPlayerNumber: Number(match.eliminatedPlayerNumber) || null,
    winnerPlayerNumber: Number(match.winnerPlayerNumber) || null,
    endedAt: Number(match.endedAt) || null
  };
}

function serializeRoom(room) {
  refreshRoomState(room, 'serialize');
  const now = Date.now();
  return {
    code: room.code,
    createdAt: room.createdAt,
    playerCount: room.players.length,
    connectedPlayerCount: getConnectedPlayerCount(room),
    state: room.state,
    status: room.state,
    players: room.players.map((player) => ({
      ...(function resolveDraftFields() {
        const matchPlayer = getMatchPlayerByPlayerId(room.match, player.playerId);
        return {
          draftedSpells: (Array.isArray(matchPlayer?.draftedSpells) ? matchPlayer.draftedSpells : [])
            .map((spellId) => normalizeSpellId(spellId))
            .filter(Boolean),
          loadoutSpells: (Array.isArray(matchPlayer?.loadoutSpells) ? matchPlayer.loadoutSpells : [])
            .map((spellId) => normalizeSpellId(spellId))
            .filter(Boolean)
        };
      }()),
      socketId: player.socketId,
      playerId: player.playerId,
      name: normalizePlayerDisplayName(player.name, PLAYER_DISPLAY_NAME_FALLBACK),
      slot: player.slot,
      ready: Boolean(player.ready),
      matchPlayerNumber: player.matchPlayerNumber,
      connected: player.connected !== false,
      disconnectedAt: Number(player.disconnectedAt) || null,
      reconnectGraceExpiresAt: Number(player.reconnectGraceExpiresAt) || null,
      reconnectGraceRemainingMs: Number(player.reconnectGraceExpiresAt) > 0
        ? Math.max(0, Number(player.reconnectGraceExpiresAt) - now)
        : 0
    })),
    reconnect: getRoomReconnectStatus(room, now),
    match: serializeMatch(room.match)
  };
}

function emitRoomUpdate(room) {
  io.to(room.code).emit('room_update', {
    roomCode: room.code,
    room: serializeRoom(room)
  });
}

function emitMatchStarted(room) {
  if (!room.match) return;
  if (Number(room.match.matchStartedEmittedAt) > 0) {
    logLifecycle('match', 'match_started_emit_ignored_duplicate', {
      code: room.code,
      matchId: room.match.matchId
    });
    return;
  }
  room.match.matchStartedEmittedAt = Date.now();
  const serializedRoom = serializeRoom(room);
  const serializedMatch = serializeMatch(room.match);

  room.players.forEach((player) => {
    const mySpawnPosition = player.matchPlayerNumber === 1
      ? clonePosition(serializedMatch.spawnPositions.player1)
      : clonePosition(serializedMatch.spawnPositions.player2);
    const opponentSpawnPosition = player.matchPlayerNumber === 1
      ? clonePosition(serializedMatch.spawnPositions.player2)
      : clonePosition(serializedMatch.spawnPositions.player1);

    io.to(player.socketId).emit('match_started', {
      roomCode: room.code,
      room: serializedRoom,
      match: serializedMatch,
      matchPlayerNumber: player.matchPlayerNumber,
      reconnectToken: player.reconnectToken,
      reconnectPlayerId: player.playerId,
      spawnPositions: serializedMatch.spawnPositions,
      mySpawnPosition,
      opponentSpawnPosition
    });
  });
}

function emitMatchState(room, timestamp = Date.now(), options = {}) {
  if (!room.match) return;
  const serializedMatch = serializeMatch(room.match);
  const useVolatile = options?.volatile === true;
  const emitter = useVolatile ? io.to(room.code).volatile : io.to(room.code);
  emitter.emit('match_state', {
    roomCode: room.code,
    matchId: serializedMatch.matchId,
    startedAt: serializedMatch.startedAt,
    matchFormat: serializedMatch.matchFormat,
    roundNumber: serializedMatch.roundNumber,
    roundsNeededToWin: serializedMatch.roundsNeededToWin,
    roundWinsByPlayerNumber: serializedMatch.roundWinsByPlayerNumber,
    currentRoundStartedAt: serializedMatch.currentRoundStartedAt,
    roundEndAt: serializedMatch.roundEndAt,
    nextRoundStartsAt: serializedMatch.nextRoundStartsAt,
    roundIntermissionRemainingMs: serializedMatch.roundIntermissionRemainingMs,
    lastRoundWinnerPlayerNumber: serializedMatch.lastRoundWinnerPlayerNumber,
    lastRoundEndedAt: serializedMatch.lastRoundEndedAt,
    lastRoundEndReason: serializedMatch.lastRoundEndReason,
    phase: serializedMatch.phase,
    combatStartsAt: serializedMatch.combatStartsAt,
    combatCountdownSeconds: serializedMatch.combatCountdownSeconds,
    combatCountdownRemainingMs: serializedMatch.combatCountdownRemainingMs,
    isPaused: Boolean(serializedMatch.isPaused),
    pauseReason: String(serializedMatch.pauseReason || ''),
    pausedByPlayerNumber: Number(serializedMatch.pausedByPlayerNumber) || null,
    pausedAt: Number(serializedMatch.pausedAt) || null,
    draft: serializedMatch.draft,
    players: serializedMatch.players,
    projectiles: serializedMatch.projectiles,
    walls: serializedMatch.walls,
    roundPillars: serializedMatch.roundPillars,
    rifts: serializedMatch.rifts,
    phantomIllusions: serializedMatch.phantomIllusions,
    hitEvents: serializedMatch.hitEvents,
    abilityAnalytics: serializedMatch.abilityAnalytics,
    arenaBoundary: serializedMatch.arenaBoundary,
    eliminatedPlayerNumber: serializedMatch.eliminatedPlayerNumber,
    winnerPlayerNumber: serializedMatch.winnerPlayerNumber,
    endedAt: serializedMatch.endedAt,
    timestamp
  });
}

function emitCombatState(room, timestamp = Date.now(), options = {}) {
  if (!room.match) return;
  const serializedCombatState = serializeCombatState(room.match);
  const useVolatile = options?.volatile === true;
  const emitter = useVolatile ? io.to(room.code).volatile : io.to(room.code);
  emitter.emit('combat_state', {
    roomCode: room.code,
    matchId: serializedCombatState.matchId,
    startedAt: serializedCombatState.startedAt,
    matchFormat: serializedCombatState.matchFormat,
    roundNumber: serializedCombatState.roundNumber,
    roundsNeededToWin: serializedCombatState.roundsNeededToWin,
    roundWinsByPlayerNumber: serializedCombatState.roundWinsByPlayerNumber,
    currentRoundStartedAt: serializedCombatState.currentRoundStartedAt,
    roundEndAt: serializedCombatState.roundEndAt,
    nextRoundStartsAt: serializedCombatState.nextRoundStartsAt,
    roundIntermissionRemainingMs: serializedCombatState.roundIntermissionRemainingMs,
    lastRoundWinnerPlayerNumber: serializedCombatState.lastRoundWinnerPlayerNumber,
    lastRoundEndedAt: serializedCombatState.lastRoundEndedAt,
    lastRoundEndReason: serializedCombatState.lastRoundEndReason,
    phase: serializedCombatState.phase,
    combatStartsAt: serializedCombatState.combatStartsAt,
    combatCountdownSeconds: serializedCombatState.combatCountdownSeconds,
    combatCountdownRemainingMs: serializedCombatState.combatCountdownRemainingMs,
    isPaused: Boolean(serializedCombatState.isPaused),
    pauseReason: String(serializedCombatState.pauseReason || ''),
    pausedByPlayerNumber: Number(serializedCombatState.pausedByPlayerNumber) || null,
    pausedAt: Number(serializedCombatState.pausedAt) || null,
    players: serializedCombatState.players,
    spawnPositions: serializedCombatState.spawnPositions,
    projectiles: serializedCombatState.projectiles,
    walls: serializedCombatState.walls,
    roundPillars: serializedCombatState.roundPillars,
    rifts: serializedCombatState.rifts,
    phantomIllusions: serializedCombatState.phantomIllusions,
    hitEvents: serializedCombatState.hitEvents,
    arenaBoundary: serializedCombatState.arenaBoundary,
    eliminatedPlayerNumber: serializedCombatState.eliminatedPlayerNumber,
    winnerPlayerNumber: serializedCombatState.winnerPlayerNumber,
    endedAt: serializedCombatState.endedAt,
    timestamp
  });
}

function emitMatchStateThrottled(room, timestamp = Date.now(), force = false) {
  if (!room?.match) return false;
  const now = Number(timestamp) || Date.now();
  const match = room.match;
  const lastBroadcastAt = Number(match.lastBroadcastAt) || 0;
  if (!force && (now - lastBroadcastAt) < MATCH_STATE_BROADCAST_MS) {
    return false;
  }
  match.lastBroadcastAt = now;
  if (match.phase === MATCH_PHASE_DRAFT) {
    emitMatchState(room, now, { volatile: true });
  } else {
    emitCombatState(room, now, { volatile: true });
  }
  return true;
}

function buildPlayerSessionPayload(room, player) {
  if (!room || !player) return {};
  const serializedMatch = serializeMatch(room.match);
  const mySpawnPosition = player.matchPlayerNumber === 1
    ? clonePosition(serializedMatch?.spawnPositions?.player1)
    : player.matchPlayerNumber === 2
      ? clonePosition(serializedMatch?.spawnPositions?.player2)
      : null;
  const opponentSpawnPosition = player.matchPlayerNumber === 1
    ? clonePosition(serializedMatch?.spawnPositions?.player2)
    : player.matchPlayerNumber === 2
      ? clonePosition(serializedMatch?.spawnPositions?.player1)
      : null;

  return {
    roomCode: room.code,
    playerSlot: player.slot,
    matchPlayerNumber: player.matchPlayerNumber,
    reconnectToken: player.reconnectToken,
    reconnectPlayerId: player.playerId,
    room: serializeRoom(room),
    match: serializedMatch,
    spawnPositions: serializedMatch?.spawnPositions || null,
    mySpawnPosition,
    opponentSpawnPosition
  };
}

function clearDisconnectedStateForPlayer(player, timestamp = Date.now()) {
  if (!player) return;
  player.connected = true;
  player.disconnectedAt = null;
  player.reconnectGraceExpiresAt = null;
  if (player.input && typeof player.input === 'object') {
    player.input = { x: 0, y: 0 };
  }
  player.lastUpdated = Number(timestamp) || Date.now();
}

function markPlayerDisconnected(player, timestamp = Date.now()) {
  if (!player) return;
  const now = Number(timestamp) || Date.now();
  player.connected = false;
  player.disconnectedAt = now;
  player.reconnectGraceExpiresAt = now + RECONNECT_GRACE_MS;
}

function removePlayerFromRoomList(room, playerId) {
  if (!room) return null;
  const index = room.players.findIndex((player) => player.playerId === playerId);
  if (index < 0) return null;
  const [removedPlayer] = room.players.splice(index, 1);
  clearReconnectGraceTimer(room.code, playerId);
  return removedPlayer || null;
}

function deleteRoomIfEmpty(room) {
  if (!room) return false;
  if (room.players.length > 0) return false;
  cleanupRoomMatchState(room, 'room_deleted_empty', Date.now());
  clearReconnectTimersForRoom(room.code);
  rooms.delete(room.code);
  logLifecycle('room', 'deleted', {
    code: room.code
  });
  return true;
}

function tryResumePausedMatch(room, reason = 'player_reconnected') {
  if (!room?.match) return false;
  const match = room.match;
  if (
    match.phase !== MATCH_PHASE_COMBAT
    && match.phase !== MATCH_PHASE_COMBAT_COUNTDOWN
    && match.phase !== MATCH_PHASE_ROUND_END
  ) {
    return false;
  }
  if (match.isPaused !== true) return false;
  if (!areAllMatchPlayersConnected(match)) return false;

  setMatchPauseState(match, false, '', null, Date.now());
  logLifecycle('match', 'resumed', {
    code: room.code,
    reason
  });
  return true;
}

function handleReconnectGraceTimeout(roomCode, playerId) {
  const key = getReconnectTimerKey(roomCode, playerId);
  reconnectGraceTimers.delete(key);

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = getPlayerByPlayerId(room, playerId);
  if (!player) return;
  if (player.connected !== false) return;

  const now = Date.now();
  const reconnectGraceExpiresAt = Number(player.reconnectGraceExpiresAt) || 0;
  if (reconnectGraceExpiresAt > now) {
    scheduleReconnectGraceTimeout(room, player);
    return;
  }

  const disconnectedMatchPlayer = getMatchPlayerByPlayerId(room.match, playerId);
  const disconnectedPlayerNumber = Number(disconnectedMatchPlayer?.matchPlayerNumber)
    || Number(player.matchPlayerNumber)
    || null;

  logLifecycle('reconnect', 'timeout_expired', {
    code: room.code,
    playerId: player.playerId,
    slot: player.slot
  });

  if (room.match && room.match.phase !== MATCH_PHASE_MATCH_END) {
    const winnerMatchPlayer = (Array.isArray(room.match.players) ? room.match.players : [])
      .find((matchPlayer) => Number(matchPlayer?.matchPlayerNumber) !== Number(disconnectedPlayerNumber) && matchPlayer.connected !== false) || null;
    const winnerPlayerNumber = Number(winnerMatchPlayer?.matchPlayerNumber) || null;

    transitionMatchToEnd(
      room,
      disconnectedMatchPlayer || { matchPlayerNumber: disconnectedPlayerNumber },
      winnerMatchPlayer || { matchPlayerNumber: winnerPlayerNumber },
      'reconnect_timeout_forfeit',
      now
    );
    setMatchPauseState(room.match, false, '', null, now);

    io.to(room.code).emit('reconnect_timeout_forfeit', {
      roomCode: room.code,
      disconnectedPlayerNumber,
      winnerPlayerNumber,
      disconnectedAt: Number(player.disconnectedAt) || null,
      expiredAt: now
    });
    logLifecycle('match', 'reconnect_timeout_forfeit', {
      code: room.code,
      disconnected: disconnectedPlayerNumber,
      winner: winnerPlayerNumber
    });

    const removed = removePlayerFromRoomList(room, player.playerId);
    if (removed) {
      logLifecycle('room', 'remove_disconnected_after_forfeit', {
        code: room.code,
        playerId: removed.playerId
      });
    }

    if (!deleteRoomIfEmpty(room)) {
      emitRoomUpdate(room);
      emitMatchState(room, now);
    }
    return;
  }

  const removed = removePlayerFromRoomList(room, player.playerId);
  if (removed) {
    logLifecycle('room', 'remove_disconnected_timeout', {
      code: room.code,
      playerId: removed.playerId
    });
  }

  if (room.match && room.match.phase === MATCH_PHASE_MATCH_END) {
    const matchPlayer = getMatchPlayerByPlayerId(room.match, playerId);
    if (matchPlayer) {
      matchPlayer.connected = false;
      matchPlayer.disconnectedAt = Number(player.disconnectedAt) || now;
      matchPlayer.reconnectGraceExpiresAt = reconnectGraceExpiresAt || now;
    }
  }

  if (!deleteRoomIfEmpty(room)) {
    refreshRoomState(room, 'reconnect_timeout');
    emitRoomUpdate(room);
    if (room.match) emitMatchState(room, now);
  }
}

function scheduleReconnectGraceTimeout(room, player) {
  if (!room || !player) return;
  clearReconnectGraceTimer(room.code, player.playerId);

  const reconnectGraceExpiresAt = Number(player.reconnectGraceExpiresAt) || 0;
  const remainingMs = reconnectGraceExpiresAt > 0
    ? Math.max(0, reconnectGraceExpiresAt - Date.now())
    : RECONNECT_GRACE_MS;
  const key = getReconnectTimerKey(room.code, player.playerId);

  const timer = setTimeout(() => {
    handleReconnectGraceTimeout(room.code, player.playerId);
  }, remainingMs + 15);
  reconnectGraceTimers.set(key, timer);
}

function beginDisconnectGraceForPlayer(room, player, disconnectReason = 'disconnect') {
  if (!room || !player) return;
  if (player.connected === false) {
    logLifecycle('reconnect', 'grace_already_active', {
      code: room.code,
      playerId: player.playerId,
      reason: disconnectReason
    });
    return;
  }

  const now = Date.now();
  const matchPlayer = getMatchPlayerByPlayerId(room.match, player.playerId);
  const matchPlayerNumber = Number(matchPlayer?.matchPlayerNumber) || Number(player.matchPlayerNumber) || null;

  markPlayerDisconnected(player, now);
  player.socketId = null;
  player.ready = false;

  if (matchPlayer) {
    markPlayerDisconnected(matchPlayer, now);
    matchPlayer.socketId = null;
    matchPlayer.input = { x: 0, y: 0 };
    matchPlayer.velocity = sanitizeVector(matchPlayer.velocity);
  }

  scheduleReconnectGraceTimeout(room, player);

  if (
    room.match
    && (
      room.match.phase === MATCH_PHASE_COMBAT
      || room.match.phase === MATCH_PHASE_COMBAT_COUNTDOWN
      || room.match.phase === MATCH_PHASE_ROUND_END
    )
  ) {
    setMatchPauseState(room.match, true, 'player_disconnected', matchPlayerNumber, now);
  }

  io.to(room.code).emit('reconnect_grace_started', {
    roomCode: room.code,
    playerSlot: player.slot,
    matchPlayerNumber,
    disconnectedAt: now,
    reconnectGraceMs: RECONNECT_GRACE_MS
  });
  io.to(room.code).emit('player_disconnected', {
    roomCode: room.code,
    playerSlot: player.slot,
    matchPlayerNumber,
    disconnectedAt: now,
    reconnectGraceMs: RECONNECT_GRACE_MS,
    reason: disconnectReason
  });

  logLifecycle('reconnect', 'grace_started', {
    code: room.code,
    playerId: player.playerId,
    slot: player.slot,
    matchPlayerNumber,
    ms: RECONNECT_GRACE_MS
  });
  emitRoomUpdate(room);
  if (room.match) emitMatchState(room, now);
}

function completeDraftAndStartCombat(room, completedAt = Date.now()) {
  if (!room?.match) return false;
  const match = room.match;
  if (
    match.phase === MATCH_PHASE_COMBAT
    || match.phase === MATCH_PHASE_COMBAT_COUNTDOWN
    || match.phase === MATCH_PHASE_ROUND_END
  ) {
    logLifecycle('draft', 'complete_ignored_already_in_combat', {
      code: room.code,
      matchId: match.matchId
    });
    return true;
  }
  if (match.phase !== MATCH_PHASE_DRAFT) return false;
  const now = Number(completedAt) || Date.now();

  if (match.draft) {
    match.draft.status = 'completed';
    match.draft.completedAt = now;
    match.draft.turnEndsAt = now;
    match.draft.turnStartedAt = now;
    match.draft.currentTurnPlayerNumber = null;
  }

  match.players.forEach((player) => {
    const draftedSpells = (Array.isArray(player.draftedSpells) ? player.draftedSpells : [])
      .map((spellId) => normalizeSpellId(spellId))
      .filter(Boolean);
    player.draftedSpells = draftedSpells;
    player.loadoutSpells = draftedSpells.slice(0, 3);
    player.loadout = ['fireblast', ...player.loadoutSpells];
  });

  match.matchFormat = MATCH_FORMAT_BO3;
  match.roundsNeededToWin = MATCH_ROUNDS_NEEDED_TO_WIN;
  match.maxRounds = MATCH_MAX_ROUNDS;
  match.roundNumber = 1;
  match.roundWinsByPlayerNumber = { 1: 0, 2: 0 };
  match.currentRoundStartedAt = null;
  match.roundEndAt = null;
  match.nextRoundStartsAt = null;
  match.lastRoundWinnerPlayerNumber = null;
  match.lastRoundEndedAt = null;
  match.lastRoundEndReason = '';
  const started = startRoundCountdown(
    room,
    1,
    'draft_completed_start_round_1',
    now
  );
  if (!started) {
    return false;
  }

  logLifecycle('draft', 'completed', {
    code: room.code,
    at: now
  });
  logLifecycle('match', 'bo3_started', {
    code: room.code,
    matchId: match.matchId,
    format: MATCH_FORMAT_BO3,
    roundsNeededToWin: match.roundsNeededToWin
  });
  return true;
}

function advanceDraftTurn(room, timestamp = Date.now()) {
  const match = room?.match;
  if (!match || match.phase !== MATCH_PHASE_DRAFT || !match.draft) return false;
  if (match.draft.status === 'completed') {
    logLifecycle('draft', 'advance_ignored_completed', {
      code: room.code,
      matchId: match.matchId
    });
    return false;
  }

  const now = Number(timestamp) || Date.now();
  const nextTurnIndex = (Number(match.draft.currentTurnIndex) || 0) + 1;
  match.draft.currentTurnIndex = nextTurnIndex;

  if (nextTurnIndex >= match.draft.turnOrder.length) {
    return completeDraftAndStartCombat(room, now);
  }

  const nextTurnPlayerNumber = Number(match.draft.turnOrder[nextTurnIndex]) || null;
  match.draft.currentTurnPlayerNumber = nextTurnPlayerNumber;
  match.draft.turnStartedAt = now;
  match.draft.turnEndsAt = now + (Number(match.draft.turnDurationMs) || DRAFT_TURN_MS);

  logLifecycle('draft', 'current_turn', {
    code: room.code,
    turnIndex: nextTurnIndex,
    player: nextTurnPlayerNumber
  });
  return true;
}

function applyDraftPick(room, pickingPlayerNumber, requestedSpellId, pickReason = 'manual') {
  const match = room?.match;
  if (!match || match.phase !== MATCH_PHASE_DRAFT || !match.draft) {
    return { ok: false, code: 'DRAFT_NOT_ACTIVE', message: 'Draft is not active.' };
  }
  ensureDraftPoolEntries(match.draft);

  const now = Date.now();
  const currentTurnPlayerNumber = getDraftCurrentTurnPlayerNumber(match);
  if (Number(currentTurnPlayerNumber) !== Number(pickingPlayerNumber)) {
    return { ok: false, code: 'NOT_YOUR_TURN', message: 'It is not your draft turn.' };
  }

  const matchPlayer = getMatchPlayerByNumber(match, pickingPlayerNumber);
  if (!matchPlayer) {
    return { ok: false, code: 'MATCH_PLAYER_NOT_FOUND', message: 'Draft player not found.' };
  }

  const normalizedRequestedSpellId = normalizeSpellId(requestedSpellId);
  const validSpells = getValidDraftSpellsForMatchPlayer(match, matchPlayer);
  if (validSpells.length <= 0) {
    const advanced = advanceDraftTurn(room, now);
    if (!advanced) {
      return { ok: false, code: 'DRAFT_STUCK', message: 'No valid spells available and draft could not advance.' };
    }
    return {
      ok: false,
      code: 'NO_VALID_SPELLS',
      message: 'No valid spells available for this player.',
      skipped: true
    };
  }

  let pickedSpellId = normalizedRequestedSpellId;
  if (!pickedSpellId || !DRAFT_SPELL_POOL.includes(pickedSpellId)) {
    return { ok: false, code: 'INVALID_SPELL', message: 'Invalid draft spell.' };
  }

  const poolEntry = match.draft.pool?.[pickedSpellId];
  const remainingCopies = Number(poolEntry?.remainingCopies) || 0;
  if (remainingCopies <= 0) {
    return { ok: false, code: 'SPELL_UNAVAILABLE', message: `${pickedSpellId} is unavailable.` };
  }

  const draftedSpells = Array.isArray(matchPlayer.draftedSpells) ? matchPlayer.draftedSpells : [];
  if (draftedSpells.includes(pickedSpellId)) {
    return { ok: false, code: 'DUPLICATE_SPELL', message: `You already drafted ${pickedSpellId}.` };
  }

  poolEntry.remainingCopies = Math.max(0, remainingCopies - 1);
  draftedSpells.push(pickedSpellId);
  matchPlayer.draftedSpells = draftedSpells;
  matchPlayer.loadoutSpells = draftedSpells.slice(0, 3);

  if (!match.draft.picksByPlayerNumber[pickingPlayerNumber]) {
    match.draft.picksByPlayerNumber[pickingPlayerNumber] = [];
  }
  match.draft.picksByPlayerNumber[pickingPlayerNumber].push(pickedSpellId);
  match.draft.pickHistory.push({
    turnIndex: Number(match.draft.currentTurnIndex) || 0,
    playerNumber: Number(pickingPlayerNumber) || 0,
    spellId: pickedSpellId,
    reason: String(pickReason || 'manual'),
    timestamp: now
  });

  logLifecycle('draft', 'spell_picked', {
    code: room.code,
    turnIndex: match.draft.currentTurnIndex,
    player: pickingPlayerNumber,
    spell: pickedSpellId,
    remaining: poolEntry.remainingCopies,
    reason: pickReason
  });

  advanceDraftTurn(room, now);
  refreshRoomState(room, 'draft_pick');

  return {
    ok: true,
    spellId: pickedSpellId,
    playerNumber: Number(pickingPlayerNumber) || 0,
    reason: String(pickReason || 'manual'),
    room: serializeRoom(room),
    match: serializeMatch(match)
  };
}

function resolveCastDirection(matchPlayer, payloadDirection) {
  const inputDirection = normalizeInputVector(payloadDirection);
  if (inputDirection.x !== 0 || inputDirection.y !== 0) {
    return inputDirection;
  }
  const aimDirection = normalizeInputVector(matchPlayer?.aim);
  if (aimDirection.x !== 0 || aimDirection.y !== 0) {
    return aimDirection;
  }
  return { x: 0, y: 0 };
}

function resolveCastTargetPosition(payload) {
  const source = payload && typeof payload === 'object'
    ? (
      payload.targetPosition
      || payload.target
      || payload.position
      || null
    )
    : null;
  return clonePosition(source);
}

function resolveCastTargetDistance(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const sourceDistance = payload.targetDistance;
  if (!Number.isFinite(Number(sourceDistance))) return null;
  const normalizedDistance = Number(sourceDistance);
  if (normalizedDistance < 0) return null;
  return normalizedDistance;
}

function getPlayerChargeState(matchPlayer) {
  const chargeState = matchPlayer?.activeEffects?.charge;
  if (!chargeState || typeof chargeState !== 'object') return null;
  if (chargeState.active !== true) return null;
  const direction = normalizeInputVector(chargeState.direction);
  if (direction.x === 0 && direction.y === 0) return null;
  const chargeSpeed = getAbilityNumber(ABILITY_IDS.CHARGE, 'speed', 22, 0.01);
  return {
    active: true,
    direction,
    speed: Math.max(0, Number(chargeState.speed) || chargeSpeed),
    remainingDistance: Math.max(0, Number(chargeState.remainingDistance) || 0),
    startedAt: Number(chargeState.startedAt) || 0
  };
}

function clearPlayerChargeState(matchPlayer) {
  if (!matchPlayer) return;
  matchPlayer.activeEffects = {
    ...(matchPlayer.activeEffects || {}),
    charge: null
  };
}

function startPlayerChargeState(matchPlayer, direction, now) {
  if (!matchPlayer) return;
  const normalizedDirection = normalizeInputVector(direction);
  const chargeSpeed = getAbilityNumber(ABILITY_IDS.CHARGE, 'speed', 22, 0.01);
  const chargeDistance = getAbilityNumber(ABILITY_IDS.CHARGE, 'distance', 4.8, 0.1);
  matchPlayer.activeEffects = {
    ...(matchPlayer.activeEffects || {}),
    charge: {
      active: true,
      direction: normalizedDirection,
      speed: chargeSpeed,
      remainingDistance: chargeDistance,
      startedAt: Number(now) || Date.now()
    }
  };
}

function executeFireblastAbility(room, matchPlayer, payload, now) {
  const castDirection = resolveCastDirection(matchPlayer, payload?.direction || payload);
  if (castDirection.x === 0 && castDirection.y === 0) {
    return { ok: false, code: 'INVALID_AIM', message: 'Aim before casting fireblast.' };
  }

  const projectile = createFireblastProjectile(room.match, matchPlayer, castDirection, now);
  room.match.projectiles.push(projectile);
  logRuntimeVerbose(`[match] projectile_spawned code=${room.code} projectileId=${projectile.projectileId} owner=${projectile.ownerPlayerNumber}`);

  return {
    ok: true,
    projectileId: projectile.projectileId
  };
}

function executeBlinkAbility(room, matchPlayer, payload, now) {
  const castDirection = resolveCastDirection(matchPlayer, payload?.direction || payload);
  if (castDirection.x === 0 && castDirection.y === 0) {
    return { ok: false, code: 'INVALID_AIM', message: 'Aim before casting blink.' };
  }
  const blinkDistance = getAbilityNumber(ABILITY_IDS.BLINK, 'distance', 3.2, 0.1);

  const currentPosition = clonePosition(matchPlayer.position) || { x: 0, y: 0 };
  const rawTargetPosition = {
    x: currentPosition.x + (castDirection.x * blinkDistance),
    y: currentPosition.y + (castDirection.y * blinkDistance)
  };
  const clampedTargetPosition = clampPositionInsideArena(rawTargetPosition, PLAYER_RADIUS + 0.02);
  const safeTargetPosition = resolvePointAgainstArenaBlockers(
    clampedTargetPosition,
    currentPosition,
    room?.match,
    {
      padding: PLAYER_RADIUS,
      timestamp: now
    }
  );
  const finalTargetPosition = clampPositionInsideArena(safeTargetPosition, PLAYER_RADIUS + 0.02);
  matchPlayer.position = finalTargetPosition;
  matchPlayer.lastUpdated = now;

  return {
    ok: true,
    destination: clonePosition(finalTargetPosition)
  };
}

function executeShieldAbility(room, matchPlayer, now) {
  const shieldDurationMs = getAbilityNumber(ABILITY_IDS.SHIELD, 'durationMs', 1200, 50);
  const shieldUntil = now + shieldDurationMs;
  setPlayerActiveShieldUntil(matchPlayer, shieldUntil);
  logRuntimeVerbose(`[match] shield_activated code=${room.code} player=${matchPlayer.matchPlayerNumber} until=${shieldUntil}`);

  return {
    ok: true,
    activeMs: shieldDurationMs,
    shieldUntil
  };
}

function executePrismAbility(room, matchPlayer, now) {
  const prismDurationMs = getAbilityNumber(ABILITY_IDS.PRISM, 'durationMs', 600, 50);
  const prismUntil = now + prismDurationMs;
  setPlayerActivePrismUntil(matchPlayer, prismUntil);
  logRuntimeVerbose(`[match] prism_activated code=${room.code} player=${matchPlayer.matchPlayerNumber} until=${prismUntil}`);
  return {
    ok: true,
    activeMs: prismDurationMs,
    prismUntil
  };
}

function executeGustAbility(room, matchPlayer, payload, now) {
  const castDirection = resolveCastDirection(matchPlayer, payload?.direction || payload);
  const emitGustCastEvent = (reason = 'cast', metadata = null) => {
    const eventMetadata = {
      reason: String(reason || 'cast')
    };
    if (metadata && typeof metadata === 'object') {
      Object.assign(eventMetadata, metadata);
    }
    const gustCastEvent = createCombatEvent(room.match, {
      type: 'gust_cast',
      abilityId: ABILITY_IDS.GUST,
      sourcePlayerNumber: matchPlayer.matchPlayerNumber,
      targetPlayerNumber: 0,
      timestamp: now,
      knockback: { x: 0, y: 0 },
      metadata: eventMetadata
    });
    pushMatchHitEvent(room.match, gustCastEvent);
  };

  const opponent = getOpponentPlayer(room.match, matchPlayer.matchPlayerNumber);
  if (!opponent) {
    emitGustCastEvent('no_opponent');
    return {
      ok: true,
      hit: false,
      reason: 'no_opponent'
    };
  }
  if (!isPlayerTargetableForCombatHit(opponent, now)) {
    emitGustCastEvent('target_untargetable');
    return {
      ok: true,
      hit: false,
      reason: 'target_untargetable'
    };
  }

  const dx = opponent.position.x - matchPlayer.position.x;
  const dy = opponent.position.y - matchPlayer.position.y;
  const distance = Math.hypot(dx, dy);
  const gustRange = getAbilityNumber(ABILITY_IDS.GUST, 'range', 3.4, 0.1);
  if (distance > gustRange) {
    emitGustCastEvent('out_of_range', {
      range: Number(gustRange) || 0,
      distance: Number(distance.toFixed(2)) || 0
    });
    return {
      ok: true,
      hit: false,
      reason: 'out_of_range',
      range: gustRange
    };
  }
  const awayDirection = distance > 0.0001
    ? { x: dx / distance, y: dy / distance }
    : (castDirection.x !== 0 || castDirection.y !== 0 ? castDirection : { x: 1, y: 0 });

  if (isPointInsidePrismCone(opponent, matchPlayer.position, now)) {
    const prismDirection = getPrismFacingDirection(opponent, {
      x: -awayDirection.x,
      y: -awayDirection.y
    });
    const gustKnockbackImpulse = getAbilityNumber(ABILITY_IDS.GUST, 'knockbackImpulse', 8.8, 0);
    const reflectedKnockback = {
      x: prismDirection.x * gustKnockbackImpulse,
      y: prismDirection.y * gustKnockbackImpulse
    };
    matchPlayer.velocity = sanitizeVector(matchPlayer.velocity);
    matchPlayer.velocity.x += reflectedKnockback.x;
    matchPlayer.velocity.y += reflectedKnockback.y;
    matchPlayer.lastHitAt = now;
    const gustDamage = getAbilityDamage(ABILITY_IDS.GUST);
    const reflectedDamageResult = applyDamageToPlayer({
      room,
      match: room.match,
      targetPlayer: matchPlayer,
      sourcePlayer: opponent,
      sourcePlayerNumber: opponent.matchPlayerNumber,
      abilityId: ABILITY_IDS.GUST,
      amount: gustDamage,
      cause: 'spell_damage',
      timestamp: now
    });
    const reflectedEvent = createCombatEvent(room.match, {
      type: 'prism_reflect_gust',
      abilityId: ABILITY_IDS.PRISM,
      sourcePlayerNumber: opponent.matchPlayerNumber,
      targetPlayerNumber: matchPlayer.matchPlayerNumber,
      timestamp: now,
      knockback: reflectedKnockback,
      metadata: {
        reflectedAbilityId: ABILITY_IDS.GUST,
        damage: Number(reflectedDamageResult.amount) || 0,
        healthBefore: Number(reflectedDamageResult.beforeHealth) || 0,
        healthAfter: Number(reflectedDamageResult.afterHealth) || 0
      }
    });
    pushMatchHitEvent(room.match, reflectedEvent);
    logLifecycle('ability', 'gust_reflected_by_prism', {
      code: room.code,
      source: matchPlayer.matchPlayerNumber,
      reflector: opponent.matchPlayerNumber
    });
    return {
      ok: true,
      hit: false,
      reflected: true,
      reason: 'reflected_by_prism',
      targetPlayerNumber: matchPlayer.matchPlayerNumber
    };
  }

  opponent.velocity = sanitizeVector(opponent.velocity);
  const gustKnockbackImpulse = getAbilityNumber(ABILITY_IDS.GUST, 'knockbackImpulse', 8.8, 0);
  const knockback = {
    x: awayDirection.x * gustKnockbackImpulse,
    y: awayDirection.y * gustKnockbackImpulse
  };
  opponent.velocity.x += knockback.x;
  opponent.velocity.y += knockback.y;
  opponent.lastHitAt = now;
  const gustDamage = getAbilityDamage(ABILITY_IDS.GUST);
  const gustDamageResult = applyDamageToPlayer({
    room,
    match: room.match,
    targetPlayer: opponent,
    sourcePlayer: matchPlayer,
    sourcePlayerNumber: matchPlayer.matchPlayerNumber,
    abilityId: ABILITY_IDS.GUST,
    amount: gustDamage,
    cause: 'spell_damage',
    timestamp: now
  });

  const gustEvent = createCombatEvent(room.match, {
    type: 'gust_hit',
    abilityId: ABILITY_IDS.GUST,
    sourcePlayerNumber: matchPlayer.matchPlayerNumber,
    targetPlayerNumber: opponent.matchPlayerNumber,
    timestamp: now,
    knockback,
    metadata: {
      range: Number(distance.toFixed(2)),
      damage: Number(gustDamageResult.amount) || 0,
      healthBefore: Number(gustDamageResult.beforeHealth) || 0,
      healthAfter: Number(gustDamageResult.afterHealth) || 0
    }
  });
  pushMatchHitEvent(room.match, gustEvent);

  logRuntimeVerbose(`[match] gust_hit code=${room.code} source=${matchPlayer.matchPlayerNumber} target=${opponent.matchPlayerNumber} distance=${distance.toFixed(2)}`);
  logRuntimeVerbose(`[match] knockback_applied code=${room.code} target=${opponent.matchPlayerNumber} vx=${opponent.velocity.x.toFixed(2)} vy=${opponent.velocity.y.toFixed(2)}`);

  return {
    ok: true,
    hit: true,
    targetPlayerNumber: opponent.matchPlayerNumber,
    distance
  };
}

function executeSolarAbility(room, matchPlayer, payload, now) {
  const castDirection = resolveCastDirection(matchPlayer, payload?.direction || payload);
  if (castDirection.x === 0 && castDirection.y === 0) {
    return { ok: false, code: 'INVALID_AIM', message: 'Aim before casting solar.' };
  }

  const projectile = createSolarProjectile(room.match, matchPlayer, castDirection, now);
  room.match.projectiles.push(projectile);
  logLifecycle('ability', 'solar_spawned', {
    code: room.code,
    projectileId: projectile.projectileId,
    owner: projectile.ownerPlayerNumber
  });

  return {
    ok: true,
    projectileId: projectile.projectileId
  };
}

function executeRiftAbility(room, matchPlayer, payload, now) {
  const castDirection = resolveCastDirection(matchPlayer, payload?.direction || payload);
  const targetPosition = resolveCastTargetPosition(payload);
  const targetDistance = resolveCastTargetDistance(payload);
  const portalRadius = getRiftPortalRadiusDefault();
  const pending = getPlayerRiftPendingState(matchPlayer);
  const pendingIsActive = pending && Number(pending.expiresAt) > now;

  if (pending && !pendingIsActive) {
    clearPlayerRiftPendingState(matchPlayer);
  }

  function resolvePlacement(originPoint, maxDistance) {
    const origin = clonePosition(originPoint);
    const maxRange = Math.max(0.05, Number(maxDistance) || 0);
    if (!origin || maxRange <= 0) return null;

    if (targetPosition) {
      const dx = targetPosition.x - origin.x;
      const dy = targetPosition.y - origin.y;
      const rawDistance = Math.hypot(dx, dy);
      if (rawDistance > 0.0001) {
        const targetDirection = {
          x: dx / rawDistance,
          y: dy / rawDistance
        };
        const desiredDistance = Math.min(rawDistance, maxRange);
        return findRiftPortalPlacement(
          room.match,
          origin,
          targetDirection,
          desiredDistance,
          portalRadius,
          now
        );
      }
    }

    if (targetDistance !== null && castDirection.x !== 0 && castDirection.y !== 0) {
      const desiredDistance = Math.min(maxRange, Math.max(0, targetDistance));
      return findRiftPortalPlacement(
        room.match,
        origin,
        castDirection,
        desiredDistance,
        portalRadius,
        now
      );
    }

    if (castDirection.x === 0 && castDirection.y === 0) {
      return null;
    }

    return findRiftPortalPlacement(
      room.match,
      origin,
      castDirection,
      maxRange,
      portalRadius,
      now
    );
  }

  if (pendingIsActive) {
    const portalB = resolvePlacement(
      pending.portalA,
      getAbilityNumber(ABILITY_IDS.RIFT, 'placementRangeBFromA', 12.0, 0.1)
    );
    if (!portalB) {
      setAbilityReadyAt(matchPlayer, ABILITY_IDS.RIFT, now);
      return {
        ok: false,
        code: 'INVALID_RIFT_PLACEMENT',
        message: 'Rift B placement blocked.'
      };
    }

    const activeRifts = ensureMatchRifts(room.match).filter((rift) => {
      if (!rift) return false;
      if ((Number(rift.expiresAt) || 0) <= now) return false;
      return Number(rift.ownerPlayerNumber) !== Number(matchPlayer.matchPlayerNumber);
    });
    const rift = createRiftPair(room.match, matchPlayer.matchPlayerNumber, pending.portalA, portalB, now);
    activeRifts.push(rift);
    room.match.rifts = activeRifts;
    clearPlayerRiftPendingState(matchPlayer);

    const linkedEvent = createCombatEvent(room.match, {
      type: 'rift_linked',
      abilityId: ABILITY_IDS.RIFT,
      sourcePlayerNumber: matchPlayer.matchPlayerNumber,
      targetPlayerNumber: 0,
      timestamp: now,
      metadata: {
        riftId: rift.riftId,
        portalA: clonePosition(rift.portalA),
        portalB: clonePosition(rift.portalB),
        durationMs: Math.max(0, Number(rift.expiresAt) - now)
      }
    });
    pushMatchHitEvent(room.match, linkedEvent);

    return {
      ok: true,
      linked: true,
      riftStep: 'B',
      riftId: rift.riftId,
      portalA: clonePosition(rift.portalA),
      portalB: clonePosition(rift.portalB),
      durationMs: Math.max(0, Number(rift.expiresAt) - now)
    };
  }

  const portalA = resolvePlacement(
    matchPlayer.position,
    getAbilityNumber(ABILITY_IDS.RIFT, 'placementRangeA', 7.0, 0.1)
  );
  if (!portalA) {
    setAbilityReadyAt(matchPlayer, ABILITY_IDS.RIFT, now);
    return {
      ok: false,
      code: 'INVALID_RIFT_PLACEMENT',
      message: 'Rift A placement blocked.'
    };
  }

  const pendingExpiresAt = now + getRiftUnfinishedTimeoutMsDefault();
  setPlayerRiftPendingState(matchPlayer, {
    portalA,
    createdAt: now,
    expiresAt: pendingExpiresAt
  });
  setAbilityReadyAt(matchPlayer, ABILITY_IDS.RIFT, now);

  const placedEvent = createCombatEvent(room.match, {
    type: 'rift_place_a',
    abilityId: ABILITY_IDS.RIFT,
    sourcePlayerNumber: matchPlayer.matchPlayerNumber,
    targetPlayerNumber: 0,
    timestamp: now,
    metadata: {
      portalA: clonePosition(portalA),
      pendingExpiresAt
    }
  });
  pushMatchHitEvent(room.match, placedEvent);

  return {
    ok: true,
    pendingPlacement: true,
    riftStep: 'A',
    portalA: clonePosition(portalA),
    pendingExpiresAt,
    cooldownStartsOnLink: true
  };
}

function executePhantomAbility(room, matchPlayer, now) {
  const existingPhantom = getPlayerPhantomState(matchPlayer);
  if (existingPhantom) {
    const existingVanishUntil = Number(existingPhantom.vanishUntil) || 0;
    const existingIllusionUntil = Number(existingPhantom.illusionExpiresAt) || 0;
    if (existingVanishUntil > now || existingIllusionUntil > now) {
      return {
        ok: false,
        code: 'PHANTOM_ALREADY_ACTIVE',
        message: 'Phantom is already active.'
      };
    }
  }

  const vanishDurationMs = getAbilityNumber(ABILITY_IDS.PHANTOM, 'vanishDurationMs', 300, 50);
  const splitRadius = getAbilityNumber(ABILITY_IDS.PHANTOM, 'splitRadius', 0.65, 0.05);
  const illusionLifetimeMs = getAbilityNumber(ABILITY_IDS.PHANTOM, 'illusionLifetimeMs', 2000, 50);
  const origin = clonePosition(matchPlayer.position) || { x: 0, y: 0 };
  const splitOffset = createPhantomSplitOffset(splitRadius);

  matchPlayer.input = { x: 0, y: 0 };
  matchPlayer.velocity = { x: 0, y: 0 };
  matchPlayer.lastUpdated = now;

  setPlayerPhantomState(matchPlayer, {
    vanishUntil: now + vanishDurationMs,
    origin,
    splitOffset,
    splitApplied: false,
    illusionOffset: { x: 0, y: 0 },
    illusionPosition: null,
    illusionFacing: normalizeInputVector(matchPlayer.aim),
    illusionExpiresAt: 0
  });

  const vanishEvent = createCombatEvent(room.match, {
    type: 'phantom_vanish',
    abilityId: ABILITY_IDS.PHANTOM,
    sourcePlayerNumber: matchPlayer.matchPlayerNumber,
    targetPlayerNumber: matchPlayer.matchPlayerNumber,
    timestamp: now,
    metadata: {
      vanishDurationMs,
      illusionLifetimeMs,
      splitRadius
    }
  });
  pushMatchHitEvent(room.match, vanishEvent);

  return {
    ok: true,
    vanishDurationMs,
    illusionLifetimeMs,
    splitRadius
  };
}

function executeChargeAbility(room, matchPlayer, payload, now) {
  if (getPlayerChargeState(matchPlayer)) {
    return { ok: false, code: 'ALREADY_CHARGING', message: 'Charge is already active.' };
  }
  const castDirection = resolveCastDirection(matchPlayer, payload?.direction || payload);
  if (castDirection.x === 0 && castDirection.y === 0) {
    return { ok: false, code: 'INVALID_AIM', message: 'Aim before casting charge.' };
  }

  startPlayerChargeState(matchPlayer, castDirection, now);
  matchPlayer.input = { x: 0, y: 0 };
  matchPlayer.velocity = { x: 0, y: 0 };
  matchPlayer.lastUpdated = now;

  logLifecycle('ability', 'charge_started', {
    code: room.code,
    player: matchPlayer.matchPlayerNumber,
    direction: `${castDirection.x.toFixed(2)},${castDirection.y.toFixed(2)}`,
    distance: getAbilityNumber(ABILITY_IDS.CHARGE, 'distance', 4.8, 0.1)
  });

  const chargeDistance = getAbilityNumber(ABILITY_IDS.CHARGE, 'distance', 4.8, 0.1);
  const chargeSpeed = getAbilityNumber(ABILITY_IDS.CHARGE, 'speed', 22, 0.01);
  return {
    ok: true,
    activeMs: Math.round((chargeDistance / chargeSpeed) * 1000),
    distance: chargeDistance
  };
}

function executeShockAbility(room, matchPlayer, payload, now) {
  const castDirection = resolveCastDirection(matchPlayer, payload?.direction || payload);
  if (castDirection.x === 0 && castDirection.y === 0) {
    return { ok: false, code: 'INVALID_AIM', message: 'Aim before casting shock.' };
  }

  const opponent = getOpponentPlayer(room.match, matchPlayer.matchPlayerNumber);
  if (!opponent) {
    return {
      ok: true,
      hit: false,
      reason: 'no_opponent'
    };
  }
  if (!isPlayerTargetableForCombatHit(opponent, now)) {
    return {
      ok: true,
      hit: false,
      reason: 'target_untargetable'
    };
  }

  const dx = opponent.position.x - matchPlayer.position.x;
  const dy = opponent.position.y - matchPlayer.position.y;
  const distance = Math.hypot(dx, dy);
  const shockRange = getAbilityNumber(ABILITY_IDS.SHOCK, 'range', 2.9, 0.1);
  if (distance > shockRange) {
    return {
      ok: true,
      hit: false,
      reason: 'out_of_range',
      range: shockRange
    };
  }

  const directionToOpponent = distance > 0.0001
    ? { x: dx / distance, y: dy / distance }
    : castDirection;
  const facingDot = dotProduct(castDirection, directionToOpponent);
  const shockHalfAngleDeg = getAbilityNumber(ABILITY_IDS.SHOCK, 'halfAngleDeg', 40, 1);
  const shockCosThreshold = Math.cos((shockHalfAngleDeg * Math.PI) / 180);
  if (facingDot < shockCosThreshold) {
    return {
      ok: true,
      hit: false,
      reason: 'outside_cone',
      dot: Number(facingDot.toFixed(3))
    };
  }

  if (isPointInsidePrismCone(opponent, matchPlayer.position, now)) {
    const prismBlockEvent = createCombatEvent(room.match, {
      type: 'prism_block_shock',
      abilityId: ABILITY_IDS.PRISM,
      sourcePlayerNumber: opponent.matchPlayerNumber,
      targetPlayerNumber: matchPlayer.matchPlayerNumber,
      timestamp: now,
      metadata: {
        blockedAbilityId: ABILITY_IDS.SHOCK
      }
    });
    pushMatchHitEvent(room.match, prismBlockEvent);
    return {
      ok: true,
      hit: false,
      reason: 'blocked_by_prism'
    };
  }

  opponent.velocity = sanitizeVector(opponent.velocity);
  const shockKnockbackImpulse = getAbilityNumber(ABILITY_IDS.SHOCK, 'knockbackImpulse', 11.2, 0);
  const knockback = {
    x: directionToOpponent.x * shockKnockbackImpulse,
    y: directionToOpponent.y * shockKnockbackImpulse
  };
  opponent.velocity.x += knockback.x;
  opponent.velocity.y += knockback.y;
  opponent.lastHitAt = now;
  const shockDamage = getAbilityDamage(ABILITY_IDS.SHOCK);
  const shockDamageResult = applyDamageToPlayer({
    room,
    match: room.match,
    targetPlayer: opponent,
    sourcePlayer: matchPlayer,
    sourcePlayerNumber: matchPlayer.matchPlayerNumber,
    abilityId: ABILITY_IDS.SHOCK,
    amount: shockDamage,
    cause: 'spell_damage',
    timestamp: now
  });

  const shockEvent = createCombatEvent(room.match, {
    type: 'shock_hit',
    abilityId: ABILITY_IDS.SHOCK,
    sourcePlayerNumber: matchPlayer.matchPlayerNumber,
    targetPlayerNumber: opponent.matchPlayerNumber,
    timestamp: now,
    knockback,
    metadata: {
      distance: Number(distance.toFixed(2)),
      dot: Number(facingDot.toFixed(3)),
      damage: Number(shockDamageResult.amount) || 0,
      healthBefore: Number(shockDamageResult.beforeHealth) || 0,
      healthAfter: Number(shockDamageResult.afterHealth) || 0
    }
  });
  pushMatchHitEvent(room.match, shockEvent);

  logLifecycle('ability', 'shock_hit', {
    code: room.code,
    source: matchPlayer.matchPlayerNumber,
    target: opponent.matchPlayerNumber,
    distance: distance.toFixed(2)
  });
  logLifecycle('match', 'knockback_applied', {
    code: room.code,
    target: opponent.matchPlayerNumber,
    vx: opponent.velocity.x.toFixed(2),
    vy: opponent.velocity.y.toFixed(2)
  });

  return {
    ok: true,
    hit: true,
    targetPlayerNumber: opponent.matchPlayerNumber,
    distance
  };
}

function executeHookAbility(room, matchPlayer, payload, now) {
  const castDirection = resolveCastDirection(matchPlayer, payload?.direction || payload);
  if (castDirection.x === 0 && castDirection.y === 0) {
    return { ok: false, code: 'INVALID_AIM', message: 'Aim before casting hook.' };
  }

  const projectile = createHookProjectile(room.match, matchPlayer, castDirection, now);
  room.match.projectiles.push(projectile);
  logLifecycle('ability', 'hook_spawned', {
    code: room.code,
    projectileId: projectile.projectileId,
    owner: projectile.ownerPlayerNumber
  });

  return {
    ok: true,
    projectileId: projectile.projectileId
  };
}

function findValidWallSpawnPosition(match, matchPlayer, direction, now) {
  const directionVector = normalizeInputVector(direction);
  const casterPosition = clonePosition(matchPlayer.position) || { x: 0, y: 0 };
  const wallSpawnOffset = getAbilityNumber(ABILITY_IDS.WALL, 'spawnOffset', 1.6, 0.1);
  const wallHalfLength = getWallHalfLengthDefault();
  const wallHalfThickness = getWallHalfThicknessDefault();
  const wallDurationMs = getWallDurationMsDefault();
  const offsets = [
    wallSpawnOffset,
    wallSpawnOffset + 0.55,
    wallSpawnOffset + 1.1
  ];

  for (const offset of offsets) {
    const candidate = clampPositionInsideArena({
      x: casterPosition.x + (directionVector.x * offset),
      y: casterPosition.y + (directionVector.y * offset)
    }, wallHalfLength + wallHalfThickness + 0.08);
    const testWall = {
      ownerPlayerNumber: matchPlayer.matchPlayerNumber,
      position: candidate,
      direction: directionVector,
      halfLength: wallHalfLength,
      halfThickness: wallHalfThickness,
      spawnedAt: now,
      expiresAt: now + wallDurationMs
    };

    const overlapsPlayer = (Array.isArray(match?.players) ? match.players : []).some((player) =>
      isPointInsideWall(player.position, testWall, {
        padding: PLAYER_RADIUS * 0.92,
        defaultHalfLength: wallHalfLength,
        defaultHalfThickness: wallHalfThickness
      })
    );
    if (overlapsPlayer) continue;

    const overlapsExistingWall = Boolean(findBlockingWallForPoint(candidate, match.walls, {
      padding: wallHalfThickness * 0.5,
      timestamp: now,
      defaultHalfLength: wallHalfLength,
      defaultHalfThickness: wallHalfThickness
    }));
    if (overlapsExistingWall) continue;
    const overlapsPillar = Boolean(findBlockingRoundPillarForPoint(candidate, match, {
      padding: wallHalfThickness * 0.75
    }));
    if (overlapsPillar) continue;
    return candidate;
  }

  const fallbackCandidate = clampPositionInsideArena({
    x: casterPosition.x + (directionVector.x * wallSpawnOffset),
    y: casterPosition.y + (directionVector.y * wallSpawnOffset)
  }, wallHalfLength + wallHalfThickness + 0.08);
  return resolvePointAgainstRoundPillars(
    fallbackCandidate,
    casterPosition,
    match,
    { padding: wallHalfThickness * 0.75 }
  );
}

function executeWallAbility(room, matchPlayer, payload, now) {
  const castDirection = resolveCastDirection(matchPlayer, payload?.direction || payload);
  if (castDirection.x === 0 && castDirection.y === 0) {
    return { ok: false, code: 'INVALID_AIM', message: 'Aim before casting wall.' };
  }

  if (!Array.isArray(room.match.walls)) {
    room.match.walls = [];
  }
  pruneExpiredWalls(room.match, now);

  const wallPosition = findValidWallSpawnPosition(room.match, matchPlayer, castDirection, now);
  const wall = createWallEntity(room.match, matchPlayer.matchPlayerNumber, wallPosition, castDirection, now);
  room.match.walls.push(wall);
  logLifecycle('ability', 'wall_spawned', {
    code: room.code,
    wallId: wall.wallId,
    owner: wall.ownerPlayerNumber,
    expiresAt: wall.expiresAt
  });

  return {
    ok: true,
    wallId: wall.wallId,
    durationMs: getWallDurationMsDefault()
  };
}

function executeRewindAbility(room, matchPlayer, now) {
  const history = ensurePlayerPositionHistory(matchPlayer, now);
  if (!history.length) {
    return { ok: false, code: 'NO_REWIND_HISTORY', message: 'No rewind history available.' };
  }

  const rewindLookbackMs = getAbilityNumber(ABILITY_IDS.REWIND, 'lookbackMs', 1000, 50);
  const targetTimestamp = now - rewindLookbackMs;
  let selectedSnapshot = null;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (Number(entry.timestamp) <= targetTimestamp) {
      selectedSnapshot = entry;
      break;
    }
  }
  if (!selectedSnapshot) {
    selectedSnapshot = history[0];
  }
  if (!selectedSnapshot) {
    return { ok: false, code: 'NO_REWIND_TARGET', message: 'Unable to resolve rewind destination.' };
  }

  const currentPosition = clonePosition(matchPlayer.position) || { x: 0, y: 0 };
  const rawDestination = {
    x: Number(selectedSnapshot.x) || currentPosition.x,
    y: Number(selectedSnapshot.y) || currentPosition.y
  };
  const clampedDestination = clampPositionInsideArena(rawDestination, PLAYER_RADIUS + 0.02);
  const safeDestination = resolvePointAgainstArenaBlockers(
    clampedDestination,
    currentPosition,
    room.match,
    {
      padding: PLAYER_RADIUS,
      timestamp: now
    }
  );

  matchPlayer.position = safeDestination;
  matchPlayer.input = { x: 0, y: 0 };
  matchPlayer.velocity = { x: 0, y: 0 };
  matchPlayer.lastUpdated = now;
  ensurePlayerPositionHistory(matchPlayer, now);

  const rewindEvent = createCombatEvent(room.match, {
    type: 'rewind_used',
    abilityId: ABILITY_IDS.REWIND,
    sourcePlayerNumber: matchPlayer.matchPlayerNumber,
    targetPlayerNumber: matchPlayer.matchPlayerNumber,
    timestamp: now,
    metadata: {
      from: currentPosition,
      to: safeDestination
    }
  });
  pushMatchHitEvent(room.match, rewindEvent);

  logLifecycle('ability', 'rewind_destination', {
    code: room.code,
    player: matchPlayer.matchPlayerNumber,
    x: safeDestination.x.toFixed(2),
    y: safeDestination.y.toFixed(2)
  });

  return {
    ok: true,
    destination: clonePosition(safeDestination),
    rewoundMs: Math.max(0, now - (Number(selectedSnapshot.timestamp) || now))
  };
}

function executeAbilityCast(room, matchPlayer, abilityDef, payload, now) {
  if (!room || !matchPlayer || !abilityDef) {
    return { ok: false, code: 'ABILITY_EXECUTION_FAILED', message: 'Ability execution failed.' };
  }

  if (abilityDef.id === ABILITY_IDS.FIREBLAST) {
    return executeFireblastAbility(room, matchPlayer, payload, now);
  }
  if (abilityDef.id === ABILITY_IDS.BLINK) {
    return executeBlinkAbility(room, matchPlayer, payload, now);
  }
  if (abilityDef.id === ABILITY_IDS.SHIELD) {
    return executeShieldAbility(room, matchPlayer, now);
  }
  if (abilityDef.id === ABILITY_IDS.PRISM) {
    return executePrismAbility(room, matchPlayer, now);
  }
  if (abilityDef.id === ABILITY_IDS.GUST) {
    return executeGustAbility(room, matchPlayer, payload, now);
  }
  if (abilityDef.id === ABILITY_IDS.CHARGE) {
    return executeChargeAbility(room, matchPlayer, payload, now);
  }
  if (abilityDef.id === ABILITY_IDS.SHOCK) {
    return executeShockAbility(room, matchPlayer, payload, now);
  }
  if (abilityDef.id === ABILITY_IDS.HOOK) {
    return executeHookAbility(room, matchPlayer, payload, now);
  }
  if (abilityDef.id === ABILITY_IDS.SOLAR) {
    return executeSolarAbility(room, matchPlayer, payload, now);
  }
  if (abilityDef.id === ABILITY_IDS.RIFT) {
    return executeRiftAbility(room, matchPlayer, payload, now);
  }
  if (abilityDef.id === ABILITY_IDS.PHANTOM) {
    return executePhantomAbility(room, matchPlayer, now);
  }
  if (abilityDef.id === ABILITY_IDS.WALL) {
    return executeWallAbility(room, matchPlayer, payload, now);
  }
  if (abilityDef.id === ABILITY_IDS.REWIND) {
    return executeRewindAbility(room, matchPlayer, now);
  }
  return {
    ok: false,
    code: 'ABILITY_NOT_IMPLEMENTED',
    message: `${abilityDef.id} is not implemented yet.`
  };
}

function buildWallCollisionOptions(padding, timestamp) {
  return {
    padding,
    timestamp,
    defaultHalfLength: getWallHalfLengthDefault(),
    defaultHalfThickness: getWallHalfThicknessDefault()
  };
}

function applyChargeMovementRuntime({ room, match, player, previousPosition, deltaSeconds, tickTimestamp }) {
  const chargeState = getPlayerChargeState(player);
  if (!chargeState) {
    return {
      handled: false,
      nextPosition: previousPosition,
      chargeState: null,
      chargeBlockedByWall: false,
      chargeEndedByDistance: false
    };
  }

  player.input = { x: 0, y: 0 };
  player.velocity = { x: 0, y: 0 };
  const stepDistance = Math.max(0, Math.min(chargeState.remainingDistance, chargeState.speed * deltaSeconds));
  const proposedPosition = {
    x: previousPosition.x + (chargeState.direction.x * stepDistance),
    y: previousPosition.y + (chargeState.direction.y * stepDistance)
  };
  const wallResolvedChargePosition = resolvePointAgainstArenaBlockers(
    proposedPosition,
    previousPosition,
    match,
    {
      padding: PLAYER_RADIUS,
      timestamp: tickTimestamp
    }
  );
  const resolvedChargePosition = clampPositionInsideArena(
    wallResolvedChargePosition,
    PLAYER_RADIUS + 0.02
  );
  const movedDistance = Math.hypot(
    resolvedChargePosition.x - previousPosition.x,
    resolvedChargePosition.y - previousPosition.y
  );
  const chargeBlockedByWall = stepDistance > 0.02 && movedDistance < (stepDistance * 0.35);
  const remainingDistance = Math.max(0, chargeState.remainingDistance - movedDistance);
  let chargeEndedByDistance = false;
  if (remainingDistance <= 0.001) {
    clearPlayerChargeState(player);
    chargeEndedByDistance = true;
  } else {
    player.activeEffects = {
      ...(player.activeEffects || {}),
      charge: {
        ...chargeState,
        active: true,
        remainingDistance
      }
    };
  }

  if (chargeBlockedByWall) {
    clearPlayerChargeState(player);
    logLifecycle('ability', 'charge_end', {
      code: room.code,
      player: player.matchPlayerNumber,
      reason: 'blocked_by_wall'
    });
  } else if (chargeEndedByDistance) {
    logLifecycle('ability', 'charge_end', {
      code: room.code,
      player: player.matchPlayerNumber,
      reason: 'distance_reached'
    });
  }

  return {
    handled: true,
    nextPosition: resolvedChargePosition,
    chargeState,
    chargeBlockedByWall,
    chargeEndedByDistance
  };
}

function handleChargePostMovementRuntime({ room, match, player, tickTimestamp }) {
  const chargeState = getPlayerChargeState(player);
  if (!chargeState) return false;
  const targetPlayer = getOpponentPlayer(match, player.matchPlayerNumber);
  if (!targetPlayer || targetPlayer.connected === false) return false;
  if (!isPlayerTargetableForCombatHit(targetPlayer, tickTimestamp)) return false;

  const dx = targetPlayer.position.x - player.position.x;
  const dy = targetPlayer.position.y - player.position.y;
  const chargeHitRadius = getAbilityNumber(ABILITY_IDS.CHARGE, 'hitRadius', 0.76, 0.05);
  const collisionRadius = PLAYER_RADIUS + chargeHitRadius;
  const didCollide = (dx * dx + dy * dy) <= (collisionRadius * collisionRadius);
  if (!didCollide) return false;

  const incomingPoint = {
    x: targetPlayer.position.x - (chargeState.direction.x * collisionRadius),
    y: targetPlayer.position.y - (chargeState.direction.y * collisionRadius)
  };
  if (
    isPointInsidePrismCone(targetPlayer, player.position, tickTimestamp)
    || isPointInsidePrismCone(targetPlayer, incomingPoint, tickTimestamp)
  ) {
    clearPlayerChargeState(player);
    const chargeKnockbackImpulse = getAbilityNumber(ABILITY_IDS.CHARGE, 'knockbackImpulse', 13.2, 0);
    const prismPushbackMultiplier = getAbilityNumber(ABILITY_IDS.PRISM, 'chargePushbackMultiplierOnPrismUser', 0.30, 0);
    const pushbackKnockback = {
      x: chargeState.direction.x * chargeKnockbackImpulse * prismPushbackMultiplier,
      y: chargeState.direction.y * chargeKnockbackImpulse * prismPushbackMultiplier
    };
    targetPlayer.velocity = sanitizeVector(targetPlayer.velocity);
    targetPlayer.velocity.x += pushbackKnockback.x;
    targetPlayer.velocity.y += pushbackKnockback.y;
    targetPlayer.lastHitAt = tickTimestamp;

    const settleDistance = (PLAYER_RADIUS * 2) + 0.14;
    const desiredChargerPosition = {
      x: targetPlayer.position.x - (chargeState.direction.x * settleDistance),
      y: targetPlayer.position.y - (chargeState.direction.y * settleDistance)
    };
    const clampedChargerPosition = clampPositionInsideArena(desiredChargerPosition, PLAYER_RADIUS + 0.02);
    player.position = resolvePointAgainstArenaBlockers(
      clampedChargerPosition,
      player.position,
      match,
      {
        padding: PLAYER_RADIUS,
        timestamp: tickTimestamp
      }
    );
    player.lastUpdated = tickTimestamp;

    const prismBlockEvent = createCombatEvent(match, {
      type: 'prism_block_charge',
      abilityId: ABILITY_IDS.PRISM,
      sourcePlayerNumber: targetPlayer.matchPlayerNumber,
      targetPlayerNumber: player.matchPlayerNumber,
      timestamp: tickTimestamp,
      knockback: pushbackKnockback,
      metadata: {
        blockedAbilityId: ABILITY_IDS.CHARGE,
        pushbackMultiplier: prismPushbackMultiplier
      }
    });
    pushMatchHitEvent(match, prismBlockEvent);
    logLifecycle('ability', 'charge_blocked_by_prism', {
      code: room.code,
      source: player.matchPlayerNumber,
      blocker: targetPlayer.matchPlayerNumber
    });
    return true;
  }

  clearPlayerChargeState(player);
  targetPlayer.velocity = sanitizeVector(targetPlayer.velocity);
  const chargeKnockbackImpulse = getAbilityNumber(ABILITY_IDS.CHARGE, 'knockbackImpulse', 13.2, 0);
  const knockback = {
    x: chargeState.direction.x * chargeKnockbackImpulse,
    y: chargeState.direction.y * chargeKnockbackImpulse
  };
  targetPlayer.velocity.x += knockback.x;
  targetPlayer.velocity.y += knockback.y;
  targetPlayer.lastHitAt = tickTimestamp;
  const chargeDamage = getAbilityDamage(ABILITY_IDS.CHARGE);
  const chargeDamageResult = applyDamageToPlayer({
    room,
    match,
    targetPlayer,
    sourcePlayer: player,
    sourcePlayerNumber: player.matchPlayerNumber,
    abilityId: ABILITY_IDS.CHARGE,
    amount: chargeDamage,
    cause: 'spell_damage',
    timestamp: tickTimestamp
  });

  const settleDistance = (PLAYER_RADIUS * 2) + 0.14;
  const desiredChargerPosition = {
    x: targetPlayer.position.x - (chargeState.direction.x * settleDistance),
    y: targetPlayer.position.y - (chargeState.direction.y * settleDistance)
  };
  const clampedChargerPosition = clampPositionInsideArena(desiredChargerPosition, PLAYER_RADIUS + 0.02);
  player.position = resolvePointAgainstArenaBlockers(
    clampedChargerPosition,
    player.position,
    match,
    {
      padding: PLAYER_RADIUS,
      timestamp: tickTimestamp
    }
  );
  player.lastUpdated = tickTimestamp;

  const chargeEvent = createCombatEvent(match, {
    type: 'charge_hit',
    abilityId: ABILITY_IDS.CHARGE,
    sourcePlayerNumber: player.matchPlayerNumber,
    targetPlayerNumber: targetPlayer.matchPlayerNumber,
    timestamp: tickTimestamp,
    knockback,
    metadata: {
      damage: Number(chargeDamageResult.amount) || 0,
      healthBefore: Number(chargeDamageResult.beforeHealth) || 0,
      healthAfter: Number(chargeDamageResult.afterHealth) || 0
    }
  });
  pushMatchHitEvent(match, chargeEvent);
  logLifecycle('ability', 'charge_collision', {
    code: room.code,
    source: player.matchPlayerNumber,
    target: targetPlayer.matchPlayerNumber
  });
  logLifecycle('ability', 'charge_end', {
    code: room.code,
    player: player.matchPlayerNumber,
    reason: 'enemy_hit'
  });
  logLifecycle('match', 'knockback_applied', {
    code: room.code,
    target: targetPlayer.matchPlayerNumber,
    vx: targetPlayer.velocity.x.toFixed(2),
    vy: targetPlayer.velocity.y.toFixed(2)
  });
  return true;
}

function shouldPrismReflectProjectileAbility(abilityId) {
  const normalizedAbilityId = normalizeSpellId(abilityId);
  return normalizedAbilityId === ABILITY_IDS.FIREBLAST
    || normalizedAbilityId === ABILITY_IDS.HOOK
    || normalizedAbilityId === ABILITY_IDS.GUST;
}

function resolvePrismProjectileIntercept({ room, match, projectile, targetPlayer, previousPosition, tickTimestamp }) {
  if (!room || !match || !projectile || !targetPlayer) return { intercepted: false };
  if (Number(projectile.ownerPlayerNumber) === Number(targetPlayer.matchPlayerNumber)) {
    return { intercepted: false };
  }
  const projectileAbilityId = normalizeSpellId(projectile.abilityId || ABILITY_IDS.FIREBLAST) || ABILITY_IDS.FIREBLAST;
  const hitRadius = Math.max(
    0.05,
    Number(projectile.hitRadius)
      || (projectileAbilityId === ABILITY_IDS.HOOK ? getHookHitRadiusDefault() : getFireblastHitRadiusDefault())
  );
  const incomingDirection = normalizeInputVector({
    x: -(Number(projectile.direction?.x) || 0),
    y: -(Number(projectile.direction?.y) || 0)
  });
  const prismDirection = getPrismFacingDirection(targetPlayer, incomingDirection);
  const currentPosition = clonePosition(projectile.position);
  const previous = clonePosition(previousPosition);
  const intersectsShieldBand = isPathIntersectingPrismShieldBand(
    targetPlayer,
    previous,
    currentPosition,
    tickTimestamp,
    {
      radiusPadding: hitRadius,
      fallbackDirection: prismDirection
    }
  );
  if (!intersectsShieldBand) {
    return { intercepted: false };
  }

  const previousOwner = Number(projectile.ownerPlayerNumber) || 0;

  if (shouldPrismReflectProjectileAbility(projectileAbilityId)) {
    const inferredLifetimeMs = Math.max(
      10,
      Number(projectile.expiresAt) - Number(projectile.spawnedAt)
    );
    const defaultLifetimeMs = projectileAbilityId === ABILITY_IDS.HOOK
      ? getAbilityNumber(ABILITY_IDS.HOOK, 'lifetimeMs', 900, 10)
      : projectileAbilityId === ABILITY_IDS.SOLAR
        ? getAbilityNumber(ABILITY_IDS.SOLAR, 'lifetimeMs', Math.round((12 / 16.2) * 1000), 10)
        : getAbilityNumber(ABILITY_IDS.FIREBLAST, 'lifetimeMs', 1400, 10);
    const reflectedLifetimeMs = Math.max(
      10,
      Number.isFinite(inferredLifetimeMs) ? inferredLifetimeMs : defaultLifetimeMs
    );
    const prismGeometry = getPrismShieldGeometry(targetPlayer, tickTimestamp, prismDirection);
    const reflectSpawnRadius = Math.max(
      PLAYER_RADIUS + hitRadius + 0.03,
      Number(prismGeometry?.outerRadius) + hitRadius + 0.03
    );
    projectile.ownerPlayerNumber = targetPlayer.matchPlayerNumber;
    projectile.direction = prismDirection;
    projectile.position = {
      x: targetPlayer.position.x + (prismDirection.x * reflectSpawnRadius),
      y: targetPlayer.position.y + (prismDirection.y * reflectSpawnRadius)
    };
    projectile.spawnedAt = tickTimestamp;
    projectile.expiresAt = tickTimestamp + reflectedLifetimeMs;

    const reflectEvent = createCombatEvent(match, {
      type: 'prism_reflect',
      abilityId: ABILITY_IDS.PRISM,
      sourcePlayerNumber: targetPlayer.matchPlayerNumber,
      targetPlayerNumber: previousOwner,
      projectileId: projectile.projectileId,
      timestamp: tickTimestamp,
      metadata: {
        reflectedAbilityId: projectileAbilityId,
        speed: Number(projectile.speed) || 0,
        reflectedLifetimeMs
      }
    });
    pushMatchHitEvent(match, reflectEvent);
    logLifecycle('ability', 'prism_reflect', {
      code: room.code,
      projectileId: projectile.projectileId,
      ability: projectileAbilityId,
      blocker: targetPlayer.matchPlayerNumber,
      previousOwner
    });
    return { intercepted: true, reflected: true, resolved: false };
  }

  const blockEvent = createCombatEvent(match, {
    type: 'prism_block',
    abilityId: ABILITY_IDS.PRISM,
    sourcePlayerNumber: targetPlayer.matchPlayerNumber,
    targetPlayerNumber: previousOwner,
    projectileId: projectile.projectileId,
    timestamp: tickTimestamp,
    metadata: {
      blockedAbilityId: projectileAbilityId
    }
  });
  pushMatchHitEvent(match, blockEvent);
  logLifecycle('ability', 'prism_block', {
    code: room.code,
    projectileId: projectile.projectileId,
    ability: projectileAbilityId,
    blocker: targetPlayer.matchPlayerNumber,
    previousOwner
  });
  return { intercepted: true, reflected: false, resolved: true };
}

function applySolarDistortionDebuff(targetPlayer, tickTimestamp, durationMs) {
  if (!targetPlayer) return 0;
  const now = Number(tickTimestamp) || Date.now();
  const duration = Math.max(0, Number(durationMs) || 0);
  const currentUntil = getPlayerSolarDistortionUntil(targetPlayer);
  const nextUntil = Math.max(currentUntil, now + duration);
  setPlayerSolarDistortionUntil(targetPlayer, nextUntil);
  return nextUntil;
}

function explodeSolarProjectile({ room, match, projectile, tickTimestamp, reason = 'impact' }) {
  if (!room || !match || !projectile) {
    return { exploded: false, hitCount: 0 };
  }
  const sourcePlayerNumber = Number(projectile.ownerPlayerNumber) || 0;
  const sourcePlayer = getMatchPlayerByNumber(match, sourcePlayerNumber);
  const origin = clonePosition(projectile.position) || { x: 0, y: 0 };
  const impactRadius = getSolarImpactRadiusDefault();
  const damageAmount = getAbilityDamage(ABILITY_IDS.SOLAR);
  const knockbackImpulse = getAbilityNumber(ABILITY_IDS.SOLAR, 'knockbackImpulse', 2.5, 0);
  const debuffDurationMs = getSolarDebuffDurationMsDefault();
  const now = Number(tickTimestamp) || Date.now();
  let hitCount = 0;

  (Array.isArray(match.players) ? match.players : []).forEach((targetPlayer) => {
    if (!targetPlayer || targetPlayer.connected === false) return;
    if (Number(targetPlayer.matchPlayerNumber) === sourcePlayerNumber) return;
    if (!isPlayerTargetableForCombatHit(targetPlayer, now)) return;
    const dx = targetPlayer.position.x - origin.x;
    const dy = targetPlayer.position.y - origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance > (impactRadius + PLAYER_RADIUS)) return;
    if (isPointInsidePrismCone(targetPlayer, origin, now)) {
      const prismBlockEvent = createCombatEvent(match, {
        type: 'prism_block',
        abilityId: ABILITY_IDS.PRISM,
        sourcePlayerNumber: targetPlayer.matchPlayerNumber,
        targetPlayerNumber: sourcePlayerNumber,
        projectileId: projectile.projectileId,
        timestamp: now,
        metadata: {
          blockedAbilityId: ABILITY_IDS.SOLAR
        }
      });
      pushMatchHitEvent(match, prismBlockEvent);
      return;
    }
    const knockbackDirection = distance > 0.0001
      ? { x: dx / distance, y: dy / distance }
      : normalizeInputVector(projectile.direction);
    const knockback = {
      x: knockbackDirection.x * knockbackImpulse,
      y: knockbackDirection.y * knockbackImpulse
    };
    targetPlayer.velocity = sanitizeVector(targetPlayer.velocity);
    targetPlayer.velocity.x += knockback.x;
    targetPlayer.velocity.y += knockback.y;
    targetPlayer.lastHitAt = now;
    const damageResult = applyDamageToPlayer({
      room,
      match,
      targetPlayer,
      sourcePlayer,
      sourcePlayerNumber,
      abilityId: ABILITY_IDS.SOLAR,
      amount: damageAmount,
      cause: 'spell_damage',
      timestamp: now
    });
    const debuffUntil = applySolarDistortionDebuff(targetPlayer, now, debuffDurationMs);
    const solarHitEvent = createCombatEvent(match, {
      type: 'solar_hit',
      abilityId: ABILITY_IDS.SOLAR,
      sourcePlayerNumber,
      targetPlayerNumber: targetPlayer.matchPlayerNumber,
      projectileId: projectile.projectileId,
      timestamp: now,
      knockback,
      metadata: {
        reason,
        radius: impactRadius,
        distance: Number(distance.toFixed(2)),
        damage: Number(damageResult.amount) || 0,
        healthBefore: Number(damageResult.beforeHealth) || 0,
        healthAfter: Number(damageResult.afterHealth) || 0,
        debuffDurationMs,
        debuffUntil
      }
    });
    pushMatchHitEvent(match, solarHitEvent);
    hitCount += 1;
  });

  const explodeEvent = createCombatEvent(match, {
    type: 'solar_explode',
    abilityId: ABILITY_IDS.SOLAR,
    sourcePlayerNumber,
    targetPlayerNumber: 0,
    projectileId: projectile.projectileId,
    timestamp: now,
    metadata: {
      reason,
      radius: impactRadius,
      hitCount
    }
  });
  pushMatchHitEvent(match, explodeEvent);
  return { exploded: true, hitCount };
}

function handleFireblastProjectileBlockedByWall({ room, match, projectile, wall = null, pillar = null, tickTimestamp }) {
  logLifecycle('ability', 'projectile_blocked_by_wall', {
    code: room.code,
    projectileId: projectile.projectileId,
    ability: ABILITY_IDS.FIREBLAST
  });
  if (!match || !projectile) return;
  const blockEvent = createCombatEvent(match, {
    type: 'fireblast_blocked',
    abilityId: ABILITY_IDS.FIREBLAST,
    sourcePlayerNumber: projectile.ownerPlayerNumber,
    targetPlayerNumber: 0,
    projectileId: projectile.projectileId,
    timestamp: tickTimestamp,
    metadata: {
      reason: pillar ? 'pillar' : 'wall',
      position: clonePosition(projectile.position),
      wallId: wall?.wallId ? String(wall.wallId) : '',
      pillarId: pillar?.pillarId ? String(pillar.pillarId) : ''
    }
  });
  pushMatchHitEvent(match, blockEvent);
}

function handleHookProjectileBlockedByWall({ room, projectile, wall }) {
  logLifecycle('ability', 'projectile_blocked_by_wall', {
    code: room.code,
    projectileId: projectile.projectileId,
    ability: ABILITY_IDS.HOOK,
    wallId: wall?.wallId || '-'
  });
  logLifecycle('ability', 'hook_miss', {
    code: room.code,
    projectileId: projectile.projectileId,
    reason: 'blocked_by_wall'
  });
}

function handleFireblastProjectileExpired({ room, projectile }) {
  logRuntimeVerbose(`[match] projectile_expired code=${room.code} projectileId=${projectile.projectileId}`);
}

function handleHookProjectileExpired({ room, projectile }) {
  logLifecycle('ability', 'hook_miss', {
    code: room.code,
    projectileId: projectile.projectileId,
    reason: 'expired'
  });
}

function handleFireblastProjectileHit({ room, match, projectile, targetPlayer, tickTimestamp }) {
  if (isShieldActive(targetPlayer, tickTimestamp)) {
    const shieldBlockEvent = createCombatEvent(match, {
      type: 'shield_block',
      abilityId: ABILITY_IDS.SHIELD,
      sourcePlayerNumber: projectile.ownerPlayerNumber,
      targetPlayerNumber: targetPlayer.matchPlayerNumber,
      projectileId: projectile.projectileId,
      timestamp: tickTimestamp
    });
    pushMatchHitEvent(match, shieldBlockEvent);
    logRuntimeVerbose(`[match] projectile_blocked code=${room.code} projectileId=${projectile.projectileId} by=${targetPlayer.matchPlayerNumber}`);
    return { resolved: true };
  }

  const targetInvulnerableUntil = Number(targetPlayer.hitInvulnerableUntil) || 0;
  if (tickTimestamp < targetInvulnerableUntil) {
    return { resolved: false };
  }

  targetPlayer.velocity = sanitizeVector(targetPlayer.velocity);
  const fireblastKnockbackImpulse = getAbilityNumber(ABILITY_IDS.FIREBLAST, 'knockbackImpulse', 10.2, 0);
  const fireblastHitInvulnMs = getAbilityNumber(ABILITY_IDS.FIREBLAST, 'hitInvulnMs', 120, 0);
  targetPlayer.velocity.x += projectile.direction.x * fireblastKnockbackImpulse;
  targetPlayer.velocity.y += projectile.direction.y * fireblastKnockbackImpulse;
  targetPlayer.lastHitAt = tickTimestamp;
  targetPlayer.hitInvulnerableUntil = tickTimestamp + fireblastHitInvulnMs;
  const sourcePlayer = getMatchPlayerByNumber(match, projectile.ownerPlayerNumber);
  const fireblastDamage = getAbilityDamage(ABILITY_IDS.FIREBLAST);
  const fireblastDamageResult = applyDamageToPlayer({
    room,
    match,
    targetPlayer,
    sourcePlayer,
    sourcePlayerNumber: projectile.ownerPlayerNumber,
    abilityId: ABILITY_IDS.FIREBLAST,
    amount: fireblastDamage,
    cause: 'spell_damage',
    timestamp: tickTimestamp
  });

  const hitEvent = createFireblastHitEvent(match, projectile, targetPlayer, tickTimestamp, {
    damage: Number(fireblastDamageResult.amount) || 0,
    healthBefore: Number(fireblastDamageResult.beforeHealth) || 0,
    healthAfter: Number(fireblastDamageResult.afterHealth) || 0
  });
  pushMatchHitEvent(match, hitEvent);
  logRuntimeVerbose(`[match] projectile_hit code=${room.code} projectileId=${projectile.projectileId} source=${projectile.ownerPlayerNumber} target=${targetPlayer.matchPlayerNumber}`);
  logRuntimeVerbose(`[match] projectile_removed_on_hit code=${room.code} projectileId=${projectile.projectileId}`);
  logRuntimeVerbose(`[match] knockback_applied code=${room.code} target=${targetPlayer.matchPlayerNumber} vx=${targetPlayer.velocity.x.toFixed(2)} vy=${targetPlayer.velocity.y.toFixed(2)}`);
  return { resolved: true };
}

function handleHookProjectileHit({ room, match, projectile, targetPlayer, tickTimestamp }) {
  const sourcePlayer = getMatchPlayerByNumber(match, projectile.ownerPlayerNumber);
  if (!sourcePlayer) {
    return { resolved: true };
  }

  const beforePullPosition = clonePosition(targetPlayer.position) || { x: 0, y: 0 };
  const toTargetX = targetPlayer.position.x - sourcePlayer.position.x;
  const toTargetY = targetPlayer.position.y - sourcePlayer.position.y;
  const distanceToSource = Math.hypot(toTargetX, toTargetY);
  const hookPullTargetDistance = getAbilityNumber(ABILITY_IDS.HOOK, 'pullTargetDistance', 1.35, 0.1);
  let pulledTargetPosition = beforePullPosition;
  if (distanceToSource > hookPullTargetDistance + 0.01) {
    const pullDir = distanceToSource > 0
      ? { x: toTargetX / distanceToSource, y: toTargetY / distanceToSource }
      : { x: 1, y: 0 };
    pulledTargetPosition = {
      x: sourcePlayer.position.x + (pullDir.x * hookPullTargetDistance),
      y: sourcePlayer.position.y + (pullDir.y * hookPullTargetDistance)
    };
  }

  pulledTargetPosition = clampPositionInsideArena(pulledTargetPosition, PLAYER_RADIUS + 0.02);
  pulledTargetPosition = resolvePointAgainstArenaBlockers(
    pulledTargetPosition,
    beforePullPosition,
    match,
    {
      padding: PLAYER_RADIUS,
      timestamp: tickTimestamp
    }
  );

  targetPlayer.position = pulledTargetPosition;
  targetPlayer.velocity = { x: 0, y: 0 };
  targetPlayer.input = { x: 0, y: 0 };
  targetPlayer.lastUpdated = tickTimestamp;
  ensurePlayerPositionHistory(targetPlayer, tickTimestamp);
  const hookDamage = getAbilityDamage(ABILITY_IDS.HOOK);
  const hookDamageResult = applyDamageToPlayer({
    room,
    match,
    targetPlayer,
    sourcePlayer,
    sourcePlayerNumber: sourcePlayer.matchPlayerNumber,
    abilityId: ABILITY_IDS.HOOK,
    amount: hookDamage,
    cause: 'spell_damage',
    timestamp: tickTimestamp
  });

  const pullKnockback = {
    x: pulledTargetPosition.x - beforePullPosition.x,
    y: pulledTargetPosition.y - beforePullPosition.y
  };
  const hookHitEvent = createCombatEvent(match, {
    type: 'hook_pull',
    abilityId: ABILITY_IDS.HOOK,
    sourcePlayerNumber: sourcePlayer.matchPlayerNumber,
    targetPlayerNumber: targetPlayer.matchPlayerNumber,
    projectileId: projectile.projectileId,
    timestamp: tickTimestamp,
    knockback: pullKnockback,
    metadata: {
      from: beforePullPosition,
      to: pulledTargetPosition,
      damage: Number(hookDamageResult.amount) || 0,
      healthBefore: Number(hookDamageResult.beforeHealth) || 0,
      healthAfter: Number(hookDamageResult.afterHealth) || 0
    }
  });
  pushMatchHitEvent(match, hookHitEvent);
  logLifecycle('ability', 'hook_hit', {
    code: room.code,
    projectileId: projectile.projectileId,
    source: sourcePlayer.matchPlayerNumber,
    target: targetPlayer.matchPlayerNumber
  });
  return { resolved: true };
}

function handleSolarProjectileBlockedByWall({ room, match, projectile, tickTimestamp }) {
  explodeSolarProjectile({
    room,
    match,
    projectile,
    tickTimestamp,
    reason: 'blocked_by_wall'
  });
}

function handleSolarProjectileExpired({ room, match, projectile, tickTimestamp }) {
  explodeSolarProjectile({
    room,
    match,
    projectile,
    tickTimestamp,
    reason: 'max_range'
  });
}

function handleSolarProjectileHit({ room, match, projectile, tickTimestamp }) {
  explodeSolarProjectile({
    room,
    match,
    projectile,
    tickTimestamp,
    reason: 'enemy_hit'
  });
  return { resolved: true };
}

function handleWallRuntimeTick({ match, tickTimestamp }) {
  pruneExpiredWalls(match, tickTimestamp);
}

const abilityRuntimeHandlers = Object.freeze({
  [ABILITY_IDS.CHARGE]: Object.freeze({
    applyMovement: applyChargeMovementRuntime,
    onPostMovement: handleChargePostMovementRuntime
  }),
  [ABILITY_IDS.RIFT]: Object.freeze({
    onMatchTick: handleRiftRuntimeTick
  }),
  [ABILITY_IDS.PHANTOM]: Object.freeze({
    onMatchTick: handlePhantomRuntimeTick
  }),
  [ABILITY_IDS.WALL]: Object.freeze({
    onMatchTick: handleWallRuntimeTick
  }),
  [ABILITY_IDS.FIREBLAST]: Object.freeze({
    onProjectileBlockedByWall: handleFireblastProjectileBlockedByWall,
    onProjectileExpired: handleFireblastProjectileExpired,
    onProjectileHit: handleFireblastProjectileHit
  }),
  [ABILITY_IDS.HOOK]: Object.freeze({
    onProjectileBlockedByWall: handleHookProjectileBlockedByWall,
    onProjectileExpired: handleHookProjectileExpired,
    onProjectileHit: handleHookProjectileHit
  }),
  [ABILITY_IDS.SOLAR]: Object.freeze({
    onProjectileBlockedByWall: handleSolarProjectileBlockedByWall,
    onProjectileExpired: handleSolarProjectileExpired,
    onProjectileHit: handleSolarProjectileHit
  })
});

function runMatchAbilityRuntimeTick(room, match, tickTimestamp) {
  Object.values(abilityRuntimeHandlers).forEach((handler) => {
    if (typeof handler?.onMatchTick === 'function') {
      handler.onMatchTick({ room, match, tickTimestamp });
    }
  });
}

function runPostMovementAbilityHandlers(room, match, tickTimestamp) {
  (Array.isArray(match.players) ? match.players : []).forEach((player) => {
    Object.values(abilityRuntimeHandlers).forEach((handler) => {
      if (typeof handler?.onPostMovement !== 'function') return;
      handler.onPostMovement({ room, match, player, tickTimestamp });
    });
  });
}

function processMatchTickForRoom(room, tickTimestamp) {
  if (!room.match) return;

  const match = room.match;
  pruneResolvedProjectiles(match, tickTimestamp, 12000);
  runMatchAbilityRuntimeTick(room, match, tickTimestamp);
  const previousTickAt = Number(match.lastTickAt) || tickTimestamp;
  const deltaMs = clamp(tickTimestamp - previousTickAt, 0, MATCH_MAX_DELTA_MS);
  const deltaSeconds = deltaMs / 1000;
  match.lastTickAt = tickTimestamp;
  let movedPlayers = 0;
  let eliminatedThisTick = false;
  let lavaDamagedThisTick = false;

  if (match.phase === MATCH_PHASE_DRAFT) {
    let didDraftUpdate = false;
    const currentTurnPlayerNumber = getDraftCurrentTurnPlayerNumber(match);
    const turnEndsAt = Number(match.draft?.turnEndsAt) || 0;
    if (currentTurnPlayerNumber && tickTimestamp >= turnEndsAt) {
      const currentTurnPlayer = getMatchPlayerByNumber(match, currentTurnPlayerNumber);
      const validSpells = getValidDraftSpellsForMatchPlayer(match, currentTurnPlayer);
      if (validSpells.length > 0) {
        const autoSpellId = validSpells[0];
        logLifecycle('draft', 'timeout_auto_pick', {
          code: room.code,
          turnIndex: match.draft.currentTurnIndex,
          player: currentTurnPlayerNumber,
          spell: autoSpellId
        });
        const autoPickResult = applyDraftPick(room, currentTurnPlayerNumber, autoSpellId, 'timeout_auto_pick');
        if (!autoPickResult.ok) {
          logLifecycle('draft', 'timeout_auto_pick_failed', {
            code: room.code,
            player: currentTurnPlayerNumber,
            reason: autoPickResult.code || 'UNKNOWN'
          });
        }
        didDraftUpdate = true;
      } else {
        logLifecycle('draft', 'timeout_no_valid_spell', {
          code: room.code,
          turnIndex: match.draft.currentTurnIndex,
          player: currentTurnPlayerNumber
        });
        advanceDraftTurn(room, tickTimestamp);
        didDraftUpdate = true;
      }
      if (didDraftUpdate) {
        emitRoomUpdate(room);
      }
    }

    const shouldBroadcastDraftState = didDraftUpdate
      || (tickTimestamp - (Number(match.lastBroadcastAt) || 0)) >= 250;
    if (shouldBroadcastDraftState) {
      emitMatchStateThrottled(room, tickTimestamp, didDraftUpdate);
    }
    return;
  }

  if (match.phase === MATCH_PHASE_ROUND_END) {
    if (match.isPaused === true) {
      emitMatchStateThrottled(room, tickTimestamp, false);
      return;
    }

    const now = Number(tickTimestamp) || Date.now();
    const nextRoundStartsAt = Number(match.nextRoundStartsAt) || 0;
    if (nextRoundStartsAt <= 0) {
      match.nextRoundStartsAt = now + ROUND_END_INTERMISSION_MS;
      emitMatchStateThrottled(room, tickTimestamp, true);
      return;
    }

    if (now >= nextRoundStartsAt) {
      const roundWins = ensureRoundWinsByPlayerNumber(match);
      const roundsNeededToWin = getMatchRoundsNeededToWin(match);
      const hasMatchWinner = (Number(roundWins[1]) || 0) >= roundsNeededToWin
        || (Number(roundWins[2]) || 0) >= roundsNeededToWin;
      if (hasMatchWinner) {
        const finalWinnerNumber = (Number(roundWins[1]) || 0) >= roundsNeededToWin ? 1 : 2;
        const finalEliminatedNumber = finalWinnerNumber === 1 ? 2 : 1;
        const didFinalize = finalizeMatchEnd(room, {
          winnerNumber: finalWinnerNumber,
          eliminatedNumber: finalEliminatedNumber,
          reason: String(match.lastRoundEndReason || 'round_victory'),
          timestamp: now
        });
        if (didFinalize) {
          setRoomState(room, ROOM_STATES.MATCH_END, 'bo3_completed_from_round_end');
          emitRoomUpdate(room);
          emitMatchStateThrottled(room, tickTimestamp, true);
          return;
        }
      }

      const upcomingRound = clamp(
        (Number(match.roundNumber) || 1) + 1,
        1,
        Math.max(MATCH_MAX_ROUNDS, Number(match.maxRounds) || MATCH_MAX_ROUNDS)
      );
      const didStartNextRound = startRoundCountdown(
        room,
        upcomingRound,
        'round_intermission_complete',
        now
      );
      if (didStartNextRound) {
        emitRoomUpdate(room);
        emitMatchStateThrottled(room, tickTimestamp, true);
        return;
      }
    }

    emitMatchStateThrottled(room, tickTimestamp, false);
    return;
  }

  if (match.phase === MATCH_PHASE_COMBAT_COUNTDOWN) {
    if (match.isPaused === true) {
      emitMatchStateThrottled(room, tickTimestamp, false);
      return;
    }

    const combatStartsAt = Number(match.combatStartsAt) || 0;
    let didTransitionToCombat = false;
    if (combatStartsAt > 0 && tickTimestamp >= combatStartsAt) {
      const didTransition = transitionMatchPhase(room, MATCH_PHASE_COMBAT, 'countdown_finished', tickTimestamp);
      if (didTransition) {
        didTransitionToCombat = true;
        setRoomState(room, ROOM_STATES.COMBAT, 'countdown_finished');
        logLifecycle('match', 'combat_started', {
          code: room.code,
          matchId: match.matchId,
          round: Number(match.roundNumber) || 1,
          at: tickTimestamp
        });
        emitRoomUpdate(room);
      }
    }

    emitMatchStateThrottled(room, tickTimestamp, didTransitionToCombat);
    return;
  }

  if (match.phase !== MATCH_PHASE_COMBAT) {
    emitMatchStateThrottled(room, tickTimestamp, false);
    return;
  }

  if (match.isPaused === true) {
    emitMatchStateThrottled(room, tickTimestamp, false);
    return;
  }

  executePendingAbilityCasts(room, tickTimestamp);

  if (deltaSeconds > 0) {
    match.players.forEach((player) => {
      if (player.connected === false) {
        player.input = { x: 0, y: 0 };
        ensurePlayerPositionHistory(player, tickTimestamp);
        return;
      }
      const previousPosition = clonePosition(player.position) || { x: 0, y: 0 };
      const input = normalizeInputVector(player.input);
      player.input = input;

      const velocity = sanitizeVector(player.velocity);
      player.velocity = velocity;
      let nextPosition = clonePosition(previousPosition) || { x: 0, y: 0 };
      const chargeHandler = abilityRuntimeHandlers[ABILITY_IDS.CHARGE];
      const chargeRuntime = typeof chargeHandler?.applyMovement === 'function'
        ? chargeHandler.applyMovement({
          room,
          match,
          player,
          previousPosition,
          deltaSeconds,
          tickTimestamp
        })
        : {
          handled: false,
          nextPosition: previousPosition,
          chargeState: null
        };
      const chargeState = chargeRuntime?.chargeState || null;

      if (chargeRuntime?.handled) {
        nextPosition = clonePosition(chargeRuntime.nextPosition) || nextPosition;
      } else {
        if (input.x !== 0 || input.y !== 0) {
          const shieldMoveSpeedMultiplier = Math.max(
            0,
            getAbilityNumber(ABILITY_IDS.SHIELD, 'moveSpeedMultiplier', 0.60, 0)
          );
          const moveSpeed = isShieldActive(player, tickTimestamp)
            ? (PLAYER_MOVE_SPEED * shieldMoveSpeedMultiplier)
            : PLAYER_MOVE_SPEED;
          nextPosition.x += input.x * moveSpeed * deltaSeconds;
          nextPosition.y += input.y * moveSpeed * deltaSeconds;
        }

        if (velocity.x !== 0 || velocity.y !== 0) {
          nextPosition.x += velocity.x * deltaSeconds;
          nextPosition.y += velocity.y * deltaSeconds;

          const damping = Math.exp(-PLAYER_KNOCKBACK_DAMPING_PER_SECOND * deltaSeconds);
          player.velocity.x *= damping;
          player.velocity.y *= damping;

          if (Math.abs(player.velocity.x) < 0.01) player.velocity.x = 0;
          if (Math.abs(player.velocity.y) < 0.01) player.velocity.y = 0;
        }

        const collisionPadding = PLAYER_RADIUS;
        const wallCollisionOptions = buildWallCollisionOptions(collisionPadding, tickTimestamp);
        const blockingWall = findBlockingWallForMovement(
          previousPosition,
          nextPosition,
          match.walls,
          wallCollisionOptions
        );
        const blockingPillar = findBlockingRoundPillarForPoint(
          nextPosition,
          match,
          { padding: collisionPadding }
        ) || findBlockingRoundPillarForPoint(
          previousPosition,
          match,
          { padding: collisionPadding }
        );
        if (blockingWall || blockingPillar) {
          const resolvedBlockedPosition = resolvePointAgainstArenaBlockers(
            nextPosition,
            previousPosition,
            match,
            {
              padding: collisionPadding,
              timestamp: tickTimestamp
            }
          );
          let bestPosition = clonePosition(resolvedBlockedPosition) || clonePosition(previousPosition) || previousPosition;

          if (blockingPillar && !blockingWall) {
            const pillarSlidePosition = resolveSlidingMovementAgainstRoundPillar(
              previousPosition,
              nextPosition,
              blockingPillar,
              match,
              {
                padding: collisionPadding,
                timestamp: tickTimestamp
              }
            );
            if (pillarSlidePosition) {
              const bestDistance = Math.hypot(
                bestPosition.x - previousPosition.x,
                bestPosition.y - previousPosition.y
              );
              const slideDistance = Math.hypot(
                pillarSlidePosition.x - previousPosition.x,
                pillarSlidePosition.y - previousPosition.y
              );
              if (slideDistance > (bestDistance + 0.0001)) {
                bestPosition = pillarSlidePosition;
              }
            }
          }

          const pathStillBlocked =
            !!findBlockingWallForMovement(previousPosition, bestPosition, match.walls, wallCollisionOptions)
            || !!findBlockingRoundPillarForPoint(bestPosition, match, { padding: collisionPadding });

          if (pathStillBlocked) {
            nextPosition = previousPosition;
            player.velocity = { x: 0, y: 0 };
          } else {
            const movedDistance = Math.hypot(
              bestPosition.x - previousPosition.x,
              bestPosition.y - previousPosition.y
            );
            if (movedDistance > 0.0001) {
              nextPosition = bestPosition;
            } else {
              nextPosition = previousPosition;
              player.velocity = { x: 0, y: 0 };
            }
          }
        }
      }

      player.position = nextPosition;

      ensurePlayerPositionHistory(player, tickTimestamp);

      if (
        input.x !== 0
        || input.y !== 0
        || velocity.x !== 0
        || velocity.y !== 0
        || chargeState
        || !positionsEqual(previousPosition, nextPosition)
      ) {
        player.lastUpdated = tickTimestamp;
        movedPlayers += 1;
      }
    });

    runPostMovementAbilityHandlers(room, match, tickTimestamp);

    if (match.phase === MATCH_PHASE_COMBAT) {
      lavaDamagedThisTick = applyLavaDamageTick(room, match, tickTimestamp);
      if (match.phase !== MATCH_PHASE_COMBAT) {
        eliminatedThisTick = true;
      }
    }

    const eliminatedPlayer = (!eliminatedThisTick && match.phase === MATCH_PHASE_COMBAT)
      ? (Array.isArray(match.players) ? match.players : []).find((player) =>
        isBeyondHardOutOfBounds(player.position)
      )
      : null;
    if (eliminatedPlayer) {
      const winnerPlayer = getOpponentPlayer(match, eliminatedPlayer.matchPlayerNumber);
      console.log(`[match] player_eliminated_out_of_bounds code=${room.code} player=${eliminatedPlayer.matchPlayerNumber} x=${eliminatedPlayer.position.x.toFixed(2)} y=${eliminatedPlayer.position.y.toFixed(2)} hardRadius=${ARENA_HARD_OUT_OF_BOUNDS_RADIUS}`);
      eliminatedThisTick = transitionMatchToEnd(room, eliminatedPlayer, winnerPlayer, 'out_of_bounds', tickTimestamp);
    }

    if (!eliminatedThisTick && match.phase === MATCH_PHASE_COMBAT) {
      const activeProjectiles = [];
      (Array.isArray(match.projectiles) ? match.projectiles : []).forEach((projectile) => {
        if (isProjectileResolved(match, projectile.projectileId)) {
          return;
        }
        const projectileAbilityId = normalizeSpellId(projectile.abilityId || ABILITY_IDS.FIREBLAST) || ABILITY_IDS.FIREBLAST;
        const projectileHandler = abilityRuntimeHandlers[projectileAbilityId] || abilityRuntimeHandlers[ABILITY_IDS.FIREBLAST];
        const previousPosition = clonePosition(projectile.position) || { x: 0, y: 0 };
        const projectileHitRadius = Math.max(
          0.08,
          Number(projectile.hitRadius)
            || getAbilityNumber(
              projectileAbilityId,
              'hitRadius',
              projectileAbilityId === ABILITY_IDS.HOOK
                ? getHookHitRadiusDefault()
                : projectileAbilityId === ABILITY_IDS.SOLAR
                  ? getSolarHitRadiusDefault()
                  : getFireblastHitRadiusDefault(),
              0.05
            )
        );

        projectile.position.x += projectile.direction.x * projectile.speed * deltaSeconds;
        projectile.position.y += projectile.direction.y * projectile.speed * deltaSeconds;

        const blockingWall = findBlockingWallForMovement(
          previousPosition,
          projectile.position,
          match.walls,
          {
            padding: projectileHitRadius * 0.85,
            timestamp: tickTimestamp,
            defaultHalfLength: getWallHalfLengthDefault(),
            defaultHalfThickness: getWallHalfThicknessDefault()
          }
        );
        const blockingPillar = findBlockingRoundPillarForMovement(
          previousPosition,
          projectile.position,
          match,
          { padding: projectileHitRadius * 0.85 }
        );
        if (blockingWall || blockingPillar) {
          if (typeof projectileHandler?.onProjectileBlockedByWall === 'function') {
            projectileHandler.onProjectileBlockedByWall({
              room,
              match,
              projectile,
              wall: blockingWall || null,
              pillar: blockingPillar || null,
              tickTimestamp
            });
          }
          markProjectileResolved(match, projectile.projectileId, tickTimestamp);
          return;
        }

        if (tickTimestamp >= projectile.expiresAt) {
          if (typeof projectileHandler?.onProjectileExpired === 'function') {
            projectileHandler.onProjectileExpired({
              room,
              match,
              projectile,
              tickTimestamp
            });
          }
          markProjectileResolved(match, projectile.projectileId, tickTimestamp);
          return;
        }

        const targetPlayer = getOpponentPlayer(match, projectile.ownerPlayerNumber);
        if (targetPlayer && !isPlayerTargetableForCombatHit(targetPlayer, tickTimestamp)) {
          activeProjectiles.push(projectile);
          return;
        }
        if (targetPlayer) {
          const prismIntercept = resolvePrismProjectileIntercept({
            room,
            match,
            projectile,
            targetPlayer,
            previousPosition,
            tickTimestamp
          });
          if (prismIntercept?.intercepted) {
            if (prismIntercept.resolved === true) {
              markProjectileResolved(match, projectile.projectileId, tickTimestamp);
              return;
            }
            activeProjectiles.push(projectile);
            return;
          }

          const dx = targetPlayer.position.x - projectile.position.x;
          const dy = targetPlayer.position.y - projectile.position.y;
          const collisionRadius = PLAYER_RADIUS + projectileHitRadius;
          const didCollide = (dx * dx + dy * dy) <= (collisionRadius * collisionRadius);
          if (didCollide) {
            if (typeof projectileHandler?.onProjectileHit === 'function') {
              const hitResult = projectileHandler.onProjectileHit({
                room,
                match,
                projectile,
                targetPlayer,
                tickTimestamp
              });
              if (hitResult?.resolved === true) {
                markProjectileResolved(match, projectile.projectileId, tickTimestamp);
                if (match.phase !== MATCH_PHASE_COMBAT) {
                  eliminatedThisTick = true;
                }
                return;
              }
            }
            if (match.phase !== MATCH_PHASE_COMBAT) {
              eliminatedThisTick = true;
              return;
            }
          }
        }

        activeProjectiles.push(projectile);
      });
      match.projectiles = activeProjectiles;
    }
  }

  if (movedPlayers > 0 && tickTimestamp - (match.lastMoveLogAt || 0) >= 500) {
    const compactPlayers = match.players
      .map((player) => `p${player.matchPlayerNumber}=(${player.position.x.toFixed(2)},${player.position.y.toFixed(2)})`)
      .join(' ');
    logRuntimeVerbose(`[match] tick code=${room.code} ${compactPlayers} projectiles=${match.projectiles.length}`);
    match.lastMoveLogAt = tickTimestamp;
  }

  emitMatchStateThrottled(room, tickTimestamp, eliminatedThisTick || lavaDamagedThisTick);
}

function runMatchSimulationTick() {
  const now = Date.now();
  rooms.forEach((room) => {
    processMatchTickForRoom(room, now);
  });
}

function emitRoomError(socket, message, code = 'ROOM_ERROR') {
  socket.emit('room_error', { code, message });
}

function resolveAbilityCastPayloadAndAck(payloadOrAck, maybeAck) {
  return {
    payload: typeof payloadOrAck === 'function' ? undefined : payloadOrAck,
    ack: typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck
  };
}

function ensurePendingAbilityCasts(match) {
  if (!match || typeof match !== 'object') return [];
  if (!Array.isArray(match.pendingAbilityCasts)) {
    match.pendingAbilityCasts = [];
  }
  return match.pendingAbilityCasts;
}

function executePendingAbilityCasts(room, tickTimestamp = Date.now()) {
  if (!room?.match) return;
  if (room.match.phase !== MATCH_PHASE_COMBAT) return;
  if (room.match.isPaused === true) return;

  const pendingQueue = ensurePendingAbilityCasts(room.match);
  if (!pendingQueue.length) return;

  const now = Number(tickTimestamp) || Date.now();
  const remaining = [];
  pendingQueue.forEach((pendingCast) => {
    if (!pendingCast || typeof pendingCast !== 'object') return;
    const executeAt = Number(pendingCast.executeAt) || 0;
    if (executeAt > now) {
      remaining.push(pendingCast);
      return;
    }

    const abilityDef = getAbilityDef(pendingCast.abilityId);
    if (!abilityDef) return;
    const matchPlayer = getMatchPlayerByPlayerId(room.match, pendingCast.playerId);
    if (!matchPlayer || matchPlayer.connected === false) {
      logLifecycle('ability', 'cast_dropped_pending', {
        code: room.code,
        ability: abilityDef.id,
        reason: 'player_missing_or_disconnected',
        requestId: pendingCast.requestId || '-'
      });
      return;
    }

    const executionResult = executeAbilityCast(
      room,
      matchPlayer,
      abilityDef,
      pendingCast.payload,
      now
    );
    if (!executionResult?.ok) {
      logLifecycle('ability', 'cast_pending_failed', {
        code: room.code,
        player: matchPlayer.matchPlayerNumber,
        ability: abilityDef.id,
        reason: executionResult?.code || 'ABILITY_CAST_FAILED'
      });
      return;
    }

    trackAbilityMetric(room.match, abilityDef.id, 'castExecuted', 1);
    logLifecycle('ability', 'cast_executed', {
      code: room.code,
      player: matchPlayer.matchPlayerNumber,
      ability: abilityDef.id,
      castDelayMs: Math.max(0, now - (Number(pendingCast.requestedAt) || now)),
      requestId: pendingCast.requestId || '-'
    });
  });
  room.match.pendingAbilityCasts = remaining;
}

function handleAbilityCastRequest(socket, abilityId, payloadOrAck, maybeAck) {
  const { payload, ack } = resolveAbilityCastPayloadAndAck(payloadOrAck, maybeAck);
  const respond = typeof ack === 'function'
    ? (responsePayload) => ack(responsePayload)
    : () => {};

  function fail(message, code, extra = {}) {
    const responsePayload = { ok: false, code, message, abilityId: normalizedAbilityId, ...extra };
    emitRoomError(socket, message, code);
    respond(responsePayload);
    return responsePayload;
  }

  const normalizedAbilityId = normalizeSpellId(abilityId);
  const abilityDef = getAbilityDef(normalizedAbilityId);
  if (!abilityDef) {
    fail('Unknown ability.', 'UNKNOWN_ABILITY');
    return;
  }

  const roomCode = playerRoomBySocketId.get(socket.id);
  if (!roomCode) {
    fail(`Join a room before casting ${abilityDef.id}.`, 'NOT_IN_ROOM');
    return;
  }

  const room = rooms.get(roomCode);
  if (!room || !room.match) {
    fail('You can cast only during an active match.', 'MATCH_NOT_ACTIVE');
    return;
  }

  const matchPlayer = getMatchPlayerBySocketId(room.match, socket.id);
  if (!matchPlayer) {
    fail('Match player not found.', 'MATCH_PLAYER_NOT_FOUND');
    return;
  }

  const now = Date.now();
  const requestId = normalizeRequestId(payload?.requestId || payload?.castId || payload?.actionId);
  const recentAbilityRequests = ensureActionCache(matchPlayer, 'recentAbilityRequests');
  pruneRequestCache(recentAbilityRequests, now, ABILITY_REQUEST_CACHE_TTL_MS);
  if (requestId && recentAbilityRequests[requestId]) {
    const cachedResponse = recentAbilityRequests[requestId]?.response;
    logLifecycle('ability', 'duplicate_request_ignored', {
      code: roomCode,
      player: matchPlayer.matchPlayerNumber,
      ability: abilityDef.id,
      requestId
    });
    if (cachedResponse && typeof cachedResponse === 'object') {
      respond(cachedResponse);
      return;
    }
    respond({ ok: true, abilityId: abilityDef.id, duplicated: true, requestId });
    return;
  }

  const phase = String(room.match.phase || '');
  if (phase !== MATCH_PHASE_COMBAT) {
    trackAbilityMetric(room.match, abilityDef.id, 'castRejected', 1);
    const rejected = fail(`${abilityDef.id} can only be cast during combat.`, 'MATCH_NOT_IN_COMBAT', {
      phase
    });
    if (requestId) {
      recentAbilityRequests[requestId] = {
        timestamp: now,
        response: rejected
      };
    }
    logLifecycle('ability', 'cast_rejected_phase', {
      code: roomCode,
      player: matchPlayer.matchPlayerNumber,
      ability: abilityDef.id,
      phase
    });
    return;
  }
  if (room.match.isPaused === true) {
    trackAbilityMetric(room.match, abilityDef.id, 'castRejected', 1);
    const rejected = fail('Match is paused while waiting for reconnect.', 'MATCH_PAUSED');
    if (requestId) {
      recentAbilityRequests[requestId] = {
        timestamp: now,
        response: rejected
      };
    }
    logLifecycle('ability', 'cast_rejected_paused', {
      code: roomCode,
      player: matchPlayer.matchPlayerNumber,
      ability: abilityDef.id
    });
    return;
  }
  if (matchPlayer.connected === false) {
    trackAbilityMetric(room.match, abilityDef.id, 'castRejected', 1);
    const rejected = fail('Disconnected players cannot cast.', 'PLAYER_DISCONNECTED');
    if (requestId) {
      recentAbilityRequests[requestId] = {
        timestamp: now,
        response: rejected
      };
    }
    return;
  }
  if (isPlayerPhantomUntargetable(matchPlayer, now)) {
    trackAbilityMetric(room.match, abilityDef.id, 'castRejected', 1);
    const rejected = fail('Cannot cast while Phantom vanish is active.', 'PHANTOM_VANISH_LOCKED');
    if (requestId) {
      recentAbilityRequests[requestId] = {
        timestamp: now,
        response: rejected
      };
    }
    return;
  }
  if (abilityDef.requiresDrafted && !hasSpellInLoadout(matchPlayer, abilityDef.id)) {
    trackAbilityMetric(room.match, abilityDef.id, 'castRejected', 1);
    const rejected = fail(`${abilityDef.id} is not in your drafted loadout.`, 'ABILITY_NOT_DRAFTED');
    if (requestId) {
      recentAbilityRequests[requestId] = {
        timestamp: now,
        response: rejected
      };
    }
    logLifecycle('ability', 'cast_rejected_not_in_loadout', {
      code: roomCode,
      player: matchPlayer.matchPlayerNumber,
      ability: abilityDef.id
    });
    return;
  }

  const actionRateLimits = ensureActionCache(matchPlayer, 'actionRateLimits');
  const lastRequestAt = Number(actionRateLimits[abilityDef.id]) || 0;
  if ((now - lastRequestAt) < ABILITY_REQUEST_MIN_INTERVAL_MS) {
    trackAbilityMetric(room.match, abilityDef.id, 'castRejected', 1);
    const rejected = fail('Ability cast rate limit hit.', 'ABILITY_RATE_LIMIT', {
      retryInMs: Math.max(0, ABILITY_REQUEST_MIN_INTERVAL_MS - (now - lastRequestAt))
    });
    if (requestId) {
      recentAbilityRequests[requestId] = {
        timestamp: now,
        response: rejected
      };
    }
    logLifecycle('ability', 'cast_rejected_rate_limit', {
      code: roomCode,
      player: matchPlayer.matchPlayerNumber,
      ability: abilityDef.id
    });
    return;
  }
  actionRateLimits[abilityDef.id] = now;

  const remainingMs = getAbilityRemainingMs(matchPlayer, abilityDef.id, now);
  const cooldownMs = getAbilityCooldownMs(abilityDef.id);
  const castDelayMs = getAbilityCastDelayMs(abilityDef.id);
  let executionPayload = payload && typeof payload === 'object' ? { ...payload } : payload;
  const abilityNeedsDirection = abilityDef.id !== ABILITY_IDS.SHIELD
    && abilityDef.id !== ABILITY_IDS.GUST
    && abilityDef.id !== ABILITY_IDS.REWIND
    && abilityDef.id !== ABILITY_IDS.PHANTOM;
  if (abilityNeedsDirection) {
    const payloadDirection = payload && typeof payload === 'object'
      ? payload.direction
      : payload;
    const lockedDirection = resolveCastDirection(matchPlayer, payloadDirection);
    if (lockedDirection.x === 0 && lockedDirection.y === 0) {
      trackAbilityMetric(room.match, abilityDef.id, 'castRejected', 1);
      const rejected = fail(`Aim before casting ${abilityDef.id}.`, 'INVALID_AIM');
      if (requestId) {
        recentAbilityRequests[requestId] = {
          timestamp: now,
          response: rejected
        };
      }
      logLifecycle('ability', 'cast_rejected_invalid_aim', {
        code: roomCode,
        player: matchPlayer.matchPlayerNumber,
        ability: abilityDef.id
      });
      return;
    }
    if (executionPayload && typeof executionPayload === 'object') {
      executionPayload.direction = lockedDirection;
    } else {
      executionPayload = { direction: lockedDirection };
    }
  }
  trackAbilityMetric(room.match, abilityDef.id, 'castRequested', 1);
  logLifecycle('ability', 'cast_requested', {
    code: roomCode,
    socket: socket.id,
    player: matchPlayer.matchPlayerNumber,
    ability: abilityDef.id,
    cooldownMs,
    castDelayMs,
    requestId: requestId || '-'
  });

  if (remainingMs > 0) {
    trackAbilityMetric(room.match, abilityDef.id, 'castRejected', 1);
    trackAbilityMetric(room.match, abilityDef.id, 'cooldownRejected', 1);
    const rejected = fail(`${abilityDef.id} is on cooldown.`, 'ABILITY_COOLDOWN', { remainingMs });
    if (requestId) {
      recentAbilityRequests[requestId] = {
        timestamp: now,
        response: rejected
      };
    }
    logLifecycle('ability', 'cast_rejected_cooldown', {
      code: roomCode,
      player: matchPlayer.matchPlayerNumber,
      ability: abilityDef.id,
      remainingMs
    });
    return;
  }

  const nextReadyAt = now + cooldownMs;
  setAbilityReadyAt(matchPlayer, abilityDef.id, nextReadyAt);
  matchPlayer.lastUpdated = now;
  trackAbilityMetric(room.match, abilityDef.id, 'castAccepted', 1);

  let executionResult = null;
  let queued = false;
  let executeAt = now;
  if (castDelayMs > 0) {
    executeAt = now + castDelayMs;
    const pendingQueue = ensurePendingAbilityCasts(room.match);
    pendingQueue.push({
      abilityId: abilityDef.id,
      playerId: matchPlayer.playerId,
      matchPlayerNumber: matchPlayer.matchPlayerNumber,
      payload: executionPayload && typeof executionPayload === 'object' ? executionPayload : {},
      requestedAt: now,
      executeAt,
      requestId: requestId || ''
    });
    queued = true;
  } else {
    executionResult = executeAbilityCast(room, matchPlayer, abilityDef, executionPayload, now);
    if (!executionResult?.ok) {
      setAbilityReadyAt(matchPlayer, abilityDef.id, now);
      trackAbilityMetric(room.match, abilityDef.id, 'castRejected', 1);
      const code = executionResult?.code || 'ABILITY_CAST_FAILED';
      const message = executionResult?.message || `Failed to cast ${abilityDef.id}.`;
      const rejected = fail(message, code, executionResult || {});
      if (requestId) {
        recentAbilityRequests[requestId] = {
          timestamp: now,
          response: rejected
        };
      }
      logLifecycle('ability', 'cast_rejected_execution', {
        code: roomCode,
        player: matchPlayer.matchPlayerNumber,
        ability: abilityDef.id,
        reason: code
      });
      return;
    }
    trackAbilityMetric(room.match, abilityDef.id, 'castExecuted', 1);
    logLifecycle('ability', 'cast_executed', {
      code: roomCode,
      player: matchPlayer.matchPlayerNumber,
      ability: abilityDef.id,
      castDelayMs: 0,
      requestId: requestId || '-'
    });
  }

  emitMatchState(room, now);
  const successResponse = {
    ok: true,
    abilityId: abilityDef.id,
    requestId: requestId || '',
    cooldownMs,
    castDelayMs,
    queued,
    executeAt,
    nextReadyAt,
    ...(executionResult || {})
  };
  if (requestId) {
    recentAbilityRequests[requestId] = {
      timestamp: now,
      response: successResponse
    };
  }
  logLifecycle('ability', 'cast_accepted', {
    code: roomCode,
    player: matchPlayer.matchPlayerNumber,
    ability: abilityDef.id,
    queued: queued ? 'yes' : 'no',
    requestId: requestId || '-'
  });
  respond(successResponse);
}

function cleanupRoomMatchState(room, reason = 'cleanup', timestamp = Date.now()) {
  if (!room?.match) return false;
  const match = room.match;
  const now = Number(timestamp) || Date.now();

  if (Array.isArray(match.players)) {
    match.players.forEach((player) => {
      resetTransientMatchPlayerState(player, now);
      player.eliminated = false;
      player.lastHitAt = 0;
      player.hitInvulnerableUntil = 0;
      player.currentHealth = getPlayerMaxHealth(player);
      player.lastDamagedAt = 0;
      player.lastDamageCause = '';
      player.lastDamageAbilityId = '';
      player.lastDamageSourcePlayerNumber = 0;
      player.lastLavaDamageAt = 0;
      setAbilityReadyAt(player, ABILITY_IDS.FIREBLAST, 0);
      setAbilityReadyAt(player, ABILITY_IDS.BLINK, 0);
      setAbilityReadyAt(player, ABILITY_IDS.SHIELD, 0);
      setAbilityReadyAt(player, ABILITY_IDS.PRISM, 0);
      setAbilityReadyAt(player, ABILITY_IDS.GUST, 0);
      setAbilityReadyAt(player, ABILITY_IDS.CHARGE, 0);
      setAbilityReadyAt(player, ABILITY_IDS.SHOCK, 0);
      setAbilityReadyAt(player, ABILITY_IDS.HOOK, 0);
      setAbilityReadyAt(player, ABILITY_IDS.SOLAR, 0);
      setAbilityReadyAt(player, ABILITY_IDS.RIFT, 0);
      setAbilityReadyAt(player, ABILITY_IDS.PHANTOM, 0);
      setAbilityReadyAt(player, ABILITY_IDS.WALL, 0);
      setAbilityReadyAt(player, ABILITY_IDS.REWIND, 0);
      player.positionHistory = [];
      player.actionRateLimits = {};
      player.recentAbilityRequests = {};
      player.recentDraftRequests = {};
    });
  }

  match.projectiles = [];
  match.walls = [];
  match.roundPillars = [];
  match.rifts = [];
  match.pendingAbilityCasts = [];
  match.hitEvents = [];
  if (match.analytics && typeof match.analytics === 'object') {
    match.analytics.playerLastImpactByNumber = {};
    match.analytics.lastUpdatedAt = now;
  }
  match.eliminationCause = null;
  match.cleanupAt = now;
  room.match = null;

  logLifecycle('cleanup', 'match_state_cleared', {
    code: room.code,
    reason,
    at: now
  });
  return true;
}

function resetRoomAfterMatch(room, requestedBySocketId, reason = 'return_to_room') {
  if (!room || !room.match) return false;
  if (room.match.phase !== MATCH_PHASE_MATCH_END) return false;

  logLifecycle('room', 'player_returned_to_room', {
    code: room.code,
    socket: requestedBySocketId,
    reason
  });
  cleanupRoomMatchState(room, reason, Date.now());
  clearReconnectTimersForRoom(room.code);

  normalizePlayerSlots(room);
  room.players.forEach((player) => {
    clearDisconnectedStateForPlayer(player);
    clearReconnectGraceTimer(room.code, player.playerId);
  });
  resetReadyAndMatchRole(room);
  refreshRoomState(room, 'rematch_reset');
  logLifecycle('room', 'rematch_ready', {
    code: room.code,
    state: room.state,
    players: room.players.length
  });
  return true;
}

function leaveRoomForSocket(socket, reason = 'leave_room', notifySelf = true) {
  removeSocketFromQuickMatchQueue(socket?.id, `leave_room:${reason}`, false);
  const roomCode = playerRoomBySocketId.get(socket.id);
  if (!roomCode) return null;

  const room = rooms.get(roomCode);
  const roomPlayer = room ? getPlayerBySocketId(room, socket.id) : null;
  playerRoomBySocketId.delete(socket.id);
  socket.leave(roomCode);

  if (!room) {
    if (notifySelf) {
      socket.emit('room_left', { roomCode, reason });
    }
    return { roomCode, room: null };
  }

  if (reason === 'disconnect' && roomPlayer) {
    beginDisconnectGraceForPlayer(room, roomPlayer, reason);
    return { roomCode, room, deferred: true };
  }

  if (roomPlayer) {
    removePlayerFromRoomList(room, roomPlayer.playerId);
    logLifecycle('room', 'leave', {
      code: roomCode,
      socket: socket.id,
      playerId: roomPlayer.playerId,
      reason
    });
  } else {
    room.players = room.players.filter((player) => player.socketId !== socket.id);
    logLifecycle('room', 'leave', {
      code: roomCode,
      socket: socket.id,
      reason
    });
  }

  if (!deleteRoomIfEmpty(room)) {
    const preserveMatchEndForfeit = reason === 'leave_game_forfeit'
      && room.match
      && room.match.phase === MATCH_PHASE_MATCH_END;
    if (room.match && !preserveMatchEndForfeit) {
      cleanupRoomMatchState(room, 'player_left', Date.now());
    }
    normalizePlayerSlots(room);
    if (preserveMatchEndForfeit) {
      setRoomState(room, ROOM_STATES.MATCH_END, 'player_forfeit_left');
      logLifecycle('room', 'match_end_preserved_after_forfeit', {
        code: roomCode,
        reason,
        remainingPlayers: room.players.length
      });
    } else {
      resetReadyAndMatchRole(room);
      logLifecycle('room', 'ready_reset', {
        code: roomCode,
        reason: 'player_left'
      });
      refreshRoomState(room, 'player_left');
    }
    emitRoomUpdate(room);
  }

  if (notifySelf) {
    socket.emit('room_left', { roomCode, reason });
  }

  return { roomCode, room };
}

function handleLeaveGameRequest(socket, ack) {
  const respond = typeof ack === 'function'
    ? (payload) => ack(payload)
    : () => {};

  function fail(message, code = 'LEAVE_GAME_FAILED') {
    emitRoomError(socket, message, code);
    respond({ ok: false, code, message });
  }

  const roomCode = playerRoomBySocketId.get(socket.id);
  if (!roomCode) {
    fail('Join a game before leaving.', 'NOT_IN_ROOM');
    return;
  }

  const room = rooms.get(roomCode);
  if (!room) {
    fail('Room is no longer available.', 'ROOM_NOT_FOUND');
    return;
  }

  const roomPlayer = getPlayerBySocketId(room, socket.id);
  if (!roomPlayer) {
    fail('You are not in this room.', 'NOT_IN_ROOM');
    return;
  }

  let forfeitApplied = false;
  let winnerPlayerNumber = null;
  let eliminatedPlayerNumber = null;
  let matchId = '';
  let matchEndReason = '';

  const match = room.match;
  const phase = String(match?.phase || '').trim().toLowerCase();
  const canForfeit = match
    && (
      phase === MATCH_PHASE_DRAFT
      || phase === MATCH_PHASE_COMBAT_COUNTDOWN
      || phase === MATCH_PHASE_COMBAT
      || phase === MATCH_PHASE_ROUND_END
    );

  if (canForfeit) {
    const leaverMatchPlayer = getMatchPlayerByPlayerId(match, roomPlayer.playerId);
    const winnerMatchPlayer = getOpponentPlayer(match, leaverMatchPlayer?.matchPlayerNumber);

    if (leaverMatchPlayer && winnerMatchPlayer) {
      const endedAt = Date.now();
      forfeitApplied = transitionMatchToEnd(
        room,
        leaverMatchPlayer,
        winnerMatchPlayer,
        'player_forfeit',
        endedAt
      );

      if (forfeitApplied) {
        setRoomState(room, ROOM_STATES.MATCH_END, 'player_forfeit');
        winnerPlayerNumber = Number(winnerMatchPlayer.matchPlayerNumber) || null;
        eliminatedPlayerNumber = Number(leaverMatchPlayer.matchPlayerNumber) || null;
        matchId = String(match.matchId || '');
        matchEndReason = String(match.matchEndReason || 'player_forfeit');
        emitRoomUpdate(room);
        emitMatchState(room, endedAt);
        logLifecycle('match', 'forfeit_applied', {
          code: room.code,
          socket: socket.id,
          winner: winnerPlayerNumber || 0,
          eliminated: eliminatedPlayerNumber || 0,
          reason: matchEndReason
        });
      }
    }
  }

  leaveRoomForSocket(socket, forfeitApplied ? 'leave_game_forfeit' : 'leave_game', true);
  respond({
    ok: true,
    roomCode,
    forfeitApplied,
    winnerPlayerNumber,
    eliminatedPlayerNumber,
    matchId,
    reason: forfeitApplied ? 'player_forfeit' : 'leave_game',
    matchEndReason
  });
}

app.get('/', (_req, res) => {
  res.type('text/plain').send('Outra multiplayer server is running.');
});

io.on('connection', (socket) => {
  const remoteAddress = socket.handshake.address || 'unknown';
  logLifecycle('socket', 'connected', {
    id: socket.id,
    ip: remoteAddress
  });

  socket.on('queue_quick_match', (payloadOrAck, maybeAck) => {
    const payload = payloadOrAck && typeof payloadOrAck === 'object' && typeof payloadOrAck !== 'function'
      ? payloadOrAck
      : {};
    const ack = typeof payloadOrAck === 'function'
      ? payloadOrAck
      : maybeAck;
    const respond = typeof ack === 'function'
      ? (payload) => ack(payload)
      : () => {};
    const displayName = resolvePlayerDisplayName(socket, payload);

    logLifecycle('queue', 'request', {
      socket: socket.id,
      queueDepth: quickMatchQueue.length
    });

    pruneQuickMatchQueue();
    const existingRoomCode = playerRoomBySocketId.get(socket.id);
    if (existingRoomCode) {
      const existingRoom = rooms.get(existingRoomCode);
      if (existingRoom?.match && existingRoom.match.phase !== MATCH_PHASE_MATCH_END) {
        logLifecycle('queue', 'force_switch_from_active_match', {
          socket: socket.id,
          code: existingRoomCode,
          phase: existingRoom.match.phase
        });
      }
      leaveRoomForSocket(socket, 'switch_to_quick_match', false);
    }

    const existingQueueIndex = getQuickMatchQueueIndexBySocketId(socket.id);
    if (existingQueueIndex >= 0) {
      const existingEntry = quickMatchQueue[existingQueueIndex];
      existingEntry.displayName = displayName;
      const queuedAt = Number(existingEntry?.queuedAt) || Date.now();
      emitQuickMatchState(socket, 'searching', {
        queuedAt,
        queueDepth: quickMatchQueue.length
      });
      respond({
        ok: true,
        status: 'searching',
        queuedAt,
        queueDepth: quickMatchQueue.length,
        idempotent: true
      });
      return;
    }

    const opponentEntry = findNextQueuedOpponent(socket.id);
    if (!opponentEntry || !opponentEntry.socket) {
      const queuedAt = Date.now();
      quickMatchQueue.push({
        socketId: socket.id,
        queuedAt,
        displayName
      });
      logLifecycle('queue', 'queued', {
        socket: socket.id,
        queueDepth: quickMatchQueue.length
      });
      emitQuickMatchState(socket, 'searching', {
        queuedAt,
        queueDepth: quickMatchQueue.length
      });
      socket.emit('quick_match_queued', {
        status: 'searching',
        queuedAt,
        queueDepth: quickMatchQueue.length
      });
      respond({
        ok: true,
        status: 'searching',
        queuedAt,
        queueDepth: quickMatchQueue.length
      });
      return;
    }

    const opponentSocket = opponentEntry.socket;
    removeSocketFromQuickMatchQueue(socket.id, 'matched', false);
    removeSocketFromQuickMatchQueue(opponentSocket.id, 'matched', false);

    const opponentRoomCode = playerRoomBySocketId.get(opponentSocket.id);
    if (opponentRoomCode) {
      leaveRoomForSocket(opponentSocket, 'switch_to_quick_match_match', false);
    }
    const selfRoomCode = playerRoomBySocketId.get(socket.id);
    if (selfRoomCode) {
      leaveRoomForSocket(socket, 'switch_to_quick_match_match', false);
    }

    const room = createQuickMatchRoomAndStartDraft(opponentSocket, socket, {
      playerADisplayName: opponentEntry?.displayName,
      playerBDisplayName: displayName
    });
    if (!room) {
      const responsePayload = {
        ok: false,
        code: 'QUICK_MATCH_FAILED',
        message: 'Unable to create quick match room.'
      };
      respond(responsePayload);
      emitQuickMatchState(socket, 'idle', {
        reason: responsePayload.code
      });
      emitQuickMatchState(opponentSocket, 'idle', {
        reason: responsePayload.code
      });
      return;
    }

    const selfQueuedMs = Math.max(0, Date.now() - (Number(opponentEntry?.queuedAt) || Date.now()));
    const selfResponse = {
      ok: true,
      status: 'matched',
      roomCode: room.code,
      queueDepth: quickMatchQueue.length
    };
    respond(selfResponse);
    emitQuickMatchState(socket, 'matched', {
      roomCode: room.code,
      queueDepth: quickMatchQueue.length
    });
    emitQuickMatchState(opponentSocket, 'matched', {
      roomCode: room.code,
      queueDepth: quickMatchQueue.length
    });
    socket.emit('quick_match_matched', {
      status: 'matched',
      roomCode: room.code,
      queueDepth: quickMatchQueue.length
    });
    opponentSocket.emit('quick_match_matched', {
      status: 'matched',
      roomCode: room.code,
      waitMs: selfQueuedMs,
      queueDepth: quickMatchQueue.length
    });
    logLifecycle('queue', 'matched', {
      roomCode: room.code,
      playerA: opponentSocket.id,
      playerB: socket.id
    });
  });

  socket.on('cancel_quick_match', (ack) => {
    const respond = typeof ack === 'function'
      ? (payload) => ack(payload)
      : () => {};

    const removedEntry = removeSocketFromQuickMatchQueue(socket.id, 'player_cancel', true);
    if (!removedEntry) {
      respond({
        ok: true,
        status: 'idle',
        queueDepth: quickMatchQueue.length,
        idempotent: true
      });
      emitQuickMatchState(socket, 'idle', {
        reason: 'not_queued',
        queueDepth: quickMatchQueue.length
      });
      return;
    }

    respond({
      ok: true,
      status: 'idle',
      queueDepth: quickMatchQueue.length
    });
    emitQuickMatchState(socket, 'idle', {
      reason: 'player_cancel',
      queueDepth: quickMatchQueue.length
    });
  });

  socket.on('create_room', (payload) => {
    const displayName = resolvePlayerDisplayName(socket, payload);
    removeSocketFromQuickMatchQueue(socket.id, 'manual_create_room', false);
    leaveRoomForSocket(socket, 'switch_to_create', false);

    const roomCode = createUniqueRoomCode();
    const room = {
      code: roomCode,
      players: [createRoomPlayer(socket.id, 1, displayName)],
      match: null,
      state: ROOM_STATES.WAITING,
      createdAt: Date.now()
    };

    rooms.set(roomCode, room);
    playerRoomBySocketId.set(socket.id, roomCode);
    socket.join(roomCode);

    logLifecycle('room', 'created', {
      code: roomCode,
      by: socket.id
    });
    const creator = room.players[0];
    socket.emit('room_created', {
      roomCode,
      playerSlot: 1,
      reconnectToken: creator?.reconnectToken || '',
      reconnectPlayerId: creator?.playerId || '',
      room: serializeRoom(room)
    });
    emitRoomUpdate(room);
  });

  socket.on('reconnect_room', (payload, ack) => {
    const displayName = resolvePlayerDisplayName(socket, payload);
    const respond = typeof ack === 'function'
      ? (responsePayload) => ack(responsePayload)
      : () => {};

    const requestedCode = normalizeRoomCode(payload?.roomCode || payload?.code);
    const reconnectToken = normalizeReconnectToken(payload?.reconnectToken || payload?.token);

    function fail(message, code = 'RECONNECT_FAILED') {
      socket.emit('reconnect_failed', {
        roomCode: requestedCode || '',
        code,
        message
      });
      respond({ ok: false, roomCode: requestedCode || '', code, message });
      logLifecycle('reconnect', 'failed', {
        socket: socket.id,
        code: requestedCode || '-',
        reason: code
      });
    }

    if (!requestedCode) {
      fail('Missing room code for reconnect.', 'MISSING_ROOM_CODE');
      return;
    }

    if (!reconnectToken) {
      fail('Missing reconnect token.', 'MISSING_RECONNECT_TOKEN');
      return;
    }

    const room = rooms.get(requestedCode);
    if (!room) {
      fail(`Room ${requestedCode} no longer exists.`, 'ROOM_NOT_FOUND');
      return;
    }

    const reconnectPlayer = getPlayerByReconnectToken(room, reconnectToken);
    if (!reconnectPlayer) {
      fail('Reconnect token is invalid for this room.', 'INVALID_RECONNECT_TOKEN');
      return;
    }

    if (reconnectPlayer.connected === true && reconnectPlayer.socketId === socket.id) {
      const idempotentPayload = buildPlayerSessionPayload(room, reconnectPlayer);
      socket.emit('room_reconnected', {
        ...idempotentPayload,
        resumedMatch: false,
        idempotent: true
      });
      respond({
        ok: true,
        ...idempotentPayload,
        resumedMatch: false,
        idempotent: true
      });
      logLifecycle('reconnect', 'idempotent_success', {
        code: room.code,
        socket: socket.id,
        playerId: reconnectPlayer.playerId
      });
      return;
    }

    if (reconnectPlayer.connected === true && reconnectPlayer.socketId && reconnectPlayer.socketId !== socket.id) {
      fail('This player slot is already connected.', 'ALREADY_CONNECTED');
      return;
    }

    const existingRoomCode = playerRoomBySocketId.get(socket.id);
    if (existingRoomCode && existingRoomCode !== requestedCode) {
      leaveRoomForSocket(socket, 'switch_to_reconnect', false);
    }

    clearReconnectGraceTimer(room.code, reconnectPlayer.playerId);
    clearDisconnectedStateForPlayer(reconnectPlayer);
    reconnectPlayer.socketId = socket.id;
    reconnectPlayer.name = normalizePlayerDisplayName(displayName, reconnectPlayer.name || PLAYER_DISPLAY_NAME_FALLBACK);
    removeSocketFromQuickMatchQueue(socket.id, 'reconnected_to_room', false);

    playerRoomBySocketId.set(socket.id, room.code);
    socket.join(room.code);

    const matchPlayer = getMatchPlayerByPlayerId(room.match, reconnectPlayer.playerId);
    if (matchPlayer) {
      clearDisconnectedStateForPlayer(matchPlayer);
      matchPlayer.socketId = socket.id;
      matchPlayer.name = normalizePlayerDisplayName(displayName, matchPlayer.name || reconnectPlayer.name || PLAYER_DISPLAY_NAME_FALLBACK);
      matchPlayer.input = { x: 0, y: 0 };
    }

    refreshRoomState(room, 'player_reconnected');
    const resumedMatch = tryResumePausedMatch(room, 'player_reconnected');
    const reconnectPayload = buildPlayerSessionPayload(room, reconnectPlayer);

    socket.emit('room_reconnected', {
      ...reconnectPayload,
      resumedMatch
    });
    io.to(room.code).emit('player_reconnected', {
      roomCode: room.code,
      playerSlot: reconnectPlayer.slot,
      matchPlayerNumber: reconnectPlayer.matchPlayerNumber,
      reconnectedAt: Date.now(),
      resumedMatch
    });
    emitRoomUpdate(room);
    if (room.match) emitMatchState(room, Date.now());

    respond({
      ok: true,
      ...reconnectPayload,
      resumedMatch
    });
    logLifecycle('reconnect', 'success', {
      code: room.code,
      socket: socket.id,
      playerId: reconnectPlayer.playerId,
      slot: reconnectPlayer.slot,
      resumedMatch
    });
  });

  socket.on('join_room', (payload) => {
    removeSocketFromQuickMatchQueue(socket.id, 'manual_join_room', false);
    const displayName = resolvePlayerDisplayName(socket, payload);
    const requestedCode = normalizeRoomCode(payload?.roomCode || payload?.code || payload);
    if (!requestedCode) {
      emitRoomError(socket, 'Please provide a valid room code.', 'INVALID_ROOM_CODE');
      return;
    }

    const room = rooms.get(requestedCode);
    if (!room) {
      emitRoomError(socket, `Room ${requestedCode} does not exist.`, 'ROOM_NOT_FOUND');
      return;
    }

    const directExistingPlayerInRequestedRoom = getPlayerBySocketId(room, socket.id);
    if (directExistingPlayerInRequestedRoom) {
      directExistingPlayerInRequestedRoom.name = normalizePlayerDisplayName(
        displayName,
        directExistingPlayerInRequestedRoom.name || PLAYER_DISPLAY_NAME_FALLBACK
      );
      playerRoomBySocketId.set(socket.id, requestedCode);
      socket.join(requestedCode);
      socket.emit('room_joined', {
        roomCode: requestedCode,
        playerSlot: directExistingPlayerInRequestedRoom.slot || 1,
        reconnectToken: directExistingPlayerInRequestedRoom.reconnectToken || '',
        reconnectPlayerId: directExistingPlayerInRequestedRoom.playerId || '',
        room: serializeRoom(room),
        idempotent: true
      });
      emitRoomUpdate(room);
      logLifecycle('room', 'join_idempotent_existing_socket', {
        code: requestedCode,
        socket: socket.id,
        slot: directExistingPlayerInRequestedRoom.slot || 1
      });
      return;
    }

    const existingRoomCode = playerRoomBySocketId.get(socket.id);
    if (existingRoomCode === requestedCode) {
      const existingPlayer = getPlayerBySocketId(room, socket.id);
      if (existingPlayer) {
        existingPlayer.name = normalizePlayerDisplayName(
          displayName,
          existingPlayer.name || PLAYER_DISPLAY_NAME_FALLBACK
        );
      }
      socket.emit('room_joined', {
        roomCode: requestedCode,
        playerSlot: existingPlayer?.slot || 1,
        reconnectToken: existingPlayer?.reconnectToken || '',
        reconnectPlayerId: existingPlayer?.playerId || '',
        room: serializeRoom(room)
      });
      emitRoomUpdate(room);
      return;
    }

    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      emitRoomError(socket, `Room ${requestedCode} is full.`, 'ROOM_FULL');
      return;
    }

    if (existingRoomCode) {
      leaveRoomForSocket(socket, 'switch_to_join', false);
    }

    room.players.push(createRoomPlayer(socket.id, room.players.length + 1, displayName));
    normalizePlayerSlots(room);
    refreshRoomState(room, 'player_joined');
    playerRoomBySocketId.set(socket.id, requestedCode);
    socket.join(requestedCode);

    const playerSlot = getPlayerBySocketId(room, socket.id)?.slot || room.players.length;
    logLifecycle('room', 'joined', {
      code: requestedCode,
      socket: socket.id,
      slot: playerSlot
    });
    socket.emit('room_joined', {
      roomCode: requestedCode,
      playerSlot,
      reconnectToken: getPlayerBySocketId(room, socket.id)?.reconnectToken || '',
      reconnectPlayerId: getPlayerBySocketId(room, socket.id)?.playerId || '',
      room: serializeRoom(room)
    });
    emitRoomUpdate(room);
  });

  socket.on('leave_room', () => {
    leaveRoomForSocket(socket, 'leave_room', true);
  });

  socket.on('leave_game', (ack) => {
    handleLeaveGameRequest(socket, ack);
  });

  socket.on('return_to_room', (ack) => {
    const respond = typeof ack === 'function'
      ? (payload) => ack(payload)
      : () => {};

    function fail(message, code) {
      emitRoomError(socket, message, code);
      respond({ ok: false, code, message });
    }

    const roomCode = playerRoomBySocketId.get(socket.id);
    if (!roomCode) {
      fail('Join a room before returning.', 'NOT_IN_ROOM');
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      fail('Room is no longer available.', 'ROOM_NOT_FOUND');
      return;
    }

    const player = getPlayerBySocketId(room, socket.id);
    if (!player) {
      fail('You are not in this room.', 'NOT_IN_ROOM');
      return;
    }

    if (!room.match) {
      refreshRoomState(room, 'return_no_match');
      emitRoomUpdate(room);
      respond({
        ok: true,
        roomCode: room.code,
        room: serializeRoom(room),
        reset: false,
        reconnectToken: player.reconnectToken,
        reconnectPlayerId: player.playerId
      });
      return;
    }

    if (room.match.phase !== MATCH_PHASE_MATCH_END) {
      logLifecycle('room', 'return_to_room_rejected_phase', {
        code: room.code,
        socket: socket.id,
        phase: room.match.phase || '-'
      });
      fail('Match has not ended yet.', 'MATCH_NOT_ENDED');
      return;
    }

    const didReset = resetRoomAfterMatch(room, socket.id, 'return_to_room');
    if (!didReset) {
      fail('Unable to return room to ready state.', 'ROOM_RESET_FAILED');
      return;
    }

    const serializedRoom = serializeRoom(room);
    emitRoomUpdate(room);
    io.to(room.code).emit('room_reset_for_rematch', {
      roomCode: room.code,
      room: serializedRoom,
      reason: 'return_to_room',
      requestedBySocketId: socket.id
    });
    respond({
      ok: true,
      roomCode: room.code,
      room: serializedRoom,
      reset: true,
      reconnectToken: player.reconnectToken,
      reconnectPlayerId: player.playerId
    });
    logLifecycle('room', 'returned_to_room', {
      code: room.code,
      socket: socket.id,
      reset: true
    });
  });

  socket.on('reset_room_for_rematch', (ack) => {
    const respond = typeof ack === 'function'
      ? (payload) => ack(payload)
      : () => {};

    function fail(message, code) {
      emitRoomError(socket, message, code);
      respond({ ok: false, code, message });
    }

    const roomCode = playerRoomBySocketId.get(socket.id);
    if (!roomCode) {
      fail('Join a room before resetting.', 'NOT_IN_ROOM');
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      fail('Room is no longer available.', 'ROOM_NOT_FOUND');
      return;
    }

    const player = getPlayerBySocketId(room, socket.id);
    if (!player) {
      fail('You are not in this room.', 'NOT_IN_ROOM');
      return;
    }

    if (!room.match) {
      resetReadyAndMatchRole(room);
      refreshRoomState(room, 'rematch_reset_no_match');
      const serializedRoom = serializeRoom(room);
      emitRoomUpdate(room);
      respond({
        ok: true,
        roomCode: room.code,
        room: serializedRoom,
        reset: false,
        reconnectToken: player.reconnectToken,
        reconnectPlayerId: player.playerId
      });
      return;
    }

    if (room.match.phase !== MATCH_PHASE_MATCH_END) {
      logLifecycle('room', 'reset_rematch_rejected_phase', {
        code: room.code,
        socket: socket.id,
        phase: room.match.phase || '-'
      });
      fail('Match has not ended yet.', 'MATCH_NOT_ENDED');
      return;
    }

    const didReset = resetRoomAfterMatch(room, socket.id, 'reset_room_for_rematch');
    if (!didReset) {
      fail('Unable to reset room for rematch.', 'ROOM_RESET_FAILED');
      return;
    }

    const serializedRoom = serializeRoom(room);
    emitRoomUpdate(room);
    io.to(room.code).emit('room_reset_for_rematch', {
      roomCode: room.code,
      room: serializedRoom,
      reason: 'reset_room_for_rematch',
      requestedBySocketId: socket.id
    });
    respond({
      ok: true,
      roomCode: room.code,
      room: serializedRoom,
      reset: true,
      reconnectToken: player.reconnectToken,
      reconnectPlayerId: player.playerId
    });
    logLifecycle('room', 'reset_for_rematch', {
      code: room.code,
      socket: socket.id,
      reset: true
    });
  });

  socket.on('toggle_ready', (ack) => {
    const respond = typeof ack === 'function'
      ? (payload) => ack(payload)
      : () => {};

    function fail(message, code) {
      emitRoomError(socket, message, code);
      respond({ ok: false, code, message });
    }

    const roomCode = playerRoomBySocketId.get(socket.id);
    if (!roomCode) {
      fail('Join a room before toggling ready.', 'NOT_IN_ROOM');
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      fail('Room is no longer available.', 'ROOM_NOT_FOUND');
      return;
    }

    const player = getPlayerBySocketId(room, socket.id);
    if (!player) {
      fail('You are not in this room.', 'NOT_IN_ROOM');
      return;
    }

    if (room.match) {
      logLifecycle('room', 'ready_toggle_rejected_match_exists', {
        code: room.code,
        socket: socket.id,
        phase: room.match.phase || '-'
      });
      fail('Match already started.', 'MATCH_ALREADY_STARTED');
      return;
    }

    if (room.players.length < MAX_PLAYERS_PER_ROOM || getConnectedPlayerCount(room) < MAX_PLAYERS_PER_ROOM) {
      player.ready = false;
      player.matchPlayerNumber = null;
      refreshRoomState(room, 'waiting_for_opponent');
      fail('Waiting for opponent before ready check.', 'WAITING_FOR_OPPONENT');
      emitRoomUpdate(room);
      return;
    }

    player.ready = !Boolean(player.ready);
    logLifecycle('room', 'ready_toggled', {
      code: roomCode,
      socket: socket.id,
      ready: player.ready
    });

    if (areAllPlayersReady(room)) {
      logLifecycle('room', 'both_ready', {
        code: roomCode
      });
      setRoomState(room, ROOM_STATES.STARTING, 'both_ready');
      const match = createMatchForRoom(room);
      emitRoomUpdate(room);
      emitMatchStarted(room);
      emitMatchState(room, Date.now());
      respond({
        ok: true,
        roomCode: room.code,
        room: serializeRoom(room),
        match,
        matchPlayerNumber: player.matchPlayerNumber,
        reconnectToken: player.reconnectToken,
        reconnectPlayerId: player.playerId
      });
      return;
    }

    refreshRoomState(room, 'ready_toggled');
    emitRoomUpdate(room);
    respond({
      ok: true,
      roomCode: room.code,
      room: serializeRoom(room),
      match: null,
      matchPlayerNumber: player.matchPlayerNumber,
      reconnectToken: player.reconnectToken,
      reconnectPlayerId: player.playerId
    });
  });

  socket.on('player_input', (payload) => {
    const roomCode = playerRoomBySocketId.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room || !room.match || room.match.phase !== MATCH_PHASE_COMBAT) return;
    if (room.match.isPaused === true) return;

    const matchPlayer = getMatchPlayerBySocketId(room.match, socket.id);
    if (!matchPlayer) return;
    if (matchPlayer.connected === false) return;

    const nextInput = normalizeInputVector(payload);
    const previousInput = normalizeInputVector(matchPlayer.input);
    matchPlayer.input = nextInput;
    matchPlayer.lastUpdated = Date.now();

    if (!inputsEqual(previousInput, nextInput)) {
      logRuntimeVerbose(`[match] player_input code=${roomCode} socket=${socket.id} x=${nextInput.x.toFixed(2)} y=${nextInput.y.toFixed(2)}`);
    }
  });

  socket.on('player_aim', (payload) => {
    const roomCode = playerRoomBySocketId.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room || !room.match || room.match.phase !== MATCH_PHASE_COMBAT) return;
    if (room.match.isPaused === true) return;

    const matchPlayer = getMatchPlayerBySocketId(room.match, socket.id);
    if (!matchPlayer) return;
    if (matchPlayer.connected === false) return;

    const nextAim = normalizeInputVector(payload);
    if (nextAim.x === 0 && nextAim.y === 0) return;

    const previousAim = normalizeInputVector(matchPlayer.aim);
    if (inputsEqual(previousAim, nextAim)) return;

    matchPlayer.aim = nextAim;
    matchPlayer.lastAimUpdated = Date.now();
    logRuntimeVerbose(`[match] player_aim code=${roomCode} socket=${socket.id} x=${nextAim.x.toFixed(2)} y=${nextAim.y.toFixed(2)}`);
  });

  socket.on('cast_ability', (payloadOrAck, maybeAck) => {
    const { payload } = resolveAbilityCastPayloadAndAck(payloadOrAck, maybeAck);
    const abilityId = normalizeSpellId(
      payload?.abilityId
      || payload?.spellId
      || payload?.ability
      || payload?.spell
      || payload
    );
    if (!abilityId) {
      const ack = typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck;
      if (typeof ack === 'function') {
        ack({ ok: false, code: 'MISSING_ABILITY', message: 'Missing abilityId.' });
      }
      emitRoomError(socket, 'Missing abilityId.', 'MISSING_ABILITY');
      return;
    }
    handleAbilityCastRequest(socket, abilityId, payloadOrAck, maybeAck);
  });

  socket.on('cast_fireblast', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.FIREBLAST, payloadOrAck, maybeAck);
  });

  socket.on('cast_blink', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.BLINK, payloadOrAck, maybeAck);
  });

  socket.on('cast_shield', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.SHIELD, payloadOrAck, maybeAck);
  });

  socket.on('cast_prism', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.PRISM, payloadOrAck, maybeAck);
  });

  socket.on('cast_gust', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.GUST, payloadOrAck, maybeAck);
  });

  socket.on('cast_charge', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.CHARGE, payloadOrAck, maybeAck);
  });

  socket.on('cast_shock', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.SHOCK, payloadOrAck, maybeAck);
  });

  socket.on('cast_hook', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.HOOK, payloadOrAck, maybeAck);
  });

  socket.on('cast_solar', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.SOLAR, payloadOrAck, maybeAck);
  });

  socket.on('cast_rift', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.RIFT, payloadOrAck, maybeAck);
  });

  socket.on('cast_phantom', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.PHANTOM, payloadOrAck, maybeAck);
  });

  socket.on('cast_wall', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.WALL, payloadOrAck, maybeAck);
  });

  socket.on('cast_rewind', (payloadOrAck, maybeAck) => {
    handleAbilityCastRequest(socket, ABILITY_IDS.REWIND, payloadOrAck, maybeAck);
  });

  socket.on('tuning_get', (ack) => {
    const respond = typeof ack === 'function' ? (payload) => ack(payload) : () => {};
    if (!ENABLE_TUNING_ADMIN) {
      respond({
        ok: false,
        code: 'TUNING_DISABLED',
        message: 'Live tuning is disabled in this environment.'
      });
      return;
    }
    const tuning = getAllSpellTuning();
    const identity = getSpellIdentitySummary();
    respond({
      ok: true,
      tuning,
      identity,
      updatedAt: Date.now()
    });
    logLifecycle('tuning', 'snapshot_requested', {
      socket: socket.id
    });
  });

  socket.on('tuning_set', (payloadOrAck, maybeAck) => {
    const payload = typeof payloadOrAck === 'function' ? {} : (payloadOrAck || {});
    const ack = typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck;
    const respond = typeof ack === 'function' ? (responsePayload) => ack(responsePayload) : () => {};
    if (!ENABLE_TUNING_ADMIN) {
      respond({
        ok: false,
        code: 'TUNING_DISABLED',
        message: 'Live tuning is disabled in this environment.'
      });
      return;
    }

    const abilityId = normalizeSpellId(payload?.abilityId);
    const patchFromPayload = payload?.patch && typeof payload.patch === 'object'
      ? payload.patch
      : null;
    const field = String(payload?.field || payload?.key || '').trim();
    const value = payload?.value;
    const patch = patchFromPayload || (field ? { [field]: value } : {});
    const result = setSpellTuningOverride(abilityId, patch);
    if (!result?.ok) {
      respond({
        ok: false,
        code: result?.code || 'TUNING_SET_FAILED',
        message: result?.message || 'Failed to set tuning override.'
      });
      return;
    }

    const tuning = getAllSpellTuning();
    const identity = getSpellIdentitySummary();
    respond({
      ok: true,
      abilityId: result.abilityId,
      tuning: result.tuning,
      allTuning: tuning,
      identity,
      updatedAt: Date.now()
    });
    logLifecycle('tuning', 'override_set', {
      socket: socket.id,
      ability: result.abilityId
    });
    logSpellTuningSnapshot(`override_set:${result.abilityId}`);
  });

  socket.on('tuning_reset', (payloadOrAck, maybeAck) => {
    const payload = typeof payloadOrAck === 'function' ? {} : (payloadOrAck || {});
    const ack = typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck;
    const respond = typeof ack === 'function' ? (responsePayload) => ack(responsePayload) : () => {};
    if (!ENABLE_TUNING_ADMIN) {
      respond({
        ok: false,
        code: 'TUNING_DISABLED',
        message: 'Live tuning is disabled in this environment.'
      });
      return;
    }

    const abilityId = normalizeSpellId(payload?.abilityId || payload?.reset || payload) || 'all';
    const result = resetSpellTuningOverride(abilityId);
    if (!result?.ok) {
      respond({
        ok: false,
        code: result?.code || 'TUNING_RESET_FAILED',
        message: result?.message || 'Failed to reset tuning override.'
      });
      return;
    }
    const tuning = getAllSpellTuning();
    const identity = getSpellIdentitySummary();
    respond({
      ok: true,
      reset: result.reset || result.abilityId || abilityId,
      tuning: result.tuning,
      allTuning: tuning,
      identity,
      updatedAt: Date.now()
    });
    logLifecycle('tuning', 'override_reset', {
      socket: socket.id,
      reset: result.reset || result.abilityId || abilityId
    });
    logSpellTuningSnapshot(`override_reset:${result.reset || result.abilityId || abilityId}`);
  });

  socket.on('draft_pick', (payloadOrAck, maybeAck) => {
    const payload = typeof payloadOrAck === 'function' ? undefined : payloadOrAck;
    const ack = typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck;
    const respond = typeof ack === 'function'
      ? (responsePayload) => ack(responsePayload)
      : () => {};

    function fail(message, code, extra = {}) {
      emitRoomError(socket, message, code);
      respond({ ok: false, code, message, ...extra });
      logLifecycle('draft', 'pick_rejected', {
        socket: socket.id,
        code,
        message
      });
    }

    const roomCode = playerRoomBySocketId.get(socket.id);
    if (!roomCode) {
      fail('Join a room before drafting.', 'NOT_IN_ROOM');
      return;
    }

    const room = rooms.get(roomCode);
    if (!room || !room.match) {
      fail('Draft is not active.', 'DRAFT_NOT_ACTIVE');
      return;
    }

    if (room.match.phase !== MATCH_PHASE_DRAFT) {
      logLifecycle('draft', 'pick_ignored_wrong_phase', {
        code: room.code,
        socket: socket.id,
        phase: room.match.phase || '-'
      });
      fail('Draft phase has ended.', 'DRAFT_NOT_ACTIVE');
      return;
    }

    const matchPlayer = getMatchPlayerBySocketId(room.match, socket.id);
    if (!matchPlayer) {
      fail('Match player not found for drafting.', 'MATCH_PLAYER_NOT_FOUND');
      return;
    }

    if (matchPlayer.connected === false) {
      fail('Disconnected players cannot draft.', 'PLAYER_DISCONNECTED');
      return;
    }

    const now = Date.now();
    const requestId = normalizeRequestId(payload?.requestId || payload?.pickId || payload?.actionId);
    const recentDraftRequests = ensureActionCache(matchPlayer, 'recentDraftRequests');
    pruneRequestCache(recentDraftRequests, now, DRAFT_REQUEST_CACHE_TTL_MS);
    if (requestId && recentDraftRequests[requestId]) {
      const cached = recentDraftRequests[requestId]?.response;
      logLifecycle('draft', 'pick_duplicate_ignored', {
        code: room.code,
        player: matchPlayer.matchPlayerNumber,
        requestId
      });
      if (cached && typeof cached === 'object') {
        respond(cached);
        return;
      }
      respond({ ok: true, duplicated: true, requestId });
      return;
    }

    const actionRateLimits = ensureActionCache(matchPlayer, 'actionRateLimits');
    const lastDraftRequestAt = Number(actionRateLimits.draft_pick) || 0;
    if ((now - lastDraftRequestAt) < DRAFT_PICK_MIN_INTERVAL_MS) {
      const rejected = {
        ok: false,
        code: 'DRAFT_RATE_LIMIT',
        message: 'Draft pick rate limit hit.',
        retryInMs: Math.max(0, DRAFT_PICK_MIN_INTERVAL_MS - (now - lastDraftRequestAt))
      };
      emitRoomError(socket, rejected.message, rejected.code);
      respond(rejected);
      if (requestId) {
        recentDraftRequests[requestId] = {
          timestamp: now,
          response: rejected
        };
      }
      logLifecycle('draft', 'pick_rejected_rate_limit', {
        code: room.code,
        player: matchPlayer.matchPlayerNumber
      });
      return;
    }
    actionRateLimits.draft_pick = now;

    const spellId = normalizeSpellId(payload?.spellId || payload?.spell || payload);
    if (!spellId) {
      fail('Select a valid spell.', 'INVALID_SPELL');
      return;
    }

    const draftResult = applyDraftPick(room, matchPlayer.matchPlayerNumber, spellId, 'manual');
    if (!draftResult.ok) {
      const rejected = {
        ok: false,
        code: draftResult.code || 'DRAFT_PICK_REJECTED',
        message: draftResult.message || 'Draft pick rejected.'
      };
      fail(rejected.message, rejected.code);
      if (requestId) {
        recentDraftRequests[requestId] = {
          timestamp: now,
          response: rejected
        };
      }
      emitRoomUpdate(room);
      emitMatchState(room, Date.now());
      return;
    }

    emitRoomUpdate(room);
    emitMatchState(room, Date.now());
    const successResponse = {
      ok: true,
      roomCode: room.code,
      spellId: draftResult.spellId,
      playerNumber: draftResult.playerNumber,
      reason: draftResult.reason,
      requestId: requestId || '',
      room: serializeRoom(room),
      match: serializeMatch(room.match)
    };
    if (requestId) {
      recentDraftRequests[requestId] = {
        timestamp: now,
        response: successResponse
      };
    }
    respond(successResponse);
  });

  socket.on('disconnect', (reason) => {
    leaveRoomForSocket(socket, 'disconnect', false);
    logLifecycle('socket', 'disconnected', {
      id: socket.id,
      reason
    });
  });
});

let matchSimulationInterval = null;

function startMatchSimulation() {
  if (matchSimulationInterval !== null) return;
  matchSimulationInterval = setInterval(runMatchSimulationTick, MATCH_TICK_MS);
}

function stopMatchSimulation() {
  if (matchSimulationInterval === null) return;
  clearInterval(matchSimulationInterval);
  matchSimulationInterval = null;
}

function startServer(options = {}) {
  const host = options.host || HOST;
  const port = Number(options.port) || PORT;
  startMatchSimulation();
  logSpellTuningSnapshot('server_start');
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('error', onError);
      reject(error);
    };
    server.on('error', onError);
    server.listen(port, host, () => {
      server.off('error', onError);
      console.log(`Outra multiplayer server listening on http://${host}:${port}`);
      resolve({ host, port });
    });
  });
}

function stopServer() {
  stopMatchSimulation();
  return new Promise((resolve) => {
    try {
      io.close(() => {
        server.close(() => {
          resolve();
        });
      });
    } catch (_error) {
      try {
        server.close(() => resolve());
      } catch (_innerError) {
        resolve();
      }
    }
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('[server] failed_to_start', error);
    process.exitCode = 1;
  });
}

module.exports = {
  app,
  server,
  io,
  rooms,
  playerRoomBySocketId,
  ABILITY_IDS,
  ABILITY_DEFS,
  MATCH_PHASE_DRAFT,
  MATCH_PHASE_COMBAT_COUNTDOWN,
  MATCH_PHASE_COMBAT,
  MATCH_PHASE_ROUND_END,
  MATCH_PHASE_MATCH_END,
  ROOM_STATES,
  startServer,
  stopServer,
  runMatchSimulationTick,
  processMatchTickForRoom,
  handleAbilityCastRequest,
  executeAbilityCast,
  getAbilityDef,
  getAbilityRemainingMs,
  setAbilityReadyAt,
  getSpellTuning,
  getAllSpellTuning,
  setSpellTuningOverride,
  resetSpellTuningOverride,
  getSpellIdentitySummary,
  ensurePlayerPositionHistory,
  createCombatEvent,
  pushMatchHitEvent,
  cleanupRoomMatchState,
  createMatchForRoom,
  createRoomPlayer,
  abilityRuntimeHandlers
};
