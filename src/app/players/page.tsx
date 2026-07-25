import Link from "next/link";
import { PLAYERS } from "@/lib/data/players";
import { CLUBS } from "@/lib/data/clubs";
import { xpForHorizon, HORIZONS, HorizonKey } from "@/lib/prediction/xp";
import { differentialScore } from "@/lib/engine/differentials";
import { ClubBadge, PositionBadge } from "@/components/ui/ClubBadge";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn, fmtMoney, fmtPct } from "@/lib/utils";

type SearchParams = { q?: string; pos?: string; club?: string; maxOwn?: string; sort?: string; h?: string };

const SORTS = [
  { key: "xp", label: "Expected Points" },
  { key: "diff", label: "Differential Score" },
  { key: "price", label: "Price" },
  { key: "form", label: "Form" },
  { key: "own", label: "Ownership" },
  { key: "value", label: "Value (xP / £m)" },
];

function buildHref(current: SearchParams, patch: Partial<SearchParams>) {
  const params = new URLSearchParams({ ...current, ...patch } as Record<string, string>);
  for (const [k, v] of [...params.entries()]) if (!v || v === "ALL") params.delete(k);
  const qs = params.toString();
  return qs ? `/players?${qs}` : "/players";
}

export default async function PlayersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const horizon = ((sp.h as HorizonKey) && HORIZONS[sp.h as HorizonKey] ? sp.h : "next5") as HorizonKey;
  const { from, to } = HORIZONS[horizon];
  const maxOwn = sp.maxOwn ? Number(sp.maxOwn) : 100;

  let rows = PLAYERS.filter((p) => {
    if (sp.q && !p.webName.toLowerCase().includes(sp.q.toLowerCase())) return false;
    if (sp.pos && sp.pos !== "ALL" && p.position !== sp.pos) return false;
    if (sp.club && sp.club !== "ALL" && p.clubId !== Number(sp.club)) return false;
    if (p.selectedByPercent > maxOwn) return false;
    return true;
  }).map((p) => ({ player: p, xp: xpForHorizon(p, from, to).total }));

  const sort = sp.sort || "xp";
  rows = rows.sort((a, b) => {
    if (sort === "price") return b.player.price - a.player.price;
    if (sort === "form") return b.player.form - a.player.form;
    if (sort === "own") return b.player.selectedByPercent - a.player.selectedByPercent;
    if (sort === "value") return b.xp / b.player.price - a.xp / a.player.price;
    if (sort === "diff") return differentialScore(b.player, horizon).differentialScore - differentialScore(a.player, horizon).differentialScore;
    return b.xp - a.xp;
  });
  rows = rows.slice(0, 60);

  return (
    <div className="space-y-4">
      <Card>
        <form method="get" className="grid sm:grid-cols-5 gap-3">
          <input name="q" defaultValue={sp.q} placeholder="Search player…" className="rounded-lg border px-3 py-2 text-sm [border-color:var(--border)] [background:var(--bg-elevated)]" />
          <select name="pos" defaultValue={sp.pos || "ALL"} className="rounded-lg border px-3 py-2 text-sm [border-color:var(--border)] [background:var(--bg-elevated)]">
            {["ALL", "GK", "DEF", "MID", "FWD"].map((p) => (
              <option key={p} value={p}>
                {p === "ALL" ? "All positions" : p}
              </option>
            ))}
          </select>
          <select name="club" defaultValue={sp.club || "ALL"} className="rounded-lg border px-3 py-2 text-sm [border-color:var(--border)] [background:var(--bg-elevated)]">
            <option value="ALL">All clubs</option>
            {CLUBS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="maxOwn" defaultValue={sp.maxOwn || "100"} className="rounded-lg border px-3 py-2 text-sm [border-color:var(--border)] [background:var(--bg-elevated)]">
            {[100, 20, 10, 5, 1].map((v) => (
              <option key={v} value={v}>
                {v === 100 ? "Any ownership" : `Under ${v}% owned`}
              </option>
            ))}
          </select>
          <select name="h" defaultValue={horizon} className="rounded-lg border px-3 py-2 text-sm [border-color:var(--border)] [background:var(--bg-elevated)]">
            {(Object.keys(HORIZONS) as HorizonKey[]).map((h) => (
              <option key={h} value={h}>
                {HORIZONS[h].label}
              </option>
            ))}
          </select>
          <button type="submit" className="sm:col-span-5 sm:w-fit rounded-lg px-4 py-2 text-sm font-semibold [background:var(--accent)] text-white">
            Apply filters
          </button>
        </form>
      </Card>

      <div className="flex gap-2 flex-wrap items-center text-xs">
        <span className="[color:var(--text-muted)]">Sort:</span>
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={buildHref(sp, { sort: s.key })}
            className={cn("px-2.5 py-1 rounded-full border [border-color:var(--border)]", sort === s.key ? "[background:var(--accent-soft)] [color:var(--accent-strong)]" : "[color:var(--text-muted)]")}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs [color:var(--text-muted)] uppercase tracking-wide border-b [border-color:var(--border)]">
                <th className="px-4 py-3">Player</th>
                <th className="px-3 py-3">Club</th>
                <th className="px-3 py-3">Pos</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Own%</th>
                <th className="px-3 py-3">Form</th>
                <th className="px-3 py-3">{HORIZONS[horizon].label} xP</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ player, xp }) => (
                <tr key={player.id} className="border-b last:border-0 [border-color:var(--border)] hover:[background:var(--surface-hover)]">
                  <td className="px-4 py-2.5">
                    <Link href={`/players/${player.id}`} className="font-medium hover:[color:var(--accent-strong)]">
                      {player.webName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <ClubBadge clubId={player.clubId} size={20} />
                  </td>
                  <td className="px-3 py-2.5">
                    <PositionBadge position={player.position} />
                  </td>
                  <td className="px-3 py-2.5 mono">{fmtMoney(player.price)}</td>
                  <td className="px-3 py-2.5 mono">{fmtPct(player.selectedByPercent)}</td>
                  <td className="px-3 py-2.5 mono">{player.form.toFixed(1)}</td>
                  <td className="px-3 py-2.5 mono font-semibold">{xp.toFixed(1)}</td>
                  <td className="px-3 py-2.5">{player.status !== "available" && <Badge tone="red">{player.status}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
