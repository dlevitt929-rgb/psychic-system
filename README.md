# Kickoff IQ — AI-Powered FPL Assistant

An AI-assisted Fantasy Premier League platform: squad optimisation, a
transfer engine, mini-league-aware strategy, price-change prediction, and a
chat assistant grounded in your actual team. Built as a real functional MVP,
not a landing-page mock-up — every number on screen comes from a working
engine, not a hard-coded example.

## Status

This build runs entirely on **procedurally generated mock data** (see
"Why mock data" below) but every engine is fully wired end-to-end: import a
team ID, get a real optimised squad, real transfer suggestions with expected-
points deltas, real mini-league comparisons, and an assistant that reasons
over your actual squad state.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000, click "Try a demo team" (or enter any numeric
Team ID — team generation is deterministic, so the same ID always produces
the same squad), and explore the nav: Dashboard, Players, Compare, Fixtures,
Optimiser, Transfers, Mini-League, Price Watch, Assistant.

## Why mock data

This project was developed in a sandboxed environment whose network policy
blocks `fantasy.premierleague.com` (confirmed directly — the proxy returns a
403 for that host). Rather than fake live API responses, every mock data
file in `src/lib/data/` produces records in **exactly the shape** the real
FPL API returns (see field-level comments in `src/lib/types.ts`), so swapping
to live data is a boundary change, not a rewrite:

1. Set `USE_LIVE_FPL_API=true` (see `src/lib/fpl/adapter.ts`).
2. `src/lib/fpl/client.ts` already implements every real endpoint needed
   (`bootstrap-static`, `fixtures`, `entry/{id}`, `entry/{id}/history`,
   `entry/{id}/event/{gw}/picks`, `leagues-classic/{id}/standings`).
3. Point the functions in `src/lib/data/*` at `fplClient` instead of the
   generators, keeping the same return types.

Nothing in `src/lib/prediction`, `src/lib/optimizer`, `src/lib/engine`, or
any page needs to change — they all consume the typed domain model, not the
data source.

## Architecture

```
src/
  app/                  Next.js App Router pages + API routes (thin — no business logic)
  components/           Presentational + light-interactive UI (charts, pitch view, chat)
  lib/
    types.ts            Domain model (mirrors the real FPL API shapes)
    data/                DATA LAYER — mock generators today, swappable for lib/fpl/client.ts
    fpl/                 Real FPL API client (client.ts) + the live/mock switch (adapter.ts)
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

| Category | Source |
|---|---|
| Players, teams, gameweeks | Official FPL API `bootstrap-static` |
| Fixtures/results | Official FPL API `fixtures` |
| Manager team, history, picks, transfers | Official FPL API `entry/*` |
| Mini-league standings | Official FPL API `leagues-classic/*` |
| Expected stats (xG/xA), shots, key passes | Not in the official API — would need a stats provider (e.g. Understat/Opta-class feed) |
| Betting probabilities, predicted lineups | Third-party odds/lineup feeds — not connected in this build |
| Injury news | Club/media feeds or a service like PhysioRoom — not connected in this build |

The app never fabricates live data from these unconnected sources — where a
category isn't wired up, the UI is honest that it's a heuristic or omitted
entirely (e.g. injury status uses the FPL API's own `chance_of_playing`
field once live, not an invented external feed).

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
dashboard, team-ID import, squad visualisation, fixture ticker, player
database, comparison, expected-points model, squad optimiser, transfer
recommendations, mini-league comparison + war room, price-change interface,
AI assistant.

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
