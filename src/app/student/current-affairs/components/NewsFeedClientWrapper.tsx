// src/app/student/current-affairs/components/NewsFeedClientWrapper.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Compass, Maximize2 } from "lucide-react";
import { useStudentSession, StudentSession } from "@/utils/auth";
import { todayIST } from "@/utils/istDate";
import { BrandBar, BrandFooter, BrandLoader } from "../../components/StudentBrand"; // ANUSHIVA silver branding
import { ThemeProvider, useTheme } from "../../theme/ThemeProvider"; // central theme system
import ThemeToggle from "../../theme/ThemeToggle"; // Dark / Light switch
import NewsCalendar from "./NewsCalendar";
import DailyDoseCarousel from "./DailyDoseCarousel";
import FilterSidebar from "./FilterSidebar";
import NewsCard from "./NewsCard";
import DigestCallout from "./DigestCallout";
import NotesDrawer from "./NotesDrawer";
import FocusReader from "./FocusReader";
import UpgradeModal from "./UpgradeModal";
import {
  NewsCapsule,
  LanguageCode,
  PLAN_HIERARCHY_MAP,
  PlanTier,
  SourceType,
  DailyDoseDigest,
  QuizQuestion,
} from "./types";

interface NewsFeedClientWrapperProps {
  initialFeed: NewsCapsule[];
  /** The original_date currently loaded by the server (YYYY-MM-DD) */
  selectedDate: string;
}

/** Minimum plan that unlocks premium study tools (Listen / Download PDF). */
const PREMIUM_TOOLS_MIN_PLAN: PlanTier = "gold";

export default function NewsFeedClientWrapper(props: NewsFeedClientWrapperProps) {
  return (
    <ThemeProvider>
      <NewsFeedInner {...props} />
    </ThemeProvider>
  );
}

