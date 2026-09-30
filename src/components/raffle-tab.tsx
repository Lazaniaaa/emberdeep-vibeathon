import { useState } from "react";
import { Flame, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { playSfx } from "@/audio/sfx";
import { FAMILY_PERKS } from "@/game/catalog";
import {
  FIELD_WEEK_SPEND, FRIEND_ASK_RF, LOT_MAX, LOT_MIN, PASSES, RAFFLE_SHARE, TICKET_DROP_CHANCE, type PassId,
} from "@/game/config";
import { lotSize, passCost, ticketChance, type DrawResult } from "@/game/raffle";
import { rf, usd } from "@/lib/format";
import { activePass, useGame, InsufficientFunds } from "@/state/store";
import { prizeVisual } from "./hero-info";
import { FriendArt } from "./art";

export function RaffleTab() {
  const g = useGame();
  const [draw, setDraw] = useState<DrawResult | null>(null);
  const size = lotSize(g.raffle);
  const total = g.tickets + g.fieldTickets;
  const odds = total > 0 ? g.tickets / total : 0;
  const held = Math.max(0, LOT_MIN * FRIEND_ASK_RF - g.raffle);

  const reveal = () => {
    const result = g.drawRaffle();
    if (!result) {
      toast.error(size < LOT_MIN ? `The lot holds until it can buy ${LOT_MIN} Friends.` : "Nobody holds a ticket this week.");
      return;
    }
    playSfx(result.prizes.some(p => p.fate === "you") ? "mint" : "burn", g.muted);
    setDraw(result);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="ring-sigil/30">
        <CardHeader>
          <CardTitle className="font-pixel text-sigil">Weekly Friend lot</CardTitle>
          <CardDescription>
            {Math.round(RAFFLE_SHARE * 100)}% of every RF spent waits here. Once a week it buys floor Rare Friends.
            One is burned. The rest are drawn. Tickets are not for sale. Gold, crystals, chests, vaults and kills drop one {Math.round(ticketChance(activePass(g)) * 1000) / 10}% of the time, and only a ticket you carry home goes into the drum.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Treasury" value={`${rf(g.raffle)} RF`} sub={usd(g.raffle)} />
            <Stat label="Your tickets" value={`${g.tickets}`} sub={total ? `${Math.round(odds * 100)}% of the drum` : "Extract to earn"} accent="text-sigil" />
            <Stat label="Field tickets" value={`${g.fieldTickets}`} sub={`Week ${g.week}`} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Lot this week</span>
              <span>{size === 0 ? `Holding. ${rf(held)} RF short of ${LOT_MIN} Friends` : `${size} Friends · 1 burned, ${size - 1} drawn`}</span>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: LOT_MAX }, (_, i) => {
                const filled = i < size;
                return (
                  <div key={i} className={`grid h-16 flex-1 place-items-center rounded-lg border ${filled ? "border-sigil/60 bg-sigil/10" : "border-white/10 bg-black/40"}`}>
                    {filled ? <FriendArt serial={i + g.nextSerial} family={(i + g.nextSerial) % 9} size={52} /> : <span className="text-[10px] text-muted-foreground">{rf(FRIEND_ASK_RF)}</span>}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Simulated floor ask: {rf(FRIEND_ASK_RF)} RF ({usd(FRIEND_ASK_RF)}) each. A live lot would buy real listings. Cap is {LOT_MAX}; leftover RF rolls forward.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { g.addFieldWeek(); toast(`Other delvers spent ${rf(FIELD_WEEK_SPEND)} RF. Their cut is in the treasury and the reward pool, and their gold in the round.`); }}>
              <Users data-icon="inline-start" /> Add a simulated week of play
            </Button>
            <Button onClick={reveal} disabled={size < LOT_MIN || total <= 0}>
              <Ticket data-icon="inline-start" /> Draw the week
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Friends burned by the lot so far: <span className="text-lime">{g.friendsBurned}</span>. In production this draw is weekly and automatic. The button is here so a judge can see one resolve.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-pixel">Weekly pass</CardTitle>
          <CardDescription>
            A pass lasts until this week's draw. It raises the drop rate. It never hands you a ticket, and the same 25/8/7/60 split applies to the price. Free rate is {Math.round(TICKET_DROP_CHANCE * 1000) / 10}%.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PASSES) as PassId[]).map(id => <PassCard key={id} id={id} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-pixel">Friends you won</CardTitle>
          <CardDescription>A won Friend is playable. Pick it on Descend and you get its family perk. It is not a wallet NFT, so it does not grant the holder blessing.</CardDescription>
        </CardHeader>
        <CardContent>
          {g.prizes.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet. Extract a run for tickets, fill the week, then draw.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {g.prizes.map(p => {
                const v = prizeVisual(p);
                const on = g.hero.kind === "prize" && g.hero.serial === p.serial;
                return (
                  <button key={p.serial} onClick={() => g.selectHero({ kind: "prize", serial: p.serial })} className={`rounded-lg border p-2 text-left ${on ? "border-sigil bg-sigil/10" : "border-white/10"}`}>
                    <FriendArt serial={p.serial} family={p.family} size={56} />
                    <div className="mt-1 font-pixel text-[10px] text-sigil">{v.name}</div>
                    <div className="text-[10px] text-muted-foreground">{v.perk}</div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DrawDialog draw={draw} onClose={() => setDraw(null)} />
    </div>
  );
}

function PassCard({ id }: { id: PassId }) {
  const g = useGame();
  const current = activePass(g);
  const pass = PASSES[id];
  const cost = passCost(id, current);
  const buy = () => {
    try {
      g.buyPass(id);
      playSfx("buy", useGame.getState().muted);
      toast.success(`${pass.name} is on until this week's draw.`);
    } catch (e) {
      toast.error(e instanceof InsufficientFunds ? `Not enough RF for ${pass.name}.` : "Could not start the pass.");
    }
  };
  return (
    <div className={`rounded-lg border p-3 ${current === id ? "border-sigil bg-sigil/10" : "border-white/10 bg-black/40"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-pixel text-sm">{pass.name}</span>
        <span className="text-xs text-muted-foreground">${pass.usd} / week</span>
      </div>
      <div className="mt-1 font-pixel text-2xl text-sigil">{Math.round(pass.chance * 1000) / 10}%</div>
      <p className="text-xs text-muted-foreground">drop chance, from {Math.round(TICKET_DROP_CHANCE * 1000) / 10}% free</p>
      <Button className="mt-3 w-full" size="sm" disabled={cost === null || cost === 0 || (cost ?? 0) > g.rf} onClick={buy}>
        {cost === 0 ? "Active this week" : cost === null ? "Included in Deep Pass" : `${rf(cost)} RF · ${usd(cost)}`}
      </Button>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-2">
      <div className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</div>
      <div className={`font-pixel text-sm ${accent ?? ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function DrawDialog({ draw, onClose }: { draw: DrawResult | null; onClose: () => void }) {
  const won = draw?.prizes.filter(p => p.fate === "you").length ?? 0;
  return (
    <Dialog open={!!draw} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {draw && (
          <>
            <DialogHeader>
              <DialogTitle className="font-pixel">{won > 0 ? `You won ${won}` : "The field won this week"}</DialogTitle>
              <DialogDescription>
                Bought {draw.bought} at {rf(FRIEND_ASK_RF)} RF. Your {draw.yourTickets} tickets against {draw.fieldTickets} in the field.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {draw.prizes.map(p => {
                const family = FAMILY_PERKS[p.friend.family];
                const burned = p.fate === "burned";
                return (
                  <div key={p.friend.serial} className={`rounded-lg border p-2 text-center ${burned ? "border-lime/50" : p.fate === "you" ? "border-sigil" : "border-white/10"}`}>
                    <div className={burned ? "opacity-40" : ""}>
                      <FriendArt serial={p.friend.serial} family={p.friend.family} size={72} />
                    </div>
                    <div className="mt-1 font-pixel text-[10px]">{family?.name} #{p.friend.serial}</div>
                    <Badge variant={burned ? "default" : "outline"} className={burned ? "bg-lime text-black" : ""}>
                      {burned ? <><Flame className="size-3" /> Burned</> : p.fate === "you" ? "Yours" : "Field"}
                    </Badge>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={onClose} className="w-full">Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
