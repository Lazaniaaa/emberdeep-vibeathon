import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  FAUCET_AMOUNT, FIELD_LOCK_GOLD, FLASK_PRICE, HOLD_FACTOR, KEY_PRICE, MAX_FLASKS, MAX_KEYS, PASSES, ROUND_SEED_GOLD,
  MAX_ROUND_RETURN, ROUND_SEED_LOCKED, ROUND_SEED_POOL, START_BALANCE, START_KEYS, STAKE_MAX, WORLD_BURN_SEED, WORLD_MINT_SEED, type PassId,
} from "@/game/config";
import {
  ARMORS, CLASSES, FAMILY_PERKS, FRIEND_BLESSING, POTIONS, POTION_IDS, RARITIES, RARITY_INFO, WEAPONS, heroPerks,
  mergePerks, scalePerks, type ArmorId, type HeroNft, type Perks, type PotionId, type Rarity, type WeaponId,
} from "@/game/catalog";
import {
  applyBurn, applyClaim, applySpend, mintHero, mintsLeft, rollSigilRarity, settleRound, splitSpend, type Ledger, type LedgerEntry,
  type RoundSettlement,
} from "@/game/economy";
import {
  FRIEND_LOCK_KEY, FRIEND_LOCK_VALUE, STAKE_LOCK_KEY, addToStake, exitTerms, heroLockKey, heroLockValue, isMature, settleLocks,
  stakeGoldPct, strength, type Lock,
} from "@/game/locks";
import { drawWeek, fieldWeek, passCost, ticketsKept, type DrawResult, type LotFriend } from "@/game/raffle";
import { randomSeed } from "@/game/rng";
import { emptyBag, type PotionBag, type RunState } from "@/game/run";

export type HeroChoice = { kind: "wanderer" } | { kind: "nft"; id: string } | { kind: "friend" } | { kind: "prize"; serial: number };

export type PrizeFriend = LotFriend & { wonAt: number };

export type RunReport = {
  outcome: "extracted" | "dead";
  depth: number;
  gold: number;
  crystals: number;
  sigils: number;
  payout: number;
  spent: number;
  burned: number;
  minted: HeroNft[];
  tickets: number;
  ticketsFound: number;
  steps: number;
  kills: number;
  /** A boss (Cerberus) fell this descent, whether or not the delver made it home. */
  bossSlain?: boolean;
};

type Stats = {
  runs: number; extracts: number; deaths: number; deepest: number; bestPayout: number; mints: number; bosses: number;
};

type State = Ledger & {
  crystals: number;
  /** Entry keys. One is spent to start a descent. */
  keys: number;
  /** Reward round number. Gold banked below counts toward this round's pool. */
  round: number;
  /** Your gold from runs you extracted alive this round. */
  roundGold: number;
  /** RF you put into descents settled this round (entry keys and oil, deaths included). It sets the round's return cap. */
  roundSpent: number;
  /** Gold the simulated crowd has banked this round. */
  fieldGold: number;
  potions: PotionBag;
  weapons: WeaponId[];
  weapon: WeaponId;
  armors: ArmorId[];
  armor: ArmorId;
  /** Delvers you minted, by rarity. They count against the fixed supply. */
  minted: Record<Rarity, number>;
  heroes: HeroNft[];
  hero: HeroChoice;
  flasks: number;
  log: LedgerEntry[];
  stats: Stats;
  muted: boolean;
  reducedMotion: boolean;
  lastReport: RunReport | null;
  runSpent: number;
  /** Id of the paid descent that has not been settled yet. Null when nothing is in progress. */
  runId: string | null;
  /** Potions taken into that descent. They leave the inventory when it starts and come back when it is settled. */
  carried: PotionBag;
  tickets: number;
  fieldTickets: number;
  friendsBurned: number;
  week: number;
  nextSerial: number;
  prizes: PrizeFriend[];
  lastDraw: DrawResult | null;
  pass: PassId | null;
  /** Week number the pass was bought for. It ends when that week is drawn. */
  passWeek: number;
  /** Delvers, your wallet's Friend and staked RF that are locked. They age with every closed round. */
  locks: Lock[];
  /** Passive gold the simulated crowd's lockers farm this round. */
  fieldLockGold: number;
};

