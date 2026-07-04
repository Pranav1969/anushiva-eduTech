"use client";

  import { useEffect, useState } from "react";
  import { Loader2, Users, FolderPlus, UserPlus, Send, BarChart3, Database, BookOpen, ArrowLeft, ShieldCheck, Layers } from "lucide-react";
  import { supabase } from "@/utils/supabase";

  import AdminHeader from "./components/AdminHeader";
  import FormStudentOnboarding from "./components/FormStudentOnboarding";
  import FormEstablishGroup from "./components/FormEstablishGroup";
  import FormLinkStudentGroup from "./components/FormLinkStudentGroup";
  import FormDistributeTest from "./components/FormDistributeTest";
  import FormAddNotes from "./components/FormAddNotes";
  import FormManageTestPlans from "./components/FormManageTestPlans";
  import FormManageNotesPlans from "./components/FormManageNotesPlans";
  import FormManageExamBuckets from "./components/FormManageExamBuckets";
  import TestCatalogs from "./components/TestCatalogs";
  import AnalyticsMatrix from "./components/AnalyticsMatrix";

  export default function AdminDashboard() {
    const [tests, setTests] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFormTab, setActiveFormTab] = useState<"onboard" | "group" | "link" | "distribute" | "notes" | "plans" | "buckets">("onboard");
    const [selectedTestId, setSelectedTestId] = useState("");
    const [analytics, setAnalytics] = useState<any>(null);
    // ❌ DELETE THIS LINE FROM HERE:
    
