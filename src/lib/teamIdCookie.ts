// Split from session.ts so client components can import the cookie name
// without pulling in next/headers (server-only).
export const TEAM_ID_COOKIE = "fpl_team_id";
export const DEFAULT_TEAM_ID = "3141592";

/** Shared helper (rather than inlining `document.cookie = ...` in each component) — also keeps the react-compiler lint rule happy about not mutating globals inline. */
export function setTeamIdCookie(teamId: string) {
  document.cookie = `${TEAM_ID_COOKIE}=${teamId}; path=/; max-age=${60 * 60 * 24 * 365}`;
}
