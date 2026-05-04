// ── Brand ─────────────────────────────────────────────────────
const BRAND = {
  name: 'Outra',
  lobbyTitle: 'Outra',
  storagePrefix: 'outra',
  legacyStoragePrefix: 'warlock_mvp',
};

// ── Storage Keys ──────────────────────────────────────────────
const STORAGE_KEY = `${BRAND.storagePrefix}_leaderboard_v1`;
const PROFILE_KEY = `${BRAND.storagePrefix}_profile_v2`;

const LEGACY_STORAGE_KEY = 'warlock_mvp_leaderboard_v1';
const LEGACY_PROFILE_KEY = 'warlock_mvp_profile_v14';

// ── Device Detection ──────────────────────────────────────────
const isTouchDevice =
  window.matchMedia('(pointer: coarse)').matches ||
  window.innerWidth <= 900;

// Stabilizes multiplayer phase transitions (draft/arena) across short snapshot gaps
// to prevent visible UI/render flicker on slower or jittery updates.
const OUTRA_MULTIPLAYER_PHASE_STICKY_MS = 1500;
window.OUTRA_MULTIPLAYER_PHASE_STICKY_MS = OUTRA_MULTIPLAYER_PHASE_STICKY_MS;
const OUTRA_ENABLE_ARENA_CONCEPT_HUD = window.OUTRA_ENABLE_ARENA_CONCEPT_HUD !== false;
window.OUTRA_ENABLE_ARENA_CONCEPT_HUD = OUTRA_ENABLE_ARENA_CONCEPT_HUD;

// ── Auto Player Colors (assigned automatically) ───────────────
const autoPlayerColors = [
  { name: 'Arcane Violet', body: '#d9d9ff', wand: '#7c4dff' },
  { name: 'Azure Storm', body: '#9be7ff', wand: '#008cff' },
  { name: 'Ember Gold', body: '#ffd8b8', wand: '#ff7a1a' },
  { name: 'Verdant Surge', body: '#b8ffcb', wand: '#10c45c' },
];

// ── Ranked System ─────────────────────────────────────────────
const RANKED_CONFIG = {
  mmrPerStar: 20,
  promoStarCount: 5,
  derankProtectionLossesAtZero: 1,
  winMmr: 20,
  lossMmr: 20,
  tiers: [
    { key: 'bronze',  name: 'Bronze',  min: 0,   max: 99,   iconIndex: 0 },
    { key: 'silver',  name: 'Silver',  min: 100, max: 199,  iconIndex: 1 },
    { key: 'gold',    name: 'Gold',    min: 200, max: 299,  iconIndex: 2 },
    { key: 'crystal', name: 'Crystal', min: 300, max: 399,  iconIndex: 2 },
    { key: 'master',  name: 'Master',  min: 400, max: Infinity, iconIndex: 2 },
  ],
};

// ── Spell Definitions ─────────────────────────────────────────
const SPELL_DEFS = {
  fire: {
    id: 'fire',
    name: 'Fireblast',
    icon: '🔥',
    cooldownKey: 'fireReadyAt',
  },
  shock: {
    id: 'shock',
    name: 'Shock Blast',
    icon: '💥',
    cooldownKey: 'shockReadyAt',
  },
  gust: {
    id: 'gust',
    name: 'Gust',
    icon: '🌪️',
    cooldownKey: 'gustReadyAt',
  },
  wall: {
    id: 'wall',
    name: 'Wall',
    icon: '🧱',
    cooldownKey: 'wallReadyAt',
  },
  rewind: {
    id: 'rewind',
    name: 'Rewind',
    icon: '⏪',
    cooldownKey: 'rewindReadyAt',
  },
  hook: {
    id: 'hook',
    name: 'Hook',
    icon: '🪝',
    cooldownKey: 'hookReadyAt',
  },
  blink: {
    id: 'blink',
    name: 'Blink',
    icon: '✦',
    cooldownKey: 'teleportReadyAt',
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    icon: '🛡️',
    cooldownKey: 'shieldReadyAt',
  },
  prism: {
    id: 'prism',
    name: 'Prism',
    icon: 'P',
    cooldownKey: 'prismReadyAt',
  },
  charge: {
    id: 'charge',
    name: 'Arcane Charge',
    icon: '⚡',
    cooldownKey: 'chargeReadyAt',
  },
  solar: {
    id: 'solar',
    name: 'Solar',
    icon: 'S',
    cooldownKey: 'solarReadyAt',
  },
  rift: {
    id: 'rift',
    name: 'Rift',
    icon: 'R',
    cooldownKey: 'riftReadyAt',
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    icon: 'P',
    cooldownKey: 'phantomReadyAt',
  },
};

