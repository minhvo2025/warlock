const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

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
const ROOM_CODE_LENGTH = 5;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_STATES = Object.freeze({
  WAITING: 'waiting',
  READY_CHECK: 'ready_check',
  STARTING: 'starting',
  IN_MATCH: 'in_match'
});
const MATCH_PHASE_COMBAT = 'combat';
const MATCH_PHASE_MATCH_END = 'match_end';
const PLAYER_MOVE_SPEED = 8;
const MATCH_TICK_MS = 50;
const MATCH_MAX_DELTA_MS = 100;
const ARENA_BOUNDARY_CENTER = Object.freeze({ x: 0, y: 0 });
const ARENA_BOUNDARY_RADIUS = 12;
const PLAYER_RADIUS = 0.72;
const PLAYER_KNOCKBACK_DAMPING_PER_SECOND = 8.5;
const FIREBLAST_SPEED = 14;
const FIREBLAST_LIFETIME_MS = 1400;
const FIREBLAST_COOLDOWN_MS = 700;
const FIREBLAST_SPAWN_OFFSET = 0.9;
const FIREBLAST_HIT_RADIUS = 0.34;
const FIREBLAST_HIT_INVULN_MS = 120;
const FIREBLAST_KNOCKBACK_IMPULSE = 9.5;
const MATCH_HIT_EVENT_HISTORY_LIMIT = 18;
const SPAWN_POSITIONS = Object.freeze({
  1: Object.freeze({ x: -5, y: 0 }),
  2: Object.freeze({ x: 5, y: 0 })
});

const rooms = new Map();
const playerRoomBySocketId = new Map();

function normalizeRoomCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
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

function positionsEqual(positionA, positionB) {
  if (!positionA || !positionB) return false;
  return positionA.x === positionB.x && positionA.y === positionB.y;
}

