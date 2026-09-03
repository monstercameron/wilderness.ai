const getElement = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element #${id}`);
  return element;
};

const initUI = () => ({
  app: getElement("app"),
  worldStatus: getElement("world-status"),
  agentPanel: document.querySelector(".agent-panel"),
  rivalPanel: getElement("rival-panel"),
  agentCollapseButton: getElement("agent-collapse-button"),
  rivalCollapseButton: getElement("rival-collapse-button"),
  agentState: getElement("agent-state"),
  agentThought: getElement("agent-thought"),
  decisionReason: getElement("decision-reason"),
  strengthValue: getElement("strength-value"),
  attackValue: getElement("attack-value"),
  speedValue: getElement("speed-value"),
  staminaValue: getElement("stamina-value"),
  healthValue: getElement("health-value"),
  hungerValue: getElement("hunger-value"),
  thirstValue: getElement("thirst-value"),
  fearValue: getElement("fear-value"),
  strengthMeter: getElement("strength-meter"),
  attackMeter: getElement("attack-meter"),
  speedMeter: getElement("speed-meter"),
  staminaMeter: getElement("stamina-meter"),
  healthMeter: getElement("health-meter"),
  hungerMeter: getElement("hunger-meter"),
  thirstMeter: getElement("thirst-meter"),
  fearMeter: getElement("fear-meter"),
  agentStatuses: getElement("agent-statuses"),
  mindState: getElement("mind-state"),
  mindCorruption: getElement("mind-corruption"),
  mindTransition: getElement("mind-transition"),
  mindVision: getElement("mind-vision"),
  mindRoute: getElement("mind-route"),
  mindPriorities: getElement("mind-priorities"),
  mindGraph: getElement("mind-graph"),
  treeCount: getElement("tree-count"),
  foodCount: getElement("food-count"),
  waterCount: getElement("water-count"),
  stepCount: getElement("step-count"),
  predatorState: getElement("predator-state"),
  predatorCount: getElement("predator-count"),
  predatorDistance: getElement("predator-distance"),
  threatMeter: getElement("threat-meter"),
  combatLog: getElement("combat-log"),
  predatorRoster: getElement("predator-roster"),
  modelButton: getElement("model-button"),
  modelStatus: getElement("model-status"),
  pauseButton: getElement("pause-button"),
  assistButton: getElement("assist-button"),
  centerCameraButton: getElement("center-camera-button"),
  lockCameraButton: getElement("lock-camera-button"),
  autoHideButton: getElement("auto-hide-button"),
  modal: getElement("inference-modal"),
  modalClose: getElement("modal-close"),
  apiKeyForm: getElement("api-key-form"),
  apiKeyInput: getElement("api-key"),
  toggleKey: getElement("toggle-key"),
  localModeButton: getElement("local-mode-button"),
  connectButton: getElement("connect-button"),
  inferenceError: getElement("inference-error"),
});

const setMetric = (valueElement, meterElement, value) => {
  const rounded = Math.round(value);
  valueElement.value = rounded;
  valueElement.textContent = rounded;
  meterElement.style.width = `${window.UtilsModule.clamp(value, 0, 100)}%`;
};

const renderConditionTags = (container, statuses) => {
  const signature = statuses.join("|");
  if (container.dataset.signature === signature) return;
  container.dataset.signature = signature;
  container.replaceChildren(...statuses.map((status) => {
    const tag = document.createElement("span");
    tag.textContent = status;
    tag.dataset.urgent = String(["CORNERED", "CRITICAL", "DOWN", "EXHAUSTED", "STARVING", "DEHYDRATED", "TERRIFIED"].includes(status));
    return tag;
  }));
};

const renderMind = (ui, mind) => {
  ui.mindState.textContent = mind.state;
  ui.mindCorruption.textContent = `FEAR · ${mind.corruption.label} ${mind.corruption.level}%`;
  ui.mindCorruption.dataset.alert = String(mind.corruption.level >= 46);
  ui.mindTransition.textContent = `${mind.transition} · ${mind.stateAge} TURN${mind.stateAge === 1 ? "" : "S"}`;
  ui.mindVision.textContent = `${mind.vision.forwardReach}F · ${mind.vision.rearReach}B · ${mind.vision.visibleCellCount} CELLS`;
  ui.mindRoute.textContent = mind.route.path.length
    ? `${mind.route.path.length} STEPS · ${mind.route.expanded} TRACED`
    : mind.route.status.toUpperCase();
  const priorities = mind.priorities.slice(0, 4);
  const signature = priorities.map(({ state, score }) => `${state}:${score}`).join("|");
  if (ui.mindPriorities.dataset.signature !== signature) {
    ui.mindPriorities.dataset.signature = signature;
    ui.mindPriorities.replaceChildren(...priorities.map(({ state, score }) => {
      const row = document.createElement("div");
      row.className = "mind-priority";
      row.dataset.active = String(state === mind.state);
      const label = document.createElement("span");
      label.textContent = state.replace("SEEK_", "");
      const meter = document.createElement("i");
      const fill = document.createElement("b");
      fill.style.width = `${score}%`;
      meter.append(fill);
      const value = document.createElement("output");
      value.textContent = score;
      row.append(label, meter, value);
      return row;
    }));
  }
  if (!ui.mindGraph.childElementCount) {
    Object.entries(window.ElkMindModule.graph).forEach(([state, edges]) => {
      const row = document.createElement("p");
      const source = document.createElement("strong");
      source.textContent = state;
      row.append(source, document.createTextNode(` → ${edges.join(" · ")}`));
      ui.mindGraph.append(row);
    });
  }
};

