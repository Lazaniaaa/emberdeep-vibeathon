import { describe, expect, it } from "vitest";
import {
  CAMP_H, CAMP_PROPS, CAMP_SPAWN, CAMP_W, PLAZA, STATIONS, campSolid, facingOf, facingStation, isCampWall, pathTo, pathToStation,
  stationAt, stationNear, stepInCamp, terrainAt,
} from "./camp";
import { NPC_STEP_MS, advanceCrowd, createCrowd, npcPosition } from "./camp-crowd";
import { SPRITES } from "@/render/camp-renderer";
import { PALETTE, SPRITE_SIZE } from "@/render/pixel-art";
import { ITEM_ART, portraitArt } from "@/render/item-art";
import { CLASS_IDS, RARITIES } from "./catalog";

/** Every free cell the delver can reach on foot from the spawn point. */
function reachable() {
  const seen = new Set<number>([CAMP_SPAWN.y * CAMP_W + CAMP_SPAWN.x]);
  const queue = [{ ...CAMP_SPAWN }];
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = stepInCamp(p, dx, dy);
      const key = next.y * CAMP_W + next.x;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}

describe("camp", () => {
  it("starts the delver on open ground in the plaza", () => {
    expect(campSolid(CAMP_SPAWN.x, CAMP_SPAWN.y)).toBe(false);
    expect(terrainAt(CAMP_SPAWN.x, CAMP_SPAWN.y)).toBe("plaza");
    expect(isCampWall(-1, 0)).toBe(true);
    expect(isCampWall(CAMP_W, CAMP_H - 1)).toBe(true);
    expect(terrainAt(PLAZA.x, PLAZA.y)).toBe("plaza");
  });

  it("keeps buildings, props, water and cliffs solid, and never stacks two things on one tile", () => {
    const taken = new Set<string>();
    for (const thing of [...STATIONS, ...CAMP_PROPS]) {
      expect(campSolid(thing.x, thing.y)).toBe(true);
      expect(isCampWall(thing.x, thing.y)).toBe(false);
      const key = `${thing.x},${thing.y}`;
      expect(taken.has(key)).toBe(false);
      taken.add(key);
    }
    expect(stationAt(20, 5)?.id).toBe("gate");
    expect(stationAt(20, 6)).toBeNull();
    expect(terrainAt(5, 14)).toBe("water");
    expect(campSolid(5, 14)).toBe(true);
  });

  it("lets the delver walk up to every building", () => {
    const cells = reachable();
    for (const s of STATIONS) {
      const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (s.y + dy) * CAMP_W + s.x + dx);
      expect(neighbours.some(k => cells.has(k))).toBe(true);
    }
  });

  it("does not move the delver into a wall or a building, but still turns them", () => {
    expect(stepInCamp({ x: 2, y: 10 }, -1, 0)).toEqual({ x: 2, y: 10 });
    expect(stepInCamp({ x: 20, y: 6 }, 0, -1)).toEqual({ x: 20, y: 6 });
    expect(stepInCamp({ x: 20, y: 17 }, 1, 0)).toEqual({ x: 21, y: 17 });
    expect(facingOf(-1, 0, "up")).toBe("left");
    expect(facingOf(0, 0, "down")).toBe("down");
  });

  it("offers the building you face first, then any that touches you", () => {
    expect(stationNear({ x: 20, y: 6 }, "up")?.id).toBe("gate");
    expect(stationNear({ x: 20, y: 6 }, "left")?.id).toBe("gate");
    expect(stationNear(CAMP_SPAWN, "up")).toBeNull();
  });

  it("plans a walk around obstacles to a tapped tile and to a building", () => {
    const path = pathTo(CAMP_SPAWN, { x: 20, y: 12 })!;
    expect(path.at(-1)).toEqual({ x: 20, y: 12 });
    // The fire sits between them, so the walk has to detour and cannot be a straight line.
    expect(path.length).toBeGreaterThan(5);
    for (const cell of path) expect(campSolid(cell.x, cell.y)).toBe(false);
    expect(pathTo(CAMP_SPAWN, { x: 20, y: 14 })).toBeNull();
    expect(pathTo(CAMP_SPAWN, CAMP_SPAWN)).toEqual([]);

    for (const s of STATIONS) {
      const walk = pathToStation(CAMP_SPAWN, s)!;
      expect(walk).not.toBeNull();
      const end = walk.at(-1) ?? CAMP_SPAWN;
      expect(Math.abs(end.x - s.x) + Math.abs(end.y - s.y)).toBe(1);
      expect(stationNear({ x: end.x, y: end.y }, facingStation(end, s))?.id).toBe(s.id);
    }
    expect(pathToStation({ x: 20, y: 6 }, STATIONS[0])).toEqual([]);
  });
});

