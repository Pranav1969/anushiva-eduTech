// src/app/student/current-affairs/components/NewsFeedClientWrapper.tsx

"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useDeferredValue,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Compass, Maximize2 } from "lucide-react";
import { useStudentSession, StudentSession } from "@/utils/auth";
import { todayIST, shiftISODate } from "@/utils/istDate";
import { BrandBar, BrandFooter } from "../../components/StudentBrand"; // ANUSHIVA silver branding
import { ThemeProvider, useTheme } from "../../theme/ThemeProvider"; // central theme system
import ThemeToggle from "../../theme/ThemeToggle"; // Dark / Light switch
import NewsCalendar from "./NewsCalendar";
import DailyDoseCarousel from "./DailyDoseCarousel";
import FilterSidebar from "./FilterSidebar";
import NewsCard from "./NewsCard";
import DigestCallout from "./DigestCallout";
import {
  NewsCapsule,
  LanguageCode,
  PLAN_HIERARCHY_MAP,
  PlanTier,
  SourceType,
  DailyDoseDigest,
  QuizQuestion,
} from "./types";

// Heavy, closed-on-first-paint pieces are split into separate JS chunks
// and only downloaded when needed.
const FocusReader = dynamic(() => import("./FocusReader"), { ssr: false });
const NotesDrawer = dynamic(() => import("./NotesDrawer"), { ssr: false });
const UpgradeModal = dynamic(() => import("./UpgradeModal"), { ssr: false });

interface NewsFeedClientWrapperProps {
  initialFeed: NewsCapsule[];
  /** The original_date currently loaded by the server (YYYY-MM-DD) */
  selectedDate: string;
}

/** Minimum plan that unlocks premium study tools (Listen / Download PDF). */
const PREMIUM_TOOLS_MIN_PLAN: PlanTier = "gold";

