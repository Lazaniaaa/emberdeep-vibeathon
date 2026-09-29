import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { applyAction, startRun, type RunAction, type RunSetup, type RunState } from "@/game/run";
import { MAP_H, MAP_W } from "@/game/config";
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

const isPoint = (value: unknown) => {
  const p = object(value);
  return Number.isSafeInteger(p.x) && Number.isSafeInteger(p.y)
    && (p.x as number) >= 0 && (p.x as number) < MAP_W && (p.y as number) >= 0 && (p.y as number) < MAP_H;
};

function validItem(value: unknown) {
  const item = object(value);
  return isPoint(item) && Number.isSafeInteger(item.id) && ITEM_KINDS.includes(item.kind as string);
}

function validDimling(value: unknown) {
  const d = object(value);
  const size = d.size === undefined ? 1 : d.size;
  return isPoint(d) && Number.isSafeInteger(d.id) && finite(d.hp) && finite(d.maxHp) && typeof d.awake === "boolean"
    && Number.isSafeInteger(size) && (size as number) >= 1 && (size as number) <= 3
    && (d.x as number) + (size as number) <= MAP_W && (d.y as number) + (size as number) <= MAP_H
    && (d.boss === undefined || typeof d.boss === "boolean");
}

/** A saved descent must be complete enough to play on; anything else is dropped instead of crashing the game. */
export function validSavedRun(value: unknown): value is RunState {
  const run = object(value);
  const floor = object(run.floor);
  const player = object(run.player);
  const rng = object(run.rng);
  const perks = object(run.perks);
  return Number.isSafeInteger(run.depth) && (run.depth as number) >= 1
    && Number.isSafeInteger(run.deepest) && (run.deepest as number) >= 1
    && Number.isSafeInteger(rng.s)
    && floor.w === MAP_W && floor.h === MAP_H
    && floor.depth === run.depth && THEMES.includes(floor.theme as string) && typeof floor.revealed === "boolean"
    && Array.isArray(floor.tiles) && floor.tiles.length === MAP_W * MAP_H
    && floor.tiles.every(tile => tile === 0 || tile === 1)
    && Array.isArray(floor.seen) && floor.seen.length === floor.tiles.length
    && floor.seen.every(v => v === 0 || v === 1)
    && isPoint(floor.spawn) && isPoint(floor.stairs)
    && floor.tiles[(floor.spawn as { y: number }).y * MAP_W + (floor.spawn as { x: number }).x] === 1
    && floor.tiles[(floor.stairs as { y: number }).y * MAP_W + (floor.stairs as { x: number }).x] === 1
    && Array.isArray(floor.items) && floor.items.every(validItem)
    && Array.isArray(floor.dimlings) && floor.dimlings.every(validDimling)
    && isPoint(player)
    && floor.tiles[(player.y as number) * MAP_W + (player.x as number)] === 1
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
