import { AlertTriangle, Loader2, RefreshCw, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { friendFrame } from "@/chain/friend-sprite";
import { FAMILY_PERKS, FRIEND_BLESSING_TEXT } from "@/game/catalog";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/state/wallet";
import { PixelSprite } from "./pixel-sprite";

export function FriendPanel() {
  const w = useWallet();
  const family = w.sprite ? FAMILY_PERKS[w.sprite.family] : null;

  return (
    <Card className="bg-gradient-to-b from-lime/[0.06] to-transparent ring-lime/25">
      <CardHeader>
        <CardTitle className="font-pixel text-lime">Rare Friend blessing</CardTitle>
        <CardDescription>
          Optional. Hold a hardwired Rare Friend (generation 1+) on Robinhood Chain for {FRIEND_BLESSING_TEXT}, and descend as your Friend with its family perk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {w.status === "idle" && (
          <Button onClick={() => void w.connect()} className="w-full">
            <Wallet data-icon="inline-start" /> Connect wallet (read-only)
          </Button>
        )}
        {(w.status === "connecting" || w.status === "loading") && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {w.status === "connecting" ? "Waiting for your wallet…" : "Looking for your Rare Friends on Robinhood Chain…"}
          </div>
        )}
        {w.status === "error" && (
          <div className="space-y-2">
            <p className="flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {w.error}</p>
            <Button variant="outline" size="sm" onClick={() => void w.retry()}>
              <RefreshCw data-icon="inline-start" /> Retry
            </Button>
          </div>
        )}
        {w.status === "ready" && w.friends.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hardwired Rare Friends in {w.account && shortAddress(w.account)}{w.hidden > 0 && ` (${w.hidden} generation-0 Friend${w.hidden > 1 ? "s" : ""} hidden)`}. You can still play: every mechanic works without one.
          </p>
        )}
        {w.status === "ready" && w.friends.length > 0 && (
          <>
            <div className="flex items-center gap-3">
              <div className="grid size-20 place-items-center rounded-lg border border-lime/30 bg-black">
                {w.sprite ? (
                  <PixelSprite mask={friendFrame(w.sprite, "down", false, 0)} px={4} color="#F5F5F5" halo="#000" label={`Rare Friend #${w.selected}`} />
                ) : w.spriteStatus === "error" ? (
                  <AlertTriangle className="size-5 text-destructive" />
                ) : (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-pixel text-sm">Friend #{w.selected?.toString()}</span>
                  <Badge className="bg-lime text-black">Blessed</Badge>
                  {w.watchOnly && <Badge variant="outline">dev watch</Badge>}
                </div>
                {family && <p className="text-xs text-muted-foreground"><span className="text-foreground">{family.name}:</span> {family.text}</p>}
                {w.spriteStatus === "error" && (
                  <Button variant="link" size="xs" className="px-0" onClick={() => w.selected !== null && void w.select(w.selected)}>Retry artwork</Button>
                )}
              </div>
            </div>
            {w.friends.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {w.friends.map(f => (
                  <Button key={f.id.toString()} size="xs" variant={f.id === w.selected ? "default" : "outline"} onClick={() => void w.select(f.id)}>
                    #{f.id.toString()}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
