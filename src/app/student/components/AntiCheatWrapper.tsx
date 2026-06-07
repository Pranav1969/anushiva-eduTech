// src/app/student/components/AntiCheatWrapper.tsx
"use client";

import { useEffect, useState, useRef } from "react";

interface AntiCheatProps {
  children: React.ReactNode;
  enabled?: boolean;
  onViolationSubmit: () => void; // Callback to auto-submit the test
}

export default function AntiCheatWrapper({ children, enabled = true, onViolationSubmit }: AntiCheatProps) {
  const [isTabFocused, setIsTabFocused] = useState(true);
  const [strikes, setStrikes] = useState(0);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleKeyDown = (e: KeyboardEvent) => {
      let violationTriggered = false;

      // Detect PrintScreen
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText("");
        violationTriggered = true;
      }

      // Detect Mac Screenshot Combinations (Cmd + Shift + 3 / 4 / 5)
      if ((e.metaKey && e.shiftKey) && ["3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        violationTriggered = true;
      }

      // Block normal copy/paste/devtools shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "s", "p", "i", "u"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
      if (e.key === "F12") e.preventDefault();

      if (violationTriggered) {
        triggerStrike();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        triggerStrike();
      }
    };

    const handleWindowBlur = () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);

      // Debounce window blur to catch system snipping tool overlays
      blurTimeoutRef.current = setTimeout(() => {
        if (!document.hasFocus() || document.hidden) {
          triggerStrike();
        }
      }, 400);
    };

    const handleWindowFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      // Only bring back focus if they haven't been locked out permanently
      if (strikes < 3) {
        setIsTabFocused(true);
      }
    };

    const triggerStrike = () => {
      setIsTabFocused(false);
      setStrikes((prevStrikes) => {
        const nextStrikes = prevStrikes + 1;
        
        // If they reach 3 strikes and we haven't submitted yet, terminate the test
        if (nextStrikes >= 3 && !isSubmittingRef.current) {
          isSubmittingRef.current = true;
          onViolationSubmit();
        }
        return nextStrikes;
      });
    };

    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [enabled, strikes, onViolationSubmit]);

  if (!enabled) return <>{children}</>;

  return (
    <div className="relative min-h-screen select-none style-protection">
      <style jsx global>{`
        body {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        img {
          pointer-events: none !important;
          -webkit-user-drag: none !important;
        }
      `}</style>

      {/* Main Test UI Box Canvas */}
      <div className={`transition-all duration-300 ${!isTabFocused ? "blur-3xl pointer-events-none scale-95" : ""}`}>
        {children}
      </div>

      {/* Security Shield System Panel Overlay */}
      {!isTabFocused && (
        <div className="fixed inset-0 bg-[#0B0F19]/95 z-[9999] flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
          <div className="max-w-md bg-slate-900 border border-red-500/30 p-8 rounded-2xl shadow-2xl shadow-black animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black text-red-400 uppercase tracking-wider mb-2">
              {strikes >= 3 ? "Examination Terminated" : "Security Violation Warning"}
            </h2>
            
            <div className="my-4 bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-red-400 font-mono text-xs font-bold uppercase tracking-widest">
              Strike Counter Ledger: {strikes > 3 ? 3 : strikes} / 3
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {strikes >= 3 
                ? "You have exceeded the maximum allowed out-of-bounds violations (3 strikes). Your workspace has been revoked and your current progress sheet was force-submitted to the admin ledger." 
                : "You moved away from the exam viewport or attempted a background capture match. Exceeding 3 total strike counts will instantly fail your session."
              }
            </p>
            
            {strikes < 3 && (
              <button 
                onClick={() => setIsTabFocused(true)} 
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
              >
                Understand & Resume Test
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}