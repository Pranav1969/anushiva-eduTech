// src/app/admin/components/FormManagePlans.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save, RotateCcw,
  CheckCircle2, XCircle, Users, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

/* ----------------------------- types ----------------------------- */

type Feature = { text: string; included: boolean };

type Plan = {
  slug: "free" | "silver" | "gold" | "premium";
  name: string;
  tagline: string;
  price: number;
  original_price: number | null;
  validity_days: number | null;
  badge_text: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  accent: string;
  cta_label: string;
  features: Feature[];
  mock_tests_limit: number | null;
  ai_doubts_per_day: number | null;
  notes_access: "none" | "limited" | "full";
  analytics_level: "basic" | "advanced";
  support_level: "community" | "email" | "priority";
};

const ACCENTS: Record<string, string> = {
  slate: "bg-slate-400",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
};

const VALIDITY_PRESETS = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 },
  { label: "1 year", value: 365 },
  { label: "Forever", value: null },
];

const INPUT =
  "w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const LABEL = "mb-1 block text-xs font-medium text-slate-300";
const HINT = "mt-1 text-[11px] text-slate-500";
const CARD = "rounded-lg border border-slate-700 bg-slate-900 p-4";

/* ----------------------------- helpers ----------------------------- */

const numOrNull = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalise = (row: any): Plan => ({
  slug: row.slug,
  name: row.name ?? "",
  tagline: row.tagline ?? "",
  price: Number(row.price ?? 0),
  original_price: row.original_price === null ? null : Number(row.original_price),
  validity_days: row.validity_days,
  badge_text: row.badge_text ?? "",
  is_popular: !!row.is_popular,
  is_active: !!row.is_active,
  sort_order: row.sort_order ?? 0,
  accent: row.accent ?? "sky",
  cta_label: row.cta_label ?? "Get started",
  features: Array.isArray(row.features) ? row.features : [],
  mock_tests_limit: row.mock_tests_limit,
  ai_doubts_per_day: row.ai_doubts_per_day,
  notes_access: row.notes_access ?? "limited",
  analytics_level: row.analytics_level ?? "basic",
  support_level: row.support_level ?? "community",
});

const validate = (p: Plan): string | null => {
  if (!p.name.trim()) return "Plan name is required.";
  if (p.price < 0) return "Price cannot be negative.";
  if (p.original_price !== null && p.original_price < p.price)
    return "Original price must be equal to or higher than the selling price.";
  if (p.validity_days !== null && (!Number.isInteger(p.validity_days) || p.validity_days <= 0))
    return "Validity must be a whole number of days, or empty for forever.";
  if (p.slug !== "free" && p.price > 0 && p.validity_days === null)
    return "Paid plans need a validity period.";
  return null;
};

/* ----------------------------- component ----------------------------- */