// ── Spell Icons ───────────────────────────────────────────────
const SPELL_ICONS = {
  fire:    '/docs/art/spells/fireball.jpeg',
  hook:    '/docs/art/spells/hook.jpeg',
  blink:   '/docs/art/spells/blink.jpeg',
  shield:  '/docs/art/spells/shield.jpeg',
  prism:   '/docs/art/spells/prism.jpg',
  charge:  '/docs/art/spells/charge.jpeg',
  shock:   '/docs/art/spells/shock.jpeg',
  gust:    '/docs/art/spells/gust.jpeg',
  solar:   '/docs/art/spells/solar.jpg',
  rift:    '/docs/art/spells/rift.jpg',
  phantom: '/docs/art/spells/phantom.jpg',
  wall:    '/docs/art/spells/wall.jpeg',
  rewind:  '/docs/art/spells/rewind.jpeg'
};

// ── Store Items ───────────────────────────────────────────────
const DEFAULT_CHARACTER_SKIN_ID = 'zarokInitiate';

const characterSkins = Object.freeze([
  {
    id: 'zarokInitiate',
    type: 'character',
    name: 'Zarok Initiate',
    rarity: 'Common',
    cost: 0,
    description: 'A disciplined battlemage trained for clean duels and quick reads.',
    thumbnail: '/docs/art/character/zarok/zarok.png',
    previewImages: [
      '/docs/art/character/zarok/zarok.png',
      '/docs/art/character/zarok/zarok_idle.png',
    ],
  },
  {
    id: 'zarokRiftwalker',
    type: 'character',
    name: 'Zarok Riftwalker',
    rarity: 'Rare',
    cost: 6,
    description: 'A fast-footed variant that hunts flank angles and portal pressure.',
    thumbnail: '/docs/art/character/zarok/Drafts/zarok_west.png',
    previewImages: [
      '/docs/art/character/zarok/Drafts/zarok_west.png',
      '/docs/art/character/zarok/Drafts/zarok_east.png',
      '/docs/art/character/zarok/zarok_run.png',
    ],
  },
  {
    id: 'zarokVerdant',
    type: 'character',
    name: 'Zarok Verdant',
    rarity: 'Epic',
    cost: 12,
    description: 'An infused emerald skin pulsing with unstable arcane growth.',
    thumbnail: '/docs/art/character/zarok/Drafts/zorak_green.png',
    previewImages: [
      '/docs/art/character/zarok/Drafts/zorak_green.png',
      '/docs/art/character/zarok/Drafts/zarok_north.jpeg',
    ],
  },
  {
    id: 'aldrionPrime',
    type: 'character',
    name: 'Aldrion Prime',
    rarity: 'Legendary',
    cost: 20,
    description: 'A mythic archmage frame worn by champions who close out finals.',
    thumbnail: '/docs/art/character/Warlock_reference.png',
    previewImages: [
      '/docs/art/character/Warlock_reference.png',
      '/docs/art/character/zarok/Drafts/zarok_apose.png',
    ],
  },
]);

const CHARACTER_SKIN_BY_ID = Object.freeze(
  characterSkins.reduce((acc, skin) => {
    acc[skin.id] = skin;
    return acc;
  }, {})
);

const storeItems = characterSkins.map((skin) => ({
  ...skin,
  apply: (p) => {
    if (!p || !p.store) return;
    p.store[skin.id] = true;
  },
}));

// ── Keybinds ──────────────────────────────────────────────────
const defaultBinds = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
  fire: 'mouse1',
  hook: 'e',
  teleport: 'space',
  shield: 'q',
  prism: 'g',
  charge: 'f',
  shock: 'c',
  gust: 'x',
  solar: 'b',
  rift: 't',
  phantom: 'y',
  wall: 'v',
  rewind: 'z',
  reset: 'r',
  menu: 'escape',
};

