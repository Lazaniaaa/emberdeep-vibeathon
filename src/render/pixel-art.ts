// Small shared helpers for multicolor pixel art. A sprite is rows of letters; each letter is a palette color.

export const PALETTE: Record<string, string> = {
  k: "#17102b", w: "#fbf7ff", g: "#a3a3bd", G: "#66667f", l: "#ccff00", L: "#7aa800",
  p: "#ff5fdc", P: "#a72d93", y: "#ffc21a", Y: "#c47a00", r: "#e5483d", R: "#8f2a2a",
  b: "#a8703c", B: "#5e3a1e", c: "#7cf7ff", C: "#2aa3b8", o: "#ff8a2a", v: "#8a68ff", V: "#43309a",
  n: "#f2c9a0", N: "#c48b5a", e: "#3ddc84", E: "#1f8a4c", s: "#cfd6e6", S: "#7f89a3",
};

export type Sprite = readonly string[];
export const SPRITE_SIZE = 16;

const urlCache = new Map<string, string>();

/** Renders a sprite to a data URL so it can be used in an <img>. */
export function spriteToDataUrl(rows: Sprite, px: number) {
  const id = `${px}:${rows.join("|")}`;
  const cached = urlCache.get(id);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = (rows[0]?.length ?? SPRITE_SIZE) * px;
  canvas.height = rows.length * px;
  const ctx = canvas.getContext("2d")!;
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const color = PALETTE[row[c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(c * px, r * px, px, px);
    }
  });
  const url = canvas.toDataURL();
  urlCache.set(id, url);
  return url;
}
