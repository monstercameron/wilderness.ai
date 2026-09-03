/**
 * Nia's explicit behavior model.
 *
 * The state graph limits ordinary transitions, while the utility scores make
 * needs compete every turn. FLEE and BREAKOUT remain emergency interrupts.
 */
const ELK_STATE_GRAPH = Object.freeze({
  ORIENT: Object.freeze(["FORAGE", "SEEK_WATER", "REST", "FLEE"]),
  FORAGE: Object.freeze(["ORIENT", "SEEK_WATER", "REST", "FLEE"]),
  SEEK_WATER: Object.freeze(["ORIENT", "FORAGE", "REST", "FLEE"]),
  REST: Object.freeze(["ORIENT", "FORAGE", "SEEK_WATER", "FLEE"]),
  FLEE: Object.freeze(["BREAKOUT", "RECOVER", "ORIENT"]),
  BREAKOUT: Object.freeze(["FLEE", "RECOVER"]),
  RECOVER: Object.freeze(["ORIENT", "FORAGE", "SEEK_WATER", "FLEE"]),
});

const ELK_STATE_LABELS = Object.freeze({
  ORIENT: "Read the landscape",
  FORAGE: "Find food",
  SEEK_WATER: "Find water",
  REST: "Conserve energy",
  FLEE: "Create distance",
  BREAKOUT: "Spend reserves to escape",
  RECOVER: "Recover after flight",
});

const clampMind = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const roundMind = (value) => Math.round(clampMind(value));

const createMind = () => ({
  state: "ORIENT",
  previousState: null,
  stateAge: 0,
  transition: "ORIENT",
  priorities: [],
  allowedNextStates: [...ELK_STATE_GRAPH.ORIENT],
  corruption: {
    level: 0,
    label: "CLEAR",
    actualThreatDistance: null,
    perceivedThreatDistance: null,
    distanceBias: 0,
    resourceClarity: 1,
    directionalNoise: 0,
    tunnelVision: false,
  },
  context: { cornered: false, exits: 8, imminent: false },
  vision: {
    shape: "offset oval",
    facing: "N",
    forwardReach: 10,
    rearReach: 2.25,
    lateralReach: 5.25,
    visibleCellCount: 0,
    occludedCellCount: 0,
  },
  route: { intent: "ORIENT", target: null, path: [], cost: null, expanded: 0, status: "untraced" },
  history: [],
});

const getFearCorruption = (elk, perception) => {
  const fear = clampMind(elk.vitalityStats.fear) / 100;
  const threat = perception.nearestPredator;
  const actualDistance = threat ? threat.distance : null;
  const pulse = window.UtilsModule.hashNoise(
    elk.x + (elk.stepCount || 0) * 3,
    elk.y - (elk.stepCount || 0) * 5,
    window.UtilsModule.WORLD_CONFIG.seed + 913
  ) * 2 - 1;
  const distanceBias = threat ? fear * (0.16 + Math.abs(pulse) * 0.14) : 0;
  const perceivedThreatDistance = threat
    ? clampMind(actualDistance * (1 - distanceBias) + pulse * fear * 1.8, 0, 99)
    : null;
  const level = roundMind(fear * (threat ? 100 : 62));

  return {
    level,
    label: level >= 72 ? "PANIC" : level >= 46 ? "DISTORTED" : level >= 22 ? "WATCHFUL" : "CLEAR",
    actualThreatDistance: actualDistance === null ? null : Number(actualDistance.toFixed(2)),
    perceivedThreatDistance: perceivedThreatDistance === null ? null : Number(perceivedThreatDistance.toFixed(2)),
    distanceBias: Number(distanceBias.toFixed(2)),
    resourceClarity: Number(clampMind(1 - fear * 0.68, 0.24, 1).toFixed(2)),
    directionalNoise: Number((fear * (0.35 + Math.abs(pulse) * 0.65)).toFixed(2)),
    tunnelVision: Boolean(threat && fear >= 0.68),
  };
};

