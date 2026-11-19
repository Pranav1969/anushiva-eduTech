// FILE: src/app/admin/components/GuruAnalytics.tsx
// Phase 6 · Guruji analytics for the admin.
// Shows, for any date range: how many answers came straight from the database (saved answers + templates),
// how many needed Gemini, how many tokens / how much money Gemini used, and lets the admin review saved answers.
// Uses only the RPCs from phase6_admin.sql (each one re-checks that the caller is an admin).
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, RefreshCw, Database, Sparkles, Coins, Timer, ThumbsUp, ThumbsDown, Search,
  Check, Ban, Trash2, ShieldCheck, ChevronDown, ChevronUp, AlertTriangle, Settings2,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

// ---------------------------------------------------------------- types
type Totals = {
  questions: number; students: number; cache: number; cache_exact: number; cache_semantic: number;
  template: number; gemini_core: number; gemini_personal: number; cache_with_rewrite: number;
  tokens_in: number; tokens_out: number; tokens_think: number;
  avg_ms: number; avg_ms_cache: number; avg_ms_gemini: number;
};
type PathRow = { path: string; n: number; tin: number; tout: number; tthink: number; avg_ms: number };
type KindRow = { kind: string; n: number; from_db: number };
type ModelRow = { model: string; n: number; tin: number; tout: number; tthink: number };
type SeriesRow = { bucket: string; cache: number; template: number; gemini: number; tokens: number };
type TopRow = { id: string; question: string; kind: string; lang: string; status: string; up: number; down: number; uses: number };
type Bank = {
  entries: number; trusted: number; provisional: number; stale: number; blocked: number;
  concept: number; chip: number; highlight: number; lifetime_hits: number; created_in_range: number;
};
type Stats = {
  totals: Totals; by_path: PathRow[]; by_kind: KindRow[]; by_model: ModelRow[]; series: SeriesRow[];
  top_reused: TopRow[]; bank: Bank; votes: { up: number; down: number };
};
type Pricing = { input_per_m: number; output_per_m: number; usd_to_inr: number };
type Entry = {
  id: string; question: string; answer: string; kind: string; lang: string; status: string;
  hits: number; up: number; down: number; topic_name: string | null; min_rank: number; updated_at: string;
};

// ---------------------------------------------------------------- helpers
const nf = (n: number) => (n || 0).toLocaleString("en-IN");
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const inr = (n: number) =>
  `₹${n >= 100 ? Math.round(n).toLocaleString("en-IN") : n >= 1 ? n.toFixed(2) : n.toFixed(4)}`;
const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${Math.round(n)} ms`);
const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

const PATH_LABEL: Record<string, string> = {
  cache_exact: "Saved answer (exact match)",
  cache_semantic: "Saved answer (similar question)",
  template: "Template (greeting / thanks)",
  llm_core: "Gemini, new shared answer",
  llm_personal: "Gemini, personal answer",
};
const DB_PATHS = ["cache_exact", "cache_semantic", "template"];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 0, 0, 0, 0); };

type Preset = "today" | "7d" | "30d" | "month" | "custom";

function rangeFor(preset: Preset, customFrom: string, customTo: string) {
  const now = new Date();
  const today = startOfDay(ymd(now));
  const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  if (preset === "today") return { from: today, to: addDays(today, 1) };
  if (preset === "7d") return { from: addDays(today, -6), to: addDays(today, 1) };
  if (preset === "30d") return { from: addDays(today, -29), to: addDays(today, 1) };
  if (preset === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: addDays(today, 1) };
  const f = customFrom ? startOfDay(customFrom) : today;
  const t = customTo ? addDays(startOfDay(customTo), 1) : addDays(today, 1);
  return { from: f, to: t > f ? t : addDays(f, 1) };
}

// ---------------------------------------------------------------- small UI pieces
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900 border border-slate-700 rounded-lg p-4 ${className}`}>{children}</div>
);

const H = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="mb-3">
    <h3 className="text-sm font-semibold text-white">{children}</h3>
    {hint && <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{hint}</p>}
  </div>
);

