// Helper Functions
const createGazelleMesh = (x, y, direction, gridSize, squareSize) => {
  const geometry = new THREE.PlaneGeometry(squareSize, squareSize);
  const material = new THREE.MeshBasicMaterial({ transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  updateGazelleMeshTexture(mesh, direction);
  updateGazelleMeshPosition(mesh, x, y, gridSize, squareSize);
  return mesh;
};

const updateMeshTexture = (mesh, direction) => {
  const gazelleEmoji = "🦌";
  const directionEmojis = {
    N: "⬆️",
    NE: "↗️",
    E: "➡️",
    SE: "↘️",
    S: "⬇️",
    SW: "↙️",
    W: "⬅️",
    NW: "↖️",
  };

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 128;
  canvas.height = 64;
  context.font = "50px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(gazelleEmoji, 32, 32);
  context.fillText(directionEmojis[direction], 96, 32);

  const texture = new THREE.CanvasTexture(canvas);
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;
};

const updateMeshPosition = (mesh, x, y, gridSize) => {
  mesh.position.set(x - gridSize / 2 + 0.5, y - gridSize / 2 + 0.5, 0.2);
};

const createSpeechBubble = (x, y, gridSize, squareSize) => {
  const bubbleGeometry = new THREE.PlaneGeometry(2, 1);
  const bubbleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
  });
  const speechBubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
  updateSpeechBubblePosition(speechBubble, x, y, gridSize, squareSize);
  return speechBubble;
};

const updateSpeechBubblePosition = (speechBubble, x, y, gridSize, squareSize) => {
  speechBubble.position.set(
    x - gridSize / 2 + 0.5,
    y - gridSize / 2 + 1.5,
    0.2
  );
  console.log("Speech bubble position updated:", speechBubble.position);
};

const placeGazelle = (grid, gridSize, squareSize, scene) => {
  console.log("Placing gazelle...");
  let x, y;
  do {
    x = Math.floor(Math.random() * gridSize);
    y = Math.floor(Math.random() * gridSize);
  } while (grid[x][y].hasTree || grid[x][y].food > 0);

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const initialDirection = directions[Math.floor(Math.random() * directions.length)];

  console.log(`Gazelle initial position: (${x}, ${y}), direction: ${initialDirection}`);

  const gazelle = createGazelle(x, y, initialDirection, gridSize, squareSize, scene, grid);
  updateSpeechBubble(gazelle.speechBubble, gazelle.thoughts);

  console.log("Gazelle placed:", gazelle);
  return gazelle;
};

const updateSpeechBubble = (speechBubble, thoughts) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 256;
  canvas.height = 128;
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "black";
  context.font = "20px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const maxWidth = 240;
  const lineHeight = 24;
  const words = thoughts.split(" ");
  let line = "";
  let y = 64;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, canvas.width / 2, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, canvas.width / 2, y);

  const texture = new THREE.CanvasTexture(canvas);
  speechBubble.material.map = texture;
  speechBubble.material.needsUpdate = true;
};

const move = (gazelleState, direction, grid) => {
  const { x, y, gridSize } = gazelleState;
  let newX = x, newY = y;

  // Calculate new position based on direction
  switch (direction) {
    case "N": newY = Math.min(y + 1, gridSize - 1); break;
    case "S": newY = Math.max(y - 1, 0); break;
    case "E": newX = Math.min(x + 1, gridSize - 1); break;
    case "W": newX = Math.max(x - 1, 0); break;
    // Add cases for diagonal movements if needed
  }

  // Check if the new position is valid (not a tree, etc.)
  if (!grid[newX][newY].hasTree) {
    // Create new gazelle state and updated grid
    const newGrid = [...grid];
    if (newGrid[newX][newY].food > 0) {
      // Consume food if present
      newGrid[newX][newY] = { ...newGrid[newX][newY], food: 0 };
    }

    return {
      ...gazelleState,
      x: newX,
      y: newY,
      direction,
      thoughts: newGrid[newX][newY].food > 0 ? "Yum! That was tasty!" : "Just moved.",
      grid: newGrid
    };
  }

  // Return original state if movement was blocked
  return gazelleState;
};

