// camera.js
let camera;

function setupCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 75;  // Initial zoom level
}

function setupCameraControls() {
    const minZoom = 5;
    const maxZoom = 100;
    const panLimit = gridSize / 2;
    const PAN_SPEED = 0.1; // Tunable constant for pan speed
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const sceneElement = document.getElementById('scene');

    function debugOutput(message) {
        console.log(`[DEBUG] ${message}`);
    }

    const handleMouseDown = (e) => {
        isDragging = true;
        sceneElement.style.cursor = 'grabbing';
        previousMousePosition = { x: e.clientX, y: e.clientY };
        debugOutput(`Mouse down at (${e.clientX}, ${e.clientY})`);
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
            };
            const zoomFactor = camera.position.z / 75;
            
            // Invert the direction of movement and apply PAN_SPEED
            const newX = Math.max(-panLimit, Math.min(panLimit, camera.position.x - deltaMove.x * PAN_SPEED * zoomFactor));
            const newY = Math.max(-panLimit, Math.min(panLimit, camera.position.y + deltaMove.y * PAN_SPEED * zoomFactor));
            
            debugOutput(`Mouse move: delta (${deltaMove.x}, ${deltaMove.y}), zoom factor: ${zoomFactor}`);
            debugOutput(`Camera position before: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);
            
            camera.position.x = newX;
            camera.position.y = newY;
            
            debugOutput(`Camera position after: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => {
        isDragging = false;
        sceneElement.style.cursor = 'grab';
        debugOutput('Mouse up');
    };

    const handleMouseLeave = () => {
        isDragging = false;
        sceneElement.style.cursor = 'default';
        debugOutput('Mouse leave');
    };

    const handleWheel = (event) => {
        const zoomSpeed = 0.1;
        const zoomDelta = event.deltaY * zoomSpeed;
        const newZoom = Math.max(minZoom, Math.min(maxZoom, camera.position.z + zoomDelta));
        debugOutput(`Wheel event: delta ${event.deltaY}, zoom delta ${zoomDelta}`);
        debugOutput(`Camera zoom before: ${camera.position.z}`);
        camera.position.z = newZoom;
        debugOutput(`Camera zoom after: ${camera.position.z}`);
    };

    sceneElement.addEventListener('mousedown', handleMouseDown);
    sceneElement.addEventListener('mousemove', handleMouseMove);
    sceneElement.addEventListener('mouseup', handleMouseUp);
    sceneElement.addEventListener('mouseleave', handleMouseLeave);
    sceneElement.addEventListener('wheel', handleWheel);

    sceneElement.style.cursor = 'grab';
}

window.setupCamera = setupCamera;
window.setupCameraControls = setupCameraControls