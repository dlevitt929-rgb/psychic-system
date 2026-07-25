import { clubById } from "@/lib/data/clubs";

export function ClubBadge({ clubId, size = 22 }: { clubId: number; size?: number }) {
  const club = clubById(clubId);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, background: club.colour, fontSize: size * 0.4 }}
      title={club.name}
    >
      {club.shortName.slice(0, 2)}
    </span>
  );
}

export function PositionBadge({ position }: { position: string }) {
  const colours: Record<string, string> = { GK: "#e0a527", DEF: "#5b5bf0", MID: "#12a86b", FWD: "#e5484d" };
  return (
    <span
      className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
      style={{ background: colours[position] ?? "#888" }}
    >
      {position}
    </span>
  );
}
