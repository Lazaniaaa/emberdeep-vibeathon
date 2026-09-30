import type { EnemySpecies } from "@/game/enemies";

/**
 * The creatures as pixel art drawn in code, 16 x 16 like the delver and the items, so one pixel is one pixel everywhere.
 * Each is drawn facing right from a few shapes in flat regions; `compile` then adds the outline and the light from the
 * top left. Frames: "a" stands or walks, "b" is the other half of the walk, "w" is the wind-up pose before a blow.
 */

export const MOB_SIZE = 16;
export type MobFrame = "a" | "b" | "w";
export type MobPixels = ReadonlyArray<ReadonlyArray<string | null>>;

/**
 * Regions: B body, L light body (belly, snout), D dark body (limbs, ears), S stone or steel, P skin (nose, tongue),
 * W white (claws, teeth, steel tips), A glow (embers, gems), E eyes.
 */
export type Palette = { B: string; L: string; D: string; S: string; P: string; W: string; A: string; E: string };

export class Grid {
  readonly cells: string[][] = Array.from({ length: MOB_SIZE }, () => Array<string>(MOB_SIZE).fill("."));

  px(x: number, y: number, c: string) {
    if (x >= 0 && y >= 0 && x < MOB_SIZE && y < MOB_SIZE) this.cells[y][x] = c;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }
  /** A filled ellipse around (cx, cy), measured in pixel centres. */
  ell(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0;
    for (;;) {
      this.px(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return this;
  }
}

const OUTLINE = "#0b0912";

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 255;
    return Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** Colours the regions, lights the top-left edges, darkens the bottom-right ones and draws the outline. */
export function compile(grid: Grid, palette: Palette): MobPixels {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= MOB_SIZE || y >= MOB_SIZE ? "." : grid.cells[y][x]);
  const out: (string | null)[][] = [];
  for (let y = 0; y < MOB_SIZE; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < MOB_SIZE; x++) {
      const region = at(x, y);
      if (region === ".") {
        const touches = at(x - 1, y) !== "." || at(x + 1, y) !== "." || at(x, y - 1) !== "." || at(x, y + 1) !== ".";
        row.push(touches ? OUTLINE : null);
        continue;
      }
      const base = palette[region as keyof Palette];
      const shadable = region === "B" || region === "L" || region === "D" || region === "S" || region === "P";
      if (!shadable) { row.push(base); continue; }
      const lit = at(x, y - 1) === "." || at(x - 1, y) === ".";
      const dark = at(x, y + 1) === "." || at(x + 1, y) === ".";
      row.push(lit ? shade(base, 0.22) : dark ? shade(base, -0.3) : base);
    }
    out.push(row);
  }
  return out;
}

type Draw = (f: MobFrame) => Grid;
type Def = { palette: Palette; draw: Draw };

/** Legs as short posts: `xs` are the columns, from y to the ground. */
function legs(g: Grid, xs: number[], y: number, c = "D", claw = "W") {
  for (const x of xs) { g.rect(x, y, 1, 14 - y, c); g.px(x, 14, claw); }
}

