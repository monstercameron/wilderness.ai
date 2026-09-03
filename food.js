const createForageAssets = (materials) => {
  const stemGeometry = new THREE.CylinderGeometry(0.045, 0.06, 0.28, 5);
  stemGeometry.rotateX(Math.PI / 2);
  const bladeGeometry = new THREE.ConeGeometry(0.055, 0.48, 4);
  bladeGeometry.rotateX(Math.PI / 2);
  return {
    berryGeometry: new THREE.IcosahedronGeometry(0.14, 1),
    leafGeometry: new THREE.ConeGeometry(0.12, 0.36, 5),
    cloverGeometry: new THREE.TetrahedronGeometry(0.13, 0),
    capGeometry: new THREE.SphereGeometry(0.13, 7, 4),
    lichenGeometry: new THREE.DodecahedronGeometry(0.15, 0),
    stemGeometry,
    bladeGeometry,
    materials,
  };
};

const addForageMesh = (group, geometry, material, x, y, z, scale = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.setScalar(scale);
  mesh.castShadow = true;
  group.add(mesh);
};

const createForageVisual = (cell, assets, random) => {
  const forage = new THREE.Group();
  forage.position.set(cell.x, cell.y, cell.height + 0.1);
  forage.name = `forage_${cell.x}_${cell.y}`;
  forage.userData.foodAmount = cell.food;
  forage.userData.resourceType = cell.foodType;
  const material = assets.materials.resources[cell.foodType] || assets.materials.forage;

  if (cell.foodType === "mushrooms") {
    for (let index = 0; index < 4; index++) {
      const x = (random() - 0.5) * 0.48;
      const y = (random() - 0.5) * 0.48;
      const scale = 0.7 + random() * 0.5;
      addForageMesh(forage, assets.stemGeometry, assets.materials.forageLeaf, x, y, 0.12 * scale, scale);
      addForageMesh(forage, assets.capGeometry, material, x, y, 0.27 * scale, scale);
    }
  } else if (cell.foodType === "watergrass") {
    for (let index = 0; index < 7; index++) {
      addForageMesh(
        forage,
        assets.bladeGeometry,
        material,
        (random() - 0.5) * 0.55,
        (random() - 0.5) * 0.55,
        0.18,
        0.75 + random() * 0.75
      );
    }
  } else if (cell.foodType === "clover") {
    for (let index = 0; index < 6; index++) {
      addForageMesh(
        forage,
        assets.cloverGeometry,
        material,
        (random() - 0.5) * 0.5,
        (random() - 0.5) * 0.5,
        0.08 + random() * 0.05,
        0.65 + random() * 0.45
      );
    }
  } else if (cell.foodType === "lichen") {
    for (let index = 0; index < 4; index++) {
      addForageMesh(
        forage,
        assets.lichenGeometry,
        material,
        (random() - 0.5) * 0.5,
        (random() - 0.5) * 0.5,
        0.06,
        0.55 + random() * 0.45
      );
    }
  } else {
    [[-0.18, -0.08, 0.12], [0.16, -0.03, 0.16], [0.02, 0.16, 0.2], [0.2, 0.2, 0.13]].forEach(([x, y, z]) => {
      addForageMesh(forage, assets.berryGeometry, material, x, y, z + random() * 0.05, 0.8 + random() * 0.3);
    });
    const leaf = new THREE.Mesh(assets.leafGeometry, assets.materials.forageLeaf);
    leaf.rotation.x = Math.PI / 2;
    leaf.rotation.z = random() * Math.PI * 2;
    leaf.position.set(0, 0, 0.06);
    leaf.scale.set(1.5, 1, 1.5);
    forage.add(leaf);
  }
  return forage;
};

const createFoodChunk = (cells, group, materials, chunkX, chunkY) => {
  const { seed } = window.UtilsModule.WORLD_CONFIG;
  const random = window.UtilsModule.createRandom(seed + Math.imul(chunkX, 104729) + Math.imul(chunkY, 130363) + 404);
  const assets = createForageAssets(materials);
  const visuals = new Map();
  cells.filter((cell) => cell.food > 0).forEach((cell) => {
    const visual = createForageVisual(cell, assets, random);
    visuals.set(window.UtilsModule.positionKey(cell.x, cell.y), visual);
    group.add(visual);
  });
  return { visuals, assets };
};

window.FoodPlacementModule = { createChunk: createFoodChunk };
