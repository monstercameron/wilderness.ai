const CEREBRAS_MODEL_ID = "gemma-4-31b";
const IS_STATIC_HOSTED = window.location.hostname.endsWith("github.io");
const STATIC_HOST_MESSAGE = "The GitHub Pages demo runs the local planner. Clone the repository and run npm start to connect Cerebras securely through the localhost bridge.";
const PREY_INTENTS = Object.freeze(["ORIENT", "FORAGE", "SEEK_WATER", "REST", "FLEE", "BREAKOUT", "RECOVER"]);
const PREDATOR_INTENTS = Object.freeze(["TRACK", "STALK", "ATTACK", "DRINK", "REST", "GIVE_UP"]);

const inferIntent = (actor, instinct) => {
  if (instinct.intent) return instinct.intent;
  if (actor.role === "prey") return "ORIENT";
  return ({ attack: "ATTACK", stalk: "STALK", drink: "DRINK", rest: "REST" })[instinct.action] ||
    (String(actor.state).includes("GIVING UP") ? "GIVE_UP" : "TRACK");
};

const requestInferenceJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || payload.error || "Request failed with HTTP " + response.status);
  return payload;
};

const getActorValidMoves = (actor, grid) => {
  if (actor.role === "prey") return window.AgentModule.getValidMoves(actor, grid);
  return window.AgentModule.DIRECTIONS.filter((move) => {
    const cell = grid.getCell(actor.x + move.dx, actor.y + move.dy);
    return !cell.hasTree;
  });
};

const buildAnimalMap = (actor, grid, gazelle, radius = actor.role === "prey" ? 10 : 6) => {
  const rows = [];
  const predators = grid.predators?.members || [];
  for (let dy = radius; dy >= -radius; dy--) {
    let row = "";
    for (let dx = -radius; dx <= radius; dx++) {
      const x = actor.x + dx;
      const y = actor.y + dy;
      const outsideVision = actor.role === "prey" && (
        !window.NavigationModule.isWithinVision(actor, x, y) ||
        !window.NavigationModule.hasLineOfSight(actor, x, y, grid)
      );
      if (outsideVision) { row += "?"; continue; }
      const cell = grid.getCell(x, y);
      const predatorHere = predators.find((candidate) => candidate.x === x && candidate.y === y);
      if (x === actor.x && y === actor.y) row += actor.role === "prey" ? "E" : "P";
      else if (x === gazelle.x && y === gazelle.y) row += "E";
      else if (predatorHere) row += "R";
      else if (cell.hasTree) row += "T";
      else if (cell.water) row += "W";
      else if (cell.food > 0) row += "F";
      else row += ".";
    }
    rows.push(row);
  }
  return rows;
};

const buildAnimalSnapshot = (actor, grid, gazelle, instinct) => {
  const validMoves = getActorValidMoves(actor, grid);
  const allowedDirections = ["STAY", ...validMoves.map((move) => move.name)];
  const allowedActions = actor.role === "prey"
    ? ["move", "explore", "forage", "drink", "flee", "sacrifice", "rest"]
    : ["move", "explore", "drink", "stalk", "attack", "rest"];
  const allowedIntents = actor.role === "prey" ? [...PREY_INTENTS] : [...PREDATOR_INTENTS];
  const instinctIntent = inferIntent(actor, instinct);
  const snapshot = {
    task: "Choose this animal's next adjacent grid cell and action for one simulation turn.",
    actor: {
      id: String(actor.id),
      name: actor.name,
      species: actor.species,
      role: actor.role,
      position: { x: actor.x, y: actor.y },
      facing: actor.direction,
      currentBiome: window.UtilsModule.getBiomeAt(actor.x, actor.y).label,
      bodyShape: actor.morphology.shape,
    },
    physiology: Object.fromEntries(window.AnimalStatusModule.statKeys.map((key) => [key, Math.round(actor.vitalityStats[key])])),
    mobility: {
      movementBudget: Number(actor.movementBudget.toFixed(2)),
      canEnterAdjacentCellThisTurn: actor.movementBudget >= 1,
    },
    specialStatuses: actor.specialStatuses,
    mapLegend: {
      E: "elk Nia",
      P: "current predator",
      R: "another predator",
      T: "impassable tree",
      W: "water",
      F: "edible resource",
      ".": "open ground",
      "?": "outside the current field of vision or occluded",
    },
    localMapNorthIsUp: buildAnimalMap(actor, grid, gazelle),
    allowedDirections,
    allowedActions,
    allowedIntents,
    instinctRecommendation: {
      direction: instinct.direction,
      action: instinct.action,
      intent: instinctIntent,
      target: instinct.target,
      reason: instinct.reason,
      acceptedTradeoff: instinct.acceptedTradeoff || "No exceptional tradeoff was selected.",
    },
    rules: [
      "Target must be the current cell for STAY or the exactly adjacent cell implied by direction.",
      "Never enter a tree.",
      "The prey map is an offset oval aligned to facing: it reaches 10 cells ahead, 5.25 laterally, and only 2.25 behind. Question marks are unknown, not empty ground.",
      "Prefer the supplied bounded route when it remains valid; it was traced only through visible, traversable cells.",
      "Respect physiology and special statuses. Low stamina favors rest; severe hunger or thirst favors survival resources.",
      "If mobility says the animal cannot enter an adjacent cell this turn, choose STAY and rest unless the prey behavior model authorizes an emergency BREAKOUT sacrifice.",
      actor.role === "prey"
        ? "Use the behavior graph and scored priorities. BREAKOUT/sacrifice is only legal when cornered or contact is imminent; it spends health and stamina to force one escape step."
        : "Hunt intelligently: use cover, close distance, and attack only when adjacent.",
    ],
  };

  if (actor.role === "prey") {
    const perception = instinct.perception || window.AgentModule.perceive(actor, grid);
    snapshot.needs = snapshot.physiology;
    snapshot.resources = {
      nearestFood: perception.nearestFood,
      nearestWater: perception.nearestWater,
    };
    snapshot.threats = perception.threats.slice(0, 3).map((threat) => ({
      id: "wolf-" + threat.id,
      relativePosition: { dx: threat.dx, dy: threat.dy },
      distance: Number(threat.distance.toFixed(1)),
      behavior: threat.state,
    }));
    snapshot.behaviorModel = {
      type: "weighted utility state machine",
      currentState: actor.mind.state,
      previousState: actor.mind.previousState,
      stateAge: actor.mind.stateAge,
      transition: actor.mind.transition,
      priorities: actor.mind.priorities.slice(0, 5),
      fearCorruption: actor.mind.corruption,
      vision: actor.mind.vision,
      route: actor.mind.route,
      context: actor.mind.context,
      allowedNextStates: actor.mind.allowedNextStates,
      graph: window.ElkMindModule.graphSnapshot(),
      sacrificeRule: "Only BREAKOUT may accept the explicit health and stamina cost of sacrifice.",
    };
  } else {
    snapshot.prey = {
      relativePosition: { dx: gazelle.x - actor.x, dy: gazelle.y - actor.y },
      distance: Number(Math.hypot(gazelle.x - actor.x, gazelle.y - actor.y).toFixed(1)),
      health: Math.round(gazelle.vitalityStats.health),
    };
  }
  return snapshot;
};

