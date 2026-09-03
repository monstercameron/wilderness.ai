const DIRECTION_ANGLES = Object.freeze({
  N: 0,
  NE: -Math.PI / 4,
  E: -Math.PI / 2,
  SE: (-3 * Math.PI) / 4,
  S: Math.PI,
  SW: (3 * Math.PI) / 4,
  W: Math.PI / 2,
  NW: Math.PI / 4,
});

const addMesh = (group, geometry, material, position, scale, rotation = null) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};

const createCognitionVisuals = (scene) => {
  const visionMaterial = new THREE.LineBasicMaterial({ color: 0xb8d889, transparent: true, opacity: 0.28, depthTest: false });
  const routeMaterial = new THREE.LineBasicMaterial({ color: 0xf0cf79, transparent: true, opacity: 0.82, depthTest: false });
  const vision = new THREE.LineLoop(new THREE.BufferGeometry(), visionMaterial);
  const route = new THREE.Line(new THREE.BufferGeometry(), routeMaterial);
  vision.name = "nia-vision-encirclement";
  route.name = "nia-visible-route";
  vision.renderOrder = 4;
  route.renderOrder = 5;
  route.visible = false;
  scene.add(vision, route);
  return { vision, route };
};

const updateCognitionVisuals = (gazelle, grid) => {
  if (!gazelle.cognitionVisuals) return;
  const boundary = window.NavigationModule.getVisionBoundary(gazelle).map((point) =>
    new THREE.Vector3(point.x, point.y, window.UtilsModule.terrainHeight(point.x, point.y) + 0.11)
  );
  gazelle.cognitionVisuals.vision.geometry.dispose();
  gazelle.cognitionVisuals.vision.geometry = new THREE.BufferGeometry().setFromPoints(boundary);

  const routeNodes = (gazelle.mind.route?.path || []).filter((node) => node.x !== gazelle.x || node.y !== gazelle.y);
  const routePoints = [{ x: gazelle.x, y: gazelle.y }, ...routeNodes].map((point) => {
    const worldPoint = window.GridModule.getCellWorldPosition(grid, point.x, point.y, 0.16);
    return new THREE.Vector3(worldPoint.x, worldPoint.y, worldPoint.z);
  });
  gazelle.cognitionVisuals.route.geometry.dispose();
  gazelle.cognitionVisuals.route.geometry = new THREE.BufferGeometry().setFromPoints(routePoints);
  gazelle.cognitionVisuals.route.visible = routeNodes.length > 0;
};

const createGazelleModel = (materials, morphology) => {
  const root = new THREE.Group();
  root.name = "elk-agent";
  root.scale.set(1.28 * morphology.bodyWidth, 1.28 * morphology.bodyLength, 1.28 * morphology.height);

  const model = new THREE.Group();
  root.add(model);

  const coat = materials.coat.clone();
  const lightCoat = materials.lightCoat.clone();
  coat.color.offsetHSL(morphology.coatShift, 0, morphology.coatShift * 0.35);
  lightCoat.color.offsetHSL(morphology.coatShift, 0, morphology.coatShift * 0.25);

  const sphere = new THREE.IcosahedronGeometry(1, 2);
  const cylinder = new THREE.CylinderGeometry(0.09, 0.075, 1, 6);
  const earGeometry = new THREE.ConeGeometry(0.1, 0.34, 5);
  const hornGeometry = new THREE.CylinderGeometry(0.025, 0.045, 0.62, 6);
  const tineGeometry = new THREE.CylinderGeometry(0.014, 0.026, 0.28, 5);

  addMesh(model, sphere, coat, [0, 0, 0.78], [0.52, 0.88, 0.47]);
  addMesh(model, sphere, lightCoat, [0, 0.18, 0.75], [0.42, 0.65, 0.39]);
  addMesh(model, sphere, coat, [0, 0.78, 1.18], [0.3 * morphology.headScale, 0.4 * morphology.headScale, 0.34 * morphology.headScale]);
  addMesh(model, sphere, materials.dark, [0, 1.06, 1.1], [0.2, 0.28, 0.18]);

  [
    [-0.18, -0.46],
    [0.18, -0.46],
    [-0.18, 0.46],
    [0.18, 0.46],
  ].forEach(([x, y]) => {
    addMesh(model, cylinder, coat, [x, y, 0.34 * morphology.legLength], [0.72, 0.72 * morphology.legLength, 0.72], [Math.PI / 2, 0, 0]);
    addMesh(model, cylinder, materials.dark, [x, y, 0.08], [0.5, 0.5, 0.38], [Math.PI / 2, 0, 0]);
  });

  addMesh(model, earGeometry, coat, [-0.2, 0.85, 1.48], [0.78, 1, 0.65], [Math.PI / 2, 0, -0.5 - morphology.earTilt]);
  addMesh(model, earGeometry, coat, [0.2, 0.85, 1.48], [0.78, 1, 0.65], [Math.PI / 2, 0, 0.5 + morphology.earTilt]);
  addMesh(model, hornGeometry, materials.dark, [-0.11 * morphology.hornSpread, 0.68, 1.67], [1, 1, 1], [0.16, 0, -0.08 * morphology.hornSpread]);
  addMesh(model, hornGeometry, materials.dark, [0.11 * morphology.hornSpread, 0.68, 1.67], [1, 1, 1], [0.16, 0, 0.08 * morphology.hornSpread]);
  [-1, 1].forEach((side) => {
    addMesh(model, tineGeometry, materials.dark, [side * 0.18 * morphology.hornSpread, 0.69, 1.76], [1, 1, 1], [0.45, 0, side * 0.72]);
    addMesh(model, tineGeometry, materials.dark, [side * 0.22 * morphology.hornSpread, 0.7, 1.96], [0.9, 0.9, 0.9], [0.35, 0, side * 0.82]);
  });

  const eyeGeometry = new THREE.SphereGeometry(0.035, 10, 8);
  addMesh(model, eyeGeometry, materials.eye, [-0.22, 0.99, 1.28], [1, 1, 1]);
  addMesh(model, eyeGeometry, materials.eye, [0.22, 0.99, 1.28], [1, 1, 1]);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.025, 8, 48), materials.accent);
  ring.position.z = 0.045;
  root.add(ring);

  const beacon = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.14, 24), materials.accent);
  beacon.position.z = 2.25;
  root.add(beacon);

  root.userData.model = model;
  root.userData.ring = ring;
  root.userData.targetPosition = new THREE.Vector3();
  root.userData.targetAngle = 0;
  root.userData.motion = 0;
  root.userData.shape = morphology.shape;
  return root;
};

