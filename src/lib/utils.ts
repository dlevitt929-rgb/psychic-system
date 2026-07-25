import clsx, { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fmtMoney(m: number): string {
  return `£${m.toFixed(1)}m`;
}

export function fmtSigned(n: number, decimals = 1): string {
  const v = Number(n.toFixed(decimals));
  return `${v > 0 ? "+" : ""}${v}`;
}

export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function fmtRank(n: number): string {
  return n.toLocaleString("en-GB");
}
