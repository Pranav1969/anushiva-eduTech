"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BookOpen, GraduationCap } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { authManager, StudentSession } from "@/utils/auth";

// Component Injections
import DashboardHeader from "./components/DashboardHeader";
import RecentAssignedTests from "./components/RecentAssignedTests";
import SectionTabs from "./components/SectionTabs";
import PerformanceOverview from "./components/PerformanceOverview";
import TestCard from "./components/TestCard";
import EmptyState from "./components/EmptyState";
import RevisionNotesTree from "./components/RevisionNotesTree";

export interface TestRecord {
  id: string;
  test_name: string;
  section_id: string;
  created_at: string;
  timer_type: string;
  userAttempt?: {
    id: string;
    score: number;
    total_questions: number;
    is_active_retest_granted: boolean;
    answers_matrix: Record<string, string>;
  };
}

export interface ChapterAnalysis {
  chapterName: string;
  sectionId: string;
  correct: number;
  total: number;
  accuracy: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reasoning-ability");
  const [globalChapterMetrics, setGlobalChapterMetrics] = useState<ChapterAnalysis[]>([]);
  
  // App Navigation Focus (Tests vs Notes Engine)
  const [dashboardFocus, setDashboardFocus] = useState<"assessments" | "notes">("assessments");
  const [courseContentTree, setCourseContentTree] = useState<any[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    const session = authManager.getSession();
    if (!session) {
      router.push("/student/login");
    } else {
      setStudent(session);
    }
  }, [router]);

  // Aggregate Knowledge Base Material Hierarchy
  const fetchStructuredNotesTree = async () => {
    setLoadingNotes(true);
    try {
      const { data: sections, error: secErr } = await supabase
        .from("notes_sections")
        .select(`
          id,
          name,
          exams ( name ),
          notes_chapters (
            id,
            name,
            sequence_order,
            notes_topics (
              id,
              name,
              sequence_order,
              paragraph_text
            )
          )
        `);
      
      if (secErr) throw secErr;
      
      // Sort tree components deterministically using sequence indices
      const structuredTree = (sections || []).map((sec: any) => ({
        ...sec,
        notes_chapters: (sec.notes_chapters || []).sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))
          .map((chap: any) => ({
            ...chap,
            notes_topics: (chap.notes_topics || []).sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))
          }))
      }));

      setCourseContentTree(structuredTree);
    } catch (err) {
      console.error("Notes Compilation Engine Fail:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  async function fetchStudentMatrix(studentId: string) {
    setLoading(true);
    try {
      const { data: assignments } = await supabase.from("assigned_tests").select("test_id").eq("student_id", studentId);
      const assignedIds = assignments?.map(a => a.test_id) || [];

      if (assignedIds.length === 0) {
        setTests([]);
        return;
      }

      const { data: testsData } = await supabase.from("tests").select("*").in("id", assignedIds).order("created_at", { ascending: false });
      const { data: attemptsData } = await supabase.from("attempts").select("*").eq("student_id", studentId);

      if (testsData) {
        const joined: TestRecord[] = testsData.map(t => {
          const match = attemptsData?.find(a => a.test_id === t.id && a.student_id === studentId);
          return {
            ...t,
            userAttempt: match 
              ? { 
                  id: match.id, 
                  score: match.score, 
                  total_questions: match.total_questions, 
                  is_active_retest_granted: match.is_active_retest_granted === true || String(match.is_active_retest_granted) === "true",
                  answers_matrix: match.answers_matrix || {}
                } 
              : undefined
          };
        });
        setTests(joined);

        // --- DYNAMIC DIAGNOSTIC TAG CALCULATION ENGINE ---
        const completed = joined.filter(t => t.userAttempt);
        if (completed.length > 0) {
          const completedTestIds = completed.map(c => c.id);

          const { data: questionsData } = await supabase
            .from("questions")
            .select("id, test_id, chapter, section, correct_option")
            .in("test_id", completedTestIds);

          if (questionsData && questionsData.length > 0) {
            const rollupMap: Record<string, { correct: number; total: number; section: string }> = {};

            questionsData.forEach(q => {
              const testAttempt = completed.find(c => c.id === q.test_id)?.userAttempt;
              if (!testAttempt) return;

              const cleanChapter = q.chapter || "General Fundamentals";
              const cleanSection = q.section || "General";
              const userAns = (testAttempt.answers_matrix[q.id] || "").toLowerCase();
              const isCorrect = userAns === (q.correct_option || "").toLowerCase();

              if (!rollupMap[cleanChapter]) {
                rollupMap[cleanChapter] = { correct: 0, total: 0, section: cleanSection };
              }
              
              rollupMap[cleanChapter].total += 1;
              rollupMap[cleanChapter].correct += isCorrect ? 1 : 0;
            });

            const compiledMetrics: ChapterAnalysis[] = Object.entries(rollupMap).map(([chName, stats]) => ({
              chapterName: chName,
              sectionId: stats.section,
              correct: stats.correct,
              total: stats.total,
              accuracy: Math.round((stats.correct / stats.total) * 100)
            }));

            setGlobalChapterMetrics(compiledMetrics);
          }
        }
      }
    } catch (err) {
      console.error("Diagnostic Fetch Failed:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (student?.id) {
      fetchStudentMatrix(student.id);
      fetchStructuredNotesTree();
    }
  }, [student]);

  const toggleChapterAccordion = (chapterId: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const handleLogout = () => {
    authManager.logout();
    router.push("/student/login");
  };

  const getSectionCountsMap = () => {
    const countsMap: Record<string, number> = {};
    tests.forEach(t => {
      countsMap[t.section_id] = (countsMap[t.section_id] || 0) + 1;
    });
    return countsMap;
  };

  const filteredTests = tests.filter(test => test.section_id === activeTab);
  const completedTests = tests.filter(t => t.userAttempt);
  
  const avgScore = completedTests.length > 0 
    ? Math.round((completedTests.reduce((acc, curr) => acc + ((curr.userAttempt!.score / curr.userAttempt!.total_questions) * 100), 0) / completedTests.length))
    : 0;

  if (!student) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <main className={`min-h-screen p-3 sm:p-4 md:p-6 relative overflow-x-hidden font-sans antialiased transition-all duration-500 ease-in-out ${dashboardFocus === "notes" ? "bg-[#FDFBF7]" : "bg-[#0F172A] text-[#F8FAFC]"}`}>
      
      {/* Visual background decoration for examination view */}
      {dashboardFocus === "assessments" && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 md:left-1/4 md:translate-x-0 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[500px] md:h-[500px] bg-[#312E81]/15 blur-[60px] sm:blur-[90px] md:blur-[120px] rounded-full pointer-events-none transition-opacity duration-500" />
      )}

      <div className="w-full mx-auto space-y-4 sm:space-y-5 relative z-10">
        
        {/* ANIMATED HEADER COLLAPSE: Shrinks down beautifully when reading notes to save huge space */}
        <div className={`transition-all duration-500 ease-in-out transform origin-top overflow-hidden ${
          dashboardFocus === "notes" ? "max-h-0 opacity-0 scale-y-95 pointer-events-none mb-0" : "max-h-[500px] md:max-h-[300px] opacity-100 scale-y-100 mb-1 sm:mb-2"
        }`}>
          <DashboardHeader student={student} onLogout={handleLogout} />
        </div>

        {/* Workspace Mode Sub-Navigation System */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-1 ${dashboardFocus === "notes" ? "border-stone-200" : "border-slate-800"}`}>
          <div className="flex flex-row items-center w-full sm:w-auto justify-start gap-3 md:gap-6 overflow-x-auto no-scrollbar scroll-smooth tracking-tight pb-1 sm:pb-0">
            <button 
              onClick={() => setDashboardFocus("assessments")} 
              className={`pb-2 sm:pb-3 text-[10px] xs:text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all duration-300 whitespace-nowrap ${
                dashboardFocus === "assessments" 
                  ? "border-blue-500 text-blue-400" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Examination Center
            </button>
            <button 
              onClick={() => setDashboardFocus("notes")} 
              className={`pb-2 sm:pb-3 text-[10px] xs:text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all duration-300 whitespace-nowrap ${
                dashboardFocus === "notes" 
                  ? "border-amber-700 text-amber-800" 
                  : "border-transparent text-slate-400 hover:text-slate-500"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Revision Notes Module
            </button>
          </div>

          {/* Quick exit option from focus notes view */}
          {dashboardFocus === "notes" && (
            <button 
              onClick={() => setDashboardFocus("assessments")}
              className="text-[10px] sm:text-xs font-medium text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-2.5 py-1.5 sm:px-3 rounded-lg transition-all duration-200 self-end sm:self-auto sm:mr-2 mb-1 sm:mb-0"
            >
              Back to Dashboard &rarr;
            </button>
          )}
        </div>

        {/* FOCUS VIEW SWITCHER INTERFACE BRANCHES */}
        {dashboardFocus === "assessments" ? (
          <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
            {!loading && <RecentAssignedTests tests={tests} />}

            {!loading && (
              <PerformanceOverview 
                completed={completedTests.length} 
                total={tests.length} 
                avgScore={avgScore} 
                chapterMetrics={globalChapterMetrics}
              />
            )}

            <SectionTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              testsCountMap={getSectionCountsMap()} 
            />

            {loading ? (
              <div className="text-center py-12 sm:py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-[#2563EB] h-7 w-7 sm:h-8 sm:w-8" />
                <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-semibold animate-pulse px-4 text-center">Filtering Target Assignments...</span>
              </div>
            ) : filteredTests.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 animate-in fade-in duration-300">
                {filteredTests.map(t => (
                  <TestCard key={t.id} test={t} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full px-1 sm:px-2 md:px-0 mx-auto max-w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <RevisionNotesTree 
              loadingNotes={loadingNotes}
              courseContentTree={courseContentTree}
              expandedChapters={expandedChapters}
              onToggleChapter={toggleChapterAccordion}
            />
          </div>
        )}
      </div>
    </main>
  );
}