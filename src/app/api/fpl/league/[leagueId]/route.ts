import { NextRequest } from "next/server";
import { fplClient } from "@/lib/fpl/client";
import { USE_LIVE_FPL_API } from "@/lib/fpl/adapter";

/**
 * Looks up a real mini-league's standings by league ID, so a user who
 * doesn't know their own Team ID can find themselves by name instead —
 * most people have their league's link (shared by a friend) more readily
 * than their own personal Team ID. Only meaningful in live mode: mock mode
 * has no real managers to search through.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await context.params;
  if (!leagueId || !/^[0-9]+$/.test(leagueId)) {
    return Response.json({ error: "That doesn't look like a valid league ID." }, { status: 400 });
  }
  if (!USE_LIVE_FPL_API) {
    return Response.json(
      { error: "Live data is off, so there are no real leagues to search — turn on USE_LIVE_FPL_API to use this (see the README)." },
      { status: 400 }
    );
  }

  try {
    const standings = await fplClient.leagueStandings(leagueId);
    const managers = standings.standings.results.map((r) => ({
      entryId: r.entry,
      managerName: r.player_name,
      teamName: r.entry_name,
      rank: r.rank,
    }));
    return Response.json({ leagueName: standings.league.name, managers });
  } catch {
    return Response.json({ error: "Couldn't find that league — double check the ID (or the link) and try again." }, { status: 404 });
  }
}
