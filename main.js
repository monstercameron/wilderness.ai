const KEY_DIRECTIONS = Object.freeze({
  ArrowUp: "N",
  ArrowRight: "E",
  ArrowDown: "S",
  ArrowLeft: "W",
  Home: "NW",
  PageUp: "NE",
  End: "SW",
  PageDown: "SE",
});

const initGame = () => {
  const { scene, renderer, container, lights } = window.SceneModule.initScene();
  const camera = window.CameraModule.createCamera(container.clientWidth / container.clientHeight);
  const materials = window.MaterialsModule.createMaterials();
  const world = window.GridModule.createWorld(scene, materials);
  const gazelle = window.GazelleModule.createGazelle(world, scene, materials);
  const predators = window.PredatorModule.createPack(world, scene, materials, gazelle);
  world.predators = predators;
  const statusContext = { world, gazelle, predators };
  [gazelle, ...predators.members].forEach((animal) => window.AnimalStatusModule.deriveSpecialStatuses(animal, statusContext));
  const ui = window.UIModule.initUI();
  const cameraControls = window.CameraModule.createCameraControls(camera, renderer.domElement);
  cameraControls.focusOn(gazelle.visual.position.clone());
  world.updateStreaming([camera.userData.target, gazelle]);
  const disposeResize = window.SceneModule.setupWindowResize(camera, renderer, container);

  return {
    scene,
    renderer,
    container,
    camera,
    lights,
    materials,
    grid: world,
    world,
    gazelle,
    predators,
    ui,
    cameraControls,
    disposeResize,
    random: window.UtilsModule.createRandom(window.UtilsModule.WORLD_CONFIG.seed + 606),
    elapsedSeconds: 0,
    vitalityAccumulator: 0,
    cognitionAccumulator: 0,
    uiAccumulator: 0,
    roundRobinCursor: 0,
    cognitionTurnCount: 0,
    activeThinker: null,
    inferenceEnabled: false,
    staticHosted: false,
    inferencePending: false,
    inferenceError: null,
    lastInference: null,
    cameraLocked: false,
    agentPanelCollapsed: false,
    rivalPanelCollapsed: false,
    autoHideEnabled: true,
    hudHidden: false,
    thinkingPaused: false,
    localAssistEnabled: true,
    decisionGeneration: 0,
    stopped: false,
  };
};

const getAnimals = (state) => [state.gazelle, ...state.predators.members.filter((predator) => predator.vitalityStats.health > 0)];

const getLocalInstinct = (state, actor) =>
  actor.role === "prey"
    ? window.AgentModule.decide(actor, state.world, state.random)
    : window.PredatorModule.decide(actor, state.gazelle, state.world);

const applyLocalAssist = (state, actor, modelDecision, instinct) => {
  if (!state.localAssistEnabled) return modelDecision;
  if (
    actor.role === "prey" &&
    modelDecision.action === "sacrifice" &&
    !actor.mind?.context?.cornered &&
    !actor.mind?.context?.imminent
  ) {
    return {
      ...instinct,
      thought: modelDecision.thought + " My body refuses an unnecessary sacrifice.",
      reason: "Local Assist reserved BREAKOUT for cornered or imminent danger: " + instinct.reason,
      source: "local-assist",
    };
  }
  if (modelDecision.direction === "STAY" && modelDecision.action !== "rest") {
    const cell = state.world.getCell(actor.x, actor.y);
    const actionWorks =
      (modelDecision.action === "drink" && cell.water) ||
      (modelDecision.action === "forage" && cell.food > 0) ||
      (modelDecision.action === "attack" && Math.hypot(state.gazelle.x - actor.x, state.gazelle.y - actor.y) <= 1.45);
    if (!actionWorks && instinct.direction !== "STAY") {
      return {
        ...instinct,
        thought: modelDecision.thought + " Instinct identifies a viable adjacent action.",
        reason: "Local Assist replaced an inapplicable stationary action: " + instinct.reason,
        source: "local-assist",
      };
    }
  }

  if (actor.role === "prey") {
    const move = window.AgentModule.DIRECTIONS.find((entry) => entry.name === modelDecision.direction);
    const nextX = actor.x + (move?.dx || 0);
    const nextY = actor.y + (move?.dy || 0);
    const threat = instinct.perception?.nearestPredator || null;
    if (threat?.distance < 9) {
      const instinctMove = window.AgentModule.DIRECTIONS.find((entry) => entry.name === instinct.direction);
      const modelDistance = Math.hypot(threat.x - nextX, threat.y - nextY);
      const instinctDistance = Math.hypot(
        threat.x - actor.x - (instinctMove?.dx || 0),
        threat.y - actor.y - (instinctMove?.dy || 0)
      );
      if (instinctDistance > modelDistance + 0.2) {
        return {
          ...instinct,
          thought: modelDecision.thought + " Survival instinct catches a safer opening.",
          reason: "Local Assist rejected movement toward a nearby predator: " + instinct.reason,
          source: "local-assist",
        };
      }
    }
    const visits = actor.memory.visits.get(window.UtilsModule.positionKey(nextX, nextY)) || 0;
    if (visits >= 3 && instinct.direction !== modelDecision.direction) {
      return {
        ...instinct,
        thought: modelDecision.thought + " I recognize this loop and change course.",
        reason: "Local Assist broke a repeated path: " + instinct.reason,
        source: "local-assist",
      };
    }
  }
  return modelDecision;
};

