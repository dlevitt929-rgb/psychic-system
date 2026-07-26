# Kickoff IQ — AI-Powered FPL Assistant

An AI-assisted Fantasy Premier League platform: squad optimisation, a
transfer engine, mini-league-aware strategy, price-change prediction, and a
chat assistant grounded in your actual team. Built as a real functional MVP,
not a landing-page mock-up — every number on screen comes from a working
engine, not a hard-coded example.

## Status

Live official-FPL-API data is wired up end-to-end (players, fixtures, your
real team, your real mini-league and rivals). It defaults **off** —
procedurally generated mock data is the default so the app works instantly
with zero setup — and turns on with one environment variable. Every engine
(optimiser, transfer planner, price predictor, mini-league war room,
assistant) consumes the same typed domain model either way, so nothing else
changes when you flip the switch.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000, click "Try a demo team" (or enter any numeric
Team ID — in mock mode, team generation is deterministic, so the same ID
always produces the same squad), and explore the nav: Dashboard, My Team,
Players, Compare, Fixtures, Optimiser, Transfers, Mini-League, Price Watch,
Assistant.

## Turning on live data

Create a file named `.env.local` in the project root containing:

```
USE_LIVE_FPL_API=true
```

Restart `npm run dev`. On the next request, the app fetches the real FPL API
(no key or sign-up needed — it's a public feed) for:

- All real players, clubs and fixtures (`bootstrap-static`, `fixtures`)
- Your real team, bank, rank and picks, from the Team ID you enter
  (`entry/{id}`, `entry/{id}/history`, `entry/{id}/event/{gw}/picks`)
- Your real mini-league: it auto-detects your **first classic league** from
  your entry data and pulls real standings + each rival's real squad
  (capped to the top 7 by rank, to keep large leagues fast)

**This was built and typed against the well-documented public schema, but
could not be tested end-to-end from the sandbox this was developed in** —
its network policy blocks `fantasy.premierleague.com` directly (confirmed:
the request gets a 403). If something looks off once you're running it for
real, `src/lib/fpl/rawTypes.ts` and `src/lib/fpl/mappers.ts` are the two
files to check field names against an actual response first. A few specific
things flagged in code comments as best-effort:
- **Defensive contribution stats** (the 2024/25+ scoring rule) — the exact
  field names on live player objects are a best guess; check
  `approxDefensiveActions90` in `mappers.ts`.
- **Shots/key passes/big chances** aren't in the public feed at all — these
  are approximated from the ICT index (threat/creativity), and are display
  stats only (not inputs to the expected-points model).
- **Free transfers available** isn't a field FPL exposes directly — it's
  simulated from your gameweek-by-gameweek transfer history against the
  saved-transfer cap (5, as of the 2024/25 rules — `simulateFreeTransfers`
  in `mappers.ts`).

If a live fetch fails for any reason (network blip, rate limit, wrong Team
ID), every layer falls back to mock data automatically and logs a
`[live-fpl]` warning to the server console — the app never hard-crashes on
a bad request.

To go back to mock data, delete `.env.local` or set `USE_LIVE_FPL_API=false`.

## Architecture

```
src/
  app/                  Next.js App Router pages + API routes (thin — no business logic)
  components/           Presentational + light-interactive UI (charts, pitch view, chat)
  lib/
    types.ts            Domain model (mirrors the real FPL API shapes)
    data/                DATA LAYER — mock generators + live.ts (fetches + maps real API into the same arrays)
    fpl/                 rawTypes.ts (API shapes), mappers.ts (raw->domain), client.ts (fetchers), adapter.ts (the switch)
    prediction/          xp.ts (expected-points model), fdr.ts (custom fixture difficulty)
    optimizer/           milp.ts — real mixed-integer squad optimisation (javascript-lp-solver)
    engine/              transfers.ts, captaincy.ts, price.ts, differentials.ts, miniLeague.ts
    ai/                  assistant.ts (deterministic reasoning), narrate.ts (optional LLM phrasing)
prisma/schema.prisma     User accounts / saved leagues / alerts — designed, not wired (see below)
```

Layer dependency direction is one-way: `data → prediction → optimizer/engine → ai → app`.
Nothing downstream is allowed to invent a number the layer above it didn't
compute — this is what keeps the AI assistant explainable instead of a black
box (§ "Prediction methodology" below).

## Prediction methodology

**Expected points**: `xP = P(playing) × expected-minutes-adjusted production`,
decomposed into explainable components — appearance, goals, assists, clean
sheet, saves, bonus, defensive contribution (2024/25-style CBIT rule), cards
— each visible on every player's profile page, not collapsed into one
opaque score. Every component is driven by season-to-date underlying stats
(xG90, xA90, defensive actions/90, BPS/game) adjusted by our own per-fixture
difficulty multiplier. `floor`/`ceiling`/`confidence` are reported alongside
the point estimate.

**Fixture difficulty**: our own score (`lib/prediction/fdr.ts`), not the
official FPL FDR — computed separately for attacking returns (opponent
defence strength) and clean sheets (opponent attack strength), because those
are genuinely different questions. Home advantage is priced in explicitly.

**Squad optimisation**: a real mixed-integer program
(`lib/optimizer/milp.ts`, via `javascript-lp-solver`) maximising total xP
subject to budget, exact position quotas (2/5/5/3), and max-3-per-club —
not a pre-sorted list. The same solver backs "Best Team Right Now" and the
"what's the best XI in my 15 players" call the transfer engine uses.

**Transfers**: for every owned player, the engine finds the best actually-
affordable same-position replacement and ranks all profitable swaps by xP
gain over the selected horizon; the recommended plan greedily takes
transfers while a hit is net-positive, so "take a -4" is always backed by
an explicit gain-vs-cost number.

**Mini-league strategy**: gap-to-leader ÷ gameweeks-remaining is compared
against a typical week-to-week points swing between similar teams (~6 pts)
to decide Protect vs Attack — a simple, inspectable rule rather than a
hidden score.

**Price changes**: net transfers scaled to an estimated ownership base plus
recent momentum. The official FPL price-change threshold algorithm isn't
published, so this is explicitly a heuristic (labelled as such in the UI),
the same approach third-party trackers use.

## Data sources / APIs (for a live deployment)

| Category | Source | Status |
|---|---|---|
| Players, teams, gameweeks | Official FPL API `bootstrap-static` | Wired (`USE_LIVE_FPL_API=true`) |
| Fixtures/results | Official FPL API `fixtures` | Wired |
| Manager team, history, picks | Official FPL API `entry/*` | Wired |
| Mini-league standings + rivals | Official FPL API `leagues-classic/*` | Wired (auto-detects your first classic league) |
| xG/xA | Official FPL API (`expected_goals`/`expected_assists`) | Wired |
| Shots, key passes, big chances | Not in the official API | Approximated from ICT index — see README "Turning on live data" |
| Betting probabilities, predicted lineups | Third-party odds/lineup feeds | Not connected |
| Injury news | FPL API's own `status`/`chance_of_playing` field | Wired (no separate injury feed needed for this) |

Categories still marked "Not connected" are genuinely absent — the UI never
fabricates a number for them.

## Monetisation strategy

- **Free tier**: dashboard, players/compare/fixtures, single-horizon
  optimiser, basic transfer suggestions — enough to be genuinely useful and
  build trust in the model.
- **Pro tier (subscription)**: full mini-league war room (unlimited
  rivals), all optimisation horizons, chip optimiser, price-change alerts,
  AI assistant with unlimited queries, gameweek planner with saved plans.
- **Mini-league team plans**: a whole league splits one subscription that
  unlocks the war room for everyone in it — the differentiator (§ USP) is
  inherently multiplayer, so pricing per-league (not just per-user) fits
  how the product is actually used.
- Explicitly **not** monetising via selling user squad data or third-party
  ads inside the analytics views — trust in the numbers is the product.

## Roadmap

**Shipped in this MVP** (§24, items 1-15): architecture, design system,
dashboard, a combined "My Team" squad + suggested-transfers view, team-ID
import, squad visualisation, fixture ticker, player database, comparison,
expected-points model, squad optimiser, transfer recommendations,
mini-league comparison + war room, price-change interface, AI assistant —
plus live official-FPL-API data as an opt-in switch (see "Turning on live
data" above).

**Deliberately deferred** (needs infrastructure or data feeds beyond this
build):
- Live gameweek mode (§13/14) — needs a live in-play events feed.
- Gameweek planner UI (§7) — schema exists (`TransferPlanEntry`), no drag-
  and-drop UI yet.
- Chip optimiser as a dedicated page (§8) — the underlying data exists
  (blank/double gameweeks are modelled in `lib/data/fixtures.ts`,
  `gwFixtureAnomalies()`), not yet surfaced as its own recommendation page.
- User accounts, saved watchlists, smart alerts (§22/23) — schema designed
  in `prisma/schema.prisma`, not connected to a running database.
- Real LLM narration is wired (`lib/ai/narrate.ts`) but optional — set
  `ANTHROPIC_API_KEY` to enable; the assistant works fully without it.

## Not affiliated

Kickoff IQ is an independent project and is not affiliated with, endorsed
by, or connected to the Premier League, Fantasy Premier League, or any
football club referenced in the (currently synthetic) demo data.
