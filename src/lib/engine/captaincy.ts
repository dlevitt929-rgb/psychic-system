import { Player } from "@/lib/types";
import { xpForHorizon, HORIZONS, HorizonKey } from "@/lib/prediction/xp";

export interface CaptainOption {
  player: Player;
  expectedPoints: number;
  ceiling: number;
  captainScore: number;
  reasons: string[];
}

function reasonsFor(player: Player, expectedPoints: number, ceiling: number): string[] {
  const reasons: string[] = [];
  if (player.xG90 > 0.45) reasons.push("high underlying goal threat (xG90)");
  if (player.xA90 > 0.3) reasons.push("strong chance creation (xA90)");
  if (player.penaltyOrder === 1) reasons.push("first-choice penalty taker");
  if (player.setPieceOrder === 1) reasons.push("on set pieces");
  if (player.minutesPerGame >= 85) reasons.push("nailed for 90 minutes");
  if (ceiling - expectedPoints > 6) reasons.push("high ceiling if it clicks");
  if (player.selectedByPercent < 10) reasons.push("low ownership — differential upside");
  if (reasons.length === 0) reasons.push("solid all-round expected returns");
  return reasons;
}

/** Ranks every starting XI player as a captaincy candidate for a given horizon (usually next1). */
export function rankCaptainOptions(starters: Player[], horizon: HorizonKey = "next1"): CaptainOption[] {
  const { from, to } = HORIZONS[horizon];
  return starters
    .map((player) => {
      const breakdown = xpForHorizon(player, from, to);
      const captainScore = Math.round((breakdown.total * 0.6 + breakdown.ceiling * 0.4) * 10) / 10;
      return {
        player,
        expectedPoints: breakdown.total,
        ceiling: breakdown.ceiling,
        captainScore,
        reasons: reasonsFor(player, breakdown.total, breakdown.ceiling),
      };
    })
    .sort((a, b) => b.captainScore - a.captainScore);
}

export function safeCaptain(options: CaptainOption[]): CaptainOption | undefined {
  return [...options].sort((a, b) => (b.player.selectedByPercent - a.player.selectedByPercent) * 0.3 + (b.expectedPoints - a.expectedPoints) * 0.7).find(() => true);
}

export function differentialCaptain(options: CaptainOption[], ownershipCeiling = 15): CaptainOption | undefined {
  return options.filter((o) => o.player.selectedByPercent < ownershipCeiling).sort((a, b) => b.ceiling - a.ceiling)[0];
}
