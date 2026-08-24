//src\app\student\login\components\AuthMethodTabs.tsx
"use client";

import { useState } from "react";
import { FEATURES } from "@/config/features";
import { EmailLoginForm } from "./EmailLoginForm";
import { MobileOtpForm } from "./MobileOtpForm";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { motion } from "framer-motion";

type Tab = "email" | "mobile";

export function AuthMethodTabs() {
  const [tab, setTab] = useState<Tab>(FEATURES.MOBILE_OTP_ENABLED ? "mobile" : "email");

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
        <button
          onClick={() => setTab("mobile")}
          className={`py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
            tab === "mobile" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Mobile Number
        </button>
        <button
          onClick={() => setTab("email")}
          className={`py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
            tab === "email" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Email / Username
        </button>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {tab === "mobile" ? <MobileOtpForm /> : <EmailLoginForm />}
      </motion.div>

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">or</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      <GoogleSignInButton />
    </div>
  );
}