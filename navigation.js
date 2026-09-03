/** Facing-aware elk vision and bounded, lightweight A* route tracing. */
const VISION_CONFIG = Object.freeze({
  forwardReach: 10,
  rearReach: 2.25,
  lateralReach: 5.25,
  maxExpandedNodes: 220,
});

const NAV_DIRECTIONS = Object.freeze([
  { name: "N", dx: 0, dy: 1 }, { name: "NE", dx: 1, dy: 1 },
  { name: "E", dx: 1, dy: 0 }, { name: "SE", dx: 1, dy: -1 },
  { name: "S", dx: 0, dy: -1 }, { name: "SW", dx: -1, dy: -1 },
  { name: "W", dx: -1, dy: 0 }, { name: "NW", dx: -1, dy: 1 },
]);

const FACING_VECTORS = Object.freeze({
  N: [0, 1], NE: [Math.SQRT1_2, Math.SQRT1_2], E: [1, 0],
  SE: [Math.SQRT1_2, -Math.SQRT1_2], S: [0, -1],
  SW: [-Math.SQRT1_2, -Math.SQRT1_2], W: [-1, 0], NW: [-Math.SQRT1_2, Math.SQRT1_2],
});

const getFacingVector = (direction) => FACING_VECTORS[direction] || FACING_VECTORS.N;

const getVisionMetrics = (elk, x, y) => {
  const [forwardX, forwardY] = getFacingVector(elk.direction);
  const dx = x - elk.x;
  const dy = y - elk.y;
  return {
    forward: dx * forwardX + dy * forwardY,
    lateral: dx * -forwardY + dy * forwardX,
  };
};

const isWithinVision = (elk, x, y) => {
  if (x === elk.x && y === elk.y) return true;
  const { forward, lateral } = getVisionMetrics(elk, x, y);
  const radius = (VISION_CONFIG.forwardReach + VISION_CONFIG.rearReach) / 2;
  const offset = (VISION_CONFIG.forwardReach - VISION_CONFIG.rearReach) / 2;
  return (lateral * lateral) / (VISION_CONFIG.lateralReach * VISION_CONFIG.lateralReach) +
    ((forward - offset) * (forward - offset)) / (radius * radius) <= 1;
};

const castOcclusionRay = (elk, targetX, targetY, grid) => {
  let cellX = Math.round(elk.x);
  let cellY = Math.round(elk.y);
  const endX = Math.round(targetX);
  const endY = Math.round(targetY);
  const dx = endX - cellX;
  const dy = endY - cellY;
  const traversed = [];
  if (dx === 0 && dy === 0) return { clear: true, blocker: null, traversed };

  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const tDeltaX = dx === 0 ? Infinity : 1 / Math.abs(dx);
  const tDeltaY = dy === 0 ? Infinity : 1 / Math.abs(dy);
  let tMaxX = dx === 0 ? Infinity : tDeltaX * 0.5;
  let tMaxY = dy === 0 ? Infinity : tDeltaY * 0.5;

  const inspect = (x, y) => {
    if (x === endX && y === endY) return null;
    const point = { x, y };
    traversed.push(point);
    return grid.getCell(x, y).hasTree ? point : null;
  };

  while (cellX !== endX || cellY !== endY) {
    if (tMaxX < tMaxY) {
      cellX += stepX;
      tMaxX += tDeltaX;
      const blocker = inspect(cellX, cellY);
      if (blocker) return { clear: false, blocker, traversed };
    } else if (tMaxY < tMaxX) {
      cellY += stepY;
      tMaxY += tDeltaY;
      const blocker = inspect(cellX, cellY);
      if (blocker) return { clear: false, blocker, traversed };
    } else {
      // A ray crossing an exact grid corner touches both neighboring cells.
      // Checking both prevents animals from seeing through two touching trees.
      const sideX = { x: cellX + stepX, y: cellY };
      const sideY = { x: cellX, y: cellY + stepY };
      for (const point of [sideX, sideY]) {
        const blocker = inspect(point.x, point.y);
        if (blocker) return { clear: false, blocker, traversed };
      }
      cellX += stepX;
      cellY += stepY;
      tMaxX += tDeltaX;
      tMaxY += tDeltaY;
      const blocker = inspect(cellX, cellY);
      if (blocker) return { clear: false, blocker, traversed };
    }
  }
  return { clear: true, blocker: null, traversed };
};

