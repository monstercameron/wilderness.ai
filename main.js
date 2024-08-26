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
  console.log("Initializing game...");

  try {
    // Initialize scene
    console.log("Initializing scene...");
    const { scene, renderer } = window.SceneModule.initScene();
    gameState.scene = scene;
    gameState.renderer = renderer;
    console.log("Scene initialized.");

    // Setup camera
    console.log("Setting up camera...");
    gameState.camera = window.CameraModule.createCamera(
      window.innerWidth / window.innerHeight
    );
    const cleanupResize = window.SceneModule.setupWindowResize(
      gameState.camera,
      gameState.renderer
    );
    gameState.cleanupFunctions.push(cleanupResize);
    console.log("Camera set up.");

    // Setup camera controls
    console.log("Setting up camera controls...");
    const sceneElement = document.getElementById("scene");
    const cameraState = window.CameraModule.createCameraState(
      UtilsModule.GRID_SIZE
    );
    const cameraControls = window.CameraModule.createCameraControls(
      gameState.camera,
      cameraState,
      sceneElement
    );
    gameState.cleanupFunctions.push(cameraControls.dispose);
    console.log("Camera controls set up.");

    // Create materials
    console.log("Creating materials...");
    gameState.materials = window.MaterialsModule.createMaterials();
    console.log("Materials created:", gameState.materials);

    // Create grid
    console.log("Creating grid...");
    gameState.grid = window.GridModule.createGrid(
      gameState.scene,
      gameState.materials
    );
    console.log("Grid created. Sample cell:", gameState.grid[0][0]);

    // Place trees
    console.log("Placing trees...");
    console.log("Tree material:", gameState.materials.tree);
    gameState.grid = window.TreePlacementModule.placeLargeTreeClusters(
      gameState.grid,
      gameState.materials.tree
    );
    console.log(
      "Trees placed. Sample cell after placement:",
      gameState.grid[0][0]
    );

    // Place food
    console.log("Placing food...");
    const { updatedGrid, newMeshes } =
      window.FoodPlacementModule.placeFoodItems(
        gameState.grid,
        UtilsModule.GRID_SIZE,
        UtilsModule.SQUARE_SIZE,
        gameState.materials,
        gameState.scene
      );
    gameState.grid = updatedGrid;
    newMeshes.forEach((mesh) => gameState.scene.add(mesh));
    console.log(
      "Food placed. Sample cell after food placement:",
      gameState.grid[0][0]
    );

    // Place gazelle
    console.log("Placing gazelle...");
    gameState.gazelle = window.GazelleSimulation.placeGazelle(
      gameState.grid,
      UtilsModule.GRID_SIZE,
      UtilsModule.SQUARE_SIZE,
      gameState.scene
    );
    console.log("Gazelle placed:", gameState.gazelle);

    // Start animation loop
    console.log("Starting animation loop...");
    const animate = window.SceneModule.createAnimationLoop(
      gameState.renderer,
      gameState.scene,
      gameState.camera
    );
    animate();
    console.log("Animation loop started.");

    // Set up event listeners
    console.log("Setting up event listeners...");
    setupEventListeners();
    console.log("Event listeners set up.");

    console.log("Game initialization complete");
  } catch (error) {
    console.error("Error during game initialization:", error);
    console.error("Error stack:", error.stack);
  }
}

function moveGazelle(direction) {
  if (gameState.gazelle) {
    console.log(`Attempting to move gazelle in direction: ${direction}`);
    const newState = window.GazelleSimulation.move(
      gameState.gazelle,
      direction
    );
    if (newState !== gameState.gazelle) {
      gameState.gazelle = newState;
      gameState.grid = newState.grid;
      console.log(`Gazelle moved to:`, gameState.gazelle.position);
      console.log(`Updated grid state:`, gameState.grid);
    } else {
      console.log(
        `Gazelle movement in direction ${direction} was not possible`
      );
    }
  } else {
    console.warn("Gazelle not initialized");
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
    console.log("Triggering AI move for gazelle");
    const surroundings = window.GazelleSimulation.getSurroundingGrid(
      gameState.gazelle
    );
    const stringRepr = window.GazelleSimulation.gridToString(surroundings);
    console.log("Surrounding grid:", stringRepr);

    // Here you would typically make an API call with the stringRepr
    // For now, we'll just move in a random direction
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const randomDirection =
      directions[Math.floor(Math.random() * directions.length)];
    console.log(`AI chose random direction: ${randomDirection}`);
    moveGazelle(randomDirection);
  } else {
    console.warn("Cannot trigger AI move: Gazelle not initialized");
  }
}

// Cleanup function to be called when the game needs to be reset or closed
function cleanupGame() {
  console.log("Cleaning up game...");
  gameState.cleanupFunctions.forEach((cleanup) => cleanup());
  // Remove event listeners
  document.removeEventListener("keydown", setupEventListeners);
  // Stop the AI movement interval
  clearInterval(window.aiMoveInterval);
  // Additional cleanup logic can be added here
  console.log("Game cleanup complete");
}

// Expose necessary functions to the global scope
window.GameModule = {
  initGame,
  moveGazelle,
  triggerGazelleAIMove,
  cleanupGame,
};

console.log("Main game module loaded.");
