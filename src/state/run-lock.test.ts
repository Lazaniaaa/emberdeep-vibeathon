import { beforeEach, describe, expect, it, vi } from "vitest";

const saved = new Map<string, string>();

beforeEach(() => {
  saved.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => saved.get(k) ?? null,
    setItem: (k: string, v: string) => { saved.set(k, v); },
    removeItem: (k: string) => { saved.delete(k); },
  });
});

describe("run lock", () => {
  it("sees a fresh lock from another tab, but not an old or broken one", async () => {
    const { foreignRunActive } = await import("./run-lock");
    expect(foreignRunActive()).toBe(false);

    saved.set("emberdeep-run-lock", JSON.stringify({ id: "abc", at: 1_000_000 }));
    expect(foreignRunActive(1_000_000 + 5_000)).toBe(true);
    expect(foreignRunActive(1_000_000 + 61_000)).toBe(false);

    saved.set("emberdeep-run-lock", "not json");
    expect(foreignRunActive(1_000_000)).toBe(false);
    saved.set("emberdeep-run-lock", JSON.stringify({ id: 7 }));
    expect(foreignRunActive(1_000_000)).toBe(false);
  });

  it("survives storage that throws", async () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} });
    const { foreignRunActive } = await import("./run-lock");
    expect(foreignRunActive()).toBe(false);
  });
});
