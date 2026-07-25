import { cookies } from "next/headers";
import { TEAM_ID_COOKIE, DEFAULT_TEAM_ID } from "@/lib/teamIdCookie";

export { TEAM_ID_COOKIE, DEFAULT_TEAM_ID };

/** The active FPL Team ID for this browser session (cookie-backed, no DB needed for the demo). */
export async function getActiveTeamId(): Promise<string> {
  const store = await cookies();
  return store.get(TEAM_ID_COOKIE)?.value ?? DEFAULT_TEAM_ID;
}