const DEFS: Record<EnemySpecies, Def> = {
  // A rat: long body, big ears, bared teeth when it gnaws.
  wickgnaw: {
    palette: { B: "#6a6178", L: "#a39aae", D: "#473f58", S: "#8a8196", P: "#e08a8a", W: "#f1e8d4", A: "#ff4a2a", E: "#ffb347" },
    draw: f => {
      const c = f === "w" ? 1 : 0;
      const g = new Grid();
      g.px(2, 10 + c, "D").px(1, 9 + c, "D").px(1, 8 + c, "D").px(2, 7 + c, "D").px(3, 7 + c, "D");
      g.ell(7.5, 9.5 + c, 5, 3, "B").ell(5, 9.5 + c, 2.4, 2.6, "D").ell(7.8, 11.2 + c, 3.2, 1.3, "L");
      g.ell(11.5, 8.5 + c, 2.8, 2.4, "B").rect(13, 8 + c, 2, 2, "B").px(14, 9 + c, "P");
      g.ell(10.4, 5.3 + c, 1.3, 1.6, "D").ell(13, 5.6 + c, 1.2, 1.5, "D").px(10, 5 + c, "P").px(13, 5 + c, "P");
      g.px(12, 8 + c, f === "w" ? "A" : "E");
      g.px(13, 10 + c, "W");
      if (f === "w") g.px(14, 10 + c, "W");
      legs(g, f === "b" ? [11, 9, 5, 3] : [10, 12, 4, 6], 12 + c);
      return g;
    },
  },
  // A toad: squat, with one huge eye and a tongue that shoots out when it strikes.
  snaretoad: {
    palette: { B: "#7d6f86", L: "#b3a5ae", D: "#4f4360", S: "#6a5a73", P: "#e0587a", W: "#eee4cf", A: "#ffb000", E: "#fff2a0" },
    draw: f => {
      const up = f === "b" ? 1 : 0;
      const c = f === "w" ? 1 : 0;
      const g = new Grid();
      g.ell(8, 10 + c - up, 5.5, 3.6, "B").ell(8.5, 12 + c - up, 4, 1.6, "L");
      g.ell(11.5, 7 + c - up, 2.2, 2, "B");
      g.rect(11, 5 + c - up, 3, 3, "A").px(12, 6 + c - up, f === "w" ? "P" : "E");
      g.line(10, 10 + c - up, 14, 10 + c - up, "D").px(14, 8 + c - up, "D");
      g.px(5, 8 + c - up, "L").px(7, 7 + c - up, "L").px(9, 8 + c - up, "L").px(4, 10 + c - up, "D").px(6, 9 + c - up, "D");
      g.ell(4.5, 11.5 + c, 2.5, 2.3, "D");
      if (f === "b") {
        g.rect(2, 13, 4, 1, "D").rect(11, 12, 3, 2, "D");
        g.px(1, 14, "W").px(14, 14, "W");
      } else {
        g.rect(2, 13, 4, 1, "D").rect(10, 12 + c, 3, 2 - c, "D");
        g.px(12, 14, "W").px(13, 14, "W");
      }
      if (f === "w") g.rect(14, 9, 2, 2, "P").px(15, 10, "P");
      return g;
    },
  },
  // A hound: lean, with ember cracks; its legs go in pairs as it runs.
  "cinder-hound": {
    palette: { B: "#3a3547", L: "#5a5470", D: "#221f2d", S: "#4a4560", P: "#ff4a2a", W: "#e8e0cf", A: "#ff7a1a", E: "#ffc04a" },
    draw: f => {
      const c = f === "w" ? 1 : 0;
      const g = new Grid();
      g.px(2, 7 + c, "B").px(1, 6 + c, "B").px(1, 5 + c, "A").px(1, 4 + c, "A");
      g.ell(6.5, 8.5 + c, 4.8, 2.4, "B").ell(10, 9 + c, 2.6, 2.6, "B");
      g.ell(11.5, 6.5 + c, 2.2, 1.9, "B").rect(13, 7 + c, 2, 2, "B").px(14, 7 + c, "D");
      g.px(10, 3 + c, "D").px(10, 4 + c, "D").px(11, 4 + c, "D").px(12, 3 + c, "D").px(12, 4 + c, "D").px(13, 4 + c, "D");
      g.px(12, 6 + c, f === "w" ? "P" : "E");
      g.px(13, 9 + c, "W");
      g.px(4, 7 + c, "A").px(5, 8 + c, "A").px(7, 7 + c, "A").px(8, 8 + c, "A").px(9, 9 + c, "A").px(9, 5 + c, "A").px(10, 6 + c, "A");
      if (f === "w") g.px(14, 9, "W").px(14, 8, "P");
      legs(g, f === "b" ? [2, 4, 10, 12] : f === "w" ? [3, 4, 10, 11] : [3, 5, 9, 11], 10 + c, "D", "L");
      return g;
    },
  },
  // A snake coiled round a stone on a chain. It never moves; its head sways and rears back when it strikes.
  // A cobra coiled round a chain-wrapped stone. It never moves; its head sways and rears back when it strikes.
  chaincoil: {
    palette: { B: "#54547a", L: "#8686ac", D: "#34345a", S: "#a8a59a", P: "#e0587a", W: "#ddd8ca", A: "#ffb02e", E: "#ffb02e" },
    draw: f => {
      const sway = f === "b" ? 1 : 0;
      const g = new Grid();
      g.ell(7.5, 12, 6.3, 2.4, "B").ell(6.5, 9.6, 4.6, 2, "B").ell(7.5, 12.7, 4.6, 1, "L").ell(6, 9.8, 3.2, 0.9, "L");
      g.px(3, 10, "S").px(4, 11, "S").px(5, 12, "S").px(10, 10, "S").px(11, 11, "S").px(12, 12, "S");
      g.px(2, 13, "D").px(13, 13, "D").px(8, 10, "D");
      if (f === "w") {
        // Reared back, hood spread, fangs out, ready to lash.
        g.rect(8, 5, 3, 5, "B").ell(9.4, 4.6, 2.7, 3, "B").ell(11.4, 2.8, 2, 1.5, "B").rect(12, 2, 3, 2, "B");
        g.px(12, 2, "A").px(13, 4, "W").px(14, 4, "W").px(9, 4, "A").px(9, 5, "A");
      } else {
        g.rect(9, 6 + sway, 3, 4 - sway, "B").ell(10.6, 5.8 + sway, 2.6, 2.8, "B").ell(12.6, 4.6 + sway, 2, 1.5, "B").rect(13, 4 + sway, 2, 2, "B");
        g.px(13, 4 + sway, "E").px(10, 5 + sway, "A").px(10, 6 + sway, "A");
        g.px(15, 5 + sway, "P").px(14, 6 + sway, "P").px(15, 7 + sway, "P");
      }
      return g;
    },
  },
  // A hooded wraith that floats, with a needle for each hand.
  "needle-wraith": {
    palette: { B: "#2f2742", L: "#4a3e66", D: "#1a1529", S: "#9aa4c0", P: "#7c5cb0", W: "#d8e0f4", A: "#b56bff", E: "#e6b8ff" },
    draw: f => {
      const up = f === "b" ? 1 : 0;
      const g = new Grid();
      const t = 5 - up;
      g.ell(8, 4 + t - 5, 2.6, 2.6, "B");
      for (let y = 0; y < 8; y++) g.rect(Math.floor(8 - 1.6 - y * 0.35), t + y, Math.ceil(3.2 + y * 0.7), 1, y > 5 ? "D" : "B");
      g.rect(7, t - 2, 3, 2, "D").px(7, t - 1, f === "w" ? "A" : "E").px(9, t - 1, f === "w" ? "A" : "E");
      g.px(6, t + 7, ".").px(9, t + 8 - 1, ".").px(11, t + 7, ".");
      g.px(5, t + 8, "A").px(8, t + 8, "A").px(10, t + 7, "A");
      if (f === "w") {
        // The needles swing forward.
        g.line(9, t + 3, 15, t + 3, "W").line(9, t + 5, 15, t + 5, "W");
        g.px(15, t + 3, "S").px(15, t + 5, "S");
      } else {
        g.line(5, t + 2, 2, 13 - up, "W").line(11, t + 2, 14, 13 - up, "W");
        g.px(2, 13 - up, "S").px(14, 13 - up, "S");
      }
      g.px(5, t + 3, "B").px(11, t + 3, "B");
      return g;
    },
  },
  // A golem of soot-black plates with lava in its cracks; it stomps.
  // A golem of soot-black plates with lava in its cracks; it stomps.
  sootplate: {
    palette: { B: "#5e5963", L: "#8a8490", D: "#3c3842", S: "#77717f", P: "#ff7a1a", W: "#e8e0cf", A: "#ff7a1a", E: "#ffc04a" },
    draw: f => {
      const raised = f === "w";
      const g = new Grid();
      // Head, neck and the big shoulder plates with a spike on each.
      g.rect(6, 1, 4, 3, "S").px(7, 2, raised ? "P" : "E").px(8, 2, raised ? "P" : "E").rect(7, 4, 2, 1, "D");
      g.rect(2, 4, 4, 3, "S").rect(10, 4, 4, 3, "S").px(2, 3, "S").px(13, 3, "S").px(3, 3, "S").px(12, 3, "S");
      // Torso with a crack of lava down the chest.
      g.rect(5, 4, 6, 7, "B").px(8, 5, "A").px(7, 6, "A").px(8, 7, "A").px(7, 8, "A").px(8, 9, "A").px(10, 6, "L").px(5, 9, "L");
      // Arms and fists; raised over the head as it winds up.
      if (raised) {
        g.rect(2, 1, 3, 6, "D").rect(11, 1, 3, 6, "D").rect(2, 0, 3, 2, "B").rect(11, 0, 3, 2, "B").px(3, 3, "A").px(12, 4, "A");
      } else {
        g.rect(2, 7, 3, 4, "D").rect(11, 7, 3, 4, "D").rect(2, 11, 3, 2, "B").rect(11, 11, 3, 2, "B").px(3, 8, "A").px(12, 9, "A");
      }
      // Legs; in the second frame one foot is lifted.
      const lift = f === "b" ? 1 : 0;
      g.rect(5, 11, 2, 3 - lift, "D").rect(9, 11, 2, 3, "D");
      g.rect(4, 14 - lift, 3, 1, "S").rect(9, 14, 3, 1, "S");
      return g;
    },
  },
  // A mole with huge claws, bursting out of a mound of dirt.
  "hollow-burrower": {
    palette: { B: "#6e5a4a", L: "#c2ac94", D: "#4a3a2c", S: "#8c6d4e", P: "#e0a0a0", W: "#f1e8d4", A: "#ff7a1a", E: "#ffc04a" },
    draw: f => {
      const b = f === "b" ? 1 : 0;
      const g = new Grid();
      g.ell(7, 9.5 - b, 4.6, 3, "B").ell(12.3, 9 - b, 2.4, 1.6, "L").px(14, 9 - b, "P");
      g.px(11, 8 - b, f === "w" ? "A" : "E");
      g.rect(9, 11 - b, 4, 2, "D").px(13, 11 - b, "W").px(14, 12 - b, "W").px(13, 13 - b, "W");
      g.rect(3, 12, 2, 1, "D");
      g.rect(2, 13, 12, 1, "S").px(1, 12, "S").px(14, 12, "S").px(3, 12 - b, "S");
      if (f === "w") g.px(10, 6, "S").px(12, 5, "S").px(6, 5, "S").px(14, 6, "S").px(8, 4, "S");
      return g;
    },
  },
  // A bronze bell with a spike on each side. It floats and tolls in four directions.
  // A bronze bell with a spike on each side. It floats and tolls in four directions.
  "fourfold-bell": {
    palette: { B: "#b48f58", L: "#e0c284", D: "#7e5f36", S: "#8c8ca8", P: "#7c5cb0", W: "#dfe4f4", A: "#b56bff", E: "#f0d0ff" },
    draw: f => {
      const t = f === "b" ? 3 : 4;
      const g = new Grid();
      // The bell flares: a narrow crown, a swelling shoulder and a wide lip.
      const widths = [4, 6, 8, 8, 8, 10, 10];
      widths.forEach((w, i) => g.rect(8 - w / 2, t + 1 + i, w, 1, i === widths.length - 1 ? "D" : "B"));
      g.rect(7, t, 2, 1, "S");
      g.px(5, t + 2, "L").px(4, t + 3, "L").px(4, t + 4, "L").px(4, t + 5, "L").px(3, t + 6, "L");
      g.rect(7, t + 3, 2, 2, f === "w" ? "E" : "A");
      g.rect(7, t + 8, 2, 1, "D");
      // Four spikes: up, down, left and right.
      g.line(8, t - 1, 8, 1, "S").px(8, 0, "W");
      g.px(8, t + 9, "S").px(8, t + 10, "S").px(8, t + 11, "W");
      g.line(3, t + 4, 1, t + 4, "S").px(0, t + 4, "W");
      g.line(12, t + 4, 14, t + 4, "S").px(15, t + 4, "W");
      if (f === "w") g.px(3, t - 1, "W").px(12, t - 1, "W").px(3, t + 9, "W").px(12, t + 9, "W").px(1, t + 1, "W").px(14, t + 1, "W").px(1, t + 7, "W").px(14, t + 7, "W");
      return g;
    },
  },
  // A long violet lizard that leaps out of the rift: spines, a whip tail, claws.
  "rift-leaper": {
    palette: { B: "#62468a", L: "#9679c2", D: "#3e2a5c", S: "#2c2040", P: "#e0587a", W: "#ece4f6", A: "#c690ff", E: "#ffd23f" },
    draw: f => {
      const lift = f === "b" ? 2 : 0;
      const c = f === "w" ? 1 : 0;
      const g = new Grid();
      g.line(4, 9 + c - lift, 2, 11 + c - lift, "B").line(2, 11 + c - lift, 1, 13, "B").px(2, 14, "B").px(1, 13, "A");
      g.ell(7.5, 9 + c - lift, 4.5, 2, "B").ell(12, 7.6 + c - lift, 2, 1.6, "B").px(14, 8 + c - lift, "B");
      g.px(12, 7 + c - lift, f === "w" ? "P" : "E").px(13, 9 + c - lift, "W").px(14, 9 + c - lift, "W");
      g.px(5, 6 + c - lift, "S").px(7, 6 + c - lift, "S").px(9, 6 + c - lift, "S").px(11, 5 + c - lift, "S");
      g.px(6, 8 + c - lift, "A").px(8, 8 + c - lift, "A").px(10, 8 + c - lift, "A");
      g.ell(7.5, 10.4 + c - lift, 3, 0.9, "L");
      if (f === "b") {
        g.line(5, 11 - lift, 2, 13, "D").line(11, 11 - lift, 14, 13, "D");
        g.px(2, 14, "W").px(14, 14, "W");
      } else {
        g.line(5, 11 + c, 4, 13, "D").line(10, 11 + c, 11, 13, "D");
        g.rect(3, 14, 3, 1, "W").rect(10, 14, 3, 1, "W");
      }
      return g;
    },
  },
};

const cache = new Map<string, MobPixels>();

/** The 16 x 16 pixels of a creature in a frame, facing right; null is transparent. */
export function mobPixels(species: EnemySpecies, frame: MobFrame): MobPixels {
  const key = `${species}:${frame}`;
  let hit = cache.get(key);
  if (!hit) {
    const def = DEFS[species];
    hit = compile(def.draw(frame), def.palette);
    cache.set(key, hit);
  }
  return hit;
}
