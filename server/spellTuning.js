const ABILITY_IDS = Object.freeze({
  FIREBLAST: 'fireblast',
  BLINK: 'blink',
  SHIELD: 'shield',
  GUST: 'gust',
  CHARGE: 'charge',
  SHOCK: 'shock',
  HOOK: 'hook',
  WALL: 'wall',
  REWIND: 'rewind'
});

// Offline arena uses pixels with player radius 18.
// Multiplayer arena uses world units with player radius 0.72.
// 0.72 / 18 = 0.04 world-units per offline pixel.
const OFFLINE_PX_TO_WORLD = 0.04;
const toWorldUnits = (pixels) => Number((Number(pixels) * OFFLINE_PX_TO_WORLD).toFixed(4));
// Small compensation so multiplayer authoritative updates feel as snappy as offline local sim.
const MULTIPLAYER_SPEED_COMPENSATION = 1.22;
const toWorldUnitsCompensated = (pixels) =>
  Number((Number(pixels) * MULTIPLAYER_SPEED_COMPENSATION * OFFLINE_PX_TO_WORLD).toFixed(4));

const DEFAULT_SPELL_TUNING = Object.freeze({
  [ABILITY_IDS.FIREBLAST]: Object.freeze({
    role: 'aggression',
    cooldownMs: 450,
    castDelayMs: 0,
    range: toWorldUnitsCompensated(620 * 1.3),
    durationMs: 0,
    damage: 6,
    speed: toWorldUnitsCompensated(620),
    lifetimeMs: 1300,
    spawnOffset: toWorldUnits(28), // player.r + 10 in offline mode
    hitRadius: toWorldUnits(7),
    knockbackImpulse: toWorldUnits(360),
    hitInvulnMs: 120
  }),
  [ABILITY_IDS.BLINK]: Object.freeze({
    role: 'mobility',
    cooldownMs: 2500,
    castDelayMs: 0,
    range: toWorldUnits(150),
    damage: 0,
    knockbackImpulse: 0,
    durationMs: 0,
    distance: toWorldUnits(150)
  }),
  [ABILITY_IDS.SHIELD]: Object.freeze({
    role: 'defense',
    cooldownMs: 4500,
    castDelayMs: 0,
    range: 0,
    damage: 0,
    knockbackImpulse: 0,
    durationMs: 1000
  }),
  [ABILITY_IDS.GUST]: Object.freeze({
    role: 'control',
    cooldownMs: 6000,
    castDelayMs: 0,
    range: toWorldUnits(120),
    damage: 6,
    durationMs: 0,
    knockbackImpulse: toWorldUnits(540)
  }),
  [ABILITY_IDS.CHARGE]: Object.freeze({
    role: 'aggression',
    cooldownMs: 5500,
    castDelayMs: 0,
    range: toWorldUnits(150),
    damage: 8,
    durationMs: Math.round((150 / (760 * MULTIPLAYER_SPEED_COMPENSATION)) * 1000),
    speed: toWorldUnitsCompensated(760),
    distance: toWorldUnits(150),
    hitRadius: toWorldUnits(26), // offline hit threshold: player.r + target.r + 8
    knockbackImpulse: toWorldUnits(720)
  }),
  [ABILITY_IDS.SHOCK]: Object.freeze({
    role: 'aggression',
    cooldownMs: 3200,
    castDelayMs: 0,
    range: toWorldUnits(115),
    damage: 10,
    durationMs: 0,
    halfAngleDeg: 30,
    knockbackImpulse: toWorldUnits(680)
  }),
  [ABILITY_IDS.HOOK]: Object.freeze({
    role: 'control',
    cooldownMs: 1800,
    castDelayMs: 0,
    range: toWorldUnits(150),
    damage: 8,
    durationMs: Math.round((1 / 3.5) * 1000), // offline hook flight: progress += dt * 3.5
    speed: toWorldUnits(150 * 3.5),
    lifetimeMs: Math.round((1 / 3.5) * 1000),
    spawnOffset: 0,
    hitRadius: toWorldUnits(6),
    pullTargetDistance: toWorldUnits(42) // caster.r + target.r + 6 in offline mode
  }),
  [ABILITY_IDS.WALL]: Object.freeze({
    role: 'control',
    cooldownMs: 8000,
    castDelayMs: 0,
    range: toWorldUnits(60),
    damage: 0,
    knockbackImpulse: 0,
    durationMs: 3500,
    spawnOffset: toWorldUnits(60),
    halfLength: toWorldUnits(87), // wallLength/2 + segmentRadius
    halfThickness: toWorldUnits(12)
  }),
  [ABILITY_IDS.REWIND]: Object.freeze({
    role: 'mobility',
    cooldownMs: 9000,
    castDelayMs: 0,
    range: 0,
    damage: 0,
    knockbackImpulse: 0,
    durationMs: 0,
    lookbackMs: 1000,
    historyMs: 1350,
    historyIntervalMs: 30
  })
});

