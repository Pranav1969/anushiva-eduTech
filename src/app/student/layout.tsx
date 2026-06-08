// src/app/student/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; // <-- Added to track current route
import { supabase } from "@/utils/supabase";
import { authManager } from "@/utils/auth";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState(false);
  const pathname = usePathname(); // Get the current URL path

  useEffect(() => {
    // 1. CRITICAL: If the user is on the login page, bypass verification completely!
    if (pathname === "/student/login") {
      setIsVerified(true);
      return;
    }

    let isMounted = true;
    let sessionInterval: NodeJS.Timeout;

    const verifyDeviceSession = async () => {
      const currentSession = authManager.getSession(); 
      
      if (!currentSession || !currentSession.id || !currentSession.sessionToken) {
        if (isMounted) {
          authManager.logout();
          window.location.href = "/student/login";
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("students")
          .select("current_session_token")
          .eq("id", currentSession.id)
          .single();

        if (!isMounted) return;

        if (error || !data) {
          authManager.logout();
          window.location.href = "/student/login";
          return;
        }

        // If another device broke our active session lease
        if (data.current_session_token !== currentSession.sessionToken) {
          authManager.logout();
          window.location.href = "/student/login?reason=multi_device";
          return;
        }

        // Session matches perfectly
        setIsVerified(true);
      } catch (err) {
        console.error("Session verification failed:", err);
      }
    };

    // Run verification instantly on mount
    verifyDeviceSession();

    // Poll every 10 seconds to catch multi-device takeovers quietly
    sessionInterval = setInterval(verifyDeviceSession, 10000);

    return () => {
      isMounted = false;
      clearInterval(sessionInterval);
    };
  }, [pathname]); // Re-run effect only if pathname changes

  // If we are currently on the login page, let Next.js render it instantly
  if (pathname === "/student/login") {
    return <>{children}</>;
  }

  // Show a blank dark screen while validating the dashboard pages to avoid content flashing
  if (!isVerified) {
    return <div className="min-h-screen w-full bg-[#090d16]" />;
  }

  return <>{children}</>;
}