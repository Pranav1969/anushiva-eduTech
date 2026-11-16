// FILE: src/app/admin/components/ReindexNotesButton.tsx
// One button for the admin: "AI Search". Shows whether Guruji's search index is up to date
// and lets the admin update it (changed topics only) or rebuild everything.
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Database, Loader2, RefreshCw, Check, AlertTriangle, X } from "lucide-react";
import { checkIndex, runIndex, IndexError, IndexProgress } from "./reindexClient";

type Phase = "idle" | "checking" | "running" | "error";

export default function ReindexNotesButton({ refreshKey = 0 }: { refreshKey?: number }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [info, setInfo] = useState<{ total: number; stale: number } | null>(null);
  const [progress, setProgress] = useState<IndexProgress>({ done: 0, total: 0, chunks: 0, errors: 0 });
  const [problems, setProblems] = useState<IndexError[]>([]);
  const [message, setMessage] = useState("");
  const [confirmForce, setConfirmForce] = useState(false);
  const runningRef = useRef(false);

  const busy = phase === "checking" || phase === "running";

  const refresh = useCallback(async () => {
    if (runningRef.current) return;
    setPhase("checking");
    try {
      const r = await checkIndex();
      setInfo({ total: r.topicsTotal, stale: r.staleTotal });
      setPhase("idle");
    } catch (e: any) {
      setMessage(e.message || "Could not check the index.");
      setPhase("error");
    }
  }, []);

  // check on first show, and again whenever the editor reports a save
  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  const run = async (force: boolean) => {
    setConfirmForce(false);
    setProblems([]);
    setMessage("");
    runningRef.current = true;
    setPhase("running");
    setProgress({ done: 0, total: 0, chunks: 0, errors: 0 });
    try {
      const rep = await runIndex({ force, onProgress: setProgress });
      setProblems(rep.errors);
      setMessage(
        rep.errors.length
          ? `Finished, but ${rep.errors.length} topic(s) had a problem.`
          : `Done: ${rep.processed} topic(s) indexed (${rep.chunksWritten} search pieces).`
      );
    } catch (e: any) {
      setMessage(e.message || "Indexing stopped unexpectedly.");
    } finally {
      runningRef.current = false;
      setPhase("idle");
      refresh();
    }
  };

  const upToDate = info && info.stale === 0;
  const pct = progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Guruji's search index for your notes"
        className="relative flex items-center gap-2 bg-[#090f1d] hover:bg-slate-900 border border-slate-900 text-slate-300 px-3 py-2 rounded-xl text-xs font-medium transition-all"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-300" /> : <Database className="w-3.5 h-3.5 text-indigo-300" />}
        AI Search
        {info && !upToDate && !busy && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#040814]" />}
        {upToDate && !busy && <Check className="w-3 h-3 text-emerald-400" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => !busy && setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-[#040814] border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Guruji's AI Search</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Lets Guruji find the right topic for a student's question. Update it after you change notes.
                </p>
              </div>
              <button onClick={() => !busy && setOpen(false)} className="text-slate-500 hover:text-slate-300 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* status */}
            <div className="rounded-xl border border-slate-900 bg-[#070c19] px-3 py-2 text-xs">
              {phase === "checking" && <span className="text-slate-400 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Checking…</span>}
              {phase === "error" && <span className="text-rose-300 flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {message}</span>}
              {phase === "running" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Indexing…</span>
                    <span className="font-mono">{progress.done}/{progress.total || "?"}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">Keep this page open until it finishes.</p>
                </div>
              )}
              {phase === "idle" && info && (
                upToDate
                  ? <span className="text-emerald-300 flex items-center gap-2"><Check className="w-3.5 h-3.5" /> All {info.total} topics are up to date.</span>
                  : <span className="text-amber-300">{info.stale} of {info.total} topics need updating.</span>
              )}
            </div>

            {message && phase !== "error" && <p className="text-[11px] text-slate-300">{message}</p>}

            {problems.length > 0 && (
              <ul className="max-h-28 overflow-y-auto space-y-1 text-[10px] text-rose-300 bg-rose-500/5 border border-rose-500/20 rounded-lg p-2">
                {problems.map((p, i) => (
                  <li key={i}><span className="font-semibold">{p.topic}:</span> {p.error}</li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => run(false)}
                disabled={busy || upToDate === true}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-xl py-2 text-xs font-semibold transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Update{info && info.stale > 0 ? ` (${info.stale})` : ""}
              </button>
              {!confirmForce ? (
                <button
                  onClick={() => setConfirmForce(true)}
                  disabled={busy}
                  className="px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-400 rounded-xl text-xs font-medium"
                >
                  Rebuild all
                </button>
              ) : (
                <button
                  onClick={() => run(true)}
                  disabled={busy}
                  className="px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
                >
                  Sure?
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}