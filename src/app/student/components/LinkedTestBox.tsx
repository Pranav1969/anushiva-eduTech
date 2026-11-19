// src/app/student/components/LinkedTestBox.tsx
"use client";

import Link from "next/link";
import { Lock, ArrowRight, ClipboardCheck } from "lucide-react";
import ShareTestButton from "./ShareTestButton";
import { useTheme } from "../theme/ThemeProvider";

const PLAN_MAP: Record<string, number> = { free: 1, silver: 2, gold: 3, premium: 4 };

interface LinkedTestBoxProps {
  topic: any;                 // a notes_topics row (needs test_id, optionally the embedded `tests`)
  studentPlan?: string;
  planHierarchy?: Record<string, number>;
  boxClassName?: string;      // pass nt.testBox (focus view) or nt.testBoxSoft (normal view)
}

export default function LinkedTestBox({
  topic,
  studentPlan = "free",
  planHierarchy = PLAN_MAP,
  boxClassName = "",
}: LinkedTestBoxProps) {
  const { theme } = useTheme();
  const nt = theme.notes;

  if (!topic?.test_id) return null;

  // Embedded join result (object or array). If it is missing, fall back to the bare test_id
  const embedded = Array.isArray(topic.tests) ? topic.tests[0] : topic.tests;
  const linked = embedded || {
    id: topic.test_id,
    test_name: "Practice test for this topic",
    required_plan: "free",
    owner_student_id: null,
  };

  const req = String(linked.required_plan || "free").toLowerCase();
  const mine = String(studentPlan || "free").toLowerCase();
  const locked = (planHierarchy[mine] || 1) < (planHierarchy[req] || 1);

  return (
    <div
      className={`mt-5 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${boxClassName}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl border shrink-0 flex items-center justify-center bg-indigo-500/10 border-indigo-500/30 text-indigo-500">
          <ClipboardCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <span className={`text-[10px] font-mono font-bold tracking-wider uppercase block ${nt.testLabel}`}>
            Practice this topic
          </span>
          <p className={`text-xs font-semibold truncate ${nt.ink800}`}>{linked.test_name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!linked.owner_student_id && (
          <ShareTestButton
            testId={linked.id}
            testName={linked.test_name}
            className={`h-9 border rounded-lg px-3 ${nt.exitBtn}`}
          />
        )}

        {locked ? (
          <span className="h-9 text-xs font-bold px-4 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Needs {req} plan
          </span>
        ) : (
          <Link
            href={`/student/numerical-ability?id=${linked.id}`}
            className="h-9 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold px-4 rounded-lg shadow-sm transition-all inline-flex items-center justify-center gap-1.5"
          >
            <span>Take Test</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}