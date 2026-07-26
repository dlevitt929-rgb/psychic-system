import Link from "next/link";
import { getActiveTeamId } from "@/lib/session";
import { getUserTeam } from "@/lib/data/userTeam";
import { buildTransferSuggestions, planTransfers, classifySquad } from "@/lib/engine/transfers";
import { HORIZONS, HorizonKey } from "@/lib/prediction/xp";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClubBadge } from "@/components/ui/ClubBadge";
import { fmtMoney, fmtSigned, cn } from "@/lib/utils";

export default async function TransfersPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const horizon = ((sp.h as HorizonKey) && HORIZONS[sp.h as HorizonKey] ? sp.h : "next5") as HorizonKey;

  const teamId = await getActiveTeamId();
  const team = await getUserTeam(teamId);
  const allSuggestions = buildTransferSuggestions(team, horizon);
  const plan = planTransfers(team, horizon);
  const verdicts = classifySquad(team, horizon);

  const grouped = {
    sell: verdicts.filter((v) => v.verdict === "sell"),
    rising: verdicts.filter((v) => v.verdict === "rising"),
    hold: verdicts.filter((v) => v.verdict === "hold"),
  };

  return (
    <div className="space-y-6">
      <Card glow>
        <CardHeader title="Transfer Plan" subtitle={`Bank £${team.bank.toFixed(1)}m · ${team.freeTransfers} free transfer(s)`} />
        <div className="flex gap-1 rounded-lg border p-1 [border-color:var(--border)] w-fit mb-4">
          {(["next1", "next3", "next5", "next8", "season"] as HorizonKey[]).map((h) => (
            <Link
              key={h}
              href={`/transfers?h=${h}`}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap", horizon === h ? "[background:var(--accent)] text-white" : "[color:var(--text-muted)]")}
            >
              {HORIZONS[h].label}
            </Link>
          ))}
        </div>
        <div className="rounded-xl border p-4 [border-color:var(--border)] [background:var(--accent-soft)]">
          <p className="font-medium">{plan.explanation}</p>
          {plan.hits > 0 && (
            <p className="text-sm mt-1 [color:var(--text-muted)]">
              Total gain {fmtSigned(plan.totalXpGain)} pts, hit cost -{plan.hitCost}, net {fmtSigned(plan.netGain)} — {plan.hitJustified ? "statistically justified." : "not worth it."}
            </p>
          )}
        </div>
      </Card>

      {plan.suggestions.length > 0 && (
        <Card>
          <CardHeader title="Recommended Moves" />
          <div className="space-y-3">
            {plan.suggestions.map((s, i) => (
              <div key={i} className="rounded-xl border p-4 [border-color:var(--border)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <ClubBadge clubId={s.out.clubId} size={20} /> {s.out.webName} <span className="[color:var(--text-muted)]">→</span>
                    <ClubBadge clubId={s.in.clubId} size={20} /> {s.in.webName}
                  </div>
                  <Badge tone={s.cost > 0 ? "amber" : "green"}>{s.cost > 0 ? `+${fmtMoney(s.cost)}` : s.cost < 0 ? fmtMoney(s.cost) : "Cost neutral"}</Badge>
                </div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>
                    Next GW: <span className="mono font-semibold">{fmtSigned(s.xpGainNext1)}</span>
                  </span>
                  <span>
                    {HORIZONS[horizon].label}: <span className="mono font-semibold">{fmtSigned(s.xpGainHorizon)}</span>
                  </span>
                  <span>Confidence: {Math.round(s.confidence * 100)}%</span>
                </div>
                <ul className="mt-2 text-xs [color:var(--text-muted)] list-disc list-inside space-y-0.5">
                  {s.reasons.map((r, ri) => (
                    <li key={ri}>{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Sell" subtitle="Future value has dropped" />
          <ul className="space-y-2 text-sm">
            {grouped.sell.length === 0 && <li className="[color:var(--text-muted)]">None right now.</li>}
            {grouped.sell.map((v) => (
              <li key={v.player.id}>
                <div className="font-medium">{v.player.webName}</div>
                <div className="text-xs [color:var(--text-muted)]">{v.reason}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Hold" subtitle="No better option available" />
          <ul className="space-y-2 text-sm">
            {grouped.hold.map((v) => (
              <li key={v.player.id} className="font-medium">
                {v.player.webName}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Rising" subtitle="Future value is climbing" />
          <ul className="space-y-2 text-sm">
            {grouped.rising.length === 0 && <li className="[color:var(--text-muted)]">None right now.</li>}
            {grouped.rising.map((v) => (
              <li key={v.player.id}>
                <div className="font-medium">{v.player.webName}</div>
                <div className="text-xs [color:var(--text-muted)]">{v.reason}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="All Candidate Swaps" subtitle="Every profitable single transfer, ranked" />
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide [color:var(--text-muted)] border-b [border-color:var(--border)]">
                <th className="py-2">Out</th>
                <th className="py-2">In</th>
                <th className="py-2">Cost</th>
                <th className="py-2">{HORIZONS[horizon].label} Gain</th>
              </tr>
            </thead>
            <tbody>
              {allSuggestions.slice(0, 15).map((s, i) => (
                <tr key={i} className="border-b last:border-0 [border-color:var(--border)]">
                  <td className="py-2">{s.out.webName}</td>
                  <td className="py-2">{s.in.webName}</td>
                  <td className="py-2 mono">{fmtMoney(s.cost)}</td>
                  <td className="py-2 mono font-semibold">{fmtSigned(s.xpGainHorizon)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
