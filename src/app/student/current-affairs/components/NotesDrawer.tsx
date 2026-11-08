// src/app/student/current-affairs/components/NotesDrawer.tsx

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Compass } from "lucide-react";
import QuizWidget from "./QuizWidget";
import NotesRenderer from "./NotesRenderer";
import { StarMark } from "../../components/StudentBrand"; // ANUSHIVA silver mark
import { useTheme } from "../../theme/ThemeProvider";
import { formatISTDateLabel } from "@/utils/istDate";
import { DailyDoseDigest, QuizQuestion, LanguageCode, ExamPillar } from "./types";

interface NotesDrawerProps {
  isOpen: boolean;
  /** The date currently loaded (used for the header label only). */
  date: string;
  digest: DailyDoseDigest | null;
  quiz: QuizQuestion[];
  isLoading: boolean;
  error: string | null;
  language: LanguageCode;
  studentId: string;
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
  studentId,
  onClose,
}: NotesDrawerProps) {
  const { theme: t } = useTheme();

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
            className={`fixed inset-0 z-[60] ${t.drawer.overlay} backdrop-blur-[2px]`}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={`fixed right-0 top-0 z-[70] h-full w-full max-w-lg overflow-y-auto border-l ${t.drawer.surface} shadow-2xl`}
          >
            <div className={`sticky top-0 z-10 flex items-center justify-between border-b ${t.drawer.header} px-5 py-4 backdrop-blur-md`}>
              <div className="flex items-center gap-3">
                <StarMark size={30} tile id="drawer" />
                <div>
                  <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${t.text.faint}`}>
                    Daily Dose &middot; Digest
                  </span>
                  <p className={`text-sm font-bold ${t.text.heading}`}>
                    {formatISTDateLabel(date, { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close digest panel"
                className={`rounded-lg border p-1.5 transition-colors ${t.iconButton}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Compass className={`h-8 w-8 animate-spin ${t.accent.spinnerDim} duration-[3000ms]`} />
                  <p className={`text-xs ${t.text.faint}`}>Loading this day&apos;s digest...</p>
                </div>
              )}

              {!isLoading && error && (
                <div className={`rounded-xl border border-dashed ${t.panelDashed} p-8 text-center text-sm ${t.text.faint}`}>
                  {error}
                </div>
              )}

              {!isLoading && !error && !digest && (
                <div className={`rounded-xl border border-dashed ${t.panelDashed} p-8 text-center text-sm ${t.text.faint}`}>
                  No digest is available for this date yet.
                </div>
              )}

              {!isLoading && !error && digest && (
                <>
                  {/* Pillar breakdown */}
                  {pillarEntries.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {pillarEntries.map(([pillar, count]) => {
                        const meta = t.pillar[pillar as ExamPillar];
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
                  <div className={`rounded-xl border ${t.panel} p-5`}>
                    <NotesRenderer text={notesText} />
                  </div>

                  {/* Quiz spanning the day's news */}
                  <div>
                    <h3 className={`mb-3 text-base font-bold ${t.text.heading}`}>
                      Test Yourself &middot; {quiz.length} Questions
                    </h3>
                    <QuizWidget questions={quiz} studentId={studentId} language={language} />
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