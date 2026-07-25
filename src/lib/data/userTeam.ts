import { ManagerTeam } from "@/lib/types";
import { hashString, mulberry32, seededRandomInRange } from "@/lib/data/random";
import { buildRandomSquad, pickStartingXI, toSquadPicks } from "@/lib/data/squadBuilder";
import { CURRENT_GW } from "@/lib/data/fixtures";

const MANAGER_FIRST = ["David", "Alex", "James", "Priya", "Sam", "Chloe", "Ryan", "Fatima", "Noah", "Ellie"];
const MANAGER_LAST = ["Whitfield", "Osman", "Carter", "Bansal", "Njoku", "Fraser", "Doherty", "Al-Sayed", "Baptiste", "Munro"];

function teamNameFor(rng: () => number) {
  const adjectives = ["Rotation", "Differential", "Set-Piece", "Bench Boost", "Wildcard", "Effective", "Expected", "Waiver", "Autosub", "Template"];
  const nouns = ["Merchants", "Havoc FC", "United", "Utd", "Rangers", "Athletic", "Dynamo", "Casuals", "Warriors", "XI"];
  return `${adjectives[Math.floor(rng() * adjectives.length)]} ${nouns[Math.floor(rng() * nouns.length)]}`;
}

/**
 * Deterministically derives a full ManagerTeam from an FPL Team ID.
 * Same ID -> same team, every time (no persistence needed for the demo).
 * This is the mock stand-in for GET /entry/{id}/, /entry/{id}/history/ and
 * /entry/{id}/event/{gw}/picks/ — see lib/fpl/adapter.ts for the live swap.
 */
export function generateUserTeam(teamId: string): ManagerTeam {
  const seed = hashString(`team:${teamId}`);
  const rng = mulberry32(seed);
  const numericId = Number(teamId.replace(/\D/g, "")) || Math.abs(seed % 9_000_000) + 100_000;

  const budget = 100 + seededRandomInRange(rng, -1, 4);
  const { players: squad, spend } = buildRandomSquad(seed, budget);
  const bank = Math.max(0, Math.round((budget - spend) * 10) / 10);

  const byForm = (p: (typeof squad)[number]) => p.form + p.xG90 * 3 + p.xA90 * 2;
  const { starters, bench } = pickStartingXI(squad, byForm);
  const sortedStarters = [...starters].sort((a, b) => byForm(b) - byForm(a));
  const captain = sortedStarters[0];
  const vice = sortedStarters[1];
  const picks = toSquadPicks(starters, bench, captain.id, vice.id);

  const freeTransfers = Math.floor(seededRandomInRange(rng, 1, 3));
  const overallRank = Math.round(seededRandomInRange(rng, 15_000, 3_500_000));

  const gwHistory: ManagerTeam["gwHistory"] = [];
  let runningRank = overallRank + Math.round(seededRandomInRange(rng, 200_000, 900_000));
  let runningValue = budget;
  for (let gw = 1; gw < CURRENT_GW; gw++) {
    const points = Math.round(seededRandomInRange(rng, 32, 88));
    runningRank = Math.max(1000, Math.round(runningRank - seededRandomInRange(rng, -150_000, 220_000)));
    runningValue = Math.round((runningValue + seededRandomInRange(rng, -0.3, 0.4)) * 10) / 10;
    gwHistory.push({ gw, points, rank: runningRank, teamValue: runningValue, bank: Math.round(seededRandomInRange(rng, 0, 3) * 10) / 10 });
  }

  const transferHistory: ManagerTeam["transferHistory"] = [];
  for (let gw = 2; gw < CURRENT_GW; gw += Math.round(seededRandomInRange(rng, 1, 3))) {
    if (squad.length < 2) break;
    const playerOut = squad[Math.floor(rng() * squad.length)];
    const playerIn = squad[Math.floor(rng() * squad.length)];
    if (playerOut.id === playerIn.id) continue;
    transferHistory.push({ gw, playerInId: playerIn.id, playerOutId: playerOut.id, cost: rng() < 0.15 ? 4 : 0 });
  }

  const wildcardUsed = rng() < 0.4;

  return {
    id: numericId,
    managerName: `${MANAGER_FIRST[Math.floor(rng() * MANAGER_FIRST.length)]} ${MANAGER_LAST[Math.floor(rng() * MANAGER_LAST.length)]}`,
    teamName: teamNameFor(rng),
    bank,
    teamValue: Math.round((spend + bank) * 10) / 10,
    freeTransfers,
    overallPoints: gwHistory.reduce((s, g) => s + g.points, 0),
    overallRank,
    gwPoints: 0, // live GW not started yet in mock timeline
    picks,
    chips: [
      { name: "wildcard", usedGw: wildcardUsed ? Math.round(seededRandomInRange(rng, 3, 7)) : null },
      { name: "freehit", usedGw: null },
      { name: "bboost", usedGw: null },
      { name: "3xc", usedGw: null },
    ],
    chipsUsed: wildcardUsed ? ["wildcard"] : [],
    gwHistory,
    transferHistory,
  };
}
