// src/app/api/cron/generate-daily-digest/route.ts
//
// Runs ONCE PER DAY (schedule it for shortly after midnight IST), and turns
// the previous day's current_affairs_capsules rows into ONE consolidated
// Daily Dose digest + ONE quiz covering that whole day.
//
// Why a separate cron from fetch-news: fetch-news runs frequently through the
// day as news breaks, so a given date's capsule set isn't "final" until the
// day is over. Generating notes/quiz per-article (the old design) meant a
// student saw a fresh quiz on every single card, which fragments revision
// instead of reinforcing the day as a whole. This route waits for the day to
// close, then makes one high-quality pass over everything that happened.
//
// Today therefore naturally has no digest yet -- it isn't over. Past dates
// always have exactly one, generated the night after they closed.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logCronRun } from "@/lib/cronLogger";
import { todayIST, shiftISODate } from "@/utils/istDate";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const EXAM_PILLARS = [
  "RBI Circulars",
  "Government Schemes",
  "Economic Reports",
  "Banking Regulations",
] as const;

interface CapsuleForDigest {
  id: string;
  source_type: string;
  category_tag: string;
  title_en: string;
  summary_en: string;
}

interface QuizQuestionPayload {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "a" | "b" | "c" | "d";
  explanation: string;
  question_type: "concept" | "static_link" | "numerical";
  source_tag: string;
}

interface DigestPayload {
  pillar_breakdown: Record<string, number>;
  notes_en: string;
  notes_hi: string;
  notes_mr: string;
  quiz: QuizQuestionPayload[];
}

