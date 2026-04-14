// Minimal reusable multiplayer socket connector.
(function () {
  const LOG_PREFIX = '[multiplayer]';
  const LOCAL_SERVER_URL = 'http://localhost:3001';
  const ROOM_STATE_IDLE = 'idle';
  const ROOM_STATE_OFFLINE = 'offline';
  const ROOM_STATE_WAITING = 'waiting';
  const ROOM_STATE_READY_CHECK = 'ready_check';
  const ROOM_STATE_STARTING = 'starting';
  const ROOM_STATE_IN_MATCH = 'in_match';
  const DEFAULT_MATCH_PHASE = 'combat';
  const MATCH_PHASE_END = 'match_end';
  const READY_TOGGLE_ACK_TIMEOUT_MS = 2200;
  const INPUT_SEND_INTERVAL_MS = 50;
  const KNOWN_ROOM_STATES = new Set([
    ROOM_STATE_IDLE,
    ROOM_STATE_OFFLINE,
    ROOM_STATE_WAITING,
    ROOM_STATE_READY_CHECK,
    ROOM_STATE_STARTING,
    ROOM_STATE_IN_MATCH
  ]);
  const MOVEMENT_KEY_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
  const AIM_KEY_CODES = new Set(['KeyI', 'KeyJ', 'KeyK', 'KeyL']);
  const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

  let socket = null;
  let roomHandlersBound = false;
  let panel = null;
  let panelFields = null;
  let panelInput = null;
  let readyToggleAckTimer = null;
  let movementInputTimer = null;
  let keyboardHandlersBound = false;
  const pressedMovementKeys = new Set();
  const pressedAimKeys = new Set();
  let lastSentInput = { x: 0, y: 0 };
  let lastSentAim = { x: 0, y: 0 };
  let roomSnapshot = createInitialRoomSnapshot();

  function createInitialRoomSnapshot(state = ROOM_STATE_IDLE) {
    return {
      code: '',
      playerCount: 0,
      state,
      slot: null,
      selfReady: false,
      players: [],
      matchId: '',
      matchPhase: '',
      matchStartedAt: null,
      matchEndedAt: null,
      eliminatedPlayerNumber: null,
      winnerPlayerNumber: null,
      myMatchPlayerNumber: null,
      mySpawnPosition: null,
      opponentSpawnPosition: null,
      myPosition: null,
      opponentPosition: null,
      myVelocity: null,
      opponentVelocity: null,
      myAimDirection: null,
      opponentAimDirection: null,
      matchStateTimestamp: null,
      projectiles: [],
      projectileCount: 0,
      hitEvents: [],
      lastHitEvent: null,
      matchResult: '',
      spawnPositions: {
        player1: null,
        player2: null
      }
    };
  }

  function trimString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function parseNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeMovementInput(input) {
    const xValue = parseNumber(input?.x);
    const yValue = parseNumber(input?.y);
    const x = xValue === null ? 0 : clamp(xValue, -1, 1);
    const y = yValue === null ? 0 : clamp(yValue, -1, 1);
    const magnitude = Math.hypot(x, y);
    if (magnitude <= 0) return { x: 0, y: 0 };
    if (magnitude <= 1) return { x, y };
    return {
      x: x / magnitude,
      y: y / magnitude
    };
  }

  function movementInputEquals(inputA, inputB) {
    if (!inputA || !inputB) return false;
    return inputA.x === inputB.x && inputA.y === inputB.y;
  }

  function compactSocketId(value) {
    const text = trimString(value);
    if (!text) return 'unknown';
    if (text.length <= 10) return text;
    return `${text.slice(0, 4)}...${text.slice(-4)}`;
  }

  function normalizeRoomCode(value) {
    return trimString(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function normalizeRoomState(value, fallback = ROOM_STATE_IDLE) {
    const normalized = trimString(value).toLowerCase();
    if (!normalized) return fallback;
    if (KNOWN_ROOM_STATES.has(normalized)) return normalized;
    return normalized;
  }

  function normalizePosition(value) {
    if (!value || typeof value !== 'object') return null;
    const x = parseNumber(value.x);
    const y = parseNumber(value.y);
    if (x === null || y === null) return null;
    return { x, y };
  }

  function resolveSpawnPositions(match, payloadSpawnPositions) {
    const fromPayload = payloadSpawnPositions && typeof payloadSpawnPositions === 'object'
      ? payloadSpawnPositions
      : null;
    const fromMatch = match && typeof match === 'object' ? match.spawnPositions : null;
    const fromMatchPlayers = Array.isArray(match?.players) ? match.players : [];
    const fromMatchPlayerOne = fromMatchPlayers.find((entry) => Number(entry?.matchPlayerNumber) === 1)?.spawn;
    const fromMatchPlayerTwo = fromMatchPlayers.find((entry) => Number(entry?.matchPlayerNumber) === 2)?.spawn;

    return {
      player1: normalizePosition(fromPayload?.player1) || normalizePosition(fromMatch?.player1) || normalizePosition(fromMatchPlayerOne),
      player2: normalizePosition(fromPayload?.player2) || normalizePosition(fromMatch?.player2) || normalizePosition(fromMatchPlayerTwo)
    };
  }

  function formatPosition(position) {
    if (!position) return '-';
    return `(${position.x.toFixed(2)}, ${position.y.toFixed(2)})`;
  }

  function formatStartedAt(timestamp) {
    if (!Number.isFinite(timestamp)) return '-';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  }

  function formatSpawnPositions(spawnPositions) {
    return `P1 ${formatPosition(spawnPositions?.player1)} | P2 ${formatPosition(spawnPositions?.player2)}`;
  }

  function formatHitEvent(hitEvent) {
    if (!hitEvent) return 'none';
    const source = Number.isFinite(hitEvent.sourcePlayerNumber) ? hitEvent.sourcePlayerNumber : '?';
    const target = Number.isFinite(hitEvent.targetPlayerNumber) ? hitEvent.targetPlayerNumber : '?';
    const time = Number.isFinite(hitEvent.timestamp)
      ? new Date(hitEvent.timestamp).toLocaleTimeString()
      : '--:--:--';
    return `P${source} -> P${target} @ ${time}`;
  }

  function getMatchResultText() {
    if (roomSnapshot.matchPhase !== MATCH_PHASE_END) return '';
    const winner = Number(roomSnapshot.winnerPlayerNumber);
    const eliminated = Number(roomSnapshot.eliminatedPlayerNumber);
    const mine = Number(roomSnapshot.myMatchPlayerNumber);

    if (Number.isFinite(winner) && Number.isFinite(mine) && winner === mine) return 'You win';
    if (Number.isFinite(eliminated) && Number.isFinite(mine) && eliminated === mine) return 'You lose';
    if (Number.isFinite(winner)) return `Player ${winner} wins`;
    return 'Match ended';
  }

  function getStateMessage() {
    if (!roomSnapshot.code) return 'Create or join a room.';
    if (roomSnapshot.state === ROOM_STATE_IN_MATCH) {
      if (roomSnapshot.matchPhase === MATCH_PHASE_END) {
        return `${getMatchResultText()}.`;
      }
      const numberPart = Number.isFinite(roomSnapshot.myMatchPlayerNumber) ? ` You are player ${roomSnapshot.myMatchPlayerNumber}.` : '';
      const phase = trimString(roomSnapshot.matchPhase) || DEFAULT_MATCH_PHASE;
      return `Match started.${numberPart} Phase: ${phase}.`;
    }
    if (roomSnapshot.state === ROOM_STATE_STARTING) return 'Both players ready. Match is starting...';
    if (roomSnapshot.playerCount < 2) return 'Waiting for opponent...';
    if (roomSnapshot.state === ROOM_STATE_READY_CHECK) {
      return roomSnapshot.selfReady ? 'You are ready. Waiting for opponent readiness.' : 'Opponent found. Toggle ready when prepared.';
    }
    return `Room state: ${roomSnapshot.state}`;
  }

  function isLikelyTemplateValue(value) {
    return value.includes('{$') || value.includes('${') || value.includes('<%') || value.includes('{{');
  }

  function sanitizeConfiguredServerUrl(value) {
    const text = trimString(value);
    if (!text) return '';
    if (isLikelyTemplateValue(text)) return '';

    try {
      const parsed = new URL(text, window.location.origin);
      if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) return '';
      if (!trimString(parsed.host)) return '';
      return parsed.toString().replace(/\/$/, '');
    } catch (_error) {
      return '';
    }
  }

  function isLocalBrowserHost() {
    const host = trimString(window.location.hostname).toLowerCase();
    return LOCAL_HOSTNAMES.has(host);
  }

  function resolveServerUrl() {
    const runtimeUrl = sanitizeConfiguredServerUrl(window.__OUTRA_MULTIPLAYER_URL__);
    if (runtimeUrl) return runtimeUrl;

    const metaTag = document.querySelector('meta[name="outra-multiplayer-url"]');
    const metaUrl = sanitizeConfiguredServerUrl(metaTag?.content);
    if (metaUrl) return metaUrl;

    if (isLocalBrowserHost()) return LOCAL_SERVER_URL;
    return '';
  }

  function ensureDebugPanelStyles() {
    if (document.getElementById('outraMultiplayerDebugStyles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'outraMultiplayerDebugStyles';
    styleEl.textContent = `
      .mpDebugPanel {
        position: fixed;
        left: 12px;
        bottom: 12px;
        width: 320px;
        z-index: 55;
        padding: 10px;
        border-radius: 12px;
        border: 1px solid rgba(117, 151, 255, 0.35);
        background: rgba(7, 11, 20, 0.84);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
        backdrop-filter: blur(8px);
        color: #e8eeff;
        font: 12px/1.35 'Segoe UI', Tahoma, sans-serif;
      }

      .mpDebugTitle {
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #b7cbff;
      }

      .mpDebugRow {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }

      .mpDebugInput,
      .mpDebugBtn {
        border-radius: 8px;
        border: 1px solid rgba(149, 174, 255, 0.35);
        background: rgba(13, 18, 34, 0.9);
        color: #eef2ff;
        font-size: 12px;
      }

      .mpDebugInput {
        flex: 1;
        min-width: 0;
        padding: 7px 8px;
      }

      .mpDebugBtn {
        padding: 7px 9px;
        cursor: pointer;
      }

      .mpDebugBtn:hover:not([disabled]) {
        border-color: rgba(189, 209, 255, 0.55);
        background: rgba(19, 27, 52, 0.95);
      }

      .mpDebugBtn[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .mpDebugBtnLeave,
      .mpDebugBtnReady,
      .mpDebugBtnReturn {
        width: 100%;
        margin-top: 6px;
      }

      .mpDebugMeta {
        margin-bottom: 3px;
        color: #c6d5ff;
      }

      .mpDebugMeta strong {
        color: #ffffff;
        font-weight: 700;
      }

      .mpDebugStateWaiting {
        color: #9ac7ff !important;
      }

      .mpDebugStateReadyCheck {
        color: #ffd888 !important;
      }

      .mpDebugStateStarting {
        color: #81ffbb !important;
      }

      .mpDebugStateInMatch {
        color: #ffb4a1 !important;
      }

      .mpDebugSlots,
      .mpDebugMatchBox {
        margin-top: 8px;
        border-radius: 7px;
        padding: 6px 8px;
        border: 1px solid rgba(146, 176, 255, 0.25);
        background: rgba(15, 21, 41, 0.78);
      }

      .mpDebugSlot {
        color: #d8e3ff;
        margin-bottom: 4px;
      }

      .mpDebugSlot:last-child {
        margin-bottom: 0;
      }

      .mpDebugStatus {
        margin-top: 8px;
        border-radius: 7px;
        padding: 6px 8px;
        border: 1px solid rgba(146, 176, 255, 0.25);
        background: rgba(15, 21, 41, 0.78);
        color: #d8e3ff;
      }
    `;

    document.head.appendChild(styleEl);
  }

  function ensureDebugPanel() {
    if (panel && document.body.contains(panel)) return panel;
    if (!document.body) return null;

    ensureDebugPanelStyles();

    panel = document.createElement('section');
    panel.className = 'mpDebugPanel';
    panel.innerHTML = `
      <div class="mpDebugTitle">Multiplayer Debug</div>
      <div class="mpDebugRow">
        <button class="mpDebugBtn" type="button" data-mp-action="create">Create Room</button>
      </div>
      <div class="mpDebugRow">
        <input class="mpDebugInput" type="text" maxlength="8" placeholder="Room code" data-mp-input="code" />
        <button class="mpDebugBtn" type="button" data-mp-action="join">Join</button>
      </div>
      <div class="mpDebugMeta">Room: <strong data-mp-field="roomCode">-</strong></div>
      <div class="mpDebugMeta">Players: <strong data-mp-field="playerCount">0/2</strong></div>
      <div class="mpDebugMeta">State: <strong data-mp-field="state">${ROOM_STATE_IDLE}</strong></div>
      <div class="mpDebugMeta">Slot: <strong data-mp-field="slot">-</strong></div>
      <div class="mpDebugMeta">Socket: <strong data-mp-field="socket">offline</strong></div>
      <div class="mpDebugSlots">
        <div class="mpDebugSlot" data-mp-field="slot1">P1: empty</div>
        <div class="mpDebugSlot" data-mp-field="slot2">P2: empty</div>
      </div>
      <div class="mpDebugMatchBox">
        <div class="mpDebugMeta">Match Started: <strong data-mp-field="matchStarted">no</strong></div>
        <div class="mpDebugMeta">Match ID: <strong data-mp-field="matchId">-</strong></div>
        <div class="mpDebugMeta">Started At: <strong data-mp-field="matchStartedAt">-</strong></div>
        <div class="mpDebugMeta">My Player #: <strong data-mp-field="matchPlayerNumber">-</strong></div>
        <div class="mpDebugMeta">My Spawn: <strong data-mp-field="mySpawn">-</strong></div>
        <div class="mpDebugMeta">My Pos: <strong data-mp-field="myPos">-</strong></div>
        <div class="mpDebugMeta">My Vel: <strong data-mp-field="myVel">-</strong></div>
        <div class="mpDebugMeta">My Aim: <strong data-mp-field="myAim">-</strong></div>
        <div class="mpDebugMeta">Opponent Pos: <strong data-mp-field="oppPos">-</strong></div>
        <div class="mpDebugMeta">Opponent Vel: <strong data-mp-field="oppVel">-</strong></div>
        <div class="mpDebugMeta">Opponent Aim: <strong data-mp-field="oppAim">-</strong></div>
        <div class="mpDebugMeta">Phase: <strong data-mp-field="matchPhase">-</strong></div>
        <div class="mpDebugMeta">Eliminated: <strong data-mp-field="eliminatedPlayer">-</strong></div>
        <div class="mpDebugMeta">Winner: <strong data-mp-field="winnerPlayer">-</strong></div>
        <div class="mpDebugMeta">Result: <strong data-mp-field="matchResult">-</strong></div>
        <div class="mpDebugMeta">Ended At: <strong data-mp-field="matchEndedAt">-</strong></div>
        <div class="mpDebugMeta">State Tick: <strong data-mp-field="matchTickAt">-</strong></div>
        <div class="mpDebugMeta">Projectiles: <strong data-mp-field="projectileCount">0</strong></div>
        <div class="mpDebugMeta">Last Hit: <strong data-mp-field="lastHit">none</strong></div>
        <div class="mpDebugMeta">Spawns: <strong data-mp-field="spawns">P1 - | P2 -</strong></div>
      </div>
      <button class="mpDebugBtn mpDebugBtnReady" type="button" data-mp-action="ready" disabled>Toggle Ready</button>
      <button class="mpDebugBtn mpDebugBtnReturn" type="button" data-mp-action="return" style="display:none;">Return to Room</button>
      <button class="mpDebugBtn mpDebugBtnLeave" type="button" data-mp-action="leave">Leave Room</button>
      <div class="mpDebugStatus" data-mp-field="message">Ready.</div>
    `;

    panelFields = {
      roomCode: panel.querySelector('[data-mp-field="roomCode"]'),
      playerCount: panel.querySelector('[data-mp-field="playerCount"]'),
      state: panel.querySelector('[data-mp-field="state"]'),
      slot: panel.querySelector('[data-mp-field="slot"]'),
      socket: panel.querySelector('[data-mp-field="socket"]'),
      slot1: panel.querySelector('[data-mp-field="slot1"]'),
      slot2: panel.querySelector('[data-mp-field="slot2"]'),
      matchStarted: panel.querySelector('[data-mp-field="matchStarted"]'),
      matchId: panel.querySelector('[data-mp-field="matchId"]'),
      matchStartedAt: panel.querySelector('[data-mp-field="matchStartedAt"]'),
      matchPlayerNumber: panel.querySelector('[data-mp-field="matchPlayerNumber"]'),
      mySpawn: panel.querySelector('[data-mp-field="mySpawn"]'),
      myPos: panel.querySelector('[data-mp-field="myPos"]'),
      myVel: panel.querySelector('[data-mp-field="myVel"]'),
      myAim: panel.querySelector('[data-mp-field="myAim"]'),
      oppPos: panel.querySelector('[data-mp-field="oppPos"]'),
      oppVel: panel.querySelector('[data-mp-field="oppVel"]'),
      oppAim: panel.querySelector('[data-mp-field="oppAim"]'),
      matchPhase: panel.querySelector('[data-mp-field="matchPhase"]'),
      eliminatedPlayer: panel.querySelector('[data-mp-field="eliminatedPlayer"]'),
      winnerPlayer: panel.querySelector('[data-mp-field="winnerPlayer"]'),
      matchResult: panel.querySelector('[data-mp-field="matchResult"]'),
      matchEndedAt: panel.querySelector('[data-mp-field="matchEndedAt"]'),
      matchTickAt: panel.querySelector('[data-mp-field="matchTickAt"]'),
      projectileCount: panel.querySelector('[data-mp-field="projectileCount"]'),
      lastHit: panel.querySelector('[data-mp-field="lastHit"]'),
      spawns: panel.querySelector('[data-mp-field="spawns"]'),
      message: panel.querySelector('[data-mp-field="message"]'),
      readyButton: panel.querySelector('[data-mp-action="ready"]'),
      returnButton: panel.querySelector('[data-mp-action="return"]')
    };
    panelInput = panel.querySelector('[data-mp-input="code"]');

    panel.querySelector('[data-mp-action="create"]')?.addEventListener('click', () => {
      createRoom();
    });
    panel.querySelector('[data-mp-action="join"]')?.addEventListener('click', () => {
      joinRoom(panelInput?.value);
    });
    panel.querySelector('[data-mp-action="ready"]')?.addEventListener('click', () => {
      toggleReady();
    });
    panel.querySelector('[data-mp-action="return"]')?.addEventListener('click', () => {
      returnToRoom();
    });
    panel.querySelector('[data-mp-action="leave"]')?.addEventListener('click', () => {
      leaveRoom();
    });
    panelInput?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      joinRoom(panelInput?.value);
    });

    document.body.appendChild(panel);
    renderDebugPanel();
    return panel;
  }

  function setStatusMessage(message) {
    if (!panelFields?.message) return;
    panelFields.message.textContent = String(message || 'Ready.');
  }

  function clearReadyToggleAckTimer() {
    if (readyToggleAckTimer === null) return;
    window.clearTimeout(readyToggleAckTimer);
    readyToggleAckTimer = null;
  }

  function computeMovementInputFromKeyboard() {
    let x = 0;
    let y = 0;

    if (pressedMovementKeys.has('ArrowLeft') || pressedMovementKeys.has('KeyA')) x -= 1;
    if (pressedMovementKeys.has('ArrowRight') || pressedMovementKeys.has('KeyD')) x += 1;
    if (pressedMovementKeys.has('ArrowUp') || pressedMovementKeys.has('KeyW')) y -= 1;
    if (pressedMovementKeys.has('ArrowDown') || pressedMovementKeys.has('KeyS')) y += 1;

    return normalizeMovementInput({ x, y });
  }

  function computeAimInputFromKeyboard() {
    let x = 0;
    let y = 0;

    if (pressedAimKeys.has('KeyJ')) x -= 1;
    if (pressedAimKeys.has('KeyL')) x += 1;
    if (pressedAimKeys.has('KeyI')) y -= 1;
    if (pressedAimKeys.has('KeyK')) y += 1;

    if (x === 0 && y === 0) return null;
    return normalizeMovementInput({ x, y });
  }

  function shouldIgnoreKeyboardEvent(event) {
    const target = event?.target;
    if (!target || typeof target !== 'object') return false;
    if (target.isContentEditable) return true;
    const tagName = trimString(target.tagName).toUpperCase();
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  }

  function bindKeyboardHandlers() {
    if (keyboardHandlersBound) return;
    keyboardHandlersBound = true;

    window.addEventListener('keydown', (event) => {
      if (shouldIgnoreKeyboardEvent(event)) return;
      const code = trimString(event?.code);
      if (!code) return;

      if (MOVEMENT_KEY_CODES.has(code)) {
        pressedMovementKeys.add(code);
        if (code.startsWith('Arrow')) {
          event.preventDefault();
        }
      }

      if (AIM_KEY_CODES.has(code)) {
        pressedAimKeys.add(code);
      }

      if (code === 'Space') {
        event.preventDefault();
        if (!event.repeat) {
          castFireblast();
        }
      }
    });

    window.addEventListener('keyup', (event) => {
      if (shouldIgnoreKeyboardEvent(event)) return;
      const code = trimString(event?.code);
      if (!code) return;

      if (MOVEMENT_KEY_CODES.has(code)) {
        pressedMovementKeys.delete(code);
      }
      if (AIM_KEY_CODES.has(code)) {
        pressedAimKeys.delete(code);
      }
    });

    // Ensure keys do not remain stuck when the tab loses focus.
    window.addEventListener('blur', () => {
      pressedMovementKeys.clear();
      pressedAimKeys.clear();
      lastSentInput = { x: 0, y: 0 };
      lastSentAim = { x: 0, y: 0 };
    });
  }

  function stopMovementInputLoop() {
    if (movementInputTimer !== null) {
      window.clearInterval(movementInputTimer);
      movementInputTimer = null;
    }
    pressedMovementKeys.clear();
    pressedAimKeys.clear();
    lastSentInput = { x: 0, y: 0 };
    lastSentAim = { x: 0, y: 0 };
  }

  function startMovementInputLoop() {
    if (movementInputTimer !== null) return;

    movementInputTimer = window.setInterval(() => {
      if (!socket?.connected) return;
      if (roomSnapshot.state !== ROOM_STATE_IN_MATCH || !roomSnapshot.matchId) return;
      if (roomSnapshot.matchPhase !== DEFAULT_MATCH_PHASE) return;

      const nextInput = computeMovementInputFromKeyboard();
      if (!movementInputEquals(nextInput, lastSentInput)) {
        socket.emit('player_input', nextInput);
        lastSentInput = nextInput;
      }

      const nextAim = computeAimInputFromKeyboard();
      if (nextAim && !movementInputEquals(nextAim, lastSentAim)) {
        socket.emit('player_aim', nextAim);
        lastSentAim = nextAim;
      }
    }, INPUT_SEND_INTERVAL_MS);
  }

  function getPlayerAtSlot(slot) {
    return roomSnapshot.players.find((entry) => Number(entry?.slot) === slot) || null;
  }

  function getSlotText(slot) {
    const player = getPlayerAtSlot(slot);
    if (!player) return `P${slot}: empty`;

    const readyText = player.ready ? 'ready' : 'not ready';
    const youText = player.socketId && socket?.id === player.socketId ? ' (you)' : '';
    const matchNumberText = Number.isFinite(player.matchPlayerNumber) ? ` #${player.matchPlayerNumber}` : '';
    return `P${slot}: ${readyText}${matchNumberText}${youText} [${compactSocketId(player.socketId)}]`;
  }

  function updateStateStyles() {
    if (!panelFields?.state) return;
    panelFields.state.classList.remove('mpDebugStateWaiting', 'mpDebugStateReadyCheck', 'mpDebugStateStarting', 'mpDebugStateInMatch');
    if (roomSnapshot.state === ROOM_STATE_WAITING) {
      panelFields.state.classList.add('mpDebugStateWaiting');
    } else if (roomSnapshot.state === ROOM_STATE_READY_CHECK) {
      panelFields.state.classList.add('mpDebugStateReadyCheck');
    } else if (roomSnapshot.state === ROOM_STATE_STARTING) {
      panelFields.state.classList.add('mpDebugStateStarting');
    } else if (roomSnapshot.state === ROOM_STATE_IN_MATCH) {
      panelFields.state.classList.add('mpDebugStateInMatch');
    }
  }

  function renderDebugPanel() {
    ensureDebugPanel();
    if (!panelFields) return;

    panelFields.roomCode.textContent = roomSnapshot.code || '-';
    panelFields.playerCount.textContent = `${roomSnapshot.playerCount}/2`;
    panelFields.state.textContent = roomSnapshot.state || ROOM_STATE_IDLE;
    panelFields.slot.textContent = Number.isFinite(roomSnapshot.slot) ? String(roomSnapshot.slot) : '-';
    panelFields.socket.textContent = socket?.connected ? (socket.id || 'connected') : 'offline';
    panelFields.slot1.textContent = getSlotText(1);
    panelFields.slot2.textContent = getSlotText(2);
    panelFields.matchStarted.textContent = roomSnapshot.matchId ? 'yes' : 'no';
    panelFields.matchId.textContent = roomSnapshot.matchId || '-';
    panelFields.matchStartedAt.textContent = formatStartedAt(roomSnapshot.matchStartedAt);
    panelFields.matchPlayerNumber.textContent = Number.isFinite(roomSnapshot.myMatchPlayerNumber) ? String(roomSnapshot.myMatchPlayerNumber) : '-';
    panelFields.mySpawn.textContent = formatPosition(roomSnapshot.mySpawnPosition);
    panelFields.myPos.textContent = formatPosition(roomSnapshot.myPosition);
    panelFields.myVel.textContent = formatPosition(roomSnapshot.myVelocity);
    panelFields.myAim.textContent = formatPosition(roomSnapshot.myAimDirection);
    panelFields.oppPos.textContent = formatPosition(roomSnapshot.opponentPosition);
    panelFields.oppVel.textContent = formatPosition(roomSnapshot.opponentVelocity);
    panelFields.oppAim.textContent = formatPosition(roomSnapshot.opponentAimDirection);
    panelFields.matchPhase.textContent = roomSnapshot.matchPhase || '-';
    panelFields.eliminatedPlayer.textContent = Number.isFinite(Number(roomSnapshot.eliminatedPlayerNumber))
      ? `P${Number(roomSnapshot.eliminatedPlayerNumber)}`
      : '-';
    panelFields.winnerPlayer.textContent = Number.isFinite(Number(roomSnapshot.winnerPlayerNumber))
      ? `P${Number(roomSnapshot.winnerPlayerNumber)}`
      : '-';
    panelFields.matchResult.textContent = getMatchResultText() || '-';
    panelFields.matchEndedAt.textContent = formatStartedAt(roomSnapshot.matchEndedAt);
    panelFields.matchTickAt.textContent = formatStartedAt(roomSnapshot.matchStateTimestamp);
    panelFields.projectileCount.textContent = String(roomSnapshot.projectileCount || 0);
    panelFields.lastHit.textContent = formatHitEvent(roomSnapshot.lastHitEvent);
    panelFields.spawns.textContent = formatSpawnPositions(roomSnapshot.spawnPositions);
    updateStateStyles();

    if (panelFields.readyButton) {
      const canToggleReady = Boolean(roomSnapshot.code)
        && roomSnapshot.playerCount >= 2
        && Boolean(socket?.connected)
        && roomSnapshot.state !== ROOM_STATE_IN_MATCH
        && roomSnapshot.state !== ROOM_STATE_STARTING;
      panelFields.readyButton.disabled = !canToggleReady;
      if (roomSnapshot.state === ROOM_STATE_IN_MATCH) {
        panelFields.readyButton.textContent = 'Match Live';
      } else if (roomSnapshot.state === ROOM_STATE_STARTING) {
        panelFields.readyButton.textContent = 'Starting...';
      } else {
        panelFields.readyButton.textContent = roomSnapshot.selfReady ? 'Set Not Ready' : 'Set Ready';
      }
    }

    if (panelFields.returnButton) {
      const canReturnToRoom = Boolean(roomSnapshot.code)
        && Boolean(socket?.connected)
        && roomSnapshot.state === ROOM_STATE_IN_MATCH
        && roomSnapshot.matchPhase === MATCH_PHASE_END;
      panelFields.returnButton.style.display = canReturnToRoom ? 'block' : 'none';
      panelFields.returnButton.disabled = !canReturnToRoom;
    }
  }

  function clearRoomSnapshot(state = ROOM_STATE_IDLE) {
    roomSnapshot = createInitialRoomSnapshot(state);
  }

  function applyMatchPayload(payload, players) {
    const payloadObject = payload && typeof payload === 'object' ? payload : null;
    const payloadMatch = payloadObject?.match && typeof payloadObject.match === 'object'
      ? payloadObject.match
      : null;
    const topLevelMatchId = trimString(payloadObject?.matchId);
    const match = payloadMatch || (topLevelMatchId
      ? {
          matchId: topLevelMatchId,
          roomCode: trimString(payloadObject?.roomCode) || roomSnapshot.code,
          startedAt: parseNumber(payloadObject?.startedAt) || roomSnapshot.matchStartedAt,
          phase: trimString(payloadObject?.phase) || roomSnapshot.matchPhase || DEFAULT_MATCH_PHASE,
          players: Array.isArray(payloadObject?.players) ? payloadObject.players : [],
          spawnPositions: payloadObject?.spawnPositions || roomSnapshot.spawnPositions,
          projectiles: Array.isArray(payloadObject?.projectiles) ? payloadObject.projectiles : roomSnapshot.projectiles,
          hitEvents: Array.isArray(payloadObject?.hitEvents) ? payloadObject.hitEvents : roomSnapshot.hitEvents,
          eliminatedPlayerNumber: parseNumber(payloadObject?.eliminatedPlayerNumber) || roomSnapshot.eliminatedPlayerNumber,
          winnerPlayerNumber: parseNumber(payloadObject?.winnerPlayerNumber) || roomSnapshot.winnerPlayerNumber,
          endedAt: parseNumber(payloadObject?.endedAt) || roomSnapshot.matchEndedAt
        }
      : null);
    const matchId = trimString(match?.matchId);
    if (!matchId) {
      roomSnapshot.matchId = '';
      roomSnapshot.matchPhase = '';
      roomSnapshot.matchStartedAt = null;
      roomSnapshot.matchEndedAt = null;
      roomSnapshot.eliminatedPlayerNumber = null;
      roomSnapshot.winnerPlayerNumber = null;
      roomSnapshot.myMatchPlayerNumber = null;
      roomSnapshot.mySpawnPosition = null;
      roomSnapshot.opponentSpawnPosition = null;
      roomSnapshot.myPosition = null;
      roomSnapshot.opponentPosition = null;
      roomSnapshot.myVelocity = null;
      roomSnapshot.opponentVelocity = null;
      roomSnapshot.myAimDirection = null;
      roomSnapshot.opponentAimDirection = null;
      roomSnapshot.matchStateTimestamp = null;
      roomSnapshot.projectiles = [];
      roomSnapshot.projectileCount = 0;
      roomSnapshot.hitEvents = [];
      roomSnapshot.lastHitEvent = null;
      roomSnapshot.matchResult = '';
      roomSnapshot.spawnPositions = {
        player1: null,
        player2: null
      };
      return;
    }

    roomSnapshot.matchId = matchId;
    roomSnapshot.matchPhase = trimString(match?.phase) || DEFAULT_MATCH_PHASE;
    roomSnapshot.matchStartedAt = parseNumber(match?.startedAt) || roomSnapshot.matchStartedAt;
    roomSnapshot.matchEndedAt = parseNumber(match?.endedAt) || parseNumber(payload?.endedAt) || null;
    roomSnapshot.eliminatedPlayerNumber = parseNumber(match?.eliminatedPlayerNumber) || parseNumber(payload?.eliminatedPlayerNumber) || null;
    roomSnapshot.winnerPlayerNumber = parseNumber(match?.winnerPlayerNumber) || parseNumber(payload?.winnerPlayerNumber) || null;
    roomSnapshot.matchStateTimestamp = parseNumber(payload?.timestamp) || roomSnapshot.matchStateTimestamp;
    roomSnapshot.spawnPositions = resolveSpawnPositions(match, payload?.spawnPositions);

    const myNumberFromPayload = parseNumber(payload?.matchPlayerNumber);
    if (myNumberFromPayload !== null) {
      roomSnapshot.myMatchPlayerNumber = myNumberFromPayload;
    } else {
      const selfPlayer = players.find((entry) => entry?.socketId === socket?.id);
      const myNumberFromRoom = parseNumber(selfPlayer?.matchPlayerNumber);
      roomSnapshot.myMatchPlayerNumber = myNumberFromRoom;
    }

    const payloadMySpawn = normalizePosition(payload?.mySpawnPosition);
    const payloadOpponentSpawn = normalizePosition(payload?.opponentSpawnPosition);
    const myNumber = roomSnapshot.myMatchPlayerNumber;
    const mySpawnFromMap = myNumber === 1
      ? normalizePosition(roomSnapshot.spawnPositions.player1)
      : myNumber === 2
        ? normalizePosition(roomSnapshot.spawnPositions.player2)
        : null;
    const opponentSpawnFromMap = myNumber === 1
      ? normalizePosition(roomSnapshot.spawnPositions.player2)
      : myNumber === 2
        ? normalizePosition(roomSnapshot.spawnPositions.player1)
        : null;

    roomSnapshot.mySpawnPosition = payloadMySpawn || mySpawnFromMap;
    roomSnapshot.opponentSpawnPosition = payloadOpponentSpawn || opponentSpawnFromMap;

    const matchPlayers = Array.isArray(match?.players) ? match.players : [];
    const selfMatchPlayer = matchPlayers.find((entry) => trimString(entry?.socketId) === socket?.id);
    const player1MatchState = matchPlayers.find((entry) => Number(entry?.matchPlayerNumber) === 1) || null;
    const player2MatchState = matchPlayers.find((entry) => Number(entry?.matchPlayerNumber) === 2) || null;
    const selfPositionFromSocket = normalizePosition(selfMatchPlayer?.position);
    const selfPositionFromNumber = myNumber === 1
      ? normalizePosition(player1MatchState?.position)
      : myNumber === 2
        ? normalizePosition(player2MatchState?.position)
        : null;
    const opponentPositionFromNumber = myNumber === 1
      ? normalizePosition(player2MatchState?.position)
      : myNumber === 2
        ? normalizePosition(player1MatchState?.position)
        : null;
    const selfVelocityFromSocket = normalizePosition(selfMatchPlayer?.velocity);
    const selfVelocityFromNumber = myNumber === 1
      ? normalizePosition(player1MatchState?.velocity)
      : myNumber === 2
        ? normalizePosition(player2MatchState?.velocity)
        : null;
    const opponentVelocityFromNumber = myNumber === 1
      ? normalizePosition(player2MatchState?.velocity)
      : myNumber === 2
        ? normalizePosition(player1MatchState?.velocity)
        : null;
    const selfAimFromSocket = normalizePosition(selfMatchPlayer?.aim);
    const selfAimFromNumber = myNumber === 1
      ? normalizePosition(player1MatchState?.aim)
      : myNumber === 2
        ? normalizePosition(player2MatchState?.aim)
        : null;
    const opponentAimFromNumber = myNumber === 1
      ? normalizePosition(player2MatchState?.aim)
      : myNumber === 2
        ? normalizePosition(player1MatchState?.aim)
        : null;

    roomSnapshot.myPosition = selfPositionFromSocket || selfPositionFromNumber;
    roomSnapshot.opponentPosition = opponentPositionFromNumber;
    roomSnapshot.myVelocity = selfVelocityFromSocket || selfVelocityFromNumber;
    roomSnapshot.opponentVelocity = opponentVelocityFromNumber;
    roomSnapshot.myAimDirection = selfAimFromSocket || selfAimFromNumber;
    roomSnapshot.opponentAimDirection = opponentAimFromNumber;

    const matchProjectiles = Array.isArray(match?.projectiles) ? match.projectiles : [];
    roomSnapshot.projectiles = matchProjectiles.map((projectile) => ({
      projectileId: trimString(projectile?.projectileId),
      ownerPlayerNumber: parseNumber(projectile?.ownerPlayerNumber),
      position: normalizePosition(projectile?.position),
      direction: normalizePosition(projectile?.direction),
      speed: parseNumber(projectile?.speed),
      spawnedAt: parseNumber(projectile?.spawnedAt),
      expiresAt: parseNumber(projectile?.expiresAt)
    }));
    roomSnapshot.projectileCount = roomSnapshot.projectiles.length;

    const matchHitEvents = Array.isArray(match?.hitEvents) ? match.hitEvents : [];
    roomSnapshot.hitEvents = matchHitEvents.map((hitEvent) => ({
      hitId: trimString(hitEvent?.hitId),
      projectileId: trimString(hitEvent?.projectileId),
      sourcePlayerNumber: parseNumber(hitEvent?.sourcePlayerNumber),
      targetPlayerNumber: parseNumber(hitEvent?.targetPlayerNumber),
      timestamp: parseNumber(hitEvent?.timestamp),
      knockback: normalizePosition(hitEvent?.knockback)
    }));
    roomSnapshot.lastHitEvent = roomSnapshot.hitEvents.length
      ? roomSnapshot.hitEvents[roomSnapshot.hitEvents.length - 1]
      : null;
    roomSnapshot.matchResult = getMatchResultText();
  }

  function applyRoomPayload(payload, fallbackState = ROOM_STATE_IDLE) {
    const room = payload && typeof payload === 'object' ? payload.room : null;
    const code = normalizeRoomCode(payload?.roomCode || room?.code || '');

    const players = (Array.isArray(room?.players) ? room.players : [])
      .map((entry, index) => {
        const slotValue = Number(entry?.slot);
        return {
          slot: Number.isFinite(slotValue) && slotValue > 0 ? slotValue : index + 1,
          socketId: trimString(entry?.socketId),
          ready: Boolean(entry?.ready),
          matchPlayerNumber: parseNumber(entry?.matchPlayerNumber)
        };
      })
      .sort((a, b) => a.slot - b.slot);

    const playerCountValue = Number(room?.playerCount);
    const playerCount = Number.isFinite(playerCountValue) && playerCountValue >= 0
      ? playerCountValue
      : players.length;

    const stateValue = room?.state?.status
      || room?.state
      || room?.status
      || payload?.state
      || payload?.status;
    const defaultState = code ? ROOM_STATE_WAITING : fallbackState;
    const state = normalizeRoomState(stateValue, defaultState);

    const slotFromPayload = Number(payload?.playerSlot || payload?.slot);
    const selfPlayer = players.find((entry) => entry?.socketId === socket?.id);
    const slotFromPlayers = Number(selfPlayer?.slot);
    const slotValue = Number.isFinite(slotFromPayload) && slotFromPayload > 0
      ? slotFromPayload
      : slotFromPlayers;

    roomSnapshot.code = code;
    roomSnapshot.playerCount = playerCount;
    roomSnapshot.state = state;
    roomSnapshot.slot = Number.isFinite(slotValue) && slotValue > 0 ? slotValue : null;
    roomSnapshot.selfReady = Boolean(selfPlayer?.ready);
    roomSnapshot.players = players;

    applyMatchPayload(
      {
        match: room?.match,
        matchPlayerNumber: payload?.matchPlayerNumber,
        spawnPositions: payload?.spawnPositions,
        mySpawnPosition: payload?.mySpawnPosition,
        opponentSpawnPosition: payload?.opponentSpawnPosition
      },
      players
    );
  }

  function bindRoomHandlers() {
    if (!socket || roomHandlersBound) return;
    roomHandlersBound = true;

    socket.on('room_created', (payload) => {
      applyRoomPayload(payload, ROOM_STATE_WAITING);
      renderDebugPanel();
      setStatusMessage(`Room created (${roomSnapshot.code}). ${getStateMessage()}`);
      if (panelInput && roomSnapshot.code) panelInput.value = roomSnapshot.code;
      console.info(`${LOG_PREFIX} room_created`, payload);
    });

    socket.on('room_joined', (payload) => {
      applyRoomPayload(payload, ROOM_STATE_WAITING);
      renderDebugPanel();
      setStatusMessage(`Joined room ${roomSnapshot.code}. ${getStateMessage()}`);
      if (panelInput && roomSnapshot.code) panelInput.value = roomSnapshot.code;
      console.info(`${LOG_PREFIX} room_joined`, payload);
    });

    socket.on('room_update', (payload) => {
      clearReadyToggleAckTimer();
      const previousState = roomSnapshot.state;
      const previousSlot = roomSnapshot.slot;
      applyRoomPayload(payload, roomSnapshot.code ? ROOM_STATE_WAITING : ROOM_STATE_IDLE);
      if (!Number.isFinite(roomSnapshot.slot)) {
        roomSnapshot.slot = previousSlot;
      }
      renderDebugPanel();

      if (previousState !== roomSnapshot.state) {
        console.info(`${LOG_PREFIX} state_change ${previousState} -> ${roomSnapshot.state}`);
        if (previousState === ROOM_STATE_IN_MATCH && roomSnapshot.state !== ROOM_STATE_IN_MATCH) {
          lastSentInput = { x: 0, y: 0 };
          lastSentAim = { x: 0, y: 0 };
          pressedMovementKeys.clear();
          pressedAimKeys.clear();
        }
      }
      setStatusMessage(getStateMessage());
      console.info(`${LOG_PREFIX} room_update`, payload);
    });

    socket.on('room_reset_for_rematch', (payload) => {
      clearReadyToggleAckTimer();
      applyRoomPayload(payload, ROOM_STATE_WAITING);
      renderDebugPanel();
      setStatusMessage('Room reset for rematch. Ready up to start again.');
      console.info(`${LOG_PREFIX} room_reset_for_rematch`, payload);
    });

    socket.on('match_started', (payload) => {
      clearReadyToggleAckTimer();
      lastSentInput = { x: 0, y: 0 };
      applyRoomPayload(payload, ROOM_STATE_IN_MATCH);
      if (!roomSnapshot.matchId) {
        applyMatchPayload(payload, roomSnapshot.players);
      } else {
        const myNumberFromEvent = parseNumber(payload?.matchPlayerNumber);
        if (myNumberFromEvent !== null) {
          roomSnapshot.myMatchPlayerNumber = myNumberFromEvent;
        }
      }
      lastSentAim = normalizeMovementInput(roomSnapshot.myAimDirection || { x: 0, y: 0 });
      roomSnapshot.state = ROOM_STATE_IN_MATCH;
      renderDebugPanel();
      const numberInfo = Number.isFinite(roomSnapshot.myMatchPlayerNumber) ? ` You are player ${roomSnapshot.myMatchPlayerNumber}.` : '';
      setStatusMessage(`Match started.${numberInfo}`);
      console.info(`${LOG_PREFIX} match_started`, payload);
    });

    socket.on('match_state', (payload) => {
      const previousHitId = trimString(roomSnapshot.lastHitEvent?.hitId);
      const previousPhase = roomSnapshot.matchPhase;
      applyMatchPayload(payload, roomSnapshot.players);
      roomSnapshot.state = ROOM_STATE_IN_MATCH;
      renderDebugPanel();
      const nextHit = roomSnapshot.lastHitEvent;
      const nextHitId = trimString(nextHit?.hitId);
      if (nextHitId && nextHitId !== previousHitId) {
        const source = Number.isFinite(nextHit.sourcePlayerNumber) ? nextHit.sourcePlayerNumber : '?';
        const target = Number.isFinite(nextHit.targetPlayerNumber) ? nextHit.targetPlayerNumber : '?';
        const markerText = `Hit: P${source} -> P${target}`;
        setStatusMessage(markerText);
        console.info(`${LOG_PREFIX} hit_event ${nextHitId} source=P${source} target=P${target}`, nextHit);
      }
      if (previousPhase !== roomSnapshot.matchPhase) {
        if (roomSnapshot.matchPhase === MATCH_PHASE_END) {
          const resultText = getMatchResultText() || 'Match ended';
          setStatusMessage(resultText);
          console.info(`${LOG_PREFIX} match_end winner=P${roomSnapshot.winnerPlayerNumber || '?'} eliminated=P${roomSnapshot.eliminatedPlayerNumber || '?'}`);
        } else {
          setStatusMessage(`Match phase: ${roomSnapshot.matchPhase || DEFAULT_MATCH_PHASE}`);
        }
      }
    });

    socket.on('room_error', (payload) => {
      clearReadyToggleAckTimer();
      const message = trimString(payload?.message) || 'Room error.';
      setStatusMessage(message);
      renderDebugPanel();
      console.warn(`${LOG_PREFIX} room_error`, payload);
    });

    socket.on('room_left', (payload) => {
      clearReadyToggleAckTimer();
      lastSentInput = { x: 0, y: 0 };
      lastSentAim = { x: 0, y: 0 };
      pressedMovementKeys.clear();
      pressedAimKeys.clear();
      clearRoomSnapshot(ROOM_STATE_IDLE);
      renderDebugPanel();
      setStatusMessage('Left room.');
      if (panelInput) panelInput.value = '';
      console.info(`${LOG_PREFIX} room_left`, payload);
    });
  }

  function connect() {
    ensureDebugPanel();
    bindKeyboardHandlers();
    startMovementInputLoop();
    if (socket) return socket;

    if (typeof window.io !== 'function') {
      console.warn(`${LOG_PREFIX} socket.io-client is not loaded.`);
      setStatusMessage('socket.io-client missing.');
      return null;
    }

    roomHandlersBound = false;
    const serverUrl = resolveServerUrl();
    if (!serverUrl) {
      console.warn(`${LOG_PREFIX} no multiplayer server URL configured for this environment.`);
      setStatusMessage('Multiplayer URL missing. Set OUTRA_MULTIPLAYER_SERVER_URL in production.');
      clearRoomSnapshot(ROOM_STATE_OFFLINE);
      renderDebugPanel();
      return null;
    }
    console.info(`${LOG_PREFIX} connecting to ${serverUrl}`);
    socket = window.io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
    bindRoomHandlers();

    socket.on('connect', () => {
      startMovementInputLoop();
      console.info(`${LOG_PREFIX} connected`);
      console.info(`${LOG_PREFIX} socket id: ${socket.id}`);
      renderDebugPanel();
      setStatusMessage('Connected to multiplayer server.');
    });

    socket.on('disconnect', (reason) => {
      clearReadyToggleAckTimer();
      stopMovementInputLoop();
      console.info(`${LOG_PREFIX} disconnected (${reason})`);
      clearRoomSnapshot(ROOM_STATE_OFFLINE);
      renderDebugPanel();
      setStatusMessage(`Disconnected (${reason})`);
    });

    socket.on('connect_error', (error) => {
      const message = trimString(error?.message) || 'Unknown connection error';
      console.error(`${LOG_PREFIX} connect_error: ${message}`, error);
      renderDebugPanel();
      setStatusMessage(`Connect error: ${message}`);
    });

    return socket;
  }

  function emitWhenConnected(eventName, payload, pendingMessage, ackCallback) {
    const activeSocket = connect();
    if (!activeSocket) return false;

    const emitEvent = () => {
      if (typeof ackCallback === 'function') {
        if (typeof payload === 'undefined') {
          activeSocket.emit(eventName, ackCallback);
          return;
        }
        activeSocket.emit(eventName, payload, ackCallback);
        return;
      }

      if (typeof payload === 'undefined') {
        activeSocket.emit(eventName);
        return;
      }
      activeSocket.emit(eventName, payload);
    };

    if (activeSocket.connected) {
      emitEvent();
      return true;
    }

    if (typeof activeSocket.connect === 'function') {
      activeSocket.connect();
    }

    setStatusMessage(pendingMessage || 'Connecting to multiplayer server...');
    const onceConnected = () => {
      emitEvent();
    };
    activeSocket.once('connect', onceConnected);
    return true;
  }

  function createRoom() {
    const requested = emitWhenConnected('create_room', undefined, 'Connecting and creating room...');
    if (!requested) return;
    setStatusMessage('Creating room...');
    console.info(`${LOG_PREFIX} create_room requested`);
  }

  function joinRoom(roomCode) {
    const normalizedCode = normalizeRoomCode(roomCode);
    if (!normalizedCode) {
      setStatusMessage('Enter a valid room code.');
      console.warn(`${LOG_PREFIX} join_room rejected: missing room code`);
      return;
    }

    if (panelInput) panelInput.value = normalizedCode;
    const requested = emitWhenConnected('join_room', { roomCode: normalizedCode }, `Connecting and joining ${normalizedCode}...`);
    if (!requested) return;
    setStatusMessage(`Joining ${normalizedCode}...`);
    console.info(`${LOG_PREFIX} join_room requested code=${normalizedCode}`);
  }

  function toggleReady() {
    if (!roomSnapshot.code) {
      setStatusMessage('Join a room before toggling ready.');
      return;
    }

    if (roomSnapshot.state === ROOM_STATE_IN_MATCH) {
      setStatusMessage('Match already started.');
      return;
    }

    if (roomSnapshot.state === ROOM_STATE_STARTING) {
      setStatusMessage('Match is starting...');
      return;
    }

    if (roomSnapshot.playerCount < 2) {
      setStatusMessage('Waiting for opponent before ready check.');
      return;
    }

    const requested = emitWhenConnected(
      'toggle_ready',
      undefined,
      'Connecting and toggling ready...',
      (response) => {
        clearReadyToggleAckTimer();
        if (!response || response.ok !== false) return;
        const message = trimString(response?.message) || 'Ready toggle failed.';
        setStatusMessage(message);
      }
    );
    if (!requested) return;
    setStatusMessage(roomSnapshot.selfReady ? 'Setting not ready...' : 'Setting ready...');
    clearReadyToggleAckTimer();
    readyToggleAckTimer = window.setTimeout(() => {
      readyToggleAckTimer = null;
      setStatusMessage('No response for toggle_ready. Restart the multiplayer server and try again.');
    }, READY_TOGGLE_ACK_TIMEOUT_MS);
    console.info(`${LOG_PREFIX} toggle_ready requested`);
  }

  function returnToRoom() {
    if (roomSnapshot.state !== ROOM_STATE_IN_MATCH || roomSnapshot.matchPhase !== MATCH_PHASE_END) {
      setStatusMessage('Return is available after match end.');
      return;
    }

    const requested = emitWhenConnected(
      'return_to_room',
      undefined,
      'Returning to room...',
      (response) => {
        if (!response) return;
        if (response.ok === false) {
          const message = trimString(response?.message) || 'Return to room failed.';
          setStatusMessage(message);
          return;
        }
        if (response.room) {
          applyRoomPayload({ roomCode: response.roomCode, room: response.room }, ROOM_STATE_WAITING);
          renderDebugPanel();
        }
        setStatusMessage('Returned to room. Ready up for rematch.');
      }
    );
    if (!requested) return;
    setStatusMessage('Returning to room...');
    console.info(`${LOG_PREFIX} return_to_room requested`);
  }

  function resetRoomForRematch() {
    const requested = emitWhenConnected(
      'reset_room_for_rematch',
      undefined,
      'Resetting room for rematch...',
      (response) => {
        if (!response) return;
        if (response.ok === false) {
          const message = trimString(response?.message) || 'Room reset failed.';
          setStatusMessage(message);
          return;
        }
        if (response.room) {
          applyRoomPayload({ roomCode: response.roomCode, room: response.room }, ROOM_STATE_WAITING);
          renderDebugPanel();
        }
        setStatusMessage('Room reset for rematch.');
      }
    );
    if (!requested) return;
    setStatusMessage('Resetting room for rematch...');
    console.info(`${LOG_PREFIX} reset_room_for_rematch requested`);
  }

  function castFireblast() {
    if (roomSnapshot.state !== ROOM_STATE_IN_MATCH || !roomSnapshot.matchId) {
      return;
    }
    if (roomSnapshot.matchPhase !== DEFAULT_MATCH_PHASE) {
      return;
    }

    emitWhenConnected(
      'cast_fireblast',
      undefined,
      'Connecting and casting fireblast...',
      (response) => {
        if (!response) return;
        if (response.ok === false) {
          const message = trimString(response?.message) || 'Fireblast cast failed.';
          setStatusMessage(message);
          return;
        }
        if (response.ok === true && response.projectileId) {
          setStatusMessage(`Fireblast cast: ${response.projectileId}`);
        }
      }
    );
    console.info(`${LOG_PREFIX} cast_fireblast requested`);
  }

  function leaveRoom() {
    if (!socket) return;
    emitWhenConnected('leave_room', undefined, 'Connecting and leaving room...');
    setStatusMessage('Leaving room...');
    console.info(`${LOG_PREFIX} leave_room requested`);
  }

  function disconnect() {
    if (!socket) return;
    leaveRoom();
    socket.disconnect();
    socket = null;
    roomHandlersBound = false;
    stopMovementInputLoop();
    clearRoomSnapshot(ROOM_STATE_OFFLINE);
    renderDebugPanel();
  }

  function getSocket() {
    return socket;
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', ensureDebugPanel, { once: true });
  } else {
    ensureDebugPanel();
  }

  window.outraMultiplayer = {
    connect,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    returnToRoom,
    resetRoomForRematch,
    castFireblast,
    disconnect,
    getSocket,
    getServerUrl: resolveServerUrl
  };
})();
