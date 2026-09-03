const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const context = vm.createContext({ console, Math, Object, Array, Map, Set, THREE: {} });
context.window = context;
["utils.js", "animal-status.js", "predator.js"].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), context, { filename: file });
});
context.AgentModule = {
  DIRECTIONS: [
    { name: "N", dx: 0, dy: 1 }, { name: "E", dx: 1, dy: 0 },
    { name: "S", dx: 0, dy: -1 }, { name: "W", dx: -1, dy: 0 },
  ],
};

const createAnimals = () => ({
  elk: {
    id: "nia", name: "Nia", role: "prey", x: 1, y: 0, movementBudget: 1,
    vitalityStats: { strength: 52, attack: 42, speed: 64, stamina: 90, health: 100, hunger: 30, thirst: 30, fear: 12 },
  },
  wolf: {
    id: 1, name: "Wolf 1", role: "predator", x: 0, y: 0, state: "PURSUING", attackCooldown: 0, giveUpTurns: 0,
    vitalityStats: { strength: 70, attack: 62, speed: 80, stamina: 60, health: 100, hunger: 40, thirst: 30, fear: 8 },
  },
});

const createPack = (rolls) => ({
  members: [], attackCount: 0, biteHits: 0, kickHits: 0,
  combatRandom: () => rolls.shift(), lastCombat: null, lastEvent: "",
});
const decision = { direction: "STAY", action: "attack", reason: "Contact test." };
const world = { getCell: () => ({ hasTree: false, water: false }) };

{
  const { elk, wolf } = createAnimals();
  const pack = createPack([0.1, 0.19]);
  pack.members = [wolf];
  assert.equal(context.PredatorModule.applyDecision(pack, wolf, decision, elk, world), true);
  assert.ok(elk.vitalityStats.health < 100, "a successful bite must damage elk health");
  assert.ok(wolf.vitalityStats.health < 100, "a kick roll below 20% must damage wolf health");
  assert.equal(pack.biteHits, 1);
  assert.equal(pack.kickHits, 1);
}

{
  const { elk, wolf } = createAnimals();
  const pack = createPack([0.99, 0.21]);
  pack.members = [wolf];
  context.PredatorModule.applyDecision(pack, wolf, decision, elk, world);
  assert.equal(elk.vitalityStats.health, 100, "a failed bite roll must not damage elk health");
  assert.equal(wolf.vitalityStats.health, 100, "a kick roll above 20% must not damage wolf health");
  assert.match(pack.lastEvent, /bite missed/);
  assert.match(pack.lastEvent, /kick missed/);
}

assert.equal(context.AnimalStatusModule.profiles.elk.stats.speed, context.AnimalStatusModule.profiles.wolf.stats.speed * 0.8);
assert.equal(context.AnimalStatusModule.profiles.elk.stats.stamina, context.AnimalStatusModule.profiles.wolf.stats.stamina * 1.5);

{
  const { elk, wolf } = createAnimals();
  wolf.vitalityStats.stamina = 0;
  const exhaustedDecision = context.PredatorModule.decide(wolf, elk, world);
  assert.equal(exhaustedDecision.action, "rest", "a wolf at zero stamina must not bite");
  assert.equal(wolf.state, "RECOVERING");
}

console.log("Combat and endurance checks passed.");
