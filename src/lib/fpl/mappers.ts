import { Chip, Club, Fixture, ManagerTeam, MiniLeagueEntry, Player, Position } from "@/lib/types";
import { RawBootstrap, RawFixture, RawElement, RawEntry, RawEntryHistory, RawPick, RawLeagueStandingsEntry } from "@/lib/fpl/rawTypes";

const POSITION_BY_ELEMENT_TYPE: Record<number, Position> = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

// A handful of real club brand colours for a nicer badge; anything not
// listed (promoted clubs change every season) falls back to a colour
// generated from the team id so it's always defined and always distinct.
const KNOWN_CLUB_COLOURS: Record<string, string> = {
  ARS: "#EF0107", AVL: "#95BFE5", BOU: "#DA291C", BRE: "#E30613", BHA: "#0057B8",
  CHE: "#034694", CRY: "#1B458F", EVE: "#003399", FUL: "#000000", IPS: "#0033A0",
  LEI: "#003090", LIV: "#C8102E", MCI: "#6CABDD", MUN: "#DA291C", NEW: "#241F20",
  NFO: "#DD0000", SOU: "#D71920", TOT: "#132257", WHU: "#7A263A", WOL: "#FDB913",
  BUR: "#6C1D45", SHU: "#EE2737", LUT: "#F78F1E", SUN: "#EB172B",
};

function fallbackColour(teamId: number): string {
  const hue = (teamId * 47) % 360;
  return `hsl(${hue}, 65%, 42%)`;
}

function normalise(values: number[], value: number, outMin: number, outMax: number): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return (outMin + outMax) / 2;
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

export function mapClubs(bootstrap: RawBootstrap): Club[] {
  const overallAvgs = bootstrap.teams.map((t) => (t.strength_overall_home + t.strength_overall_away) / 2);
  const attackAvgs = bootstrap.teams.map((t) => (t.strength_attack_home + t.strength_attack_away) / 2);
  const defenceAvgs = bootstrap.teams.map((t) => (t.strength_defence_home + t.strength_defence_away) / 2);

  return bootstrap.teams.map((t, i) => ({
    id: t.id,
    name: t.name,
    shortName: t.short_name,
    colour: KNOWN_CLUB_COLOURS[t.short_name] ?? fallbackColour(t.id),
    overallStrength: Math.round(normalise(overallAvgs, overallAvgs[i], 45, 95)),
    attackStrength: Math.round(normalise(attackAvgs, attackAvgs[i], 45, 95)),
    defenceStrength: Math.round(normalise(defenceAvgs, defenceAvgs[i], 45, 95)),
  }));
}

function mapStatus(status: RawElement["status"]): Player["status"] {
  if (status === "a") return "available";
  if (status === "d") return "doubtful";
  if (status === "s") return "suspended";
  return "injured"; // "i" (injured) and "u"/"n" (unavailable/not registered) treated the same: don't rely on them
}

/**
 * Approximates per-90 shot/key-pass/big-chance volume from the ICT index
 * components (threat/creativity), since the public API doesn't expose raw
 * shot or chance counts. These three fields are display-only in the app
 * (not inputs to the expected-points model), so an approximation here is a
 * reasonable trade-off — just don't treat them as exact.
 */
function approxVolumeStats(el: RawElement, minutes: number) {
  const threat90 = minutes > 0 ? (parseFloat(el.threat ?? "0") / minutes) * 90 : 0;
  const creativity90 = minutes > 0 ? (parseFloat(el.creativity ?? "0") / minutes) * 90 : 0;
  return {
    shots90: Math.round((threat90 / 40) * 10) / 10,
    keyPasses90: Math.round((creativity90 / 60) * 10) / 10,
    bigChances90: Math.round(((threat90 / 40 + creativity90 / 60) / 2.2) * 100) / 100,
  };
}

function approxDefensiveActions90(el: RawElement, minutes: number): number {
  // Field names for the 2024/25+ "defensive contribution" inputs are our
  // best guess at the live schema — verify against a real bootstrap-static
  // response and adjust here if they've moved.
  const total = el.defensive_contribution ?? (el.clearances_blocks_interceptions ?? 0) + (el.tackles ?? 0) + (el.recoveries ?? 0);
  return minutes > 0 ? Math.round(((total / minutes) * 90) * 10) / 10 : 0;
}

