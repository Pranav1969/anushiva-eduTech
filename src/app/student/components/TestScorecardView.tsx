"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Check, X } from "lucide-react";
import TestResultDiagnostics from "./TestResultDiagnostics";

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
}

interface TestScorecardViewProps {
  score: number; 
  questions: Question[];
  selectedAnswers: Record<string, string>; 
  testId: string | null;
  isUrlViewMode: boolean;
  onReturnToDashboard: () => void;
}

export default function TestScorecardView({
  score,
  questions = [],
  selectedAnswers = {},
  testId,
  isUrlViewMode,
  onReturnToDashboard,
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

        {/* Embedded Diagnostics Layer Injection */}
        <TestResultDiagnostics 
          questions={questions} 
          answersMatrix={selectedAnswers} 
        />

        {/* Question review lists section */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono pl-0.5 flex items-center gap-1.5">
            <span className="h-1 w-1 bg-indigo-500 rounded-full" />
            Question-by-Question Solution Review Logs
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {questions.map((q, idx) => {
              const userAnsRaw = selectedAnswers[q.id] || "";
              const userAns = userAnsRaw.trim().toLowerCase();
              const correctAns = q.correct_option.trim().toLowerCase();
              const isSkipped = userAns === "";
              const isCorrect = !isSkipped && userAns === correctAns;

              const renderingOptions = [
                { key: "a", text: q.option_a },
                { key: "b", text: q.option_b },
                { key: "c", text: q.option_c },
                { key: "d", text: q.option_d },
                { key: "e", text: q.option_e },
              ];

              return (
                <div 
                  key={q.id} 
                  className="p-5 rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-colors space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold tracking-wider uppercase border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">{q.section} &gt; <span className="text-indigo-400">{q.chapter}</span></span>
                      <span className={isSkipped ? "text-amber-500" : isCorrect ? "text-emerald-400" : "text-rose-400"}>
                        {isSkipped ? "SKIPPED" : isCorrect ? "CORRECT" : "INCORRECT"}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-200 leading-relaxed flex items-start gap-1.5">
                      <span className="text-cyan-400 font-mono text-xs select-none">Q{idx + 1}.</span> 
                      <span className="flex-1">{q.question_text}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {renderingOptions.map((opt) => {
                        const isCurrentCorrect = opt.key === correctAns;
                        const isCurrentUserChoice = opt.key === userAns;

                        let cardStyles = "border-slate-900 bg-slate-950/40 text-slate-400";
                        if (isCurrentCorrect) {
                          cardStyles = "border-emerald-500/30 bg-emerald-950/20 text-emerald-400";
                        } else if (isCurrentUserChoice && !isCorrect) {
                          cardStyles = "border-rose-500/30 bg-rose-950/20 text-rose-400";
                        }

                        return (
                          <div key={opt.key} className={`p-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-2 ${cardStyles}`}>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold uppercase shrink-0 ${
                              isCurrentCorrect ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
                              isCurrentUserChoice && !isCorrect ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" :
                              "bg-slate-900 text-slate-500 border border-slate-800"
                            }`}>
                              {isCurrentCorrect ? <Check size={10} strokeWidth={3} /> : isCurrentUserChoice && !isCorrect ? <X size={10} strokeWidth={3} /> : opt.key}
                            </div>
                            <span className="truncate">{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {q.explanation && q.explanation.trim() !== "" && (
                    <div className="text-[11px] text-slate-400 border-t border-slate-900 pt-2.5 leading-relaxed bg-slate-950/30 p-2.5 rounded-lg border border-slate-900/50">
                      <strong className="text-indigo-400 font-mono text-[9px] uppercase tracking-wider block mb-1">Explanation / Solution:</strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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