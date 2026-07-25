import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function Card({ children, className, glow = false }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        "[border-color:var(--border)] [background:var(--surface)]",
        glow && "shadow-[0_0_0_1px_var(--accent-soft),0_8px_30px_-12px_var(--accent-soft)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-sm font-semibold tracking-wide uppercase [color:var(--text-muted)]">{title}</h3>
        {subtitle && <p className="text-xs mt-0.5 [color:var(--text-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
