/** Mulberry32. The state lives in a plain object so run state stays serializable. */
export type Rng = { s: number };

export function createRng(seed: number): Rng {
  return { s: seed >>> 0 };
}

export function next(rng: Rng) {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function int(rng: Rng, min: number, max: number) {
  return min + Math.floor(next(rng) * (max - min + 1));
}

export function chance(rng: Rng, p: number) {
  return next(rng) < p;
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(next(rng) * list.length)];
}

export function weighted<K extends string>(rng: Rng, weights: Readonly<Record<K, number>>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = next(rng) * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function randomSeed() {
  return (Math.random() * 2 ** 32) >>> 0;
}
