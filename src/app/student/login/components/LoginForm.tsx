"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { authManager } from "@/utils/auth";
import { Loader2, LockKeyhole, User, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("reason") === "multi_device") {
      setErrorMsg("You have been logged out because your account was accessed from another device.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Fetch student record
      const { data: student, error } = await supabase
        .from("students")
        .select("*")
        .eq("username", username.trim().toLowerCase())
        .single();

      if (error || !student || student.password !== password.trim()) {
        setErrorMsg("Invalid account username or matching password passphrase.");
        setLoading(false);
        return;
      }

      // 2. Generate a totally unique session token for this specific login instance
      const newSessionToken = crypto.randomUUID();

      // 3. Write this token to the database (effectively invalidating any older device token)
      const { error: updateError } = await supabase
        .from("students")
        .update({ current_session_token: newSessionToken })
        .eq("id", student.id);

      if (updateError) {
        setErrorMsg("Failed to initialize secure hardware session token.");
        setLoading(false);
        return;
      }

      // 4. Save to your local application state manager (including the session token)
      authManager.setSession({
        id: student.id,
        name: student.name,
        username: student.username,
        sessionToken: newSessionToken
      });

      router.refresh();
      router.push("/student");
    } catch (err) {
      setErrorMsg("Portal failed to resolve verification sequence keys.");
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 w-full shadow-2xl relative backdrop-blur-xl ring-1 ring-slate-700/20"
    >
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/60 border border-purple-500/30 text-cyan-400 text-[11px] font-bold uppercase tracking-wider rounded-md">
          <Sparkles size={12} /> Examination Node Gateway
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">Student Identity Login</h2>
        <p className="text-slate-400 text-xs font-medium">Access your personal, dedicated examination workspace board.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Username</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input 
              type="text" 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white focus:outline-none transition-all" 
              placeholder="your-username" 
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
            />
          </div>
        </div>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] font-semibold flex items-start gap-2"
          >
            <span>⚠️</span> <span>{errorMsg}</span>
          </motion.div>
        )}

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-900 hover:from-blue-500 hover:to-indigo-800 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-blue-900/20 hover:shadow-blue-600/10 active:scale-[0.99]"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : "Authenticate Portal Token"}
        </button>
      </form>
    </motion.div>
  );
}