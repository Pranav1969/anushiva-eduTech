// src/app/admin/system-status/page.tsx
import { createClient } from "@supabase/supabase-js";
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  MinusCircle, 
  Clock, 
  Activity, 
  Calendar, 
  BarChart3, 
  Database,
  ChevronRight,
  Filter
} from "lucide-react";
import Link from "next/link";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

export const dynamic = "force-dynamic";

interface CronLogRow {
  id: string;
  job_name: string;
  status: "success" | "error" | "skipped";
  started_at: string;
  finished_at: string;
  duration_ms: number;
  details: Record<string, any>;
  created_at: string;
}

async function getAllRecentLogs(): Promise<CronLogRow[]> {
  // Pull a broader dataset so we can filter flexibly on the server
  const { data, error } = await supabase
    .from("cron_job_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    console.error("Failed to fetch system diagnostic logs:", error.message);
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

function formatWhen(iso: string, includeTime = true) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime && { hour: "2-digit", minute: "2-digit", hour12: true }),
  });
}

function groupLogsByDate(logs: CronLogRow[]) {
  return logs.reduce((groups: Record<string, CronLogRow[]>, log) => {
    const dateStr = new Date(log.created_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(log);
    return groups;
  }, {});
}
function StatusBadge({ status }: { status: CronLogRow["status"] }) {
  const config = {
    success: { classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    error: { classes: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertTriangle },
    skipped: { classes: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: MinusCircle },
  };
  const { classes, icon: Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${classes}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}
export default async function SystemStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; startDate?: string; endDate?: string }>;
}) {
  const resolvedParams = await searchParams;
  const rawLogs = await getAllRecentLogs();

  // 1. Resolve distinct jobs for the top selection ribbon
  const distinctJobs = Array.from(new Set(rawLogs.map((l) => l.job_name)));
  const activeJob = resolvedParams.job || distinctJobs[0] || "fetch-news";

  // 2. Setup Default Dates (Last 7 Days) if parameters are absent
  const todayIso = new Date().toISOString().split("T")[0]; 
  const defaultStartIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const startDateFilter = resolvedParams.startDate || defaultStartIso;
  const endDateFilter = resolvedParams.endDate || todayIso;

  // 3. Filter Logs dynamically by Job AND Date Bound Targets
  const filteredLogs = rawLogs.filter((log) => {
    if (log.job_name !== activeJob) return false;
    
    const logDate = log.created_at.split("T")[0];
    return logDate >= startDateFilter && logDate <= endDateFilter;
  });

  // 4. Compute analytics for dashboard visuals
  const totalRuns = filteredLogs.length;
  const successCount = filteredLogs.filter((l) => l.status === "success").length;
  const errorCount = filteredLogs.filter((l) => l.status === "error").length;
  const skippedCount = filteredLogs.filter((l) => l.status === "skipped").length;
  const successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0;
  const avgDuration = totalRuns > 0 ? Math.round(filteredLogs.reduce((acc, l) => acc + l.duration_ms, 0) / totalRuns) : 0;

  const logsByDate = groupLogsByDate(filteredLogs);

  return (
    <div className="min-h-screen bg-[#030712] p-4 text-[#F3F4F6] antialiased sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-4 border-b border-slate-800/60 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="group mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-indigo-400"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to System Console
            </Link>
            <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">
              System Orchestration Status
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Live automated background health matrix logs & analytics overview.
            </p>
          </div>
          
          {/* 📅 LIVE TIME WINDOW CONTROLLER FORM */}
          <form method="GET" className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-[#0B0F19] p-3 shadow-inner">
            {/* Retain the active job selection status inside hidden inputs */}
            <input type="hidden" name="job" value={activeJob} />
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">From Date</label>
              <input 
                type="date" 
                name="startDate" 
                defaultValue={startDateFilter}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">To Date</label>
              <input 
                type="date" 
                name="endDate" 
                defaultValue={endDateFilter}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <button 
              type="submit" 
              className="mt-4 sm:mt-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-md"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter Matrix
            </button>
          </form>
        </div>

        {/* Dynamic Job Tracker Selector Horizontal Ribbon */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" /> Tracked System Processes ({distinctJobs.length})
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Preserves selected parameters upon shifting view</span>
          </div>
          
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {distinctJobs.map((jobName) => {
              const jobLogs = rawLogs.filter((l) => l.job_name === jobName);
              const isSelected = activeJob === jobName;
              const lastRun = jobLogs[0]?.created_at;
              const jobErrors = jobLogs.filter((l) => l.status === "error").length;
              const jobSuccessPct = jobLogs.length > 0 ? Math.round((jobLogs.filter((l) => l.status === "success").length / jobLogs.length) * 100) : 0;

              return (
                <Link
                  key={jobName}
                  href={`?job=${jobName}&startDate=${startDateFilter}&endDate=${endDateFilter}`}
                  className={`relative min-w-[280px] flex-1 rounded-xl border p-4 transition-all duration-300 group outline-none ${
                    isSelected
                      ? "border-indigo-500 bg-gradient-to-b from-indigo-950/40 to-slate-900/90 shadow-lg shadow-indigo-950/20 ring-1 ring-indigo-500/30"
                      : "border-slate-800 bg-[#0B0F19]/60 hover:border-slate-700 hover:bg-[#0B0F19]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                        isSelected ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/20" : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
                        Core Cron
                      </span>
                      <h3 className="font-mono text-sm font-bold text-white group-hover:text-indigo-300 transition-colors pt-1">
                        {jobName}
                      </h3>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isSelected ? "text-indigo-400 rotate-90" : ""}`} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800/60 pt-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Lifetime Index</span>
                      <span className={`font-mono font-bold ${jobSuccessPct > 80 ? "text-emerald-400" : "text-amber-400"}`}>
                        {jobSuccessPct}% ok
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Fault Pool</span>
                      <span className={`font-mono font-bold ${jobErrors > 0 ? "text-rose-400" : "text-slate-400"}`}>
                        {jobErrors} faults
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span>Last Run: {lastRun ? formatWhen(lastRun, true) : "Never"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Advanced Diagnostics Graphics Dashboard */}
        {totalRuns > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Metric Info Boxes */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="rounded-xl border border-slate-800/80 bg-[#0B0F19] p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Mean Duration</span>
                  <div className="text-xl font-mono font-bold text-indigo-400 mt-1">{avgDuration}ms</div>
                </div>
                <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-[#0B0F19] p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Isolated Run Windows</span>
                  <div className="text-xl font-mono font-bold text-white mt-1">{totalRuns} instances</div>
                </div>
                <div className="p-2.5 bg-slate-800 rounded-lg text-slate-400 border border-slate-700">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* SVG DONUT CHART (Filtered Success Mix) */}
            <div className="rounded-xl border border-slate-800/80 bg-[#0B0F19] p-5 flex flex-col items-center justify-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 self-start mb-2">
                Operational Success Mix
              </h4>
              <div className="relative flex items-center justify-center h-28 w-28">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1E293B" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" strokeWidth="3.5"
                    strokeDasharray={`${successRate} ${100 - successRate}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-mono font-black text-white">{successRate}%</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Rate</span>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Ok ({successCount})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Error ({errorCount})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Skip ({skippedCount})</span>
              </div>
            </div>

            {/* BAR CHART DISTRIBUTION */}
            <div className="rounded-xl border border-slate-800/80 bg-[#0B0F19] p-5 flex flex-col justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                State Distribution
              </h4>
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-emerald-400 font-bold">SUCCESS</span>
                    <span className="text-slate-400">{successCount}/{totalRuns}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(successCount/totalRuns)*100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-rose-400 font-bold">ERRORS</span>
                    <span className="text-slate-400">{errorCount}/{totalRuns}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${(errorCount/totalRuns)*100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-amber-400 font-bold">SKIPPED</span>
                    <span className="text-slate-400">{skippedCount}/{totalRuns}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(skippedCount/totalRuns)*100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Grouped Chronological Logs Feed */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#0B0F19] p-5 shadow-xl shadow-black/30 space-y-6">
          <div className="border-b border-slate-800/60 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Active Audit Log Trace
              </h2>
              <p className="text-[11px] text-indigo-400 font-mono mt-0.5">
                Target Process: {activeJob} ({formatWhen(startDateFilter, false)} → {formatWhen(endDateFilter, false)})
              </p>
            </div>
          </div>

          {totalRuns === 0 ? (
            <div className="py-12 text-center space-y-2">
              <MinusCircle className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                No telemetry configurations match this specific timeline filter boundary. Try widening your historical parameters.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(logsByDate).map(([dateLabel, logs]) => (
                <div key={dateLabel} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-1 py-1 sticky top-0 bg-[#0B0F19]/90 backdrop-blur-sm z-10">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{dateLabel}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono font-normal">
                      {logs.length} runs
                    </span>
                  </div>

                  <div className="space-y-2 pl-2 border-l border-slate-800/60 ml-2">
                    {logs.map((log) => {
                      const quota = log.status === "error" && isQuotaError(log.details);
                      return (
                        <details
                          key={log.id}
                          className="group rounded-lg border border-slate-800/50 bg-slate-900/20 px-4 py-2.5 open:bg-[#0E1321] open:border-indigo-500/30 transition-all duration-200"
                        >
                          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 outline-none">
                            <div className="flex items-center gap-3">
                              <StatusBadge status={log.status} />
                              {quota && (
                                <span className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                                  API Rate-Limiting Fault
                                </span>
                              )}
                              <span className="font-mono text-xs text-slate-400">
                                {new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 group-open:text-indigo-400">
                              {log.duration_ms} ms
                            </span>
                          </summary>

                          <div className="mt-3 space-y-2 border-t border-slate-800/60 pt-3">
                            {log.status === "error" && (
                              <div className="text-xs leading-relaxed text-rose-400 p-2.5 rounded-md bg-rose-500/5 border border-rose-500/10">
                                <span className="font-bold text-rose-300 uppercase text-[10px] block mb-0.5">Error Payload</span>
                                {log.details?.error_message || "Unknown schema anomaly captured."}
                              </div>
                            )}
                            {log.status === "skipped" && (
                              <div className="text-xs leading-relaxed text-slate-400 p-2.5 rounded-md bg-slate-800/40 border border-slate-700/50">
                                <span className="font-bold text-slate-300 uppercase text-[10px] block mb-0.5">Skip Diagnostics</span>
                                {log.details?.reason || "Condition bypass standard evaluation."}
                              </div>
                            )}
                            {log.details?.raw_response && (
                              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/60 p-3 text-[10px] leading-relaxed text-slate-400 font-mono border border-slate-900">
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
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}