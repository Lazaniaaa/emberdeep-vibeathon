import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTIVE_SHARE, BURN_SHARE, FLASK_PRICE, KEY_PRICE, LOCK_MAX, LOCK_SHARE, MATURITY_ROUNDS, MAX_ROUND_RETURN, RAFFLE_SHARE } from "@/game/config";
import { roundShare } from "@/game/economy";
import { percent, rf } from "@/lib/format";
import { useGame } from "@/state/store";

const STEPS = [
  {
    title: "Get in",
    text: `Buy an entry key (${KEY_PRICE} RF) and lantern oil (${FLASK_PRICE} RF a flask) at the Dungeon Gate. More oil means more light, and light is how far you can see and how far you can walk.`,
  },
  {
    title: "Go down",
    text: "Every step burns light. Collect gold and crystals, fight dimlings with your weapon, and take the stairs for richer floors. On floor 7 Cerberus, a three-headed hound, guards the way and leaves a hoard chest when it falls.",
  },
  {
    title: "Come home",
    text: "Walk back to the rift you arrived through to extract. If your light dies first, everything you carried is lost.",
  },
  {
    title: "Share the pool",
    text: `Gold you bring home counts toward the round. When it closes, you take the same percentage of the pool as your percentage of the gold, up to ${Math.round(MAX_ROUND_RETURN * 100)}% of what you put into descents that round. ${Math.round(ACTIVE_SHARE * 100)}% of every RF spent feeds the pool, ${Math.round(LOCK_SHARE * 100)}% the lock pool, ${Math.round(BURN_SHARE * 100)}% is burned and ${Math.round(RAFFLE_SHARE * 100)}% buys the weekly Friend lot.`,
  },
  {
    title: "Lock to grow",
    text: `Perks you only hold work at reduced strength. Lock a Delver, your Rare Friend or some RF at the Ember Altar and its perk grows with every round closed, up to ${Math.round(LOCK_MAX * 100)}%. Locks also farm a share of the lock pool, paid once they mature after ${MATURITY_ROUNDS} rounds. Everything here is simulated.`,
  },
];

export function GuidePanel({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="space-y-4">
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-lime font-pixel text-xs text-[#150c2b]">{i + 1}</span>
              <span className="font-pixel text-sm">{step.title}</span>
            </div>
            <p className="text-sm text-foreground/80">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        Everything economic here is simulated. No real RF moves; the only live blockchain access is a read-only lookup of the Rare Friends you hold.
        The other delvers you see in camp are simulated too: they are ambience, not other players.
      </p>
      <Button className="font-pixel" onClick={onPlay}><Flame data-icon="inline-start" /> Go to the gate</Button>
    </div>
  );
}

export function HallPanel() {
  const g = useGame();
  const share = roundShare(g.roundGold, g.fieldGold);
  const rows: [string, string][] = [
    ["Descents", `${g.stats.runs}`],
    ["Made it home", `${g.stats.extracts}`],
    ["Lost in the dark", `${g.stats.deaths}`],
    ["Deepest floor", g.stats.deepest ? `${g.stats.deepest}` : "-"],
    ["Bosses slain", `${g.stats.bosses}`],
    ["Best round claim", g.stats.bestPayout ? `${rf(g.stats.bestPayout)} RF` : "-"],
    ["Delvers minted", `${g.stats.mints}`],
    ["Friends won", `${g.prizes.length}`],
    ["Burned by you", `${rf(g.burned)} RF`],
    ["This round", g.roundGold > 0 ? `${g.roundGold} gold · ${percent(share)} of the gold` : "no gold banked yet"],
  ];
  return (
    <div className="space-y-3">
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
            <dt className="text-xs tracking-wider text-muted-foreground uppercase">{label}</dt>
            <dd className="font-pixel text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">These numbers are saved only in this browser. There is no global leaderboard yet.</p>
    </div>
  );
}
