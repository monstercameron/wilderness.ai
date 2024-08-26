// main.js

let gameState = {
  scene: null,
  renderer: null,
  camera: null,
  grid: null,
  gazelle: null,
  materials: null,
  cleanupFunctions: [],
};

function initGame() {
  // Initialize scene
  const { scene, renderer } = window.SceneModule.initScene();
  gameState.scene = scene;
  gameState.renderer = renderer;

  // Setup camera
  gameState.camera = window.CameraModule.createCamera(
    window.innerWidth / window.innerHeight
  );
  const cleanupResize = window.SceneModule.setupWindowResize(
    gameState.camera,
    gameState.renderer
  );
  gameState.cleanupFunctions.push(cleanupResize);

  // Create materials
  gameState.materials = window.MaterialsModule.createMaterials();

  // Create grid
  const gridSize = window.UtilsModule.GRID_SIZE;
  const squareSize = window.UtilsModule.SQUARE_SIZE;
  gameState.grid = window.GridModule.createGrid(
    gameState.scene,
    gameState.materials
  );

  // Place trees
  gameState.grid = window.TreePlacementModule.placeLargeTreeClusters(
    gameState.grid,
    gameState.materials.tree
  );

  // Place food
  const { updatedGrid, newMeshes } = window.FoodPlacementModule.placeFoodItems(
    gameState.grid,
    gridSize,
    squareSize,
    gameState.materials,
    gameState.scene
  );
  gameState.grid = updatedGrid;
  newMeshes.forEach((mesh) => gameState.scene.add(mesh));

  // Place gazelle
  gameState.gazelle = window.GazelleSimulation.placeGazelle(
    gameState.grid,
    gridSize,
    squareSize,
    gameState.scene
  );

  // Start animation loop
  const animate = window.SceneModule.createAnimationLoop(
    gameState.renderer,
    gameState.scene,
    gameState.camera
  );
  animate();

  // Set up event listeners
  setupEventListeners();

  console.log("Game initialization complete");
}

function moveGazelle(direction) {
  if (gameState.gazelle) {
    const newState = window.GazelleSimulation.move(
      gameState.gazelle,
      direction
    );
    if (newState !== gameState.gazelle) {
      gameState.gazelle = newState;
      gameState.grid = newState.grid; // Assuming the grid is updated in the move function
    }
  }
}

function setupEventListeners() {
  // Event listener for gazelle movement
  document.addEventListener("keydown", (event) => {
    const keyToDirection = {
      ArrowUp: "N",
      ArrowRight: "E",
      ArrowDown: "S",
      ArrowLeft: "W",
      Home: "NW",
      PageUp: "NE",
      End: "SW",
      PageDown: "SE",
      Space: "N", // Move North when spacebar is pressed
    };
    if (keyToDirection[event.code]) {
      moveGazelle(keyToDirection[event.code]);
    }
  });
}

// Function to trigger API-based movement
function triggerGazelleAIMove() {
  if (gameState.gazelle) {
    const surroundings = window.GazelleSimulation.getSurroundingGrid(
      gameState.gazelle
    );
    const stringRepr = window.GazelleSimulation.gridToString(surroundings);
    // Here you would typically make an API call with the stringRepr
    // For now, we'll just move in a random direction
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const randomDirection =
      directions[Math.floor(Math.random() * directions.length)];
    moveGazelle(randomDirection);
  }
}

// Cleanup function to be called when the game needs to be reset or closed
function cleanupGame() {
  gameState.cleanupFunctions.forEach((cleanup) => cleanup());
  // Remove event listeners
  document.removeEventListener("keydown", setupEventListeners);
  // Stop the AI movement interval
  clearInterval(window.aiMoveInterval);
  // Additional cleanup logic can be added here
}

// Expose necessary functions to the global scope
window.GameModule = {
  initGame,
  moveGazelle,
  triggerGazelleAIMove,
  cleanupGame,
};

// The automatic game start and interval setting are moved to the HTML file