export function mapPlayers(bootstrap: RawBootstrap, finishedEventsCount: number): Player[] {
  return bootstrap.elements.map((el) => {
    const minutes = el.minutes;
    const gamesPlayed = Math.max(1, finishedEventsCount);
    const xG90 = minutes > 0 ? (parseFloat(el.expected_goals ?? "0") / minutes) * 90 : 0;
    const xA90 = minutes > 0 ? (parseFloat(el.expected_assists ?? "0") / minutes) * 90 : 0;
    const { shots90, keyPasses90, bigChances90 } = approxVolumeStats(el, minutes);

    return {
      id: el.id,
      webName: el.web_name,
      firstName: el.first_name,
      secondName: el.second_name,
      clubId: el.team,
      position: POSITION_BY_ELEMENT_TYPE[el.element_type],
      price: el.now_cost / 10,
      selectedByPercent: parseFloat(el.selected_by_percent) || 0,
      form: parseFloat(el.form) || 0,
      totalPoints: el.total_points,
      minutesPerGame: Math.round(minutes / gamesPlayed),
      chanceOfPlayingNextRound: el.chance_of_playing_next_round ?? (el.status === "a" ? 100 : 50),
      status: mapStatus(el.status),
      xG90: Math.round(xG90 * 100) / 100,
      xA90: Math.round(xA90 * 100) / 100,
      shots90,
      keyPasses90,
      bigChances90,
      saves90: minutes > 0 && el.element_type === 1 ? Math.round(((el.saves / minutes) * 90) * 10) / 10 : 0,
      defensiveActions90: approxDefensiveActions90(el, minutes),
      bpsPerGame: minutes > 0 ? Math.round(((el.bps / minutes) * 90) * 10) / 10 : 0,
      penaltyOrder: el.penalties_order === 1 ? 1 : 0,
      setPieceOrder: el.corners_and_indirect_freekicks_order === 1 || el.direct_freekicks_order === 1 ? 1 : 0,
      goals: el.goals_scored,
      assists: el.assists,
      cleanSheets: el.clean_sheets,
      bonus: el.bonus,
      priceChangeStreak: el.cost_change_event,
      transfersInEvent: el.transfers_in_event,
      transfersOutEvent: el.transfers_out_event,
      photo: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${el.code}.png`,
    };
  });
}

export function mapFixtures(raw: RawFixture[]): Fixture[] {
  return raw
    .filter((f) => f.event != null)
    .map((f) => ({
      id: f.id,
      gw: f.event as number,
      homeClubId: f.team_h,
      awayClubId: f.team_a,
      kickoff: f.kickoff_time ?? new Date().toISOString(),
      finished: f.finished,
    }));
}

export function currentGwFrom(bootstrap: RawBootstrap): { current: number; finishedCount: number } {
  const finished = bootstrap.events.filter((e) => e.finished);
  const next = bootstrap.events.find((e) => e.is_next) ?? bootstrap.events.find((e) => e.is_current);
  return { current: next?.id ?? finished.length + 1, finishedCount: finished.length };
}

const CHIP_NAMES: Chip["name"][] = ["wildcard", "freehit", "bboost", "3xc"];
// FPL's saved-free-transfer cap — 5 as of the 2024/25 rule change. Verify
// this hasn't moved again if the numbers here look off against a real team.
const FREE_TRANSFER_CAP = 5;

function simulateFreeTransfers(history: RawEntryHistory, cap = FREE_TRANSFER_CAP): number {
  const chipGws = new Set(history.chips.filter((c) => c.name === "wildcard" || c.name === "freehit").map((c) => c.event));
  const sorted = [...history.current].sort((a, b) => a.event - b.event);
  let ft = 1;
  for (const gw of sorted) {
    if (gw.event === 1) continue; // GW1: unlimited transfers, doesn't touch the FT bank
    if (chipGws.has(gw.event)) {
      ft = Math.min(cap, ft + 1); // wildcard/free hit transfers are free and don't consume the bank
      continue;
    }
    const used = Math.min(ft, gw.event_transfers);
    ft = Math.min(cap, ft - used + 1);
  }
  return Math.max(1, ft);
}

export function mapManagerTeam(entry: RawEntry, history: RawEntryHistory, picks: RawPick[]): ManagerTeam {
  const chips: Chip[] = CHIP_NAMES.map((name) => {
    const uses = history.chips.filter((c) => c.name === name);
    const lastUse = uses.length > 0 ? Math.max(...uses.map((c) => c.event)) : null;
    return { name, usedGw: lastUse };
  });

  return {
    id: entry.id,
    managerName: `${entry.player_first_name} ${entry.player_last_name}`,
    teamName: entry.name,
    bank: Math.round((entry.last_deadline_bank / 10) * 10) / 10,
    teamValue: Math.round((entry.last_deadline_value / 10) * 10) / 10,
    freeTransfers: simulateFreeTransfers(history),
    overallPoints: entry.summary_overall_points,
    overallRank: entry.summary_overall_rank,
    gwPoints: entry.summary_event_points,
    picks: picks.map((p) => ({
      playerId: p.element,
      isCaptain: p.is_captain,
      isViceCaptain: p.is_vice_captain,
      multiplier: p.multiplier,
      position: p.position,
    })),
    chips,
    chipsUsed: chips.filter((c) => c.usedGw != null).map((c) => c.name),
    gwHistory: history.current.map((gw) => ({
      gw: gw.event,
      points: gw.points,
      rank: gw.overall_rank,
      teamValue: Math.round((gw.value / 10) * 10) / 10,
      bank: Math.round((gw.bank / 10) * 10) / 10,
    })),
    transferHistory: [],
  };
}

export function mapMiniLeagueEntry(result: RawLeagueStandingsEntry): MiniLeagueEntry {
  return {
    managerId: result.entry,
    managerName: result.player_name,
    teamName: result.entry_name,
    rank: result.rank,
    totalPoints: result.total,
    gwPoints: result.event_total,
  };
}
