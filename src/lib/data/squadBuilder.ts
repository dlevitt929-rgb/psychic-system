import { Player, Position, SquadPick } from "@/lib/types";
import { PLAYERS } from "@/lib/data/players";
import { mulberry32 } from "@/lib/data/random";

const FORMATION_QUOTA: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const MAX_PER_CLUB = 3;

/** Builds a valid-ish 15-man squad (budget, quotas, max-3-per-club) from a seed. */
export function buildRandomSquad(seed: number, budget = 100): { players: Player[]; spend: number } {
  const rng = mulberry32(seed);
  const squad: Player[] = [];
  const clubCounts = new Map<number, number>();
  let spend = 0;

  for (const position of Object.keys(FORMATION_QUOTA) as Position[]) {
    const byPrice = PLAYERS.filter((p) => p.position === position).sort((a, b) => a.price - b.price);
    // A real manager's squad is overwhelmingly nailed players — most picks
    // come from a pool pre-filtered to a reasonable share of expected
    // minutes, with only an occasional pick (rotation risk, a punt, a
    // genuine backup) drawn from the unfiltered pool.
    const nailedPool = byPrice.filter((p) => p.minutesPerGame >= 40);
    let attempts = 0;
    let filled = 0;
    while (filled < FORMATION_QUOTA[position] && attempts < 400) {
      attempts++;
      const useNailedPool = rng() > 0.15 && nailedPool.length >= 6;
      const pool = useNailedPool ? nailedPool : byPrice;
      // Bias towards mid-priced players so squads look like real teams (a
      // few premiums, mostly mid-range, a couple of budget enablers).
      // Averaging two uniforms gives a triangular distribution peaked at the
      // middle of the price-sorted pool, with naturally thinner tails at
      // both the cheap and premium ends.
      const biasIdx = Math.floor(((rng() + rng()) / 2) * pool.length);
      const windowSize = Math.min(pool.length, 24);
      const windowStart = Math.max(0, Math.min(pool.length - windowSize, biasIdx - windowSize / 2));
      const window = pool
        .slice(windowStart, windowStart + windowSize)
        .filter((p) => !squad.some((s) => s.id === p.id) && (clubCounts.get(p.clubId) ?? 0) < MAX_PER_CLUB);
      if (window.length === 0) continue;
      // Within the window, still nudge towards the higher-minutes option
      // most of the time rather than picking uniformly at random.
      const candidate = rng() > 0.3 ? window.reduce((best, p) => (p.minutesPerGame > best.minutesPerGame ? p : best)) : window[Math.floor(rng() * window.length)];
      squad.push(candidate);
      clubCounts.set(candidate.clubId, (clubCounts.get(candidate.clubId) ?? 0) + 1);
      spend += candidate.price;
      filled++;
    }
  }

  // trim towards budget: swap priciest players for cheaper same-position ones
  let guard = 0;
  while (spend > budget && guard < 60) {
    guard++;
    const priciest = [...squad].sort((a, b) => b.price - a.price)[0];
    const cheaperOptions = PLAYERS.filter(
      (p) => p.position === priciest.position && p.price < priciest.price && !squad.some((s) => s.id === p.id) && (clubCounts.get(p.clubId) ?? 0) < MAX_PER_CLUB
    ).sort((a, b) => a.price - b.price);
    const replacement = cheaperOptions[0];
    if (!replacement) break;
    const idx = squad.findIndex((p) => p.id === priciest.id);
    squad[idx] = replacement;
    clubCounts.set(priciest.clubId, (clubCounts.get(priciest.clubId) ?? 0) - 1);
    clubCounts.set(replacement.clubId, (clubCounts.get(replacement.clubId) ?? 0) + 1);
    spend = spend - priciest.price + replacement.price;
  }

  return { players: squad, spend: Math.round(spend * 10) / 10 };
}

const STARTING_FORMATION_MIN: Record<Position, number> = { GK: 1, DEF: 3, MID: 2, FWD: 1 };

/** Picks a valid starting XI (11) from a 15-man squad, maximising a scoring function. */
export function pickStartingXI(squad: Player[], score: (p: Player) => number): { starters: Player[]; bench: Player[] } {
  const byPos = (pos: Position) => squad.filter((p) => p.position === pos).sort((a, b) => score(b) - score(a));
  const gk = byPos("GK");
  const def = byPos("DEF");
  const mid = byPos("MID");
  const fwd = byPos("FWD");

  const starters: Player[] = [gk[0], ...def.slice(0, STARTING_FORMATION_MIN.DEF), ...mid.slice(0, STARTING_FORMATION_MIN.MID), ...fwd.slice(0, STARTING_FORMATION_MIN.FWD)];

  // fill remaining 4 slots (11 - 7 already picked) with the best remaining
  // outfield players regardless of position, respecting max 5 DEF/MID, 3 FWD
  const remainingPool = [...def.slice(STARTING_FORMATION_MIN.DEF), ...mid.slice(STARTING_FORMATION_MIN.MID), ...fwd.slice(STARTING_FORMATION_MIN.FWD)].sort(
    (a, b) => score(b) - score(a)
  );
  const counts = { DEF: STARTING_FORMATION_MIN.DEF, MID: STARTING_FORMATION_MIN.MID, FWD: STARTING_FORMATION_MIN.FWD };
  for (const p of remainingPool) {
    if (starters.length >= 11) break;
    const cap = p.position === "DEF" ? 5 : p.position === "MID" ? 5 : 3;
    if (counts[p.position as "DEF" | "MID" | "FWD"] < cap) {
      starters.push(p);
      counts[p.position as "DEF" | "MID" | "FWD"]++;
    }
  }

  const bench = squad.filter((p) => !starters.some((s) => s.id === p.id));
  // bench order: 2nd GK last, outfield by score
  const benchGk = bench.filter((p) => p.position === "GK");
  const benchOutfield = bench.filter((p) => p.position !== "GK").sort((a, b) => score(b) - score(a));
  return { starters, bench: [...benchOutfield, ...benchGk] };
}

export function toSquadPicks(starters: Player[], bench: Player[], captainId: number, viceCaptainId: number): SquadPick[] {
  const ordered = [...starters, ...bench];
  return ordered.map((p, i) => ({
    playerId: p.id,
    isCaptain: p.id === captainId,
    isViceCaptain: p.id === viceCaptainId,
    multiplier: i >= starters.length ? 0 : p.id === captainId ? 2 : 1,
    position: i + 1,
  }));
}
