// Redraws the floor of a painted map on the game's own tile grid.
//
// The paintings have floor slabs of their own size (about 47px), while the game moves, aims and draws in tiles of 32px, so
// a step never matched a slab. Here the floor pixels of a picture are found by colour and redrawn with slabs of exactly
// one tile, lined up with the grid. The colour and the light of the original are kept: each floor pixel takes the smoothed
// colour of the floor around it, so the torch glow and the shade along the walls stay where the artist put them. Walls,
// pillars, torches and the stairs are not touched.

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx / 255];
}

/** Deterministic noise in [0, 1) from integer coordinates. */
function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Erodes (or dilates, with `grow`) a binary mask by `r` pixels with a square window, in two passes. */
function morph(mask, w, h, r, grow) {
  const pass = (src, horizontal) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let keep = grow ? 0 : 1;
        for (let k = -r; k <= r; k++) {
          const xx = horizontal ? x + k : x, yy = horizontal ? y : y + k;
          const v = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
          if (grow ? v : !v) { keep = grow ? 1 : 0; break; }
        }
        out[y * w + x] = keep;
      }
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

/** Box blur of a float plane, repeated for a smooth falloff. */
function blur(plane, w, h, radius, passes = 3) {
  let src = plane;
  for (let p = 0; p < passes; p++) {
    for (const horizontal of [true, false]) {
      const out = new Float32Array(w * h);
      const len = horizontal ? w : h, lines = horizontal ? h : w;
      for (let line = 0; line < lines; line++) {
        const at = i => (horizontal ? line * w + i : i * w + line);
        let sum = 0;
        for (let i = -radius; i <= radius; i++) sum += src[at(Math.min(len - 1, Math.max(0, i)))];
        for (let i = 0; i < len; i++) {
          out[at(i)] = sum / (2 * radius + 1);
          sum += src[at(Math.min(len - 1, i + radius + 1))] - src[at(Math.max(0, i - radius))];
        }
      }
      src = out;
    }
  }
  return src;
}

/**
 * @param pic RGBA picture { data, width, height }
 * @param options { tile, hue: [lo, hi], value: [lo, hi], saturation, exclude: rects to leave alone, seed }
 */
export function regridFloor(pic, options = {}) {
  const { width: w, height: h } = pic;
  const tile = options.tile ?? 32;
  const [hueLo, hueHi] = options.hue ?? [50, 203];
  const [valLo, valHi] = options.value ?? [0.26, 0.74];
  const satLo = options.saturation ?? 0.25;
  const seed = options.seed ?? 7;
  const src = pic.data;

  // 1. Which pixels are floor: the floor's hue and brightness, without the thin bright rims of the stonework.
  let mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const [hue, sat, val] = hsv(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]);
    if (hue >= hueLo && hue <= hueHi && val >= valLo && val <= valHi && sat >= satLo) mask[i] = 1;
  }
  for (const r of options.exclude ?? []) {
    for (let y = Math.max(0, r.y); y < Math.min(h, r.y + r.h); y++) for (let x = Math.max(0, r.x); x < Math.min(w, r.x + r.w); x++) mask[y * w + x] = 0;
  }
  const opened = morph(morph(mask, w, h, 2, false), w, h, 2, true);
  for (let i = 0; i < w * h; i++) mask[i] = mask[i] & opened[i];

  // 2. The light of the original floor: its colour averaged over the floor around each pixel.
  const planes = [0, 1, 2].map(c => {
    const values = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) values[i] = mask[i] ? src[i * 4 + c] : 0;
    return blur(values, w, h, 9);
  });
  const weight = blur(Float32Array.from(mask), w, h, 9);

  // 3. Redraw: light x slab pattern. The pattern is computed in tile coordinates, so its lines fall on the game's grid.
  const out = Uint8ClampedArray.from(src);
  const soft = blur(Float32Array.from(mask), w, h, 1, 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const amount = soft[i];
      if (amount <= 0.02 || weight[i] < 0.02) continue;
      const tx = Math.floor(x / tile), ty = Math.floor(y / tile), u = x - tx * tile, v = y - ty * tile;
      let k = 1 + (hash(tx, ty, seed) - 0.5) * 0.12;
      k += (hash(x >> 1, y >> 1, seed + 1) - 0.5) * 0.06;
      // Grout between slabs: a dark line, a light line beside it, and a dark dot where four slabs meet.
      const edgeU = u === 0, edgeV = v === 0;
      if (edgeU || edgeV) k *= 0.7;
      else if (u === 1 || v === 1) k *= 1.06;
      if (u < 3 && v < 3) k *= 0.85;
      // A few slabs carry a short crack.
      if (hash(tx, ty, seed + 2) < 0.14) {
        const along = (u + v * 0.6 + hash(tx, ty, seed + 3) * 10) % 13;
        const cx = 6 + Math.floor(hash(tx, ty, seed + 4) * 18), cy = 6 + Math.floor(hash(tx, ty, seed + 5) * 18);
        if (Math.abs(u - cx) + Math.abs(v - cy) < 5 && along < 2) k *= 0.8;
      }
      for (let c = 0; c < 3; c++) {
        const light = planes[c][i] / weight[i];
        const painted = Math.max(0, Math.min(255, light * k));
        out[i * 4 + c] = src[i * 4 + c] * (1 - amount) + painted * amount;
      }
    }
  }
  return { ...pic, data: out };
}
