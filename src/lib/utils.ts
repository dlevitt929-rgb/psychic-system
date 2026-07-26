import clsx, { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fmtMoney(m: number): string {
  return `£${m.toFixed(1)}m`;
}

export function fmtSigned(n: number, decimals = 1): string {
  const v = Number(n.toFixed(decimals));
  return `${v > 0 ? "+" : ""}${v}`;
}

export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function fmtRank(n: number): string {
  return n.toLocaleString("en-GB");
}

/**
 * Pulls a numeric FPL Team ID out of either a bare number ("1234567") or a
 * pasted profile URL ("https://fantasy.premierleague.com/entry/1234567/event/9").
 * Naively stripping non-digits would mangle a URL (it'd concatenate the
 * gameweek number into the ID too), so the URL's /entry/<id>/ segment is
 * matched specifically first.
 */
export function extractTeamId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/entry\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Same idea for a mini-league link/ID — matches the /leagues/<id>/ segment
 * from a league's "Standings" page URL (not the alphanumeric invite/join
 * link, which doesn't contain the numeric league ID).
 */
export function extractLeagueId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/leagues\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return null;
}
