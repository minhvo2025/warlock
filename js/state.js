export const state = {
    canvas: document.getElementById('game'),
    ctx: document.getElementById('game').getContext('2d'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewCtx: document.getElementById('previewCanvas').getContext('2d'),
    gameState: 'lobby',
    menuOpen: false,
    dummyEnabled: true,
    hudVisible: true,
    musicMuted: false,
    keys: {},
    mouse: { x: 0, y: 0 },
    moveStick: { active: false, dx: 0, dy: 0, touchId: null, mouseDown: false },
    projectiles: [],
    particles: [],
    damageTexts: [],
    obstacles: [],
    hooks: [],
    potions: [],
    arena: { cx: 0, cy: 0, baseRadius: 0, radius: 0, shrinkInterval: 20, shrinkTimer: 20, shrinkStep: 26, minRadius: 190 },
    player: {
      name: 'Player', x: 0, y: 0, vx: 0, vy: 0, r: 18, speed: 280, hp: 100, maxHp: 100,
      fireCooldown: 0.45, hookCooldown: 1.8, teleportCooldown: 2.5, shieldCooldown: 4.5,
      fireReadyAt: 0, hookReadyAt: 0, teleportReadyAt: 0, shieldReadyAt: 0, teleportDistance: 150, shieldUntil: 0,
      alive: true, deadReason: '', score: 0, bodyColor: '#d9d9ff', wandColor: '#7c4dff', aimX: 1, aimY: 0
    },
    dummy: {
      name: 'Dummy', x: 0, y: 0, vx: 0, vy: 0, r: 18, speed: 185, hp: 100, maxHp: 100,
      alive: true, deadReason: '', fireCooldown: 0.9, hookCooldown: 3.1,
      fireReadyAt: 0, hookReadyAt: 0, aiStrafeDir: 1, aiSwitchTimer: 0, aiMoveTimer: 0, targetX: 0, targetY: 0
    },
    profile: {
      wlk: 0, musicMuted: false, aimSensitivity: 0.7,
      store: { potionBoost: false, cooldownCharm: false, musicPack: false, wizardHat: false, beanie: false, crown: false, strawHat: false, sweater: false, boots: false },
      equipped: { hat: null, sweater: false, boots: false }
    }
};
