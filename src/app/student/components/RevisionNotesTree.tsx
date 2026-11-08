//srcappstudentcomponentsRevisionNotesTree.tsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { 
  Loader2, ChevronDown, ChevronRight, BookOpen, Edit3, 
  Save, CheckCircle, Trash2, Check, 
  Trophy, Book, FileText, CheckCircle2, Maximize2, Minimize2,
  ChevronLeft, Sparkles, ExternalLink, Lock, Languages // Added Lock + Languages icons
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import StudyDesk from "./StudyDesk";
import FocusReader from "./FocusReader"; // NEW: full-screen reading workspace

// ==========================================
// TYPES & THEMES TYPES
// ==========================================
interface RevisionNotesTreeProps {
  loadingNotes: boolean;
  courseContentTree: any[];
  expandedChapters: Record<string, boolean>;
  onToggleChapter: (chapterId: string) => void;
  studentPlan?: string; // Passed to evaluate hierarchical gates
}

type SubjectTheme = {
  bg: string;
  accent: string;
  border: string;
  text: string;
  ring: string;
  badge: string;
  progress: string;
};

type MetricsType = {
  total: number;
  done: number;
  percentage: number;
};

// Hierarchical Plan Comparison Core Values
const PLAN_HIERARCHY: Record<string, number> = {
  free: 1,
  silver: 2,
  gold: 3,
  premium: 4,
};

// Supported note languages. "en" is always the source of truth --
// hi/mr are optional per-topic and fall back to English wherever a
// translation hasn't been filled in yet by the admin.
export type ContentLang = "en" | "hi" | "mr";

const LANGUAGE_OPTIONS: { code: ContentLang; label: string }[] = [
  { code: "en", label: "ENGLISH" },
  { code: "hi", label: "हिन्दी " },
  { code: "mr", label: "मराठी " },
];

const getLocalizedParagraph = (topic: any, lang: ContentLang): string => {
  if (!topic) return "";
  if (lang === "en") return topic.paragraph_text_en || "";
  const localized = topic[`paragraph_text_${lang}`];
  return localized && localized.trim().length > 0 ? localized : (topic.paragraph_text_en || "");
};

// Same fallback pattern as getLocalizedParagraph, but for titles
// (section/phase/chapter/topic .name_en/.name_hi/.name_mr). Also
// tolerates un-migrated rows that still only have a plain .name, so this
// keeps working even mid-rollout.
const getLocalizedLabel = (obj: any, lang: ContentLang): string => {
  if (!obj) return "";
  const english = obj.name_en || obj.name || "";
  if (lang === "en") return english;
  const localized = obj[`name_${lang}`];
  return localized && localized.trim().length > 0 ? localized : english;
};

const getSubjectTheme = (name: string = ""): SubjectTheme => {
  const normalized = name.toLowerCase();
  if (normalized.includes("reasoning")) {
    return {
      bg: "bg-blue-50/40", accent: "bg-blue-600 hover:bg-blue-700 text-white",
      border: "border-blue-100", text: "text-blue-900", ring: "focus-within:ring-blue-500/20",
      badge: "bg-blue-100 text-blue-800 border-blue-200", progress: "bg-blue-600"
    };
  }
  if (normalized.includes("quantitative") || normalized.includes("math") || normalized.includes("numerical")) {
    return {
      bg: "bg-indigo-50/40", accent: "bg-indigo-600 hover:bg-indigo-700 text-white",
      border: "border-indigo-100", text: "text-indigo-900", ring: "focus-within:ring-indigo-500/20",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-200", progress: "bg-indigo-600"
    };
  }
  if (normalized.includes("english") || normalized.includes("verbal") || normalized.includes("lang")) {
    return {
      bg: "bg-emerald-50/40", accent: "bg-emerald-600 hover:bg-emerald-700 text-white",
      border: "border-emerald-100", text: "text-emerald-900", ring: "focus-within:ring-emerald-500/20",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200", progress: "bg-emerald-600"
    };
  }
  return {
    bg: "bg-amber-50/40", accent: "bg-amber-600 hover:bg-amber-700 text-slate-950",
    border: "border-amber-100", text: "text-amber-900", ring: "focus-within:ring-amber-500/20",
    badge: "bg-amber-100 text-amber-900 border-amber-200", progress: "bg-amber-600"
  };
};

// ==========================================================================
// 🎨 NEW STYLE SYSTEM (ADDITIVE ONLY)
// Everything in this section is NEW. The old syntax (==highlight==, **bold**,
// $latex$, `code`, [EXAMPLE], [QUESTION], [MOTIVATION], tables, lists, ---, >,
// **Header**, [img:name]) is untouched and renders exactly as before.
//
// HOW TO ADD YOUR OWN STYLE LATER:
//   - New colour        -> add one line in ACCENTS
//   - New box (callout) -> add one entry in CALLOUTS
//   - New inline tag    -> add a case in renderInlineTag + its name in INLINE_TAG_NAMES
//   - New line style    -> add a case in renderNewLineStyle
// ==========================================================================

type AccentStyle = {
  text: string;   // coloured text
  bar: string;    // solid bar / dot colour
  border: string; // border colour
  hl: string;     // highlight (marker pen)
  badge: string;  // pill badge
};

