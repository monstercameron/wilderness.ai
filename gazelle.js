// Helper Functions
const createMesh = (x, y, direction, squareSize) => {
  const geometry = new THREE.PlaneGeometry(squareSize, squareSize);
  const material = new THREE.MeshBasicMaterial({ transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  updateMeshTexture(mesh, direction);
  updateMeshPosition(mesh, x, y, GRID_SIZE);
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

const createSpeechBubble = (x, y, gridSize) => {
  const bubbleGeometry = new THREE.PlaneGeometry(2, 1);
  const bubbleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
  });
  const speechBubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
  speechBubble.position.set(
    x - gridSize / 2 + 0.5,
    y - gridSize / 2 + 1.5,
    0.3
  );
  return speechBubble;
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

const move = (state, newDirection) => {
  let { x, y, direction, grid } = state;
  let newX = x;
  let newY = y;

  switch (newDirection) {
    case "N":
      newY = Math.min(y + 1, GRID_SIZE - 1);
      break;
    case "NE":
      newX = Math.min(x + 1, GRID_SIZE - 1);
      newY = Math.min(y + 1, GRID_SIZE - 1);
      break;
    case "E":
      newX = Math.min(x + 1, GRID_SIZE - 1);
      break;
    case "SE":
      newX = Math.min(x + 1, GRID_SIZE - 1);
      newY = Math.max(y - 1, 0);
      break;
    case "S":
      newY = Math.max(y - 1, 0);
      break;
    case "SW":
      newX = Math.max(x - 1, 0);
      newY = Math.max(y - 1, 0);
      break;
    case "W":
      newX = Math.max(x - 1, 0);
      break;
    case "NW":
      newX = Math.max(x - 1, 0);
      newY = Math.min(y + 1, GRID_SIZE - 1);
      break;
  }

  if (!grid[newX][newY].hasTree) {
    return {
      ...state,
      x: newX,
      y: newY,
      direction: newDirection,
      thoughts:
        grid[newX][newY].food > 0 ? "Yum! That was tasty!" : state.thoughts,
      vitalityStats: {
        ...state.vitalityStats,
        hunger:
          grid[newX][newY].food > 0
            ? Math.max(0, state.vitalityStats.hunger - 20)
            : state.vitalityStats.hunger,
      },
      grid:
        grid[newX][newY].food > 0
          ? {
              ...grid,
              [newX]: {
                ...grid[newX],
                [newY]: { ...grid[newX][newY], food: 0 },
              },
            }
          : grid,
    };
  }

  return state;
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

const placeGazelle = (grid) => {
  let x, y;
  do {
    x = Math.floor(Math.random() * GRID_SIZE);
    y = Math.floor(Math.random() * GRID_SIZE);
  } while (grid[x][y].hasTree || grid[x][y].food > 0);

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const initialDirection =
    directions[Math.floor(Math.random() * directions.length)];

  const mesh = createMesh(x, y, initialDirection, window.UtilsModule.SQUARE_SIZE);
  updateMeshPosition(mesh, x, y, window.UtilsModule.GRID_SIZE);

  const speechBubble = createSpeechBubble(x, y, window.UtilsModule.GRID_SIZE);

  return {
    x,
    y,
    direction: initialDirection,
    grid,
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
    },
  };
};

const updateGazelleState = (state) => {
  const newState = updateVitalityStats(state);
  updateMeshPosition(newState.mesh, newState.x, newState.y, GRID_SIZE);
  updateMeshTexture(newState.mesh, newState.direction);
  updateSpeechBubble(newState.speechBubble, newState.thoughts);
  return newState;
};

// Main update function to be called periodically
const update = (state) => {
  return updateGazelleState(state);
};

window.GazelleSimulation = {
  placeGazelle,
  move,
  update,
  getSurroundingGrid,
  gridToString,
};

console.log("Gazelle Simulation loaded:", window.GazelleSimulation);