"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { LoginShell } from "../login/components/LoginShell";

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setValidSession(!!session);
      setChecking(false);
    })();
  }, []);

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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <LoginShell>
      <div className="max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-xl"
        >
          {!validSession ? (
            <div className="text-center space-y-4">
              <h2 className="text-lg font-bold text-white">Link expired or invalid</h2>
              <p className="text-slate-400 text-xs">
                This reset link is no longer valid. Please request a new one.
              </p>
              <a href="/student/forgot-password" className="inline-block text-xs text-blue-400 hover:text-blue-300 font-semibold">
                Request new link
              </a>
            </div>
          ) : done ? (
            <div className="text-center space-y-4">
              <ShieldCheck className="mx-auto text-emerald-400" size={40} />
              <h2 className="text-lg font-bold text-white">Password updated</h2>
              <p className="text-slate-400 text-xs">You can now log in with your new password.</p>
              <a href="/student/login" className="inline-block text-xs text-blue-400 hover:text-blue-300 font-semibold">
                Go to login
              </a>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2 mb-6">
                <h2 className="text-lg font-bold text-white">Set a new password</h2>
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
                    type="password" required placeholder="Confirm new password"
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
                  {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Update Password"}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </LoginShell>
  );
}