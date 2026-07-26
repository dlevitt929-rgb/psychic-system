import { Player } from "@/lib/types";
import { ClubBadge } from "@/components/ui/ClubBadge";
import { cn } from "@/lib/utils";

function PlayerToken({ player, isCaptain, isVice, xp, onPitch }: { player: Player; isCaptain?: boolean; isVice?: boolean; xp?: number; onPitch?: boolean }) {
  const atRisk = player.status !== "available";
  const avatar = (
    <div
      className={cn(
        "w-11 h-11 rounded-full [background:var(--surface)] flex items-center justify-center shadow-sm",
        !isCaptain && (atRisk ? "border-2 [border-color:var(--red)]" : "border-2 [border-color:var(--border)]")
      )}
    >
      <ClubBadge clubId={player.clubId} size={26} />
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1 w-[84px] animate-fade-in-up">
      <div className="relative">
        {isCaptain ? <div className="story-ring">{avatar}</div> : avatar}
        {isCaptain && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full [background:var(--amber)] text-[10px] font-bold flex items-center justify-center text-black">
            C
          </span>
        )}
        {isVice && !isCaptain && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full [background:var(--surface-hover)] border [border-color:var(--border)] text-[10px] font-bold flex items-center justify-center">
            V
          </span>
        )}
      </div>
      {/* On the pitch, the name/xP caption sits on grass, so it gets a small
          white chip behind it (like an Instagram photo caption) instead of
          relying on coloured text staying legible over green. */}
      <div className={cn("text-center leading-tight", onPitch && "rounded-lg px-1.5 py-0.5 shadow-sm [background:var(--bg-elevated)]")}>
        <div className="text-xs font-semibold truncate w-[76px]">{player.webName}</div>
        {xp !== undefined && <div className="text-[10px] mono [color:var(--green)] font-medium">{xp.toFixed(1)} xP</div>}
      </div>
      {atRisk && (
        <span className="text-[9px] px-1 rounded [background:var(--red-soft)] [color:var(--red)] font-medium">
          {player.status === "doubtful" ? `${player.chanceOfPlayingNextRound}%` : player.status}
        </span>
      )}
    </div>
  );
}

export function PitchView({
  starters,
  bench,
  captainId,
  viceCaptainId,
  xpById,
}: {
  starters: Player[];
  bench: Player[];
  captainId?: number;
  viceCaptainId?: number;
  xpById?: Map<number, number>;
}) {
  const byPos = (pos: string) => starters.filter((p) => p.position === pos);
  const rows = [byPos("GK"), byPos("DEF"), byPos("MID"), byPos("FWD")];

  return (
    <div className="space-y-4">
      <div
        className="relative rounded-2xl p-4 sm:p-6 flex flex-col justify-between gap-4 overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(180deg, var(--pitch), var(--pitch) 40px, color-mix(in srgb, var(--pitch) 85%, black) 40px, color-mix(in srgb, var(--pitch) 85%, black) 80px)",
        }}
      >
        <div className="absolute inset-4 border-2 border-white/25 rounded-lg pointer-events-none" />
        {rows.map((row, i) => (
          <div key={i} className="flex justify-evenly flex-wrap gap-y-3 relative z-10">
            {row.map((p) => (
              <PlayerToken key={p.id} player={p} isCaptain={p.id === captainId} isVice={p.id === viceCaptainId} xp={xpById?.get(p.id)} onPitch />
            ))}
          </div>
        ))}
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide [color:var(--text-muted)] mb-2">Bench</div>
        <div className={cn("flex gap-3 flex-wrap rounded-xl border p-3 [border-color:var(--border)] [background:var(--bg-elevated)]")}>
          {bench.map((p) => (
            <PlayerToken key={p.id} player={p} xp={xpById?.get(p.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
