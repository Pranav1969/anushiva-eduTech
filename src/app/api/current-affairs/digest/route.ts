// src/app/api/current-affairs/digest/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
// Anon/publishable key is enough here -- this is a read of already-public study
// content, gated in the UI by the existing required_plan lock, not by RLS secrecy.
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// `force-dynamic` removed: it fights CDN caching. Reading request.url already
// makes this handler dynamic, and we control caching via Cache-Control below.

/** Same IST "today" logic used elsewhere, computed without extra imports. */
const todayInIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json({ success: false, error: "date is required" }, { status: 400 });
  }

  const isToday = date === todayInIST();

  // Today's digest is compiled when the news day closes -> short cache.
  // Past digests never change -> long cache.
  const cacheHeaders = {
    "Cache-Control": isToday
      ? "public, s-maxage=60, stale-while-revalidate=300"
      : "public, s-maxage=3600, stale-while-revalidate=86400",
  };

  const { data: digest, error: digestError } = await supabase
    .from("daily_dose_digests")
    .select("*")
    .eq("digest_date", date)
    .maybeSingle();

  if (digestError) {
    console.error("Digest fetch failed:", digestError.message);
    // Errors are never cached
    return NextResponse.json({ success: false, error: digestError.message }, { status: 500 });
  }

  if (!digest) {
    // Expected for today (day isn't over yet) or for dates with no relevant news.
    // Cache only briefly so a freshly generated digest shows up quickly.
    return NextResponse.json(
      { success: true, digest: null, quiz: [] },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    );
  }

  const { data: quizRows, error: quizError } = await supabase
    .from("daily_dose_quiz_questions")
    .select("*")
    .eq("digest_id", digest.id)
    .order("sequence_order", { ascending: true });

  if (quizError) {
    console.error("Quiz fetch failed:", quizError.message);
    return NextResponse.json({ success: true, digest, quiz: [] });
  }

  // Reshape the flat _en/_hi/_mr columns into nested {en, hi, mr} objects,
  // matching the same convention used for capsule title/summary elsewhere.
  const quiz = (quizRows || []).map((row: any) => ({
    id: row.id,
    digest_id: row.digest_id,
    question_text: { en: row.question_text_en, hi: row.question_text_hi, mr: row.question_text_mr },
    option_a: { en: row.option_a_en, hi: row.option_a_hi, mr: row.option_a_mr },
    option_b: { en: row.option_b_en, hi: row.option_b_hi, mr: row.option_b_mr },
    option_c: { en: row.option_c_en, hi: row.option_c_hi, mr: row.option_c_mr },
    option_d: { en: row.option_d_en, hi: row.option_d_hi, mr: row.option_d_mr },
    explanation: { en: row.explanation_en, hi: row.explanation_hi, mr: row.explanation_mr },
    correct_option: row.correct_option,
    question_type: row.question_type,
    source_tag: row.source_tag,
    sequence_order: row.sequence_order,
  }));

  return NextResponse.json({ success: true, digest, quiz }, { headers: cacheHeaders });
}