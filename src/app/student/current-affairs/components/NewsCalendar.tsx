// src/app/student/current-affairs/components/NewsCalendar.tsx

"use client";

import { motion } from "framer-motion";
import { todayIST, shiftISODate, formatISTDateLabel } from "@/utils/istDate";
import { useTheme } from "../../theme/ThemeProvider";

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
  const { theme: t } = useTheme();
  const today = todayIST();
  // Pure string/UTC date math anchored to the single IST "today" -- no Date
  // object timezone ambiguity anywhere in this list.
  const days = Array.from({ length: daysBack + 1 }, (_, i) => shiftISODate(today, i - daysBack));

  return (
    <div className={`mb-8 rounded-2xl border ${t.panel} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${t.text.faint}`}>
          Dateline
        </span>
        <span className={`font-mono text-[10px] ${t.text.muted}`}>
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
              className={`relative flex shrink-0 flex-col items-center rounded-lg px-3 py-2 transition-colors ${
                isSelected ? "" : t.calendar.dayHover
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="calendar-selected-pill"
                  className={`absolute inset-0 rounded-lg ${t.calendar.selected}`}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 font-mono text-[9.5px] uppercase tracking-wider ${
                  isSelected ? t.calendar.selectedSub : t.text.faint
                }`}
              >
                {formatISTDateLabel(iso, { weekday: "short" })}
              </span>
              <span
                className={`relative z-10 text-sm font-bold ${
                  isSelected ? "text-white" : t.text.heading
                }`}
              >
                {formatISTDateLabel(iso, { day: "numeric" })}
              </span>
              {isToday && !isSelected && (
                <span className={`relative z-10 mt-0.5 h-1 w-1 rounded-full ${t.amber.today}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}