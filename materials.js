const createMaterials = () => {
  const terrain = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });

  const treeTrunk = new THREE.MeshStandardMaterial({
    color: 0x493a2a,
    roughness: 1,
    flatShading: true,
  });

  const treeCanopy = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    flatShading: true,
    vertexColors: true,
    emissive: 0x14291a,
    emissiveIntensity: 0.42,
  });

  const grass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    side: THREE.DoubleSide,
    vertexColors: true,
  });

  const forage = new THREE.MeshStandardMaterial({
    color: 0xe66b4e,
    emissive: 0x3a0d08,
    emissiveIntensity: 0.28,
    roughness: 0.68,
  });

  const forageLeaf = new THREE.MeshStandardMaterial({
    color: 0x6e9d56,
    roughness: 0.9,
    flatShading: true,
  });

  const resources = {
    clover: new THREE.MeshStandardMaterial({ color: 0x8fbc61, emissive: 0x27411d, emissiveIntensity: 0.25, roughness: 0.9 }),
    mushrooms: new THREE.MeshStandardMaterial({ color: 0xd8b48a, emissive: 0x4a2b22, emissiveIntensity: 0.2, roughness: 0.82 }),
    watergrass: new THREE.MeshStandardMaterial({ color: 0x78aaa0, emissive: 0x163d37, emissiveIntensity: 0.28, roughness: 0.88 }),
    lichen: new THREE.MeshStandardMaterial({ color: 0xb8b07b, emissive: 0x3d3a1d, emissiveIntensity: 0.18, roughness: 1 }),
    berries: forage,
  };

  const flower = new THREE.MeshStandardMaterial({
    color: 0xe8d18a,
    emissive: 0x4a3616,
    emissiveIntensity: 0.45,
    roughness: 0.75,
    vertexColors: true,
  });

  const water = new THREE.MeshStandardMaterial({
    color: 0x4d9aa0,
    emissive: 0x163e42,
    emissiveIntensity: 0.42,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });

  const rock = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    flatShading: true,
    vertexColors: true,
  });

  const predator = {
    coat: new THREE.MeshStandardMaterial({ color: 0x4a3b35, roughness: 0.94, flatShading: true }),
    ruff: new THREE.MeshStandardMaterial({ color: 0x241f20, roughness: 1, flatShading: true }),
    muzzle: new THREE.MeshStandardMaterial({ color: 0x8b7462, roughness: 0.9, flatShading: true }),
    eye: new THREE.MeshStandardMaterial({ color: 0xffb34f, emissive: 0x8b2f12, emissiveIntensity: 1.2 }),
    threat: new THREE.MeshStandardMaterial({
      color: 0xe06b50,
      emissive: 0x8f281e,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.72,
    }),
  };

  const gazelle = {
    coat: new THREE.MeshStandardMaterial({ color: 0xb9834f, roughness: 0.82, flatShading: true }),
    lightCoat: new THREE.MeshStandardMaterial({ color: 0xe2c295, roughness: 0.88, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: 0x30271f, roughness: 0.9, flatShading: true }),
    eye: new THREE.MeshStandardMaterial({ color: 0x080a08, roughness: 0.35 }),
    accent: new THREE.MeshStandardMaterial({
      color: 0xc8e68a,
      emissive: 0x54753b,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.9,
    }),
  };

  return { terrain, treeTrunk, treeCanopy, grass, forage, forageLeaf, resources, flower, water, rock, gazelle, predator };
};

window.MaterialsModule = { createMaterials };
