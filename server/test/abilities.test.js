'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  rooms,
  playerRoomBySocketId,
  ABILITY_IDS,
  MATCH_PHASE_COMBAT,
  ROOM_STATES,
  createRoomPlayer,
  createMatchForRoom,
  processMatchTickForRoom,
  handleAbilityCastRequest,
  executeAbilityCast,
  getAbilityDef,
  setAbilityReadyAt,
  getAbilityRemainingMs,
  cleanupRoomMatchState
} = require('../index');

const DRAFTED_ABILITY_IDS = [
  ABILITY_IDS.BLINK,
  ABILITY_IDS.SHIELD,
  ABILITY_IDS.PRISM,
  ABILITY_IDS.GUST,
  ABILITY_IDS.CHARGE,
  ABILITY_IDS.SHOCK,
  ABILITY_IDS.HOOK,
  ABILITY_IDS.SOLAR,
  ABILITY_IDS.RIFT,
  ABILITY_IDS.PHANTOM,
  ABILITY_IDS.WALL,
  ABILITY_IDS.REWIND
];
let fixtureCounter = 0;

function clearSharedState() {
  rooms.clear();
  playerRoomBySocketId.clear();
}

function setLoadout(matchPlayer, draftedSpells) {
  const drafted = Array.isArray(draftedSpells) ? draftedSpells.slice(0, 3) : [];
  matchPlayer.draftedSpells = drafted.slice();
  matchPlayer.loadoutSpells = drafted.slice();
  matchPlayer.loadout = ['fireblast', ...drafted];
}

function createCombatFixture(options = {}) {
  fixtureCounter += 1;
  const roomCode = options.roomCode || `T${String(fixtureCounter).padStart(5, '0')}`;
  const socketA = options.socketA || 'socket-a';
  const socketB = options.socketB || 'socket-b';
  const room = {
    code: roomCode,
    players: [createRoomPlayer(socketA, 1), createRoomPlayer(socketB, 2)],
    match: null,
    state: ROOM_STATES.WAITING,
    createdAt: Date.now()
  };
  rooms.set(roomCode, room);
  playerRoomBySocketId.set(socketA, roomCode);
  playerRoomBySocketId.set(socketB, roomCode);
  createMatchForRoom(room);
  room.match.phase = MATCH_PHASE_COMBAT;
  room.state = ROOM_STATES.COMBAT;

  const player1 = room.match.players.find((player) => Number(player.matchPlayerNumber) === 1);
  const player2 = room.match.players.find((player) => Number(player.matchPlayerNumber) === 2);
  assert.ok(player1, 'player1 must exist');
  assert.ok(player2, 'player2 must exist');

  setLoadout(player1, options.player1DraftedSpells || []);
  setLoadout(player2, options.player2DraftedSpells || []);
  return {
    room,
    player1,
    player2,
    socketA,
    socketB
  };
}

function castBySocket(socketId, abilityId, payload = {}) {
  const events = [];
  const socket = {
    id: socketId,
    emit(eventName, eventPayload) {
      events.push({ eventName, eventPayload });
    }
  };

  return new Promise((resolve) => {
    handleAbilityCastRequest(
      socket,
      abilityId,
      {
        abilityId,
        ...payload
      },
      (ackPayload) => {
        resolve({ ackPayload, events });
      }
    );
  });
}

function tickRoom(room, steps = 1, stepMs = 50) {
  let tickAt = Number(room.match?.lastTickAt) || Date.now();
  for (let index = 0; index < steps; index += 1) {
    tickAt += stepMs;
    processMatchTickForRoom(room, tickAt);
  }
  return tickAt;
}

test.beforeEach(() => {
  clearSharedState();
  fixtureCounter = 0;
});

test.afterEach(() => {
  clearSharedState();
});

for (const abilityId of DRAFTED_ABILITY_IDS) {
  test(`cast validation ${abilityId} accepts drafted, rejects undrafted, then rejects cooldown`, async () => {
    const acceptedFixture = createCombatFixture({
      player1DraftedSpells: [abilityId]
    });
    const accepted = await castBySocket(acceptedFixture.socketA, abilityId, { direction: { x: 1, y: 0 } });
    assert.equal(accepted.ackPayload.ok, true, `expected ${abilityId} to cast successfully`);

    await new Promise((resolve) => setTimeout(resolve, 80));
    const cooldown = await castBySocket(acceptedFixture.socketA, abilityId, { direction: { x: 1, y: 0 } });
    assert.equal(cooldown.ackPayload.ok, false, `expected ${abilityId} cooldown rejection`);
    assert.equal(cooldown.ackPayload.code, 'ABILITY_COOLDOWN');

    clearSharedState();
    const rejectedFixture = createCombatFixture({
      player1DraftedSpells: []
    });
    const rejected = await castBySocket(rejectedFixture.socketA, abilityId, { direction: { x: 1, y: 0 } });
    assert.equal(rejected.ackPayload.ok, false, `expected ${abilityId} undrafted rejection`);
    assert.equal(rejected.ackPayload.code, 'ABILITY_NOT_DRAFTED');
  });
}