type Actions = {
  setFlasks: (n: number) => void;
  selectHero: (choice: HeroChoice) => void;
  buyPotion: (id: PotionId, pay: "rf" | "crystals") => void;
  buyWeapon: (id: WeaponId) => void;
  equipWeapon: (id: WeaponId) => void;
  buyArmor: (id: ArmorId) => void;
  equipArmor: (id: ArmorId) => void;
  mint: (rarity: Rarity) => HeroNft;
  buyKey: (count: number) => void;
  payForRun: () => boolean;
  finishRun: (run: RunState) => RunReport;
  /**
   * Closes the round: the gold-share pool and the lock pool are both shared out, and every lock ages by one round.
   * `friendHeld` says whether the wallet still holds the Friend that a Friend lock commits; if not, that lock pauses.
   */
  claimRound: (friendHeld?: boolean) => (RoundSettlement & { round: number; farmed: number; lockTickets: number }) | null;
  lockHero: (id: string) => void;
  lockFriend: () => void;
  /** Stakes RF in steps of STAKE_STEP. The RF leaves your balance and comes back when you release the stake. */
  stakeRf: (amount: number) => void;
  /** Releases a lock. Before maturity that forfeits half of what it farmed and burns part of its value. */
  unlock: (key: string) => UnlockResult;
  /** Moves a mature lock's farmed RF into your balance and keeps the lock. */
  harvest: (key: string) => number;
  /** Settles a paid run whose progress was lost (the tab was closed mid-descent) as a run lost in the dark. */
  abandonRun: () => boolean;
  faucet: () => void;
  addFieldWeek: () => void;
  drawRaffle: () => DrawResult | null;
  buyPass: (id: PassId) => void;
  setMuted: (m: boolean) => void;
  setReducedMotion: (m: boolean) => void;
  dismissReport: () => void;
  reset: () => void;
};

export type UnlockResult = { early: boolean; fee: number; forfeit: number; payout: number; stakeBack: number };

const initial = (): State => ({
  rf: START_BALANCE,
  pool: ROUND_SEED_POOL,
  locked: ROUND_SEED_LOCKED,
  raffle: 0,
  burned: 0,
  spent: 0,
  returned: 0,
  crystals: 0,
  keys: START_KEYS,
  round: 1,
  roundGold: 0,
  roundSpent: 0,
  fieldGold: ROUND_SEED_GOLD,
  potions: { ...emptyBag(), nightVision: 1 },
  weapons: ["fists"],
  weapon: "fists",
  armors: ["none"],
  armor: "none",
  minted: { common: 0, rare: 0, epic: 0, legendary: 0 },
  heroes: [],
  hero: { kind: "wanderer" },
  flasks: 2,
  log: [],
  stats: { runs: 0, extracts: 0, deaths: 0, deepest: 0, bestPayout: 0, mints: 0, bosses: 0 },
  muted: false,
  reducedMotion: typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  lastReport: null,
  runSpent: 0,
  runId: null,
  carried: emptyBag(),
  tickets: 0,
  fieldTickets: 0,
  friendsBurned: 0,
  week: 1,
  nextSerial: 1,
  prizes: [],
  lastDraw: null,
  pass: null,
  passWeek: 0,
  locks: [],
  fieldLockGold: FIELD_LOCK_GOLD,
});

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const amount = (value: unknown, fallback: number, integer = false): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && (!integer || Number.isSafeInteger(value))
    ? value : fallback;

