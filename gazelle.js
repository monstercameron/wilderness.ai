// gazelle.js
class Gazelle {
  constructor(x, y, direction, gridSize, squareSize, scene, grid) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.gridSize = gridSize;
    this.squareSize = squareSize;
    this.scene = scene;
    this.grid = grid;
    this.mesh = null;
    this.speechBubble = null;
    this.thoughts = "Just grazing...";

    // Initialize vitality stats
    this.vitalityStats = {
      // Physical Vitality Stats
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
      // Mental Vitality Stats
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
    };

    this.createMesh();
    this.createSpeechBubble();
  }

  move(newDirection) {
    let newX = this.x;
    let newY = this.y;

    switch (newDirection) {
      case "N":
        newY = Math.min(this.y + 1, this.gridSize - 1);
        break;
      case "NE":
        newX = Math.min(this.x + 1, this.gridSize - 1);
        newY = Math.min(this.y + 1, this.gridSize - 1);
        break;
      case "E":
        newX = Math.min(this.x + 1, this.gridSize - 1);
        break;
      case "SE":
        newX = Math.min(this.x + 1, this.gridSize - 1);
        newY = Math.max(this.y - 1, 0);
        break;
      case "S":
        newY = Math.max(this.y - 1, 0);
        break;
      case "SW":
        newX = Math.max(this.x - 1, 0);
        newY = Math.max(this.y - 1, 0);
        break;
      case "W":
        newX = Math.max(this.x - 1, 0);
        break;
      case "NW":
        newX = Math.max(this.x - 1, 0);
        newY = Math.min(this.y + 1, this.gridSize - 1);
        break;
    }

    // Check if the new position is not a tree
    if (!this.grid[newX][newY].hasTree) {
      this.x = newX;
      this.y = newY;

      // Update direction and mesh only if it has changed
      if (this.direction !== newDirection) {
        this.direction = newDirection;
        this.updateMeshTexture();
      }

      this.updateMeshPosition();

      // Check if the new position has food
      if (this.grid[this.x][this.y].food > 0) {
        this.consumeFood();
      }

      return true; // Movement successful
    }

    return false; // Movement blocked by tree
  }

  consumeFood() {
    const foodAmount = this.grid[this.x][this.y].food;
    console.log(`Gazelle consumed ${foodAmount} food`);

    // Remove food from the grid
    this.grid[this.x][this.y].food = 0;

    // Remove food mesh
    this.removeFoodMesh();

    // Update thoughts and stats when consuming food
    this.thoughts = "Yum! That was tasty!";
    this.vitalityStats.hunger = Math.max(0, this.vitalityStats.hunger - 20);
    this.updateSpeechBubble();
  }

  removeFoodMesh() {
    // Filter cellMeshes to find the meshes at the correct position and exclude this.mesh
    const cellMeshes = this.scene.children.filter(
      (child) =>
        child.position.x === this.x - this.gridSize / 2 + 0.5 &&
        child.position.y === this.y - this.gridSize / 2 + 0.5 &&
        child !== this.mesh
    );

    // Log the number of meshes found
    console.log(`Found ${cellMeshes.length} meshes at the specified position`);

    cellMeshes.forEach((mesh) => {
      // Check if the mesh has a material and if its name is 'food'
      if (mesh.material && mesh.material.name === "food") {
        console.log(
          `Removing mesh with material name 'food' at position (${mesh.position.x}, ${mesh.position.y})`
        );
        this.scene.remove(mesh);
      } else {
        console.log(
          `Mesh with material name '${
            mesh.material ? mesh.material.name : "undefined"
          }' not removed`
        );
      }
    });
  }

  createMesh() {
    const geometry = new THREE.PlaneGeometry(this.squareSize, this.squareSize);
    const material = new THREE.MeshBasicMaterial({ transparent: true });
    this.mesh = new THREE.Mesh(geometry, material);
    this.updateMeshTexture();
    this.updateMeshPosition();
    this.scene.add(this.mesh);
  }

  updateMeshTexture() {
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
    context.fillText(directionEmojis[this.direction], 96, 32);

    const texture = new THREE.CanvasTexture(canvas);
    this.mesh.material.map = texture;
    this.mesh.material.needsUpdate = true;
  }

  createSpeechBubble() {
    const bubbleGeometry = new THREE.PlaneGeometry(2, 1);
    const bubbleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    this.speechBubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    this.speechBubble.position.set(
      this.x - this.gridSize / 2 + 0.5,
      this.y - this.gridSize / 2 + 1.5,
      0.3
    );
    this.scene.add(this.speechBubble);

    this.updateSpeechBubble();
  }

  updateSpeechBubble() {
    if (this.speechBubble) {
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
      const words = this.thoughts.split(" ");
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
      this.speechBubble.material.map = texture;
      this.speechBubble.material.needsUpdate = true;
    }
  }

  updateMeshPosition() {
    if (this.mesh) {
      this.mesh.position.set(
        this.x - this.gridSize / 2 + 0.5,
        this.y - this.gridSize / 2 + 0.5,
        0.2
      );
    }
  }

  updateMeshPosition() {
    if (this.mesh) {
      this.mesh.position.set(
        this.x - this.gridSize / 2 + 0.5,
        this.y - this.gridSize / 2 + 0.5,
        0.2
      );
    }
    if (this.speechBubble) {
      this.speechBubble.position.set(
        this.x - this.gridSize / 2 + 0.5,
        this.y - this.gridSize / 2 + 1.5,
        0.3
      );
    }
  }

  updateVitalityStats() {
    // This method would be called periodically to update the gazelle's stats
    // For example, increasing hunger and thirst over time
    this.vitalityStats.hunger = Math.min(100, this.vitalityStats.hunger + 0.1);
    this.vitalityStats.thirst = Math.min(100, this.vitalityStats.thirst + 0.1);

    // Update thoughts based on most pressing need
    if (this.vitalityStats.hunger > 80) {
      this.thoughts = "I'm getting really hungry...";
    } else if (this.vitalityStats.thirst > 80) {
      this.thoughts = "I need to find water soon...";
    } else if (this.vitalityStats.fear > 70) {
      this.thoughts = "I feel unsafe. Need to be careful.";
    } else {
      this.thoughts = "Just grazing and enjoying the day.";
    }

    this.updateSpeechBubble();
  }

  async getSurroundingsAndMove() {
    const surroundings = this.getSurroundingGrid();
    const stringRepr = this.gridToString(surroundings);
    try {
    //   const response = await fetch("YOUR_API_URL_HERE", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ grid: stringRepr }),
    //   });
    //   const data = await response.json();
    //   if (data.direction) {
    //     this.animateMove(data.direction);
    //   }
    } catch (error) {
      console.error("Error fetching direction:", error);
    }
  }

  getSurroundingGrid() {
    const surroundings = [];
    for (let dy = -5; dy <= 4; dy++) {
      const row = [];
      for (let dx = -5; dx <= 4; dx++) {
        const x = this.x + dx;
        const y = this.y + dy;
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
          if (this.grid[x][y].hasTree) row.push("T");
          else if (this.grid[x][y].food > 0) row.push("F");
          else row.push(".");
        } else {
          row.push("#"); // Out of bounds
        }
      }
      surroundings.push(row);
    }
    return surroundings;
  }

  gridToString(grid) {
    return grid.map((row) => row.join("")).join("\n") + "\n";
  }

  animateMove(direction) {
    let newX = this.x;
    let newY = this.y;

    switch (direction) {
      case "N":
        newY = Math.min(this.y + 1, this.gridSize - 1);
        break;
      case "NE":
        newX = Math.min(this.x + 1, this.gridSize - 1);
        newY = Math.min(this.y + 1, this.gridSize - 1);
        break;
      case "E":
        newX = Math.min(this.x + 1, this.gridSize - 1);
        break;
      case "SE":
        newX = Math.min(this.x + 1, this.gridSize - 1);
        newY = Math.max(this.y - 1, 0);
        break;
      case "S":
        newY = Math.max(this.y - 1, 0);
        break;
      case "SW":
        newX = Math.max(this.x - 1, 0);
        newY = Math.max(this.y - 1, 0);
        break;
      case "W":
        newX = Math.max(this.x - 1, 0);
        break;
      case "NW":
        newX = Math.max(this.x - 1, 0);
        newY = Math.min(this.y + 1, this.gridSize - 1);
        break;
    }

    // Check if the new position is a tree before animating
    if (this.grid[newX][newY].hasTree) {
      console.log("Cannot move into a tree. Movement canceled.");
      return;
    }

    const startPosition = { x: this.mesh.position.x, y: this.mesh.position.y };
    const endPosition = {
      x: newX - this.gridSize / 2 + 0.5,
      y: newY - this.gridSize / 2 + 0.5,
    };

    const animationDuration = 500; // milliseconds
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / animationDuration, 1);

      this.mesh.position.x =
        startPosition.x + (endPosition.x - startPosition.x) * progress;
      this.mesh.position.y =
        startPosition.y + (endPosition.y - startPosition.y) * progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.move(direction);
      }
    };

    requestAnimationFrame(animate);
  }
}

function placeGazelle(grid, gridSize, squareSize, scene) {
  let x, y;
  do {
    x = Math.floor(Math.random() * gridSize);
    y = Math.floor(Math.random() * gridSize);
  } while (grid[x][y].hasTree || grid[x][y].food > 0);

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const initialDirection =
    directions[Math.floor(Math.random() * directions.length)];

    window.gazelle = new Gazelle(x, y, initialDirection, gridSize, squareSize, scene, grid);
  return window.gazelle;
}

window.Gazelle = Gazelle;
window.placeGazelle = placeGazelle;

console.log(window.Gazelle); // Check if this logs your Gazelle instance
setInterval(() => {
    console.log('Interval function running...');
    if (window.Gazelle) {
        console.log('Updating vitality stats...');
        window.gazelle.updateVitalityStats();
        console.log('Vilality stats updated', window.gazelle.vitalityStats);
    }
}, 500);