test('cast validation fireblast accepts base cast and enforces cooldown', async () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: []
  });
  const accepted = await castBySocket(fixture.socketA, ABILITY_IDS.FIREBLAST, { direction: { x: 1, y: 0 } });
  assert.equal(accepted.ackPayload.ok, true, 'expected fireblast to cast successfully');

  await new Promise((resolve) => setTimeout(resolve, 80));
  const cooldown = await castBySocket(fixture.socketA, ABILITY_IDS.FIREBLAST, { direction: { x: 1, y: 0 } });
  assert.equal(cooldown.ackPayload.ok, false, 'expected fireblast cooldown rejection');
  assert.equal(cooldown.ackPayload.code, 'ABILITY_COOLDOWN');
});

test('blink runtime: repositions player in cast direction', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.BLINK]
  });
  const blinkDef = getAbilityDef(ABILITY_IDS.BLINK);
  assert.ok(blinkDef, 'blink ability def should exist');
  fixture.player1.position = { x: -5, y: 0 };

  const blink = executeAbilityCast(fixture.room, fixture.player1, blinkDef, { direction: { x: 1, y: 0 } }, Date.now());
  assert.equal(blink.ok, true);
  assert.ok(fixture.player1.position.x > -2.2, 'blink should move player forward');
});

test('shield runtime: blocks incoming fireblast hit', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.FIREBLAST],
    player2DraftedSpells: [ABILITY_IDS.SHIELD]
  });
  const shieldDef = getAbilityDef(ABILITY_IDS.SHIELD);
  const fireblastDef = getAbilityDef(ABILITY_IDS.FIREBLAST);
  assert.ok(shieldDef, 'shield ability def should exist');
  assert.ok(fireblastDef, 'fireblast ability def should exist');
  fixture.player1.position = { x: -2, y: 0 };
  fixture.player2.position = { x: 2, y: 0 };

  const shield = executeAbilityCast(fixture.room, fixture.player2, shieldDef, {}, Date.now());
  assert.equal(shield.ok, true);
  const blast = executeAbilityCast(fixture.room, fixture.player1, fireblastDef, { direction: { x: 1, y: 0 } }, Date.now() + 5);
  assert.equal(blast.ok, true);

  tickRoom(fixture.room, 20, 50);
  assert.equal(
    fixture.room.match.hitEvents.some((event) => event.type === 'fireblast_hit'),
    false,
    'shield should block fireblast hit events'
  );
  assert.equal(
    fixture.room.match.hitEvents.some((event) => event.type === 'shield_block'),
    true,
    'shield block event should be emitted'
  );
});

test('shield runtime: reduces movement speed by 40% while active', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.SHIELD]
  });
  const shieldDef = getAbilityDef(ABILITY_IDS.SHIELD);
  assert.ok(shieldDef, 'shield ability def should exist');

  fixture.player1.position = { x: 0, y: 0 };
  fixture.player1.velocity = { x: 0, y: 0 };
  fixture.player1.input = { x: 1, y: 0 };
  tickRoom(fixture.room, 1, 100);
  const unshieldedDistance = Number(fixture.player1.position.x) || 0;
  assert.ok(unshieldedDistance > 0, 'baseline movement should advance');

  fixture.player1.position = { x: 0, y: 0 };
  fixture.player1.velocity = { x: 0, y: 0 };
  fixture.player1.input = { x: 1, y: 0 };
  const shieldCast = executeAbilityCast(fixture.room, fixture.player1, shieldDef, {}, Date.now());
  assert.equal(shieldCast.ok, true);

  tickRoom(fixture.room, 1, 100);
  const shieldedDistance = Number(fixture.player1.position.x) || 0;
  assert.ok(shieldedDistance > 0, 'shielded movement should still advance');
  assert.ok(shieldedDistance < unshieldedDistance, 'shield should reduce movement speed');

  const speedRatio = shieldedDistance / unshieldedDistance;
  assert.ok(
    Math.abs(speedRatio - 0.60) <= 0.03,
    `shielded movement ratio should be near 0.60, got ${speedRatio.toFixed(3)}`
  );
});