function NewsFeedInner({ initialFeed, selectedDate }: NewsFeedClientWrapperProps) {
  const router = useRouter();
  const { theme: t } = useTheme();
  const [student, setStudent] = useState<StudentSession | null>(null);

  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
  const [activeFilter, setActiveFilter] = useState<"all" | SourceType>("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocusMode, setIsFocusMode] = useState(false);

  const [digest, setDigest] = useState<DailyDoseDigest | null>(null);
  const [digestQuiz, setDigestQuiz] = useState<QuizQuestion[]>([]);
  const [isDigestLoading, setIsDigestLoading] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [isDigestDrawerOpen, setIsDigestDrawerOpen] = useState(false);

  // Upgrade modal tracking
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedRequiredPlan, setSelectedRequiredPlan] = useState<string>("premium");
  const [upgradeFeatureLabel, setUpgradeFeatureLabel] = useState<string | undefined>(undefined);

  const isViewingToday = selectedDate === todayIST();

  // Self-healing poll (today only)
  useEffect(() => {
    if (initialFeed.length === 0 && isViewingToday) {
      const interval = setInterval(() => {
        router.refresh();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [initialFeed, isViewingToday, router]);

  // Digest for the loaded date
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

  const { session, loading: sessionLoading } = useStudentSession();
  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      router.push("/student/login");
    } else {
      setStudent(session);
    }
  }, [session, sessionLoading, router]);

  // Persisted read/bookmark state
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

  const canUsePremiumTools = !checkIsLocked(PREMIUM_TOOLS_MIN_PLAN);

  const openUpgrade = (plan: string, featureLabel?: string) => {
    setSelectedRequiredPlan(plan);
    setUpgradeFeatureLabel(featureLabel);
    setIsUpgradeOpen(true);
  };

  const persistProgress = (capsuleId: string, isRead: boolean, isBookmarked: boolean) => {
    if (!student) return;
    fetch("/api/current-affairs/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
    if (checkIsLocked(capsule.required_plan)) {
      openUpgrade(capsule.required_plan);
      return;
    }

    const nextRead = !readIds.includes(capsule.id);
    setReadIds((prev) => (nextRead ? [...prev, capsule.id] : prev.filter((rId) => rId !== capsule.id)));
    persistProgress(capsule.id, nextRead, bookmarkedIds.includes(capsule.id));
  };

  // Used by the Focus Reader: marks as read (never toggles back to unread).
  const handleMarkRead = (capsule: NewsCapsule) => {
    if (readIds.includes(capsule.id)) return;
    setReadIds((prev) => [...prev, capsule.id]);
    persistProgress(capsule.id, true, bookmarkedIds.includes(capsule.id));
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
        const matchesSearch = currentTitle.includes(query) || currentSummary.includes(query);
        return matchesFilter && matchesSearch;
      }),
    [initialFeed, activeFilter, selectedLanguage, searchQuery]
  );

  const dailyDosePicks = useMemo(() => initialFeed.slice(0, 5), [initialFeed]);

  if (!student) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center gap-6 ${t.page}`}>
        <BrandLoader />
        <Loader2 className={`animate-spin ${t.accent.spinnerDim}`} size={20} />
      </div>
    );
  }

  return (
    <main
      className={`relative min-h-screen overflow-x-hidden ${t.page} font-sans antialiased transition-colors duration-500 ${t.selection}`}
    >
      <div className={`pointer-events-none absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full ${t.glow} blur-[120px]`} />

      <header className={`sticky top-0 z-50 border-b ${t.header} px-4 py-3 backdrop-blur-md`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/student")}
              className={`group rounded-xl border p-2 transition-all ${t.iconButton}`}
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-bold tracking-tight ${t.text.heading}`}>Daily News Hub</h1>
              <span className={`hidden items-center gap-1 rounded-full border ${t.accent.soft} px-2 py-0.5 sm:inline-flex`}>
                <Sparkles className={`h-3 w-3 ${t.accent.text}`} />
                <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${t.accent.textStrong}`}>
                  AI Engine
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`hidden items-center gap-3 rounded-full border ${t.panel} px-3 py-1.5 font-mono text-xs ${t.text.muted} md:flex`}>
              <span className={`font-semibold ${t.accent.text}`}>
                {readIds.length}/{initialFeed.length} Read
              </span>
              <div className={`h-1.5 w-24 overflow-hidden rounded-full ${t.accent.track}`}>
                <div
                  className={`h-1.5 rounded-full ${t.accent.gradient} transition-all duration-300`}
                  style={{
                    width: `${initialFeed.length > 0 ? (readIds.length / initialFeed.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setIsFocusMode(true)}
              aria-label="Enter focus mode"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${t.filter.idle}`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Focus</span>
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <BrandBar />
        </div>

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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="h-fit lg:sticky lg:top-24 lg:col-span-4">
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
          </div>

          <section className="space-y-6 lg:col-span-8">
            {initialFeed.length === 0 ? (
              <div className={`mx-auto flex max-w-2xl flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed ${t.panelDashed} p-16 text-center`}>
                <div className="relative">
                  <Compass className={`h-10 w-10 animate-spin ${t.accent.spinnerDim} duration-[3000ms]`} />
                  <Sparkles className={`absolute -right-1 -top-1 h-4 w-4 animate-pulse ${t.amber.icon}`} />
                </div>
                <div>
                  <h3 className={`text-base font-semibold ${t.text.heading}`}>
                    {isViewingToday ? "Preparing Exam Capsules" : "No Capsules for This Date"}
                  </h3>
                  <p className={`mx-auto mt-1 max-w-md text-xs leading-relaxed ${t.text.faint}`}>
                    {isViewingToday
                      ? "The AI Engine is currently parsing the latest updates from RBI, PIB, and Economic Times. Your study feed will refresh automatically."
                      : "No archived capsules were found for this date. Try a different day from the calendar above."}
                  </p>
                </div>
                {isViewingToday && (
                  <div className={`flex items-center gap-1.5 rounded-full border ${t.inset} px-3 py-1.5 font-mono text-[10px] ${t.text.faint}`}>
                    <Loader2 className={`h-3 w-3 animate-spin ${t.accent.text}`} />
                    <span>Synchronizing live database indices...</span>
                  </div>
                )}
              </div>
            ) : filteredNews.length === 0 ? (
              <div className={`rounded-2xl border border-dashed ${t.panelDashed} p-16 text-center text-sm ${t.text.faint}`}>
                No capsules found matching the search criteria.
              </div>
            ) : (
              <div className="space-y-6">
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

        <BrandFooter />
      </div>

      {/* Full-screen distraction-free reader */}
      <AnimatePresence>
        {isFocusMode && (
          <FocusReader
            items={filteredNews}
            language={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            checkIsLocked={checkIsLocked}
            readIds={readIds}
            bookmarkedIds={bookmarkedIds}
            onMarkRead={handleMarkRead}
            onToggleBookmark={handleToggleBookmark}
            onUnlock={(capsule) => openUpgrade(capsule.required_plan)}
            onExit={() => setIsFocusMode(false)}
          />
        )}
      </AnimatePresence>

      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        requiredPlan={selectedRequiredPlan}
        featureLabel={upgradeFeatureLabel}
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
        canUsePremiumTools={canUsePremiumTools}
        onLockedToolClick={(label) => openUpgrade(PREMIUM_TOOLS_MIN_PLAN, label)}
        onClose={() => setIsDigestDrawerOpen(false)}
      />
    </main>
  );
}