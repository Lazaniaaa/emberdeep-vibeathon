import type { EnemySpecies } from "@/game/enemies";
import type { PropKind } from "@/game/props";
import { MOB_SIZE, mobPixels, type MobFrame, type MobPixels } from "./mob-sprites";
import { propPixels, type PropFrame } from "./prop-sprites";

const canvases = new Map<string, HTMLCanvasElement>();

/** Draws 16 x 16 sprite pixels onto a canvas, one canvas pixel per sprite pixel. */
function pixelsToCanvas(pixels: MobPixels, flip: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = MOB_SIZE;
  canvas.height = MOB_SIZE;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < MOB_SIZE; y++) {
    for (let x = 0; x < MOB_SIZE; x++) {
      const color = pixels[y][x];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(flip ? MOB_SIZE - 1 - x : x, y, 1, 1);
    }
  }
  return canvas;
}

/**
 * A creature's frame as a 16 x 16 canvas, drawn once and reused: one canvas pixel is one sprite pixel, so the renderer can
 * scale it by a whole number and keep it sharp. `flip` mirrors it to look left.
 */
export function mobCanvas(species: EnemySpecies, frame: MobFrame, flip: boolean): HTMLCanvasElement {
  const key = `${species}:${frame}:${flip ? "l" : "r"}`;
  let canvas = canvases.get(key);
  if (!canvas) {
    canvas = pixelsToCanvas(mobPixels(species, frame), flip);
    canvases.set(key, canvas);
  }
  return canvas;
}

/** A prop (urn, crate, barrel) as a 16 x 16 canvas, whole or cracked. */
export function propCanvas(kind: PropKind, frame: PropFrame): HTMLCanvasElement {
  const key = `prop:${kind}:${frame}`;
  let canvas = canvases.get(key);
  if (!canvas) {
    canvas = pixelsToCanvas(propPixels(kind, frame), false);
    canvases.set(key, canvas);
  }
  return canvas;
}
