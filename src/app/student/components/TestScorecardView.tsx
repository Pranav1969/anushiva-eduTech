//src\app\student\components\TestScorecardView.tsx
"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Crown, Timer } from "lucide-react";
import TestResultDiagnostics from "./TestResultDiagnostics";
import SolutionReviewExamView from "./SolutionReviewExamView";
import { useTheme } from "../theme/ThemeProvider";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_option: string;
  timer_seconds: number;
  explanation: string | null;
  section: string;
  chapter: string;
  topic_name?: string | null;
  section_id?: string | null;
  chapter_id?: string | null;
  topic_id?: string | null;
  content_blocks?: { title: string; paragraph_text: string; image_url: string | null } | null;
}

interface TestScorecardViewProps {
  score: number;
  questions: Question[];
  selectedAnswers: Record<string, string>;
  testId: string | null;
  isUrlViewMode: boolean;
  onReturnToDashboard: () => void;
  onOpenDeepAnalysis?: () => void; // NEW: opens the premium Deep Strategy & Speed Diagnostics page
  sectionOrder?: string[];
  testName?: string;
}

/* ------------------------------------------------------------------ */
/*  Theme skins for this page (complete literal class strings so       */
/*  Tailwind can see them). Picked by the active theme's mode.         */
/* ------------------------------------------------------------------ */
interface Skin {
  // top bar
  navBorder: string;
  backBtn: string;
  idBadge: string;
  idIcon: string;
  // score ring card
  scoreCard: string;
  ringTrack: string;
  ringValue: string;
  ringLabel: string;
  scoreTitle: string;
  scoreSub: string;
  // summary card
  summaryCard: string;
  badgePass: string;
  badgeFail: string;
  h1: string;
  intro: string;
  statsDivider: string;
  statBox: string;
  statLabel: string;
  statValueMain: string;
  statValueSoft: string;
  statUnit: string;
  flagPass: string;
  flagFail: string;
  statNegative: string;
  // premium banner
  premiumBtn: string;
  premiumIconBox: string;
  premiumTitle: string;
  premiumPill: string;
  premiumDesc: string;
  premiumCta: string;
  // solution review heading + return button
  reviewHeading: string;
  reviewDot: string;
  returnBtn: string;
}

const DARK_SKIN: Skin = {
  navBorder: "border-slate-900",
  backBtn:
    "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border-slate-800",
  idBadge: "text-slate-500 bg-slate-950 border-slate-900",
  idIcon: "text-indigo-400",

  scoreCard:
    "border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/80 shadow-xl backdrop-blur-xl",
  ringTrack: "#0f172a",
  ringValue: "text-white",
  ringLabel: "text-slate-500",
  scoreTitle: "text-white",
  scoreSub: "text-slate-400",

  summaryCard: "border-slate-800 bg-slate-900/20 shadow-xl backdrop-blur-xl",
  badgePass: "bg-emerald-950/40 text-emerald-400 border-emerald-900/40",
  badgeFail: "bg-rose-950/40 text-rose-400 border-rose-900/40",
  h1: "text-white",
  intro: "text-slate-400",
  statsDivider: "border-slate-900/60",
  statBox: "bg-slate-950/50 border-slate-900",
  statLabel: "text-slate-500",
  statValueMain: "text-white",
  statValueSoft: "text-slate-300",
  statUnit: "text-slate-600",
  flagPass: "text-emerald-400",
  flagFail: "text-rose-400",
  statNegative: "text-indigo-400",

  premiumBtn:
    "border-amber-400/25 bg-gradient-to-r from-[#1a1608] via-[#0f1a14] to-[#0b1713] hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(255,182,39,0.12)]",
  premiumIconBox: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  premiumTitle: "text-amber-200",
  premiumPill: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  premiumDesc: "text-slate-400",
  premiumCta: "bg-amber-400 text-[#0c1915]",

  reviewHeading: "text-slate-400",
  reviewDot: "bg-indigo-500",
  returnBtn:
    "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-indigo-400/10 hover:shadow-[0_0_25px_rgba(79,70,229,0.3)]",
};

