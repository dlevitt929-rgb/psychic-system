import { CLUBS } from "@/lib/data/clubs";
import { clubById } from "@/lib/data/clubs";
import { CURRENT_GW, gwFixtureAnomalies } from "@/lib/data/fixtures";
import { fixtureDifficultyForClub, fdrColour } from "@/lib/prediction/fdr";
import { ClubBadge } from "@/components/ui/ClubBadge";

export function FixtureTicker({ kind, gwCount = 8 }: { kind: "attack" | "defence"; gwCount?: number }) {
  const toGw = CURRENT_GW + gwCount - 1;
  const gws = Array.from({ length: gwCount }, (_, i) => CURRENT_GW + i);

  const rows = CLUBS.map((club) => {
    const fixtures = fixtureDifficultyForClub(club.id, CURRENT_GW, toGw);
    const byGw = new Map<number, typeof fixtures>();
    for (const f of fixtures) byGw.set(f.gw, [...(byGw.get(f.gw) ?? []), f]);
    const avg = fixtures.length ? fixtures.reduce((s, f) => s + (kind === "attack" ? f.attackFdr : f.defenceFdr), 0) / fixtures.length : 3;
    return { club, byGw, avg };
  }).sort((a, b) => a.avg - b.avg);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm border-separate border-spacing-y-1 min-w-[720px]">
        <thead>
          <tr className="text-left text-xs [color:var(--text-muted)] uppercase tracking-wide">
            <th className="px-2 py-1 sticky left-0 [background:var(--bg)]">Club</th>
            {gws.map((gw) => (
              <th key={gw} className="px-1 py-1 text-center font-medium">
                GW{gw}
                {gwFixtureAnomalies(gw).blankClubIds.length > 0 && <div className="text-[9px] normal-case [color:var(--red)]">blanks</div>}
                {gwFixtureAnomalies(gw).doubleClubIds.length > 0 && <div className="text-[9px] normal-case [color:var(--green)]">doubles</div>}
              </th>
            ))}
            <th className="px-2 py-1 text-center">Avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ club, byGw, avg }) => (
            <tr key={club.id}>
              <td className="px-2 py-1 sticky left-0 [background:var(--bg)]">
                <div className="flex items-center gap-2 font-medium">
                  <ClubBadge clubId={club.id} size={18} />
                  {club.shortName}
                </div>
              </td>
              {gws.map((gw) => {
                const fx = byGw.get(gw) ?? [];
                if (fx.length === 0) {
                  return (
                    <td key={gw} className="px-1 py-1 text-center">
                      <div className="rounded-md text-[10px] py-1 [background:var(--surface-hover)] [color:var(--text-muted)]">—</div>
                    </td>
                  );
                }
                return (
                  <td key={gw} className="px-1 py-1 text-center">
                    <div className="flex flex-col gap-0.5">
                      {fx.map((f) => (
                        <div
                          key={f.fixtureId}
                          className="rounded-md text-[10px] font-semibold py-1 text-white"
                          style={{ background: fdrColour(kind === "attack" ? f.attackFdr : f.defenceFdr) }}
                          title={`vs ${clubById(f.opponentClubId).shortName} (${f.isHome ? "H" : "A"})`}
                        >
                          {clubById(f.opponentClubId).shortName} {f.isHome ? "H" : "A"}
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
              <td className="px-2 py-1 text-center mono font-semibold">{avg.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
