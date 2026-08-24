"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { LoginShell } from "../login/components/LoginShell";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();

      const lookupRes = await fetch("/api/student/resolve-login-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername }),
      });
      const lookupData = await lookupRes.json();

      // Always show the success state, even if the username doesn't exist —
      // don't reveal which usernames are registered.
      if (lookupRes.ok && lookupData.email) {
        await supabase.auth.resetPasswordForEmail(lookupData.email, {
          redirectTo: `${window.location.origin}/student/reset-password`,
        });
      }

      setSent(true);
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginShell>
      <div className="max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-xl"
        >
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
              <h2 className="text-lg font-bold text-white">Check your email</h2>
              <p className="text-slate-400 text-xs">
                If an account exists for that username, we&apos;ve sent a password reset link to its
                registered email address.
              </p>
              <a href="/student/login" className="inline-block text-xs text-blue-400 hover:text-blue-300 font-semibold">
                Back to login
              </a>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2 mb-6">
                <KeyRound className="mx-auto text-blue-400" size={28} />
                <h2 className="text-lg font-bold text-white">Reset your password</h2>
                <p className="text-slate-400 text-xs">
                  Enter your username and we&apos;ll send a reset link to your registered email.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  required
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />

                {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors disabled:bg-slate-400"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Send Reset Link"}
                </button>

                <p className="text-center text-xs text-slate-500">
                  <a href="/student/login" className="text-blue-400 hover:text-blue-300 font-semibold">Back to login</a>
                </p>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </LoginShell>
  );
}