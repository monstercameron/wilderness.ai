const DIRECTIONS = Object.freeze([
  { name: "N", dx: 0, dy: 1 }, { name: "NE", dx: 1, dy: 1 },
  { name: "E", dx: 1, dy: 0 }, { name: "SE", dx: 1, dy: -1 },
  { name: "S", dx: 0, dy: -1 }, { name: "SW", dx: -1, dy: -1 },
  { name: "W", dx: -1, dy: 0 }, { name: "NW", dx: -1, dy: 1 },
]);

const perceive = (elk, grid) => {
  const vision = window.NavigationModule.scanVision(elk, grid);
  const nearestFoodCell = vision.visible.filter((cell) => cell.food > 0).sort((a, b) => a.distance - b.distance)[0];
  const nearestWaterCell = vision.visible.filter((cell) => cell.water).sort((a, b) => a.distance - b.distance)[0];
  const nearestFood = nearestFoodCell ? {
    x: nearestFoodCell.x, y: nearestFoodCell.y, distance: nearestFoodCell.distance,
    amount: nearestFoodCell.food, type: nearestFoodCell.foodType,
  } : null;
  const nearestWater = nearestWaterCell ? { x: nearestWaterCell.x, y: nearestWaterCell.y, distance: nearestWaterCell.distance } : null;
  const threats = (grid.predators ? window.PredatorModule.getThreats(grid.predators, elk) : [])
    .filter((threat) => vision.visibleKeys.has(window.UtilsModule.positionKey(threat.x, threat.y)));
  return {
    radius: vision.forwardReach, visible: vision.visible, visibleKeys: vision.visibleKeys,
    vision, nearestFood, nearestWater,
    treeCount: vision.visible.filter((cell) => cell.hasTree).length,
    foodCount: vision.visible.filter((cell) => cell.food > 0).length,
    waterCount: vision.visible.filter((cell) => cell.water).length,
    threats, nearestPredator: threats[0] || null,
  };
};

const getValidMoves = (elk, grid) => DIRECTIONS.filter(({ dx, dy }) => {
  const x = elk.x + dx;
  const y = elk.y + dy;
  if (grid.getCell(x, y).hasTree) return false;
  if (dx !== 0 && dy !== 0) {
    const sideA = grid.getCell(elk.x + dx, elk.y);
    const sideB = grid.getCell(elk.x, elk.y + dy);
    if (sideA.hasTree && sideB.hasTree) return false;
  }
  return true;
});

const describeDirection = (direction) => ({
  N: "north", NE: "northeast", E: "east", SE: "southeast", S: "south",
  SW: "southwest", W: "west", NW: "northwest", STAY: "here",
})[direction] || "ahead";

const createDecision = (elk, direction, action, thought, reason, perception, plan) => {
  const move = DIRECTIONS.find((entry) => entry.name === direction);
  return {
    direction, action, intent: plan.intent, acceptedTradeoff: plan.acceptedTradeoff,
    target: { x: elk.x + (move?.dx || 0), y: elk.y + (move?.dy || 0) },
    thought, reason, perception,
  };
};

const directionNoise = (elk, move, corruption) => {
  const noise = window.UtilsModule.hashNoise(
    elk.x + move.dx * 17 + (elk.stepCount || 0),
    elk.y + move.dy * 19 - (elk.stepCount || 0),
    window.UtilsModule.WORLD_CONFIG.seed + 1201
  ) * 2 - 1;
  return noise * corruption.directionalNoise * 9;
};

const chooseMove = (elk, grid, validMoves, perception, plan, random) => {
  const intent = plan.intent;
  const threat = perception.nearestPredator;
  const target = intent === "SEEK_WATER" ? perception.nearestWater : intent === "FORAGE" ? perception.nearestFood : null;
  let best = validMoves[0];
  let bestScore = -Infinity;
  validMoves.forEach((move) => {
    const x = elk.x + move.dx;
    const y = elk.y + move.dy;
    const cell = grid.getCell(x, y);
    const visits = elk.memory.visits.get(window.UtilsModule.positionKey(x, y)) || 0;
    const openness = DIRECTIONS.reduce((count, neighbor) => count + (grid.getCell(x + neighbor.dx, y + neighbor.dy).hasTree ? 0 : 1), 0);
    let score = random() * 1.1 - visits * 1.55 + directionNoise(elk, move, plan.corruption);
    if (intent === "FLEE" || intent === "BREAKOUT") {
      const threatDistance = threat ? Math.hypot(threat.x - x, threat.y - y) : 0;
      score += threatDistance * (intent === "BREAKOUT" ? 8.5 : 6.4) + openness * (intent === "BREAKOUT" ? 2.2 : 1.1);
      if (cell.biome === "meadow") score += 2.8;
      if (intent === "BREAKOUT" && visits === 0) score += 3;
    } else if (target) {
      const distanceAfterMove = Math.hypot(target.x - x, target.y - y);
      const need = intent === "SEEK_WATER" ? elk.vitalityStats.thirst : elk.vitalityStats.hunger;
      score -= distanceAfterMove * (2.5 + need / 25);
      if (intent === "SEEK_WATER" && cell.water) score += 38;
      if (intent === "FORAGE" && cell.food > 0) score += 31 + cell.food;
      if (threat) score += Math.hypot(threat.x - x, threat.y - y) * 1.3;
    } else {
      const distanceFromOrigin = Math.hypot(x - elk.memory.origin.x, y - elk.memory.origin.y);
      score += Math.min(distanceFromOrigin, 10) * 0.16 + openness * 0.18;
      if (threat) score += Math.hypot(threat.x - x, threat.y - y) * 0.7;
    }
    if (score > bestScore) { bestScore = score; best = move; }
  });
  return best;
};

