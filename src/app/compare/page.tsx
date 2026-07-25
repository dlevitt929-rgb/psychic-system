import { PLAYERS, playerById } from "@/lib/data/players";
import { xpForHorizon, HORIZONS } from "@/lib/prediction/xp";
import { Card, CardHeader } from "@/components/ui/Card";
import { ClubBadge, PositionBadge } from "@/components/ui/ClubBadge";
import { PlayerPicker } from "@/components/players/PlayerPicker";
import { CompareRadar } from "@/components/charts/CompareRadar";
import { fmtMoney, fmtPct } from "@/lib/utils";

const DEFAULT_IDS = [PLAYERS[20]?.id, PLAYERS[45]?.id, PLAYERS[70]?.id].filter(Boolean) as number[];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const sp = await searchParams;
  const ids = sp.ids ? sp.ids.split(",").map(Number).filter(Boolean) : DEFAULT_IDS;
  const players = ids.map((id) => playerById(id)).filter(Boolean) as NonNullable<ReturnType<typeof playerById>>[];
  const xpMap = new Map(players.map((p) => [p.id, xpForHorizon(p, HORIZONS.next5.from, HORIZONS.next5.to).total]));

  const rows: { label: string; get: (p: NonNullable<ReturnType<typeof playerById>>) => string }[] = [
    { label: "Price", get: (p) => fmtMoney(p.price) },
    { label: "Ownership", get: (p) => fmtPct(p.selectedByPercent) },
    { label: "Total points", get: (p) => String(p.totalPoints) },
    { label: "Points per match (form)", get: (p) => p.form.toFixed(1) },
    { label: "Expected points (5 GW)", get: (p) => (xpMap.get(p.id) ?? 0).toFixed(1) },
    { label: "xG per 90", get: (p) => p.xG90.toFixed(2) },
    { label: "xA per 90", get: (p) => p.xA90.toFixed(2) },
    { label: "Shots per 90", get: (p) => p.shots90.toFixed(1) },
    { label: "Big chances per 90", get: (p) => p.bigChances90.toFixed(2) },
    { label: "Key passes per 90", get: (p) => p.keyPasses90.toFixed(1) },
    { label: "Minutes per game", get: (p) => String(p.minutesPerGame) },
    { label: "Penalties", get: (p) => (p.penaltyOrder === 1 ? "Yes" : "No") },
    { label: "Set pieces", get: (p) => (p.setPieceOrder === 1 ? "Yes" : "No") },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Player Comparison" subtitle="Pick up to 4 players" />
        <PlayerPicker allPlayers={PLAYERS} selectedIds={players.map((p) => p.id)} />
      </Card>

      {players.length >= 2 ? (
        <>
          <Card>
            <CardHeader title="Radar" subtitle="Normalised 0-100 against the group's maximum" />
            <CompareRadar players={players} xpMap={xpMap} />
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b [border-color:var(--border)]">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wide [color:var(--text-muted)]">Stat</th>
                    {players.map((p) => (
                      <th key={p.id} className="px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                          <ClubBadge clubId={p.clubId} size={18} />
                          <span className="font-semibold">{p.webName}</span>
                          <PositionBadge position={p.position} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b last:border-0 [border-color:var(--border)]">
                      <td className="px-4 py-2.5 [color:var(--text-muted)]">{row.label}</td>
                      {players.map((p) => (
                        <td key={p.id} className="px-4 py-2.5 mono">
                          {row.get(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <p className="text-sm [color:var(--text-muted)]">Add at least 2 players to compare.</p>
      )}
    </div>
  );
}