const findSpawn = (grid, random) => {
  for (let radius = 0; radius < 24; radius++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = Math.round((random() - 0.5) * radius * 2);
      const y = Math.round((random() - 0.5) * radius * 2);
      const cell = grid.getCell(x, y);
      let blockedNeighbors = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (grid.getCell(x + dx, y + dy).hasTree) blockedNeighbors++;
        }
      }
      if (!cell.hasTree && !cell.water && cell.food === 0 && blockedNeighbors <= 2) return { x, y };
    }
  }
  throw new Error("Unable to find an open elk spawn");
};

const setVisualTarget = (gazelle, grid, immediate = false) => {
  const target = window.GridModule.getCellWorldPosition(grid, gazelle.x, gazelle.y, 0.04);
  gazelle.visual.userData.targetPosition.copy(target);
  gazelle.visual.userData.targetAngle = DIRECTION_ANGLES[gazelle.direction] ?? 0;
  if (immediate) {
    gazelle.visual.position.copy(target);
    gazelle.visual.rotation.z = gazelle.visual.userData.targetAngle;
  }
};

const createGazelle = (grid, scene, materials) => {
  const random = window.UtilsModule.createRandom(window.UtilsModule.WORLD_CONFIG.seed + 505);
  const spawn = findSpawn(grid, random);
  const individual = window.AnimalStatusModule.createIndividual("elk", window.UtilsModule.WORLD_CONFIG.seed + 805);
  const visual = createGazelleModel(materials.gazelle, individual.morphology);
  const cognitionVisuals = createCognitionVisuals(scene);
  scene.add(visual);

  const gazelle = {
    ...spawn,
    id: "nia",
    name: "Nia",
    species: "elk",
    role: "prey",
    direction: "N",
    visual,
    cognitionVisuals,
    thoughts: "Reading the wind and building a map of this place.",
    lastDecision: "Establishing a local map.",
    lastAction: "observe",
    stepCount: 0,
    mind: window.ElkMindModule.createMind(),
    ...individual,
    memory: {
      origin: { ...spawn },
      visits: new Map([[window.UtilsModule.positionKey(spawn.x, spawn.y), 1]]),
      foodFound: 0,
    },
  };

  setVisualTarget(gazelle, grid, true);
  updateCognitionVisuals(gazelle, grid);
  return gazelle;
};

