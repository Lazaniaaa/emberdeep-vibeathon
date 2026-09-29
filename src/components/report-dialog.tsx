import { useState } from "react";
import { Copy, Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RARITY_INFO } from "@/game/catalog";
import { rf, usd } from "@/lib/format";
import { useUi } from "@/state/ui";
import { useGame } from "@/state/store";
import { nftVisual } from "./hero-info";
import { HeroAvatar } from "./art";

export function ReportDialog() {
  const report = useGame(s => s.lastReport);
  const dismiss = useGame(s => s.dismissReport);
  const [copied, setCopied] = useState(false);
  if (!report) return null;

  const extracted = report.outcome === "extracted";
  const share = [
    `Emberdeep · Rare Friends`,
    extracted ? `Extracted from depth ${report.depth}` : `Lost in the dark at depth ${report.depth}`,
    extracted ? `${report.gold} gold banked for the round` : `${report.gold} gold lost in the dark`,
    `Burned ${rf(report.burned)} simulated RF to light the way`,
    report.bossSlain ? `Slew Cerberus` : null,
    report.minted.length ? `Found ${report.minted.length} Soul Sigil${report.minted.length > 1 ? "s" : ""}` : null,
  ].filter(Boolean).join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      toast.success("Run summary copied. Share it.");
    } catch {
      toast.error("Clipboard is blocked here. Select the text to copy it.");
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) { dismiss(); setCopied(false); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`font-pixel ${extracted ? "text-lime" : "text-destructive"}`}>
            {extracted ? `Home from depth ${report.depth}` : `Lost at depth ${report.depth}`}
          </DialogTitle>
          <DialogDescription>
            {report.steps} steps · {report.kills} dimling{report.kills === 1 ? "" : "s"} dispersed
            {report.bossSlain && <span className="text-sigil"> · Cerberus slain</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Row label="Oil spent" value={`${rf(report.spent)} RF`} sub={`${usd(report.spent)} · 1 entry key used`} />
          <Row label="Burned forever" value={`${rf(report.burned)} RF`} accent="text-lime" icon />
          <Row label="Gold" value={`${report.gold}`} sub={extracted ? "Banked for this round" : "Left in the deep"} accent="text-gold" />
          <Row label="Round pool share" value={extracted ? "Counted" : "None"} sub={extracted ? "RF arrive when you close the round in the Vault" : "Lost gold counts for nobody"} accent={extracted ? "text-lime" : "text-foreground"} />
          <Row label="Crystals" value={extracted ? `+${report.crystals}` : "0"} accent="text-crystal" />
          <Row label="Soul Sigils" value={`${extracted ? report.sigils : 0}`} accent="text-sigil" />
          <Row label="Raffle tickets" value={extracted ? `+${report.tickets}` : "0"} sub={extracted ? `${report.ticketsFound} found` : `${report.ticketsFound} found, lost in the dark`} accent="text-sigil" />
        </div>

        {report.minted.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs tracking-wider text-sigil uppercase">Minted from Soul Sigils</h3>
            <div className="flex flex-wrap gap-2">
              {report.minted.map(h => {
                const v = nftVisual(h);
                return (
                  <div key={h.id} className="flex items-center gap-2 rounded-lg border bg-black/50 p-2" style={{ borderColor: RARITY_INFO[h.rarity].color }}>
                    {v.portrait && <HeroAvatar portrait={v.portrait} px={3} showEdition={false} />}
                    <div className="text-xs">
                      <div className="font-pixel" style={{ color: v.color }}>{v.name}</div>
                      <div className="text-muted-foreground">{v.perk}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <pre className="rounded-lg border border-white/10 bg-black p-3 text-xs whitespace-pre-wrap text-muted-foreground select-all">{share}</pre>

        <DialogFooter>
          <Button variant="outline" onClick={() => void copy()}><Copy data-icon="inline-start" /> {copied ? "Copied" : "Copy run summary"}</Button>
          {extracted && (
            <Button variant="secondary" onClick={() => { dismiss(); setCopied(false); useUi.getState().request("ledger"); }}>Open the Vault</Button>
          )}
          <Button onClick={() => { dismiss(); setCopied(false); }}>Back to camp</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, sub, accent, icon }: { label: string; value: string; sub?: string; accent?: string; icon?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-2.5">
      <div className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</div>
      <div className={`flex items-center gap-1 font-pixel ${accent ?? ""}`}>{icon && <Flame className="size-3.5" />}{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
