import { describe, expect, it } from "vitest";
import { ENEMIES } from "@/game/enemies";
import { MOB_SIZE, mobPixels, type MobFrame } from "./mob-sprites";

const FRAMES: MobFrame[] = ["a", "b", "w"];
const key = (species: (typeof ENEMIES)[number]["id"], frame: MobFrame) => mobPixels(species, frame).map(r => r.join(",")).join("|");

describe("creature sprites", () => {
  it("draws every species in every frame as a 16 x 16 picture of hex colours", () => {
    for (const e of ENEMIES) {
      for (const f of FRAMES) {
        const px = mobPixels(e.id, f);
        expect(px).toHaveLength(MOB_SIZE);
        let opaque = 0;
        for (const row of px) {
          expect(row).toHaveLength(MOB_SIZE);
          for (const c of row) {
            if (c === null) continue;
            opaque++;
            expect(c).toMatch(/^#[0-9a-f]{6}$/);
          }
        }
        // Big enough to read, and small enough to be a creature rather than a block.
        expect(opaque).toBeGreaterThan(50);
        expect(opaque).toBeLessThan(MOB_SIZE * MOB_SIZE * 0.8);
      }
    }
  });

  it("gives each species its own look, and each frame its own pose", () => {
    const stand = new Set(ENEMIES.map(e => key(e.id, "a")));
    expect(stand.size).toBe(ENEMIES.length);
    for (const e of ENEMIES) {
      expect(key(e.id, "b"), `${e.id} walk frame`).not.toBe(key(e.id, "a"));
      expect(key(e.id, "w"), `${e.id} wind-up frame`).not.toBe(key(e.id, "a"));
    }
  });

  it("outlines every sprite so it stands out from the floor", () => {
    for (const e of ENEMIES) {
      const px = mobPixels(e.id, "a");
      const outline = px.flat().filter(c => c === "#0b0912").length;
      expect(outline, e.id).toBeGreaterThan(20);
    }
  });
});