describe("camp crowd", () => {
  it("keeps every ambient delver on open, separate ground", () => {
    const crowd = createCrowd(11, 0);
    for (let now = 0; now < 120_000; now += 250) {
      advanceCrowd(crowd, now, [{ x: CAMP_SPAWN.x, y: CAMP_SPAWN.y }]);
      const seen = new Set<string>();
      for (const npc of crowd.npcs) {
        expect(campSolid(npc.x, npc.y)).toBe(false);
        const key = `${npc.x},${npc.y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(Math.abs(npc.x - npc.homeX) + Math.abs(npc.y - npc.homeY)).toBeLessThanOrEqual(6);
      }
    }
  });

  it("actually wanders, chats and lets the elder pass on tips", () => {
    const crowd = createCrowd(3, 0);
    const start = crowd.npcs.map(n => `${n.x},${n.y}`);
    const spoke = new Set<string>();
    for (let now = 0; now < 60_000; now += 250) {
      advanceCrowd(crowd, now);
      for (const n of crowd.npcs) if (n.say) spoke.add(n.say);
    }
    expect(crowd.npcs.filter((n, i) => `${n.x},${n.y}` !== start[i] && n.kind !== "elder").length).toBeGreaterThan(3);
    expect(spoke.size).toBeGreaterThan(3);
  });

  it("tweens a step over the step time and stays put otherwise", () => {
    const crowd = createCrowd(5, 0);
    const npc = crowd.npcs[0];
    npc.fromX = npc.x - 1; npc.fromY = npc.y; npc.movedAt = 1000;
    expect(npcPosition(npc, 1000).x).toBeCloseTo(npc.x - 1);
    expect(npcPosition(npc, 1000 + NPC_STEP_MS / 2).x).toBeCloseTo(npc.x - 0.5);
    expect(npcPosition(npc, 1000 + NPC_STEP_MS).walking).toBe(false);
  });
});

describe("camp art", () => {
  it("draws every sprite as a full 16-wide grid using known colors", () => {
    for (const [name, rows] of Object.entries(SPRITES)) {
      expect(rows, name).toHaveLength(SPRITE_SIZE);
      rows.forEach((row, i) => {
        expect(row.length, `${name} row ${i}`).toBe(SPRITE_SIZE);
        for (const ch of row) if (ch !== ".") expect(PALETTE[ch], `${name} row ${i} '${ch}'`).toBeDefined();
      });
    }
  });

  it("gives every weapon, armor, potion and Delver a well-formed picture", () => {
    const check = (name: string, rows: readonly string[]) => {
      expect(rows, name).toHaveLength(SPRITE_SIZE);
      rows.forEach((row, i) => {
        expect(row.length, `${name} row ${i}`).toBe(SPRITE_SIZE);
        for (const ch of row) if (ch !== ".") expect(PALETTE[ch], `${name} row ${i} '${ch}'`).toBeDefined();
      });
      expect(rows.join("").replace(/\./g, "").length, `${name} is not empty`).toBeGreaterThan(20);
    };
    for (const [name, rows] of Object.entries(ITEM_ART)) check(name, rows);
    for (const kind of [...CLASS_IDS, "wanderer" as const]) for (const rarity of RARITIES) check(`${kind}/${rarity}`, portraitArt(kind, rarity));
    expect(portraitArt("seer", "legendary").join("")).not.toBe(portraitArt("seer", "common").join(""));
  });
});