const decide = (elk, grid, random = Math.random) => {
  const perception = perceive(elk, grid);
  const validMoves = getValidMoves(elk, grid);
  const currentCell = grid.getCell(elk.x, elk.y);
  const plan = window.ElkMindModule.evaluate(elk, perception, validMoves, currentCell);
  const route = window.NavigationModule.planRoute(elk, grid, perception, plan);
  elk.mind.vision = {
    shape: "offset oval",
    facing: elk.direction,
    forwardReach: perception.vision.forwardReach,
    rearReach: perception.vision.rearReach,
    lateralReach: perception.vision.lateralReach,
    visibleCellCount: perception.visible.length,
    occludedCellCount: perception.vision.occludedCellCount,
  };
  elk.mind.route = route;
  const priority = plan.priorities[0];
  const prioritySummary = `${priority.state} ${priority.score}`;

  if ((plan.intent === "SEEK_WATER" || plan.intent === "FORAGE") && (!perception.nearestPredator || perception.nearestPredator.distance >= 3.2)) {
    if (plan.intent === "SEEK_WATER" && currentCell.water) {
      return createDecision(elk, "STAY", "drink", "Water is here. I can drink without abandoning my escape line.", `SEEK_WATER won at ${prioritySummary}; drinking before reevaluating.`, perception, plan);
    }
    if (plan.intent === "FORAGE" && currentCell.food > 0) {
      return createDecision(elk, "STAY", "forage", `This ${currentCell.foodType || "forage"} can restore me.`, `FORAGE won at ${prioritySummary}; consuming ${currentCell.food} available units.`, perception, plan);
    }
  }
  if (plan.intent === "REST" || plan.intent === "RECOVER") {
    const thought = plan.intent === "RECOVER" ? "The pursuit has opened enough space. I need my legs back." : "The air is quiet enough to conserve energy.";
    return createDecision(elk, "STAY", "rest", thought, `${plan.intent} won at ${prioritySummary}. ${plan.acceptedTradeoff}`, perception, plan);
  }
  if (!validMoves.length) {
    return createDecision(elk, "STAY", "rest", "The brush closes around me. I have no clean step.", "No traversable adjacent cell is available; holding position and reassessing.", perception, plan);
  }

  const routeDirection = route.path.length ? window.NavigationModule.directionForStep(elk, route.path[0]) : null;
  const best = validMoves.find((move) => move.name === routeDirection) || chooseMove(elk, grid, validMoves, perception, plan, random);
  const directionName = describeDirection(best.name);
  const routeSummary = route.path.length
    ? ` Visible route: ${route.path.length} steps, ${route.expanded} nodes traced.`
    : " No complete route is currently visible; using the safest local step.";
  if (plan.intent === "BREAKOUT") {
    return createDecision(elk, best.name, "sacrifice", "The line is closing. I will spend what my body has to break through now.", `BREAKOUT won at ${prioritySummary}; moving ${directionName} trades health and stamina for an immediate escape step.${routeSummary}`, perception, plan);
  }
  if (plan.intent === "FLEE") {
    const thought = plan.corruption.tunnelVision ? "Fear narrows the world to one opening. I run." : "A wolf is too close. Open ground first; every other need can wait.";
    return createDecision(elk, best.name, "flee", thought, `FLEE won at ${prioritySummary}; moving ${directionName} increases separation and preserves exits.${routeSummary} ${plan.acceptedTradeoff}`, perception, plan);
  }
  if (plan.intent === "FORAGE" || plan.intent === "SEEK_WATER") {
    const resource = plan.intent === "SEEK_WATER" ? "water" : perception.nearestFood?.type || "forage";
    const destination = grid.getCell(elk.x + best.dx, elk.y + best.dy);
    const arrived = plan.intent === "SEEK_WATER" ? destination.water : destination.food > 0;
    const action = arrived ? (plan.intent === "SEEK_WATER" ? "drink" : "forage") : "move";
    return createDecision(elk, best.name, action, `I can still read ${resource} through the noise.`, `${plan.intent} won at ${prioritySummary}; moving ${directionName}.${routeSummary} ${plan.acceptedTradeoff}`, perception, plan);
  }
  return createDecision(elk, best.name, "explore", `I will read the ${window.UtilsModule.getBiomeAt(elk.x, elk.y).label.toLowerCase()} to the ${directionName}.`, `ORIENT won at ${prioritySummary}; choosing a low-visit, open cell ${directionName}.${routeSummary}`, perception, plan);
};

window.AgentModule = { DIRECTIONS, perceive, getValidMoves, decide, describeDirection };