function Kpi({ label, value, sub, Icon, tone = "text-slate-100" }: {
  label: string; value: string; sub?: string; Icon: React.ComponentType<{ className?: string }>; tone?: string;
}) {
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  trusted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  provisional: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  stale: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  blocked: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};
const StatusPill = ({ s }: { s: string }) => (
  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_STYLE[s] || STATUS_STYLE.stale}`}>{s}</span>
);

// ---------------------------------------------------------------- main
export default function GuruAnalytics() {
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata", []);
  const [preset, setPreset] = useState<Preset>("7d");
  const [customFrom, setCustomFrom] = useState(ymd(new Date()));
  const [customTo, setCustomTo] = useState(ymd(new Date()));
  const [bucket, setBucket] = useState<"day" | "month">("day");

  const [stats, setStats] = useState<Stats | null>(null);
  const [pricing, setPricing] = useState<Pricing>({ input_per_m: 0.3, output_per_m: 2.5, usd_to_inr: 88 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPricing, setShowPricing] = useState(false);
  const [pricingDraft, setPricingDraft] = useState<Pricing>(pricing);
  const [pricingMsg, setPricingMsg] = useState("");

  // ---- load stats
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { from, to } = rangeFor(preset, customFrom, customTo);
    const [s, p] = await Promise.all([
      supabase.rpc("guru_admin_stats", { p_from: from.toISOString(), p_to: to.toISOString(), p_bucket: bucket, p_tz: tz }),
      supabase.rpc("guru_admin_get_pricing"),
    ]);
    if (s.error) setError(s.error.message === "admins only" ? "This account is not an admin." : s.error.message);
    else setStats(s.data as Stats);
    if (!p.error && p.data) { setPricing(p.data as Pricing); setPricingDraft(p.data as Pricing); }
    setLoading(false);
  }, [preset, customFrom, customTo, bucket, tz]);

  useEffect(() => { load(); }, [load]);

  // ---- money (estimate only: thinking tokens are billed like output tokens)
  const cost = useMemo(() => {
    const usd = (tin: number, tout: number, tthink: number) =>
      (tin * pricing.input_per_m + (tout + tthink) * pricing.output_per_m) / 1_000_000;
    const toInr = (u: number) => u * pricing.usd_to_inr;
    if (!stats) return null;
    const t = stats.totals;
    const total = toInr(usd(t.tokens_in, t.tokens_out, t.tokens_think));
    const geminiN = t.gemini_core + t.gemini_personal;
    const perGemini = geminiN ? total / geminiN : 0;
    const dbN = t.cache + t.template;
    // what the database answers would have cost if each had gone to Gemini at the average Gemini price
    const saved = perGemini * dbN;
    return { total, perQuestion: t.questions ? total / t.questions : 0, perGemini, saved, toInr, usd };
  }, [stats, pricing]);

  const savePricing = async () => {
    setPricingMsg("");
    const { error } = await supabase.rpc("guru_admin_set_pricing", { p: pricingDraft });
    if (error) setPricingMsg(error.message);
    else { setPricing(pricingDraft); setPricingMsg("Saved."); }
  };

  const t = stats?.totals;
  const fromDb = t ? t.cache + t.template : 0;
  const fromGemini = t ? t.gemini_core + t.gemini_personal : 0;
  const maxBar = Math.max(1, ...(stats?.series || []).map((r) => r.cache + r.template + r.gemini));

  return (
    <div className="max-w-[1400px] mx-auto p-4 space-y-4">
      {/* ---------------- controls ---------------- */}
      <Card className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Period</label>
          <div className="flex gap-1">
            {([["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["month", "This month"], ["custom", "Custom"]] as [Preset, string][]).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setPreset(k)}
                className={`px-3 py-1.5 rounded text-xs border ${preset === k ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800"}`}
              >{l}</button>
            ))}
          </div>
        </div>
        {preset === "custom" && (
          <div className="flex items-end gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">From</label>
              <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">To (included)</label>
              <input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
            </div>
          </div>
        )}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Group chart by</label>
          <div className="flex gap-1">
            {(["day", "month"] as const).map((b) => (
              <button key={b} onClick={() => setBucket(b)}
                className={`px-3 py-1.5 rounded text-xs border ${bucket === b ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800"}`}
              >{b === "day" ? "Day" : "Month"}</button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Time zone: {tz}</span>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
          </button>
        </div>
      </Card>

      {error && (
        <div className="flex items-start gap-2 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error} {error.includes("function") && "(Did you run phase6_admin.sql in Supabase?)"}</span>
        </div>
      )}

      {loading && !stats && (
        <div className="flex items-center justify-center py-20 text-slate-300 gap-3"><Loader2 className="animate-spin w-5 h-5" /> Loading…</div>
      )}

      {stats && t && cost && (
        <>
          {/* ---------------- headline numbers ---------------- */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Kpi Icon={Sparkles} label="Questions answered" value={nf(t.questions)} sub={`${nf(t.students)} students`} />
            <Kpi Icon={Database} tone="text-emerald-300" label="Answered from database"
              value={`${pct(fromDb, t.questions)}%`} sub={`${nf(fromDb)} (saved ${nf(t.cache)} + templates ${nf(t.template)})`} />
            <Kpi Icon={Sparkles} tone="text-amber-300" label="Needed Gemini"
              value={`${pct(fromGemini, t.questions)}%`} sub={`${nf(fromGemini)} (new ${nf(t.gemini_core)} + personal ${nf(t.gemini_personal)})`} />
            <Kpi Icon={Coins} label="Estimated Gemini cost" value={inr(cost.total)}
              sub={`${inr(cost.perQuestion)} per question · ${inr(cost.perGemini)} per Gemini answer`} />
            <Kpi Icon={Timer} label="Average reply time" value={ms(t.avg_ms)}
              sub={`database ${ms(t.avg_ms_cache)} · Gemini ${ms(t.avg_ms_gemini)}`} />
          </div>

          {/* ---------------- how the architecture is working ---------------- */}
          <Card>
            <H hint="Every question takes one of these routes. The more that end on the left, the less Gemini you pay for.">
              How questions were answered
            </H>
            <div className="flex h-7 rounded overflow-hidden border border-slate-700 text-[10px] font-semibold">
              {[
                { n: t.template, c: "bg-sky-600", l: "Template" },
                { n: t.cache_exact, c: "bg-emerald-600", l: "Exact" },
                { n: t.cache_semantic, c: "bg-teal-600", l: "Similar" },
                { n: t.gemini_core, c: "bg-amber-600", l: "Gemini new" },
                { n: t.gemini_personal, c: "bg-rose-600", l: "Gemini personal" },
              ].map((s) => s.n > 0 && (
                <div key={s.l} className={`${s.c} text-white flex items-center justify-center whitespace-nowrap overflow-hidden`}
                  style={{ width: `${pct(s.n, t.questions)}%` }} title={`${s.l}: ${nf(s.n)}`}>
                  {pct(s.n, t.questions) >= 8 ? `${s.l} ${pct(s.n, t.questions)}%` : ""}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <div className="text-slate-400">Estimated money saved by the database</div>
                <div className="text-lg font-semibold text-emerald-300">{inr(cost.saved)}</div>
                <div className="text-[11px] text-slate-500">if those {nf(fromDb)} answers had each cost an average Gemini answer</div>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <div className="text-slate-400">Tokens used by Gemini</div>
                <div className="text-lg font-semibold">{compact(t.tokens_in + t.tokens_out + t.tokens_think)}</div>
                <div className="text-[11px] text-slate-500">
                  in {compact(t.tokens_in)} · out {compact(t.tokens_out)} · thinking {compact(t.tokens_think)}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <div className="text-slate-400">Saved answers that still used a small model call</div>
                <div className="text-lg font-semibold">{nf(t.cache_with_rewrite)}</div>
                <div className="text-[11px] text-slate-500">follow-ups rewritten into a full question before the lookup</div>
              </div>
            </div>
          </Card>

          {/* ---------------- time series ---------------- */}
          <Card>
            <H hint={`Questions per ${bucket}. Hover a bar for details.`}>Questions over time</H>
            {stats.series.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No questions in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1.5 h-44 min-w-full" style={{ minWidth: stats.series.length * 28 }}>
                  {stats.series.map((r) => {
                    const total = r.cache + r.template + r.gemini;
                    const h = (v: number) => `${(v / maxBar) * 100}%`;
                    const label = bucket === "month" ? r.bucket.slice(0, 7) : r.bucket.slice(5);
                    return (
                      <div key={r.bucket} className="flex-1 min-w-[22px] h-full flex flex-col justify-end items-center gap-1"
                        title={`${r.bucket}\nTotal ${total}\nSaved answers ${r.cache}\nTemplates ${r.template}\nGemini ${r.gemini}\nTokens ${nf(r.tokens)}`}>
                        <div className="w-full flex flex-col justify-end rounded-t overflow-hidden" style={{ height: h(total) }}>
                          <div className="bg-amber-600" style={{ height: `${total ? (r.gemini / total) * 100 : 0}%` }} />
                          <div className="bg-sky-600" style={{ height: `${total ? (r.template / total) * 100 : 0}%` }} />
                          <div className="bg-emerald-600" style={{ height: `${total ? (r.cache / total) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[9px] text-slate-500 whitespace-nowrap">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-4 mt-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Saved answers</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-sky-600" /> Templates</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-amber-600" /> Gemini</span>
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* ---------------- by path ---------------- */}
            <Card>
              <H hint="Tokens and speed for each route.">By route</H>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-400 text-left">
                    <tr><th className="py-1.5 pr-2 font-medium">Route</th><th className="pr-2 font-medium text-right">Questions</th>
                      <th className="pr-2 font-medium text-right">Tokens in</th><th className="pr-2 font-medium text-right">Out</th>
                      <th className="pr-2 font-medium text-right">Thinking</th><th className="font-medium text-right">Avg time</th></tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {stats.by_path.map((r) => (
                      <tr key={r.path} className="border-t border-slate-800">
                        <td className="py-1.5 pr-2">
                          <span className={DB_PATHS.includes(r.path) ? "text-emerald-300" : "text-amber-300"}>{PATH_LABEL[r.path] || r.path}</span>
                        </td>
                        <td className="pr-2 text-right">{nf(r.n)}</td>
                        <td className="pr-2 text-right">{nf(r.tin)}</td>
                        <td className="pr-2 text-right">{nf(r.tout)}</td>
                        <td className="pr-2 text-right">{nf(r.tthink)}</td>
                        <td className="text-right">{ms(r.avg_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ---------------- by kind ---------------- */}
            <Card>
              <H hint="Chips and highlights should mostly come from the database; personal questions always need Gemini.">By question type</H>
              <div className="space-y-2.5">
                {stats.by_kind.map((r) => (
                  <div key={r.kind}>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span className="capitalize">{r.kind}</span>
                      <span>{nf(r.n)} · <span className="text-emerald-300">{pct(r.from_db, r.n)}% from database</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct(r.from_db, r.n)}%` }} />
                    </div>
                  </div>
                ))}
                {stats.by_kind.length === 0 && <p className="text-xs text-slate-500">No data.</p>}
              </div>
            </Card>

            {/* ---------------- by model ---------------- */}
            <Card>
              <H hint="Which Gemini models answered, and their token use.">By Gemini model</H>
              {stats.by_model.length === 0 ? <p className="text-xs text-slate-500">No Gemini calls in this period.</p> : (
                <table className="w-full text-xs">
                  <thead className="text-slate-400 text-left">
                    <tr><th className="py-1.5 font-medium">Model</th><th className="text-right font-medium">Calls</th>
                      <th className="text-right font-medium">In</th><th className="text-right font-medium">Out</th>
                      <th className="text-right font-medium">Thinking</th><th className="text-right font-medium">Est. cost</th></tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {stats.by_model.map((r) => (
                      <tr key={r.model} className="border-t border-slate-800">
                        <td className="py-1.5 font-mono text-[11px]">{r.model}</td>
                        <td className="text-right">{nf(r.n)}</td>
                        <td className="text-right">{nf(r.tin)}</td>
                        <td className="text-right">{nf(r.tout)}</td>
                        <td className="text-right">{nf(r.tthink)}</td>
                        <td className="text-right">{inr(cost.toInr(cost.usd(r.tin, r.tout, r.tthink)))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="text-[10px] text-slate-500 mt-2">
                Cost uses one price for all models (set below). Small model calls that only rewrite a follow-up are counted under the route they led to.
              </p>
            </Card>

            {/* ---------------- bank health ---------------- */}
            <Card>
              <H hint="The shared saved-answer library (all time).">Saved answer library</H>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  ["Entries", stats.bank.entries, "text-slate-100"],
                  ["Trusted", stats.bank.trusted, "text-emerald-300"],
                  ["Provisional", stats.bank.provisional, "text-amber-300"],
                  ["Stale", stats.bank.stale, "text-slate-300"],
                  ["Blocked", stats.bank.blocked, "text-rose-300"],
                  ["Lifetime reuses", stats.bank.lifetime_hits, "text-slate-100"],
                  ["Added in period", stats.bank.created_in_range, "text-slate-100"],
                  ["Student votes", `${stats.votes.up}👍 ${stats.votes.down}👎`, "text-slate-100"],
                ].map(([l, v, c]) => (
                  <div key={String(l)} className="bg-slate-950 border border-slate-700 rounded p-2.5">
                    <div className="text-slate-400 text-[11px]">{l}</div>
                    <div className={`text-base font-semibold ${c}`}>{typeof v === "number" ? nf(v) : v}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Concept {nf(stats.bank.concept)} · Chip {nf(stats.bank.chip)} · Highlight {nf(stats.bank.highlight)}
              </p>
            </Card>
          </div>

          {/* ---------------- top reused ---------------- */}
          <Card>
            <H hint="Answers that saved the most Gemini calls in this period.">Most reused answers</H>
            {stats.top_reused.length === 0 ? <p className="text-xs text-slate-500">No reused answers yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-400 text-left">
                    <tr><th className="py-1.5 font-medium">Question</th><th className="font-medium">Type</th><th className="font-medium">Status</th>
                      <th className="text-right font-medium">Votes</th><th className="text-right font-medium">Uses</th></tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {stats.top_reused.map((r) => (
                      <tr key={r.id} className="border-t border-slate-800">
                        <td className="py-1.5 pr-3 max-w-[560px] truncate" title={r.question}>{r.question}</td>
                        <td className="capitalize pr-3">{r.kind} · {r.lang}</td>
                        <td className="pr-3"><StatusPill s={r.status} /></td>
                        <td className="text-right pr-3">{r.up}👍 {r.down}👎</td>
                        <td className="text-right font-semibold">{nf(r.uses)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ---------------- entry review ---------------- */}
      <EntryReview onChanged={load} />

      {/* ---------------- pricing ---------------- */}
      <Card>
        <button onClick={() => setShowPricing((v) => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-white">
          <span className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-slate-400" /> Price settings (for cost estimates)</span>
          {showPricing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showPricing && (
          <div className="mt-3 space-y-3">
            <p className="text-[11px] text-slate-400">
              Enter your Gemini price in US dollars per 1 million tokens. Thinking tokens are charged at the output price.
              These numbers only affect estimates on this page.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([["input_per_m", "Input $ / 1M tokens"], ["output_per_m", "Output $ / 1M tokens"], ["usd_to_inr", "₹ per $1"]] as [keyof Pricing, string][]).map(([k, l]) => (
                <div key={k}>
                  <label className="text-[11px] text-slate-400 block mb-1">{l}</label>
                  <input type="number" step="0.01" min="0" value={pricingDraft[k]}
                    onChange={(e) => setPricingDraft({ ...pricingDraft, [k]: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={savePricing} className="px-3 py-1.5 rounded text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">Save prices</button>
              {pricingMsg && <span className="text-[11px] text-slate-300">{pricingMsg}</span>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// =====================================================================
// Entry review: look at saved answers, trust / block / delete them
// =====================================================================
const PAGE = 15;

function EntryReview({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmStale, setConfirmStale] = useState(false);
  const [err, setErr] = useState("");

  // wait a moment after typing before searching
  useEffect(() => { const id = setTimeout(() => { setQuery(search); setPage(0); }, 350); return () => clearTimeout(id); }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase.rpc("guru_admin_list_entries", {
      p_status: status || null, p_search: query || null, p_limit: PAGE, p_offset: page * PAGE,
    });
    if (error) setErr(error.message);
    else { setRows((data?.rows || []) as Entry[]); setTotal(data?.total || 0); }
    setLoading(false);
  }, [status, query, page]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: "trust" | "provisional" | "block" | "delete" | "delete_stale") => {
    setBusy(id + action);
    setErr("");
    const { error } = await supabase.rpc("guru_admin_set_entry", {
      p_id: id, p_action: action,
    });
    setBusy(null);
    if (error) { setErr(error.message); return; }
    setConfirmStale(false);
    await load();
    onChanged();
  };

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <Card>
      <H hint="Answers students gave a 👎 more than a 👍 appear first. Trust good answers so they are reused with a looser match; block bad ones so they are never shown again.">
        Review saved answers
      </H>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…"
            className="bg-slate-950 border border-slate-700 rounded pl-8 pr-2 py-1.5 text-xs text-slate-200 w-64" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
          <option value="">All statuses</option>
          <option value="provisional">Provisional</option>
          <option value="trusted">Trusted</option>
          <option value="stale">Stale</option>
          <option value="blocked">Blocked</option>
        </select>
        <span className="text-[11px] text-slate-500">{nf(total)} entries</span>

        <div className="ml-auto">
          {!confirmStale ? (
            <button onClick={() => setConfirmStale(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300">
              <Trash2 className="w-3.5 h-3.5" /> Delete all stale + blocked
            </button>
          ) : (
            <span className="flex items-center gap-2 text-xs text-rose-200">
              Delete every stale and blocked entry?
              <button onClick={() => act("00000000-0000-0000-0000-000000000000", "delete_stale")}
                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold">Delete</button>
              <button onClick={() => setConfirmStale(false)} className="px-2 py-1 rounded bg-slate-800 text-slate-300">Keep</button>
            </span>
          )}
        </div>
      </div>

      {err && <p className="text-xs text-rose-300 mb-2">{err}</p>}

      <div className="space-y-2">
        {loading && rows.length === 0 && <div className="py-8 flex justify-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /></div>}
        {!loading && rows.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No saved answers match.</p>}

        {rows.map((r) => {
          const isOpen = open === r.id;
          const flagged = r.down > r.up;
          return (
            <div key={r.id} className={`border rounded-lg ${flagged ? "border-rose-500/40 bg-rose-500/5" : "border-slate-700 bg-slate-950"}`}>
              <div className="flex items-start gap-3 p-3">
                <button onClick={() => setOpen(isOpen ? null : r.id)} className="flex-1 text-left min-w-0">
                  <div className="text-xs text-slate-100 leading-snug break-words">{r.question}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                    <StatusPill s={r.status} />
                    <span className="capitalize">{r.kind} · {r.lang}</span>
                    {r.topic_name && <span>Topic: {r.topic_name}</span>}
                    <span>Used {nf(r.hits)}×</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{r.up}</span>
                    <span className="flex items-center gap-1"><ThumbsDown className="w-3 h-3" />{r.down}</span>
                    <span>Updated {new Date(r.updated_at).toLocaleDateString()}</span>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {r.status !== "trusted" && (
                    <button disabled={!!busy} onClick={() => act(r.id, "trust")} title="Trust"
                      className="p-1.5 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50"><ShieldCheck className="w-3.5 h-3.5" /></button>
                  )}
                  {r.status !== "provisional" && r.status !== "stale" && (
                    <button disabled={!!busy} onClick={() => act(r.id, "provisional")} title="Make provisional"
                      className="p-1.5 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 disabled:opacity-50"><Check className="w-3.5 h-3.5" /></button>
                  )}
                  {r.status !== "blocked" && (
                    <button disabled={!!busy} onClick={() => act(r.id, "block")} title="Block (never show again)"
                      className="p-1.5 rounded bg-slate-700/60 text-slate-300 hover:bg-slate-700 disabled:opacity-50"><Ban className="w-3.5 h-3.5" /></button>
                  )}
                  <button disabled={!!busy} onClick={() => act(r.id, "delete")} title="Delete (Gemini will write a fresh one next time)"
                    className="p-1.5 rounded bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 disabled:opacity-50">
                    {busy === r.id + "delete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-slate-800 p-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {r.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3 text-xs text-slate-300">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40">Previous</button>
          <span>Page {page + 1} of {pages}</span>
          <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40">Next</button>
        </div>
      )}
    </Card>
  );
}