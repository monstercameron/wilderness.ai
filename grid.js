const createTerrainMesh = (chunkX, chunkY, material) => {
  const { chunkSize, seed } = window.UtilsModule.WORLD_CONFIG;
  const centerX = chunkX * chunkSize + chunkSize / 2 - 0.5;
  const centerY = chunkY * chunkSize + chunkSize / 2 - 0.5;
  const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, chunkSize, chunkSize);
  const positions = geometry.attributes.position;
  const colors = [];

  for (let index = 0; index < positions.count; index++) {
    const worldX = centerX + positions.getX(index);
    const worldY = centerY + positions.getY(index);
    const height = window.UtilsModule.terrainHeight(worldX, worldY);
    positions.setZ(index, height);
    const elevation = window.UtilsModule.clamp((height + 1.15) / 2.35, 0, 1);
    const biome = window.UtilsModule.getBiomeAt(worldX, worldY);
    const color = new THREE.Color(biome.low).lerp(new THREE.Color(biome.high), elevation);
    const mottling = window.UtilsModule.valueNoise(worldX * 0.12, worldY * 0.12, seed + 91) - 0.5;
    color.offsetHSL(0, 0, mottling * 0.055);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, material);
  terrain.position.set(centerX, centerY, 0);
  terrain.receiveShadow = true;
  terrain.name = `terrain_${chunkX}_${chunkY}`;
  return terrain;
};

const createGrassInstances = (cells, material, chunkX, chunkY) => {
  const { seed } = window.UtilsModule.WORLD_CONFIG;
  const random = window.UtilsModule.createRandom(seed + Math.imul(chunkX, 73856093) + Math.imul(chunkY, 19349663) + 17);
  const candidates = cells.filter((cell) => !cell.water && !cell.hasTree);
  const count = Math.min(180, candidates.length);
  if (!count) {
    const emptyGrass = new THREE.Group();
    emptyGrass.name = `grass_${chunkX}_${chunkY}`;
    return emptyGrass;
  }
  const geometry = new THREE.ConeGeometry(0.035, 0.32, 3);
  geometry.translate(0, 0.16, 0);
  geometry.rotateX(Math.PI / 2);
  const grass = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  const axis = new THREE.Vector3(0, 0, 1);

  for (let index = 0; index < count; index++) {
    const cell = candidates[Math.floor(random() * candidates.length)];
    const x = cell.x + (random() - 0.5) * 0.8;
    const y = cell.y + (random() - 0.5) * 0.8;
    position.set(x, y, window.UtilsModule.terrainHeight(x, y) + 0.02);
    quaternion.setFromAxisAngle(axis, random() * Math.PI * 2);
    const height = 0.65 + random() * 0.8;
    scale.set(0.8 + random() * 0.65, 0.8 + random() * 0.65, height);
    matrix.compose(position, quaternion, scale);
    grass.setMatrixAt(index, matrix);
    const biome = window.UtilsModule.BIOMES[cell.biome] || window.UtilsModule.BIOMES.meadow;
    color.set(biome.grass).offsetHSL((random() - 0.5) * 0.025, 0, (random() - 0.5) * 0.08);
    grass.setColorAt(index, color);
  }

  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  grass.name = `grass_${chunkX}_${chunkY}`;
  grass.receiveShadow = true;
  return grass;
};

const createFlowerInstances = (cells, material, chunkX, chunkY) => {
  const flowerCells = cells.filter((cell) => {
    if (cell.water || cell.hasTree || !["meadow", "wetland"].includes(cell.biome)) return false;
    return window.UtilsModule.hashNoise(cell.x, cell.y, window.UtilsModule.WORLD_CONFIG.seed + 611) > 0.82;
  });
  if (!flowerCells.length) return new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(0.055, 0);
  const flowers = new THREE.InstancedMesh(geometry, material, flowerCells.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  const random = window.UtilsModule.createRandom(window.UtilsModule.WORLD_CONFIG.seed + chunkX * 1877 + chunkY * 2089);
  const palette = [0xe8d18a, 0xd69aa2, 0xb8cde1, 0xd9ded0];
  flowerCells.forEach((cell, index) => {
    position.set(cell.x + (random() - 0.5) * 0.55, cell.y + (random() - 0.5) * 0.55, cell.height + 0.17);
    const size = 0.7 + random() * 0.8;
    scale.set(size, size, size);
    matrix.compose(position, quaternion, scale);
    flowers.setMatrixAt(index, matrix);
    color.set(palette[Math.floor(random() * palette.length)]);
    flowers.setColorAt(index, color);
  });
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  flowers.name = `wildflowers_${chunkX}_${chunkY}`;
  return flowers;
};

const createRockInstances = (cells, material, chunkX, chunkY) => {
  const rockCells = cells.filter((cell) => {
    if (cell.water || cell.hasTree || cell.food) return false;
    const chance = window.UtilsModule.hashNoise(cell.x, cell.y, window.UtilsModule.WORLD_CONFIG.seed + 521);
    return chance > (cell.biome === "highland" ? 0.82 : cell.biome === "scrub" ? 0.96 : 0.992);
  });
  if (!rockCells.length) return { group: new THREE.Group(), count: 0 };

  const geometry = new THREE.DodecahedronGeometry(0.34, 0);
  const rocks = new THREE.InstancedMesh(geometry, material, rockCells.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  const random = window.UtilsModule.createRandom(window.UtilsModule.WORLD_CONFIG.seed + chunkX * 7001 + chunkY * 9001);

  rockCells.forEach((cell, index) => {
    position.set(cell.x, cell.y, cell.height + 0.2);
    quaternion.setFromEuler(new THREE.Euler(random() * 0.35, random() * 0.35, random() * Math.PI));
    const size = 0.65 + random() * 1.25;
    scale.set(size * (0.8 + random() * 0.5), size, size * (0.55 + random() * 0.35));
    matrix.compose(position, quaternion, scale);
    rocks.setMatrixAt(index, matrix);
    color.set(cell.biome === "scrub" ? 0x806b4b : 0x74786f).offsetHSL(0, 0, (random() - 0.5) * 0.12);
    rocks.setColorAt(index, color);
  });
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  rocks.name = `rocks_${chunkX}_${chunkY}`;
  return { group: rocks, count: rockCells.length };
};

const disposeChunk = (chunk) => {
  const geometries = new Set();
  chunk.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
  });
  geometries.forEach((geometry) => geometry.dispose());
  if (chunk.group.parent) chunk.group.parent.remove(chunk.group);
};

