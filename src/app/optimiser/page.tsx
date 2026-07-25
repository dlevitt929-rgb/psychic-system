import Link from "next/link";
import { optimiseSquad } from "@/lib/optimizer/milp";
import { HORIZONS, HorizonKey, xpForHorizon } from "@/lib/prediction/xp";
import { Card, CardHeader } from "@/components/ui/Card";
import { PitchView } from "@/components/pitch/PitchView";
import { StatPill } from "@/components/ui/StatPill";
import { ClubBadge, PositionBadge } from "@/components/ui/ClubBadge";
import { fmtMoney, cn } from "@/lib/utils";

export default async function OptimiserPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const horizon = ((sp.h as HorizonKey) && HORIZONS[sp.h as HorizonKey] ? sp.h : "next5") as HorizonKey;
  const { from, to } = HORIZONS[horizon];

  const result = optimiseSquad({ horizon, budget: 100 });
  const xpById = new Map(result.squad.map((p) => [p.id, xpForHorizon(p, from, to).total]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="AI Best Team Optimiser"
          subtitle="A mixed-integer program maximises total expected points under real FPL squad rules — budget, 2/5/5/3 positions, max 3 per club"
        />
        <div className="flex gap-1 rounded-lg border p-1 [border-color:var(--border)] w-fit">
          {(Object.keys(HORIZONS) as HorizonKey[]).map((h) => (
            <Link
              key={h}
              href={`/optimiser?h=${h}`}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap", horizon === h ? "[background:var(--accent)] text-white" : "[color:var(--text-muted)]")}
            >
              {HORIZONS[h].label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatPill label="Total Cost" value={fmtMoney(result.totalCost)} hint="of £100.0m budget" />
        <StatPill label="Projected Squad xP" value={result.totalXp.toFixed(1)} hint={HORIZONS[horizon].label} />
        <StatPill label="Captain" value={result.captain.webName} hint={`${xpForHorizon(result.captain, from, to).total.toFixed(1)} xP (×2)`} />
      </div>

      <Card>
        <CardHeader title="Optimal XI" subtitle="Best legal formation from the optimised 15" />
        <PitchView starters={result.starters} bench={result.bench} captainId={result.captain.id} viceCaptainId={result.viceCaptain.id} xpById={xpById} />
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 pb-0">
          <CardHeader title="Full 15" />
        </div>
        <div className="overflow-x-auto scrollbar-thin px-5 pb-5">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide [color:var(--text-muted)] border-b [border-color:var(--border)]">
                <th className="py-2">Player</th>
                <th className="py-2">Club</th>
                <th className="py-2">Pos</th>
                <th className="py-2">Price</th>
                <th className="py-2">{HORIZONS[horizon].label} xP</th>
              </tr>
            </thead>
            <tbody>
              {result.squad
                .sort((a, b) => (xpById.get(b.id) ?? 0) - (xpById.get(a.id) ?? 0))
                .map((p) => (
                  <tr key={p.id} className="border-b last:border-0 [border-color:var(--border)]">
                    <td className="py-2 font-medium">{p.webName}</td>
                    <td className="py-2">
                      <ClubBadge clubId={p.clubId} size={18} />
                    </td>
                    <td className="py-2">
                      <PositionBadge position={p.position} />
                    </td>
                    <td className="py-2 mono">{fmtMoney(p.price)}</td>
                    <td className="py-2 mono font-semibold">{(xpById.get(p.id) ?? 0).toFixed(1)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
