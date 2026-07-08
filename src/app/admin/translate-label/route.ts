// src/app/api/admin/translate-label/route.ts
//
// Lightweight sibling to /api/admin/translate-topic. That route handles
// long paragraph_text bodies and has to preserve markdown/syntax tokens.
// This one is for short titles -- section/phase/chapter/topic names like
// "Ratio and Proportion" or "RBI Circulars" -- so the prompt is simpler:
// just a faithful, exam-register Hindi + Marathi translation of a single
// line of text, no structural tokens to protect.

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

function buildInstruction(sourceText: string): string {
  return `
    You are translating a short syllabus title for Indian banking-exam
    aspirants (RBI Grade B, SBI PO, IBPS, NABARD) from English into Hindi
    and Marathi.

    SOURCE TITLE (English): "${sourceText}"

    Rules:
    1. Give a natural, exam-register translation, in Devanagari script for
       both languages -- the kind of phrasing that appears on a syllabus
       or chapter index, not a literal word-for-word gloss.
    2. Keep it a single short title, not a sentence or explanation.
    3. Well-established English acronyms/terms that aspirants already
       recognize in English (e.g. "RBI", "GDP", "NPA") may be kept as-is
       inside the translated title if that's how aspirants actually refer
       to them -- use judgement, don't force a translation that would
       confuse more than it clarifies.

    Response MUST be raw JSON matching this structure, and NOTHING else:
    { "hi": string, "mr": string }
  `;
}

function buildResponseSchema() {
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
    return NextResponse.json({ success: false, error: "No source title provided to translate" }, { status: 400 });
  }

  try {
    const translated = await callGemini(buildInstruction(sourceText), buildResponseSchema());
    return NextResponse.json({ success: true, hi: translated.hi, mr: translated.mr });
  } catch (err: any) {
    console.error("Label translation failed:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}