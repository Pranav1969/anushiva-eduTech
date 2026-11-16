// FILE: src/app/api/chat/route.ts   (Smriti-Sync · Phase 3)
//
//   message ─► greeting/thanks?  ─► free template reply (no model)
//           ─► chip / highlight / study question?
//                 └► rewrite follow-ups into a standalone question (tiny model call, only when needed)
//                 └► look in the shared knowledge bank (exact key, then meaning + guards)
//                       HIT  ─► saved neutral answer + personal touch (free)
//                       MISS ─► Gemini writes a neutral CORE answer from the notes ─► saved ─► personal touch
//           ─► personal / student-specific ─► full personal answer with the chat so far (never shared)
//
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cleanForAI } from "@/lib/guru/text";
import { embedQuestion } from "@/lib/guru/embed";
import { generate, sumUsage, Usage } from "@/lib/guru/gemini";
import {
  planRank, qHash, chipOf, isStudentSpecific, looksSelfContained, rewriteQuestion,
  findExact, findSemantic, storeEntry, bumpHit, validRefs,
} from "@/lib/guru/qa";
import { applySkin, chitchatReply, Situation } from "@/lib/guru/skin";
import { buildPersonalPrompt, buildCorePrompt, LANG_NAME } from "@/lib/guru/prompts";
import {
  retrieveSources, shouldRetrieve, buildQueryText, parseSources, relatedBlock, Lang, Ref, Source,
} from "@/lib/guru/retrieve";

export const runtime = "nodejs";
export const maxDuration = 60;

const HISTORY_TURNS = 8;
const MAX_USER_CHARS = 2000;
const MAX_QUOTE_CHARS = 700;
const MAX_NOTES_CHARS = 6000;
const DEBUG = process.env.GURU_DEBUG === "1";
const BUSY = "Guruji is a little busy right now. Please send that again in a moment 🙏";

type Turn = { role: "user" | "model"; text: string };
type Kind = "concept" | "chip" | "highlight" | "personal";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const one = (x: any) => (Array.isArray(x) ? x[0] : x);
const withQuote = (text: string, quote?: string | null) =>
  quote ? `[Student highlighted from the notes: "${quote}"]\n${text}` : text;

async function resolveStudent(req: NextRequest, admin: SupabaseClient) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: student } = await admin
    .from("students").select("id, name, gender, current_plan").eq("auth_id", data.user.id).maybeSingle();
  return student || null;
}

async function loadTopic(admin: SupabaseClient, topicId: string, lang: Lang) {
  const { data } = await admin
    .from("notes_topics")
    .select(
      "id, name_en, name_hi, name_mr, paragraph_text_en, paragraph_text_hi, paragraph_text_mr, " +
      "notes_chapters(required_plan, notes_phases(notes_sections(required_plan)))"
    )
    .eq("id", topicId)
    .maybeSingle();
  if (!data) return null;
  const d: any = data;
  const pick = (base: string) => (lang !== "en" && d[`${base}_${lang}`]?.trim() ? d[`${base}_${lang}`] : d[`${base}_en`]) || "";
  const ch = one(d.notes_chapters);
  const sec = one(one(ch?.notes_phases)?.notes_sections);
  return {
    name: pick("name"),
    text: cleanForAI(pick("paragraph_text"), MAX_NOTES_CHARS),
    rank: Math.max(planRank(ch?.required_plan), planRank(sec?.required_plan)),
  };
}

function normaliseTurns(turns: Turn[]) {
  const merged: Turn[] = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.text += `\n\n${t.text}`;
    else merged.push({ ...t });
  }
  while (merged.length && merged[0].role !== "user") merged.shift();
  return merged.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
}

