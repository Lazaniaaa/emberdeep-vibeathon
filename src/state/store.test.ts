import { describe, expect, it } from "vitest";
import { computeRunPerks, mergeSavedState, migrateSavedState, useGame } from "./store";
import { NO_PERKS } from "@/game/catalog";
import { KEY_PRICE, MAX_KEYS, RARITY_SUPPLY, ROUND_SEED_GOLD, ROUND_SEED_POOL, START_KEYS, WORLD_MINT_SEED } from "@/game/config";
import { ARMORS } from "@/game/catalog";
import { mintsLeft, rollSigilRarity } from "@/game/economy";
import { applyAction, emptyBag, startRun } from "@/game/run";

describe("saved game recovery", () => {
  it("recovers from missing and malformed nested data without losing store actions", () => {
    const current = useGame.getState();
    const restored = mergeSavedState({
      rf: 125, potions: null, stats: null, weapons: null, heroes: [null],
      hero: null, log: [null], prizes: [null], lastReport: { outcome: "dead" },
      lastDraw: { prizes: null }, tickets: -4, pool: "broken",
    }, current);

    expect(restored.rf).toBe(125);
    expect(restored.pool).toBe(current.pool);
    expect(restored.potions.nightVision).toBe(1);
    expect(restored.potions.ward).toBe(0);
    expect(restored.stats.runs).toBe(0);
    expect(restored.weapons).toEqual(["fists"]);
    expect(restored.heroes).toEqual([]);
    expect(restored.prizes).toEqual([]);
    expect(restored.lastReport).toBeNull();
    expect(restored.lastDraw).toBeNull();
    expect(restored.tickets).toBe(0);
    expect(restored.payForRun).toBe(current.payForRun);
  });

  it("preserves valid progress and fills missing potion fields", () => {
    const current = useGame.getState();
    const restored = mergeSavedState({
      rf: 345, pool: 1_234, potions: { oil: 3 },
      weapons: ["dagger"], weapon: "dagger", stats: { runs: 9, extracts: 4 },
      hero: { kind: "wanderer" },
    }, current);

    expect(restored.rf).toBe(345);
    expect(restored.pool).toBe(1_234);
    expect(restored.potions).toEqual({ nightVision: 1, oil: 3, flare: 0, ward: 0, rage: 0, regen: 0, heal: 0 });
    expect(restored.weapons).toEqual(["fists", "dagger"]);
    expect(restored.weapon).toBe("dagger");
    expect(restored.stats).toMatchObject({ runs: 9, extracts: 4, deaths: 0 });
  });
});

