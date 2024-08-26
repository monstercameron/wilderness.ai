// materials.js

const CANVAS_SIZE = 64;
const FONT_SIZE = 50;

const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const setupContext = (context, width, height) => {
  context.fillStyle = "rgba(255, 255, 255, 0)"; // Transparent background
  context.fillRect(0, 0, width, height);
  context.font = `${FONT_SIZE}px Arial`;
  context.fillStyle = "black";
  context.textAlign = "center";
  context.textBaseline = "middle";
  return context;
};

const createTextureFromEmoji = (emoji) => {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const context = setupContext(
    canvas.getContext("2d"),
    CANVAS_SIZE,
    CANVAS_SIZE
  );
  context.fillText(emoji, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  return new THREE.CanvasTexture(canvas);
};

const createMaterial = (texture, name) => {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
  material.name = name;
  return material;
};

const createMaterialFromEmoji = (emoji, name) => {
  const texture = createTextureFromEmoji(emoji);
  return createMaterial(texture, name);
};

const createMaterials = () => {
  return {
    wheat: createMaterialFromEmoji("🌾", "wheat"),
    tree: createMaterialFromEmoji("🌲", "tree"),
    food: createMaterialFromEmoji("🍎", "food"),
  };
};

// Expose functions to the global scope
window.MaterialsModule = {
  createMaterials,
  createTextureFromEmoji, // Exposed for potential reuse
};
