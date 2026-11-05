//src\app\student\deep-analysis\page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, animate, useScroll, useSpring } from "framer-motion";
import {
  ArrowLeft, Crown, Lock, Loader2, Flame, Target, Lightbulb, AlertTriangle,
  CheckCircle2, ChevronDown, RotateCcw, Gauge, Zap, Trophy,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine, ReferenceArea, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { supabase } from "@/utils/supabase";
import { useStudentSession } from "@/utils/auth";
import { getVerdict, resolveTaxonomy, Verdict } from "../components/resultMeta";

const UPGRADE_ROUTE = "/student/plans"; // <- change to your pricing / plans page

// ---------- design tokens: a night-track palette (deep pine, chalk, marigold, aurora) ----------
const C = {
  you: "#FFB627", top: "#EDE8D8", avg: "#7FA596",
  good: "#8BD17C", bad: "#FF6B4A", skip: "#5E7A70",
};
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]; // shared easing for every entrance
const SEC_HUES = ["#FFB627", "#7FD6C2", "#F29E8E", "#9DB4F2", "#C5DE74", "#E3B6F0"];
const NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap');
@property --ang{syntax:'<angle>';initial-value:0deg;inherits:false}
.da-root{--bg:#0C1915;--panel:#122820;--panel2:#18342A;--line:#2A4A3E;--ink:#E4EBE6;--mute:#8BA699;font-family:'Instrument Sans',system-ui,sans-serif;position:relative;isolation:isolate;overflow-x:clip}
.da-head{font-family:'Bricolage Grotesque','Instrument Sans',sans-serif;letter-spacing:-0.02em}
.da-num{font-family:'Bricolage Grotesque',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-0.03em}

/* ambient world: drifting aurora + film grain + faint track lines */
.da-world{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:#0C1915}
.da-blob{position:absolute;border-radius:50%;filter:blur(90px);opacity:.55;will-change:transform}
.da-b1{width:560px;height:560px;left:-120px;top:-100px;background:radial-gradient(circle,rgba(127,214,194,.55),transparent 65%);animation:daDrift1 22s ease-in-out infinite alternate}
.da-b2{width:620px;height:620px;right:-160px;top:-60px;background:radial-gradient(circle,rgba(255,182,39,.42),transparent 65%);animation:daDrift2 26s ease-in-out infinite alternate}
.da-b3{width:520px;height:520px;left:35%;bottom:-220px;background:radial-gradient(circle,rgba(157,180,242,.28),transparent 65%);animation:daDrift3 30s ease-in-out infinite alternate}
.da-grain{position:absolute;inset:0;opacity:.07;mix-blend-mode:overlay;background-image:${NOISE}}
.da-lines{position:absolute;inset:0;opacity:.5;background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 96px);mask-image:linear-gradient(180deg,#000,transparent 80%);-webkit-mask-image:linear-gradient(180deg,#000,transparent 80%)}
@keyframes daDrift1{to{transform:translate(160px,120px) scale(1.15)}}
@keyframes daDrift2{to{transform:translate(-140px,160px) scale(1.1)}}
@keyframes daDrift3{to{transform:translate(-200px,-90px) scale(1.2)}}

/* glass card with cursor spotlight and a slow-travelling edge light */
.da-card{position:relative;background:linear-gradient(160deg,rgba(24,52,42,.78) 0%,rgba(14,32,25,.82) 100%);backdrop-filter:blur(14px) saturate(130%);-webkit-backdrop-filter:blur(14px) saturate(130%);box-shadow:0 1px 0 rgba(255,255,255,.07) inset,0 0 0 1px rgba(255,255,255,.02),0 30px 60px -30px rgba(0,0,0,.85),0 0 80px -40px rgba(127,214,194,.18)}
.da-card::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:conic-gradient(from var(--ang),transparent 0 62%,rgba(255,182,39,.85) 78%,rgba(127,214,194,.7) 88%,transparent 100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:daSpin 9s linear infinite;opacity:.55}
.da-card::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .3s ease;background:radial-gradient(420px circle at var(--mx,50%) var(--my,0%),rgba(255,214,120,.10),transparent 60%)}
.da-card:hover::after{opacity:1}
@keyframes daSpin{to{--ang:360deg}}

/* living type */
.da-grad{background:linear-gradient(100deg,#FFD36B 0%,#FFB627 35%,#FF8A4A 60%,#FFD36B 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:daSheen 6s ease-in-out infinite alternate}
.da-grad-chalk{background:linear-gradient(100deg,#FFFFFF 0%,#EDE8D8 40%,#9FE3D0 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:daSheen 7s ease-in-out infinite alternate}
@keyframes daSheen{to{background-position:100% 0}}

/* bars, lights, pulses */
.da-shimmer{position:relative;overflow:hidden}
.da-shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.45) 50%,transparent 70%);transform:translateX(-100%);animation:daShim 3.2s ease-in-out infinite}
@keyframes daShim{60%,100%{transform:translateX(100%)}}
.da-head-dot{position:absolute;right:-6px;top:50%;width:12px;height:12px;border-radius:50%;transform:translateY(-50%);background:#fff}
.da-head-dot::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid currentColor;opacity:.7;animation:daPing 1.8s ease-out infinite}
@keyframes daPing{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.8);opacity:0}}
.da-live{width:8px;height:8px;border-radius:50%;background:#8BD17C;box-shadow:0 0 0 0 rgba(139,209,124,.7);animation:daLive 2s infinite}
@keyframes daLive{70%{box-shadow:0 0 0 9px rgba(139,209,124,0)}100%{box-shadow:0 0 0 0 rgba(139,209,124,0)}}
.da-float{animation:daFloat 6s ease-in-out infinite}
@keyframes daFloat{50%{transform:translateY(-6px)}}
.da-ring{animation:daRot 40s linear infinite;transform-origin:100px 100px}
@keyframes daRot{to{transform:rotate(360deg)}}
.da-conf{position:absolute;top:-12px;width:7px;height:12px;border-radius:2px;opacity:0;animation:daConf 3.2s ease-in infinite}
@keyframes daConf{0%{transform:translateY(0) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(190px) rotate(540deg);opacity:0}}
.da-crown{animation:daWobble 3.5s ease-in-out infinite;transform-origin:50% 90%}
@keyframes daWobble{0%,100%{transform:rotate(-6deg) scale(1)}50%{transform:rotate(6deg) scale(1.08)}}
.da-chk{background-image:conic-gradient(#fff 25%,#0A1411 0 50%,#fff 0 75%,#0A1411 0);background-size:8px 8px;opacity:.85}

/* tiles + interactive */
.da-tile{transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s ease,box-shadow .25s ease}
.da-tile:hover{transform:translateY(-4px);border-color:rgba(255,182,39,.45);box-shadow:0 18px 40px -18px rgba(255,182,39,.35)}
.da-btn{position:relative;overflow:hidden;transition:transform .2s ease,box-shadow .2s ease}
.da-btn:hover{transform:translateY(-2px) scale(1.02)}
.da-btn::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);transform:translateX(-120%);animation:daShim 3.6s ease-in-out infinite}
.da-chip{transition:all .2s ease}
.da-chip:hover{transform:translateY(-1px)}
.da-seg{transition:filter .15s ease,transform .15s ease}.da-seg:hover{filter:brightness(1.25) drop-shadow(0 0 8px currentColor);z-index:5;transform:scaleY(1.12)}
.da-scroll::-webkit-scrollbar{width:6px;height:6px}.da-scroll::-webkit-scrollbar-thumb{background:linear-gradient(#2A4A3E,#3E6B5A);border-radius:6px}
::selection{background:rgba(255,182,39,.35);color:#fff}
.da-medal{background:linear-gradient(110deg,#FFD36B,#FF9A3C,#FFD36B);background-size:200% 100%;animation:daSheen 3s ease-in-out infinite alternate}
button:focus-visible,a:focus-visible{outline:2px solid #FFB627;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.da-root *,.da-root *::before,.da-root *::after{animation:none!important;transition:none!important}}`;

function World() {
  return (
    <div aria-hidden className="da-world">
      <div className="da-blob da-b1" /><div className="da-blob da-b2" /><div className="da-blob da-b3" />
      <div className="da-lines" /><div className="da-grain" />
    </div>
  );
}

// ---------- helpers ----------
const fmt = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const secs = (s: number) => `${Math.round(s)}s`;
const median = (a: number[]) => {
  if (!a.length) return 0;
  const b = [...a].sort((x, y) => x - y);
  const m = Math.floor(b.length / 2);
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
};

interface Insight { tone: "warn" | "tip" | "good"; msg: string }
interface Row {
  id: string; no: number; section: string; text: string;
  you: number; visits: number; verdict: Verdict;
  avg: number | null; top: number | null;
  pctCorrect: number | null; pctTop: number | null; topSkipped: number | null;
  chapterKey: string; chapterName: string; chapterTagged: boolean; topicName: string; topicTagged: boolean;
  insight: Insight | null; trap: boolean; q: any;
}

function insightFor(r: Pick<Row, "you" | "verdict" | "top" | "pctTop" | "topSkipped" | "pctCorrect">): Insight | null {
  const { you, verdict, top, pctTop, topSkipped, pctCorrect } = r;
  const hasTop = top != null && top > 0;
  if (verdict === "wrong" && you < 5)
    return { tone: "warn", msg: (topSkipped ?? 0) >= 50
      ? "Avoid blind guessing. Most toppers skipped this question entirely."
      : "Answered in under 5 seconds and missed. Read the whole question or skip it." };
  if (verdict !== "correct" && you >= 90)
    return { tone: "warn", msg: `Ego trap: ${fmt(you)} spent and no marks gained. Set a hard stop and move on.` };
  if (verdict === "correct" && hasTop && you >= top! * 3 && you >= 40)
    return { tone: "tip", msg: `Correct, but it took ${Math.round((you / top!) * 100)}% of the topper's time. Learn the shortcut below to save about ${Math.round(you - top!)}s.` };
  if (verdict === "skipped" && hasTop && (pctTop ?? 0) >= 60 && (topSkipped ?? 100) < 30)
    return { tone: "tip", msg: `Toppers solved this in about ${secs(top!)}. It was worth an attempt.` };
  if (verdict === "skipped" && you <= 10 && (topSkipped ?? 0) >= 50)
    return { tone: "good", msg: "Smart skip. Most toppers left this one too." };
  if (verdict === "correct" && (pctCorrect ?? 100) < 40 && hasTop && top! >= 60 && you <= top! * 1.5)
    return { tone: "good", msg: "This was a genuinely hard question and you matched topper pace." };
  return null;
}

// ---------- UI building blocks ----------
// Count-up is display only: it animates toward the exact value and always lands on it.
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration: 1.4, ease: EASE, onUpdate: (x) => setV(x) });
    return () => c.stop();
  }, [value]);
  return <>{format(v)}</>;
}

function Card({ id, title, note, children, className = "" }: { id?: string; title?: string; note?: string; children: React.ReactNode; className?: string }) {
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <motion.section id={id} onMouseMove={onMove}
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: EASE }}
      className={`da-card scroll-mt-20 overflow-hidden rounded-3xl border border-white/[0.06] p-5 md:p-8 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,214,120,.8), transparent)" }} />
      {title && (
        <header className="relative mb-6 flex items-start gap-3">
          <span aria-hidden className="mt-1.5 h-6 w-1 shrink-0 rounded-full" style={{ background: `linear-gradient(180deg, ${C.you}, #7FD6C2)`, boxShadow: `0 0 14px ${C.you}88` }} />
          <div>
            <h2 className="da-head da-grad-chalk text-xl font-extrabold md:text-2xl">{title}</h2>
            {note && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--mute)]">{note}</p>}
          </div>
        </header>
      )}
      <div className="relative">{children}</div>
    </motion.section>
  );
}

