import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/layout/NavBar";
import { GwCountdown } from "@/components/layout/GwCountdown";
import { getActiveTeamId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Kickoff IQ — AI Fantasy Premier League Assistant",
  description: "Squad optimisation, transfer planning and mini-league strategy for serious FPL managers.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
