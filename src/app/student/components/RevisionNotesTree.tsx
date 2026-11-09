// src/app/student/components/RevisionNotesTree.tsx
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
import { useTheme } from "../theme/ThemeProvider";
import ThemeToggle from "../theme/ThemeToggle"; // Dark / Light switch also available on the notes page
import type { NotesTokens } from "../theme/themes";

// ==========================================
// THEME NOTE
// Colors for this whole notes section now come from the theme file
// (src/app/student/theme/themes.ts -> `notes`).
//   AnushivaLight   = the original warm notes colors (unchanged)
//   AnushivaDefault = dark notes that match the rest of the website
// The renderers below are plain functions, so they receive the notes tokens as `nt`.
// ==========================================
type NT = NotesTokens;

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

type SubjectKey = "reasoning" | "quant" | "english" | "other";

type SubjectTheme = {
  key: SubjectKey; // used to pick the theme-aware badge colors
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
      key: "reasoning",
      bg: "bg-blue-50/40", accent: "bg-blue-600 hover:bg-blue-700 text-white",
      border: "border-blue-100", text: "text-blue-900", ring: "focus-within:ring-blue-500/20",
      badge: "bg-blue-100 text-blue-800 border-blue-200", progress: "bg-blue-600"
    };
  }
  if (normalized.includes("quantitative") || normalized.includes("math") || normalized.includes("numerical")) {
    return {
      key: "quant",
      bg: "bg-indigo-50/40", accent: "bg-indigo-600 hover:bg-indigo-700 text-white",
      border: "border-indigo-100", text: "text-indigo-900", ring: "focus-within:ring-indigo-500/20",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-200", progress: "bg-indigo-600"
    };
  }
  if (normalized.includes("english") || normalized.includes("verbal") || normalized.includes("lang")) {
    return {
      key: "english",
      bg: "bg-emerald-50/40", accent: "bg-emerald-600 hover:bg-emerald-700 text-white",
      border: "border-emerald-100", text: "text-emerald-900", ring: "focus-within:ring-emerald-500/20",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200", progress: "bg-emerald-600"
    };
  }
  return {
    key: "other",
    bg: "bg-amber-50/40", accent: "bg-amber-600 hover:bg-amber-700 text-slate-950",
    border: "border-amber-100", text: "text-amber-900", ring: "focus-within:ring-amber-500/20",
    badge: "bg-amber-100 text-amber-900 border-amber-200", progress: "bg-amber-600"
  };
};

// ==========================================================================
// 🎨 STYLE SYSTEM (ADDITIVE ONLY)
// Everything in this section is NEW. The old syntax (==highlight==, **bold**,
// $latex$, `code`, [EXAMPLE], [QUESTION], [MOTIVATION], tables, lists, ---, >,
// **Header**, [img:name]) is untouched and renders exactly as before.
//
// HOW TO ADD YOUR OWN STYLE LATER:
//   - New colour        -> add its name in ACCENT_NAMES and its classes in themes.ts (notes.accents)
//   - New box (callout) -> add one entry in CALLOUT_META and its classes in themes.ts (notes.callouts)
//   - New inline tag    -> add a case in renderInlineTag + its name in INLINE_TAG_NAMES
//   - New line style    -> add a case in renderNewLineStyle
// ==========================================================================

// Colour names available to the {red}..{/red} / {hl-green}..{/hl-green} / [H2:blue] tags.
// (The actual classes live in the theme file so they can change per theme.)
const ACCENT_NAMES = ["red", "green", "blue", "purple", "orange", "pink", "teal", "indigo", "amber", "gray"];

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
// Structure (icon / label / layout) stays here; the COLORS come from the theme (notes.callouts).
type CalloutMeta = {
  icon: string;
  label: string;
  body?: string;
  center?: boolean;
};

const CALLOUT_META: Record<string, CalloutMeta> = {
  NOTE:       { icon: "📝", label: "NOTE" },
  TIP:        { icon: "💡", label: "PRO TIP" },
  WARNING:    { icon: "⚠️", label: "WARNING" },
  IMPORTANT:  { icon: "❗", label: "IMPORTANT" },
  FORMULA:    { icon: "🧮", label: "FORMULA", body: "font-serif italic text-[15px] font-medium", center: true },
  TRICK:      { icon: "⚡", label: "SHORTCUT TRICK" },
  REMEMBER:   { icon: "📌", label: "REMEMBER" },
  DEFINITION: { icon: "📖", label: "DEFINITION" },
  MNEMONIC:   { icon: "🧠", label: "MEMORY TRICK" },
  PYQ:        { icon: "🎯", label: "PREVIOUS YEAR QUESTION" },
  SUMMARY:    { icon: "✅", label: "QUICK REVISION" },
  KEYPOINTS:  { icon: "🔑", label: "KEY POINTS" },
  SOLUTION:   { icon: "✔️", label: "SOLUTION" },
  MISTAKE:    { icon: "❌", label: "COMMON MISTAKE" },
  FUN:        { icon: "✨", label: "DID YOU KNOW?" },
};