const bindLabels = {
  up: 'Move Up',
  down: 'Move Down',
  left: 'Move Left',
  right: 'Move Right',
  fire: 'Fireblast',
  hook: 'Hook',
  teleport: 'Teleport',
  shield: 'Shield',
  prism: 'Prism',
  charge: 'Arcane Charge',
  shock: 'Shock',
  gust: 'Gust',
  solar: 'Solar',
  rift: 'Rift',
  phantom: 'Phantom',
  wall: 'Wall',
  rewind: 'Rewind',
  reset: 'Reset Round',
  menu: 'Menu'
};

let keybinds = { ...defaultBinds };

// ── Game State ────────────────────────────────────────────────
let waitingForBind = null;
let selectedColorIndex = 0;
let gameState = 'lobby';
let menuOpen = false;
let winnerText = '';
let winnerReward = null;
let resultTimer = 0;
let lavaSoundTimer = 0;
let musicMuted = false;
let activeMenuTab = 'main';
let activeLobbyTab = 'play';
let godModeEnabled = false;
let dummyEnabled = false;
let dummyBehavior = 'active'; // 'active' | 'standing'
let hudVisible = false;
const FORCE_ARENA_PERFORMANCE_MODE = true;

const draftState = {
  order: ['A', 'B', 'B', 'A', 'A', 'B'],
  spellOrder: ['charge', 'prism', 'solar', 'rift', 'phantom', 'shock', 'gust', 'wall', 'rewind', 'shield', 'hook', 'blink'],
  localPlayerId: 'A',
  turnDuration: 8,
  holdDuration: 0.6,
  autoStartDelay: 1,
  completeAt: 0,
  turnIndex: 0,
  activeIndex: 0,
  turnTimeLeft: 8,
  elapsed: 0,
  totalDuration: 48,
  timeLeft: 8,
  holdSpellId: null,
  holdTime: 0,
  complete: false,
  pickFx: {
    transfers: [],
    ringPulses: [],
    tileBursts: [],
  },
  turnFlash: null,
  layout: null,
  spells: [],
  picks: {
    A: [],
    B: [],
  },
  playerNames: {
    A: '',
    B: '',
  },
  spellPool: {},
  players: {
    A: { x: 0, y: 0, vx: 0, vy: 0, moveTimer: 0, dirX: 0, dirY: 0 },
    B: { x: 0, y: 0, vx: 0, vy: 0, moveTimer: 0, dirX: 0, dirY: 0 },
  },
};

const skillAimPreview = {
  active: false,
  type: null,
  dx: 1,
  dy: 0
};

const arenaIntro = {
  active: false,
  elapsed: 0,
  preDelay: 1,
  countdownSeconds: 3,
  fightDuration: 0.9,
  postFightDelay: 0.8,
};

// ── Visual Asset / Layout Config ─────────────────────────────
window.OUTRA_VISUAL_CONFIG = {
  lobbyArt: {
    bg: '/docs/art/Lobby/bg.jpg',
    button: '/docs/art/Lobby/Button.png',
    currency: '/docs/art/Lobby/Currency.png',
    emberOrange: '/docs/art/Lobby/Orange.png',
    emberPurple: '/docs/art/Lobby/Purple.png',
    ranks: '/docs/art/Lobby/Ranks.png',
  },

  arenaFloor: {
    image: '/docs/art/draft/arena_platform.png',
    lavaBackgroundImage: '/docs/art/draft/lava.jpeg',
    platformDepthFxEnabled: true,
    visualOffsetY: 40,
    platformVisualOffsetY: 90,
  },

  arenaFloatingStones: {
    image: '/docs/art/draft/stones.png',
  },

  draftRoom: {
    backgroundImage: '/docs/art/draft/bg.png',
    playerSeatOffsets: {
      A: { x: 0, y: -8 },
      B: { x: 0, y: 8 },
    },
    layout: {
      centerOffsetX: 0,
      centerOffsetY: 0,
      gridOffsetX: 0,
      gridOffsetY: -18,
      gridInsidePadding: 26,
      tileGapX: 60,
      tileGapY: 68,
      sideSeatMode: true,
      sideSeatXFactor: 0.18,
      sideSeatYFactor: 0.24,
      sideSeatUsePanelAnchors: true,
      sideSeatPanelOffsetY: 28,
      moveRadiusScale: 0.92,
      moveRadiusPadding: -6,
      seatRadiusScale: 0.62,
      seatRadiusOffset: 0,
      platformFitRadius: 1.95,
    },
    orb: {
      height: 16,
      bobAmplitude: 5.5,
      bobSpeed: 1.35,
      scale: 2,
      glowIntensity: 1,
      stateBrightness: {
        idle: 1,
        selectable: 1.14,
        channeling: 1.36,
        taken: 0.42,
      },
    },
  },
};