// NOTE: Tailwind needs full class names written out, so do not build these dynamically.
const ACCENTS: Record<string, AccentStyle> = {
  red:    { text: "text-red-600",    bar: "bg-red-500",    border: "border-red-300",    hl: "bg-red-100 text-red-950 border-b border-red-200",       badge: "bg-red-50 text-red-700 border-red-200" },
  green:  { text: "text-emerald-600",bar: "bg-emerald-500",border: "border-emerald-300",hl: "bg-emerald-100 text-emerald-950 border-b border-emerald-200", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  blue:   { text: "text-blue-600",   bar: "bg-blue-500",   border: "border-blue-300",   hl: "bg-blue-100 text-blue-950 border-b border-blue-200",     badge: "bg-blue-50 text-blue-700 border-blue-200" },
  purple: { text: "text-purple-600", bar: "bg-purple-500", border: "border-purple-300", hl: "bg-purple-100 text-purple-950 border-b border-purple-200", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  orange: { text: "text-orange-600", bar: "bg-orange-500", border: "border-orange-300", hl: "bg-orange-100 text-orange-950 border-b border-orange-200", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  pink:   { text: "text-pink-600",   bar: "bg-pink-500",   border: "border-pink-300",   hl: "bg-pink-100 text-pink-950 border-b border-pink-200",     badge: "bg-pink-50 text-pink-700 border-pink-200" },
  teal:   { text: "text-teal-600",   bar: "bg-teal-500",   border: "border-teal-300",   hl: "bg-teal-100 text-teal-950 border-b border-teal-200",     badge: "bg-teal-50 text-teal-700 border-teal-200" },
  indigo: { text: "text-indigo-600", bar: "bg-indigo-500", border: "border-indigo-300", hl: "bg-indigo-100 text-indigo-950 border-b border-indigo-200", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  amber:  { text: "text-amber-600",  bar: "bg-amber-500",  border: "border-amber-300",  hl: "bg-amber-100 text-amber-950 border-b border-amber-200",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  gray:   { text: "text-slate-500",  bar: "bg-slate-400",  border: "border-slate-300",  hl: "bg-slate-200 text-slate-900 border-b border-slate-300",   badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

const ACCENT_NAMES = Object.keys(ACCENTS);

// ---- Inline tags:  {red}text{/red}  {hl-green}text{/hl-green}  {u}text{/u} ...
const INLINE_TAG_NAMES: string[] = [
  ...ACCENT_NAMES,
  ...ACCENT_NAMES.map((c) => `hl-${c}`),
  ...ACCENT_NAMES.map((c) => `badge-${c}`),
  "badge", "u", "wavy", "s", "sub", "sup", "small", "big", "xl", "xxl", "kbd",
];
// Backreference \1 makes sure the closing tag matches the opening tag, so tags of
// different names can be nested. Unknown tags (e.g. maths like {x}) are left untouched.
const INLINE_TAG_REGEX = new RegExp(`\\{(${INLINE_TAG_NAMES.join("|")})\\}([\\s\\S]*?)\\{\\/\\1\\}`, "g");

// ---- Callout boxes:  [NOTE] ... [/NOTE]   or with custom title  [NOTE: My title] ... [/NOTE]
type CalloutConfig = {
  icon: string;
  label: string;
  box: string;
  title: string;
  body?: string;
  center?: boolean;
};

const CALLOUTS: Record<string, CalloutConfig> = {
  NOTE:       { icon: "📝", label: "NOTE",               box: "bg-slate-50/70 border-slate-200 border-l-slate-500",     title: "text-slate-600" },
  TIP:        { icon: "💡", label: "PRO TIP",            box: "bg-emerald-50/60 border-emerald-200 border-l-emerald-500", title: "text-emerald-700" },
  WARNING:    { icon: "⚠️", label: "WARNING",            box: "bg-rose-50/60 border-rose-200 border-l-rose-500",         title: "text-rose-700" },
  IMPORTANT:  { icon: "❗", label: "IMPORTANT",          box: "bg-orange-50/60 border-orange-200 border-l-orange-500",   title: "text-orange-700" },
  FORMULA:    { icon: "🧮", label: "FORMULA",            box: "bg-indigo-50/60 border-indigo-200 border-l-indigo-500",   title: "text-indigo-700", body: "font-serif italic text-[15px] font-medium", center: true },
  TRICK:      { icon: "⚡", label: "SHORTCUT TRICK",     box: "bg-teal-50/60 border-teal-200 border-l-teal-500",         title: "text-teal-700" },
  REMEMBER:   { icon: "📌", label: "REMEMBER",           box: "bg-yellow-50/70 border-yellow-200 border-l-yellow-500",   title: "text-yellow-700" },
  DEFINITION: { icon: "📖", label: "DEFINITION",         box: "bg-cyan-50/60 border-cyan-200 border-l-cyan-500",         title: "text-cyan-700" },
  MNEMONIC:   { icon: "🧠", label: "MEMORY TRICK",       box: "bg-fuchsia-50/60 border-fuchsia-200 border-l-fuchsia-500", title: "text-fuchsia-700" },
  PYQ:        { icon: "🎯", label: "PREVIOUS YEAR QUESTION", box: "bg-stone-100/80 border-stone-300 border-l-stone-800", title: "text-stone-700" },
  SUMMARY:    { icon: "✅", label: "QUICK REVISION",     box: "bg-sky-50/60 border-sky-200 border-l-sky-500",            title: "text-sky-700" },
  KEYPOINTS:  { icon: "🔑", label: "KEY POINTS",         box: "bg-blue-50/60 border-blue-200 border-l-blue-500",         title: "text-blue-700" },
  SOLUTION:   { icon: "✔️", label: "SOLUTION",           box: "bg-green-50/60 border-green-200 border-l-green-500",      title: "text-green-700" },
  MISTAKE:    { icon: "❌", label: "COMMON MISTAKE",     box: "bg-red-50/60 border-red-200 border-l-red-500",            title: "text-red-700" },
  FUN:        { icon: "✨", label: "DID YOU KNOW?",      box: "bg-violet-50/60 border-violet-200 border-l-violet-500",   title: "text-violet-700" },
};

// Blocks that have their own special layout (not a plain coloured box)
const SPECIAL_BLOCKS = ["STEPS", "TIMELINE", "CHECKLIST", "TOGGLE", "COLUMNS", "QUOTE"];
const NEW_BLOCK_NAMES = [...Object.keys(CALLOUTS), ...SPECIAL_BLOCKS];

// Splits text into [normal text][block][normal text]... Old 3 blocks are kept exactly as before.
const OLD_BLOCK_ALTERNATIVES = [
  "\\[EXAMPLE\\][\\s\\S]*?\\[\\/EXAMPLE\\]",
  "\\[QUESTION\\][\\s\\S]*?\\[\\/QUESTION\\]",
  "\\[MOTIVATION\\][\\s\\S]*?\\[\\/MOTIVATION\\]",
];
const NEW_BLOCK_ALTERNATIVES = NEW_BLOCK_NAMES.map(
  (n) => `\\[${n}(?::[^\\]\\n]*)?\\][\\s\\S]*?\\[\\/${n}\\]`
);
const ALL_BLOCK_REGEX = new RegExp(`(${[...OLD_BLOCK_ALTERNATIVES, ...NEW_BLOCK_ALTERNATIVES].join("|")})`, "g");
const NEW_BLOCK_PARSE_REGEX = new RegExp(`^\\[(${NEW_BLOCK_NAMES.join("|")})(?::([^\\]\\n]*))?\\]([\\s\\S]*?)\\[\\/\\1\\]$`);

const bodyLines = (body: string): string[] =>
  body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

// ---- Collapsible block (for answers / hidden hints)
const CollapsibleNote: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left bg-slate-50 hover:bg-slate-100 transition-colors text-[12px] font-bold text-slate-800"
      >
        <span className="flex items-center gap-1.5"><span>👁️</span>{title}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-3 border-t border-slate-100">{children}</div>}
    </div>
  );
};

// Inline tag renderer ------------------------------------------------------
const renderInlineTag = (name: string, inner: string, key: string): React.ReactNode => {
  const content = processInlineStyles(inner);

  if (ACCENTS[name]) {
    return <span key={key} className={`${ACCENTS[name].text} font-semibold`}>{content}</span>;
  }
  if (name.startsWith("hl-") && ACCENTS[name.slice(3)]) {
    return (
      <mark key={key} className={`${ACCENTS[name.slice(3)].hl} font-bold px-1 py-0.5 rounded-xs mx-0.5 antialiased text-[12px]`}>
        {content}
      </mark>
    );
  }
  if (name === "badge" || (name.startsWith("badge-") && ACCENTS[name.slice(6)])) {
    const cls = name === "badge" ? ACCENTS.gray.badge : ACCENTS[name.slice(6)].badge;
    return (
      <span key={key} className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border mx-0.5 align-middle ${cls}`}>
        {content}
      </span>
    );
  }
  switch (name) {
    case "u":     return <span key={key} className="underline decoration-2 underline-offset-4 decoration-amber-400">{content}</span>;
    case "wavy":  return <span key={key} className="underline decoration-wavy decoration-rose-400 underline-offset-4">{content}</span>;
    case "s":     return <span key={key} className="line-through text-slate-400">{content}</span>;
    case "sub":   return <sub key={key} className="text-[10px]">{content}</sub>;
    case "sup":   return <sup key={key} className="text-[10px]">{content}</sup>;
    case "small": return <span key={key} className="text-[11px] text-slate-500">{content}</span>;
    case "big":   return <span key={key} className="text-[16px] font-bold">{content}</span>;
    case "xl":    return <span key={key} className="text-[19px] font-extrabold tracking-tight">{content}</span>;
    case "xxl":   return <span key={key} className="text-[24px] font-black tracking-tight">{content}</span>;
    case "kbd":
      return (
        <kbd key={key} className="px-1.5 py-0.5 mx-0.5 rounded border border-b-2 border-slate-300 bg-slate-50 font-mono text-[11px] font-semibold text-slate-800">
          {content}
        </kbd>
      );
    default:
      return <React.Fragment key={key}>{content}</React.Fragment>;
  }
};

// Line-level new styles ------------------------------------------------------
// Returns null when the line is NOT a new style, so old behaviour continues untouched.
const renderNewLineStyle = (trimmedLine: string, keyId: string): React.ReactNode | null => {
  // Headings with different sizes:  [H1] Title   [H2:blue] Title   (H1 biggest ... H4 smallest)
  const hMatch = trimmedLine.match(/^\[H([1-4])(?::([a-z]+))?\]\s*(.*)$/i);
  if (hMatch) {
    const level = hMatch[1];
    const accent = ACCENTS[(hMatch[2] || "amber").toLowerCase()] || ACCENTS.amber;
    const text = processInlineStyles(hMatch[3]);
    if (level === "1") {
      return (
        <h3 key={`nh1-${keyId}`} className="mt-6 mb-3 text-[22px] leading-tight font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <span className={`w-1.5 h-7 rounded-full inline-block shrink-0 ${accent.bar}`}></span>
          {text}
        </h3>
      );
    }
    if (level === "2") {
      return (
        <h4 key={`nh2-${keyId}`} className={`mt-5 mb-2.5 pb-1 text-[18px] leading-snug font-extrabold tracking-tight text-slate-900 border-b-2 ${accent.border}`}>
          {text}
        </h4>
      );
    }
    if (level === "3") {
      return (
        <h5 key={`nh3-${keyId}`} className={`mt-4 mb-2 text-[15px] font-extrabold tracking-tight flex items-center gap-2 ${accent.text}`}>
          <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${accent.bar}`}></span>
          {text}
        </h5>
      );
    }
    return (
      <h6 key={`nh4-${keyId}`} className={`mt-3 mb-1.5 text-[11px] font-black uppercase tracking-widest ${accent.text}`}>
        {text}
      </h6>
    );
  }

  // Paragraph size / alignment:  [LEAD] [LARGE] [SMALL] [CENTER] [RIGHT]
  const pMatch = trimmedLine.match(/^\[(LEAD|LARGE|SMALL|CENTER|RIGHT)\]\s*(.*)$/);
  if (pMatch) {
    const kind = pMatch[1];
    const content = processInlineStyles(pMatch[2]);
    const cls: Record<string, string> = {
      LEAD:   "mb-3 text-[15px] leading-loose font-medium text-slate-800",
      LARGE:  "mb-2 text-[16px] leading-relaxed font-semibold text-slate-800",
      SMALL:  "mb-2 text-[11px] leading-relaxed text-slate-500",
      CENTER: "mb-2 text-[13px] leading-relaxed text-center text-slate-700",
      RIGHT:  "mb-2 text-[13px] leading-relaxed text-right text-slate-700",
    };
    return <p key={`np-${keyId}`} className={`font-sans antialiased tracking-wide ${cls[kind]}`}>{content}</p>;
  }

  // Dividers:  [DIVIDER]  [DIVIDER:dots]  [DIVIDER:dashed]  [DIVIDER:thick]  [DIVIDER:gradient]  [DIVIDER:stars]
  const dMatch = trimmedLine.match(/^\[DIVIDER(?::([a-z]+))?\]$/i);
  if (dMatch) {
    const kind = (dMatch[1] || "line").toLowerCase();
    if (kind === "stars") {
      return <div key={`nd-${keyId}`} className="my-4 text-center text-amber-400 tracking-[0.5em] text-[12px] select-none">✦ ✦ ✦</div>;
    }
    if (kind === "gradient") {
      return <div key={`nd-${keyId}`} className="my-4 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>;
    }
    const map: Record<string, string> = {
      line:   "border-t border-slate-300",
      dots:   "border-t-2 border-dotted border-slate-300",
      dashed: "border-t-2 border-dashed border-slate-300",
      thick:  "border-t-4 border-slate-200 rounded-full",
    };
    return <hr key={`nd-${keyId}`} className={`my-4 ${map[kind] || map.line}`} />;
  }

  // Spacer:  [SPACE]  [SPACE:sm|md|lg|xl]
  const sMatch = trimmedLine.match(/^\[SPACE(?::(sm|md|lg|xl))?\]$/i);
  if (sMatch) {
    const size = (sMatch[1] || "md").toLowerCase();
    const map: Record<string, string> = { sm: "h-2", md: "h-4", lg: "h-8", xl: "h-12" };
    return <div key={`nsp-${keyId}`} className={map[size]} aria-hidden="true"></div>;
  }

  // Icon bullets:  [+] good   [-] bad   [>] arrow   [*] star
  const bMatch = trimmedLine.match(/^\[([+>*-])\]\s+(.*)$/);
  if (bMatch) {
    const sym = bMatch[1];
    const map: Record<string, { icon: string; cls: string }> = {
      "+": { icon: "+", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      "-": { icon: "−", cls: "bg-rose-100 text-rose-700 border-rose-200" },
      ">": { icon: "→", cls: "bg-blue-100 text-blue-700 border-blue-200" },
      "*": { icon: "★", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    };
    const cfg = map[sym];
    return (
      <div key={`nb-${keyId}`} className="flex items-start gap-2 mb-1.5 text-[13px] leading-relaxed text-slate-700 font-sans antialiased">
        <span className={`shrink-0 w-4 h-4 mt-0.5 rounded-full border text-[9px] font-black flex items-center justify-center ${cfg.cls}`}>{cfg.icon}</span>
        <span>{processInlineStyles(bMatch[2])}</span>
      </div>
    );
  }

  // Checkbox lines:  [ ] to do   [x] done
  const cMatch = trimmedLine.match(/^\[( |x|X)\]\s+(.*)$/);
  if (cMatch) {
    const checked = cMatch[1].toLowerCase() === "x";
    return (
      <div key={`nc-${keyId}`} className="flex items-start gap-2 mb-1.5 text-[13px] leading-relaxed font-sans antialiased">
        <span className={`shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${checked ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300"}`}>
          {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
        </span>
        <span className={checked ? "text-slate-400 line-through" : "text-slate-700"}>{processInlineStyles(cMatch[2])}</span>
      </div>
    );
  }

  return null;
};

// Block-level new styles --------------------------------------------------------
const renderNewBlock = (
  trimmedSection: string,
  secIndex: number,
  imageMap: Record<string, string>
): React.ReactNode | null => {
  const m = trimmedSection.match(NEW_BLOCK_PARSE_REGEX);
  if (!m) return null;

  const name = m[1];
  const customTitle = (m[2] || "").trim();
  const body = m[3].trim();
  const key = `nblk-${name}-${secIndex}`;

  // Plain coloured callout boxes (config driven)
  const cfg = CALLOUTS[name];
  if (cfg) {
    return (
      <div key={key} className={`my-3 p-3.5 rounded-xl border border-l-4 text-[13px] leading-relaxed ${cfg.box}`}>
        <div className={`text-[10px] font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 select-none ${cfg.title}`}>
          <span>{cfg.icon}</span> {customTitle || cfg.label}
        </div>
        <div className={`text-slate-800 ${cfg.center ? "text-center" : ""} ${cfg.body || ""}`}>
          {renderNarrativeWithImages(body, imageMap)}
        </div>
      </div>
    );
  }

  // Numbered step cards
  if (name === "STEPS") {
    const lines = bodyLines(body);
    return (
      <div key={key} className="my-3 space-y-2">
        {customTitle && <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 select-none">{customTitle}</div>}
        {lines.map((line, idx) => (
          <div key={`${key}-s${idx}`} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 bg-white shadow-3xs">
            <span className="shrink-0 w-6 h-6 rounded-full bg-stone-950 text-amber-400 text-[11px] font-black flex items-center justify-center">{idx + 1}</span>
            <span className="text-[13px] leading-relaxed text-slate-700 pt-0.5">{processInlineStyles(line.replace(/^(\d+[.)]|[-*•])\s+/, ""))}</span>
          </div>
        ))}
      </div>
    );
  }

  // Vertical timeline (each line:  label | text)
  if (name === "TIMELINE") {
    const lines = bodyLines(body);
    return (
      <div key={key} className="my-3">
        {customTitle && <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 select-none">{customTitle}</div>}
        <div className="border-l-2 border-amber-300 ml-1.5 space-y-3">
          {lines.map((line, idx) => {
            const pipe = line.indexOf("|");
            const label = pipe > -1 ? line.slice(0, pipe).trim() : "";
            const text = pipe > -1 ? line.slice(pipe + 1).trim() : line;
            return (
              <div key={`${key}-t${idx}`} className="relative pl-4">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-amber-500"></span>
                {label && <div className="text-[11px] font-black text-amber-700 tracking-wide">{processInlineStyles(label)}</div>}
                <div className="text-[13px] leading-relaxed text-slate-700">{processInlineStyles(text)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Tick list
  if (name === "CHECKLIST") {
    const lines = bodyLines(body);
    return (
      <div key={key} className="my-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1.5">
        {customTitle && <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 select-none">{customTitle}</div>}
        {lines.map((line, idx) => (
          <div key={`${key}-c${idx}`} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-700">
            <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span>{processInlineStyles(line.replace(/^[-*•]\s+/, ""))}</span>
          </div>
        ))}
      </div>
    );
  }

  // Click-to-reveal (great for answers)
  if (name === "TOGGLE") {
    return (
      <CollapsibleNote key={key} title={customTitle || "Click to reveal"}>
        {renderNarrativeWithImages(body, imageMap)}
      </CollapsibleNote>
    );
  }

  // Side-by-side columns, separated by a line containing only |||
  if (name === "COLUMNS") {
    const cols = body.split(/\r?\n\s*\|\|\|\s*\r?\n/).map((c) => c.trim()).filter(Boolean);
    const grid = cols.length >= 3 ? "md:grid-cols-3" : cols.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1";
    return (
      <div key={key} className={`my-3 grid grid-cols-1 gap-3 ${grid}`}>
        {cols.map((col, idx) => (
          <div key={`${key}-col${idx}`} className="p-3 rounded-xl border border-slate-200 bg-white">
            {renderNarrativeWithImages(col, imageMap)}
          </div>
        ))}
      </div>
    );
  }

  // Quote with author:  [QUOTE: Author] text [/QUOTE]
  if (name === "QUOTE") {
    return (
      <figure key={key} className="my-4 pl-4 pr-3 py-2 border-l-4 border-amber-400 bg-amber-50/30 rounded-r-xl">
        <blockquote className="text-[14px] leading-relaxed italic font-medium text-slate-800">{processInlineStyles(body)}</blockquote>
        {customTitle && <figcaption className="mt-1 text-[11px] font-bold text-amber-700">— {customTitle}</figcaption>}
      </figure>
    );
  }

  return null;
};

// ==========================================================================
// ORIGINAL INLINE STYLES (UNCHANGED)
// ==========================================================================
const processBaseInline = (text: string): React.ReactNode => {
  if (!text) return "";
  const renderTextNodes = (rawStr: string): React.ReactNode[] => {
    const highlightRegex = /==([\s\S]*?)==/g;
    const subParts = rawStr.split(highlightRegex);
    return subParts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <mark key={`hl-${i}`} className="bg-amber-100 text-amber-950 font-bold px-1 py-0.5 rounded-xs mx-0.5 border-b border-amber-200 antialiased text-[12px]">
            {part}
          </mark>
        );
      }
      
      if (part.includes("$")) {
        const latexParts = part.split(/\$([\s\S]*?)\$/g);
        return latexParts.map((lPart, lIdx) => {
          if (lIdx % 2 === 1) {
            return (
              <span key={`latex-${lIdx}`} className="font-serif italic font-medium text-slate-900 bg-slate-50/60 px-1 py-0.5 rounded border border-slate-200/40 tracking-wide mx-0.5 select-all">
                {lPart}
              </span>
            );
          }
          
          if (lPart.includes("**")) {
            const boldParts = lPart.split(/\*\*([\s\S]*?)\*\*/g);
            return boldParts.map((bPart, bIdx) => bIdx % 2 === 1 ? <strong key={`b-${bIdx}`} className="font-extrabold text-slate-900">{bPart}</strong> : bPart);
          }
          return lPart;
        });
      }
      
      if (part.includes("**")) {
        const boldParts = part.split(/\*\*([\s\S]*?)\*\*/g);
        return boldParts.map((bPart, bIdx) => bIdx % 2 === 1 ? <strong key={`b-${bIdx}`} className="font-extrabold text-slate-900">{bPart}</strong> : bPart);
      }
      
      return part;
    });
  };

  const splitByCode = text.split(/`([\s\S]*?)`/g);
  return splitByCode.map((segment, index) => {
    if (index % 2 === 1) {
      return (
        <code key={`code-${index}`} className="bg-slate-100 text-slate-900 font-mono font-semibold px-1.5 py-0.5 rounded text-[12px] border border-slate-200/60 mx-0.5">
          {segment}
        </code>
      );
    }
    return <React.Fragment key={`text-seg-${index}`}>{renderTextNodes(segment)}</React.Fragment>;
  });
};

// NEW wrapper: handles {tag}...{/tag} first, then hands everything else to the
// original renderer above. If a text has no new tags the output is identical to before.
const processInlineStyles = (text: string): React.ReactNode => {
  if (!text) return "";
  if (!text.includes("{")) return processBaseInline(text);

  const parts = text.split(INLINE_TAG_REGEX);
  if (parts.length === 1) return processBaseInline(text);

  const out: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) {
      out.push(<React.Fragment key={`it-${i}`}>{processBaseInline(parts[i])}</React.Fragment>);
    }
    const tagName = parts[i + 1];
    if (tagName !== undefined) {
      out.push(renderInlineTag(tagName, parts[i + 2] || "", `itag-${i}`));
    }
  }
  return out;
};

const renderNarrativeWithImages = (text: string, imageMap: Record<string, string>): React.ReactNode => {
  if (!text) return null;

  // Same split as before, but now also recognises the new block names.
  const sections = text.split(ALL_BLOCK_REGEX).filter(Boolean);

  return sections.map((section, secIndex) => {
    const trimmedSection = section.trim();

    if (trimmedSection.startsWith("[EXAMPLE]") && trimmedSection.endsWith("[/EXAMPLE]")) {
      const exampleContent = section.replace("[EXAMPLE]", "").replace("[/EXAMPLE]", "").trim();
      return (
        <div key={`ex-block-${secIndex}`} className="my-2 p-3 rounded-lg bg-blue-50/40 border border-blue-100/60 text-slate-800 text-[13px] leading-relaxed">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 mb-1 flex items-center gap-1.5 select-none">
            <span>💡</span> INTERACTIVE EXAMPLE
          </div>
          <div className="whitespace-pre-wrap">{processInlineStyles(exampleContent)}</div>
        </div>
      );
    }

    if (trimmedSection.startsWith("[QUESTION]") && trimmedSection.endsWith("[/QUESTION]")) {
      const questionContent = section.replace("[QUESTION]", "").replace("[/QUESTION]", "").trim();
      return (
        <div key={`q-block-${secIndex}`} className="my-2 p-3 rounded-lg bg-purple-50/40 border border-purple-100/60 text-slate-800 text-[13px] leading-relaxed">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 mb-1 flex items-center gap-1.5 select-none">
            <span>❓</span> PRACTICE CONCEPT BOX
          </div>
          <div className="whitespace-pre-wrap font-sans font-normal antialiased tracking-wide">{processInlineStyles(questionContent)}</div>
        </div>
      );
    }

    if (trimmedSection.startsWith("[MOTIVATION]") && trimmedSection.endsWith("[/MOTIVATION]")) {
      const motivationContent = section.replace("[MOTIVATION]", "").replace("[/MOTIVATION]", "").trim();
      return (
        <div key={`mot-block-${secIndex}`} className="my-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-slate-900 text-[13px] leading-relaxed shadow-3xs">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-1.5 flex items-center gap-1.5 select-none">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> ASPIRANT CORE INSIGHT
          </div>
          <div className="whitespace-pre-wrap font-medium text-amber-950 italic">{processInlineStyles(motivationContent)}</div>
        </div>
      );
    }

    // ✨ NEW blocks ([NOTE], [TIP], [STEPS], [TOGGLE] ...)
    const newBlock = renderNewBlock(trimmedSection, secIndex, imageMap);
    if (newBlock) return newBlock;

    const lines = section.split(/\r?\n/);
    let lastRenderedHeader = "";
    
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    let activeOL: React.ReactNode[] = [];
    let activeUL: React.ReactNode[] = [];
    const renderedElements: React.ReactNode[] = [];

    const flushTable = (keyIndex: string) => {
      if (tableRows.length > 0 || tableHeaders.length > 0) {
        renderedElements.push(
          <div key={`table-wrapper-${keyIndex}`} className="my-3 overflow-x-auto border border-slate-200 rounded-lg shadow-3xs max-w-full">
            <table className="w-full text-left border-collapse text-[12px]">
              {tableHeaders.length > 0 && (
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {tableHeaders.map((h, idx) => (
                      <th key={`th-${idx}`} className="p-2.5 font-bold text-slate-700 border-r border-slate-200 last:border-r-0">
                        {processInlineStyles(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="border-b border-slate-150 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={`td-${cIdx}`} className="p-2.5 text-slate-800 font-medium border-r border-slate-150 last:border-r-0">
                        {processInlineStyles(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
      }
      inTable = false;
    };

    const flushOL = (keyIndex: string) => {
      if (activeOL.length > 0) {
        renderedElements.push(
          <ol key={`ol-${keyIndex}`} className="list-decimal pl-5 mb-3 space-y-1 text-slate-700 text-[13px] leading-relaxed font-sans antialiased">
            {activeOL}
          </ol>
        );
        activeOL = [];
      }
    };

    const flushUL = (keyIndex: string) => {
      if (activeUL.length > 0) {
        renderedElements.push(
          <ul key={`ul-${keyIndex}`} className="list-disc pl-5 mb-3 space-y-1 text-slate-700 text-[13px] leading-relaxed font-sans antialiased">
            {activeUL}
          </ul>
        );
        activeUL = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
        flushOL(`${secIndex}-${i}`);
        flushUL(`${secIndex}-${i}`);
        inTable = true;
        
        const cells = line.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (cells.every(cell => /^:-*-*:*|-+$/.test(cell))) {
          continue;
        }
        if (tableHeaders.length === 0 && tableRows.length === 0) {
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        flushTable(`${secIndex}-${i}`);
      }

      if (!trimmedLine) {
        flushOL(`${secIndex}-${i}`);
        flushUL(`${secIndex}-${i}`);
        continue;
      }

      if (trimmedLine === "---") {
        flushOL(`${secIndex}-${i}`);
        flushUL(`${secIndex}-${i}`);
        renderedElements.push(
          <hr key={`hr-${secIndex}-${i}`} className="my-4 border-t border-slate-200/80" />
        );
        continue;
      }

      // ✨ NEW line styles ([H1]..[H4], [LEAD], [CENTER], [DIVIDER], [+] ...)
      const newLineStyle = renderNewLineStyle(trimmedLine, `${secIndex}-${i}`);
      if (newLineStyle) {
        flushOL(`${secIndex}-${i}`);
        flushUL(`${secIndex}-${i}`);
        renderedElements.push(newLineStyle);
        continue;
      }

      if (trimmedLine.startsWith(">")) {
        flushOL(`${secIndex}-${i}`);
        flushUL(`${secIndex}-${i}`);
        const quoteContent = trimmedLine.substring(1).trim();
        renderedElements.push(
          <blockquote key={`quote-${secIndex}-${i}`} className="my-3 pl-3 py-1 border-l-4 border-slate-300 text-slate-700 bg-slate-50/40 rounded-r-md text-[13px] leading-relaxed font-sans antialiased">
            {processInlineStyles(quoteContent)}
          </blockquote>
        );
        continue;
      }

      if (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) {
        flushOL(`${secIndex}-${i}`);
        flushUL(`${secIndex}-${i}`);
        const headerText = trimmedLine.slice(2, -2).trim();
        
        if (headerText === lastRenderedHeader) continue;
        lastRenderedHeader = headerText;
        renderedElements.push(
          <h5 key={`h-${secIndex}-${i}`} className="text-[14px] font-extrabold text-slate-900 mt-4 mb-2 pb-0.5 border-b border-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-1 h-3.5 bg-amber-500 rounded-xs inline-block"></span>
            {processInlineStyles(headerText)}
          </h5>
        );
        continue;
      }

      const olMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
      if (olMatch) {
        flushUL(`${secIndex}-${i}`);
        const liContent = olMatch[2].trim();
        activeOL.push(
          <li key={`oli-${secIndex}-${i}`} className="pl-0.5">
            {processInlineStyles(liContent)}
          </li>
        );
        continue;
      }

      const ulMatch = trimmedLine.match(/^[*•-]\s+(.*)$/);
      if (ulMatch) {
        flushOL(`${secIndex}-${i}`);
        const bulletContent = ulMatch[1].trim();
        activeUL.push(
          <li key={`uli-${secIndex}-${i}`} className="pl-0.5">
            {processInlineStyles(bulletContent)}
          </li>
        );
        continue;
      }

      flushOL(`${secIndex}-${i}`);
      flushUL(`${secIndex}-${i}`);

      const imageRegex = /\[img:([^\]]+)\]/g;
      if (imageRegex.test(line)) {
        imageRegex.lastIndex = 0;
        const parts = line.split(imageRegex);
        renderedElements.push(
          <div key={`img-line-${secIndex}-${i}`} className="block my-1">
            {parts.map((part, index) => {
              if (index % 2 === 1) {
                const imageUrl = imageMap[part];
                if (imageUrl) {
                  return (
                    <span key={index} className="block my-3 clear-both text-center select-none">
                      <img 
                        src={imageUrl} 
                        alt={`Syllabus Diagram Asset: ${part}`} 
                        className="mx-auto rounded-lg border border-slate-200 shadow-xs max-h-[300px] object-contain bg-white p-1 hover:scale-[1.01] transition-transform duration-200"
                        loading="lazy"
                      />
                    </span>
                  );
                }
                return <span key={index} className="text-[11px] font-mono text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">Image Token Missing: "{part}"</span>;
              }
              return <React.Fragment key={index}>{processInlineStyles(part)}</React.Fragment>;
            })}
          </div>
        );
        continue;
      }

      renderedElements.push(
        <p key={`p-${secIndex}-${i}`} className="mb-2 text-slate-700 leading-relaxed text-[13px] font-sans font-normal antialiased tracking-wide">
          {processInlineStyles(line)}
        </p>
      );
    }

    if (inTable) flushTable(`${secIndex}-end`);
    flushOL(`${secIndex}-end`);
    flushUL(`${secIndex}-end`);

    return <React.Fragment key={`sec-fragment-${secIndex}`}>{renderedElements}</React.Fragment>;
  });
};

// ==========================================
// SUB-COMPONENT 1: COURSE SWITCHER BAR
// ==========================================
interface CourseSwitcherProps {
  courseContentTree: any[];
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
  isFullscreenMode: boolean;
  setIsFullscreenMode: (val: boolean) => void;
  contentLang: ContentLang;
  setContentLang: (lang: ContentLang) => void;
}

const CourseSwitcher: React.FC<CourseSwitcherProps> = ({
  courseContentTree,
  activeSectionId,
  setActiveSectionId,
  isFullscreenMode,
  setIsFullscreenMode,
  contentLang,
  setContentLang
}) => {
  return (
    <div className="flex items-center justify-between gap-4 bg-white p-1 rounded-xl border border-slate-200 sticky top-0 z-30 shrink-0 shadow-xs">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {courseContentTree.map((sec) => {
          const isActive = activeSectionId === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSectionId(sec.id)}
              className={`px-3 py-1 text-xs font-bold tracking-tight rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive ? "bg-stone-950 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Book className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
              <span>{getLocalizedLabel(sec, contentLang)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* NOTES LANGUAGE TOGGLE */}
        <div className="flex items-center gap-0.5 bg-stone-50 border border-stone-200 rounded-lg p-0.5">
          <Languages className="w-3 h-3 text-slate-400 ml-1 mr-0.5" />
          {LANGUAGE_OPTIONS.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => setContentLang(code)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                contentLang === code ? "bg-stone-950 text-white shadow-sm" : "text-slate-500 hover:text-stone-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Opens the new full-screen reading workspace (FocusReader) */}
        <button
          onClick={() => setIsFullscreenMode(!isFullscreenMode)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-lg transition-all"
        >
          {isFullscreenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isFullscreenMode ? "Minimize" : "Focus Canvas"}</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT 2: MILESTONE DASHBOARD
// ==========================================
interface MilestoneDashboardProps {
  currentActiveSection: any;
  theme: SubjectTheme;
  metrics: MetricsType;
}

const MilestoneDashboard: React.FC<MilestoneDashboardProps> = ({
  currentActiveSection,
  theme,
  metrics
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border ${theme.badge}`}>
          {currentActiveSection.exams?.name || "ARCHIVES"}
        </span>
        <span className="text-[11px] font-semibold text-slate-500">Study Materials Blueprint</span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-500" /> 
          <span>{metrics.done}/{metrics.total} Done</span>
        </div>
        <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200/60">
          <div className={`h-full rounded-full transition-all duration-500 ${theme.progress}`} style={{ width: `${metrics.percentage}%` }} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT 3: CHAPTER ACCORDION UNIT
// ==========================================
interface ChapterAccordionUnitProps {
  chap: any;
  isExpanded: boolean;
  onToggleChapter: (id: string) => void;
  completedTopics: Record<string, boolean>;
  selectedTopicIdMap: Record<string, string>;
  setSelectedTopicIdMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  toggleTopicCompletion: (id: string, e?: React.MouseEvent) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  imageMap: Record<string, string>;
  studentPlan: string;
  contentLang: ContentLang;
}

const ChapterAccordionUnit: React.FC<ChapterAccordionUnitProps> = ({
  chap,
  isExpanded,
  onToggleChapter,
  completedTopics,
  selectedTopicIdMap,
  setSelectedTopicIdMap,
  toggleTopicCompletion,
  isSidebarOpen,
  setIsSidebarOpen,
  imageMap,
  studentPlan,
  contentLang
}) => {
  const totalTopics = chap.notes_topics || [];
  const totalInChapter = totalTopics.length;
  const doneInChapter = totalTopics.filter((t: any) => completedTopics[t.id]).length;
  const isChapterComplete = totalInChapter > 0 && totalInChapter === doneInChapter;

  const activeTopicId = selectedTopicIdMap[chap.id] || (totalTopics[0]?.id || "");
  const currentActiveTopic = totalTopics.find((t: any) => t.id === activeTopicId);

  // Compute hierarchical locked status for visual indicators
  const isLocked = useMemo(() => {
    const studentWeight = PLAN_HIERARCHY[studentPlan?.toLowerCase() || "free"] || 1;
    const requiredWeight = PLAN_HIERARCHY[chap.required_plan?.toLowerCase() || "free"] || 1;
    return studentWeight < requiredWeight;
  }, [studentPlan, chap.required_plan]);

  const handleLaunchAttachedTest = (testId: string) => {
    if (!testId) return;
    window.open(`/student/tests/${testId}`, "_blank");
  };

  return (
    <div className={`border rounded-xl bg-white shadow-xs transition-all ${isChapterComplete ? "border-emerald-200" : "border-slate-200"}`}>
      <button
        onClick={() => onToggleChapter(chap.id)}
        className="w-full flex items-center justify-between p-3 text-left bg-slate-50/40 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 truncate">
          {/* INSERT GATING CHECK CHIPS HERE */}
          {chap.required_plan && chap.required_plan !== 'free' && (
            <span className="flex items-center gap-1 text-[8px] font-black tracking-wider uppercase px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 shrink-0">
              <Lock className="w-2 h-2" />
              {chap.required_plan}
            </span>
          )}

          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide uppercase ${isChapterComplete ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-700 bg-white border-slate-200"}`}>
            {isChapterComplete ? "Done" : `CH ${chap.sequence_order}`}
          </span>
          <span className="text-xs font-bold text-slate-800 truncate">{getLocalizedLabel(chap, contentLang)}</span>
          <span className="text-[11px] text-slate-400 font-medium font-mono shrink-0">({doneInChapter}/{totalInChapter} Read)</span>
        </div>
        <div className="text-slate-400 shrink-0">
          {isLocked ? (
            <Lock className="w-4 h-4 text-amber-500" />
          ) : isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-800" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {isExpanded && !isLocked && (
        <div className="border-t border-slate-100 bg-white flex h-[620px] relative overflow-hidden transition-all duration-300">
          
          {/* 📖 TOPIC INDEX SIDEBAR */}
          <div 
            className={`bg-stone-50/40 border-r border-slate-100 flex flex-col gap-1 p-1.5 overflow-y-auto transition-all duration-300 ease-in-out shrink-0 h-full select-none ${
              isSidebarOpen ? "w-1/4 opacity-100" : "w-0 !p-0 opacity-0 pointer-events-none"
            }`}
          >
            {totalInChapter === 0 ? (
              <div className="p-3 text-[11px] text-slate-400 italic">No topics mapped.</div>
            ) : (
              totalTopics.map((topic: any) => {
                const isTopicActive = topic.id === activeTopicId;
                const isTopicDone = !!completedTopics[topic.id];
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopicIdMap(prev => ({ ...prev, [chap.id]: topic.id }))}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center justify-between gap-1.5 border ${
                      isTopicActive ? "bg-white border-slate-200 shadow-2xs font-bold text-slate-900" : "border-transparent text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <div 
                        onClick={(e) => toggleTopicCompletion(topic.id, e)}
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isTopicDone ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300"}`}
                      >
                        {isTopicDone && <Check className="w-2 h-2 stroke-[3]" />}
                      </div>
                      <span className={`truncate ${isTopicDone ? "text-slate-400 line-through font-normal" : ""}`}>
                        {topic.sequence_order}. {getLocalizedLabel(topic, contentLang)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* ↔ COMPACT ADJUSTABLE PILL COLLAPSER */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ease-in-out" 
            style={{ left: isSidebarOpen ? "25%" : "0px", transform: "translate(-50%, -50%)" }}
          >
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-5 h-10 bg-white border border-slate-200 shadow-xs rounded-full flex items-center justify-center text-slate-600 hover:text-stone-900 hover:bg-slate-50 transition-all active:scale-95"
            >
              {isSidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* HIGH VISIBILITY FOCUS CANVAS DISPLAY */}
          <div className={`overflow-y-auto p-4 md:p-5 bg-white flex flex-col scrollbar-thin h-full transition-all duration-300 ${
            isSidebarOpen ? "w-3/4" : "w-full"
          }`}>
            {currentActiveTopic ? (
              <div className="space-y-3 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs md:text-sm font-extrabold text-slate-900 tracking-tight">{getLocalizedLabel(currentActiveTopic, contentLang)}</h4>
                    <button
                      onClick={(e) => toggleTopicCompletion(currentActiveTopic.id, e)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-all ${
                        completedTopics[currentActiveTopic.id] ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${completedTopics[currentActiveTopic.id] ? "text-emerald-600 fill-emerald-100" : "text-slate-300"}`} />
                      <span>{completedTopics[currentActiveTopic.id] ? "Completed" : "Mark Done"}</span>
                    </button>
                  </div>
                  
                  {contentLang !== "en" && !currentActiveTopic[`paragraph_text_${contentLang}`]?.trim() && (
                    <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 w-fit">
                      <Languages className="w-3 h-3" />
                      Translation not available yet -- showing English
                    </div>
                  )}
                  <div dir="auto" className="text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap pt-0.5 font-sans font-normal antialiased tracking-wide bg-stone-50/30 p-4 rounded-xl border border-stone-100/60 select-text">
                    {renderNarrativeWithImages(getLocalizedParagraph(currentActiveTopic, contentLang), imageMap)}
                  </div>

                  {currentActiveTopic.test_id && (
                    <div className="mt-4 p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-600 uppercase block">Assessment Milestone</span>
                        <p className="text-xs font-semibold text-slate-800">An evaluation module has been linked to this target framework.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLaunchAttachedTest(currentActiveTopic.test_id)}
                        className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Launch Linked Test</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4 text-center border-t border-slate-50 shrink-0">
                  <span className="text-[9px] text-slate-300 tracking-widest font-bold uppercase block">End of Module Material</span>
                </div>
              </div>
            ) : (
              <div className="m-auto text-center space-y-1 text-slate-400">
                <FileText className="w-7 h-7 mx-auto stroke-1" />
                <p className="text-xs italic">Select a lesson node item from index tracking sheet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 🚀 MAIN EXPORTED WORKSPACE COMPONENT
// ==========================================
export default function RevisionNotesTree({
  loadingNotes,
  courseContentTree,
  expandedChapters,
  onToggleChapter,
  studentPlan = "free",
}: RevisionNotesTreeProps) {
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [selectedTopicIdMap, setSelectedTopicIdMap] = useState<Record<string, string>>({});
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [studentId, setStudentId] = useState<string>("");

  // Preferred notes language -- persisted so it sticks across sessions.
  const [contentLang, setContentLang] = useState<ContentLang>("en");

  useEffect(() => {
    const savedLang = localStorage.getItem("notes_language_preference") as ContentLang | null;
    if (savedLang === "en" || savedLang === "hi" || savedLang === "mr") {
      setContentLang(savedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("notes_language_preference", contentLang);
  }, [contentLang]);

  useEffect(() => {
    if (expandedChapters) {
      const currentlyOpen = Object.keys(expandedChapters).find(key => expandedChapters[key] === true);
      setOpenChapterId(currentlyOpen || null);
    }
  }, [expandedChapters]);

  useEffect(() => {
    async function resolveActiveStudentSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setStudentId(session.user.id);
        }
      } catch (authError) {
        console.error("Failed to extract active user authorization profile token:", authError);
      }
    }
    resolveActiveStudentSession();
  }, []);

  useEffect(() => {
    const trackingStorageKey = studentId ? `student_progress_${studentId}` : "student_syllabus_progress";
    const savedProgress = localStorage.getItem(trackingStorageKey);
    if (savedProgress) {
      try {
        setCompletedTopics(JSON.parse(savedProgress));
      } catch (e) {
        console.error(e);
      }
    } else {
      setCompletedTopics({});
    }
  }, [studentId]);

  useEffect(() => {
    async function loadAssetLibrary() {
      try {
        const { data } = await supabase.from("notes_images").select("image_name, image_url");
        if (data) {
          const mapping = data.reduce((acc, curr) => {
            if (curr.image_name && curr.image_url) {
              acc[curr.image_name] = curr.image_url;
            }
            return acc;
          }, {} as Record<string, string>);
          setImageMap(mapping);
        }
      } catch (err) {
        console.error("Error building dashboard image token map:", err);
      }
    }
    loadAssetLibrary();
  }, []);

  useEffect(() => {
    setOpenChapterId(null);
    if (courseContentTree?.length > 0 && !activeSectionId) {
      setActiveSectionId(courseContentTree[0].id);
    }
  }, [courseContentTree, activeSectionId]);

  const currentActiveSection = useMemo(() => {
    return courseContentTree.find((sec) => sec.id === activeSectionId);
  }, [courseContentTree, activeSectionId]);

  const theme = useMemo(() => {
    return getSubjectTheme(currentActiveSection?.name_en || currentActiveSection?.name);
  }, [currentActiveSection?.name_en, currentActiveSection?.name]);

  const metrics = useMemo<MetricsType>(() => {
    if (!currentActiveSection) return { total: 0, done: 0, percentage: 0 };
    let total = 0, done = 0;
    currentActiveSection.notes_phases?.forEach((phase: any) => {
      phase.notes_chapters?.forEach((chap: any) => {
        chap.notes_topics?.forEach((topic: any) => {
          total++;
          if (completedTopics[topic.id]) done++;
        });
      });
    });
    return { total, done, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [currentActiveSection, completedTopics]);

  // `e` is optional so FocusReader can call this without a click event.
  const toggleTopicCompletion = (topicId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updatedProgress = { ...completedTopics, [topicId]: !completedTopics[topicId] };
    setCompletedTopics(updatedProgress);
    const trackingStorageKey = studentId ? `student_progress_${studentId}` : "student_syllabus_progress";
    localStorage.setItem(trackingStorageKey, JSON.stringify(updatedProgress));
  };

  const handleChapterToggle = (chapterId: string) => {
    const isTargetAlreadyOpen = openChapterId === chapterId;
    setOpenChapterId(isTargetAlreadyOpen ? null : chapterId);
    if (onToggleChapter) {
      onToggleChapter(chapterId);
    }
  };

  if (loadingNotes) {
    return (
      <div className="text-center py-24 flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-2xl shadow-xs w-full max-w-5xl mx-auto">
        <Loader2 className="animate-spin text-slate-800 w-7 h-7" />
        <p className="text-xs font-medium text-slate-600 tracking-wide">Assembling syllabus volumes...</p>
      </div>
    );
  }

  if (courseContentTree.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 max-w-xl mx-auto px-6 shadow-xs">
        <BookOpen className="w-9 h-9 text-slate-400 mx-auto mb-2" />
        <h3 className="text-xs font-bold text-slate-800 mb-1">Library Volume Missing</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">No lecture blueprints mapped onto this configuration yet.</p>
      </div>
    );
  }

  // ==========================================
  // 🎯 FOCUS CANVAS: full-screen 3-pane reading workspace
  // ==========================================
  if (isFullscreenMode) {
    return (
      <FocusReader
        courseContentTree={courseContentTree}
        activeSectionId={activeSectionId}
        setActiveSectionId={setActiveSectionId}
        contentLang={contentLang}
        setContentLang={setContentLang}
        languageOptions={LANGUAGE_OPTIONS}
        completedTopics={completedTopics}
        onToggleComplete={(id) => toggleTopicCompletion(id)}
        imageMap={imageMap}
        studentPlan={studentPlan}
        planHierarchy={PLAN_HIERARCHY}
        getLabel={getLocalizedLabel}
        getParagraph={getLocalizedParagraph}
        renderContent={renderNarrativeWithImages}
        initialChapterId={openChapterId}
        initialTopicId={openChapterId ? selectedTopicIdMap[openChapterId] : null}
        aiPanel={(close) => (
          <StudyDesk
            fullHeight
            onClose={close}
            currentSection={getLocalizedLabel(currentActiveSection, contentLang) || "the current topic"}
          />
        )}
        onExit={(pos) => {
          setIsFullscreenMode(false);
          if (pos) {
            // Land the student on the same chapter + topic in the normal view
            setOpenChapterId(pos.chapterId);
            setSelectedTopicIdMap((prev) => ({ ...prev, [pos.chapterId]: pos.topicId }));
          }
        }}
      />
    );
  }

  // ==========================================
  // NORMAL (non-focus) VIEW
  // ==========================================
  return (
    <div className="grid grid-cols-1 gap-3 items-stretch w-full transition-all duration-300 h-[calc(100vh-140px)] lg:grid-cols-4">
      {/* Notes Canvas Container */}
      <div className="overflow-hidden h-full flex flex-col space-y-2 transition-all duration-300 lg:col-span-3">
        <div className="flex flex-col gap-2">
          <CourseSwitcher 
            courseContentTree={courseContentTree} 
            activeSectionId={activeSectionId} 
            setActiveSectionId={setActiveSectionId} 
            isFullscreenMode={isFullscreenMode} 
            setIsFullscreenMode={setIsFullscreenMode} 
            contentLang={contentLang}
            setContentLang={setContentLang}
          />
        </div>

        {currentActiveSection && (
          <div className="flex-grow overflow-y-auto pr-0.5 space-y-4 scrollbar-thin">
            <MilestoneDashboard currentActiveSection={currentActiveSection} theme={theme} metrics={metrics} />
            <div className="space-y-4 pb-2">
              {currentActiveSection.notes_phases?.map((phase: any) => (
                <div key={phase.id} className="space-y-2.5 bg-[#f8fafc]/50 border border-slate-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 px-0.5">
                    <div className="w-1 h-3 bg-indigo-500 rounded-xs"></div>
                    <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">
                      Phase {phase.sequence_order}: {getLocalizedLabel(phase, contentLang)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {phase.notes_chapters?.map((chap: any) => (
                      <ChapterAccordionUnit 
                        key={chap.id}
                        chap={chap}
                        isExpanded={openChapterId === chap.id}
                        onToggleChapter={handleChapterToggle}
                        completedTopics={completedTopics}
                        selectedTopicIdMap={selectedTopicIdMap}
                        setSelectedTopicIdMap={setSelectedTopicIdMap}
                        toggleTopicCompletion={toggleTopicCompletion}
                        isSidebarOpen={isSidebarOpen}
                        setIsSidebarOpen={setIsSidebarOpen}
                        imageMap={imageMap}
                        studentPlan={studentPlan}
                        contentLang={contentLang}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Guruji Right Hand Sidebar Column */}
      <div className="h-full min-h-[480px] relative transition-all duration-300 lg:col-span-1 block">
        <StudyDesk currentSection={getLocalizedLabel(currentActiveSection, contentLang) || "the current topic"} />
      </div>
    </div>
  );
}