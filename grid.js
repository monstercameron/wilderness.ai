// grid.js

/**
 * Creates a square mesh for the grid
 * @param {number} i - The x coordinate of the square
 * @param {number} j - The y coordinate of the square
 * @param {THREE.Material} material - The material for the square
 * @param {number} gridSize - The size of the grid
 * @returns {THREE.Mesh} The created square mesh
 */
const createSquare = (i, j, material, gridSize) => {
  const gridGeometry = new THREE.PlaneGeometry(
    window.UtilsModule.SQUARE_SIZE,
    window.UtilsModule.SQUARE_SIZE
  );
  const square = new THREE.Mesh(gridGeometry, material);
  square.position.set(i - gridSize / 2 + 0.5, j - gridSize / 2 + 0.5, 0);
  return square;
};

/**
 * Creates a grid square object
 * @param {number} i - The x coordinate of the square
 * @param {number} j - The y coordinate of the square
 * @param {Object} materials - The materials for rendering
 * @param {number} gridSize - The size of the grid
 * @returns {Object} The created grid square object
 */
const createGridSquare = (i, j, materials, gridSize) => {
  const square = createSquare(i, j, materials.wheat, gridSize);
  return {
    mesh: square,
    hasTree: false,
    food: 0,
  };
};

/**
 * Creates the game grid
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} materials - The materials for rendering
 * @returns {Object[][]} The created grid
 */
const createGrid = (scene, materials) => {
  window.UtilsModule.debug("Creating grid...");
  const grid = [];
  const gridSize = window.UtilsModule.GRID_SIZE;
  const squareSize = window.UtilsModule.SQUARE_SIZE;

  for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const gridSquare = createGridSquare(i, j, materials, gridSize);
      scene.add(gridSquare.mesh);
      grid[i][j] = gridSquare;
    }
  }

//   window.UtilsModule.debug("Grid created", { sampleCell: grid[0][0] });
  return grid;
};

/**
 * Gets the current grid size
 * @returns {number} The size of the grid
 */
const getGridSize = () => window.UtilsModule.GRID_SIZE;

/**
 * Gets the current square size
 * @returns {number} The size of each square
 */
const getSquareSize = () => window.UtilsModule.SQUARE_SIZE;

// Expose functions to the global scope
window.GridModule = {
  createGrid,
  getGridSize,
  getSquareSize,
};

window.UtilsModule.debug("GridModule loaded");