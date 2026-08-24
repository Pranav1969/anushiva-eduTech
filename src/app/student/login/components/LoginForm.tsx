//src\app\student\login\components\LoginForm.tsx
"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { AuthMethodTabs } from "./AuthMethodTabs";

export function LoginForm() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 w-full shadow-2xl relative backdrop-blur-xl ring-1 ring-slate-700/20"
    >
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/60 border border-purple-500/30 text-cyan-400 text-[11px] font-bold uppercase tracking-wider rounded-md">
          <Sparkles size={12} /> Preperation Node Gateway
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">Anushiva Identity Login</h2>
        <p className="text-slate-400 text-xs font-medium">Access your personal, dedicated examination workspace board.</p>
      </div>

      <AuthMethodTabs />
    </motion.div>
  );
}