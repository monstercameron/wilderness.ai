const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const positionKey = (x, y) => `${x}:${y}`;
const context = { window: {} };
context.window.UtilsModule = {
  WORLD_CONFIG: { seed: 82426 },
  positionKey,
  hashNoise: (x, y, seed) => ((Math.abs(x * 13 + y * 29 + seed) % 97) / 97),
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("navigation.js", "utf8"), context);
const navigation = context.window.NavigationModule;

const elk = { x: 0, y: 0, direction: "N" };
assert(navigation.isWithinVision(elk, 0, 9), "the elk should see far ahead");
assert(navigation.isWithinVision(elk, 0, -2), "the elk should retain a narrow rear margin");
assert(!navigation.isWithinVision(elk, 0, -3), "rear vision should end quickly");
assert(!navigation.isWithinVision(elk, 6, 2), "lateral vision should stay bounded");

const blocked = new Set([positionKey(0, 1)]);
const grid = {
  getCell: (x, y) => ({ x, y, hasTree: blocked.has(positionKey(x, y)), biome: "meadow", water: false, food: 0 }),
};
assert(!navigation.hasLineOfSight(elk, 0, 4, grid), "trees should occlude farther cells");
const blockedRay = navigation.castOcclusionRay(elk, 0, 4, grid);
assert.deepEqual(blockedRay.blocker, { x: 0, y: 1 }, "the ray should report its first blocker");
assert(navigation.hasLineOfSight(elk, 0, 1, grid), "the blocking tree itself should remain visible");

const cornerGrid = {
  getCell: (x, y) => ({ hasTree: x === 1 && y === 0 }),
};
assert(!navigation.hasLineOfSight(elk, 1, 1, cornerGrid), "a diagonal ray must not peek through a blocked grid corner");

const visibleKeys = new Set();
for (let x = -3; x <= 3; x++) {
  for (let y = -1; y <= 5; y++) {
    if (navigation.isWithinVision(elk, x, y)) visibleKeys.add(positionKey(x, y));
  }
}
const traced = navigation.tracePath(elk, grid, { x: 0, y: 4 }, visibleKeys);
assert(traced && traced.path.length, "the bounded tracer should find a route");
assert(!traced.path.some((step) => blocked.has(positionKey(step.x, step.y))), "the route must avoid trees");
assert(traced.path.every((step) => visibleKeys.has(positionKey(step.x, step.y))), "every route step must remain inside visible space");
assert(traced.expanded <= navigation.config.maxExpandedNodes, "the route search must honor its node budget");
assert.equal(navigation.tracePath(elk, grid, { x: 0, y: -4 }, visibleKeys), null, "the tracer must reject unseen targets");

console.log("Vision and route tracing tests passed");
