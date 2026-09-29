// A descent lives in one tab's sessionStorage, but its payment lives in shared localStorage. This lock lets tabs
// see that another tab is playing, so a second tab cannot declare a live descent abandoned or start its own.

const KEY = "emberdeep-run-lock";
/** A crashed tab stops beating; after this long its lock no longer counts. A closed tab releases it at once. */
const STALE_MS = 60_000;
const BEAT_MS = 2_000;

type Lock = { id: string; at: number };

function read(): Lock | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const lock = JSON.parse(raw) as Partial<Lock>;
    return typeof lock.id === "string" && typeof lock.at === "number" ? { id: lock.id, at: lock.at } : null;
  } catch {
    return null;
  }
}

/** True when some other tab is running a descent right now. Call it from a tab that has no descent of its own. */
export function foreignRunActive(now = Date.now()) {
  const lock = read();
  return lock !== null && now - lock.at < STALE_MS;
}

/** Marks this tab as running the descent `id` until the returned function is called. */
export function holdRunLock(id: string) {
  const beat = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() } satisfies Lock)); } catch { /* storage may be blocked */ }
  };
  const release = () => {
    try { if (read()?.id === id) localStorage.removeItem(KEY); } catch { /* storage may be blocked */ }
  };
  beat();
  const timer = window.setInterval(beat, BEAT_MS);
  window.addEventListener("pagehide", release);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("pagehide", release);
    release();
  };
}
