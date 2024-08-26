// trees.js

const TREE_COVERAGE = 0.3; // 30% of total squares
const NUM_LARGE_CLUMPS = 5;
const MIN_CLUMP_SIZE = 100;
const MAX_CLUMP_SIZE = 300;
const SMALL_CLUMP_MIN = 10;
const SMALL_CLUMP_MAX = 59;
const INDIVIDUAL_TREE_CHANCE = 0.01;

const placeTree = (grid, x, y, treeMaterial) => {
  if (
    !window.UtilsModule.isValidPosition(x, y, grid.length) ||
    grid[x][y].hasTree
  )
    return false;
  return {
    ...grid,
    [x]: {
      ...grid[x],
      [y]: {
        ...grid[x][y],
        mesh: {
          ...grid[x][y].mesh,
          material: treeMaterial,
        },
        hasTree: true,
      },
    },
  };
};

const createClump = (grid, startX, startY, size, gridSize, treeMaterial) => {
  let queue = [{ x: startX, y: startY }];
  let placed = 0;
  let updatedGrid = grid;

  while (queue.length > 0 && placed < size) {
    const { x, y } = queue.shift();
    const newGrid = placeTree(updatedGrid, x, y, treeMaterial);
    if (newGrid !== updatedGrid) {
      placed++;
      updatedGrid = newGrid;
      [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ].forEach(([dx, dy]) => {
        const nx = x + dx,
          ny = y + dy;
        if (window.UtilsModule.isValidPosition(nx, ny, gridSize)) {
          queue.push({ x: nx, y: ny });
        }
      });
      queue.sort(() => Math.random() - 0.5);
    }
  }

  return { updatedGrid, treesPlaced: placed };
};

const placeLargeTreeClusters = (grid, treeMaterial) => {
  console.log("Starting tree placement...");
  const gridSize = UtilsModule.GRID_SIZE;
  const totalGridSquares = gridSize * gridSize;
  const targetTreeSquares = Math.floor(totalGridSquares * 0.3); // 30% of total squares
  let treesPlaced = 0;

  const placeTree = (x, y) => {
    if (!UtilsModule.isValidPosition(x, y, gridSize) || grid[x][y].hasTree) {
      console.log(
        `Cannot place tree at (${x}, ${y}): Invalid position or tree already exists`
      );
      return false;
    }
    console.log(`Placing tree at (${x}, ${y})`);
    grid[x][y].mesh.material = treeMaterial;
    grid[x][y].hasTree = true;
    treesPlaced++;
    return true;
  };

  const createLargeClump = (startX, startY, size) => {
    console.log(
      `Creating large clump starting at (${startX}, ${startY}) with size ${size}`
    );
    let queue = [{ x: startX, y: startY }];
    let placed = 0;

    while (queue.length > 0 && placed < size) {
      let { x, y } = queue.shift();
      if (placeTree(x, y)) {
        placed++;
        // Add adjacent squares to the queue
        [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
        ].forEach(([dx, dy]) => {
          let nx = x + dx,
            ny = y + dy;
          if (UtilsModule.isValidPosition(nx, ny, gridSize)) {
            queue.push({ x: nx, y: ny });
          }
        });
        // Shuffle the queue to create more organic shapes
        queue.sort(() => Math.random() - 0.5);
      }
    }
    console.log(`Large clump created. Placed ${placed} trees.`);
  };

  // Place large clumps
  const numLargeClumps = 5;
  const minClumpSize = 100;
  const maxClumpSize = 300;

  console.log(`Placing ${numLargeClumps} large clumps...`);
  for (let c = 0; c < numLargeClumps && treesPlaced < targetTreeSquares; c++) {
    let x = Math.floor(Math.random() * gridSize);
    let y = Math.floor(Math.random() * gridSize);
    let clumpSize =
      Math.floor(Math.random() * (maxClumpSize - minClumpSize + 1)) +
      minClumpSize;
    console.log(
      `Creating large clump ${c + 1} at (${x}, ${y}) with size ${clumpSize}`
    );
    createLargeClump(x, y, clumpSize);
  }

  // Fill in with smaller clumps
  console.log("Filling in with smaller clumps...");
  while (treesPlaced < targetTreeSquares) {
    let x = Math.floor(Math.random() * gridSize);
    let y = Math.floor(Math.random() * gridSize);
    let clumpSize = Math.floor(Math.random() * 50) + 10; // 10 to 59 trees
    console.log(`Creating small clump at (${x}, ${y}) with size ${clumpSize}`);
    createLargeClump(x, y, clumpSize);
  }

  // Add some individual trees (1% chance per remaining empty square)
  console.log("Adding individual trees...");
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (
        !grid[i][j].hasTree &&
        Math.random() < 0.01 &&
        treesPlaced < targetTreeSquares
      ) {
        placeTree(i, j);
      }
    }
  }

  console.log(`Total tree squares placed: ${treesPlaced}`);
  return grid;
};

window.TreePlacementModule = {
  placeLargeTreeClusters,
};

console.log("TreePlacementModule loaded");
