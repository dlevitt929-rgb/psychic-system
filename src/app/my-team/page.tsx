import Link from "next/link";
import { getActiveTeamId } from "@/lib/session";
import { getUserTeam } from "@/lib/data/userTeam";
import { playerById } from "@/lib/data/players";
import { bestXIFromSquad } from "@/lib/optimizer/milp";
import { planTransfers } from "@/lib/engine/transfers";
import { xpForHorizon, HORIZONS, HorizonKey } from "@/lib/prediction/xp";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClubBadge } from "@/components/ui/ClubBadge";
import { PitchView } from "@/components/pitch/PitchView";
import { StatPill } from "@/components/ui/StatPill";
import { fmtMoney, fmtSigned, cn } from "@/lib/utils";
import { CURRENT_GW } from "@/lib/data/fixtures";

export default async function MyTeamPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const horizon = ((sp.h as HorizonKey) && HORIZONS[sp.h as HorizonKey] ? sp.h : "next5") as HorizonKey;

  const teamId = await getActiveTeamId();
  const team = await getUserTeam(teamId);
  const squad = team.picks.map((p) => playerById(p.playerId)!).filter(Boolean);
  const { starters, bench, captain } = bestXIFromSquad(squad, "next1");
  const xpById = new Map(squad.map((p) => [p.id, xpForHorizon(p, HORIZONS.next1.from, HORIZONS.next1.to).total]));
  const plan = planTransfers(team, horizon);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{team.teamName}</h1>
            <p className="text-sm [color:var(--text-muted)]">
              {team.managerName} · Gameweek {CURRENT_GW}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge tone="accent">£{team.teamValue}m squad</Badge>
            <Badge tone={team.bank > 0 ? "green" : "neutral"}>£{team.bank}m bank</Badge>
            <Badge tone="accent">{team.freeTransfers} FT</Badge>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-4 gap-3">
        <StatPill label="Squad Value" value={fmtMoney(team.teamValue)} />
        <StatPill label="Bank" value={fmtMoney(team.bank)} />
        <StatPill label="Free Transfers" value={String(team.freeTransfers)} />
        <StatPill label="Captain" value={captain.webName} />
      </div>

      <Card>
        <CardHeader title="Your Team" subtitle={`Projected starting XI — GW${CURRENT_GW}`} />
        <PitchView starters={starters} bench={bench} captainId={captain.id} xpById={xpById} />
      </Card>

      <Card glow>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <CardHeader title="Suggested Transfers" subtitle="Ranked by expected-points gain — the replacement named beats your player, not a generic rating" />
        </div>
        <div className="flex gap-1 rounded-lg border p-1 [border-color:var(--border)] w-fit mb-4">
          {(["next1", "next3", "next5", "next8", "season"] as HorizonKey[]).map((h) => (
            <Link
              key={h}
              href={`/my-team?h=${h}`}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap", horizon === h ? "[background:var(--accent)] text-white" : "[color:var(--text-muted)]")}
            >
              {HORIZONS[h].label}
            </Link>
          ))}
        </div>

        <div className="rounded-xl border p-4 mb-4 [border-color:var(--border)] [background:var(--accent-soft)]">
          <p className="text-sm font-medium">{plan.explanation}</p>
        </div>

        {plan.suggestions.length === 0 ? (
          <p className="text-sm [color:var(--text-muted)]">Nothing to action this week — your squad is in good shape.</p>
        ) : (
          <div className="space-y-3">
            {plan.suggestions.map((s, i) => (
              <div key={i} className="rounded-2xl border p-4 [border-color:var(--border)] [background:var(--bg-elevated)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full border [border-color:var(--red)] flex items-center justify-center [background:var(--surface)]">
                        <ClubBadge clubId={s.out.clubId} size={20} />
                      </div>
                      <span className="text-sm font-semibold">{s.out.webName}</span>
                    </div>
                    <span className="[color:var(--text-muted)]">→</span>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full border [border-color:var(--green)] flex items-center justify-center [background:var(--surface)]">
                        <ClubBadge clubId={s.in.clubId} size={20} />
                      </div>
                      <span className="text-sm font-semibold">{s.in.webName}</span>
                    </div>
                  </div>
                  <Badge tone={s.cost > 0 ? "amber" : "green"}>{s.cost > 0 ? `+${fmtMoney(s.cost)}` : s.cost < 0 ? fmtMoney(s.cost) : "Cost neutral"}</Badge>
                </div>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="[color:var(--green)] font-semibold">{fmtSigned(s.xpGainNext1)} next GW</span>
                  <span className="[color:var(--green)] font-semibold">{fmtSigned(s.xpGainHorizon)} {HORIZONS[horizon].label.toLowerCase()}</span>
                  <span className="[color:var(--text-muted)]">{Math.round(s.confidence * 100)}% confidence</span>
                </div>
                <ul className="mt-2 text-xs [color:var(--text-muted)] list-disc list-inside space-y-0.5">
                  {s.reasons.map((r, ri) => (
                    <li key={ri}>{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <Link href="/transfers" className="inline-block mt-4 text-xs font-semibold [color:var(--accent-strong)] hover:underline">
          See every candidate swap →
        </Link>
      </Card>
    </div>
  );
}
