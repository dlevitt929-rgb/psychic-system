"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setTeamIdCookie } from "@/lib/teamIdCookie";
import { extractTeamId } from "@/lib/utils";

export function ImportForm({ defaultTeamId }: { defaultTeamId: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(id: string) {
    const teamId = extractTeamId(id);
    if (!teamId) {
      setError("Couldn't find a Team ID in that — paste either just the number, or the full link from your FPL \"Points\" page.");
      return;
    }
    setError(null);
    setLoading(true);
    setTeamIdCookie(teamId);
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Team ID or your FPL profile link"
          className="flex-1 rounded-xl border px-4 py-3 mono text-sm [border-color:var(--border)] [background:var(--bg-elevated)] focus:outline-none focus:[border-color:var(--accent)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl px-5 py-3 font-semibold [background:var(--accent)] text-white hover:[background:var(--accent-strong)] transition-colors disabled:opacity-60"
        >
          Import team
        </button>
        <button
          type="button"
          onClick={() => submit(defaultTeamId)}
          className="rounded-xl px-5 py-3 font-medium border [border-color:var(--border)] [color:var(--text-muted)] hover:[color:var(--text)] transition-colors"
        >
          Try a demo team
        </button>
      </form>
      {error && <p className="text-sm [color:var(--red)]">{error}</p>}
      <p className="text-xs [color:var(--text-muted)]">
        Don&apos;t know your ID?{" "}
        <Link href="/find-team" className="font-medium [color:var(--accent-strong)] hover:underline">
          Find it via your mini-league →
        </Link>
      </p>
    </div>
  );
}