function buildSpawnPositions() {
  const player1 = clonePosition(SPAWN_POSITIONS[1]) || { x: -5, y: 0 };
  const player2 = clonePosition(SPAWN_POSITIONS[2]) || { x: 5, y: 0 };

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

function createHitId(match) {
  match.nextHitSequence = (Number(match.nextHitSequence) || 0) + 1;
  return `${match.matchId}-H${match.nextHitSequence}`;
}

function createRoomPlayer(socketId, slot) {
  return {
    socketId,
    slot,
    ready: false,
    matchPlayerNumber: null
  };
}

function getPlayerBySocketId(room, socketId) {
  return room.players.find((player) => player.socketId === socketId) || null;
}

function getMatchPlayerBySocketId(match, socketId) {
  return match?.players?.find((player) => player.socketId === socketId) || null;
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
  const normalizedDirection = normalizeInputVector(direction);
  const spawnBase = clonePosition(ownerPlayer.position) || { x: 0, y: 0 };
  const spawnPosition = {
    x: spawnBase.x + normalizedDirection.x * FIREBLAST_SPAWN_OFFSET,
    y: spawnBase.y + normalizedDirection.y * FIREBLAST_SPAWN_OFFSET
  };

  return {
    projectileId: createProjectileId(match),
    ownerPlayerNumber: ownerPlayer.matchPlayerNumber,
    position: spawnPosition,
    direction: normalizedDirection,
    speed: FIREBLAST_SPEED,
    spawnedAt: now,
    expiresAt: now + FIREBLAST_LIFETIME_MS
  };
}

function getOpponentPlayer(match, ownerPlayerNumber) {
  return (Array.isArray(match?.players) ? match.players : [])
    .find((player) => Number(player?.matchPlayerNumber) !== Number(ownerPlayerNumber)) || null;
}

function isOutsideArenaBoundary(position) {
  const pos = clonePosition(position) || { x: 0, y: 0 };
  const dx = pos.x - ARENA_BOUNDARY_CENTER.x;
  const dy = pos.y - ARENA_BOUNDARY_CENTER.y;
  return (dx * dx + dy * dy) > (ARENA_BOUNDARY_RADIUS * ARENA_BOUNDARY_RADIUS);
}

function transitionMatchToEnd(room, eliminatedPlayer, winnerPlayer, reason, timestamp) {
  const match = room?.match;
  if (!match) return false;
  if (match.phase === MATCH_PHASE_MATCH_END) return false;

  const endedAt = Number(timestamp) || Date.now();
  const eliminatedNumber = Number(eliminatedPlayer?.matchPlayerNumber) || null;
  const winnerNumber = Number(winnerPlayer?.matchPlayerNumber) || null;

  match.phase = MATCH_PHASE_MATCH_END;
  match.eliminatedPlayerNumber = eliminatedNumber;
  match.winnerPlayerNumber = winnerNumber;
  match.endedAt = endedAt;
  match.projectiles = [];

  (Array.isArray(match.players) ? match.players : []).forEach((player) => {
    player.input = { x: 0, y: 0 };
    player.velocity = { x: 0, y: 0 };
    player.eliminated = Number(player?.matchPlayerNumber) === eliminatedNumber;
    player.lastUpdated = endedAt;
  });

  console.log(`[match] winner_declared code=${room.code} winner=${winnerNumber} eliminated=${eliminatedNumber}`);
  console.log(`[match] phase_transition code=${room.code} from=${MATCH_PHASE_COMBAT} to=${MATCH_PHASE_MATCH_END} reason=${reason}`);
  return true;
}

function createFireblastHitEvent(match, projectile, targetPlayer, now) {
  return {
    hitId: createHitId(match),
    timestamp: now,
    projectileId: projectile.projectileId,
    sourcePlayerNumber: projectile.ownerPlayerNumber,
    targetPlayerNumber: targetPlayer.matchPlayerNumber,
    knockback: {
      x: projectile.direction.x * FIREBLAST_KNOCKBACK_IMPULSE,
      y: projectile.direction.y * FIREBLAST_KNOCKBACK_IMPULSE
    }
  };
}

function pushMatchHitEvent(match, hitEvent) {
  if (!Array.isArray(match.hitEvents)) {
    match.hitEvents = [];
  }
  match.hitEvents.push(hitEvent);
  if (match.hitEvents.length > MATCH_HIT_EVENT_HISTORY_LIMIT) {
    match.hitEvents.splice(0, match.hitEvents.length - MATCH_HIT_EVENT_HISTORY_LIMIT);
  }
}

function areAllPlayersReady(room) {
  return room.players.length === MAX_PLAYERS_PER_ROOM
    && room.players.every((player) => player.ready === true);
}

function getStateForRoom(room) {
  if (room.match) return ROOM_STATES.IN_MATCH;
  if (room.players.length < MAX_PLAYERS_PER_ROOM) return ROOM_STATES.WAITING;
  if (areAllPlayersReady(room)) return ROOM_STATES.STARTING;
  return ROOM_STATES.READY_CHECK;
}

function setRoomState(room, nextState, reason = 'sync') {
  const previousState = room.state || ROOM_STATES.WAITING;
  room.state = nextState;
  if (previousState !== nextState) {
    console.log(`[room] state_change code=${room.code} from=${previousState} to=${nextState} reason=${reason}`);
  }
  return room.state;
}

function refreshRoomState(room, reason = 'sync') {
  return setRoomState(room, getStateForRoom(room), reason);
}

function createMatchForRoom(room) {
  const startedAt = Date.now();

  room.players.forEach((player) => {
    player.matchPlayerNumber = player.slot;
    console.log(`[match] player_assignment code=${room.code} socket=${player.socketId} slot=${player.slot} matchPlayerNumber=${player.matchPlayerNumber}`);
  });

  const matchId = createMatchId(room.code);
  const spawnPositions = buildSpawnPositions();

  const matchPlayers = room.players.map((player) => ({
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
    eliminated: false,
    lastUpdated: startedAt,
    nextFireblastAt: 0
  }));

  room.match = {
    matchId,
    roomCode: room.code,
    startedAt,
    phase: MATCH_PHASE_COMBAT,
    players: matchPlayers,
    spawnPositions,
    projectiles: [],
    nextProjectileSequence: 0,
    nextHitSequence: 0,
    hitEvents: [],
    eliminatedPlayerNumber: null,
    winnerPlayerNumber: null,
    endedAt: null,
    lastTickAt: startedAt,
    lastBroadcastAt: 0,
    lastMoveLogAt: 0
  };

  console.log(`[match] created code=${room.code} matchId=${matchId} startedAt=${room.match.startedAt}`);
  setRoomState(room, ROOM_STATES.IN_MATCH, 'match_created');
  return room.match;
}

function serializeMatch(match) {
  if (!match) return null;
  return {
    matchId: match.matchId,
    roomCode: match.roomCode,
    startedAt: match.startedAt,
    phase: match.phase,
    players: match.players.map((player) => ({
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
      eliminated: Boolean(player.eliminated),
      lastUpdated: player.lastUpdated
    })),
    spawnPositions: {
      player1: clonePosition(match.spawnPositions?.player1),
      player2: clonePosition(match.spawnPositions?.player2)
    },
    projectiles: (Array.isArray(match.projectiles) ? match.projectiles : []).map((projectile) => ({
      projectileId: projectile.projectileId,
      ownerPlayerNumber: projectile.ownerPlayerNumber,
      position: clonePosition(projectile.position),
      direction: { ...normalizeInputVector(projectile.direction) },
      speed: Number(projectile.speed) || FIREBLAST_SPEED,
      spawnedAt: projectile.spawnedAt,
      expiresAt: projectile.expiresAt
    })),
    hitEvents: (Array.isArray(match.hitEvents) ? match.hitEvents : []).map((hitEvent) => ({
      hitId: String(hitEvent.hitId || ''),
      timestamp: Number(hitEvent.timestamp) || 0,
      projectileId: String(hitEvent.projectileId || ''),
      sourcePlayerNumber: Number(hitEvent.sourcePlayerNumber) || 0,
      targetPlayerNumber: Number(hitEvent.targetPlayerNumber) || 0,
      knockback: { ...sanitizeVector(hitEvent.knockback) }
    })),
    eliminatedPlayerNumber: Number(match.eliminatedPlayerNumber) || null,
    winnerPlayerNumber: Number(match.winnerPlayerNumber) || null,
    endedAt: Number(match.endedAt) || null,
    arenaBoundary: {
      type: 'circle',
      center: clonePosition(ARENA_BOUNDARY_CENTER),
      radius: ARENA_BOUNDARY_RADIUS
    }
  };
}

function serializeRoom(room) {
  refreshRoomState(room, 'serialize');
  return {
    code: room.code,
    createdAt: room.createdAt,
    playerCount: room.players.length,
    state: room.state,
    status: room.state,
    players: room.players.map((player) => ({
      socketId: player.socketId,
      slot: player.slot,
      ready: Boolean(player.ready),
      matchPlayerNumber: player.matchPlayerNumber
    })),
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
      spawnPositions: serializedMatch.spawnPositions,
      mySpawnPosition,
      opponentSpawnPosition
    });
  });
}

