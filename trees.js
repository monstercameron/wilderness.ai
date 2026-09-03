const createTreeChunk = (cells, group, materials, chunkX, chunkY) => {
  const treeCells = cells.filter((cell) => cell.hasTree);
  if (!treeCells.length) return { count: 0 };
  const { seed } = window.UtilsModule.WORLD_CONFIG;
  const random = window.UtilsModule.createRandom(seed + Math.imul(chunkX, 83492791) + Math.imul(chunkY, 297657976) + 202);
  const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.19, 1.2, 6);
  trunkGeometry.rotateX(Math.PI / 2);
  const canopyGeometry = new THREE.ConeGeometry(0.72, 1.9, 7);
  canopyGeometry.rotateX(Math.PI / 2);
  const crownGeometry = new THREE.ConeGeometry(0.52, 1.45, 7);
  crownGeometry.rotateX(Math.PI / 2);

  const trunks = new THREE.InstancedMesh(trunkGeometry, materials.treeTrunk, treeCells.length);
  const canopies = new THREE.InstancedMesh(canopyGeometry, materials.treeCanopy, treeCells.length);
  const crowns = new THREE.InstancedMesh(crownGeometry, materials.treeCanopy, treeCells.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  const axis = new THREE.Vector3(0, 0, 1);

  treeCells.forEach((cell, index) => {
    const biomeScale = cell.biome === "scrub" ? 0.68 : cell.biome === "wetland" ? 0.88 : 1;
    const heightScale = (0.72 + random() * 0.7) * biomeScale;
    const widthScale = 0.75 + random() * 0.55;
    quaternion.setFromAxisAngle(axis, random() * Math.PI * 2);
    position.set(cell.x, cell.y, cell.height + 0.58 * heightScale);
    scale.set(widthScale, widthScale, heightScale);
    matrix.compose(position, quaternion, scale);
    trunks.setMatrixAt(index, matrix);
    position.z = cell.height + 1.35 * heightScale;
    matrix.compose(position, quaternion, scale);
    canopies.setMatrixAt(index, matrix);
    position.z = cell.height + 2.12 * heightScale;
    scale.set(widthScale * 0.82, widthScale * 0.82, heightScale * 0.86);
    matrix.compose(position, quaternion, scale);
    crowns.setMatrixAt(index, matrix);
    const palettes = {
      woodland: [0x294b39, 0x3b6547, 0x527b52],
      wetland: [0x385f54, 0x4d7766, 0x6b8d70],
      meadow: [0x406a45, 0x5b8051, 0x75945e],
      highland: [0x3d5547, 0x536858, 0x697662],
      scrub: [0x53643e, 0x718052, 0x8a8d59],
    };
    const palette = palettes[cell.biome] || palettes.meadow;
    const shade = random();
    color.set(shade > 0.66 ? palette[2] : shade > 0.3 ? palette[1] : palette[0]);
    canopies.setColorAt(index, color);
    crowns.setColorAt(index, color.clone().offsetHSL(0.01, -0.02, 0.035));
  });

  [trunks, canopies, crowns].forEach((mesh, index) => {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = index !== 0;
    mesh.receiveShadow = true;
    mesh.name = ["tree-trunks", "tree-canopies", "tree-crowns"][index] + `_${chunkX}_${chunkY}`;
    group.add(mesh);
  });
  return { trunks, canopies, crowns, count: treeCells.length };
};

window.TreePlacementModule = { createChunk: createTreeChunk };
