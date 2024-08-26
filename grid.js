// grid.js

const createSquare = (i, j, material, gridSize) => {
  const gridGeometry = new THREE.PlaneGeometry(window.UtilsModule.SQUARE_SIZE, window.UtilsModule.SQUARE_SIZE);
  const square = new THREE.Mesh(gridGeometry, material);
  square.position.set(i - gridSize / 2 + 0.5, j - gridSize / 2 + 0.5, 0);
  return square;
};

const createGridSquare = (i, j, materials, gridSize) => {
  const square = createSquare(i, j, materials.wheat, gridSize);
  return {
    mesh: square,
    hasTree: false,
    food: 0,
  };
};

const createGrid = (scene, materials) => {
  const grid = Array(GRID_SIZE)
    .fill()
    .map((_, i) =>
      Array(GRID_SIZE)
        .fill()
        .map((_, j) => {
          const gridSquare = createGridSquare(i, j, materials, GRID_SIZE);
          scene.add(gridSquare.mesh);
          return gridSquare;
        })
    );
  return grid;
};

const getGridSize = () => GRID_SIZE;
const getSquareSize = () => SQUARE_SIZE;

// Expose functions to the global scope
window.GridModule = {
  createGrid,
  getGridSize,
  getSquareSize,
};
