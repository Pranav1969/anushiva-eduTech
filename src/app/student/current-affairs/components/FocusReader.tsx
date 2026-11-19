// src/app/student/current-affairs/components/FocusReader.tsx
//
// Distraction-free, full-screen reader: one capsule at a time.
// Keys: ← / → (or k / j) navigate, Esc exits. Touch: swipe left/right.

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Lock,
  Minus,
  Plus,
  Calendar,
  Clock,
} from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { NewsCapsule, LanguageCode, SOURCE_META } from "./types";

interface FocusReaderProps {
  items: NewsCapsule[];
  language: LanguageCode;
  onLanguageChange: (value: LanguageCode) => void;
  checkIsLocked: (plan: NewsCapsule["required_plan"]) => boolean;
  readIds: string[];
  bookmarkedIds: string[];
  onMarkRead: (capsule: NewsCapsule) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onUnlock: (capsule: NewsCapsule) => void;
  onExit: () => void;
}

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

const BODY_SIZES = ["text-sm", "text-base", "text-lg", "text-xl"];
const TITLE_SIZES = ["text-xl", "text-2xl", "text-3xl", "text-4xl"];

export default function FocusReader({
  items,
  language,
  onLanguageChange,
  checkIsLocked,
  readIds,
  bookmarkedIds,
  onMarkRead,
  onToggleBookmark,
  onUnlock,
  onExit,
}: FocusReaderProps) {
  const { theme: t } = useTheme();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [sizeLevel, setSizeLevel] = useState(1);
  const touchStartX = useRef<number | null>(null);

  const total = items.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const capsule = items[safeIndex];

  const go = (delta: 1 | -1) => {
    setDirection(delta);
    setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)));
  };

  const next = () => {
    if (capsule && !checkIsLocked(capsule.required_plan) && !readIds.includes(capsule.id)) {
      onMarkRead(capsule);
    }
    go(1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") onExit();
      else if (e.key === "ArrowRight" || e.key === "j") next();
      else if (e.key === "ArrowLeft" || e.key === "k") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capsule, readIds, total]);

  // Lock background scroll while the reader is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const progressPct = total > 0 ? ((safeIndex + 1) / total) * 100 : 0;

  const locked = capsule ? checkIsLocked(capsule.required_plan) : false;
  const isRead = capsule ? readIds.includes(capsule.id) : false;
  const isBookmarked = capsule ? bookmarkedIds.includes(capsule.id) : false;
  const sourceColors = capsule ? t.source[capsule.source_type] : null;

  return (
    <div className={`fixed inset-0 z-[55] flex flex-col ${t.page} font-sans antialiased`}>
      {/* Top bar */}
      <div className={`border-b ${t.header} backdrop-blur-md`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={onExit}
            className={`inline-flex items-center gap-2 rounded-full border ${t.panel} px-3 py-1.5 text-xs font-semibold ${t.text.mutedHover} transition-colors`}
          >
            <X className="h-3.5 w-3.5" /> Exit<span className="hidden sm:inline"> (Esc)</span>
          </button>

          <div className="flex items-center gap-2">
            <div className={`grid grid-cols-3 rounded-xl border ${t.inset} p-0.5`}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                    language === lang.code ? t.segmented.active : t.segmented.idle
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className={`flex items-center rounded-xl border ${t.inset} p-0.5`}>
              <button
                onClick={() => setSizeLevel((s) => Math.max(0, s - 1))}
                disabled={sizeLevel === 0}
                aria-label="Decrease text size"
                className={`rounded-lg p-1.5 ${t.text.muted} disabled:opacity-30`}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className={`px-1 font-mono text-[10px] font-bold ${t.text.faint}`}>Aa</span>
              <button
                onClick={() => setSizeLevel((s) => Math.min(BODY_SIZES.length - 1, s + 1))}
                disabled={sizeLevel === BODY_SIZES.length - 1}
                aria-label="Increase text size"
                className={`rounded-lg p-1.5 ${t.text.muted} disabled:opacity-30`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className={`h-1 w-full ${t.accent.track}`}>
          <div className={`h-1 ${t.accent.gradient} transition-all duration-300`} style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Reader */}
      <div
        className="flex-1 overflow-y-auto"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > 60) {
            if (dx < 0) next();
            else go(-1);
          }
        }}
      >
        <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-5 py-8">
          {total === 0 || !capsule ? (
            <div className={`rounded-2xl border border-dashed ${t.panelDashed} p-12 text-center text-sm ${t.text.faint}`}>
              Nothing to read here. Try a different date or clear the search/filter.
            </div>
          ) : (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.article
                key={capsule.id}
                initial={{ opacity: 0, x: direction * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -30 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  {sourceColors && (
                    <span
                      className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${sourceColors.text} ${sourceColors.bg} ${sourceColors.border}`}
                    >
                      {SOURCE_META[capsule.source_type].label}
                    </span>
                  )}
                  <span className={`rounded-md border ${t.inset} px-2.5 py-1 text-[11px] font-medium ${t.text.muted}`}>
                    {capsule.category_tag}
                  </span>
                  <span className={`flex items-center gap-1.5 font-mono text-[10.5px] ${t.text.faint}`}>
                    <Calendar className="h-3.5 w-3.5" /> {capsule.original_date}
                  </span>
                  <span className={`flex items-center gap-1.5 font-mono text-[10.5px] ${t.text.faint}`}>
                    <Clock className="h-3.5 w-3.5" /> {capsule.read_time}
                  </span>
                </div>

                {locked ? (
                  <div className="space-y-4">
                    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${t.amber.text}`}>
                      <Lock className="h-3.5 w-3.5" /> Locked &middot; {capsule.required_plan} tier
                    </div>
                    <h1 className={`select-none font-bold leading-snug ${TITLE_SIZES[sizeLevel]} ${t.amber.lockedTitle} blur-[5px]`}>
                      {capsule.title[language] || "Sample locked headline"}
                    </h1>
                    <button
                      onClick={() => onUnlock(capsule)}
                      className={`rounded-xl ${t.accent.solid} ${t.accent.solidHover} px-5 py-2.5 text-sm font-semibold transition-colors`}
                    >
                      Unlock {capsule.required_plan} &rarr;
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className={`font-bold leading-snug tracking-tight ${TITLE_SIZES[sizeLevel]} ${t.text.heading}`}>
                      {capsule.title[language]}
                    </h1>
                    <p className={`whitespace-pre-line leading-relaxed ${BODY_SIZES[sizeLevel]} ${t.text.body}`}>
                      {capsule.summary[language]}
                    </p>

                    <div className={`flex flex-wrap items-center gap-3 border-t ${t.divider} pt-4`}>
                      <button
                        onClick={(e) => onToggleBookmark(capsule.id, e)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                          isBookmarked ? t.bookmark.on : t.bookmark.off
                        }`}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? t.bookmark.fill : ""}`} />
                        {isBookmarked ? "Saved" : "Save"}
                      </button>

                      {isRead && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${t.success.text}`}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Read
                        </span>
                      )}

                      <a
                        href={capsule.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${t.text.muted} transition-colors ${t.accent.linkHover}`}
                      >
                        Verify source <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </>
                )}
              </motion.article>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      {total > 0 && (
        <div className={`border-t ${t.header} backdrop-blur-md`}>
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <button
              onClick={() => go(-1)}
              disabled={safeIndex === 0}
              className={`inline-flex items-center gap-1.5 rounded-xl border ${t.panel} px-4 py-2 text-xs font-semibold ${t.text.heading} transition-colors disabled:opacity-30`}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>

            <span className={`font-mono text-xs font-semibold ${t.text.muted}`}>
              {safeIndex + 1} / {total}
            </span>

            {safeIndex < total - 1 ? (
              <button
                onClick={next}
                className={`inline-flex items-center gap-1.5 rounded-xl ${t.accent.solid} ${t.accent.solidHover} px-4 py-2 text-xs font-semibold transition-colors`}
              >
                {locked || isRead ? "Next" : "Done & Next"} <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (capsule && !locked && !isRead) onMarkRead(capsule);
                  onExit();
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl ${t.accent.solid} ${t.accent.solidHover} px-4 py-2 text-xs font-semibold transition-colors`}
              >
                <CheckCircle2 className="h-4 w-4" /> Finish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}