describe("run settlement", () => {
  it("applies the equipped Emberblade's light gain on a kill", () => {
    useGame.getState().reset();
    useGame.setState({ weapons: ["fists", "emberblade"], weapon: "emberblade" });
    const perks = computeRunPerks(useGame.getState(), { hasFriend: false, family: null });
    const started = startRun({ seed: 7, flasks: 2, perks, weaponDamage: 5, bag: emptyBag() });
    started.floor.dimlings = [{ id: 1, x: started.player.x + 1, y: started.player.y, hp: 1, maxHp: 1, awake: true }];
    const after = applyAction(started, { type: "move", dx: 1, dy: 0 });
    expect(after.kills).toBe(1);
    expect(after.light).toBe(started.light + 4 - 1);
    useGame.getState().reset();
  });

  it("does not charge twice when starting a run twice", () => {
    useGame.getState().reset();
    expect(useGame.getState().payForRun()).toBe(true);
    const balance = useGame.getState().rf;
    expect(useGame.getState().payForRun()).toBe(false);
    expect(useGame.getState().rf).toBe(balance);
    useGame.getState().reset();
  });

  it("does not pay out or award tickets twice for the same finished run", () => {
    useGame.getState().reset();
    expect(useGame.getState().payForRun()).toBe(true);
    const started = startRun({ seed: 7, flasks: 2, perks: NO_PERKS, weaponDamage: 1, bag: emptyBag() });
    const extracted = applyAction(started, { type: "extract" });
    extracted.gold = 100;
    extracted.tickets = 2;
    const first = useGame.getState().finishRun(extracted);
    const afterFirst = useGame.getState();
    const second = afterFirst.finishRun(extracted);
    const afterSecond = useGame.getState();
    expect(second).toEqual(first);
    expect(afterSecond.rf).toBe(afterFirst.rf);
    expect(afterSecond.pool).toBe(afterFirst.pool);
    expect(afterSecond.tickets).toBe(2);
    expect(afterSecond.stats.runs).toBe(1);
    useGame.getState().reset();
  });

  it("counts a slain boss once, even when the delver does not make it home", () => {
    useGame.getState().reset();
    expect(useGame.getState().payForRun()).toBe(true);
    const started = startRun({ seed: 7, flasks: 2, perks: NO_PERKS, weaponDamage: 1, bag: emptyBag() });
    const dead = { ...started, status: "dead" as const, bossSlain: true };
    const report = useGame.getState().finishRun(dead);
    expect(report.bossSlain).toBe(true);
    expect(useGame.getState().stats.bosses).toBe(1);
    useGame.getState().finishRun(dead);
    expect(useGame.getState().stats.bosses).toBe(1);
    useGame.getState().reset();
  });

  it("needs an entry key to start a descent and spends exactly one", () => {
    useGame.getState().reset();
    const start = useGame.getState();
    expect(start.keys).toBe(START_KEYS);
    expect(start.payForRun()).toBe(true);
    expect(useGame.getState().keys).toBe(START_KEYS - 1);
    useGame.setState({ keys: 0, runSpent: 0 });
    const rf = useGame.getState().rf;
    expect(useGame.getState().payForRun()).toBe(false);
    expect(useGame.getState().rf).toBe(rf);
    useGame.getState().reset();
  });

  it("frees a paid run whose progress was lost, counting it as a death", () => {
    useGame.getState().reset();
    expect(useGame.getState().abandonRun()).toBe(false);
    expect(useGame.getState().payForRun()).toBe(true);
    expect(useGame.getState().payForRun()).toBe(false);
    const rf = useGame.getState().rf;
    expect(useGame.getState().abandonRun()).toBe(true);
    const after = useGame.getState();
    expect(after.runSpent).toBe(0);
    expect(after.stats.deaths).toBe(1);
    expect(after.stats.runs).toBe(1);
    expect(after.rf).toBe(rf);
    expect(after.payForRun()).toBe(true);
    useGame.getState().reset();
  });

  it("sells keys through the same 25/8/67 split", () => {
    useGame.getState().reset();
    const before = useGame.getState();
    useGame.getState().buyKey(2);
    const after = useGame.getState();
    expect(after.keys).toBe(before.keys + 2);
    expect(after.rf).toBe(before.rf - 2 * KEY_PRICE);
    expect(after.burned - before.burned).toBeCloseTo(2 * KEY_PRICE * 0.25);
    expect(after.raffle - before.raffle).toBeCloseTo(2 * KEY_PRICE * 0.08);
    expect(after.pool - before.pool).toBeCloseTo(2 * KEY_PRICE * 0.67);
    expect(() => useGame.getState().buyKey(MAX_KEYS)).toThrow();
    useGame.getState().reset();
  });

  it("banks gold only from runs that make it home, and never pays it out at once", () => {
    useGame.getState().reset();
    for (const status of ["extracted", "dead"] as const) {
      useGame.getState().payForRun();
      const before = useGame.getState();
      const run = { ...startRun({ seed: 7, flasks: 2, perks: NO_PERKS, weaponDamage: 1, bag: emptyBag() }), status, gold: 120 };
      const report = useGame.getState().finishRun(run);
      const after = useGame.getState();
      expect(report.payout).toBe(0);
      expect(after.rf).toBe(before.rf);
      expect(after.pool).toBe(before.pool);
      expect(after.roundGold).toBe(before.roundGold + (status === "extracted" ? 120 : 0));
    }
    useGame.getState().reset();
  });

  it("closes a round by gold share, then opens the next with a fresh crowd", () => {
    useGame.getState().reset();
    expect(useGame.getState().claimRound()).toBeNull();
    useGame.setState({ pool: 10_000, roundGold: 100, fieldGold: 9_900 });
    const rf = useGame.getState().rf;
    const result = useGame.getState().claimRound()!;
    const after = useGame.getState();
    expect(result.share).toBeCloseTo(0.01);
    expect(result.payout).toBe(100);
    expect(after.rf).toBe(rf + 100);
    expect(after.returned).toBe(100);
    expect(after.round).toBe(2);
    expect(after.roundGold).toBe(0);
    expect(after.fieldGold).toBe(ROUND_SEED_GOLD);
    expect(after.pool).toBeCloseTo(ROUND_SEED_POOL);
    expect(after.stats.bestPayout).toBe(100);
    useGame.getState().reset();
  });

  it("adds a simulated crowd to the pool, the gold and the Friend lot together", () => {
    useGame.getState().reset();
    const before = useGame.getState();
    before.addFieldWeek();
    const after = useGame.getState();
    expect(after.pool).toBeGreaterThan(before.pool);
    expect(after.fieldGold).toBeGreaterThan(before.fieldGold);
    expect(after.raffle).toBeGreaterThan(before.raffle);
    useGame.getState().reset();
  });

  it("resets the meaningless old pool when a pre-round save is migrated", () => {
    const old = migrateSavedState({ rf: 500, pool: 251_234 }, 3) as Record<string, unknown>;
    expect(old.pool).toBe(ROUND_SEED_POOL);
    expect(old.keys).toBe(START_KEYS);
    expect(old.round).toBe(1);
    expect(old.rf).toBe(500);
  });
});

