// src/app/api/cron/generate-daily-digest/route.ts
//
// Runs ONCE PER DAY, and turns the previous day's current_affairs_capsules
// rows into ONE consolidated Daily Dose digest + ONE quiz covering that
// whole day.
//
// IMPORTANT: notes and quiz are now generated via TWO SEPARATE Gemini calls,
// not one. Originally this was a single call producing everything at once,
// but as the amount of requested content grew (3 languages of notes + a full
// quiz), that single response became large enough to risk truncation --
// Gemini 2.5 Flash is a "thinking" model, and its internal reasoning tokens
// count against the same output budget as the visible JSON answer, so a
// response that runs long can get cut off mid-JSON and fail to parse. That
// produced exactly the symptom reported: quiz rows appearing without the
// digest looking right, because the two were coupled into one all-or-nothing
// call. Splitting them means each call is smaller (less truncation risk),
// and -- more importantly -- if the quiz call fails, the notes still save
// successfully instead of losing everything.
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

const AI_GURUJI_KEY = process.env.AI_GURUJI_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_GURUJI_KEY}`;

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

interface TrilingualText {
  en: string;
  hi: string;
  mr: string;
}

interface QuizQuestionPayload {
  question_text: TrilingualText;
  option_a: TrilingualText;
  option_b: TrilingualText;
  option_c: TrilingualText;
  option_d: TrilingualText;
  explanation: TrilingualText;
  correct_option: "a" | "b" | "c" | "d";
  question_type: "concept" | "static_link" | "numerical";
  source_tag: string;
}

interface NotesPayload {
  pillar_breakdown: Record<string, number>;
  notes_en: string;
  notes_hi: string;
  notes_mr: string;
}

interface QuizPayload {
  quiz: QuizQuestionPayload[];
}

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

function articlesBlockFor(capsules: CapsuleForDigest[]): string {
  return capsules
    .map(
      (c, i) =>
        `Article ${i + 1} [${c.source_type.toUpperCase()} | ${c.category_tag}]\nTitle: ${c.title_en}\nSummary: ${c.summary_en}`
    )
    .join("\n\n");
}

// ---- Call 1: notes only ----------------------------------------------------

function buildNotesInstruction(capsules: CapsuleForDigest[]): string {
  return `
    You are a distinguished faculty member specializing in Indian Banking Exams
    (RBI Grade B, SBI PO, IBPS, NABARD). Below are ALL the banking-relevant news
    articles ingested for a single day. Synthesize them into ONE consolidated
    Daily Dose digest for that day -- do not treat them as separate items.

    ARTICLES FOR THE DAY:
    ${articlesBlockFor(capsules)}

    Produce:
    1. "pillar_breakdown": an object with a count for EACH of "RBI Circulars",
       "Government Schemes", "Economic Reports", "Banking Regulations" -- use 0
       for any pillar with no articles today. Every key must be present.
    2. "notes_en"/"notes_hi"/"notes_mr": ONE simplified, exam-oriented set of notes
       covering the full day, organized by pillar. Use EXACTLY this formatting, since
       it is parsed by the app -- do not deviate:
         - Start each pillar section with a line beginning "## " followed by the
           pillar name, e.g. "## RBI Circulars". Nothing else on that line.
         - Every point under a pillar is its own line starting with "- ".
         - Do not write freeform paragraphs outside of "## " headers and "- " bullets.
         - Use "**term**" sparingly to bold only key terms/figures within a bullet.
       For each bullet, explain WHAT happened, WHY it matters for the exam, and which
       static syllabus topic it connects to (e.g. "Links to: Monetary Policy -> Repo
       Rate Transmission"). Use plain language suitable for aspirants from diverse
       educational backgrounds. notes_hi and notes_mr must follow the identical "## "/"- "
       structure, just with the prose translated -- do not add or drop sections between
       the three languages.

    Response MUST be raw JSON matching this structure, and NOTHING else:
    {
      "pillar_breakdown": { "RBI Circulars": 2, "Government Schemes": 1 },
      "notes_en": "## RBI Circulars\\n- point one\\n- point two",
      "notes_hi": string,
      "notes_mr": string
    }
  `;
}

function buildNotesResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
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
    },
    required: ["pillar_breakdown", "notes_en", "notes_hi", "notes_mr"],
  };
}

// ---- Call 2: quiz only, trilingual -----------------------------------------

function buildQuizInstruction(capsules: CapsuleForDigest[]): string {
  return `
    You are a distinguished faculty member specializing in Indian Banking Exams
    (RBI Grade B, SBI PO, IBPS, NABARD). Below are ALL the banking-relevant news
    articles for a single day. Write ONE quiz spanning all of them.

    ARTICLES FOR THE DAY:
    ${articlesBlockFor(capsules)}

    Write 6-10 multiple-choice questions testing LOGIC and UNDERSTANDING, not
    fact-retrieval.
      BAD (do not write like this): "When was this scheme launched?"
      GOOD (write like this): "What is the primary objective and beneficiary
      group of this scheme?"
    Distribute questions across the day's different pillars/articles rather than
    clustering on one.

    Every question's question_text, option_a, option_b, option_c, option_d, and
    explanation MUST be provided as an object with THREE translations:
    { "en": "...", "hi": "...", "mr": "..." }. All three must express the exact
    same question/option/explanation -- translations, not different content.
    correct_option, question_type, and source_tag are language-independent and
    given once per question, not per language.

    Each question needs:
    - question_text: {en, hi, mr}
    - option_a, option_b, option_c, option_d: each {en, hi, mr} (plausible,
      non-trivial distractors)
    - correct_option: "a" | "b" | "c" | "d"
    - explanation: {en, hi, mr}
    - question_type: "concept" | "static_link" | "numerical"
    - source_tag: a short label naming which pillar or article topic the
      question draws from, e.g. "RBI Circulars" or "UPI-Nepal Linkage"

    Response MUST be raw JSON matching this structure, and NOTHING else:
    {
      "quiz": [
        {
          "question_text": { "en": string, "hi": string, "mr": string },
          "option_a": { "en": string, "hi": string, "mr": string },
          "option_b": { "en": string, "hi": string, "mr": string },
          "option_c": { "en": string, "hi": string, "mr": string },
          "option_d": { "en": string, "hi": string, "mr": string },
          "correct_option": "a" | "b" | "c" | "d",
          "explanation": { "en": string, "hi": string, "mr": string },
          "question_type": "concept" | "static_link" | "numerical",
          "source_tag": string
        }
      ]
    }
  `;
}

function trilingualSchema() {
  return {
    type: "OBJECT",
    properties: {
      en: { type: "STRING" },
      hi: { type: "STRING" },
      mr: { type: "STRING" },
    },
    required: ["en", "hi", "mr"],
  };
}

function buildQuizResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      quiz: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question_text: trilingualSchema(),
            option_a: trilingualSchema(),
            option_b: trilingualSchema(),
            option_c: trilingualSchema(),
            option_d: trilingualSchema(),
            correct_option: { type: "STRING", enum: ["a", "b", "c", "d"] },
            explanation: trilingualSchema(),
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
    required: ["quiz"],
  };
}

async function callGemini(prompt: string, schema: object) {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      // Explicit ceiling so a response that's running long fails loudly and
      // fast (a plain JSON-parse error we catch and log) rather than
      // silently truncating mid-JSON. Generous enough for either call's
      // actual content, small enough to fail fast if something runs away.
      maxOutputTokens: 8192,
    },
  };

  const response = await fetchWithRetry(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Gemini request failed with status ${response.status}: ${errorBody.slice(0, 500)}`);
  }

  const rawResult = await response.json();
  const finishReason = rawResult.candidates?.[0]?.finishReason;
  const rawText = rawResult.candidates?.[0]?.content?.parts?.[0]?.text;

  if (finishReason === "MAX_TOKENS") {
    throw new Error("Gemini response was truncated (hit MAX_TOKENS) before completing valid JSON.");
  }
  if (!rawText) {
    throw new Error(`Empty Gemini response (finishReason: ${finishReason || "unknown"})`);
  }

  return JSON.parse(rawText);
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  const { searchParams } = new URL(request.url);
  const bypassParam = searchParams.get("bypass");
  const dateParam = searchParams.get("date");
  const forceParam = searchParams.get("force") === "true";

  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isAuthorized = authHeader === `Bearer ${cronSecret}`;
  const isBypass = bypassParam === "true";

  if (!isVercelCron && !isAuthorized && !isBypass) {
    console.error("Unauthorized access attempt blocked.");
    return new NextResponse("Unauthorized Access Attempt", { status: 401 });
  }

  const startedAt = new Date();

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ success: false, error: "Missing Supabase Environment Credentials" }, { status: 500 });
  }
  if (!AI_GURUJI_KEY) {
    return NextResponse.json({ success: false, error: "Missing Gemini API Key Environment Variable" }, { status: 500 });
  }

  const targetDate = dateParam || shiftISODate(todayIST(), -1);

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

  const { data: capsules, error: capsulesError } = await supabase
    .from("current_affairs_capsules")
    .select("id, source_type, category_tag, title_en, summary_en")
    .eq("original_date", targetDate);

  if (capsulesError) {
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

  // ---- Call 1: notes. Must succeed before we touch quiz at all. ----
  let notesData: NotesPayload;
  try {
    notesData = (await callGemini(
      buildNotesInstruction(capsules as CapsuleForDigest[]),
      buildNotesResponseSchema()
    )) as NotesPayload;
  } catch (err: any) {
    await logCronRun("generate-daily-digest", "error", startedAt, {
      digest_date: targetDate,
      error_source: "gemini",
      error_message: `Notes generation failed: ${err.message}`,
    });
    return NextResponse.json({ success: false, error: `Notes generation failed: ${err.message}` }, { status: 502 });
  }

  const { data: upsertedDigest, error: digestError } = await supabase
    .from("daily_dose_digests")
    .upsert(
      {
        digest_date: targetDate,
        pillar_breakdown: notesData.pillar_breakdown || {},
        capsule_ids: capsules.map((c) => c.id),
        notes_en: notesData.notes_en,
        notes_hi: notesData.notes_hi,
        notes_mr: notesData.notes_mr,
      },
      { onConflict: "digest_date" }
    )
    .select("id")
    .single();

  if (digestError || !upsertedDigest) {
    await logCronRun("generate-daily-digest", "error", startedAt, {
      digest_date: targetDate,
      error_source: "supabase",
      error_message: digestError?.message || "Digest upsert returned no row",
    });
    return NextResponse.json({ success: false, error: digestError?.message }, { status: 500 });
  }

  // ---- Call 2: quiz. Independent of notes -- if this fails, the notes we
  // already saved above are NOT rolled back, so students still get the day's
  // notes even without a quiz. ----
  let quizData: QuizPayload | null = null;
  let quizError: string | null = null;
  try {
    quizData = (await callGemini(
      buildQuizInstruction(capsules as CapsuleForDigest[]),
      buildQuizResponseSchema()
    )) as QuizPayload;
  } catch (err: any) {
    quizError = err.message;
    console.error("Quiz generation failed (notes were still saved):", err.message);
  }

  let questionsGenerated = 0;
  if (quizData?.quiz?.length) {
    if (forceParam) {
      await supabase.from("daily_dose_quiz_questions").delete().eq("digest_id", upsertedDigest.id);
    }

    const quizRows = quizData.quiz.map((q, idx) => ({
      digest_id: upsertedDigest.id,
      question_text_en: q.question_text.en,
      question_text_hi: q.question_text.hi,
      question_text_mr: q.question_text.mr,
      option_a_en: q.option_a.en,
      option_a_hi: q.option_a.hi,
      option_a_mr: q.option_a.mr,
      option_b_en: q.option_b.en,
      option_b_hi: q.option_b.hi,
      option_b_mr: q.option_b.mr,
      option_c_en: q.option_c.en,
      option_c_hi: q.option_c.hi,
      option_c_mr: q.option_c.mr,
      option_d_en: q.option_d.en,
      option_d_hi: q.option_d.hi,
      option_d_mr: q.option_d.mr,
      explanation_en: q.explanation.en,
      explanation_hi: q.explanation.hi,
      explanation_mr: q.explanation.mr,
      correct_option: q.correct_option,
      question_type: q.question_type,
      source_tag: q.source_tag,
      sequence_order: idx + 1,
    }));

    const { error: insertError } = await supabase.from("daily_dose_quiz_questions").insert(quizRows);
    if (insertError) {
      quizError = `Quiz insert failed: ${insertError.message}`;
      console.error(quizError);
    } else {
      questionsGenerated = quizRows.length;
    }
  }

  await logCronRun("generate-daily-digest", quizError ? "error" : "success", startedAt, {
    digest_date: targetDate,
    capsules_synthesized: capsules.length,
    questions_generated: questionsGenerated,
    ...(quizError ? { quiz_error: quizError, note: "Notes saved successfully despite quiz failure." } : {}),
  });

  return NextResponse.json({
    success: true,
    digest_date: targetDate,
    capsules_synthesized: capsules.length,
    questions_generated: questionsGenerated,
    quiz_error: quizError,
  });
}