// src/app/student/current-affairs/components/NotesDrawer.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Compass, Headphones, Square, FileDown, Lock } from "lucide-react";
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
  /** True when the student's plan unlocks Listen + Download PDF. */
  canUsePremiumTools: boolean;
  /** Called when a locked premium tool is tapped (opens the upgrade modal). */
  onLockedToolClick: (featureLabel: string) => void;
  onClose: () => void;
}

const SPEECH_LANG: Record<LanguageCode, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function NotesDrawer({
  isOpen,
  date,
  digest,
  quiz,
  isLoading,
  error,
  language,
  studentId,
  canUsePremiumTools,
  onLockedToolClick,
  onClose,
}: NotesDrawerProps) {
  const { theme: t } = useTheme();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRunId = useRef(0);

  const notesText = digest
    ? language === "hi"
      ? digest.notes_hi || digest.notes_en
      : language === "mr"
      ? digest.notes_mr || digest.notes_en
      : digest.notes_en
    : "";

  const pillarEntries = digest ? Object.entries(digest.pillar_breakdown || {}).filter(([, c]) => c > 0) : [];

  const stopSpeech = () => {
    speechRunId.current += 1; // invalidates any queued utterance callbacks
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Stop audio when the drawer closes, language changes, or the component unmounts.
  useEffect(() => {
    if (!isOpen) stopSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  useEffect(() => {
    stopSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);
  useEffect(() => () => stopSpeech(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const plainLines = () =>
    notesText
      .split("\n")
      .map((l) => l.replace(/^#+\s*/, "").replace(/^[-*]\s+/, "").replace(/\*\*/g, "").trim())
      .filter(Boolean);

  const handleListen = () => {
    if (!canUsePremiumTools) return onLockedToolClick("Audio notes");
    if (isSpeaking) return stopSpeech();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Audio playback isn't supported in this browser.");
      return;
    }
    const lines = plainLines();
    if (lines.length === 0) return;

    window.speechSynthesis.cancel();
    const runId = ++speechRunId.current;
    let i = 0;

    const speakNext = () => {
      if (runId !== speechRunId.current) return;
      if (i >= lines.length) {
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(lines[i++]);
      utterance.lang = SPEECH_LANG[language];
      utterance.rate = 0.95;
      utterance.onend = speakNext;
      utterance.onerror = () => {
        if (runId === speechRunId.current) setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    };

    setIsSpeaking(true);
    speakNext();
  };

  const handleDownload = () => {
    if (!canUsePremiumTools) return onLockedToolClick("Downloadable notes");
    if (!notesText) return;

    const dateLabel = formatISTDateLabel(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const bodyHtml = notesText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const bold = (s: string) => escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        if (line.startsWith("## ")) return `<h2>${bold(line.slice(3))}</h2>`;
        if (line.startsWith("- ") || line.startsWith("* ")) return `<li>${bold(line.slice(2))}</li>`;
        return `<p>${bold(line)}</p>`;
      })
      .join("\n")
      // wrap consecutive <li> in <ul>
      .replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, "<ul>$1</ul>");

    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups to download your notes.");
      return;
    }
    win.document.write(`<!doctype html><html lang="${language}"><head><meta charset="utf-8" />
<title>Daily Dose - ${escapeHtml(dateLabel)}</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Devanagari",sans-serif;max-width:720px;margin:32px auto;padding:0 20px;color:#111;line-height:1.6}
  h1{font-size:22px;margin:0 0 4px} .sub{color:#666;font-size:13px;margin-bottom:24px}
  h2{font-size:15px;text-transform:uppercase;letter-spacing:.05em;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  ul{padding-left:20px;margin:0} li{margin-bottom:6px;font-size:14px} p{font-size:14px}
</style></head><body>
<h1>Daily Dose Digest</h1><div class="sub">${escapeHtml(dateLabel)}</div>
${bodyHtml}
<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
</body></html>`);
    win.document.close();
  };

  const toolBtn = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${t.filter.idle}`;

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
                  {/* Premium tools */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleListen} className={toolBtn}>
                      {isSpeaking ? <Square className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
                      {isSpeaking ? "Stop" : "Listen"}
                      {!canUsePremiumTools && <Lock className={`h-3 w-3 ${t.amber.icon}`} />}
                    </button>
                    <button onClick={handleDownload} className={toolBtn}>
                      <FileDown className="h-3.5 w-3.5" />
                      Download PDF
                      {!canUsePremiumTools && <Lock className={`h-3 w-3 ${t.amber.icon}`} />}
                    </button>
                  </div>

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