const applyAnimalDecision = (state, actor, decision) => {
  if (!decision || state.stopped) return false;
  const emergencyBreakout = actor.role === "prey" && decision.action === "sacrifice" &&
    (actor.mind?.context?.cornered || actor.mind?.context?.imminent);
  if (decision.direction !== "STAY" && actor.movementBudget < 1 && !emergencyBreakout) {
    actor.lastAction = "recovering";
    actor.lastDecision = `${actor.name} is between strides: ${Math.round(actor.vitalityStats.speed)} speed has built ${actor.movementBudget.toFixed(2)} / 1 movement.`;
    if (actor.role === "prey") actor.thoughts = "I need one more breath before I can cover another cell.";
    return false;
  }
  if (decision.direction !== "STAY") {
    actor.movementBudget = emergencyBreakout ? 0 : Math.max(0, actor.movementBudget - 1);
  }
  let acted = false;
  if (actor.role === "prey") {
    actor.thoughts = decision.thought;
    actor.lastDecision = decision.reason;
    actor.lastAction = decision.action;
    const result = window.GazelleModule.applyDecision(actor, decision, state.world);
    if (result.consumed > 0) {
      state.world.consumeFood(actor.x, actor.y);
      actor.lastDecision = decision.reason + " Consumed " + result.consumed + " units.";
    }
    if (result.drank) actor.lastDecision = decision.reason + " Hydration restored.";
    acted = Boolean(result.moved || result.acted);
  } else {
    acted = window.PredatorModule.applyDecision(state.predators, actor, decision, state.gazelle, state.world);
  }
  const statusContext = { world: state.world, gazelle: state.gazelle, predators: state.predators };
  getAnimals(state).forEach((animal) => window.AnimalStatusModule.deriveSpecialStatuses(animal, statusContext));
  return acted;
};

const runCognitionTurn = async (state) => {
  if (state.inferencePending || state.stopped || state.thinkingPaused) return;
  if (!state.inferenceEnabled && !state.localAssistEnabled) {
    state.gazelle.thoughts = "Every autonomous instinct is quiet. I am waiting for guidance.";
    state.gazelle.lastDecision = "No cognition engine is active.";
    window.UIModule.update(state.ui, state);
    return;
  }

  const animals = getAnimals(state);
  const actor = animals[state.roundRobinCursor % animals.length];
  state.roundRobinCursor = (state.roundRobinCursor + 1) % animals.length;
  state.cognitionTurnCount++;
  state.activeThinker = actor;
  actor.movementBudget = Math.min(1.5, actor.movementBudget + actor.vitalityStats.speed / 100);
  const generation = state.decisionGeneration;
  const instinct = getLocalInstinct(state, actor);
  let decision = instinct;

  if (state.inferenceEnabled) {
    state.inferencePending = true;
    state.inferenceError = null;
    window.UIModule.update(state.ui, state);
    try {
      const modelDecision = await window.InferenceModule.decideAnimal(actor, state.world, state.gazelle, instinct);
      state.lastInference = {
        latencyMs: modelDecision.latencyMs,
        usage: modelDecision.usage,
        model: modelDecision.model,
        actor: actor.name,
      };
      decision = applyLocalAssist(state, actor, modelDecision, instinct);
    } catch (error) {
      state.inferenceError = error.message;
      if (/key|unauthorized|401/i.test(error.message)) {
        state.inferenceEnabled = false;
        window.UIModule.openInferenceModal(state.ui, "Cerebras rejected this key. Check it and reconnect.");
      }
      if (state.localAssistEnabled) {
        decision = { ...instinct, reason: "Local Assist recovered this turn: " + instinct.reason };
      } else {
        decision = null;
        if (actor.role === "prey") {
          actor.thoughts = "The remote signal faded. I will stay here.";
          actor.lastDecision = "Inference turn failed: " + error.message;
        }
      }
    } finally {
      state.inferencePending = false;
      state.activeThinker = null;
    }
  }

  if (generation !== state.decisionGeneration || !decision) return;
  applyAnimalDecision(state, actor, decision);
  window.UIModule.update(state.ui, state);
};

