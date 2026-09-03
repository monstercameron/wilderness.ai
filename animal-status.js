const ANIMAL_STAT_KEYS = Object.freeze(["strength", "attack", "speed", "stamina", "health", "hunger", "thirst", "fear"]);

const ANIMAL_PROFILES = Object.freeze({
  elk: {
    shape: "tall antlered endurance runner",
    stats: { strength: 56, attack: 43, speed: 64, stamina: 96, health: 100, hunger: 38, thirst: 34, fear: 16 },
    rates: { hunger: 0.3, thirst: 0.25, recovery: 0.42 },
  },
  wolf: {
    shape: "low long pursuit hunter",
    stats: { strength: 76, attack: 69, speed: 80, stamina: 64, health: 100, hunger: 34, thirst: 30, fear: 8 },
    rates: { hunger: 0.2, thirst: 0.19, recovery: 0.34 },
  },
});

const between = (random, minimum, maximum) => minimum + random() * (maximum - minimum);

const createIndividual = (type, seed) => {
  const profile = ANIMAL_PROFILES[type];
  if (!profile) throw new Error("Unknown animal profile: " + type);
  const random = window.UtilsModule.createRandom(seed);
  const statOffsets = {};
  ANIMAL_STAT_KEYS.forEach((key) => {
    const spread = key === "health" ? 0 : key === "speed" ? 2 : key === "fear" ? 5 : 7;
    statOffsets[key] = Math.round(between(random, -spread, spread));
  });
  const vitalityStats = {};
  ANIMAL_STAT_KEYS.forEach((key) => {
    vitalityStats[key] = window.UtilsModule.clamp(profile.stats[key] + statOffsets[key], 0, 100);
  });
  const morphology = type === "elk"
    ? {
        shape: profile.shape,
        bodyLength: between(random, 0.94, 1.08),
        bodyWidth: between(random, 0.91, 1.06),
        height: between(random, 0.97, 1.1),
        legLength: between(random, 0.94, 1.13),
        headScale: between(random, 0.93, 1.07),
        earTilt: between(random, -0.13, 0.13),
        hornSpread: between(random, 0.9, 1.14),
        coatShift: between(random, -0.035, 0.035),
      }
    : {
        shape: profile.shape,
        bodyLength: between(random, 0.91, 1.14),
        bodyWidth: between(random, 0.92, 1.1),
        height: between(random, 0.91, 1.08),
        legLength: between(random, 0.9, 1.12),
        headScale: between(random, 0.91, 1.1),
        earTilt: between(random, -0.16, 0.16),
        tailAngle: between(random, -0.18, 0.2),
        coatShift: between(random, -0.045, 0.045),
      };
  return {
    profileType: type,
    vitalityStats,
    baseStrength: vitalityStats.strength,
    baseAttack: vitalityStats.attack,
    baseSpeed: vitalityStats.speed,
    movementBudget: 1,
    statOffsets,
    morphology,
    specialStatuses: ["ALERT"],
  };
};

const getOpenMoves = (actor, world) => window.AgentModule.DIRECTIONS.filter((move) => {
  const cell = world.getCell(actor.x + move.dx, actor.y + move.dy);
  return !cell.hasTree;
});

const getVisibleThreat = (actor, context) => {
  if (!context.predators) return null;
  return window.PredatorModule.getThreats(context.predators, actor).find((threat) =>
    threat.distance <= 1.45 || (
      window.NavigationModule.isWithinVision(actor, threat.x, threat.y) &&
      (!context.world || window.NavigationModule.hasLineOfSight(actor, threat.x, threat.y, context.world))
    )
  ) || null;
};