const move = (gazelle, direction, grid) => {
  if (direction === "STAY") return { moved: false, consumed: 0, drank: false };
  const moveDefinition = window.AgentModule.DIRECTIONS.find((entry) => entry.name === direction);
  if (!moveDefinition) return { moved: false, consumed: 0 };

  const x = gazelle.x + moveDefinition.dx;
  const y = gazelle.y + moveDefinition.dy;
  const destination = grid.getCell(x, y);
  if (destination.hasTree) {
    gazelle.thoughts = "Dense trees block that path.";
    return { moved: false, consumed: 0 };
  }

  const consumed = destination.food;
  const drank = destination.water;
  if (consumed > 0) {
    destination.food = 0;
    gazelle.vitalityStats.hunger = window.UtilsModule.clamp(
      gazelle.vitalityStats.hunger - consumed * 5,
      0,
      100
    );
    gazelle.memory.foodFound++;
    gazelle.thoughts = "Sweet berries. Energy for the trail ahead.";
  }

  if (drank) {
    gazelle.vitalityStats.thirst = window.UtilsModule.clamp(
      gazelle.vitalityStats.thirst - 34,
      0,
      100
    );
    gazelle.thoughts = "Cool water. I can travel farther now.";
  }

  gazelle.x = x;
  gazelle.y = y;
  gazelle.direction = direction;
  gazelle.stepCount++;
  const key = window.UtilsModule.positionKey(x, y);
  gazelle.memory.visits.set(key, (gazelle.memory.visits.get(key) || 0) + 1);
  setVisualTarget(gazelle, grid);
  return { moved: true, consumed, drank };
};

const applyGazelleDecision = (gazelle, decision, grid) => {
  if (decision.direction !== "STAY") {
    const result = move(gazelle, decision.direction, grid);
    if (result.moved) {
      if (decision.action === "sacrifice") {
        window.AnimalStatusModule.spendStamina(gazelle, 11.5);
        gazelle.vitalityStats.health = window.UtilsModule.clamp(gazelle.vitalityStats.health - 2.5, 0, 100);
        gazelle.vitalityStats.fear = window.UtilsModule.clamp(gazelle.vitalityStats.fear - 4, 0, 100);
      } else {
        window.AnimalStatusModule.spendStamina(gazelle, decision.action === "flee" ? 5.2 : 2.4);
      }
    }
    updateCognitionVisuals(gazelle, grid);
    return result;
  }
  const cell = grid.getCell(gazelle.x, gazelle.y);
  let consumed = 0;
  let drank = false;
  if (decision.action === "forage" && cell.food > 0) {
    consumed = cell.food;
    cell.food = 0;
    gazelle.vitalityStats.hunger = window.UtilsModule.clamp(gazelle.vitalityStats.hunger - consumed * 5, 0, 100);
    gazelle.vitalityStats.stamina = window.UtilsModule.clamp(gazelle.vitalityStats.stamina + consumed * 1.5, 0, 100);
    gazelle.memory.foodFound++;
  } else if (decision.action === "drink" && cell.water) {
    drank = true;
    gazelle.vitalityStats.thirst = window.UtilsModule.clamp(gazelle.vitalityStats.thirst - 38, 0, 100);
  } else if (decision.action === "rest") {
    window.AnimalStatusModule.recover(gazelle, 24);
  }
  updateCognitionVisuals(gazelle, grid);
  return { moved: false, consumed, drank, acted: consumed > 0 || drank || decision.action === "rest" };
};

const updateVitality = (gazelle, elapsedSeconds, context) => window.AnimalStatusModule.updateVitals(gazelle, elapsedSeconds, context);

const shortestAngleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

const updateVisual = (gazelle, deltaSeconds, elapsedSeconds) => {
  const visual = gazelle.visual;
  const distance = visual.position.distanceTo(visual.userData.targetPosition);
  const blend = 1 - Math.exp(-deltaSeconds * 8);
  visual.position.lerp(visual.userData.targetPosition, blend);
  visual.rotation.z += shortestAngleDelta(visual.rotation.z, visual.userData.targetAngle) * blend;

  visual.userData.motion += deltaSeconds * (distance > 0.02 ? 12 : 2.2);
  const model = visual.userData.model;
  model.position.z = distance > 0.02 ? Math.abs(Math.sin(visual.userData.motion)) * 0.09 : Math.sin(elapsedSeconds * 1.8) * 0.018;
  model.rotation.y = distance > 0.02 ? Math.sin(visual.userData.motion) * 0.035 : 0;
  visual.userData.ring.material.opacity = 0.58 + Math.sin(elapsedSeconds * 2.4) * 0.16;
};

window.GazelleModule = { createGazelle, move, applyDecision: applyGazelleDecision, updateVitality, updateVisual, updateCognitionVisuals };
