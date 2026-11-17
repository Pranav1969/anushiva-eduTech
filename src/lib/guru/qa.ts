// FILE: src/lib/guru/qa.ts
// Knowledge-bank helpers: classify a question, build its canonical key, guard against
// look-alike questions, and read / write saved answers.
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ref } from "./retrieve";
import { generate } from "./gemini";
import type { Usage } from "./gemini";

// ---------- tunables (override in .env.local without touching code) ----------
const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !isNaN(Number(v)) ? Number(v) : d);
export const SIM_TRUSTED = num(process.env.GURU_SIM_TRUSTED, 0.9);          // serve a TRUSTED answer at/above this similarity
export const SIM_PROVISIONAL = num(process.env.GURU_SIM_PROVISIONAL, 0.93); // stricter for answers nobody has approved yet

export const planRank = (p?: string | null) =>
  ({ silver: 2, gold: 3, premium: 4 } as Record<string, number>)[(p || "free").toLowerCase()] || 1;

// ---------- normalising + keys ----------
export const norm = (s: string) =>
  s.toLowerCase()
    .replace(/[“”"‘’`]/g, "")
    .replace(/[^\p{L}\p{N}\s.%+\-×÷=/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** exact-match key. concept questions are global; chips / highlights are tied to one topic */
export const qHash = (canonical: string, lang: string, scopeTopic: string | null) =>
  createHash("sha256").update(`${lang}|${scopeTopic || ""}|${norm(canonical)}`).digest("hex");

/**
 * "Literal signature": numbers, CAPITAL words and "quoted" words found in the question.
 * Two questions may only be treated as the same when these match exactly,
 * so "code CAT" never collides with "code DOG", and "15% of 240" never with "15% of 250".
 */
export function literalSig(q: string): string {
  const nums = q.match(/\d+(?:[.,]\d+)?/g) || [];
  const caps = q.match(/\b[A-Z]{2,}\b/g) || [];
  const quoted = Array.from(q.matchAll(/[“"]([^”"]{1,40})[”"]|(?<![A-Za-z])'([^']{1,40})'(?![A-Za-z])/g))
    .map((m) => (m[1] || m[2] || "").toLowerCase().trim())
    .filter(Boolean);
  return Array.from(new Set([...nums, ...caps, ...quoted])).sort().join("|");
}

export const hasNegation = (q: string) =>
  /\b(not|no|never|none|neither|nor|cannot|without|except|opposite)\b|n't\b|नहीं|नही|\bन\b/i.test(q);

// ---------- what kind of message is this? ----------
const PRONOUN = /\b(it|its|this|that|these|those|they|them|above|previous|earlier|same|again|another|one more)\b|इसका|इसमें|यह|ये|वो|त्याचा|हे\b/i;
const VAGUE_START = /^(why|how so|and|but|so|then|example|examples|more|again|elaborate|simplify|continue|next|ok|okay)\b/i;
/** true when the message can be understood on its own, so no rewrite model call is needed */
export const looksSelfContained = (m: string) => {
  const t = m.trim();
  if (t.length < 8 || t.length > 400) return false;
  if (/[\u0900-\u097F]/.test(t)) return false;           // Devanagari -> let the rewriter translate to English
  if (PRONOUN.test(t)) return false;
  if (t.split(/\s+/).length < 2) return false;
  if (VAGUE_START.test(t) && t.length < 40) return false;
  return true;
};

const PERSONAL =
  /\b(my|mine|i (got|get|solved|tried|did|answered|selected|chose|marked|scored|failed|am (confused|stuck|weak))|where did i|what did i|check my|mera|meri|mere|mujhe|maine|मेरा|मेरी|मुझे|मैंने|माझं|माझे|मला)\b|\bwrong answer\b|\bmy (score|rank|result|answer|mistake)\b/i;
export const isStudentSpecific = (m: string) => PERSONAL.test(m);

// The five quick-action chips shown in the chat. They depend only on the open topic.
export const CHIPS: Record<string, { id: string; canonical: (topic: string) => string }> = {
  "explain this topic simply": {
    id: "explain",
    canonical: (t) => `Explain the topic "${t}" simply, step by step, for a beginner.`,
  },
  "give me a real example": {
    id: "example",
    canonical: (t) => `Give one clear, real worked example from the topic "${t}" and walk through it.`,
  },
  "key points to remember": {
    id: "keypoints",
    canonical: (t) => `List the key points and formulas to remember from the topic "${t}".`,
  },
  "common mistakes here": {
    id: "mistakes",
    canonical: (t) => `List the most common mistakes students make in the topic "${t}" and how to avoid them.`,
  },
};
export const chipOf = (message: string) => CHIPS[norm(message)] || null;

// ---------- rewrite follow-ups into standalone questions (one tiny model call) ----------
export type Rewrite = { standalone: string; kind: "concept" | "student_specific" | "chitchat" | "other"; usage: Usage };

export async function rewriteQuestion(
  message: string,
  recent: { role: "user" | "model"; text: string }[],
  topicName: string
): Promise<Rewrite | null> {
  const transcript = recent
    .slice(-4)
    .map((t) => `${t.role === "user" ? "Student" : "Guruji"}: ${t.text.replace(/\s+/g, " ").slice(0, 280)}`)
    .join("\n");

  const prompt = `You prepare a student's chat message for a study app.
Topic the student is reading: ${topicName || "(none)"}
${transcript ? `Recent chat:\n${transcript}\n` : ""}
Student's new message: """${message.slice(0, 500)}"""

Return JSON only, exactly: {"standalone": string, "kind": "concept" | "student_specific" | "chitchat" | "other"}
- "standalone": the message rewritten, IN ENGLISH, as ONE complete question that can be understood with no chat history. Keep every number, name and letter-code exactly as written. If the message already stands alone, translate/clean it only. Do not answer it.
- "kind": "concept" = a study question about the subject; "student_specific" = depends on the student's own answer, score, work or situation; "chitchat" = greeting, thanks, feelings, motivation; "other" = unclear, unsafe or unrelated to studying.`;

  const r = await generate(null, [{ role: "user", parts: [{ text: prompt }] }], {
    fast: true, json: true, temperature: 0, maxOutputTokens: 300, timeoutMs: 15_000,
  });
  if (!r) return null;
  try {
    const j = JSON.parse(r.text.replace(/^```json|```$/g, "").trim());
    const standalone = String(j.standalone || "").trim();
    const kind = ["concept", "student_specific", "chitchat", "other"].includes(j.kind) ? j.kind : "other";
    if (standalone.length < 5 || standalone.length > 400) return null;
    return { standalone, kind, usage: r.usage };
  } catch {
    return null;
  }
}

// ---------- the bank ----------
export type BankHit = { id: string; answer: string; refs: Ref[] | null; via: "exact" | "semantic"; sim: number };

export async function findExact(admin: SupabaseClient, hash: string, lang: string, rank: number): Promise<BankHit | null> {
  const { data, error } = await admin
    .from("guru_qa_bank")
    .select("id, answer, refs")
    .eq("q_hash", hash).eq("lang", lang)
    .in("status", ["provisional", "trusted"])
    .lte("min_rank", rank)
    .maybeSingle();
  if (error) { console.warn("⚠️ bank exact lookup failed:", error.message); return null; }
  return data ? { id: data.id, answer: data.answer, refs: data.refs, via: "exact", sim: 1 } : null;
}

export async function findSemantic(
  admin: SupabaseClient, embedding: number[], lang: string, rank: number, canonical: string
): Promise<BankHit | null> {
  const { data, error } = await admin.rpc("match_qa_bank", {
    p_lang: lang, p_plan_rank: rank, match_count: 5, query_embedding: embedding,
  });
  if (error) { console.warn("⚠️ bank semantic lookup failed:", error.message); return null; }

  const sig = literalSig(canonical);
  const neg = hasNegation(canonical);
  for (const c of (data || []) as any[]) {
    const need = c.status === "trusted" ? SIM_TRUSTED : SIM_PROVISIONAL;
    if (c.sim < need) break;                 // sorted best-first, so nothing later can pass
    if ((c.sig || "") !== sig) continue;     // numbers / codes / quoted words must match exactly
    if (!!c.neg !== neg) continue;           // "is" vs "is not"
    return { id: c.id, answer: c.answer, refs: c.refs, via: "semantic", sim: c.sim };
  }
  return null;
}

export async function storeEntry(
  admin: SupabaseClient,
  e: {
    hash: string; lang: string; kind: "concept" | "chip" | "highlight"; canonical: string;
    scopeTopic: string | null; answer: string; refs: Ref[]; minRank: number;
    embedding: number[] | null; model: string;
  }
): Promise<string | null> {
  const { data, error } = await admin
    .from("guru_qa_bank")
    .upsert(
      {
        q_hash: e.hash, lang: e.lang, kind: e.kind,
        question_canonical: e.canonical,
        scope_topic_id: e.scopeTopic,
        answer: e.answer,
        refs: e.refs.length ? e.refs : null,
        cited_topic_ids: e.refs.map((r) => r.topicId),
        sig: literalSig(e.canonical),
        neg: hasNegation(e.canonical),
        min_rank: e.minRank,
        embedding: e.embedding,
        status: "provisional", up: 0, down: 0,   // a regenerated answer starts fresh
        model: e.model,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "q_hash,lang" }
    )
    .select("id")
    .single();
  if (error) { console.warn("⚠️ saving to bank failed:", error.message); return null; }
  return data.id;
}

export const bumpHit = (admin: SupabaseClient, id: string) =>
  void admin.rpc("guru_bump_hit", { p_id: id }).then(() => {}, () => {});

/**
 * Saved answers carry a snapshot of the topics they leaned on. Before showing them to
 * THIS student, drop the open topic and anything above the student's plan.
 */
export async function validRefs(admin: SupabaseClient, refs: Ref[] | null, rank: number, currentTopic: string | null): Promise<Ref[]> {
  const list = (refs || []).filter((r) => r.topicId !== currentTopic);
  if (!list.length) return [];
  const { data } = await admin
    .from("notes_topics")
    .select("id, notes_chapters(required_plan, notes_phases(notes_sections(required_plan)))")
    .in("id", list.map((r) => r.topicId));
  const one = (x: any) => (Array.isArray(x) ? x[0] : x);
  const okIds = new Set(
    (data || [])
      .filter((row: any) => {
        const ch = one(row.notes_chapters);
        const sec = one(one(ch?.notes_phases)?.notes_sections);
        return Math.max(planRank(ch?.required_plan), planRank(sec?.required_plan)) <= rank;
      })
      .map((row: any) => row.id)
  );
  return list.filter((r) => okIds.has(r.topicId));
}