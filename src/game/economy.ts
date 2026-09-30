import {
  BURN_SHARE, EXPEDITION_BURN, EXPEDITION_LOT, LOCK_SHARE, POOL_SHARE, RAFFLE_SHARE, RARITY_SUPPLY, SIGIL_RARITY_WEIGHTS, WORLD_MINT_SEED,
} from "./config";
import { CLASS_IDS, type HeroNft, type Rarity } from "./catalog";
import { createRng, pick, randomSeed, weighted } from "./rng";

export type Ledger = {
  rf: number;
  /** The gold-share round pool that descents compete for. */
  pool: number;
  /** The lock pool, shared by passive gold when the round closes. */
  locked: number;
  /** RF waiting to buy the weekly Friend lot. */
  raffle: number;
  burned: number;
  spent: number;
  returned: number;
};

export type LedgerEntry = {
  at: number;
  kind: "spend" | "payout" | "faucet";
  label: string;
  amount: number;
  burned: number;
  pooled: number;
  raffle: number;
  /** Saves from before locks have no lock pool. */
  locked?: number;
};

/**
 * Every RF spent is split the same way: burned, the weekly Friend lot, the lock pool and the round pool.
 * The last two together are POOL_SHARE, the part that goes back to players.
 */
export function splitSpend(amount: number) {
  const burned = round(amount * BURN_SHARE);
  const raffle = round(amount * RAFFLE_SHARE);
  const locked = round(amount * LOCK_SHARE);
  return { burned, raffle, locked, pooled: round(amount - burned - raffle - locked) };
}

/** Expeditions split their price their own way: mostly burned, the rest to the round pool and the Friend lot. */
export function splitExpeditionSpend(amount: number) {
  const burned = round(amount * EXPEDITION_BURN);
  const raffle = round(amount * EXPEDITION_LOT);
  return { burned, raffle, locked: 0, pooled: round(amount - burned - raffle) };
}

export function applySpend(ledger: Ledger, amount: number, split = splitSpend(amount)): Ledger {
  if (amount > ledger.rf + 1e-9) throw new Error("Not enough RF");
  const { burned, pooled, raffle, locked } = split;
  return {
    rf: round(ledger.rf - amount),
    pool: round(ledger.pool + pooled),
    locked: round(ledger.locked + locked),
    raffle: round(ledger.raffle + raffle),
    burned: round(ledger.burned + burned),
    spent: round(ledger.spent + amount),
    returned: ledger.returned,
  };
}

/** Books RF that leaves the game for good, such as the fee for breaking a lock early. Nothing is split; the caller moves the balance. */
export function applyBurn(ledger: Ledger, amount: number): Ledger {
  return { ...ledger, burned: round(ledger.burned + amount), spent: round(ledger.spent + amount) };
}

/** Your fraction of this round's banked gold. It is the fraction of the pool you receive. */
export function roundShare(yourGold: number, fieldGold: number) {
  const total = yourGold + fieldGold;
  return total > 0 ? yourGold / total : 0;
}

export type RoundSettlement = {
  /** Fraction of the round's gold that was yours. */
  share: number;
  payout: number;
  /** The simulated crowd's cut of the pool. */
  fieldPayout: number;
  /** What the return cap held back from your share. It stays in the pool. */
  withheld: number;
  /** Pool left for the next round: cents of dust, anything the cap held back, or all of it if nobody banked gold. */
  carry: number;
};

/**
 * Splits the pool exactly by gold. Every share is rounded down to the cent, so the players together
 * never receive more than the pool holds, and a 1% share of the gold takes 1% of the pool.
 * `cap` is the most your share may pay out (see MAX_ROUND_RETURN); the rest stays in the pool.
 */
export function settleRound(pool: number, yourGold: number, fieldGold: number, cap = Infinity): RoundSettlement {
  const total = yourGold + fieldGold;
  if (total <= 0 || pool <= 0) return { share: 0, payout: 0, fieldPayout: 0, withheld: 0, carry: round(Math.max(0, pool)) };
  const down = (n: number) => Math.floor((n + 1e-9) * 100) / 100;
  const owed = down(pool * yourGold / total);
  const payout = Math.min(owed, down(Math.max(0, cap)));
  const fieldPayout = down(pool * (total - yourGold) / total);
  // Both shares round down to the cent, so a stray cent of dust can remain. It stays in the pool for the next round.
  return { share: yourGold / total, payout, fieldPayout, withheld: round(owed - payout), carry: round(pool - payout - fieldPayout) };
}

export function applyClaim(ledger: Ledger, settlement: RoundSettlement): Ledger {
  return {
    ...ledger,
    rf: round(ledger.rf + settlement.payout),
    pool: round(settlement.carry),
    returned: round(ledger.returned + settlement.payout),
  };
}

export function mintHero(rarity: Rarity, serial: number, source: HeroNft["source"], seed = randomSeed(), edition?: number): HeroNft {
  const rng = createRng(seed);
  return {
    id: `${Date.now().toString(36)}-${seed.toString(36)}`,
    serial,
    classId: pick(rng, CLASS_IDS),
    rarity,
    source,
    mintedAt: Date.now(),
    edition,
  };
}

/** Rolls a Soul Sigil's rarity. Sold-out rarities are skipped, so a sigil never mints past the cap. */
export function rollSigilRarity(seed = randomSeed(), available: readonly Rarity[] = Object.keys(SIGIL_RARITY_WEIGHTS) as Rarity[]): Rarity {
  const weights = Object.fromEntries(available.map(r => [r, SIGIL_RARITY_WEIGHTS[r]])) as Record<Rarity, number>;
  if (available.length === 0) throw new Error("Every Delver has been minted");
  return weighted(createRng(seed), weights);
}

/** Delvers of this rarity still left to mint, counting the simulated community's share. */
export function mintsLeft(rarity: Rarity, mintedByYou: number) {
  return Math.max(0, RARITY_SUPPLY[rarity] - WORLD_MINT_SEED[rarity] - mintedByYou);
}

export { POOL_SHARE, BURN_SHARE };

function round(n: number) {
  return Math.round(n * 100) / 100;
}
