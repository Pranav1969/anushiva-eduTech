// src/app/student/current-affairs/components/NewsCard.tsx

"use client";

import { motion } from "framer-motion";
import {
  Bookmark,
  Calendar,
  Clock,
  ExternalLink,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { NewsCapsule, LanguageCode, SOURCE_META } from "./types";

interface NewsCardProps {
  capsule: NewsCapsule;
  language: LanguageCode;
  isLocked: boolean;
  isRead: boolean;
  isBookmarked: boolean;
  onInteract: (capsule: NewsCapsule) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  /** Renders a slightly denser, accent-framed variant for the Daily Dose carousel */
  variant?: "default" | "compact";
}

export default function NewsCard({
  capsule,
  language,
  isLocked,
  isRead,
  isBookmarked,
  onInteract,
  onToggleBookmark,
  variant = "default",
}: NewsCardProps) {
  const sourceMeta = SOURCE_META[capsule.source_type];
  const isCompact = variant === "compact";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onClick={() => onInteract(capsule)}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
        isCompact ? "h-full p-5" : "p-6 md:p-8"
      } ${
        isLocked
          ? "border-amber-500/30 bg-slate-900/60"
          : isRead
          ? "border-slate-800 bg-slate-900/40 opacity-70"
          : "border-slate-800 bg-slate-900/60 hover:border-blue-500/40 hover:shadow-[0_4px_24px_-8px_rgba(37,99,235,0.3)]"
      }`}
    >
      {/* Meta row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${sourceMeta.text} ${sourceMeta.bg} ${sourceMeta.border}`}
          >
            {sourceMeta.label}
          </span>
          {!isCompact && (
            <span className="rounded-md border border-slate-800 bg-slate-950/50 px-2.5 py-1 text-[11px] font-medium text-slate-400">
              {capsule.category_tag}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>{capsule.original_date}</span>
          </div>
          {!isCompact && (
            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3 font-mono text-[10.5px] text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{capsule.read_time}</span>
            </div>
          )}
          {!isLocked && (
            <button
              onClick={(e) => onToggleBookmark(capsule.id, e)}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this capsule"}
              className={`rounded-lg border p-1.5 transition-all ${
                isBookmarked
                  ? "border-blue-500/40 bg-blue-500/15 text-blue-400"
                  : "border-slate-800 bg-slate-950/50 text-slate-500 hover:text-blue-400"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-blue-400" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Core content */}
      {isLocked ? (
        <div className="space-y-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            <Lock className="h-3 w-3" /> Locked &middot; {capsule.required_plan} tier
          </div>
          <h2
            className={`select-none font-bold text-slate-300 blur-[4px] ${
              isCompact ? "text-base" : "text-lg md:text-xl"
            }`}
          >
            {capsule.title[language] || "Sample locked headline"}
          </h2>
          {!isCompact && (
            <p className="select-none text-sm leading-relaxed text-slate-500 blur-[6px]">
              Placeholder summary of structured regulatory notification requiring an upgraded tier.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h2
            className={`font-bold leading-snug tracking-tight text-slate-100 transition-colors group-hover:text-blue-300 ${
              isCompact ? "text-base" : "text-lg md:text-xl"
            }`}
          >
            {capsule.title[language]}
          </h2>
          {!isCompact && (
            <p className="select-text whitespace-pre-line text-sm leading-relaxed text-slate-400">
              {capsule.summary[language]}
            </p>
          )}
        </div>
      )}

      {/* Footer controls */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
        <div className="text-xs text-slate-500">
          {isLocked ? (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 transition-colors group-hover:text-amber-300">
              Tap to unlock {capsule.required_plan} &rarr;
            </span>
          ) : isRead ? (
            <span className="flex items-center gap-1 font-medium text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Finished reading
            </span>
          ) : (
            <span className="transition-colors group-hover:text-slate-300">Tap to mark as read</span>
          )}
        </div>

        {!isLocked && !isCompact && (
          <a
            href={capsule.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-blue-400"
          >
            Verify source <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </motion.article>
  );
}