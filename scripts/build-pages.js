const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
const clientFiles = [
  "index.html", "styles.css", "utils.js", "scene.js", "camera.js", "materials.js",
  "grid.js", "water.js", "trees.js", "food.js", "animal-status.js", "navigation.js",
  "elk-mind.js", "agent.js", "inference.js", "gazelle.js", "predator.js", "ui.js", "main.js",
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const file of clientFiles) fs.copyFileSync(path.join(root, file), path.join(output, file));

const threeTarget = path.join(output, "node_modules", "three", "build");
fs.mkdirSync(threeTarget, { recursive: true });
fs.copyFileSync(
  path.join(root, "node_modules", "three", "build", "three.min.js"),
  path.join(threeTarget, "three.min.js")
);
fs.writeFileSync(path.join(output, ".nojekyll"), "");
console.log(`GitHub Pages bundle created at ${output}`);
