//src\app\student\components\TestScorecardView.tsx
"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Crown, Timer } from "lucide-react";
import TestResultDiagnostics from "./TestResultDiagnostics";
import SolutionReviewExamView from "./SolutionReviewExamView";

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
  const accuracyPercentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const isPassed = accuracyPercentage >= 50;

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 p-4 md:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Background Meshes */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Fullscreen Workspace Container */}
      <div className="max-w-[1600px] mx-auto space-y-6 relative z-10">
        
        {/* Navigation Actions */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <button 
            onClick={onReturnToDashboard}
            className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-400 hover:text-white tracking-wider bg-slate-900/60 hover:bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-all"
          >
            <ArrowLeft size={12} />
            Back to Mock Dashboard
          </button>
          
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 bg-slate-950 px-2.5 py-1 rounded border border-slate-900">
            <ShieldCheck size={12} className="text-indigo-400" />
            TEST ID: {testId?.substring(0, 8).toUpperCase() || "MOCK-SESSION"}
          </div>
        </div>

        {/* Hero Scorecard Panel split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          
          {/* Scoring Circle */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-4 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-6 text-center flex flex-col items-center justify-center min-h-[340px] shadow-xl backdrop-blur-xl"
          >
            <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${isPassed ? 'from-emerald-500 to-cyan-500' : 'from-rose-500 to-amber-500'}`} />
            
            <div className="relative w-36 h-36 flex items-center justify-center mb-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="#0f172a" strokeWidth="8" fill="transparent" />
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
                <span className="text-3xl font-black text-white">{accuracyPercentage}%</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Accuracy</span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-white">
                {isUrlViewMode ? "Performance Sheet Record" : "Mock Score Verification"}
              </h2>
              <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-normal">
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
            className="lg:col-span-8 flex flex-col justify-between h-full min-h-[340px] p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl relative overflow-hidden shadow-xl"
          >
            <div className="space-y-3">
              <div>
                {isPassed ? (
                  <div className="inline-flex items-center gap-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider">
                    <CheckCircle2 size={12} /> Passed Sectional Target
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 bg-rose-950/40 text-rose-400 border border-rose-900/40 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider">
                    <XCircle size={12} /> Below Target Cutoff
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-black text-white tracking-tight">
                IBPS Exam Performance Analysis Card
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl font-medium">
                This scorecard breaks down your answers by section and topic based on the standard banking pattern. Review the metrics below to optimize your time-management and accuracy parameters before your next actual attempt.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-900/60 grid grid-cols-2 md:grid-cols-4 gap-3 text-left font-mono">
              <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-900">
                <span className="block text-[9px] font-bold uppercase text-slate-500">Correct Score</span>
                <span className="text-base font-black text-white">{score} <span className="text-xs font-normal text-slate-600">Marks</span></span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-900">
                <span className="block text-[9px] font-bold uppercase text-slate-500">Total Questions</span>
                <span className="text-base font-black text-slate-300">{questions.length} <span className="text-xs font-normal text-slate-600">Items</span></span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-900">
                <span className="block text-[9px] font-bold uppercase text-slate-500">Result Flag</span>
                <span className={`text-base font-black ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>{isPassed ? 'QUALIFIED' : 'LOW SCORE'}</span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-900">
                <span className="block text-[9px] font-bold uppercase text-slate-500">Negative Impact</span>
                <span className="text-base font-black text-indigo-400">Calculated</span>
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
            className="group relative w-full overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-r from-[#1a1608] via-[#0f1a14] to-[#0b1713] p-5 text-left transition-all hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(255,182,39,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5 text-amber-300">
                  <Timer size={22} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-black text-amber-200">
                    Unlock your ANUSHIVA Speed & Time Leakage Report
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      <Crown size={10} /> Premium
                    </span>
                  </div>
                  <p className="max-w-2xl text-xs font-medium leading-relaxed text-slate-400">
                    See your time on every question against the topper and the average aspirant, the topper&apos;s route through the paper, your ego traps, and a one-click practice test built from your mistakes.
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-xs font-black text-[#0c1915] transition-transform group-hover:scale-[1.03]">
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
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono pl-0.5 flex items-center gap-1.5">
            <span className="h-1 w-1 bg-indigo-500 rounded-full" />
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
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 hover:shadow-[0_0_25px_rgba(79,70,229,0.3)] active:scale-[0.99] font-mono border border-indigo-400/10"
          >
            Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}