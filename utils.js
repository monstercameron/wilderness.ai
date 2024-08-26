// utils.js

const GRID_SIZE = 100;
const SQUARE_SIZE = 1;

const isValidPosition = (x, y, gridSize) =>
  x >= 0 && x < gridSize && y >= 0 && y < gridSize;

// Expose utilities and constants to the global scope
window.UtilsModule = {
  GRID_SIZE,
  SQUARE_SIZE,
  isValidPosition,
};
