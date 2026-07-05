// src/app/student/current-affairs/components/NotesDrawer.tsx

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Compass } from "lucide-react";
import QuizWidget from "./QuizWidget";
import { formatISTDateLabel } from "@/utils/istDate";
import { DailyDoseDigest, QuizQuestion, LanguageCode, PILLAR_META } from "./types";

interface NotesDrawerProps {
  isOpen: boolean;
  /** The date currently loaded (used for the header label only). */
  date: string;
  digest: DailyDoseDigest | null;
  quiz: QuizQuestion[];
  isLoading: boolean;
  error: string | null;
  language: LanguageCode;
  onClose: () => void;
}

export default function NotesDrawer({
  isOpen,
  date,
  digest,
  quiz,
  isLoading,
  error,
  language,
  onClose,
}: NotesDrawerProps) {
  const notesText = digest
    ? language === "hi"
      ? digest.notes_hi || digest.notes_en
      : language === "mr"
      ? digest.notes_mr || digest.notes_en
      : digest.notes_en
    : "";

  const pillarEntries = digest ? Object.entries(digest.pillar_breakdown || {}).filter(([, c]) => c > 0) : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-[#1B2430]/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-[70] h-full w-full max-w-lg overflow-y-auto border-l border-[#DCE1E8] bg-[#EEF1F5] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#DCE1E8] bg-[#EEF1F5]/95 px-5 py-4 backdrop-blur-md">
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#8992A0]">
                  Daily Dose &middot; Digest
                </span>
                <p className="font-serif text-sm font-bold text-[#1B2430]">
                  {formatISTDateLabel(date, { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close digest panel"
                className="rounded-lg border border-[#DCE1E8] bg-white p-1.5 text-[#5B6472] transition-colors hover:text-[#1B2430]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Compass className="h-8 w-8 animate-spin text-[#1F5F4A]/40 duration-[3000ms]" />
                  <p className="text-xs text-[#8992A0]">Loading this day&apos;s digest...</p>
                </div>
              )}

              {!isLoading && error && (
                <div className="rounded-xl border border-dashed border-[#DCE1E8] bg-white p-8 text-center text-sm text-[#8992A0]">
                  {error}
                </div>
              )}

              {!isLoading && !error && !digest && (
                <div className="rounded-xl border border-dashed border-[#DCE1E8] bg-white p-8 text-center text-sm text-[#8992A0]">
                  No digest is available for this date yet.
                </div>
              )}

              {!isLoading && !error && digest && (
                <>
                  {/* Pillar breakdown */}
                  {pillarEntries.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {pillarEntries.map(([pillar, count]) => {
                        const meta = PILLAR_META[pillar as keyof typeof PILLAR_META];
                        if (!meta) return null;
                        return (
                          <span
                            key={pillar}
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${meta.text} ${meta.bg} ${meta.border}`}
                          >
                            {pillar} &middot; {count} {count === 1 ? "article" : "articles"}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Consolidated notes for the whole day */}
                  <div className="rounded-xl border border-[#DCE1E8] bg-white p-5">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-[#374151]">
                      {notesText}
                    </p>
                  </div>

                  {/* Quiz spanning the day's news */}
                  <div>
                    <h3 className="mb-3 font-serif text-base font-bold text-[#1B2430]">
                      Test Yourself &middot; {quiz.length} Questions
                    </h3>
                    <QuizWidget questions={quiz} />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}