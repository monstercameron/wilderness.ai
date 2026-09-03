const PREDATOR_ANGLES = Object.freeze({
  N: 0,
  NE: -Math.PI / 4,
  E: -Math.PI / 2,
  SE: (-3 * Math.PI) / 4,
  S: Math.PI,
  SW: (3 * Math.PI) / 4,
  W: Math.PI / 2,
  NW: Math.PI / 4,
});

const addPredatorMesh = (group, geometry, material, position, scale, rotation = null) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};

const createPredatorModel = (materials, index, morphology) => {
  const root = new THREE.Group();
  root.name = `dusk-wolf-${index + 1}`;
  root.scale.set(1.04 * morphology.bodyWidth, 1.04 * morphology.bodyLength, 1.04 * morphology.height);
  const model = new THREE.Group();
  root.add(model);

  const coat = materials.coat.clone();
  const ruff = materials.ruff.clone();
  coat.color.offsetHSL(morphology.coatShift, 0, morphology.coatShift * 0.3);
  ruff.color.offsetHSL(morphology.coatShift, 0, morphology.coatShift * 0.2);

  const body = new THREE.IcosahedronGeometry(1, 1);
  const leg = new THREE.CylinderGeometry(0.07, 0.055, 0.78, 5);
  const ear = new THREE.ConeGeometry(0.1, 0.3, 4);
  const tail = new THREE.ConeGeometry(0.11, 0.85, 6);
  const eye = new THREE.SphereGeometry(0.035, 8, 6);

  addPredatorMesh(model, body, coat, [0, 0, 0.68], [0.42, 0.82, 0.4]);
  addPredatorMesh(model, body, ruff, [0, 0.5, 0.82], [0.4, 0.42, 0.46]);
  addPredatorMesh(model, body, coat, [0, 0.86, 0.94], [0.31 * morphology.headScale, 0.4 * morphology.headScale, 0.32 * morphology.headScale]);
  addPredatorMesh(model, body, materials.muzzle, [0, 1.18, 0.85], [0.2, 0.34, 0.18]);
  addPredatorMesh(model, tail, ruff, [0, -0.84, 0.82], [1, 1, 1], [Math.PI / 2 + 0.35 + morphology.tailAngle, 0, 0]);

  [[-0.2, -0.43], [0.2, -0.43], [-0.2, 0.43], [0.2, 0.43]].forEach(([x, y]) => {
    addPredatorMesh(model, leg, ruff, [x, y, 0.25 * morphology.legLength], [1, morphology.legLength, 1], [Math.PI / 2, 0, 0]);
  });

  addPredatorMesh(model, ear, ruff, [-0.18, 0.88, 1.27], [1, 1, 1], [Math.PI / 2, 0, -0.22 - morphology.earTilt]);
  addPredatorMesh(model, ear, ruff, [0.18, 0.88, 1.27], [1, 1, 1], [Math.PI / 2, 0, 0.22 + morphology.earTilt]);
  addPredatorMesh(model, eye, materials.eye, [-0.2, 1.1, 1.02], [1, 1, 1]);
  addPredatorMesh(model, eye, materials.eye, [0.2, 1.1, 1.02], [1, 1, 1]);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.022, 7, 36), materials.threat);
  ring.position.z = 0.04;
  root.add(ring);
  root.userData.model = model;
  root.userData.ring = ring;
  root.userData.targetPosition = new THREE.Vector3();
  root.userData.targetAngle = 0;
  root.userData.motion = index * 1.7;
  root.userData.shape = morphology.shape;
  return root;
};

const findPredatorSpawn = (world, gazelle, index) => {
  const random = window.UtilsModule.createRandom(window.UtilsModule.WORLD_CONFIG.seed + 1103 + index * 97);
  for (let attempt = 0; attempt < 80; attempt++) {
    const angle = random() * Math.PI * 2;
    const radius = 14 + random() * 11;
    const x = Math.round(gazelle.x + Math.cos(angle) * radius);
    const y = Math.round(gazelle.y + Math.sin(angle) * radius);
    const cell = world.getCell(x, y);
    if (!cell.hasTree && !cell.water) return { x, y };
  }
  return { x: gazelle.x + 16 + index * 2, y: gazelle.y + 12 };
};

const setPredatorTarget = (predator, world, immediate = false) => {
  const target = window.GridModule.getCellWorldPosition(world, predator.x, predator.y, 0.04);
  predator.visual.userData.targetPosition.copy(target);
  predator.visual.userData.targetAngle = PREDATOR_ANGLES[predator.direction] ?? 0;
  if (immediate) {
    predator.visual.position.copy(target);
    predator.visual.rotation.z = predator.visual.userData.targetAngle;
  }
};

