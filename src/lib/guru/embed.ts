// FILE: src/lib/guru/embed.ts
// Gemini embeddings (multilingual: a Hindi/Marathi/Hinglish question finds English notes).
// Vectors are stored in Postgres as vector(768).

const MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
export const EMBED_DIM = 768;
/** saved with every chunk; if you change model/dimension, the re-index route rebuilds automatically */
export const embedModelId = () => `${MODEL}:${EMBED_DIM}`;

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const key = () => process.env.GEMINI_API_KEY || process.env.AI_GURUJI_KEY || "";

const normalise = (v: number[]) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(url: string, body: unknown, retries = 2): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key() },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

/** Embeds notes chunks (RETRIEVAL_DOCUMENT). Max 100 texts per call. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const json = await post(`${BASE}/${MODEL}:batchEmbedContents`, {
      requests: batch.map((text) => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: EMBED_DIM,
      })),
    });
    const vecs: number[][] = (json.embeddings || []).map((e: any) => normalise(e.values));
    if (vecs.length !== batch.length) throw new Error("embedding count mismatch");
    out.push(...vecs);
  }
  return out;
}

/** Embeds a student's question (RETRIEVAL_QUERY). Returns null on any failure so chat keeps working. */
export async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const json = await post(
      `${BASE}/${MODEL}:embedContent`,
      {
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: EMBED_DIM,
      },
      1
    );
    const values: number[] | undefined = json.embedding?.values;
    return values ? normalise(values) : null;
  } catch (e) {
    console.warn("⚠️ query embedding failed (keyword search only):", String(e).slice(0, 200));
    return null;
  }
}
/** Embeds a QUESTION for question-to-question matching. Same function is used when saving and when looking up. */
export async function embedQuestion(text: string): Promise<number[] | null> {
  try {
    const json = await post(
      `${BASE}/${MODEL}:embedContent`,
      {
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        taskType: "SEMANTIC_SIMILARITY",
        outputDimensionality: EMBED_DIM,
      },
      1
    );
    const values: number[] | undefined = json.embedding?.values;
    return values ? normalise(values) : null;
  } catch (e) {
    console.warn("⚠️ question embedding failed:", String(e).slice(0, 200));
    return null;
  }
}