const setupInput = (state) => {
  const onKeyDown = (event) => {
    const direction = KEY_DIRECTIONS[event.code];
    if (!direction || !state.ui.modal.hidden) return;
    event.preventDefault();
    state.decisionGeneration++;
    const move = window.AgentModule.DIRECTIONS.find((entry) => entry.name === direction);
    applyAnimalDecision(state, state.gazelle, {
      direction,
      action: "explore",
      target: { x: state.gazelle.x + move.dx, y: state.gazelle.y + move.dy },
      thought: "A distant signal guides me " + window.AgentModule.describeDirection(direction) + ".",
      reason: "Observer guidance received: move " + window.AgentModule.describeDirection(direction) + ".",
    });
    state.cognitionAccumulator = 0;
    window.UIModule.update(state.ui, state);
  };
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
};

const setupThinkingControls = (state) => {
  const onPause = () => {
    state.thinkingPaused = !state.thinkingPaused;
    state.decisionGeneration++;
    if (state.thinkingPaused) {
      state.gazelle.thoughts = "The whole ecosystem will hold its decisions.";
      state.gazelle.lastDecision = "Round-robin cognition paused by the observer.";
    } else {
      state.gazelle.thoughts = "Every mind is listening again.";
      state.gazelle.lastDecision = "Round-robin cognition resumed.";
      state.cognitionAccumulator = 1000;
    }
    window.UIModule.update(state.ui, state);
  };

  const onAssist = () => {
    state.localAssistEnabled = !state.localAssistEnabled;
    state.decisionGeneration++;
    state.gazelle.lastDecision = state.localAssistEnabled
      ? "Local instincts now validate every animal turn."
      : "Local instinct intervention disabled; Gemma has direct control.";
    window.UIModule.update(state.ui, state);
  };

  state.ui.pauseButton.addEventListener("click", onPause);
  state.ui.assistButton.addEventListener("click", onAssist);
  return () => {
    state.ui.pauseButton.removeEventListener("click", onPause);
    state.ui.assistButton.removeEventListener("click", onAssist);
  };
};

const setupCameraButtons = (state) => {
  const centerHero = () => state.cameraControls.focusOn(state.gazelle.visual.position.clone());
  const toggleLock = () => {
    state.cameraLocked = !state.cameraLocked;
    state.cameraControls.setLocked(state.cameraLocked);
    if (state.cameraLocked) centerHero();
    window.UIModule.update(state.ui, state);
  };
  const onShortcut = (event) => {
    if (!state.ui.modal.hidden || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === "KeyC") {
      event.preventDefault();
      centerHero();
    } else if (event.code === "KeyL") {
      event.preventDefault();
      toggleLock();
    }
  };

  state.ui.centerCameraButton.addEventListener("click", centerHero);
  state.ui.lockCameraButton.addEventListener("click", toggleLock);
  document.addEventListener("keydown", onShortcut);
  return () => {
    state.ui.centerCameraButton.removeEventListener("click", centerHero);
    state.ui.lockCameraButton.removeEventListener("click", toggleLock);
    document.removeEventListener("keydown", onShortcut);
  };
};

