// src/app/student/current-affairs/components/DailyDoseCarousel.tsx

"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import NewsCard from "./NewsCard";
import { NewsCapsule, LanguageCode } from "./types";

interface DailyDoseCarouselProps {
  picks: NewsCapsule[];
  language: LanguageCode;
  checkIsLocked: (plan: NewsCapsule["required_plan"]) => boolean;
  readIds: string[];
  bookmarkedIds: string[];
  onInteract: (capsule: NewsCapsule) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
}

export default function DailyDoseCarousel({
  picks,
  language,
  checkIsLocked,
  readIds,
  bookmarkedIds,
  onInteract,
  onToggleBookmark,
}: DailyDoseCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (picks.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">
            Today&apos;s Dose
          </h2>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
            Editor&apos;s Picks
          </span>
        </div>

        <div className="hidden items-center gap-1.5 md:flex">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll picks left"
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-400 transition-colors hover:border-blue-500/40 hover:text-blue-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll picks right"
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-400 transition-colors hover:border-blue-500/40 hover:text-blue-400"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {picks.map((capsule) => (
          <div key={capsule.id} className="w-[280px] shrink-0 snap-start md:w-[320px]">
            <NewsCard
              capsule={capsule}
              language={language}
              variant="compact"
              isLocked={checkIsLocked(capsule.required_plan)}
              isRead={readIds.includes(capsule.id)}
              isBookmarked={bookmarkedIds.includes(capsule.id)}
              onInteract={onInteract}
              onToggleBookmark={onToggleBookmark}
            />
          </div>
        ))}
      </div>
    </motion.section>
  );
}