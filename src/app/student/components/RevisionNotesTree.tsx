// src/app/student/components/RevisionNotesTree.tsx
"use client";
import React, { useState, useEffect, useMemo } from "react";

import { 
  Loader2, ChevronDown, ChevronRight, BookOpen, Edit3, 
  Save, CheckCircle, Trash2, Check, 
  Trophy, Book, FileText, CheckCircle2, Maximize2, Minimize2,
  ChevronLeft, Sparkles, ExternalLink
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import StudyDesk from "./StudyDesk";

// ==========================================
// TYPES & THEMES TYPES
// ==========================================
interface RevisionNotesTreeProps {
  loadingNotes: boolean;
  courseContentTree: any[];
  expandedChapters: Record<string, boolean>;
  onToggleChapter: (chapterId: string) => void;
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

// ==========================================
// HOOKS & ENGINE UTILS
// ==========================================
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

const processInlineStyles = (text: string): React.ReactNode => {
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

const renderNarrativeWithImages = (text: string, imageMap: Record<string, string>) => {
  if (!text) return null;

  const blockRegex = /(\[EXAMPLE\][\s\S]*?\[\/EXAMPLE\]|\[QUESTION\][\s\S]*?\[\/QUESTION\]|\[MOTIVATION\][\s\S]*?\[\/MOTIVATION\])/g;
  const sections = text.split(blockRegex).filter(Boolean);

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

    // Process regular text blocks line by line safely accumulating arrays of lists/tables
    const lines = section.split(/\r?\n/);
    let lastRenderedHeader = "";
    
    // Accumulator Buffers for List and Table structures
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    let activeOL: React.ReactNode[] = [];
    let activeUL: React.ReactNode[] = [];
    const renderedElements: React.ReactNode[] = [];

    // Helper: Flush structural tables cleanly to final workspace array
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

    // Helper: Flush accumulated Ordered Lists cleanly
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

    // Helper: Flush accumulated Unordered Bullet Lists cleanly
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

      // 1. Process Markdown Table Tokens
      if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
        flushOL(`${secIndex}-${i}`);
        flushUL(`${secIndex}-${i}`);
        inTable = true;
        
        const cells = line.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (cells.every(cell => /^:-*-*:*|-+$/.test(cell))) {
          continue; // Skip structural syntax dividers
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
        // Empty lines break any currently open lists cleanly
        flushOL(`${secIndex}-${i}`);
        flushUL(`${secIndex}-${i}`);
        continue;
      }

      // 2. Process Horizontal Section Splitters Token
      if (trimmedLine === "---") {
        flushOL(`${secIndex}-${i}`);
        flushUL(`${secIndex}-${i}`);
        renderedElements.push(
          <hr key={`hr-${secIndex}-${i}`} className="my-4 border-t border-slate-200/80" />
        );
        continue;
      }

      // 3. Process Left Accent Quote Block Token
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

      // 4. Process Standalone Header Token
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

      // 5. Process Ordered Sequential Lists Token (e.g., "1. Place Value")
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

      // 6. Process Unordered Standard Bullet List Tokens (e.g., "* Text" or "- Text")
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

      // If text reaches here, it is plain sentence rows. Flush any running sub-lists first.
      flushOL(`${secIndex}-${i}`);
      flushUL(`${secIndex}-${i}`);

      // 7. Process Database Media Graphics Library Shortcode Asset
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

      // 8. Normal Standalone Notes Paragraph Element
      renderedElements.push(
        <p key={`p-${secIndex}-${i}`} className="mb-2 text-slate-700 leading-relaxed text-[13px] font-sans font-normal antialiased tracking-wide">
          {processInlineStyles(line)}
        </p>
      );
    }

    // Safety fallback flush sequences at closure boundary loops
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
}

const CourseSwitcher: React.FC<CourseSwitcherProps> = ({
  courseContentTree,
  activeSectionId,
  setActiveSectionId,
  isFullscreenMode,
  setIsFullscreenMode
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
              <span>{sec.name}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setIsFullscreenMode(!isFullscreenMode)}
        className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-lg transition-all"
      >
        {isFullscreenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        <span>{isFullscreenMode ? "Minimize" : "Focus Canvas"}</span>
      </button>
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
  toggleTopicCompletion: (id: string, e: React.MouseEvent) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  imageMap: Record<string, string>;
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
  imageMap
}) => {
  const totalTopics = chap.notes_topics || [];
  const totalInChapter = totalTopics.length;
  const doneInChapter = totalTopics.filter((t: any) => completedTopics[t.id]).length;
  const isChapterComplete = totalInChapter > 0 && totalInChapter === doneInChapter;

  const activeTopicId = selectedTopicIdMap[chap.id] || (totalTopics[0]?.id || "");
  const currentActiveTopic = totalTopics.find((t: any) => t.id === activeTopicId);

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
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide uppercase ${isChapterComplete ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-700 bg-white border-slate-200"}`}>
            {isChapterComplete ? "Done" : `CH ${chap.sequence_order}`}
          </span>
          <span className="text-xs font-bold text-slate-800 truncate">{chap.name}</span>
          <span className="text-[11px] text-slate-400 font-medium font-mono shrink-0">({doneInChapter}/{totalInChapter} Read)</span>
        </div>
        <div className="text-slate-400 shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-800" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
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
                        {topic.sequence_order}. {topic.name}
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
                    <h4 className="text-xs md:text-sm font-extrabold text-slate-900 tracking-tight">{currentActiveTopic.name}</h4>
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
                  
                  <div className="text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap pt-0.5 font-sans font-normal antialiased tracking-wide bg-stone-50/30 p-4 rounded-xl border border-stone-100/60 select-text">
                    {renderNarrativeWithImages(currentActiveTopic.paragraph_text, imageMap)}
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
}: RevisionNotesTreeProps) {
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [selectedTopicIdMap, setSelectedTopicIdMap] = useState<Record<string, string>>({});
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  
  // Track current unique authenticated student session identifier state
  const [studentId, setStudentId] = useState<string>("");

  useEffect(() => {
    if (expandedChapters) {
      const currentlyOpen = Object.keys(expandedChapters).find(key => expandedChapters[key] === true);
      setOpenChapterId(currentlyOpen || null);
    }
  }, [expandedChapters]);

  // 1. Fetch current logged in student session identity from Supabase Auth Client
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

  // 2. Hydrate user progress strictly matching the authenticated student identifier
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
      // Clear or reset context out cleanly if student session alternates
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
    return getSubjectTheme(currentActiveSection?.name);
  }, [currentActiveSection?.name]);

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

  const toggleTopicCompletion = (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedProgress = { ...completedTopics, [topicId]: !completedTopics[topicId] };
    setCompletedTopics(updatedProgress);
    
    // Write out dynamically using the explicit unique student identifier storage key link
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

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-4 gap-3 items-stretch w-full transition-all duration-300 ${
      isFullscreenMode ? "fixed inset-2 z-50 bg-[#FDFBF7] p-3 rounded-2xl border shadow-2xl h-[calc(100vh-16px)]" : "h-[calc(100vh-140px)]"
    }`}>
      <div className="lg:col-span-3 overflow-hidden h-full flex flex-col space-y-2">
        <CourseSwitcher 
          courseContentTree={courseContentTree} 
          activeSectionId={activeSectionId} 
          setActiveSectionId={setActiveSectionId} 
          isFullscreenMode={isFullscreenMode} 
          setIsFullscreenMode={setIsFullscreenMode} 
        />
        {currentActiveSection && (
          <div className="flex-grow overflow-y-auto pr-0.5 space-y-4 scrollbar-thin">
            <MilestoneDashboard currentActiveSection={currentActiveSection} theme={theme} metrics={metrics} />
            <div className="space-y-4 pb-2">
              {currentActiveSection.notes_phases?.map((phase: any) => (
                <div key={phase.id} className="space-y-2.5 bg-[#f8fafc]/50 border border-slate-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 px-0.5">
                    <div className="w-1 h-3 bg-indigo-500 rounded-xs"></div>
                    <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">
                      Phase {phase.sequence_order}: {phase.name}
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
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-1 h-full min-h-[480px]">
        <StudyDesk currentSection={currentActiveSection?.name || "the current topic"} />
      </div>
    </div>
  );
}