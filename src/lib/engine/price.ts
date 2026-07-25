import { Player } from "@/lib/types";

export type PriceDirection = "rise" | "fall" | "stable";

export interface PricePrediction {
  player: Player;
  direction: PriceDirection;
  label: "Likely rise tonight" | "Possible rise" | "Stable" | "Possible fall" | "Likely fall tonight";
  probability: number; // 0-1, probability of the *predicted* direction
  netTransfers: number;
}

/**
 * Heuristic price-change predictor. The official FPL price-change algorithm
 * (a per-player transfer threshold scaled to ownership) is not published —
 * sites like LiveFPL approximate it by tracking cumulative net transfers
 * against an estimated threshold. We do the same thing here with mock
 * transfer data: net transfers today, scaled by how many managers own the
 * player (so the same net transfer count matters more for a 2%-owned player
 * than a 40%-owned one) plus a momentum term (priceChangeStreak, the number
 * of recent days trending the same way).
 */
const ESTIMATED_TOTAL_MANAGERS = 8_500_000;

export function predictPriceChange(player: Player): PricePrediction {
  const ownedCount = Math.max(20_000, (player.selectedByPercent / 100) * ESTIMATED_TOTAL_MANAGERS);
  const netTransfers = player.transfersInEvent - player.transfersOutEvent;
  const relativePressure = netTransfers / (ownedCount * 0.045); // ~4.5% of owners moving = full threshold, illustrative
  const momentum = player.priceChangeStreak / 8;
  const score = Math.max(-1, Math.min(1, relativePressure * 0.75 + momentum * 0.25));
  const probability = Math.round((0.5 + Math.abs(score) * 0.5) * 100) / 100;

  let direction: PriceDirection = "stable";
  let label: PricePrediction["label"] = "Stable";
  if (score > 0.55) {
    direction = "rise";
    label = "Likely rise tonight";
  } else if (score > 0.2) {
    direction = "rise";
    label = "Possible rise";
  } else if (score < -0.55) {
    direction = "fall";
    label = "Likely fall tonight";
  } else if (score < -0.2) {
    direction = "fall";
    label = "Possible fall";
  }

  return { player, direction, label, probability, netTransfers };
}

export function rankPriceMovers(players: Player[], direction: PriceDirection): PricePrediction[] {
  return players
    .map(predictPriceChange)
    .filter((p) => p.direction === direction)
    .sort((a, b) => b.probability - a.probability);
}
