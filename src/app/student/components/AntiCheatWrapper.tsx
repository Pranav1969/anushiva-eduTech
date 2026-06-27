// src/app/student/components/AntiCheatWrapper.tsx
"use client";

import { useEffect, useState, useRef } from "react";

interface AntiCheatProps {
  children: React.ReactNode;
  enabled?: boolean;
  onViolationSubmit: () => void; // Callback to auto-submit the test
}

export default function AntiCheatWrapper({ children, enabled = true, onViolationSubmit }: AntiCheatProps) {
  const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);
  const [isTabFocused, setIsTabFocused] = useState(true);
  const [strikes, setStrikes] = useState(0);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);
  
  // Guard timestamp to prevent rapid simultaneous event triggers from window blur
  const lastStrikeTimeRef = useRef<number>(0);

  // Robust, strict cross-browser fallback method to force the viewport out of fullscreen
  const forceExitFullscreen = () => {
    try {
      const doc = document as any;
      const isCurrentlyFullscreen = 
        document.fullscreenElement || 
        doc.webkitFullscreenElement || 
        doc.mozFullScreenElement || 
        doc.msFullscreenElement;

      if (isCurrentlyFullscreen) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen(); // Safari/Webkit
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen(); // Firefox
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen(); // IE/Edge
        }
      }
    } catch (error) {
      console.error("Failed to release fullscreen context:", error);
    }
  };

  // TRIGGER 1: Instantly pop out of fullscreen the moment 'enabled' becomes false (normal completion)
  useEffect(() => {
    if (!enabled) {
      forceExitFullscreen();
    }
  }, [enabled]);

  // TRIGGER 2: Ensure that if the component unmounts entirely, the browser is returned to normal state
  useEffect(() => {
    return () => {
      forceExitFullscreen();
    };
  }, []);

  // Request true browser-level kiosk fullscreen lockdown
  const launchFullscreenLockdown = async () => {
    // If the test is already submitting or finished, never force fullscreen again
    if (isSubmittingRef.current || !enabled) return;

    try {
      const element = document.documentElement;
      if (!document.fullscreenElement) {
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
      }
      setIsTabFocused(true);
      setHasStartedFullscreen(true);
    } catch (err) {
      console.error("Fullscreen lock rejected by system sandbox:", err);
    }
  };

  // TRIGGER 3: Handles auto-submission when 3 strikes are accumulated
  useEffect(() => {
    if (strikes >= 3 && !isSubmittingRef.current && enabled) {
      isSubmittingRef.current = true;
      
      // Release fullscreen first before pushing data changes
      forceExitFullscreen();

      const submitTimeout = setTimeout(() => {
        onViolationSubmit();
      }, 50);

      return () => clearTimeout(submitTimeout);
    }
  }, [strikes, onViolationSubmit, enabled]);

  useEffect(() => {
    if (!enabled || !hasStartedFullscreen || isSubmittingRef.current) return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmittingRef.current) return;
      let violationTriggered = false;

      // Prevent escaping or system manipulation commands
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText("");
        violationTriggered = true;
      }

      if ((e.metaKey && e.shiftKey) && ["3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        violationTriggered = true;
      }

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
      if (isSubmittingRef.current) return;
      if (document.hidden) {
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        triggerStrike();
      }
    };

    const handleWindowBlur = () => {
      if (isSubmittingRef.current) return;
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);

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
    };

    // Monitor if the user attempts to exit Fullscreen Mode manually during active test
    const handleFullscreenChange = () => {
      if (isSubmittingRef.current || !enabled) return;
      
      const doc = document as any;
      const isCurrent = 
        document.fullscreenElement || 
        doc.webkitFullscreenElement || 
        doc.mozFullScreenElement || 
        doc.msFullscreenElement;

      if (!isCurrent && strikes < 3) {
        triggerStrike();
      }
    };

    const triggerStrike = () => {
      if (isSubmittingRef.current) return;
      const now = Date.now();
      
      // Enforce a strict 2-second timeout window to filter out layout bouncing
      if (now - lastStrikeTimeRef.current < 2000) {
        return;
      }
      lastStrikeTimeRef.current = now;

      setIsTabFocused(false);
      setStrikes((prevStrikes) => prevStrikes + 1);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [enabled, hasStartedFullscreen, strikes]);

  // If anti-cheat is turned off or active submission is in transit, render base structure natively
  if (!enabled || isSubmittingRef.current) {
    return <>{children}</>;
  }

  // Initial Fullscale Secure Workspace Handshake Screen
  if (!hasStartedFullscreen) {
    return (
      <div className="fixed inset-0 bg-[#0B0F19] z-[99999] flex flex-col items-center justify-center p-6 text-center text-white font-sans">
        <div className="max-w-md bg-slate-900 border border-indigo-500/30 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-xl font-black text-indigo-400 uppercase tracking-wider mb-3">
            Secure Examination Space
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            This test requires a locked environment. Clicking the button below will open the system at the full scale of your screen, hiding browser tabs and taskbars to protect test integrity.
          </p>
          <button
            onClick={launchFullscreenLockdown}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Lock Screen & Start Examination
          </button>
        </div>
      </div>
    );
  }

  const chancesLeft = 3 - strikes;

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

      {/* Main Examination Workspace Canvas */}
      <div className={`transition-all duration-300 ${!isTabFocused ? "blur-3xl pointer-events-none scale-95" : ""}`}>
        {children}
      </div>

      {/* Security Shield System Panel Overlay */}
      {!isTabFocused && !isSubmittingRef.current && (
        <div className="fixed inset-0 bg-[#0B0F19]/95 z-[9999] flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
          <div className="max-w-md bg-slate-900 border border-red-500/30 p-8 rounded-2xl shadow-2xl shadow-black">
            <h2 className="text-xl font-black text-red-400 uppercase tracking-wider mb-2">
              {strikes >= 3 ? "Examination Terminated" : "Security Violation Warning"}
            </h2>
            
            <div className="my-4 bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-red-400 font-mono text-xs font-bold uppercase tracking-widest">
              Strikes Logged: {strikes > 3 ? 3 : strikes} / 3
            </div>

            <div className="mb-4 text-sm font-black text-amber-400 uppercase tracking-wide animate-pulse">
              {chancesLeft > 0 ? (
                <span>⚠️ Action Required: You have only {chancesLeft} {chancesLeft === 1 ? 'chance' : 'chances'} remaining!</span>
              ) : (
                <span className="text-red-500">❌ Processing Auto-Submission...</span>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {strikes >= 3 
                ? "You have exceeded the maximum allowed workspace infractions. Your session access has been revoked and your answers have been auto-submitted to the ledger." 
                : "You left fullscale mode, unfocused the browser window, or used restricted keys. Returning out of bounds again will automatically close and submit your exam."
              }
            </p>
            
            {strikes < 3 && (
              <button 
                onClick={launchFullscreenLockdown} 
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
              >
                Re-Lock Screen & Resume Test
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}