"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Player } from "@/lib/types";

export function PlayerPicker({ allPlayers, selectedIds }: { allPlayers: Player[]; selectedIds: number[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allPlayers.filter((p) => p.webName.toLowerCase().includes(q) && !selectedIds.includes(p.id)).slice(0, 6);
  }, [query, allPlayers, selectedIds]);

  function updateIds(ids: number[]) {
    router.push(ids.length ? `/compare?ids=${ids.join(",")}` : "/compare");
  }

  function add(id: number) {
    if (selectedIds.length >= 4) return;
    updateIds([...selectedIds, id]);
    setQuery("");
  }

  function remove(id: number) {
    updateIds(selectedIds.filter((i) => i !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedIds.map((id) => {
          const player = allPlayers.find((p) => p.id === id);
          if (!player) return null;
          return (
            <button
              key={id}
              onClick={() => remove(id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm [background:var(--accent-soft)] [color:var(--accent-strong)]"
            >
              {player.webName} <span aria-hidden>×</span>
            </button>
          );
        })}
      </div>
      {selectedIds.length < 4 && (
        <div className="relative max-w-xs">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a player to compare…"
            className="w-full rounded-lg border px-3 py-2 text-sm [border-color:var(--border)] [background:var(--bg-elevated)]"
          />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border shadow-lg [border-color:var(--border)] [background:var(--surface)] overflow-hidden">
              {matches.map((p) => (
                <li key={p.id}>
                  <button onClick={() => add(p.id)} className="w-full text-left px-3 py-2 text-sm hover:[background:var(--surface-hover)]">
                    {p.webName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
