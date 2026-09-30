// Touch-ups to the painted floors, applied by optimize-maps.mjs after the pictures are fitted to their game canvas.
//
// The walkable area is traced in whole 32px tiles, but the paintings have their own stonework, so some passages are
// narrower than the two tiles the game lets the delver use, and he ends up standing on a wall. These patches widen
// those passages in the picture: a wall or a pillar cap is copied to its new place and the gap it leaves is filled with
// the passage's own floor texture, mirrored so that nothing repeats in a row. Nothing is stretched.
//
// All coordinates are in canvas pixels (34 x 22 tiles of 32px for floors 1-3).

import { regridFloor } from "./floor-regrid.mjs";

/** An RGBA picture: `data` holds width * height * 4 bytes. */
export function makePicture(data, width, height) {
  return { data, width, height };
}

const at = (pic, x, y) => (y * pic.width + x) * 4;

/** Copies a rectangle of `from` to `dx, dy` away, overwriting what is there. */
function copyRect(from, to, rect, dx, dy) {
  for (let j = 0; j < rect.h; j++) {
    for (let i = 0; i < rect.w; i++) {
      const s = at(from, rect.x + i, rect.y + j), d = at(to, rect.x + i + dx, rect.y + j + dy);
      to.data[d] = from.data[s]; to.data[d + 1] = from.data[s + 1]; to.data[d + 2] = from.data[s + 2]; to.data[d + 3] = from.data[s + 3];
    }
  }
}

/** 0, 1, .. n-1, n-2, .. 1, 0, 1 ..: the position in a run that bounces between the ends. */
function bounce(i, n) {
  if (n <= 1) return 0;
  const period = 2 * (n - 1), p = i % period;
  return p < n ? p : period - p;
}

/** Fills a rectangle column by column from pixels of the same row: `source(i)` gives the column for the i-th column. */
function fillAcross(from, to, rect, source) {
  for (let j = 0; j < rect.h; j++) {
    for (let i = 0; i < rect.w; i++) {
      const s = at(from, source(i), rect.y + j), d = at(to, rect.x + i, rect.y + j);
      to.data[d] = from.data[s]; to.data[d + 1] = from.data[s + 1]; to.data[d + 2] = from.data[s + 2]; to.data[d + 3] = from.data[s + 3];
    }
  }
}

/** Fills a rectangle row by row from pixels of the same column: `source(j)` gives the row for the j-th row. */
function fillDown(from, to, rect, source) {
  for (let j = 0; j < rect.h; j++) {
    for (let i = 0; i < rect.w; i++) {
      const s = at(from, rect.x + i, source(j)), d = at(to, rect.x + i, rect.y + j);
      to.data[d] = from.data[s]; to.data[d + 1] = from.data[s + 1]; to.data[d + 2] = from.data[s + 2]; to.data[d + 3] = from.data[s + 3];
    }
  }
}

/** Darkens a band of rows, strongest at the first row and fading out, like the shadow a wall casts on the floor. */
function shadowRows(pic, rect, strength) {
  for (let j = 0; j < rect.h; j++) {
    const k = 1 - strength * (1 - j / rect.h);
    for (let i = 0; i < rect.w; i++) {
      const o = at(pic, rect.x + i, rect.y + j);
      pic.data[o] = Math.round(pic.data[o] * k); pic.data[o + 1] = Math.round(pic.data[o + 1] * k); pic.data[o + 2] = Math.round(pic.data[o + 2] * k);
    }
  }
}

