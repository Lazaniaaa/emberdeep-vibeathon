import {
  EXIT_BURN, EXIT_FORFEIT, FRIEND_ASK_RF, HOLD_FACTOR, LOCK_GOLD_PER_RF, LOCK_MAX, LOCK_START, LOCK_STEP, LOCK_TICKET_DUST,
  LOCK_TICKET_LOCKS, MATURITY_ROUNDS, STAKE_GOLD_CAP, STAKE_GOLD_PER_STEP, STAKE_MAX, STAKE_STEP,
} from "./config";
import { RARITY_INFO, type HeroNft } from "./catalog";

/**
 * Locks. Simulated: nothing is escrowed. A lock commits a Delver, your wallet's Rare Friend or some RF, and it
 * ages by closed rounds. A lock does two things: it makes perks stronger (see `strength`), and it farms a share
 * of the lock pool (7% of every RF spent), split by passive gold. That pool is separate from the gold-share pool
 * the descents compete for, so no lock can take anything from a delver who plays.
 */
export type LockKind = "hero" | "friend" | "stake";

export type Lock = {
  key: string;
  kind: LockKind;
  /** Round the lock was opened in (for a stake, the weighted average of its deposits). */
  since: number;
  /** RF the lock is worth: a stake's RF, a Delver's mint price, a Friend's floor ask. Sets its weight and exit fee. */
  value: number;
  /** RF farmed from the lock pool and not yet paid out. Paid on release, or harvested once mature. */
  farmed: number;
  /** Part of a raffle ticket farmed so far. NFT locks only. */
  dust: number;
};

export const FRIEND_LOCK_KEY = "friend";
export const STAKE_LOCK_KEY = "stake";
export const heroLockKey = (id: string) => `hero:${id}`;
export const FRIEND_LOCK_VALUE = FRIEND_ASK_RF;
export const heroLockValue = (hero: HeroNft) => RARITY_INFO[hero.rarity].price;

const cents = (n: number) => Math.round(n * 100) / 100;
const down = (n: number) => Math.floor((n + 1e-9) * 100) / 100;

/** Closed rounds since the lock opened. */
export function tenure(lock: Lock, round: number) {
  return Math.max(0, round - lock.since);
}

export function isMature(lock: Lock, round: number) {
  return tenure(lock, round) >= MATURITY_ROUNDS;
}

/** Strength of a lock after `rounds` closed rounds: LOCK_START, +LOCK_STEP a round, up to LOCK_MAX. */
export function lockFactor(rounds: number) {
  return Math.min(LOCK_MAX, cents(LOCK_START + LOCK_STEP * Math.max(0, rounds)));
}

/** How strong the perks of a thing are: the lock's strength if it is locked, HOLD_FACTOR if you only hold it. */
export function strength(lock: Lock | undefined, round: number) {
  return lock ? lockFactor(tenure(lock, round)) : HOLD_FACTOR;
}

/** Gold bonus from staked RF. Only a stake has one. */
export function stakeGoldPct(lock: Lock | undefined, round: number) {
  if (!lock || lock.kind !== "stake") return 0;
  const base = Math.min(STAKE_GOLD_CAP, (lock.value / STAKE_STEP) * STAKE_GOLD_PER_STEP);
  return Math.round(base * lockFactor(tenure(lock, round)));
}

/** Passive gold a lock farms in the round that is closing. It decides the lock's share of the lock pool. */
export function passiveGold(lock: Lock, round: number) {
  return lock.value * LOCK_GOLD_PER_RF * lockFactor(tenure(lock, round));
}

export type LockSettlement = {
  /** The locks after the round: farmed RF and ticket dust added. */
  locks: Lock[];
  /** RF each participating lock farmed this round, by key. */
  payouts: Record<string, number>;
  /** Passive gold of your locks this round, and how much of the pool they take. */
  yourGold: number;
  share: number;
  /** The simulated crowd's cut of the lock pool. */
  fieldPayout: number;
  /** Dust left in the pool for the next round. */
  carry: number;
  /** Whole raffle tickets your NFT locks farmed. */
  tickets: number;
};

