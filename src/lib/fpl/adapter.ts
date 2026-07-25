/**
 * Single switch between mock data (development, and this sandbox — see
 * client.ts) and the real FPL API (production, once deployed somewhere that
 * can reach fantasy.premierleague.com). Nothing else in the app should know
 * or care which one is active.
 */
export const USE_LIVE_FPL_API = process.env.USE_LIVE_FPL_API === "true";
