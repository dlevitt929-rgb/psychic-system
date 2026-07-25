"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TEAM_ID_COOKIE } from "@/lib/teamIdCookie";

export function ImportForm({ defaultTeamId }: { defaultTeamId: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(id: string) {
    const clean = id.replace(/\D/g, "");
    if (!clean) return;
    setLoading(true);
    document.cookie = `${TEAM_ID_COOKIE}=${clean}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.push("/dashboard");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter your FPL Team ID"
        inputMode="numeric"
        className="flex-1 rounded-xl border px-4 py-3 mono [border-color:var(--border)] [background:var(--bg-elevated)] focus:outline-none focus:[border-color:var(--accent)]"
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
  );
}