test('prism runtime: reflects frontal fireblast and stops frontal charge', async () => {
  const reflectFixture = createCombatFixture({
    player1DraftedSpells: [],
    player2DraftedSpells: [ABILITY_IDS.PRISM]
  });
  reflectFixture.player1.position = { x: -2.6, y: 0 };
  reflectFixture.player2.position = { x: 0, y: 0 };
  reflectFixture.player2.aim = { x: -1, y: 0 };

  const prismDef = getAbilityDef(ABILITY_IDS.PRISM);
  const fireblastDef = getAbilityDef(ABILITY_IDS.FIREBLAST);
  assert.ok(prismDef, 'prism ability def should exist');
  assert.ok(fireblastDef, 'fireblast ability def should exist');

  const prismCast = executeAbilityCast(reflectFixture.room, reflectFixture.player2, prismDef, {}, Date.now());
  assert.equal(prismCast.ok, true);
  const blastCast = executeAbilityCast(
    reflectFixture.room,
    reflectFixture.player1,
    fireblastDef,
    { direction: { x: 1, y: 0 } },
    Date.now() + 5
  );
  assert.equal(blastCast.ok, true);
  tickRoom(reflectFixture.room, 20, 50);

  assert.ok(
    reflectFixture.room.match.hitEvents.some((event) =>
      event.type === 'prism_reflect'
      && event.metadata?.reflectedAbilityId === ABILITY_IDS.FIREBLAST
    ),
    'prism should reflect fireblast'
  );
  assert.ok(
    reflectFixture.room.match.hitEvents.some((event) =>
      event.type === 'fireblast_hit'
      && Number(event.sourcePlayerNumber) === 2
      && Number(event.targetPlayerNumber) === 1
    ),
    'reflected fireblast should be owned by prism caster'
  );

  clearSharedState();
  const chargeFixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.CHARGE],
    player2DraftedSpells: [ABILITY_IDS.PRISM]
  });
  chargeFixture.player1.position = { x: -1.1, y: 0 };
  chargeFixture.player2.position = { x: -0.2, y: 0 };
  chargeFixture.player2.aim = { x: -1, y: 0 };

  const chargePrism = executeAbilityCast(chargeFixture.room, chargeFixture.player2, prismDef, {}, Date.now());
  assert.equal(chargePrism.ok, true);
  const castCharge = await castBySocket(chargeFixture.socketA, ABILITY_IDS.CHARGE, { direction: { x: 1, y: 0 } });
  assert.equal(castCharge.ackPayload.ok, true);
  tickRoom(chargeFixture.room, 8, 50);

  assert.ok(
    chargeFixture.room.match.hitEvents.some((event) => event.type === 'prism_block_charge'),
    'prism should stop charge collisions from the front'
  );
  assert.equal(
    chargeFixture.room.match.hitEvents.filter((event) => event.type === 'charge_hit').length,
    0,
    'charge damage should not apply through prism block'
  );
  assert.ok(chargeFixture.player2.velocity.x > 0, 'prism user should receive partial pushback');
});

test('gust runtime: radial push is away from caster and out-of-range misses', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.GUST]
  });
  const gustDef = getAbilityDef(ABILITY_IDS.GUST);
  assert.ok(gustDef, 'gust ability def should exist');
  fixture.player1.position = { x: 0, y: 0 };
  fixture.player2.position = { x: 2.4, y: 0 };

  const hit = executeAbilityCast(fixture.room, fixture.player1, gustDef, { direction: { x: 1, y: 0 } }, Date.now());
  assert.equal(hit.ok, true);
  assert.equal(hit.hit, true);
  assert.ok(fixture.player2.velocity.x > 0, 'gust hit should push target');

  fixture.player2.position = { x: 0, y: 2.4 };
  fixture.player2.velocity = { x: 0, y: 0 };
  const oppositeAimHit = executeAbilityCast(fixture.room, fixture.player1, gustDef, { direction: { x: -1, y: 0 } }, Date.now() + 250);
  assert.equal(oppositeAimHit.ok, true);
  assert.equal(oppositeAimHit.hit, true);
  assert.ok(fixture.player2.velocity.y > 0, 'gust should still push away from caster when cast opposite aim');

  fixture.player2.position = { x: 8, y: 0 };
  fixture.player2.velocity = { x: 0, y: 0 };
  const gustCastEventCountBeforeMiss = fixture.room.match.hitEvents.filter((event) => event.type === 'gust_cast').length;
  const miss = executeAbilityCast(fixture.room, fixture.player1, gustDef, { direction: { x: 1, y: 0 } }, Date.now() + 800);
  assert.equal(miss.ok, true);
  assert.equal(miss.hit, false);
  const gustCastEventsAfterMiss = fixture.room.match.hitEvents.filter((event) => event.type === 'gust_cast');
  assert.equal(
    gustCastEventsAfterMiss.length,
    gustCastEventCountBeforeMiss + 1,
    'gust miss should emit a non-hit cast event for visual feedback'
  );
  assert.equal(
    String(gustCastEventsAfterMiss[gustCastEventsAfterMiss.length - 1]?.metadata?.reason || ''),
    'out_of_range',
    'gust miss cast event should annotate reason metadata'
  );
});