// ── Input State ───────────────────────────────────────────────
const keys = {};
const mouse = { x: 0, y: 0 };
const moveStick = {
  active: false,
  dx: 0,
  dy: 0,
  touchId: null,
  mouseDown: false
};

// ── Profile ───────────────────────────────────────────────────
const profile = {
  wlk: 0,
  musicMuted: false,
  musicVolume: 0.38,
  soundVolume: 1,
  aimSensitivity: 0.7,
  ranked: {
    currentRank: 20,
    currentStars: 0,
    winStreak: 0,
    wins: 0,
    losses: 0,
    totalMatches: 0,
    highestRank: 20,
    lastProcessedMatchId: '',
  },
  store: {
    potionBoost: false,
    cooldownCharm: false,
    musicPack: false,
    wizardHat: false,
    beanie: false,
    crown: false,
    strawHat: false,
    sweater: false,
    boots: false,
    emoteGoodGame: false,
    emoteEasyWin: false,
    zarokInitiate: true,
    zarokRiftwalker: false,
    zarokVerdant: false,
    aldrionPrime: false,
  },
  equipped: {
    hat: null,
    sweater: false,
    boots: false,
    character: DEFAULT_CHARACTER_SKIN_ID,
  }
};

// ── Arena ─────────────────────────────────────────────────────
const arena = {
  cx: 0,
  cy: 0,
  baseRadius: 0,
  radius: 0,
  shrinkEnabled: false,
  shrinkInterval: 20,
  shrinkTimer: 20,
  shrinkStep: 26,
  minRadius: 190
};

const playerSpawn = { x: 0, y: 0 };
const dummySpawn  = { x: 0, y: 0 };

// ── Player ────────────────────────────────────────────────────
const player = {
  name: 'Player',
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  r: 18,
  speed: 280,
  hp: 100,
  maxHp: 100,

  fireCooldown: 0.45,
  hookCooldown: 1.8,
  teleportCooldown: 2.5,
  shieldCooldown: 4.5,
  prismCooldown: 8.0,
  chargeCooldown: 5.5,
  shockCooldown: 3.2,
  gustCooldown: 6.0,
  solarCooldown: 9.0,
  riftCooldown: 11.0,
  phantomCooldown: 11.0,
  wallCooldown: 8.0,
  rewindCooldown: 9.0,

  fireReadyAt: 0,
  hookReadyAt: 0,
  teleportReadyAt: 0,
  shieldReadyAt: 0,
  prismReadyAt: 0,
  chargeReadyAt: 0,
  shockReadyAt: 0,
  gustReadyAt: 0,
  solarReadyAt: 0,
  riftReadyAt: 0,
  phantomReadyAt: 0,
  wallReadyAt: 0,
  rewindReadyAt: 0,

  teleportDistance: 150,
  shieldUntil: 0,
  prismUntil: 0,
  solarDistortionUntil: 0,
  riftPendingExpiresAt: 0,
  riftPendingPortalA: null,
  riftPlacementActive: false,
  phantomVanishUntil: 0,
  phantomIllusionUntil: 0,
  phantomSplitApplied: false,
  phantomOriginX: 0,
  phantomOriginY: 0,
  phantomSplitOffsetX: 0,
  phantomSplitOffsetY: 0,
  phantomIllusionX: 0,
  phantomIllusionY: 0,
  phantomIllusionVelX: 0,
  phantomIllusionVelY: 0,
  phantomIllusionRetargetAt: 0,
  phantomIllusionLastAt: 0,

  chargeActive: false,
  chargeDirX: 0,
  chargeDirY: 0,
  chargeTimer: 0,
  chargeHit: false,
  dashAnimStartedAt: 0,
  dashAnimUntil: 0,
  castAnimStartedAt: 0,
  castAnimUntil: 0,
  hitAnimStartedAt: 0,
  hitAnimUntil: 0,

  alive: true,
  deadReason: '',
  score: 0,

  bodyColor: autoPlayerColors[0].body,
  wandColor: autoPlayerColors[0].wand,

  aimX: 1,
  aimY: 0,
  prismDirX: 1,
  prismDirY: 0,

  rewindSeconds: 1.0,
};

