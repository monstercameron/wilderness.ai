// grid.js
let grid;
const gridSize = 100;
const squareSize = 1;

function createGrid(materials) {
    grid = [];
    const gridGeometry = new THREE.PlaneGeometry(squareSize, squareSize);
    for (let i = 0; i < gridSize; i++) {
        grid[i] = [];
        for (let j = 0; j < gridSize; j++) {
            const square = new THREE.Mesh(gridGeometry, materials.wheat);
            square.position.set(i - gridSize / 2 + 0.5, j - gridSize / 2 + 0.5, 0);
            scene.add(square);
            grid[i][j] = { mesh: square, hasTree: false, food: 0 };
        }
    }
}

window.createGrid = createGrid;
window.grid = grid;
window.gridSize = gridSize;
window.squareSize = squareSize;