// src/app/student/current-affairs/components/NewsCalendar.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { todayIST, shiftISODate, formatISTDateLabel } from "@/utils/istDate";
import { useTheme } from "../../theme/ThemeProvider";

interface NewsCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  /** How many days back from today to show in the quick strip */
  daysBack?: number;
}

/** Earliest year offered in the month/year picker. */
const EARLIEST_YEAR = 2024;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
};
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based
const firstWeekday = (y: number, m: number) => new Date(Date.UTC(y, m - 1, 1)).getUTCDay();

export default function NewsCalendar({ selectedDate, onSelectDate, daysBack = 13 }: NewsCalendarProps) {
  const { theme: t } = useTheme();
  const today = todayIST();
  const todayParts = parseISO(today);

  const stripDays = Array.from({ length: daysBack + 1 }, (_, i) => shiftISODate(today, i - daysBack));
  // If the chosen date is older than the strip, show it as the first chip so the selection is visible.
  const visibleDays = stripDays.includes(selectedDate) ? stripDays : [selectedDate, ...stripDays];

  const [open, setOpen] = useState(false);
  const sel = parseISO(selectedDate);
  const [viewYear, setViewYear] = useState(sel.y);
  const [viewMonth, setViewMonth] = useState(sel.m);

  const popoverRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Sync the picker to the selected date each time it opens.
  useEffect(() => {
    if (open) {
      const p = parseISO(selectedDate);
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  }, [open, selectedDate]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep the selected chip in view inside the strip (horizontal only).
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>("[data-selected='true']");
    if (el && stripRef.current) {
      const box = stripRef.current;
      box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
    }
  }, [selectedDate]);

  const isCurrentMonth = viewYear === todayParts.y && viewMonth === todayParts.m;
  const isEarliestMonth = viewYear === EARLIEST_YEAR && viewMonth === 1;

  const goMonth = (delta: 1 | -1) => {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    if (y < EARLIEST_YEAR) return;
    if (y > todayParts.y || (y === todayParts.y && m > todayParts.m)) return;
    setViewYear(y);
    setViewMonth(m);
  };

  const pickDate = (iso: string) => {
    setOpen(false);
    onSelectDate(iso);
  };

  const years = Array.from({ length: todayParts.y - EARLIEST_YEAR + 1 }, (_, i) => EARLIEST_YEAR + i);
  const maxMonthForYear = viewYear === todayParts.y ? todayParts.m : 12;

  const blanks = firstWeekday(viewYear, viewMonth);
  const totalDays = daysInMonth(viewYear, viewMonth);

  const selectCls = `rounded-lg border ${t.inset} px-2 py-1 text-xs font-semibold ${t.text.heading} bg-transparent focus:outline-none`;

  return (
    <div className={`relative z-30 mb-8 rounded-2xl border ${t.panel} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${t.text.faint}`}>
            Dateline
          </span>
          <span className={`hidden font-mono text-[10px] sm:inline ${t.text.muted}`}>
            {formatISTDateLabel(selectedDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedDate !== today && (
            <button
              onClick={() => pickDate(today)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${t.filter.idle}`}
            >
              Today
            </button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Open calendar"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
              open ? t.filter.selected : t.filter.idle
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </button>
        </div>
      </div>

      <div
        ref={stripRef}
        className="relative flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleDays.map((iso) => {
          const isSelected = iso === selectedDate;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              data-selected={isSelected}
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
              <span className={`relative z-10 text-sm font-bold ${isSelected ? "text-white" : t.text.heading}`}>
                {formatISTDateLabel(iso, { day: "numeric" })}
              </span>
              {isToday && !isSelected && <span className={`relative z-10 mt-0.5 h-1 w-1 rounded-full ${t.amber.today}`} />}
            </button>
          );
        })}
      </div>

      {/* Month picker popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-4 top-14 z-50 w-[300px] max-w-[calc(100%-2rem)] rounded-2xl border ${t.drawer.surface} p-4 shadow-2xl`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                onClick={() => goMonth(-1)}
                disabled={isEarliestMonth}
                aria-label="Previous month"
                className={`rounded-lg border p-1.5 transition-colors disabled:opacity-30 ${t.iconButton}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className={selectCls}
                  aria-label="Month"
                >
                  {MONTHS.slice(0, maxMonthForYear).map((name, i) => (
                    <option key={name} value={i + 1} className="text-black">
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setViewYear(y);
                    if (y === todayParts.y && viewMonth > todayParts.m) setViewMonth(todayParts.m);
                  }}
                  className={selectCls}
                  aria-label="Year"
                >
                  {years.map((y) => (
                    <option key={y} value={y} className="text-black">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => goMonth(1)}
                disabled={isCurrentMonth}
                aria-label="Next month"
                className={`rounded-lg border p-1.5 transition-colors disabled:opacity-30 ${t.iconButton}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} className={`py-1 font-mono text-[10px] font-semibold uppercase ${t.text.faint}`}>
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: blanks }).map((_, i) => (
                <span key={`b-${i}`} />
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const iso = toISO(viewYear, viewMonth, day);
                const isFuture = iso > today;
                const isSelected = iso === selectedDate;
                const isToday = iso === today;
                return (
                  <button
                    key={iso}
                    disabled={isFuture}
                    onClick={() => pickDate(iso)}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
                      isSelected
                        ? `${t.calendar.selected} text-white`
                        : `${t.text.heading} ${t.calendar.dayHover} ${isToday ? "ring-1 ring-current" : ""}`
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}