// ── Active Spell Loadout (order = slots) ─────────────────────
let activeSpellLoadout = [
  'fire',
  'hook',
  'blink',
  'shield',
  'prism',
  'charge',
  'shock',
  'gust',
  'solar',
  'rift',
  'phantom',
  'wall',
  'rewind'
];

// ── Dummy ─────────────────────────────────────────────────────
const dummy = {
  name: 'Dummy',
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  r: 18,
  speed: 185,
  hp: 100,
  maxHp: 100,

  alive: true,
  deadReason: '',

  fireCooldown: 0.9,
  hookCooldown: 3.1,
  fireReadyAt: 0,
  hookReadyAt: 0,

  aiStrafeDir: 1,
  aiSwitchTimer: 0,
  aiMoveTimer: 0,
  targetX: 0,
  targetY: 0,

  aimX: -1,
  aimY: 0,
  prismDirX: -1,
  prismDirY: 0,
  shieldUntil: 0,
  prismUntil: 0,
  solarDistortionUntil: 0,
  phantomVanishUntil: 0,
  chargeActive: false,
  chargeDirX: -1,
  chargeDirY: 0,
  dashAnimStartedAt: 0,
  dashAnimUntil: 0,
  castAnimStartedAt: 0,
  castAnimUntil: 0,
  hitAnimStartedAt: 0,
  hitAnimUntil: 0,
};

// ── World Collections ─────────────────────────────────────────
const projectiles = [];
const particles = [];
const damageTexts = [];
const obstacles = [];
const walls = [];
const rifts = [];
const phantomIllusions = [];
const hooks = [];
const potions = [];
const rewindHistory = [];
let rewindLastSampleAt = 0;
const combatFx = {
  shake: {
    x: 0,
    y: 0,
    intensity: 0,
    duration: 0,
    timeLeft: 0,
    elapsed: 0,
  },
  impactWaves: [],
  directionalWaves: [],
  practiceSpellImageFx: [],
  actorHitFlash: {
    player: 0,
    dummy: 0,
  },
  eliminationPulse: {
    x: 0,
    y: 0,
    life: 0,
    maxLife: 0,
    winnerPlayerNumber: null,
    eliminatedPlayerNumber: null,
  },
  trailEmit: {
    player: 0,
    dummy: 0,
  },
};

// ── Misc Timers ───────────────────────────────────────────────
let lastTime = performance.now();
let lavaTick = 0;
let potionSpawnTimer = 6;

// ── DOM References ────────────────────────────────────────────
const canvas = document.getElementById('game');

function createCanvas2DContext(targetCanvas, options = null) {
  if (!targetCanvas || typeof targetCanvas.getContext !== 'function') return null;
  if (options && typeof options === 'object') {
    const optedContext = targetCanvas.getContext('2d', options);
    if (optedContext) return optedContext;
  }
  return targetCanvas.getContext('2d');
}

const bgCtx = createCanvas2DContext(canvas, {
  alpha: false,
  desynchronized: true,
});

const fxCanvas = document.getElementById('gameFx');
const fxCtx = createCanvas2DContext(fxCanvas, {
  alpha: true,
  desynchronized: true,
});

let ctx = bgCtx;

const hud = document.getElementById('hud');
const topbar = document.getElementById('topbar');
const arenaMatchHudEl = document.getElementById('arenaMatchHud');
const overlay = document.getElementById('overlay');
const draftOverlay = document.getElementById('draftOverlay');
const menuPanel = document.getElementById('menuPanel');

