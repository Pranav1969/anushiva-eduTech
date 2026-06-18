"use client";

import React from "react";
import { X, ShieldAlert, CheckCircle2, Sparkles, Zap } from "lucide-react";

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan: string;
}

export default function PlanUpgradeModal({ isOpen, onClose, requiredPlan }: PlanUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden bg-[#1E293B] border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 text-slate-100 p-6 space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShieldAlert className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            {requiredPlan.toUpperCase()} Plan Required
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            This premium assessment blueprint belongs exclusively to Tier subscribers. Upgrade your plan to gain immediate entry.
          </p>
        </div>

        {/* Plan Features Spec */}
        <div className="bg-[#0F172A]/60 border border-slate-800/80 rounded-xl p-4 space-y-3 font-medium text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Unlock all premium mock exams & diagnostics</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Deep performance metrics analysis rollup</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Comprehensive offline Revision Notes Engine</span>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => {
            alert("Redirecting to your payment gateway container infrastructure...");
          }}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 group transition-all"
        >
          <Zap className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
          <span>Unlock Premium Tier Infrastructure</span>
        </button>
      </div>
    </div>
  );
}