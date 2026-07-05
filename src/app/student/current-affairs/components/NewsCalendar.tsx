// src/app/student/current-affairs/components/NewsCalendar.tsx

"use client";

import { motion } from "framer-motion";
import { todayIST, shiftISODate, formatISTDateLabel } from "@/utils/istDate";

interface NewsCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  /** How many days back from today to show in the strip */
  daysBack?: number;
}

export default function NewsCalendar({
  selectedDate,
  onSelectDate,
  daysBack = 13,
}: NewsCalendarProps) {
  const today = todayIST();
  // Pure string/UTC date math anchored to the single IST "today" -- no Date
  // object timezone ambiguity anywhere in this list.
  const days = Array.from({ length: daysBack + 1 }, (_, i) => shiftISODate(today, i - daysBack));

  return (
    <div className="mb-8 rounded-2xl border border-[#DCE1E8] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#8992A0]">
          Dateline
        </span>
        <span className="font-mono text-[10px] text-[#8992A0]">
          {formatISTDateLabel(selectedDate, { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((iso) => {
          const isSelected = iso === selectedDate;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              onClick={() => onSelectDate(iso)}
              className="relative flex shrink-0 flex-col items-center rounded-lg px-3 py-2 transition-colors"
            >
              {isSelected && (
                <motion.div
                  layoutId="calendar-selected-pill"
                  className="absolute inset-0 rounded-lg bg-[#1F5F4A]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 font-mono text-[9.5px] uppercase tracking-wider ${
                  isSelected ? "text-white/70" : "text-[#8992A0]"
                }`}
              >
                {formatISTDateLabel(iso, { weekday: "short" })}
              </span>
              <span
                className={`relative z-10 text-sm font-bold ${
                  isSelected ? "text-white" : "text-[#1B2430]"
                }`}
              >
                {formatISTDateLabel(iso, { day: "numeric" })}
              </span>
              {isToday && !isSelected && (
                <span className="relative z-10 mt-0.5 h-1 w-1 rounded-full bg-[#B98B3E]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}