import { HP_SCALE } from "./config";
import { tuning } from "./tuning";

/**
 * Things to smash. They stand in the way like a creature: walk into one to hit it, and when it breaks it gives gold,
 * experience and sometimes oil or a piece of gear. They never move or hit back, and they never block the way for good.
 * Hit points use the same units as creatures (see HP_SCALE): a dagger hits for 16, so a crate takes two blows.
 */
export type PropKind = "urn" | "crate" | "barrel";

export type PropDef = {
  id: PropKind;
  name: string;
  hp: number;
  /** Gold, before the depth multiplier and perks. The ranges are narrow on purpose: gold from these is steady. */
  gold: readonly [number, number];
  xp: readonly [number, number];
  /** Light (oil) it may hold. Whether it does depends on how low the lantern is (see oilChance). */
  oil: readonly [number, number];
  /** Chance it holds a piece of gear. */
  gear: number;
  blurb: string;
};

export const PROPS: readonly PropDef[] = [
  { id: "urn", name: "Clay Urn", hp: Math.round(1.5 * HP_SCALE), gold: [2, 3], xp: [1, 2], oil: [6, 10], gear: 0, blurb: "Brittle. Gold and a little oil." },
  { id: "crate", name: "Wooden Crate", hp: 3 * HP_SCALE, gold: [4, 6], xp: [3, 4], oil: [9, 15], gear: 0.06, blurb: "Takes a couple of blows. Might hide a tool." },
  { id: "barrel", name: "Iron-bound Barrel", hp: 5 * HP_SCALE, gold: [8, 10], xp: [5, 7], oil: [12, 21], gear: 0.16, blurb: "Tough, and the best of the three." },
];

export const propDef = (kind: PropKind): PropDef => PROPS.find(p => p.id === kind) ?? PROPS[0];

export const isPropKind = (value: unknown): value is PropKind => PROPS.some(p => p.id === value);

/** How many of each a floor holds before the bigger floors' scale: (urns, crates, barrels). */
export const propCounts = (depth: number): Record<PropKind, number> => ({
  urn: 2 + Math.floor(depth / 3),
  crate: 1 + (depth >= 2 ? 0.5 : 0),
  barrel: 0.5 + (depth >= 4 ? 0.5 : 0),
});

/**
 * Chance that a broken prop holds oil. It is higher the lower the lantern is, so a delver running dry finds a little
 * more help: 30% with the lantern full, up to 90% with it empty (see tuning.ts).
 */
export function oilChance(light: number, startLight: number) {
  const [full, empty] = tuning.propOilChance;
  return full + (empty - full) * (1 - lanternFullness(light, startLight));
}

/** How full the lantern is, from 0 to 1, against the light the descent started with (at least one flask). */
export const lanternFullness = (light: number, startLight: number) => Math.min(1, Math.max(0, light / Math.max(startLight, 80)));

/** Gear found in props. Each adds to every blow for the rest of the descent; the pickaxe also breaks any prop in one blow. */
export type GearId = "sword" | "axe" | "pickaxe";

export const GEAR: Record<GearId, { name: string; damage: number; blurb: string }> = {
  sword: { name: "Rusty Sword", damage: 6, blurb: "+6 damage" },
  axe: { name: "Hand Axe", damage: 5, blurb: "+5 damage" },
  pickaxe: { name: "Miner's Pickaxe", damage: 4, blurb: "+4 damage, breaks any prop in one blow" },
};

export const GEAR_IDS = Object.keys(GEAR) as GearId[];

export const isGearId = (value: unknown): value is GearId => GEAR_IDS.includes(value as GearId);

/** Damage all gear a delver carries adds to a blow. */
export const gearDamage = (gear: readonly GearId[] | undefined) => (gear ?? []).reduce((n, g) => n + (GEAR[g]?.damage ?? 0), 0);

/** Experience a duplicate piece of gear is worth instead. */
export const GEAR_DUPLICATE_XP = 12;