const getInferenceStatus = () => IS_STATIC_HOSTED
  ? Promise.resolve({ configured: false, model: CEREBRAS_MODEL_ID, hostedStatic: true })
  : requestInferenceJson("/api/inference/status");

const configureInference = (apiKey) => IS_STATIC_HOSTED
  ? Promise.reject(new Error(STATIC_HOST_MESSAGE))
  : requestInferenceJson("/api/inference/config", { method: "POST", body: JSON.stringify({ apiKey }) });

const disconnectInference = () => IS_STATIC_HOSTED
  ? Promise.resolve({ configured: false })
  : requestInferenceJson("/api/inference/config", { method: "DELETE" });

const requestAnimalDecision = async (actor, grid, gazelle, instinct) => {
  const snapshot = buildAnimalSnapshot(actor, grid, gazelle, instinct);
  const payload = await requestInferenceJson("/api/inference/decision", {
    method: "POST",
    body: JSON.stringify({ snapshot }),
  });
  const decision = payload.decision || {};
  if (!snapshot.allowedDirections.includes(decision.direction)) throw new Error("Gemma selected a blocked direction");
  if (!snapshot.allowedActions.includes(decision.action)) throw new Error("Gemma selected an invalid action");
  if (!snapshot.allowedIntents.includes(decision.intent)) throw new Error("Gemma selected an invalid intent");
  const move = window.AgentModule.DIRECTIONS.find((entry) => entry.name === decision.direction);
  const expectedX = actor.x + (move?.dx || 0);
  const expectedY = actor.y + (move?.dy || 0);
  if (decision.target?.x !== expectedX || decision.target?.y !== expectedY) {
    throw new Error("Gemma returned a target inconsistent with its direction");
  }
  const targetCell = grid.getCell(expectedX, expectedY);
  if (decision.action === "drink" && !targetCell.water) throw new Error("Gemma tried to drink away from water");
  if (decision.action === "forage" && targetCell.food <= 0) throw new Error("Gemma tried to forage without food");
  if (
    decision.action === "sacrifice" &&
    actor.role === "prey" &&
    !actor.mind.context.cornered &&
    !actor.mind.context.imminent
  ) throw new Error("Gemma attempted a sacrifice outside BREAKOUT conditions");
  return {
    ...decision,
    source: "cerebras",
    model: payload.model || CEREBRAS_MODEL_ID,
    latencyMs: payload.latencyMs,
    usage: payload.usage,
  };
};

window.InferenceModule = {
  modelId: CEREBRAS_MODEL_ID,
  isStaticHosted: IS_STATIC_HOSTED,
  staticHostMessage: STATIC_HOST_MESSAGE,
  getStatus: getInferenceStatus,
  configure: configureInference,
  disconnect: disconnectInference,
  decideAnimal: requestAnimalDecision,
};
