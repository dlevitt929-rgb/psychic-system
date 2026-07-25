import { ManagerTeam, Player } from "@/lib/types";
import { PLAYERS, playerById } from "@/lib/data/players";
import { xpForHorizon, HORIZONS, HorizonKey } from "@/lib/prediction/xp";
import { fixtureDifficultyForClub, averageFdr } from "@/lib/prediction/fdr";
import { clubById } from "@/lib/data/clubs";

const HIT_COST = 4;
// Bars scale with the number of gameweeks in the horizon (a flat threshold
// would be far too loose over "rest of season" and far too strict over
// "next GW"). Expressed as expected-points gain per gameweek.
const SUGGEST_GAIN_PER_GW = 0.9; // below this, a swap isn't worth surfacing at all
const SELL_GAIN_PER_GW = 1.6; // above this, the owned player is graded "sell"
const HIT_MARGIN_PER_GW = 0.6; // a hit must clear its cost by at least this much per GW to be "justified"

function gwCount(horizon: HorizonKey): number {
  const { from, to } = HORIZONS[horizon];
  return Math.max(1, to - from + 1);
}

export interface TransferSuggestion {
  out: Player;
  in: Player;
  cost: number; // price difference, positive = costs extra money
  xpGainNext1: number;
  xpGainHorizon: number;
  confidence: number; // 0-1
  reasons: string[];
}

function squadPlayers(team: ManagerTeam): Player[] {
  return team.picks.map((p) => playerById(p.playerId)!).filter(Boolean);
}

function fixtureReason(player: Player, horizon: HorizonKey): string {
  const { from, to } = HORIZONS[horizon];
  const fixtures = fixtureDifficultyForClub(player.clubId, from, to);
  const kind = player.position === "FWD" || player.position === "MID" ? "attack" : "defence";
  const avg = averageFdr(fixtures, kind);
  const club = clubById(player.clubId).shortName;
  if (avg <= 2.2) return `${club} have a favourable run of fixtures (avg FDR ${avg})`;
  if (avg >= 3.8) return `${club} face a tough run of fixtures (avg FDR ${avg})`;
  return `${club} have a middling fixture run (avg FDR ${avg})`;
}

function buildReasons(out: Player, incoming: Player, horizon: HorizonKey): string[] {
  const reasons: string[] = [];
  if (out.status !== "available") reasons.push(`${out.webName} is currently ${out.status}`);
  if (incoming.form > out.form + 1) reasons.push(`${incoming.webName} is in much better form (${incoming.form} vs ${out.form})`);
  if (incoming.xG90 + incoming.xA90 > out.xG90 + out.xA90 + 0.15) reasons.push(`stronger underlying attacking numbers (xG90+xA90)`);
  reasons.push(fixtureReason(incoming, horizon));
  if (incoming.selectedByPercent < out.selectedByPercent - 10) reasons.push(`also brings differential upside (${incoming.selectedByPercent}% owned)`);
  return reasons;
}

/**
 * For every owned player, finds the best same-position replacement the user
 * could actually afford (bank + sale price), respecting the max-3-per-club
 * rule, and ranks all candidate single transfers by expected-points gain
 * over the chosen horizon. This is comparative — every "sell" recommendation
 * exists because a specific, named alternative beats it, not because of a
 * generic rating drop.
 */
export function buildTransferSuggestions(team: ManagerTeam, horizon: HorizonKey = "next5"): TransferSuggestion[] {
  const { from, to } = HORIZONS[horizon];
  const owned = squadPlayers(team);
  const ownedIds = new Set(owned.map((p) => p.id));
  const clubCounts = new Map<number, number>();
  for (const p of owned) clubCounts.set(p.clubId, (clubCounts.get(p.clubId) ?? 0) + 1);

  const suggestions: TransferSuggestion[] = [];

  for (const out of owned) {
    const budget = team.bank + out.price;
    const clubCountWithoutOut = (clubCounts.get(out.clubId) ?? 1) - 1;

    const candidates = PLAYERS.filter((p) => {
      if (p.position !== out.position) return false;
      if (ownedIds.has(p.id)) return false;
      if (p.price > budget) return false;
      const otherClubCount = p.clubId === out.clubId ? clubCountWithoutOut : clubCounts.get(p.clubId) ?? 0;
      return otherClubCount < 3;
    });

    let best: { player: Player; gain: number } | null = null;
    for (const candidate of candidates) {
      const gain = xpForHorizon(candidate, from, to).total - xpForHorizon(out, from, to).total;
      if (!best || gain > best.gain) best = { player: candidate, gain };
    }

    if (best && best.gain > SUGGEST_GAIN_PER_GW * gwCount(horizon)) {
      const outNext1 = xpForHorizon(out, HORIZONS.next1.from, HORIZONS.next1.to).total;
      const inNext1 = xpForHorizon(best.player, HORIZONS.next1.from, HORIZONS.next1.to).total;
      suggestions.push({
        out,
        in: best.player,
        cost: Math.round((best.player.price - out.price) * 10) / 10,
        xpGainNext1: Math.round((inNext1 - outNext1) * 10) / 10,
        xpGainHorizon: Math.round(best.gain * 10) / 10,
        confidence: Math.round(((xpForHorizon(best.player, from, to).confidence + xpForHorizon(out, from, to).confidence) / 2) * 100) / 100,
        reasons: buildReasons(out, best.player, horizon),
      });
    }
  }

  return suggestions.sort((a, b) => b.xpGainHorizon - a.xpGainHorizon);
}

