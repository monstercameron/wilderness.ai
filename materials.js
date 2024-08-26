// materials.js

/**
 * @constant {number}
 * @description The size of the canvas for emoji textures
 */
const CANVAS_SIZE = 64;

/**
 * @constant {number}
 * @description The font size for emoji rendering
 */
const FONT_SIZE = 50;

/**
 * Creates a canvas element with the specified dimensions
 * @param {number} width - The width of the canvas
 * @param {number} height - The height of the canvas
 * @returns {HTMLCanvasElement} The created canvas element
 */
const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/**
 * Sets up the context for emoji rendering
 * @param {CanvasRenderingContext2D} context - The 2D rendering context
 * @param {number} width - The width of the canvas
 * @param {number} height - The height of the canvas
 * @returns {CanvasRenderingContext2D} The configured context
 */
const setupContext = (context, width, height) => {
  context.fillStyle = "rgba(255, 255, 255, 0)"; // Transparent background
  context.fillRect(0, 0, width, height);
  context.font = `${FONT_SIZE}px Arial`;
  context.fillStyle = "black";
  context.textAlign = "center";
  context.textBaseline = "middle";
  return context;
};

/**
 * Creates a texture from an emoji
 * @param {string} emoji - The emoji to render
 * @returns {THREE.CanvasTexture} The created texture
 */
const createTextureFromEmoji = (emoji) => {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const context = setupContext(
    canvas.getContext("2d"),
    CANVAS_SIZE,
    CANVAS_SIZE
  );
  context.fillText(emoji, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  window.UtilsModule.debug(`Created texture for emoji: ${emoji}`);
  return new THREE.CanvasTexture(canvas);
};

/**
 * Creates a material from a texture
 * @param {THREE.Texture} texture - The texture to use for the material
 * @param {string} name - The name of the material
 * @returns {THREE.MeshBasicMaterial} The created material
 */
const createMaterial = (texture, name) => {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
  material.name = name;
  window.UtilsModule.debug(`Created material: ${name}`);
  return material;
};

/**
 * Creates a material from an emoji
 * @param {string} emoji - The emoji to use for the material
 * @param {string} name - The name of the material
 * @returns {THREE.MeshBasicMaterial} The created material
 */
const createMaterialFromEmoji = (emoji, name) => {
  const texture = createTextureFromEmoji(emoji);
  return createMaterial(texture, name);
};

/**
 * Creates all required materials for the game
 * @returns {Object} An object containing all created materials
 */
const createMaterials = () => {
  window.UtilsModule.debug("Creating materials");
  const materials = {
    wheat: createMaterialFromEmoji("🌾", "wheat"),
    tree: createMaterialFromEmoji("🌲", "tree"),
    food: createMaterialFromEmoji("🍎", "food"),
  };
  window.UtilsModule.debug("Materials created", Object.keys(materials));
  return materials;
};

// Expose functions to the global scope
window.MaterialsModule = {
  createMaterials,
  createTextureFromEmoji, // Exposed for potential reuse
};

window.UtilsModule.debug("MaterialsModule loaded");