const hasLineOfSight = (elk, x, y, grid) => castOcclusionRay(elk, x, y, grid).clear;

const scanVision = (elk, grid) => {
  const radius = Math.ceil(VISION_CONFIG.forwardReach);
  const visible = [];
  const visibleKeys = new Set([window.UtilsModule.positionKey(elk.x, elk.y)]);
  let occludedCellCount = 0;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const x = elk.x + dx;
      const y = elk.y + dy;
      if (!isWithinVision(elk, x, y)) continue;
      if (!hasLineOfSight(elk, x, y, grid)) { occludedCellCount++; continue; }
      const cell = grid.getCell(x, y);
      visible.push({ x, y, distance: Math.hypot(dx, dy), biome: cell.biome, hasTree: cell.hasTree, food: cell.food, foodType: cell.foodType, water: cell.water });
      visibleKeys.add(window.UtilsModule.positionKey(x, y));
    }
  }
  return { visible, visibleKeys, occludedCellCount, ...VISION_CONFIG };
};

const reconstructPath = (cameFrom, currentKey, positions) => {
  const path = [];
  while (cameFrom.has(currentKey)) {
    path.unshift(positions.get(currentKey));
    currentKey = cameFrom.get(currentKey);
  }
  return path;
};

const tracePath = (elk, grid, target, visibleKeys, options = {}) => {
  if (!target) return null;
  const startKey = window.UtilsModule.positionKey(elk.x, elk.y);
  const targetKey = window.UtilsModule.positionKey(target.x, target.y);
  if (!visibleKeys.has(targetKey)) return null;
  const open = [{ x: elk.x, y: elk.y, key: startKey, f: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  const positions = new Map([[startKey, { x: elk.x, y: elk.y }]]);
  const closed = new Set();
  let expanded = 0;

  while (open.length && expanded < VISION_CONFIG.maxExpandedNodes) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    if (closed.has(current.key)) continue;
    if (current.key === targetKey) {
      return { path: reconstructPath(cameFrom, current.key, positions), cost: Number(gScore.get(current.key).toFixed(2)), expanded };
    }
    closed.add(current.key);
    expanded++;

    NAV_DIRECTIONS.forEach((move) => {
      const x = current.x + move.dx;
      const y = current.y + move.dy;
      const key = window.UtilsModule.positionKey(x, y);
      if (closed.has(key) || !visibleKeys.has(key)) return;
      const cell = grid.getCell(x, y);
      if (cell.hasTree) return;
      if (move.dx && move.dy) {
        if (grid.getCell(current.x + move.dx, current.y).hasTree && grid.getCell(current.x, current.y + move.dy).hasTree) return;
      }
      const diagonalCost = move.dx && move.dy ? Math.SQRT2 : 1;
      const terrainCost = cell.biome === "highland" ? 0.55 : cell.biome === "woodland" ? 0.28 : cell.water && key !== targetKey ? 0.45 : 0;
      const threatCost = (options.threats || []).reduce((sum, threat) => {
        const distance = Math.hypot(threat.x - x, threat.y - y);
        return sum + Math.max(0, 5 - distance) * (options.escape ? 2.6 : 1.15);
      }, 0);
      const fearNoise = window.UtilsModule.hashNoise(x, y, window.UtilsModule.WORLD_CONFIG.seed + 1601) * (options.directionalNoise || 0) * 0.7;
      const tentative = gScore.get(current.key) + diagonalCost + terrainCost + threatCost + fearNoise;
      if (tentative >= (gScore.get(key) ?? Infinity)) return;
      cameFrom.set(key, current.key);
      gScore.set(key, tentative);
      positions.set(key, { x, y });
      const heuristic = Math.hypot(target.x - x, target.y - y);
      open.push({ x, y, key, f: tentative + heuristic });
    });
  }
  return null;
};

const opennessAt = (grid, x, y) => NAV_DIRECTIONS.reduce(
  (count, move) => count + (grid.getCell(x + move.dx, y + move.dy).hasTree ? 0 : 1), 0
);

const rankTargets = (elk, grid, perception, intent) => {
  if (intent === "SEEK_WATER" && perception.nearestWater) return [perception.nearestWater];
  if (intent === "FORAGE" && perception.nearestFood) return [perception.nearestFood];
  const threat = perception.nearestPredator;
  return perception.visible
    .filter((cell) => !cell.hasTree && !(cell.x === elk.x && cell.y === elk.y))
    .map((cell) => {
      const metrics = getVisionMetrics(elk, cell.x, cell.y);
      const visits = elk.memory.visits.get(window.UtilsModule.positionKey(cell.x, cell.y)) || 0;
      const threatDistance = threat ? Math.hypot(threat.x - cell.x, threat.y - cell.y) : 0;
      const score = intent === "FLEE" || intent === "BREAKOUT"
        ? threatDistance * 5 + opennessAt(grid, cell.x, cell.y) * 1.4 + metrics.forward * 0.35
        : metrics.forward * 1.4 + Math.hypot(cell.x - elk.x, cell.y - elk.y) - visits * 4 + opennessAt(grid, cell.x, cell.y) * 0.25;
      return { ...cell, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
};

const planRoute = (elk, grid, perception, plan) => {
  if (["REST", "RECOVER"].includes(plan.intent)) return { intent: plan.intent, target: null, path: [], cost: 0, expanded: 0, status: "holding" };
  const candidates = rankTargets(elk, grid, perception, plan.intent);
  for (const target of candidates) {
    if (target.x === elk.x && target.y === elk.y) {
      return { intent: plan.intent, target: { x: target.x, y: target.y }, path: [], cost: 0, expanded: 0, status: "at target" };
    }
    const traced = tracePath(elk, grid, target, perception.visibleKeys, {
      threats: perception.threats,
      escape: plan.intent === "FLEE" || plan.intent === "BREAKOUT",
      directionalNoise: plan.corruption.directionalNoise,
    });
    if (traced?.path.length) {
      return {
        intent: plan.intent,
        target: { x: target.x, y: target.y },
        path: traced.path,
        cost: traced.cost,
        expanded: traced.expanded,
        status: "traced",
      };
    }
  }
  return { intent: plan.intent, target: null, path: [], cost: null, expanded: 0, status: "no visible route" };
};

const directionForStep = (from, to) => {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  return NAV_DIRECTIONS.find((move) => move.dx === dx && move.dy === dy)?.name || "STAY";
};

const getVisionBoundary = (elk, segments = 64) => {
  const [forwardX, forwardY] = getFacingVector(elk.direction);
  const radius = (VISION_CONFIG.forwardReach + VISION_CONFIG.rearReach) / 2;
  const offset = (VISION_CONFIG.forwardReach - VISION_CONFIG.rearReach) / 2;
  return Array.from({ length: segments }, (_, index) => {
    const angle = index / segments * Math.PI * 2;
    const forward = offset + Math.cos(angle) * radius;
    const lateral = Math.sin(angle) * VISION_CONFIG.lateralReach;
    return {
      x: elk.x + forward * forwardX + lateral * -forwardY,
      y: elk.y + forward * forwardY + lateral * forwardX,
    };
  });
};

window.NavigationModule = {
  config: VISION_CONFIG,
  directions: NAV_DIRECTIONS,
  getFacingVector,
  getVisionMetrics,
  isWithinVision,
  castOcclusionRay,
  hasLineOfSight,
  scanVision,
  tracePath,
  planRoute,
  directionForStep,
  getVisionBoundary,
};
