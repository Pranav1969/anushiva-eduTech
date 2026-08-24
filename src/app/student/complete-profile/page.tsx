//src\app\student\complete-profile\page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { Loader2 } from "lucide-react";
import { LoginShell } from "../login/components/LoginShell";

const EXAM_OPTIONS = ["SBI Clerk", "IBPS Clerk", "SBI PO", "IBPS PO"];

export default function CompleteProfilePage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState({
    name: "", state: "", district: "", gender: "", exam: "", date_of_birth: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // If someone lands here without a valid session (e.g. typed the URL directly), send them to login
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/student/login";
        return;
      }
      // Prefill name from Google if available
      const googleName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      setForm((f) => ({ ...f, name: googleName }));
      setCheckingAuth(false);
    })();
  }, []);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.name || !form.state || !form.district || !form.gender || !form.exam) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/student/login";
      return;
    }

    const res = await fetch("/api/student/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: session.access_token,
        ...form,
      }),
    });
    const resData = await res.json();

    if (!res.ok) {
      setErrorMsg(resData.error || "Could not save your details.");
      setLoading(false);
      return;
    }

    // Row is created with password_set: false — go set one before the
    // session gets stamped and this device is treated as fully logged in.
    window.location.href = "/student/set-password";
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <LoginShell>
      <div className="max-w-md mx-auto w-full">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-xl">
          <h2 className="text-xl font-extrabold text-white mb-2">One Last Step</h2>
          <p className="text-slate-400 text-xs mb-6">
            We need a few details to set up your exam preparation profile.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Full name" value={form.name} onChange={e => update("name", e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white" />
            <select required value={form.exam} onChange={e => update("exam", e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white">
              <option value="">Select target exam</option>
              {EXAM_OPTIONS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="State" value={form.state} onChange={e => update("state", e.target.value)}
                className="bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white" />
              <input required placeholder="District" value={form.district} onChange={e => update("district", e.target.value)}
                className="bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white" />
            </div>
            <select required value={form.gender} onChange={e => update("gender", e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white">
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <input type="date" value={form.date_of_birth} onChange={e => update("date_of_birth", e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white" />

            {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-500 disabled:opacity-40">
              {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </LoginShell>
  );
}