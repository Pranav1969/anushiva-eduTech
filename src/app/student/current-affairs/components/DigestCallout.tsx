// src/app/student/current-affairs/components/DigestCallout.tsx

"use client";

import { motion } from "framer-motion";
import { BookOpenCheck, Loader2, Sparkles, HelpCircle, Hourglass } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { DailyDoseDigest, ExamPillar } from "./types";

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
  const { theme: t } = useTheme();

  if (isLoading) {
    return (
      <div className={`mb-8 flex items-center gap-3 rounded-2xl border ${t.panel} px-5 py-4`}>
        <Loader2 className={`h-4 w-4 animate-spin ${t.accent.text}`} />
        <span className={`text-xs ${t.text.faint}`}>Checking for a digest on this date...</span>
      </div>
    );
  }

  // No digest yet: today (day still open) or a past date with no relevant news / not yet processed.
  if (!digest) {
    return (
      <div className={`mb-8 flex items-center gap-3 rounded-2xl border border-dashed ${t.panelDashed} px-5 py-4`}>
        <Hourglass className={`h-4 w-4 shrink-0 ${t.text.faint}`} />
        <p className={`text-xs leading-relaxed ${t.text.faint}`}>
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
      className={`group mb-8 flex w-full flex-col items-start gap-4 rounded-2xl border ${t.accent.callout} p-5 text-left transition-all sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="flex items-start gap-3 sm:items-center">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${t.accent.iconWrap}`}>
          <BookOpenCheck className={`h-5 w-5 ${t.accent.text}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-bold ${t.text.heading}`}>
              This Day&apos;s Digest &amp; Quiz
            </h3>
            <Sparkles className={`h-3.5 w-3.5 ${t.amber.icon}`} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {pillarEntries.map(([pillar, count]) => {
              const meta = t.pillar[pillar as ExamPillar];
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

      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full ${t.accent.solid} ${t.accent.solidGroupHover} px-4 py-2 text-xs font-semibold transition-colors`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Study &amp; take quiz ({quizCount})
      </span>
    </motion.button>
  );
}