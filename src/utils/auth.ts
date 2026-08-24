//src\utils\auth.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase";

export interface StudentSession {
  id: string;
  name: string;
  username: string;
  gender?: string;
  state?: string;
  district?: string;
  current_plan?: string;
}

export function useStudentSession() {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setSession(null);
      setLoading(false);
      return;
    }

    const { data: student, error } = await supabase
      .from("students")
      .select("id, name, username, gender, state, district, current_plan")
      .eq("auth_id", user.id)
      .single();

    if (error || !student) {
      setSession(null);
      setLoading(false);
      return;
    }

    setSession(student as StudentSession);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadSession();
    });
    return () => listener.subscription.unsubscribe();
  }, [loadSession]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    window.location.href = "/student/login";
  }, []);

  return { session, loading, logout };
}