/** Persisted browser data can be partial or corrupted; never let it replace live store actions. */
export function mergeSavedState(persisted: unknown, current: State & Actions): State & Actions {
  const saved = record(persisted);
  const defaults = initial();
  const potions = record(saved.potions);
  const stats = record(saved.stats);
  const safePotions = { ...defaults.potions };
  for (const id of POTION_IDS) safePotions[id] = amount(potions[id], defaults.potions[id], true);

  const safeStats = { ...defaults.stats };
  for (const key of Object.keys(safeStats) as (keyof Stats)[]) {
    // bestPayout is money, so it keeps its cents; every other stat is a count.
    safeStats[key] = amount(stats[key], defaults.stats[key], key !== "bestPayout");
  }
  const savedCarried = record(saved.carried);
  const carried = emptyBag();
  for (const id of POTION_IDS) carried[id] = amount(savedCarried[id], 0, true);

  const weapons = Array.isArray(saved.weapons)
    ? saved.weapons.filter((id): id is WeaponId => typeof id === "string" && Object.hasOwn(WEAPONS, id))
    : defaults.weapons;
  if (!weapons.includes("fists")) weapons.unshift("fists");
  const armors = Array.isArray(saved.armors)
    ? saved.armors.filter((id): id is ArmorId => typeof id === "string" && Object.hasOwn(ARMORS, id))
    : defaults.armors;
  if (!armors.includes("none")) armors.unshift("none");
  const heroes = Array.isArray(saved.heroes) ? saved.heroes.filter(isHero) : defaults.heroes;
  const savedMinted = record(saved.minted);
  // Saves from before supply caps only know their Delvers, so count those.
  const minted = { ...defaults.minted };
  for (const r of RARITIES) minted[r] = amount(savedMinted[r], heroes.filter(h => h.rarity === r).length, true);
  // A lock only makes sense for something you still have; a repeated key would farm twice.
  const seenLocks = new Set<string>();
  const locks = Array.isArray(saved.locks)
    ? saved.locks.filter(isLock).filter(l => {
      if (seenLocks.has(l.key)) return false;
      seenLocks.add(l.key);
      return l.kind !== "hero" || heroes.some(h => heroLockKey(h.id) === l.key);
    })
    : defaults.locks;
  const hero = record(saved.hero);
  const safeHero: HeroChoice = hero.kind === "nft" && typeof hero.id === "string"
    ? { kind: "nft", id: hero.id }
    : hero.kind === "prize" && Number.isSafeInteger(hero.serial)
      ? { kind: "prize", serial: hero.serial as number }
      : hero.kind === "friend" ? { kind: "friend" } : defaults.hero;

  return {
    ...current,
    rf: amount(saved.rf, defaults.rf), pool: amount(saved.pool, defaults.pool), locked: amount(saved.locked, defaults.locked),
    raffle: amount(saved.raffle, defaults.raffle), burned: amount(saved.burned, defaults.burned),
    spent: amount(saved.spent, defaults.spent), returned: amount(saved.returned, defaults.returned),
    crystals: amount(saved.crystals, defaults.crystals, true), potions: safePotions,
    keys: Math.min(MAX_KEYS, amount(saved.keys, defaults.keys, true)),
    round: Math.max(1, amount(saved.round, defaults.round, true)),
    roundGold: amount(saved.roundGold, defaults.roundGold, true),
    roundSpent: amount(saved.roundSpent, defaults.roundSpent),
    fieldGold: amount(saved.fieldGold, defaults.fieldGold),
    weapons, weapon: typeof saved.weapon === "string" && weapons.includes(saved.weapon as WeaponId)
      ? saved.weapon as WeaponId : "fists",
    armors, armor: typeof saved.armor === "string" && armors.includes(saved.armor as ArmorId) ? saved.armor as ArmorId : "none",
    minted,
    heroes,
    hero: safeHero,
    flasks: Math.max(1, Math.min(MAX_FLASKS, amount(saved.flasks, defaults.flasks, true))),
    log: Array.isArray(saved.log) ? saved.log.filter(isLedgerEntry).slice(0, 60) : defaults.log,
    stats: safeStats,
    muted: typeof saved.muted === "boolean" ? saved.muted : defaults.muted,
    reducedMotion: typeof saved.reducedMotion === "boolean" ? saved.reducedMotion : defaults.reducedMotion,
    lastReport: isRunReport(saved.lastReport) ? saved.lastReport : null,
    runSpent: amount(saved.runSpent, defaults.runSpent),
    runId: typeof saved.runId === "string" && saved.runId.length > 0 && saved.runId.length < 80 ? saved.runId : null,
    carried,
    tickets: amount(saved.tickets, defaults.tickets, true),
    fieldTickets: amount(saved.fieldTickets, defaults.fieldTickets, true),
    friendsBurned: amount(saved.friendsBurned, defaults.friendsBurned, true),
    week: Math.max(1, amount(saved.week, defaults.week, true)),
    nextSerial: Math.max(1, amount(saved.nextSerial, defaults.nextSerial, true)),
    prizes: Array.isArray(saved.prizes) ? saved.prizes.filter(isPrize) : defaults.prizes,
    lastDraw: isDrawResult(saved.lastDraw) ? saved.lastDraw : null,
    pass: saved.pass === "plus" || saved.pass === "pro" ? saved.pass : null,
    passWeek: amount(saved.passWeek, defaults.passWeek, true),
    locks,
    fieldLockGold: amount(saved.fieldLockGold, defaults.fieldLockGold),
  };
}

function isLock(value: unknown): value is Lock {
  const l = record(value);
  const keyMatchesKind = l.kind === "friend" ? l.key === FRIEND_LOCK_KEY
    : l.kind === "stake" ? l.key === STAKE_LOCK_KEY
      : l.kind === "hero" && typeof l.key === "string" && l.key.startsWith("hero:") && l.key.length < 80;
  return keyMatchesKind
    && Number.isSafeInteger(l.since) && (l.since as number) >= 1
    && [l.value, l.farmed, l.dust].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0)
    && (l.value as number) <= STAKE_MAX && (l.dust as number) < 1;
}

function isHero(value: unknown): value is HeroNft {
  const h = record(value);
  return typeof h.id === "string" && Number.isSafeInteger(h.serial) && (h.serial as number) >= 0
    && typeof h.classId === "string" && Object.hasOwn(CLASSES, h.classId)
    && typeof h.rarity === "string" && Object.hasOwn(RARITY_INFO, h.rarity)
    && (h.source === "altar" || h.source === "sigil")
    && typeof h.mintedAt === "number" && Number.isFinite(h.mintedAt);
}

