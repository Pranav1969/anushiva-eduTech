//src\app\student\components\TestResultDiagnostics.tsx
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
import { getVerdict, resolveTaxonomy } from "./resultMeta";
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
}

interface TestResultDiagnosticsProps {
  questions: Question[];
  answersMatrix: Record<string, string>;
}

type Counter = { total: number; correct: number; wrong: number; skipped: number };
const mkCounter = (): Counter => ({ total: 0, correct: 0, wrong: 0, skipped: 0 });
const accOf = (c: Counter) => (c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0);

/* ------------------------------------------------------------------ */
/*  Theme skins for this page (complete literal class strings so       */
/*  Tailwind can see them). Picked by the active theme's mode.         */
/*  DARK_SKIN is exactly the original look.                            */
/* ------------------------------------------------------------------ */
interface StatusTheme {
  text: string;
  bg: string;
  border: string;
  progress: string;
}

interface Skin {
  // metric tiles
  metricCard: string;
  metricTitle: string;
  metricValue: string;
  metricSub: string;
  metricIconBox: string;

  // coach panel
  coachPanel: string;
  coachIconBox: string;
  coachLabel: string;
  coachText: string;
  chipStrong: string;
  chipWeak: string;

  // left tab buttons
  tabActive: string;
  tabIdle: string;
  tabBar: string;
  tabDesc: string;

  // right display panel
  panel: string;
  panelTitle: string;
  panelHeadBorder: string;
  dotCyan: string;
  dotIndigo: string;
  dotEmerald: string;

  // charts
  axisStroke: string;
  cursorFill: string;
  gridStroke: string;
  angleTick: string;
  radiusTick: string;
  radarStroke: string;
  radarFill: string;
  areaStop: string;
  barTop: string;
  barBottom: string;
  tooltipBox: string;
  tooltipName: string;
  tooltipAcc: string;
  tooltipSub: string;

  // top chapters tab
  chapterCard: string;
  chapterName: string;
  progressTrack: string;
  chapterStatLabel: string;
  chapterStatStrong: string;
  statusHigh: StatusTheme;
  statusMid: StatusTheme;
  statusLow: StatusTheme;

  // breakdown tab
  select: string;
  helpText: string;
  helpStrong: string;
  scrollbar: string;
  emptyText: string;
  treeCard: string;
  treeEyebrow: string;
  sectionChip: string;
  treeName: string;
  treeMiniStat: string;
  treeTopicWrap: string;
  topicTagged: string;
  topicUntagged: string;
  topicStat: string;
  topicMiniStat: string;
  toneHigh: string;
  toneMid: string;
  toneLow: string;
}

