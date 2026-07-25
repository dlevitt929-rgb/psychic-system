import { PLAYERS } from "@/lib/data/players";
import { predictPriceChange } from "@/lib/engine/price";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClubBadge, PositionBadge } from "@/components/ui/ClubBadge";
import { fmtMoney } from "@/lib/utils";

export default function PriceWatchPage() {
  const predictions = PLAYERS.map(predictPriceChange);
  const risers = predictions.filter((p) => p.direction === "rise").sort((a, b) => b.probability - a.probability).slice(0, 12);
  const fallers = predictions.filter((p) => p.direction === "fall").sort((a, b) => b.probability - a.probability).slice(0, 12);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Price Change Predictor"
          subtitle="Heuristic: net transfers scaled to ownership base + recent momentum. The official threshold algorithm isn't published, so treat this as directional, not exact."
        />
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="⬆ Likely to Rise" />
          <ul className="space-y-2">
            {risers.map((p) => (
              <li key={p.player.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <ClubBadge clubId={p.player.clubId} size={20} />
                  <PositionBadge position={p.player.position} />
                  {p.player.webName}
                </span>
                <span className="flex items-center gap-2">
                  <span className="mono text-xs [color:var(--text-muted)]">{fmtMoney(p.player.price)}</span>
                  <Badge tone="green">{Math.round(p.probability * 100)}%</Badge>
                </span>
              </li>
            ))}
            {risers.length === 0 && <li className="text-sm [color:var(--text-muted)]">No risers detected right now.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader title="⬇ Likely to Fall" />
          <ul className="space-y-2">
            {fallers.map((p) => (
              <li key={p.player.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <ClubBadge clubId={p.player.clubId} size={20} />
                  <PositionBadge position={p.player.position} />
                  {p.player.webName}
                </span>
                <span className="flex items-center gap-2">
                  <span className="mono text-xs [color:var(--text-muted)]">{fmtMoney(p.player.price)}</span>
                  <Badge tone="red">{Math.round(p.probability * 100)}%</Badge>
                </span>
              </li>
            ))}
            {fallers.length === 0 && <li className="text-sm [color:var(--text-muted)]">No fallers detected right now.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
