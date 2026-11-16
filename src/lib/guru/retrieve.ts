// FILE: src/lib/guru/retrieve.ts
// Searching the rest of the notes (Phase 2), now in its own file.
import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "./embed";

const MIN_SCORE = Number(process.env.GURU_MIN_SCORE ?? 0.6); // retrieval cut-off; tune with GURU_DEBUG=1
const MAX_SOURCES = 3;      // other topics offered to the model per question
const CHUNKS_PER_TOPIC = 2;
const MAX_REFS = 2;         // reference chips shown under one answer
const DEBUG = process.env.GURU_DEBUG === "1";

export type Lang = "en" | "hi" | "mr";
export type Source = { sid: string; topicId: string; chapterId: string; topic: string; chapter: string; text: string; rank: number };
export type Ref = { topicId: string; chapterId: string; topic: string; chapter: string };

const SKIP_RETRIEVAL = /^(hi+|hello|hey|thanks?|thank you|thx|ok(ay)?|namaste|bye|good (morning|afternoon|evening)|👍|🙏)[\s!.🙏👍]*$/i;
export const shouldRetrieve = (m: string) => m.length >= 6 && !SKIP_RETRIEVAL.test(m.trim());

/** short follow-ups ("give example") are too vague alone, so borrow the topic name + previous question */
export function buildQueryText(message: string, selected: string | null, topicName: string, prevUser: string) {
  const parts = [selected || "", message];
  if (!selected && message.length < 30) parts.push(prevUser, topicName);
  return parts.filter(Boolean).join(" ").slice(0, 1000);
}

/** OR-style keyword query for Postgres full-text search (English words only; the vector side covers other languages) */
function keywordQuery(q: string): string | null {
  const words = Array.from(new Set((q.match(/[A-Za-z0-9]{3,}/g) || []).map((w) => w.toLowerCase()))).slice(0, 12);
  return words.length ? words.join(" | ") : null;
}

export async function retrieveSources(
  admin: SupabaseClient, queryText: string, excludeTopic: string | null, rank: number, lang: Lang
): Promise<{ sources: Source[]; debug: any }> {
  const embedding = await embedQuery(queryText);
  const { data, error } = await admin.rpc("match_note_chunks", {
    query_text: keywordQuery(queryText),
    p_exclude_topic: excludeTopic,
    p_plan_rank: rank,
    match_count: 10,
    query_embedding: embedding,
  });
  if (error) {
    console.warn("⚠️ retrieval failed:", error.message);
    return { sources: [], debug: { error: error.message } };
  }
  const rows: any[] = data || [];
  const pickName = (r: any, base: string) =>
    (lang !== "en" && r[`${base}_${lang}`]?.trim() ? r[`${base}_${lang}`] : r[`${base}_en`]) || "";

  const byTopic = new Map<string, Source>();
  const perTopic = new Map<string, number>();
  for (const r of rows) {
    if (r.score < MIN_SCORE) continue;
    let s = byTopic.get(r.topic_id);
    if (!s) {
      if (byTopic.size >= MAX_SOURCES) continue;
      s = {
        sid: `S${byTopic.size + 1}`, topicId: r.topic_id, chapterId: r.chapter_id,
        topic: pickName(r, "topic_name"), chapter: pickName(r, "chapter_name"), text: "", rank: r.plan_rank || 1,
      };
      byTopic.set(r.topic_id, s);
    }
    const n = perTopic.get(r.topic_id) || 0;
    if (n >= CHUNKS_PER_TOPIC) continue;
    perTopic.set(r.topic_id, n + 1);
    s.text += (s.text ? "\n…\n" : "") + String(r.content).slice(0, 1200);
  }
  return {
    sources: Array.from(byTopic.values()),
    debug: DEBUG ? rows.map((r) => ({ topic: r.topic_name_en, sim: +r.sim.toFixed(3), kw: +r.kw.toFixed(3), score: +r.score.toFixed(3) })) : undefined,
  };
}

/** removes the trailing "SOURCES: S1,S2" line the model writes for the app, and maps it to reference chips */
export function parseSources(text: string, sources: Source[]): { clean: string; refs: Ref[] } {
  let clean = text;
  let used: string[] = [];
  const m = text.match(/\n?[ \t]*[*_]*SOURCES[*_]*\s*:\s*([^\n]*?)[ \t*_]*$/i);
  if (m && m.index !== undefined) {
    clean = text.slice(0, m.index).trimEnd();
    used = (m[1].match(/S\d+/gi) || []).map((s) => s.toUpperCase());
  }
  clean = clean.replace(/\s*\[S\d+\]/g, "").trim(); // never leak tags
  const refs = sources
    .filter((s) => used.includes(s.sid))
    .slice(0, MAX_REFS)
    .map(({ topicId, chapterId, topic, chapter }) => ({ topicId, chapterId, topic, chapter }));
  return { clean, refs };
}

/** the block placed in front of the question when other topics were found */
export const relatedBlock = (sources: Source[]) =>
  sources.length
    ? `RELATED NOTES FROM OTHER TOPICS (use only if they genuinely help; otherwise ignore):\n` +
      sources.map((s) => `[${s.sid}] ${s.chapter} › ${s.topic}\n${s.text}`).join("\n\n") +
      `\n\n`
    : "";