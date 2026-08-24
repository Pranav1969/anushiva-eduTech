//src\app\student\login\components\EmailLoginForm.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Loader2, LockKeyhole, User } from "lucide-react";

function EmailLoginFormContent() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("reason") === "multi_device") {
      setErrorMsg("You have been logged out because your account was accessed from another device.");
    }
    if (searchParams.get("reason") === "oauth_error") {
      setErrorMsg("Google sign-in failed. Please try again or use your username and password.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const cleanUsername = username.trim().toLowerCase();

      // Look up this student's real login email via username (server-side,
      // since anon key + RLS shouldn't let us read other students' emails directly)
      const lookupRes = await fetch("/api/student/resolve-login-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername }),
      });
      const lookupData = await lookupRes.json();

      if (!lookupRes.ok || !lookupData.email) {
        setErrorMsg("Invalid username or password.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: lookupData.email,
        password: password.trim(),
      });

      if (error || !data.user || !data.session) {
        setErrorMsg(error?.message || "Invalid username or password.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || profile?.role !== "student") {
        setErrorMsg("Unauthorized access or role mismatch.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const refreshRes = await fetch("/api/student/refresh-session-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          platform: "web",
        }),
      });

      const resData = await refreshRes.json();

      if (!refreshRes.ok) {
        setErrorMsg(resData.error || "Failed to establish session.");
        setLoading(false);
        return;
      }

      window.location.href = "/student";
    } catch (err: any) {
      setErrorMsg("Unexpected error: " + (err?.message || "Please try again."));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Username</label>
        <div className="relative">
          <User className="absolute left-3.5 top-3 text-slate-500" size={14} />
          <input
            type="text"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white focus:outline-none transition-all"
            placeholder="your-username"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Account Password</label>
        <div className="relative">
          <LockKeyhole className="absolute left-3.5 top-3 text-slate-500" size={14} />
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white focus:outline-none transition-all"
            placeholder="••••••••"
            disabled={loading}
          />
        </div>
        <p className="text-right">
          <a href="/student/forgot-password" className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold">
            Forgot password?
          </a>
        </p>
      </div>

      {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors disabled:bg-slate-400"
      >
        {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Verify Identity"}
      </button>
    </form>
  );
}

export function EmailLoginForm() {
  return (
    <Suspense fallback={<div className="text-white text-xs">Loading...</div>}>
      <EmailLoginFormContent />
    </Suspense>
  );
}