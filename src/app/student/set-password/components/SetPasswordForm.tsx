"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export function SetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setErrorMsg(updateError.message);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/student/set-password", { method: "POST" });
      if (!res.ok) {
        setErrorMsg("Password set, but couldn't save status. Please contact support.");
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch("/api/student/refresh-session-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            platform: "web",
          }),
        });
      }

      window.location.href = "/student";
    } catch (err: any) {
      setErrorMsg("Unexpected error: " + (err?.message || "Please try again."));
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 w-full shadow-2xl"
    >
      <div className="text-center space-y-2 mb-6">
        <ShieldCheck className="mx-auto text-emerald-400" size={32} />
        <h2 className="text-lg font-bold text-white">Secure Your Account</h2>
        <p className="text-slate-400 text-xs">
          Set a password so you can also log in with your email — even if Google sign-in
          isn&apos;t available. This is required once, and only takes a moment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <LockKeyhole className="absolute left-3.5 top-3 text-slate-500" size={14} />
          <input
            type="password" required placeholder="New password"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
        </div>
        <div className="relative">
          <LockKeyhole className="absolute left-3.5 top-3 text-slate-500" size={14} />
          <input
            type="password" required placeholder="Confirm password"
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors disabled:bg-slate-400"
        >
          {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Set Password & Continue"}
        </button>
      </form>
    </motion.div>
  );
}