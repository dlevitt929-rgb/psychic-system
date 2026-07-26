import Link from "next/link";
import { getActiveTeamId } from "@/lib/session";
import { getUserTeam } from "@/lib/data/userTeam";
import { getRivalTeams, getMiniLeagueMeta } from "@/lib/data/leagues";
import { recommendStrategy, biggestRivalThreatsAndOpportunities } from "@/lib/engine/miniLeague";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtRank } from "@/lib/utils";

export default async function MiniLeaguePage() {
  const teamId = await getActiveTeamId();
  const team = await getUserTeam(teamId);
  const [rivals, league] = await Promise.all([getRivalTeams(teamId), getMiniLeagueMeta(teamId)]);

  const standings = [
    { id: team.id, name: `${team.managerName} (You)`, teamName: team.teamName, points: team.overallPoints, isYou: true },
    ...rivals.map((r) => ({ id: r.id, name: r.managerName, teamName: r.teamName, points: r.overallPoints, isYou: false })),
  ].sort((a, b) => b.points - a.points);

  const yourIndex = standings.findIndex((s) => s.isYou);
  const gap = standings[0].points - team.overallPoints;
  const strategy = recommendStrategy(gap);
  const { threats, opportunities } = biggestRivalThreatsAndOpportunities(team, rivals);

  return (
    <div className="space-y-6">
      <Card glow>
        <CardHeader title="Mini-League War Room" subtitle={league.name} />
        <p className="text-sm">
          You are <span className="font-semibold">{yourIndex + 1} of {standings.length}</span>, {gap <= 0 ? "leading" : `${gap} points behind 1st`}.
        </p>
        <div className="mt-3 rounded-xl border p-4 [border-color:var(--border)] [background:var(--accent-soft)]">
          <Badge tone={strategy.strategy === "attack" ? "red" : "green"}>{strategy.strategy === "attack" ? "Attack Rank" : "Protect Rank"}</Badge>
          <p className="text-sm mt-2">{strategy.explanation}</p>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 pb-0">
          <CardHeader title="Standings" />
        </div>
        <table className="w-full text-sm">
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.id} className={`border-t [border-color:var(--border)] ${s.isYou ? "[background:var(--accent-soft)] font-semibold" : ""}`}>
                <td className="px-5 py-3 w-8">{i + 1}</td>
                <td className="px-3 py-3">
                  <div>{s.name}</div>
                  <div className="text-xs [color:var(--text-muted)]">{s.teamName}</div>
                </td>
                <td className="px-3 py-3 mono text-right">{fmtRank(s.points)}</td>
                <td className="px-5 py-3 text-right">
                  {!s.isYou && (
                    <Link href={`/mini-league/${league.id}/rival/${s.id}`} className="text-xs font-semibold [color:var(--accent-strong)] hover:underline">
                      Compare →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Biggest Threats" subtitle="High effective ownership, not in your squad" />
          <ul className="space-y-2 text-sm">
            {threats.length === 0 && <li className="[color:var(--text-muted)]">No major shared threats outside your squad.</li>}
            {threats.map((t) => (
              <li key={t.player.id} className="flex items-center justify-between">
                <span className="font-medium">{t.player.webName}</span>
                <Badge tone="red">EO {t.effectiveOwnership}%</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Biggest Opportunities" subtitle="Your differentials with strong next-GW projections" />
          <ul className="space-y-2 text-sm">
            {opportunities.length === 0 && <li className="[color:var(--text-muted)]">No standout differentials right now.</li>}
            {opportunities.map((o) => (
              <li key={o.player.id} className="flex items-center justify-between">
                <span className="font-medium">{o.player.webName}</span>
                <Badge tone="green">EO {o.effectiveOwnership}%</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
