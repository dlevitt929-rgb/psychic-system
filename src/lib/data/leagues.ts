import { ManagerTeam, MiniLeague } from "@/lib/types";
import { mulberry32, seededRandomInRange } from "@/lib/data/random";
import { buildRandomSquad, pickStartingXI, toSquadPicks } from "@/lib/data/squadBuilder";
import { CURRENT_GW } from "@/lib/data/fixtures";

const RIVAL_NAMES = [
  ["James", "Okonkwo"],
  ["Alex", "Petrov"],
  ["Priya", "Lindstrom"],
  ["Sam", "Delacroix"],
  ["Chloe", "Marsh"],
  ["Ryan", "Feldman"],
  ["Fatima", "Ouattara"],
];

const TEAM_NAMES = [
  "Set-Piece Merchants", "The Autosubs", "Bench Boost FC", "Effective United", "Waiver Wire Warriors", "Differential Dynamo", "Rotation Rangers",
];

function buildRivalTeam(seed: number, index: number): ManagerTeam {
  const rng = mulberry32(seed);
  const budget = 100 + seededRandomInRange(rng, -1, 4);
  const { players: squad, spend } = buildRandomSquad(seed, budget);
  const bank = Math.max(0, Math.round((budget - spend) * 10) / 10);
  const byForm = (p: (typeof squad)[number]) => p.form + p.xG90 * 3 + p.xA90 * 2;
  const { starters, bench } = pickStartingXI(squad, byForm);
  const sortedStarters = [...starters].sort((a, b) => byForm(b) - byForm(a));
  const captain = sortedStarters[0];
  const vice = sortedStarters[1];
  const picks = toSquadPicks(starters, bench, captain.id, vice.id);

  let cumPoints = 0;
  const gwHistory: ManagerTeam["gwHistory"] = [];
  let runningRank = Math.round(seededRandomInRange(rng, 5_000, 2_000_000));
  for (let gw = 1; gw < CURRENT_GW; gw++) {
    const points = Math.round(seededRandomInRange(rng, 30, 92));
    cumPoints += points;
    runningRank = Math.max(500, Math.round(runningRank - seededRandomInRange(rng, -140_000, 200_000)));
    gwHistory.push({ gw, points, rank: runningRank, teamValue: budget, bank });
  }

  const [first, last] = RIVAL_NAMES[index % RIVAL_NAMES.length];
  const wildcardUsed = rng() < 0.5;

  return {
    id: 900_000 + index,
    managerName: `${first} ${last}`,
    teamName: TEAM_NAMES[index % TEAM_NAMES.length],
    bank,
    teamValue: Math.round((spend + bank) * 10) / 10,
    freeTransfers: Math.floor(seededRandomInRange(rng, 1, 3)),
    overallPoints: cumPoints,
    overallRank: runningRank,
    gwPoints: 0,
    picks,
    chips: [
      { name: "wildcard", usedGw: wildcardUsed ? Math.round(seededRandomInRange(rng, 3, 7)) : null },
      { name: "freehit", usedGw: null },
      { name: "bboost", usedGw: null },
      { name: "3xc", usedGw: null },
    ],
    chipsUsed: wildcardUsed ? ["wildcard"] : [],
    gwHistory,
    transferHistory: [],
  };
}

let cachedRivals: ManagerTeam[] | null = null;

/** The user's mock mini-league opponents — stand-in for leagues-classic/{id}/standings. */
export function getRivalTeams(): ManagerTeam[] {
  if (!cachedRivals) {
    cachedRivals = RIVAL_NAMES.map((_, i) => buildRivalTeam(424242 + i * 31, i));
  }
  return cachedRivals;
}

export function getMiniLeagueMeta(): Pick<MiniLeague, "id" | "name"> {
  return { id: 314159, name: "The Office Legends" };
}
