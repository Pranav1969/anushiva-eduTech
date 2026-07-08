// src/app/student/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BookOpen, GraduationCap, Lock, Newspaper } from "lucide-react";// Import Lock for visual gating indicators [cite: 2]
import { supabase } from "@/utils/supabase";
import { authManager, StudentSession } from "@/utils/auth"; // Import Session profiles [cite: 3]

// Component Injections
import DashboardHeader from "./components/DashboardHeader";
import RecentAssignedTests from "./components/RecentAssignedTests";
import SectionTabs from "./components/SectionTabs"; // Subheading elements mapping engine links [cite: 4]
import PerformanceOverview from "./components/PerformanceOverview";
import TestCard from "./components/TestCard";
import EmptyState from "./components/EmptyState";
import RevisionNotesTree from "./components/RevisionNotesTree";
import PlanUpgradeModal from "./components/PlanUpgradeModal"; // New components import link [cite: 5]

export interface TestRecord {
  id: string;
  test_name: string;
  section_id: string;
  created_at: string; // Time matrix values tracking keys [cite: 6]
  timer_type: string;
  duration_minutes?: number; // Exposing dynamic template value parsing metrics properties
  exam_id?: string;
  is_priority?: boolean; // Added tracking flag to distinguish manual priority assignments
  required_plan: "free" | "premium"; // Explicit structural map mirroring your postgres domain enum type [cite: 7]
  is_locked?: boolean; // Appending runtime property flag to protect examination routes [cite: 8]
  userAttempt?: {
    id: string;
    score: number;
    total_questions: number; // Question metadata parameters metric metrics [cite: 9]
    is_active_retest_granted: boolean;
    answers_matrix: Record<string, string>;
  };
}

export interface ChapterAnalysis {
  chapterName: string;
  sectionId: string;
  correct: number;
  total: number; // Correct compilation metrics keys tracker [cite: 10]
  accuracy: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null); // Validation instance references [cite: 11]
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reasoning-ability");
  const [globalChapterMetrics, setGlobalChapterMetrics] = useState<ChapterAnalysis[]>([]); // Diagnosis states matrix metrics [cite: 12]
  
  // App Navigation Focus (Tests vs Notes Engine)
  const [dashboardFocus, setDashboardFocus] = useState<"assessments" | "notes">("assessments"); // Framework focus mode [cite: 13]
  const [courseContentTree, setCourseContentTree] = useState<any[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Upgrade Modal Interactive Tracking State Hooks
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false); // Active state visibility trackers [cite: 14]
  const [selectedRequiredPlan, setSelectedRequiredPlan] = useState("premium");

  useEffect(() => {
    const session = authManager.getSession();
    if (!session) {
      router.push("/student/login"); // Redirect to login fallback workspace [cite: 15]
    } else {
      setStudent(session);
    }
  }, [router]);

  // Aggregate Knowledge Base Material Hierarchy with Phased Navigation Schema
