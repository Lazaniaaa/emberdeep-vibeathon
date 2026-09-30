import type { EnemySpecies } from "@/game/enemies";
import { MOB_SIZE, mobPixels, type MobFrame } from "./mob-sprites";

const canvases = new Map<string, HTMLCanvasElement>();

/**
 * A creature's frame as a 16 x 16 canvas, drawn once and reused: one canvas pixel is one sprite pixel, so the renderer can
 * scale it by a whole number and keep it sharp. `flip` mirrors it to look left.
 */
export function mobCanvas(species: EnemySpecies, frame: MobFrame, flip: boolean): HTMLCanvasElement {
  const key = `${species}:${frame}:${flip ? "l" : "r"}`;
  let canvas = canvases.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = MOB_SIZE;
    canvas.height = MOB_SIZE;
    const ctx = canvas.getContext("2d")!;
    const pixels = mobPixels(species, frame);
    for (let y = 0; y < MOB_SIZE; y++) {
      for (let x = 0; x < MOB_SIZE; x++) {
        const color = pixels[y][x];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(flip ? MOB_SIZE - 1 - x : x, y, 1, 1);
      }
    }
    canvases.set(key, canvas);
  }
  return canvas;
}
