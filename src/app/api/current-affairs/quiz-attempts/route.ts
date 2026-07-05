// src/app/api/current-affairs/quiz-attempts/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

export const dynamic = "force-dynamic";

// POST /api/current-affairs/quiz-attempts
// body: { student_id, question_id, selected_option, is_correct }
// Called once per answer selection (not just at quiz end), so a partial
// attempt is still captured even if the student closes the drawer early.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { student_id, question_id, selected_option, is_correct } = body || {};

  if (!student_id || !question_id || !selected_option) {
    return NextResponse.json(
      { success: false, error: "student_id, question_id, and selected_option are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("daily_dose_quiz_attempts").insert({
    student_id,
    question_id,
    selected_option,
    is_correct: Boolean(is_correct),
  });

  if (error) {
    console.error("Quiz attempt insert failed:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}