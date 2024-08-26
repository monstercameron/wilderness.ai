// camera.js

/**
 * @constant {number} Initial zoom level
 */
const INITIAL_ZOOM = 75;

/**
 * @constant {number} Minimum zoom level
 */
const MIN_ZOOM = 5;

/**
 * @constant {number} Maximum zoom level
 */
const MAX_ZOOM = 100;

/**
 * @constant {number} Pan speed
 */
const PAN_SPEED = 0.1;

/**
 * @constant {number} Zoom speed
 */
const ZOOM_SPEED = 0.1;

/**
 * Creates a camera
 * @param {number} aspectRatio - The aspect ratio of the viewport
 * @returns {THREE.PerspectiveCamera} The created camera
 */
const createCamera = (aspectRatio) => {
  const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
  camera.position.z = INITIAL_ZOOM;
  window.UtilsModule.debug("Camera created", { position: camera.position });
  return camera;
};

/**
 * Creates the initial camera state
 * @param {number} gridSize - The size of the grid
 * @returns {Object} The initial camera state
 */
const createCameraState = (gridSize) => ({
  isDragging: false,
  previousMousePosition: { x: 0, y: 0 },
  panLimit: gridSize / 2,
});

/**
 * Updates the camera position
 * @param {THREE.PerspectiveCamera} camera - The camera to update
 * @param {number} deltaX - The change in X position
 * @param {number} deltaY - The change in Y position
 * @param {number} zoomFactor - The current zoom factor
 * @param {number} panLimit - The limit for panning
 * @returns {THREE.PerspectiveCamera} The updated camera
 */
const updateCameraPosition = (camera, deltaX, deltaY, zoomFactor, panLimit) => {
  const newX = Math.max(
    -panLimit,
    Math.min(panLimit, camera.position.x - deltaX * PAN_SPEED * zoomFactor)
  );
  const newY = Math.max(
    -panLimit,
    Math.min(panLimit, camera.position.y + deltaY * PAN_SPEED * zoomFactor)
  );

  window.UtilsModule.debug("Updating camera position", {
    before: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    after: { x: newX, y: newY, z: camera.position.z },
  });

  camera.position.x = newX;
  camera.position.y = newY;

  return camera;
};

/**
 * Updates the camera zoom
 * @param {THREE.PerspectiveCamera} camera - The camera to update
 * @param {number} zoomDelta - The change in zoom level
 * @returns {THREE.PerspectiveCamera} The updated camera
 */
const updateCameraZoom = (camera, zoomDelta) => {
  const newZoom = Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, camera.position.z + zoomDelta)
  );

  window.UtilsModule.debug("Updating camera zoom", {
    before: camera.position.z,
    after: newZoom,
  });

  camera.position.z = newZoom;
  return camera;
};

/**
 * Creates camera controls
 * @param {THREE.PerspectiveCamera} camera - The camera to control
 * @param {Object} cameraState - The current camera state
 * @param {HTMLElement} sceneElement - The DOM element for the scene
 * @returns {Object} The camera control functions
 */
const createCameraControls = (camera, cameraState, sceneElement) => {
  const handleMouseDown = (e) => {
    cameraState.isDragging = true;
    sceneElement.style.cursor = "grabbing";
    cameraState.previousMousePosition = { x: e.clientX, y: e.clientY };
    window.UtilsModule.debug("Mouse down", { position: cameraState.previousMousePosition });
  };

  const handleMouseMove = (e) => {
    if (cameraState.isDragging) {
      const deltaMove = {
        x: e.clientX - cameraState.previousMousePosition.x,
        y: e.clientY - cameraState.previousMousePosition.y,
      };
      const zoomFactor = camera.position.z / INITIAL_ZOOM;

      window.UtilsModule.debug("Mouse move", { deltaMove, zoomFactor });

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
    window.UtilsModule.debug("Mouse up");
  };

  const handleMouseLeave = () => {
    cameraState.isDragging = false;
    sceneElement.style.cursor = "default";
    window.UtilsModule.debug("Mouse leave");
  };

  const handleWheel = (event) => {
    const zoomDelta = event.deltaY * ZOOM_SPEED;
    window.UtilsModule.debug("Wheel event", { deltaY: event.deltaY, zoomDelta });
    updateCameraZoom(camera, zoomDelta);
  };

  const addEventListeners = () => {
    window.UtilsModule.debug("Adding camera control event listeners");
    sceneElement.addEventListener("mousedown", handleMouseDown);
    sceneElement.addEventListener("mousemove", handleMouseMove);
    sceneElement.addEventListener("mouseup", handleMouseUp);
    sceneElement.addEventListener("mouseleave", handleMouseLeave);
    sceneElement.addEventListener("wheel", handleWheel);
  };

  addEventListeners();

  sceneElement.style.cursor = "grab";

  return {
    dispose: () => {
      window.UtilsModule.debug("Removing camera control event listeners");
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

window.UtilsModule.debug("CameraModule loaded");