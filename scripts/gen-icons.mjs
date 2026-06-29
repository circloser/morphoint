// One-off: rasterize app/icon.svg into the PNG icons a PWA needs.
// Run with: node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const svgPath = fileURLToPath(new URL("../app/icon.svg", import.meta.url));
const svg = await readFile(svgPath);

async function out(size, file, maskable = false) {
  let img = sharp(svg, { density: 384 }).resize(size, size);
  // Maskable icons must be full-bleed (no transparent corners) so the platform
  // mask can crop them cleanly.
  if (maskable) img = img.flatten({ background: "#0a0a0a" });
  const dest = fileURLToPath(new URL(`../public/${file}`, import.meta.url));
  await img.png().toFile(dest);
  console.log("wrote", file);
}

await out(192, "icon-192.png");
await out(512, "icon-512.png");
await out(512, "icon-maskable-512.png", true);
await out(180, "apple-icon.png", true);
console.log("done");
