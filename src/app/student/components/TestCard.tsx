"use client";
import Link from "next/link";
import { Calculator, Lock, Eye, Play } from "lucide-react";
import { TestRecord } from "../page";

interface TestCardProps {
  test: TestRecord;
}

export default function TestCard({ test }: TestCardProps) {
  const hasAttempted = !!test.userAttempt;
  const isRetestAllowed = test.userAttempt?.is_active_retest_granted === true;
  const lockEntryLink = hasAttempted && !isRetestAllowed;

  return (
    <div className="bg-[#1E293B] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all duration-300 relative overflow-hidden group hover:-translate-y-1">
      <div className="absolute top-0 left-0 h-[3px] w-0 bg-gradient-to-r from-[#2563EB] via-[#8B5CF6] to-[#22D3EE] group-hover:w-full transition-all duration-500 ease-out" />
      
      <div className="flex justify-between items-start">
        <div className="w-9 h-9 bg-slate-900 border border-slate-800 text-[#2563EB] group-hover:text-[#22D3EE] rounded-xl flex items-center justify-center transition-colors">
          <Calculator size={16} />
        </div>
        
        {lockEntryLink ? (
          <span className="text-[10px] font-bold text-red-400 bg-red-950/40 border border-red-900/40 px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1.5">
            <Lock size={10} /> Completed ({test.userAttempt?.score}/{test.userAttempt?.total_questions})
          </span>
        ) : hasAttempted && isRetestAllowed ? (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-900/40 px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            🔄 Retest Granted
          </span>
        ) : (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-1 rounded-lg uppercase tracking-wider">
            Ready for Attempt
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <h3 className="text-base font-bold text-white tracking-tight group-hover:text-[#22D3EE] transition-colors duration-200 line-clamp-1">
          {test.test_name}
        </h3>
        <p className="text-[#CBD5E1]/40 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
          Clock Configuration: <span className="text-[#CBD5E1]/80 bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-800">{test.timer_type}</span>
        </p>
      </div>

      <div className="mt-6 pt-1">
        {lockEntryLink ? (
          <Link href={`/student/numerical-ability?id=${test.id}&viewMode=true`} className="block w-full">
            <button className="w-full py-3 bg-slate-900 hover:bg-slate-950 border border-slate-800 text-[#CBD5E1] hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Eye size={12} /> Review Performance Scorecard
            </button>
          </Link>
                    ) : (
                      <Link href={`/student/numerical-ability?id=${test.id}`} className="block w-full">
                        <button className="w-full py-3 bg-gradient-to-r from-[#2563EB] to-[#312E81] hover:from-[#3b82f6] hover:to-[#2563EB] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-[#2563EB]/10 group/btn">
                          <Play size={10} fill="currentColor" className="group-hover/btn:translate-x-0.5 transition-transform duration-200" /> 
                          {isRetestAllowed ? "Launch Authorized Retest" : "Start Online Examination"}
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
  );
}