// Domain types. Field names deliberately mirror the shapes returned by the
// official FPL API (bootstrap-static, entry/{id}, entry/{id}/event/{gw}/picks,
// leagues-classic/{id}/standings, fixtures) so the mock data layer in
// lib/data/* can be swapped for lib/fpl/client.ts (real fetches) without
// touching anything above it. See lib/fpl/adapter.ts.

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface Club {
  id: number;
  name: string;
  shortName: string;
  colour: string; // primary badge colour, used for UI accents
  attackStrength: number; // 0-100, our own rating (not official FDR)
  defenceStrength: number; // 0-100
  overallStrength: number; // 0-100
}

export interface Player {
  id: number;
  webName: string;
  firstName: string;
  secondName: string;
  clubId: number;
  position: Position;
  price: number; // in millions, e.g. 9.5
  selectedByPercent: number; // ownership %
  form: number; // avg points last 4 GWs
  totalPoints: number;
  minutesPerGame: number;
  chanceOfPlayingNextRound: number; // 0-100
  status: "available" | "doubtful" | "injured" | "suspended";
  // Underlying stats, per 90 minutes
  xG90: number;
  xA90: number;
  shots90: number;
  keyPasses90: number;
  bigChances90: number;
  saves90: number; // GK only
  defensiveActions90: number; // tackles+interceptions+clearances proxy, for DC points
  bpsPerGame: number; // bonus-point-system proxy
  penaltyOrder: number; // 0 = not on pens, 1 = first choice
  setPieceOrder: number; // 0 = not on set pieces, 1 = first choice
  goals: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  priceChangeStreak: number; // consecutive days of net-transfer pressure, +up/-down
  transfersInEvent: number;
  transfersOutEvent: number;
  photo?: string;
}

export interface Fixture {
  id: number;
  gw: number;
  homeClubId: number;
  awayClubId: number;
  kickoff: string; // ISO date
  finished: boolean;
}

export interface SquadPick {
  playerId: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  multiplier: number; // 0 bench, 1 starting, 2 captain, 3 triple captain
  position: number; // 1-15 squad slot order
}

export interface Chip {
  name: "wildcard" | "freehit" | "bboost" | "3xc";
  usedGw: number | null;
}

export interface ManagerTeam {
  id: number; // FPL entry id
  managerName: string;
  teamName: string;
  bank: number; // millions
  teamValue: number; // millions
  freeTransfers: number;
  overallPoints: number;
  overallRank: number;
  gwPoints: number;
  picks: SquadPick[];
  chips: Chip[];
  chipsUsed: Chip["name"][];
  gwHistory: { gw: number; points: number; rank: number; teamValue: number; bank: number }[];
  transferHistory: { gw: number; playerInId: number; playerOutId: number; cost: number }[];
}

export interface MiniLeagueEntry {
  managerId: number;
  managerName: string;
  teamName: string;
  rank: number;
  totalPoints: number;
  gwPoints: number;
}

export interface MiniLeague {
  id: number;
  name: string;
  standings: MiniLeagueEntry[];
}

export interface ExpectedPointsBreakdown {
  appearance: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  saves: number;
  bonus: number;
  defensiveContribution: number;
  cards: number;
  total: number;
  floor: number;
  ceiling: number;
  confidence: number; // 0-1
}

export interface FixtureDifficulty {
  fixtureId: number;
  gw: number;
  opponentClubId: number;
  isHome: boolean;
  attackFdr: number; // 1 (easiest) - 5 (hardest), for attacking returns
  defenceFdr: number; // 1 (easiest) - 5 (hardest), for clean sheets
}
