// src/lib/cronLogger.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Separate client instance so this helper works even if it's imported
// before the calling route has set up its own -- logging should never be
// the thing that fails silently.
const logClient = createClient(supabaseUrl || "", supabaseServiceKey || "");

export type CronJobName = "fetch-news" | "generate-daily-digest";
export type CronJobStatus = "success" | "error" | "skipped";

/**
 * Writes one row per cron execution to public.cron_job_logs. Never throws --
 * a logging failure should never take down the job it's trying to describe.
 */
export async function logCronRun(
  jobName: CronJobName,
  status: CronJobStatus,
  startedAt: Date,
  details: Record<string, unknown> = {}
) {
  const finishedAt = new Date();
  try {
    await logClient.from("cron_job_logs").insert({
      job_name: jobName,
      status,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      details,
    });
  } catch (err: any) {
    // Deliberately swallowed -- see docstring above.
    console.error(`[cronLogger] Failed to write log for ${jobName}:`, err?.message);
  }
}