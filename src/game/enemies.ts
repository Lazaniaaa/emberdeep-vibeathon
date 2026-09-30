import type { Rng } from "./rng";
import { next } from "./rng";

/**
 * How a creature hits. A creature never strikes without warning: it first winds up, and the tiles it is about to hit are
 * marked for the delver to step off.
 * - cross: the four directions around it, up to `range` tiles each.
 * - line: one direction, aimed at the delver when the wind-up starts, up to `range` tiles.
 */
export type EnemyAttack = "line" | "cross";

export type EnemyDef = {
  id: string;
  name: string;
  /** First floor it appears on. */
  minDepth: number;
  /** Relative odds among the creatures that can appear on a floor. */
  weight: number;
  attack: EnemyAttack;
  range: number;
  /** Turns between the warning and the blow. One means the delver gets a single move to step aside. */
  windup: number;
  /** Multiplier on the floor's creature health. */
  hp: number;
  /** Multiplier on how eagerly it closes in. Zero means it never moves. */
  move: number;
  blurb: string;
};

export const ENEMIES = [
  { id: "wickgnaw", name: "Wickgnaw", minDepth: 1, weight: 5, attack: "cross", range: 1, windup: 1, hp: 1, move: 1, blurb: "Gnaws at the wick of your lantern. Bites whatever stands beside it." },
  { id: "snaretoad", name: "Snaretoad", minDepth: 1, weight: 3, attack: "line", range: 3, windup: 2, hp: 1.3, move: 0.6, blurb: "Slow, but its tongue reaches three tiles down a line." },
  { id: "cinder-hound", name: "Cinder Hound", minDepth: 2, weight: 3, attack: "line", range: 3, windup: 1, hp: 1, move: 1.5, blurb: "Fast. Lunges down a line the moment it has you in sight." },
  { id: "chaincoil", name: "Chaincoil", minDepth: 2, weight: 2, attack: "line", range: 4, windup: 1, hp: 0.9, move: 0, blurb: "Never moves, but its chain reaches four tiles along a line." },
  { id: "needle-wraith", name: "Needle Wraith", minDepth: 3, weight: 2, attack: "line", range: 3, windup: 1, hp: 0.8, move: 1.2, blurb: "Frail and quick. Throws a needle down a line." },
  { id: "sootplate", name: "Sootplate", minDepth: 3, weight: 2, attack: "cross", range: 1, windup: 2, hp: 1.7, move: 0.7, blurb: "Armoured and slow. Winds up for two turns, then hits hard all around." },
  { id: "hollow-burrower", name: "Hollow Burrower", minDepth: 4, weight: 2, attack: "cross", range: 1, windup: 1, hp: 1.3, move: 1, blurb: "Bursts out of the floor beside you." },
  { id: "fourfold-bell", name: "Fourfold Bell", minDepth: 5, weight: 2, attack: "cross", range: 2, windup: 1, hp: 1.2, move: 0.8, blurb: "Tolls in four directions, two tiles each." },
  { id: "rift-leaper", name: "Rift Leaper", minDepth: 5, weight: 2, attack: "line", range: 3, windup: 1, hp: 1, move: 1.5, blurb: "Leaps out of the rift along a line. Very fast." },
] as const satisfies readonly EnemyDef[];

export type EnemySpecies = typeof ENEMIES[number]["id"];

/** The creature a saved descent from before species existed is treated as. */
export const DEFAULT_SPECIES: EnemySpecies = "wickgnaw";

export const isSpecies = (value: unknown): value is EnemySpecies => ENEMIES.some(e => e.id === value);

export function enemyDef(species: EnemySpecies | undefined): EnemyDef {
  return ENEMIES.find(e => e.id === (species ?? DEFAULT_SPECIES)) ?? ENEMIES[0];
}

export const enemyName = (species: EnemySpecies | undefined) => enemyDef(species).name;

export function enemiesAvailableAt(depth: number) {
  return ENEMIES.filter(e => e.minDepth <= depth);
}

/** Picks a creature for a floor, more often the common ones. */
export function pickEnemy(rng: Rng, depth: number): EnemySpecies {
  const pool = enemiesAvailableAt(depth);
  let roll = next(rng) * pool.reduce((n, e) => n + e.weight, 0);
  for (const e of pool) {
    roll -= e.weight;
    if (roll < 0) return e.id;
  }
  return pool[pool.length - 1].id;
}