/**
 * Shares the lock pool among passive gold, exactly like the round pool is shared among descent gold: every cut
 * rounds down to the cent, so together they never exceed the pool. `active` says which locks farm this round
 * (a Friend lock pauses while the wallet does not hold a Friend).
 */
export function settleLocks(
  locks: readonly Lock[], round: number, pot: number, fieldGold: number, active: (lock: Lock) => boolean = () => true,
): LockSettlement {
  const farming = locks.filter(active);
  const golds = new Map(farming.map(l => [l.key, passiveGold(l, round)]));
  const yourGold = [...golds.values()].reduce((a, b) => a + b, 0);
  const total = yourGold + fieldGold;
  const payouts: Record<string, number> = Object.fromEntries(farming.map(l => [l.key, 0]));
  let paid = 0;
  let fieldPayout = 0;
  if (total > 0 && pot > 0) {
    for (const l of farming) {
      payouts[l.key] = down(pot * (golds.get(l.key) ?? 0) / total);
      paid += payouts[l.key];
    }
    fieldPayout = down(pot * fieldGold / total);
  }
  const carry = cents(Math.max(0, pot - paid - fieldPayout));

  // Only the first few NFT locks earn ticket dust, so a big collection cannot bury the players who descend.
  const counted = new Set(
    farming.filter(l => l.kind !== "stake").sort((a, b) => a.since - b.since || a.key.localeCompare(b.key))
      .slice(0, LOCK_TICKET_LOCKS).map(l => l.key),
  );
  let tickets = 0;
  const updated = locks.map(l => {
    if (!golds.has(l.key)) return l;
    let dust = l.dust;
    if (counted.has(l.key)) {
      dust += LOCK_TICKET_DUST;
      if (dust >= 1 - 1e-9) { tickets++; dust = Math.max(0, dust - 1); }
    }
    return { ...l, farmed: cents(l.farmed + payouts[l.key]), dust };
  });
  return { locks: updated, payouts, yourGold, share: total > 0 ? yourGold / total : 0, fieldPayout, carry, tickets };
}

export type ExitTerms = {
  /** Before maturity: the lock is broken and pays for it. */
  early: boolean;
  /** RF burned for leaving early. */
  fee: number;
  /** Farmed RF given up, which returns to the lock pool. */
  forfeit: number;
  /** Farmed RF paid out. */
  payout: number;
  /** A stake's RF handed back, after the fee. An NFT lock has nothing to hand back. */
  stakeBack: number;
};

export function exitTerms(lock: Lock, round: number): ExitTerms {
  const early = !isMature(lock, round);
  const fee = early ? cents(lock.value * EXIT_BURN) : 0;
  const forfeit = early ? down(lock.farmed * EXIT_FORFEIT) : 0;
  return {
    early, fee, forfeit, payout: cents(lock.farmed - forfeit),
    stakeBack: lock.kind === "stake" ? cents(lock.value - fee) : 0,
  };
}

/** Adds RF to a stake. A top-up keeps the stake's age, averaged by the RF on each side. */
export function addToStake(existing: Lock | undefined, amount: number, round: number): Lock {
  if (amount <= 0 || amount % STAKE_STEP !== 0) throw new Error(`Stake in steps of ${STAKE_STEP} RF`);
  const total = (existing?.value ?? 0) + amount;
  if (total > STAKE_MAX) throw new Error(`You can stake at most ${STAKE_MAX} RF`);
  if (!existing) return { key: STAKE_LOCK_KEY, kind: "stake", since: round, value: total, farmed: 0, dust: 0 };
  const age = Math.floor(tenure(existing, round) * existing.value / total);
  return { ...existing, value: total, since: round - age };
}
