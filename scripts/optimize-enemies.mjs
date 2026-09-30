// Rebuilds public/enemies/*.webp from the large illustrations in art-src/enemies.
// The originals are 1254x1254 with a transparent background. The game never draws a creature larger than
// about 130 screen pixels, so each one is trimmed to its outline and resized to fit 256x256, keeping alpha.
import { mkdir, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, "art-src", "enemies");
const target = path.join(root, "public", "enemies");
const SIZE = 256;
const QUALITY = Number(process.env.ENEMY_QUALITY ?? 92);

await mkdir(target, { recursive: true });
let before = 0, after = 0;
for (const name of (await readdir(source)).filter(n => n.endsWith(".png")).sort()) {
  const input = path.join(source, name);
  // Trim the empty margin so every creature fills its square, then centre it with a little padding.
  const trimmed = await sharp(input).trim({ threshold: 8 }).toBuffer({ resolveWithObject: true });
  const pad = 6;
  const fit = SIZE - pad * 2;
  const output = path.join(target, name.replace(/\.png$/, ".webp").replace("-v2", ""));
  await sharp(trimmed.data)
    .resize(fit, fit, { fit: "inside", kernel: "lanczos3" })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: QUALITY, alphaQuality: 100, effort: 6 })
    .toFile(output);
  const [a, b] = [(await stat(input)).size, (await stat(output)).size];
  before += a; after += b;
  console.log(`${name}: ${trimmed.info.width}x${trimmed.info.height} trimmed -> ${path.basename(output)}  ${(a / 1024).toFixed(0)} KB -> ${(b / 1024).toFixed(0)} KB`);
}
console.log(`total ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(2)} MB`);
