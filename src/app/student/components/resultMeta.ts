//src\app\student\components\resultMeta.ts
// Shared helpers for result analysis.
// Chapters / topics are grouped by their database IDs (chapter_id / topic_id) when
// available, and by a normalised name otherwise, so "Syllogism", "syllogism " and
// "SYLLOGISM" are always the same chapter and old (name-only) questions merge with
// new (id-linked) questions automatically.

const PLACEHOLDERS = new Set([
  "", "general", "unassigned", "general topic", "general subject",
  "general setup", "general layout breakdown", "n/a", "na", "none", "null", "undefined", "-",
]);

/** Returns the real value, or null when the assigner left it blank / default. */
export const cleanMeta = (v?: string | null): string | null => {
  const s = (v ?? "").trim();
  return PLACEHOLDERS.has(s.toLowerCase()) ? null : s;
};

export const normKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export type Verdict = "correct" | "wrong" | "skipped";

export const getVerdict = (userAns?: string, correct?: string): Verdict => {
  const u = (userAns ?? "").trim().toLowerCase();
  const c = (correct ?? "").trim().toLowerCase();
  if (!u) return "skipped";
  return u === c ? "correct" : "wrong";
};

export const UNTAGGED_CHAPTER = "Chapter not tagged";
export const UNTAGGED_TOPIC = "Topic not tagged";
export const UNTAGGED_CHAPTER_KEY = "none";

export interface TaxonomyInput {
  chapter?: string | null;
  chapter_id?: string | null;
  topic_name?: string | null;
  topic_id?: string | null;
}

export interface TaxonomyInfo {
  chapterKey: string;
  chapterName: string;
  chapterTagged: boolean;
  topicKey: string;
  topicName: string;
  topicTagged: boolean;
}

/**
 * Returns one TaxonomyInfo per question (same order as the input array).
 * Keys are stable identifiers used for grouping; names are for display only.
 */
export function resolveTaxonomy(questions: TaxonomyInput[]): TaxonomyInfo[] {
  // Pass 1 - learn which names belong to which ids (so name-only rows can join id rows)
  const chapterIdByName = new Map<string, string>();
  const topicIdByName = new Map<string, string>();

  questions.forEach((q) => {
    const cn = cleanMeta(q.chapter);
    if (q.chapter_id && cn) chapterIdByName.set(normKey(cn), q.chapter_id);
  });
  questions.forEach((q) => {
    const tn = cleanMeta(q.topic_name);
    const cn = cleanMeta(q.chapter);
    const cid = q.chapter_id || (cn ? chapterIdByName.get(normKey(cn)) : undefined);
    if (q.topic_id && tn && cid) topicIdByName.set(`${cid}|${normKey(tn)}`, q.topic_id);
  });

  // Pass 2 - compute identity for each question
  const firstName = new Map<string, string>();
  const infos = questions.map((q) => {
    const cn = cleanMeta(q.chapter);
    const cid = q.chapter_id || (cn ? chapterIdByName.get(normKey(cn)) : undefined) || null;

    let chapterKey = UNTAGGED_CHAPTER_KEY;
    let chapterTagged = false;
    let chapterName = UNTAGGED_CHAPTER;
    if (cid) {
      chapterKey = `id:${cid}`;
      chapterTagged = true;
      chapterName = cn ?? "Chapter";
    } else if (cn) {
      chapterKey = `n:${normKey(cn)}`;
      chapterTagged = true;
      chapterName = cn;
    }

    const tn = cleanMeta(q.topic_name);
    const tid = q.topic_id || (tn && cid ? topicIdByName.get(`${cid}|${normKey(tn)}`) : undefined) || null;

    let topicKey = `${chapterKey}|none`;
    let topicTagged = false;
    let topicName = UNTAGGED_TOPIC;
    if (tid) {
      topicKey = `id:${tid}`;
      topicTagged = true;
      topicName = tn ?? "Topic";
    } else if (tn) {
      topicKey = `${chapterKey}|n:${normKey(tn)}`;
      topicTagged = true;
      topicName = tn;
    }

    if (chapterTagged && !firstName.has(chapterKey)) firstName.set(chapterKey, chapterName);
    if (topicTagged && !firstName.has(topicKey)) firstName.set(topicKey, topicName);

    return { chapterKey, chapterName, chapterTagged, topicKey, topicName, topicTagged } as TaxonomyInfo;
  });

  // Pass 3 - one display name per key (first seen wins)
  return infos.map((i) => ({
    ...i,
    chapterName: i.chapterTagged ? firstName.get(i.chapterKey) ?? i.chapterName : i.chapterName,
    topicName: i.topicTagged ? firstName.get(i.topicKey) ?? i.topicName : i.topicName,
  }));
}