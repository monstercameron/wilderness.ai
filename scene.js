// scene.js

const createRenderer = (width, height) => {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  return renderer;
};

const appendRendererToElement = (renderer, elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.appendChild(renderer.domElement);
  } else {
    console.error(`Element with id '${elementId}' not found`);
  }
};

const initScene = () => {
  const scene = new THREE.Scene();
  const renderer = createRenderer(window.innerWidth, window.innerHeight);
  appendRendererToElement(renderer, "scene");
  return { scene, renderer };
};

const createResizeHandler = (camera, renderer) => () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const setupWindowResize = (camera, renderer) => {
  const handleResize = createResizeHandler(camera, renderer);
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
};

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