const deriveSpecialStatuses = (actor, context) => {
  const stats = actor.vitalityStats;
  const statuses = [];
  if (stats.health <= 0) {
    actor.specialStatuses = ["DOWN"];
    return actor.specialStatuses;
  }
  if (stats.health < 28) statuses.push("CRITICAL");
  else if (stats.health < 68) statuses.push("WOUNDED");
  if (stats.stamina < 20) statuses.push("EXHAUSTED");
  if (stats.hunger > 82) statuses.push("STARVING");
  if (stats.thirst > 84) statuses.push("DEHYDRATED");
  if (stats.fear > 76) statuses.push("TERRIFIED");

  if (actor.role === "prey") {
    const nearest = getVisibleThreat(actor, context);
    const exits = context.world ? getOpenMoves(actor, context.world).length : 8;
    if (nearest?.distance < 8 && exits <= 2) statuses.unshift("CORNERED");
    else if (nearest?.distance < 6) statuses.unshift("HUNTED");
    else if (nearest?.distance < 12) statuses.unshift("ALERT");
    else statuses.unshift("SAFE");
  } else {
    const preyDistance = context.gazelle ? Math.hypot(context.gazelle.x - actor.x, context.gazelle.y - actor.y) : Infinity;
    if (actor.state === "GIVING UP") statuses.unshift("GIVING UP");
    else if (preyDistance <= 1.45) statuses.unshift("STRIKING RANGE");
    else if (preyDistance < 10) statuses.unshift("PURSUING");
    else if (preyDistance < 22) statuses.unshift("STALKING");
    else statuses.unshift("TRACKING");
    if (context.predators) {
      const packmateNear = context.predators.members.some((member) => member !== actor && Math.hypot(member.x - actor.x, member.y - actor.y) < 4);
      statuses.push(packmateNear ? "PACKED" : "ISOLATED");
    }
  }
  actor.specialStatuses = [...new Set(statuses)].slice(0, 4);
  return actor.specialStatuses;
};

const updateVitals = (actor, elapsedSeconds, context) => {
  const stats = actor.vitalityStats;
  const profile = ANIMAL_PROFILES[actor.profileType];
  if (!stats || !profile || stats.health <= 0) return deriveSpecialStatuses(actor, context);
  stats.hunger = window.UtilsModule.clamp(stats.hunger + elapsedSeconds * profile.rates.hunger, 0, 100);
  stats.thirst = window.UtilsModule.clamp(stats.thirst + elapsedSeconds * profile.rates.thirst, 0, 100);

  const resting = actor.lastAction === "rest" || actor.lastAction === "observe";
  if (resting) stats.stamina = window.UtilsModule.clamp(stats.stamina + elapsedSeconds * profile.rates.recovery, 0, 100);

  if (actor.role === "prey" && context.predators) {
    const nearest = getVisibleThreat(actor, context);
    const danger = nearest ? window.UtilsModule.clamp((13 - nearest.distance) / 13, 0, 1) : 0;
    const targetFear = danger * 100;
    stats.fear = window.UtilsModule.clamp(stats.fear + (targetFear - stats.fear) * Math.min(1, elapsedSeconds * 0.12), 0, 100);
  } else {
    const targetFear = stats.health < 35 ? 36 : 6;
    stats.fear = window.UtilsModule.clamp(stats.fear + (targetFear - stats.fear) * Math.min(1, elapsedSeconds * 0.08), 0, 100);
  }

  const deprivation = Math.max(stats.hunger - 91, stats.thirst - 93, 0);
  if (deprivation > 0) stats.health = window.UtilsModule.clamp(stats.health - elapsedSeconds * deprivation * 0.045, 0, 100);
  else if (stats.health < 100 && stats.hunger < 72 && stats.thirst < 72) stats.health = window.UtilsModule.clamp(stats.health + elapsedSeconds * 0.06, 0, 100);

  const condition = (stats.health / 100) * (0.62 + stats.stamina / 263) * (1 - Math.max(stats.hunger, stats.thirst) / 420);
  stats.strength = window.UtilsModule.clamp(actor.baseStrength * condition, 8, actor.baseStrength);
  const attackCondition = (stats.health / 100) * (0.54 + stats.stamina / 218) * (0.92 - stats.fear / 500);
  stats.attack = window.UtilsModule.clamp(actor.baseAttack * attackCondition, 6, actor.baseAttack);
  const speedCondition = (stats.health / 100) * (0.7 + stats.stamina / 333);
  stats.speed = window.UtilsModule.clamp(actor.baseSpeed * speedCondition, 10, actor.baseSpeed);
  return deriveSpecialStatuses(actor, context);
};

const spendStamina = (actor, amount) => {
  actor.vitalityStats.stamina = window.UtilsModule.clamp(actor.vitalityStats.stamina - amount, 0, 100);
};

const recover = (actor, amount) => {
  actor.vitalityStats.stamina = window.UtilsModule.clamp(actor.vitalityStats.stamina + amount, 0, 100);
  actor.vitalityStats.fear = window.UtilsModule.clamp(actor.vitalityStats.fear - amount * 0.3, 0, 100);
};

window.AnimalStatusModule = {
  statKeys: ANIMAL_STAT_KEYS,
  profiles: ANIMAL_PROFILES,
  createIndividual,
  deriveSpecialStatuses,
  updateVitals,
  spendStamina,
  recover,
};
