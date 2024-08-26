// scene.js
let scene, renderer;

function initScene() {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const sceneElement = document.getElementById('scene');
    sceneElement.appendChild(renderer.domElement);
}

function handleWindowResize() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.initScene = initScene;
window.handleWindowResize = handleWindowResize;
window.animate = animate;