test('gust runtime: cast request does not require aim direction payload', async () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.GUST]
  });
  fixture.player1.position = { x: 0, y: 0 };
  fixture.player1.aim = { x: 0, y: 0 };
  fixture.player2.position = { x: -2.3, y: 0 };
  fixture.player2.velocity = { x: 0, y: 0 };

  const cast = await castBySocket(fixture.socketA, ABILITY_IDS.GUST, {});
  assert.equal(cast.ackPayload.ok, true);
  tickRoom(fixture.room, 4, 50);
  assert.ok(fixture.player2.velocity.x < 0, 'gust should push target away from caster even without direction payload');
});

test('charge runtime: hit and miss outcomes are deterministic', async () => {
  const hitFixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.CHARGE]
  });
  hitFixture.player1.position = { x: -1.0, y: 0 };
  hitFixture.player2.position = { x: -0.2, y: 0 };
  const castHit = await castBySocket(hitFixture.socketA, ABILITY_IDS.CHARGE, { direction: { x: 1, y: 0 } });
  assert.equal(castHit.ackPayload.ok, true);
  tickRoom(hitFixture.room, 8, 50);
  assert.ok(
    hitFixture.room.match.hitEvents.some((event) => event.type === 'charge_hit'),
    'charge hit event should exist'
  );
  assert.ok(hitFixture.player2.velocity.x > 0, 'charge hit should push target forward');

  clearSharedState();
  const missFixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.CHARGE]
  });
  missFixture.player1.position = { x: -6, y: 0 };
  missFixture.player2.position = { x: 6, y: 0 };
  const castMiss = await castBySocket(missFixture.socketA, ABILITY_IDS.CHARGE, { direction: { x: 1, y: 0 } });
  assert.equal(castMiss.ackPayload.ok, true);
  tickRoom(missFixture.room, 32, 50);
  assert.equal(
    missFixture.room.match.hitEvents.filter((event) => event.type === 'charge_hit').length,
    0,
    'charge miss should not create a hit event'
  );
  assert.equal(Boolean(missFixture.player1.activeEffects?.charge?.active), false, 'charge should end');
});

test('shock runtime: front hit succeeds and side cast misses', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.SHOCK]
  });
  fixture.player1.position = { x: 0, y: 0 };
  fixture.player2.position = { x: 2.1, y: 0 };
  const shockDef = getAbilityDef(ABILITY_IDS.SHOCK);
  assert.ok(shockDef, 'shock ability def should exist');

  const hit = executeAbilityCast(fixture.room, fixture.player1, shockDef, { direction: { x: 1, y: 0 } }, Date.now());
  assert.equal(hit.ok, true);
  assert.equal(hit.hit, true);

  fixture.player2.position = { x: 0, y: 2.2 };
  const miss = executeAbilityCast(fixture.room, fixture.player1, shockDef, { direction: { x: 1, y: 0 } }, Date.now() + 1000);
  assert.equal(miss.ok, true);
  assert.equal(miss.hit, false);
});

test('hook runtime: hit pulls target and miss expires cleanly', () => {
  const hitFixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.HOOK]
  });
  hitFixture.player1.position = { x: -2, y: 0 };
  hitFixture.player2.position = { x: 2, y: 0 };
  const hookDef = getAbilityDef(ABILITY_IDS.HOOK);
  assert.ok(hookDef, 'hook ability def should exist');

  const castHit = executeAbilityCast(
    hitFixture.room,
    hitFixture.player1,
    hookDef,
    { direction: { x: 1, y: 0 } },
    Date.now()
  );
  assert.equal(castHit.ok, true);
  tickRoom(hitFixture.room, 24, 50);
  assert.ok(
    hitFixture.room.match.hitEvents.some((event) => event.type === 'hook_pull'),
    'hook pull event should exist'
  );
  assert.ok(hitFixture.player2.position.x < 2, 'hook hit should pull target');

  clearSharedState();
  const missFixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.HOOK]
  });
  missFixture.player1.position = { x: -2, y: 0 };
  missFixture.player2.position = { x: 2, y: 5 };
  const castMiss = executeAbilityCast(
    missFixture.room,
    missFixture.player1,
    hookDef,
    { direction: { x: 1, y: 0 } },
    Date.now()
  );
  assert.equal(castMiss.ok, true);
  tickRoom(missFixture.room, 26, 50);
  assert.equal(
    missFixture.room.match.hitEvents.filter((event) => event.type === 'hook_pull').length,
    0,
    'hook miss should not produce pull event'
  );
  assert.equal(missFixture.room.match.projectiles.length, 0, 'hook projectile should expire cleanly');
});

