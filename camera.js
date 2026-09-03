const CAMERA_DEFAULT = Object.freeze({
  position: new THREE.Vector3(23, -30, 29),
  target: new THREE.Vector3(0, 0, 0),
  minDistance: 18,
  maxDistance: 78,
});

const createCamera = (aspectRatio) => {
  const camera = new THREE.PerspectiveCamera(43, aspectRatio, 0.1, 220);
  camera.up.set(0, 0, 1);
  camera.position.copy(CAMERA_DEFAULT.position);
  camera.userData.target = CAMERA_DEFAULT.target.clone();
  camera.lookAt(camera.userData.target);
  return camera;
};

const createCameraControls = (camera, canvas) => {
  const state = {
    dragging: false,
    locked: false,
    pointerId: null,
    previous: { x: 0, y: 0 },
  };

  const updateView = () => camera.lookAt(camera.userData.target);

  const onPointerDown = (event) => {
    if (event.button !== 0 || state.locked) return;
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.previous = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };

  const onPointerMove = (event) => {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.previous.x;
    const dy = event.clientY - state.previous.y;
    const distance = camera.position.distanceTo(camera.userData.target);
    const scale = distance * 0.00115;

    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
    right.z = 0;
    right.normalize();

    const forward = new THREE.Vector3().subVectors(camera.userData.target, camera.position);
    forward.z = 0;
    forward.normalize();

    const translation = right.multiplyScalar(-dx * scale).add(forward.multiplyScalar(dy * scale));
    const nextTarget = camera.userData.target.clone().add(translation);
    translation.subVectors(nextTarget, camera.userData.target);

    camera.userData.target.copy(nextTarget);
    camera.position.add(translation);
    state.previous = { x: event.clientX, y: event.clientY };
    updateView();
  };

  const endDrag = (event) => {
    if (!state.dragging) return;
    if (canvas.hasPointerCapture(state.pointerId)) canvas.releasePointerCapture(state.pointerId);
    state.dragging = false;
    state.pointerId = null;
    canvas.style.cursor = "grab";
  };

  const onWheel = (event) => {
    event.preventDefault();
    const target = camera.userData.target;
    const offset = camera.position.clone().sub(target);
    const distance = offset.length();
    const nextDistance = window.UtilsModule.clamp(
      distance * Math.exp(event.deltaY * 0.001),
      CAMERA_DEFAULT.minDistance,
      CAMERA_DEFAULT.maxDistance
    );
    camera.position.copy(target).add(offset.setLength(nextDistance));
    updateView();
  };

  canvas.style.cursor = "grab";
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return {
    focusOn(worldPosition) {
      const offset = camera.position.clone().sub(camera.userData.target);
      camera.userData.target.copy(worldPosition);
      camera.position.copy(worldPosition).add(offset);
      updateView();
    },
    setLocked(locked) {
      state.locked = Boolean(locked);
      if (state.locked && state.dragging) {
        if (state.pointerId !== null && canvas.hasPointerCapture(state.pointerId)) canvas.releasePointerCapture(state.pointerId);
        state.dragging = false;
        state.pointerId = null;
      }
      canvas.style.cursor = state.locked ? "default" : "grab";
    },
    isLocked() {
      return state.locked;
    },
    dispose() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("wheel", onWheel);
    },
  };
};

window.CameraModule = { createCamera, createCameraControls };
