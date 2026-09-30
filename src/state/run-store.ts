import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { applyAction, startRun, type RunAction, type RunSetup, type RunState } from "@/game/run";
import { floorHeight, floorWidth } from "@/game/config";
import { isSpecies } from "@/game/enemies";
import { POTION_IDS } from "@/game/catalog";
import { useGame } from "@/state/store";

type RunStore = {
  run: RunState | null;
  prevPlayer: { x: number; y: number } | null;
  start: (setup: RunSetup) => void;
  act: (action: RunAction) => RunState | null;
  clear: () => void;
};

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function validBag(value: unknown): boolean {
  const bag = object(value);
  return POTION_IDS.every(id => Number.isSafeInteger(bag[id]) && (bag[id] as number) >= 0);
}

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const ITEM_KINDS = ["gold", "crystal", "oil", "chest", "vault", "hoard"];
const THEMES = ["catacombs", "mycelium", "cinderworks", "hollowglass"];

/** Floors 1-3 are bigger than the rest, so a point is judged against the floor it is on. */
const isPointIn = (value: unknown, w: number, h: number) => {
  const p = object(value);
  return Number.isSafeInteger(p.x) && Number.isSafeInteger(p.y)
    && (p.x as number) >= 0 && (p.x as number) < w && (p.y as number) >= 0 && (p.y as number) < h;
};

const validItem = (w: number, h: number) => (value: unknown) => {
  const item = object(value);
  return isPointIn(item, w, h) && Number.isSafeInteger(item.id) && ITEM_KINDS.includes(item.kind as string);
};

const validDimling = (w: number, h: number) => (value: unknown) => {
  const d = object(value);
  const size = d.size === undefined ? 1 : d.size;
  const count = (n: unknown) => n === undefined || (Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 10);
  return isPointIn(d, w, h) && Number.isSafeInteger(d.id) && finite(d.hp) && finite(d.maxHp) && typeof d.awake === "boolean"
    && Number.isSafeInteger(size) && (size as number) >= 1 && (size as number) <= 3
    && (d.x as number) + (size as number) <= w && (d.y as number) + (size as number) <= h
    && (d.boss === undefined || typeof d.boss === "boolean")
    // Creature fields added with the telegraphed attacks; saves from before them omit all of these.
    && (d.species === undefined || isSpecies(d.species))
    && (d.phase === undefined || d.phase === "idle" || d.phase === "windup" || d.phase === "recovery")
    && count(d.windupLeft) && count(d.cooldown)
    && (d.aim === undefined || d.aim === null || (Number.isSafeInteger(object(d.aim).x) && Number.isSafeInteger(object(d.aim).y)
      && Math.abs(object(d.aim).x as number) + Math.abs(object(d.aim).y as number) === 1));
};

/** A saved descent must be complete enough to play on; anything else is dropped instead of crashing the game. */
export function validSavedRun(value: unknown): value is RunState {
  const run = object(value);
  const floor = object(run.floor);
  const player = object(run.player);
  const rng = object(run.rng);
  const perks = object(run.perks);
  const depth = Number.isSafeInteger(run.depth) && (run.depth as number) >= 1 ? run.depth as number : 1;
  const W = floorWidth(depth), H = floorHeight(depth);
  const at = (p: unknown) => (object(p).y as number) * W + (object(p).x as number);
  return Number.isSafeInteger(run.depth) && (run.depth as number) >= 1
    && Number.isSafeInteger(run.deepest) && (run.deepest as number) >= 1
    && Number.isSafeInteger(rng.s)
    && floor.w === W && floor.h === H
    && floor.depth === run.depth && THEMES.includes(floor.theme as string) && typeof floor.revealed === "boolean"
    && Array.isArray(floor.tiles) && floor.tiles.length === W * H
    && floor.tiles.every(tile => tile === 0 || tile === 1)
    && Array.isArray(floor.seen) && floor.seen.length === floor.tiles.length
    && floor.seen.every(v => v === 0 || v === 1)
    && isPointIn(floor.spawn, W, H) && isPointIn(floor.stairs, W, H)
    && floor.tiles[at(floor.spawn)] === 1
    && floor.tiles[at(floor.stairs)] === 1
    && Array.isArray(floor.items) && floor.items.every(validItem(W, H))
    && Array.isArray(floor.dimlings) && floor.dimlings.every(validDimling(W, H))
    && isPointIn(player, W, H)
    && floor.tiles[at(player)] === 1
    && ["left", "right", "up", "down"].includes(player.facing as string)
    && ["playing", "dead", "extracted"].includes(run.status as string)
    && [run.light, run.startLight, run.steps, run.kills, run.gold, run.crystals, run.sigils,
      run.tickets, run.ticketChance, run.ward, run.nightVision, run.weaponDamage].every(finite)
    && ["goldPct", "crystalPct", "startLight", "stepDiscount", "damage", "findPct",
      "radius", "drainReduce", "regenEvery", "freeStepChance", "lightOnKill"]
      .every(key => finite(perks[key]))
    && typeof perks.stealth === "boolean"
    && validBag(run.bag) && validBag(run.used) && validBag(run.found)
    && Array.isArray(run.messages) && run.messages.every(m => typeof m === "string")
    && Array.isArray(run.events) && run.events.every(e => typeof e === "string")
    && (run.runId === undefined || typeof run.runId === "string");
}

/** Books a finished descent. Safe to call again: a result settles only once, and a stale one is ignored. */
export function settle(run: RunState) {
  try {
    useGame.getState().finishRun(run);
  } catch {
    // Nothing to settle: it was booked already, or it belongs to another payment.
  }
}

export const useRun = create<RunStore>()(persist((set, get) => ({
  run: null,
  prevPlayer: null,
  start: setup => set({ run: startRun(setup), prevPlayer: null }),
  act: action => {
    const run = get().run;
    if (!run) return null;
    const next = applyAction(run, action);
    if (next !== run) set({ run: next, prevPlayer: { x: run.player.x, y: run.player.y } });
    // The result is banked the moment the descent ends. Leaving the result screen only closes it.
    if (next.status !== "playing" && run.status === "playing") settle(next);
    return next;
  },
  clear: () => set({ run: null, prevPlayer: null }),
}), {
  name: "emberdeep-run-v1",
  storage: createJSONStorage(() => sessionStorage),
  merge: (saved, current) => {
    const data = object(saved);
    const run = validSavedRun(data.run) ? data.run : null;
    const prev = object(data.prevPlayer);
    const prevPlayer = run && Number.isSafeInteger(prev.x) && Number.isSafeInteger(prev.y)
      ? { x: prev.x as number, y: prev.y as number } : null;
    return { ...current, run, prevPlayer };
  },
}));
