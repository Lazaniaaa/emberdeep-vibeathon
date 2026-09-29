// Every tunable number of the Emberdeep economy lives here.

/** Simulated reference price used only to show USD equivalents. */
export const RF_USD = 0.01;

/**
 * Every RF spent anywhere in the game is split this way.
 * The raffle share buys Rare Friends; one of each weekly lot is burned and the rest are drawn,
 * so most of that 8% still comes back to players as NFTs.
 */
export const BURN_SHARE = 0.25;
export const RAFFLE_SHARE = 0.08;
export const POOL_SHARE = 0.67;

export const START_BALANCE = 2_000;
/** Simulated RF already burned by the wider community before this session. */
export const WORLD_BURN_SEED = 1_284_310;
export const FAUCET_AMOUNT = 1_000;

/** One flask of lantern oil: the entry ticket for a descent. */
export const FLASK_PRICE = 20;
export const FLASK_LIGHT = 80;
export const MAX_FLASKS = 5;

/**
 * Entry key: one is spent to start a descent, and it is bought separately from lantern oil.
 * Its price goes through the same 25/8/67 split as every other spend.
 */
export const KEY_PRICE = 50;
/** New saves start with a few keys so a first-time player can descend immediately. */
export const START_KEYS = 3;
export const MAX_KEYS = 20;

// Rewards are a share of the round's pool, never a fixed rate per gold. The pool is 67% of every RF
// spent in the round. Gold is only earned by extracting alive, and when the round closes each delver
// receives (their gold / all gold) of the pool, so nothing in the game promises an amount of RF.

/** One click of "other delvers this week": their spend. It feeds the raffle treasury and the round pool. */
export const FIELD_WEEK_SPEND = 20_000;
/** Simulated crowd: gold banked per RF they spend (deaths and mistakes already included). */
export const FIELD_GOLD_PER_RF = 1.4;
/** Every round opens with one simulated crowd week already in it, so a share is never trivially 100%. */
export const ROUND_SEED_POOL = FIELD_WEEK_SPEND * POOL_SHARE;
export const ROUND_SEED_GOLD = FIELD_WEEK_SPEND * FIELD_GOLD_PER_RF;

export const MAP_W = 27;
export const MAP_H = 17;

/**
 * Hit points and blows are counted in these units, so a dimling has 16-40 HP and a blow is 8-40.
 * The ratio of damage to health is what matters; the larger numbers just leave room to tune.
 */
export const HP_SCALE = 8;

/**
 * Cerberus guards the stairs of the last illustrated floor. It is far larger than a dimling (2x2 tiles),
 * has 150 HP, drinks light hard and moves at half the pace. A Ward Charm (15 protected steps) covers a
 * dagger fight, and the stairs stay sealed until it falls.
 */
export const BOSS_DEPTH = 7;
export const BOSS_HP = 150;
export const BOSS_SIZE = 2;
export const BOSS_DRAIN = 8;
export const BOSS_MOVE_FACTOR = 0.5;
/** What the Cerberus Hoard holds, before the depth multiplier and perks. */
export const HOARD_GOLD: readonly [number, number] = [40, 60];
export const HOARD_CRYSTALS: readonly [number, number] = [10, 16];
export const HOARD_SIGIL_CHANCE = 0.4;

export const NIGHT_VISION_STEPS = 25;
export const WARD_STEPS = 15;

/** Simulated ask for one floor Generations NFT. Labeled simulated; live play would buy listings. */
export const FRIEND_ASK_RF = 500;
/** A lot needs two Friends so one can burn and one can be won. Extra RF waits for next week. */
export const LOT_MIN = 2;
export const LOT_MAX = 5;
/** Chance a gold pile, crystal, chest, vault or kill drops a raffle ticket. Dying still drops them on the floor. */
export const TICKET_DROP_CHANCE = 0.03;
/** Rough loot rolls per RF the simulated crowd spends, so their ticket count matches the free drop rate. */
export const FIELD_ROLLS_PER_RF = 0.12;
/** Share of that spend assumed to come home, so the field's ticket count stays believable. */
export const FIELD_EXTRACT_SHARE = 0.55;

export type PassId = "plus" | "pro";

/** Weekly passes. They raise the ticket drop rate. They do not sell tickets. */
export const PASSES: Record<PassId, { id: PassId; name: string; usd: number; price: number; chance: number }> = {
  plus: { id: "plus", name: "Ember Pass", usd: 5, price: 500, chance: 0.045 },
  pro: { id: "pro", name: "Deep Pass", usd: 10, price: 1_000, chance: 0.065 },
};

/** Hard cap on how many Delvers of each rarity can ever exist. */
export const RARITY_SUPPLY = { common: 999, rare: 111, epic: 69, legendary: 11 } as const;
/** Simulated: how many of each the wider community had already minted before this session. */
export const WORLD_MINT_SEED = { common: 640, rare: 71, epic: 38, legendary: 5 } as const;

/** Rage Potion: your next few blows hit harder. */
export const RAGE_HITS = 5;
export const RAGE_MULT = 1.8;
/** Regeneration: a little light back on each of the next turns. */
export const REGEN_TURNS = 5;
/** Healing Draught: found in the deep, never sold. */
export const HEAL_LIGHT = 60;

/** Chance that a Sealed Vault holds a Soul Sigil (a free character mint). */
export const SIGIL_DROP_CHANCE = 0.3;
/** Rarity weights (basis points) for a Soul Sigil mint. */
export const SIGIL_RARITY_WEIGHTS = { common: 6_200, rare: 2_700, epic: 900, legendary: 200 } as const;

export function stepCost(depth: number) {
  return 1 + Math.floor((depth - 1) / 2) * 0.5;
}

export function lootMultiplier(depth: number) {
  return 1 + 0.4 * (depth - 1);
}

export function lightRadius(light: number) {
  return Math.max(1, Math.min(5, 1 + Math.floor(light / 25)));
}

export function toUsd(rf: number) {
  return rf * RF_USD;
}
