const createRenderer = (container) => {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x0b1511, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = "block";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);
  return renderer;
};

const addLighting = (scene) => {
  const hemisphere = new THREE.HemisphereLight(0xc8d9c2, 0x263322, 1.15);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffefd2, 2.1);
  sun.position.set(-28, -38, 55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.00035;
  scene.add(sun);
  scene.add(sun.target);

  const rim = new THREE.DirectionalLight(0x6d9c83, 0.45);
  rim.position.set(35, 28, 18);
  scene.add(rim);

  return { sun, hemisphere, rim };
};

const updateLighting = (lights, focus) => {
  lights.sun.position.set(focus.x - 28, focus.y - 38, 55);
  lights.sun.target.position.set(focus.x, focus.y, 0);
  lights.sun.target.updateMatrixWorld();
};

const initScene = (containerId = "scene") => {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Missing #${containerId} container`);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1913);
  scene.fog = new THREE.FogExp2(0x101d16, 0.012);

  const renderer = createRenderer(container);
  const lights = addLighting(scene);
  return { scene, renderer, container, lights };
};

const setupWindowResize = (camera, renderer, container) => {
  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
  };

  window.addEventListener("resize", resize);
  resize();
  return () => window.removeEventListener("resize", resize);
};

const createAnimationLoop = (onFrame) => {
  let animationFrameId = null;
  let previousTimestamp = performance.now();

  const animate = (timestamp) => {
    const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.1);
    previousTimestamp = timestamp;

    if (onFrame(timestamp, deltaSeconds) === false) {
      animationFrameId = null;
      return;
    }
    animationFrameId = requestAnimationFrame(animate);
  };

  return {
    start() {
      if (animationFrameId !== null) return;
      previousTimestamp = performance.now();
      animationFrameId = requestAnimationFrame(animate);
    },
    stop() {
      if (animationFrameId === null) return;
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    },
  };
};

window.SceneModule = { initScene, setupWindowResize, createAnimationLoop, updateLighting };
