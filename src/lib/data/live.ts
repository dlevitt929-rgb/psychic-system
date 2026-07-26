import { fplClient } from "@/lib/fpl/client";
import { mapClubs, mapPlayers, mapFixtures, currentGwFrom, mapManagerTeam } from "@/lib/fpl/mappers";
import { replaceClubs } from "@/lib/data/clubs";
import { replacePlayers } from "@/lib/data/players";
import { replaceFixtures, setCurrentGw } from "@/lib/data/fixtures";
import { ManagerTeam, MiniLeague } from "@/lib/types";

/**
 * Orchestrates the live data source: fetch the official FPL API, map it into
 * this app's domain types, and splice it into the same CLUBS/PLAYERS/FIXTURES
 * arrays the mock generators populate at import time — every engine
 * downstream (prediction, optimiser, transfers) keeps working unchanged
 * because it only ever reads from those arrays, never cares how they were
 * filled in.
 */

let bootstrapPromise: Promise<void> | null = null;
let bootstrapLoadedAt = 0;
const BOOTSTRAP_TTL_MS = 15 * 60 * 1000; // re-poll every 15 min so prices/injuries/points don't go stale for the life of the server process

/** Call before reading CLUBS/PLAYERS/FIXTURES/CURRENT_GW live — cheap no-op except once per TTL window. */
export function ensureBootstrapLoaded(): Promise<void> {
  const isStale = Date.now() - bootstrapLoadedAt > BOOTSTRAP_TTL_MS;
  if (!bootstrapPromise || isStale) {
    bootstrapPromise = (async () => {
      const [bootstrap, fixtures] = await Promise.all([fplClient.bootstrapStatic(), fplClient.fixtures()]);
      const { current, finishedCount } = currentGwFrom(bootstrap);
      replaceClubs(mapClubs(bootstrap));
      replacePlayers(mapPlayers(bootstrap, finishedCount));
      replaceFixtures(mapFixtures(fixtures));
      setCurrentGw(current);
      bootstrapLoadedAt = Date.now();
    })().catch((err) => {
      // Reset so the next request retries rather than being stuck on a
      // failed fetch forever (e.g. a transient network blip).
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}

const RIVAL_CAP = 7; // matches the mock league's size; keeps the war room fast on large real leagues

export async function fetchLiveUserTeam(teamId: string): Promise<ManagerTeam> {
  const entry = await fplClient.entry(teamId);
  const [history, picks] = await Promise.all([fplClient.entryHistory(teamId), fplClient.entryPicks(teamId, entry.current_event)]);
  return mapManagerTeam(entry, history, picks.picks);
}

export async function fetchLiveMiniLeagueMeta(teamId: string): Promise<Pick<MiniLeague, "id" | "name"> | null> {
  const entry = await fplClient.entry(teamId);
  const league = entry.leagues.classic[0];
  return league ? { id: league.id, name: league.name } : null;
}

/** Fetches the top N (by rank) other managers in the user's first classic league, full squads included. */
export async function fetchLiveRivals(teamId: string): Promise<ManagerTeam[]> {
  const entry = await fplClient.entry(teamId);
  const league = entry.leagues.classic[0];
  if (!league) return [];

  const standings = await fplClient.leagueStandings(String(league.id));
  const rivalIds = standings.standings.results
    .filter((r) => r.entry !== entry.id)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, RIVAL_CAP)
    .map((r) => r.entry);

  return Promise.all(
    rivalIds.map(async (rivalId) => {
      const rivalEntry = await fplClient.entry(String(rivalId));
      const [rivalHistory, rivalPicks] = await Promise.all([
        fplClient.entryHistory(String(rivalId)),
        fplClient.entryPicks(String(rivalId), rivalEntry.current_event),
      ]);
      return mapManagerTeam(rivalEntry, rivalHistory, rivalPicks.picks);
    })
  );
}
