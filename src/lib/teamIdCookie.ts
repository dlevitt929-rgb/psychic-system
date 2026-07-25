// Split from session.ts so client components can import the cookie name
// without pulling in next/headers (server-only).
export const TEAM_ID_COOKIE = "fpl_team_id";
export const DEFAULT_TEAM_ID = "3141592";
