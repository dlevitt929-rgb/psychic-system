"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setTeamIdCookie } from "@/lib/teamIdCookie";
import { extractTeamId } from "@/lib/utils";

export function TeamSwitcher({ currentTeamId }: { currentTeamId: string }) {
  const router = useRouter();
  const [value, setValue] = useState(currentTeamId);

  function apply(id: string) {
    const teamId = extractTeamId(id);
    if (!teamId) return;
    setTeamIdCookie(teamId);
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply(value);
      }}
      className="flex items-center gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="FPL Team ID"
        className="w-28 rounded-lg border px-2.5 py-1.5 text-sm mono [border-color:var(--border)] [background:var(--bg-elevated)] focus:outline-none focus:[border-color:var(--accent)]"
      />
      <button
        type="submit"
        className="rounded-lg px-3 py-1.5 text-sm font-medium [background:var(--accent)] text-white hover:[background:var(--accent-strong)] transition-colors"
      >
        Load
      </button>
    </form>
  );
}