// "Yesterday" is now computed via the shared todayIST()/shiftISODate() helpers
// in src/utils/istDate.ts -- see that file for why raw `new Date()` math is unsafe here.

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 5,
  delay = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      throw new Error(`HTTP status code error: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((res) => setTimeout(res, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

function buildSystemInstruction(capsules: CapsuleForDigest[]): string {
  const articlesBlock = capsules
    .map(
      (c, i) =>
        `Article ${i + 1} [${c.source_type.toUpperCase()} | ${c.category_tag}]\nTitle: ${c.title_en}\nSummary: ${c.summary_en}`
    )
    .join("\n\n");

  return `
    You are a distinguished faculty member specializing in Indian Banking Exams
    (RBI Grade B, SBI PO, IBPS, NABARD). Below are ALL the banking-relevant news
    articles ingested for a single day. Synthesize them into ONE consolidated
    Daily Dose digest for that day -- do not treat them as separate items.

    ARTICLES FOR THE DAY:
    ${articlesBlock}

    Produce:
    1. "pillar_breakdown": an object with a count for EACH of "RBI Circulars",
       "Government Schemes", "Economic Reports", "Banking Regulations" -- use 0
       for any pillar with no articles today. Every key must be present.
    2. "notes_en"/"notes_hi"/"notes_mr": ONE simplified, exam-oriented set of notes
       covering the full day, organized by pillar (use short headers per pillar, then
       bullet-style lines). For each item, explain WHAT happened, WHY it matters for
       the exam, and which static syllabus topic it connects to (e.g. "Links to:
       Monetary Policy -> Repo Rate Transmission"). Use plain language suitable for
       aspirants from diverse educational backgrounds.
    3. "quiz": 6-10 multiple-choice questions spanning the day's articles, testing
       LOGIC and UNDERSTANDING, not fact-retrieval.
         BAD (do not write like this): "When was this scheme launched?"
         GOOD (write like this): "What is the primary objective and beneficiary
         group of this scheme?"
       Distribute questions across the day's different pillars/articles rather than
       clustering on one. Each question needs: question_text, option_a..option_d
       (plausible, non-trivial distractors), correct_option ("a"|"b"|"c"|"d"), a short
       explanation, question_type ("concept" | "static_link" | "numerical"), and
       source_tag (a short label naming which pillar or article topic the question
       draws from, e.g. "RBI Circulars" or "UPI-Nepal Linkage").

    Response MUST be raw JSON matching this structure:
    {
      "pillar_breakdown": { "RBI Circulars": 2, "Government Schemes": 1 },
      "notes_en": string, "notes_hi": string, "notes_mr": string,
      "quiz": [
        {
          "question_text": string,
          "option_a": string, "option_b": string, "option_c": string, "option_d": string,
          "correct_option": "a" | "b" | "c" | "d",
          "explanation": string,
          "question_type": "concept" | "static_link" | "numerical",
          "source_tag": string
        }
      ]
    }
  `;
}

function buildResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      // Gemini's structured-output schema requires OBJECT types to declare
      // their properties explicitly -- an "open" object with no properties
      // (as this used to be) gets rejected by the API with a 400 on every
      // single call, which is why nothing was ever reaching the database.
      // Since there are only 4 known pillars, declare them by name instead.
      pillar_breakdown: {
        type: "OBJECT",
        properties: {
          "RBI Circulars": { type: "INTEGER" },
          "Government Schemes": { type: "INTEGER" },
          "Economic Reports": { type: "INTEGER" },
          "Banking Regulations": { type: "INTEGER" },
        },
      },
      notes_en: { type: "STRING" },
      notes_hi: { type: "STRING" },
      notes_mr: { type: "STRING" },
      quiz: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question_text: { type: "STRING" },
            option_a: { type: "STRING" },
            option_b: { type: "STRING" },
            option_c: { type: "STRING" },
            option_d: { type: "STRING" },
            correct_option: { type: "STRING", enum: ["a", "b", "c", "d"] },
            explanation: { type: "STRING" },
            question_type: { type: "STRING", enum: ["concept", "static_link", "numerical"] },
            source_tag: { type: "STRING" },
          },
          required: [
            "question_text",
            "option_a",
            "option_b",
            "option_c",
            "option_d",
            "correct_option",
            "explanation",
            "question_type",
            "source_tag",
          ],
        },
      },
    },
    required: ["pillar_breakdown", "notes_en", "notes_hi", "notes_mr", "quiz"],
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  const { searchParams } = new URL(request.url);
  const bypassParam = searchParams.get("bypass");
  const dateParam = searchParams.get("date"); // optional backfill target, YYYY-MM-DD
  const forceParam = searchParams.get("force") === "true"; // regenerate even if a digest exists

  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isAuthorized = authHeader === `Bearer ${cronSecret}`;
  const isBypass = bypassParam === "true";

  if (!isVercelCron && !isAuthorized && !isBypass) {
    console.error("Unauthorized access attempt blocked.");
    return new NextResponse("Unauthorized Access Attempt", { status: 401 });
  }

  const startedAt = new Date();

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { success: false, error: "Missing Supabase Environment Credentials" },
      { status: 500 }
    );
  }
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "Missing Gemini API Key Environment Variable" },
      { status: 500 }
    );
  }

  const targetDate = dateParam || shiftISODate(todayIST(), -1);

  // Idempotency: don't regenerate a digest that already exists unless forced.
  const { data: existingDigest } = await supabase
    .from("daily_dose_digests")
    .select("id")
    .eq("digest_date", targetDate)
    .maybeSingle();

  if (existingDigest && !forceParam) {
    await logCronRun("generate-daily-digest", "skipped", startedAt, {
      digest_date: targetDate,
      reason: "Digest already exists for this date. Pass force=true to regenerate.",
    });
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "Digest already exists for this date. Pass force=true to regenerate.",
      digest_date: targetDate,
    });
  }

  // Pull the full day's capsules -- this is the raw material for synthesis.
  const { data: capsules, error: capsulesError } = await supabase
    .from("current_affairs_capsules")
    .select("id, source_type, category_tag, title_en, summary_en")
    .eq("original_date", targetDate);

  if (capsulesError) {
    console.error("Failed to fetch capsules for digest:", capsulesError.message);
    await logCronRun("generate-daily-digest", "error", startedAt, {
      digest_date: targetDate,
      error_source: "supabase",
      error_message: capsulesError.message,
    });
    return NextResponse.json({ success: false, error: capsulesError.message }, { status: 500 });
  }

  if (!capsules || capsules.length === 0) {
    await logCronRun("generate-daily-digest", "skipped", startedAt, {
      digest_date: targetDate,
      reason: "No capsules found for this date -- nothing to synthesize.",
    });
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "No capsules found for this date -- nothing to synthesize.",
      digest_date: targetDate,
    });
  }

  try {
    const payload = {
      contents: [{ parts: [{ text: buildSystemInstruction(capsules as CapsuleForDigest[]) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: buildResponseSchema(),
      },
    };

    const response = await fetchWithRetry(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(`Gemini request failed with status ${response.status}:`, errorBody);
      await logCronRun("generate-daily-digest", "error", startedAt, {
        digest_date: targetDate,
        error_source: "gemini",
        error_message: `Gemini request failed with status ${response.status}`,
        raw_response: errorBody.slice(0, 2000),
      });
      return NextResponse.json(
        { success: false, error: `Gemini request failed with status ${response.status}`, details: errorBody },
        { status: 502 }
      );
    }

    const rawResult = await response.json();
    const rawText = rawResult.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      await logCronRun("generate-daily-digest", "error", startedAt, {
        digest_date: targetDate,
        error_source: "gemini",
        error_message: "Empty Gemini response",
        raw_response: JSON.stringify(rawResult).slice(0, 2000),
      });
      return NextResponse.json({ success: false, error: "Empty Gemini response" }, { status: 502 });
    }

    const digestData: DigestPayload = JSON.parse(rawText);

    // Upsert the digest itself (unique on digest_date).
    const { data: upsertedDigest, error: digestError } = await supabase
      .from("daily_dose_digests")
      .upsert(
        {
          digest_date: targetDate,
          pillar_breakdown: digestData.pillar_breakdown || {},
          capsule_ids: capsules.map((c) => c.id),
          notes_en: digestData.notes_en,
          notes_hi: digestData.notes_hi,
          notes_mr: digestData.notes_mr,
        },
        { onConflict: "digest_date" }
      )
      .select("id")
      .single();

    if (digestError || !upsertedDigest) {
      console.error("Digest upsert failed:", digestError?.message);
      await logCronRun("generate-daily-digest", "error", startedAt, {
        digest_date: targetDate,
        error_source: "supabase",
        error_message: digestError?.message || "Digest upsert returned no row",
      });
      return NextResponse.json({ success: false, error: digestError?.message }, { status: 500 });
    }

    // If regenerating, clear the previous quiz set for this digest first.
    if (forceParam) {
      await supabase.from("daily_dose_quiz_questions").delete().eq("digest_id", upsertedDigest.id);
    }

    if (Array.isArray(digestData.quiz) && digestData.quiz.length > 0) {
      const quizRows = digestData.quiz.map((q, idx) => ({
        digest_id: upsertedDigest.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        explanation: q.explanation,
        question_type: q.question_type,
        source_tag: q.source_tag,
        sequence_order: idx + 1,
      }));

      const { error: quizError } = await supabase.from("daily_dose_quiz_questions").insert(quizRows);
      if (quizError) {
        console.error("Quiz insertion failed:", quizError.message);
      }
    }

    await logCronRun("generate-daily-digest", "success", startedAt, {
      digest_date: targetDate,
      capsules_synthesized: capsules.length,
      questions_generated: digestData.quiz?.length || 0,
    });

    return NextResponse.json({
      success: true,
      digest_date: targetDate,
      capsules_synthesized: capsules.length,
      questions_generated: digestData.quiz?.length || 0,
    });
  } catch (err: any) {
    console.error("Digest generation failed:", err.message);
    await logCronRun("generate-daily-digest", "error", startedAt, {
      digest_date: targetDate,
      error_source: "unknown",
      error_message: err.message,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}