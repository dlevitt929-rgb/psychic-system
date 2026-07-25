/**
 * Real official-FPL-API client. Not called anywhere yet — this environment's
 * egress policy blocks fantasy.premierleague.com, so development ran against
 * lib/data/* mocks shaped to match these exact response bodies. In a
 * deployment where the host is reachable, point lib/fpl/adapter.ts's
 * USE_LIVE flag here and these functions become the real data source with
 * no changes needed upstream (same types, same shapes).
 *
 * Endpoints used:
 *   GET /api/bootstrap-static/                       -> all players, clubs, gameweeks
 *   GET /api/fixtures/                                -> full fixture list
 *   GET /api/entry/{id}/                               -> manager summary (bank, value, rank...)
 *   GET /api/entry/{id}/history/                       -> GW-by-GW history + past seasons
 *   GET /api/entry/{id}/event/{gw}/picks/               -> squad + captain for a GW
 *   GET /api/entry/{id}/transfers/                      -> transfer history
 *   GET /api/leagues-classic/{leagueId}/standings/       -> mini-league standings
 */
const BASE_URL = "https://fantasy.premierleague.com/api";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 60 * 15 } });
  if (!res.ok) throw new Error(`FPL API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const fplClient = {
  bootstrapStatic: () => getJson<unknown>("/bootstrap-static/"),
  fixtures: () => getJson<unknown>("/fixtures/"),
  entry: (id: string) => getJson<unknown>(`/entry/${id}/`),
  entryHistory: (id: string) => getJson<unknown>(`/entry/${id}/history/`),
  entryPicks: (id: string, gw: number) => getJson<unknown>(`/entry/${id}/event/${gw}/picks/`),
  entryTransfers: (id: string) => getJson<unknown>(`/entry/${id}/transfers/`),
  leagueStandings: (leagueId: string) => getJson<unknown>(`/leagues-classic/${leagueId}/standings/`),
};