const hpEl = document.getElementById('hp');
const dummyHpEl = document.getElementById('dummyHp');
const scoreHudEl = document.getElementById('scoreHud');
const wlkHudEl = document.getElementById('wlkHud');
const roundTimerHudEl = document.getElementById('roundTimerHud');
const controlsHudEl = document.getElementById('controlsHud');
const playerNameHudEl = document.getElementById('playerNameHud');

const arenaScoreMetaTopEl = document.getElementById('arenaScoreMetaTop');
const arenaScoreRoundEl = document.getElementById('arenaScoreRound');
const arenaScoreTimerEl = document.getElementById('arenaScoreTimer');
const arenaScoreLeftNameEl = document.getElementById('arenaScoreLeftName');
const arenaScoreLeftValueEl = document.getElementById('arenaScoreLeftValue');
const arenaScoreLeftMarkersEl = document.getElementById('arenaScoreLeftMarkers');
const arenaScoreRightNameEl = document.getElementById('arenaScoreRightName');
const arenaScoreRightValueEl = document.getElementById('arenaScoreRightValue');
const arenaScoreRightMarkersEl = document.getElementById('arenaScoreRightMarkers');

const arenaLeftPortraitGlyphEl = document.getElementById('arenaLeftPortraitGlyph');
const arenaLeftPanelNameEl = document.getElementById('arenaLeftPanelName');
const arenaLeftRankLabelEl = document.getElementById('arenaLeftRankLabel');
const arenaLeftRankTitleEl = document.getElementById('arenaLeftRankTitle');
const arenaLeftHpTextEl = document.getElementById('arenaLeftHpText');
const arenaLeftHpFillEl = document.getElementById('arenaLeftHpFill');
const arenaSpellBarMountEl = document.getElementById('arenaSpellBarMount');
const arenaLeftSpellIconEls = [
  document.getElementById('arenaLeftSpell0Icon'),
  document.getElementById('arenaLeftSpell1Icon'),
  document.getElementById('arenaLeftSpell2Icon'),
];
const arenaLeftSpellFallbackEls = [
  document.getElementById('arenaLeftSpell0Fallback'),
  document.getElementById('arenaLeftSpell1Fallback'),
  document.getElementById('arenaLeftSpell2Fallback'),
];
const arenaLeftFireSpellIconEl = document.getElementById('arenaLeftFireSpellIcon');
const arenaLeftFireSpellFallbackEl = document.getElementById('arenaLeftFireSpellFallback');
const arenaLeftFireSpellCooldownEl = document.getElementById('arenaLeftFireSpellCooldown');
const arenaLeftFireSpellKeyEl = document.getElementById('arenaLeftFireSpellKey');

const arenaRightPortraitGlyphEl = document.getElementById('arenaRightPortraitGlyph');
const arenaRightPanelNameEl = document.getElementById('arenaRightPanelName');
const arenaRightRankLabelEl = document.getElementById('arenaRightRankLabel');
const arenaRightRankTitleEl = document.getElementById('arenaRightRankTitle');
const arenaRightHpTextEl = document.getElementById('arenaRightHpText');
const arenaRightHpFillEl = document.getElementById('arenaRightHpFill');
const arenaRightSpellIconEls = [
  document.getElementById('arenaRightSpell0Icon'),
  document.getElementById('arenaRightSpell1Icon'),
  document.getElementById('arenaRightSpell2Icon'),
];
const arenaRightSpellFallbackEls = [
  document.getElementById('arenaRightSpell0Fallback'),
  document.getElementById('arenaRightSpell1Fallback'),
  document.getElementById('arenaRightSpell2Fallback'),
];
const arenaRightFireSpellIconEl = document.getElementById('arenaRightFireSpellIcon');
const arenaRightFireSpellFallbackEl = document.getElementById('arenaRightFireSpellFallback');
const arenaRightFireSpellCooldownEl = document.getElementById('arenaRightFireSpellCooldown');
const arenaRightFireSpellKeyEl = document.getElementById('arenaRightFireSpellKey');