test('solar runtime: projectile explodes, damages, and applies non-stacking distortion debuff', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.SOLAR]
  });
  fixture.player1.position = { x: -3.5, y: 0 };
  fixture.player2.position = { x: -0.2, y: 0 };
  fixture.player1.aim = { x: 1, y: 0 };

  const solarDef = getAbilityDef(ABILITY_IDS.SOLAR);
  assert.ok(solarDef, 'solar ability def should exist');

  const firstCastAt = Date.now();
  const first = executeAbilityCast(
    fixture.room,
    fixture.player1,
    solarDef,
    { direction: { x: 1, y: 0 } },
    firstCastAt
  );
  assert.equal(first.ok, true);
  tickRoom(fixture.room, 20, 50);

  const solarHit = fixture.room.match.hitEvents.find((event) => event.type === 'solar_hit');
  assert.ok(solarHit, 'solar hit event should exist');
  assert.ok(
    fixture.room.match.hitEvents.some((event) => event.type === 'solar_explode'),
    'solar explosion event should exist'
  );
  assert.ok(fixture.player2.currentHealth < fixture.player2.maxHealth, 'solar should deal damage');
  const firstDebuffUntil = Number(fixture.player2.activeEffects?.solarDistortionUntil) || 0;
  assert.ok(firstDebuffUntil > firstCastAt, 'solar should apply distortion debuff');

  const secondCastAt = firstCastAt + 450;
  const second = executeAbilityCast(
    fixture.room,
    fixture.player1,
    solarDef,
    { direction: { x: 1, y: 0 } },
    secondCastAt
  );
  assert.equal(second.ok, true);
  tickRoom(fixture.room, 20, 50);
  const secondDebuffUntil = Number(fixture.player2.activeEffects?.solarDistortionUntil) || 0;
  assert.ok(
    secondDebuffUntil >= firstDebuffUntil,
    'solar reapply should refresh duration without requiring intensity stacking'
  );
});

test('solar runtime: max-range miss does not damage or debuff opponent', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.SOLAR]
  });
  fixture.player1.position = { x: -5, y: 0 };
  fixture.player2.position = { x: 5, y: 0 };

  const solarDef = getAbilityDef(ABILITY_IDS.SOLAR);
  assert.ok(solarDef, 'solar ability def should exist');

  const castAt = Date.now();
  const cast = executeAbilityCast(
    fixture.room,
    fixture.player1,
    solarDef,
    { direction: { x: -1, y: 0 } },
    castAt
  );
  assert.equal(cast.ok, true);

  tickRoom(fixture.room, 40, 50);

  assert.equal(
    fixture.room.match.hitEvents.filter((event) => event.type === 'solar_hit').length,
    0,
    'solar miss should not emit solar_hit events'
  );
  const explodeEvent = fixture.room.match.hitEvents.find((event) => event.type === 'solar_explode');
  assert.ok(explodeEvent, 'solar miss should still emit explosion event');
  assert.equal(Number(explodeEvent?.metadata?.hitCount) || 0, 0, 'miss explosion should have zero hit count');
  assert.equal(fixture.player2.currentHealth, fixture.player2.maxHealth, 'solar miss should not damage opponent');
  assert.equal(
    Number(fixture.player2.activeEffects?.solarDistortionUntil) || 0,
    0,
    'solar miss should not apply distortion debuff'
  );
});

