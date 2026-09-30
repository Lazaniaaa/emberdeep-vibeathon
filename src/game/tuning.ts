import { LEVEL_LIGHT } from "./levels";

/**
 * How much light (oil) the deep gives back. These are the knobs that decide whether a descent can be carried on, and they
 * are set from `npm run tuning` (docs/light-tuning.md), which plays thousands of descents with bots at different skill.
 * The game reads them through `tuning`; only the tuning run changes them, with `withTuning`.
 */
export type Tuning = {
  /** Multiplies the oil a broken prop may hold (see props.ts). */
  propOilScale: number;
  /** Chance a broken prop holds oil: with the lantern full, and with it empty. */
  propOilChance: readonly [number, number];
  /** Light from an oil jar lying on the floor. */
  oilJarLight: number;
  /** Multiplies how many oil jars a floor holds. */
  oilJarCount: number;
  /** A defeated creature may drop oil: the chance with the lantern full and with it empty, and the light it holds. */
  killDropChance: readonly [number, number];
  killDropLight: readonly [number, number];
  /** Light a new level pours into the lantern. */
  levelLight: number;
};

/** Chosen by `npm run tuning`; see docs/light-tuning.md for what each knob does to how deep a descent can get. */
export const DEFAULT_TUNING: Tuning = {
  propOilScale: 1,
  propOilChance: [0.3, 0.9],
  oilJarLight: 8,
  oilJarCount: 1,
  killDropChance: [0.35, 0.8],
  killDropLight: [5, 10],
  levelLight: LEVEL_LIGHT,
};

export const tuning: Tuning = { ...DEFAULT_TUNING };

/** Runs `fn` with some knobs changed, and puts them back afterwards. */
export function withTuning<T>(patch: Partial<Tuning>, fn: () => T): T {
  const saved = { ...tuning };
  Object.assign(tuning, patch);
  try {
    return fn();
  } finally {
    Object.assign(tuning, saved);
  }
}

/** Light gained and lost, by source. Only filled in while a tuning run is counting. */
export type LightSource = "jars" | "props" | "kills" | "levels" | "potions" | "steps" | "hits";
export const lightTally: Record<LightSource, number> = { jars: 0, props: 0, kills: 0, levels: 0, potions: 0, steps: 0, hits: 0 };
export let counting = false;

export function countLight<T>(fn: () => T): T {
  counting = true;
  try {
    return fn();
  } finally {
    counting = false;
  }
}

export function resetLightTally() {
  for (const k of Object.keys(lightTally) as LightSource[]) lightTally[k] = 0;
}

export function noteLight(source: LightSource, amount: number) {
  if (counting) lightTally[source] += amount;
}
