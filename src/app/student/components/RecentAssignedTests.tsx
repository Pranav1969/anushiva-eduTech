"use client";

import { Hourglass, Calendar, ArrowRight, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { TestRecord } from "../page";

interface RecentAssignedTestsProps {
  tests: TestRecord[];
  onLockedClick: (planName: string) => void;
}

export default function RecentAssignedTests({ tests, onLockedClick }: RecentAssignedTestsProps) {
  const horizontalPendingTests = tests.filter(t => !t.userAttempt || t.userAttempt.is_active_retest_granted).slice(0, 5);

  if (horizontalPendingTests.length === 0) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xs font-black uppercase text-[#22D3EE] tracking-widest">⚡ Priority Work Pipeline</h2>
          <p className="text-slate-400 text-[11px] mt-0.5">Recently assigned evaluations requiring completion</p>
        </div>
      </div>

      {/* Horizontal Scroller container - SaaS Slick Aspect Ratio */}
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent -mx-1 px-1">
        {horizontalPendingTests.map((t) => {
          const isPremium = t.required_plan === "premium";

          return (
            <div 
              key={t.id} 
              className={`w-[280px] sm:w-[320px] shrink-0 border rounded-2xl p-5 snap-start shadow-xl relative overflow-hidden group flex flex-col justify-between transition-all duration-300 ${
                isPremium && !t.is_locked
                  ? "bg-gradient-to-br from-[#1E1B4B]/90 via-[#0F172A] to-[#111827] border-indigo-500/30 hover:border-indigo-400/50 shadow-indigo-950/40"
                  : "bg-gradient-to-br from-[#1E293B] to-[#131C2E] border-slate-800/80 hover:border-slate-700/80 shadow-black/20"
              }`}
              onClickCapture={(e) => {
                if (t.is_locked) {
                  e.stopPropagation();
                  e.preventDefault();
                  onLockedClick(t.required_plan || "premium");
                }
              }}
            >
              {/* Visual Top Highlight Accent Strip for Unlocked Premium Mocks */}
              {isPremium && !t.is_locked && (
                <div className="absolute top-0 left-0 h-[2px] w-0 bg-gradient-to-r from-amber-400 via-indigo-500 to-violet-500 transition-all duration-500 ease-out group-hover:w-full" />
              )}

              {/* Visual overlay indicator if locked */}
              {t.is_locked && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[3px] border border-amber-500/30 rounded-2xl z-20 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-950/70 transition-all p-4 text-center">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-black/60 mb-1.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-black tracking-widest uppercase text-amber-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded shadow-md">
                    Unlock {t.required_plan}
                  </span>
                </div>
              )}

              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full pointer-events-none" />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-blue-400 bg-blue-950/60 border border-blue-900/40 px-2 py-0.5 rounded uppercase font-mono flex items-center gap-1">
                    <Calendar size={10} /> {new Date(t.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  </span>
                  
                  {isPremium ? (
                    <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={9} className="text-amber-400 fill-amber-400/20 animate-pulse" /> Premium
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 border border-cyan-900/40 rounded uppercase tracking-wide">
                      Active Run
                    </span>
                  )}
                </div>

                <h4 className={`text-sm font-bold tracking-tight line-clamp-1 transition-colors ${
                  isPremium && !t.is_locked
                    ? "text-indigo-100 group-hover:text-white"
                    : "text-white group-hover:text-[#22D3EE]"
                }`}>
                  {t.test_name}
                </h4>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-800/60 pt-3">
                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 font-mono">
                  <Hourglass size={11} className="text-slate-500" /> {t.timer_type}
                </div>
                <Link href={`/student/numerical-ability?id=${t.id}`} className={`inline-flex items-center gap-1 text-[11px] font-bold transition-colors group/link ${
                  isPremium && !t.is_locked
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-[#22D3EE] hover:text-white"
                }`}>
                  Launch <ArrowRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}