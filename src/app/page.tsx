import { ImportForm } from "@/components/layout/ImportForm";
import { DEFAULT_TEAM_ID } from "@/lib/session";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  { title: "AI Best Team Optimiser", desc: "A real mixed-integer optimiser picks the statistically strongest 15 under budget, position and club-limit constraints — not a hard-coded list." },
  { title: "Personalised Transfer Engine", desc: "Every sell recommendation names the specific replacement that beats it, with the expected-points delta and whether a hit is worth taking." },
  { title: "Mini-League War Room", desc: "Compare your squad against every rival in your league — shared players, differentials, and a protect-or-attack strategy call." },
  { title: "Differential Finder", desc: "Surfaces low-ownership players ranked by expected points × fixture quality × minutes probability ÷ ownership." },
  { title: "Price-Change Predictor", desc: "Live probability of a rise or fall tonight, from transfer momentum and ownership base." },
  { title: "AI Assistant", desc: "Ask it anything — it already knows your squad, your bank, and your mini-league rivals." },
];

export default function HomePage() {
  return (
    <div className="space-y-16 py-6">
      <section className="text-center max-w-3xl mx-auto space-y-6">
        <span className="inline-block text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full [background:var(--accent-soft)] [color:var(--accent-strong)]">
          AI-powered FPL analytics
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Beat your mini-league, not just the template.</h1>
        <p className="text-lg [color:var(--text-muted)]">
          Import your FPL team and get a real optimisation engine, an explainable expected-points model, and rival-aware strategy — built for managers who want
          to win their league, not just climb the overall rank.
        </p>
        <div className="flex justify-center pt-2">
          <ImportForm defaultTeamId={DEFAULT_TEAM_ID} />
        </div>
        <p className="text-xs [color:var(--text-muted)]">Find your Team ID in the URL of your FPL &ldquo;Points&rdquo; page: fantasy.premierleague.com/entry/&lt;ID&gt;/event/1</p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <h3 className="font-semibold mb-1.5">{f.title}</h3>
            <p className="text-sm [color:var(--text-muted)]">{f.desc}</p>
          </Card>
        ))}
      </section>

      <section className="text-center text-xs [color:var(--text-muted)] max-w-xl mx-auto">
        This build runs on illustrative demo data (procedurally generated, not real player stats) so every engine — optimiser, transfer planner, price predictor — is
        fully wired end-to-end. Swap <code className="mono">USE_LIVE_FPL_API=true</code> once deployed somewhere that can reach the official FPL API. See the README for
        architecture details.
      </section>
    </div>
  );
}
