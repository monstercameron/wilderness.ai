// food.js
function placeFoodItems(materials) {
    const totalGridSquares = gridSize * gridSize;
    const maxFoodSquares = Math.floor(totalGridSquares * 0.1); // 10% of total squares
    let foodPlaced = 0;

    function isEdgeOfTree(x, y) {
        if (grid[x][y].hasTree) return false;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[nx][ny].hasTree) {
                    return true;
                }
            }
        }
        return false;
    }

    function placeFood(x, y) {
        if (foodPlaced >= maxFoodSquares) return;
        if (grid[x][y].food > 0 || grid[x][y].hasTree) return;

        const foodAmount = Math.floor(Math.random() * 10) + 1;
        grid[x][y].food = foodAmount;
        foodPlaced++;

        const foodGeometry = new THREE.PlaneGeometry(squareSize * 0.5, squareSize * 0.5);
        const foodMesh = new THREE.Mesh(foodGeometry, materials.food);
        foodMesh.position.set(x - gridSize / 2 + 0.5, y - gridSize / 2 + 0.5, 0.1);
        scene.add(foodMesh);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;
        context.font = 'bold 48px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(foodAmount.toString(), 32, 32);
        const textTexture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true });
        const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(squareSize * 0.3, squareSize * 0.3), textMaterial);
        textMesh.position.set(x - gridSize / 2 + 0.7, y - gridSize / 2 + 0.3, 0.2);
        scene.add(textMesh);
    }

    // Place food near trees
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (isEdgeOfTree(i, j) && Math.random() < 0.3) { // 30% chance to place food near trees
                placeFood(i, j);
            }
        }
    }

    // Create food clusters
    const numClusters = 10;
    for (let c = 0; c < numClusters; c++) {
        let x = Math.floor(Math.random() * gridSize);
        let y = Math.floor(Math.random() * gridSize);
        const clusterSize = Math.floor(Math.random() * 10) + 5; // 5 to 14 food items per cluster

        for (let f = 0; f < clusterSize; f++) {
            placeFood(x, y);
            
            // Move to an adjacent square
            const direction = Math.random();
            if (direction < 0.25) x = Math.min(x + 1, gridSize - 1);
            else if (direction < 0.5) x = Math.max(x - 1, 0);
            else if (direction < 0.75) y = Math.min(y + 1, gridSize - 1);
            else y = Math.max(y - 1, 0);
        }
    }

    console.log(`Total food squares placed: ${foodPlaced}`);
}

window.placeFoodItems = placeFoodItems;