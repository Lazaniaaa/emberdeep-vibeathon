import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";

/** On-screen movement pad for touch screens. Hidden on large screens. */
export function DPad({ onMove, onWait, disabled, compact }: {
  onMove: (dx: number, dy: number) => void; onWait?: () => void; disabled?: boolean; compact?: boolean;
}) {
  const btn = compact ? "size-12 rounded-xl border-white/25 bg-[#150c2b]/80 text-base backdrop-blur-sm" : "size-14 rounded-xl text-base";
  return (
    <div className="mx-auto grid w-fit grid-cols-3 gap-2 lg:hidden" aria-label="Movement controls">
      <span />
      <Button variant="outline" className={btn} disabled={disabled} onClick={() => onMove(0, -1)} aria-label="Move up"><ArrowUp /></Button>
      <span />
      <Button variant="outline" className={btn} disabled={disabled} onClick={() => onMove(-1, 0)} aria-label="Move left"><ArrowLeft /></Button>
      {onWait
        ? <Button variant="outline" className={btn} disabled={disabled} onClick={onWait} aria-label="Wait a turn"><Hourglass /></Button>
        : <span />}
      <Button variant="outline" className={btn} disabled={disabled} onClick={() => onMove(1, 0)} aria-label="Move right"><ArrowRight /></Button>
      <span />
      <Button variant="outline" className={btn} disabled={disabled} onClick={() => onMove(0, 1)} aria-label="Move down"><ArrowDown /></Button>
      <span />
    </div>
  );
}
