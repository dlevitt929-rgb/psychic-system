import { NextRequest } from "next/server";
import { generateUserTeam } from "@/lib/data/userTeam";

/**
 * Mock stand-in for the official FPL import flow:
 *   GET https://fantasy.premierleague.com/api/entry/{id}/
 *   GET https://fantasy.premierleague.com/api/entry/{id}/history/
 *   GET https://fantasy.premierleague.com/api/entry/{id}/event/{gw}/picks/
 * See lib/fpl/adapter.ts for how this route would switch to real fetches.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params;
  if (!teamId || !/^[0-9]+$/.test(teamId)) {
    return Response.json({ error: "Team ID must be numeric — enter the ID from your FPL 'Points' page URL." }, { status: 400 });
  }
  const team = generateUserTeam(teamId);
  return Response.json({ team });
}
