import {
  RawBootstrap,
  RawFixture,
  RawEntry,
  RawEntryHistory,
  RawPicksResponse,
  RawTransfer,
  RawLeagueStandings,
} from "@/lib/fpl/rawTypes";

/**
 * Real official-FPL-API client. This environment's egress policy blocks
 * fantasy.premierleague.com (confirmed directly, not assumed), so these
 * calls could not be exercised end-to-end from here — they're written
 * against the well-documented public schema (the same API every third-party
 * FPL tool uses) but should be double-checked against a live response if
 * anything looks wrong once you're running this outside the sandbox.
 *
 *   GET /api/bootstrap-static/                    -> all players, clubs, gameweeks
 *   GET /api/fixtures/                             -> full fixture list
 *   GET /api/entry/{id}/                           -> manager summary
 *   GET /api/entry/{id}/history/                   -> GW-by-GW history + chips used
 *   GET /api/entry/{id}/event/{gw}/picks/          -> squad + captain for a GW
 *   GET /api/entry/{id}/transfers/                 -> transfer history
 *   GET /api/leagues-classic/{leagueId}/standings/  -> mini-league standings
 *
 * No API key is required — this is a public, unauthenticated feed.
 */
const BASE_URL = "https://fantasy.premierleague.com/api";

async function getJson<T>(path: string, revalidateSeconds: number): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { next: { revalidate: revalidateSeconds } });
  if (!res.ok) throw new Error(`FPL API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const fplClient = {
  bootstrapStatic: () => getJson<RawBootstrap>("/bootstrap-static/", 60 * 15),
  fixtures: () => getJson<RawFixture[]>("/fixtures/", 60 * 15),
  entry: (id: string) => getJson<RawEntry>(`/entry/${id}/`, 60 * 5),
  entryHistory: (id: string) => getJson<RawEntryHistory>(`/entry/${id}/history/`, 60 * 5),
  entryPicks: (id: string, gw: number) => getJson<RawPicksResponse>(`/entry/${id}/event/${gw}/picks/`, 60 * 5),
  entryTransfers: (id: string) => getJson<RawTransfer[]>(`/entry/${id}/transfers/`, 60 * 5),
  leagueStandings: (leagueId: string) => getJson<RawLeagueStandings>(`/leagues-classic/${leagueId}/standings/`, 60 * 5),
};
