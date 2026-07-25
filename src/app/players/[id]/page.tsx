import { notFound } from "next/navigation";
import { playerById } from "@/lib/data/players";
import { clubById } from "@/lib/data/clubs";
import { xpForHorizon, HORIZONS } from "@/lib/prediction/xp";
import { fixtureDifficultyForClub, fdrColour } from "@/lib/prediction/fdr";
import { predictPriceChange } from "@/lib/engine/price";
import { CURRENT_GW } from "@/lib/data/fixtures";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClubBadge, PositionBadge } from "@/components/ui/ClubBadge";
import { StatPill } from "@/components/ui/StatPill";
import { fmtMoney, fmtPct, fmtSigned } from "@/lib/utils";

function aiVerdict(xp5: number, price: number, ownership: number, status: string): { verdict: "BUY" | "HOLD" | "SELL" | "WATCH"; reason: string } {
  const value = xp5 / price;
  if (status !== "available") return { verdict: "WATCH", reason: "Availability is uncertain — confirm status before your deadline." };
  if (value > 1.4 && xp5 > 15) return { verdict: "BUY", reason: `Elite value at ${value.toFixed(2)} xP per £m over the next 5 gameweeks.` };
  if (xp5 > 22) return { verdict: "BUY", reason: "Top-tier expected returns regardless of price." };
  if (xp5 < 6) return { verdict: "SELL", reason: "Projected returns are well below a typical squad player over this horizon." };
  if (ownership < 5 && value > 1.0) return { verdict: "WATCH", reason: "Differential profile worth monitoring for a fixture swing." };
  return { verdict: "HOLD", reason: "Solid, unspectacular projected returns — no urgency either way." };
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = playerById(Number(id));
  if (!player) notFound();

  const club = clubById(player.clubId);
  const xp1 = xpForHorizon(player, HORIZONS.next1.from, HORIZONS.next1.to);
  const xp5 = xpForHorizon(player, HORIZONS.next5.from, HORIZONS.next5.to);
  const fixtures = fixtureDifficultyForClub(player.clubId, CURRENT_GW, CURRENT_GW + 7);
  const price = predictPriceChange(player);
  const verdict = aiVerdict(xp5.total, player.price, player.selectedByPercent, player.status);

  const verdictTone = { BUY: "green", HOLD: "accent", SELL: "red", WATCH: "amber" } as const;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full [background:var(--surface-hover)] border [border-color:var(--border)] flex items-center justify-center">
              <ClubBadge clubId={player.clubId} size={40} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{player.webName}</h1>
                <PositionBadge position={player.position} />
              </div>
              <p className="text-sm [color:var(--text-muted)]">
                {player.firstName} {player.secondName} · {club.name}
              </p>
            </div>
          </div>
          <Badge tone={verdictTone[verdict.verdict]} className="text-sm px-3 py-1.5">
            AI Verdict: {verdict.verdict}
          </Badge>
        </div>
        <p className="mt-3 text-sm [color:var(--text-muted)]">{verdict.reason}</p>
      </Card>

      <div className="grid sm:grid-cols-4 gap-3">
        <StatPill label="Price" value={fmtMoney(player.price)} />
        <StatPill label="Ownership" value={fmtPct(player.selectedByPercent)} />
        <StatPill label="Total Points" value={String(player.totalPoints)} />
        <StatPill label="Form" value={player.form.toFixed(1)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Expected Points" subtitle="Explainable breakdown — next gameweek" />
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold mono">{xp1.total.toFixed(1)}</span>
            <span className="text-sm [color:var(--text-muted)]">
              range {xp1.floor.toFixed(1)}–{xp1.ceiling.toFixed(1)} · {Math.round(xp1.confidence * 100)}% confidence
            </span>
          </div>
          <ul className="space-y-1.5 text-sm">
            {[
              ["Appearance", xp1.appearance],
              ["Goals", xp1.goals],
              ["Assists", xp1.assists],
              ["Clean sheet", xp1.cleanSheet],
              ["Saves", xp1.saves],
              ["Bonus", xp1.bonus],
              ["Defensive contribution", xp1.defensiveContribution],
              ["Cards", xp1.cards],
            ]
              .filter(([, v]) => Math.abs(v as number) > 0.01)
              .map(([label, v]) => (
                <li key={label as string} className="flex items-center justify-between">
                  <span className="[color:var(--text-muted)]">{label}</span>
                  <span className="mono">{fmtSigned(v as number)}</span>
                </li>
              ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Underlying Stats" subtitle="Per 90 minutes" />
          <ul className="space-y-1.5 text-sm">
            {[
              ["xG per 90", player.xG90],
              ["xA per 90", player.xA90],
              ["Shots per 90", player.shots90],
              ["Key passes per 90", player.keyPasses90],
              ["Big chances per 90", player.bigChances90],
              ["Defensive actions per 90", player.defensiveActions90],
              ["Minutes per game", player.minutesPerGame],
            ].map(([label, v]) => (
              <li key={label as string} className="flex items-center justify-between">
                <span className="[color:var(--text-muted)]">{label}</span>
                <span className="mono">{v}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Next 8 Fixtures" subtitle="Colour-coded by our custom FDR" />
        <div className="flex flex-wrap gap-2">
          {fixtures.map((f) => (
            <div
              key={f.fixtureId}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-white min-w-[64px] text-center"
              style={{ background: fdrColour(player.position === "FWD" || player.position === "MID" ? f.attackFdr : f.defenceFdr) }}
            >
              GW{f.gw}
              <br />
              {clubById(f.opponentClubId).shortName} ({f.isHome ? "H" : "A"})
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Price Watch" />
        <p className="text-sm">
          {price.label} — <span className="mono font-semibold">{Math.round(price.probability * 100)}%</span> probability (net transfers {price.netTransfers > 0 ? "+" : ""}
          {price.netTransfers.toLocaleString()})
        </p>
      </Card>
    </div>
  );
}
