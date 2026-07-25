import { ExpectedPointsBreakdown, FixtureDifficulty, Player, Position } from "@/lib/types";
import { CURRENT_GW } from "@/lib/data/fixtures";
import { fixtureDifficultyForClub } from "@/lib/prediction/fdr";

/**
 * Expected-points model: xP = P(playing) x expected-minutes-adjusted
 * production, split into explainable components (goals / assists / clean
 * sheet / saves / bonus / defensive contribution / cards) so every
 * recommendation elsewhere in the app can say *why* a number is what it is,
 * instead of a single opaque score. Weighted from season-to-date underlying
 * stats (xG90, xA90, defensive actions, BPS/game) and adjusted per-fixture by
 * our own FDR (lib/prediction/fdr.ts). Deliberately readable over "clever" —
 * every constant below is a modelling choice you can see and change.
 */

const GOAL_POINTS: Record<Position, number> = { GK: 6, DEF: 6, MID: 5, FWD: 4 };
const ASSIST_POINTS = 3;
const CLEAN_SHEET_POINTS: Record<Position, number> = { GK: 4, DEF: 4, MID: 1, FWD: 0 };
const DC_THRESHOLD: Record<Position, number> = { GK: Infinity, DEF: 10, MID: 12, FWD: 12 };
const DC_POINTS = 2;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function attackMultiplier(attackFdr: number) {
  return clamp(1.55 - 0.2 * attackFdr, 0.55, 1.35);
}
function defenceCleanSheetProb(defenceFdr: number) {
  return clamp(0.58 - 0.09 * defenceFdr, 0.04, 0.52);
}
function saveMultiplier(defenceFdr: number) {
  return clamp(1 + 0.12 * (defenceFdr - 3), 0.7, 1.4);
}

function expectedMinutesFraction(player: Player): number {
  const availability =
    player.status === "injured" || player.status === "suspended" ? 0 : player.status === "doubtful" ? player.chanceOfPlayingNextRound / 100 : 1;
  const startShare = clamp(player.minutesPerGame / 90, 0, 1);
  return availability * startShare;
}

