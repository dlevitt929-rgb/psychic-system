import { clubById } from "@/lib/data/clubs";
import { fixturesForClub } from "@/lib/data/fixtures";
import { FixtureDifficulty } from "@/lib/types";

const HOME_ADVANTAGE = 6; // points added to a club's effective strength when playing at home

/**
 * Our own fixture-difficulty score, deliberately not a 1:1 copy of the
 * official FPL FDR. Two separate scores are produced because "hard fixture"
 * means different things for attacking returns vs clean sheets — a
 * strong-defence/weak-attack side (e.g. a mid-table counter-attacking team)
 * can be a bad clean-sheet fixture but a fine one for your forwards.
 *
 * attackFdr: how hard it is for the CLUB's attackers to score/assist —
 *   driven by the opponent's defence strength.
 * defenceFdr: how hard it is for the CLUB's defenders/GK to keep a clean
 *   sheet — driven by the opponent's attack strength.
 * Both scaled 1 (easiest) - 5 (hardest).
 */
function toFdrScale(effectiveOpponentStrength: number): number {
  // effectiveOpponentStrength roughly ranges 45-95
  const clamped = Math.min(96, Math.max(45, effectiveOpponentStrength));
  const scaled = 1 + ((clamped - 45) / (96 - 45)) * 4;
  return Math.round(scaled * 10) / 10;
}

export function fixtureDifficultyForClub(clubId: number, fromGw?: number, toGw?: number): FixtureDifficulty[] {
  const fixtures = fixturesForClub(clubId, fromGw, toGw);
  return fixtures.map((f) => {
    const isHome = f.homeClubId === clubId;
    const opponentClubId = isHome ? f.awayClubId : f.homeClubId;
    const opponent = clubById(opponentClubId);
    const awayPenaltyForOpponent = isHome ? HOME_ADVANTAGE : -HOME_ADVANTAGE; // opponent is away if we're home

    const opponentDefenceEffective = opponent.defenceStrength - awayPenaltyForOpponent;
    const opponentAttackEffective = opponent.attackStrength - awayPenaltyForOpponent;

    return {
      fixtureId: f.id,
      gw: f.gw,
      opponentClubId,
      isHome,
      attackFdr: toFdrScale(opponentDefenceEffective),
      defenceFdr: toFdrScale(opponentAttackEffective),
    };
  });
}

export function averageFdr(fixtures: FixtureDifficulty[], kind: "attack" | "defence"): number {
  if (fixtures.length === 0) return 3;
  const sum = fixtures.reduce((acc, f) => acc + (kind === "attack" ? f.attackFdr : f.defenceFdr), 0);
  return Math.round((sum / fixtures.length) * 10) / 10;
}

export const FDR_COLOURS: Record<number, string> = {
  1: "#0b6e4f", // easiest — deep green
  2: "#4fb477",
  3: "#e8b93a",
  4: "#d9713c",
  5: "#c0392b", // hardest — deep red
};

export function fdrColour(score: number): string {
  const bucket = Math.min(5, Math.max(1, Math.round(score)));
  return FDR_COLOURS[bucket];
}
