import Link from "next/link";
import { getActiveTeamId } from "@/lib/session";
import { getUserTeam } from "@/lib/data/userTeam";
import { getRivalTeams, getMiniLeagueMeta } from "@/lib/data/leagues";
import { playerById } from "@/lib/data/players";
import { bestXIFromSquad } from "@/lib/optimizer/milp";
import { planTransfers, classifySquad } from "@/lib/engine/transfers";
import { rankCaptainOptions } from "@/lib/engine/captaincy";
import { predictPriceChange } from "@/lib/engine/price";
import { xpForHorizon, HORIZONS } from "@/lib/prediction/xp";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatPill } from "@/components/ui/StatPill";
import { Badge } from "@/components/ui/Badge";
import { PitchView } from "@/components/pitch/PitchView";
import { fmtMoney, fmtRank, fmtSigned } from "@/lib/utils";
import { CURRENT_GW } from "@/lib/data/fixtures";

export default async function DashboardPage() {
  const teamId = await getActiveTeamId();
  const [team, rivals, league] = await Promise.all([getUserTeam(teamId), getRivalTeams(teamId), getMiniLeagueMeta(teamId)]);

  const squad = team.picks.map((p) => playerById(p.playerId)!).filter(Boolean);
  const { starters, bench, captain, totalXp } = bestXIFromSquad(squad, "next1");
  const xpById = new Map(squad.map((p) => [p.id, xpForHorizon(p, HORIZONS.next1.from, HORIZONS.next1.to).total]));

  const plan = planTransfers(team, "next5");
  const verdicts = classifySquad(team, "next5");
  const sellCount = verdicts.filter((v) => v.verdict === "sell").length;

  const captainOptions = rankCaptainOptions(starters, "next1").slice(0, 3);

  const priceRisks = squad
    .map(predictPriceChange)
    .filter((p) => p.direction !== "stable")
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);

  const standings = [
    { managerId: team.id, managerName: `${team.managerName} (You)`, totalPoints: team.overallPoints, isYou: true },
    ...rivals.map((r) => ({ managerId: r.id, managerName: r.managerName, totalPoints: r.overallPoints, isYou: false })),
  ].sort((a, b) => b.totalPoints - a.totalPoints);
  const yourRank = standings.findIndex((s) => s.isYou) + 1;
  const gapToFirst = standings[0].totalPoints - team.overallPoints;

  const injuryRisks = squad.filter((p) => p.status !== "available");

  return (
    <div className="space-y-6">
      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 flex flex-col justify-between" glow>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide [color:var(--text-muted)]">Gameweek {CURRENT_GW} Prediction</span>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-5xl font-bold mono">{totalXp.toFixed(1)}</span>
              <span className="[color:var(--text-muted)]">expected points</span>
            </div>
            <p className="mt-2 text-sm [color:var(--text-muted)]">
              Captain: <span className="font-semibold [color:var(--text)]">{captain.webName}</span> · projected {xpForHorizon(captain, CURRENT_GW, CURRENT_GW).total.toFixed(1)}{" "}
              pts (×2)
            </p>
          </div>
          <div className="mt-4 rounded-xl border p-4 [border-color:var(--border)] [background:var(--accent-soft)]">
            <span className="text-xs font-semibold uppercase tracking-wide [color:var(--accent-strong)]">Recommended action</span>
            <p className="mt-1 text-sm">
              {plan.suggestions.length > 0 ? (
                <>
                  <span className="font-semibold">
                    {plan.suggestions[0].out.webName} → {plan.suggestions[0].in.webName}
                  </span>{" "}
                  · {fmtSigned(plan.suggestions[0].xpGainHorizon)} pts over next 5 GWs
                </>
              ) : (
                plan.explanation
              )}
            </p>
            <Link href="/transfers" className="inline-block mt-2 text-xs font-semibold [color:var(--accent-strong)] hover:underline">
              View full transfer plan →
            </Link>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <StatPill label="Team Value" value={fmtMoney(team.teamValue)} />
          <StatPill label="Bank" value={fmtMoney(team.bank)} />
          <StatPill label="Free Transfers" value={String(team.freeTransfers)} />
          <StatPill label="Overall Rank" value={fmtRank(team.overallRank)} />
          <StatPill label="Mini-League Pos." value={`${yourRank} / ${standings.length}`} hint={league.name} />
          <StatPill label="Gap to 1st" value={gapToFirst <= 0 ? "Leading" : `${gapToFirst} pts`} />
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Your Squad" subtitle={`Projected starting XI — GW${CURRENT_GW}`} />
          <PitchView starters={starters} bench={bench} captainId={captain.id} xpById={xpById} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Mini-League" subtitle={league.name} />
            <ol className="space-y-1.5">
              {standings.slice(0, 5).map((s, i) => (
                <li key={s.managerId} className={`flex items-center justify-between text-sm rounded-lg px-2 py-1.5 ${s.isYou ? "[background:var(--accent-soft)] font-semibold" : ""}`}>
                  <span>
                    {i + 1}. {s.managerName}
                  </span>
                  <span className="mono">{s.totalPoints}</span>
                </li>
              ))}
            </ol>
            <Link href="/mini-league" className="inline-block mt-3 text-xs font-semibold [color:var(--accent-strong)] hover:underline">
              Open War Room →
            </Link>
          </Card>

          <Card>
            <CardHeader title="Captaincy" subtitle="Top picks this GW" />
            <ul className="space-y-2">
              {captainOptions.map((c) => (
                <li key={c.player.id} className="flex items-center justify-between text-sm">
                  <span>{c.player.webName}</span>
                  <Badge tone="accent">{c.captainScore.toFixed(1)} pts</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Price Watch" />
            {priceRisks.length === 0 ? (
              <p className="text-sm [color:var(--text-muted)]">No imminent price changes in your squad.</p>
            ) : (
              <ul className="space-y-2">
                {priceRisks.map((p) => (
                  <li key={p.player.id} className="flex items-center justify-between text-sm">
                    <span>{p.player.webName}</span>
                    <Badge tone={p.direction === "rise" ? "green" : "red"}>
                      {p.direction === "rise" ? "▲" : "▼"} {Math.round(p.probability * 100)}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/price-watch" className="inline-block mt-3 text-xs font-semibold [color:var(--accent-strong)] hover:underline">
              Full price board →
            </Link>
          </Card>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Injury / Rotation Risks" subtitle={`${sellCount} player(s) also graded "sell" — see Transfers`} />
          {injuryRisks.length === 0 ? (
            <p className="text-sm [color:var(--text-muted)]">No injury or suspension concerns.</p>
          ) : (
            <ul className="space-y-1.5">
              {injuryRisks.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.webName}</span>
                  <Badge tone="red">{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Chips Remaining" />
          <div className="flex flex-wrap gap-2">
            {team.chips.map((c) => (
              <Badge key={c.name} tone={c.usedGw ? "neutral" : "accent"}>
                {c.name} {c.usedGw ? `(used GW${c.usedGw})` : "available"}
              </Badge>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
