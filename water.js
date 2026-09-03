const createWaterChunk = (cells, group, materials, chunkX, chunkY) => {
  const waterCells = cells.filter((cell) => cell.water);
  if (!waterCells.length) return { count: 0 };
  const geometry = new THREE.CircleGeometry(0.73, 8);
  const water = new THREE.InstancedMesh(geometry, materials.water, waterCells.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);

  waterCells.forEach((cell, index) => {
    position.set(cell.x, cell.y, cell.height + 0.09);
    matrix.compose(position, quaternion, scale);
    water.setMatrixAt(index, matrix);
  });

  water.instanceMatrix.needsUpdate = true;
  water.name = `water_${chunkX}_${chunkY}`;
  water.receiveShadow = true;
  group.add(water);
  return { mesh: water, count: waterCells.length };
};

const updateWaterVisual = (world, elapsedSeconds) => {
  world.materials.water.opacity = 0.84 + Math.sin(elapsedSeconds * 0.8) * 0.035;
};

window.WaterModule = { createChunk: createWaterChunk, updateVisual: updateWaterVisual };