const scoreStates = (elk, perception, validMoves, currentCell, corruption) => {
  const stats = elk.vitalityStats;
  const actualDistance = perception.nearestPredator?.distance ?? 99;
  const perceivedDistance = corruption.perceivedThreatDistance ?? 99;
  const exits = validMoves.length;
  const cornered = Boolean(elk.specialStatuses?.includes("CORNERED") || (actualDistance < 7 && exits <= 2));
  const imminent = actualDistance <= 2.25;
  const threatPressure = clampMind((13 - perceivedDistance) / 13 * 100);
  const foodDistance = perception.nearestFood?.distance ?? 12;
  const waterDistance = perception.nearestWater?.distance ?? 12;
  const safeEnoughToFeed = actualDistance >= 3.2;
  const depleted = 100 - stats.stamina;
  const injured = 100 - stats.health;
  const afterFlight = elk.mind?.state === "FLEE" || elk.mind?.state === "BREAKOUT";
  const resourceClarity = corruption.resourceClarity;

  const scores = {
    ORIENT: 18 + (perception.foodCount + perception.waterCount === 0 ? 10 : 0) + (actualDistance > 12 ? 8 : 0),
    FORAGE:
      stats.hunger * 0.82 * resourceClarity - foodDistance * 2.1 +
      (currentCell.food > 0 && safeEnoughToFeed ? 34 : 0) - threatPressure * 0.48,
    SEEK_WATER:
      stats.thirst * 0.92 * resourceClarity - waterDistance * 2.25 +
      (currentCell.water && safeEnoughToFeed ? 38 : 0) - threatPressure * 0.52,
    REST: depleted * 0.78 + injured * 0.16 - threatPressure * 0.72 + (actualDistance > 12 ? 9 : 0),
    FLEE: threatPressure * 0.74 + stats.fear * 0.34 + (actualDistance < 5 ? 19 : 0) + (imminent ? 30 : 0),
    BREAKOUT:
      cornered || imminent
        ? 74 + threatPressure * 0.28 + stats.fear * 0.17 - injured * 0.22 - (stats.stamina < 8 ? 12 : 0)
        : 0,
    RECOVER:
      afterFlight && actualDistance > 7
        ? depleted * 0.72 + injured * 0.18 + (actualDistance > 12 ? 16 : 0)
        : 0,
  };

  // Contact danger is never outweighed by hunger or thirst. Outside contact,
  // critical needs can compete with moderate perceived danger.
  if (imminent) {
    scores.FORAGE *= 0.08;
    scores.SEEK_WATER *= 0.08;
    scores.REST = 0;
  } else {
    if (stats.thirst >= 82) scores.SEEK_WATER += 24;
    if (stats.hunger >= 86) scores.FORAGE += 20;
  }

  return {
    scores: Object.fromEntries(Object.entries(scores).map(([state, score]) => [state, roundMind(score)])),
    context: { cornered, exits, imminent, threatPressure: roundMind(threatPressure) },
  };
};

const chooseState = (elk, scores, context) => {
  const mind = elk.mind || createMind();
  const current = mind.state || "ORIENT";
  const emergency = context.imminent || context.cornered || scores.FLEE >= 64;
  const candidates = new Set([current, ...(ELK_STATE_GRAPH[current] || ELK_STATE_GRAPH.ORIENT)]);
  if (emergency) candidates.add("FLEE");
  if (context.cornered || context.imminent) candidates.add("BREAKOUT");

  const ranked = Object.entries(scores)
    .map(([state, score]) => ({ state, score, label: ELK_STATE_LABELS[state] }))
    .sort((a, b) => b.score - a.score);
  const eligible = ranked.filter((entry) => candidates.has(entry.state));
  let next = eligible[0]?.state || "ORIENT";

  // Hysteresis prevents flip-flopping, but never suppresses a survival interrupt.
  const currentScore = scores[current] || 0;
  const nextScore = scores[next] || 0;
  if (!emergency && mind.stateAge < 2 && next !== current && nextScore < currentScore + 13) next = current;
  if (context.imminent && scores.BREAKOUT >= scores.FLEE - 5) next = "BREAKOUT";

  return { next, ranked };
};

const evaluate = (elk, perception, validMoves, currentCell) => {
  if (!elk.mind) elk.mind = createMind();
  const corruption = getFearCorruption(elk, perception);
  const { scores, context } = scoreStates(elk, perception, validMoves, currentCell, corruption);
  const { next, ranked } = chooseState(elk, scores, context);
  const previous = elk.mind.state;

  elk.mind.previousState = previous;
  elk.mind.state = next;
  elk.mind.stateAge = previous === next ? elk.mind.stateAge + 1 : 0;
  elk.mind.transition = previous === next ? `${next} · HOLD` : `${previous} → ${next}`;
  elk.mind.priorities = ranked;
  elk.mind.allowedNextStates = [...(ELK_STATE_GRAPH[next] || [])];
  elk.mind.corruption = corruption;
  elk.mind.context = context;
  if (previous !== next) {
    elk.mind.history.unshift({ from: previous, to: next, step: elk.stepCount || 0 });
    elk.mind.history.length = Math.min(elk.mind.history.length, 8);
  }

  return {
    intent: next,
    priorities: ranked,
    corruption,
    context,
    acceptedTradeoff:
      next === "BREAKOUT"
        ? "Spend health and stamina now to avoid likely lethal contact."
        : next === "FLEE"
          ? "Delay hunger and thirst while creating safe distance."
          : next === "SEEK_WATER"
            ? "Accept exposure and travel cost to reduce dehydration."
            : next === "FORAGE"
              ? "Accept travel cost to reduce hunger."
              : next === "REST" || next === "RECOVER"
                ? "Yield distance and time to restore movement reserve."
                : "Keep options open while gathering information.",
  };
};

const graphSnapshot = () => Object.fromEntries(
  Object.entries(ELK_STATE_GRAPH).map(([state, edges]) => [state, [...edges]])
);

window.ElkMindModule = {
  graph: ELK_STATE_GRAPH,
  labels: ELK_STATE_LABELS,
  createMind,
  evaluate,
  graphSnapshot,
};