function coreUserText(
  kind: Kind, canonical: string, selected: string | null, selectionKind: string | null, intent: string | null, sources: Source[]
) {
  if (kind === "highlight") {
    const task =
      intent === "example"
        ? "Give a clear, simple worked example that helps understand this passage."
        : selectionKind === "word"
        ? "Explain what this word or phrase means in this context, in simple words."
        : "Explain this passage in simple words, step by step.";
    return `PASSAGE FROM THE NOTES:\n"""\n${selected}\n"""\n\nTASK: ${task}`;
  }
  return `${relatedBlock(sources)}${kind === "chip" ? "TASK" : "QUESTION"}:\n${canonical}`;
}

// =====================================================================
export async function POST(req: NextRequest) {
  const startedAt = new Date();
  try {
    const body = await req.json();
    const message = str(body.message, MAX_USER_CHARS);
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    if (!process.env.GEMINI_API_KEY && !process.env.AI_GURUJI_KEY) {
      console.error("❌ GEMINI_API_KEY / AI_GURUJI_KEY not set");
      return NextResponse.json({ reply: "Guruji is not configured yet. Please tell the admin." }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const admin = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null;

    const ctx = body.noteContext || {};
    const lang: Lang = ["en", "hi", "mr"].includes(ctx.lang) ? ctx.lang : "en";
    const topicId = typeof ctx.topicId === "string" && /^[0-9a-f-]{36}$/i.test(ctx.topicId) ? ctx.topicId : null;
    const selectedText = str(body.selectedText, MAX_QUOTE_CHARS) || null;
    const selectionKind = ["word", "line", "passage"].includes(body.selectionKind) ? (body.selectionKind as string) : null;
    const intent = ["explain", "example", "doubt"].includes(body.intent) ? (body.intent as string) : null;

    const student = admin ? await resolveStudent(req, admin) : null;
    const rank = planRank(student?.current_plan);

    // ---- the open topic (notes come from the database) ----
    let notes = "";
    let topicName = str(ctx.topic, 200);
    let topicRank = 1;
    if (admin && topicId) {
      const t = await loadTopic(admin, topicId, lang);
      if (t) { notes = t.text; topicName = t.name || topicName; topicRank = t.rank; }
    }
    if (!notes) notes = cleanForAI(str(ctx.topicText, MAX_NOTES_CHARS), MAX_NOTES_CHARS);

    // ---- thread + recent turns ----
    let threadId: string | null = null;
    let threadCount = 0;
    const turns: Turn[] = [];
    if (admin && student && topicId) {
      const { data: thread, error } = await admin
        .from("guru_threads")
        .upsert({ student_id: student.id, topic_id: topicId, lang }, { onConflict: "student_id,topic_id" })
        .select("id, message_count").single();
      if (error) console.warn("⚠️ thread upsert failed:", error.message);
      else {
        threadId = thread.id;
        threadCount = thread.message_count || 0;
        const { data: recent } = await admin
          .from("guru_messages").select("role, content, quote")
          .eq("thread_id", thread.id).order("created_at", { ascending: false }).limit(HISTORY_TURNS);
        (recent || []).reverse().forEach((m: any) =>
          turns.push({ role: m.role === "ai" ? "model" : "user", text: m.role === "ai" ? m.content : withQuote(m.content, m.quote) })
        );
      }
    } else if (Array.isArray(body.chatHistory)) {
      body.chatHistory.slice(-6).forEach((m: any) => {
        const text = str(m?.text, 1500);
        if (text) turns.push({ role: m?.role === "ai" ? "model" : "user", text });
      });
    }
    const prevUser = [...turns].reverse().find((t) => t.role === "user")?.text.replace(/^\[Student highlighted[^\]]*\]\n/, "") || "";

    // ---- who are we talking to ----
    const first = student?.name?.split(" ")[0] || str(body.student?.firstName, 40) || "Student";
    const gender = (student?.gender || body.student?.gender || "").toLowerCase();
    const addressing = ["female", "girl", "f"].includes(gender) ? `${first} beta` : first;

    // ---- helpers that need the context above ----
    const persist = async (reply: string, refs: Ref[], source: string, model: string | null, qaId: string | null) => {
      if (!admin || !threadId) return { persisted: false, messageId: null as string | null };
      const aiAt = new Date();
      const { data, error } = await admin.from("guru_messages").insert([
        { thread_id: threadId, role: "user", content: message, quote: selectedText, source: "user", created_at: startedAt.toISOString() },
        { thread_id: threadId, role: "ai", content: reply, source, model, qa_id: qaId, refs: refs.length ? refs : null, created_at: aiAt.toISOString() },
      ]).select("id, role");
      if (error) { console.warn("⚠️ saving messages failed:", error.message); return { persisted: false, messageId: null }; }
      await admin.from("guru_threads")
        .update({ message_count: threadCount + 2, last_active_at: aiAt.toISOString(), lang }).eq("id", threadId);
      return { persisted: true, messageId: (data || []).find((r: any) => r.role === "ai")?.id ?? null };
    };

    const respond = async (r: {
      reply: string; refs: Ref[]; source: "cache" | "llm" | "template"; path: string; kind: string;
      model?: string | null; qaId?: string | null; usage?: Usage; sim?: number | null; debug?: any;
    }) => {
      const saved = await persist(r.reply, r.refs, r.source, r.model ?? null, r.qaId ?? null);
      if (admin) {
        void admin.from("guru_usage").insert({
          student_id: student?.id ?? null, topic_id: topicId, path: r.path, kind: r.kind, model: r.model ?? null,
          tokens_in: r.usage?.input || 0, tokens_out: r.usage?.output || 0, tokens_think: r.usage?.thinking || 0,
          qa_id: r.qaId ?? null, sim: r.sim ?? null, latency_ms: Date.now() - startedAt.getTime(),
        }).then(() => {}, () => {});
      }
      return NextResponse.json({
        reply: r.reply, refs: r.refs, persisted: saved.persisted, messageId: saved.messageId, threadId,
        source: r.source, kind: r.kind,
        ...(DEBUG ? { debug: { path: r.path, sim: r.sim, ...(r.debug || {}) } } : {}),
      });
    };

    // =================================================================
    // 1) greetings / thanks: free, no model
    // =================================================================
    if (!selectedText) {
      const chat = chitchatReply(message, addressing, lang);
      if (chat) return respond({ reply: chat, refs: [], source: "template", path: "template", kind: "chitchat" });
    }

    // =================================================================
    // 2) what kind of question is this, and what is its standalone form?
    // =================================================================
    let kind: Kind = "personal";
    let canonical = "";
    let scope: string | null = null;
    let situation: Situation = "first";
    let rewriteUsage: Usage | undefined;

    const chip = !selectedText && topicId && topicName ? chipOf(message) : null;
    if (chip) {
      kind = "chip"; scope = topicId; situation = "chip";
      canonical = chip.canonical(topicName);
    } else if (selectedText && topicId && (intent === "explain" || intent === "example")) {
      kind = "highlight"; scope = topicId; situation = "highlight";
      const label = intent === "example" ? "Simple example for" : selectionKind === "word" ? "Meaning in context" : "Explain simply";
      canonical = `${label}: "${selectedText}"`;
    } else if (selectedText || intent === "doubt") {
      kind = "personal";                                   // a doubt about a highlight is about THIS student
    } else if (isStudentSpecific(message)) {
      kind = "personal";
    } else if (looksSelfContained(message)) {
      kind = "concept"; canonical = message.trim();
    } else {
      const rw = await rewriteQuestion(message, turns, topicName);
      rewriteUsage = rw?.usage;
      if (rw && rw.kind === "concept") { kind = "concept"; canonical = rw.standalone; situation = "followup"; }
    }

    // =================================================================
    // 3) shared knowledge bank: reuse, or write once for everyone
    // =================================================================
    if (admin && kind !== "personal" && canonical) {
      const hash = qHash(canonical, lang, kind === "concept" ? null : scope);
      let hit = await findExact(admin, hash, lang, rank);
      let embedding: number[] | null = null;
      if (!hit && kind === "concept") {
        embedding = await embedQuestion(canonical);
        if (embedding) hit = await findSemantic(admin, embedding, lang, rank, canonical);
      }

      if (hit) {
        bumpHit(admin, hit.id);
        const refs = await validRefs(admin, hit.refs, rank, topicId);
        const reply = applySkin({ core: hit.answer, name: addressing, lang, situation, prevQuestion: prevUser });
        return respond({
          reply, refs, source: "cache", kind, qaId: hit.id, sim: hit.sim, usage: rewriteUsage,
          path: hit.via === "exact" ? "cache_exact" : "cache_semantic", debug: { canonical },
        });
      }

      // ---- miss: ask Gemini for a neutral CORE answer (no chat history needed) ----
      let sources: Source[] = [];
      let retrievalDebug: any;
      if (kind === "concept" && shouldRetrieve(canonical)) {
        const r = await retrieveSources(admin, canonical, topicId, rank, lang);
        sources = r.sources;
        retrievalDebug = r.debug;
      }
      const system = buildCorePrompt({ langName: LANG_NAME[lang], chapter: str(ctx.chapter, 160), topic: topicName, notes });
      const gen = await generate(system, [{ role: "user", parts: [{ text: coreUserText(kind, canonical, selectedText, selectionKind, intent, sources) }] }]);
      if (!gen) return NextResponse.json({ reply: BUSY, refs: [], persisted: false }, { status: 502 });

      const { clean, refs } = parseSources(gen.text, sources);
      const minRank = Math.max(topicRank, 1, ...sources.map((s) => s.rank));
      let qaId: string | null = null;
      if (clean.length >= 40) {
        if (kind === "concept" && !embedding) embedding = await embedQuestion(canonical);
        qaId = await storeEntry(admin, {
          hash, lang, kind, canonical, scopeTopic: kind === "concept" ? null : scope,
          answer: clean, refs, minRank, embedding: kind === "concept" ? embedding : null, model: gen.model,
        });
      }
      const reply = applySkin({ core: clean, name: addressing, lang, situation, prevQuestion: prevUser });
      return respond({
        reply, refs, source: "llm", kind, qaId, model: gen.model, path: "llm_core",
        usage: sumUsage([rewriteUsage, gen.usage]),
        debug: { canonical, offered: sources.map((s) => `${s.sid}:${s.topic}`), candidates: retrievalDebug },
      });
    }

    // =================================================================
    // 4) personal answer (student-specific, doubts about a highlight, chat): full context, never shared
    // =================================================================
    let sources: Source[] = [];
    if (admin && shouldRetrieve(message)) {
      const q = buildQueryText(message, selectedText, topicName, prevUser);
      sources = (await retrieveSources(admin, q, topicId, rank, lang)).sources;
    }
    const rb = relatedBlock(sources);
    turns.push({ role: "user", text: rb ? `${rb}STUDENT MESSAGE:\n${withQuote(message, selectedText)}` : withQuote(message, selectedText) });

    const system = buildPersonalPrompt({
      addressing, langName: LANG_NAME[lang],
      section: str(ctx.section || body.currentSection, 120),
      chapter: str(ctx.chapter, 160), topic: topicName,
      progress: str(ctx.chapterProgress, 60),
      done: typeof ctx.topicDone === "boolean" ? ctx.topicDone : null,
      notes,
    });
    const gen = await generate(system, normaliseTurns(turns));
    if (!gen) return NextResponse.json({ reply: BUSY, refs: [], persisted: false }, { status: 502 });

    const { clean, refs } = parseSources(gen.text, sources);
    return respond({
      reply: clean, refs, source: "llm", kind: "personal", model: gen.model, path: "llm_personal",
      usage: sumUsage([rewriteUsage, gen.usage]),
    });
  } catch (error: any) {
    console.error("👉 CHAT ROUTE CRASH:", error);
    return NextResponse.json({ reply: "Something went wrong on my side. Please try once more 🙏", persisted: false, refs: [] }, { status: 500 });
  }
}