const renderPredatorRoster = (container, predators, activeThinker) => {
  const signature = predators.map((predator) => [
    predator.id,
    ...window.AnimalStatusModule.statKeys.map((key) => Math.round(predator.vitalityStats[key])),
    predator.specialStatuses.join(","),
    activeThinker === predator,
  ].join(":" )).join("|");
  if (container.dataset.signature === signature) return;
  container.dataset.signature = signature;
  container.replaceChildren(...predators.map((predator) => {
    const row = document.createElement("article");
    row.className = "predator-row";
    row.dataset.active = String(activeThinker === predator);

    const heading = document.createElement("div");
    heading.className = "predator-row-heading";
    const name = document.createElement("strong");
    name.textContent = `W${predator.id}`;
    const condition = document.createElement("span");
    condition.textContent = predator.specialStatuses.slice(0, 2).join(" · ") || predator.state;
    heading.append(name, condition);

    const vitals = document.createElement("div");
    vitals.className = "predator-vitals";
    const labels = { strength: "STR", attack: "ATK", speed: "SPD", stamina: "STA", health: "HP", hunger: "HUN", thirst: "THR", fear: "FEAR" };
    window.AnimalStatusModule.statKeys.forEach((key) => {
      const value = document.createElement("span");
      value.innerHTML = `<small>${labels[key]}</small>${Math.round(predator.vitalityStats[key])}`;
      vitals.append(value);
    });
    row.append(heading, vitals);
    return row;
  }));
};

const setModelPresentation = (ui, state) => {
  if (state.thinkingPaused) {
    ui.modelStatus.textContent = "THINKING PAUSED";
    ui.modelButton.dataset.mode = "paused";
    return;
  }
  if (state.inferencePending) {
    ui.modelStatus.textContent = "GEMMA · " + (state.activeThinker?.name || "NEXT").toUpperCase();
    ui.modelButton.dataset.mode = "thinking";
    return;
  }

  if (state.inferenceEnabled) {
    const latency = state.lastInference?.latencyMs;
    ui.modelStatus.textContent = latency ? `GEMMA 4 · ${latency}MS` : "GEMMA 4 · READY";
    ui.modelButton.dataset.mode = "cerebras";
    return;
  }

  if (state.staticHosted) {
    ui.modelStatus.textContent = "LOCAL · HOSTED DEMO";
    ui.modelButton.dataset.mode = "local";
    return;
  }

  ui.modelStatus.textContent = !state.localAssistEnabled
    ? "AUTONOMY OFF"
    : state.inferenceError
      ? "LOCAL · GEMMA OFFLINE"
      : `LOCAL · ${(state.activeThinker?.name || "ROUND ROBIN").toUpperCase()}`;
  ui.modelButton.dataset.mode = "local";
};