const createPredatorPack = (world, scene, materials, gazelle, count = 3) => {
  const members = [];
  for (let index = 0; index < count; index++) {
    const spawn = findPredatorSpawn(world, gazelle, index);
    const individual = window.AnimalStatusModule.createIndividual("wolf", window.UtilsModule.WORLD_CONFIG.seed + 1801 + index * 131);
    const visual = createPredatorModel(materials.predator, index, individual.morphology);
    scene.add(visual);
    const predator = {
      id: index + 1,
      name: `Wolf ${index + 1}`,
      species: "dusk wolf",
      role: "predator",
      ...spawn,
      direction: "S",
      visual,
      state: "ROAMING",
      attackCooldown: index * 0.7,
      giveUpTurns: 0,
      stepCount: 0,
      lastAction: "observe",
      lastDecision: "Reading scent and terrain.",
      ...individual,
    };
    setPredatorTarget(predator, world, true);
    members.push(predator);
  }
  return {
    species: "Dusk wolves",
    members,
    accumulator: 0,
    attackCount: 0,
    biteHits: 0,
    kickHits: 0,
    combatRandom: window.UtilsModule.createRandom(window.UtilsModule.WORLD_CONFIG.seed + 3901),
    lastCombat: null,
    lastEvent: "No contact yet. Bite and counter-kick rolls will appear here.",
  };
};

const getPredatorThreats = (pack, gazelle) =>
  pack.members
    .filter((predator) => predator.vitalityStats.health > 0)
    .map((predator) => ({
      id: predator.id,
      x: predator.x,
      y: predator.y,
      dx: predator.x - gazelle.x,
      dy: predator.y - gazelle.y,
      distance: Math.hypot(predator.x - gazelle.x, predator.y - gazelle.y),
      state: predator.state,
    }))
    .sort((a, b) => a.distance - b.distance);

const getNearestPredator = (pack, gazelle) => getPredatorThreats(pack, gazelle)[0] || null;

const findNearestWater = (predator, world, radius = 7) => {
  let nearest = null;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const distance = Math.hypot(dx, dy);
      if (distance > radius || nearest?.distance <= distance) continue;
      if (world.getCell(predator.x + dx, predator.y + dy).water) nearest = { x: predator.x + dx, y: predator.y + dy, distance };
    }
  }
  return nearest;
};

const decidePredatorInstinct = (predator, gazelle, world) => {
  const distance = Math.hypot(gazelle.x - predator.x, gazelle.y - predator.y);
  const stats = predator.vitalityStats;
  const currentCell = world.getCell(predator.x, predator.y);
  predator.state = distance <= 10 ? "PURSUING" : distance <= 22 ? "STALKING" : "TRACKING";
  if (stats.health <= 0) {
    predator.state = "DOWN";
    return { direction: "STAY", action: "rest", target: { x: predator.x, y: predator.y }, thought: "I cannot continue.", reason: "Health is depleted." };
  }
  if (predator.giveUpTurns > 0) {
    predator.giveUpTurns--;
    predator.state = "GIVING UP";
    return { direction: "STAY", action: "rest", target: { x: predator.x, y: predator.y }, thought: "The elk opened too much ground. I cannot sustain this chase.", reason: "Pursuit ended temporarily after stamina collapsed with the prey still distant." };
  }
  if (currentCell.water && stats.thirst > 20) {
    predator.state = "DRINKING";
    return { direction: "STAY", action: "drink", target: { x: predator.x, y: predator.y }, thought: "The pack trail can wait while I drink.", reason: "Hydration instinct overrides the hunt on a water cell." };
  }
  if (stats.stamina < 6) {
    predator.state = "RECOVERING";
    return { direction: "STAY", action: "rest", target: { x: predator.x, y: predator.y }, thought: "I am too winded to bite or advance.", reason: "Attacks require at least 6 stamina; recovering before another contact attempt." };
  }
  if (stats.stamina < 19 && distance > 8) {
    predator.giveUpTurns = 2;
    predator.state = "GIVING UP";
    return { direction: "STAY", action: "rest", target: { x: predator.x, y: predator.y }, thought: "The elk opened too much ground. I cannot sustain this chase.", reason: "The faster sprint exhausted me before I could close the distance; abandoning pursuit for three turns." };
  }
  if (stats.stamina < 15 && distance > 2) {
    predator.state = "RESTING";
    return { direction: "STAY", action: "rest", target: { x: predator.x, y: predator.y }, thought: "I need to recover before the chase.", reason: "Low stamina forces a recovery turn." };
  }
  if (distance <= 1.45 && predator.attackCooldown <= 0) {
    return {
      direction: "STAY",
      action: "attack",
      target: { x: predator.x, y: predator.y },
      thought: "The elk is within striking distance.",
      reason: "Attack instinct triggered at close range.",
    };
  }
  let best = null;
  let bestScore = -Infinity;
  const waterTarget = stats.thirst > 68 ? findNearestWater(predator, world) : null;

  window.AgentModule.DIRECTIONS.forEach((move) => {
    const x = predator.x + move.dx;
    const y = predator.y + move.dy;
    const cell = world.getCell(x, y);
    if (cell.hasTree) return;
    const nextDistance = Math.hypot(gazelle.x - x, gazelle.y - y);
    const cover = cell.biome === "woodland" ? 1.2 : cell.biome === "scrub" ? 0.65 : 0;
    const variation = window.UtilsModule.hashNoise(x + predator.stepCount, y, 1201 + predator.id) * 0.7;
    let score = waterTarget
      ? -Math.hypot(waterTarget.x - x, waterTarget.y - y) * 2.4 + (cell.water ? 18 : 0)
      : -nextDistance * (1 + stats.hunger / 180) + cover + variation;
    if (distance > 22) score -= nextDistance * 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  });
  if (!best) {
    return {
      direction: "STAY",
      action: "rest",
      target: { x: predator.x, y: predator.y },
      thought: "The terrain closes around me.",
      reason: "No traversable adjacent cell is available.",
    };
  }
  return {
    direction: best.name,
    action: waterTarget ? (world.getCell(predator.x + best.dx, predator.y + best.dy).water ? "drink" : "move") : distance <= 10 ? "attack" : distance <= 22 ? "stalk" : "explore",
    target: { x: predator.x + best.dx, y: predator.y + best.dy },
    thought: distance <= 10 ? "The elk is close. I will cut off its escape." : "The trail continues through cover.",
    reason: distance <= 10 ? "Pursuit instinct selects the adjacent cell that closes distance." : "Tracking instinct balances scent distance with biome cover.",
  };
};

