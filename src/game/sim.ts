import { FLASK_PRICE, KEY_PRICE, POOL_SHARE } from "./config";
import { NO_PERKS, WEAPONS, mergePerks, type Perks } from "./catalog";
import { dimlingDistance, distances, idx, isFloor, visibleSet, type Point } from "./dungeon";
import { settleRound } from "./economy";
import { applyAction, bossAlive, currentRadius, currentStepCost, emptyBag, onRift, onStairs, startRun, type RunState } from "./run";

/** Route one step toward `goal` using BFS distances computed from the goal. */
function stepToward(state: RunState, goal: Point) {
  const dist = distances(state.floor, goal);
  const { x, y } = state.player;
  let best: Point | null = null, bestD = dist[idx(x, y)];
  for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
    const nx = x + d.x, ny = y + d.y;
    if (nx < 0 || ny < 0 || nx >= state.floor.w || ny >= state.floor.h) continue;
    const v = dist[idx(nx, ny)];
    if (v >= 0 && v < bestD) { bestD = v; best = d; }
  }
  return best;
}

/** `banked` is the gold that counts toward a round: what was carried out alive. */
export type SimResult = { spent: number; banked: number; depth: number; died: boolean; gold: number };

/** One descent costs its flasks plus one entry key. */
const runCost = (flasks: number) => flasks * FLASK_PRICE + KEY_PRICE;

/**
 * A cautious bot that sees the whole floor. It gathers loot while it can still
 * afford the walk back, descends when it has a comfortable reserve, otherwise extracts.
 */
export function simulateRun(seed: number, flasks = 1, perks: Perks = NO_PERKS, greed = 1.6): SimResult {
  let s = startRun({ seed, flasks, perks: mergePerks(perks), weaponDamage: WEAPONS.dagger.damage, bag: emptyBag() });
  for (let turn = 0; turn < 2_000 && s.status === "playing"; turn++) {
    const cost = currentStepCost(s);
    const home = distances(s.floor, s.floor.spawn);
    const backCost = home[idx(s.player.x, s.player.y)] * cost;
    const reserve = backCost * greed + 6;
    const stairsDist = distances(s.floor, s.floor.stairs)[idx(s.player.x, s.player.y)];

    if (onStairs(s) && !bossAlive(s) && s.light > reserve + 45 * cost) { s = applyAction(s, { type: "descend" }); continue; }
    if (s.light <= reserve) {
      if (onRift(s)) { s = applyAction(s, { type: "extract" }); break; }
      const d = stepToward(s, s.floor.spawn);
      s = d ? applyAction(s, { type: "move", dx: d.x, dy: d.y }) : applyAction(s, { type: "wait" });
      continue;
    }
    const fromHere = distances(s.floor, s.player);
    const target = s.floor.items
      .map(i => ({ i, d: fromHere[idx(i.x, i.y)] }))
      .filter(t => t.d > 0)
      .sort((a, b) => a.d - b.d)[0];
    const goal = target ? target.i : stairsDist > 0 ? s.floor.stairs : s.floor.spawn;
    if (!target && onStairs(s)) {
      if (onRift(s)) { s = applyAction(s, { type: "extract" }); break; }
      const d = stepToward(s, s.floor.spawn);
      s = d ? applyAction(s, { type: "move", dx: d.x, dy: d.y }) : applyAction(s, { type: "wait" });
      continue;
    }
    const d = stepToward(s, goal);
    s = d ? applyAction(s, { type: "move", dx: d.x, dy: d.y }) : applyAction(s, { type: "wait" });
  }
  const died = s.status !== "extracted";
  return { spent: runCost(flasks), banked: died ? 0 : s.gold, depth: s.deepest, died, gold: s.gold };
}

const DIRS4: readonly Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