const CONF = ["#FFB627", "#7FD6C2", "#F29E8E", "#9DB4F2", "#C5DE74", "#E3B6F0", "#FFFFFF"];
function TopperBanner({ cohort, name }: { cohort: number; name?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ease: EASE }}
      className="relative mb-7 overflow-hidden rounded-2xl border p-5 md:p-6"
      style={{ borderColor: "rgba(255,182,39,.5)", background: "linear-gradient(110deg, rgba(255,182,39,.20), rgba(255,138,74,.10) 45%, rgba(127,214,194,.12))", boxShadow: "0 0 60px -14px rgba(255,182,39,.55), inset 0 1px 0 rgba(255,255,255,.12)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 26 }).map((_, i) => (
          <span key={i} className="da-conf" style={{ left: `${(i * 37) % 100}%`, background: CONF[i % CONF.length], animationDelay: `${(i % 9) * 0.35}s`, animationDuration: `${2.6 + (i % 5) * 0.4}s` }} />
        ))}
      </div>
      <div className="relative flex items-center gap-4">
        <div className="da-crown flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(160deg,#FFD36B,#FF9A3C)", boxShadow: "0 0 36px rgba(255,182,39,.7)" }}>
          <Trophy size={28} color="#0C1915" />
        </div>
        <div>
          <h2 className="da-head da-grad text-2xl font-extrabold md:text-3xl">Congratulations{name ? `, ${name}` : ""}. You are the topper!</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]/80">You ranked #1 out of {cohort} on this test. Below is how to make your lead even stronger.</p>
        </div>
      </div>
    </motion.div>
  );
}

function Legend({ items }: { items: { c: string; l: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--mute)]">
      {items.map((i) => (
        <span key={i.l} className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2" style={{ borderColor: i.c, borderStyle: i.dashed ? "dashed" : "solid", filter: `drop-shadow(0 0 4px ${i.c})` }} />
          {i.l}
        </span>
      ))}
    </div>
  );
}

function ChartTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const delta = d.top != null ? d.you - d.top : null;
  return (
    <div className="min-w-[180px] rounded-2xl border border-white/10 bg-[#07110D]/90 p-3.5 text-xs shadow-[0_20px_50px_-10px_rgba(0,0,0,.9)] backdrop-blur-xl">
      <p className="da-head mb-1.5 text-sm font-bold text-[var(--ink)]">{d.name} <span className="ml-1 text-[11px] font-medium text-[var(--mute)]">{d.verdictLabel}</span></p>
      <p className="flex justify-between gap-4" style={{ color: C.you }}><span>You</span><span className="da-num font-bold">{secs(d.you)}</span></p>
      {d.top != null && <p className="flex justify-between gap-4" style={{ color: C.top }}><span>Topper</span><span className="da-num font-bold">{secs(d.top)}</span></p>}
      {d.avg != null && <p className="flex justify-between gap-4" style={{ color: C.avg }}><span>Average</span><span className="da-num font-bold">{secs(d.avg)}</span></p>}
      {delta != null && (
        <p className="mt-1.5 border-t border-white/10 pt-1.5 font-semibold" style={{ color: delta > 0 ? C.bad : C.good }}>
          {delta > 0 ? `${secs(delta)} slower than topper` : `${secs(-delta)} faster than topper`}
        </p>
      )}
    </div>
  );
}

function Donut({ parts, center, sub }: { parts: { v: number; c: string }[]; center: string; sub: string }) {
  const r = 72, circ = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  let acc = 0;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
      <defs>
        <filter id="dGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="dCore" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1B4034" stopOpacity=".9" /><stop offset="100%" stopColor="#0A1411" stopOpacity="0" /></radialGradient>
      </defs>
      <g className="da-ring"><circle cx="100" cy="100" r="94" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" strokeDasharray="2 7" /></g>
      <circle cx="100" cy="100" r="58" fill="url(#dCore)" />
      <circle cx="100" cy="100" r={r} fill="none" stroke="#0A1411" strokeWidth="20" />
      {parts.map((p, i) => {
        const len = (p.v / total) * circ;
        const el = (
          <motion.circle key={i} cx="100" cy="100" r={r} fill="none" stroke={p.c} strokeWidth="20" strokeLinecap="butt" filter="url(#dGlow)"
            strokeDashoffset={-acc}
            transform="rotate(-90 100 100)" initial={{ strokeDasharray: `0 ${circ}` }} animate={{ strokeDasharray: `${Math.max(len - 3, 0)} ${circ}` }} transition={{ delay: 0.3 + i * 0.25, duration: 1.1, ease: EASE }} />
        );
        acc += len;
        return el;
      })}
      <text x="100" y="98" textAnchor="middle" fill="#E4EBE6" fontSize="30" fontWeight="800" fontFamily="'Bricolage Grotesque',sans-serif">{center}</text>
      <text x="100" y="118" textAnchor="middle" fill="#8BA699" fontSize="11">{sub}</text>
    </svg>
  );
}

function PercentileTrack({ pct }: { pct: number | null }) {
  const col = (pct ?? 0) >= 60 ? C.good : (pct ?? 0) >= 35 ? C.you : C.bad;
  return (
    <div className="relative h-3 rounded-full bg-[#07110D] shadow-[inset_0_2px_4px_rgba(0,0,0,.6)]">
      <div className="absolute inset-0 flex overflow-hidden rounded-full opacity-30">
        <div style={{ width: "35%", background: C.bad }} /><div style={{ width: "25%", background: C.you }} /><div style={{ width: "40%", background: C.good }} />
      </div>
      {pct != null && (
        <>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: EASE }} className="da-shimmer absolute left-0 top-0 h-full rounded-full" style={{ background: `linear-gradient(90deg, ${col}33, ${col})`, boxShadow: `0 0 16px ${col}66` }} />
          <motion.span initial={{ left: 0 }} animate={{ left: `${pct}%` }} transition={{ duration: 1.1, ease: EASE }}
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#0C1915]"
            style={{ background: col, boxShadow: `0 0 18px ${col}, 0 0 4px #fff inset` }} />
        </>
      )}
    </div>
  );
}