export interface TransferPlan {
  suggestions: TransferSuggestion[]; // the ones actually recommended to action
  freeTransfersUsed: number;
  hits: number;
  hitCost: number;
  totalXpGain: number;
  netGain: number;
  hitJustified: boolean;
  explanation: string;
}

/** Decides how many of the ranked suggestions to actually take, including whether a -4/-8 hit is worth it. */
export function planTransfers(team: ManagerTeam, horizon: HorizonKey = "next5"): TransferPlan {
  const ranked = buildTransferSuggestions(team, horizon);
  const freeTransfers = Math.max(0, team.freeTransfers);
  const hitMargin = HIT_MARGIN_PER_GW * gwCount(horizon);

  const taken: TransferSuggestion[] = [];
  let cumulativeGain = 0;
  for (const suggestion of ranked) {
    const wouldBeHit = taken.length >= freeTransfers;
    const marginalCost = wouldBeHit ? HIT_COST : 0;
    const requiredGain = wouldBeHit ? marginalCost + hitMargin : 0;
    if (suggestion.xpGainHorizon - marginalCost <= 0 || suggestion.xpGainHorizon < requiredGain) break;
    taken.push(suggestion);
    cumulativeGain += suggestion.xpGainHorizon;
    if (taken.length >= freeTransfers + 1) break; // cap at one hit deep — beyond this, a wildcard is the better tool
  }

  const hits = Math.max(0, taken.length - freeTransfers);
  const hitCost = hits * HIT_COST;
  const netGain = Math.round((cumulativeGain - hitCost) * 10) / 10;

  const explanation =
    hits === 0
      ? taken.length === 0
        ? "No transfer clears the bar this week — every owned player is within range of their best available replacement. Hold."
        : `${taken.length} free transfer${taken.length > 1 ? "s" : ""} used, no hit required.`
      : `Taking a -${hitCost} for ${hits} transfer${hits > 1 ? "s" : ""} has an expected net gain of ${netGain > 0 ? "+" : ""}${netGain} points over ${HORIZONS[horizon].label.toLowerCase()}.`;

  return {
    suggestions: taken,
    freeTransfersUsed: Math.min(taken.length, freeTransfers),
    hits,
    hitCost,
    totalXpGain: Math.round(cumulativeGain * 10) / 10,
    netGain,
    hitJustified: netGain > 0,
    explanation,
  };
}

export interface SquadVerdict {
  player: Player;
  verdict: "hold" | "sell" | "rising";
  reason: string;
}

/** Hold / Sell / Buy classification for every owned player, independent of whether a specific swap is actionable this week. */
export function classifySquad(team: ManagerTeam, horizon: HorizonKey = "next5"): SquadVerdict[] {
  const suggestions = buildTransferSuggestions(team, horizon);
  const bySellId = new Map(suggestions.map((s) => [s.out.id, s]));
  const owned = squadPlayers(team);

  const gws = gwCount(horizon);
  return owned.map((player) => {
    const suggestion = bySellId.get(player.id);
    if (suggestion && suggestion.xpGainHorizon > SELL_GAIN_PER_GW * gws) {
      return { player, verdict: "sell", reason: `${suggestion.in.webName} projects +${suggestion.xpGainHorizon} over ${HORIZONS[horizon].label.toLowerCase()}` };
    }
    const xp = xpForHorizon(player, HORIZONS[horizon].from, HORIZONS[horizon].to);
    if (xp.total > 4.2 * gws) {
      return { player, verdict: "rising", reason: `Projected ${xp.total} pts over ${HORIZONS[horizon].label.toLowerCase()} — form and fixtures both trending up` };
    }
    return { player, verdict: "hold", reason: "No available replacement clears the bar — keep for now" };
  });
}
