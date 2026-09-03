/** Shared configuration and deterministic procedural helpers. */
const WORLD_CONFIG = Object.freeze({
  seed: 82426,
  chunkSize: 16,
  streamRadius: 3,
  perceptionRadius: 7,
  agentStepMs: 1250,
  vitalityTickMs: 1000,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (start, end, amount) => start + (end - start) * amount;
const smoothstep = (value) => value * value * (3 - 2 * value);
const positionKey = (x, y) => `${x}:${y}`;

const BIOMES = Object.freeze({
  meadow: Object.freeze({ id: "meadow", label: "Open Meadow", low: 0x496646, high: 0x8d9a69, grass: 0x8fa66a }),
  woodland: Object.freeze({ id: "woodland", label: "Deep Woodland", low: 0x263f32, high: 0x607456, grass: 0x587a50 }),
  wetland: Object.freeze({ id: "wetland", label: "Silver Wetland", low: 0x365852, high: 0x718c75, grass: 0x6d9180 }),
  highland: Object.freeze({ id: "highland", label: "Stone Highland", low: 0x4f554b, high: 0x858879, grass: 0x7e8065 }),
  scrub: Object.freeze({ id: "scrub", label: "Amber Scrub", low: 0x675a3d, high: 0x9b8656, grass: 0xa49259 }),
});

const createRandom = (seed = WORLD_CONFIG.seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const hashNoise = (x, y, seed = WORLD_CONFIG.seed) => {
  let value = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
};

const valueNoise = (x, y, seed = WORLD_CONFIG.seed) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const north = lerp(hashNoise(x0, y0, seed), hashNoise(x0 + 1, y0, seed), tx);
  const south = lerp(hashNoise(x0, y0 + 1, seed), hashNoise(x0 + 1, y0 + 1, seed), tx);
  return lerp(north, south, ty);
};

const terrainHeight = (x, y) => {
  const broad = (valueNoise(x * 0.035, y * 0.035, WORLD_CONFIG.seed + 7) - 0.5) * 2.3;
  const rolling = (valueNoise(x * 0.1, y * 0.1, WORLD_CONFIG.seed + 19) - 0.5) * 0.64;
  const detail = (valueNoise(x * 0.34, y * 0.34, WORLD_CONFIG.seed + 31) - 0.5) * 0.13;
  return broad + rolling + detail;
};

const getBiomeAt = (x, y) => {
  const height = terrainHeight(x, y);
  const moisture = valueNoise(x * 0.027, y * 0.027, WORLD_CONFIG.seed + 401);
  const heat = valueNoise(x * 0.021, y * 0.021, WORLD_CONFIG.seed + 449);
  if (height > 0.78) return BIOMES.highland;
  if (moisture > 0.67 || (height < -0.58 && moisture > 0.5)) return BIOMES.wetland;
  if (moisture > 0.52) return BIOMES.woodland;
  if (heat > 0.6 && moisture < 0.48) return BIOMES.scrub;
  return BIOMES.meadow;
};

const isWaterAt = (x, y) => {
  const regionSize = 19;
  const regionX = Math.floor(x / regionSize);
  const regionY = Math.floor(y / regionSize);
  for (let rx = regionX - 1; rx <= regionX + 1; rx++) {
    for (let ry = regionY - 1; ry <= regionY + 1; ry++) {
      if (hashNoise(rx, ry, WORLD_CONFIG.seed + 701) < 0.54) continue;
      const centerX = rx * regionSize + 3 + hashNoise(rx, ry, WORLD_CONFIG.seed + 702) * (regionSize - 6);
      const centerY = ry * regionSize + 3 + hashNoise(rx, ry, WORLD_CONFIG.seed + 703) * (regionSize - 6);
      const radiusX = 2.5 + hashNoise(rx, ry, WORLD_CONFIG.seed + 704) * 2.6;
      const radiusY = 2.2 + hashNoise(rx, ry, WORLD_CONFIG.seed + 705) * 2.4;
      const distance = Math.hypot((x - centerX) / radiusX, (y - centerY) / radiusY);
      const edge = (hashNoise(x, y, WORLD_CONFIG.seed + 706) - 0.5) * 0.22;
      if (distance + edge <= 1) return true;
    }
  }
  return false;
};

const isTreeAt = (x, y) => {
  if (isWaterAt(x, y)) return false;
  const biome = getBiomeAt(x, y);
  const forest = valueNoise(x * 0.075, y * 0.075, WORLD_CONFIG.seed + 101) * 0.72 +
    valueNoise(x * 0.19, y * 0.19, WORLD_CONFIG.seed + 137) * 0.28;
  const thresholds = { woodland: 0.47, wetland: 0.56, meadow: 0.61, highland: 0.67, scrub: 0.69 };
  const scatter = { woodland: 0.2, wetland: 0.3, meadow: 0.38, highland: 0.54, scrub: 0.57 };
  return forest > thresholds[biome.id] && hashNoise(x, y, WORLD_CONFIG.seed + 149) > scatter[biome.id];
};

const createCellDescriptor = (x, y, depletedFood = null) => {
  const water = isWaterAt(x, y);
  const hasTree = !water && isTreeAt(x, y);
  const biome = getBiomeAt(x, y);
  let food = 0;
  let foodType = null;
  if (!water && !hasTree && !depletedFood?.has(positionKey(x, y))) {
    let nearTree = false;
    for (let dx = -1; dx <= 1 && !nearTree; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if ((dx || dy) && isTreeAt(x + dx, y + dy)) {
          nearTree = true;
          break;
        }
      }
    }
    const chance = hashNoise(x, y, WORLD_CONFIG.seed + 303);
    const biomeBoost = biome.id === "meadow" ? 0.035 : biome.id === "wetland" ? 0.018 : biome.id === "scrub" ? -0.02 : 0;
    if (chance > (nearTree ? 0.86 : 0.955) - biomeBoost) {
      const resourceTypes = {
        meadow: "clover",
        woodland: "mushrooms",
        wetland: "watergrass",
        highland: "lichen",
        scrub: "berries",
      };
      foodType = resourceTypes[biome.id];
      food = 4 + Math.floor(hashNoise(x, y, WORLD_CONFIG.seed + 304) * 8);
    }
  }
  return { x, y, height: terrainHeight(x, y), biome: biome.id, hasTree, water, food, foodType };
};

const chunkKey = (chunkX, chunkY) => `${chunkX},${chunkY}`;
const worldToChunk = (value) => Math.floor(value / WORLD_CONFIG.chunkSize);

const directionFromDelta = (dx, dy) => {
  const horizontal = dx > 0 ? "E" : dx < 0 ? "W" : "";
  const vertical = dy > 0 ? "N" : dy < 0 ? "S" : "";
  return `${vertical}${horizontal}` || "N";
};

const debug = (message, data) => {
  if (!window.WILDERNESS_DEBUG) return;
  console.debug(`[Wilderness] ${message}`, data ?? "");
};

window.UtilsModule = {
  WORLD_CONFIG,
  clamp,
  lerp,
  positionKey,
  BIOMES,
  chunkKey,
  worldToChunk,
  createRandom,
  hashNoise,
  valueNoise,
  terrainHeight,
  getBiomeAt,
  isWaterAt,
  isTreeAt,
  createCellDescriptor,
  directionFromDelta,
  debug,
};
