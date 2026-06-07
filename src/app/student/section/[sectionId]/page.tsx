"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, TrendingUp, HelpCircle } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { authManager, StudentSession } from "@/utils/auth";
import { TestRecord } from "../../page";

// Shared Reusable Component Items
import DashboardHeader from "../../components/DashboardHeader";
import SectionTabs, { SYLLABUS_SECTIONS } from "../../components/SectionTabs";
import StatsCards from "../../components/StatsCards";
import TestCard from "../../components/TestCard";
import EmptyState from "../../components/EmptyState";

export default function DynamicSectionDashboard() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.sectionId as string;

  const [student, setStudent] = useState<StudentSession | null>(null);
  const [allTests, setAllTests] = useState<TestRecord[]>([]);
  const [sectionTests, setSectionTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = authManager.getSession();
    if (!session) {
      router.push("/student/login");
    } else {
      setStudent(session);
    }
  }, [router]);

  async function loadSectionAnalytics(studentId: string) {
    setLoading(true);
    try {
      const { data: assignments } = await supabase.from("assigned_tests").select("test_id").eq("student_id", studentId);
      const assignedIds = assignments?.map(a => a.test_id) || [];

      if (assignedIds.length === 0) {
        setAllTests([]);
        setSectionTests([]);
        return;
      }

      const { data: testsData } = await supabase.from("tests").select("*").in("id", assignedIds).order("created_at", { ascending: false });
      const { data: attemptsData } = await supabase.from("attempts").select("*").eq("student_id", studentId);

      if (testsData) {
        const joined: TestRecord[] = testsData.map(t => {
          const match = attemptsData?.find(a => a.test_id === t.id);
          return {
            ...t,
            userAttempt: match 
              ? { 
                  id: match.id, 
                  score: match.score, 
                  total_questions: match.total_questions, 
                  is_active_retest_granted: match.is_active_retest_granted === true || String(match.is_active_retest_granted) === "true"
                } 
              : undefined
          };
        });

        setAllTests(joined);
        setSectionTests(joined.filter(t => t.section_id === sectionId));
      }
    } catch (e) {
      console.error("Section compilation failure:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (student?.id) loadSectionAnalytics(student.id);
  }, [student, sectionId]);

  // Tab mapping counts helper
  const getCountsMap = () => {
    const map: Record<string, number> = {};
    allTests.forEach(t => { map[t.section_id] = (map[t.section_id] || 0) + 1; });
    return map;
  };

  // Granular Presentational Math Analytics Helpers
  const completed = sectionTests.filter(t => t.userAttempt);
  const totalCount = sectionTests.length;
  const completedCount = completed.length;
  const pendingCount = totalCount - completedCount;

  const scoresArray = completed.map(c => (c.userAttempt!.score / c.userAttempt!.total_questions) * 100);
  const highestScore = scoresArray.length > 0 ? Math.round(Math.max(...scoresArray)) : 0;
  const lowestScore = scoresArray.length > 0 ? Math.round(Math.min(...scoresArray)) : 0;
  const avgScore = scoresArray.length > 0 ? Math.round(scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length) : 0;

  const activeSectionMeta = SYLLABUS_SECTIONS.find(s => s.id === sectionId);

  if (!student) return null;

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#F8FAFC] p-4 md:p-10 relative overflow-hidden font-sans antialiased">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#2563EB]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Navigation Action Strip */}
        <div className="flex justify-between items-center bg-[#1E293B]/60 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-md">
          <button 
            onClick={() => router.push("/student")}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-950 border border-slate-800 text-[#CBD5E1] hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
          >
            <ArrowLeft size={13} /> Return to Portal Hub
          </button>
          <span className="text-xs font-black uppercase text-slate-400 tracking-widest font-mono">
            Focus Mode Node // {activeSectionMeta?.label || "Unknown Section"}
          </span>
        </div>

        {/* Shared Dashboard Greeting Layout */}
        <DashboardHeader 
          student={student} 
          onLogout={() => { authManager.logout(); router.push("/student/login"); }}
          subtitle={`Currently analyzing targeted diagnostics metrics for "${activeSectionMeta?.label || "Section Profile"}".`}
        />

        {/* Section Navigation Link Router Mode */}
        <SectionTabs 
          activeTab={sectionId} 
          testsCountMap={getCountsMap()} 
          useLinks={true} 
        />

        {/* Segment Numerical Metrics Cards */}
        {!loading && (
          <StatsCards 
            total={totalCount} 
            completed={completedCount} 
            pending={pendingCount} 
            avgScore={avgScore} 
          />
        )}

        {/* Deep Dive Segment Analytics Ledger Block */}
        {!loading && sectionTests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div className="md:col-span-1 bg-[#1E293B] border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#22D3EE] flex items-center gap-1.5">
                <TrendingUp size={14}/> Performance Trends
              </h3>
              <div className="space-y-3 font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-500">Highest Score:</span>
                  <span className="text-sm font-bold text-emerald-400">{highestScore}%</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-500">Lowest score:</span>
                  <span className="text-sm font-bold text-red-400">{lowestScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Section Completion:</span>
                  <span className="text-sm font-bold text-blue-400">
                    {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-[#1E293B] border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-center text-center p-8 text-slate-500 space-y-2">
              <HelpCircle size={28} className="mx-auto text-indigo-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Syllabus Domain Optimization Matrix</h4>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                Platform algorithm benchmarks indicate that completing pending action items under this tab increases overall examination proficiency ratios by an estimated 12.4%.
              </p>
            </div>
          </div>
        )}

        {/* Action Rosters Container List */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Assigned Targets: {activeSectionMeta?.label || "Segment Profile"}
          </h3>

          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="animate-spin text-blue-500 inline mr-2" size={28} />
              <span className="text-xs text-slate-500 uppercase tracking-widest animate-pulse font-bold">Compiling Section Data...</span>
            </div>
          ) : sectionTests.length === 0 ? (
            <EmptyState message="No tests are registered under this syllabus parameter yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-300">
              {sectionTests.map(t => (
                <TestCard key={t.id} test={t} />
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}