const update = (ui, state) => {
  const gazelle = state.gazelle;
  const stats = gazelle.vitalityStats;
  const nearestPredator = window.PredatorModule.getNearest(state.predators, gazelle);
  const biome = window.UtilsModule.getBiomeAt(gazelle.x, gazelle.y);
  setMetric(ui.strengthValue, ui.strengthMeter, stats.strength);
  setMetric(ui.attackValue, ui.attackMeter, stats.attack);
  setMetric(ui.speedValue, ui.speedMeter, stats.speed);
  setMetric(ui.staminaValue, ui.staminaMeter, stats.stamina);
  setMetric(ui.healthValue, ui.healthMeter, stats.health);
  setMetric(ui.hungerValue, ui.hungerMeter, stats.hunger);
  setMetric(ui.thirstValue, ui.thirstMeter, stats.thirst);
  setMetric(ui.fearValue, ui.fearMeter, stats.fear);
  renderConditionTags(ui.agentStatuses, gazelle.specialStatuses);
  renderMind(ui, gazelle.mind);
  renderPredatorRoster(ui.predatorRoster, state.predators.members, state.activeThinker);

  ui.agentThought.textContent = gazelle.thoughts;
  ui.decisionReason.textContent = gazelle.lastDecision;
  ui.treeCount.textContent = state.world.stats.treeCount.toLocaleString();
  ui.foodCount.textContent = state.world.stats.foodCount.toLocaleString();
  ui.waterCount.textContent = state.world.stats.waterCount.toLocaleString();
  ui.stepCount.textContent = gazelle.stepCount.toLocaleString();
  ui.predatorCount.textContent = state.predators.members.filter((predator) => predator.vitalityStats.health > 0).length;
  ui.predatorDistance.textContent = nearestPredator ? `${nearestPredator.distance.toFixed(1)} CELLS` : "CLEAR";
  ui.combatLog.textContent = state.predators.lastEvent;
  ui.predatorState.textContent = state.thinkingPaused
    ? "INSTINCTS PAUSED"
    : state.activeThinker?.role === "predator"
      ? (state.inferencePending ? "THINKING · W" : "TURN · W") + state.activeThinker.id
      : nearestPredator?.state || "OUT OF RANGE";
  ui.threatMeter.style.width = `${nearestPredator ? window.UtilsModule.clamp((14 - nearestPredator.distance) / 14 * 100, 0, 100) : 0}%`;
  ui.threatMeter.dataset.danger = String(Boolean(nearestPredator && nearestPredator.distance < 5));

  ui.agentState.textContent = state.thinkingPaused
    ? "OBSERVING"
    : stats.health <= 0
      ? "COLLAPSED"
      : state.inferencePending && state.activeThinker?.role === "prey"
        ? "THINKING"
        : ({
            drink: "DRINKING",
            forage: "FORAGING",
            flee: "FLEEING",
            sacrifice: "BREAKOUT",
            rest: "RESTING",
            recovering: "CATCHING STRIDE",
            move: "SEEKING RESOURCES",
            explore: "EXPLORING",
          })[gazelle.lastAction] || "OBSERVING";

  ui.worldStatus.textContent = stats.health <= 0
    ? "AGENT NEEDS ATTENTION"
    : `${biome.label.toUpperCase()} · ${state.world.stats.chunkCount} REGIONS`;

  ui.pauseButton.textContent = state.thinkingPaused ? "RESUME" : "PAUSE";
  ui.pauseButton.setAttribute("aria-pressed", String(state.thinkingPaused));
  ui.pauseButton.dataset.active = String(state.thinkingPaused);
  ui.assistButton.textContent = state.localAssistEnabled ? "ASSIST ON" : "ASSIST OFF";
  ui.assistButton.setAttribute("aria-pressed", String(state.localAssistEnabled));
  ui.assistButton.dataset.active = String(state.localAssistEnabled);
  ui.lockCameraButton.textContent = state.cameraLocked ? "FOLLOW NIA" : "FOLLOW OFF";
  ui.lockCameraButton.setAttribute("aria-pressed", String(state.cameraLocked));
  ui.lockCameraButton.dataset.active = String(state.cameraLocked);
  ui.agentPanel.dataset.collapsed = String(state.agentPanelCollapsed);
  ui.rivalPanel.dataset.collapsed = String(state.rivalPanelCollapsed);
  ui.agentCollapseButton.textContent = state.agentPanelCollapsed ? "+" : "−";
  ui.agentCollapseButton.setAttribute("aria-expanded", String(!state.agentPanelCollapsed));
  ui.agentCollapseButton.setAttribute("aria-label", state.agentPanelCollapsed ? "Expand Nia status panel" : "Collapse Nia status panel");
  ui.rivalCollapseButton.textContent = state.rivalPanelCollapsed ? "+" : "−";
  ui.rivalCollapseButton.setAttribute("aria-expanded", String(!state.rivalPanelCollapsed));
  ui.rivalCollapseButton.setAttribute("aria-label", state.rivalPanelCollapsed ? "Expand dusk wolf status panel" : "Collapse dusk wolf status panel");
  ui.autoHideButton.textContent = state.autoHideEnabled ? "AUTOHIDE ON" : "AUTOHIDE OFF";
  ui.autoHideButton.setAttribute("aria-pressed", String(state.autoHideEnabled));
  ui.autoHideButton.dataset.active = String(state.autoHideEnabled);
  ui.app.dataset.hudHidden = String(state.hudHidden);

  setModelPresentation(ui, state);
};

const openInferenceModal = (ui, errorMessage = "") => {
  ui.inferenceError.textContent = errorMessage;
  ui.inferenceError.hidden = !errorMessage;
  ui.modal.hidden = false;
  requestAnimationFrame(() => ui.apiKeyInput.focus());
};

const closeInferenceModal = (ui) => {
  ui.modal.hidden = true;
  ui.apiKeyInput.type = "password";
  ui.toggleKey.textContent = "SHOW";
  ui.toggleKey.setAttribute("aria-label", "Show API key");
  ui.modelButton.focus();
};

const setInferenceFormBusy = (ui, busy) => {
  ui.connectButton.disabled = busy;
  ui.localModeButton.disabled = busy;
  ui.apiKeyInput.disabled = busy;
  ui.connectButton.textContent = busy ? "Connecting…" : "Connect Gemma";
};

const showInferenceError = (ui, message) => {
  ui.inferenceError.textContent = message;
  ui.inferenceError.hidden = false;
};

window.UIModule = {
  initUI,
  update,
  openInferenceModal,
  closeInferenceModal,
  setInferenceFormBusy,
  showInferenceError,
};