const setupDisplayControls = (state) => {
  const inactivityDelayMs = 5000;
  let inactivityTimer = null;

  const setHudHidden = (hidden) => {
    if (state.hudHidden === hidden) return;
    state.hudHidden = hidden;
    window.UIModule.update(state.ui, state);
  };
  const scheduleAutoHide = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = null;
    if (!state.autoHideEnabled) return;
    inactivityTimer = setTimeout(() => {
      if (!state.ui.modal.hidden) {
        scheduleAutoHide();
        return;
      }
      setHudHidden(true);
    }, inactivityDelayMs);
  };
  const onActivity = () => {
    setHudHidden(false);
    scheduleAutoHide();
  };
  const toggleAgentPanel = () => {
    state.agentPanelCollapsed = !state.agentPanelCollapsed;
    window.UIModule.update(state.ui, state);
  };
  const toggleRivalPanel = () => {
    state.rivalPanelCollapsed = !state.rivalPanelCollapsed;
    window.UIModule.update(state.ui, state);
  };
  const toggleAutoHide = () => {
    state.autoHideEnabled = !state.autoHideEnabled;
    setHudHidden(false);
    scheduleAutoHide();
    window.UIModule.update(state.ui, state);
  };

  state.ui.agentCollapseButton.addEventListener("click", toggleAgentPanel);
  state.ui.rivalCollapseButton.addEventListener("click", toggleRivalPanel);
  state.ui.autoHideButton.addEventListener("click", toggleAutoHide);
  document.addEventListener("pointermove", onActivity, { passive: true });
  document.addEventListener("pointerdown", onActivity, { passive: true });
  document.addEventListener("keydown", onActivity);
  scheduleAutoHide();

  return () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    state.ui.agentCollapseButton.removeEventListener("click", toggleAgentPanel);
    state.ui.rivalCollapseButton.removeEventListener("click", toggleRivalPanel);
    state.ui.autoHideButton.removeEventListener("click", toggleAutoHide);
    document.removeEventListener("pointermove", onActivity);
    document.removeEventListener("pointerdown", onActivity);
    document.removeEventListener("keydown", onActivity);
  };
};

const setupInferenceControls = (state) => {
  const { ui } = state;
  const setLocalMode = async () => {
    state.decisionGeneration++;
    state.inferenceEnabled = false;
    state.inferencePending = false;
    state.inferenceError = null;
    state.lastInference = null;
    state.localAssistEnabled = true;
    try {
      await window.InferenceModule.disconnect();
    } catch {
      // Local behavior remains available if the inference bridge is restarting.
    }
    ui.apiKeyInput.value = "";
    window.UIModule.closeInferenceModal(ui);
    window.UIModule.update(ui, state);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const apiKey = ui.apiKeyInput.value.trim();
    window.UIModule.setInferenceFormBusy(ui, true);
    ui.inferenceError.hidden = true;
    try {
      await window.InferenceModule.configure(apiKey);
      state.decisionGeneration++;
      state.inferenceEnabled = true;
      state.inferenceError = null;
      state.lastInference = null;
      ui.apiKeyInput.value = "";
      window.UIModule.closeInferenceModal(ui);
      state.cognitionAccumulator = 1000;
      window.UIModule.update(ui, state);
    } catch (error) {
      window.UIModule.showInferenceError(ui, error.message);
      ui.apiKeyInput.focus();
    } finally {
      window.UIModule.setInferenceFormBusy(ui, false);
    }
  };

  const onToggleKey = () => {
    const showing = ui.apiKeyInput.type === "text";
    ui.apiKeyInput.type = showing ? "password" : "text";
    ui.toggleKey.textContent = showing ? "SHOW" : "HIDE";
    ui.toggleKey.setAttribute("aria-label", showing ? "Show API key" : "Hide API key");
    ui.apiKeyInput.focus();
  };
  const onClose = () => window.UIModule.closeInferenceModal(ui);
  const onOpen = () => window.UIModule.openInferenceModal(
    ui,
    state.staticHosted ? window.InferenceModule.staticHostMessage : state.inferenceError || ""
  );
  const onBackdropClick = (event) => {
    if (event.target === ui.modal) onClose();
  };
  const onEscape = (event) => {
    if (event.key === "Escape" && !ui.modal.hidden) onClose();
  };

  ui.apiKeyForm.addEventListener("submit", onSubmit);
  ui.localModeButton.addEventListener("click", setLocalMode);
  ui.modalClose.addEventListener("click", onClose);
  ui.modelButton.addEventListener("click", onOpen);
  ui.toggleKey.addEventListener("click", onToggleKey);
  ui.modal.addEventListener("click", onBackdropClick);
  document.addEventListener("keydown", onEscape);

  window.InferenceModule.getStatus()
    .then((status) => {
      state.staticHosted = Boolean(status.hostedStatic);
      state.inferenceEnabled = Boolean(status.configured);
      if (!status.configured && !status.hostedStatic) window.UIModule.openInferenceModal(ui);
      window.UIModule.update(ui, state);
    })
    .catch(() => {
      state.inferenceError = "The local inference service is unavailable.";
      window.UIModule.openInferenceModal(ui, state.inferenceError);
      window.UIModule.update(ui, state);
    });

  return () => {
    ui.apiKeyForm.removeEventListener("submit", onSubmit);
    ui.localModeButton.removeEventListener("click", setLocalMode);
    ui.modalClose.removeEventListener("click", onClose);
    ui.modelButton.removeEventListener("click", onOpen);
    ui.toggleKey.removeEventListener("click", onToggleKey);
    ui.modal.removeEventListener("click", onBackdropClick);
    document.removeEventListener("keydown", onEscape);
  };
};

