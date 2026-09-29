import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, DoorOpen, Gem, Moon, Shield, Stars } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemArt } from "@/components/art";
import { DPad } from "@/components/dpad";
import { MOVE_KEYS as KEYS, MOVE_MS } from "@/lib/controls";
import { playSfx } from "@/audio/sfx";
import { lootMultiplier } from "@/game/config";
import { POTIONS, POTION_IDS, type PotionId } from "@/game/catalog";
import { roundShare } from "@/game/economy";
import { bossAlive, currentRadius, currentStepCost, onRift, onStairs, type RunAction, type RunState } from "@/game/run";
import { percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { COLORS, TILE, cameraFor, drawRun, type View } from "@/render/renderer";
import { settle, useRun } from "@/state/run-store";
import { holdRunLock } from "@/state/run-lock";
import { useGame } from "@/state/store";
import { useWallet } from "@/state/wallet";
import { resolveHero, type HeroVisual } from "./hero-info";

export function RunView() {
  const run = useRun(s => s.run)!;
  const act = useRun(s => s.act);
  const clear = useRun(s => s.clear);
  const game = useGame();
  const wallet = useWallet();
  const hero = resolveHero(game.hero, game.heroes, wallet.selected, wallet.sprite, game.prizes);
  const [shake, setShake] = useState(0);
  const lastKey = useRef(0);

  const dispatch = useCallback((action: RunAction) => {
    const next = act(action);
    if (!next) return;
    const muted = useGame.getState().muted;
    for (const e of new Set(next.events)) playSfx(e, muted);
    if (next.events.includes("drain") && !useGame.getState().reducedMotion) setShake(s => s + 1);
  }, [act]);

  const contextAction = useCallback(() => {
    const r = useRun.getState().run;
    if (!r) return;
    if (onStairs(r)) dispatch({ type: "descend" });
    else if (onRift(r)) dispatch({ type: "extract" });
  }, [dispatch]);

  // While this tab plays, tell the other tabs; once the descent ends, make sure its result is booked.
  useEffect(() => {
    const r = useRun.getState().run;
    if (!r) return;
    if (r.status !== "playing") { settle(r); return; }
    return holdRunLock(r.runId ?? "legacy");
  }, [run.status, run.runId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[role=dialog]")) return;
      // Enter and Space belong to a focused button; do not steal them for the game.
      if ((e.key === "Enter" || e.key === " ") && e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea, select, [role=button]")) return;
      const r = useRun.getState().run;
      if (!r || r.status !== "playing") return;
      const now = performance.now();
      const dir = KEYS[e.key];
      const potion = POTION_IDS.find(id => POTIONS[id].key === e.key);
      if (dir || e.key === " " || e.key === "." || e.key === "e" || e.key === "E" || e.key === "Enter" || potion) e.preventDefault();
      if (e.repeat && now - lastKey.current < MOVE_MS) return;
      lastKey.current = now;
      if (dir) dispatch({ type: "move", dx: dir[0], dy: dir[1] });
      else if (e.key === " " || e.key === ".") dispatch({ type: "wait" });
      else if (e.key === "e" || e.key === "E" || e.key === "Enter") contextAction();
      else if (potion) dispatch({ type: "potion", id: potion });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, contextAction]);

  // The result is already banked when the descent ends, so this only closes the screen.
  const finish = () => clear();

  const share = roundShare(game.roundGold + run.gold, game.fieldGold);
  const lightPct = Math.min(100, (run.light / Math.max(1, run.startLight)) * 100);
  const nightVision = run.light <= 0 && run.nightVision > 0;
  const atStairs = onStairs(run), atRift = onRift(run);
  const sealed = bossAlive(run);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        <div key={shake} className={cn("relative overflow-hidden rounded-xl border border-white/10 bg-black", shake > 0 && "animate-[shake_180ms_ease-in-out]")}>
          <GameCanvas run={run} hero={hero} reducedMotion={game.reducedMotion} onMove={(dx, dy) => dispatch({ type: "move", dx, dy })} />
          {run.status !== "playing" && (
            <div className="absolute inset-0 grid place-items-center bg-black/75 p-4 backdrop-blur-[2px]">
              <div className="max-w-sm space-y-3 text-center">
                <div className={cn("font-pixel text-2xl", run.status === "extracted" ? "text-lime" : "text-destructive")}>
                  {run.status === "extracted" ? "Extracted" : "Lost in the dark"}
                </div>
                <p className="text-sm text-muted-foreground">
                  {run.status === "extracted"
                    ? `You made it home from depth ${run.deepest} with ${run.gold} gold. It joins this round's pool share.`
                    : `The deep keeps your ${run.gold} gold. It counts for nobody, so the pool is split among the delvers who made it home.`}
                </p>
                <Button size="lg" className="font-pixel" onClick={finish} autoFocus>Return to camp</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {atStairs && run.status === "playing" && !sealed && (
            <Button className="font-pixel" onClick={contextAction}><ArrowDown data-icon="inline-start" /> Descend to depth {run.depth + 1} <Kbd>E</Kbd></Button>
          )}
          {atStairs && run.status === "playing" && sealed && (
            <p className="text-xs text-sigil">The stairs are sealed. Defeat Cerberus, or walk back to the rift and leave with your loot.</p>
          )}
          {atRift && run.status === "playing" && (
            <Button className="font-pixel" variant="secondary" onClick={contextAction}><DoorOpen data-icon="inline-start" /> Extract with {run.gold} gold <Kbd>E</Kbd></Button>
          )}
          {!atStairs && !atRift && run.status === "playing" && (
            <p className="text-xs text-muted-foreground">
              {sealed && <><span className="text-sigil">Cerberus</span> guards the stairs. A Ward Charm makes its drain harmless for 15 steps. </>}
              Find the <span className="text-foreground">stairs</span> to go deeper, or walk back to the <span className="text-lime">rift</span> to extract.
              <span className="hidden md:inline"> Move: WASD / arrows · Wait: Space · Act: E · Potions: 1-7</span>
            </p>
          )}
        </div>

        <DPad disabled={run.status !== "playing"} onMove={(dx, dy) => dispatch({ type: "move", dx, dy })} onWait={() => dispatch({ type: "wait" })} />
      </div>

      <aside className="space-y-3">
        <section className="rounded-xl border border-white/10 bg-card p-4" aria-label="Lantern">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Light</span>
            <span className={cn("font-pixel text-2xl", run.light < 15 ? "text-destructive" : "text-lime")} aria-live="polite">{Math.ceil(run.light)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(lightPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Light remaining">
            <div className="h-full rounded-full bg-lime transition-[width]" style={{ width: `${lightPct}%`, boxShadow: `0 0 10px ${COLORS.lime}` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <Badge variant="outline">Radius {currentRadius(run)}</Badge>
            <Badge variant="outline">-{currentStepCost(run).toFixed(2)}/step</Badge>
            <Badge variant="outline" className="text-sigil">Tickets {run.tickets}</Badge>
            {nightVision && <Badge className="bg-emerald-400 text-black"><Moon /> Night vision {run.nightVision}</Badge>}
            {run.ward > 0 && <Badge className="bg-crystal text-black"><Shield /> Ward {run.ward}</Badge>}
            {(run.rage ?? 0) > 0 && <Badge className="bg-red-500 text-white">Rage {run.rage}</Badge>}
            {(run.regen ?? 0) > 0 && <Badge className="bg-emerald-500 text-black">Regen {run.regen}</Badge>}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-card p-3 text-center" aria-label="Loot this run">
          <Loot label="Depth" value={run.depth} sub={`x${lootMultiplier(run.depth).toFixed(1)} loot`} />
          <Loot label="Gold" value={run.gold} sub={`round share ${percent(share)}`} color="text-gold" />
          <Loot label="Crystals" value={run.crystals} sub={run.sigils ? `${run.sigils} sigil${run.sigils > 1 ? "s" : ""}` : "\u00a0"} color="text-crystal" icon={<Gem className="size-3" />} />
        </section>

        <section className="grid grid-cols-2 gap-2" aria-label="Potions">
          {POTION_IDS.filter(id => POTIONS[id].shop || run.bag[id] > 0).map(id => (
            <PotionButton key={id} id={id} run={run} onUse={() => dispatch({ type: "potion", id })} />
          ))}
        </section>

        <section className="rounded-xl border border-white/10 bg-card p-3" aria-label="Log">
          <ul className="space-y-1 text-xs" aria-live="polite">
            {run.messages.map((m, i) => (
              <li key={`${run.steps}-${i}`} className={i === 0 ? "text-foreground" : "text-muted-foreground"}>{m}</li>
            ))}
          </ul>
        </section>

        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Stars className="size-3" /> Playing as <span style={{ color: hero.color }}>{hero.name}</span>
        </p>
      </aside>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] opacity-70">{children}</kbd>;
}

function Loot({ label, value, sub, color, icon }: { label: string; value: number; sub: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</div>
      <div className={cn("flex items-center justify-center gap-1 font-pixel text-lg", color)}>{icon}{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function PotionButton({ id, run, onUse }: { id: PotionId; run: RunState; onUse: () => void }) {
  const p = POTIONS[id];
  const count = run.bag[id];
  const active = (id === "nightVision" && run.nightVision > 0) || (id === "rage" && (run.rage ?? 0) > 0) || (id === "regen" && (run.regen ?? 0) > 0);
  const blocked = run.status !== "playing" || count <= 0 || active;
  return (
    <Button variant="outline" className="h-auto justify-start gap-2 px-2.5 py-2 text-left" onClick={onUse} disabled={blocked} title={p.blurb}>
      <ItemArt id={id} px={2} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs">{p.name}</span>
        <span className="block text-[10px] text-muted-foreground">×{count} · key {p.key}</span>
      </span>
    </Button>
  );
}

function GameCanvas({ run, hero, reducedMotion, onMove }: {
  run: RunState; hero: HeroVisual; reducedMotion: boolean; onMove: (dx: number, dy: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [compact, setCompact] = useState(false);
  const viewSize = compact ? { w: 11, h: 11 } : { w: run.floor.w, h: run.floor.h };
  const camera = useRef<View>({ x: 0, y: 0, ...viewSize });
  const live = useRef({ run, hero, reducedMotion });
  useEffect(() => { live.current = { run, hero, reducedMotion }; });
  const tween = useRef({ from: { x: run.player.x, y: run.player.y }, to: { x: run.player.x, y: run.player.y }, at: 0, depth: run.depth });

  useEffect(() => {
    const t = tween.current;
    const p = run.player;
    if (p.x === t.to.x && p.y === t.to.y && run.depth === t.depth) return;
    const teleport = run.depth !== t.depth || Math.abs(p.x - t.to.x) + Math.abs(p.y - t.to.y) > 1;
    tween.current = { from: teleport ? { ...p } : { ...t.to }, to: { x: p.x, y: p.y }, at: performance.now(), depth: run.depth };
  }, [run]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas?.parentElement) return;
    const ro = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 640));
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { w: viewW, h: viewH } = viewSize;
    let raf = 0;
    let lastDraw = -Infinity;
    const frame = (time: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const { run, hero, reducedMotion } = live.current;
      const interval = reducedMotion ? 100 : 1000 / 30;
      if (time - lastDraw < interval) return;
      lastDraw = time;
      const t = tween.current;
      const k = reducedMotion ? 1 : Math.min(1, (time - t.at) / MOVE_MS);
      const walking = k < 1;
      const pos = { x: t.from.x + (t.to.x - t.from.x) * k, y: t.from.y + (t.to.y - t.from.y) * k };
      const animFrame = walking ? Math.floor(time / 60) % 8 : reducedMotion ? 0 : Math.floor(time / 180) % 8;
      const facing = run.player.facing;
      const mask = hero.mirrored
        ? hero.mask(facing, true, run.steps % 2)
        : hero.mask(facing, walking, animFrame);
      const view = cameraFor(pos, run.floor.w, run.floor.h, viewW, viewH);
      camera.current = view;
      drawRun(ctx, run, { time, reducedMotion, heroMask: mask, flip: hero.mirrored && facing === "left", playerPos: pos, view });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // The loop reads live state from refs; only a view-size change needs a restart.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [viewSize.w, viewSize.h]);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const view = camera.current;
    const scale = (view.w * TILE) / rect.width;
    const tx = view.x + ((e.clientX - rect.left) * scale) / TILE;
    const ty = view.y + ((e.clientY - rect.top) * scale) / TILE;
    const dx = tx - (run.player.x + 0.5), dy = ty - (run.player.y + 0.5);
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    if (Math.abs(dx) > Math.abs(dy)) onMove(Math.sign(dx), 0);
    else onMove(0, Math.sign(dy));
  };

  return (
    <canvas
      ref={ref}
      width={viewSize.w * TILE}
      height={viewSize.h * TILE}
      onPointerDown={onPointer}
      className="pixelated block h-auto w-full touch-manipulation select-none"
      role="img"
      aria-label={`Depth ${run.depth}. Light ${Math.ceil(run.light)}. Tap a side of your character to step that way.`}
    />
  );
}
