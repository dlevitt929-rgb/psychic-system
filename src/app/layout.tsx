import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/layout/NavBar";
import { GwCountdown } from "@/components/layout/GwCountdown";
import { getActiveTeamId } from "@/lib/session";
import { USE_LIVE_FPL_API } from "@/lib/fpl/adapter";
import { ensureBootstrapLoaded } from "@/lib/data/live";

export const metadata: Metadata = {
  title: "Kickoff IQ — AI Fantasy Premier League Assistant",
  description: "Squad optimisation, transfer planning and mini-league strategy for serious FPL managers.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Every page reads the CLUBS/PLAYERS/FIXTURES arrays directly, so live
  // data has to be loaded before anything under this layout renders — this
  // is that one choke point. No-ops instantly when USE_LIVE_FPL_API is off.
  if (USE_LIVE_FPL_API) {
    try {
      await ensureBootstrapLoaded();
    } catch (err) {
      // Falls through to whatever CLUBS/PLAYERS/FIXTURES currently hold
      // (the mock data from module init) — getUserTeam/getRivalTeams retry
      // and fail over independently, so this is a safe, logged no-op.
      console.error("[live-fpl] bootstrap load failed, continuing on mock data:", err);
    }
  }
  const teamId = await getActiveTeamId();
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col [background:var(--bg)] [color:var(--text)]">
        <NavBar teamId={teamId} />
        <GwCountdown />
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6">{children}</main>
        <footer className="border-t [border-color:var(--border)] py-6 px-6 text-xs [color:var(--text-muted)] text-center">
          Kickoff IQ is an independent project and is not affiliated with the Premier League or Fantasy Premier League. Demo build running on illustrative data.
        </footer>
      </body>
    </html>
  );
}
