// Shapes of the official, public, unauthenticated FPL API responses. Only
// the fields this app actually reads are declared. This is a stable,
// widely-documented public API (the same one every third-party FPL tool
// uses), but a couple of newer fields — particularly the 2024/25 "defensive
// contribution" stats — may have shifted names since this was written.
// If a mapped stat in the app looks off once you're running against live
// data, this is the first file to check against the real JSON response
// (e.g. open https://fantasy.premierleague.com/api/bootstrap-static/ in a
// browser and compare field names).

export interface RawTeam {
  id: number;
  name: string;
  short_name: string;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface RawElement {
  id: number;
  code: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: 1 | 2 | 3 | 4;
  now_cost: number; // tenths of a million
  selected_by_percent: string;
  form: string;
  total_points: number;
  minutes: number;
  chance_of_playing_next_round: number | null;
  status: "a" | "d" | "i" | "s" | "u" | "n";
  expected_goals?: string; // season-to-date total
  expected_assists?: string;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  bps: number;
  saves: number;
  penalties_order: number | null;
  corners_and_indirect_freekicks_order: number | null;
  direct_freekicks_order: number | null;
  transfers_in_event: number;
  transfers_out_event: number;
  cost_change_event: number; // tenths, +/- change today
  // 2024/25+ defensive-contribution inputs — field names unconfirmed against
  // the live schema from this environment; coded defensively (see mappers.ts).
  clearances_blocks_interceptions?: number;
  tackles?: number;
  recoveries?: number;
  defensive_contribution?: number;
  influence?: string;
  creativity?: string;
  threat?: string;
  ict_index?: string;
}

export interface RawEvent {
  id: number;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
  deadline_time: string;
}

export interface RawElementType {
  id: number;
  singular_name_short: string; // "GKP" | "DEF" | "MID" | "FWD"
}

export interface RawBootstrap {
  elements: RawElement[];
  teams: RawTeam[];
  events: RawEvent[];
  element_types: RawElementType[];
}

export interface RawFixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  kickoff_time: string | null;
  finished: boolean;
}

export interface RawEntryLeague {
  id: number;
  name: string;
  entry_rank: number;
  entry_last_rank: number;
}

export interface RawEntry {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string; // team name
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  current_event: number;
  last_deadline_bank: number; // tenths
  last_deadline_value: number; // tenths
  last_deadline_total_transfers: number;
  leagues: {
    classic: RawEntryLeague[];
  };
}

export interface RawEntryHistoryGw {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  overall_rank: number;
  bank: number;
  value: number;
  event_transfers: number;
  event_transfers_cost: number;
}

export interface RawEntryHistoryChip {
  name: string;
  event: number;
}

export interface RawEntryHistory {
  current: RawEntryHistoryGw[];
  chips: RawEntryHistoryChip[];
}

export interface RawPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface RawPicksResponse {
  picks: RawPick[];
}

export interface RawTransfer {
  event: number;
  element_in: number;
  element_out: number;
  element_in_cost: number;
}

export interface RawLeagueStandingsEntry {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  total: number;
  event_total: number;
}

export interface RawLeagueStandings {
  league: { id: number; name: string };
  standings: { results: RawLeagueStandingsEntry[] };
}
