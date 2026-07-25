import { Player } from "@/lib/types";
import { xpForHorizon, HORIZONS, HorizonKey } from "@/lib/prediction/xp";
import { averageFdr, fixtureDifficultyForClub } from "@/lib/prediction/fdr";

export interface DifferentialEntry {
  player: Player;
  expectedPoints: number;
  fixtureQuality: number; // 0-2, >1 = easier than average
  differentialScore: number;
}

/** Differential Score = xP x fixture quality x minutes probability / ownership. */
export function differentialScore(player: Player, horizon: HorizonKey = "next5"): DifferentialEntry {
  const { from, to } = HORIZONS[horizon];
  const xp = xpForHorizon(player, from, to);
  const fixtures = fixtureDifficultyForClub(player.clubId, from, to);
  const avgFdr = averageFdr(fixtures, player.position === "FWD" || player.position === "MID" ? "attack" : "defence");
  const fixtureQuality = Math.max(0.4, 2 - avgFdr / 2.5); // fdr 1 -> 1.6, fdr 5 -> 0.4
  const minutesProb = Math.min(1, player.minutesPerGame / 80) * (player.status === "available" ? 1 : player.chanceOfPlayingNextRound / 100);
  const ownership = Math.max(0.3, player.selectedByPercent);
  const score = (xp.total * fixtureQuality * minutesProb) / ownership;

  return { player, expectedPoints: xp.total, fixtureQuality: Math.round(fixtureQuality * 100) / 100, differentialScore: Math.round(score * 100) / 100 };
}

export function findDifferentials(players: Player[], ownershipCeiling: 1 | 5 | 10 | 20, horizon: HorizonKey = "next5"): DifferentialEntry[] {
  return players
    .filter((p) => p.selectedByPercent < ownershipCeiling && p.status === "available")
    .map((p) => differentialScore(p, horizon))
    .sort((a, b) => b.differentialScore - a.differentialScore);
}

/** Players heavily owned across a set of rival squads but absent from the user's squad. */
export function rivalHeldDifferentials(userPlayerIds: number[], rivalSquads: Player[][]): { player: Player; rivalCount: number }[] {
  const userSet = new Set(userPlayerIds);
  const counts = new Map<number, { player: Player; rivalCount: number }>();
  for (const squad of rivalSquads) {
    for (const p of squad) {
      if (userSet.has(p.id)) continue;
      const existing = counts.get(p.id);
      if (existing) existing.rivalCount++;
      else counts.set(p.id, { player: p, rivalCount: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.rivalCount - a.rivalCount);
}
