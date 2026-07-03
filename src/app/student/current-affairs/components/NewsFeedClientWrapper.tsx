// src/app/student/current-affairs/components/NewsFeedClientWrapper.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Compass } from "lucide-react";
import { authManager, StudentSession } from "@/utils/auth";
import PlanUpgradeModal from "../../components/PlanUpgradeModal";
import NewsCalendar from "./NewsCalendar";
import DailyDoseCarousel from "./DailyDoseCarousel";
import FilterSidebar from "./FilterSidebar";
import NewsCard from "./NewsCard";
import { NewsCapsule, LanguageCode, PLAN_HIERARCHY_MAP, SourceType } from "./types";

interface NewsFeedClientWrapperProps {
  initialFeed: NewsCapsule[];
  /** The original_date currently loaded by the server (YYYY-MM-DD) */
  selectedDate: string;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function NewsFeedClientWrapper({
  initialFeed,
  selectedDate,
}: NewsFeedClientWrapperProps) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);

  // UI state (preserved from the original implementation)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
  const [activeFilter, setActiveFilter] = useState<"all" | SourceType>("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Upgrade modal tracking
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedRequiredPlan, setSelectedRequiredPlan] = useState("premium");

  const isViewingToday = selectedDate === todayISO();

  // Self-healing poll: only meaningful for today's feed, where the crawler
  // is actively populating data. Past dates with no data are simply empty.
  useEffect(() => {
    if (initialFeed.length === 0 && isViewingToday) {
      const interval = setInterval(() => {
        router.refresh();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [initialFeed, isViewingToday, router]);

  useEffect(() => {
    const session = authManager.getSession();
    if (!session) {
      router.push("/student/login");
    } else {
      setStudent(session);
    }
  }, [router]);

  const checkIsLocked = (requiredPlan: NewsCapsule["required_plan"]) => {
    if (!student) return true;

    const studentPlan = (student as any).current_plan || "free";
    const normalizedStudent = studentPlan.toLowerCase() as keyof typeof PLAN_HIERARCHY_MAP;
    const normalizedRequired = requiredPlan.toLowerCase() as keyof typeof PLAN_HIERARCHY_MAP;

    const studentWeight = PLAN_HIERARCHY_MAP[normalizedStudent] || 1;
    const requiredWeight = PLAN_HIERARCHY_MAP[normalizedRequired] || 1;

    return studentWeight < requiredWeight;
  };

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const handleCardInteraction = (capsule: NewsCapsule) => {
    const isLocked = checkIsLocked(capsule.required_plan);

    if (isLocked) {
      setSelectedRequiredPlan(capsule.required_plan);
      setIsUpgradeOpen(true);
      return;
    }

    setReadIds((prev) =>
      prev.includes(capsule.id) ? prev.filter((rId) => rId !== capsule.id) : [...prev, capsule.id]
    );
  };

  const handleSelectDate = (date: string) => {
    if (date === selectedDate) return;
    router.push(`/student/current-affairs?date=${date}`);
  };

  const filteredNews = useMemo(
    () =>
      initialFeed.filter((item) => {
        const matchesFilter = activeFilter === "all" || item.source_type === activeFilter;
        const currentTitle = (item.title[selectedLanguage] || "").toLowerCase();
        const currentSummary = (item.summary[selectedLanguage] || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          currentTitle.includes(query) || currentSummary.includes(query);
        return matchesFilter && matchesSearch;
      }),
    [initialFeed, activeFilter, selectedLanguage, searchQuery]
  );

  // Editor's Picks: the day's highest-signal capsules, surfaced up top regardless
  // of the active source/search filters so students always see the headline items.
  const dailyDosePicks = useMemo(() => initialFeed.slice(0, 5), [initialFeed]);

  if (!student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EEF1F5]">
        <Loader2 className="animate-spin text-[#1F5F4A]" size={40} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF1F5] font-sans text-[#1B2430] antialiased selection:bg-[#1F5F4A]/15 selection:text-[#1F5F4A]">
      {/* GLOBAL TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 border-b border-[#DCE1E8] bg-[#EEF1F5]/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/student")}
              className="group rounded-xl border border-[#DCE1E8] bg-white p-2 text-[#5B6472] transition-all hover:text-[#1B2430]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-lg font-bold tracking-tight text-[#1B2430]">
                Daily News Hub
              </h1>
              <span className="hidden items-center gap-1 rounded-full border border-[#1F5F4A]/20 bg-[#1F5F4A]/[0.06] px-2 py-0.5 sm:inline-flex">
                <Sparkles className="h-3 w-3 text-[#1F5F4A]" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1F5F4A]">
                  AI Engine
                </span>
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-full border border-[#DCE1E8] bg-white px-3 py-1.5 font-mono text-xs text-[#5B6472] md:flex">
            <span className="font-semibold text-[#1F5F4A]">
              {readIds.length}/{initialFeed.length} Read
            </span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EEF1F5]">
              <div
                className="h-1.5 bg-[#1F5F4A] transition-all duration-300"
                style={{
                  width: `${initialFeed.length > 0 ? (readIds.length / initialFeed.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div
        className={`mx-auto px-4 py-6 transition-all duration-300 ${
          isFocusMode ? "max-w-3xl" : "max-w-6xl"
        }`}
      >
        <NewsCalendar selectedDate={selectedDate} onSelectDate={handleSelectDate} />

        <DailyDoseCarousel
          picks={dailyDosePicks}
          language={selectedLanguage}
          checkIsLocked={checkIsLocked}
          readIds={readIds}
          bookmarkedIds={bookmarkedIds}
          onInteract={handleCardInteraction}
          onToggleBookmark={handleToggleBookmark}
        />

        <div
          className={`grid grid-cols-1 gap-8 ${
            isFocusMode ? "" : "lg:grid-cols-12"
          }`}
        >
          <AnimatePresence initial={false}>
            {!isFocusMode && (
              <motion.div
                key="sidebar"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.25 }}
                className="h-fit lg:sticky lg:top-24 lg:col-span-4"
              >
                <FilterSidebar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  language={selectedLanguage}
                  onLanguageChange={setSelectedLanguage}
                  isFocusMode={isFocusMode}
                  onToggleFocusMode={() => setIsFocusMode(true)}
                  readCount={readIds.length}
                  totalCount={initialFeed.length}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <section className={isFocusMode ? "space-y-6" : "space-y-6 lg:col-span-8"}>
            {isFocusMode && (
              <button
                onClick={() => setIsFocusMode(false)}
                className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#DCE1E8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5B6472] transition-colors hover:text-[#1B2430]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Exit Focus Mode
              </button>
            )}

            {initialFeed.length === 0 ? (
              <div className="mx-auto flex max-w-2xl flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-[#DCE1E8] bg-white p-16 text-center">
                <div className="relative">
                  <Compass className="h-10 w-10 animate-spin text-[#1F5F4A]/40 duration-[3000ms]" />
                  <Sparkles className="absolute -right-1 -top-1 h-4 w-4 animate-pulse text-[#B98B3E]" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-[#1B2430]">
                    {isViewingToday ? "Preparing Exam Capsules" : "No Capsules for This Date"}
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#8992A0]">
                    {isViewingToday
                      ? "The AI Engine is currently parsing the latest updates from RBI, PIB, and Economic Times. Your study feed will refresh automatically."
                      : "No archived capsules were found for this date. Try a different day on the dateline above."}
                  </p>
                </div>
                {isViewingToday && (
                  <div className="flex items-center gap-1.5 rounded-full border border-[#DCE1E8] bg-[#F9FAFB] px-3 py-1.5 font-mono text-[10px] text-[#8992A0]">
                    <Loader2 className="h-3 w-3 animate-spin text-[#1F5F4A]" />
                    <span>Synchronizing live database indices...</span>
                  </div>
                )}
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DCE1E8] bg-white p-16 text-center text-sm text-[#8992A0]">
                No capsules found matching the search criteria.
              </div>
            ) : (
              <div className={isFocusMode ? "space-y-6" : "space-y-6"}>
                {filteredNews.map((capsule) => (
                  <NewsCard
                    key={capsule.id}
                    capsule={capsule}
                    language={selectedLanguage}
                    isLocked={checkIsLocked(capsule.required_plan)}
                    isRead={readIds.includes(capsule.id)}
                    isBookmarked={bookmarkedIds.includes(capsule.id)}
                    onInteract={handleCardInteraction}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <PlanUpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        requiredPlan={selectedRequiredPlan}
      />
    </main>
  );
}