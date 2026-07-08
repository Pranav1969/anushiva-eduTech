// src/app/api/admin/translate-topic/route.ts
//
// On-demand translation helper for the admin notes editor (FormAddNotes).
// Takes a topic's English paragraph_text and asks Gemini for faithful
// Hindi + Marathi translations -- NOT rewrites. Every structural token the
// RevisionNotesTree renderer depends on (## headers, - bullets, **bold**,
// ==highlight==, $latex$, `code`, [img:token], [EXAMPLE]/[QUESTION]/
// [MOTIVATION] blocks, "|" table rows) must survive in the same positions,
// with only the human-language prose translated. This mirrors the
// notes_en/notes_hi/notes_mr pattern used by generate-daily-digest, but is
// triggered manually by an admin (not a cron job), and the admin reviews
// the result in the editor before saving -- this endpoint never writes to
// the database itself.

import { NextResponse } from "next/server";

const AI_GURUJI_KEY = process.env.AI_GURUJI_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_GURUJI_KEY}`;

interface TranslationPayload {
  hi: string;
  mr: string;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 4,
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

function buildTranslateInstruction(sourceText: string): string {
  return `
    You are translating study notes for Indian competitive-exam aspirants
    (RBI Grade B, SBI PO, IBPS, NABARD) from English into Hindi and Marathi.

    SOURCE TEXT (English):
    """
    ${sourceText}
    """

    Rules -- follow exactly:
    1. Translate ONLY the human-readable prose. Do NOT translate, remove, or
       reorder any of the following structural tokens -- copy them through
       exactly as they appear, in the same relative positions:
         - Lines starting with "## " (section headers) -- keep the "## "
           prefix, translate the header text after it.
         - List markers ("- ", "* ", "• ", "1. ", "2. ", etc) -- keep the
           marker, translate the text after it.
         - "**bold**" and "==highlight==" wrappers -- keep the ** or ==
           marks, translate only the text inside them.
         - "$...$" math/formula segments -- copy the content between the $
           signs UNCHANGED (do not translate numbers or formulas).
         - Backtick "\`code\`" segments -- copy UNCHANGED.
         - "[img:token]" image tokens -- copy UNCHANGED, including the
           token name inside the brackets.
         - "[EXAMPLE]...[/EXAMPLE]", "[QUESTION]...[/QUESTION]",
           "[MOTIVATION]...[/MOTIVATION]" block tags -- keep the tags
           exactly as-is, translate only the prose inside them.
         - Table rows built from "|" pipes -- keep the pipe structure and
           column count identical, translate only the cell text.
    2. Preserve the same number of lines and the same blank-line spacing as
       the source so the translation renders identically to the English
       version in the app.
    3. Write natural, exam-register Hindi and Marathi (Devanagari script for
       both) -- not a robotic word-for-word translation -- but do not add,
       drop, or reinterpret any information.

    Response MUST be raw JSON matching this structure, and NOTHING else:
    { "hi": string, "mr": string }
  `;
}

function buildTranslateResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      hi: { type: "STRING" },
      mr: { type: "STRING" },
    },
    required: ["hi", "mr"],
  };
}

async function callGemini(prompt: string, schema: object): Promise<TranslationPayload> {
  const response = await fetchWithRetry(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
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

  return JSON.parse(rawText) as TranslationPayload;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!AI_GURUJI_KEY) {
    return NextResponse.json(
      { success: false, error: "Missing Gemini API Key Environment Variable" },
      { status: 500 }
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceText = (body.text || "").trim();
  if (!sourceText) {
    return NextResponse.json({ success: false, error: "No source text provided to translate" }, { status: 400 });
  }

  try {
    const translated = await callGemini(
      buildTranslateInstruction(sourceText),
      buildTranslateResponseSchema()
    );
    return NextResponse.json({ success: true, hi: translated.hi, mr: translated.mr });
  } catch (err: any) {
    console.error("Topic translation failed:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}