// Blocks that have their own special layout (not a plain coloured box)
const SPECIAL_BLOCKS = ["STEPS", "TIMELINE", "CHECKLIST", "TOGGLE", "COLUMNS", "QUOTE"];
const NEW_BLOCK_NAMES = [...Object.keys(CALLOUT_META), ...SPECIAL_BLOCKS];

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
  const { theme } = useTheme();
  const nt = theme.notes;
  const [open, setOpen] = useState(false);
  return (
    <div className={`my-3 rounded-xl border overflow-hidden ${nt.collapsibleWrap}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors text-[12px] font-bold ${nt.collapsibleBtn}`}
      >
        <span className="flex items-center gap-1.5"><span>👁️</span>{title}</span>
        <ChevronDown className={`w-4 h-4 ${nt.ink500} transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className={`p-3 border-t ${nt.b100}`}>{children}</div>}
    </div>
  );
};

// Inline tag renderer ------------------------------------------------------
const renderInlineTag = (name: string, inner: string, key: string, nt: NT): React.ReactNode => {
  const content = processInlineStyles(inner, nt);

  if (nt.accents[name]) {
    return <span key={key} className={`${nt.accents[name].text} font-semibold`}>{content}</span>;
  }
  if (name.startsWith("hl-") && nt.accents[name.slice(3)]) {
    return (
      <mark key={key} className={`${nt.accents[name.slice(3)].hl} font-bold px-1 py-0.5 rounded-xs mx-0.5 antialiased text-[12px]`}>
        {content}
      </mark>
    );
  }
  if (name === "badge" || (name.startsWith("badge-") && nt.accents[name.slice(6)])) {
    const cls = name === "badge" ? nt.accents.gray.badge : nt.accents[name.slice(6)].badge;
    return (
      <span key={key} className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border mx-0.5 align-middle ${cls}`}>
        {content}
      </span>
    );
  }
  switch (name) {
    case "u":     return <span key={key} className="underline decoration-2 underline-offset-4 decoration-amber-400">{content}</span>;
    case "wavy":  return <span key={key} className="underline decoration-wavy decoration-rose-400 underline-offset-4">{content}</span>;
    case "s":     return <span key={key} className={`line-through ${nt.ink400}`}>{content}</span>;
    case "sub":   return <sub key={key} className="text-[10px]">{content}</sub>;
    case "sup":   return <sup key={key} className="text-[10px]">{content}</sup>;
    case "small": return <span key={key} className={`text-[11px] ${nt.ink500}`}>{content}</span>;
    case "big":   return <span key={key} className="text-[16px] font-bold">{content}</span>;
    case "xl":    return <span key={key} className="text-[19px] font-extrabold tracking-tight">{content}</span>;
    case "xxl":   return <span key={key} className="text-[24px] font-black tracking-tight">{content}</span>;
    case "kbd":
      return (
        <kbd key={key} className={`px-1.5 py-0.5 mx-0.5 rounded border border-b-2 font-mono text-[11px] font-semibold ${nt.kbd}`}>
          {content}
        </kbd>
      );
    default:
      return <React.Fragment key={key}>{content}</React.Fragment>;
  }
};