function isPrize(value: unknown): value is PrizeFriend {
  const p = record(value);
  return Number.isSafeInteger(p.serial) && (p.serial as number) >= 0 && Number.isSafeInteger(p.family)
    && (p.family as number) >= 0 && (p.family as number) < FAMILY_PERKS.length
    && typeof p.wonAt === "number" && Number.isFinite(p.wonAt);
}

function isLedgerEntry(value: unknown): value is LedgerEntry {
  const e = record(value);
  return typeof e.label === "string" && typeof e.at === "number" && Number.isFinite(e.at)
    && (e.kind === "spend" || e.kind === "payout" || e.kind === "faucet")
    && [e.amount, e.burned, e.pooled, e.raffle].every(n => typeof n === "number" && Number.isFinite(n));
}

function isRunReport(value: unknown): value is RunReport {
  const r = record(value);
  return (r.outcome === "dead" || r.outcome === "extracted")
    && Array.isArray(r.minted) && r.minted.every(isHero)
    && [r.depth, r.gold, r.crystals, r.sigils, r.payout, r.spent, r.burned,
      r.tickets, r.ticketsFound, r.steps, r.kills].every(n => typeof n === "number" && Number.isFinite(n));
}

function isDrawResult(value: unknown): value is DrawResult {
  const d = record(value);
  return Array.isArray(d.prizes) && d.prizes.every(p => {
    const prize = record(p);
    const friend = record(prize.friend);
    return (prize.fate === "burned" || prize.fate === "you" || prize.fate === "field")
      && Number.isSafeInteger(friend.serial) && (friend.serial as number) >= 0
      && Number.isSafeInteger(friend.family) && (friend.family as number) >= 0
      && (friend.family as number) < FAMILY_PERKS.length;
  }) && [d.bought, d.spent, d.leftover, d.yourTickets, d.fieldTickets]
    .every(n => typeof n === "number" && Number.isFinite(n));
}

function newRunId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export class InsufficientFunds extends Error {}
export class SoldOut extends Error {}

/** A lock action that cannot be done, with a reason the player can read. */
export class LockError extends Error {}

const round2 = (n: number) => Math.round(n * 100) / 100;

function spend(state: State, amount: number, label: string): Partial<State> {
  if (amount > state.rf + 1e-9) throw new InsufficientFunds(`Not enough RF for ${label}`);
  const ledger = applySpend(state, amount);
  const { burned, pooled, raffle, locked } = splitSpend(amount);
  const entry: LedgerEntry = { at: Date.now(), kind: "spend", label, amount, burned, pooled, raffle, locked };
  return { ...ledger, log: [entry, ...state.log].slice(0, 60) };
}

/** A log line for something that is not a spend or a payout split, such as a lock opening. */
function note(kind: LedgerEntry["kind"], label: string, amount: number, burned = 0): LedgerEntry {
  return { at: Date.now(), kind, label, amount, burned, pooled: 0, raffle: 0 };
}

const lockName = (lock: Lock, heroes: HeroNft[]) => {
  if (lock.kind === "stake") return `${lock.value} RF stake`;
  if (lock.kind === "friend") return "your Rare Friend";
  const hero = heroes.find(h => heroLockKey(h.id) === lock.key);
  return hero ? `${CLASSES[hero.classId].name} #${hero.serial}` : "a Delver";
};

/** Upgrades a save from an older store version. Each step only adds what the newer version needs. */
export function migrateSavedState(persisted: unknown, version: number) {
  const saved = { ...(persisted as Partial<State>) };
  if (version < 2) {
    Object.assign(saved, { raffle: saved.raffle ?? 0, tickets: saved.tickets ?? 0, fieldTickets: 0, friendsBurned: 0, week: saved.week ?? 1, nextSerial: 1, prizes: [], lastDraw: null });
  }
  if (version < 3) Object.assign(saved, { pass: null, passWeek: 0 });
  // v4 replaced the fixed gold rate with round shares, so the old 250k pool has no meaning any more.
  if (version < 4) Object.assign(saved, { pool: ROUND_SEED_POOL, fieldGold: ROUND_SEED_GOLD, roundGold: 0, round: 1, keys: START_KEYS });
  // v5 added locks and the lock pool. Older pools already hold their 67%, so they simply play out.
  if (version < 5) Object.assign(saved, { locks: [], locked: ROUND_SEED_LOCKED, fieldLockGold: FIELD_LOCK_GOLD });
  // v6 caps what a round pays at a multiple of what went into its descents. A round already in progress does not
  // know that figure, so assume the gold cost about its worth rather than zero out its payout.
  if (version < 6) Object.assign(saved, { roundSpent: typeof saved.roundGold === "number" && saved.roundGold > 0 ? saved.roundGold : 0 });
  return saved;
}

