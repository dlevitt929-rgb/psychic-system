import { notFound } from "next/navigation";
import { getActiveTeamId } from "@/lib/session";
import { getUserTeam } from "@/lib/data/userTeam";
import { getRivalTeams } from "@/lib/data/leagues";
import { playerById } from "@/lib/data/players";
import { compareToRival, recommendStrategy } from "@/lib/engine/miniLeague";
import { xpNextGw } from "@/lib/prediction/xp";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClubBadge } from "@/components/ui/ClubBadge";
import { fmtMoney, fmtRank } from "@/lib/utils";

export default async function RivalPage({ params }: { params: Promise<{ leagueId: string; managerId: string }> }) {
  const { managerId } = await params;
  const teamId = await getActiveTeamId();
  const team = await getUserTeam(teamId);
  const rivals = await getRivalTeams(teamId);
  const rival = rivals.find((r) => r.id === Number(managerId));
  if (!rival) notFound();

  const comparison = compareToRival(team, rival);
  const strategy = recommendStrategy(comparison.gap);
  const rivalCaptain = playerById(rival.picks.find((p) => p.isCaptain)?.playerId ?? -1);

  return (
    <div className="space-y-6">
      <Card glow>
        <CardHeader title={`${team.managerName} vs ${rival.managerName}`} subtitle={`${rival.teamName}`} />
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border p-4 [border-color:var(--border)]">
            <div className="text-xs uppercase tracking-wide [color:var(--text-muted)]">Points gap</div>
            <div className="text-2xl font-bold mono">{comparison.gap > 0 ? `${comparison.gap} behind` : `${Math.abs(comparison.gap)} ahead`}</div>
          </div>
          <div className="rounded-xl border p-4 [border-color:var(--border)]">
            <div className="text-xs uppercase tracking-wide [color:var(--text-muted)]">Shared players</div>
            <div className="text-2xl font-bold mono">{comparison.sharedPlayerIds.length}</div>
          </div>
          <div className="rounded-xl border p-4 [border-color:var(--border)]">
            <div className="text-xs uppercase tracking-wide [color:var(--text-muted)]">Their team value</div>
            <div className="text-2xl font-bold mono">{fmtMoney(rival.teamValue)}</div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border p-4 [border-color:var(--border)] [background:var(--accent-soft)]">
          <Badge tone={strategy.strategy === "attack" ? "red" : "green"}>{strategy.strategy === "attack" ? "Attack Rank" : "Protect Rank"}</Badge>
          <p className="text-sm mt-2">{strategy.explanation}</p>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Key Threats" subtitle="In their XI, not in yours" />
          <ul className="space-y-2 text-sm">
            {comparison.rivalThreats.length === 0 && <li className="[color:var(--text-muted)]">No unshared threats — your squads largely overlap.</li>}
            {comparison.rivalThreats.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClubBadge clubId={p.clubId} size={18} /> {p.webName}
                  {rivalCaptain?.id === p.id && <Badge tone="amber">C</Badge>}
                </span>
                <span className="mono">{xpNextGw(p).total.toFixed(1)} xP</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Your Differentials" subtitle="In your XI, not in theirs" />
          <ul className="space-y-2 text-sm">
            {comparison.userDifferentials.length === 0 && <li className="[color:var(--text-muted)]">No differentials against this rival right now.</li>}
            {comparison.userDifferentials.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClubBadge clubId={p.clubId} size={18} /> {p.webName}
                </span>
                <span className="mono">{xpNextGw(p).total.toFixed(1)} xP</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Their Chips" />
        <div className="flex flex-wrap gap-2">
          {rival.chips.map((c) => (
            <Badge key={c.name} tone={c.usedGw ? "neutral" : "amber"}>
              {c.name} {c.usedGw ? `(used GW${c.usedGw})` : "available"}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-xs [color:var(--text-muted)]">Overall rank: {fmtRank(rival.overallRank)}</p>
      </Card>
    </div>
  );
}
