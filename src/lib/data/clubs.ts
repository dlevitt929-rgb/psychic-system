import { Club } from "@/lib/types";

// Illustrative strength ratings (0-100), our own "power rating" rather than
// the official FPL FDR — this is what lib/prediction/fdr.ts is built on.
const RAW: Omit<Club, "id">[] = [
  { name: "Arsenal", shortName: "ARS", colour: "#EF0107", attackStrength: 86, defenceStrength: 88, overallStrength: 87 },
  { name: "Aston Villa", shortName: "AVL", colour: "#95BFE5", attackStrength: 72, defenceStrength: 68, overallStrength: 70 },
  { name: "Bournemouth", shortName: "BOU", colour: "#DA291C", attackStrength: 66, defenceStrength: 64, overallStrength: 65 },
  { name: "Brentford", shortName: "BRE", colour: "#E30613", attackStrength: 68, defenceStrength: 63, overallStrength: 66 },
  { name: "Brighton", shortName: "BHA", colour: "#0057B8", attackStrength: 71, defenceStrength: 69, overallStrength: 70 },
  { name: "Chelsea", shortName: "CHE", colour: "#034694", attackStrength: 80, defenceStrength: 74, overallStrength: 78 },
  { name: "Crystal Palace", shortName: "CRY", colour: "#1B458F", attackStrength: 69, defenceStrength: 70, overallStrength: 69 },
  { name: "Everton", shortName: "EVE", colour: "#003399", attackStrength: 60, defenceStrength: 66, overallStrength: 63 },
  { name: "Fulham", shortName: "FUL", colour: "#000000", attackStrength: 65, defenceStrength: 63, overallStrength: 64 },
  { name: "Ipswich", shortName: "IPS", colour: "#0033A0", attackStrength: 52, defenceStrength: 50, overallStrength: 51 },
  { name: "Leicester", shortName: "LEI", colour: "#003090", attackStrength: 58, defenceStrength: 54, overallStrength: 56 },
  { name: "Liverpool", shortName: "LIV", colour: "#C8102E", attackStrength: 90, defenceStrength: 85, overallStrength: 89 },
  { name: "Man City", shortName: "MCI", colour: "#6CABDD", attackStrength: 91, defenceStrength: 83, overallStrength: 90 },
  { name: "Man United", shortName: "MUN", colour: "#DA291C", attackStrength: 74, defenceStrength: 70, overallStrength: 73 },
  { name: "Newcastle", shortName: "NEW", colour: "#241F20", attackStrength: 79, defenceStrength: 76, overallStrength: 78 },
  { name: "Nottm Forest", shortName: "NFO", colour: "#DD0000", attackStrength: 67, defenceStrength: 68, overallStrength: 67 },
  { name: "Southampton", shortName: "SOU", colour: "#D71920", attackStrength: 54, defenceStrength: 48, overallStrength: 51 },
  { name: "Spurs", shortName: "TOT", colour: "#132257", attackStrength: 81, defenceStrength: 66, overallStrength: 76 },
  { name: "West Ham", shortName: "WHU", colour: "#7A263A", attackStrength: 66, defenceStrength: 62, overallStrength: 65 },
  { name: "Wolves", shortName: "WOL", colour: "#FDB913", attackStrength: 63, defenceStrength: 60, overallStrength: 62 },
];

export const CLUBS: Club[] = RAW.map((c, i) => ({ id: i + 1, ...c }));

export const clubById = (id: number) => CLUBS.find((c) => c.id === id)!;

/** Replaces the contents of CLUBS in place with live data — see lib/data/live.ts. */
export function replaceClubs(live: Club[]) {
  CLUBS.splice(0, CLUBS.length, ...live);
}