export const useGame = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),

      setFlasks: n => set({ flasks: Math.max(1, Math.min(MAX_FLASKS, n)) }),

      selectHero: hero => set({ hero }),

      buyPotion: (id, pay) => {
        const s = get();
        const p = POTIONS[id];
        if (!p.shop) throw new Error(`${p.name} can only be found in the deep`);
        if (pay === "crystals") {
          if (s.crystals < p.crystals) throw new InsufficientFunds("Not enough crystals");
          set({ crystals: s.crystals - p.crystals, potions: { ...s.potions, [id]: s.potions[id] + 1 } });
          return;
        }
        set({ ...spend(s, p.price, p.name), potions: { ...s.potions, [id]: s.potions[id] + 1 } });
      },

      buyWeapon: id => {
        const s = get();
        const w = WEAPONS[id];
        if (s.weapons.includes(id)) return;
        if (s.crystals < w.crystals) throw new InsufficientFunds("Not enough crystals");
        set({ ...spend(s, w.price, w.name), crystals: s.crystals - w.crystals, weapons: [...s.weapons, id], weapon: id });
      },

      equipWeapon: id => { if (get().weapons.includes(id)) set({ weapon: id }); },

      buyArmor: id => {
        const s = get();
        const a = ARMORS[id];
        if (s.armors.includes(id)) return;
        if (s.crystals < a.crystals) throw new InsufficientFunds("Not enough crystals");
        set({ ...spend(s, a.price, a.name), crystals: s.crystals - a.crystals, armors: [...s.armors, id], armor: id });
      },

      equipArmor: id => { if (get().armors.includes(id)) set({ armor: id }); },

      mint: rarity => {
        const s = get();
        const info = RARITY_INFO[rarity];
        if (mintsLeft(rarity, s.minted[rarity]) <= 0) throw new SoldOut(`Every ${info.label} Delver has been minted`);
        const edition = WORLD_MINT_SEED[rarity] + s.minted[rarity] + 1;
        const hero = mintHero(rarity, s.stats.mints + 1, "altar", undefined, edition);
        set({
          ...spend(s, info.price, `Mint ${info.label} character`),
          heroes: [hero, ...s.heroes],
          hero: { kind: "nft", id: hero.id },
          minted: { ...s.minted, [rarity]: s.minted[rarity] + 1 },
          stats: { ...s.stats, mints: s.stats.mints + 1 },
        });
        return hero;
      },

      buyKey: count => {
        const s = get();
        const n = Math.max(1, Math.floor(count));
        if (s.keys + n > MAX_KEYS) throw new Error(`You can hold at most ${MAX_KEYS} keys`);
        set({ ...spend(s, KEY_PRICE * n, `${n} entry key${n > 1 ? "s" : ""}`), keys: s.keys + n });
      },

      payForRun: () => {
        const s = get();
        if (s.runSpent > 0 || s.keys < 1) return false;
        const cost = s.flasks * FLASK_PRICE;
        if (cost > s.rf) return false;
        // The potions go into the descent's pack now, so closing the tab cannot hand them back.
        set({
          ...spend(s, cost, `${s.flasks} oil flask${s.flasks > 1 ? "s" : ""}`),
          keys: s.keys - 1, runSpent: cost, runId: newRunId(), carried: { ...s.potions }, potions: emptyBag(),
        });
        return true;
      },

      finishRun: run => {
        const s = get();
        if (run.status === "playing") throw new Error("A run cannot finish while it is still playing");
        if (s.runSpent <= 0) {
          if (s.lastReport) return s.lastReport;
          throw new Error("No paid run to finish");
        }
        // A result only settles the descent that was paid for; an older or foreign one is ignored.
        if (run.runId && s.runId && run.runId !== s.runId) {
          if (s.lastReport) return s.lastReport;
          throw new Error("This descent belongs to another payment");
        }
        const extracted = run.status === "extracted";
        // What is left in the pack comes home. Potions found on the way only count if the delver extracts.
        const potions = { ...s.potions };
        for (const id of POTION_IDS) {
          potions[id] += extracted ? run.bag[id] : Math.max(0, run.bag[id] - run.found[id]);
        }
        const minted: HeroNft[] = [];
        const mintedNow: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
        let mints = s.stats.mints;
        if (extracted) {
          for (let i = 0; i < run.sigils; i++) {
            // A sigil can only mint what is left, so a sold-out rarity is skipped.
            const available = RARITIES.filter(r => mintsLeft(r, s.minted[r] + mintedNow[r]) > 0);
            if (available.length === 0) break;
            const rarity = rollSigilRarity(undefined, available);
            const edition = WORLD_MINT_SEED[rarity] + s.minted[rarity] + mintedNow[rarity] + 1;
            mintedNow[rarity]++;
            minted.push(mintHero(rarity, ++mints, "sigil", undefined, edition));
          }
        }
        const burned = splitSpend(s.runSpent).burned;
        const tickets = ticketsKept(extracted, run.tickets);
        const report: RunReport = {
          outcome: extracted ? "extracted" : "dead",
          depth: run.deepest, gold: run.gold, crystals: run.crystals, sigils: run.sigils,
          payout: 0, spent: s.runSpent, burned, minted, tickets, ticketsFound: run.tickets, steps: run.steps, kills: run.kills,
          bossSlain: !!run.bossSlain,
        };
        set({
          tickets: s.tickets + tickets,
          // Gold from a run that made it home joins this round; gold lost in the dark counts for nobody.
          roundGold: s.roundGold + (extracted ? run.gold : 0),
          roundSpent: round2(s.roundSpent + KEY_PRICE + s.runSpent),
          crystals: s.crystals + (extracted ? run.crystals : 0),
          potions,
          heroes: [...minted, ...s.heroes],
          minted: { common: s.minted.common + mintedNow.common, rare: s.minted.rare + mintedNow.rare, epic: s.minted.epic + mintedNow.epic, legendary: s.minted.legendary + mintedNow.legendary },
          lastReport: report,
          runSpent: 0,
          runId: null,
          carried: emptyBag(),
          stats: {
            runs: s.stats.runs + 1,
            extracts: s.stats.extracts + (extracted ? 1 : 0),
            deaths: s.stats.deaths + (extracted ? 0 : 1),
            deepest: Math.max(s.stats.deepest, run.deepest),
            bestPayout: s.stats.bestPayout,
            mints,
            bosses: s.stats.bosses + (run.bossSlain ? 1 : 0),
          },
        });
        return report;
      },

      abandonRun: () => {
        const s = get();
        if (s.runSpent <= 0) return false;
        set({
          runSpent: 0,
          roundSpent: round2(s.roundSpent + KEY_PRICE + s.runSpent),
          runId: null,
          // The pack was lost with the tab, exactly as if the delver had died in the dark.
          carried: emptyBag(),
          stats: { ...s.stats, runs: s.stats.runs + 1, deaths: s.stats.deaths + 1 },
          log: [{
            at: Date.now(), kind: "payout" as const, label: "Descent abandoned: lost in the dark",
            amount: 0, burned: 0, pooled: 0, raffle: 0,
          }, ...s.log].slice(0, 60),
        });
        return true;
      },

      claimRound: (friendHeld = false) => {
        const s = get();
        // A round with no gold of yours still closes if your locks are waiting to age and farm.
        if (s.roundGold <= 0 && s.locks.length === 0) return null;
        // The pool pays a delver at most MAX_ROUND_RETURN times what they put into descents this round.
        const result = settleRound(s.pool, s.roundGold, s.fieldGold, MAX_ROUND_RETURN * s.roundSpent);
        const settled = applyClaim(s, result);
        const percent = Math.round(result.share * 10_000) / 100;
        // The lock pool is shared by passive gold, apart from the pool descents compete for.
        const lockResult = settleLocks(s.locks, s.round, s.locked, s.fieldLockGold, l => l.kind !== "friend" || friendHeld);
        const farmed = round2(Object.values(lockResult.payouts).reduce((a, b) => a + b, 0));
        const log: LedgerEntry[] = [];
        if (farmed > 0) log.push(note("payout", `Round ${s.round}: your locks farmed ${farmed} RF (paid when they mature)`, farmed));
        if (s.roundGold > 0) {
          log.push({
            at: Date.now(), kind: "payout" as const,
            label: `Round ${s.round}: ${percent}% of the gold`, amount: result.payout, burned: 0, pooled: -result.payout, raffle: 0,
          });
        }
        set({
          rf: settled.rf, returned: settled.returned,
          // A new round opens with a simulated crowd already in it.
          pool: round2(settled.pool + ROUND_SEED_POOL),
          locked: round2(lockResult.carry + ROUND_SEED_LOCKED),
          fieldGold: ROUND_SEED_GOLD,
          fieldLockGold: FIELD_LOCK_GOLD,
          locks: lockResult.locks,
          tickets: s.tickets + lockResult.tickets,
          roundGold: 0,
          roundSpent: 0,
          round: s.round + 1,
          stats: { ...s.stats, bestPayout: Math.max(s.stats.bestPayout, result.payout) },
          log: [...log.reverse(), ...s.log].slice(0, 60),
        });
        return { ...result, round: s.round, farmed, lockTickets: lockResult.tickets };
      },

      lockHero: id => {
        const s = get();
        const hero = s.heroes.find(h => h.id === id);
        if (!hero) throw new LockError("That Delver is not in your collection");
        const key = heroLockKey(id);
        if (s.locks.some(l => l.key === key)) return;
        const lock: Lock = { key, kind: "hero", since: s.round, value: heroLockValue(hero), farmed: 0, dust: 0 };
        set({ locks: [...s.locks, lock], log: [note("payout", `Locked ${lockName(lock, s.heroes)}`, 0), ...s.log].slice(0, 60) });
      },

      lockFriend: () => {
        const s = get();
        if (s.locks.some(l => l.key === FRIEND_LOCK_KEY)) return;
        const lock: Lock = { key: FRIEND_LOCK_KEY, kind: "friend", since: s.round, value: FRIEND_LOCK_VALUE, farmed: 0, dust: 0 };
        set({ locks: [...s.locks, lock], log: [note("payout", "Locked your Rare Friend", 0), ...s.log].slice(0, 60) });
      },

      stakeRf: amount => {
        const s = get();
        let lock: Lock;
        try {
          lock = addToStake(s.locks.find(l => l.key === STAKE_LOCK_KEY), amount, s.round);
        } catch (e) {
          throw new LockError(e instanceof Error ? e.message : "That stake is not allowed");
        }
        if (amount > s.rf + 1e-9) throw new InsufficientFunds("Not enough RF to stake");
        set({
          rf: round2(s.rf - amount),
          locks: [...s.locks.filter(l => l.key !== STAKE_LOCK_KEY), lock],
          log: [note("spend", `Staked ${amount} RF (${lock.value} in total, yours to take back)`, amount), ...s.log].slice(0, 60),
        });
      },

      unlock: key => {
        const s = get();
        const lock = s.locks.find(l => l.key === key);
        if (!lock) throw new LockError("That lock does not exist");
        const terms = exitTerms(lock, s.round);
        // An NFT is never moved, so its fee comes out of your balance; a stake pays the fee out of what it returns.
        if (lock.kind !== "stake" && terms.fee > s.rf + 1e-9) throw new InsufficientFunds(`Not enough RF for the ${terms.fee} RF exit fee`);
        const gained = round2(terms.payout + terms.stakeBack - (lock.kind === "stake" ? 0 : terms.fee));
        const burned = applyBurn(s, terms.fee);
        set({
          rf: round2(s.rf + gained),
          burned: burned.burned, spent: burned.spent,
          returned: round2(s.returned + terms.payout),
          // What an early leaver gives up goes back to the delvers who stay.
          locked: round2(s.locked + terms.forfeit),
          locks: s.locks.filter(l => l.key !== key),
          log: [
            note(terms.early ? "spend" : "payout", `${terms.early ? "Broke" : "Released"} ${lockName(lock, s.heroes)}${terms.early ? `: ${terms.forfeit} RF forfeited, ${terms.fee} RF burned` : ""}`,
              terms.early ? terms.fee : gained, terms.fee),
            ...s.log,
          ].slice(0, 60),
        });
        return terms;
      },

      harvest: key => {
        const s = get();
        const lock = s.locks.find(l => l.key === key);
        if (!lock) throw new LockError("That lock does not exist");
        if (!isMature(lock, s.round)) throw new LockError("Farmed RF can be harvested once the lock is mature");
        const amount = lock.farmed;
        if (amount <= 0) return 0;
        set({
          rf: round2(s.rf + amount),
          returned: round2(s.returned + amount),
          locks: s.locks.map(l => l.key === key ? { ...l, farmed: 0 } : l),
          log: [note("payout", `Harvested ${lockName(lock, s.heroes)}`, amount), ...s.log].slice(0, 60),
        });
        return amount;
      },

      faucet: () => {
        const s = get();
        set({
          rf: s.rf + FAUCET_AMOUNT,
          log: [{ at: Date.now(), kind: "faucet" as const, label: "Simulated top-up", amount: FAUCET_AMOUNT, burned: 0, pooled: 0, raffle: 0 }, ...s.log].slice(0, 60),
        });
      },

      addFieldWeek: () => {
        const s = get();
        const week = fieldWeek();
        set({
          raffle: Math.round((s.raffle + week.treasury) * 100) / 100,
          pool: Math.round((s.pool + week.pooled) * 100) / 100,
          locked: round2(s.locked + week.locked),
          fieldGold: s.fieldGold + week.gold,
          fieldLockGold: s.fieldLockGold + week.lockGold,
          fieldTickets: s.fieldTickets + week.tickets,
          log: [{ at: Date.now(), kind: "spend" as const, label: "Other delvers this week (simulated)", amount: week.spent, burned: 0, pooled: week.pooled, raffle: week.treasury, locked: week.locked }, ...s.log].slice(0, 60),
        });
      },

      drawRaffle: () => {
        const s = get();
        const draw = drawWeek({
          treasury: s.raffle, yourTickets: s.tickets, fieldTickets: s.fieldTickets,
          seed: randomSeed(), nextSerial: s.nextSerial,
        });
        if (!draw) return null;
        const won = draw.prizes.filter(p => p.fate === "you").map(p => ({ ...p.friend, wonAt: Date.now() }));
        set({
          raffle: draw.leftover,
          tickets: 0,
          fieldTickets: 0,
          week: s.week + 1,
          nextSerial: s.nextSerial + draw.bought,
          friendsBurned: s.friendsBurned + 1,
          prizes: [...won, ...s.prizes],
          lastDraw: draw,
          log: [{
            at: Date.now(), kind: "payout" as const,
            label: `Week ${s.week}: bought ${draw.bought}, burned 1, drew ${draw.bought - 1}`,
            amount: 0, burned: 0, pooled: 0, raffle: -draw.spent,
          }, ...s.log].slice(0, 60),
        });
        return draw;
      },

      buyPass: id => {
        const s = get();
        const active = s.passWeek === s.week ? s.pass : null;
        const cost = passCost(id, active);
        if (cost === null) throw new InsufficientFunds("A higher pass is already active this week");
        if (cost === 0) return;
        const pass = PASSES[id];
        set({ ...spend(s, cost, cost < pass.price ? `Upgrade to ${pass.name}` : pass.name), pass: id, passWeek: s.week });
      },

      setMuted: muted => set({ muted }),
      setReducedMotion: reducedMotion => set({ reducedMotion }),
      dismissReport: () => set({ lastReport: null }),
      reset: () => set({ ...initial() }),
    }),
    {
      name: "emberdeep-save-v1",
      version: 6,
      merge: mergeSavedState,
      migrate: migrateSavedState,
    },
  ),
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", event => {
    if (event.key === "emberdeep-save-v1" && event.storageArea === localStorage && event.newValue) {
      void useGame.persist.rehydrate();
    }
  });
}