const applyPredatorDecision = (pack, predator, decision, gazelle, world) => {
  if (predator.vitalityStats.health <= 0) return false;
  const distance = Math.hypot(gazelle.x - predator.x, gazelle.y - predator.y);
  if (decision.action === "attack" && distance <= 1.45 && predator.attackCooldown <= 0) {
    predator.state = "STRIKING";
    predator.lastAction = "attack";
    predator.lastDecision = decision.reason;
    predator.attackCooldown = 4.5;
    pack.attackCount++;
    const biteChance = window.UtilsModule.clamp(
      0.61 +
        (predator.vitalityStats.attack - gazelle.vitalityStats.speed) * 0.0025 +
        (predator.vitalityStats.stamina - gazelle.vitalityStats.stamina) * 0.0015 +
        gazelle.vitalityStats.fear * 0.0012,
      0.32,
      0.86
    );
    const biteRoll = pack.combatRandom();
    const biteHit = biteRoll < biteChance;
    const biteDamage = biteHit
      ? window.UtilsModule.clamp(predator.vitalityStats.attack * 0.11 + predator.vitalityStats.strength * 0.03 - gazelle.vitalityStats.strength * 0.035, 3.5, 13)
      : 0;
    if (biteHit) {
      pack.biteHits++;
      gazelle.vitalityStats.health = window.UtilsModule.clamp(gazelle.vitalityStats.health - biteDamage, 0, 100);
      predator.vitalityStats.hunger = window.UtilsModule.clamp(predator.vitalityStats.hunger - 18, 0, 100);
    }
    gazelle.vitalityStats.fear = window.UtilsModule.clamp(gazelle.vitalityStats.fear + (biteHit ? 24 : 12), 0, 100);
    window.AnimalStatusModule.spendStamina(predator, biteHit ? 9 : 6);

    const kickChance = 0.2;
    const kickRoll = pack.combatRandom();
    const canKick = gazelle.vitalityStats.health > 0 && gazelle.vitalityStats.stamina >= 4;
    const kickHit = canKick && kickRoll < kickChance;
    const kickDamage = kickHit
      ? window.UtilsModule.clamp(gazelle.vitalityStats.attack * 0.12 + gazelle.vitalityStats.strength * 0.04 - predator.vitalityStats.strength * 0.025, 3, 11)
      : 0;
    if (canKick) window.AnimalStatusModule.spendStamina(gazelle, kickHit ? 7 : 4);
    if (kickHit) {
      pack.kickHits++;
      predator.vitalityStats.health = window.UtilsModule.clamp(predator.vitalityStats.health - kickDamage, 0, 100);
      predator.vitalityStats.fear = window.UtilsModule.clamp(predator.vitalityStats.fear + 18, 0, 100);
      if (predator.vitalityStats.health <= 0) predator.state = "DOWN";
    }

    const biteSummary = biteHit
      ? `bite hit for ${biteDamage.toFixed(1)} HP (roll ${Math.round(biteRoll * 100)} / ${Math.round(biteChance * 100)})`
      : `bite missed (roll ${Math.round(biteRoll * 100)} / ${Math.round(biteChance * 100)})`;
    const kickSummary = !canKick
      ? "Nia lacked stamina to counter"
      : kickHit
        ? `scramble kick hit for ${kickDamage.toFixed(1)} HP (roll ${Math.round(kickRoll * 100)} / 20)`
        : `scramble kick missed (roll ${Math.round(kickRoll * 100)} / 20)`;
    pack.lastCombat = { predatorId: predator.id, biteChance, biteRoll, biteHit, biteDamage, kickChance, kickRoll, kickHit, kickDamage };
    pack.lastEvent = `W${predator.id} ${biteSummary}; ${kickSummary}.`;
    predator.lastDecision = pack.lastEvent;
    gazelle.thoughts = kickHit ? "My scrambling kick connected—I need space now." : "A wolf is in contact. Run before it can bite again.";
    gazelle.lastDecision = pack.lastEvent;
    return true;
  }

  if (decision.direction === "STAY") {
    predator.lastAction = decision.action;
    predator.lastDecision = decision.reason;
    if (decision.action === "drink" && world.getCell(predator.x, predator.y).water) {
      predator.vitalityStats.thirst = window.UtilsModule.clamp(predator.vitalityStats.thirst - 38, 0, 100);
      return true;
    }
    if (decision.action === "rest") {
      window.AnimalStatusModule.recover(predator, 22);
      return true;
    }
    return false;
  }

  const move = window.AgentModule.DIRECTIONS.find((entry) => entry.name === decision.direction);
  if (!move) return false;
  const target = world.getCell(predator.x + move.dx, predator.y + move.dy);
  if (target.hasTree) return false;
  predator.x += move.dx;
  predator.y += move.dy;
  predator.direction = move.name;
  predator.stepCount++;
  predator.lastAction = decision.action;
  predator.lastDecision = decision.reason;
  window.AnimalStatusModule.spendStamina(predator, decision.action === "attack" ? 5.8 : 2.8);
  if (decision.action === "drink" && target.water) predator.vitalityStats.thirst = window.UtilsModule.clamp(predator.vitalityStats.thirst - 34, 0, 100);
  setPredatorTarget(predator, world);
  return true;
};

