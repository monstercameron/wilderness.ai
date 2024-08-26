/**
 * @constant {number}
 * @description The size of the game grid
 */
const GRID_SIZE = 100;

/**
 * @constant {number}
 * @description The size of each square in the grid
 */
const SQUARE_SIZE = 1;

/**
 * Checks if a given position is valid within the grid
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} gridSize - The size of the grid
 * @returns {boolean} True if the position is valid, false otherwise
 */
const isValidPosition = (x, y, gridSize) =>
  x >= 0 && x < gridSize && y >= 0 && y < gridSize;

/**
 * Generates a timestamp string
 * @returns {string} The current timestamp in ISO format
 */
const getTimestamp = () => new Date().toISOString();

/**
 * Creates a debug message with optional data
 * @param {string} message - The message to log
 * @param {*} [data] - Optional data to log
 * @returns {string} The formatted debug message
 */
const createDebugMessage = (message, data) => {
  let debugMessage = `[DEBUG ${getTimestamp()}] ${message}`;
  if (data !== undefined) {
    debugMessage += '\n' + JSON.stringify(data, null, 2);
  }
  return debugMessage;
};

/**
 * Debug logger function
 * @param {string} message - The message to log
 * @param {*} [data] - Optional data to log
 */
const debug = (message, data) => {
  console.log(createDebugMessage(message, data));
};

// Expose utilities and constants to the global scope
window.UtilsModule = {
  GRID_SIZE,
  SQUARE_SIZE,
  isValidPosition,
  debug,
};