// Line-level new styles ------------------------------------------------------
// Returns null when the line is NOT a new style, so old behaviour continues untouched.
const renderNewLineStyle = (trimmedLine: string, keyId: string, nt: NT): React.ReactNode | null => {
  // Headings with different sizes:  [H1] Title   [H2:blue] Title   (H1 biggest ... H4 smallest)
  const hMatch = trimmedLine.match(/^\[H([1-4])(?::([a-z]+))?\]\s*(.*)$/i);
  if (hMatch) {
    const level = hMatch[1];
    const accent = nt.accents[(hMatch[2] || "amber").toLowerCase()] || nt.accents.amber;
    const text = processInlineStyles(hMatch[3], nt);
    if (level === "1") {
      return (
        <h3 key={`nh1-${keyId}`} className={`mt-6 mb-3 text-[22px] leading-tight font-black tracking-tight ${nt.ink900} flex items-center gap-2.5`}>
          <span className={`w-1.5 h-7 rounded-full inline-block shrink-0 ${accent.bar}`}></span>
          {text}
        </h3>
      );
    }
    if (level === "2") {
      return (
        <h4 key={`nh2-${keyId}`} className={`mt-5 mb-2.5 pb-1 text-[18px] leading-snug font-extrabold tracking-tight ${nt.ink900} border-b-2 ${accent.border}`}>
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
    const content = processInlineStyles(pMatch[2], nt);
    const cls: Record<string, string> = {
      LEAD:   `mb-3 text-[15px] leading-loose font-medium ${nt.ink800}`,
      LARGE:  `mb-2 text-[16px] leading-relaxed font-semibold ${nt.ink800}`,
      SMALL:  `mb-2 text-[11px] leading-relaxed ${nt.ink500}`,
      CENTER: `mb-2 text-[13px] leading-relaxed text-center ${nt.ink700}`,
      RIGHT:  `mb-2 text-[13px] leading-relaxed text-right ${nt.ink700}`,
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
      line:   `border-t ${nt.b300}`,
      dots:   `border-t-2 border-dotted ${nt.b300}`,
      dashed: `border-t-2 border-dashed ${nt.b300}`,
      thick:  `border-t-4 ${nt.b200} rounded-full`,
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
      "+": { icon: "+", cls: nt.bulletPlus },
      "-": { icon: "−", cls: nt.bulletMinus },
      ">": { icon: "→", cls: nt.bulletArrow },
      "*": { icon: "★", cls: nt.bulletStar },
    };
    const cfg = map[sym];
    return (
      <div key={`nb-${keyId}`} className={`flex items-start gap-2 mb-1.5 text-[13px] leading-relaxed ${nt.ink700} font-sans antialiased`}>
        <span className={`shrink-0 w-4 h-4 mt-0.5 rounded-full border text-[9px] font-black flex items-center justify-center ${cfg.cls}`}>{cfg.icon}</span>
        <span>{processInlineStyles(bMatch[2], nt)}</span>
      </div>
    );
  }

  // Checkbox lines:  [ ] to do   [x] done
  const cMatch = trimmedLine.match(/^\[( |x|X)\]\s+(.*)$/);
  if (cMatch) {
    const checked = cMatch[1].toLowerCase() === "x";
    return (
      <div key={`nc-${keyId}`} className="flex items-start gap-2 mb-1.5 text-[13px] leading-relaxed font-sans antialiased">
        <span className={`shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${checked ? "bg-emerald-600 border-emerald-600 text-white" : nt.checkOffPlain}`}>
          {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
        </span>
        <span className={checked ? `${nt.ink400} line-through` : nt.ink700}>{processInlineStyles(cMatch[2], nt)}</span>
      </div>
    );
  }

  return null;
};

// Block-level new styles --------------------------------------------------------
const renderNewBlock = (
  trimmedSection: string,
  secIndex: number,
  imageMap: Record<string, string>,
  nt: NT
): React.ReactNode | null => {
  const m = trimmedSection.match(NEW_BLOCK_PARSE_REGEX);
  if (!m) return null;

  const name = m[1];
  const customTitle = (m[2] || "").trim();
  const body = m[3].trim();
  const key = `nblk-${name}-${secIndex}`;

  // Plain coloured callout boxes (config driven)
  const meta = CALLOUT_META[name];
  if (meta) {
    const colors = nt.callouts[name];
    return (
      <div key={key} className={`my-3 p-3.5 rounded-xl border border-l-4 text-[13px] leading-relaxed ${colors.box}`}>
        <div className={`text-[10px] font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 select-none ${colors.title}`}>
          <span>{meta.icon}</span> {customTitle || meta.label}
        </div>
        <div className={`${nt.ink800} ${meta.center ? "text-center" : ""} ${meta.body || ""}`}>
          {renderNarrativeWithImages(body, imageMap, nt)}
        </div>
      </div>
    );
  }

  // Numbered step cards
  if (name === "STEPS") {
    const lines = bodyLines(body);
    return (
      <div key={key} className="my-3 space-y-2">
        {customTitle && <div className={`text-[10px] font-extrabold uppercase tracking-wider ${nt.ink500} select-none`}>{customTitle}</div>}
        {lines.map((line, idx) => (
          <div key={`${key}-s${idx}`} className={`flex items-start gap-3 p-2.5 rounded-lg border ${nt.stepCard}`}>
            <span className={`shrink-0 w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center ${nt.stepNum}`}>{idx + 1}</span>
            <span className={`text-[13px] leading-relaxed ${nt.ink700} pt-0.5`}>{processInlineStyles(line.replace(/^(\d+[.)]|[-*•])\s+/, ""), nt)}</span>
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
        {customTitle && <div className={`text-[10px] font-extrabold uppercase tracking-wider ${nt.ink500} mb-2 select-none`}>{customTitle}</div>}
        <div className={`border-l-2 ${nt.timelineLine} ml-1.5 space-y-3`}>
          {lines.map((line, idx) => {
            const pipe = line.indexOf("|");
            const label = pipe > -1 ? line.slice(0, pipe).trim() : "";
            const text = pipe > -1 ? line.slice(pipe + 1).trim() : line;
            return (
              <div key={`${key}-t${idx}`} className="relative pl-4">
                <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 ${nt.timelineDot}`}></span>
                {label && <div className={`text-[11px] font-black ${nt.timelineLabel} tracking-wide`}>{processInlineStyles(label, nt)}</div>}
                <div className={`text-[13px] leading-relaxed ${nt.ink700}`}>{processInlineStyles(text, nt)}</div>
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
      <div key={key} className={`my-3 p-3 rounded-xl border space-y-1.5 ${nt.checklistBox}`}>
        {customTitle && <div className={`text-[10px] font-extrabold uppercase tracking-wider ${nt.checklistTitle} select-none`}>{customTitle}</div>}
        {lines.map((line, idx) => (
          <div key={`${key}-c${idx}`} className={`flex items-start gap-2 text-[13px] leading-relaxed ${nt.ink700}`}>
            <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span>{processInlineStyles(line.replace(/^[-*•]\s+/, ""), nt)}</span>
          </div>
        ))}
      </div>
    );
  }

  // Click-to-reveal (great for answers)
  if (name === "TOGGLE") {
    return (
      <CollapsibleNote key={key} title={customTitle || "Click to reveal"}>
        {renderNarrativeWithImages(body, imageMap, nt)}
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
          <div key={`${key}-col${idx}`} className={`p-3 rounded-xl border ${nt.colBox}`}>
            {renderNarrativeWithImages(col, imageMap, nt)}
          </div>
        ))}
      </div>
    );
  }

  // Quote with author:  [QUOTE: Author] text [/QUOTE]
  if (name === "QUOTE") {
    return (
      <figure key={key} className={`my-4 pl-4 pr-3 py-2 border-l-4 rounded-r-xl ${nt.quoteBox}`}>
        <blockquote className={`text-[14px] leading-relaxed italic font-medium ${nt.ink800}`}>{processInlineStyles(body, nt)}</blockquote>
        {customTitle && <figcaption className={`mt-1 text-[11px] font-bold ${nt.amberStrong}`}>— {customTitle}</figcaption>}
      </figure>
    );
  }

  return null;
};

// ==========================================================================
// ORIGINAL INLINE STYLES (UNCHANGED LOGIC)
// ==========================================================================
const processBaseInline = (text: string, nt: NT): React.ReactNode => {
  if (!text) return "";
  const renderTextNodes = (rawStr: string): React.ReactNode[] => {
    const highlightRegex = /==([\s\S]*?)==/g;
    const subParts = rawStr.split(highlightRegex);
    return subParts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <mark key={`hl-${i}`} className={`${nt.mark} font-bold px-1 py-0.5 rounded-xs mx-0.5 border-b antialiased text-[12px]`}>
            {part}
          </mark>
        );
      }
      
      if (part.includes("$")) {
        const latexParts = part.split(/\$([\s\S]*?)\$/g);
        return latexParts.map((lPart, lIdx) => {
          if (lIdx % 2 === 1) {
            return (
              <span key={`latex-${lIdx}`} className={`font-serif italic font-medium ${nt.latex} px-1 py-0.5 rounded border tracking-wide mx-0.5 select-all`}>
                {lPart}
              </span>
            );
          }
          
          if (lPart.includes("**")) {
            const boldParts = lPart.split(/\*\*([\s\S]*?)\*\*/g);
            return boldParts.map((bPart, bIdx) => bIdx % 2 === 1 ? <strong key={`b-${bIdx}`} className={`font-extrabold ${nt.ink900}`}>{bPart}</strong> : bPart);
          }
          return lPart;
        });
      }
      
      if (part.includes("**")) {
        const boldParts = part.split(/\*\*([\s\S]*?)\*\*/g);
        return boldParts.map((bPart, bIdx) => bIdx % 2 === 1 ? <strong key={`b-${bIdx}`} className={`font-extrabold ${nt.ink900}`}>{bPart}</strong> : bPart);
      }
      
      return part;
    });
  };

  const splitByCode = text.split(/`([\s\S]*?)`/g);
  return splitByCode.map((segment, index) => {
    if (index % 2 === 1) {
      return (
        <code key={`code-${index}`} className={`${nt.code} font-mono font-semibold px-1.5 py-0.5 rounded text-[12px] border mx-0.5`}>
          {segment}
        </code>
      );
    }
    return <React.Fragment key={`text-seg-${index}`}>{renderTextNodes(segment)}</React.Fragment>;
  });
};

// NEW wrapper: handles {tag}...{/tag} first, then hands everything else to the
// original renderer above. If a text has no new tags the output is identical to before.
const processInlineStyles = (text: string, nt: NT): React.ReactNode => {
  if (!text) return "";
  if (!text.includes("{")) return processBaseInline(text, nt);

  const parts = text.split(INLINE_TAG_REGEX);
  if (parts.length === 1) return processBaseInline(text, nt);

  const out: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) {
      out.push(<React.Fragment key={`it-${i}`}>{processBaseInline(parts[i], nt)}</React.Fragment>);
    }
    const tagName = parts[i + 1];
    if (tagName !== undefined) {
      out.push(renderInlineTag(tagName, parts[i + 2] || "", `itag-${i}`, nt));
    }
  }
  return out;
};

const renderNarrativeWithImages = (text: string, imageMap: Record<string, string>, nt: NT): React.ReactNode => {
  if (!text) return null;

  // Same split as before, but now also recognises the new block names.
  const sections = text.split(ALL_BLOCK_REGEX).filter(Boolean);

  return sections.map((section, secIndex) => {
    const trimmedSection = section.trim();

    if (trimmedSection.startsWith("[EXAMPLE]") && trimmedSection.endsWith("[/EXAMPLE]")) {
      const exampleContent = section.replace("[EXAMPLE]", "").replace("[/EXAMPLE]", "").trim();
      return (
        <div key={`ex-block-${secIndex}`} className={`my-2 p-3 rounded-lg border text-[13px] leading-relaxed ${nt.exampleBox}`}>
          <div className={`text-[10px] font-extrabold uppercase tracking-wider ${nt.exampleTitle} mb-1 flex items-center gap-1.5 select-none`}>
            <span>💡</span> INTERACTIVE EXAMPLE
          </div>
          <div className="whitespace-pre-wrap">{processInlineStyles(exampleContent, nt)}</div>
        </div>
      );
    }

    if (trimmedSection.startsWith("[QUESTION]") && trimmedSection.endsWith("[/QUESTION]")) {
      const questionContent = section.replace("[QUESTION]", "").replace("[/QUESTION]", "").trim();
      return (
        <div key={`q-block-${secIndex}`} className={`my-2 p-3 rounded-lg border text-[13px] leading-relaxed ${nt.questionBox}`}>
          <div className={`text-[10px] font-extrabold uppercase tracking-wider ${nt.questionTitle} mb-1 flex items-center gap-1.5 select-none`}>
            <span>❓</span> PRACTICE CONCEPT BOX
          </div>
          <div className="whitespace-pre-wrap font-sans font-normal antialiased tracking-wide">{processInlineStyles(questionContent, nt)}</div>
        </div>
      );
    }

    if (trimmedSection.startsWith("[MOTIVATION]") && trimmedSection.endsWith("[/MOTIVATION]")) {
      const motivationContent = section.replace("[MOTIVATION]", "").replace("[/MOTIVATION]", "").trim();
      return (
        <div key={`mot-block-${secIndex}`} className={`my-3 p-3.5 rounded-xl border text-[13px] leading-relaxed ${nt.motivationBox}`}>
          <div className={`text-[10px] font-black uppercase tracking-widest ${nt.motivationTitle} mb-1.5 flex items-center gap-1.5 select-none`}>
            <Sparkles className={`w-3.5 h-3.5 ${nt.motivationIcon} animate-pulse`} /> ASPIRANT CORE INSIGHT
          </div>
          <div className={`whitespace-pre-wrap font-medium ${nt.motivationText} italic`}>{processInlineStyles(motivationContent, nt)}</div>
        </div>
      );
    }

    // ✨ NEW blocks ([NOTE], [TIP], [STEPS], [TOGGLE] ...)
    const newBlock = renderNewBlock(trimmedSection, secIndex, imageMap, nt);
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
          <div key={`table-wrapper-${keyIndex}`} className={`my-3 overflow-x-auto border rounded-lg max-w-full ${nt.tableWrap}`}>
            <table className="w-full text-left border-collapse text-[12px]">
              {tableHeaders.length > 0 && (
                <thead>
                  <tr className={`border-b ${nt.tableHead}`}>
                    {tableHeaders.map((h, idx) => (
                      <th key={`th-${idx}`} className={`p-2.5 font-bold border-r last:border-r-0 ${nt.th}`}>
                        {processInlineStyles(h, nt)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className={`border-b last:border-b-0 transition-colors ${nt.tr}`}>
                    {row.map((cell, cIdx) => (
                      <td key={`td-${cIdx}`} className={`p-2.5 font-medium border-r last:border-r-0 ${nt.td}`}>
                        {processInlineStyles(cell, nt)}
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
          <ol key={`ol-${keyIndex}`} className={`list-decimal pl-5 mb-3 space-y-1 ${nt.ink700} text-[13px] leading-relaxed font-sans antialiased`}>
            {activeOL}
          </ol>
        );
        activeOL = [];
      }
    };

    const flushUL = (keyIndex: string) => {
      if (activeUL.length > 0) {
        renderedElements.push(
          <ul key={`ul-${keyIndex}`} className={`list-disc pl-5 mb-3 space-y-1 ${nt.ink700} text-[13px] leading-relaxed font-sans antialiased`}>
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
          <hr key={`hr-${secIndex}-${i}`} className={`my-4 border-t ${nt.hr}`} />
        );
        continue;
      }

      // ✨ NEW line styles ([H1]..[H4], [LEAD], [CENTER], [DIVIDER], [+] ...)
      const newLineStyle = renderNewLineStyle(trimmedLine, `${secIndex}-${i}`, nt);
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
          <blockquote key={`quote-${secIndex}-${i}`} className={`my-3 pl-3 py-1 border-l-4 rounded-r-md text-[13px] leading-relaxed font-sans antialiased ${nt.quoteBlock}`}>
            {processInlineStyles(quoteContent, nt)}
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
          <h5 key={`h-${secIndex}-${i}`} className={`text-[14px] font-extrabold ${nt.ink900} mt-4 mb-2 pb-0.5 border-b ${nt.b100} tracking-tight flex items-center gap-2`}>
            <span className="w-1 h-3.5 bg-amber-500 rounded-xs inline-block"></span>
            {processInlineStyles(headerText, nt)}
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
            {processInlineStyles(liContent, nt)}
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
            {processInlineStyles(bulletContent, nt)}
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
                        className={`mx-auto rounded-lg border shadow-xs max-h-[300px] object-contain p-1 hover:scale-[1.01] transition-transform duration-200 ${nt.imgWrap}`}
                        loading="lazy"
                      />
                    </span>
                  );
                }
                return <span key={index} className={`text-[11px] font-mono border px-1.5 py-0.5 rounded ${nt.imgMissing}`}>Image Token Missing: "{part}"</span>;
              }
              return <React.Fragment key={index}>{processInlineStyles(part, nt)}</React.Fragment>;
            })}
          </div>
        );
        continue;
      }

      renderedElements.push(
        <p key={`p-${secIndex}-${i}`} className={`mb-2 ${nt.ink700} leading-relaxed text-[13px] font-sans font-normal antialiased tracking-wide`}>
          {processInlineStyles(line, nt)}
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
  const { theme } = useTheme();
  const nt = theme.notes;
  return (
    <div className={`flex items-center justify-between gap-4 p-1 rounded-xl border sticky top-0 z-30 shrink-0 ${nt.bar}`}>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {courseContentTree.map((sec) => {
          const isActive = activeSectionId === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSectionId(sec.id)}
              className={`px-3 py-1 text-xs font-bold tracking-tight rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive ? nt.segActive : nt.tabIdle
              }`}
            >
              <Book className={`w-3.5 h-3.5 ${isActive ? nt.tabIconActive : nt.tabIconIdle}`} />
              <span>{getLocalizedLabel(sec, contentLang)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* DARK / LIGHT THEME SWITCH */}
        <ThemeToggle />

        {/* NOTES LANGUAGE TOGGLE */}
        <div className={`flex items-center gap-0.5 border rounded-lg p-0.5 ${nt.chipWrap}`}>
          <Languages className={`w-3 h-3 ${nt.ink400} ml-1 mr-0.5`} />
          {LANGUAGE_OPTIONS.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => setContentLang(code)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                contentLang === code ? nt.segActive : nt.segIdle
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Opens the new full-screen reading workspace (FocusReader) */}
        <button
          onClick={() => setIsFullscreenMode(!isFullscreenMode)}
          className={`flex items-center gap-1.5 text-[11px] font-bold border px-2.5 py-1 rounded-lg transition-all ${nt.exitBtn}`}
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
  const { theme: appTheme } = useTheme();
  const nt = appTheme.notes;
  return (
    <div className={`border rounded-xl p-2.5 flex items-center justify-between gap-4 ${nt.bar}`}>
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border ${nt.subjectBadge[theme.key]}`}>
          {currentActiveSection.exams?.name || "ARCHIVES"}
        </span>
        <span className={`text-[11px] font-semibold ${nt.ink500}`}>Study Materials Blueprint</span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className={`text-[11px] font-bold ${nt.ink700} flex items-center gap-1`}>
          <Trophy className="w-3.5 h-3.5 text-amber-500" /> 
          <span>{metrics.done}/{metrics.total} Done</span>
        </div>
        <div className={`w-20 h-1 rounded-full overflow-hidden border ${nt.track}`}>
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
  const { theme } = useTheme();
  const nt = theme.notes;
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
    <div className={`border rounded-xl transition-all ${nt.card} ${isChapterComplete ? nt.cardBorderDone : nt.cardBorder}`}>
      <button
        onClick={() => onToggleChapter(chap.id)}
        className={`w-full flex items-center justify-between p-3 text-left transition-colors ${nt.chapHead}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {/* INSERT GATING CHECK CHIPS HERE */}
          {chap.required_plan && chap.required_plan !== 'free' && (
            <span className={`flex items-center gap-1 text-[8px] font-black tracking-wider uppercase px-1 py-0.5 rounded border shrink-0 ${nt.planChip}`}>
              <Lock className="w-2 h-2" />
              {chap.required_plan}
            </span>
          )}

          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide uppercase ${isChapterComplete ? nt.chBadgeDone : nt.chBadge}`}>
            {isChapterComplete ? "Done" : `CH ${chap.sequence_order}`}
          </span>
          <span className={`text-xs font-bold ${nt.ink800} truncate`}>{getLocalizedLabel(chap, contentLang)}</span>
          <span className={`text-[11px] ${nt.ink400} font-medium font-mono shrink-0`}>({doneInChapter}/{totalInChapter} Read)</span>
        </div>
        <div className={`${nt.ink400} shrink-0`}>
          {isLocked ? (
            <Lock className="w-4 h-4 text-amber-500" />
          ) : isExpanded ? (
            <ChevronDown className={`w-4 h-4 ${nt.ink800}`} />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {isExpanded && !isLocked && (
        <div className={`border-t flex h-[620px] relative overflow-hidden transition-all duration-300 ${nt.chapBody}`}>
          
          {/* 📖 TOPIC INDEX SIDEBAR */}
          <div 
            className={`border-r flex flex-col gap-1 p-1.5 overflow-y-auto transition-all duration-300 ease-in-out shrink-0 h-full select-none ${nt.idxPane} ${
              isSidebarOpen ? "w-1/4 opacity-100" : "w-0 !p-0 opacity-0 pointer-events-none"
            }`}
          >
            {totalInChapter === 0 ? (
              <div className={`p-3 text-[11px] ${nt.ink400} italic`}>No topics mapped.</div>
            ) : (
              totalTopics.map((topic: any) => {
                const isTopicActive = topic.id === activeTopicId;
                const isTopicDone = !!completedTopics[topic.id];
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopicIdMap(prev => ({ ...prev, [chap.id]: topic.id }))}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center justify-between gap-1.5 border ${
                      isTopicActive ? nt.idxActive : nt.idxIdle
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <div 
                        onClick={(e) => toggleTopicCompletion(topic.id, e)}
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isTopicDone ? "bg-emerald-600 border-emerald-600 text-white" : nt.checkOffPlain}`}
                      >
                        {isTopicDone && <Check className="w-2 h-2 stroke-[3]" />}
                      </div>
                      <span className={`truncate ${isTopicDone ? `${nt.ink400} line-through font-normal` : ""}`}>
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
              className={`w-5 h-10 border rounded-full flex items-center justify-center transition-all active:scale-95 ${nt.pillBtn}`}
            >
              {isSidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* HIGH VISIBILITY FOCUS CANVAS DISPLAY */}
          <div className={`overflow-y-auto p-4 md:p-5 flex flex-col scrollbar-thin h-full transition-all duration-300 ${nt.pane} ${
            isSidebarOpen ? "w-3/4" : "w-full"
          }`}>
            {currentActiveTopic ? (
              <div className="space-y-3 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <div className={`flex items-center justify-between border-b ${nt.b100} pb-2`}>
                    <h4 className={`text-xs md:text-sm font-extrabold ${nt.ink900} tracking-tight`}>{getLocalizedLabel(currentActiveTopic, contentLang)}</h4>
                    <button
                      onClick={(e) => toggleTopicCompletion(currentActiveTopic.id, e)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-all ${
                        completedTopics[currentActiveTopic.id] ? nt.doneBtn : nt.undoneBtnSoft
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${completedTopics[currentActiveTopic.id] ? nt.doneIconFill : nt.todoIcon}`} />
                      <span>{completedTopics[currentActiveTopic.id] ? "Completed" : "Mark Done"}</span>
                    </button>
                  </div>
                  
                  {contentLang !== "en" && !currentActiveTopic[`paragraph_text_${contentLang}`]?.trim() && (
                    <div className={`text-[10px] font-bold border px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 w-fit ${nt.notice}`}>
                      <Languages className="w-3 h-3" />
                      Translation not available yet -- showing English
                    </div>
                  )}
                  <div dir="auto" className={`text-[13px] leading-relaxed whitespace-pre-wrap pt-0.5 font-sans font-normal antialiased tracking-wide p-4 rounded-xl border select-text ${nt.contentBox}`}>
                    {renderNarrativeWithImages(getLocalizedParagraph(currentActiveTopic, contentLang), imageMap, nt)}
                  </div>

                  {currentActiveTopic.test_id && (
                    <div className={`mt-4 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${nt.testBoxSoft}`}>
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-mono font-bold tracking-wider ${nt.testLabel} uppercase block`}>Assessment Milestone</span>
                        <p className={`text-xs font-semibold ${nt.ink800}`}>An evaluation module has been linked to this target framework.</p>
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

                <div className={`pt-4 text-center border-t ${nt.b50} shrink-0`}>
                  <span className={`text-[9px] ${nt.ink300} tracking-widest font-bold uppercase block`}>End of Module Material</span>
                </div>
              </div>
            ) : (
              <div className={`m-auto text-center space-y-1 ${nt.ink400}`}>
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
  const { theme: appTheme } = useTheme();
  const nt = appTheme.notes;

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
      <div className={`text-center py-24 flex flex-col items-center justify-center gap-2 border rounded-2xl w-full max-w-5xl mx-auto ${nt.loadCard}`}>
        <Loader2 className={`animate-spin ${nt.ink800} w-7 h-7`} />
        <p className={`text-xs font-medium ${nt.ink600} tracking-wide`}>Assembling syllabus volumes...</p>
      </div>
    );
  }

  if (courseContentTree.length === 0) {
    return (
      <div className={`text-center py-20 rounded-2xl border border-dashed max-w-xl mx-auto px-6 ${nt.emptyCard}`}>
        <BookOpen className={`w-9 h-9 ${nt.ink400} mx-auto mb-2`} />
        <h3 className={`text-xs font-bold ${nt.ink800} mb-1`}>Library Volume Missing</h3>
        <p className={`text-[11px] ${nt.ink500} leading-relaxed`}>No lecture blueprints mapped onto this configuration yet.</p>
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
        renderContent={(text, map) => renderNarrativeWithImages(text, map, nt)}
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
                <div key={phase.id} className={`space-y-2.5 border rounded-xl p-3 ${nt.phaseBox}`}>
                  <div className="flex items-center gap-1.5 px-0.5">
                    <div className="w-1 h-3 bg-indigo-500 rounded-xs"></div>
                    <span className={`text-[10px] font-mono tracking-wider font-bold ${nt.ink400} uppercase`}>
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