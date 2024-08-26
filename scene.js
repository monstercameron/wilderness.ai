// scene.js

/**
 * Creates a WebGL renderer with the specified dimensions
 * @param {number} width - The width of the renderer
 * @param {number} height - The height of the renderer
 * @returns {THREE.WebGLRenderer} The created renderer
 */
const createRenderer = (width, height) => {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  return renderer;
};

/**
 * Appends the renderer's DOM element to a specified element in the document
 * @param {THREE.WebGLRenderer} renderer - The renderer to append
 * @param {string} elementId - The ID of the element to append the renderer to
 */
const appendRendererToElement = (renderer, elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.appendChild(renderer.domElement);
  } else {
    console.error(`Element with id '${elementId}' not found`);
  }
};

/**
 * Initializes the scene and renderer
 * @returns {{scene: THREE.Scene, renderer: THREE.WebGLRenderer}} The initialized scene and renderer
 */
const initScene = () => {
  const scene = new THREE.Scene();
  const renderer = createRenderer(window.innerWidth, window.innerHeight);
  appendRendererToElement(renderer, "scene");
  return { scene, renderer };
};

/**
 * Creates a resize handler function for the camera and renderer
 * @param {THREE.Camera} camera - The camera to update on resize
 * @param {THREE.WebGLRenderer} renderer - The renderer to resize
 * @returns {Function} The resize handler function
 */
const createResizeHandler = (camera, renderer) => () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

/**
 * Sets up the window resize event listener
 * @param {THREE.Camera} camera - The camera to update on resize
 * @param {THREE.WebGLRenderer} renderer - The renderer to resize
 * @returns {Function} A function to remove the event listener
 */
const setupWindowResize = (camera, renderer) => {
  const handleResize = createResizeHandler(camera, renderer);
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
};

/**
 * Creates an animation loop function
 * @param {THREE.WebGLRenderer} renderer - The renderer to use
 * @param {THREE.Scene} scene - The scene to render
 * @param {THREE.Camera} camera - The camera to use for rendering
 * @returns {Function} The animation loop function
 */
const createAnimationLoop = (renderer, scene, camera) => {
  const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  };
  return animate;
};

// Expose functions to the global scope
window.SceneModule = {
  initScene,
  setupWindowResize,
  createAnimationLoop,
};

console.log("SceneModule loaded");