const updateVitalityStats = (state) => {
  const { vitalityStats } = state;
  const newHunger = Math.min(100, vitalityStats.hunger + 0.1);
  const newThirst = Math.min(100, vitalityStats.thirst + 0.1);

  let newThoughts = "Just grazing and enjoying the day.";
  if (newHunger > 80) newThoughts = "I'm getting really hungry...";
  else if (newThirst > 80) newThoughts = "I need to find water soon...";
  else if (vitalityStats.fear > 70)
    newThoughts = "I feel unsafe. Need to be careful.";

  return {
    ...state,
    thoughts: newThoughts,
    vitalityStats: {
      ...vitalityStats,
      hunger: newHunger,
      thirst: newThirst,
    },
  };
};

const getSurroundingGrid = (state) => {
  const { x, y, grid } = state;
  const surroundings = [];
  for (let dy = -5; dy <= 4; dy++) {
    const row = [];
    for (let dx = -5; dx <= 4; dx++) {
      const newX = x + dx;
      const newY = y + dy;
      if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
        if (grid[newX][newY].hasTree) row.push("T");
        else if (grid[newX][newY].food > 0) row.push("F");
        else row.push(".");
      } else {
        row.push("#"); // Out of bounds
      }
    }
    surroundings.push(row);
  }
  return surroundings;
};

const gridToString = (grid) =>
  grid.map((row) => row.join("")).join("\n") + "\n";

const createGazelle = (x, y, direction, gridSize, squareSize, scene, grid) => {
  console.log("Creating gazelle...");
  const mesh = createGazelleMesh(x, y, direction, gridSize, squareSize);
  const speechBubble = createSpeechBubble(x, y, gridSize, squareSize);
  scene.add(mesh);
  scene.add(speechBubble);

  return {
    x,
    y,
    direction,
    gridSize,
    squareSize,
    mesh,
    speechBubble,
    thoughts: "Just grazing...",
    vitalityStats: {
      health: 100,
      stamina: 80,
      movementSpeed: 60,
      agility: 90,
      endurance: 75,
      stealth: 70,
      recoveryRate: 65,
      strength: 50,
      physicalAlertness: 85,
      resistanceToInjury: 55,
      fear: 40,
      hunger: 60,
      thirst: 55,
      curiosity: 50,
      mentalAlertness: 70,
      confidence: 45,
      socialInteraction: 65,
      doubt: 30,
      stress: 50,
      mentalFocus: 55,
    }
  };
};

const updateGazelleMeshTexture = (mesh, direction) => {
  const gazelleEmoji = "🦌";
  const directionEmojis = {
    N: "⬆️", NE: "↗️", E: "➡️", SE: "↘️",
    S: "⬇️", SW: "↙️", W: "⬅️", NW: "↖️"
  };

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 128;
  canvas.height = 64;
  context.font = "50px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(gazelleEmoji, 32, 32);
  context.fillText(directionEmojis[direction], 96, 32);

  const texture = new THREE.CanvasTexture(canvas);
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;
};

const updateGazelleMeshPosition = (mesh, x, y, gridSize, squareSize) => {
  mesh.position.set(
    x - gridSize / 2 + 0.5,
    y - gridSize / 2 + 0.5,
    0.1
  );
  console.log("Gazelle mesh position updated:", mesh.position);
};

const updateGazelleState = (state) => {
  const newState = updateVitalityStats(state);
  updateMeshPosition(newState.mesh, newState.x, newState.y, GRID_SIZE);
  updateMeshTexture(newState.mesh, newState.direction);
  updateSpeechBubble(newState.speechBubble, newState.thoughts);
  return newState;
};

// Expose functions to the global scope
window.GazelleModule = {
  move,
  createGazelle,
  placeGazelle,
  updateGazelleMeshPosition,
  updateSpeechBubblePosition,
  updateSpeechBubble,
  updateGazelleState,
};

console.log("Gazelle Simulation loaded:", window.GazelleSimulation);