test('rift runtime: links two-step portals, allows one use per portal side, and expires pending placement', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.RIFT]
  });
  const riftDef = getAbilityDef(ABILITY_IDS.RIFT);
  assert.ok(riftDef, 'rift ability def should exist');

  const now = Date.now();
  fixture.player1.position = { x: -2.5, y: 0 };
  const placeA = executeAbilityCast(
    fixture.room,
    fixture.player1,
    riftDef,
    { direction: { x: 1, y: 0 } },
    now
  );
  assert.equal(placeA.ok, true);
  assert.equal(placeA.riftStep, 'A');
  assert.ok(fixture.player1.activeEffects?.riftPending, 'rift step A should enter pending placement');

  const placeB = executeAbilityCast(
    fixture.room,
    fixture.player1,
    riftDef,
    { direction: { x: 0, y: 1 } },
    now + 220
  );
  assert.equal(placeB.ok, true);
  assert.equal(placeB.riftStep, 'B');
  assert.equal(fixture.room.match.rifts.length, 1, 'linked rift should spawn');

  const linkedRift = fixture.room.match.rifts[0];
  fixture.player2.position = {
    x: linkedRift.portalA.x,
    y: linkedRift.portalA.y
  };
  fixture.player2.velocity = { x: 2.0, y: 0.4 };
  const teleportCountBefore = fixture.room.match.hitEvents.filter((event) => event.type === 'rift_teleport').length;
  tickRoom(fixture.room, 2, 50);
  const teleportCountAfter = fixture.room.match.hitEvents.filter((event) => event.type === 'rift_teleport').length;
  assert.ok(teleportCountAfter > teleportCountBefore, 'rift teleport event should occur after delay');
  assert.ok(
    Math.hypot(
      fixture.player2.position.x - linkedRift.portalB.x,
      fixture.player2.position.y - linkedRift.portalB.y
    ) < 3.2,
    'teleported player should exit near opposite portal'
  );
  assert.ok(Math.abs(fixture.player2.velocity.x) < 2.0, 'rift should reduce exit velocity magnitude');

  const teleportCountAfterPortalAUse = fixture.room.match.hitEvents.filter((event) => event.type === 'rift_teleport').length;
  tickRoom(fixture.room, 4, 50);
  assert.equal(
    fixture.room.match.hitEvents.filter((event) => event.type === 'rift_teleport').length,
    teleportCountAfterPortalAUse,
    'rift reuse lockout should prevent immediate retrigger'
  );

  fixture.player2.position = {
    x: linkedRift.portalA.x,
    y: linkedRift.portalA.y
  };
  tickRoom(fixture.room, 12, 50);
  assert.equal(
    fixture.room.match.hitEvents.filter((event) => event.type === 'rift_teleport').length,
    teleportCountAfterPortalAUse,
    'rift portal A should only allow one entry use total'
  );

  fixture.player2.position = {
    x: linkedRift.portalB.x,
    y: linkedRift.portalB.y
  };
  tickRoom(fixture.room, 2, 50);
  const teleportCountAfterPortalBUse = fixture.room.match.hitEvents.filter((event) => event.type === 'rift_teleport').length;
  assert.ok(
    teleportCountAfterPortalBUse > teleportCountAfterPortalAUse,
    'rift portal B should still allow its one entry use'
  );

  fixture.player2.position = {
    x: linkedRift.portalB.x,
    y: linkedRift.portalB.y
  };
  tickRoom(fixture.room, 12, 50);
  assert.equal(
    fixture.room.match.hitEvents.filter((event) => event.type === 'rift_teleport').length,
    teleportCountAfterPortalBUse,
    'rift portal B should only allow one entry use total'
  );

  clearSharedState();
  const timeoutFixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.RIFT]
  });
  timeoutFixture.player1.position = { x: -2.2, y: 0 };
  const timeoutStepA = executeAbilityCast(
    timeoutFixture.room,
    timeoutFixture.player1,
    riftDef,
    { direction: { x: 1, y: 0 } },
    Date.now()
  );
  assert.equal(timeoutStepA.ok, true);
  assert.equal(timeoutStepA.riftStep, 'A');
  tickRoom(timeoutFixture.room, 130, 50);
  assert.equal(timeoutFixture.player1.activeEffects?.riftPending || null, null, 'unfinished rift placement should timeout cleanly');
});