function emitMatchState(room, timestamp = Date.now()) {
  if (!room.match) return;
  const serializedMatch = serializeMatch(room.match);
  io.to(room.code).emit('match_state', {
    roomCode: room.code,
    matchId: serializedMatch.matchId,
    startedAt: serializedMatch.startedAt,
    phase: serializedMatch.phase,
    players: serializedMatch.players,
    projectiles: serializedMatch.projectiles,
    hitEvents: serializedMatch.hitEvents,
    eliminatedPlayerNumber: serializedMatch.eliminatedPlayerNumber,
    winnerPlayerNumber: serializedMatch.winnerPlayerNumber,
    endedAt: serializedMatch.endedAt,
    timestamp
  });
}

function processMatchTickForRoom(room, tickTimestamp) {
  if (!room.match || room.state !== ROOM_STATES.IN_MATCH) return;

  const match = room.match;
  const previousTickAt = Number(match.lastTickAt) || tickTimestamp;
  const deltaMs = clamp(tickTimestamp - previousTickAt, 0, MATCH_MAX_DELTA_MS);
  const deltaSeconds = deltaMs / 1000;
  match.lastTickAt = tickTimestamp;
  let movedPlayers = 0;
  let eliminatedThisTick = false;

  if (match.phase !== MATCH_PHASE_COMBAT) {
    match.lastBroadcastAt = tickTimestamp;
    emitMatchState(room, tickTimestamp);
    return;
  }

  if (deltaSeconds > 0) {
    match.players.forEach((player) => {
      const input = normalizeInputVector(player.input);
      player.input = input;

      const velocity = sanitizeVector(player.velocity);
      player.velocity = velocity;

      if (input.x !== 0 || input.y !== 0) {
        player.position.x += input.x * PLAYER_MOVE_SPEED * deltaSeconds;
        player.position.y += input.y * PLAYER_MOVE_SPEED * deltaSeconds;
      }

      if (velocity.x !== 0 || velocity.y !== 0) {
        player.position.x += velocity.x * deltaSeconds;
        player.position.y += velocity.y * deltaSeconds;

        const damping = Math.exp(-PLAYER_KNOCKBACK_DAMPING_PER_SECOND * deltaSeconds);
        player.velocity.x *= damping;
        player.velocity.y *= damping;

        if (Math.abs(player.velocity.x) < 0.01) player.velocity.x = 0;
        if (Math.abs(player.velocity.y) < 0.01) player.velocity.y = 0;
      }

      if (input.x !== 0 || input.y !== 0 || velocity.x !== 0 || velocity.y !== 0) {
        player.lastUpdated = tickTimestamp;
        movedPlayers += 1;
      }
    });

    const eliminatedPlayer = (Array.isArray(match.players) ? match.players : []).find((player) =>
      isOutsideArenaBoundary(player.position)
    );
    if (eliminatedPlayer) {
      const winnerPlayer = getOpponentPlayer(match, eliminatedPlayer.matchPlayerNumber);
      console.log(`[match] player_eliminated_out_of_bounds code=${room.code} player=${eliminatedPlayer.matchPlayerNumber} x=${eliminatedPlayer.position.x.toFixed(2)} y=${eliminatedPlayer.position.y.toFixed(2)} radius=${ARENA_BOUNDARY_RADIUS}`);
      eliminatedThisTick = transitionMatchToEnd(room, eliminatedPlayer, winnerPlayer, 'out_of_bounds', tickTimestamp);
    }

    if (!eliminatedThisTick && match.phase === MATCH_PHASE_COMBAT) {
      const activeProjectiles = [];
      (Array.isArray(match.projectiles) ? match.projectiles : []).forEach((projectile) => {
        projectile.position.x += projectile.direction.x * projectile.speed * deltaSeconds;
        projectile.position.y += projectile.direction.y * projectile.speed * deltaSeconds;

        if (tickTimestamp >= projectile.expiresAt) {
          console.log(`[match] projectile_expired code=${room.code} projectileId=${projectile.projectileId}`);
          return;
        }

        const targetPlayer = getOpponentPlayer(match, projectile.ownerPlayerNumber);
        if (targetPlayer) {
          const targetInvulnerableUntil = Number(targetPlayer.hitInvulnerableUntil) || 0;
          if (tickTimestamp >= targetInvulnerableUntil) {
            const dx = targetPlayer.position.x - projectile.position.x;
            const dy = targetPlayer.position.y - projectile.position.y;
            const collisionRadius = PLAYER_RADIUS + FIREBLAST_HIT_RADIUS;
            if ((dx * dx + dy * dy) <= (collisionRadius * collisionRadius)) {
              targetPlayer.velocity = sanitizeVector(targetPlayer.velocity);
              targetPlayer.velocity.x += projectile.direction.x * FIREBLAST_KNOCKBACK_IMPULSE;
              targetPlayer.velocity.y += projectile.direction.y * FIREBLAST_KNOCKBACK_IMPULSE;
              targetPlayer.lastHitAt = tickTimestamp;
              targetPlayer.hitInvulnerableUntil = tickTimestamp + FIREBLAST_HIT_INVULN_MS;

              const hitEvent = createFireblastHitEvent(match, projectile, targetPlayer, tickTimestamp);
              pushMatchHitEvent(match, hitEvent);

              console.log(`[match] projectile_hit code=${room.code} projectileId=${projectile.projectileId} source=${projectile.ownerPlayerNumber} target=${targetPlayer.matchPlayerNumber}`);
              console.log(`[match] projectile_removed_on_hit code=${room.code} projectileId=${projectile.projectileId}`);
              console.log(`[match] knockback_applied code=${room.code} target=${targetPlayer.matchPlayerNumber} vx=${targetPlayer.velocity.x.toFixed(2)} vy=${targetPlayer.velocity.y.toFixed(2)}`);
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
    console.log(`[match] tick code=${room.code} ${compactPlayers} projectiles=${match.projectiles.length}`);
    match.lastMoveLogAt = tickTimestamp;
  }

  match.lastBroadcastAt = tickTimestamp;
  emitMatchState(room, tickTimestamp);
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

function resetRoomAfterMatch(room, requestedBySocketId, reason = 'return_to_room') {
  if (!room || !room.match) return false;
  if (room.match.phase !== MATCH_PHASE_MATCH_END) return false;

  console.log(`[room] player_returned_to_room code=${room.code} socket=${requestedBySocketId} reason=${reason}`);

  room.match = null;
  console.log(`[room] reset_after_match code=${room.code} reason=${reason}`);

  resetReadyAndMatchRole(room);
  refreshRoomState(room, 'rematch_reset');
  console.log(`[room] rematch_ready code=${room.code} state=${room.state} players=${room.players.length}`);
  return true;
}

function leaveRoomForSocket(socket, reason = 'leave_room', notifySelf = true) {
  const roomCode = playerRoomBySocketId.get(socket.id);
  if (!roomCode) return null;

  const room = rooms.get(roomCode);
  playerRoomBySocketId.delete(socket.id);
  socket.leave(roomCode);

  if (!room) {
    if (notifySelf) {
      socket.emit('room_left', { roomCode, reason });
    }
    return { roomCode, room: null };
  }

  room.players = room.players.filter((player) => player.socketId !== socket.id);
  console.log(`[room] leave code=${roomCode} socket=${socket.id} reason=${reason}`);

  if (room.players.length <= 0) {
    rooms.delete(roomCode);
    console.log(`[room] deleted code=${roomCode}`);
  } else {
    if (room.match) {
      if (reason === 'disconnect') {
        console.log(`[match] player_disconnect code=${roomCode} socket=${socket.id}`);
      }
      room.match = null;
      console.log(`[match] cleared code=${roomCode} reason=player_left`);
    }
    normalizePlayerSlots(room);
    resetReadyAndMatchRole(room);
    console.log(`[room] ready_reset code=${roomCode} reason=player_left`);
    refreshRoomState(room, 'player_left');
    emitRoomUpdate(room);
  }

  if (notifySelf) {
    socket.emit('room_left', { roomCode, reason });
  }

  return { roomCode, room };
}

app.get('/', (_req, res) => {
  res.type('text/plain').send('Outra multiplayer server is running.');
});

io.on('connection', (socket) => {
  const remoteAddress = socket.handshake.address || 'unknown';
  console.log(`[socket] connected id=${socket.id} ip=${remoteAddress}`);

  socket.on('create_room', () => {
    leaveRoomForSocket(socket, 'switch_to_create', false);

    const roomCode = createUniqueRoomCode();
    const room = {
      code: roomCode,
      players: [createRoomPlayer(socket.id, 1)],
      match: null,
      state: ROOM_STATES.WAITING,
      createdAt: Date.now()
    };

    rooms.set(roomCode, room);
    playerRoomBySocketId.set(socket.id, roomCode);
    socket.join(roomCode);

    console.log(`[room] created code=${roomCode} by=${socket.id}`);
    socket.emit('room_created', {
      roomCode,
      playerSlot: 1,
      room: serializeRoom(room)
    });
    emitRoomUpdate(room);
  });

  socket.on('join_room', (payload) => {
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

    const existingRoomCode = playerRoomBySocketId.get(socket.id);
    if (existingRoomCode === requestedCode) {
      const existingPlayer = getPlayerBySocketId(room, socket.id);
      socket.emit('room_joined', {
        roomCode: requestedCode,
        playerSlot: existingPlayer?.slot || 1,
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

    room.players.push(createRoomPlayer(socket.id, room.players.length + 1));
    normalizePlayerSlots(room);
    refreshRoomState(room, 'player_joined');
    playerRoomBySocketId.set(socket.id, requestedCode);
    socket.join(requestedCode);

    const playerSlot = getPlayerBySocketId(room, socket.id)?.slot || room.players.length;
    console.log(`[room] joined code=${requestedCode} socket=${socket.id} slot=${playerSlot}`);
    socket.emit('room_joined', {
      roomCode: requestedCode,
      playerSlot,
      room: serializeRoom(room)
    });
    emitRoomUpdate(room);
  });

  socket.on('leave_room', () => {
    leaveRoomForSocket(socket, 'leave_room', true);
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
      respond({ ok: true, roomCode: room.code, room: serializeRoom(room), reset: false });
      return;
    }

    if (room.match.phase !== MATCH_PHASE_MATCH_END) {
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
    respond({ ok: true, roomCode: room.code, room: serializedRoom, reset: true });
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
      respond({ ok: true, roomCode: room.code, room: serializedRoom, reset: false });
      return;
    }

    if (room.match.phase !== MATCH_PHASE_MATCH_END) {
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
    respond({ ok: true, roomCode: room.code, room: serializedRoom, reset: true });
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

    if (room.match || room.state === ROOM_STATES.IN_MATCH) {
      fail('Match already started.', 'MATCH_ALREADY_STARTED');
      return;
    }

    if (room.players.length < MAX_PLAYERS_PER_ROOM) {
      player.ready = false;
      player.matchPlayerNumber = null;
      refreshRoomState(room, 'waiting_for_opponent');
      fail('Waiting for opponent before ready check.', 'WAITING_FOR_OPPONENT');
      emitRoomUpdate(room);
      return;
    }

    player.ready = !Boolean(player.ready);
    console.log(`[room] ready_toggle code=${roomCode} socket=${socket.id} ready=${player.ready}`);

    if (areAllPlayersReady(room)) {
      console.log(`[room] both_ready code=${roomCode}`);
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
        matchPlayerNumber: player.matchPlayerNumber
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
      matchPlayerNumber: player.matchPlayerNumber
    });
  });

  socket.on('player_input', (payload) => {
    const roomCode = playerRoomBySocketId.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room || !room.match || room.state !== ROOM_STATES.IN_MATCH || room.match.phase !== MATCH_PHASE_COMBAT) return;

    const matchPlayer = getMatchPlayerBySocketId(room.match, socket.id);
    if (!matchPlayer) return;

    const nextInput = normalizeInputVector(payload);
    const previousInput = normalizeInputVector(matchPlayer.input);
    matchPlayer.input = nextInput;
    matchPlayer.lastUpdated = Date.now();

    if (!inputsEqual(previousInput, nextInput)) {
      console.log(`[match] player_input code=${roomCode} socket=${socket.id} x=${nextInput.x.toFixed(2)} y=${nextInput.y.toFixed(2)}`);
    }
  });

  socket.on('player_aim', (payload) => {
    const roomCode = playerRoomBySocketId.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room || !room.match || room.state !== ROOM_STATES.IN_MATCH || room.match.phase !== MATCH_PHASE_COMBAT) return;

    const matchPlayer = getMatchPlayerBySocketId(room.match, socket.id);
    if (!matchPlayer) return;

    const nextAim = normalizeInputVector(payload);
    if (nextAim.x === 0 && nextAim.y === 0) return;

    const previousAim = normalizeInputVector(matchPlayer.aim);
    if (inputsEqual(previousAim, nextAim)) return;

    matchPlayer.aim = nextAim;
    matchPlayer.lastAimUpdated = Date.now();
    console.log(`[match] player_aim code=${roomCode} socket=${socket.id} x=${nextAim.x.toFixed(2)} y=${nextAim.y.toFixed(2)}`);
  });

  socket.on('cast_fireblast', (payloadOrAck, maybeAck) => {
    const payload = typeof payloadOrAck === 'function' ? undefined : payloadOrAck;
    const ack = typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck;
    const respond = typeof ack === 'function'
      ? (responsePayload) => ack(responsePayload)
      : () => {};

    function fail(message, code, extra = {}) {
      emitRoomError(socket, message, code);
      respond({ ok: false, code, message, ...extra });
    }

    const roomCode = playerRoomBySocketId.get(socket.id);
    if (!roomCode) {
      fail('Join a room before casting fireblast.', 'NOT_IN_ROOM');
      return;
    }

    const room = rooms.get(roomCode);
    if (!room || !room.match || room.state !== ROOM_STATES.IN_MATCH) {
      fail('You can cast only during an active match.', 'MATCH_NOT_ACTIVE');
      return;
    }
    if (room.match.phase !== MATCH_PHASE_COMBAT) {
      fail('Match already ended.', 'MATCH_ALREADY_ENDED');
      return;
    }

    const matchPlayer = getMatchPlayerBySocketId(room.match, socket.id);
    if (!matchPlayer) {
      fail('Match player not found.', 'MATCH_PLAYER_NOT_FOUND');
      return;
    }

    const now = Date.now();
    console.log(`[match] cast_fireblast_request code=${roomCode} socket=${socket.id}`);

    if (now < Number(matchPlayer.nextFireblastAt || 0)) {
      const remainingMs = Math.max(0, Math.ceil(matchPlayer.nextFireblastAt - now));
      console.log(`[match] cast_rejected_cooldown code=${roomCode} socket=${socket.id} remainingMs=${remainingMs}`);
      fail('Fireblast is on cooldown.', 'FIREBLAST_COOLDOWN', { remainingMs });
      return;
    }

    const castDirection = normalizeInputVector(matchPlayer.aim);
    if (castDirection.x === 0 && castDirection.y === 0) {
      fail('Aim before casting fireblast.', 'INVALID_AIM');
      return;
    }

    const projectile = createFireblastProjectile(room.match, matchPlayer, castDirection, now);
    room.match.projectiles.push(projectile);
    matchPlayer.nextFireblastAt = now + FIREBLAST_COOLDOWN_MS;
    console.log(`[match] projectile_spawned code=${roomCode} projectileId=${projectile.projectileId} owner=${projectile.ownerPlayerNumber}`);

    emitMatchState(room, now);
    respond({
      ok: true,
      projectileId: projectile.projectileId,
      cooldownMs: FIREBLAST_COOLDOWN_MS
    });
  });

  socket.on('disconnect', (reason) => {
    leaveRoomForSocket(socket, 'disconnect', false);
    console.log(`[socket] disconnected id=${socket.id} reason=${reason}`);
  });
});

setInterval(runMatchSimulationTick, MATCH_TICK_MS);

server.listen(PORT, HOST, () => {
  console.log(`Outra multiplayer server listening on http://${HOST}:${PORT}`);
});
