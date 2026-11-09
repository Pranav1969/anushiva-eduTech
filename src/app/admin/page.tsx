//src\app\admin\page.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Loader2, Users, FolderPlus, UserPlus, Send, BarChart3, Database, BookOpen,
  ArrowLeft, ShieldCheck, Layers, ListOrdered, FolderOpen,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

// Small, always-needed pieces are loaded normally
import AdminHeader from "./components/AdminHeader";
import FormStudentOnboarding from "./components/FormStudentOnboarding";
import FormEstablishGroup from "./components/FormEstablishGroup";
import FormLinkStudentGroup from "./components/FormLinkStudentGroup";
import FormDistributeTest from "./components/FormDistributeTest";
import TestCatalogs from "./components/TestCatalogs";
import AnalyticsMatrix from "./components/AnalyticsMatrix";

// Full-screen views are only loaded when you open them (keeps the dashboard fast)
const FormAddNotes = dynamic(() => import("./components/FormAddNotes"));
const FormManageTestPlans = dynamic(() => import("./components/FormManageTestPlans"));
const FormManageNotesPlans = dynamic(() => import("./components/FormManageNotesPlans"));
const FormManageExamBuckets = dynamic(() => import("./components/FormManageExamBuckets"));
const FormManageTestSequence = dynamic(() => import("./components/FormManageTestSequence"));
const Pranav = dynamic(() => import("./components/Pranav"));

type FormTab =
  | "onboard" | "group" | "link" | "distribute"
  | "notes" | "plans" | "buckets" | "sequence" | "docs";

const BACK_BTN =
  "flex items-center gap-2 text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700";

