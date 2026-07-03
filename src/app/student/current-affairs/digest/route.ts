// src/app/api/current-affairs/digest/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
// Anon/publishable key is enough here -- this is a read of already-public study
// content, gated in the UI by the existing required_plan lock, not by RLS secrecy.
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json({ success: false, error: "date is required" }, { status: 400 });
  }

  const { data: digest, error: digestError } = await supabase
    .from("daily_dose_digests")
    .select("*")
    .eq("digest_date", date)
    .maybeSingle();

  if (digestError) {
    console.error("Digest fetch failed:", digestError.message);
    return NextResponse.json({ success: false, error: digestError.message }, { status: 500 });
  }

  if (!digest) {
    // Expected for today (day isn't over yet) or for dates with no relevant
    // news. The UI should show a "not ready" / "nothing that day" state.
    return NextResponse.json({ success: true, digest: null, quiz: [] });
  }

  const { data: quiz, error: quizError } = await supabase
    .from("daily_dose_quiz_questions")
    .select("*")
    .eq("digest_id", digest.id)
    .order("sequence_order", { ascending: true });

  if (quizError) {
    console.error("Quiz fetch failed:", quizError.message);
    return NextResponse.json({ success: true, digest, quiz: [] });
  }

  return NextResponse.json({ success: true, digest, quiz: quiz || [] });
}