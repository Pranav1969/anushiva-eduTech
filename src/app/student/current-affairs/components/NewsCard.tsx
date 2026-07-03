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
      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border bg-white transition-all duration-300 ${
        isCompact ? "h-full p-5" : "p-6 md:p-8"
      } ${
        isLocked
          ? "border-[#B98B3E]/35 bg-[#B98B3E]/[0.02]"
          : isRead
          ? "border-[#E3E7EC] opacity-70"
          : "border-[#DCE1E8] hover:border-[#1F5F4A]/40 hover:shadow-[0_4px_24px_-8px_rgba(31,95,74,0.15)]"
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
            <span className="rounded-md border border-[#E3E7EC] bg-[#F4F6F8] px-2.5 py-1 text-[11px] font-medium text-[#5B6472]">
              {capsule.category_tag}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-[#8992A0]">
            <Calendar className="h-3.5 w-3.5" />
            <span>{capsule.original_date}</span>
          </div>
          {!isCompact && (
            <div className="flex items-center gap-1.5 border-l border-[#E3E7EC] pl-3 font-mono text-[10.5px] text-[#8992A0]">
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
                  ? "border-[#1F5F4A]/30 bg-[#1F5F4A]/10 text-[#1F5F4A]"
                  : "border-[#E3E7EC] bg-[#F9FAFB] text-[#8992A0] hover:text-[#1F5F4A]"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-[#1F5F4A]" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Core content */}
      {isLocked ? (
        <div className="space-y-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#8A6216]">
            <Lock className="h-3 w-3" /> Locked &middot; {capsule.required_plan} tier
          </div>
          <h2
            className={`select-none font-serif font-bold text-[#3A4351] blur-[4px] ${
              isCompact ? "text-base" : "text-lg md:text-xl"
            }`}
          >
            {capsule.title[language] || "Sample locked headline"}
          </h2>
          {!isCompact && (
            <p className="select-none text-sm leading-relaxed text-[#8992A0] blur-[6px]">
              Placeholder summary of structured regulatory notification requiring an upgraded tier.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h2
            className={`font-serif font-bold leading-snug tracking-tight text-[#1B2430] transition-colors group-hover:text-[#1F5F4A] ${
              isCompact ? "text-base" : "text-lg md:text-xl"
            }`}
          >
            {capsule.title[language]}
          </h2>
          {!isCompact && (
            <p className="select-text whitespace-pre-line text-sm leading-relaxed text-[#5B6472]">
              {capsule.summary[language]}
            </p>
          )}
        </div>
      )}

      {/* Footer controls */}
      <div className="mt-6 flex items-center justify-between border-t border-[#EEF1F5] pt-4">
        <div className="text-xs text-[#8992A0]">
          {isLocked ? (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A6216] transition-colors group-hover:text-[#B98B3E]">
              Tap to unlock {capsule.required_plan} &rarr;
            </span>
          ) : isRead ? (
            <span className="flex items-center gap-1 font-medium text-[#1F5F4A]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Finished reading
            </span>
          ) : (
            <span className="transition-colors group-hover:text-[#5B6472]">Tap to mark as read</span>
          )}
        </div>

        {!isLocked && !isCompact && (
          <a
            href={capsule.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5B6472] transition-colors hover:text-[#1F5F4A]"
          >
            Verify source <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </motion.article>
  );
}