// FILE: src/app/api/admin/reindex-notes/route.ts   (v2 - used by the admin "AI Search" button)
// Builds / refreshes notes_chunks (text pieces + embeddings) for every topic.
//  - admin only (profiles.role = 'admin', verified from the login token)
//  - idempotent: only topics whose text changed (or were never indexed) are processed
//
//   POST ?dry=1                  -> just count what needs indexing
//   POST ?limit=10&offset=0      -> process the next batch of stale topics
//   POST ?force=1&offset=N       -> rebuild everything (client pages through with offset)
//   POST ?topic=<uuid>           -> only that topic (used right after "Commit Changes")
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { chunkTopic } from "@/lib/guru/text";
import { embedDocuments, embedModelId } from "@/lib/guru/embed";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHUNK_VERSION = "v1"; // bump to force a rebuild when you change the chunking rules
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** PostgREST returns at most 1000 rows per request, so page through */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 10, 1), 40);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
    const force = url.searchParams.get("force") === "1";
    const dry = url.searchParams.get("dry") === "1";
    const only = url.searchParams.get("topic");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Server is not configured (missing service key)." }, { status: 500 });
    const admin: SupabaseClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // ---- admin check ----
    const header = req.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const { data: u } = token ? await admin.auth.getUser(token) : { data: { user: null } as any };
    if (!u?.user) return NextResponse.json({ error: "Not signed in. Please log in with your admin account." }, { status: 401 });
    const { data: profile } = await admin.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "This account is not an admin (profiles.role must be 'admin')." }, { status: 403 });

    // ---- what exists, what is stale ----
    const topics = await fetchAll<any>((from, to) => {
      let q = admin.from("notes_topics").select("id, name_en, paragraph_text_en").order("created_at").range(from, to);
      if (only) q = q.eq("id", only);
      return q;
    });
    const existing = await fetchAll<any>((from, to) =>
      admin.from("notes_chunks").select("topic_id, source_hash, embed_model").eq("chunk_index", 0).range(from, to)
    );
    const have = new Map(existing.map((e) => [e.topic_id, e]));
    const model = embedModelId();

    const hashOf = (t: any) => sha(`${CHUNK_VERSION}|${t.name_en}\n${t.paragraph_text_en}`);
    const stale = topics.filter((t) => {
      const empty = !(t.paragraph_text_en || "").trim();
      if (empty) return have.has(t.id); // nothing to index; only clean up old chunks if text was removed
      if (force) return true;
      const e = have.get(t.id);
      return !e || e.source_hash !== hashOf(t) || e.embed_model !== model;
    });

    if (dry) return NextResponse.json({ topicsTotal: topics.length, staleTotal: stale.length });

    // ---- process one batch ----
    const batch = stale.slice(offset, offset + limit);
    let succeeded = 0;
    let chunkTotal = 0;
    const errors: { topic: string; error: string }[] = [];

    for (const t of batch) {
      try {
        const chunks = chunkTopic(t.paragraph_text_en || "");
        await admin.from("notes_chunks").delete().eq("topic_id", t.id);
        if (chunks.length) {
          // the topic title goes in front of each chunk so the embedding knows what it is about
          const vectors = await embedDocuments(chunks.map((c) => `${t.name_en}\n${c}`));
          const hash = hashOf(t);
          const { error } = await admin.from("notes_chunks").insert(
            chunks.map((content, i) => ({
              topic_id: t.id,
              chunk_index: i,
              content,
              source_hash: hash,
              embed_model: model,
              embedding: vectors[i],
            }))
          );
          if (error) throw new Error(error.message);
          chunkTotal += chunks.length;
        }
        succeeded++;
      } catch (e: any) {
        errors.push({ topic: t.name_en || t.id, error: String(e?.message || e).slice(0, 200) });
      }
    }

    return NextResponse.json({
      topicsTotal: topics.length,
      staleTotal: stale.length,
      batchSize: batch.length,
      processed: succeeded,
      chunksWritten: chunkTotal,
      remaining: Math.max(0, stale.length - offset - batch.length), // stale topics not attempted yet
      errors,
    });
  } catch (e: any) {
    console.error("reindex crash:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}