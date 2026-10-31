"use client";
// src/components/shared/PhoneVerificationStep.tsx
//
// Reusable UI for "enter phone -> enter OTP" used in two places:
//   - Signup page (purpose="signup"): on success, calls onVerified with a
//     verificationToken to carry into the final signup submission.
//   - /student/verify-phone (purpose="link"): pass the logged-in user's
//     access_token; on success the phone is already saved server-side, no
//     token is returned.

import { useState } from "react";
import { Loader2, Phone, ShieldCheck, CheckCircle2 } from "lucide-react";

type Props = {
  purpose: "signup" | "link";
  accessToken?: string; // required when purpose === "link"
  onVerified: (result: { phone: string; verificationToken?: string }) => void;
};

export function PhoneVerificationStep({ purpose, accessToken, onVerified }: Props) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/student/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose, access_token: accessToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Could not send code. Please try again.");
        if (data.retryAfterSeconds) startCooldown(data.retryAfterSeconds);
        setLoading(false);
        return;
      }

      startCooldown(45);
      setStage("otp");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/student/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp, purpose, access_token: accessToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Invalid or expired code.");
        setLoading(false);
        return;
      }

      onVerified({ phone: data.phone, verificationToken: data.verificationToken });
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {stage === "phone" ? (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 text-slate-500" size={14} />
              <span className="absolute left-9 top-2.5 text-xs text-slate-500 font-medium">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-16 pr-4 text-xs font-medium text-white focus:outline-none transition-all"
              />
            </div>
          </div>
          {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}
          <button
            type="button"
            onClick={sendOtp}
            disabled={loading || phone.length !== 10 || cooldown > 0}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-500 transition-colors disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" size={16} />
            ) : cooldown > 0 ? (
              `Wait ${cooldown}s`
            ) : (
              "Send OTP"
            )}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            Code sent to +91 {phone}
          </div>
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
            type="button"
            onClick={verifyOtp}
            disabled={loading || otp.length !== 6}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-500 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Verify Number"}
          </button>
          <button
            type="button"
            onClick={() => { setStage("phone"); setOtp(""); setErrorMsg(""); }}
            disabled={loading}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
          >
            Change number
          </button>
        </>
      )}
    </div>
  );
}
