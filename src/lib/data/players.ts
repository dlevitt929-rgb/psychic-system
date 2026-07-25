import { Player, Position } from "@/lib/types";
import { CLUBS, clubById } from "@/lib/data/clubs";
import { mulberry32, pick, seededRandomInRange } from "@/lib/data/random";

// NOTE ON DATA: names below are procedurally generated (fictional), not real
// footballers. Stats are synthetic but internally consistent (a player's
// price, form, xG etc. all derive from the same underlying "quality" roll)
// so every downstream engine — xP model, optimiser, transfer planner — has
// something realistic to chew on. Swap lib/fpl/adapter.ts to USE_LIVE=true
// against the official API for real names/stats; see that file for the
// exact endpoints this schema maps to.

const FIRST_NAMES = [
  "Kai", "Marcus", "Bruno", "Leandro", "Mateus", "Declan", "Cole", "Jude", "Rico", "Tino",
  "Sander", "Aleks", "Nuno", "Rafa", "Dominik", "Emile", "Ollie", "Harvey", "Levi", "Reiss",
  "Jorge", "Pape", "Amadou", "Yusuf", "Divock", "Moises", "Erling", "Martin", "Kevin", "Phil",
  "Bukayo", "Gabriel", "Ben", "Kieran", "Trent", "Virgil", "Ederson", "Nick", "Jarrod", "Anthony",
  "Diego", "Hugo", "Milos", "Tomas", "Andre", "Lucas", "Mathias", "Kasper", "Idris", "Femi",
  "Wilfried", "Odilon", "Igor", "Stefan", "Enzo", "Rayan", "Malick", "Junior", "Theo", "Axel",
  "Callum", "Conor", "Finn", "George", "Jamie", "Josh", "Lewis", "Max", "Owen", "Ryan",
];
const LAST_NAMES = [
  "Osei", "Bergmann", "Silveira", "Costa", "Hughes", "Whitfield", "Marsden", "Okafor", "Lindqvist", "Novak",
  "Petrovic", "Baptiste", "Roldan", "Kovac", "Adeyemi", "Sørensen", "Dawson", "Falcao", "Nkomo", "Villanueva",
  "Higgins", "Solberg", "Trigueros", "Doyle", "Amaral", "Baffour", "Winther", "Castellanos", "Rhodes", "Mensah",
  "Ferreira", "Blackwood", "Onana", "Radu", "Skinner", "Vermeer", "Tavares", "Blomqvist", "Hartley", "Zimmer",
  "Almeida", "Berisha", "Caldwell", "Duarte", "Ekstrom", "Fenwick", "Gustavsson", "Holloway", "Ibanez", "Jelavic",
  "Kallon", "Larsen", "Moreno", "Nowak", "Oyelaran", "Pedersen", "Quintana", "Rutherford", "Santini", "Torres",
  "Underhill", "Valente", "Wexford", "Yalcin", "Zeleny", "Ashford", "Brandão", "Coetzee", "Delgado", "Eriksen",
];

interface Quota {
  position: Position;
  count: number;
  priceRange: [number, number];
}

const SQUAD_QUOTAS: Quota[] = [
  { position: "GK", count: 2, priceRange: [4.0, 6.0] },
  { position: "DEF", count: 5, priceRange: [4.0, 8.0] },
  { position: "MID", count: 5, priceRange: [4.5, 13.5] },
  { position: "FWD", count: 3, priceRange: [4.5, 15.5] },
];

