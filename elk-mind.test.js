const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const context = { window: {} };
context.window.UtilsModule = {
  WORLD_CONFIG: { seed: 82426 },
  hashNoise: (x, y, seed) => ((Math.abs(x * 17 + y * 31 + seed) % 100) / 100),
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("elk-mind.js", "utf8"), context);
const mind = context.window.ElkMindModule;

const makeElk = (overrides = {}) => ({
  x: 0,
  y: 0,
  stepCount: 0,
  specialStatuses: [],
  vitalityStats: { health: 100, stamina: 75, hunger: 25, thirst: 25, fear: 12, ...overrides },
  mind: mind.createMind(),
});
const makePerception = (overrides = {}) => ({
  nearestPredator: null,
  nearestFood: { x: 2, y: 0, distance: 2 },
  nearestWater: { x: 0, y: 3, distance: 3 },
  foodCount: 2,
  waterCount: 1,
  ...overrides,
});
const openMoves = Array.from({ length: 8 }, (_, index) => ({ name: String(index) }));
const emptyCell = { food: 0, water: false };

{
  const elk = makeElk({ thirst: 94, hunger: 30 });
  const result = mind.evaluate(elk, makePerception(), openMoves, emptyCell);
  assert.equal(result.intent, "SEEK_WATER", "critical thirst should dominate a safe turn");
}

{
  const elk = makeElk({ stamina: 4, hunger: 12, thirst: 12 });
  const result = mind.evaluate(elk, makePerception({ nearestFood: null, nearestWater: null, foodCount: 0, waterCount: 0 }), openMoves, emptyCell);
  assert.equal(result.intent, "REST", "an exhausted safe elk should rest");
}

{
  const elk = makeElk({ fear: 88, hunger: 96, thirst: 96 });
  elk.specialStatuses = ["CORNERED"];
  const threat = { x: 1, y: 0, distance: 1.2 };
  const result = mind.evaluate(elk, makePerception({ nearestPredator: threat }), openMoves.slice(0, 2), emptyCell);
  assert.equal(result.intent, "BREAKOUT", "contact plus confinement should trigger sacrifice");
  assert(result.priorities.find((entry) => entry.state === "FLEE").score > result.priorities.find((entry) => entry.state === "FORAGE").score, "contact survival should outrank critical hunger");
  assert(result.corruption.level >= 70, "high fear near a threat should report panic corruption");
  assert(result.corruption.perceivedThreatDistance !== result.corruption.actualThreatDistance, "fear should distort perceived distance");
}

{
  const graph = mind.graphSnapshot();
  assert(graph.FLEE.includes("BREAKOUT") && graph.BREAKOUT.includes("RECOVER"), "escape and recovery edges must remain explicit");
  assert(!graph.ORIENT.includes("BREAKOUT"), "sacrifice must not be an ordinary transition");
}

console.log("Elk mind tests passed");
