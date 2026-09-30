import type { Dimling, Point } from "@/game/dungeon";
import { windupProgress } from "@/game/enemy-ai";
import { DEFAULT_SPECIES, type EnemySpecies } from "@/game/enemies";

/**
 * The creatures are single pictures, so they are given life by moving the picture: it glides between tiles with a small
 * hop, turns to face the delver once it is awake, breathes while it waits and trembles as it winds up. Everything is
 * computed here from the game state and the clock, with no canvas.
 */

/** A creature crosses a tile a little slower than the delver, so the eye can follow it. */
export const CREATURE_MOVE_MS = 160;
/** How long a creature takes to turn towards the delver. */
export const TURN_MS = 150;

/**
 * The top-down pictures that look natural turned to face the way they go. The rest (the bell, the stone golem, the
 * coiled chain, the hooded wraith) are drawn front-on and only lean into a move.
 */
const TURNS: ReadonlySet<EnemySpecies> = new Set(["wickgnaw", "snaretoad", "cinder-hound", "hollow-burrower", "rift-leaper"]);

/** Height of the hop between tiles in pixels, and how far the picture leans into a move in radians. */
const GAIT: Record<EnemySpecies, { hop: number; lean: number }> = {
  wickgnaw: { hop: 4, lean: 0 },
  snaretoad: { hop: 8, lean: 0 },
  "cinder-hound": { hop: 5, lean: 0 },
  chaincoil: { hop: 0, lean: 0 },
  "needle-wraith": { hop: 3, lean: 0.22 },
  sootplate: { hop: 3, lean: 0.06 },
  "hollow-burrower": { hop: 2, lean: 0 },
  "fourfold-bell": { hop: 3, lean: 0.1 },
  "rift-leaper": { hop: 10, lean: 0 },
};

export type Pose = {
  /** Position in tiles, fractional while gliding. */
  x: number;
  y: number;
  /** Pixels the picture floats above its shadow. */
  lift: number;
  /** Pixel offset from trembling. */
  offX: number;
  offY: number;
  /** Squash and stretch, pivoting at the feet. */
  sx: number;
  sy: number;
  /** Turn, in radians, pivoting at the feet. */
  rot: number;
};

type Track = {
  fromX: number; fromY: number; toX: number; toY: number; movedAt: number;
  heading: Point;
  angleFrom: number; angleTo: number; turnedAt: number;
  last: Dimling;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (n: number) => n * n * (3 - 2 * n);
const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

export const restPose = (d: Point): Pose => ({ x: d.x, y: d.y, lift: 0, offX: 0, offY: 0, sx: 1, sy: 1, rot: 0 });

/** Rotation that turns a picture drawn facing down so that it faces `dir`. */
export const facingAngle = (dir: Point) => Math.atan2(-dir.x, dir.y);

/** The unit step, along the longer axis, from one tile towards another. */
function towards(from: Point, to: Point): Point {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (dx === 0 && dy === 0) return { x: 0, y: 1 };
  return Math.abs(dx) >= Math.abs(dy) ? { x: sign(dx), y: 0 } : { x: 0, y: sign(dy) };
}

/** The angle between two rotations by the short way round. */
const shortest = (from: number, to: number) => ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

export class CreatureAnimator {
  private tracks = new Map<number, Track>();
  private key = "";

  private position(t: Track, time: number) {
    const k = clamp01((time - t.movedAt) / CREATURE_MOVE_MS);
    const e = smooth(k);
    return { x: t.fromX + (t.toX - t.fromX) * e, y: t.fromY + (t.toY - t.fromY) * e, k };
  }

  private angle(t: Track, time: number) {
    return t.angleFrom + shortest(t.angleFrom, t.angleTo) * smooth(clamp01((time - t.turnedAt) / TURN_MS));
  }

  /** Reads this frame's creatures. `key` names the floor being shown: a new floor starts every picture afresh. */
  update(key: string, creatures: readonly Dimling[], player: Point, time: number) {
    if (key !== this.key) { this.tracks.clear(); this.key = key; }
    const present = new Set<number>();
    for (const d of creatures) {
      if (d.boss) continue;
      present.add(d.id);
      const target = d.awake && TURNS.has(d.species ?? DEFAULT_SPECIES) ? facingAngle(towards(d, player)) : 0;
      const t = this.tracks.get(d.id);
      if (!t) {
        this.tracks.set(d.id, {
          fromX: d.x, fromY: d.y, toX: d.x, toY: d.y, movedAt: -Infinity, heading: { x: 0, y: 1 },
          angleFrom: target, angleTo: target, turnedAt: -Infinity, last: d,
        });
        continue;
      }
      if (d.x !== t.toX || d.y !== t.toY) {
        const far = Math.abs(d.x - t.toX) + Math.abs(d.y - t.toY) > 2;
        const here = this.position(t, time);
        if (!far) t.heading = { x: sign(d.x - t.toX), y: sign(d.y - t.toY) };
        t.fromX = far ? d.x : here.x; t.fromY = far ? d.y : here.y;
        t.toX = d.x; t.toY = d.y; t.movedAt = time;
      }
      if (target !== t.angleTo) {
        t.angleFrom = this.angle(t, time);
        t.angleTo = target;
        t.turnedAt = time;
      }
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
    const arc = moving ? Math.sin(Math.PI * k) : 0;
    const pose = restPose({ x, y });

    // Waiting it breathes; moving it hops, and the front-on pictures lean into the direction of travel.
    const breath = Math.sin(time / (d.awake ? 380 : 900) + d.id * 1.9);
    pose.sy += breath * (d.awake ? 0.03 : 0.02);
    pose.sx -= breath * (d.awake ? 0.02 : 0.012);
    pose.lift = arc * gait.hop;
    pose.rot = this.angle(t, time) + gait.lean * t.heading.x * arc;

    // Winding up it trembles, more as the blow gets closer.
    const p = windupProgress(d);
    if (p !== null) {
      pose.offX = Math.sin(time / 26) * 1.6 * p;
      pose.offY = Math.cos(time / 31) * 1.1 * p;
    }
    return pose;
  }
}