function buildPlayer(id: number, clubId: number, position: Position, rng: () => number, priceRange: [number, number]): Player {
  const club = clubById(clubId);
  const quality = Math.min(1, Math.max(0, rng() * 0.55 + (club.overallStrength / 100) * 0.45)); // 0-1, club-weighted
  const price = Math.round(seededRandomInRange(rng, priceRange[0], priceRange[0] + (priceRange[1] - priceRange[0]) * quality) * 10) / 10;
  const isStarter = rng() < 0.35 + quality * 0.5;
  const minutesPerGame = isStarter ? Math.round(seededRandomInRange(rng, 65, 90)) : Math.round(seededRandomInRange(rng, 5, 55));
  const availabilityRoll = rng();
  const status: Player["status"] = availabilityRoll > 0.94 ? "injured" : availabilityRoll > 0.9 ? "doubtful" : availabilityRoll > 0.88 ? "suspended" : "available";
  const chanceOfPlayingNextRound = status === "injured" ? 0 : status === "suspended" ? 0 : status === "doubtful" ? pick(rng, [25, 50, 75]) : 100;

  const attackQuality = quality * (position === "FWD" ? 1 : position === "MID" ? 0.75 : 0.25);
  const xG90 = position === "GK" ? 0 : Math.max(0, seededRandomInRange(rng, 0, position === "FWD" ? 0.75 : position === "MID" ? 0.45 : 0.12) * (0.4 + attackQuality));
  const xA90 = position === "GK" ? 0 : Math.max(0, seededRandomInRange(rng, 0, position === "MID" ? 0.45 : 0.25) * (0.4 + quality));
  const shots90 = xG90 > 0 ? xG90 * seededRandomInRange(rng, 4, 7) : 0;
  const keyPasses90 = xA90 > 0 ? xA90 * seededRandomInRange(rng, 3, 5) : 0;
  const bigChances90 = (xG90 + xA90) * seededRandomInRange(rng, 0.8, 1.3);
  const saves90 = position === "GK" ? Math.max(0, seededRandomInRange(rng, 1.5, 4.5) * (1 - club.defenceStrength / 140)) : 0;
  const defensiveActions90 = position === "DEF" ? seededRandomInRange(rng, 4, 11) : position === "MID" ? seededRandomInRange(rng, 2, 8) : seededRandomInRange(rng, 0, 2);
  const bpsPerGame = seededRandomInRange(rng, 10, 20) + quality * 15;
  const penaltyOrder = rng() < 0.08 * (0.5 + attackQuality) ? 1 : 0;
  const setPieceOrder = rng() < 0.1 * (0.5 + quality) ? 1 : 0;

  const gamesPlayedSoFar = Math.round(seededRandomInRange(rng, 4, 9));
  const goals = Math.round((xG90 * minutesPerGame) / 90 * gamesPlayedSoFar * seededRandomInRange(rng, 0.7, 1.3));
  const assists = Math.round((xA90 * minutesPerGame) / 90 * gamesPlayedSoFar * seededRandomInRange(rng, 0.7, 1.3));
  const cleanSheets = position === "GK" || position === "DEF" ? Math.round(gamesPlayedSoFar * (club.defenceStrength / 100) * seededRandomInRange(rng, 0.25, 0.5)) : 0;
  const bonus = Math.round(gamesPlayedSoFar * (bpsPerGame / 34) * seededRandomInRange(rng, 0.5, 1.2));
  const form = Math.max(0, seededRandomInRange(rng, 0, 4) + quality * 4);
  const totalPoints = Math.round(form * gamesPlayedSoFar * seededRandomInRange(rng, 0.85, 1.15));
  const selectedByPercent = Math.round(Math.max(0.1, (quality - 0.35) * 60 + seededRandomInRange(rng, -3, 3)) * 10) / 10;

  const transferMomentum = seededRandomInRange(rng, -1, 1) * (0.3 + quality * 0.7);
  const transfersInEvent = Math.max(0, Math.round(transferMomentum * 40000 + seededRandomInRange(rng, 0, 8000)));
  const transfersOutEvent = Math.max(0, Math.round(-transferMomentum * 40000 + seededRandomInRange(rng, 0, 8000)));

  return {
    id,
    webName: `${pick(rng, LAST_NAMES)}`,
    firstName: pick(rng, FIRST_NAMES),
    secondName: pick(rng, LAST_NAMES),
    clubId,
    position,
    price,
    selectedByPercent: Math.max(0.1, selectedByPercent),
    form: Math.round(form * 10) / 10,
    totalPoints,
    minutesPerGame,
    chanceOfPlayingNextRound,
    status,
    xG90: Math.round(xG90 * 100) / 100,
    xA90: Math.round(xA90 * 100) / 100,
    shots90: Math.round(shots90 * 10) / 10,
    keyPasses90: Math.round(keyPasses90 * 10) / 10,
    bigChances90: Math.round(bigChances90 * 100) / 100,
    saves90: Math.round(saves90 * 10) / 10,
    defensiveActions90: Math.round(defensiveActions90 * 10) / 10,
    bpsPerGame: Math.round(bpsPerGame * 10) / 10,
    penaltyOrder,
    setPieceOrder,
    goals: Math.max(0, goals),
    assists: Math.max(0, assists),
    cleanSheets: Math.max(0, cleanSheets),
    bonus: Math.max(0, bonus),
    priceChangeStreak: Math.round(transferMomentum * 6),
    transfersInEvent,
    transfersOutEvent,
  };
}

function generateAllPlayers(): Player[] {
  const players: Player[] = [];
  let id = 1;
  for (const club of CLUBS) {
    const rng = mulberry32(club.id * 7919 + 13);
    for (const quota of SQUAD_QUOTAS) {
      for (let i = 0; i < quota.count; i++) {
        players.push(buildPlayer(id, club.id, quota.position, rng, quota.priceRange));
        id++;
      }
    }
  }
  return players;
}

// Generated once per server process — analogous to caching a bootstrap-static
// response. A real integration would revalidate this on an interval.
function disambiguateNames(players: Player[]): Player[] {
  const counts = new Map<string, number>();
  for (const p of players) counts.set(p.webName, (counts.get(p.webName) ?? 0) + 1);
  const seen = new Map<string, number>();
  return players.map((p) => {
    if ((counts.get(p.webName) ?? 0) <= 1) return p;
    const n = (seen.get(p.webName) ?? 0) + 1;
    seen.set(p.webName, n);
    // Mirrors the real FPL convention of disambiguating shared surnames with
    // a first initial (e.g. two players named "Silva" -> "Silva", "J.Silva").
    return n === 1 ? p : { ...p, webName: `${p.firstName[0]}.${p.webName}` };
  });
}

export const PLAYERS: Player[] = disambiguateNames(generateAllPlayers());

export const playerById = (id: number) => PLAYERS.find((p) => p.id === id);
export const playersByClub = (clubId: number) => PLAYERS.filter((p) => p.clubId === clubId);
export const playersByPosition = (position: Position) => PLAYERS.filter((p) => p.position === position);
