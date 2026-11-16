// FILE: src/app/admin/components/reindexClient.ts
// Small helper the admin screens use to talk to /api/admin/reindex-notes.
import { supabase } from "@/utils/supabase";

export type IndexError = { topic: string; error: string };
export type IndexProgress = { done: number; total: number; chunks: number; errors: number };
export type IndexReport = { processed: number; chunksWritten: number; errors: IndexError[] };

async function call(params: Record<string, string | number>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No admin session found. Please log in again with your admin account.");

  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`/api/admin/reindex-notes?${qs.toString()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

/** counts how many topics still need indexing (does not change anything) */
export async function checkIndex(): Promise<{ topicsTotal: number; staleTotal: number }> {
  return call({ dry: 1 });
}

/**
 * Indexes in small batches until nothing is left.
 *  - topic:  only that topic (used right after "Commit Changes")
 *  - force:  rebuild every topic, even unchanged ones
 */
export async function runIndex(opts: {
  topic?: string;
  force?: boolean;
  onProgress?: (p: IndexProgress) => void;
}): Promise<IndexReport> {
  let offset = 0;
  let total = 0;
  let done = 0;
  let chunks = 0;
  let processed = 0;
  const errors: IndexError[] = [];

  for (let guard = 0; guard < 500; guard++) {
    const r = await call({
      limit: 10,
      offset,
      ...(opts.force ? { force: 1 } : {}),
      ...(opts.topic ? { topic: opts.topic } : {}),
    });

    if (guard === 0) total = r.staleTotal;
    done += r.batchSize;
    chunks += r.chunksWritten;
    processed += r.processed;
    errors.push(...(r.errors || []));
    // forced rebuilds keep every topic in the list, so move forward by the batch;
    // normal runs only skip past topics that failed (successful ones drop out of the list)
    offset += opts.force ? r.batchSize : r.errors?.length || 0;
    opts.onProgress?.({ done, total, chunks, errors: errors.length });

    if (r.remaining <= 0 || r.batchSize === 0) break;
  }

  return { processed, chunksWritten: chunks, errors };
}