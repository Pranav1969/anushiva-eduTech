"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/app/student/theme/ThemeProvider";
import { EmailLoginForm } from "./EmailLoginForm";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { AnushivaOrbitLogo, AnushivaWordmark } from "./AnushivaLogo";

export function LoginForm() {
  const { theme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`border rounded-2xl p-6 md:p-8 w-full relative ${theme.panel}`}
    >
      <div className="text-center mb-6">
        <div className="flex justify-center pt-3 pb-5">
          <AnushivaOrbitLogo size={72} />
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3 py-1 border text-[11px] font-bold uppercase tracking-wider rounded-md ${theme.accent.soft} ${theme.accent.textStrong}`}
        >
          <Sparkles size={12} /> Aspirant Login
        </div>

        <p className={`mt-2 text-xs font-medium ${theme.text.muted}`}>
          Login to continue your Bank exam preparation – mock tests, notes and analysis in one place.
        </p>
      </div>

      <EmailLoginForm />

      <div className="flex items-center gap-3 my-5">
        <div className={`h-px flex-1 border-t ${theme.divider}`} />
        <span className={`text-[10px] uppercase tracking-wider font-bold ${theme.text.faint}`}>or</span>
        <div className={`h-px flex-1 border-t ${theme.divider}`} />
      </div>

      <GoogleSignInButton />

      <p className={`text-center text-xs mt-5 ${theme.text.faint}`}>
        New student?{" "}
        <a href="/student/signup" className={`font-semibold ${theme.accent.text} ${theme.accent.linkHover}`}>
          Create your account
        </a>
      </p>
    </motion.div>
  );
}