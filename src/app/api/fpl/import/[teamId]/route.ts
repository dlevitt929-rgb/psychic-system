import { NextRequest } from "next/server";
import { getUserTeam } from "@/lib/data/userTeam";

/**
 * FPL team import. When USE_LIVE_FPL_API=true, getUserTeam fetches the real:
 *   GET https://fantasy.premierleague.com/api/entry/{id}/
 *   GET https://fantasy.premierleague.com/api/entry/{id}/history/
 *   GET https://fantasy.premierleague.com/api/entry/{id}/event/{gw}/picks/
 * Otherwise it returns the deterministic mock team. See lib/fpl/adapter.ts.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params;
  if (!teamId || !/^[0-9]+$/.test(teamId)) {
    return Response.json({ error: "Team ID must be numeric — enter the ID from your FPL 'Points' page URL." }, { status: 400 });
  }
  const team = await getUserTeam(teamId);
  return Response.json({ team });
}
