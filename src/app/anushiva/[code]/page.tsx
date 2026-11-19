// src/app/anushiva/[code]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useStudentSession } from "@/utils/auth";
import { savePostLoginRedirect, SHARE_PATH } from "@/utils/shareLinks";

const PLAN_MAP: Record<string, number> = { free: 1, silver: 2, gold: 3, premium: 4 };

export default function AnushivaShareGate() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { session, loading } = useStudentSession();
  const [state, setState] = useState<"checking" | "locked" | "unavailable">("checking");
  const [info, setInfo] = useState<{ name: string; plan: string } | null>(null);

  useEffect(() => {
    if (loading || !code) return;

    // Not logged in: remember the short link, go to login
    if (!session) {
      savePostLoginRedirect(`${SHARE_PATH}/${code}`);
      router.replace("/student/login");
      return;
    }

    (async () => {
      const { data, error } = await supabase.rpc("resolve_share_code", { p_code: code });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) { setState("unavailable"); return; }

      const req = String(row.required_plan || "free").toLowerCase();
      const mine = String(session.current_plan || "free").toLowerCase();
      if ((PLAN_MAP[mine] || 1) < (PLAN_MAP[req] || 1)) {
        setInfo({ name: row.test_name, plan: req });
        setState("locked");
        return;
      }
      router.replace(`/student/numerical-ability?id=${row.test_id}`);
    })();
  }, [loading, session, code, router]);

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
            </p>
          </>
        ) : (
          <>
            <ShieldAlert className="w-8 h-8 mx-auto text-rose-400" />
            <h1 className="text-sm font-bold text-white">Link not available</h1>
            <p className="text-xs text-slate-400">This link is invalid or has been disabled.</p>
          </>
        )}
        <Link href="/student" className="inline-block text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}