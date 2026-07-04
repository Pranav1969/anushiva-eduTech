// src/app/admin/system-status/page.tsx
//
// Read-only diagnostics view: pulls the last N runs of both cron jobs from
// public.cron_job_logs and renders them so you can see, at a glance, whether
// each job ran, what it did, and -- for failures -- the actual error text
// from Gemini or Supabase (including whether it's a quota/rate-limit error).
//
// No auth guard needed in this file: middleware.ts already protects every
// /admin/:path* route (session check + profiles.role === 'admin') before
// the request ever reaches here.

import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import Link from "next/link";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

export const dynamic = "force-dynamic";

interface CronLogRow {
  id: string;
  job_name: "fetch-news" | "generate-daily-digest";
  status: "success" | "error" | "skipped";
  started_at: string;
  finished_at: string;
  duration_ms: number;
  details: Record<string, any>;
  created_at: string;
}

async function getRecentLogs(jobName: string, limit = 15): Promise<CronLogRow[]> {
  const { data, error } = await supabase
    .from("cron_job_logs")
    .select("*")
    .eq("job_name", jobName)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Failed to fetch logs for ${jobName}:`, error.message);
    return [];
  }
  return data || [];
}

function isQuotaError(details: Record<string, any>): boolean {
  const text = `${details?.error_message || ""} ${details?.raw_response || ""}`.toLowerCase();
  return (
    text.includes("quota") ||
    text.includes("resource_exhausted") ||
    text.includes("rate limit") ||
    text.includes("429")
  );
}

function StatusBadge({ status }: { status: CronLogRow["status"] }) {
  const config: Record<CronLogRow["status"], { classes: string; icon: typeof CheckCircle2 }> = {
    success: { classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    error: { classes: "bg-red-500/10 text-red-400 border-red-500/30", icon: AlertTriangle },
    skipped: { classes: "bg-slate-800 text-slate-400 border-slate-700", icon: MinusCircle },
  };
  const { classes, icon: Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${classes}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function JobSection({ title, logs }: { title: string; logs: CronLogRow[] }) {
  const latest = logs[0];
  const latestSuccess = logs.find((l) => l.status === "success");
  const errorCount = logs.filter((l) => l.status === "error").length;

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-[#0B0F19] p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-white">{title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-500">
            <span>Last run: {latest ? formatWhen(latest.created_at) : "never"}</span>
            <span>Last success: {latestSuccess ? formatWhen(latestSuccess.created_at) : "never"}</span>
          </div>
        </div>
        {errorCount > 0 && (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
            {errorCount} error{errorCount > 1 ? "s" : ""} in last {logs.length}
          </span>
        )}
      </div>

      {logs.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No runs logged yet. Either this job hasn&apos;t fired, or logging was added after its last run.
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const quota = log.status === "error" && isQuotaError(log.details);
            return (
              <details
                key={log.id}
                className="group rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-3 open:bg-slate-900/80 open:border-indigo-500/30"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={log.status} />
                    {quota && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Looks like an API quota/rate limit
                      </span>
                    )}
                    <span className="font-mono text-xs text-slate-400">{formatWhen(log.created_at)}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-600">{log.duration_ms}ms</span>
                </summary>

                <div className="mt-3 space-y-2 border-t border-slate-800/60 pt-3">
                  {log.status === "error" && (
                    <p className="text-xs leading-relaxed text-red-400">
                      <span className="font-semibold text-red-300">Error: </span>
                      {log.details?.error_message || "No error message captured."}
                    </p>
                  )}
                  {log.status === "skipped" && (
                    <p className="text-xs leading-relaxed text-slate-400">
                      <span className="font-semibold text-slate-300">Reason: </span>
                      {log.details?.reason || "No reason captured."}
                    </p>
                  )}
                  {log.details?.raw_response && (
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/60 p-3 text-[10px] leading-relaxed text-slate-300">
                      {log.details.raw_response}
                    </pre>
                  )}
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 font-mono text-[10px] text-slate-500">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function SystemStatusPage() {
  const [fetchNewsLogs, digestLogs] = await Promise.all([
    getRecentLogs("fetch-news"),
    getRecentLogs("generate-daily-digest"),
  ]);

  return (
    <div className="min-h-screen bg-[#020408] p-4 text-[#F8FAFC] antialiased md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition-colors hover:text-indigo-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Dashboard
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-white">System Status</h1>
            <p className="mt-1 text-xs text-slate-400">
              Background job runs for the Daily News Hub. Click a row to see full details.
            </p>
          </div>
        </div>

        <JobSection title="fetch-news (article ingestion)" logs={fetchNewsLogs} />
        <JobSection title="generate-daily-digest (notes + quiz)" logs={digestLogs} />
      </div>
    </div>
  );
}