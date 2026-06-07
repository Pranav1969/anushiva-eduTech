"use client";
import { Shield, Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { ChapterAnalysis } from "../page";

interface PerformanceOverviewProps {
  completed: number;
  total: number;
  avgScore: number;
  chapterMetrics?: ChapterAnalysis[];
}

export default function PerformanceOverview({ completed, total, avgScore, chapterMetrics = [] }: PerformanceOverviewProps) {
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Compute strengths and weaknesses based on chapter accuracies
  const sortedChapters = [...chapterMetrics].sort((a, b) => b.accuracy - a.accuracy);
  
  const strengths = sortedChapters.filter(c => c.accuracy >= 70).slice(0, 2);
  const weaknesses = [...sortedChapters].reverse().filter(c => c.accuracy < 60).slice(0, 2);

  // Machine Generated Insight Opinion Builder logic
  const getMachineOpinion = () => {
    if (chapterMetrics.length === 0) {
      return "Complete your initial assigned test profiles to activate automated engine analytical summaries.";
    }
    if (weaknesses.length > 0) {
      return `Targeted Focus Required: Performance telemetry flags adjustments needed in "${weaknesses[0].chapterName}". Re-study foundational concepts here to optimize global efficiency metrics.`;
    }
    if (strengths.length > 0) {
      return `Excellent baseline execution maintained! Strong operational performance patterns confirmed in "${strengths[0].chapterName}". Maintain this momentum across mixed evaluations.`;
    }
    return "Balanced metrics captured. Target a higher completion velocity to unlock fine-tuned topic optimization suggestions.";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Row Grid - Standard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Completion Velocity */}
        <div className="bg-gradient-to-br from-[#1E293B] to-[#111827] border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Completion Velocity</h4>
            <p className="text-2xl font-black text-white">{completionRate}%</p>
            <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-blue-500 flex items-center justify-center font-mono font-bold text-xs text-blue-400">
            {completed}/{total}
          </div>
        </div>

        {/* Mean Efficiency Accuracy */}
        <div className="bg-gradient-to-br from-[#1E293B] to-[#111827] border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Mean Efficiency</h4>
            <p className="text-2xl font-black text-white">{avgScore}%</p>
            <p className="text-[10px] text-[#22D3EE] font-bold flex items-center gap-1"><Sparkles size={10}/> Targeted Study Benchmarks</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-cyan-400 flex items-center justify-center font-mono font-bold text-xs text-cyan-400">
            {avgScore}%
          </div>
        </div>

        {/* Active Syllabus Status */}
        <div className="bg-gradient-to-br from-[#1E293B] to-[#111827] border border-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center"><Shield size={20} /></div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Syllabus Status</h4>
            <p className="text-sm font-black text-slate-200">
              {completionRate > 75 ? "Advanced Core Proficiency" : completionRate > 40 ? "Intermediate Operational State" : "Initial Acclimatization Node"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Auto-computed from attempt profiles</p>
          </div>
        </div>
      </div>

      {/* Expanded Analytics Row: Strengths, Weaknesses & Machine Opinion Panel */}
      {chapterMetrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
          
          {/* Strengths List Card Column */}
          <div className="bg-gradient-to-br from-[#1E293B]/60 to-[#0F172A] border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <h5 className="text-[11px] font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
              <TrendingUp size={13} /> TOP STRENGTH MATRIX
            </h5>
            {strengths.length === 0 ? (
              <p className="text-xs text-slate-500 italic font-medium">No chapters balancing above 70% accuracy benchmarks yet.</p>
            ) : (
              <div className="space-y-2">
                {strengths.map(st => (
                  <div key={st.chapterName} className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs">
                    <span className="font-bold text-slate-200 truncate pr-2">{st.chapterName}</span>
                    <span className="font-mono font-black text-emerald-400 shrink-0 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/40">{st.accuracy}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weaknesses List Card Column */}
          <div className="bg-gradient-to-br from-[#1E293B]/60 to-[#0F172A] border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <h5 className="text-[11px] font-black tracking-widest text-rose-400 uppercase flex items-center gap-1.5">
              <AlertTriangle size={13} /> CRITICAL REVISION ALERTS
            </h5>
            {weaknesses.length === 0 ? (
              <p className="text-xs text-slate-500 italic font-medium">Excellent foundation! No chapters currently tracking under 60%.</p>
            ) : (
              <div className="space-y-2">
                {weaknesses.map(wk => (
                  <div key={wk.chapterName} className="flex justify-between items-center p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs">
                    <span className="font-bold text-slate-200 truncate pr-2">{wk.chapterName}</span>
                    <span className="font-mono font-black text-rose-400 shrink-0 bg-rose-950 px-2 py-0.5 rounded border border-rose-800/40">{wk.accuracy}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Machine Generated Opinion Summary Card Box */}
          <div className="bg-gradient-to-br from-[#1E293B] via-[#1E1B4B]/40 to-[#0F172A] border border-slate-800/70 rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full" />
            <div className="space-y-2 relative z-10">
              <h5 className="text-[11px] font-black tracking-widest text-indigo-400 uppercase flex items-center gap-1.5">
                <Lightbulb size={13} fill="currentColor" className="text-indigo-400" /> ENGINE SYSTEM SYNTHESIS
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                "{getMachineOpinion()}"
              </p>
            </div>
            <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mt-4 border-t border-slate-800/60 pt-2">
              Diagnostic Model v1.0.0 Status Active
            </div>
          </div>

        </div>
      )}
    </div>
  );
}