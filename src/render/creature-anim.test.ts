import { describe, expect, it } from "vitest";
import type { Dimling } from "@/game/dungeon";
import { CREATURE_MOVE_MS, CreatureAnimator, IDLE_MS, WALK_MS, restPose } from "./creature-anim";

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
  });

  it("glides between tiles on a walk cycle with a hop instead of jumping", () => {
    const a = new CreatureAnimator();
    a.update("run:1", [creature({ species: "snaretoad" })], { x: 9, y: 5 }, 1000);
    const moved = creature({ species: "snaretoad", x: 6 });
    a.update("run:1", [moved], { x: 9, y: 5 }, 2000);
    const start = a.pose(moved, 2000);
    const middle = a.pose(moved, 2000 + CREATURE_MOVE_MS / 2);
    const end = a.pose(moved, 2000 + CREATURE_MOVE_MS);
    expect(start.x).toBeCloseTo(5, 5);
    expect(middle.x).toBeGreaterThan(5.3);
    expect(middle.x).toBeLessThan(5.7);
    expect(middle.lift).toBeGreaterThan(0);
    expect(Number.isInteger(middle.lift)).toBe(true);
    expect(end.x).toBe(6);
    expect(end.lift).toBe(0);
    // The two halves of the walk alternate.
    expect(a.pose(moved, 2000).frame).not.toBe(a.pose(moved, 2000 + WALK_MS).frame);
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

  it("looks at the delver once awake, and keeps its look when level with them", () => {
    const a = new CreatureAnimator();
    const d = creature();
    a.update("run:1", [d], { x: 9, y: 5 }, 1000);
    expect(a.pose(d, 1000).flip).toBe(false);
    a.update("run:1", [d], { x: 1, y: 5 }, 1100);
    expect(a.pose(d, 1100).flip).toBe(true);
    a.update("run:1", [d], { x: 5, y: 9 }, 1200);
    expect(a.pose(d, 1200).flip).toBe(true);
  });

  it("leaves a sleeping creature looking the way it was", () => {
    const a = new CreatureAnimator();
    const asleep = creature({ awake: false });
    a.update("run:1", [asleep], { x: 1, y: 5 }, 1000);
    expect(a.pose(asleep, 1000).flip).toBe(false);
    expect(a.pose(asleep, 1000).lift).toBe(0);
  });

  it("shows the wind-up pose and trembles more as the blow gets closer", () => {
    const a = new CreatureAnimator();
    const calm = creature({ species: "snaretoad" });
    a.update("run:1", [calm], { x: 6, y: 5 }, 1000);
    expect(a.pose(calm, 1013).frame).not.toBe("w");
    expect(a.pose(calm, 1013).offX).toBe(0);
    const first = creature({ species: "snaretoad", phase: "windup", windupLeft: 2 });
    const last = creature({ species: "snaretoad", phase: "windup", windupLeft: 1 });
    expect(a.pose(first, 1013).frame).toBe("w");
    let early = 0, late = 0;
    for (let t = 0; t < 400; t += 7) {
      early = Math.max(early, Math.abs(a.pose(first, 1000 + t).offX));
      late = Math.max(late, Math.abs(a.pose(last, 1000 + t).offX));
    }
    expect(late).toBeGreaterThanOrEqual(early);
    expect(late).toBeGreaterThan(0);
  });

  it("makes a waiting creature bob: floaters swap frames, the rest rise a pixel", () => {
    const a = new CreatureAnimator();
    const bell = creature({ id: 2, species: "fourfold-bell" });
    const rat = creature({ id: 3, species: "wickgnaw" });
    a.update("run:1", [bell, rat], { x: 9, y: 5 }, 1000);
    const bells = new Set<string>(), lifts = new Set<number>();
    for (let t = 0; t < IDLE_MS * 3; t += 50) {
      bells.add(a.pose(bell, 1000 + t).frame);
      lifts.add(a.pose(rat, 1000 + t).lift);
    }
    expect(bells.size).toBe(2);
    expect([...lifts].sort()).toEqual([0, 1]);
  });

  it("does not animate the boss", () => {
    const a = new CreatureAnimator();
    const boss = creature({ boss: true, size: 2 });
    a.update("run:1", [boss], { x: 9, y: 5 }, 1000);
    expect(a.pose(boss, 1000)).toEqual(restPose(boss));
  });
});
