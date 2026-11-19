// src/app/student/upgrade/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Crown, Sparkles, Check, X, Loader2, AlertCircle, CalendarClock, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useTheme } from "../theme/ThemeProvider";

/* ----------------------------- types ----------------------------- */

type Feature = { text: string; included: boolean };

type Plan = {
  slug: "free" | "silver" | "gold" | "premium";
  name: string;
  tagline: string | null;
  price: number;
  original_price: number | null;
  validity_days: number | null;
  badge_text: string | null;
  is_popular: boolean;
  accent: string;
  cta_label: string;
  features: Feature[];
  mock_tests_limit: number | null;
  ai_doubts_per_day: number | null;
  notes_access: "none" | "limited" | "full";
  analytics_level: "basic" | "advanced";
  support_level: "community" | "email" | "priority";
};

/* Static class strings so Tailwind can see them */
const ACCENT: Record<string, { bar: string; chip: string; button: string; ring: string; focus: string; badge: string }> = {
  slate:   { bar: "bg-slate-400",   chip: "from-slate-300 to-slate-500",    button: "from-slate-500 to-slate-700",    ring: "ring-slate-400/50",   focus: "focus-visible:ring-slate-400",   badge: "bg-slate-500 text-white" },
  sky:     { bar: "bg-sky-500",     chip: "from-sky-400 to-blue-600",       button: "from-sky-500 to-blue-600",       ring: "ring-sky-500/50",     focus: "focus-visible:ring-sky-500",     badge: "bg-sky-600 text-white" },
  amber:   { bar: "bg-amber-500",   chip: "from-amber-300 to-yellow-600",   button: "from-amber-500 to-orange-600",   ring: "ring-amber-500/60",   focus: "focus-visible:ring-amber-500",   badge: "bg-amber-500 text-black" },
  violet:  { bar: "bg-violet-500",  chip: "from-violet-500 to-fuchsia-600", button: "from-violet-600 to-fuchsia-600", ring: "ring-violet-500/50",  focus: "focus-visible:ring-violet-500",  badge: "bg-violet-600 text-white" },
  emerald: { bar: "bg-emerald-500", chip: "from-emerald-400 to-teal-600",   button: "from-emerald-500 to-teal-600",   ring: "ring-emerald-500/50", focus: "focus-visible:ring-emerald-500", badge: "bg-emerald-600 text-white" },
  rose:    { bar: "bg-rose-500",    chip: "from-rose-400 to-red-600",       button: "from-rose-500 to-red-600",       ring: "ring-rose-500/50",    focus: "focus-visible:ring-rose-500",    badge: "bg-rose-600 text-white" },
};

/* ----------------------------- helpers ----------------------------- */

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function formatValidity(days: number | null): string {
  if (!days) return "No expiry";
  if (days % 365 === 0) return days === 365 ? "1 year" : `${days / 365} years`;
  if (days % 30 === 0) return days === 30 ? "1 month" : `${days / 30} months`;
  return `${days} days`;
}

const limitCompact = (n: number | null, per: string) => (n === null ? "Unlimited" : `${n} / ${per}`);

const NOTES_TEXT = { none: "Not included", limited: "Selected chapters", full: "All chapters" } as const;
const ANALYTICS_TEXT = { basic: "Basic report", advanced: "Advanced insights" } as const;
const SUPPORT_TEXT = { community: "Community help", email: "Email support", priority: "Priority support" } as const;

/** Find the logged-in student's row. Adapt this to however the rest of your student area identifies the user. */
async function fetchCurrentStudent(): Promise<{ current_plan: Plan["slug"]; plan_expires_at: string | null } | null> {
  const cols = "current_plan, plan_expires_at";

  const { data: auth } = await supabase.auth.getUser();
  if (auth?.user) {
    const { data } = await supabase.from("students").select(cols).eq("auth_id", auth.user.id).maybeSingle();
    if (data) return data as any;
  }

  // Fallback for password-login students. Change the key to whatever you store at login.
  const localId = typeof window !== "undefined" ? window.localStorage.getItem("student_id") : null;
  if (localId) {
    const { data } = await supabase.from("students").select(cols).eq("id", localId).maybeSingle();
    if (data) return data as any;
  }
  return null;
}

const SOLID = { borderStyle: "solid" } as const;

/* ----------------------------- page ----------------------------- */

