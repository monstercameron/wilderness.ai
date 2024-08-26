/**
 * @typedef {Object} GameState
 * @property {THREE.Scene} scene - The Three.js scene
 * @property {THREE.WebGLRenderer} renderer - The Three.js renderer
 * @property {THREE.Camera} camera - The game camera
 * @property {Array<Array<Object>>} grid - The game grid
 * @property {Object} gazelle - The gazelle object
 * @property {Object} materials - The game materials
 */

/**
 * Initializes the game state
 * @returns {GameState} The initial game state
 */
const initGame = () => {
  window.UtilsModule.debug("Initializing game...");

  const { scene, renderer } = window.SceneModule.initScene();
  window.UtilsModule.debug("Scene and renderer initialized");

  const camera = window.CameraModule.createCamera(
    window.innerWidth / window.innerHeight
  );
  window.UtilsModule.debug("Camera created");

  const materials = window.MaterialsModule.createMaterials();
//   window.UtilsModule.debug("Materials created", materials);

  const grid = window.GridModule.createGrid(scene, materials);
  window.UtilsModule.debug("Initial grid created", { gridSize: grid.length });

  const updatedGrid = window.TreePlacementModule.placeLargeTreeClusters(
    grid,
    materials.tree
  );
  window.UtilsModule.debug("Trees placed on grid", {
    treeCells: updatedGrid.flat().filter((cell) => cell.hasTree).length,
  });

  const { updatedGrid: gridWithFood, newMeshes } =
    window.FoodPlacementModule.placeFoodItems(
      updatedGrid,
      window.UtilsModule.GRID_SIZE,
      window.UtilsModule.SQUARE_SIZE,
      materials,
      scene
    );
  window.UtilsModule.debug("Food placed on grid", { foodItems: newMeshes.length });

  newMeshes.forEach((mesh) => scene.add(mesh));

  const gazelle = window.GazelleModule.placeGazelle(
    gridWithFood,
    window.UtilsModule.GRID_SIZE,
    window.UtilsModule.SQUARE_SIZE,
    scene
  );
  window.UtilsModule.debug("Gazelle placed", { position: { x: gazelle.x, y: gazelle.y } });

  return {
    scene,
    renderer,
    camera,
    grid: gridWithFood,
    gazelle,
    materials,
  };
};

/**
 * Moves the gazelle in the specified direction
 * @param {GameState} state - The current game state
 * @param {string} direction - The direction to move the gazelle
 * @returns {GameState} The updated game state
 */
const moveGazelle = (state, direction) => {
  const { gazelle, grid, scene } = state;

  if (!gazelle) {
    window.UtilsModule.debug("Cannot move gazelle: Gazelle not initialized");
    return state;
  }

  window.UtilsModule.debug(`Attempting to move gazelle in direction: ${direction}`, {
    currentPosition: { x: gazelle.x, y: gazelle.y },
  });

  const newGazelleState = window.GazelleModule.move(gazelle, direction, grid);

  if (newGazelleState === gazelle) {
    window.UtilsModule.debug("Gazelle movement was blocked or invalid");
    return state;
  }

  const {
    x,
    y,
    gridSize,
    squareSize,
    direction: newDirection,
    thoughts,
  } = newGazelleState;

  // Update visual representation
  window.GazelleModule.updateGazelleMeshPosition(
    newGazelleState.mesh,
    x,
    y,
    gridSize,
    squareSize
  );
  window.GazelleModule.updateGazelleMeshTexture(
    newGazelleState.mesh,
    newDirection
  );
  window.GazelleModule.updateSpeechBubblePosition(
    newGazelleState.speechBubble,
    x,
    y,
    gridSize,
    squareSize
  );
  window.GazelleModule.updateSpeechBubble(
    newGazelleState.speechBubble,
    thoughts
  );

  window.UtilsModule.debug(`Gazelle moved to (${x}, ${y})`, { newDirection, thoughts });

  // Check if food was consumed and update the scene if necessary
  let updatedScene = scene;
  if (newGazelleState.grid[x][y].food === 0) {
    const foodMesh = scene.getObjectByName(`food_${x}_${y}`);
    if (foodMesh) {
      updatedScene = removeObjectFromScene(scene, foodMesh);
      window.UtilsModule.debug(`Removed food mesh at (${x}, ${y})`);
    }
  }

  return {
    ...state,
    gazelle: newGazelleState,
    grid: newGazelleState.grid,
    scene: updatedScene,
  };
};

/**
 * Removes an object from a scene
 * @param {THREE.Scene} scene - The current scene
 * @param {THREE.Object3D} object - The object to remove
 * @returns {THREE.Scene} A new scene with the object removed
 */
const removeObjectFromScene = (scene, object) => {
  const newScene = scene.clone();
  newScene.remove(object);
  window.UtilsModule.debug(`Object removed from scene`, { objectName: object.name });
  return newScene;
};

/**
 * Checks the game state for win/lose conditions
 * @param {GameState} state - The current game state
 * @returns {GameState} The updated game state
 */