const DEFAULT_BY_ID = Object.freeze(
  Object.keys(DEFAULT_SPELL_TUNING).reduce((acc, abilityId) => {
    acc[String(abilityId)] = DEFAULT_SPELL_TUNING[abilityId];
    return acc;
  }, {})
);

const overridesById = new Map();

function normalizeAbilityId(abilityId) {
  return String(abilityId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z_]/g, '');
}

function clampNumber(value, min = 0, max = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}

function getDefaultSpellTuning(abilityId) {
  const normalized = normalizeAbilityId(abilityId);
  return DEFAULT_BY_ID[normalized] || null;
}

function getSpellTuning(abilityId) {
  const normalized = normalizeAbilityId(abilityId);
  const defaults = DEFAULT_BY_ID[normalized];
  if (!defaults) return null;
  const override = overridesById.get(normalized);
  const merged = {
    ...defaults,
    ...(override || {})
  };
  if (normalized === ABILITY_IDS.SHOCK) {
    const halfAngleDeg = clampNumber(merged.halfAngleDeg, 1, 89) ?? defaults.halfAngleDeg;
    merged.halfAngleDeg = halfAngleDeg;
    merged.cosThreshold = Math.cos((halfAngleDeg * Math.PI) / 180);
  }
  return merged;
}

function getAllSpellTuning() {
  const snapshot = {};
  Object.keys(DEFAULT_BY_ID).forEach((abilityId) => {
    snapshot[abilityId] = getSpellTuning(abilityId);
  });
  return snapshot;
}

function sanitizeOverridePatch(abilityId, patch) {
  const defaults = getDefaultSpellTuning(abilityId);
  if (!defaults || !patch || typeof patch !== 'object') return {};
  const sanitized = {};
  Object.keys(patch).forEach((key) => {
    if (!(key in defaults)) return;
    if (key === 'role') {
      sanitized.role = String(patch.role || defaults.role).trim().toLowerCase();
      return;
    }
    const nextValue = clampNumber(patch[key], 0);
    if (nextValue === null) return;
    sanitized[key] = nextValue;
  });
  return sanitized;
}

function setSpellTuningOverride(abilityId, patch) {
  const normalized = normalizeAbilityId(abilityId);
  const defaults = DEFAULT_BY_ID[normalized];
  if (!defaults) {
    return { ok: false, code: 'UNKNOWN_ABILITY', message: 'Unknown ability.' };
  }
  const sanitizedPatch = sanitizeOverridePatch(normalized, patch);
  if (!Object.keys(sanitizedPatch).length) {
    return { ok: false, code: 'INVALID_PATCH', message: 'No valid tuning fields provided.' };
  }
  const previous = overridesById.get(normalized) || {};
  const merged = {
    ...previous,
    ...sanitizedPatch
  };
  overridesById.set(normalized, merged);
  return {
    ok: true,
    abilityId: normalized,
    tuning: getSpellTuning(normalized)
  };
}

function resetSpellTuningOverride(abilityId) {
  if (!abilityId || String(abilityId).trim().toLowerCase() === 'all') {
    overridesById.clear();
    return { ok: true, reset: 'all', tuning: getAllSpellTuning() };
  }
  const normalized = normalizeAbilityId(abilityId);
  const defaults = DEFAULT_BY_ID[normalized];
  if (!defaults) {
    return { ok: false, code: 'UNKNOWN_ABILITY', message: 'Unknown ability.' };
  }
  overridesById.delete(normalized);
  return {
    ok: true,
    abilityId: normalized,
    reset: normalized,
    tuning: getSpellTuning(normalized)
  };
}

function getSpellIdentitySummary() {
  const result = {};
  Object.keys(DEFAULT_BY_ID).forEach((abilityId) => {
    const tuning = getSpellTuning(abilityId);
    result[abilityId] = {
      role: tuning?.role || 'utility',
      cooldownMs: Number(tuning?.cooldownMs) || 0,
      castDelayMs: Number(tuning?.castDelayMs) || 0
    };
  });
  return result;
}

module.exports = {
  ABILITY_IDS,
  DEFAULT_SPELL_TUNING,
  getDefaultSpellTuning,
  getSpellTuning,
  getAllSpellTuning,
  setSpellTuningOverride,
  resetSpellTuningOverride,
  getSpellIdentitySummary
};
