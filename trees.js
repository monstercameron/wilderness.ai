// trees.js
function placeLargeTreeClusters(materials) {
    const totalGridSquares = gridSize * gridSize;
    const targetTreeSquares = Math.floor(totalGridSquares * 0.3); // 30% of total squares
    let treesPlaced = 0;

    function placeTree(x, y) {
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || grid[x][y].hasTree) return false;
        grid[x][y].mesh.material = materials.tree;
        grid[x][y].hasTree = true;
        treesPlaced++;
        return true;
    }

    function createLargeClump(startX, startY, size) {
        let queue = [{x: startX, y: startY}];
        let placed = 0;

        while (queue.length > 0 && placed < size) {
            let {x, y} = queue.shift();
            if (placeTree(x, y)) {
                placed++;
                // Add adjacent squares to the queue
                [[0,1],[1,0],[0,-1],[-1,0]].forEach(([dx, dy]) => {
                    let nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                        queue.push({x: nx, y: ny});
                    }
                });
                // Shuffle the queue to create more organic shapes
                queue.sort(() => Math.random() - 0.5);
            }
        }
    }

    // Place large clumps
    const numLargeClumps = 5;
    const minClumpSize = 100;
    const maxClumpSize = 300;

    for (let c = 0; c < numLargeClumps && treesPlaced < targetTreeSquares; c++) {
        let x = Math.floor(Math.random() * gridSize);
        let y = Math.floor(Math.random() * gridSize);
        let clumpSize = Math.floor(Math.random() * (maxClumpSize - minClumpSize + 1)) + minClumpSize;
        createLargeClump(x, y, clumpSize);
    }

    // Fill in with smaller clumps
    while (treesPlaced < targetTreeSquares) {
        let x = Math.floor(Math.random() * gridSize);
        let y = Math.floor(Math.random() * gridSize);
        let clumpSize = Math.floor(Math.random() * 50) + 10; // 10 to 59 trees
        createLargeClump(x, y, clumpSize);
    }

    // Add some individual trees (1% chance per remaining empty square)
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (!grid[i][j].hasTree && Math.random() < 0.01 && treesPlaced < targetTreeSquares) {
                placeTree(i, j);
            }
        }
    }

    console.log(`Total tree squares placed: ${treesPlaced}`);
}

window.placeLargeTreeClusters = placeLargeTreeClusters;