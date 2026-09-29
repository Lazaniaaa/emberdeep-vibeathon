import type { ClassId } from "@/game/catalog";

export type Mask = readonly string[];

const HEADS: Record<ClassId | "wanderer", Mask> = {
  wanderer: [
    "................",
    "......####......",
    ".....######.....",
    "....##....##....",
  ],
  prospector: [
    ".......##.......",
    ".....######.....",
    "...##########...",
    "....#......#....",
  ],
  seer: [
    ".......#........",
    "......###.......",
    ".....#####......",
    "...#########....",
  ],
  lamplighter: [
    "....#.....#.....",
    ".....######.....",
    ".....######.....",
    "....#......#....",
  ],
  pathfinder: [
    "................",
    ".....######.....",
    "....########....",
    "....#......###..",
  ],
  duelist: [
    "....##....##....",
    "....########....",
    ".....######.....",
    "....#......#....",
  ],
  scavenger: [
    "......#..#......",
    ".....######.....",
    "....#.####.#....",
    "....#......#....",
  ],
};

const BODY: Mask = [
  "....#.#..#.#....",
  "....#......#....",
  ".....######.....",
  "....########....",
  "...##########...",
  "..#.########.#..",
  "..#.########.##.",
  "....########.##.",
  "....###..###....",
];

const LEGS_A: Mask = ["....##....##....", "....##....##....", "................"];
const LEGS_B: Mask = ["....##.....##...", "...##.....##....", "................"];

export function heroMask(kind: ClassId | "wanderer", walkFrame: number): Mask {
  return [...HEADS[kind], ...BODY, ...(walkFrame % 2 ? LEGS_B : LEGS_A)];
}

export const DIMLING: readonly Mask[] = [
  [
    "................",
    "................",
    "......####......",
    "....########....",
    "...##########...",
    "..###..##..###..",
    "..###..##..###..",
    "..############..",
    "..############..",
    "...##########...",
    "...#.##..##.#...",
    "..#..#....#..#..",
    ".#...#....#...#.",
    "................",
    "................",
    "................",
  ],
  [
    "................",
    "................",
    "................",
    "......####......",
    "....########....",
    "...###.##.###...",
    "..####.##.####..",
    "..############..",
    "..############..",
    "...##########...",
    "..#.##....##.#..",
    ".#...#....#...#.",
    "#....#....#....#",
    "................",
    "................",
    "................",
  ],
];

export const ICONS: Record<"gold" | "crystal" | "oil" | "chest" | "vault" | "stairs" | "rift", Mask> = {
  gold: [
    "........",
    "...##...",
    "..#..#..",
    ".##..##.",
    ".######.",
    "#.####.#",
    "########",
    "........",
  ],
  crystal: [
    "...##...",
    "..####..",
    ".##.###.",
    ".######.",
    ".###.##.",
    "..####..",
    "...##...",
    "........",
  ],
  oil: [
    "...##...",
    "...##...",
    "..####..",
    ".#....#.",
    ".######.",
    ".######.",
    "..####..",
    "........",
  ],
  chest: [
    "........",
    ".######.",
    "#......#",
    "########",
    "#..##..#",
    "#......#",
    "########",
    "........",
  ],
  vault: [
    "..####..",
    ".#....#.",
    ".#....#.",
    "########",
    "#.#..#.#",
    "#..##..#",
    "#.#..#.#",
    "########",
  ],
  stairs: [
    "......##",
    "......##",
    "....####",
    "....####",
    "..######",
    "..######",
    "########",
    "########",
  ],
  rift: [
    "..####..",
    ".#....#.",
    "#..##..#",
    "#.#..#.#",
    "#.#..#.#",
    "#..##..#",
    ".#....#.",
    "..####..",
  ],
};

export function drawMask(
  ctx: CanvasRenderingContext2D, mask: Mask, x: number, y: number, px: number, color: string,
  flip = false, halo?: string,
) {
  const w = mask[0].length;
  if (halo) {
    ctx.fillStyle = halo;
    for (let r = 0; r < mask.length; r++) for (let c = 0; c < w; c++) {
      if (mask[r][c] !== "#") continue;
      const cx = flip ? w - 1 - c : c;
      ctx.fillRect(x + (cx - 1) * px, y + r * px, px * 3, px);
      ctx.fillRect(x + cx * px, y + (r - 1) * px, px, px * 3);
    }
  }
  ctx.fillStyle = color;
  for (let r = 0; r < mask.length; r++) for (let c = 0; c < w; c++) {
    if (mask[r][c] !== "#") continue;
    const cx = flip ? w - 1 - c : c;
    ctx.fillRect(x + cx * px, y + r * px, px, px);
  }
}

/** Render a mask to a data URL for use in regular DOM (cards, badges). */
export function maskToDataUrl(mask: Mask, px: number, color: string, halo?: string) {
  const canvas = document.createElement("canvas");
  const pad = halo ? 1 : 0;
  canvas.width = (mask[0].length + pad * 2) * px;
  canvas.height = (mask.length + pad * 2) * px;
  const ctx = canvas.getContext("2d")!;
  drawMask(ctx, mask, pad * px, pad * px, px, color, false, halo);
  return canvas.toDataURL();
}