/** Single fixture (or single leg of a double gameweek) breakdown. */
export function xpForFixture(player: Player, fixture: FixtureDifficulty): ExpectedPointsBreakdown {
  const expMins = expectedMinutesFraction(player);
  const attackAdj = attackMultiplier(fixture.attackFdr);

  // Piecewise to roughly track the real rule (1pt for featuring under 60
  // minutes, 2pts for 60+) rather than a single linear ramp, which was
  // over-crediting fringe players (e.g. a ~40-min/game player getting most
  // of a starter's appearance credit).
  const appearanceRaw = expMins <= 0 ? 0 : expMins < 0.55 ? (expMins / 0.55) * 1 : 1 + Math.min(1, (expMins - 0.55) / 0.2);
  const appearance = appearanceRaw * (player.status === "doubtful" ? player.chanceOfPlayingNextRound / 100 : 1);

  const expGoals = expMins * player.xG90 * attackAdj;
  const expAssists = expMins * player.xA90 * attackAdj;
  const goals = expGoals * GOAL_POINTS[player.position];
  const assists = expAssists * ASSIST_POINTS;

  const csProb = player.position === "FWD" ? 0 : defenceCleanSheetProb(fixture.defenceFdr);
  const cleanSheet = csProb * expMins * CLEAN_SHEET_POINTS[player.position];

  const saves = player.position === "GK" ? expMins * player.saves90 * saveMultiplier(fixture.defenceFdr) * (1 / 3) : 0;

  const dcThreshold = DC_THRESHOLD[player.position];
  const dcProb = dcThreshold === Infinity ? 0 : clamp(player.defensiveActions90 / dcThreshold, 0, 0.85);
  const defensiveContribution = expMins * dcProb * DC_POINTS;

  const bonus = clamp(expMins * (player.bpsPerGame / 30) * 0.9, 0, 3);
  const cards = -0.08 * expMins;

  const total = appearance + goals + assists + cleanSheet + saves + bonus + defensiveContribution + cards;
  const varianceMultiplier = player.position === "FWD" ? 2.3 : player.position === "MID" ? 2.0 : player.position === "DEF" ? 1.8 : 1.6;

  const confidence = clamp(
    0.92 - (player.status === "doubtful" ? 0.25 : 0) - (player.minutesPerGame < 30 ? 0.15 : 0) - (player.minutesPerGame < 15 ? 0.15 : 0),
    0.35,
    0.95
  );

  return {
    appearance: round1(appearance),
    goals: round1(goals),
    assists: round1(assists),
    cleanSheet: round1(cleanSheet),
    saves: round1(saves),
    bonus: round1(bonus),
    defensiveContribution: round1(defensiveContribution),
    cards: round1(cards),
    total: round1(total),
    floor: round1(Math.max(0, total * 0.32)),
    ceiling: round1(total * varianceMultiplier),
    confidence: Math.round(confidence * 100) / 100,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function emptyBreakdown(): ExpectedPointsBreakdown {
  return { appearance: 0, goals: 0, assists: 0, cleanSheet: 0, saves: 0, bonus: 0, defensiveContribution: 0, cards: 0, total: 0, floor: 0, ceiling: 0, confidence: 0.5 };
}

function zeroBreakdown(): ExpectedPointsBreakdown {
  return { appearance: 0, goals: 0, assists: 0, cleanSheet: 0, saves: 0, bonus: 0, defensiveContribution: 0, cards: 0, total: 0, floor: 0, ceiling: 0, confidence: 0 };
}

function sumBreakdowns(items: ExpectedPointsBreakdown[]): ExpectedPointsBreakdown {
  if (items.length === 0) return emptyBreakdown();
  const sum = items.reduce(
    (acc, b) => ({
      appearance: acc.appearance + b.appearance,
      goals: acc.goals + b.goals,
      assists: acc.assists + b.assists,
      cleanSheet: acc.cleanSheet + b.cleanSheet,
      saves: acc.saves + b.saves,
      bonus: acc.bonus + b.bonus,
      defensiveContribution: acc.defensiveContribution + b.defensiveContribution,
      cards: acc.cards + b.cards,
      total: acc.total + b.total,
      floor: acc.floor + b.floor,
      ceiling: acc.ceiling + b.ceiling,
      confidence: acc.confidence + b.confidence,
    }),
    zeroBreakdown()
  );
  return {
    ...sum,
    confidence: Math.round(clamp(sum.confidence / items.length, 0, 1) * 100) / 100,
    total: round1(sum.total),
    floor: round1(sum.floor),
    ceiling: round1(sum.ceiling),
  };
}

/** xP over a gameweek range — naturally handles blanks (0 fixtures -> 0) and doubles (2 fixtures summed). */
export function xpForHorizon(player: Player, fromGw = CURRENT_GW, toGw = CURRENT_GW): ExpectedPointsBreakdown {
  const fixtures = fixtureDifficultyForClub(player.clubId, fromGw, toGw);
  return sumBreakdowns(fixtures.map((f) => xpForFixture(player, f)));
}

export function xpNextGw(player: Player): ExpectedPointsBreakdown {
  return xpForHorizon(player, CURRENT_GW, CURRENT_GW);
}

export const HORIZONS = {
  next1: { label: "Next GW", from: CURRENT_GW, to: CURRENT_GW },
  next3: { label: "Next 3 GWs", from: CURRENT_GW, to: CURRENT_GW + 2 },
  next5: { label: "Next 5 GWs", from: CURRENT_GW, to: CURRENT_GW + 4 },
  next8: { label: "Next 8 GWs", from: CURRENT_GW, to: CURRENT_GW + 7 },
  season: { label: "Rest of Season", from: CURRENT_GW, to: 38 },
} as const;

export type HorizonKey = keyof typeof HORIZONS;