const updatePredatorVisual = (predator, deltaSeconds, elapsedSeconds) => {
  const visual = predator.visual;
  const distance = visual.position.distanceTo(visual.userData.targetPosition);
  const blend = 1 - Math.exp(-deltaSeconds * 7);
  visual.position.lerp(visual.userData.targetPosition, blend);
  const angleDelta = Math.atan2(
    Math.sin(visual.userData.targetAngle - visual.rotation.z),
    Math.cos(visual.userData.targetAngle - visual.rotation.z)
  );
  visual.rotation.z += angleDelta * blend;
  visual.userData.motion += deltaSeconds * (distance > 0.02 ? 13 : 2);
  const down = predator.vitalityStats.health <= 0;
  visual.userData.model.position.z = down ? 0 : distance > 0.02 ? Math.abs(Math.sin(visual.userData.motion)) * 0.065 : 0;
  visual.userData.model.rotation.x += ((down ? 0.95 : 0) - visual.userData.model.rotation.x) * blend;
  visual.userData.ring.material.opacity = down ? 0.08 : 0.48 + Math.sin(elapsedSeconds * 3 + predator.id) * 0.2;
};

const updatePredatorPack = (pack, gazelle, world, deltaSeconds, elapsedSeconds) => {
  pack.members.forEach((predator) => {
    predator.attackCooldown = Math.max(0, predator.attackCooldown - deltaSeconds);
    updatePredatorVisual(predator, deltaSeconds, elapsedSeconds);
  });
};

window.PredatorModule = {
  createPack: createPredatorPack,
  updatePack: updatePredatorPack,
  decide: decidePredatorInstinct,
  applyDecision: applyPredatorDecision,
  getThreats: getPredatorThreats,
  getNearest: getNearestPredator,
};
