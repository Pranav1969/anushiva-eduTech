//src\app\student\login\components\MobileOtpForm.tsx
"use client";

import { useState } from "react";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { FEATURES } from "@/config/features";
import { supabase } from "@/utils/supabase";

export function MobileOtpForm() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Coming-soon state until Supabase phone billing is switched on
  if (!FEATURES.MOBILE_OTP_ENABLED) {
    return (
      <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
        <Phone className="mx-auto mb-3 text-slate-600" size={22} />
        <p className="text-sm font-bold text-slate-300">Mobile OTP Login — Coming Soon</p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          One-tap login with just your mobile number is on the way. For now, please continue with Email or Google.
        </p>
      </div>
    );
  }

  const sendOtp = async () => {
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone.trim()}` });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }
    setStage("otp");
    setLoading(false);
  };

  const verifyOtp = async () => {
    setLoading(true);
    setErrorMsg("");
    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+91${phone.trim()}`,
      token: otp.trim(),
      type: "sms",
    });
    if (error || !data.session) {
      setErrorMsg(error?.message || "Invalid or expired code.");
      setLoading(false);
      return;
    }

    const refreshRes = await fetch("/api/student/refresh-session-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        platform: "mobile",
      }),
    });

    if (!refreshRes.ok) {
      const resData = await refreshRes.json();
      setErrorMsg(resData.error || "Failed to establish session.");
      setLoading(false);
      return;
    }

    window.location.href = "/student";
  };

  return (
    <div className="space-y-4">
      {stage === "phone" ? (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 text-slate-500" size={14} />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white focus:outline-none transition-all"
              />
            </div>
          </div>
          {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}
          <button
            onClick={sendOtp}
            disabled={loading || phone.length !== 10}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Send OTP"}
          </button>
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Enter OTP</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-3 text-slate-500" size={14} />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white focus:outline-none transition-all"
              />
            </div>
          </div>
          {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}
          <button
            onClick={verifyOtp}
            disabled={loading || otp.length !== 6}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Verify & Continue"}
          </button>
        </>
      )}
    </div>
  );
}