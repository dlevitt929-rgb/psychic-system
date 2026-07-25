import { CURRENT_GW, fixturesForGw } from "@/lib/data/fixtures";

export function GwCountdown() {
  const fixtures = fixturesForGw(CURRENT_GW).sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  const deadline = fixtures[0] ? new Date(new Date(fixtures[0].kickoff).getTime() - 90 * 60 * 1000) : null;

  return (
    <div className="border-b [border-color:var(--border)] [background:var(--accent-soft)] px-4 sm:px-6 py-1.5 text-xs text-center [color:var(--accent-strong)] font-medium">
      Gameweek {CURRENT_GW} deadline{" "}
      {deadline?.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) ?? "TBC"}
    </div>
  );
}
