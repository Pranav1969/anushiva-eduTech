"use client";
import { Hourglass, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { TestRecord } from "../page";

interface RecentAssignedTestsProps {
  tests: TestRecord[];
}

export default function RecentAssignedTests({ tests }: RecentAssignedTestsProps) {
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
        {horizontalPendingTests.map((t) => (
          <div 
            key={t.id} 
            className="w-[280px] sm:w-[320px] shrink-0 bg-gradient-to-br from-[#1E293B] to-[#131C2E] border border-slate-800/80 rounded-2xl p-5 snap-start shadow-xl relative overflow-hidden group flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full pointer-events-none" />
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-blue-400 bg-blue-950/60 border border-blue-900/40 px-2 py-0.5 rounded uppercase font-mono flex items-center gap-1">
                  <Calendar size={10} /> {new Date(t.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                </span>
                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 border border-cyan-900/40 rounded uppercase tracking-wide">
                  Active Run
                </span>
              </div>

              <h4 className="text-sm font-bold text-white tracking-tight line-clamp-1 group-hover:text-[#22D3EE] transition-colors">
                {t.test_name}
              </h4>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-800/60 pt-3">
              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 font-mono">
                <Hourglass size={11} className="text-slate-500" /> {t.timer_type}
              </div>
              <Link href={`/student/numerical-ability?id=${t.id}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#22D3EE] hover:text-white transition-colors group/link">
                Launch <ArrowRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}