const [planContext, setPlanContext] = useState<"tests" | "notes">("tests");

    const loadData = async () => {
      setLoading(true);
      try {
        const { data: tData } = await supabase.from("tests").select("*").order("created_at", { ascending: false });
        const { data: sData } = await supabase.from("students").select("*").order("created_at", { ascending: false });
        const { data: gData } = await supabase.from("groups").select("*").order("name", { ascending: true });
        
        if (tData) setTests(tData);
        if (sData) setStudents(sData);
        if (gData) setGroups(gData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const fetchAnalytics = async (testId: string) => {
      if (!testId) return;
      try {
        // 1. Collect students targeted via direct manual/group allocations
        const { data: assigned } = await supabase.from("assigned_tests").select("student_id").eq("test_id", testId);
        const manualAssignedIds = assigned?.map(a => a.student_id) || [];

        // 2. Identify the test context to see if it belongs to an auto-assigned exam bucket blueprint
        const { data: targetTest } = await supabase
          .from("tests")
          .select("exam_id")
          .eq("id", testId)
          .single();
        let bucketStudentIds: string[] = [];

        if (targetTest?.exam_id) {
          // Resolve the string key identifier representing this exam map
          const { data: examRecord } = await supabase
            .from("exams")
            .select("name")
            .eq("id", targetTest.exam_id)
            .single();
          if (examRecord?.name) {
            // Gather all profiles that automatically pull assignments from this bucket string reference
            const { data: matchedStudents } = await supabase
              .from("students")
              .select("id")
              .eq("exam", examRecord.name);
            if (matchedStudents) {
              bucketStudentIds = matchedStudents.map(s => s.id);
            }
          }
        }

        // 3. Form a unified collection of valid target students (Manual + Bucket allocations)
        const allEligibleStudentIds = Array.from(new Set([...manualAssignedIds, ...bucketStudentIds]));
        if (allEligibleStudentIds.length === 0) {
          setAnalytics({ assignedCount: 0, completedCount: 0, attempts: [] });
          return;
        }

        // 4. Retrieve performance history bound to our valid user collection mapping
        const { data: attempts } = await supabase
          .from("attempts")
          .select("score, total_questions, created_at, students(name, username)")
          .eq("test_id", testId)
          .in("student_id", allEligibleStudentIds);

        setAnalytics({
          assignedCount: allEligibleStudentIds.length,
          completedCount: attempts?.length || 0,
          attempts: attempts || []
        });
      } catch (err) {
        console.error("Failed to gather complete diagnostic matrix metrics:", err);
      }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
      if (selectedTestId) fetchAnalytics(selectedTestId);
    }, [selectedTestId]);

    // FULL WORKSPACE INTERCEPT FOR THE UPGRADED CMS NOTES FLOW
    if (!loading && activeFormTab === "notes") {
      return (
        <div className="bg-[#020408] min-h-screen text-[#F8FAFC]">
          <div className="bg-[#0B0F19] border-b border-slate-900 px-6 py-2.5 flex items-center justify-between">
            <button
              onClick={() => setActiveFormTab("onboard")}
              className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors bg-slate-900/60 hover:bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-slate-800/80 hover:border-indigo-900/50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Core Operations Dashboard</span>
            </button>
            <div className="text-[11px] font-mono text-slate-500">
              System Workspace Focus Mode
            </div>
          </div>
          <FormAddNotes onSuccess={loadData} />
        </div>
      );
    }

// --- FULL SCREEN PLANS INTERCEPT ---
// --- FULL SCREEN PLANS INTERCEPT ---

  if (!loading && activeFormTab === "plans") {
    return (
      <div className="bg-[#0B0F19] min-h-screen text-[#F8FAFC] p-4 md:p-8 font-sans antialiased">
        <div className="max-w-[1400px] mx-auto space-y-4">
          
          {/* HEADER CONSOLE */}
          <div className="bg-[#0F172A] border border-slate-800/80 px-6 py-4 rounded-2xl flex flex-col sm:flex-row gap-4 sm:items-center justify-between shadow-lg shadow-black/20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveFormTab("onboard")}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors bg-slate-900/60 hover:bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-slate-800/80 hover:border-indigo-900/50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </button>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Gating & Subscription Management Matrix</h2>
                <p className="text-[10px] text-slate-400 font-medium">Full Workspace Isolated Focus Mode</p>
              </div>
            </div>

            {/* TOGGLE WORKSPACE SEGMENT */}
            <div className="flex bg-[#0F172A] p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button 
                onClick={() => setPlanContext("tests")}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${planContext === "tests" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Test Engine Plans
              </button>
              <button 
                onClick={() => setPlanContext("notes")}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${planContext === "notes" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Notes Chapters Access
              </button>
            </div>
          </div>

          {/* DYNAMIC FORM INJECTION WORKSPACE */}
          <div className="bg-[#1E293B]/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-sm shadow-2xl shadow-black/40">
            {planContext === "tests" ? (
              <FormManageTestPlans tests={tests} onUpdateComplete={loadData} />
            ) : (
              <FormManageNotesPlans onUpdateComplete={loadData} />
            )}
          </div>

        </div>
      </div>
    );
  }

    // --- FULL SCREEN BUCKETS INTERCEPT ---
    if (!loading && activeFormTab === "buckets") {
      return (
        <div className="bg-[#0B0F19] min-h-screen text-[#F8FAFC] p-4 md:p-8 font-sans antialiased">
          <div className="max-w-[1400px] mx-auto space-y-4">
            <div className="bg-[#0F172A] border border-slate-800/80 px-6 py-4 rounded-2xl flex items-center justify-between shadow-lg shadow-black/20">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveFormTab("onboard")}
                  className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors bg-slate-900/60 hover:bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-slate-800/80 hover:border-indigo-900/50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Dashboard</span>
                </button>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">Exam Bucket & Repository Distribution Matrix</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Full Workspace Isolated Focus Mode</p>
                </div>
              </div>
              <div className="text-[10px] font-mono bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-3 py-1 rounded-md tracking-tight uppercase">
                Exam CMS Console
              </div>
            </div>
            <div className="bg-[#1E293B]/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-sm shadow-2xl shadow-black/40">
              <FormManageExamBuckets tests={tests} onUpdateComplete={loadData} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-8 bg-[#0B0F19] min-h-screen text-[#F8FAFC] font-sans antialiased selection:bg-indigo-500/30">
        <div className="max-w-[1600px] mx-auto mb-8">
          <AdminHeader />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
            <Loader2 className="animate-spin text-indigo-500 w-8 h-8"/>
            <span className="text-sm font-medium tracking-wide animate-pulse">Syncing records infrastructure...</span>
          </div>
        ) : (
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* MANAGEMENT COMMAND CENTER */}
            <div className="xl:col-span-5 bg-[#1E293B]/40 border border-slate-800/60 rounded-2xl p-5 backdrop-blur-sm space-y-6 shadow-xl shadow-black/20">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" /> Administrative Operations
                </h2>
                <p className="text-xs text-slate-400 mt-1">Manage infrastructure, links, educational modules and deployment configurations.</p>
              </div>

              {/* Micro Tab Navigation */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 bg-[#0F172A] p-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveFormTab("onboard")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeFormTab === "onboard" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Student</span>
                </button>
                <button
                  onClick={() => setActiveFormTab("group")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeFormTab === "group" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Group</span>
                </button>
                <button
                  onClick={() => setActiveFormTab("link")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeFormTab === "link" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Link</span>
                </button>
                <button
                  onClick={() => setActiveFormTab("distribute")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeFormTab === "distribute" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Assign</span>
                </button>
                <button
                  onClick={() => setActiveFormTab("notes")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeFormTab === "notes" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Notes</span>
                </button>
                <button
                  onClick={() => setActiveFormTab("plans")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeFormTab === "plans" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Plans</span>
                </button>
                <button
                  onClick={() => setActiveFormTab("buckets")}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeFormTab === "buckets" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Buckets</span>
                </button>
              </div>

              {/* Dynamic Form Tab Window container */}
              <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-xl p-5 transition-all duration-200 min-h-[320px]">
                {activeFormTab === "onboard" && <FormStudentOnboarding onSuccess={loadData} />}
                {activeFormTab === "group" && <FormEstablishGroup onSuccess={loadData} />}
                {activeFormTab === "link" && <FormLinkStudentGroup groups={groups} students={students} />}
                {activeFormTab === "distribute" && (
                  <FormDistributeTest 
                    tests={tests} 
                    students={students} 
                    groups={groups} 
                    onAssignmentComplete={(testId) => {
                      if (selectedTestId === testId) fetchAnalytics(testId);
                    }} 
                  />
                )}
                {activeFormTab === "plans" && (
                  <FormManageTestPlans tests={tests} onUpdateComplete={loadData} />
                )}
              </div>
            </div>

            {/* CORE VISUALIZATIONS & METRICS */}
            <div className="xl:col-span-7 space-y-6">
              <div className="bg-[#1E293B]/30 border border-slate-800/60 rounded-2xl p-5 shadow-md shadow-black/10">
                <TestCatalogs 
                  tests={tests} 
                  onSelectTest={setSelectedTestId} 
                  onRefresh={loadData} 
                />
              </div>

              <div className="bg-[#1E293B]/20 border border-slate-800/40 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white tracking-wide">Live Diagnostics Ledger</h3>
                </div>
                <AnalyticsMatrix analytics={analytics} />
              </div>
            </div>

          </div>
        )}
      </div>
    );
  }