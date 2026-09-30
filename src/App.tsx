import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CampScene } from "@/components/camp-scene";
import { ReportDialog } from "@/components/report-dialog";
import { cn } from "@/lib/utils";
import { useRun } from "@/state/run-store";
import { useGame } from "@/state/store";
import { useWallet } from "@/state/wallet";

const RunView = lazy(() => import("@/components/run-view").then(module => ({ default: module.RunView })));

export default function App() {
  const inRun = useRun(s => s.run !== null);
  const reducedMotion = useGame(s => s.reducedMotion);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const watch = new URLSearchParams(location.search).get("watch");
    if (watch && /^0x[\da-fA-F]{40}$/.test(watch)) void useWallet.getState().watch(watch as `0x${string}`);
  }, []);

  return (
    <TooltipProvider>
      {inRun ? (
        <div className={cn(reducedMotion && "reduced-motion")}>
          <Suspense fallback={<p className="fixed inset-0 grid place-items-center bg-black text-muted-foreground">Entering the deep…</p>}><RunView /></Suspense>
        </div>
      ) : (
        <div className={cn(reducedMotion && "reduced-motion")}><CampScene /></div>
      )}
      {!inRun && <ReportDialog />}
      <Toaster theme="dark" position="bottom-center" />
    </TooltipProvider>
  );
}

