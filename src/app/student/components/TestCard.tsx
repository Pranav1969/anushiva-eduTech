"use client";

import Link from "next/link";
import { Calculator, Lock, Eye, Play, Sparkles } from "lucide-react";
import { TestRecord } from "../page";

interface TestCardProps {
  test: TestRecord;
}

export default function TestCard({ test }: TestCardProps) {
  const hasAttempted = !!test.userAttempt;
  const isRetestAllowed = test.userAttempt?.is_active_retest_granted === true;
  const lockEntryLink = hasAttempted && !isRetestAllowed;
  const isPremium = test.required_plan === "premium";

  return (
    <div 
      className={`relative rounded-xl overflow-hidden flex flex-col justify-between h-full min-h-[170px] p-3.5 shadow-md group transition-all duration-300 border ${
        isPremium 
          ? "bg-gradient-to-br from-[#1E1B4B]/90 via-[#0F172A] to-[#111827] border-indigo-500/30 hover:border-indigo-400/50 shadow-indigo-950/40" 
          : "bg-[#1E293B]/80 border-slate-800/80 hover:border-slate-700 shadow-black/20"
      }`}
    >
      {/* Visual Top Highlight Accent Strip */}
      <div className={`absolute top-0 left-0 h-[2px] w-0 transition-all duration-500 ease-out group-hover:w-full ${
        isPremium 
          ? "bg-gradient-to-r from-amber-400 via-indigo-500 to-violet-500" 
          : "bg-gradient-to-r from-[#2563EB] via-[#8B5CF6] to-[#22D3EE]"
      }`} />

      {/* Top Header Row */}
      <div className="flex justify-between items-center gap-1.5 w-full">
        <div className={`w-7 h-7 rounded-lg border shrink-0 flex items-center justify-center transition-colors ${
          isPremium 
            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:text-amber-400" 
            : "bg-slate-900 border-slate-800 text-[#2563EB] group-hover:text-[#22D3EE]"
        }`}>
          <Calculator size={13} />
        </div>
        
        {lockEntryLink ? (
          <span className="text-[8px] font-extrabold text-red-400 bg-red-950/40 border border-red-900/40 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Lock size={8} /> Completed ({test.userAttempt?.score}/{test.userAttempt?.total_questions})
          </span>
        ) : hasAttempted && isRetestAllowed ? (
          <span className="text-[8px] font-extrabold text-amber-400 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0">
            🔄 Retest
          </span>
        ) : (
          <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 border ${
            isPremium
              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}>
            {isPremium ? "⭐ Premium" : "Free Assessment"}
          </span>
        )}
      </div>

      {/* Main Core Content Block */}
      <div className="my-2.5 space-y-1">
        <h3 className={`text-xs font-bold tracking-tight leading-snug line-clamp-2 transition-colors duration-200 ${
          isPremium 
            ? "text-indigo-100 group-hover:text-white" 
            : "text-white group-hover:text-[#22D3EE]"
        }`}>
          {test.test_name}
        </h3>
        <p className="text-[#CBD5E1]/40 font-bold uppercase tracking-wider text-[8px] flex items-center gap-1 flex-wrap">
          Clock: <span className="text-[#CBD5E1]/80 bg-slate-900 px-1 py-0.2 rounded font-mono text-[9px] border border-slate-800 tracking-normal normal-case">{test.timer_type?.replace("-", " ")}</span>
        </p>
      </div>

      {/* Button Execution Footer Layout */}
      <div className="w-full pt-2 border-t border-slate-800/60">
        {lockEntryLink ? (
          <Link href={`/student/numerical-ability?id=${test.id}&viewMode=true`} className="block w-full">
            <button className="w-full py-1.5 bg-slate-900 hover:bg-slate-950 border border-slate-800 text-[#CBD5E1] hover:text-white font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-colors">
              <Eye size={10} /> Scorecard
            </button>
          </Link>
        ) : (
          <Link href={`/student/numerical-ability?id=${test.id}`} className="block w-full">
            <button className={`w-full py-1.5 font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-all duration-200 shadow-sm group/btn text-white ${
              isPremium
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-950"
                : "bg-gradient-to-r from-[#2563EB] to-[#312E81] hover:from-[#3b82f6] hover:to-[#2563EB] shadow-blue-950"
            }`}>
              <Play size={8} fill="currentColor" className="group-hover/btn:translate-x-0.5 transition-transform duration-200" /> 
              <span>{isRetestAllowed ? "Retest" : "Start Test"}</span>
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}