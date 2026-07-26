"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { extractLeagueId } from "@/lib/utils";
import { setTeamIdCookie } from "@/lib/teamIdCookie";

interface Manager {
  entryId: number;
  managerName: string;
  teamName: string;
  rank: number;
}

export function FindTeamTool() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(raw: string) {
    const leagueId = extractLeagueId(raw);
    if (!leagueId) {
      setError('Couldn\'t find a league ID in that — paste either just the number, or the link from your league\'s "Standings" page.');
      return;
    }
    setError(null);
    setLoading(true);
    setManagers([]);
    try {
      const res = await fetch(`/api/fpl/league/${leagueId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setLeagueName(data.leagueName);
      setManagers(data.managers);
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return managers;
    const q = query.toLowerCase();
    return managers.filter((m) => m.managerName.toLowerCase().includes(q) || m.teamName.toLowerCase().includes(q));
  }, [managers, query]);

  function selectManager(entryId: number) {
    setTeamIdCookie(String(entryId));
    router.push("/dashboard");
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(input);
        }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="League ID or your league's Standings link"
          className="flex-1 rounded-xl border px-4 py-3 text-sm mono [border-color:var(--border)] [background:var(--bg-elevated)] focus:outline-none focus:[border-color:var(--accent)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl px-5 py-3 font-semibold [background:var(--accent)] text-white hover:[background:var(--accent-strong)] transition-colors disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-sm [color:var(--red)]">{error}</p>}

      {managers.length > 0 && (
        <div className="rounded-2xl border p-4 [border-color:var(--border)] [background:var(--surface)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{leagueName}</h3>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name…"
              className="rounded-lg border px-3 py-1.5 text-sm [border-color:var(--border)] [background:var(--bg-elevated)]"
            />
          </div>
          <ul className="divide-y [&>li]:py-2 max-h-[420px] overflow-y-auto scrollbar-thin" style={{ borderColor: "var(--border)" }}>
            {filtered.map((m) => (
              <li key={m.entryId} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{m.managerName}</div>
                  <div className="text-xs [color:var(--text-muted)]">{m.teamName}</div>
                </div>
                <button
                  onClick={() => selectManager(m.entryId)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full [background:var(--green-soft)] [color:var(--green)] hover:opacity-80 transition-opacity"
                >
                  This is me →
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="text-sm [color:var(--text-muted)] py-4 text-center">No one matches that filter.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
