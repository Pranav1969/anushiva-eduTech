"use client";

import { useMemo, useState } from "react";
import { motion, Variants } from "framer-motion";
import { 
  BarChart3, Activity, CheckCircle, AlertTriangle, XOctagon, 
  BrainCircuit, Zap, Target, Award, ShieldAlert, Sparkles
} from "lucide-react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Bar, ComposedChart, XAxis, YAxis, Tooltip, Area
} from "recharts";

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

interface TestResultDiagnosticsProps {
  questions: Question[];
  answersMatrix: Record<string, string>;
}

function AnalyticMetricCard({ title, value, subtext, icon: Icon, colorClass, delay }: {
  title: string; value: string | number; subtext: string; icon: any; colorClass: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 90, delay }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-xl transition-all duration-200 hover:border-slate-700 hover:shadow-[0_0_25px_rgba(30,41,59,0.3)] group"
    >
      <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${colorClass}`} />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-2xl font-black text-white font-mono">{value}</h3>
          <p className="text-[11px] text-slate-500 font-medium">{subtext}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-white transition-colors">
          <Icon size={18} />
        </div>
      </div>
    </motion.div>
  );
}

export default function TestResultDiagnostics({
  questions = [],
  answersMatrix = {},
}: TestResultDiagnosticsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "radar" | "chapters" | "all_topics">("overview");

  const diagnostics = useMemo(() => {
    const sectionStats: Record<string, { total: number; correct: number }> = {};
    const chapterStats: Record<string, { total: number; correct: number }> = {};
    
    let totalCorrect = 0;
    let totalUnattempted = 0;

    const safeAnswersMatrix = answersMatrix || {};
    const safeQuestions = questions || [];

    safeQuestions.forEach((q) => {
      if (!q) return;
      const subjectName = q.section || "General Subject";
      const topicName = q.chapter || "General Topic";
      
      const userAns = safeAnswersMatrix[q.id];
      const isUnattempted = !userAns || userAns.trim() === "";

      if (isUnattempted) totalUnattempted++;
      
      const isCorrect = !isUnattempted && q.correct_option && userAns.trim().toLowerCase() === q.correct_option.trim().toLowerCase();

      if (isCorrect) totalCorrect++;

      if (!sectionStats[subjectName]) sectionStats[subjectName] = { total: 0, correct: 0 };
      sectionStats[subjectName].total += 1;
      if (isCorrect) sectionStats[subjectName].correct += 1;

      if (!chapterStats[topicName]) chapterStats[topicName] = { total: 0, correct: 0 };
      chapterStats[topicName].total += 1;
      if (isCorrect) chapterStats[topicName].correct += 1;
    });

    const formatMetrics = (record: Record<string, { total: number; correct: number }>) =>
      Object.entries(record).map(([name, stats]) => ({
        name,
        total: stats.total,
        correct: stats.correct,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      })).sort((a, b) => b.accuracy - a.accuracy);

    const formattedSections = formatMetrics(sectionStats);
    const formattedChapters = formatMetrics(chapterStats);

    const strongArea = formattedChapters[0]?.name || "N/A";
    const weakArea = formattedChapters[formattedChapters.length - 1]?.name || "N/A";
    const overallAccuracy = safeQuestions.length > 0 ? Math.round((totalCorrect / safeQuestions.length) * 100) : 0;

    let strategicInsight = "Consistently analyze your section timing parameters to push past section benchmarks.";
    if (overallAccuracy >= 75) {
      strategicInsight = `Excellent target accuracy! Your performance profile in '${strongArea}' is strong enough to secure sectional selection. Clean up remaining vulnerabilities in '${weakArea}' to maximize your aggregate merit listing.`;
    } else if (overallAccuracy >= 50) {
      strategicInsight = `Decent baseline performance. Your '${strongArea}' metrics are sound, but you need immediate intensive mock drills in '${weakArea}' to cross the expected section cutoff safely.`;
    } else if (safeQuestions.length > 0) {
      strategicInsight = `Aggregated performance falls short of average banking cutoffs. Dedicate immediate focus toward conceptual clarity starting with '${weakArea}', and pivot strictly toward daily high-speed timed practice sets.`;
    }

    return {
      sectionMetrics: formattedSections,
      chapterMetrics: formattedChapters,
      totalCorrect,
      totalWrong: safeQuestions.length - totalCorrect - totalUnattempted,
      totalUnattempted,
      strategicInsight,
      strongArea,
      weakArea
    };
  }, [questions, answersMatrix]);

  if (!questions || questions.length === 0) return null;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shadow-xl backdrop-blur-md">
          <p className="text-xs font-bold text-slate-200 mb-1">{payload[0].name}</p>
          <div className="space-y-0.5 text-[11px] font-mono">
            <p className="text-cyan-400">Accuracy: <span className="font-bold">{payload[0].value}%</span></p>
            <p className="text-slate-400">Net Score: {payload[0].payload.correct} / {payload[0].payload.total} Right</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Counters Tiles */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <AnalyticMetricCard 
          title="Overall Accuracy" 
          value={`${Math.round((diagnostics.totalCorrect / questions.length) * 100)}%`}
          subtext={`Attempted: ${questions.length - diagnostics.totalUnattempted}`}
          icon={Target}
          colorClass="from-cyan-500 to-blue-600"
          delay={0.05}
        />
        <AnalyticMetricCard 
          title="Correct Answers" 
          value={`${diagnostics.totalCorrect} Qs`}
          subtext="Net positive evaluation counts"
          icon={Award}
          colorClass="from-emerald-500 to-teal-600"
          delay={0.1}
        />
        <AnalyticMetricCard 
          title="Wrong Answers" 
          value={`${diagnostics.totalWrong} Qs`}
          subtext="Triggers negative marking (-0.25)"
          icon={ShieldAlert}
          colorClass="from-rose-500 to-red-600"
          delay={0.15}
        />
        <AnalyticMetricCard 
          title="Left / Unattempted" 
          value={`${diagnostics.totalUnattempted} Qs`}
          subtext="Zero scoring or loss parameters"
          icon={Zap}
          colorClass="from-amber-500 to-orange-600"
          delay={0.2}
        />
      </div>

      {/* Practical Smart Feedback Panel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 to-indigo-950/30 p-4 backdrop-blur-xl"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 relative z-10">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <BrainCircuit size={20} />
          </div>
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                <Sparkles size={11} /> Personalized Smart Feedback for Cutoff Strategy
              </span>
            </div>
            <p className="text-xs font-medium text-slate-300 leading-relaxed">
              {diagnostics.strategicInsight}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap text-[10px] font-mono font-bold mt-2 md:mt-0">
            <span className="bg-emerald-950/50 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/30">
              Highest Marks: {diagnostics.strongArea}
            </span>
            <span className="bg-rose-950/50 text-rose-400 px-2 py-0.5 rounded border border-rose-900/30">
              Needs Work: {diagnostics.weakArea}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Primary Chart Area Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Navigation Sidebar Tabs */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          {[
            { id: "overview", label: "Section Accuracy Chart", desc: "Compare major section accuracy", icon: BarChart3 },
            { id: "radar", label: "Subject Balance View", desc: "Check balance between QA, RE, and ENG", icon: Target },
            { id: "chapters", label: "Priority Priority Topics", desc: "Top scoring chapter nodes", icon: Activity },
            { id: "all_topics", label: "Detailed Sub-Topic Matrix", desc: "Full breakdown overview", icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 relative ${
                  isSelected 
                    ? "bg-slate-900 border-slate-700 text-cyan-400 shadow-lg" 
                    : "bg-slate-950/40 border-slate-900 text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                }`}
              >
                {isSelected && <div className="absolute left-0 top-1/4 h-1/2 w-[2px] bg-cyan-400 rounded-r" />}
                <Icon size={16} />
                <div>
                  <p className="text-xs font-bold tracking-wide">{tab.label}</p>
                  <p className="text-[10px] text-slate-500">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Display Projection Panel Box */}
        <div className="lg:col-span-9 min-h-[350px] rounded-xl border border-slate-800 bg-slate-900/10 p-5 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
          {activeTab === "overview" && (
            <div className="w-full h-full flex flex-col flex-1 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Section Accuracy Chart
                </h4>
              </div>
              <div className="w-full flex-1 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={diagnostics.sectionMetrics} margin={{ top: 15, right: 5, bottom: 15, left: -25 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30,41,59,0.1)' }} />
                    <Area type="monotone" dataKey="accuracy" fill="url(#accuracyGrad)" stroke="none" opacity={0.2} />
                    <Bar dataKey="accuracy" barSize={16} fill="url(#barGrad)" radius={[3, 3, 0, 0]} />
                    <defs>
                      <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee"/>
                        <stop offset="100%" stopColor="#4f46e5"/>
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "radar" && (
            <div className="w-full h-full flex flex-col flex-1 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Subject Balance Distribution
                </h4>
              </div>
              <div className="w-full flex-1 min-h-[260px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={diagnostics.sectionMetrics}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }} />
                    <Radar name="Section Balance" dataKey="accuracy" stroke="#818cf8" fill="#4f46e5" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "chapters" && (
            <div className="w-full h-full flex flex-col flex-1 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Top Performing Topics
                </h4>
              </div>
              
              <motion.div 
                variants={containerVariants} initial="hidden" animate="show"
                className="grid gap-3 grid-cols-1 sm:grid-cols-2 overflow-y-auto max-h-[260px] pr-1 scrollbar-thin scrollbar-thumb-slate-800"
              >
                {diagnostics.chapterMetrics.slice(0, 4).map((item) => {
                  const isHigh = item.accuracy >= 75;
                  const isMid = item.accuracy >= 50 && item.accuracy < 75;
                  const StatusIcon = isHigh ? CheckCircle : isMid ? AlertTriangle : XOctagon;
                  
                  const statusTheme = isHigh 
                    ? { text: "text-emerald-400", bg: "bg-emerald-950/30", border: "border-emerald-800/30", progress: "bg-emerald-500" }
                    : isMid 
                    ? { text: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-800/30", progress: "bg-amber-500" }
                    : { text: "text-rose-400", bg: "bg-rose-950/30", border: "border-rose-800/30", progress: "bg-rose-500" };

                  return (
                    <motion.div 
                      key={item.name} variants={itemVariants}
                      className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-slate-200 truncate max-w-[75%]">
                          {item.name}
                        </span>
                        <div className={`flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${statusTheme.text} ${statusTheme.bg} ${statusTheme.border}`}>
                          <StatusIcon size={10} />
                          {item.accuracy}%
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className={`h-full ${statusTheme.progress}`} style={{ width: `${item.accuracy}%` }} />
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 flex justify-between">
                          <span>Correct: <strong className="text-slate-300">{item.correct}</strong> / {item.total}</span>
                          <span>{item.total - item.correct} Wrong</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}

          {/* Optimized Sub-Topic Area Embedding (Saves Huge Layout Heights) */}
          {activeTab === "all_topics" && (
            <div className="w-full h-full flex flex-col flex-1 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Space-Optimized Metrics Field
                </h4>
              </div>
              <motion.div 
                variants={containerVariants} initial="hidden" animate="show"
                className="grid gap-2 grid-cols-1 sm:grid-cols-2 overflow-y-auto max-h-[260px] pr-1 scrollbar-thin scrollbar-thumb-slate-800 text-[11px]"
              >
                {diagnostics.chapterMetrics.map((item) => (
                  <motion.div 
                    key={item.name} variants={itemVariants}
                    className="p-2 rounded-lg bg-slate-950/40 border border-slate-900 flex items-center justify-between gap-3 hover:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[55%]">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.accuracy >= 75 ? 'bg-emerald-500' : item.accuracy >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} />
                      <span className="font-bold text-slate-300 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono shrink-0 text-slate-400">
                      <span>{item.correct}/{item.total} Qs</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${
                        item.accuracy >= 75 ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20' :
                        item.accuracy >= 50 ? 'text-amber-400 border-amber-950 bg-amber-950/20' : 'text-rose-400 border-rose-950 bg-rose-950/20'
                      }`}>{item.accuracy}%</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}