const PATCHES = {
  2: (src, out) => {
    // The passage south from the middle room: its floor is 34px wide and the game lets the delver use 64px. The right-hand
    // wall, the pillar cap that joins it to the room's wall and the wall that meets the lower room all move 27px to the right.
    const SHIFT = 27;
    copyRect(src, out, { x: 584, y: 388, w: 26, h: 96 }, SHIFT, 0);
    fillAcross(src, out, { x: 582, y: 388, w: SHIFT + 2, h: 96 }, i => 577 - bounce(i, 25));
    // The lower end is a niche in the wall with a torch in it; the niche is widened with its own dark stone.
    copyRect(src, out, { x: 584, y: 484, w: 26, h: 36 }, SHIFT, 0);
    fillAcross(src, out, { x: 578, y: 484, w: 33, h: 34 }, i => 552 + bounce(i, 4));

    // The passage between the left and middle rooms: the game's rows 8 and 9 are y 256-320, but the floor shows only
    // y 276-313 because the north wall has a tall brick face. The face is cut back to a lip, and the south wall and the
    // caps of the two pillars move down 7px, so the floor is the whole 64px.
    fillDown(src, out, { x: 346, y: 257, w: 119, h: 25 }, j => 282 + bounce(24 - j, 24));
    copyRect(src, out, { x: 346, y: 310, w: 119, h: 38 }, 0, 7);
    copyRect(src, out, { x: 318, y: 303, w: 28, h: 35 }, 0, 7);
    copyRect(src, out, { x: 465, y: 303, w: 28, h: 35 }, 0, 7);
    fillDown(src, out, { x: 346, y: 310, w: 119, h: 10 }, j => 309 - bounce(j, 12));
    fillDown(src, out, { x: 318, y: 303, w: 28, h: 10 }, j => 302 - bounce(j, 8));
    fillDown(src, out, { x: 465, y: 303, w: 28, h: 10 }, j => 302 - bounce(j, 8));
    shadowRows(out, { x: 346, y: 257, w: 119, h: 7 }, 0.3);

    // The passage between the middle and right rooms (rows 9 and 10, y 288-352): same treatment, 12px lower at the south.
    fillDown(src, out, { x: 679, y: 284, w: 89, h: 19 }, j => 303 + bounce(18 - j, 26));
    copyRect(src, out, { x: 679, y: 337, w: 89, h: 39 }, 0, 12);
    copyRect(src, out, { x: 650, y: 330, w: 29, h: 29 }, 0, 12);
    copyRect(src, out, { x: 768, y: 330, w: 26, h: 29 }, 0, 12);
    fillDown(src, out, { x: 679, y: 337, w: 89, h: 15 }, j => 336 - bounce(j, 20));
    fillDown(src, out, { x: 650, y: 330, w: 29, h: 15 }, j => 329 - bounce(j, 9));
    fillDown(src, out, { x: 768, y: 330, w: 26, h: 15 }, j => 329 - bounce(j, 9));
    shadowRows(out, { x: 679, y: 284, w: 89, h: 7 }, 0.3);
  },
};

/** Floors whose slabs are redrawn on the game's 32px grid (see floor-regrid.mjs), with the pictures' parts to leave alone. */
const REGRID = {
  // The rune circle and the stairs are pictures of their own and are left as painted.
  1: { exclude: [{ x: 140, y: 300, w: 70, h: 76 }, { x: 805, y: 290, w: 90, h: 100 }] },
  2: { exclude: [{ x: 850, y: 236, w: 120, h: 156 }] },
  3: { exclude: [{ x: 795, y: 160, w: 130, h: 150 }] },
  // Floors 4-7 have other palettes: the colours below are the floors' own hue, saturation and brightness.
  4: { exclude: [{ x: 668, y: 228, w: 110, h: 110 }] },
  5: { hue: [200, 222], saturation: 0.3, value: [0.22, 0.4], exclude: [{ x: 670, y: 230, w: 110, h: 110 }] },
  6: { hue: [196, 216], saturation: 0.3, value: [0.25, 0.42], exclude: [{ x: 395, y: 230, w: 80, h: 90 }, { x: 710, y: 230, w: 90, h: 90 }] },
  7: { hue: [198, 216], saturation: 0.6, value: [0.3, 0.56], exclude: [{ x: 340, y: 155, w: 185, h: 195 }] },
};

export const hasPatch = depth => depth in PATCHES || depth in REGRID;

/** Applies the touch-ups for a floor to its picture (a canvas-sized RGBA buffer). Returns a new picture. */
export function patchFloor(depth, pic) {
  let result = pic;
  const patch = PATCHES[depth];
  if (patch) {
    const src = { ...pic, data: Uint8ClampedArray.from(pic.data) };
    const out = { ...pic, data: Uint8ClampedArray.from(pic.data) };
    patch(src, out);
    result = out;
  }
  if (REGRID[depth]) result = regridFloor(result, REGRID[depth]);
  return result;
}