const checkGameState = (state) => {
  const { gazelle, grid } = state;
  const { health } = gazelle.vitalityStats;
  const { x, y } = gazelle;

  window.UtilsModule.debug("Checking game state", { gazellePosition: { x, y }, health });

  if (health <= 0) {
    window.UtilsModule.debug("Game over: Gazelle health reached 0");
    return { ...state, gameOver: true, gameOverReason: "health" };
  }

  // Check for win conditions, if any
  // For example, if the gazelle has eaten all the food
  let remainingFood = false;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      if (grid[i][j].food > 0) {
        remainingFood = true;
        break;
      }
    }
    if (remainingFood) break;
  }

  if (!remainingFood) {
    window.UtilsModule.debug("Congratulations! The gazelle has eaten all the food");
    return { ...state, gameWon: true };
  }

  return state;
};

/**
 * Main update function to be called on each frame
 * @param {GameState} state - The current game state
 * @returns {GameState} The updated game state
 */
const updateGameState = (state) => {
  window.UtilsModule.debug("Updating game state");
  const updatedGazelleState = window.GazelleModule.updateGazelleState(
    state.gazelle
  );
  window.UtilsModule.debug("Gazelle state updated", {
    position: { x: updatedGazelleState.x, y: updatedGazelleState.y },
    vitalityStats: updatedGazelleState.vitalityStats,
  });
  const newState = { ...state, gazelle: updatedGazelleState };
  return checkGameState(newState);
};

/**
 * Sets up event listeners for the game
 * @param {function} moveGazelleCallback - The callback function to move the gazelle
 */
const setupEventListeners = (moveGazelleCallback) => {
  const keyToDirection = {
    ArrowUp: "N",
    ArrowRight: "E",
    ArrowDown: "S",
    ArrowLeft: "W",
    Home: "NW",
    PageUp: "NE",
    End: "SW",
    PageDown: "SE",
    Space: "N",
  };

  document.addEventListener("keydown", (event) => {
    if (keyToDirection[event.code]) {
      window.UtilsModule.debug(`Key pressed: ${event.code}`, {
        direction: keyToDirection[event.code],
      });
      moveGazelleCallback(keyToDirection[event.code]);
    }
  });

  window.UtilsModule.debug("Event listeners set up");
};

/**
 * Renders the current game state
 * @param {GameState} gameState - The current game state
 */
const renderGame = (gameState) => {
  // Implement rendering logic here
//   window.UtilsModule.debug("Rendering game state:", gameState);
};

/**
 * Handles the end of the game
 * @param {GameState} gameState - The final game state
 */
const handleGameEnd = (gameState) => {
  if (gameState.gameOver) {
    window.UtilsModule.debug("Game over:", gameState.gameOverReason);
  } else if (gameState.gameWon) {
    window.UtilsModule.debug("Game won!");
  }
  clearInterval(window.aiMoveInterval);
};

/**
 * Triggers an AI move for the gazelle
 * @param {GameState} gameState - The current game state
 * @returns {GameState} The updated game state after the AI move
 */
const triggerAIMove = (gameState) => {
  if (gameState.gazelle) {
    const surroundings = window.GazelleSimulation.getSurroundingGrid(
      gameState.gazelle
    );
    const stringRepr = window.GazelleSimulation.gridToString(surroundings);
    window.UtilsModule.debug("AI Move - Surrounding grid:", stringRepr);

    // Here you would typically make an API call with the stringRepr
    // For now, we'll just move in a random direction
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const randomDirection =
      directions[Math.floor(Math.random() * directions.length)];
    window.UtilsModule.debug(`AI chose random direction: ${randomDirection}`);
    return moveGazelle(gameState, randomDirection);
  }
  return gameState;
};

/**
 * Starts the game
 */
const startGame = () => {
  window.UtilsModule.debug("Starting game...");
  let gameState = initGame();

  // Set up game loop
  const gameLoop = () => {
    gameState = updateGameState(gameState);
    renderGame(gameState);
    if (gameState.gameOver || gameState.gameWon) {
      handleGameEnd(gameState);
    } else {
      requestAnimationFrame(gameLoop);
    }
  };

  // Start the game loop
  gameLoop();

  // Set up event listeners for gazelle movement
  setupEventListeners((direction) => {
    gameState = moveGazelle(gameState, direction);
  });

  // Set up AI movement interval
  window.aiMoveInterval = setInterval(() => {
    gameState = triggerAIMove(gameState);
  }, 15000);
  window.UtilsModule.debug("AI movement interval set.");
};

// Expose necessary functions to the global scope
window.GameModule = {
  initGame,
  moveGazelle,
  updateGameState,
  setupEventListeners,
  startGame,
};

// Start the game when the window loads
window.addEventListener("load", () => {
  window.UtilsModule.debug("Window loaded. Attempting to start game...");
  try {
    window.GameModule.startGame();
    window.UtilsModule.debug("Game started successfully.");
  } catch (error) {
    console.error("Error during game start:", error);
  }
});

window.UtilsModule.debug("Main game module loaded");