const hudToggleBtn = document.getElementById('hudToggleBtn');
const menuBtn = document.getElementById('menuBtn');
const draftTurnBadgeEl = document.getElementById('draftTurnBadge');
const lobbyMenuBtn = document.getElementById('lobbyMenuBtn');
const draftTurnTextEl = document.getElementById('draftTurnText');
const draftCountdownEl = document.getElementById('draftCountdown');
const draftTimerCardEl = document.getElementById('draftTimerCard');
const draftSpellIconOverlayEl = document.getElementById('draftSpellIconOverlay');
const arenaCursorReticleEl = document.getElementById('arenaCursorReticle');
const draftOrderListEl = document.getElementById('draftOrderList');
const draftOrderProgressEl = document.getElementById('draftOrderProgress');
const draftHelperTextEl = document.getElementById('draftHelperText');

const resumeBtn = document.getElementById('resumeBtn');
const musicToggleBtn = document.getElementById('musicToggleBtn');
const godModeBtn = document.getElementById('godModeBtn');
const standingDummyBtn = document.getElementById('standingDummyBtn');
const activeDummyBtn = document.getElementById('activeDummyBtn');
const removeDummyBtn = document.getElementById('removeDummyBtn');
const toArenaBtn = document.getElementById('toArenaBtn');
const toLobbyBtn = document.getElementById('toLobbyBtn');
const leaveGameBtn = document.getElementById('leaveGameBtn');
const resetBtn = document.getElementById('resetBtn');
const menuResetBindsBtn = document.getElementById('menuResetBindsBtn');

const bindList = document.getElementById('menuBindList');

const aimSensitivitySlider = document.getElementById('aimSensitivitySlider');
const aimSensitivityValue = document.getElementById('aimSensitivityValue');
const musicVolumeSlider = document.getElementById('musicVolumeSlider');
const musicVolumeValue = document.getElementById('musicVolumeValue');
const soundVolumeSlider = document.getElementById('soundVolumeSlider');
const soundVolumeValue = document.getElementById('soundVolumeValue');

const nameInput = document.getElementById('nameInput');
const colorRow = document.getElementById('colorRow');
const inventoryList = document.getElementById('inventoryList');
const leaderboardList = document.getElementById('leaderboardList');
const storeList = document.getElementById('storeList');
const startBtn = document.getElementById('startBtn');
const draftRoomBtn = document.getElementById('draftRoomBtn');
const quickMatchStateText = document.getElementById('quickMatchStateText');

const wlkLobbyEl = document.getElementById('wlkLobby');
const wlkLobbyTopEl = document.getElementById('wlkLobbyTop');
const wlkTopbarEl = document.getElementById('wlkTopbar');

const previewCanvas = document.getElementById('previewCanvas');
const lobbyTopNameEl = document.getElementById('lobbyTopName');
const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;

// ── Mobile Controls ───────────────────────────────────────────
const mobileControls = document.getElementById('mobileControls');
const moveJoystick = document.getElementById('moveJoystick');
const moveJoystickThumb = document.getElementById('moveJoystickThumb');

const mobileFireBtn = document.getElementById('mobileFireBtn');
const mobileHookBtn = document.getElementById('mobileHookBtn');
const mobileTeleportBtn = document.getElementById('mobileTeleportBtn');
const mobileShieldBtn = document.getElementById('mobileShieldBtn');
const mobilePrismBtn = document.getElementById('mobilePrismBtn');
const mobileChargeBtn = document.getElementById('mobileChargeBtn');
const mobileShockBtn = document.getElementById('mobileShockBtn');
const mobileGustBtn = document.getElementById('mobileGustBtn');
const mobileSolarBtn = document.getElementById('mobileSolarBtn');
const mobileRiftBtn = document.getElementById('mobileRiftBtn');
const mobilePhantomBtn = document.getElementById('mobilePhantomBtn');
const mobileWallBtn = document.getElementById('mobileWallBtn');
const mobileRewindBtn = document.getElementById('mobileRewindBtn');

const skillButtons = {
  fire: mobileFireBtn,
  hook: mobileHookBtn,
  blink: mobileTeleportBtn,
  shield: mobileShieldBtn,
  prism: mobilePrismBtn,
  charge: mobileChargeBtn,
  shock: mobileShockBtn,
  gust: mobileGustBtn,
  solar: mobileSolarBtn,
  rift: mobileRiftBtn,
  phantom: mobilePhantomBtn,
  wall: mobileWallBtn,
  rewind: mobileRewindBtn,
};
