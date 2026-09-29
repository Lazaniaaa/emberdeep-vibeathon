import { toUsd } from "@/game/config";

export function rf(n: number, digits = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

/** A share of a whole as a percentage: two decimals below 10%, one below 100%. */
export function percent(share: number) {
  const p = share * 100;
  const digits = p >= 10 ? 1 : 2;
  return `${p.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits })}%`;
}

export function usd(n: number) {
  const v = toUsd(n);
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: v < 10 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function shortAddress(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