/** How many cards render at first; more load as the user scrolls. */
const PAGE_SIZE = 8;

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
  const [isPending, startTransition] = useTransition();

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
  // Drawer is mounted lazily on first open, then stays mounted so its exit animation works.
  const [drawerEverOpened, setDrawerEverOpened] = useState(false);

  // Upgrade modal tracking
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedRequiredPlan, setSelectedRequiredPlan] = useState<string>("premium");
  const [upgradeFeatureLabel, setUpgradeFeatureLabel] = useState<string | undefined>(undefined);

  // Progressive rendering
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isViewingToday = selectedDate === todayIST();

  // O(1) lookups instead of array.includes() on every card render
  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const bookmarkSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  // Latest values for stable callbacks (keeps memo(NewsCard) effective)
  const latest = useRef({ readSet, bookmarkSet, student });
  latest.current = { readSet, bookmarkSet, student };

  // Typing in search stays smooth; filtering runs at low priority
  const deferredQuery = useDeferredValue(searchQuery);

  // Self-healing poll (today only) -- capped at ~1 minute instead of forever
  useEffect(() => {
    if (initialFeed.length !== 0 || !isViewingToday) return;
    let tries = 0;
    const interval = setInterval(() => {
      if (++tries > 12) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [initialFeed, isViewingToday, router]);

  // Digest for the loaded date (CDN-cached by the API route)
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

  // Background prefetch of neighbouring dates so switching days feels instant.
  // Runs only when the browser is idle and never touches the current page's rendering.
  useEffect(() => {
    // Respect users on "Data Saver"
    const conn = (navigator as any).connection;
    if (conn?.saveData) return;

    const today = todayIST();
    // Nearest first: yesterday-of-selected, next day (if not future), then two days back
    const neighbours = [
      shiftISODate(selectedDate, -1),
      shiftISODate(selectedDate, 1),
      shiftISODate(selectedDate, -2),
    ].filter((d) => d <= today && d !== selectedDate);

    let cancelled = false;

    const warm = async () => {
      for (const d of neighbours) {
        if (cancelled) return;
        router.prefetch(`/student/current-affairs?date=${d}`); // loading shell
        await Promise.allSettled([
          fetch(`/api/current-affairs/warm?date=${d}`),   // fills capsule cache
          fetch(`/api/current-affairs/digest?date=${d}`), // fills digest CDN cache
        ]);
      }
    };

    const w = window as any;
    const handle: number = w.requestIdleCallback
      ? w.requestIdleCallback(warm, { timeout: 3000 })
      : window.setTimeout(warm, 1500);

    return () => {
      cancelled = true;
      if (w.cancelIdleCallback) w.cancelIdleCallback(handle);
      else clearTimeout(handle);
    };
  }, [selectedDate, router]);

  // Once a digest exists, quietly preload the drawer chunk so it opens instantly.
  useEffect(() => {
    if (digest) import("./NotesDrawer");
  }, [digest]);

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

  // While the session is still resolving we do NOT block the page:
  // free content is shown immediately, paid content stays locked until we know the plan.
  const checkIsLocked = useCallback(
    (requiredPlan: NewsCapsule["required_plan"]) => {
      const required = requiredPlan.toLowerCase() as keyof typeof PLAN_HIERARCHY_MAP;

      if (!student) return required !== "free";

      const studentPlan = ((student as any).current_plan || "free").toLowerCase() as keyof typeof PLAN_HIERARCHY_MAP;
      const studentWeight = PLAN_HIERARCHY_MAP[studentPlan] || 1;
      const requiredWeight = PLAN_HIERARCHY_MAP[required] || 1;

      return studentWeight < requiredWeight;
    },
    [student]
  );

  const canUsePremiumTools = !checkIsLocked(PREMIUM_TOOLS_MIN_PLAN);

  const openUpgrade = useCallback((plan: string, featureLabel?: string) => {
    setSelectedRequiredPlan(plan);
    setUpgradeFeatureLabel(featureLabel);
    setIsUpgradeOpen(true);
  }, []);

  const persistProgress = useCallback((capsuleId: string, isRead: boolean, isBookmarked: boolean) => {
    if (!latest.current.student) return;
    fetch("/api/current-affairs/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capsule_id: capsuleId,
        is_read: isRead,
        is_bookmarked: isBookmarked,
      }),
    }).catch((err) => console.error("Failed to persist reading progress:", err));
  }, []);

  const handleToggleBookmark = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const nextBookmarked = !latest.current.bookmarkSet.has(id);
      setBookmarkedIds((prev) => (nextBookmarked ? [...prev, id] : prev.filter((bId) => bId !== id)));
      persistProgress(id, latest.current.readSet.has(id), nextBookmarked);
    },
    [persistProgress]
  );

  const handleCardInteraction = useCallback(
    (capsule: NewsCapsule) => {
      if (checkIsLocked(capsule.required_plan)) {
        openUpgrade(capsule.required_plan);
        return;
      }

      const nextRead = !latest.current.readSet.has(capsule.id);
      setReadIds((prev) => (nextRead ? [...prev, capsule.id] : prev.filter((rId) => rId !== capsule.id)));
      persistProgress(capsule.id, nextRead, latest.current.bookmarkSet.has(capsule.id));
    },
    [checkIsLocked, openUpgrade, persistProgress]
  );

  // Used by the Focus Reader: marks as read (never toggles back to unread).
  const handleMarkRead = useCallback(
    (capsule: NewsCapsule) => {
      if (latest.current.readSet.has(capsule.id)) return;
      setReadIds((prev) => [...prev, capsule.id]);
      persistProgress(capsule.id, true, latest.current.bookmarkSet.has(capsule.id));
    },
    [persistProgress]
  );

  // Transition keeps the current page visible (dimmed) while the next date loads,
  // instead of freezing with no feedback.
  const handleSelectDate = (date: string) => {
    if (date === selectedDate) return;
    startTransition(() => {
      router.push(`/student/current-affairs?date=${date}`);
    });
  };

  const filteredNews = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    return initialFeed.filter((item) => {
      if (activeFilter !== "all" && item.source_type !== activeFilter) return false;
      if (!q) return true;
      return (
        (item.title[selectedLanguage] || "").toLowerCase().includes(q) ||
        (item.summary[selectedLanguage] || "").toLowerCase().includes(q)
      );
    });
  }, [initialFeed, activeFilter, selectedLanguage, deferredQuery]);

  const dailyDosePicks = useMemo(() => initialFeed.slice(0, 5), [initialFeed]);

  // Reset the window whenever the list itself changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedDate, activeFilter, deferredQuery, selectedLanguage]);

  // Load more cards shortly BEFORE the user reaches the bottom
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= filteredNews.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => c + PAGE_SIZE);
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filteredNews.length, visibleCount]);

  const visibleNews = useMemo(() => filteredNews.slice(0, visibleCount), [filteredNews, visibleCount]);

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

        <div className={`transition-opacity duration-200 ${isPending ? "pointer-events-none opacity-50" : ""}`}>
          <DailyDoseCarousel
            picks={dailyDosePicks}
            language={selectedLanguage}
            checkIsLocked={checkIsLocked}
            readSet={readSet}
            bookmarkSet={bookmarkSet}
            onInteract={handleCardInteraction}
            onToggleBookmark={handleToggleBookmark}
          />

          <DigestCallout
            digest={digest}
            quizCount={digestQuiz.length}
            isLoading={isDigestLoading}
            isToday={isViewingToday}
            onOpen={() => {
              setDrawerEverOpened(true);
              setIsDigestDrawerOpen(true);
            }}
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
                  {visibleNews.map((capsule) => (
                    <NewsCard
                      key={capsule.id}
                      capsule={capsule}
                      language={selectedLanguage}
                      isLocked={checkIsLocked(capsule.required_plan)}
                      isRead={readSet.has(capsule.id)}
                      isBookmarked={bookmarkSet.has(capsule.id)}
                      onInteract={handleCardInteraction}
                      onToggleBookmark={handleToggleBookmark}
                    />
                  ))}

                  {visibleCount < filteredNews.length && <div ref={sentinelRef} className="h-10" aria-hidden />}
                </div>
              )}
            </section>
          </div>
        </div>

        <BrandFooter />
      </div>

      {/* Full-screen distraction-free reader (chunk downloads only when opened).
          It receives the FULL filtered list since it shows one item at a time. */}
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

      {isUpgradeOpen && (
        <UpgradeModal
          isOpen={isUpgradeOpen}
          onClose={() => setIsUpgradeOpen(false)}
          requiredPlan={selectedRequiredPlan}
          featureLabel={upgradeFeatureLabel}
        />
      )}

      {drawerEverOpened && (
        <NotesDrawer
          isOpen={isDigestDrawerOpen}
          date={selectedDate}
          digest={digest}
          quiz={digestQuiz}
          isLoading={isDigestLoading}
          error={digestError}
          language={selectedLanguage}
          studentId={student?.id ?? ""}
          canUsePremiumTools={canUsePremiumTools}
          onLockedToolClick={(label) => openUpgrade(PREMIUM_TOOLS_MIN_PLAN, label)}
          onClose={() => setIsDigestDrawerOpen(false)}
        />
      )}
    </main>
  );
}