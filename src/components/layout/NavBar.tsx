"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TeamSwitcher } from "@/components/layout/TeamSwitcher";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/compare", label: "Compare" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/optimiser", label: "Optimiser" },
  { href: "/transfers", label: "Transfers" },
  { href: "/mini-league", label: "Mini-League" },
  { href: "/price-watch", label: "Price Watch" },
  { href: "/assistant", label: "Assistant" },
];

export function NavBar({ teamId }: { teamId: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur [border-color:var(--border)] [background:color-mix(in_srgb,var(--bg)_88%,transparent)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 rounded-lg [background:var(--accent)] flex items-center justify-center text-white font-bold text-sm">K</span>
            <span className="font-semibold tracking-tight hidden sm:inline">Kickoff IQ</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    active ? "[background:var(--accent-soft)] [color:var(--accent-strong)]" : "[color:var(--text-muted)] hover:[color:var(--text)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="hidden md:block">
          <TeamSwitcher currentTeamId={teamId} />
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden rounded-lg p-2 border [border-color:var(--border)]"
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 [background:var(--text)] mb-1" />
          <span className="block w-5 h-0.5 [background:var(--text)] mb-1" />
          <span className="block w-5 h-0.5 [background:var(--text)]" />
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t [border-color:var(--border)] px-4 py-3 flex flex-col gap-1">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm [color:var(--text-muted)]">
              {link.label}
            </Link>
          ))}
          <div className="pt-2">
            <TeamSwitcher currentTeamId={teamId} />
          </div>
        </div>
      )}
    </header>
  );
}