test('phantom runtime: vanish blocks targeting/casts, then splits illusion and clears after lifetime', async () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.PHANTOM],
    player2DraftedSpells: [ABILITY_IDS.SHOCK]
  });
  const phantomDef = getAbilityDef(ABILITY_IDS.PHANTOM);
  const shockDef = getAbilityDef(ABILITY_IDS.SHOCK);
  assert.ok(phantomDef, 'phantom ability def should exist');
  assert.ok(shockDef, 'shock ability def should exist');

  fixture.player1.position = { x: 0, y: 0 };
  fixture.player2.position = { x: -1.8, y: 0 };
  fixture.player2.aim = { x: 1, y: 0 };

  const castAt = Date.now();
  const phantomCast = executeAbilityCast(
    fixture.room,
    fixture.player1,
    phantomDef,
    {},
    castAt
  );
  assert.equal(phantomCast.ok, true);
  assert.ok((Number(fixture.player1.activeEffects?.phantom?.vanishUntil) || 0) > castAt, 'phantom vanish should begin immediately');

  const lockedDuringVanish = await castBySocket(
    fixture.socketA,
    ABILITY_IDS.FIREBLAST,
    { direction: { x: 1, y: 0 } }
  );
  assert.equal(lockedDuringVanish.ackPayload.ok, false);
  assert.equal(lockedDuringVanish.ackPayload.code, 'PHANTOM_VANISH_LOCKED');

  const blockedShock = executeAbilityCast(
    fixture.room,
    fixture.player2,
    shockDef,
    { direction: { x: 1, y: 0 } },
    castAt + 25
  );
  assert.equal(blockedShock.ok, true);
  assert.equal(blockedShock.hit, false);
  assert.equal(blockedShock.reason, 'target_untargetable');

  tickRoom(fixture.room, 8, 50);
  assert.ok(
    fixture.room.match.hitEvents.some((event) => event.type === 'phantom_split'),
    'phantom split event should be emitted'
  );
  const phantomStateAfterSplit = fixture.player1.activeEffects?.phantom;
  assert.equal(Boolean(phantomStateAfterSplit?.splitApplied), true, 'phantom split should apply after vanish');
  assert.ok((Number(phantomStateAfterSplit?.illusionExpiresAt) || 0) > castAt, 'phantom illusion should be active');
  assert.ok(phantomStateAfterSplit?.illusionPosition, 'phantom split should set illusion position');
  assert.ok(phantomStateAfterSplit?.illusionFacing, 'phantom split should set illusion facing');
  {
    const illusionPosition = phantomStateAfterSplit.illusionPosition;
    const illusionFacing = phantomStateAfterSplit.illusionFacing;
    const toOpponentX = fixture.player2.position.x - (Number(illusionPosition.x) || 0);
    const toOpponentY = fixture.player2.position.y - (Number(illusionPosition.y) || 0);
    const toOpponentDistance = Math.hypot(toOpponentX, toOpponentY);
    if (toOpponentDistance > 0.001) {
      const toOpponentUnitX = toOpponentX / toOpponentDistance;
      const toOpponentUnitY = toOpponentY / toOpponentDistance;
      const facingDot = ((Number(illusionFacing.x) || 0) * toOpponentUnitX)
        + ((Number(illusionFacing.y) || 0) * toOpponentUnitY);
      assert.ok(facingDot > 0.65, 'phantom illusion should face toward opponent');
    }
  }

  fixture.player2.position = {
    x: fixture.player1.position.x + 1.6,
    y: fixture.player1.position.y + 0.2
  };
  tickRoom(fixture.room, 3, 50);
  const phantomStateTracking = fixture.player1.activeEffects?.phantom;
  assert.ok(phantomStateTracking?.illusionPosition, 'phantom tracking should keep illusion position');
  assert.ok(phantomStateTracking?.illusionFacing, 'phantom tracking should keep illusion facing');
  {
    const trackingPosition = phantomStateTracking.illusionPosition;
    const trackingFacing = phantomStateTracking.illusionFacing;
    const toOpponentX = fixture.player2.position.x - (Number(trackingPosition.x) || 0);
    const toOpponentY = fixture.player2.position.y - (Number(trackingPosition.y) || 0);
    const toOpponentDistance = Math.hypot(toOpponentX, toOpponentY);
    if (toOpponentDistance > 0.001) {
      const toOpponentUnitX = toOpponentX / toOpponentDistance;
      const toOpponentUnitY = toOpponentY / toOpponentDistance;
      const trackingDot = ((Number(trackingFacing.x) || 0) * toOpponentUnitX)
        + ((Number(trackingFacing.y) || 0) * toOpponentUnitY);
      assert.ok(trackingDot > 0.45, 'phantom illusion facing should keep tracking opponent');
    }
  }

  fixture.player2.position = {
    x: fixture.player1.position.x - 1.4,
    y: fixture.player1.position.y
  };
  const hitAfterVanish = executeAbilityCast(
    fixture.room,
    fixture.player2,
    shockDef,
    { direction: { x: 1, y: 0 } },
    castAt + 500
  );
  assert.equal(hitAfterVanish.ok, true);
  assert.equal(hitAfterVanish.hit, true, 'real player should become targetable again after vanish ends');

  tickRoom(fixture.room, 44, 50);
  assert.equal(fixture.player1.activeEffects?.phantom || null, null, 'phantom state should clear after illusion lifetime');
});

test('wall runtime: blocks fireblast and movement path', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.WALL]
  });
  fixture.player1.position = { x: 0, y: 0 };
  fixture.player2.position = { x: 4, y: 0 };
  const wallDef = getAbilityDef(ABILITY_IDS.WALL);
  const fireblastDef = getAbilityDef(ABILITY_IDS.FIREBLAST);
  assert.ok(wallDef, 'wall ability def should exist');
  assert.ok(fireblastDef, 'fireblast ability def should exist');

  const wallCast = executeAbilityCast(
    fixture.room,
    fixture.player1,
    wallDef,
    { direction: { x: 1, y: 0 } },
    Date.now()
  );
  assert.equal(wallCast.ok, true);
  assert.equal(fixture.room.match.walls.length, 1, 'wall should spawn');

  const blastCast = executeAbilityCast(
    fixture.room,
    fixture.player2,
    fireblastDef,
    { direction: { x: -1, y: 0 } },
    Date.now() + 10
  );
  assert.equal(blastCast.ok, true);
  tickRoom(fixture.room, 30, 50);
  assert.equal(
    fixture.room.match.hitEvents.filter((event) => event.type === 'fireblast_hit').length,
    0,
    'fireblast should not pass through wall'
  );

  fixture.player2.position = { x: 2.5, y: 0 };
  fixture.player2.input = { x: -1, y: 0 };
  tickRoom(fixture.room, 3, 50);
  assert.ok(fixture.player2.position.x > 1.95, 'wall should block movement through barrier');
});

