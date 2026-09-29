import { useMemo } from "react";
import { maskToDataUrl, type Mask } from "@/render/sprites";
import { cn } from "@/lib/utils";

export function PixelSprite({ mask, px = 3, color = "#F5F5F5", halo, className, label }: {
  mask: Mask; px?: number; color?: string; halo?: string; className?: string; label?: string;
}) {
  const key = mask.join("|");
  const src = useMemo(() => maskToDataUrl(key.split("|"), px, color, halo), [key, px, color, halo]);
  return <img src={src} alt={label ?? ""} aria-hidden={label ? undefined : true} className={cn("pixelated", className)} draggable={false} />;
}
