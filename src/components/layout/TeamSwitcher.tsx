"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TEAM_ID_COOKIE } from "@/lib/teamIdCookie";

export function TeamSwitcher({ currentTeamId }: { currentTeamId: string }) {
  const router = useRouter();
  const [value, setValue] = useState(currentTeamId);

  function apply(id: string) {
    const clean = id.replace(/\D/g, "");
    if (!clean) return;
    document.cookie = `${TEAM_ID_COOKIE}=${clean}; path=/; max-age=${60 * 60 * 24 * 365}`;
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
        inputMode="numeric"
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