test('rewind runtime: rewinds to stable previous position', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: [ABILITY_IDS.REWIND]
  });
  const rewindDef = getAbilityDef(ABILITY_IDS.REWIND);
  assert.ok(rewindDef, 'rewind ability def should exist');

  const now = Date.now();
  fixture.player1.position = { x: 2.4, y: 0.2 };
  fixture.player1.positionHistory = [
    { x: -2.1, y: 0, timestamp: now - 1300 },
    { x: -1.7, y: 0.1, timestamp: now - 1020 },
    { x: 1.2, y: 0.2, timestamp: now - 250 }
  ];

  const rewind = executeAbilityCast(fixture.room, fixture.player1, rewindDef, {}, now);
  assert.equal(rewind.ok, true);
  assert.ok(rewind.destination.x < -1.4, 'rewind should move player close to 1s-old position');
});

test('cleanup resets temporary state and cooldowns for all new abilities', () => {
  const fixture = createCombatFixture({
    player1DraftedSpells: DRAFTED_ABILITY_IDS.slice(0, 3),
    player2DraftedSpells: DRAFTED_ABILITY_IDS.slice(2, 5)
  });
  const now = Date.now();

  setAbilityReadyAt(fixture.player1, ABILITY_IDS.CHARGE, now + 4000);
  setAbilityReadyAt(fixture.player1, ABILITY_IDS.SHOCK, now + 4000);
  setAbilityReadyAt(fixture.player1, ABILITY_IDS.HOOK, now + 4000);
  setAbilityReadyAt(fixture.player1, ABILITY_IDS.PRISM, now + 4000);
  setAbilityReadyAt(fixture.player1, ABILITY_IDS.SOLAR, now + 4000);
  setAbilityReadyAt(fixture.player1, ABILITY_IDS.WALL, now + 4000);
  setAbilityReadyAt(fixture.player1, ABILITY_IDS.REWIND, now + 4000);
  fixture.player1.activeEffects = {
    ...(fixture.player1.activeEffects || {}),
    prismUntil: now + 700,
    solarDistortionUntil: now + 900,
    charge: {
      active: true,
      direction: { x: 1, y: 0 },
      remainingDistance: 2
    }
  };
  fixture.room.match.walls.push({
    wallId: 'W-test',
    ownerPlayerNumber: 1,
    position: { x: 1.6, y: 0 },
    direction: { x: 1, y: 0 },
    halfLength: 1.9,
    halfThickness: 0.36,
    spawnedAt: now,
    expiresAt: now + 2000
  });
  fixture.room.match.projectiles.push({
    projectileId: 'P-test',
    abilityId: ABILITY_IDS.HOOK,
    ownerPlayerNumber: 1,
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    speed: 12,
    hitRadius: 0.35,
    spawnedAt: now,
    expiresAt: now + 800
  });
  fixture.room.match.hitEvents.push({
    hitId: 'H-test',
    type: 'hook_pull',
    abilityId: ABILITY_IDS.HOOK,
    sourcePlayerNumber: 1,
    targetPlayerNumber: 2,
    timestamp: now,
    knockback: { x: 1, y: 0 }
  });

  const previousMatch = fixture.room.match;
  const cleaned = cleanupRoomMatchState(fixture.room, 'test_cleanup', now + 100);
  assert.equal(cleaned, true);
  assert.equal(fixture.room.match, null, 'room match should be cleared');
  assert.equal(previousMatch.projectiles.length, 0, 'projectiles should be cleaned');
  assert.equal(previousMatch.walls.length, 0, 'walls should be cleaned');
  assert.equal(previousMatch.hitEvents.length, 0, 'hit events should be cleaned');

  for (const player of previousMatch.players) {
    for (const abilityId of DRAFTED_ABILITY_IDS) {
      assert.equal(
        getAbilityRemainingMs(player, abilityId, now + 120),
        0,
        `cooldown should reset for ${abilityId}`
      );
    }
    assert.equal(Boolean(player.activeEffects?.charge?.active), false, 'charge state should be reset');
    assert.equal(Boolean(player.activeEffects?.prismUntil), false, 'prism state should be reset');
    assert.equal(Boolean(player.activeEffects?.solarDistortionUntil), false, 'solar debuff state should be reset');
  }
});