const stopGame = (state) => {
  if (state.stopped) return;
  state.stopped = true;
  state.decisionGeneration++;
  state.gazelle.thoughts = "My strength is gone.";
  state.gazelle.lastDecision = "Vitality reached zero; simulation paused.";
  window.UIModule.update(state.ui, state);
};

const startGame = () => {
  const state = initGame();
  const disposeInput = setupInput(state);
  const disposeThinkingControls = setupThinkingControls(state);
  const disposeCameraButtons = setupCameraButtons(state);
  const disposeDisplayControls = setupDisplayControls(state);
  const disposeInferenceControls = setupInferenceControls(state);
  window.UIModule.update(state.ui, state);

  const loop = window.SceneModule.createAnimationLoop((timestamp, deltaSeconds) => {
    state.elapsedSeconds += deltaSeconds;
    state.vitalityAccumulator += deltaSeconds * 1000;
    state.cognitionAccumulator += deltaSeconds * 1000;
    state.uiAccumulator += deltaSeconds * 1000;
    state.world.updateStreaming([state.camera.userData.target, state.gazelle]);
    window.SceneModule.updateLighting(state.lights, state.camera.userData.target);

    if (!state.stopped && state.vitalityAccumulator >= window.UtilsModule.WORLD_CONFIG.vitalityTickMs) {
      const vitalitySeconds = state.vitalityAccumulator / 1000;
      const statusContext = { world: state.world, gazelle: state.gazelle, predators: state.predators };
      getAnimals(state).forEach((animal) => window.AnimalStatusModule.updateVitals(animal, vitalitySeconds, statusContext));
      state.vitalityAccumulator = 0;
      if (state.gazelle.vitalityStats.health <= 0) stopGame(state);
    }

    const cognitionInterval = state.inferenceEnabled ? 900 : 420;
    if (!state.stopped && !state.thinkingPaused && !state.inferencePending && state.cognitionAccumulator >= cognitionInterval) {
      void runCognitionTurn(state);
      state.cognitionAccumulator = 0;
    }

    window.GazelleModule.updateVisual(state.gazelle, deltaSeconds, state.elapsedSeconds);
    if (state.cameraLocked) state.cameraControls.focusOn(state.gazelle.visual.position);
    window.PredatorModule.updatePack(state.predators, state.gazelle, state.world, deltaSeconds, state.elapsedSeconds);
    window.WaterModule.updateVisual(state.world, state.elapsedSeconds);

    if (state.uiAccumulator >= 200) {
      window.UIModule.update(state.ui, state);
      state.uiAccumulator = 0;
    }
    state.renderer.render(state.scene, state.camera);
    return true;
  });

  const dispose = () => {
    loop.stop();
    state.decisionGeneration++;
    disposeInput();
    disposeThinkingControls();
    disposeCameraButtons();
    disposeDisplayControls();
    disposeInferenceControls();
    state.cameraControls.dispose();
    state.disposeResize();
    state.renderer.dispose();
  };

  window.addEventListener("beforeunload", dispose, { once: true });
  window.WildernessApp = {
    state,
    runCognitionTurn: () => runCognitionTurn(state),
    togglePause: () => state.ui.pauseButton.click(),
    toggleLocalAssist: () => state.ui.assistButton.click(),
    centerHero: () => state.ui.centerCameraButton.click(),
    toggleCameraLock: () => state.ui.lockCameraButton.click(),
    toggleAutoHide: () => state.ui.autoHideButton.click(),
    dispose,
  };
  loop.start();
};

window.addEventListener("load", () => {
  try {
    startGame();
  } catch (error) {
    console.error("Wilderness.ai failed to start", error);
    const status = document.getElementById("world-status");
    if (status) status.textContent = "SIM ERROR · " + error.message;
  }
});
