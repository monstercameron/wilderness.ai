// grid.js

const createSquare = (i, j, material, gridSize) => {
  const gridGeometry = new THREE.PlaneGeometry(
    window.UtilsModule.SQUARE_SIZE,
    window.UtilsModule.SQUARE_SIZE
  );
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
  console.log("Creating grid...");
  const grid = [];
  const gridSize = UtilsModule.GRID_SIZE;
  const squareSize = UtilsModule.SQUARE_SIZE;
  const gridGeometry = new THREE.PlaneGeometry(squareSize, squareSize);

  for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const square = new THREE.Mesh(gridGeometry, materials.wheat);
      square.position.set(i - gridSize / 2 + 0.5, j - gridSize / 2 + 0.5, 0);
      scene.add(square);
      grid[i][j] = { mesh: square, hasTree: false, food: 0 };
    }
  }
  console.log("Grid created. Sample cell:", grid[0][0]);
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