export const worldBurned = (burned: number) => WORLD_BURN_SEED + burned;

export function activePass(state: Pick<State, "pass" | "passWeek" | "week">): PassId | null {
  return state.pass && state.passWeek === state.week ? state.pass : null;
}

export type FriendContext = {
  hasFriend: boolean;
  family: number | null;
};

/**
 * Perks for the chosen hero, plus the Rare Friend blessing when the wallet holds one. Everything you only hold
 * works at HOLD_FACTOR of its strength; locking it (and waiting) makes it stronger. Staked RF adds gold.
 */
export function computePerks(state: Pick<State, "hero" | "heroes" | "prizes" | "locks" | "round">, friend: FriendContext): Perks {
  const lockOf = (key: string) => state.locks.find(l => l.key === key);
  // A Friend lock only counts while the wallet still holds a Friend.
  const friendStrength = strength(friend.hasFriend ? lockOf(FRIEND_LOCK_KEY) : undefined, state.round);
  const parts: Partial<Perks>[] = [];
  if (friend.hasFriend) parts.push(scalePerks(FRIEND_BLESSING, friendStrength));
  if (state.hero.kind === "nft") {
    const id = state.hero.id;
    const hero = state.heroes.find(h => h.id === id);
    if (hero) parts.push(scalePerks(heroPerks(hero), strength(lockOf(heroLockKey(hero.id)), state.round)));
  } else if (state.hero.kind === "friend" && friend.family !== null) {
    parts.push(scalePerks(FAMILY_PERKS[friend.family]?.perk ?? {}, friendStrength));
  } else if (state.hero.kind === "prize") {
    const serial = state.hero.serial;
    const prize = state.prizes.find(p => p.serial === serial);
    if (prize) parts.push(scalePerks(FAMILY_PERKS[prize.family]?.perk ?? {}, HOLD_FACTOR));
  }
  const stake = stakeGoldPct(lockOf(STAKE_LOCK_KEY), state.round);
  if (stake > 0) parts.push({ goldPct: stake });
  return mergePerks(...parts);
}

export function computeRunPerks(state: Pick<State, "hero" | "heroes" | "prizes" | "locks" | "round" | "weapon" | "armor">, friend: FriendContext): Perks {
  return mergePerks(
    computePerks(state, friend),
    { lightOnKill: WEAPONS[state.weapon].lightOnKill },
    { drainReduce: ARMORS[state.armor ?? "none"].drainReduce },
  );
}
