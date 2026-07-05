// src/app/student/current-affairs/components/NewsFeedClientWrapper.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Compass } from "lucide-react";
import { authManager, StudentSession } from "@/utils/auth";
import { todayIST } from "@/utils/istDate";
import PlanUpgradeModal from "../../components/PlanUpgradeModal";
import NewsCalendar from "./NewsCalendar";
import DailyDoseCarousel from "./DailyDoseCarousel";
import FilterSidebar from "./FilterSidebar";
import NewsCard from "./NewsCard";
import DigestCallout from "./DigestCallout";
import NotesDrawer from "./NotesDrawer";
import {
  NewsCapsule,
  LanguageCode,
  PLAN_HIERARCHY_MAP,
  SourceType,
  DailyDoseDigest,
  QuizQuestion,
} from "./types";

interface NewsFeedClientWrapperProps {
  initialFeed: NewsCapsule[];
  /** The original_date currently loaded by the server (YYYY-MM-DD) */
  selectedDate: string;
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

  // Daily Dose digest: ONE per date, fetched once per date change and shared
  // between the DigestCallout summary card and the NotesDrawer itself.
  const [digest, setDigest] = useState<DailyDoseDigest | null>(null);
  const [digestQuiz, setDigestQuiz] = useState<QuizQuestion[]>([]);
  const [isDigestLoading, setIsDigestLoading] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [isDigestDrawerOpen, setIsDigestDrawerOpen] = useState(false);

  // Upgrade modal tracking
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedRequiredPlan, setSelectedRequiredPlan] = useState("premium");

  const isViewingToday = selectedDate === todayIST();

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

  // Fetch the digest for whichever date is currently loaded. One digest
  // covers the WHOLE day, so this runs once per date change, not per card.
  useEffect(() => {
    let cancelled = false;
    setIsDigestLoading(true);
    setDigestError(null);

    fetch(`/api/current-affairs/digest?date=${selectedDate}`)
      .then((res) => res.json())
      .then((json: { success: boolean; digest: DailyDoseDigest | null; quiz: QuizQuestion[] }) => {
        if (cancelled) return;
        setDigest(json.digest);
        setDigestQuiz(json.quiz || []);
      })
      .catch(() => {
        if (!cancelled) setDigestError("Couldn't load this day's digest right now.");
      })
      .finally(() => {
        if (!cancelled) setIsDigestLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  useEffect(() => {
    const session = authManager.getSession();
    if (!session) {
      router.push("/student/login");
    } else {
      setStudent(session);
    }
  }, [router]);

  // Load this student's persisted read/bookmark state for the current feed.
  // Runs whenever the student or the visible date's capsule set changes.
  useEffect(() => {
    if (!student || initialFeed.length === 0) return;

    const capsuleIds = initialFeed.map((c) => c.id).join(",");
    let cancelled = false;

    fetch(`/api/current-affairs/progress?student_id=${student.id}&capsule_ids=${capsuleIds}`)
      .then((res) => res.json())
      .then((json: { success: boolean; progress: Record<string, { is_read: boolean; is_bookmarked: boolean }> }) => {
        if (cancelled || !json.success) return;
        const read: string[] = [];
        const bookmarked: string[] = [];
        for (const [capsuleId, state] of Object.entries(json.progress)) {
          if (state.is_read) read.push(capsuleId);
          if (state.is_bookmarked) bookmarked.push(capsuleId);
        }
        setReadIds(read);
        setBookmarkedIds(bookmarked);
      })
      .catch((err) => console.error("Failed to load reading progress:", err));

    return () => {
      cancelled = true;
    };
  }, [student, initialFeed]);

  const checkIsLocked = (requiredPlan: NewsCapsule["required_plan"]) => {
    if (!student) return true;

    const studentPlan = (student as any).current_plan || "free";
    const normalizedStudent = studentPlan.toLowerCase() as keyof typeof PLAN_HIERARCHY_MAP;
    const normalizedRequired = requiredPlan.toLowerCase() as keyof typeof PLAN_HIERARCHY_MAP;

    const studentWeight = PLAN_HIERARCHY_MAP[normalizedStudent] || 1;
    const requiredWeight = PLAN_HIERARCHY_MAP[normalizedRequired] || 1;

    return studentWeight < requiredWeight;
  };

  const persistProgress = (capsuleId: string, isRead: boolean, isBookmarked: boolean) => {
    if (!student) return;
    fetch("/api/current-affairs/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: student.id,
        capsule_id: capsuleId,
        is_read: isRead,
        is_bookmarked: isBookmarked,
      }),
    }).catch((err) => console.error("Failed to persist reading progress:", err));
  };

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextBookmarked = !bookmarkedIds.includes(id);
    setBookmarkedIds((prev) => (nextBookmarked ? [...prev, id] : prev.filter((bId) => bId !== id)));
    persistProgress(id, readIds.includes(id), nextBookmarked);
  };

  const handleCardInteraction = (capsule: NewsCapsule) => {
    const isLocked = checkIsLocked(capsule.required_plan);

    if (isLocked) {
      setSelectedRequiredPlan(capsule.required_plan);
      setIsUpgradeOpen(true);
      return;
    }

    const nextRead = !readIds.includes(capsule.id);
    setReadIds((prev) => (nextRead ? [...prev, capsule.id] : prev.filter((rId) => rId !== capsule.id)));
    persistProgress(capsule.id, nextRead, bookmarkedIds.includes(capsule.id));
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

        <DigestCallout
          digest={digest}
          quizCount={digestQuiz.length}
          isLoading={isDigestLoading}
          isToday={isViewingToday}
          onOpen={() => setIsDigestDrawerOpen(true)}
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

      <NotesDrawer
        isOpen={isDigestDrawerOpen}
        date={selectedDate}
        digest={digest}
        quiz={digestQuiz}
        isLoading={isDigestLoading}
        error={digestError}
        language={selectedLanguage}
        studentId={student.id}
        onClose={() => setIsDigestDrawerOpen(false)}
      />
    </main>
  );
}