/** BFS over cells the bot has actually seen; it cannot plan through fog. */
function knownDistances(state: RunState, from: Point) {
  const { floor } = state;
  const dist = new Array<number>(floor.w * floor.h).fill(-1);
  const queue: Point[] = [from];
  dist[idx(from.x, from.y)] = 0;
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    for (const d of DIRS4) {
      const nx = p.x + d.x, ny = p.y + d.y;
      if (!isFloor(floor, nx, ny) || !floor.seen[idx(nx, ny)] || dist[idx(nx, ny)] !== -1) continue;
      dist[idx(nx, ny)] = dist[idx(p.x, p.y)] + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

function stepAlong(state: RunState, dist: number[]) {
  const { x, y } = state.player;
  let best: Point | null = null, bestD = dist[idx(x, y)];
  for (const d of DIRS4) {
    const v = dist[idx(x + d.x, y + d.y)];
    if (v >= 0 && v < bestD) { bestD = v; best = d; }
  }
  return best;
}

/**
 * A bot that plays under fog of war like a careful human: it only knows loot it has seen,
 * explores the nearest unexplored edge, fights what blocks it and heads home on a reserve.
 * It never buys potions, so it does not use Night Vision as a safety net.
 */
export function simulateFogRun(seed: number, flasks = 1, perks: Perks = NO_PERKS, greed = 1.6, weaponDamage = WEAPONS.dagger.damage): SimResult {
  let s = startRun({ seed, flasks, perks: mergePerks(perks), weaponDamage, bag: emptyBag() });
  let sawItems = new Set<number>();
  let floorDepth = s.depth;
  const move = (d: Point | null) => (d ? applyAction(s, { type: "move", dx: d.x, dy: d.y }) : applyAction(s, { type: "wait" }));

  for (let turn = 0; turn < 3_000 && s.status === "playing"; turn++) {
    if (s.depth !== floorDepth) { floorDepth = s.depth; sawItems = new Set(); }
    const cost = currentStepCost(s);
    const known = knownDistances(s, s.player);
    const home = knownDistances(s, s.floor.spawn);
    const backCost = Math.max(0, home[idx(s.player.x, s.player.y)]) * cost;
    const reserve = backCost * greed + 6;

    const seenNow = visibleSet(s.floor, s.player, currentRadius(s));
    for (const i of s.floor.items) if (seenNow.has(idx(i.x, i.y))) sawItems.add(i.id);

    // An awake dimling next to us drinks light every turn; hit it instead of walking away.
    const foe = s.floor.dimlings.find(d => d.awake && dimlingDistance(d, s.player) === 1);
    if (foe && s.light > reserve) {
      // Aim at the tile of the creature that touches us, which matters for the 2x2 boss.
      const touching = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }].find(o => dimlingDistance(foe, { x: s.player.x + o.x, y: s.player.y + o.y }) === 0)!;
      s = move(touching); continue;
    }

    const stairsKnown = s.floor.seen[idx(s.floor.stairs.x, s.floor.stairs.y)] === 1;
    if (onStairs(s) && !bossAlive(s) && s.light > reserve + 45 * cost) { s = applyAction(s, { type: "descend" }); continue; }

    const goHome = () => {
      if (onRift(s)) { s = applyAction(s, { type: "extract" }); return true; }
      s = move(stepAlong(s, home));
      return false;
    };
    if (s.light <= reserve) { if (goHome()) break; continue; }

    const target = s.floor.items
      .filter(i => sawItems.has(i.id) && known[idx(i.x, i.y)] > 0)
      .sort((a, b) => known[idx(a.x, a.y)] - known[idx(b.x, b.y)])[0];
    if (target) { s = move(stepAlong(s, knownDistances(s, target))); continue; }

    let frontier: Point | null = null, best = Infinity;
    for (let y = 0; y < s.floor.h; y++) for (let x = 0; x < s.floor.w; x++) {
      const d = known[idx(x, y)];
      if (d <= 0 || d >= best) continue;
      const open = DIRS4.some(o => {
        const nx = x + o.x, ny = y + o.y;
        return nx >= 0 && ny >= 0 && nx < s.floor.w && ny < s.floor.h && !s.floor.seen[idx(nx, ny)];
      });
      if (open) { best = d; frontier = { x, y }; }
    }
    if (frontier) { s = move(stepAlong(s, knownDistances(s, frontier))); continue; }

    // Floor fully explored: go down if we can afford it, otherwise leave.
    if (stairsKnown && !bossAlive(s) && s.light > reserve + 45 * cost) {
      if (onStairs(s)) { s = applyAction(s, { type: "descend" }); continue; }
      s = move(stepAlong(s, knownDistances(s, s.floor.stairs)));
      continue;
    }
    if (goHome()) break;
  }
  const died = s.status !== "extracted";
  return { spent: runCost(flasks), banked: died ? 0 : s.gold, depth: s.deepest, died, gold: s.gold };
}

