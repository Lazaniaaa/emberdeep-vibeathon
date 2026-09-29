import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  FAUCET_AMOUNT, FLASK_PRICE, KEY_PRICE, MAX_FLASKS, MAX_KEYS, PASSES, ROUND_SEED_GOLD, ROUND_SEED_POOL, START_BALANCE,
  START_KEYS, WORLD_BURN_SEED, WORLD_MINT_SEED, type PassId,
} from "@/game/config";
import {
  ARMORS, CLASSES, FAMILY_PERKS, FRIEND_BLESSING, POTIONS, POTION_IDS, RARITIES, RARITY_INFO, WEAPONS, heroPerks,
  mergePerks, type ArmorId, type HeroNft, type Perks, type PotionId, type Rarity, type WeaponId,
} from "@/game/catalog";
import {
  applyClaim, applySpend, mintHero, mintsLeft, rollSigilRarity, settleRound, splitSpend, type Ledger, type LedgerEntry,
  type RoundSettlement,
} from "@/game/economy";
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
  claimRound: () => (RoundSettlement & { round: number }) | null;
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

const initial = (): State => ({
  rf: START_BALANCE,
  pool: ROUND_SEED_POOL,
  raffle: 0,
  burned: 0,
  spent: 0,
  returned: 0,
  crystals: 0,
  keys: START_KEYS,
  round: 1,
  roundGold: 0,
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
  const hero = record(saved.hero);
  const safeHero: HeroChoice = hero.kind === "nft" && typeof hero.id === "string"
    ? { kind: "nft", id: hero.id }
    : hero.kind === "prize" && Number.isSafeInteger(hero.serial)
      ? { kind: "prize", serial: hero.serial as number }
      : hero.kind === "friend" ? { kind: "friend" } : defaults.hero;

  return {
    ...current,
    rf: amount(saved.rf, defaults.rf), pool: amount(saved.pool, defaults.pool),
    raffle: amount(saved.raffle, defaults.raffle), burned: amount(saved.burned, defaults.burned),
    spent: amount(saved.spent, defaults.spent), returned: amount(saved.returned, defaults.returned),
    crystals: amount(saved.crystals, defaults.crystals, true), potions: safePotions,
    keys: Math.min(MAX_KEYS, amount(saved.keys, defaults.keys, true)),
    round: Math.max(1, amount(saved.round, defaults.round, true)),
    roundGold: amount(saved.roundGold, defaults.roundGold, true),
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
  };
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

function spend(state: State, amount: number, label: string): Partial<State> {
  if (amount > state.rf + 1e-9) throw new InsufficientFunds(`Not enough RF for ${label}`);
  const ledger = applySpend(state, amount);
  const { burned, pooled, raffle } = splitSpend(amount);
  const entry: LedgerEntry = { at: Date.now(), kind: "spend", label, amount, burned, pooled, raffle };
  return { ...ledger, log: [entry, ...state.log].slice(0, 60) };
}

/** Upgrades a save from an older store version. Each step only adds what the newer version needs. */
export function migrateSavedState(persisted: unknown, version: number) {
  const saved = { ...(persisted as Partial<State>) };
  if (version < 2) {
    Object.assign(saved, { raffle: saved.raffle ?? 0, tickets: saved.tickets ?? 0, fieldTickets: 0, friendsBurned: 0, week: saved.week ?? 1, nextSerial: 1, prizes: [], lastDraw: null });
  }
  if (version < 3) Object.assign(saved, { pass: null, passWeek: 0 });
  // v4 replaced the fixed gold rate with round shares, so the old 250k pool has no meaning any more.
  if (version < 4) Object.assign(saved, { pool: ROUND_SEED_POOL, fieldGold: ROUND_SEED_GOLD, roundGold: 0, round: 1, keys: START_KEYS });
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

      claimRound: () => {
        const s = get();
        if (s.roundGold <= 0) return null;
        const result = settleRound(s.pool, s.roundGold, s.fieldGold);
        const settled = applyClaim(s, result);
        const percent = Math.round(result.share * 10_000) / 100;
        set({
          rf: settled.rf, returned: settled.returned,
          // A new round opens with a simulated crowd already in it.
          pool: Math.round((settled.pool + ROUND_SEED_POOL) * 100) / 100,
          fieldGold: ROUND_SEED_GOLD,
          roundGold: 0,
          round: s.round + 1,
          stats: { ...s.stats, bestPayout: Math.max(s.stats.bestPayout, result.payout) },
          log: [{
            at: Date.now(), kind: "payout" as const,
            label: `Round ${s.round}: ${percent}% of the gold`, amount: result.payout, burned: 0, pooled: -result.payout, raffle: 0,
          }, ...s.log].slice(0, 60),
        });
        return { ...result, round: s.round };
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
          fieldGold: s.fieldGold + week.gold,
          fieldTickets: s.fieldTickets + week.tickets,
          log: [{ at: Date.now(), kind: "spend" as const, label: "Other delvers this week (simulated)", amount: week.spent, burned: 0, pooled: week.pooled, raffle: week.treasury }, ...s.log].slice(0, 60),
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
      version: 4,
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

/** Perks for the chosen hero, plus the Rare Friend blessing when the wallet holds one. */
export function computePerks(state: Pick<State, "hero" | "heroes" | "prizes">, friend: FriendContext): Perks {
  const parts: Partial<Perks>[] = [];
  if (friend.hasFriend) parts.push(FRIEND_BLESSING);
  if (state.hero.kind === "nft") {
    const id = state.hero.id;
    const hero = state.heroes.find(h => h.id === id);
    if (hero) parts.push(heroPerks(hero));
  } else if (state.hero.kind === "friend" && friend.family !== null) {
    parts.push(FAMILY_PERKS[friend.family]?.perk ?? {});
  } else if (state.hero.kind === "prize") {
    const serial = state.hero.serial;
    const prize = state.prizes.find(p => p.serial === serial);
    if (prize) parts.push(FAMILY_PERKS[prize.family]?.perk ?? {});
  }
  return mergePerks(...parts);
}

export function computeRunPerks(state: Pick<State, "hero" | "heroes" | "prizes" | "weapon" | "armor">, friend: FriendContext): Perks {
  return mergePerks(
    computePerks(state, friend),
    { lightOnKill: WEAPONS[state.weapon].lightOnKill },
    { drainReduce: ARMORS[state.armor ?? "none"].drainReduce },
  );
}