const DARK_SKIN: Skin = {
  metricCard:
    "border-slate-800 bg-slate-900/50 backdrop-blur-xl hover:border-slate-700 hover:shadow-[0_0_25px_rgba(30,41,59,0.3)]",
  metricTitle: "text-slate-400",
  metricValue: "text-white",
  metricSub: "text-slate-500",
  metricIconBox:
    "bg-slate-950 border-slate-800 text-slate-400 group-hover:text-white",

  coachPanel:
    "border-indigo-500/20 bg-gradient-to-r from-slate-900 to-indigo-950/30 backdrop-blur-xl",
  coachIconBox: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
  coachLabel: "text-indigo-400",
  coachText: "text-slate-300",
  chipStrong: "bg-emerald-950/50 text-emerald-400 border-emerald-900/30",
  chipWeak: "bg-rose-950/50 text-rose-400 border-rose-900/30",

  tabActive: "bg-slate-900 border-slate-700 text-cyan-400 shadow-lg",
  tabIdle:
    "bg-slate-950/40 border-slate-900 text-slate-400 hover:bg-slate-900/50 hover:text-slate-200",
  tabBar: "bg-cyan-400",
  tabDesc: "text-slate-500",

  panel: "border-slate-800 bg-slate-900/10 backdrop-blur-xl",
  panelTitle: "text-white",
  panelHeadBorder: "border-slate-800",
  dotCyan: "bg-cyan-400",
  dotIndigo: "bg-indigo-400",
  dotEmerald: "bg-emerald-400",

  axisStroke: "#64748b",
  cursorFill: "rgba(30,41,59,0.1)",
  gridStroke: "#334155",
  angleTick: "#94a3b8",
  radiusTick: "#475569",
  radarStroke: "#818cf8",
  radarFill: "#4f46e5",
  areaStop: "#06b6d4",
  barTop: "#22d3ee",
  barBottom: "#4f46e5",
  tooltipBox: "bg-slate-950 border-slate-800 shadow-xl backdrop-blur-md",
  tooltipName: "text-slate-200",
  tooltipAcc: "text-cyan-400",
  tooltipSub: "text-slate-400",

  chapterCard: "border-slate-800 bg-slate-950/50",
  chapterName: "text-slate-200",
  progressTrack: "bg-slate-900",
  chapterStatLabel: "text-slate-500",
  chapterStatStrong: "text-slate-300",
  statusHigh: { text: "text-emerald-400", bg: "bg-emerald-950/30", border: "border-emerald-800/30", progress: "bg-emerald-500" },
  statusMid: { text: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-800/30", progress: "bg-amber-500" },
  statusLow: { text: "text-rose-400", bg: "bg-rose-950/30", border: "border-rose-800/30", progress: "bg-rose-500" },

  select: "bg-slate-950 border-slate-800 text-slate-300",
  helpText: "text-slate-500",
  helpStrong: "text-slate-300",
  scrollbar: "scrollbar-thin scrollbar-thumb-slate-800",
  emptyText: "text-slate-500",
  treeCard: "border-slate-800 bg-slate-950/40",
  treeEyebrow: "text-slate-500",
  sectionChip: "text-slate-400 bg-slate-900 border-slate-800",
  treeName: "text-slate-200",
  treeMiniStat: "text-slate-500",
  treeTopicWrap: "border-slate-800",
  topicTagged: "text-slate-300",
  topicUntagged: "text-slate-500",
  topicStat: "text-slate-400",
  topicMiniStat: "text-slate-600",
  toneHigh: "text-emerald-400 border-emerald-900/40 bg-emerald-950/20",
  toneMid: "text-amber-400 border-amber-900/40 bg-amber-950/20",
  toneLow: "text-rose-400 border-rose-900/40 bg-rose-950/20",
};

const LIGHT_SKIN: Skin = {
  metricCard:
    "border-white/80 bg-gradient-to-br from-white via-white to-violet-50/80 backdrop-blur-xl shadow-[0_14px_38px_-16px_rgba(99,102,241,0.45)] hover:border-violet-300 hover:shadow-[0_24px_52px_-16px_rgba(124,58,237,0.5)]",
  metricTitle: "text-slate-500",
  metricValue: "text-slate-900",
  metricSub: "text-slate-400",
  metricIconBox:
    "bg-gradient-to-br from-indigo-50 to-violet-100 border-indigo-200 text-indigo-500 group-hover:text-violet-700",

  coachPanel:
    "border-indigo-200/80 bg-gradient-to-r from-white/90 via-indigo-50/70 to-violet-50/70 shadow-[0_14px_36px_-14px_rgba(124,58,237,0.4)] backdrop-blur-xl",
  coachIconBox: "bg-gradient-to-br from-indigo-50 to-violet-100 border-indigo-200 text-indigo-600",
  coachLabel: "text-violet-600",
  coachText: "text-slate-700",
  chipStrong: "bg-emerald-50 text-emerald-700 border-emerald-200",
  chipWeak: "bg-rose-50 text-rose-700 border-rose-200",

  tabActive:
    "bg-white border-violet-200 text-violet-700 shadow-[0_10px_24px_-10px_rgba(124,58,237,0.45)]",
  tabIdle:
    "bg-white/70 border-white/80 text-slate-500 backdrop-blur-md hover:bg-white hover:text-violet-700 hover:border-violet-200",
  tabBar: "bg-violet-500",
  tabDesc: "text-slate-400",

  panel:
    "border-white/80 bg-gradient-to-br from-white/85 via-white/70 to-indigo-50/60 shadow-[0_18px_50px_-22px_rgba(99,102,241,0.4)] backdrop-blur-xl",
  panelTitle: "text-slate-900",
  panelHeadBorder: "border-slate-200/70",
  dotCyan: "bg-cyan-500",
  dotIndigo: "bg-violet-500",
  dotEmerald: "bg-emerald-500",

  axisStroke: "#64748b",
  cursorFill: "rgba(139,92,246,0.08)",
  gridStroke: "#c7d2fe",
  angleTick: "#475569",
  radiusTick: "#94a3b8",
  radarStroke: "#7c3aed",
  radarFill: "#8b5cf6",
  areaStop: "#8b5cf6",
  barTop: "#a78bfa",
  barBottom: "#4f46e5",
  tooltipBox: "bg-white border-indigo-100 shadow-[0_14px_36px_-12px_rgba(99,102,241,0.45)] backdrop-blur-md",
  tooltipName: "text-slate-800",
  tooltipAcc: "text-violet-600",
  tooltipSub: "text-slate-500",

  chapterCard: "border-indigo-100 bg-white/80",
  chapterName: "text-slate-800",
  progressTrack: "bg-indigo-100/70",
  chapterStatLabel: "text-slate-500",
  chapterStatStrong: "text-slate-800",
  statusHigh: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", progress: "bg-emerald-500" },
  statusMid: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", progress: "bg-amber-500" },
  statusLow: { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", progress: "bg-rose-500" },

  select: "bg-white border-slate-200 text-slate-700 focus:border-violet-400",
  helpText: "text-slate-500",
  helpStrong: "text-slate-800",
  scrollbar: "scrollbar-thin scrollbar-thumb-indigo-200",
  emptyText: "text-slate-400",
  treeCard: "border-indigo-100 bg-white/80",
  treeEyebrow: "text-slate-400",
  sectionChip: "text-slate-600 bg-indigo-50 border-indigo-100",
  treeName: "text-slate-800",
  treeMiniStat: "text-slate-400",
  treeTopicWrap: "border-indigo-100",
  topicTagged: "text-slate-700",
  topicUntagged: "text-slate-400",
  topicStat: "text-slate-600",
  topicMiniStat: "text-slate-400",
  toneHigh: "text-emerald-700 border-emerald-200 bg-emerald-50",
  toneMid: "text-amber-700 border-amber-200 bg-amber-50",
  toneLow: "text-rose-700 border-rose-200 bg-rose-50",
};

function AnalyticMetricCard({ title, value, subtext, icon: Icon, colorClass, delay, skin }: {
  title: string; value: string | number; subtext: string; icon: any; colorClass: string; delay: number; skin: Skin;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 90, delay }}
      whileHover={{ y: -4, scale: 1.01 }}
      className={`relative overflow-hidden rounded-xl border p-5 transition-all duration-200 group ${skin.metricCard}`}
    >
      <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${colorClass}`} />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={`text-[11px] font-mono font-bold uppercase tracking-wider ${skin.metricTitle}`}>{title}</p>
          <h3 className={`text-2xl font-black font-mono ${skin.metricValue}`}>{value}</h3>
          <p className={`text-[11px] font-medium ${skin.metricSub}`}>{subtext}</p>
        </div>
        <div className={`p-2.5 rounded-lg border transition-colors ${skin.metricIconBox}`}>
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
  const { theme } = useTheme();
  const s = theme.mode === "dark" ? DARK_SKIN : LIGHT_SKIN;

  const [activeTab, setActiveTab] = useState<"overview" | "radar" | "chapters" | "all_topics">("overview");
  const [chapterFilter, setChapterFilter] = useState<string>("all"); // chapter key
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  const diagnostics = useMemo(() => {
    const safeAnswersMatrix = answersMatrix || {};
    const safeQuestions = questions || [];
    const taxonomy = resolveTaxonomy(safeQuestions);

    const sectionStats: Record<string, Counter> = {};
    const chapterMap = new Map<string, {
      key: string; name: string; tagged: boolean; sections: Set<string>;
      c: Counter; topics: Map<string, { key: string; name: string; tagged: boolean; c: Counter }>;
    }>();

    const overall = mkCounter();

    safeQuestions.forEach((q, i) => {
      if (!q) return;
      const tx = taxonomy[i];
      const sectionName = (q.section || "").trim() || "General Subject";
      const verdict = getVerdict(safeAnswersMatrix[q.id], q.correct_option);

      const bump = (c: Counter) => {
        c.total += 1;
        if (verdict === "correct") c.correct += 1;
        else if (verdict === "wrong") c.wrong += 1;
        else c.skipped += 1;
      };

      bump(overall);

      if (!sectionStats[sectionName]) sectionStats[sectionName] = mkCounter();
      bump(sectionStats[sectionName]);

      let ch = chapterMap.get(tx.chapterKey);
      if (!ch) {
        ch = {
          key: tx.chapterKey, name: tx.chapterName, tagged: tx.chapterTagged,
          sections: new Set<string>(), c: mkCounter(), topics: new Map(),
        };
        chapterMap.set(tx.chapterKey, ch);
      }
      ch.sections.add(sectionName);
      bump(ch.c);

      let tp = ch.topics.get(tx.topicKey);
      if (!tp) {
        tp = { key: tx.topicKey, name: tx.topicName, tagged: tx.topicTagged, c: mkCounter() };
        ch.topics.set(tx.topicKey, tp);
      }
      bump(tp.c);
    });

    const totalCorrect = overall.correct;
    const totalWrong = overall.wrong;
    const totalUnattempted = overall.skipped;
    const attempted = totalCorrect + totalWrong;
    const attemptedAccuracy = attempted > 0 ? Math.round((totalCorrect / attempted) * 100) : 0;

    const sectionMetrics = Object.entries(sectionStats)
      .map(([name, c]) => ({ name, total: c.total, correct: c.correct, accuracy: accOf(c) }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const allChapters = Array.from(chapterMap.values()).map((ch) => ({
      key: ch.key,
      name: ch.name,
      tagged: ch.tagged,
      sections: Array.from(ch.sections),
      total: ch.c.total,
      correct: ch.c.correct,
      wrong: ch.c.wrong,
      skipped: ch.c.skipped,
      accuracy: accOf(ch.c),
      topics: Array.from(ch.topics.values())
        .map((t) => ({
          key: t.key, name: t.name, tagged: t.tagged,
          total: t.c.total, correct: t.c.correct, wrong: t.c.wrong, skipped: t.c.skipped,
          accuracy: accOf(t.c),
        }))
        // untagged topic last, then weakest first
        .sort((a, b) => Number(!a.tagged) - Number(!b.tagged) || a.accuracy - b.accuracy),
    }));

    // Chapters used for the "Top Scoring Chapters" tab and the coach advice:
    // only real (tagged) chapters; fall back to everything if nothing is tagged.
    const taggedChapters = allChapters.filter((c) => c.tagged);
    const rankedChapters = (taggedChapters.length > 0 ? taggedChapters : allChapters)
      .slice()
      .sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);

    // Breakdown tab: weakest first, untagged last
    const chapterTree = allChapters
      .slice()
      .sort((a, b) => Number(!a.tagged) - Number(!b.tagged) || a.accuracy - b.accuracy);

    // Weakest real topic (has at least one miss)
    const weak: { topic: { name: string; chapter: string; accuracy: number } | null } = { topic: null };
    taggedChapters.forEach((ch) => {
      ch.topics.forEach((t) => {
        if (!t.tagged || t.wrong + t.skipped === 0) return;
        if (!weak.topic || t.accuracy < weak.topic.accuracy) {
          weak.topic = { name: t.name, chapter: ch.name, accuracy: t.accuracy };
        }
      });
    });
    const weakTopic = weak.topic;

    const strongArea = rankedChapters[0]?.name || "N/A";
    const weakArea = rankedChapters[rankedChapters.length - 1]?.name || "N/A";
    const overallAccuracy = safeQuestions.length > 0 ? Math.round((totalCorrect / safeQuestions.length) * 100) : 0;

    let strategicInsight = "Keep track of how much time you spend on each section to improve your speed.";
    if (overallAccuracy >= 75) {
      strategicInsight = `Great job! Your accuracy is excellent. You are doing fantastic in '${strongArea}', which will help you score well. Just practice a little bit more in '${weakArea}' to get an even better overall rank!`;
    } else if (overallAccuracy >= 50) {
      strategicInsight = `Good effort! Your score is on the right track. You are doing well in '${strongArea}', but you need to practice more timed tests and extra questions in '${weakArea}' to safely clear the exam cutoffs.`;
    } else if (safeQuestions.length > 0) {
      strategicInsight = `Your current score is a bit lower than the standard exam cutoffs. Don't worry! Start by clearing your basic concepts in '${weakArea}' first, and then practice short, timed quizzes every day to build your speed.`;
    }
    if (weakTopic) {
      strategicInsight += ` Within it, begin with the topic '${weakTopic.name}' (${weakTopic.chapter}) — you scored ${weakTopic.accuracy}% there.`;
    }

    const sectionNames = Array.from(new Set(allChapters.flatMap((c) => c.sections)));

    return {
      sectionMetrics,
      chapterMetrics: rankedChapters,
      chapterTree,
      sectionNames,
      totalCorrect,
      totalWrong,
      totalUnattempted,
      attemptedAccuracy,
      strategicInsight,
      strongArea,
      weakArea,
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
        <div className={`border rounded-lg p-3 ${s.tooltipBox}`}>
          <p className={`text-xs font-bold mb-1 ${s.tooltipName}`}>{payload[0].payload.name}</p>
          <div className="space-y-0.5 text-[11px] font-mono">
            <p className={s.tooltipAcc}>Accuracy: <span className="font-bold">{payload[0].value}%</span></p>
            <p className={s.tooltipSub}>Correct: {payload[0].payload.correct} / {payload[0].payload.total}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const visibleTree = diagnostics.chapterTree.filter(
    (c) =>
      (chapterFilter === "all" || c.key === chapterFilter) &&
      (sectionFilter === "all" || c.sections.includes(sectionFilter))
  );
  const chapterFilterOptions = diagnostics.chapterTree.filter(
    (c) => sectionFilter === "all" || c.sections.includes(sectionFilter)
  );

  return (
    <div className="space-y-6 antialiased">
      {/* Counters Tiles */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <AnalyticMetricCard 
          title="Overall Accuracy" 
          value={`${Math.round((diagnostics.totalCorrect / questions.length) * 100)}%`}
          subtext={`Of attempted questions: ${diagnostics.attemptedAccuracy}%`}
          icon={Target}
          colorClass="from-cyan-500 to-blue-600"
          delay={0.05}
          skin={s}
        />
        <AnalyticMetricCard 
          title="Correct Answers" 
          value={`${diagnostics.totalCorrect} Qs`}
          subtext="Total right answers"
          icon={Award}
          colorClass="from-emerald-500 to-teal-600"
          delay={0.1}
          skin={s}
        />
        <AnalyticMetricCard 
          title="Wrong Answers" 
          value={`${diagnostics.totalWrong} Qs`}
          subtext="Loses marks (-0.25 penalty)"
          icon={ShieldAlert}
          colorClass="from-rose-500 to-red-600"
          delay={0.15}
          skin={s}
        />
        <AnalyticMetricCard 
          title="Left / Unattempted" 
          value={`${diagnostics.totalUnattempted} Qs`}
          subtext="Questions skipped (no marks lost)"
          icon={Zap}
          colorClass="from-amber-500 to-orange-600"
          delay={0.2}
          skin={s}
        />
      </div>

      {/* Practical Smart Feedback Panel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden rounded-xl border p-4 ${s.coachPanel}`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 relative z-10">
          <div className={`p-2 rounded-lg border ${s.coachIconBox}`}>
            <BrainCircuit size={20} />
          </div>
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${s.coachLabel}`}>
                <Sparkles size={11} /> Anushiva AIGuruji — Your Exam Coach Advice
              </span>
            </div>
            <p className={`text-xs font-medium leading-relaxed ${s.coachText}`}>
              {diagnostics.strategicInsight}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap text-[10px] font-mono font-bold mt-2 md:mt-0">
            <span className={`px-2 py-0.5 rounded border ${s.chipStrong}`}>
              Your Strongest Chapter: {diagnostics.strongArea}
            </span>
            <span className={`px-2 py-0.5 rounded border ${s.chipWeak}`}>
              Needs Improvement: {diagnostics.weakArea}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Primary Chart Area Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Navigation Sidebar Tabs */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          {[
            { id: "overview", label: "Section Progress", desc: "Compare accuracy across subjects", icon: BarChart3 },
            { id: "radar", label: "Subject Balance Tracker", desc: "Check if your layout is balanced", icon: Target },
            { id: "chapters", label: "Top Scoring Chapters", desc: "Your highest performing chapters", icon: Activity },
            { id: "all_topics", label: "Chapter → Topic Breakdown", desc: "Every chapter with its topics inside", icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 relative ${
                  isSelected ? s.tabActive : s.tabIdle
                }`}
              >
                {isSelected && <div className={`absolute left-0 top-1/4 h-1/2 w-[2px] rounded-r ${s.tabBar}`} />}
                <Icon size={16} />
                <div>
                  <p className="text-xs font-bold tracking-wide">{tab.label}</p>
                  <p className={`text-[10px] ${s.tabDesc}`}>{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Display Projection Panel Box */}
        <div className={`lg:col-span-9 min-h-[350px] rounded-xl border p-5 flex flex-col justify-between relative overflow-hidden ${s.panel}`}>
          {activeTab === "overview" && (
            <div className="w-full h-full flex flex-col flex-1 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${s.panelTitle}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dotCyan}`} /> Section Accuracy Chart
                </h4>
              </div>
              <div className="w-full flex-1 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={diagnostics.sectionMetrics} margin={{ top: 15, right: 5, bottom: 15, left: -25 }}>
                    <XAxis dataKey="name" stroke={s.axisStroke} fontSize={10} tickLine={false} />
                    <YAxis stroke={s.axisStroke} fontSize={10} domain={[0, 100]} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: s.cursorFill }} />
                    <Area type="monotone" dataKey="accuracy" fill="url(#accuracyGrad)" stroke="none" opacity={0.2} />
                    <Bar dataKey="accuracy" barSize={16} fill="url(#barGrad)" radius={[3, 3, 0, 0]} />
                    <defs>
                      <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.areaStop} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={s.areaStop} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.barTop}/>
                        <stop offset="100%" stopColor={s.barBottom}/>
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
                <h4 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${s.panelTitle}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dotIndigo}`} /> Subject Balance Distribution
                </h4>
              </div>
              <div className="w-full flex-1 min-h-[260px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={diagnostics.sectionMetrics}>
                    <PolarGrid stroke={s.gridStroke} />
                    <PolarAngleAxis dataKey="name" tick={{ fill: s.angleTick, fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: s.radiusTick, fontSize: 8 }} />
                    <Radar name="Section Balance" dataKey="accuracy" stroke={s.radarStroke} fill={s.radarFill} fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "chapters" && (
            <div className="w-full h-full flex flex-col flex-1 space-y-3">
              <div className={`flex justify-between items-center border-b pb-1.5 ${s.panelHeadBorder}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${s.panelTitle}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dotEmerald}`} /> Top Performing Chapters
                </h4>
              </div>
              
              <motion.div 
                variants={containerVariants} initial="hidden" animate="show"
                className={`grid gap-3 grid-cols-1 sm:grid-cols-2 overflow-y-auto max-h-[260px] pr-1 ${s.scrollbar}`}
              >
                {diagnostics.chapterMetrics.slice(0, 4).map((item) => {
                  const isHigh = item.accuracy >= 75;
                  const isMid = item.accuracy >= 50 && item.accuracy < 75;
                  const StatusIcon = isHigh ? CheckCircle : isMid ? AlertTriangle : XOctagon;
                  
                  const statusTheme = isHigh ? s.statusHigh : isMid ? s.statusMid : s.statusLow;

                  return (
                    <motion.div 
                      key={item.key} variants={itemVariants}
                      className={`p-3 rounded-lg border flex flex-col justify-between space-y-2 ${s.chapterCard}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-xs font-bold truncate max-w-[75%] ${s.chapterName}`}>
                          {item.name}
                        </span>
                        <div className={`flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${statusTheme.text} ${statusTheme.bg} ${statusTheme.border}`}>
                          <StatusIcon size={10} />
                          {item.accuracy}%
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className={`w-full h-1 rounded-full overflow-hidden ${s.progressTrack}`}>
                          <div className={`h-full ${statusTheme.progress}`} style={{ width: `${item.accuracy}%` }} />
                        </div>
                        <div className={`text-[10px] font-mono flex justify-between ${s.chapterStatLabel}`}>
                          <span>Correct: <strong className={s.chapterStatStrong}>{item.correct}</strong> / {item.total}</span>
                          <span>{item.wrong} Wrong · {item.skipped} Left</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}

          {/* Chapter -> Topic hierarchy */}
          {activeTab === "all_topics" && (
            <div className="w-full h-full flex flex-col flex-1 space-y-3">
              <div className={`flex justify-between items-center border-b pb-1 gap-2 flex-wrap ${s.panelHeadBorder}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${s.panelTitle}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dotCyan}`} /> Chapters & Topics (weakest first)
                </h4>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {diagnostics.sectionNames.length > 1 && (
                    <select
                      value={sectionFilter}
                      onChange={(e) => { setSectionFilter(e.target.value); setChapterFilter("all"); }}
                      className={`border text-[11px] font-mono rounded px-2 py-1 outline-none ${s.select}`}
                    >
                      <option value="all">All sections</option>
                      {diagnostics.sectionNames.map((sec) => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  )}
                  <select
                    value={chapterFilter}
                    onChange={(e) => setChapterFilter(e.target.value)}
                    className={`border text-[11px] font-mono rounded px-2 py-1 outline-none max-w-[200px] ${s.select}`}
                  >
                    <option value="all">All chapters</option>
                    {chapterFilterOptions.map((c) => (
                      <option key={c.key} value={c.key}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className={`text-[10px] ${s.helpText}`}>
                A <span className={`font-bold ${s.helpStrong}`}>chapter</span> is the big unit; the <span className={`font-bold ${s.helpStrong}`}>topics</span> listed under it are its smaller parts. Same chapter / topic is always counted together.
              </p>

              <motion.div
                variants={containerVariants} initial="hidden" animate="show"
                className={`space-y-3 overflow-y-auto max-h-[260px] pr-1 ${s.scrollbar}`}
              >
                {visibleTree.length === 0 && (
                  <div className={`text-[11px] italic ${s.emptyText}`}>No chapters match this filter.</div>
                )}
                {visibleTree.map((c) => {
                  const tone =
                    c.accuracy >= 75 ? s.toneHigh
                    : c.accuracy >= 50 ? s.toneMid
                    : s.toneLow;
                  return (
                    <motion.div
                      key={c.key} variants={itemVariants}
                      className={`rounded-lg border p-2.5 space-y-2 ${s.treeCard}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className={`text-[9px] font-mono uppercase tracking-widest flex items-center gap-1.5 flex-wrap ${s.treeEyebrow}`}>
                            <span>Chapter</span>
                            {c.sections.map((sec) => (
                              <span key={sec} className={`normal-case tracking-normal border px-1 rounded ${s.sectionChip}`}>{sec}</span>
                            ))}
                          </div>
                          <div className={`text-xs font-bold truncate ${s.treeName}`}>{c.name}</div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded border ${tone}`}>
                            {c.correct}/{c.total} · {c.accuracy}%
                          </span>
                          <span className={`text-[9px] font-mono ${s.treeMiniStat}`}>✗{c.wrong} · –{c.skipped}</span>
                        </div>
                      </div>
                      <div className={`space-y-1 pl-3 border-l ${s.treeTopicWrap}`}>
                        {c.topics.map((t) => (
                          <div key={t.key} className="flex items-center justify-between gap-3 text-[11px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.accuracy >= 75 ? "bg-emerald-500" : t.accuracy >= 50 ? "bg-amber-400" : "bg-rose-500"}`} />
                              <span className={`truncate ${t.tagged ? s.topicTagged : `${s.topicUntagged} italic`}`}>{t.name}</span>
                            </div>
                            <span className={`font-mono shrink-0 ${s.topicStat}`}>
                              {t.correct}/{t.total} · {t.accuracy}%
                              <span className={`ml-1.5 text-[9px] ${s.topicMiniStat}`}>✗{t.wrong} –{t.skipped}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}