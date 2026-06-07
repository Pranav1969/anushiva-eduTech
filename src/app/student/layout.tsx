"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { authManager } from "@/utils/auth";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const session = authManager.getSession(); // Assuming this returns { id, sessionToken, ... }
    
    if (!session || !session.id || !session.sessionToken) {
      router.push("/student/login");
      return;
    }

    // Function to check if another device broke our active session lease
    const verifyDeviceSession = async () => {
      const { data, error } = await supabase
        .from("students")
        .select("current_session_token")
        .eq("id", session.id)
        .single();

      if (!error && data) {
        // If the database token does not match our local storage token, we've been displaced!
        if (data.current_session_token !== session.sessionToken) {
        authManager.logout(); // <-- Changed from clearSession() to logout()
        router.push("/student/login?reason=multi_device");
}
      }
    };

    // 1. Run check immediately when dashboard mounts
    verifyDeviceSession();

    // 2. Setup periodic check interval (e.g., checks every 10 seconds to protect quiz honesty)
    const sessionInterval = setInterval(verifyDeviceSession, 10000);

    return () => clearInterval(sessionInterval);
  }, [router]);

  return <>{children}</>;
}