const LIGHT_SKIN: Skin = {
  navBorder: "border-indigo-100/80",
  backBtn:
    "text-slate-600 hover:text-violet-700 bg-white/70 hover:bg-white border-white/80 hover:border-violet-300 backdrop-blur-md shadow-[0_4px_14px_-6px_rgba(99,102,241,0.4)]",
  idBadge: "text-slate-500 bg-white/80 border-indigo-100",
  idIcon: "text-violet-600",

  scoreCard:
    "border-white/80 bg-gradient-to-br from-white/90 via-white/75 to-indigo-50/60 shadow-[0_18px_50px_-22px_rgba(99,102,241,0.4)] backdrop-blur-xl",
  ringTrack: "#e0e7ff",
  ringValue: "text-slate-900",
  ringLabel: "text-slate-400",
  scoreTitle: "text-slate-900",
  scoreSub: "text-slate-500",

  summaryCard:
    "border-white/80 bg-gradient-to-br from-white/85 via-white/70 to-sky-50/60 shadow-[0_18px_50px_-22px_rgba(99,102,241,0.35)] backdrop-blur-xl",
  badgePass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  badgeFail: "bg-rose-50 text-rose-700 border-rose-200",
  h1: "text-slate-900",
  intro: "text-slate-500",
  statsDivider: "border-slate-200/70",
  statBox: "bg-white/80 border-indigo-100",
  statLabel: "text-slate-400",
  statValueMain: "text-slate-900",
  statValueSoft: "text-slate-700",
  statUnit: "text-slate-400",
  flagPass: "text-emerald-600",
  flagFail: "text-rose-600",
  statNegative: "text-indigo-600",

  premiumBtn:
    "border-amber-300 bg-gradient-to-r from-amber-50 via-white to-orange-50 hover:border-amber-400 hover:shadow-[0_14px_36px_-12px_rgba(245,158,11,0.45)]",
  premiumIconBox: "border-amber-300 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600",
  premiumTitle: "text-amber-800",
  premiumPill: "border-amber-300 bg-amber-100 text-amber-700",
  premiumDesc: "text-slate-600",
  premiumCta: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-300/60",

  reviewHeading: "text-slate-500",
  reviewDot: "bg-violet-500",
  returnBtn:
    "bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:brightness-110 text-white border-white/20 shadow-md shadow-violet-300/60 hover:shadow-[0_10px_28px_-6px_rgba(124,58,237,0.6)]",
};