const createWorld = (scene, materials) => {
  const { chunkSize, streamRadius } = window.UtilsModule.WORLD_CONFIG;
  const world = {
    scene,
    materials,
    chunks: new Map(),
    cellCache: new Map(),
    depletedFood: new Set(),
    streamSignature: "",
    stats: { chunkCount: 0, treeCount: 0, foodCount: 0, waterCount: 0 },
  };

  world.getCell = (x, y) => {
    const cellX = Math.round(x);
    const cellY = Math.round(y);
    const key = window.UtilsModule.positionKey(cellX, cellY);
    if (!world.cellCache.has(key)) {
      world.cellCache.set(key, window.UtilsModule.createCellDescriptor(cellX, cellY, world.depletedFood));
    }
    return world.cellCache.get(key);
  };

  const buildChunk = (chunkX, chunkY) => {
    const key = window.UtilsModule.chunkKey(chunkX, chunkY);
    const group = new THREE.Group();
    group.name = `region_${key}`;
    const cells = [];
    const startX = chunkX * chunkSize;
    const startY = chunkY * chunkSize;
    for (let x = startX; x < startX + chunkSize; x++) {
      for (let y = startY; y < startY + chunkSize; y++) cells.push(world.getCell(x, y));
    }

    group.add(createTerrainMesh(chunkX, chunkY, materials.terrain));
    group.add(createGrassInstances(cells, materials.grass, chunkX, chunkY));
    group.add(createFlowerInstances(cells, materials.flower, chunkX, chunkY));
    const rocks = createRockInstances(cells, materials.rock, chunkX, chunkY);
    group.add(rocks.group);
    const trees = window.TreePlacementModule.createChunk(cells, group, materials, chunkX, chunkY);
    const water = window.WaterModule.createChunk(cells, group, materials, chunkX, chunkY);
    const food = window.FoodPlacementModule.createChunk(cells, group, materials, chunkX, chunkY);
    scene.add(group);
    world.chunks.set(key, { key, chunkX, chunkY, group, cells, rocks, trees, water, food });
  };

  const refreshStats = () => {
    let treeCount = 0;
    let foodCount = 0;
    let waterCount = 0;
    world.chunks.forEach((chunk) => {
      treeCount += chunk.trees.count;
      foodCount += chunk.food.visuals.size;
      waterCount += chunk.water.count;
    });
    Object.assign(world.stats, { chunkCount: world.chunks.size, treeCount, foodCount, waterCount });
  };

  world.updateStreaming = (focusPoints) => {
    const centers = focusPoints.map((point) => ({
      x: window.UtilsModule.worldToChunk(point.x),
      y: window.UtilsModule.worldToChunk(point.y),
    }));
    const signature = centers.map(({ x, y }) => `${x}:${y}`).sort().join("|");
    if (signature === world.streamSignature) return false;
    world.streamSignature = signature;

    const desired = new Map();
    centers.forEach((center) => {
      for (let dx = -streamRadius; dx <= streamRadius; dx++) {
        for (let dy = -streamRadius; dy <= streamRadius; dy++) {
          const chunkX = center.x + dx;
          const chunkY = center.y + dy;
          desired.set(window.UtilsModule.chunkKey(chunkX, chunkY), { chunkX, chunkY });
        }
      }
    });

    desired.forEach(({ chunkX, chunkY }, key) => {
      if (!world.chunks.has(key)) buildChunk(chunkX, chunkY);
    });
    world.chunks.forEach((chunk, key) => {
      if (desired.has(key)) return;
      disposeChunk(chunk);
      world.chunks.delete(key);
      chunk.cells.forEach((cell) => world.cellCache.delete(window.UtilsModule.positionKey(cell.x, cell.y)));
    });

    refreshStats();
    window.UtilsModule.debug("streamed regions", { centers, active: world.chunks.size });
    return true;
  };

  world.consumeFood = (x, y) => {
    const key = window.UtilsModule.positionKey(x, y);
    world.depletedFood.add(key);
    world.getCell(x, y).food = 0;
    const regionKey = window.UtilsModule.chunkKey(window.UtilsModule.worldToChunk(x), window.UtilsModule.worldToChunk(y));
    const chunk = world.chunks.get(regionKey);
    const visual = chunk?.food.visuals.get(key);
    if (visual) {
      if (visual.parent) visual.parent.remove(visual);
      chunk.food.visuals.delete(key);
      refreshStats();
    }
  };

  world.updateStreaming([{ x: 0, y: 0 }]);
  return world;
};

const getCellWorldPosition = (world, x, y, zOffset = 0) => {
  const cell = world.getCell(x, y);
  return new THREE.Vector3(cell.x, cell.y, cell.height + zOffset);
};

window.GridModule = { createWorld, getCellWorldPosition };
