// src/app/student/current-affairs/components/DigestCallout.tsx

"use client";

import { motion } from "framer-motion";
import { BookOpenCheck, Loader2, Sparkles, HelpCircle, Hourglass } from "lucide-react";
import { DailyDoseDigest, PILLAR_META } from "./types";

interface DigestCalloutProps {
  digest: DailyDoseDigest | null;
  quizCount: number;
  isLoading: boolean;
  isToday: boolean;
  onOpen: () => void;
}

export default function DigestCallout({
  digest,
  quizCount,
  isLoading,
  isToday,
  onOpen,
}: DigestCalloutProps) {
  if (isLoading) {
    return (
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 backdrop-blur-sm">
        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
        <span className="text-xs text-slate-500">Checking for a digest on this date...</span>
      </div>
    );
  }

  // No digest yet: today (day still open) or a past date with no relevant news / not yet processed.
  if (!digest) {
    return (
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-4">
        <Hourglass className="h-4 w-4 shrink-0 text-slate-500" />
        <p className="text-xs leading-relaxed text-slate-500">
          {isToday
            ? "Today's digest and quiz aren't ready yet -- they're compiled once the day's news cycle closes."
            : "No digest was generated for this date, likely because there was no exam-relevant news that day."}
        </p>
      </div>
    );
  }

  const pillarEntries = Object.entries(digest.pillar_breakdown || {}).filter(([, count]) => count > 0);

  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group mb-8 flex w-full flex-col items-start gap-4 rounded-2xl border border-blue-500/25 bg-slate-900/60 p-5 text-left backdrop-blur-sm transition-all hover:border-blue-500/50 hover:shadow-[0_4px_24px_-8px_rgba(37,99,235,0.35)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
          <BookOpenCheck className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100">
              This Day&apos;s Digest &amp; Quiz
            </h3>
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {pillarEntries.map(([pillar, count]) => {
              const meta = PILLAR_META[pillar as keyof typeof PILLAR_META];
              if (!meta) return null;
              return (
                <span
                  key={pillar}
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${meta.text} ${meta.bg} ${meta.border}`}
                >
                  {pillar} &middot; {count}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-blue-500">
        <HelpCircle className="h-3.5 w-3.5" />
        Study &amp; take quiz ({quizCount})
      </span>
    </motion.button>
  );
}