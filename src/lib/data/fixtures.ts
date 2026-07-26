import { Fixture } from "@/lib/types";
import { CLUBS } from "@/lib/data/clubs";

// Standard "circle method" double round-robin — the same algorithm the real
// PL fixture computer uses conceptually, so gap/rhythm between fixtures
// looks realistic (each club plays every other club home + away across 38
// gameweeks).
function roundRobinPairs(teamIds: number[]): [number, number][][] {
  const n = teamIds.length;
  let arr = [...teamIds];
  const rounds: [number, number][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      pairs.push(r % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return rounds;
}

// A cup-postponement blank, and the rearranged fixtures landing as a double
// a couple of gameweeks later — mirrors how real blank/double gameweeks
// arise, so the Chip Optimiser (§8) has something real to detect.
export const BLANK_GW = 18;
export const DOUBLE_GW = 20;

function generateFixtures(): Fixture[] {
  const teamIds = CLUBS.map((c) => c.id);
  const firstHalf = roundRobinPairs(teamIds);
  const secondHalf = firstHalf.map((round) => round.map(([h, a]) => [a, h] as [number, number]));
  const allRounds = [...firstHalf, ...secondHalf]; // 38 gameweeks

  const fixtures: Fixture[] = [];
  let id = 1;
  const seasonStart = new Date("2026-08-15T14:00:00Z").getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  allRounds.forEach((round, gwIdx) => {
    const gw = gwIdx + 1;
    round.forEach(([homeClubId, awayClubId], matchIdx) => {
      fixtures.push({
        id: id++,
        gw,
        homeClubId,
        awayClubId,
        kickoff: new Date(seasonStart + gwIdx * weekMs + matchIdx * 60 * 60 * 1000).toISOString(),
        finished: gw < CURRENT_GW,
      });
    });
  });

  // Postpone 3 fixtures (6 clubs) out of the blank GW, rearrange them into
  // the double GW as extra matches for those same clubs.
  const blankCandidates = fixtures.filter((f) => f.gw === BLANK_GW).slice(0, 3);
  for (const f of blankCandidates) {
    const idxToRemove = fixtures.findIndex((x) => x.id === f.id);
    fixtures.splice(idxToRemove, 1);
    fixtures.push({
      id: id++,
      gw: DOUBLE_GW,
      homeClubId: f.homeClubId,
      awayClubId: f.awayClubId,
      kickoff: new Date(seasonStart + (DOUBLE_GW - 1) * weekMs + 12 * 60 * 60 * 1000).toISOString(),
      finished: false,
    });
  }

  return fixtures;
}

// Treated as "the gameweek about to be played" — GW1-8 mock-finished so the
// dashboard has history/form to react to. `let` (not `const`) so live data
// can update it via setCurrentGw — ES module bindings are live references,
// so every file that does `import { CURRENT_GW }` sees the new value too.
export let CURRENT_GW = 9;
export const TOTAL_GWS = 38;

export function setCurrentGw(gw: number) {
  CURRENT_GW = gw;
}

export const FIXTURES: Fixture[] = generateFixtures();

/** Replaces the contents of FIXTURES in place with live data — see lib/data/live.ts. */
export function replaceFixtures(live: Fixture[]) {
  FIXTURES.splice(0, FIXTURES.length, ...live);
}

export const fixturesForGw = (gw: number) => FIXTURES.filter((f) => f.gw === gw);
export const fixturesForClub = (clubId: number, fromGw = CURRENT_GW, toGw = TOTAL_GWS) =>
  FIXTURES.filter((f) => (f.homeClubId === clubId || f.awayClubId === clubId) && f.gw >= fromGw && f.gw <= toGw)
    .sort((a, b) => a.gw - b.gw);

/** Clubs with 0 fixtures (blank) or 2+ fixtures (double) in a given gameweek. */
export function gwFixtureAnomalies(gw: number): { blankClubIds: number[]; doubleClubIds: number[] } {
  const gwFixtures = fixturesForGw(gw);
  const counts = new Map<number, number>();
  for (const f of gwFixtures) {
    counts.set(f.homeClubId, (counts.get(f.homeClubId) ?? 0) + 1);
    counts.set(f.awayClubId, (counts.get(f.awayClubId) ?? 0) + 1);
  }
  const allClubIds = CLUBS.map((c) => c.id);
  const blankClubIds = allClubIds.filter((id) => (counts.get(id) ?? 0) === 0);
  const doubleClubIds = allClubIds.filter((id) => (counts.get(id) ?? 0) >= 2);
  return { blankClubIds, doubleClubIds };
}
