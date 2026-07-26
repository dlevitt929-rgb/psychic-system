import { Card, CardHeader } from "@/components/ui/Card";
import { FindTeamTool } from "@/components/layout/FindTeamTool";
import { USE_LIVE_FPL_API } from "@/lib/fpl/adapter";
import { Badge } from "@/components/ui/Badge";

export default function FindTeamPage() {
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Card>
        <CardHeader
          title="Find Your Team"
          subtitle="FPL doesn't let you search all managers by name, but if you know your mini-league, you can find yourself in it"
        />
        {!USE_LIVE_FPL_API && (
          <div className="mb-4">
            <Badge tone="amber">Live data is off</Badge>
            <p className="text-sm mt-2 [color:var(--text-muted)]">
              This tool searches real mini-leagues, so it only works once real data is turned on (set <code className="mono">USE_LIVE_FPL_API=true</code> in your{" "}
              <code className="mono">.env.local</code> file and restart the app).
            </p>
          </div>
        )}
        <p className="text-sm [color:var(--text-muted)] mb-4">
          Open your mini-league on the official FPL site, go to its <strong>&ldquo;Standings&rdquo;</strong> tab, and paste that page&apos;s link below — or just
          the number at the end of it.
        </p>
        <FindTeamTool />
      </Card>
    </div>
  );
}