// Simple top bar + content area used by every full-screen view
function FocusShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-950 min-h-screen text-slate-100">
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center gap-4">
        <button onClick={onBack} className={BACK_BTN}>
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const [tests, setTests] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFormTab, setActiveFormTab] = useState<FormTab>("onboard");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [planContext, setPlanContext] = useState<"tests" | "notes">("tests");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: tData } = await supabase.from("tests").select("*").is("owner_student_id", null).order("created_at", { ascending: false });
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
      // 1. Students targeted via direct manual/group allocations
      const { data: assigned } = await supabase.from("assigned_tests").select("student_id").eq("test_id", testId);
      const manualAssignedIds = assigned?.map(a => a.student_id) || [];

      // 2. Check whether the test belongs to an auto-assigned exam bucket
      const { data: targetTest } = await supabase
        .from("tests")
        .select("exam_id")
        .eq("id", testId)
        .single();
      let bucketStudentIds: string[] = [];

      if (targetTest?.exam_id) {
        const { data: examRecord } = await supabase
          .from("exams")
          .select("name")
          .eq("id", targetTest.exam_id)
          .single();
        if (examRecord?.name) {
          const { data: matchedStudents } = await supabase
            .from("students")
            .select("id")
            .eq("exam", examRecord.name);
          if (matchedStudents) {
            bucketStudentIds = matchedStudents.map(s => s.id);
          }
        }
      }

      // 3. Unified list of eligible students (manual + bucket)
      const allEligibleStudentIds = Array.from(new Set([...manualAssignedIds, ...bucketStudentIds]));
      if (allEligibleStudentIds.length === 0) {
        setAnalytics({ assignedCount: 0, completedCount: 0, attempts: [] });
        return;
      }

      // 4. Attempts for those students
      const { data: attempts } = await supabase
        .from("attempts")
        .select("score, total_questions, created_at, students(name, username)")
        .eq("test_id", testId)
        .in("student_id", allEligibleStudentIds);

      setAnalytics({
        assignedCount: allEligibleStudentIds.length,
        completedCount: attempts?.length || 0,
        attempts: attempts || [],
      });
    } catch (err) {
      console.error("Failed to gather complete diagnostic matrix metrics:", err);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedTestId) fetchAnalytics(selectedTestId);
  }, [selectedTestId]);

  const goHome = () => setActiveFormTab("onboard");

  /* ------------------- FULL SCREEN VIEWS ------------------- */

  if (!loading && activeFormTab === "notes") {
    return (
      <FocusShell title="Notes" subtitle="Syllabus notes editor" onBack={goHome}>
        <FormAddNotes onSuccess={loadData} />
      </FocusShell>
    );
  }

  if (!loading && activeFormTab === "docs") {
    return (
      <FocusShell title="Documents" subtitle="Upload, read and download Word / Excel files" onBack={goHome}>
        <Pranav />
      </FocusShell>
    );
  }

  if (!loading && activeFormTab === "plans") {
    return (
      <FocusShell title="Plans" subtitle="Gating and subscription management" onBack={goHome}>
        <div className="max-w-[1400px] mx-auto p-4 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setPlanContext("tests")}
              className={`px-4 py-2 rounded text-sm border ${planContext === "tests" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"}`}
            >
              Test Engine Plans
            </button>
            <button
              onClick={() => setPlanContext("notes")}
              className={`px-4 py-2 rounded text-sm border ${planContext === "notes" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"}`}
            >
              Notes Chapters Access
            </button>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            {planContext === "tests" ? (
              <FormManageTestPlans tests={tests} onUpdateComplete={loadData} />
            ) : (
              <FormManageNotesPlans onUpdateComplete={loadData} />
            )}
          </div>
        </div>
      </FocusShell>
    );
  }

  if (!loading && activeFormTab === "buckets") {
    return (
      <FocusShell title="Exam Buckets" subtitle="Exam bucket and repository distribution" onBack={goHome}>
        <div className="max-w-[1400px] mx-auto p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <FormManageExamBuckets tests={tests} onUpdateComplete={loadData} />
          </div>
        </div>
      </FocusShell>
    );
  }

  if (!loading && activeFormTab === "sequence") {
    return (
      <FocusShell title="Syllabus Order & Chapters" subtitle="Control what students see first, chapter by chapter" onBack={goHome}>
        <div className="max-w-[1400px] mx-auto p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <FormManageTestSequence tests={tests} onUpdateComplete={loadData} />
          </div>
        </div>
      </FocusShell>
    );
  }

  /* ------------------- MAIN DASHBOARD ------------------- */

  const tabClass = (tab: FormTab) =>
    `flex flex-col items-center justify-center gap-1 py-2 px-1 rounded text-xs font-medium border ${
      activeFormTab === tab
        ? "bg-indigo-600 border-indigo-600 text-white"
        : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
    }`;

  const tabs: { key: FormTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "onboard", label: "Student", Icon: UserPlus },
    { key: "group", label: "Group", Icon: FolderPlus },
    { key: "link", label: "Link", Icon: Users },
    { key: "distribute", label: "Assign", Icon: Send },
    { key: "notes", label: "Notes", Icon: BookOpen },
    { key: "docs", label: "Docs", Icon: FolderOpen },
    { key: "plans", label: "Plans", Icon: ShieldCheck },
    { key: "buckets", label: "Buckets", Icon: Layers },
    { key: "sequence", label: "Order", Icon: ListOrdered },
  ];

  return (
    <div className="p-4 md:p-6 bg-slate-950 min-h-screen text-slate-100">
      <div className="max-w-[1600px] mx-auto mb-6">
        <AdminHeader />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-300 gap-3">
          <Loader2 className="animate-spin w-6 h-6" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* LEFT: operations */}
          <div className="xl:col-span-5 bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" /> Administrative Operations
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Manage students, groups, notes, documents and test settings.
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {tabs.map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setActiveFormTab(key)} className={tabClass(key)}>
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 min-h-[320px]">
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
            </div>
          </div>

          {/* RIGHT: tests + analytics */}
          <div className="xl:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <TestCatalogs
                tests={tests}
                onSelectTest={setSelectedTestId}
                onRefresh={loadData}
              />
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-semibold text-white">Live Diagnostics Ledger</h3>
              </div>
              <AnalyticsMatrix analytics={analytics} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}