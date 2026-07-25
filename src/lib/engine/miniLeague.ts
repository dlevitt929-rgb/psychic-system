import { ManagerTeam, Player } from "@/lib/types";
import { playerById } from "@/lib/data/players";
import { xpNextGw } from "@/lib/prediction/xp";
import { TOTAL_GWS, CURRENT_GW } from "@/lib/data/fixtures";

function squadPlayers(team: ManagerTeam): Player[] {
  return team.picks.map((p) => playerById(p.playerId)!).filter(Boolean);
}

function starters(team: ManagerTeam): Player[] {
  return team.picks.filter((p) => p.multiplier > 0).map((p) => playerById(p.playerId)!).filter(Boolean);
}

function captain(team: ManagerTeam): Player | undefined {
  const pick = team.picks.find((p) => p.isCaptain);
  return pick ? playerById(pick.playerId) : undefined;
}

export interface RivalComparison {
  rival: ManagerTeam;
  gap: number; // positive = rival ahead
  sharedPlayerIds: number[];
  userDifferentials: Player[]; // in user's XI, not in rival's squad
  rivalThreats: Player[]; // in rival's XI, not in user's squad, ranked by next-GW xP
}

export function compareToRival(user: ManagerTeam, rival: ManagerTeam): RivalComparison {
  const userSquadIds = new Set(squadPlayers(user).map((p) => p.id));
  const rivalSquadIds = new Set(squadPlayers(rival).map((p) => p.id));
  const shared = [...userSquadIds].filter((id) => rivalSquadIds.has(id));

  const userXI = starters(user);
  const rivalXI = starters(rival);

  const userDifferentials = userXI.filter((p) => !rivalSquadIds.has(p.id)).sort((a, b) => xpNextGw(b).total - xpNextGw(a).total);
  const rivalThreats = rivalXI.filter((p) => !userSquadIds.has(p.id)).sort((a, b) => xpNextGw(b).total - xpNextGw(a).total);

  return {
    rival,
    gap: rival.overallPoints - user.overallPoints,
    sharedPlayerIds: shared,
    userDifferentials,
    rivalThreats,
  };
}

export type LeagueStrategy = "protect" | "attack";

export interface StrategyRecommendation {
  strategy: LeagueStrategy;
  explanation: string;
}

/**
 * Whether to play it safe (template picks, same captain as the field) or
 * attack (differentials, higher-variance captaincy) — based on how large the
 * points gap is relative to the number of gameweeks left to close it. A
 * ~6-point average weekly swing between two well-managed FPL teams is a
 * reasonable rule of thumb (real week-to-week variance is roughly in that
 * range for teams of similar overall quality).
 */
const AVG_WEEKLY_SWING = 6;

export function recommendStrategy(gap: number, currentGw: number = CURRENT_GW, totalGws: number = TOTAL_GWS): StrategyRecommendation {
  const gwsRemaining = Math.max(1, totalGws - currentGw + 1);
  const requiredWeeklyEdge = gap / gwsRemaining;

  if (gap <= 0) {
    return { strategy: "protect", explanation: `You are ${Math.abs(gap)} points clear with ${gwsRemaining} gameweeks left — minimise variance and let the lead compound.` };
  }
  if (requiredWeeklyEdge > AVG_WEEKLY_SWING) {
    return {
      strategy: "attack",
      explanation: `You are ${gap} points behind with ${gwsRemaining} gameweeks remaining (${requiredWeeklyEdge.toFixed(1)} pts/GW needed) — that's above normal week-to-week variance, so increasing controlled differential exposure is mathematically preferable to copying the template.`,
    };
  }
  return {
    strategy: "protect",
    explanation: `You are ${gap} points behind with ${gwsRemaining} gameweeks remaining (${requiredWeeklyEdge.toFixed(1)} pts/GW needed) — that's within normal variance, so staying close to the template and waiting for an opening is lower risk.`,
  };
}

export interface EffectiveOwnershipEntry {
  player: Player;
  effectiveOwnership: number; // % across the league, captaincy-weighted
  rankImpactIfScoring: "threat" | "opportunity";
}

/** Effective ownership of a player across the user + rival squads in the league (captained players count double). */
export function leagueEffectiveOwnership(user: ManagerTeam, rivals: ManagerTeam[], player: Player): number {
  const allTeams = [user, ...rivals];
  let weight = 0;
  for (const team of allTeams) {
    const pick = team.picks.find((p) => p.playerId === player.id && p.multiplier > 0);
    if (pick) weight += pick.isCaptain ? 2 : 1;
  }
  return Math.round((weight / allTeams.length) * 1000) / 10;
}

export function biggestRivalThreatsAndOpportunities(user: ManagerTeam, rivals: ManagerTeam[]) {
  const userCaptain = captain(user);
  const userSquadIds = new Set(squadPlayers(user).map((p) => p.id));

  const candidateIds = new Set<number>();
  for (const rival of rivals) starters(rival).forEach((p) => candidateIds.add(p.id));
  starters(user).forEach((p) => candidateIds.add(p.id));

  const entries = [...candidateIds]
    .map((id) => playerById(id)!)
    .filter(Boolean)
    .map((player) => ({
      player,
      effectiveOwnership: leagueEffectiveOwnership(user, rivals, player),
      isOwnedByUser: userSquadIds.has(player.id) || player.id === userCaptain?.id,
    }));

  const threats = entries
    .filter((e) => !e.isOwnedByUser && e.effectiveOwnership > 30)
    .sort((a, b) => b.effectiveOwnership - a.effectiveOwnership)
    .slice(0, 5);
  const opportunities = entries
    .filter((e) => e.isOwnedByUser && e.effectiveOwnership < 40)
    .sort((a, b) => xpNextGw(b.player).total - xpNextGw(a.player).total)
    .slice(0, 5);

  return { threats, opportunities };
}
