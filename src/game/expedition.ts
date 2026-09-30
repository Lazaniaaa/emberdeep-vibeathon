import {
  EXPEDITION_BASE_LOOT, EXPEDITION_PACKS, EXPEDITION_TIERS, type ExpeditionTierId, type PackId,
} from "./config";
import { createRng, next, type Rng } from "./rng";

/** What a trip brings home. Gold joins the round like gold from a descent; keys and tickets go to your stock. */
export type Loot = { keys: number; tickets: number; gold: number };

export const NO_LOOT: Loot = { keys: 0, tickets: 0, gold: 0 };

export type Outcome = {
  /** False means the Delver came back empty-handed. It is never lost. */
  success: boolean;
  tier: ExpeditionTierId | null;
  /** How many average hauls came home. 0 when the trip failed. */
  multiplier: number;
  loot: Loot;
};

const TIER_TOTAL = EXPEDITION_TIERS.reduce((n, t) => n + t.weight, 0);

/** Rounds a fractional count up or down at random so the average stays exact (1.4 keys is 1 or 2, more often 1). */
function stochastic(rng: Rng, x: number) {
  return Math.floor(x + next(rng));
}

function pickTier(rng: Rng) {
  let roll = next(rng) * TIER_TOTAL;
  for (const t of EXPEDITION_TIERS) {
    roll -= t.weight;
    if (roll < 0) return t;
  }
  return EXPEDITION_TIERS[EXPEDITION_TIERS.length - 1];
}

/**
 * Decides a whole trip from a seed and the pack: whether the Delver comes back with a haul, and how big it
 * is. It is made when the Delver leaves and stored, so nobody can re-roll it by reloading.
 */
export function rollExpedition(seed: number, pack: PackId): Outcome {
  const rng = createRng(seed);
  if (next(rng) >= EXPEDITION_PACKS[pack].chance) return { success: false, tier: null, multiplier: 0, loot: NO_LOOT };
  const tier = pickTier(rng);
  const multiplier = Math.round((tier.min + next(rng) * (tier.max - tier.min)) * 100) / 100;
  return {
    success: true,
    tier: tier.id,
    multiplier,
    loot: {
      keys: stochastic(rng, multiplier * EXPEDITION_BASE_LOOT.keys),
      tickets: stochastic(rng, multiplier * EXPEDITION_BASE_LOOT.tickets),
      gold: Math.round(multiplier * EXPEDITION_BASE_LOOT.gold),
    },
  };
}

/** The average multiplier of a successful trip. */
export function meanMultiplier() {
  return EXPEDITION_TIERS.reduce((n, t) => n + (t.weight / TIER_TOTAL) * (t.min + t.max) / 2, 0);
}

/** The average haul of one trip with this pack, failures included. */
export function expectedLoot(pack: PackId): Loot {
  const k = EXPEDITION_PACKS[pack].chance * meanMultiplier();
  return { keys: k * EXPEDITION_BASE_LOOT.keys, tickets: k * EXPEDITION_BASE_LOOT.tickets, gold: k * EXPEDITION_BASE_LOOT.gold };
}

/** Chance that one trip with this pack comes home with at least `x` average hauls. */
export function chanceAtLeast(pack: PackId, x: number) {
  const share = EXPEDITION_TIERS.reduce((n, t) => {
    const within = Math.min(1, Math.max(0, (t.max - x) / (t.max - t.min)));
    return n + (t.weight / TIER_TOTAL) * within;
  }, 0);
  return EXPEDITION_PACKS[pack].chance * share;
}

/** Whether a Delver away since `sentAt` may come home at `now`. */
export const hasReturned = (returnsAt: number, now: number) => now >= returnsAt;

/** Whole seconds left before a Delver returns. Zero once it is back. */
export const secondsLeft = (returnsAt: number, now: number) => Math.max(0, Math.ceil((returnsAt - now) / 1000));