export type SimSummary = { goldPerRf: number; deathRate: number; avgDepth: number };

function summarize(runs: number, play: (seed: number) => SimResult): SimSummary {
  let spent = 0, banked = 0, deaths = 0, depth = 0;
  for (let i = 0; i < runs; i++) {
    const r = play(1_000 + i * 7_919);
    spent += r.spent; banked += r.banked; depth += r.depth; if (r.died) deaths++;
  }
  return { goldPerRf: banked / spent, deathRate: deaths / runs, avgDepth: depth / runs };
}

export function simulateMany(runs: number, flasks = 1, perks: Perks = NO_PERKS, greed = 1.6) {
  return summarize(runs, seed => simulateRun(seed, flasks, perks, greed));
}

export type Cohort = { name: string; perks: Perks; flasks: number; share: number };

export type RoundSim = {
  /** Pool paid out divided by RF spent, per cohort. Nothing here is a promised rate. */
  rtp: Record<string, number>;
  /** Everything paid out divided by everything spent. */
  overall: number;
  /** Each cohort's part of all banked gold, which is also its part of the pool. */
  goldShare: Record<string, number>;
};

/**
 * Plays many descents by a mixed crowd, pools 67% of what they all spend and splits it by banked
 * gold, exactly as a closed round does. Loot never depends on the pool, so each cohort's runs are
 * played once and recycled. Bots rarely die, so returns here are an upper bound for skilled play.
 */
export function simulateRound(cohorts: Cohort[], runs = 2_000, samples = 30): RoundSim {
  const results = cohorts.map(c => {
    const list: SimResult[] = [];
    for (let i = 0; i < samples; i++) list.push(simulateFogRun(1_000 + i * 7_919, c.flasks, c.perks));
    return list;
  });
  const total = cohorts.reduce((n, c) => n + c.share, 0);
  const spent = cohorts.map(() => 0), gold = cohorts.map(() => 0), seen = cohorts.map(() => 0);
  for (let n = 0; n < runs; n++) {
    // Golden-ratio sequence: a deterministic, evenly mixed order of cohorts.
    const pick = ((n + 1) * 0.6180339887 % 1) * total;
    let acc = 0, at = cohorts.length - 1;
    for (let i = 0; i < cohorts.length; i++) { acc += cohorts[i].share; if (pick < acc) { at = i; break; } }
    const run = results[at][seen[at]++ % samples];
    spent[at] += run.spent; gold[at] += run.banked;
  }
  const totalSpent = spent.reduce((a, b) => a + b, 0);
  const totalGold = gold.reduce((a, b) => a + b, 0);
  const pool = totalSpent * POOL_SHARE;
  const rtp: Record<string, number> = {}, goldShare: Record<string, number> = {};
  let paid = 0;
  cohorts.forEach((c, i) => {
    // Settle each cohort as one delver holding its gold against everyone else's.
    const payout = settleRound(pool, gold[i], totalGold - gold[i]).payout;
    paid += payout;
    rtp[c.name] = payout / spent[i];
    goldShare[c.name] = totalGold > 0 ? gold[i] / totalGold : 0;
  });
  return { rtp, overall: paid / totalSpent, goldShare };
}

export function simulateFogMany(runs: number, flasks = 1, perks: Perks = NO_PERKS, greed = 1.6) {
  return summarize(runs, seed => simulateFogRun(seed, flasks, perks, greed));
}