export default function FormManagePlans({ onUpdateComplete }: { onUpdateComplete?: () => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saved, setSaved] = useState<Record<string, Plan>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeSlug, setActiveSlug] = useState<Plan["slug"]>("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("plans").select("*").order("sort_order", { ascending: true });
    if (error) {
      setMsg({ type: "err", text: `Could not load plans: ${error.message}. Did you run 01_plans.sql?` });
      setLoading(false);
      return;
    }
    const list = (data || []).map(normalise);
    setPlans(list);
    setSaved(Object.fromEntries(list.map(p => [p.slug, structuredClone(p)])));
    if (list.length && !list.find(p => p.slug === activeSlug)) setActiveSlug(list[0].slug);

    // students per plan
    const entries = await Promise.all(
      list.map(async p => {
        const { count } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("current_plan", p.slug);
        return [p.slug, count ?? 0] as const;
      })
    );
    setCounts(Object.fromEntries(entries));
    setLoading(false);
  }, [activeSlug]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const plan = plans.find(p => p.slug === activeSlug);
  const dirty = useMemo(
    () => !!plan && JSON.stringify(plan) !== JSON.stringify(saved[plan.slug]),
    [plan, saved]
  );
  const isDirty = (slug: string) =>
    JSON.stringify(plans.find(p => p.slug === slug)) !== JSON.stringify(saved[slug]);

  const patch = (changes: Partial<Plan>) => {
    setMsg(null);
    setPlans(prev => prev.map(p => (p.slug === activeSlug ? { ...p, ...changes } : p)));
  };

  /* --- feature list editing --- */
  const setFeature = (i: number, changes: Partial<Feature>) =>
    patch({ features: plan!.features.map((f, idx) => (idx === i ? { ...f, ...changes } : f)) });
  const addFeature = () => patch({ features: [...plan!.features, { text: "", included: true }] });
  const removeFeature = (i: number) => patch({ features: plan!.features.filter((_, idx) => idx !== i) });
  const moveFeature = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= plan!.features.length) return;
    const next = [...plan!.features];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ features: next });
  };

  /* --- save / reset --- */
  const save = async () => {
    if (!plan) return;
    const err = validate(plan);
    if (err) return setMsg({ type: "err", text: err });

    setSaving(true);
    setMsg(null);

    const cleanFeatures = plan.features
      .map(f => ({ text: f.text.trim(), included: f.included }))
      .filter(f => f.text);

    const { error } = await supabase
      .from("plans")
      .update({
        name: plan.name.trim(),
        tagline: plan.tagline.trim() || null,
        price: plan.price,
        original_price: plan.original_price,
        validity_days: plan.validity_days,
        badge_text: plan.badge_text.trim() || null,
        is_popular: plan.is_popular,
        is_active: plan.slug === "free" ? true : plan.is_active,
        sort_order: plan.sort_order,
        accent: plan.accent,
        cta_label: plan.cta_label.trim() || "Get started",
        features: cleanFeatures,
        mock_tests_limit: plan.mock_tests_limit,
        ai_doubts_per_day: plan.ai_doubts_per_day,
        notes_access: plan.notes_access,
        analytics_level: plan.analytics_level,
        support_level: plan.support_level,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", plan.slug);

    if (error) {
      setMsg({ type: "err", text: `Save failed: ${error.message}` });
    } else {
      // Only one plan should carry the "popular" highlight
      if (plan.is_popular) {
        await supabase.from("plans").update({ is_popular: false }).neq("slug", plan.slug);
      }
      setMsg({ type: "ok", text: `${plan.name} saved. Students see the change immediately.` });
      await load();
      onUpdateComplete?.();
    }
    setSaving(false);
  };

  const reset = () => {
    if (!plan) return;
    setPlans(prev => prev.map(p => (p.slug === plan.slug ? structuredClone(saved[plan.slug]) : p)));
    setMsg(null);
  };

  /* ----------------------------- render ----------------------------- */

  if (loading && !plans.length) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" /> <span className="text-sm">Loading plans...</span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center gap-2 rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        <AlertCircle className="h-4 w-4" /> {msg?.text ?? "No plans found. Run 01_plans.sql in the Supabase SQL editor."}
      </div>
    );
  }

  const discount =
    plan.original_price && plan.original_price > plan.price
      ? Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)
      : 0;
  const perMonth =
    plan.validity_days && plan.price > 0 ? Math.round(plan.price / (plan.validity_days / 30)) : null;

  return (
    <div className="space-y-4">
      {/* plan selector */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {plans.map(p => (
          <button
            key={p.slug}
            onClick={() => { setActiveSlug(p.slug); setMsg(null); }}
            className={`rounded-lg border p-3 text-left transition-colors ${
              p.slug === activeSlug
                ? "border-indigo-500 bg-indigo-600/15"
                : "border-slate-700 bg-slate-900 hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${ACCENTS[p.accent] ?? "bg-sky-500"}`} />
              <span className="text-sm font-semibold text-white">{p.name || p.slug}</span>
              {isDirty(p.slug) && <span className="ml-auto text-[10px] font-medium text-amber-400">Unsaved</span>}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {p.price === 0 ? "Free" : `₹${p.price}`} · {p.is_active ? "Visible" : "Hidden"}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <Users className="h-3 w-3" /> {counts[p.slug] ?? 0} students
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT column */}
        <div className="space-y-4">
          <section className={CARD}>
            <h3 className="mb-3 text-sm font-semibold text-white">Basics</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Plan name</label>
                <input className={INPUT} value={plan.name} onChange={e => patch({ name: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Button text</label>
                <input className={INPUT} value={plan.cta_label} onChange={e => patch({ cta_label: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Tagline</label>
                <input
                  className={INPUT}
                  value={plan.tagline}
                  placeholder="One line that tells students who this plan is for"
                  onChange={e => patch({ tagline: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL}>Badge text</label>
                <input
                  className={INPUT}
                  value={plan.badge_text}
                  placeholder="e.g. Most popular"
                  onChange={e => patch({ badge_text: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL}>Display order</label>
                <input
                  type="number"
                  className={INPUT}
                  value={plan.sort_order}
                  onChange={e => patch({ sort_order: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className={LABEL}>Accent colour</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ACCENTS).map(([key, cls]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => patch({ accent: key })}
                    aria-label={key}
                    className={`h-7 w-7 rounded-full ${cls} ${
                      plan.accent === key ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "opacity-70 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={plan.is_popular}
                  onChange={e => patch({ is_popular: e.target.checked })}
                  className="h-4 w-4 accent-indigo-500"
                />
                Highlight as recommended
              </label>
              <label className={`flex items-center gap-2 text-sm ${plan.slug === "free" ? "text-slate-500" : "text-slate-200"}`}>
                <input
                  type="checkbox"
                  checked={plan.is_active}
                  disabled={plan.slug === "free"}
                  onChange={e => patch({ is_active: e.target.checked })}
                  className="h-4 w-4 accent-indigo-500"
                />
                {plan.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Show to students
              </label>
            </div>
            {plan.slug === "free" && <p className={HINT}>The Free plan is always visible.</p>}
          </section>

          <section className={CARD}>
            <h3 className="mb-3 text-sm font-semibold text-white">Price and validity</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Selling price (₹)</label>
                <input
                  type="number"
                  min={0}
                  className={INPUT}
                  value={plan.price}
                  onChange={e => patch({ price: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className={LABEL}>Original price (₹)</label>
                <input
                  type="number"
                  min={0}
                  className={INPUT}
                  value={plan.original_price ?? ""}
                  placeholder="Optional, shown struck through"
                  onChange={e => patch({ original_price: numOrNull(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Validity (days)</label>
                <input
                  type="number"
                  min={1}
                  className={INPUT}
                  value={plan.validity_days ?? ""}
                  placeholder="Empty = forever"
                  onChange={e => patch({ validity_days: numOrNull(e.target.value) })}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {VALIDITY_PRESETS.map(v => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => patch({ validity_days: v.value })}
                      className={`rounded border px-2 py-1 text-xs ${
                        plan.validity_days === v.value
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 rounded bg-slate-950 px-3 py-2 text-xs text-slate-400">
              Students will see:{" "}
              <span className="font-semibold text-slate-200">
                {plan.price === 0 ? "Free" : `₹${plan.price}`}
              </span>
              {discount > 0 && <span className="text-emerald-400"> ({discount}% off)</span>}
              {perMonth && <span> · about ₹{perMonth} per month</span>}
              {" · "}
              {plan.validity_days ? `valid for ${plan.validity_days} days` : "no expiry"}
            </p>
          </section>

          <section className={CARD}>
            <h3 className="mb-3 text-sm font-semibold text-white">Limits and access</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Mock tests per month</label>
                <input
                  type="number"
                  min={0}
                  className={INPUT}
                  value={plan.mock_tests_limit ?? ""}
                  placeholder="Empty = unlimited"
                  onChange={e => patch({ mock_tests_limit: numOrNull(e.target.value) })}
                />
              </div>
              <div>
                <label className={LABEL}>Guruji AI doubts per day</label>
                <input
                  type="number"
                  min={0}
                  className={INPUT}
                  value={plan.ai_doubts_per_day ?? ""}
                  placeholder="Empty = unlimited"
                  onChange={e => patch({ ai_doubts_per_day: numOrNull(e.target.value) })}
                />
              </div>
              <div>
                <label className={LABEL}>Notes access</label>
                <select className={INPUT} value={plan.notes_access} onChange={e => patch({ notes_access: e.target.value as Plan["notes_access"] })}>
                  <option value="none">No notes</option>
                  <option value="limited">Selected chapters</option>
                  <option value="full">All chapters</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Analytics</label>
                <select className={INPUT} value={plan.analytics_level} onChange={e => patch({ analytics_level: e.target.value as Plan["analytics_level"] })}>
                  <option value="basic">Basic score report</option>
                  <option value="advanced">Advanced (weak topics, rank)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Support</label>
                <select className={INPUT} value={plan.support_level} onChange={e => patch({ support_level: e.target.value as Plan["support_level"] })}>
                  <option value="community">Community help</option>
                  <option value="email">Email support</option>
                  <option value="priority">Priority support</option>
                </select>
              </div>
            </div>
            <p className={HINT}>
              These values are shown in the comparison table. Enforcing them inside tests and Guruji is done in
              those features using the student&apos;s current plan.
            </p>
          </section>
        </div>

        {/* RIGHT column: features */}
        <section className={`${CARD} self-start`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Feature list</h3>
            <button
              onClick={addFeature}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" /> Add feature
            </button>
          </div>

          {plan.features.length === 0 && (
            <p className="rounded border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
              No features yet. Add what students get with this plan.
            </p>
          )}

          <ul className="space-y-2">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 rounded border border-slate-800 bg-slate-950 p-2">
                <button
                  type="button"
                  onClick={() => setFeature(i, { included: !f.included })}
                  title={f.included ? "Included. Click to mark as not included" : "Not included. Click to mark as included"}
                  className="shrink-0"
                >
                  {f.included ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-slate-500" />
                  )}
                </button>
                <input
                  className={`${INPUT} ${!f.included ? "text-slate-500 line-through" : ""}`}
                  value={f.text}
                  placeholder="Feature text"
                  onChange={e => setFeature(i, { text: e.target.value })}
                />
                <div className="flex shrink-0">
                  <button onClick={() => moveFeature(i, -1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move up">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => moveFeature(i, 1)} disabled={i === plan.features.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move down">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => removeFeature(i)} className="p-1 text-red-400 hover:text-red-300" aria-label="Remove feature">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className={HINT}>Tick means included. Cross shows the feature greyed out, which helps students see what they unlock by upgrading.</p>
        </section>
      </div>

      {/* sticky save bar */}
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/95 p-3 backdrop-blur">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {plan.name || "plan"}
        </button>
        <button
          onClick={reset}
          disabled={!dirty || saving}
          className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" /> Discard changes
        </button>
        {msg && (
          <span className={`flex items-center gap-1.5 text-sm ${msg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
            {msg.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {msg.text}
          </span>
        )}
        {!msg && dirty && <span className="text-sm text-amber-400">You have unsaved changes.</span>}
      </div>
    </div>
  );
}