export default function UpgradePlanPage() {
  const { theme: t } = useTheme();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan["slug"]>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data, error: planErr }, student] = await Promise.all([
          supabase.from("plans").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
          fetchCurrentStudent(),
        ]);
        if (planErr) throw planErr;
        setPlans((data || []) as Plan[]);

        if (student) {
          const expired = student.plan_expires_at && new Date(student.plan_expires_at) < new Date();
          setCurrentPlan(expired ? "free" : student.current_plan);
          setExpiresAt(student.plan_expires_at);
        }
      } catch (e: any) {
        setError(e?.message || "Could not load plans.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = plans.find(p => p.slug === currentPlan);
  const daysLeft = useMemo(() => {
    if (!expiresAt || currentPlan === "free") return null;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
  }, [expiresAt, currentPlan]);

  // Payments are connected in the next step (Razorpay / Cashfree). Plan changes must happen
  // on the server after a verified payment, never from the browser.
  const startCheckout = (plan: Plan) => {
    setNotice(`Online payment for ${plan.name} is being switched on. We will let you know as soon as it is live.`);
  };

  const ctaLabel = (plan: Plan) => {
    if (plan.slug === currentPlan) return `Renew ${plan.name}`;
    if (current && current.price > 0) {
      return plan.price > current.price ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`;
    }
    return plan.cta_label;
  };

  const gridCols =
    plans.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : plans.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2";

  const compareRows: [string, (p: Plan) => string][] = [
    ["Price", p => (p.price === 0 ? "Free" : inr(p.price))],
    ["Validity", p => (p.price === 0 ? "Always" : formatValidity(p.validity_days))],
    ["Mock tests", p => limitCompact(p.mock_tests_limit, "month")],
    ["Guruji doubts", p => limitCompact(p.ai_doubts_per_day, "day")],
    ["Notes", p => NOTES_TEXT[p.notes_access]],
    ["Analytics", p => ANALYTICS_TEXT[p.analytics_level]],
    ["Support", p => SUPPORT_TEXT[p.support_level]],
  ];

  return (
    <main className={`min-h-screen ${t.page} ${t.selection}`}>
      <header className={`sticky top-0 z-10 border-b backdrop-blur-md ${t.header}`}>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link
            href="/student"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${t.iconButton}`}
          >
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:pb-24 md:pt-14">
        {/* ---------- intro ---------- */}
        <div className="mx-auto max-w-2xl text-center">
          <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${t.amber.iconWrap} ${t.amber.icon}`}>
            <Crown size={24} />
          </div>
          <h1 className={`text-balance text-3xl font-extrabold tracking-tight md:text-4xl ${t.text.heading}`}>
            Pick the plan that matches your preparation
          </h1>
          <p className={`mx-auto mt-3 max-w-xl text-sm leading-relaxed ${t.text.muted}`}>
            Start free and upgrade when you need more tests, deeper analytics and faster doubt solving. You can
            upgrade or renew any time.
          </p>

          {/* current plan pill */}
          {!loading && current && (
            <div
              className={`mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border px-4 py-2 text-sm ${t.panelDashed}`}
              style={SOLID}
            >
              <span className={`flex items-center gap-1.5 font-semibold ${t.text.heading}`}>
                <ShieldCheck size={16} className={t.accent.text} /> You are on {current.name}
              </span>
              {daysLeft !== null && (
                <span className={`flex items-center gap-1.5 text-xs ${t.text.muted}`}>
                  <CalendarClock size={14} />
                  {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                  {expiresAt &&
                    ` · till ${new Date(expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                </span>
              )}
            </div>
          )}
        </div>

        {notice && (
          <div
            role="status"
            className={`mx-auto mt-6 flex max-w-2xl items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${t.panelDashed} ${t.text.heading}`}
            style={SOLID}
          >
            <Sparkles size={16} className={`mt-0.5 shrink-0 ${t.accent.text}`} />
            <span className="flex-1 leading-snug">{notice}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss" className={`shrink-0 ${t.text.muted}`}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ---------- loading skeleton ---------- */}
        {loading && (
          <div className={`mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4`} aria-busy="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`rounded-2xl border p-6 ${t.panelDashed}`} style={SOLID}>
                <div className={`h-11 w-11 rounded-xl ${t.accent.track}`} />
                <div className={`mt-4 h-5 w-24 rounded ${t.accent.track}`} />
                <div className={`mt-2 h-3 w-40 rounded ${t.accent.track}`} />
                <div className={`mt-6 h-10 w-32 rounded ${t.accent.track}`} />
                <div className="mt-8 space-y-3">
                  {[0, 1, 2, 3, 4].map(j => (
                    <div key={j} className={`h-3 rounded ${t.accent.track}`} style={{ width: `${70 + ((i + j) % 3) * 10}%` }} />
                  ))}
                </div>
                <div className={`mt-8 h-10 rounded-xl ${t.accent.track}`} />
              </div>
            ))}
            <span className="sr-only"><Loader2 className="animate-spin" /> Loading plans</span>
          </div>
        )}

        {/* ---------- error / empty ---------- */}
        {error && !loading && (
          <div className={`mx-auto mt-12 flex max-w-md items-center gap-2.5 rounded-xl border p-4 text-sm ${t.panelDashed} ${t.text.heading}`} style={SOLID}>
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <span>We could not load the plans. Check your connection and refresh the page.</span>
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <p className={`py-20 text-center text-sm ${t.text.muted}`}>Plans are not available right now. Please check back soon.</p>
        )}

        {/* ---------- plan cards ---------- */}
        {!loading && plans.length > 0 && (
          <>
            <div className={`mt-12 grid items-stretch gap-5 ${gridCols}`}>
              {plans.map(plan => {
                const a = ACCENT[plan.accent] ?? ACCENT.sky;
                const isCurrent = plan.slug === currentPlan;
                const isPaid = plan.price > 0;
                const hasStrike = !!plan.original_price && plan.original_price > plan.price;
                const discount = hasStrike
                  ? Math.round(((plan.original_price! - plan.price) / plan.original_price!) * 100)
                  : 0;
                const perMonth =
                  plan.validity_days && isPaid ? Math.round(plan.price / (plan.validity_days / 30)) : null;

                return (
                  <article
                    key={plan.slug}
                    className={`flex h-full flex-col overflow-hidden rounded-2xl border ${t.panelDashed} ${t.text.heading} ${
                      plan.is_popular ? `shadow-xl ring-2 ${a.ring}` : ""
                    }`}
                    style={SOLID}
                  >
                    <span className={`block h-1 w-full ${a.bar}`} />

                    <div className="flex flex-1 flex-col p-6">
                      {/* head: icon left, badge right, same row so nothing overlaps */}
                      <div className="flex h-11 items-center justify-between gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${a.chip}`}>
                          <Crown size={20} />
                        </div>
                        {plan.badge_text && (
                          <span className={`truncate rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${a.badge}`}>
                            {plan.badge_text}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-4 text-xl font-extrabold leading-6">{plan.name}</h2>
                      <p className={`mt-1.5 line-clamp-2 h-10 text-sm leading-5 ${t.text.muted}`}>{plan.tagline ?? ""}</p>

                      {/* price block: fixed height so every card lines up */}
                      <div className="mt-5 h-[104px]">
                        <div className="flex h-11 items-end gap-2">
                          <span className="text-4xl font-extrabold leading-none tracking-tight">
                            {isPaid ? inr(plan.price) : "Free"}
                          </span>
                          {hasStrike && (
                            <span className={`pb-0.5 text-sm leading-none line-through ${t.text.muted}`}>
                              {inr(plan.original_price!)}
                            </span>
                          )}
                        </div>
                        <p className={`mt-2 h-4 text-xs leading-4 ${t.text.muted}`}>
                          {isPaid
                            ? `Valid for ${formatValidity(plan.validity_days)}${perMonth ? ` · about ${inr(perMonth)} a month` : ""}`
                            : "No payment needed"}
                        </p>
                        <div className="mt-2 h-6">
                          {discount > 0 && (
                            <span className="inline-flex h-6 items-center rounded-md bg-emerald-500/15 px-2 text-xs font-bold text-emerald-500">
                              Save {discount}%
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="my-5 h-px bg-current opacity-10" />

                      {/* key limits */}
                      <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className={`text-xs ${t.text.muted}`}>Mock tests</dt>
                          <dd className="mt-0.5 font-bold">{limitCompact(plan.mock_tests_limit, "month")}</dd>
                        </div>
                        <div>
                          <dt className={`text-xs ${t.text.muted}`}>Guruji doubts</dt>
                          <dd className="mt-0.5 font-bold">{limitCompact(plan.ai_doubts_per_day, "day")}</dd>
                        </div>
                      </dl>

                      <div className="my-5 h-px bg-current opacity-10" />

                      {/* features */}
                      <ul className="flex-1 space-y-3">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm leading-5">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                              {f.included ? (
                                <Check size={16} className="text-emerald-500" />
                              ) : (
                                <X size={16} className={`opacity-50 ${t.text.muted}`} />
                              )}
                            </span>
                            <span className={f.included ? "" : `${t.text.muted} line-through opacity-70`}>{f.text}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA pinned to bottom */}
                      <div className="mt-7">
                        {isCurrent && !isPaid ? (
                          <button
                            disabled
                            className={`h-11 w-full cursor-not-allowed rounded-xl border px-4 text-sm font-bold opacity-70 ${t.ui.btnGhost}`}
                          >
                            Your current plan
                          </button>
                        ) : !isPaid ? (
                          <Link
                            href="/student"
                            className={`flex h-11 w-full items-center justify-center rounded-xl border px-4 text-sm font-bold ${t.ui.btnGhost}`}
                          >
                            {plan.cta_label}
                          </Link>
                        ) : (
                          <button
                            onClick={() => startCheckout(plan)}
                            className={`h-11 w-full rounded-xl bg-gradient-to-r px-4 text-sm font-bold text-white shadow-md transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${a.button} ${a.focus}`}
                          >
                            {ctaLabel(plan)}
                          </button>
                        )}
                        {isCurrent && isPaid && (
                          <p className={`mt-2 text-center text-xs ${t.text.muted}`}>This is your current plan</p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* ---------- comparison ---------- */}
            <div className="mt-16 md:mt-20">
              <h2 className={`text-center text-xl font-bold ${t.text.heading}`}>Compare plans side by side</h2>

              {/* desktop / tablet: grid table */}
              <div
                className={`mt-6 hidden overflow-hidden rounded-2xl border md:block ${t.panelDashed} ${t.text.heading}`}
                style={SOLID}
              >
                <div
                  className="grid items-center px-6"
                  style={{ gridTemplateColumns: `minmax(130px,1.2fr) repeat(${plans.length}, minmax(0,1fr))` }}
                >
                  <div className={`py-4 text-sm font-medium ${t.text.muted}`}>What you get</div>
                  {plans.map(p => (
                    <div key={p.slug} className="py-4 text-center text-sm font-bold">
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${(ACCENT[p.accent] ?? ACCENT.sky).bar}`} />
                        {p.name}
                      </span>
                      {p.slug === currentPlan && (
                        <span className={`mt-0.5 block text-[11px] font-medium ${t.text.muted}`}>Your plan</span>
                      )}
                    </div>
                  ))}

                  {compareRows.map(([label, get]) => (
                    <Fragment key={label}>
                      <div className="col-span-full h-px bg-current opacity-10" />
                      <div className={`py-3.5 text-sm font-medium ${t.text.muted}`}>{label}</div>
                      {plans.map(p => (
                        <div key={p.slug} className="py-3.5 text-center text-sm">{get(p)}</div>
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>

              {/* mobile: one block per row, no sideways scrolling */}
              <div
                className={`mt-6 overflow-hidden rounded-2xl border md:hidden ${t.panelDashed} ${t.text.heading}`}
                style={SOLID}
              >
                {compareRows.map(([label, get], idx) => (
                  <div key={label}>
                    {idx > 0 && <div className="h-px bg-current opacity-10" />}
                    <div className="px-4 py-4">
                      <div className={`text-xs font-semibold ${t.text.muted}`}>{label}</div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                        {plans.map(p => (
                          <div key={p.slug} className="flex items-center justify-between gap-2 text-sm">
                            <dt className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${(ACCENT[p.accent] ?? ACCENT.sky).bar}`} />
                              <span className={t.text.muted}>{p.name}</span>
                            </dt>
                            <dd className="text-right font-semibold">{get(p)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className={`mt-10 text-center text-xs ${t.text.muted}`}>
              Prices are in Indian rupees. Your plan starts as soon as the payment is confirmed.
            </p>
          </>
        )}
      </section>
    </main>
  );
}