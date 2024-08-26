// food.js

/**
 * @constant {number} Percentage of total squares that should contain food
 */
const FOOD_COVERAGE = 0.1; // 10% of total squares

/**
 * @constant {number} Chance of food appearing on the edge of a tree
 */
const TREE_EDGE_FOOD_CHANCE = 0.3;

/**
 * @constant {number} Number of food clusters to create
 */
const NUM_CLUSTERS = 10;

/**
 * @constant {number} Minimum size of a food cluster
 */
const MIN_CLUSTER_SIZE = 5;

/**
 * @constant {number} Maximum size of a food cluster
 */
const MAX_CLUSTER_SIZE = 14;

/**
 * Checks if a given position is on the edge of a tree
 * @param {Object[][]} grid - The game grid
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} gridSize - The size of the grid
 * @returns {boolean} True if the position is on the edge of a tree, false otherwise
 */
const isEdgeOfTree = (grid, x, y, gridSize) => {
  if (grid[x][y].hasTree) return false;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (window.UtilsModule.isValidPosition(nx, ny, gridSize) && grid[nx][ny].hasTree) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Creates a food mesh
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} gridSize - The size of the grid
 * @param {number} squareSize - The size of each square
 * @param {THREE.Material} foodMaterial - The material for the food mesh
 * @returns {THREE.Mesh} The created food mesh
 */
const createFoodMesh = (x, y, gridSize, squareSize, foodMaterial) => {
  const foodGeometry = new THREE.PlaneGeometry(
    squareSize * 0.5,
    squareSize * 0.5
  );
  const foodMesh = new THREE.Mesh(foodGeometry, foodMaterial);
  foodMesh.position.set(x - gridSize / 2 + 0.5, y - gridSize / 2 + 0.5, 0.1);
  return foodMesh;
};

/**
 * Creates a text mesh for displaying food amount
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} gridSize - The size of the grid
 * @param {number} squareSize - The size of each square
 * @param {number} foodAmount - The amount of food to display
 * @returns {THREE.Mesh} The created text mesh
 */
const createTextMesh = (x, y, gridSize, squareSize, foodAmount) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 64;
  canvas.height = 64;
  context.font = "bold 48px Arial";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(foodAmount.toString(), 32, 32);
  const textTexture = new THREE.CanvasTexture(canvas);
  const textMaterial = new THREE.MeshBasicMaterial({
    map: textTexture,
    transparent: true,
  });
  const textMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(squareSize * 0.3, squareSize * 0.3),
    textMaterial
  );
  textMesh.position.set(x - gridSize / 2 + 0.7, y - gridSize / 2 + 0.3, 0.2);
  return textMesh;
};

/**
 * Places food on a specific grid position
 * @param {Object[][]} grid - The game grid
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} gridSize - The size of the grid
 * @param {number} squareSize - The size of each square
 * @param {THREE.Material} foodMaterial - The material for the food mesh
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {Object} Updated grid, food placed count, and new meshes
 */
const placeFood = (grid, x, y, gridSize, squareSize, foodMaterial, scene) => {
  if (grid[x][y].food > 0 || grid[x][y].hasTree)
    return { grid, foodPlaced: 0, newMeshes: [] };

  const foodAmount = Math.floor(Math.random() * 10) + 1;
  const updatedGrid = {
    ...grid,
    [x]: {
      ...grid[x],
      [y]: { ...grid[x][y], food: foodAmount },
    },
  };

  const foodMesh = createFoodMesh(x, y, gridSize, squareSize, foodMaterial);
  const textMesh = createTextMesh(x, y, gridSize, squareSize, foodAmount);

  window.UtilsModule.debug(`Food placed at (${x}, ${y}) with amount ${foodAmount}`);

  return {
    grid: updatedGrid,
    foodPlaced: 1,
    newMeshes: [foodMesh, textMesh],
  };
};

/**
 * Places food items on the grid
 * @param {Object[][]} grid - The game grid
 * @param {number} gridSize - The size of the grid
 * @param {number} squareSize - The size of each square
 * @param {Object} materials - The materials for rendering
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {Object} Updated grid and new meshes
 */
const placeFoodItems = (grid, gridSize, squareSize, materials, scene) => {
  const totalGridSquares = gridSize * gridSize;
  const maxFoodSquares = Math.floor(totalGridSquares * FOOD_COVERAGE);
  let foodPlaced = 0;
  let updatedGrid = grid;
  let newMeshes = [];

  window.UtilsModule.debug(`Placing food items. Max food squares: ${maxFoodSquares}`);

  // Place food near trees
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (
        isEdgeOfTree(updatedGrid, i, j, gridSize) &&
        Math.random() < TREE_EDGE_FOOD_CHANCE
      ) {
        const {
          grid: newGrid,
          foodPlaced: newFoodPlaced,
          newMeshes: placedMeshes,
        } = placeFood(
          updatedGrid,
          i,
          j,
          gridSize,
          squareSize,
          materials.food,
          scene
        );
        updatedGrid = newGrid;
        foodPlaced += newFoodPlaced;
        newMeshes = [...newMeshes, ...placedMeshes];
        if (foodPlaced >= maxFoodSquares) break;
      }
    }
    if (foodPlaced >= maxFoodSquares) break;
  }

  window.UtilsModule.debug(`Food placed near trees: ${foodPlaced}`);

  // Create food clusters
  for (let c = 0; c < NUM_CLUSTERS && foodPlaced < maxFoodSquares; c++) {
    let x = Math.floor(Math.random() * gridSize);
    let y = Math.floor(Math.random() * gridSize);
    const clusterSize =
      Math.floor(Math.random() * (MAX_CLUSTER_SIZE - MIN_CLUSTER_SIZE + 1)) +
      MIN_CLUSTER_SIZE;

    window.UtilsModule.debug(`Creating food cluster ${c + 1} at (${x}, ${y}) with size ${clusterSize}`);

    for (let f = 0; f < clusterSize && foodPlaced < maxFoodSquares; f++) {
      const {
        grid: newGrid,
        foodPlaced: newFoodPlaced,
        newMeshes: placedMeshes,
      } = placeFood(
        updatedGrid,
        x,
        y,
        gridSize,
        squareSize,
        materials.food,
        scene
      );
      updatedGrid = newGrid;
      foodPlaced += newFoodPlaced;
      newMeshes = [...newMeshes, ...placedMeshes];

      // Move to an adjacent square
      const direction = Math.random();
      if (direction < 0.25) x = Math.min(x + 1, gridSize - 1);
      else if (direction < 0.5) x = Math.max(x - 1, 0);
      else if (direction < 0.75) y = Math.min(y + 1, gridSize - 1);
      else y = Math.max(y - 1, 0);
    }
  }

  window.UtilsModule.debug(`Total food squares placed: ${foodPlaced}`);
  return { updatedGrid, newMeshes };
};

// Expose functions to the global scope
window.FoodPlacementModule = {
  placeFoodItems,
};
