// camera.js
const INITIAL_ZOOM = 75;
const MIN_ZOOM = 5;
const MAX_ZOOM = 100;
const PAN_SPEED = 0.1;
const ZOOM_SPEED = 0.1;

const createCamera = (aspectRatio) => {
  const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
  camera.position.z = INITIAL_ZOOM;
  return camera;
};

const createCameraState = (gridSize) => ({
  isDragging: false,
  previousMousePosition: { x: 0, y: 0 },
  panLimit: gridSize / 2,
});

const debugOutput = (message) => {
  console.log(`[DEBUG] ${message}`);
};

const updateCameraPosition = (camera, deltaX, deltaY, zoomFactor, panLimit) => {
  const newX = Math.max(
    -panLimit,
    Math.min(panLimit, camera.position.x - deltaX * PAN_SPEED * zoomFactor)
  );
  const newY = Math.max(
    -panLimit,
    Math.min(panLimit, camera.position.y + deltaY * PAN_SPEED * zoomFactor)
  );

  debugOutput(
    `Camera position before: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`
  );
  camera.position.x = newX;
  camera.position.y = newY;
  debugOutput(
    `Camera position after: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`
  );

  return camera;
};

const updateCameraZoom = (camera, zoomDelta) => {
  const newZoom = Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, camera.position.z + zoomDelta)
  );
  debugOutput(`Camera zoom before: ${camera.position.z}`);
  camera.position.z = newZoom;
  debugOutput(`Camera zoom after: ${camera.position.z}`);
  return camera;
};

const createCameraControls = (camera, cameraState, sceneElement) => {
  const handleMouseDown = (e) => {
    cameraState.isDragging = true;
    sceneElement.style.cursor = "grabbing";
    cameraState.previousMousePosition = { x: e.clientX, y: e.clientY };
    debugOutput(`Mouse down at (${e.clientX}, ${e.clientY})`);
  };

  const handleMouseMove = (e) => {
    if (cameraState.isDragging) {
      const deltaMove = {
        x: e.clientX - cameraState.previousMousePosition.x,
        y: e.clientY - cameraState.previousMousePosition.y,
      };
      const zoomFactor = camera.position.z / INITIAL_ZOOM;

      debugOutput(
        `Mouse move: delta (${deltaMove.x}, ${deltaMove.y}), zoom factor: ${zoomFactor}`
      );

      updateCameraPosition(
        camera,
        deltaMove.x,
        deltaMove.y,
        zoomFactor,
        cameraState.panLimit
      );

      cameraState.previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    cameraState.isDragging = false;
    sceneElement.style.cursor = "grab";
    debugOutput("Mouse up");
  };

  const handleMouseLeave = () => {
    cameraState.isDragging = false;
    sceneElement.style.cursor = "default";
    debugOutput("Mouse leave");
  };

  const handleWheel = (event) => {
    const zoomDelta = event.deltaY * ZOOM_SPEED;
    debugOutput(`Wheel event: delta ${event.deltaY}, zoom delta ${zoomDelta}`);
    updateCameraZoom(camera, zoomDelta);
  };

  // Add console.log statements to check if the functions are being called
  const addEventListeners = () => {
    console.log("Adding event listeners");
    sceneElement.addEventListener("mousedown", handleMouseDown);
    sceneElement.addEventListener("mousemove", handleMouseMove);
    sceneElement.addEventListener("mouseup", handleMouseUp);
    sceneElement.addEventListener("mouseleave", handleMouseLeave);
    sceneElement.addEventListener("wheel", handleWheel);
  };

  // Call the function to add event listeners
  addEventListeners();

  sceneElement.style.cursor = "grab";

  return {
    dispose: () => {
      console.log("Removing event listeners");
      sceneElement.removeEventListener("mousedown", handleMouseDown);
      sceneElement.removeEventListener("mousemove", handleMouseMove);
      sceneElement.removeEventListener("mouseup", handleMouseUp);
      sceneElement.removeEventListener("mouseleave", handleMouseLeave);
      sceneElement.removeEventListener("wheel", handleWheel);
    },
  };
};

// Expose functions to the global scope
window.CameraModule = {
  createCamera,
  createCameraState,
  createCameraControls,
};

// Add a check to ensure the module is loaded
console.log("CameraModule loaded:", window.CameraModule);