// src/app/student/upgrade/page.tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Crown, Sparkles } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";

// Placeholder page: plans, prices and checkout will be added later.
export default function UpgradePlanPage() {
  const { theme: t } = useTheme();

  return (
    <main className={`min-h-screen ${t.page} ${t.selection}`}>
      <header className={`sticky top-0 z-10 border-b backdrop-blur-md ${t.header}`}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href="/student"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${t.iconButton}`}
          >
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mx-auto max-w-xl text-center">
          <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${t.amber.iconWrap} ${t.amber.icon}`}>
            <Crown size={24} />
          </div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${t.text.heading}`}>Upgrade your plan</h1>
          <p className={`mt-2 text-sm leading-relaxed ${t.text.muted}`}>
            Choose a plan that fits your preparation. Plans and pricing are being finalised and will appear here soon.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {["Basic", "Standard", "Premium"].map((name) => (
            <div key={name} className={`rounded-2xl border border-dashed p-6 ${t.panelDashed}`}>
              <div className={`flex items-center gap-2 text-lg font-bold ${t.text.heading}`}>
                <Sparkles size={16} className={t.accent.text} /> {name}
              </div>
              <div className={`mt-3 h-3 w-24 rounded ${t.accent.track}`} />
              <div className={`mt-2 h-3 w-36 rounded ${t.accent.track}`} />
              <div className={`mt-2 h-3 w-28 rounded ${t.accent.track}`} />
              <button
                disabled
                className={`mt-6 w-full cursor-not-allowed rounded-xl border px-4 py-2.5 text-sm font-bold opacity-60 ${t.ui.btnGhost}`}
              >
                Coming soon
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}