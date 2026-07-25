export function StatPill({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border px-4 py-3 [border-color:var(--border)] [background:var(--bg-elevated)]">
      <span className="text-[11px] uppercase tracking-wide [color:var(--text-muted)]">{label}</span>
      <span className="mono text-xl font-semibold">{value}</span>
      {hint && <span className="text-xs [color:var(--text-muted)]">{hint}</span>}
    </div>
  );
}
