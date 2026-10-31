// src/app/student/verify-phone/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { Loader2, ShieldCheck } from "lucide-react";
import { LoginShell } from "../login/components/LoginShell";
import { PhoneVerificationStep } from "@/components/shared/PhoneVerificationStep";

export default function VerifyPhonePage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/student/login";
        return;
      }
      setAccessToken(session.access_token);
      setCheckingAuth(false);
    })();
  }, []);

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
          <div className="text-center space-y-2 mb-6">
            <ShieldCheck className="mx-auto text-blue-400" size={28} />
            <h2 className="text-xl font-extrabold text-white">Verify Your Mobile Number</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              For account security and important exam alerts, please verify your mobile
              number before continuing. You'll keep logging in with your username and
              password as usual — this is just to confirm we can reach you.
            </p>
          </div>

          <PhoneVerificationStep
            purpose="link"
            accessToken={accessToken!}
            onVerified={() => { window.location.href = "/student"; }}
          />
        </div>
      </div>
    </LoginShell>
  );
}
