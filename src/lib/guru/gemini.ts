// FILE: src/lib/guru/gemini.ts   (v2: optional "thinking" control for speed)
// One place that talks to Gemini for text. Tries models in order, remembers dead ones,
// and reports token usage so the ledger can measure real cost.

const list = (v: string | undefined, fallback: string) =>
  (v || fallback).split(",").map((s) => s.trim()).filter(Boolean);

// Override without redeploying code:  GEMINI_MODELS="a,b,c"   GEMINI_FAST_MODELS="x,y"
const MODELS = list(process.env.GEMINI_MODELS, "gemini-3.5-flash-lite,gemini-2.5-flash-lite,gemini-3.8-flash");
const FAST_MODELS = list(process.env.GEMINI_FAST_MODELS, "gemini-3.5-flash-lite,gemini-2.5-flash-lite");
const dead = new Set<string>(); // models that answered 404 -> skipped until the server restarts

// Optional speed knob. "Thinking" tokens are slow; for tutoring answers a little is enough.
// .env.local example (check each model's docs for the exact field it accepts):
//   GEMINI_THINKING={"gemini-3":{"thinkingLevel":"low"},"gemini-2.5":{"thinkingBudget":0}}
// If Google rejects the setting (HTTP 400) the call is retried automatically without it.
const THINKING: Record<string, any> = (() => {
  try { return JSON.parse(process.env.GEMINI_THINKING || "{}"); } catch { return {}; }
})();
const thinkingFor = (model: string) => {
  const key = Object.keys(THINKING).find((k) => model.startsWith(k));
  return key ? THINKING[key] : null;
};

export type Usage = { input: number; output: number; thinking: number };
export type GenResult = { text: string; model: string; usage: Usage };

export const sumUsage = (list: (Usage | undefined)[]): Usage =>
  list.reduce<Usage>(
    (a, u) => ({ input: a.input + (u?.input || 0), output: a.output + (u?.output || 0), thinking: a.thinking + (u?.thinking || 0) }),
    { input: 0, output: 0, thinking: 0 }
  );

type Opts = { fast?: boolean; json?: boolean; maxOutputTokens?: number; temperature?: number; timeoutMs?: number };

export async function generate(
  system: string | null,
  contents: { role: string; parts: { text: string }[] }[],
  opts: Opts = {}
): Promise<GenResult | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_GURUJI_KEY;
  if (!apiKey) { console.error("❌ GEMINI_API_KEY / AI_GURUJI_KEY not set"); return null; }

  let lastError: any = null;
  for (const model of opts.fast ? FAST_MODELS : MODELS) {
    if (dead.has(model)) continue;
    const th = thinkingFor(model);

    for (const useThinking of th ? [true, false] : [false]) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
            contents,
            generationConfig: {
              temperature: opts.temperature ?? 0.6,
              maxOutputTokens: opts.maxOutputTokens ?? 2048,
              ...(opts.json ? { responseMimeType: "application/json" } : {}),
              ...(useThinking ? { thinkingConfig: th } : {}),
            },
          }),
          signal: ctrl.signal,
        });

        if (res.ok) {
          const json = await res.json();
          const text = (json.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("").trim();
          if (text) {
            const u = json.usageMetadata || {};
            return {
              text, model,
              usage: { input: u.promptTokenCount || 0, output: u.candidatesTokenCount || 0, thinking: u.thoughtsTokenCount || 0 },
            };
          }
          lastError = { model, blocked: json.promptFeedback?.blockReason || json.candidates?.[0]?.finishReason || "empty" };
          break;
        }

        const errBody = await res.json().catch(() => ({}));
        lastError = { model, status: res.status, body: errBody };
        if (res.status === 400 && useThinking) {
          console.warn(`⚠️ ${model} rejected the GEMINI_THINKING setting, retrying without it`);
          continue; // second pass: no thinking config
        }
        if (res.status === 404) dead.add(model);
        break; // try the next model
      } catch (e: any) {
        lastError = { model, error: e?.name === "AbortError" ? "timeout" : String(e) };
        break;
      } finally {
        clearTimeout(timer);
      }
    }
  }
  console.error("❌ All Gemini models failed:", JSON.stringify(lastError));
  return null;
}