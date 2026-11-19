// src/app/student/anushiva/test/[testId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useStudentSession } from "@/utils/auth";
import { savePostLoginRedirect, SHARE_PATH } from "@/utils/shareLinks";

const PLAN_MAP: Record<string, number> = { free: 1, silver: 2, gold: 3, premium: 4 };

export default function AnushivaSharedTestGate() {
  const { testId } = useParams<{ testId: string }>();
  const router = useRouter();
  const { session, loading } = useStudentSession();
  const [state, setState] = useState<"checking" | "locked" | "unavailable">("checking");
  const [info, setInfo] = useState<{ name: string; plan: string } | null>(null);

  useEffect(() => {
    if (loading || !testId) return;

    // 1) Not logged in -> remember this link, send to login
    if (!session) {
      savePostLoginRedirect(`${SHARE_PATH}/${testId}`);
      router.replace("/student/login");
      return;
    }

    // 2) Logged in -> verify the test, then open it directly
    (async () => {
      const { data: test, error } = await supabase
        .from("tests")
        .select("id, test_name, required_plan, owner_student_id")
        .eq("id", testId)
        .single();

      if (error || !test || (test.owner_student_id && test.owner_student_id !== session.id)) {
        setState("unavailable");
        return;
      }

      const req = String(test.required_plan || "free").toLowerCase();
      const mine = String(session.current_plan || "free").toLowerCase();
      if ((PLAN_MAP[mine] || 1) < (PLAN_MAP[req] || 1)) {
        setInfo({ name: test.test_name, plan: req });
        setState("locked");
        return;
      }

      router.replace(`/student/numerical-ability?id=${testId}`);
    })();
  }, [loading, session, testId, router]);

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="animate-spin text-blue-500" size={30} />
        <p className="text-xs font-semibold tracking-wide">Opening your ANUSHIVA test...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
        {state === "locked" ? (
          <>
            <Lock className="w-8 h-8 mx-auto text-amber-400" />
            <h1 className="text-sm font-bold text-white">{info?.name}</h1>
            <p className="text-xs text-slate-400">
              This test needs the <b className="uppercase text-amber-300">{info?.plan}</b> plan.
              Upgrade from your dashboard to attempt it.
            </p>
          </>
        ) : (
          <>
            <ShieldAlert className="w-8 h-8 mx-auto text-rose-400" />
            <h1 className="text-sm font-bold text-white">Test not available</h1>
            <p className="text-xs text-slate-400">This link is invalid or the test is private.</p>
          </>
        )}
        <Link href="/student" className="inline-block text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}