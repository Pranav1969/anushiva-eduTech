//src\app\student\components\PerformanceOverview.tsx
"use client";
import { Shield, Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { ChapterAnalysis } from "../page";
import { useTheme } from "../theme/ThemeProvider";

interface PerformanceOverviewProps {
  completed: number;
  total: number;
  avgScore: number;
  chapterMetrics?: ChapterAnalysis[];
}

export default function PerformanceOverview({ completed, total, avgScore, chapterMetrics = [] }: PerformanceOverviewProps) {
  const { theme: t } = useTheme();
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
        <div className={`${t.ui.statCard} border rounded-2xl p-6 flex items-center justify-between`}>
          <div className="space-y-1">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${t.text.muted}`}>Completion Velocity</h4>
            <p className={`text-2xl font-black ${t.ui.textStrong}`}>{completionRate}%</p>
            <div className={`w-32 ${t.accent.track} h-1.5 rounded-full overflow-hidden`}>
              <div className={`${t.ui.fillBlue} h-full transition-all duration-500`} style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <div className={`w-16 h-16 rounded-full border-4 ${t.ui.ringBlue} flex items-center justify-center font-mono font-bold text-xs`}>
            {completed}/{total}
          </div>
        </div>

        {/* Mean Efficiency Accuracy */}
        <div className={`${t.ui.statCard} border rounded-2xl p-6 flex items-center justify-between`}>
          <div className="space-y-1">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${t.text.muted}`}>Mean Efficiency</h4>
            <p className={`text-2xl font-black ${t.ui.textStrong}`}>{avgScore}%</p>
            <p className={`text-[10px] ${t.ui.cyanText} font-bold flex items-center gap-1`}><Sparkles size={10}/> Targeted Study Benchmarks</p>
          </div>
          <div className={`w-16 h-16 rounded-full border-4 ${t.ui.ringCyan} flex items-center justify-center font-mono font-bold text-xs`}>
            {avgScore}%
          </div>
        </div>

        {/* Active Syllabus Status */}
        <div className={`${t.ui.statCard} border rounded-2xl p-6 flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${t.ui.indigoIconBox}`}><Shield size={20} /></div>
          <div className="space-y-0.5">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${t.text.muted}`}>Active Syllabus Status</h4>
            <p className={`text-sm font-black ${t.ui.textTitle}`}>
              {completionRate > 75 ? "Advanced Core Proficiency" : completionRate > 40 ? "Intermediate Operational State" : "Initial Acclimatization Node"}
            </p>
            <p className={`text-[10px] ${t.text.faint} font-medium`}>Auto-computed from attempt profiles</p>
          </div>
        </div>
      </div>

      {/* Expanded Analytics Row: Strengths, Weaknesses & Machine Opinion Panel */}
      {chapterMetrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
          
          {/* Strengths List Card Column */}
          <div className={`${t.ui.softCard} border rounded-2xl p-5 space-y-3`}>
            <h5 className={`text-[11px] font-black tracking-widest ${t.success.text} uppercase flex items-center gap-1.5`}>
              <TrendingUp size={13} /> TOP STRENGTH MATRIX
            </h5>
            {strengths.length === 0 ? (
              <p className={`text-xs ${t.text.faint} italic font-medium`}>No chapters balancing above 70% accuracy benchmarks yet.</p>
            ) : (
              <div className="space-y-2">
                {strengths.map(st => (
                  <div key={st.chapterName} className={`flex justify-between items-center p-2.5 rounded-xl border text-xs ${t.ui.positiveRow}`}>
                    <span className={`font-bold ${t.ui.textTitle} truncate pr-2`}>{st.chapterName}</span>
                    <span className={`font-mono font-black shrink-0 px-2 py-0.5 rounded border ${t.ui.positiveBadge}`}>{st.accuracy}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weaknesses List Card Column */}
          <div className={`${t.ui.softCard} border rounded-2xl p-5 space-y-3`}>
            <h5 className={`text-[11px] font-black tracking-widest ${t.ui.roseText} uppercase flex items-center gap-1.5`}>
              <AlertTriangle size={13} /> CRITICAL REVISION ALERTS
            </h5>
            {weaknesses.length === 0 ? (
              <p className={`text-xs ${t.text.faint} italic font-medium`}>Excellent foundation! No chapters currently tracking under 60%.</p>
            ) : (
              <div className="space-y-2">
                {weaknesses.map(wk => (
                  <div key={wk.chapterName} className={`flex justify-between items-center p-2.5 rounded-xl border text-xs ${t.ui.negativeRow}`}>
                    <span className={`font-bold ${t.ui.textTitle} truncate pr-2`}>{wk.chapterName}</span>
                    <span className={`font-mono font-black shrink-0 px-2 py-0.5 rounded border ${t.ui.negativeBadge}`}>{wk.accuracy}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Machine Generated Opinion Summary Card Box */}
          <div className={`${t.ui.insightCard} border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full" />
            <div className="space-y-2 relative z-10">
              <h5 className={`text-[11px] font-black tracking-widest ${t.ui.indigoText} uppercase flex items-center gap-1.5`}>
                <Lightbulb size={13} fill="currentColor" className={t.ui.indigoText} /> ENGINE SYSTEM SYNTHESIS
              </h5>
              <p className={`text-xs ${t.text.body} leading-relaxed font-medium`}>
                "{getMachineOpinion()}"
              </p>
            </div>
            <div className={`text-[9px] font-mono font-bold uppercase tracking-wider ${t.text.faint} mt-4 border-t ${t.ui.dividerSoft} pt-2`}>
              Diagnostic Model v1.0.0 Status Active
            </div>
          </div>

        </div>
      )}
    </div>
  );
}