export default function TestScorecardView({
  score,
  questions = [],
  selectedAnswers = {},
  testId,
  isUrlViewMode,
  onReturnToDashboard,
  onOpenDeepAnalysis,
  sectionOrder,
  testName,
}: TestScorecardViewProps) {
  const { theme } = useTheme();
  const s = theme.mode === "dark" ? DARK_SKIN : LIGHT_SKIN;

  const accuracyPercentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const isPassed = accuracyPercentage >= 50;

  return (
    <div className={`min-h-screen w-full p-4 md:p-6 lg:p-8 relative overflow-hidden font-sans ${theme.page}`}>

      {/* Background Meshes */}
      <div className="anu-grid absolute inset-0 opacity-60 pointer-events-none" />
      <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none ${theme.glow}`} />

      {/* Fullscreen Workspace Container */}
      <div className="max-w-[1600px] mx-auto space-y-6 relative z-10">

        {/* Navigation Actions */}
        <div className={`flex items-center justify-between border-b pb-3 ${s.navBorder}`}>
          <button
            onClick={onReturnToDashboard}
            className={`flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider border px-3 py-1.5 rounded-lg transition-all ${s.backBtn}`}
          >
            <ArrowLeft size={12} />
            Back to Mock Dashboard
          </button>

          <div className={`flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded border ${s.idBadge}`}>
            <ShieldCheck size={12} className={s.idIcon} />
            TEST ID: {testId?.substring(0, 8).toUpperCase() || "MOCK-SESSION"}
          </div>
        </div>

        {/* Hero Scorecard Panel split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">

          {/* Scoring Circle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`lg:col-span-4 rounded-2xl border p-6 text-center flex flex-col items-center justify-center min-h-[340px] ${s.scoreCard}`}
          >
            <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${isPassed ? 'from-emerald-500 to-cyan-500' : 'from-rose-500 to-amber-500'}`} />

            <div className="relative w-36 h-36 flex items-center justify-center mb-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke={s.ringTrack} strokeWidth="8" fill="transparent" />
                <motion.circle
                  cx="50" cy="50" r="42"
                  stroke={isPassed ? "#10b981" : "#f43f5e"}
                  strokeWidth="8" fill="transparent"
                  strokeDasharray="263.89"
                  initial={{ strokeDashoffset: 263.89 }}
                  animate={{ strokeDashoffset: 263.89 - (263.89 * accuracyPercentage) / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className={`text-3xl font-black ${s.ringValue}`}>{accuracyPercentage}%</span>
                <span className={`text-[10px] uppercase font-bold ${s.ringLabel}`}>Accuracy</span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className={`text-base font-black ${s.scoreTitle}`}>
                {isUrlViewMode ? "Performance Sheet Record" : "Mock Score Verification"}
              </h2>
              <p className={`text-xs max-w-[280px] mx-auto leading-normal ${s.scoreSub}`}>
                {isPassed
                  ? "Good progress! You matched more than 50% of the answer keys correctly."
                  : "Accuracy is low. Aim for at least 75% accuracy to secure selection in IBPS."}
              </p>
            </div>
          </motion.div>

          {/* Summary Cards Row Panel */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`lg:col-span-8 flex flex-col justify-between h-full min-h-[340px] p-6 rounded-2xl border relative overflow-hidden ${s.summaryCard}`}
          >
            <div className="space-y-3">
              <div>
                {isPassed ? (
                  <div className={`inline-flex items-center gap-1 border px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${s.badgePass}`}>
                    <CheckCircle2 size={12} /> Passed Sectional Target
                  </div>
                ) : (
                  <div className={`inline-flex items-center gap-1 border px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${s.badgeFail}`}>
                    <XCircle size={12} /> Below Target Cutoff
                  </div>
                )}
              </div>

              <h1 className={`text-2xl font-black tracking-tight ${s.h1}`}>
                IBPS Exam Performance Analysis Card
              </h1>
              <p className={`text-xs leading-relaxed max-w-2xl font-medium ${s.intro}`}>
                This scorecard breaks down your answers by section and topic based on the standard banking pattern. Review the metrics below to optimize your time-management and accuracy parameters before your next actual attempt.
              </p>
            </div>

            <div className={`pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3 text-left font-mono ${s.statsDivider}`}>
              <div className={`p-2.5 rounded-xl border ${s.statBox}`}>
                <span className={`block text-[9px] font-bold uppercase ${s.statLabel}`}>Correct Score</span>
                <span className={`text-base font-black ${s.statValueMain}`}>{score} <span className={`text-xs font-normal ${s.statUnit}`}>Marks</span></span>
              </div>
              <div className={`p-2.5 rounded-xl border ${s.statBox}`}>
                <span className={`block text-[9px] font-bold uppercase ${s.statLabel}`}>Total Questions</span>
                <span className={`text-base font-black ${s.statValueSoft}`}>{questions.length} <span className={`text-xs font-normal ${s.statUnit}`}>Items</span></span>
              </div>
              <div className={`p-2.5 rounded-xl border ${s.statBox}`}>
                <span className={`block text-[9px] font-bold uppercase ${s.statLabel}`}>Result Flag</span>
                <span className={`text-base font-black ${isPassed ? s.flagPass : s.flagFail}`}>{isPassed ? 'QUALIFIED' : 'LOW SCORE'}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${s.statBox}`}>
                <span className={`block text-[9px] font-bold uppercase ${s.statLabel}`}>Negative Impact</span>
                <span className={`text-base font-black ${s.statNegative}`}>Calculated</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* NEW: Premium entry point - Deep Strategy & Speed Diagnostics */}
        {onOpenDeepAnalysis && (
          <motion.button
            type="button"
            onClick={onOpenDeepAnalysis}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${s.premiumBtn}`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 rounded-xl border p-2.5 ${s.premiumIconBox}`}>
                  <Timer size={22} />
                </div>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 text-sm font-black ${s.premiumTitle}`}>
                    Unlock your ANUSHIVA Speed & Time Leakage Report
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.premiumPill}`}>
                      <Crown size={10} /> Premium
                    </span>
                  </div>
                  <p className={`max-w-2xl text-xs font-medium leading-relaxed ${s.premiumDesc}`}>
                    See your time on every question against the topper and the average aspirant, the topper&apos;s route through the paper, your ego traps, and a one-click practice test built from your mistakes.
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-lg px-4 py-2 text-xs font-black transition-transform group-hover:scale-[1.03] ${s.premiumCta}`}>
                Open deep analysis
              </span>
            </div>
          </motion.button>
        )}

        {/* Embedded Diagnostics Layer Injection */}
        <TestResultDiagnostics
          questions={questions}
          answersMatrix={selectedAnswers}
        />

        {/* Solution review - same screen as the exam */}
        <div className="space-y-3">
          <div className={`text-xs font-bold uppercase tracking-wider font-mono pl-0.5 flex items-center gap-1.5 ${s.reviewHeading}`}>
            <span className={`h-1 w-1 rounded-full ${s.reviewDot}`} />
            Question-by-Question Solution Review
          </div>
          <SolutionReviewExamView
            questions={questions}
            selectedAnswers={selectedAnswers}
            sectionOrder={sectionOrder}
            testName={testName}
          />
        </div>

        {/* Action Button Navigation */}
        <div className="pt-2 max-w-xs mx-auto">
          <button
            onClick={onReturnToDashboard}
            className={`w-full py-3 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-[0.99] font-mono border ${s.returnBtn}`}
          >
            Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}