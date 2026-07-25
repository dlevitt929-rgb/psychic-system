import solver from "javascript-lp-solver";
import { Player, Position } from "@/lib/types";
import { PLAYERS, playerById } from "@/lib/data/players";
import { CLUBS } from "@/lib/data/clubs";
import { xpForHorizon, HorizonKey, HORIZONS } from "@/lib/prediction/xp";
import { pickStartingXI } from "@/lib/data/squadBuilder";

const POSITION_QUOTA: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const MAX_PER_CLUB = 3;
const SQUAD_SIZE = 15;

export interface OptimiserOptions {
  budget?: number;
  horizon?: HorizonKey;
  lockPlayerIds?: number[]; // must be included (e.g. players the user refuses to sell)
  excludePlayerIds?: number[]; // must be excluded (e.g. injured, sold)
}

export interface OptimisedSquad {
  horizon: HorizonKey;
  squad: Player[];
  totalCost: number;
  totalXp: number;
  starters: Player[];
  bench: Player[];
  captain: Player;
  viceCaptain: Player;
}

interface SolverVariable {
  xp: number;
  cost: number;
  count: number;
  [posKey: string]: number;
}

/**
 * True combinatorial optimisation (mixed-integer program), not a hard-coded
 * ranking: maximise total expected points over the chosen horizon subject to
 * the real FPL squad rules — 15 players, budget, exact position quotas
 * (2/5/5/3), and no more than 3 players from any one club.
 */
export function optimiseSquad(options: OptimiserOptions = {}): OptimisedSquad {
  const { budget = 100, horizon = "next5", lockPlayerIds = [], excludePlayerIds = [] } = options;
  const { from, to } = HORIZONS[horizon];

  const excluded = new Set(excludePlayerIds);
  const candidates = PLAYERS.filter((p) => !excluded.has(p.id));

  const xpByPlayer = new Map<number, number>();
  for (const p of candidates) xpByPlayer.set(p.id, xpForHorizon(p, from, to).total);

  const variables: Record<string, SolverVariable> = {};
  for (const p of candidates) {
    variables[String(p.id)] = {
      xp: xpByPlayer.get(p.id) ?? 0,
      cost: p.price,
      count: 1,
      [`pos_${p.position}`]: 1,
      [`club_${p.clubId}`]: 1,
    };
  }

  const constraints: Record<string, { max?: number; min?: number; equal?: number }> = {
    cost: { max: budget },
    count: { equal: SQUAD_SIZE },
  };
  for (const pos of Object.keys(POSITION_QUOTA) as Position[]) {
    constraints[`pos_${pos}`] = { equal: POSITION_QUOTA[pos] };
  }
  for (const club of CLUBS) {
    constraints[`club_${club.id}`] = { max: MAX_PER_CLUB };
  }
  for (const id of lockPlayerIds) {
    constraints[`lock_${id}`] = { equal: 1 };
    if (variables[String(id)]) variables[String(id)][`lock_${id}`] = 1;
  }

  const binaries: Record<string, 1> = {};
  for (const p of candidates) binaries[String(p.id)] = 1;

  const model = {
    optimize: "xp",
    opType: "max" as const,
    constraints,
    variables,
    binaries,
  };

  const result = solver.Solve(model) as Record<string, number | boolean>;

  const squadIds = Object.keys(variables)
    .filter((key) => Number(result[key]) === 1)
    .map(Number);

  const squad = squadIds.map((id) => playerById(id)!).filter(Boolean);
  const totalCost = Math.round(squad.reduce((s, p) => s + p.price, 0) * 10) / 10;
  const totalXp = Math.round(squad.reduce((s, p) => s + (xpByPlayer.get(p.id) ?? 0), 0) * 10) / 10;

  const score = (p: Player) => xpByPlayer.get(p.id) ?? 0;
  const { starters, bench } = pickStartingXI(squad, score);
  const sortedStarters = [...starters].sort((a, b) => score(b) - score(a));

  return {
    horizon,
    squad,
    totalCost,
    totalXp,
    starters,
    bench,
    captain: sortedStarters[0],
    viceCaptain: sortedStarters[1],
  };
}

/** Best legal starting XI + captain from an arbitrary 15-man squad (used by the transfer engine to score "what if"). */
export function bestXIFromSquad(squad: Player[], horizon: HorizonKey = "next1") {
  const { from, to } = HORIZONS[horizon];
  const score = (p: Player) => xpForHorizon(p, from, to).total;
  const { starters, bench } = pickStartingXI(squad, score);
  const sortedStarters = [...starters].sort((a, b) => score(b) - score(a));
  const totalXp = starters.reduce((s, p) => s + score(p), 0) + score(sortedStarters[0]); // captain doubles
  return { starters, bench, captain: sortedStarters[0], viceCaptain: sortedStarters[1], totalXp: Math.round(totalXp * 10) / 10 };
}
