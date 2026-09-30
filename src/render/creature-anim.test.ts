import { describe, expect, it } from "vitest";
import type { Dimling } from "@/game/dungeon";
import { CREATURE_MOVE_MS, CreatureAnimator, TURN_MS, facingAngle, restPose } from "./creature-anim";

const creature = (over: Partial<Dimling> = {}): Dimling => ({
  id: 1, x: 5, y: 5, hp: 16, maxHp: 16, awake: true, species: "wickgnaw", phase: "idle", windupLeft: 0, cooldown: 0, aim: null, ...over,
});

describe("CreatureAnimator", () => {
  it("shows a creature standing on its tile when it has not moved", () => {
    const a = new CreatureAnimator();
    const d = creature();
    a.update("run:1", [d], { x: 5, y: 9 }, 1000);
    const pose = a.pose(d, 1000);
    expect(pose.x).toBe(5);
    expect(pose.y).toBe(5);
    expect(pose.lift).toBe(0);
  });

  it("glides between tiles with a hop instead of jumping", () => {
    const a = new CreatureAnimator();
    a.update("run:1", [creature()], { x: 9, y: 5 }, 1000);
    const moved = creature({ x: 6 });
    a.update("run:1", [moved], { x: 9, y: 5 }, 2000);
    const start = a.pose(moved, 2000);
    const middle = a.pose(moved, 2000 + CREATURE_MOVE_MS / 2);
    const end = a.pose(moved, 2000 + CREATURE_MOVE_MS);
    expect(start.x).toBeCloseTo(5, 5);
    expect(middle.x).toBeGreaterThan(5.3);
    expect(middle.x).toBeLessThan(5.7);
    expect(middle.lift).toBeGreaterThan(2);
    expect(end.x).toBe(6);
    expect(end.lift).toBe(0);
  });

  it("carries on from where the picture is when a second step starts mid-glide", () => {
    const a = new CreatureAnimator();
    a.update("run:1", [creature()], { x: 9, y: 5 }, 1000);
    a.update("run:1", [creature({ x: 6 })], { x: 9, y: 5 }, 2000);
    const seen = a.pose(creature({ x: 6 }), 2000 + CREATURE_MOVE_MS / 2).x;
    a.update("run:1", [creature({ x: 7 })], { x: 9, y: 5 }, 2000 + CREATURE_MOVE_MS / 2);
    expect(a.pose(creature({ x: 7 }), 2000 + CREATURE_MOVE_MS / 2).x).toBeCloseTo(seen, 5);
  });

  it("snaps to the tile when a creature is carried far, such as onto a new floor", () => {
    const a = new CreatureAnimator();
    a.update("run:1", [creature()], { x: 9, y: 5 }, 1000);
    const far = creature({ x: 20, y: 12 });
    a.update("run:1", [far], { x: 9, y: 5 }, 2000);
    expect(a.pose(far, 2000).x).toBe(20);
    expect(a.pose(far, 2000).y).toBe(12);
  });

  it("starts afresh on a new floor", () => {
    const a = new CreatureAnimator();
    a.update("run:1", [creature()], { x: 9, y: 5 }, 1000);
    const next = creature({ x: 6 });
    a.update("run:2", [next], { x: 9, y: 5 }, 2000);
    expect(a.pose(next, 2000).x).toBe(6);
  });

  it("turns an awake top-down creature to face the delver, by the short way round", () => {
    const a = new CreatureAnimator();
    const d = creature();
    a.update("run:1", [d], { x: 5, y: 9 }, 1000);
    expect(a.pose(d, 1000).rot).toBeCloseTo(0, 5);
    a.update("run:1", [d], { x: 9, y: 5 }, 2000);
    expect(a.pose(d, 2000 + TURN_MS).rot).toBeCloseTo(facingAngle({ x: 1, y: 0 }), 5);
    const half = a.pose(d, 2000 + TURN_MS / 2).rot;
    expect(half).toBeLessThan(0);
    expect(half).toBeGreaterThan(facingAngle({ x: 1, y: 0 }));
    // Turning from facing right to facing left goes through 180 degrees, never a full circle back.
    a.update("run:1", [d], { x: 1, y: 5 }, 3000);
    const turning = a.pose(d, 3000 + TURN_MS / 2).rot;
    expect(Math.abs(turning)).toBeGreaterThan(Math.PI / 2);
    expect(Math.abs(turning)).toBeLessThanOrEqual(Math.PI + 1e-9);
  });

  it("leaves a sleeping creature, and the front-on pictures, facing down", () => {
    const a = new CreatureAnimator();
    const asleep = creature({ awake: false });
    const bell = creature({ id: 2, species: "fourfold-bell" });
    a.update("run:1", [asleep, bell], { x: 9, y: 5 }, 1000);
    expect(a.pose(asleep, 1000 + TURN_MS).rot).toBeCloseTo(0, 5);
    expect(a.pose(bell, 1000 + TURN_MS).rot).toBeCloseTo(0, 1);
  });

  it("trembles only while winding up, more as the blow gets closer", () => {
    const a = new CreatureAnimator();
    const calm = creature();
    const first = creature({ phase: "windup", windupLeft: 2 });
    const last = creature({ phase: "windup", windupLeft: 1 });
    a.update("run:1", [calm], { x: 6, y: 5 }, 1000);
    const still = a.pose(calm, 1013);
    expect(still.offX).toBe(0);
    expect(still.offY).toBe(0);
    let early = 0, late = 0;
    for (let t = 0; t < 400; t += 7) {
      early = Math.max(early, Math.abs(a.pose({ ...first, species: "snaretoad" }, 1000 + t).offX));
      late = Math.max(late, Math.abs(a.pose({ ...last, species: "snaretoad" }, 1000 + t).offX));
    }
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(early);
  });

  it("does not animate the boss", () => {
    const a = new CreatureAnimator();
    const boss = creature({ boss: true, size: 2 });
    a.update("run:1", [boss], { x: 9, y: 5 }, 1000);
    expect(a.pose(boss, 1000)).toEqual(restPose(boss));
  });
});
