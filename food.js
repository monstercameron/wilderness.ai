// food.js

const FOOD_COVERAGE = 0.1; // 10% of total squares
const TREE_EDGE_FOOD_CHANCE = 0.3;
const NUM_CLUSTERS = 10;
const MIN_CLUSTER_SIZE = 5;
const MAX_CLUSTER_SIZE = 14;

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

const createFoodMesh = (x, y, gridSize, squareSize, foodMaterial) => {
  const foodGeometry = new THREE.PlaneGeometry(
    squareSize * 0.5,
    squareSize * 0.5
  );
  const foodMesh = new THREE.Mesh(foodGeometry, foodMaterial);
  foodMesh.position.set(x - gridSize / 2 + 0.5, y - gridSize / 2 + 0.5, 0.1);
  return foodMesh;
};

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

  return {
    grid: updatedGrid,
    foodPlaced: 1,
    newMeshes: [foodMesh, textMesh],
  };
};

const placeFoodItems = (grid, gridSize, squareSize, materials, scene) => {
  const totalGridSquares = gridSize * gridSize;
  const maxFoodSquares = Math.floor(totalGridSquares * FOOD_COVERAGE);
  let foodPlaced = 0;
  let updatedGrid = grid;
  let newMeshes = [];

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

  // Create food clusters
  for (let c = 0; c < NUM_CLUSTERS && foodPlaced < maxFoodSquares; c++) {
    let x = Math.floor(Math.random() * gridSize);
    let y = Math.floor(Math.random() * gridSize);
    const clusterSize =
      Math.floor(Math.random() * (MAX_CLUSTER_SIZE - MIN_CLUSTER_SIZE + 1)) +
      MIN_CLUSTER_SIZE;

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

  console.log(`Total food squares placed: ${foodPlaced}`);
  return { updatedGrid, newMeshes };
};

// Expose functions to the global scope
window.FoodPlacementModule = {
  placeFoodItems,
};