describe("supply, armor and drop-only potions", () => {
  it("never sells the Healing Draught, by rf or by crystals", () => {
    useGame.getState().reset();
    useGame.setState({ rf: 5_000, crystals: 500 });
    expect(() => useGame.getState().buyPotion("heal", "rf")).toThrow();
    expect(() => useGame.getState().buyPotion("heal", "crystals")).toThrow();
    expect(useGame.getState().potions.heal).toBe(0);
    useGame.getState().buyPotion("rage", "rf");
    useGame.getState().buyPotion("regen", "crystals");
    expect(useGame.getState().potions.rage).toBe(1);
    expect(useGame.getState().potions.regen).toBe(1);
    useGame.getState().reset();
  });

  it("carries a Healing Draught found in a run home only if the delver extracts", () => {
    useGame.getState().reset();
    for (const status of ["extracted", "dead"] as const) {
      useGame.getState().payForRun();
      const before = useGame.getState().potions.heal;
      const run = { ...startRun({ seed: 7, flasks: 2, perks: NO_PERKS, weaponDamage: 1, bag: emptyBag() }), status };
      run.bag.heal = 1; run.found.heal = 1;
      useGame.getState().finishRun(run);
      expect(useGame.getState().potions.heal).toBe(before + (status === "extracted" ? 1 : 0));
    }
    useGame.getState().reset();
  });

  it("buys, wears and stacks armor into the run perks", () => {
    useGame.getState().reset();
    useGame.setState({ rf: 2_000, crystals: 100 });
    useGame.getState().buyArmor("chain");
    const s = useGame.getState();
    expect(s.armor).toBe("chain");
    expect(s.rf).toBe(2_000 - ARMORS.chain.price);
    expect(s.crystals).toBe(100 - ARMORS.chain.crystals);
    expect(computeRunPerks(s, { hasFriend: false, family: null }).drainReduce).toBeCloseTo(0.3);
    useGame.getState().equipArmor("none");
    expect(computeRunPerks(useGame.getState(), { hasFriend: false, family: null }).drainReduce).toBe(0);
    // Armor and the Skeleton family perk share the same 80% ceiling.
    useGame.getState().equipArmor("chain");
    expect(computeRunPerks(useGame.getState(), { hasFriend: true, family: 0 }).drainReduce).toBeLessThanOrEqual(0.8);
    useGame.getState().reset();
  });

  it("caps each rarity at its supply and refuses to mint past it", () => {
    expect(RARITY_SUPPLY).toEqual({ common: 999, rare: 111, epic: 69, legendary: 11 });
    for (const r of ["common", "rare", "epic", "legendary"] as const) {
      expect(WORLD_MINT_SEED[r]).toBeLessThan(RARITY_SUPPLY[r]);
      expect(mintsLeft(r, 0)).toBe(RARITY_SUPPLY[r] - WORLD_MINT_SEED[r]);
      expect(mintsLeft(r, 10_000)).toBe(0);
    }
    useGame.getState().reset();
    useGame.setState({ rf: 100_000 });
    const left = mintsLeft("legendary", 0);
    const first = useGame.getState().mint("legendary");
    expect(first.edition).toBe(WORLD_MINT_SEED.legendary + 1);
    for (let i = 1; i < left; i++) useGame.getState().mint("legendary");
    const last = useGame.getState().heroes[0];
    expect(last.edition).toBe(RARITY_SUPPLY.legendary);
    expect(() => useGame.getState().mint("legendary")).toThrow(/minted/);
    expect(useGame.getState().minted.legendary).toBe(left);
    useGame.getState().reset();
  });

  it("never lets a Soul Sigil mint a sold-out rarity", () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(rollSigilRarity(seed, ["common", "rare"])).toMatch(/^(common|rare)$/);
    }
    expect(() => rollSigilRarity(1, [])).toThrow();

    useGame.getState().reset();
    useGame.setState({ minted: { common: 0, rare: 0, epic: 0, legendary: mintsLeft("legendary", 0) } });
    useGame.getState().payForRun();
    const run = { ...startRun({ seed: 7, flasks: 2, perks: NO_PERKS, weaponDamage: 1, bag: emptyBag() }), status: "extracted" as const, sigils: 60 };
    const report = useGame.getState().finishRun(run);
    expect(report.minted).toHaveLength(60);
    expect(report.minted.some(h => h.rarity === "legendary")).toBe(false);
    for (const r of ["common", "rare", "epic", "legendary"] as const) {
      expect(WORLD_MINT_SEED[r] + useGame.getState().minted[r]).toBeLessThanOrEqual(RARITY_SUPPLY[r]);
    }
    useGame.getState().reset();
  });
});

