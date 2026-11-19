"use client";

import { ReactNode } from "react";
import { Handshake, BadgeCheck, BookOpenCheck } from "lucide-react";
import ThemeToggle from "@/app/student/theme/ThemeToggle";
import { useTheme } from "@/app/student/theme/ThemeProvider";
import { AnimatedGrid, BackgroundEffects } from "./BackgroundEffects";
import { AnushivaMark } from "./AnushivaLogo";

/* TOP: partner endorsement badge */
function PartnerBadge() {
  const { theme } = useTheme();

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${theme.amber.iconWrap}`}
      >
        <Handshake size={17} className={theme.amber.icon} />
      </div>

      <div className="min-w-0 leading-tight">
        <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-[0.22em] ${theme.text.faint}`}>
          In Association with
        </p>
        <p className={`flex items-center gap-1.5 text-sm md:text-base font-black tracking-tight ${theme.text.heading}`}>
          <span className="truncate">Karuna Book Centre</span>
          <BadgeCheck size={15} className={`shrink-0 ${theme.amber.icon}`} />
        </p>
      </div>
    </div>
  );
}

/* BOTTOM: publisher signature */
function PublisherSignature() {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
      <div className="flex items-center gap-3">
        <AnushivaMark size={40} />
        <div className="leading-tight text-left">
          <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-[0.22em] ${theme.text.faint}`}>
            Powered by
          </p>
          <p className={`text-sm md:text-base font-black tracking-tight ${theme.text.heading}`}>
            Anushiva Publications
          </p>
        </div>
      </div>

      <p
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] md:text-[11px] font-semibold ${theme.inset} ${theme.text.muted}`}
      >
        <BookOpenCheck size={12} className={theme.accent.text} />
        Study material &amp; mock tests by Anushiva Publications
      </p>

      <p className={`text-[10px] md:text-[11px] font-medium ${theme.text.faint}`}>
        © {new Date().getFullYear()} Anushiva Publications. All rights reserved.
      </p>
    </div>
  );
}

export function LoginShell({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <main
      className={`min-h-screen w-full flex flex-col justify-between font-sans antialiased relative overflow-x-hidden ${theme.page} ${theme.selection}`}
    >
      <AnimatedGrid />
      <BackgroundEffects />

      <header className={`relative z-10 w-full border-b ${theme.header}`}>
        <div className={`h-0.5 w-full ${theme.accent.gradient}`} />
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-3 flex items-center justify-between gap-3">
          <PartnerBadge />
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-10 w-full max-w-7xl mx-auto my-auto p-4 md:p-8 lg:p-12">
        {children}
      </div>

      <footer className={`relative z-10 w-full border-t ${theme.header}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-5">
          <PublisherSignature />
        </div>
      </footer>
    </main>
  );
}