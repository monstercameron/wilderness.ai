// trees.js

const TREE_COVERAGE = 0.3; // 30% of total squares
const NUM_LARGE_CLUMPS = 5;
const MIN_CLUMP_SIZE = 100;
const MAX_CLUMP_SIZE = 300;
const SMALL_CLUMP_MIN = 10;
const SMALL_CLUMP_MAX = 59;
const INDIVIDUAL_TREE_CHANCE = 0.01;

const placeTree = (grid, x, y, treeMaterial) => {
  if (!window.UtilsModule.isValidPosition(x, y, grid.length) || grid[x][y].hasTree) return false;
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
  const gridSize = grid.length;
  const totalGridSquares = gridSize * gridSize;
  const targetTreeSquares = Math.floor(totalGridSquares * TREE_COVERAGE);
  let treesPlaced = 0;
  let updatedGrid = grid;

  // Place large clumps
  for (
    let c = 0;
    c < NUM_LARGE_CLUMPS && treesPlaced < targetTreeSquares;
    c++
  ) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const clumpSize =
      Math.floor(Math.random() * (MAX_CLUMP_SIZE - MIN_CLUMP_SIZE + 1)) +
      MIN_CLUMP_SIZE;
    const { updatedGrid: newGrid, treesPlaced: newTreesPlaced } = createClump(
      updatedGrid,
      x,
      y,
      clumpSize,
      gridSize,
      treeMaterial
    );
    updatedGrid = newGrid;
    treesPlaced += newTreesPlaced;
  }

  // Fill in with smaller clumps
  while (treesPlaced < targetTreeSquares) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const clumpSize =
      Math.floor(Math.random() * (SMALL_CLUMP_MAX - SMALL_CLUMP_MIN + 1)) +
      SMALL_CLUMP_MIN;
    const { updatedGrid: newGrid, treesPlaced: newTreesPlaced } = createClump(
      updatedGrid,
      x,
      y,
      clumpSize,
      gridSize,
      treeMaterial
    );
    updatedGrid = newGrid;
    treesPlaced += newTreesPlaced;
  }

  // Add some individual trees
  updatedGrid = grid.map((row, i) =>
    row.map((cell, j) => {
      if (
        !cell.hasTree &&
        Math.random() < INDIVIDUAL_TREE_CHANCE &&
        treesPlaced < targetTreeSquares
      ) {
        treesPlaced++;
        return {
          ...cell,
          hasTree: true,
          mesh: { ...cell.mesh, material: treeMaterial },
        };
      }
      return cell;
    })
  );

  console.log(`Total tree squares placed: ${treesPlaced}`);
  return updatedGrid;
};

// Expose functions to the global scope
window.TreePlacementModule = {
  placeLargeTreeClusters,
};
