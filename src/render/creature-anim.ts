import type { Dimling, Point } from "@/game/dungeon";
import { windupProgress } from "@/game/enemy-ai";
import { DEFAULT_SPECIES, type EnemySpecies } from "@/game/enemies";
import type { MobFrame } from "./mob-sprites";

/**
 * Which picture of a creature to show, and where. A creature glides between tiles on a walk cycle with a small hop, turns
 * to face the delver (the sprites look right, so they are mirrored to look left), bobs while it waits, and shows a
 * separate pose while it winds up. Everything is computed from the game state and the clock, with no canvas.
 */

/** A creature crosses a tile a little slower than the delver, so the eye can follow it. */
export const CREATURE_MOVE_MS = 160;
/** How long each half of the walk cycle lasts. */
export const WALK_MS = 80;
/** How long each half of the idle bob lasts. */
export const IDLE_MS = 480;

/** Hop height in pixels while crossing a tile, and whether it floats (bobs and sways) while it waits. */
const GAIT: Record<EnemySpecies, { hop: number; floats: boolean }> = {
  wickgnaw: { hop: 1, floats: false },
  snaretoad: { hop: 3, floats: false },
  "cinder-hound": { hop: 2, floats: false },
  chaincoil: { hop: 0, floats: true },
  "needle-wraith": { hop: 1, floats: true },
  sootplate: { hop: 1, floats: false },
  "hollow-burrower": { hop: 1, floats: false },
  "fourfold-bell": { hop: 1, floats: true },
  "rift-leaper": { hop: 4, floats: false },
};

export type Pose = {
  /** Position in tiles, fractional while gliding. */
  x: number;
  y: number;
  /** Whole pixels the picture is raised, from hopping or floating. */
  lift: number;
  /** Whole-pixel offset from trembling. */
  offX: number;
  offY: number;
  frame: MobFrame;
  /** The picture looks right; true mirrors it to look left. */
  flip: boolean;
};

type Track = {
  fromX: number; fromY: number; toX: number; toY: number; movedAt: number;
  flip: boolean;
  last: Dimling;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (n: number) => n * n * (3 - 2 * n);

export const restPose = (d: Point): Pose => ({ x: d.x, y: d.y, lift: 0, offX: 0, offY: 0, frame: "a", flip: false });

export class CreatureAnimator {
  private tracks = new Map<number, Track>();
  private key = "";

  private position(t: Track, time: number) {
    const k = clamp01((time - t.movedAt) / CREATURE_MOVE_MS);
    const e = smooth(k);
    return { x: t.fromX + (t.toX - t.fromX) * e, y: t.fromY + (t.toY - t.fromY) * e, k };
  }

  /** Reads this frame's creatures. `key` names the floor being shown: a new floor starts every picture afresh. */
  update(key: string, creatures: readonly Dimling[], player: Point, time: number) {
    if (key !== this.key) { this.tracks.clear(); this.key = key; }
    const present = new Set<number>();
    for (const d of creatures) {
      if (d.boss) continue;
      present.add(d.id);
      // An awake creature looks at the delver; one that is level with them keeps the way it was looking.
      const facing = d.awake && player.x !== d.x ? player.x < d.x : null;
      const t = this.tracks.get(d.id);
      if (!t) {
        this.tracks.set(d.id, {
          fromX: d.x, fromY: d.y, toX: d.x, toY: d.y, movedAt: -Infinity, flip: facing ?? false, last: d,
        });
        continue;
      }
      if (d.x !== t.toX || d.y !== t.toY) {
        const far = Math.abs(d.x - t.toX) + Math.abs(d.y - t.toY) > 2;
        const here = this.position(t, time);
        t.fromX = far ? d.x : here.x; t.fromY = far ? d.y : here.y;
        t.toX = d.x; t.toY = d.y; t.movedAt = time;
      }
      if (facing !== null) t.flip = facing;
      t.last = d;
    }
    for (const id of this.tracks.keys()) if (!present.has(id)) this.tracks.delete(id);
  }

  pose(d: Dimling, time: number): Pose {
    const t = this.tracks.get(d.id);
    if (!t) return restPose(d);
    const gait = GAIT[d.species ?? DEFAULT_SPECIES] ?? GAIT[DEFAULT_SPECIES];
    const { x, y, k } = this.position(t, time);
    const moving = k < 1 && (t.fromX !== t.toX || t.fromY !== t.toY);
    const pose: Pose = { x, y, lift: 0, offX: 0, offY: 0, frame: "a", flip: t.flip };

    const p = windupProgress(d);
    if (p !== null) {
      // Winding up: its attack pose, trembling more as the blow gets closer.
      pose.frame = "w";
      pose.offX = Math.round(Math.sin(time / 26) * 1.2 * p);
      pose.offY = Math.round(Math.cos(time / 31) * 0.8 * p);
    } else if (moving) {
      pose.frame = Math.floor((time - t.movedAt) / WALK_MS) % 2 === 0 ? "b" : "a";
      pose.lift = Math.round(Math.sin(Math.PI * k) * gait.hop);
    } else if (d.awake) {
      const beat = Math.floor((time + d.id * 131) / IDLE_MS) % 2;
      if (gait.floats) pose.frame = beat === 0 ? "a" : "b";
      else pose.lift = beat;
    }
    return pose;
  }
}