// ---------- race lanes (the topper's path) ----------
type Seg = [string, number, number];
type MetaMap = Map<string, { sec: number; no: number; verdict?: Verdict; section: string }>;
const tickStep = (span: number) => [30, 60, 120, 300, 600, 900].find((s) => span / s <= 10) || 900;

function Lane({ label, segs, span, meta, you }: { label: string; segs: Seg[]; span: number; meta: MetaMap; you?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="da-head w-16 shrink-0 text-sm font-bold" style={{ color: you ? C.you : C.top, textShadow: `0 0 14px ${you ? C.you : C.top}66` }}>{label}</div>
      <div className="relative h-14 flex-1 rounded-xl border border-white/[0.07] bg-[#07110D] shadow-[inset_0_2px_10px_rgba(0,0,0,.7)]">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px" style={{ background: "repeating-linear-gradient(90deg, rgba(255,255,255,.14) 0 8px, transparent 8px 18px)" }} />
        {segs.map(([id, s, e], i) => {
          const m = meta.get(id);
          if (!m) return null;
          const w = Math.max(((e - s) / span) * 100, 0.4);
          const hue = SEC_HUES[m.sec % SEC_HUES.length];
          const vcol = m.verdict === "correct" ? C.good : m.verdict === "wrong" ? C.bad : C.skip;
          return (
            <motion.div key={i} title={`${m.section} Q${m.no} · ${fmt(s)}–${fmt(e)} (${secs(e - s)})`}
              initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 0.15 + (s / span) * 1.2, duration: 0.45, ease: "easeOut" }}
              className="da-seg absolute top-1.5 bottom-1.5 origin-left cursor-default rounded-[5px]"
              style={{ left: `${(s / span) * 100}%`, width: `calc(${w}% - 1.5px)`, color: hue, background: `linear-gradient(180deg, ${hue}, ${hue}A0)`, boxShadow: `0 0 12px -2px ${hue}77, inset 0 1px 0 rgba(255,255,255,.4)` }}>
              {you && <span className="absolute -bottom-[5px] left-0 h-[3px] w-full rounded-full" style={{ background: vcol, boxShadow: `0 0 8px ${vcol}` }} />}
              {w > 3 && <span className="absolute left-1 top-0.5 text-[10px] font-extrabold text-[#0A1411]">{m.no}</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TimeAxis({ span }: { span: number }) {
  const step = tickStep(span);
  const ticks: number[] = [];
  for (let t = 0; t <= span; t += step) ticks.push(t);
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute bottom-6 left-[76px] right-0 top-0">
        {ticks.map((t) => <div key={t} className="absolute top-0 h-full w-px bg-white/[0.06]" style={{ left: `${(t / span) * 100}%` }} />)}
      </div>
      <div className="relative ml-[76px] mt-2 h-4 text-[11px] text-[var(--mute)]">
        {ticks.map((t) => <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${(t / span) * 100}%` }}>{fmt(t)}</span>)}
      </div>
    </>
  );
}

function pathSummary(segs: Seg[], meta: Map<string, any>, sections: string[]) {
  const per: Record<string, { first: number; last: number; total: number }> = {};
  const seen = new Map<string, number>();
  segs.forEach(([id, s, e]) => {
    const m = meta.get(id); if (!m) return;
    const p = per[m.section] || (per[m.section] = { first: s, last: e, total: 0 });
    p.first = Math.min(p.first, s); p.last = Math.max(p.last, e); p.total += e - s;
    seen.set(id, (seen.get(id) || 0) + 1);
  });
  const revisits = Array.from(seen.values()).filter((n) => n > 1).length;
  const order = sections.filter((s) => per[s]).sort((a, b) => per[a].first - per[b].first);
  return { per, order, revisits };
}

// ---------- locked (non premium) view ----------
function LockedView({ onBack, onUpgrade }: { onBack: () => void; onUpgrade: () => void }) {
  return (
    <div className="da-root relative min-h-screen p-6 text-[var(--ink)]">
      <style>{FONT_CSS}</style><World />
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-[var(--mute)] hover:text-[var(--ink)]"><ArrowLeft size={14} /> Back to results</button>
      <div className="relative mx-auto max-w-4xl">
        <div aria-hidden className="pointer-events-none select-none space-y-4 opacity-70 blur-[7px]">
          <div className="da-card flex items-center justify-between rounded-3xl p-6">
            <div className="da-num text-6xl font-extrabold" style={{ color: C.you }}>41:12 <span className="text-[var(--mute)]">vs</span> 33:40</div>
            <div className="h-28 w-28 rounded-full border-[14px]" style={{ borderColor: `${C.good} ${C.bad} ${C.skip} ${C.good}` }} />
          </div>
          <div className="da-card flex h-56 items-end gap-2 rounded-3xl p-6">
            {[40, 90, 30, 120, 60, 25, 75, 50, 100, 35, 80, 45].map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: h, background: i % 4 === 1 ? C.bad : C.you }} />)}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
            className="da-card max-w-md rounded-3xl border border-white/10 bg-[#07110D]/90 p-8 text-center shadow-2xl">
            <div className="da-float mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(255,182,39,.12)", boxShadow: `0 0 40px ${C.you}55, inset 0 0 0 1px ${C.you}55` }}>
              <Lock style={{ color: C.you }} />
            </div>
            <h1 className="da-head da-grad text-3xl font-extrabold">See where your time leaks</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--mute)]">
              Question-by-question time against the topper and the average, the topper's route through the paper, your ego traps, and a one-click practice test from your mistakes.
            </p>
            <button onClick={onUpgrade} className="da-btn mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-[#0C1915] shadow-[0_12px_32px_-8px_rgba(255,182,39,.7)]" style={{ background: `linear-gradient(180deg, #FFC857, ${C.you})` }}>
              <Crown size={15} /> Upgrade to unlock
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
function DeepAnalysisCore() {
  const router = useRouter();
  const params = useSearchParams();
  const testId = params.get("id");
  const { session, loading: sessionLoading } = useStudentSession();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [test, setTest] = useState<any>(null);
  const [qs, setQs] = useState<any[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [log, setLog] = useState<any>(null);
  const [bench, setBench] = useState<any>(null);

  const [secIdx, setSecIdx] = useState(0);
  const [ledgerFilter, setLedgerFilter] = useState<"all" | "traps" | "wrong" | "skipped">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [shortcutOn, setShortcutOn] = useState<Record<string, boolean>>({});
  const [vaulting, setVaulting] = useState(false);
  const [activeNav, setActiveNav] = useState("");
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) { router.push("/student/login"); return; }
    if (!testId) { setErr("No test selected."); setLoading(false); return; }
    (async () => {
      try {
        const [t, q, a, l, b] = await Promise.all([
          supabase.from("tests").select("test_name, section_settings").eq("id", testId).single(),
          supabase.from("questions")
            .select("id, question_text, option_a, option_b, option_c, option_d, option_e, correct_option, explanation, shortcut_explanation, shortcut_video_url, section, chapter, topic_name, chapter_id, topic_id, created_at")
            .eq("test_id", testId).order("created_at", { ascending: true }),
          supabase.from("attempts").select("score, answers_matrix").eq("test_id", testId).eq("student_id", session.id).maybeSingle(),
          supabase.from("attempt_time_logs").select("per_question, timeline, total_seconds").eq("test_id", testId).eq("student_id", session.id).maybeSingle(),
          supabase.rpc("get_deep_analysis", { p_test_id: testId, p_student_id: session.id }),
        ]);
        if (q.error) throw q.error;
        if (b.error) throw b.error;
        setTest(t.data); setQs(q.data || []); setAttempt(a.data); setLog(l.data); setBench(b.data);
      } catch (e: any) {
        setErr(e?.message || "Could not load the analysis.");
      } finally { setLoading(false); }
    })();
  }, [session, sessionLoading, testId, router]);

  const answers: Record<string, string> = attempt?.answers_matrix || {};
  const hasTime = !!log && Object.keys(log.per_question || {}).length > 0;

  // highlights the nav pill of the section currently in view (visual only)
  useEffect(() => {
    if (loading || sessionLoading) return;
    const els = ["time", "route", "coach", "chapters", "marks", "vault", "ledger"]
      .map((i) => document.getElementById(i)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActiveNav(e.target.id); }), { rootMargin: "-20% 0px -65% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loading, sessionLoading, attempt, hasTime]);

  const sections = useMemo(() => {
    const seen: string[] = [];
    qs.forEach((q) => { const s = (q.section || "").trim() || "Assessment Section"; if (!seen.includes(s)) seen.push(s); });
    const st = Array.isArray(test?.section_settings) ? [...test.section_settings].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((s: any) => String(s.sectionName).trim()) : [];
    const ordered = st.filter((s: string) => seen.includes(s));
    return [...ordered, ...seen.filter((s) => !ordered.includes(s))];
  }, [qs, test]);

  const rows: Row[] = useMemo(() => {
    if (!qs.length) return [];
    const tax = resolveTaxonomy(qs);
    const bq = new Map<string, any>((bench?.questions || []).map((b: any) => [b.question_id, b]));
    const counters: Record<string, number> = {};
    return qs.map((q, i) => {
      const section = (q.section || "").trim() || "Assessment Section";
      counters[section] = (counters[section] || 0) + 1;
      const b = bq.get(q.id) || {};
      const verdict = getVerdict(answers[q.id], q.correct_option);
      const base = {
        you: log?.per_question?.[q.id]?.t ?? 0, verdict,
        top: b.top_time ?? null, pctTop: b.pct_correct_top ?? null,
        topSkipped: b.pct_skipped_top ?? null, pctCorrect: b.pct_correct ?? null,
      };
      const insight = hasTime ? insightFor(base) : null;
      const hasTop = base.top != null && base.top > 0;
      return {
        id: q.id, no: counters[section], section, text: q.question_text,
        ...base, visits: log?.per_question?.[q.id]?.v ?? 0,
        avg: b.avg_time ?? null,
        chapterKey: tax[i].chapterKey, chapterName: tax[i].chapterName, chapterTagged: tax[i].chapterTagged,
        topicName: tax[i].topicName, topicTagged: tax[i].topicTagged,
        insight,
        trap: hasTime && ((verdict !== "correct" && base.you >= 90) || (verdict === "correct" && hasTop && base.you >= base.top! * 3 && base.you >= 40)),
        q,
      } as Row;
    });
  }, [qs, bench, log, answers, hasTime]);

  const agg = useMemo(() => {
    const you = rows.reduce((a, r) => a + r.you, 0);
    const topTotal = bench?.topper_total_seconds ?? null;
    const leak = rows.reduce((a, r) => a + (r.top ? Math.max(0, r.you - r.top) : 0), 0);
    const wrongTime = rows.filter((r) => r.verdict === "wrong").reduce((a, r) => a + r.you, 0);
    const correctTime = rows.filter((r) => r.verdict === "correct").reduce((a, r) => a + r.you, 0);
    const skippedTime = rows.filter((r) => r.verdict === "skipped").reduce((a, r) => a + r.you, 0);
    const egoTraps = rows.filter((r) => r.verdict !== "correct" && r.you >= 90).sort((a, b) => b.you - a.you);
    const timeTraps = rows.filter((r) => r.trap && r.verdict === "correct").sort((a, b) => b.you - a.you);
    const guesses = rows.filter((r) => r.verdict === "wrong" && r.you < 5);
    const cap = Math.round(2 * median(rows.map((r) => r.top || 0).filter((x) => x > 0)));
    return { you, topTotal, leak, wrongTime, correctTime, skippedTime, egoTraps, timeTraps, guesses, cap };
  }, [rows, bench]);

  const chapters = useMemo(() => {
    const m = new Map<string, { key: string; name: string; n: number; correct: number; time: number; leak: number; pct: number | null; topAcc: number | null; avgAcc: number | null }>();
    const bc = new Map<string, any>((bench?.chapters || []).map((c: any) => [String(c.ckey), c]));
    rows.filter((r) => r.chapterTagged).forEach((r) => {
      const c = m.get(r.chapterKey) || { key: r.chapterKey, name: r.chapterName, n: 0, correct: 0, time: 0, leak: 0, pct: null, topAcc: null, avgAcc: null };
      c.n++; c.time += r.you; if (r.verdict === "correct") c.correct++;
      c.leak += r.top ? Math.max(0, r.you - r.top) : 0;
      const b = bc.get(r.chapterKey.startsWith("id:") ? r.chapterKey.slice(3) : r.chapterKey.slice(2));
      if (b) { c.pct = b.percentile; c.topAcc = b.top_acc; c.avgAcc = b.avg_acc; }
      m.set(r.chapterKey, c);
    });
    return Array.from(m.values());
  }, [rows, bench]);

  const sectionName = sections[secIdx];
  const secRows = rows.filter((r) => r.section === sectionName);
  const chartData = secRows.map((r) => ({
    name: `Q${r.no}`, you: Math.round(r.you), top: r.top, avg: r.avg, verdict: r.verdict,
    verdictLabel: r.verdict === "correct" ? "correct" : r.verdict === "wrong" ? "wrong" : "skipped",
  }));

  const meta: MetaMap = useMemo(() => {
    const m: MetaMap = new Map();
    rows.forEach((r) => m.set(r.id, { sec: Math.max(sections.indexOf(r.section), 0), no: r.no, verdict: r.verdict, section: r.section }));
    return m;
  }, [rows, sections]);

  const youSegs: Seg[] = log?.timeline || [];
  const topSegs: Seg[] = bench?.topper_timeline || [];
  const span = Math.max(1, ...youSegs.map((s) => s[2]), ...topSegs.map((s) => s[2]));
  const youPath = useMemo(() => pathSummary(youSegs, meta, sections), [youSegs, meta, sections]);
  const topPath = useMemo(() => pathSummary(topSegs, meta, sections), [topSegs, meta, sections]);

  const quadrantMid = chapters.length ? chapters.reduce((a, c) => a + c.time, 0) / Math.max(1, chapters.reduce((a, c) => a + c.n, 0)) : 0;
  const scatter = chapters.map((c) => {
    const x = Math.round(c.time / c.n), y = Math.round((c.correct / c.n) * 100);
    return { name: c.name, short: c.name.length > 16 ? c.name.slice(0, 15) + "…" : c.name, x, y, z: c.n, fill: y >= 60 ? (x <= quadrantMid ? C.good : C.you) : (x <= quadrantMid ? C.skip : C.bad) };
  });
  const xMax = Math.max(10, Math.ceil(Math.max(quadrantMid * 2, ...scatter.map((d) => d.x)) * 1.1));

  const vault = useMemo(() => {
    const g = new Map<string, { name: string; topics: Map<string, number>; n: number }>();
    rows.filter((r) => r.verdict !== "correct").forEach((r) => {
      const c = g.get(r.chapterKey) || { name: r.chapterName, topics: new Map(), n: 0 };
      c.n++; c.topics.set(r.topicName, (c.topics.get(r.topicName) || 0) + 1);
      g.set(r.chapterKey, c);
    });
    return Array.from(g.values()).sort((a, b) => b.n - a.n);
  }, [rows]);
  const mistakeCount = rows.filter((r) => r.verdict !== "correct").length;

  const moves = useMemo(() => {
    const out: { title: string; body: string }[] = [];
    const leakCh = [...chapters].sort((a, b) => b.leak - a.leak)[0];
    if (hasTime && leakCh && leakCh.leak > 20)
      out.push({ title: `Speed up ${leakCh.name}`, body: `You lost about ${fmt(leakCh.leak)} here compared with topper pace. Drill 10 timed questions from this chapter.` });
    const weak = chapters.filter((c) => c.pct != null).sort((a, b) => (a.pct as number) - (b.pct as number))[0];
    if (weak) out.push({ title: `Rebuild ${weak.name}`, body: `You are ahead of only ${weak.pct}% of aspirants in this chapter. Revise the concepts first, then practise.` });
    if (hasTime && (agg.egoTraps.length || agg.guesses.length))
      out.push({ title: "Set a time ceiling", body: `${agg.cap ? `Toppers rarely spend more than ${secs(agg.cap)} on one question. ` : ""}Skip at that mark. You had ${agg.egoTraps.length} ego trap(s) and ${agg.guesses.length} blind guess(es).` });
    if (!out.length) out.push({ title: "Keep the rhythm", body: "No major leaks found. Move to a full-length mock and repeat this review." });
    return out.slice(0, 3);
  }, [chapters, agg, hasTime]);

  const sectionBench: any[] = useMemo(
    () => [...(bench?.sections || [])].sort((a: any, b: any) => sections.indexOf(a.sec) - sections.indexOf(b.sec)),
    [bench, sections]
  );
  const radarData = sectionBench.map((s: any) => {
    const max = Math.max(1, rows.filter((r) => r.section === s.sec).length);
    const p = (v: number | null) => Math.max(0, Math.min(100, Math.round(((v ?? 0) / max) * 100)));
    return { sec: s.sec.length > 14 ? s.sec.slice(0, 13) + "…" : s.sec, you: p(s.my_score), median: p(s.median_score), topper: s.top_score != null ? p(s.top_score) : 0 };
  });

  const runVault = async () => {
    if (!testId || !session) return;
    setVaulting(true);
    try {
      const { data, error } = await supabase.rpc("create_mistake_vault_test", { p_test_id: testId, p_student_id: session.id });
      if (error) throw error;
      router.push(`/student/numerical-ability?id=${data}`);
    } catch (e: any) { alert(e?.message || "Could not create the practice test."); }
    finally { setVaulting(false); }
  };

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ---------- states ----------
  if (loading || sessionLoading) {
    return (
      <div className="da-root flex min-h-screen flex-col items-center justify-center gap-5 text-[var(--mute)]">
        <style>{FONT_CSS}</style><World />
        <div className="relative h-16 w-16">
          <motion.span className="absolute inset-0 rounded-full border-2 border-transparent" style={{ borderTopColor: C.you, borderRightColor: "#7FD6C2" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }} />
          <motion.span className="absolute inset-3 rounded-full border-2 border-transparent" style={{ borderBottomColor: "#F29E8E" }} animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }} />
          <span className="da-live absolute inset-[26px]" />
        </div>
        <span className="da-head da-grad-chalk text-lg font-bold">Building your report</span>
      </div>
    );
  }
  if (err) {
    return <div className="da-root flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center text-[var(--ink)]"><style>{FONT_CSS}</style><World /><p>{err}</p><button onClick={() => router.back()} className="da-chip rounded-lg border border-[var(--line)] px-4 py-2 text-sm">Go back</button></div>;
  }
  if (bench && bench.allowed === false) {
    return <LockedView onBack={() => router.back()} onUpgrade={() => router.push(UPGRADE_ROUTE)} />;
  }
  if (!attempt) {
    return <div className="da-root flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center text-[var(--ink)]"><style>{FONT_CSS}</style><World /><p>Submit this test first to unlock its deep analysis.</p><button onClick={() => router.back()} className="da-chip rounded-lg border border-[var(--line)] px-4 py-2 text-sm">Go back</button></div>;
  }

  const hasTopper = (bench?.topper_count || 0) > 0;
  const isTopper = Number(bench?.my_rank) === 1 && Number(bench?.cohort_size) >= 2;
  const lead = agg.topTotal ? agg.you - agg.topTotal : null;
  const trackMax = Math.max(agg.you, agg.topTotal || 0, 1);
  const navItems = [
    hasTime && ["time", "Time chart"], hasTime && ["route", "Topper route"], hasTime && ["coach", "Coaching"],
    chapters.length > 0 && ["chapters", "Chapters"], sectionBench.length > 0 && ["marks", "Sectional marks"],
    ["vault", "Mistake vault"], ["ledger", "Ledger"],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="da-root min-h-screen pb-24 text-[var(--ink)]">
      <style>{FONT_CSS}</style>
      <World />

      {/* sticky bar: back, premium badge, section jump */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0C1915]/60 backdrop-blur-xl">
        <motion.div aria-hidden style={{ scaleX: progress, background: `linear-gradient(90deg, #7FD6C2, ${C.you}, #FF8A4A)`, boxShadow: `0 0 12px ${C.you}` }} className="absolute inset-x-0 bottom-[-1px] h-[2px] origin-left" />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 md:px-6">
          <button onClick={() => router.back()} className="da-chip flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-[var(--mute)] hover:text-[var(--ink)]"><ArrowLeft size={14} /> Results</button>
          <nav className="da-scroll flex flex-1 gap-1.5 overflow-x-auto">
            {navItems.map(([id, l]) => (
              <button key={id} onClick={() => jump(id)} className="da-chip shrink-0 rounded-full border border-transparent px-3.5 py-1.5 text-xs font-semibold text-[var(--mute)] hover:border-white/10 hover:bg-white/[0.05] hover:text-[var(--ink)]"
                style={activeNav === id ? { color: C.you, background: "rgba(255,182,39,.1)", borderColor: "rgba(255,182,39,.35)" } : undefined}>{l}</button>
            ))}
          </nav>
          <span className="da-shimmer hidden shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold sm:flex" style={{ color: C.you, borderColor: "rgba(255,182,39,.4)", background: "rgba(255,182,39,.08)", boxShadow: "0 0 24px -6px rgba(255,182,39,.5)" }}><Crown size={12} /> Premium</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 md:px-6">
        {/* hero */}
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: EASE }}
          className="da-card relative overflow-hidden rounded-[2rem] border border-white/[0.07] p-6 md:p-10">
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 72px)", maskImage: "linear-gradient(180deg,#000,transparent 85%)", WebkitMaskImage: "linear-gradient(180deg,#000,transparent 85%)" }} />
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(255,182,39,.28), transparent 65%)" }} />
          {isTopper && <div className="relative"><TopperBanner cohort={Number(bench?.cohort_size)} /></div>}
          <p className="relative flex flex-wrap items-center gap-2.5 text-sm text-[var(--mute)]">
            <span className="da-live" />
            <span className="font-semibold text-[var(--ink)]">{test?.test_name}</span>
            {isTopper
              ? <span className="da-medal inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-extrabold text-[#0C1915] shadow-[0_0_20px_-2px_rgba(255,182,39,.8)]"><Trophy size={12} /> Rank {bench?.my_rank} of {bench?.cohort_size}</span>
              : <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-0.5 text-xs">rank {bench?.my_rank} of {bench?.cohort_size}</span>}
          </p>

          <div className="relative mt-4 grid items-center gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div>
              {hasTime ? (
                <>
                  <h1 className="da-head text-4xl font-extrabold leading-[1.05] md:text-6xl">
                    {isTopper
                      ? <>You finished first in <span className="da-num da-grad">{fmt(agg.you)}</span></>
                      : <>You took <span className="da-num da-grad">{fmt(agg.you)}</span></>}
                    {agg.topTotal ? <>{isTopper ? ". The fastest benchmark run took " : " where toppers took "}<span className="da-num da-grad-chalk">{fmt(agg.topTotal)}</span></> : null}
                  </h1>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--mute)]">
                    {agg.leak > 0
                      ? isTopper
                        ? `Top rank, and there is still room to grow: you spent about ${fmt(agg.leak)} more than the fastest benchmark pace on the same questions, and ${Math.round((agg.wrongTime / Math.max(agg.you, 1)) * 100)}% of your time went into questions you got wrong.`
                        : `Across the paper you spent about ${fmt(agg.leak)} more than topper pace on the same questions, and ${Math.round((agg.wrongTime / Math.max(agg.you, 1)) * 100)}% of your time went into questions you got wrong.`
                      : "Your pace is in line with the toppers on this test."}
                    {!hasTopper && " Topper benchmarks appear once at least 3 clean attempts exist for this test."}
                  </p>
                  {/* the race: total time you vs topper */}
                  <div className="relative mt-8 space-y-4 rounded-2xl border border-white/[0.06] bg-[#07110D]/50 p-4 pr-5">
                    <span aria-hidden className="da-chk absolute bottom-3 right-2 top-3 w-2 rounded-sm" />
                    {[{ l: "You", v: agg.you, c: C.you }, ...(agg.topTotal ? [{ l: isTopper ? "Best" : "Topper", v: agg.topTotal as number, c: C.top }] : [])].map((t, i) => (
                      <div key={t.l} className="flex items-center gap-3">
                        <span className="da-head w-14 text-sm font-bold" style={{ color: t.c }}>{t.l}</span>
                        <div className="relative mr-3 h-6 flex-1 rounded-full bg-[#07110D] shadow-[inset_0_2px_6px_rgba(0,0,0,.7)]">
                          <div aria-hidden className="absolute inset-x-2 top-1/2 h-px" style={{ background: "repeating-linear-gradient(90deg, rgba(255,255,255,.12) 0 6px, transparent 6px 14px)" }} />
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(t.v / trackMax) * 100}%` }} transition={{ duration: 1.4, delay: 0.3 + i * 0.2, ease: EASE }}
                            className="da-shimmer relative h-full rounded-full" style={{ color: t.c, background: `linear-gradient(90deg, ${t.c}22, ${t.c})`, boxShadow: `0 0 26px ${t.c}66` }}>
                            <span className="da-head-dot" style={{ boxShadow: `0 0 14px ${t.c}` }} />
                          </motion.div>
                        </div>
                        <span className="da-num w-14 text-right text-sm font-bold"><CountUp value={t.v} format={fmt} /></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <h1 className="da-head da-grad-chalk text-3xl font-extrabold md:text-4xl">Time data was not recorded for this attempt</h1>
              )}
            </div>

            {hasTime && (
              <div className="mx-auto flex w-full max-w-[280px] flex-col items-center">
                <div className="da-float h-[230px] w-[230px]">
                  <Donut center={fmt(agg.you)} sub="where your time went"
                    parts={[{ v: agg.correctTime, c: C.good }, { v: agg.wrongTime, c: C.bad }, { v: agg.skippedTime, c: C.skip }]} />
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[var(--mute)]">
                  {[["Correct", C.good, agg.correctTime], ["Wrong", C.bad, agg.wrongTime], ["Skipped", C.skip, agg.skippedTime]].map(([l, c, v]) => (
                    <span key={l as string} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c as string, boxShadow: `0 0 10px ${c as string}` }} />{l as string} {Math.round(((v as number) / Math.max(agg.you, 1)) * 100)}%</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {hasTime && (
            <div className="relative mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { icon: Flame, k: "Time leakage", n: agg.leak, f: fmt, s: "vs topper pace", c: C.bad },
                { icon: AlertTriangle, k: "Ego traps", n: agg.egoTraps.length, f: (x: number) => String(Math.round(x)), s: "90s+ with no marks", c: C.you },
                { icon: Zap, k: "Blind guesses", n: agg.guesses.length, f: (x: number) => String(Math.round(x)), s: "wrong in under 5s", c: C.you },
                lead != null
                  ? { icon: Gauge, k: isTopper ? (lead > 0 ? "Behind best pace by" : "Ahead of best pace by") : lead > 0 ? "Behind topper by" : "Ahead of topper by", n: Math.abs(lead), f: fmt, s: "total time", c: lead <= 0 ? C.good : C.you }
                  : { icon: Gauge, k: "Avg per question", n: agg.you / Math.max(rows.length, 1), f: secs, s: "total time", c: C.you },
              ].map((t) => (
                <div key={t.k} className="da-tile relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#07110D]/60 p-4">
                  <span aria-hidden className="absolute left-0 top-0 h-full w-[3px]" style={{ background: t.c, boxShadow: `0 0 16px ${t.c}` }} />
                  <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: `${t.c}33` }} />
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${t.c}1F`, boxShadow: `inset 0 0 0 1px ${t.c}44` }}><t.icon size={15} style={{ color: t.c }} /></span>
                  <div className="da-num relative mt-3 text-4xl font-extrabold" style={{ textShadow: `0 0 28px ${t.c}55` }}><CountUp value={t.n} format={t.f} /></div>
                  <div className="relative text-sm font-semibold">{t.k}</div>
                  <div className="relative text-xs text-[var(--mute)]">{t.s}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {!hasTime && (
          <Card><p className="text-sm leading-relaxed text-[var(--mute)]">This attempt was submitted before time tracking was switched on, so the speed sections are hidden. Attempt any new test and the full time analysis appears here. Your chapter standing and mistake vault below still work.</p></Card>
        )}

        {/* next moves */}
        <div className="grid gap-4 md:grid-cols-3">
          {moves.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.12, duration: 0.7, ease: EASE }}
              className="da-card da-tile group relative overflow-hidden rounded-3xl border border-white/[0.07] p-6">
              <span aria-hidden className="absolute right-4 top-2 da-num text-7xl font-extrabold text-white/[0.05] transition-transform duration-500 group-hover:scale-110">{i + 1}</span>
              <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full blur-3xl" style={{ background: "rgba(255,182,39,.16)" }} />
              <div className="relative flex items-center gap-2 text-xs font-bold" style={{ color: C.you }}><span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(255,182,39,.14)" }}><Target size={13} /></span> Do this next</div>
              <h3 className="da-head relative mt-3 text-xl font-bold">{m.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-[var(--mute)]">{m.body}</p>
            </motion.div>
          ))}
        </div>

        {hasTime && (
          <>
            {/* time overlay */}
            <Card id="time" title="Your time on every question" note="Bars are your time, coloured by result. The light line is the topper median and the shaded dashed area is the average aspirant. The strip underneath shows where you were slower (red) or faster (green) than the topper.">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {sections.map((s, i) => (
                    <button key={s} onClick={() => setSecIdx(i)} className="da-chip rounded-full border px-3.5 py-1.5 text-xs font-bold"
                      style={i === secIdx ? { background: SEC_HUES[i % SEC_HUES.length], color: "#0C1915", borderColor: "transparent", boxShadow: `0 8px 22px -6px ${SEC_HUES[i % SEC_HUES.length]}99` } : { borderColor: "rgba(255,255,255,.1)", color: "var(--mute)" }}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--mute)]">
                  {[["Correct", C.good], ["Wrong", C.bad], ["Skipped", C.skip]].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />{l}</span>)}
                </div>
              </div>
              <div className="h-[360px] w-full rounded-2xl border border-white/[0.05] bg-[#07110D]/40 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="gGood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C6F7AE" /><stop offset="100%" stopColor="#3E9A55" /></linearGradient>
                      <linearGradient id="gBad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFA77E" /><stop offset="100%" stopColor="#D1331A" /></linearGradient>
                      <linearGradient id="gSkip" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#86A89B" /><stop offset="100%" stopColor="#385149" /></linearGradient>
                      <linearGradient id="gAvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7FA596" stopOpacity={0.4} /><stop offset="100%" stopColor="#7FA596" stopOpacity={0} /></linearGradient>
                      <filter id="lineGlow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    </defs>
                    <CartesianGrid stroke="#2A4A3E" strokeDasharray="2 6" vertical={false} />
                    <XAxis dataKey="name" stroke="#8BA699" fontSize={11} tickLine={false} axisLine={{ stroke: "#2A4A3E" }} />
                    <YAxis stroke="#8BA699" fontSize={11} tickLine={false} axisLine={false} unit="s" />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
                    <Area type="monotone" dataKey="avg" stroke={C.avg} strokeWidth={1.6} strokeDasharray="5 4" fill="url(#gAvg)" dot={false} connectNulls animationDuration={1400} />
                    <Bar dataKey="you" radius={[7, 7, 0, 0]} maxBarSize={30} animationDuration={1100}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.verdict === "correct" ? "url(#gGood)" : d.verdict === "wrong" ? "url(#gBad)" : "url(#gSkip)"} />)}
                    </Bar>
                    <Line type="monotone" dataKey="top" stroke={C.top} strokeWidth={2.6} connectNulls filter="url(#lineGlow)" animationDuration={1800}
                      dot={{ r: 4.5, fill: C.top, stroke: "#0C1915", strokeWidth: 2 }} activeDot={{ r: 7, fill: "#fff", stroke: C.top, strokeWidth: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {/* pace strip */}
              <div className="mt-4">
                <div className="mb-1.5 text-xs font-semibold text-[var(--mute)]">Pace against the topper, question by question</div>
                <div className="flex gap-[3px]">
                  {secRows.map((r, i) => {
                    let bg = "rgba(139,166,153,0.18)";
                    if (r.top) {
                      const ratio = (r.you - r.top) / Math.max(r.top, 1);
                      bg = ratio > 0 ? `rgba(255,107,74,${Math.min(1, 0.25 + ratio * 0.35)})` : `rgba(139,209,124,${Math.min(1, 0.25 + -ratio * 0.8)})`;
                    }
                    return <motion.div key={r.id} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.4 + i * 0.02 }} title={`Q${r.no}: ${secs(r.you)}${r.top ? ` vs ${secs(r.top)}` : ""}`} className="h-3.5 flex-1 origin-bottom rounded-[4px]" style={{ background: bg, boxShadow: `0 0 10px -2px ${bg}` }} />;
                  })}
                </div>
              </div>
              <div className="mt-4"><Legend items={[{ c: C.top, l: "Topper median" }, { c: C.avg, l: "Average aspirant", dashed: true }]} /></div>
            </Card>

            {/* race lanes */}
            <Card id="route" title="The topper's route through the paper" note="Each block is one visit to a question, coloured by section and sized by time. Your lane has a result strip underneath: green correct, red wrong, grey skipped. Hover a block for details.">
              {topSegs.length ? (
                <>
                  <div className="relative space-y-3">
                    <Lane label="You" segs={youSegs} span={span} meta={meta} you />
                    <Lane label="Topper" segs={topSegs} span={span} meta={meta} />
                    <TimeAxis span={span} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--mute)]">
                    {sections.map((s, i) => <span key={s} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEC_HUES[i % SEC_HUES.length], boxShadow: `0 0 8px ${SEC_HUES[i % SEC_HUES.length]}` }} />{s}</span>)}
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {[{ n: "Topper", p: topPath, c: C.top }, { n: "You", p: youPath, c: C.you }].map(({ n, p, c }) => (
                      <div key={n} className="da-tile rounded-2xl border border-white/[0.07] bg-[#07110D]/60 p-4 text-sm leading-relaxed">
                        <div className="da-head mb-1 font-bold" style={{ color: c }}>{n}</div>
                        {p.order.length ? (
                          <p className="text-[var(--mute)]">
                            {p.order.map((s, i) => `${i === 0 ? "Started" : "then"} ${s} (${fmt(p.per[s].first)}–${fmt(p.per[s].last)}, ${fmt(p.per[s].total)} of work)`).join(", ")}.{" "}
                            {p.revisits > 0 ? `Came back to ${p.revisits} question${p.revisits > 1 ? "s" : ""} for a second look.` : "Did not return to earlier questions."}
                          </p>
                        ) : <p className="text-[var(--mute)]">No route recorded.</p>}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[var(--mute)]">The topper route is the highest-scoring clean attempt on this test, shown anonymously. Attempts with implausibly fast runs are excluded.</p>
                </>
              ) : <p className="text-sm text-[var(--mute)]">The topper route appears once enough clean attempts are in for this test.</p>}
            </Card>

            {/* insights + ego traps */}
            <div id="coach" className="grid scroll-mt-20 gap-6 lg:grid-cols-5">
              <Card title="Ego traps" note="Questions that held you for 90 seconds or more without giving marks." className="lg:col-span-2">
                {agg.egoTraps.length ? (
                  <ul className="space-y-2">
                    {agg.egoTraps.slice(0, 8).map((r) => (
                      <li key={r.id} className="da-tile rounded-xl border border-white/[0.07] bg-[#07110D]/60 px-3.5 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">{r.section} · Q{r.no}</span>
                          <span className="da-num shrink-0 font-bold" style={{ color: C.bad, textShadow: `0 0 14px ${C.bad}66` }}>{fmt(r.you)}{r.top ? <span className="ml-1 text-xs font-medium text-[var(--mute)]">vs {secs(r.top)}</span> : null}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-[#07110D]">
                          <motion.div initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, (r.you / Math.max(agg.egoTraps[0].you, 1)) * 100)}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.bad}55, ${C.bad})`, boxShadow: `0 0 10px ${C.bad}88` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="flex items-center gap-2 text-sm text-[var(--mute)]"><CheckCircle2 size={15} style={{ color: C.good }} /> None. You cut losses on time.</p>}
              </Card>
              <Card title="Coaching notes" note="Generated from your time, your result and how the top scorers handled each question." className="lg:col-span-3">
                <ul className="da-scroll max-h-[330px] space-y-2 overflow-y-auto pr-1">
                  {rows.filter((r) => r.insight).slice(0, 25).map((r) => {
                    const tone = r.insight!.tone === "warn" ? C.bad : r.insight!.tone === "tip" ? C.you : C.good;
                    return (
                      <li key={r.id} className="da-tile relative flex gap-3 overflow-hidden rounded-xl border border-white/[0.07] bg-[#07110D]/60 p-3.5 pl-4 text-sm">
                        <span aria-hidden className="absolute left-0 top-0 h-full w-[3px]" style={{ background: tone, boxShadow: `0 0 12px ${tone}` }} />
                        <span aria-hidden className="pointer-events-none absolute -left-8 top-0 h-full w-24 blur-2xl" style={{ background: `${tone}18` }} />
                        {r.insight!.tone === "warn" ? <AlertTriangle size={16} className="relative mt-0.5 shrink-0" style={{ color: tone }} /> : r.insight!.tone === "tip" ? <Lightbulb size={16} className="relative mt-0.5 shrink-0" style={{ color: tone }} /> : <CheckCircle2 size={16} className="relative mt-0.5 shrink-0" style={{ color: tone }} />}
                        <div className="relative"><span className="font-semibold">{r.section} · Q{r.no}</span><span className="ml-2 text-xs text-[var(--mute)]">{secs(r.you)}{r.top ? ` vs ${secs(r.top)}` : ""}</span><p className="mt-0.5 text-[var(--mute)]">{r.insight!.msg}</p></div>
                      </li>
                    );
                  })}
                  {!rows.some((r) => r.insight) && <li className="text-sm text-[var(--mute)]">Nothing unusual flagged on this attempt.</li>}
                </ul>
              </Card>
            </div>
          </>
        )}

        {/* chapters: speed vs accuracy + percentile */}
        {chapters.length > 0 && (
          <div id="chapters" className="grid scroll-mt-20 gap-6 lg:grid-cols-2">
            {hasTime && (
              <Card title="Speed against accuracy" note="Each dot is a chapter and bigger dots mean more questions. Top left is where you want to be. Bottom right is slow and wrong, which is where marks are leaking.">
                <div className="h-[360px] rounded-2xl border border-white/[0.05] bg-[#07110D]/40 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 14, right: 18, bottom: 22, left: -8 }}>
                      <ReferenceArea x1={0} x2={quadrantMid} y1={60} y2={100} fill={C.good} fillOpacity={0.09} label={{ value: "Fast and accurate", position: "insideTopLeft", fill: C.good, fontSize: 11 }} />
                      <ReferenceArea x1={quadrantMid} x2={xMax} y1={60} y2={100} fill={C.you} fillOpacity={0.08} label={{ value: "Accurate but slow", position: "insideTopRight", fill: C.you, fontSize: 11 }} />
                      <ReferenceArea x1={0} x2={quadrantMid} y1={0} y2={60} fill={C.skip} fillOpacity={0.14} label={{ value: "Fast but wrong: guessing?", position: "insideBottomLeft", fill: "#9DB8AC", fontSize: 11 }} />
                      <ReferenceArea x1={quadrantMid} x2={xMax} y1={0} y2={60} fill={C.bad} fillOpacity={0.12} label={{ value: "Slow and wrong: fix first", position: "insideBottomRight", fill: C.bad, fontSize: 11 }} />
                      <CartesianGrid stroke="#2A4A3E" strokeDasharray="2 6" />
                      <XAxis type="number" dataKey="x" name="Avg seconds" domain={[0, xMax]} stroke="#8BA699" fontSize={11} tickLine={false} label={{ value: "Seconds per question", position: "insideBottom", offset: -12, fill: "#8BA699", fontSize: 11 }} />
                      <YAxis type="number" dataKey="y" name="Accuracy" domain={[0, 100]} unit="%" stroke="#8BA699" fontSize={11} tickLine={false} />
                      <ZAxis type="number" dataKey="z" range={[120, 520]} />
                      <ReferenceLine x={quadrantMid} stroke="#8BA699" strokeDasharray="4 4" />
                      <ReferenceLine y={60} stroke="#8BA699" strokeDasharray="4 4" />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }: any) => active && payload?.length ? (
                        <div className="rounded-2xl border border-white/10 bg-[#07110D]/90 p-3.5 text-xs shadow-2xl backdrop-blur-xl"><p className="da-head mb-1 text-sm font-bold">{payload[0].payload.name}</p><p>{payload[0].payload.x}s per question</p><p>{payload[0].payload.y}% accuracy · {payload[0].payload.z} Qs</p></div>) : null} />
                      <Scatter data={scatter} animationDuration={1400}>
                        {scatter.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.95} stroke="#0C1915" strokeWidth={2} style={{ filter: `drop-shadow(0 0 8px ${d.fill})` }} />)}
                        <LabelList dataKey="short" position="top" fill="#CFE0D6" fontSize={10} />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
            <Card title="Where you stand, chapter by chapter" note="The marker shows the share of other aspirants you beat in that chapter on this test. Red is the bottom third, gold the middle, green the top." className={hasTime ? "" : "lg:col-span-2"}>
              <ul className="da-scroll max-h-[360px] space-y-5 overflow-y-auto pr-1">
                {[...chapters].sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101)).map((c) => (
                  <li key={c.key}>
                    <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-semibold">{c.name}</span>
                      <span className="shrink-0 text-xs text-[var(--mute)]">
                        {Math.round((c.correct / c.n) * 100)}% you{c.avgAcc != null ? ` · ${c.avgAcc}% avg` : ""}{c.topAcc != null ? ` · ${c.topAcc}% topper` : ""}
                      </span>
                    </div>
                    <PercentileTrack pct={c.pct} />
                    <div className="mt-1.5 text-[11px] text-[var(--mute)]">{c.pct != null ? `Better than ${c.pct}% of aspirants` : "Not enough attempts to rank yet"}</div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* sectional benchmark */}
        {sectionBench.length > 0 && (
          <Card id="marks" title="Sectional marks against the field" note="Marks per section after negative marking. Gold is you, the white tick is the median aspirant and the chalk marker is the topper average.">
            <div className={`grid gap-8 ${radarData.length >= 3 ? "lg:grid-cols-5" : ""}`}>
              <div className={`space-y-7 ${radarData.length >= 3 ? "lg:col-span-3" : ""}`}>
                {sectionBench.map((s) => {
                  const max = Math.max(1, rows.filter((r) => r.section === s.sec).length);
                  const w = (v: number | null) => Math.max(0, Math.min(100, ((v ?? 0) / max) * 100));
                  const beat = (s.my_score ?? 0) >= (s.median_score ?? 0);
                  return (
                    <div key={s.sec}>
                      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold">{s.sec}</span>
                        <span className="da-num text-xs text-[var(--mute)]">you <b className="text-[var(--ink)]">{s.my_score}</b> · median {s.median_score}{s.top_score != null ? ` · topper ${s.top_score}` : ""} · of {max}</span>
                      </div>
                      <div className="relative h-8 rounded-full bg-[#07110D] shadow-[inset_0_2px_6px_rgba(0,0,0,.7)]">
                        <div className="absolute inset-0 overflow-hidden rounded-full">
                          {s.median_score != null && <div className="absolute left-0 top-0 h-full" style={{ width: `${w(s.median_score)}%`, background: "rgba(127,165,150,.18)" }} />}
                          <motion.div initial={{ width: 0 }} whileInView={{ width: `${w(s.my_score)}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }}
                            className="da-shimmer absolute left-0 top-2 h-4 rounded-full" style={{ background: `linear-gradient(90deg, ${C.you}55, ${C.you})`, boxShadow: `0 0 18px ${C.you}77` }} />
                        </div>
                        {s.median_score != null && <div className="absolute top-0 h-full w-[2px] bg-white/80" style={{ left: `${w(s.median_score)}%`, boxShadow: "0 0 8px rgba(255,255,255,.7)" }} />}
                        {s.top_score != null && (
                          <div className="absolute top-[-3px] h-[38px] w-[3px] rounded" style={{ left: `${w(s.top_score)}%`, background: C.top, boxShadow: `0 0 14px ${C.top}AA` }} />
                        )}
                      </div>
                      <div className="mt-1.5 text-[11px]" style={{ color: beat ? C.good : C.bad }}>
                        {beat ? "At or above the median aspirant" : "Below the median aspirant"}{s.percentile != null ? ` · ahead of ${s.percentile}%` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
              {radarData.length >= 3 && (
                <div className="lg:col-span-2">
                  <div className="h-[310px] rounded-2xl border border-white/[0.05] bg-[#07110D]/40">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke="#2A4A3E" />
                        <PolarAngleAxis dataKey="sec" tick={{ fill: "#A9C0B5", fontSize: 11 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Topper" dataKey="topper" stroke={C.top} fill={C.top} fillOpacity={0.06} strokeDasharray="4 4" strokeWidth={1.6} animationDuration={1400} />
                        <Radar name="Median" dataKey="median" stroke={C.avg} fill={C.avg} fillOpacity={0.14} strokeWidth={1.6} animationDuration={1400} />
                        <Radar name="You" dataKey="you" stroke={C.you} fill={C.you} fillOpacity={0.34} strokeWidth={2.6} animationDuration={1400} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex justify-center"><Legend items={[{ c: C.you, l: "You" }, { c: C.avg, l: "Median" }, { c: C.top, l: "Topper", dashed: true }]} /></div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* mistake vault */}
        <Card id="vault" title="Mistake vault" note="Everything you got wrong or skipped, grouped by chapter and topic. One click turns it into a fresh practice test.">
          {mistakeCount === 0 ? (
            <p className="flex items-center gap-2 text-sm text-[var(--mute)]"><CheckCircle2 size={15} style={{ color: C.good }} /> No mistakes on this test.</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {vault.map((c) => (
                  <div key={c.name} className="da-tile rounded-2xl border border-white/[0.07] bg-[#07110D]/60 p-4">
                    <div className="flex items-center justify-between"><span className="font-semibold">{c.name}</span><span className="da-num rounded-full px-2.5 py-0.5 text-sm font-bold" style={{ color: C.bad, background: "rgba(255,107,74,.14)", boxShadow: "0 0 16px -4px rgba(255,107,74,.6)" }}>{c.n}</span></div>
                    <div className="mt-2 h-1.5 rounded-full bg-[#07110D]"><motion.div initial={{ width: 0 }} whileInView={{ width: `${(c.n / Math.max(vault[0].n, 1)) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.bad}55, ${C.bad})`, boxShadow: `0 0 10px ${C.bad}88` }} /></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Array.from(c.topics.entries()).map(([t, n]) => <span key={t} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-[var(--mute)]">{t} · {n}</span>)}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={runVault} disabled={vaulting} className="da-btn mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-[#0C1915] shadow-[0_12px_32px_-8px_rgba(255,182,39,.7)] disabled:opacity-50" style={{ background: `linear-gradient(180deg, #FFC857, ${C.you})` }}>
                {vaulting ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Practise these {mistakeCount} questions
              </button>
            </>
          )}
        </Card>

        {/* ledger */}
        <Card id="ledger" title="Question ledger" note="Your personal solution sheet. Open any row for the answer, the explanation and the shortcut method.">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {([["all", "All"], ["traps", "Time traps"], ["wrong", "Wrong"], ["skipped", "Skipped"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setLedgerFilter(k)} className="da-chip rounded-full border px-3.5 py-1.5 text-xs font-bold"
                style={ledgerFilter === k ? { background: C.you, color: "#0C1915", borderColor: "transparent", boxShadow: `0 8px 22px -6px ${C.you}99` } : { borderColor: "rgba(255,255,255,.1)", color: "var(--mute)" }}>{l}</button>
            ))}
          </div>
          <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07]">
            {rows.filter((r) => ledgerFilter === "all" || (ledgerFilter === "traps" ? r.trap : r.verdict === ledgerFilter)).map((r) => {
              const isOpen = open === r.id;
              const q = r.q;
              const corr = (q.correct_option || "").toLowerCase();
              const vcol = r.verdict === "correct" ? C.good : r.verdict === "wrong" ? C.bad : C.skip;
              const hasShortcut = !!(q.shortcut_explanation || q.shortcut_video_url);
              const barMax = Math.max(r.you, r.top || 0, 1);
              return (
                <div key={r.id} className="bg-[#0A1B14]/70 transition-colors" style={isOpen ? { background: "rgba(18,40,32,.9)" } : undefined}>
                  <button onClick={() => setOpen(isOpen ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm transition-colors hover:bg-white/[0.04]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: vcol, boxShadow: `0 0 10px ${vcol}, 0 0 2px ${vcol}` }} />
                    <span className="w-24 shrink-0 truncate font-semibold">{r.section.slice(0, 10)} Q{r.no}</span>
                    <span className="min-w-0 flex-1 truncate text-[var(--mute)]">{r.chapterTagged ? r.chapterName : "Untagged"}{r.topicTagged ? ` › ${r.topicName}` : ""}</span>
                    {hasTime && (
                      <span className="relative hidden h-2 w-24 shrink-0 rounded-full bg-[#07110D] md:block" title="Your time against the topper's">
                        <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${(r.you / barMax) * 100}%`, background: C.you, boxShadow: `0 0 8px ${C.you}88` }} />
                        {r.top != null && <span className="absolute -top-[3px] h-[14px] w-[2px] rounded" style={{ left: `${(r.top / barMax) * 100}%`, background: C.top, boxShadow: `0 0 6px ${C.top}` }} />}
                      </span>
                    )}
                    {hasTime && <span className="da-num w-12 shrink-0 text-right font-bold" style={{ color: C.you }}>{secs(r.you)}</span>}
                    {hasTime && r.top != null && <span className="da-num hidden w-16 shrink-0 text-right text-[var(--mute)] sm:block">top {secs(r.top)}</span>}
                    {hasTime && r.avg != null && <span className="da-num hidden w-16 shrink-0 text-right text-[var(--mute)] lg:block">avg {secs(r.avg)}</span>}
                    <ChevronDown size={15} className={`shrink-0 text-[var(--mute)] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}
                      className="space-y-3 bg-[#07110D]/70 px-4 pb-5 pt-2 text-sm leading-relaxed">
                      <p className="font-medium">{q.question_text}</p>
                      <p><span className="text-[var(--mute)]">Correct answer:</span> <span className="font-semibold" style={{ color: C.good, textShadow: `0 0 14px ${C.good}55` }}>({corr.toUpperCase()}) {q[`option_${corr}`]}</span>
                        {answers[q.id] && r.verdict === "wrong" && <span className="ml-3 text-[var(--mute)]">You chose <span style={{ color: C.bad }}>({answers[q.id].toUpperCase()})</span></span>}</p>
                      {r.insight && <p className="text-[var(--mute)]">{r.insight.msg}</p>}
                      <div>
                        <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-xs font-semibold">
                          {[false, true].map((on) => (
                            <button key={String(on)} onClick={() => setShortcutOn((s) => ({ ...s, [r.id]: on }))} className="rounded-full px-3.5 py-1.5 transition-all"
                              style={(!!shortcutOn[r.id]) === on ? { background: C.you, color: "#0C1915", boxShadow: `0 6px 18px -6px ${C.you}` } : { color: "var(--mute)" }}>
                              {on ? "30-second shortcut" : "Standard solution"}
                            </button>
                          ))}
                        </div>
                        {shortcutOn[r.id] ? (
                          hasShortcut ? (
                            <>
                              {q.shortcut_explanation && <p className="whitespace-pre-wrap text-[var(--ink)]">{q.shortcut_explanation}</p>}
                              {q.shortcut_video_url && <a href={q.shortcut_video_url} target="_blank" rel="noreferrer" className="mt-1 inline-block underline" style={{ color: C.you }}>Watch the walkthrough</a>}
                            </>
                          ) : <p className="text-[var(--mute)]">A shortcut for this question has not been added yet.</p>
                        ) : (
                          <p className="whitespace-pre-wrap text-[var(--ink)]">{q.explanation?.trim() || "No written solution has been added for this question yet."}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function DeepAnalysisPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0C1915] text-[#8BA699]"><Loader2 className="animate-spin" /></div>}>
      <DeepAnalysisCore />
    </Suspense>
  );
}