describe("carrying potions into a descent", () => {
  it("takes the potions out of the inventory when the descent starts", () => {
    useGame.getState().reset();
    useGame.setState({ potions: { nightVision: 1, oil: 2, flare: 0, ward: 3, rage: 0, regen: 0, heal: 0 } });
    expect(useGame.getState().payForRun()).toBe(true);
    const s = useGame.getState();
    expect(s.potions).toEqual({ nightVision: 0, oil: 0, flare: 0, ward: 0, rage: 0, regen: 0, heal: 0 });
    expect(s.carried).toMatchObject({ nightVision: 1, oil: 2, ward: 3 });
    expect(s.runId).toBeTruthy();
    useGame.getState().reset();
  });

  it("gives back only what the delver did not use, and found potions only after extracting", () => {
    for (const status of ["extracted", "dead"] as const) {
      useGame.getState().reset();
      useGame.setState({ potions: { nightVision: 0, oil: 0, flare: 0, ward: 2, rage: 0, regen: 0, heal: 0 } });
      useGame.getState().payForRun();
      const paid = useGame.getState();
      const run = { ...startRun({ seed: 7, flasks: 2, perks: NO_PERKS, weaponDamage: 1, bag: { ...paid.carried }, runId: paid.runId ?? undefined }), status };
      run.bag.ward -= 1; run.used.ward = 1;          // one Ward was drunk
      run.bag.rage += 1; run.found.rage = 1;         // one Rage Potion was found
      useGame.getState().finishRun(run);
      const after = useGame.getState().potions;
      expect(after.ward).toBe(1);
      expect(after.rage).toBe(status === "extracted" ? 1 : 0);
    }
    useGame.getState().reset();
  });

  it("loses the pack when the tab is closed mid-descent", () => {
    useGame.getState().reset();
    useGame.setState({ potions: { nightVision: 1, oil: 0, flare: 0, ward: 4, rage: 0, regen: 0, heal: 0 } });
    useGame.getState().payForRun();
    expect(useGame.getState().abandonRun()).toBe(true);
    const s = useGame.getState();
    expect(s.potions.ward).toBe(0);
    expect(s.carried.ward).toBe(0);
    expect(s.runId).toBeNull();
    useGame.getState().reset();
  });

  it("keeps the cents of the best claim across a reload", () => {
    const restored = mergeSavedState({ stats: { bestPayout: 47.68, runs: 3.5, extracts: 2 } }, useGame.getState());
    expect(restored.stats.bestPayout).toBe(47.68);
    expect(restored.stats.runs).toBe(0);
    expect(restored.stats.extracts).toBe(2);
  });
});