// Aggregate Knowledge Base Material Hierarchy with Phased Navigation Schema
  // Update the function definition to accept an optional examId string parameter
  const fetchStructuredNotesTree = async (examId?: string) => {
    setLoadingNotes(true);
    try {
let query = supabase
  .from("notes_sections")
  .select(`
    id,
    name_en,
    name_hi,
    name_mr,
    exam_id,
    exams ( name ),
    notes_phases (
      id,
      name_en,
      name_hi,
      name_mr,
      sequence_order,
      notes_chapters (
        id,
        name_en,
        name_hi,
        name_mr,
        sequence_order,
        required_plan,
        notes_topics (
          id,
          name_en,
          name_hi,
          name_mr,
          sequence_order,
          paragraph_text_en,
          paragraph_text_hi,
          paragraph_text_mr
        )
      )
    )
  `);
      
      // ✅ Filter notes sections by the student's registered exam ID
      if (examId) {
        query = query.eq("exam_id", examId);
      }

      const { data: sections, error: secErr } = await query;
      
      if (secErr) throw secErr;
      
      // Sort tree components deterministically using sequential order properties across all relational nodes
      const structuredTree = (sections || []).map((sec: any) => ({
        ...sec,
        notes_phases: (sec.notes_phases || []).sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))
          .map((phase: any) => ({
            ...phase,
            notes_chapters: (phase.notes_chapters || []).sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))
              .map((chap: any) => ({
                ...chap,
                notes_topics: (chap.notes_topics || []).sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))
              }))
          }))
      }));

      setCourseContentTree(structuredTree);
    } catch (err: any) {
      console.error("Notes Compilation Engine Fail:", err?.message || err?.details || err);
    } finally {
      setLoadingNotes(false);
    }
  };

  async function fetchStudentMatrix(studentId: string) {
    setLoading(true); // Setup tracking validation filters loader [cite: 24]
    try {
      // 1. Fetch Manually Assigned Tests
      const { data: assignments } = await supabase.from("assigned_tests").select("test_id").eq("student_id", studentId);
      const assignedIds = assignments?.map(a => a.test_id) || []; // Flatten relational mapping target elements data [cite: 25]

      // 2. Fetch the Student's Registered Exam Bucket Name Preference & Subscription Plan Matrix
      // 2. Fetch the Student's Registered Exam Bucket Name Preference & Subscription Plan Matrix
      // 2. Fetch the Student's Registered Exam Bucket Name Preference & Subscription Plan Matrix
      const { data: studentProfile } = await supabase
        .from("students")
        .select("id, name, username, exam, current_plan, current_session_token, state, district, gender")
        .eq("id", studentId)
        .single();
        
      let bucketTestIds: string[] = []; 
      const studentCurrentPlan = studentProfile?.current_plan || "free";

      // ✅ FIX: Sync the updated state and localStorage with the fresh plan from the database
      if (studentProfile) {
        const freshSession = {
          id: studentProfile.id,
          name: studentProfile.name,
          username: studentProfile.username,
          sessionToken: studentProfile.current_session_token || "",
          gender: studentProfile.gender,
          state: studentProfile.state,
          district: studentProfile.district,
          current_plan: studentProfile.current_plan 
        };
        setStudent(freshSession as any);
        localStorage.setItem("active_student_node", JSON.stringify(freshSession));
      }

      if (studentProfile?.exam) {
        // Resolve the UUID container matching the student's text profile key string
        const { data: examBucket } = await supabase 
          .from("exams")
          .select("id")
          .eq("name", studentProfile.exam)
          .single();

        if (examBucket) {
          // Fetch tests explicitly aligned inside this exam bucket
          const { data: bucketedTests } = await supabase 
            .from("tests")
            .select("id, exam_id")
            .eq("exam_id", examBucket.id);

          if (bucketedTests) {
            bucketTestIds = bucketedTests.map(t => t.id);
          }

          // ✅ Fetch structured notes filtered specifically for this exam bucket
          fetchStructuredNotesTree(examBucket.id);
        } else {
          // Fallback if the resolved exam isn't found in the database
          fetchStructuredNotesTree();
        }
      } else {
        // Fallback if the student has no registered exam on their profile
        fetchStructuredNotesTree();
      }

      // 3. Merge Manual Assignments with Exam Bucket Blueprints, eliminating duplicates
      const uniqueTargetTestIds = Array.from(new Set([...assignedIds, ...bucketTestIds])); // Filter clean tracking bounds [cite: 30]

      if (uniqueTargetTestIds.length === 0) {
        setTests([]); // Escape calculations routine loops safely inside void data layouts [cite: 31]
        return;
      }

      const { data: testsData } = await supabase.from("tests").select("*").in("id", uniqueTargetTestIds).order("created_at", { ascending: false }); // Database content aggregation queries [cite: 32]
      const { data: attemptsData } = await supabase.from("attempts").select("*").eq("student_id", studentId); // Dynamic relational metrics logs extraction pipeline [cite: 33]

      if (testsData) {
        const joined: TestRecord[] = testsData.map(t => {
          const match = attemptsData?.find(a => a.test_id === t.id && a.student_id === studentId);
          
                  // Gating logic evaluation rule: premium tiers open everything; free plan can ONLY access free resources.
                // Updated Hierarchical Security Resolution Loop Checks
              const normalizedStudent = (studentCurrentPlan?.toLowerCase() || "free") as "free" | "silver" | "gold" | "premium";
              const normalizedRequired = (t.required_plan?.toLowerCase() || "free") as "free" | "silver" | "gold" | "premium";

              const PLAN_HIERARCHY_MAP = { free: 1, silver: 2, gold: 3, premium: 4 }; 
              const studentWeight = PLAN_HIERARCHY_MAP[normalizedStudent] || 1;
              const requiredWeight = PLAN_HIERARCHY_MAP[normalizedRequired] || 1;

                  // If student weight is less than required, flag it as locked
              const isPlanLocked = studentWeight < requiredWeight; // Gating boolean logic matrix checkpoints evaluation rules [cite: 34]

          return {
            ...t,
            is_priority: assignedIds.includes(t.id), // Dynamically tag if the test originated from manual assignments
            is_locked: isPlanLocked, // Dynamic structural parameter mapping to enforce view gating interface layers
            userAttempt: match 
              ? { 
                  id: match.id, 
                  score: match.score, 
                  total_questions: match.total_questions, // Core metrics parameters allocation assignments tracking definitions [cite: 35]
                  is_active_retest_granted: match.is_active_retest_granted === true || String(match.is_active_retest_granted) === "true",
                  answers_matrix: match.answers_matrix || {} // Fallback empty structural objects interfaces mapping markers [cite: 36]
                } 
              : undefined
          };
        }); // Evaluation mapper arrays boundaries closures loop execution logic checkpoints [cite: 37]
        setTests(joined);

        // --- DYNAMIC DIAGNOSTIC TAG CALCULATION ENGINE ---
        const completed = joined.filter(t => t.userAttempt);
        if (completed.length > 0) { // Rollup operations entry validator limits trigger checkpoints [cite: 38]
          const completedTestIds = completed.map(c => c.id);

          const { data: questionsData } = await supabase // Downstream questions schema context parameters mappings queries extraction [cite: 39]
            .from("questions")
            .select("id, test_id, chapter, section, correct_option")
            .in("test_id", completedTestIds);

          if (questionsData && questionsData.length > 0) { // Validation loop checker parameters limits filters configurations [cite: 40]
            const rollupMap: Record<string, { correct: number; total: number; section: string }> = {}; // Allocation cache layers mapping arrays [cite: 41]

            questionsData.forEach(q => {
              const testAttempt = completed.find(c => c.id === q.test_id)?.userAttempt;
              if (!testAttempt) return;

              const cleanChapter = q.chapter || "General Fundamentals";
              const cleanSection = q.section || "General";
              const userAns = (testAttempt.answers_matrix[q.id] || "").toLowerCase(); // Answers criteria checking mapping conversion strategies [cite: 42]
              const isCorrect = userAns === (q.correct_option || "").toLowerCase();

              if (!rollupMap[cleanChapter]) {
                rollupMap[cleanChapter] = { correct: 0, total: 0, section: cleanSection };
              }
              
              rollupMap[cleanChapter].total += 1; // Append metric total execution steps [cite: 43]
              rollupMap[cleanChapter].correct += isCorrect ? 1 : 0;
            });

            const compiledMetrics: ChapterAnalysis[] = Object.entries(rollupMap).map(([chName, stats]) => ({
              chapterName: chName,
              sectionId: stats.section,
              correct: stats.correct,
              total: stats.total,
              accuracy: Math.round((stats.correct / stats.total) * 100) // Percentage accuracy computations rounding conversion pipelines [cite: 44]
            }));

            setGlobalChapterMetrics(compiledMetrics); // Deploy analytics states tracking layers vectors values configurations [cite: 45]
          }
        }
      }
    } catch (err) {
      console.error("Diagnostic Fetch Failed:", err);
    } finally {
      setLoading(false); // Close application loaders pipelines trackers instances variables safely [cite: 46]
    }
  }

  useEffect(() => {
    if (student?.id) {
      fetchStudentMatrix(student.id);
      // Removed fetchStructuredNotesTree() from here because it is now 
      // called dynamically inside fetchStudentMatrix(student.id) after the exam ID is found.
    }
  }, [student?.id]); // opacity ✅ Only re-run if the specific ID string changes, breaking the loop!

  // Updated to ensure only one single chapter is open at any time globally
  const toggleChapterAccordion = (chapterId: string) => {
    setExpandedChapters(prev => { // Structural closure handlers loop evaluation execution pipelines [cite: 47]
      const isCurrentlyOpen = !!prev[chapterId];
      // Close everything, then open the current one only if it wasn't already open
      return { [chapterId]: !isCurrentlyOpen };
    });
  }; // Closure mapping boundary [cite: 48]

  const handleLogout = () => {
    authManager.logout();
    router.push("/student/login");
  };

  const getSectionCountsMap = () => {
    const countsMap: Record<string, number> = {}; // Storage interface map assignment [cite: 49]
    tests.forEach(t => {
      countsMap[t.section_id] = (countsMap[t.section_id] || 0) + 1; // Compute dynamic aggregations value [cite: 50]
    });
    return countsMap; // Transmit map structure value vector endpoints back [cite: 51]
  };

  const filteredTests = tests.filter(test => test.section_id === activeTab);
  const completedTests = tests.filter(t => t.userAttempt);
  
  // Filter out any auto-fetched bucket records so ONLY admin manual individual/group entries show up in priority pipeline
  const priorityTestsOnly = tests.filter(t => t.is_priority); // Priority distribution records isolating criteria check logs mapping vectors [cite: 52]

  const avgScore = completedTests.length > 0 
    ? Math.round((completedTests.reduce((acc, curr) => acc + ((curr.userAttempt!.score / curr.userAttempt!.total_questions) * 100), 0) / completedTests.length)) // Core score rolling averages metric evaluation steps logic formulas [cite: 54]
    : 0;

  // Intercept access click event for locked configurations
  const handleLockedCardClick = (planName: string) => {
    setSelectedRequiredPlan(planName); // Lock model parameter variables updates setup routines execution mappings [cite: 55]
    setIsUpgradeOpen(true); // Toggle popover views modal trigger switcher states [cite: 56]
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  } // Structural runtime guards boundaries verification layer [cite: 57]

  return (
    <main className={`min-h-screen p-4 md:p-6 relative overflow-x-hidden font-sans antialiased transition-all duration-500 ease-in-out ${dashboardFocus === "notes" ? "bg-[#FDFBF7]" : "bg-[#0F172A] text-[#F8FAFC]"}`}>
      
      {/* Visual background decoration for examination view */}
      {dashboardFocus === "assessments" && (
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#312E81]/15 blur-[120px] rounded-full pointer-events-none transition-opacity duration-500" />
      )}

      <div className="w-full mx-auto space-y-5 relative z-10">
        
        {/* ANIMATED HEADER COLLAPSE: Shrinks down beautifully when reading notes to save huge space */}
        <div className={`transition-all duration-500 ease-in-out transform origin-top overflow-hidden ${
          dashboardFocus === "notes" ? "max-h-0 opacity-0 scale-y-95 pointer-events-none mb-0" : "max-h-[300px] opacity-100 scale-y-100 mb-2"
        }`}>
          <DashboardHeader student={student} onLogout={handleLogout} />
        </div>

        {/* Workspace Mode Sub-Navigation System */}
        {/* Workspace Mode Sub-Navigation System */}
<div className={`flex items-center justify-between border-b pb-1 ${dashboardFocus === "notes" ? "border-stone-200" : "border-slate-800"}`}>
  <div className="flex gap-6">
    <button 
      onClick={() => setDashboardFocus("assessments")} 
      className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all duration-300 ${
        dashboardFocus === "assessments" 
          ? "border-blue-500 text-blue-400" 
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      <GraduationCap className="w-4 h-4" /> Examination Center
    </button>
    
    <button 
      onClick={() => setDashboardFocus("notes")} 
      className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all duration-300 ${
        dashboardFocus === "notes" 
          ? "border-amber-700 text-amber-800" 
          : "border-transparent text-slate-400 hover:text-slate-500"
      }`}
    >
      <BookOpen className="w-4 h-4" /> Revision Notes Module
    </button>

    {/* NEW: Current Affairs Trigger Routing Action Link */}
    <button 
      onClick={() => router.push("/student/current-affairs")} 
      className="pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 border-transparent text-slate-400 hover:text-emerald-400 transition-all duration-300"
    >
      <Newspaper className="w-4 h-4" /> Current Affairs & GK
    </button>
  </div>

  {/* Quick exit option from focus notes view */}
  {dashboardFocus === "notes" && (
    <button 
      onClick={() => setDashboardFocus("assessments")}
      className="text-xs font-medium text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-lg transition-all duration-200 mr-2"
    >
      Back to Dashboard &rarr;
    </button>
  )}
</div>

        {/* FOCUS VIEW SWITCHER INTERFACE BRANCHES */}
        {dashboardFocus === "assessments" ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
            {/* Handing over only manually distributed tests to the Priority Work Pipeline */}
            {!loading && (
           <RecentAssignedTests 
              tests={priorityTestsOnly} 
              onLockedClick={handleLockedCardClick} 
              />
            )}

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
  <div className="text-center py-20 flex flex-col items-center justify-center gap-3">
    <Loader2 className="animate-spin text-[#2563EB]" size={32} />
    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold animate-pulse">Filtering Target Assignments...</span>
  </div>
) : filteredTests.length === 0 ? (
  <EmptyState />
) : (
  /* High-Density Responsive Grid Box Containers Matrix */
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 animate-in fade-in duration-300">
    {/* REPLACE OLD MAP CODES CLEANLY HERE */}
    {filteredTests.map((t) => (
      <div 
        key={t.id} 
        className="relative group transition-all duration-200 h-full"
        onClickCapture={(e) => {
          if (t.is_locked) {
            e.stopPropagation();
            e.preventDefault();
            setSelectedRequiredPlan(t.required_plan || "premium");
            setIsUpgradeOpen(true);
          }
        }}
      >
        {/* Visual overlay indicator if locked */}
        {t.is_locked && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[3px] border border-amber-500/30 rounded-xl z-20 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-950/70 transition-all p-2 text-center">
            <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-black/60 mb-1">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-black tracking-widest uppercase text-amber-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded shadow-md">
              Unlock {t.required_plan}
            </span>
          </div>
        )}
        
        {/* Render original test card component safely preserving all internals */}
        <TestCard test={t} />
      </div>
    ))}
  </div>
)}
          </div>
) : (
          <div className="w-full animate-in fade-in zoom-in-95 duration-300">
            <RevisionNotesTree 
              loadingNotes={loadingNotes}
              courseContentTree={courseContentTree}
              expandedChapters={expandedChapters}
              onToggleChapter={(chapterId) => {
                // 1. Look up the chapter structure to verify if authorized
                let targetChapter: any = null;
                for (const section of courseContentTree) {
                  for (const phase of (section.notes_phases || [])) {
                    const found = (phase.notes_chapters || []).find((c: any) => c.id === chapterId);
                    if (found) { targetChapter = found; break; }
                  }
                  if (targetChapter) break;
                }

                if (targetChapter) {
                  // ✅ Read directly from the current student session object or fallback safely to prevent variable matching issues
                  const studentActivePlan = (student as any)?.current_plan || "free";
                  const requiredPlan = targetChapter.required_plan || "free";
                  
                  const PLAN_MAP = { free: 1, silver: 2, gold: 3, premium: 4 };
                  const sWeight = PLAN_MAP[studentActivePlan as keyof typeof PLAN_MAP] || 1;
                  const rWeight = PLAN_MAP[requiredPlan as keyof typeof PLAN_MAP] || 1;

                  if (sWeight < rWeight) {
                    // Trigger upgrade popup blocking expansion handler route
                    setSelectedRequiredPlan(requiredPlan);
                    setIsUpgradeOpen(true);
                    return; // Abort accordion expansion toggle execution path
                  }
                }
                
                // Fall back to original core expansion toggle behavior if authorized
                toggleChapterAccordion(chapterId);
              }}
              studentPlan={(student as any)?.current_plan || "free"} // ✅ Securely passes the plan down safely
            />
          </div>
        )}
          </div>

      {/* Subscription Gating Interface Modal */}
      <PlanUpgradeModal 
        isOpen={isUpgradeOpen} 
        onClose={() => setIsUpgradeOpen(false)} 
        requiredPlan={selectedRequiredPlan} 
      />
    </main>
  );
}