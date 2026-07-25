import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type Tone = "neutral" | "green" | "red" | "amber" | "accent";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "[background:var(--surface-hover)] [color:var(--text-muted)]",
  green: "[background:var(--green-soft)] [color:var(--green)]",
  red: "[background:var(--red-soft)] [color:var(--red)]",
  amber: "[background:var(--amber-soft)] [color:var(--amber)]",
  accent: "[background:var(--accent-soft)] [color:var(--accent-strong)]",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE_STYLES[tone], className)}>
      {children}
    </span>
  );
}
