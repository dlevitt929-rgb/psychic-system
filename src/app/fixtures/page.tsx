import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { FixtureTicker } from "@/components/fixtures/FixtureTicker";
import { cn } from "@/lib/utils";

type SearchParams = { kind?: string; n?: string };

export default async function FixturesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const kind = sp.kind === "defence" ? "defence" : "attack";
  const n = Number(sp.n) || 8;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Fixture Ticker" subtitle="Our own fixture-difficulty score — clubs sorted easiest to hardest" />
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex gap-1 rounded-lg border p-1 [border-color:var(--border)]">
            {[
              { key: "attack", label: "Best attacking fixtures" },
              { key: "defence", label: "Best defensive fixtures" },
            ].map((opt) => (
              <Link
                key={opt.key}
                href={`/fixtures?kind=${opt.key}&n=${n}`}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium", kind === opt.key ? "[background:var(--accent)] text-white" : "[color:var(--text-muted)]")}
              >
                {opt.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg border p-1 [border-color:var(--border)]">
            {[3, 5, 8].map((count) => (
              <Link
                key={count}
                href={`/fixtures?kind=${kind}&n=${count}`}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium", n === count ? "[background:var(--accent)] text-white" : "[color:var(--text-muted)]")}
              >
                Next {count}
              </Link>
            ))}
          </div>
        </div>
        <FixtureTicker kind={kind} gwCount={n} />
        <p className="mt-3 text-xs [color:var(--text-muted)]">
          Score is 1 (easiest) – 5 (hardest), built from our own club strength ratings rather than the official FPL FDR. Green = easy, red = hard.
        </p>
      </Card>
    </div>
  );
}
