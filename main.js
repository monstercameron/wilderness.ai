// main.js
let gazelle;

function initGame() {
    initScene();
    setupCamera();
    const materials = createMaterials();
    createGrid(materials);
    placeLargeTreeClusters(materials);
    placeFoodItems(materials);
    gazelle = placeGazelle(grid, gridSize, squareSize, scene);
    setupCameraControls();
    handleWindowResize();
    animate();
    console.log('Game initialization complete');
}

function moveGazelle(direction) {
    gazelle.animateMove(direction);
}

// Event listener for gazelle movement
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        // Bypass API and move North when spacebar is pressed
        moveGazelle('N');
    } else {
        const keyToDirection = {
            'ArrowUp': 'N', 'ArrowRight': 'E', 'ArrowDown': 'S', 'ArrowLeft': 'W',
            'Home': 'NW', 'PageUp': 'NE', 'End': 'SW', 'PageDown': 'SE'
        };
        if (keyToDirection[event.key]) {
            moveGazelle(keyToDirection[event.key]);
        }
    }
});

// Function to trigger API-based movement
function triggerGazelleAIMove() {
    gazelle.getSurroundingsAndMove();
}

// You can call this function periodically or based on some game event
// For example, to move every 5 seconds:
setInterval(triggerGazelleAIMove, 5000);

// Start the game when the window loads
window.onload = initGame;