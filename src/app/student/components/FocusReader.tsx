// src/app/student/components/FocusReader.tsx
"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ChevronDown, ChevronRight, ChevronLeft, Check, CheckCircle2, Lock,
  Minimize2, Sparkles, Languages, ExternalLink, Search, PanelLeftClose,
  PanelLeftOpen, X, Trophy, Clock, ArrowRight, Type, Keyboard,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import ThemeToggle from "../theme/ThemeToggle";

type ContentLang = "en" | "hi" | "mr";

interface FocusReaderProps {
  courseContentTree: any[];
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
  contentLang: ContentLang;
  setContentLang: (l: ContentLang) => void;
  languageOptions: { code: ContentLang; label: string }[];
  completedTopics: Record<string, boolean>;
  onToggleComplete: (topicId: string) => void;
  imageMap: Record<string, string>;
  studentPlan: string;
  planHierarchy: Record<string, number>;
  getLabel: (obj: any, lang: ContentLang) => string;
  getParagraph: (topic: any, lang: ContentLang) => string;
  renderContent: (text: string, imageMap: Record<string, string>) => React.ReactNode;
  initialChapterId?: string | null;
  initialTopicId?: string | null;
  /** Receives a close() callback so the AI panel can render its own close button */
  aiPanel: (close: () => void) => React.ReactNode;
  onExit: (pos: { chapterId: string; topicId: string } | null) => void;
}

// ---- layout constants ----
const MIN_SCALE = 0.9;
const MAX_SCALE = 1.5;
const NAV_MIN = 200;
const NAV_MAX = 520;
const NAV_DEFAULT = 400;
const AI_MIN = 300;
const AI_MAX = 800;
const AI_DEFAULT = 380;
const MIN_CENTER = 360; // the reader never gets narrower than this
const KEY_STEP = 16;


// "Phase 1: Speed Booster" already contains its own prefix -> don't print it twice.
const hasPrefix = (label: string, word: string) =>
  new RegExp(`^\\s*${word}\\s*\\d+`, "i").test(label || "");

export default function FocusReader({
  courseContentTree, activeSectionId, setActiveSectionId,
  contentLang, setContentLang, languageOptions,
  completedTopics, onToggleComplete, imageMap,
  studentPlan, planHierarchy, getLabel, getParagraph, renderContent,
  initialTopicId, aiPanel, onExit,
}: FocusReaderProps) {
  // ---- theme: every color on this page comes from theme.notes ----
  const { theme } = useTheme();
  const nt = theme.notes;

  const [activeTopicId, setActiveTopicId] = useState<string>("");
  const [navOpen, setNavOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [query, setQuery] = useState("");
  const [navChapters, setNavChapters] = useState<Record<string, boolean>>({});
  const [readPct, setReadPct] = useState(0);
  const [fontScale, setFontScale] = useState(1.15);

  // resizable panes
  const [navWidth, setNavWidth] = useState(NAV_DEFAULT);
  const [aiWidth, setAiWidth] = useState(AI_DEFAULT);
  const [dragging, setDragging] = useState<null | "nav" | "ai">(null);
  const dragRef = useRef<{ side: "nav" | "ai"; startX: number; startW: number } | null>(null);

  const scrollRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // ---------- derived data ----------
  const section = useMemo(
    () => courseContentTree.find((s) => s.id === activeSectionId),
    [courseContentTree, activeSectionId]
  );

  const isChapterLocked = useCallback(
    (chap: any) => {
      const sw = planHierarchy[studentPlan?.toLowerCase() || "free"] || 1;
      const rw = planHierarchy[chap?.required_plan?.toLowerCase() || "free"] || 1;
      return sw < rw;
    },
    [studentPlan, planHierarchy]
  );

  // Flat, ordered list of every readable topic in this subject (locked chapters skipped)
  const flat = useMemo(() => {
    const out: { topic: any; chap: any; phase: any }[] = [];
    section?.notes_phases?.forEach((phase: any) =>
      phase.notes_chapters?.forEach((chap: any) => {
        if (isChapterLocked(chap)) return;
        chap.notes_topics?.forEach((topic: any) => out.push({ topic, chap, phase }));
      })
    );
    return out;
  }, [section, isChapterLocked]);

  const index = flat.findIndex((f) => f.topic.id === activeTopicId);
  const current = index >= 0 ? flat[index] : null;
  const prevItem = index > 0 ? flat[index - 1] : null;
  const nextItem = index >= 0 && index < flat.length - 1 ? flat[index + 1] : null;

  const doneCount = flat.filter((f) => completedTopics[f.topic.id]).length;
  const totalCount = flat.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const paragraph = current ? getParagraph(current.topic, contentLang) : "";
  const readMins = useMemo(() => {
    const words = paragraph.replace(/\[[^\]]*\]|[{}*=`$|]/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 180));
  }, [paragraph]);

  const missingTranslation =
    !!current && contentLang !== "en" && !current.topic[`paragraph_text_${contentLang}`]?.trim();

  // label helpers (no duplicate "Phase 1: Phase 1:" / "1. Chapter 1:")
  const phaseTitle = (phase: any) => {
    const l = getLabel(phase, contentLang);
    return hasPrefix(l, "phase") ? l : `Phase ${phase.sequence_order}: ${l}`;
  };
  const chapterTitle = (chap: any) => {
    const l = getLabel(chap, contentLang);
    return hasPrefix(l, "chapter") ? l : `Chapter ${chap.sequence_order}: ${l}`;
  };
  const chapterNavTitle = (chap: any) => {
    const l = getLabel(chap, contentLang);
    return hasPrefix(l, "chapter") ? l : `${chap.sequence_order}. ${l}`;
  };

  // ---------- pane sizing ----------
  const clampNav = useCallback((w: number, ai: number, aiVisible: boolean) => {
    const total = bodyRef.current?.clientWidth ?? 1400;
    const maxByCenter = total - (aiVisible ? ai : 0) - MIN_CENTER;
    return Math.max(NAV_MIN, Math.min(NAV_MAX, maxByCenter, w));
  }, []);

  const clampAi = useCallback((w: number, nav: number, navVisible: boolean) => {
    const total = bodyRef.current?.clientWidth ?? 1400;
    const maxByCenter = total - (navVisible ? nav : 0) - MIN_CENTER;
    return Math.max(AI_MIN, Math.min(AI_MAX, maxByCenter, w));
  }, []);

  // restore saved widths
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("focus_pane_widths") || "null");
      if (saved?.nav) setNavWidth(Math.max(NAV_MIN, Math.min(NAV_MAX, saved.nav)));
      if (saved?.ai) setAiWidth(Math.max(AI_MIN, Math.min(AI_MAX, saved.ai)));
    } catch {}
  }, []);

  // save widths once a drag finishes
  useEffect(() => {
    if (dragging) return;
    try { localStorage.setItem("focus_pane_widths", JSON.stringify({ nav: navWidth, ai: aiWidth })); } catch {}
  }, [dragging, navWidth, aiWidth]);

  // drag handling
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      if (d.side === "nav") setNavWidth(clampNav(d.startW + dx, aiWidth, aiOpen));
      else setAiWidth(clampAi(d.startW - dx, navWidth, navOpen));
    };
    const up = () => { dragRef.current = null; setDragging(null); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, aiWidth, navWidth, aiOpen, navOpen, clampNav, clampAi]);

  // keep panes sane when the window itself is resized
  useEffect(() => {
    const onResize = () => {
      setNavWidth((w) => clampNav(w, aiWidth, aiOpen));
      setAiWidth((w) => clampAi(w, navWidth, navOpen));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [aiWidth, navWidth, aiOpen, navOpen, clampNav, clampAi]);

  // opening a panel must not squeeze the reader below its minimum
  useEffect(() => {
    if (aiOpen) {
      setAiWidth((w) => clampAi(w, navWidth, navOpen));
      setNavWidth((w) => clampNav(w, aiWidth, true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiOpen]);

  const startDrag = (side: "nav" | "ai") => (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = { side, startX: e.clientX, startW: side === "nav" ? navWidth : aiWidth };
    setDragging(side);
  };

  const handleKeyResize = (side: "nav" | "ai") => (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    e.stopPropagation();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    if (side === "nav") setNavWidth((w) => clampNav(w + dir * KEY_STEP, aiWidth, aiOpen));
    else setAiWidth((w) => clampAi(w - dir * KEY_STEP, navWidth, navOpen));
  };

  const renderHandle = (side: "nav" | "ai") => (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={side === "nav" ? "Resize contents panel" : "Resize AI-Guruji panel"}
      aria-valuenow={side === "nav" ? navWidth : aiWidth}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={startDrag(side)}
      onDoubleClick={() => (side === "nav" ? setNavWidth(NAV_DEFAULT) : setAiWidth(AI_DEFAULT))}
      onKeyDown={handleKeyResize(side)}
      className="group hidden md:flex relative shrink-0 w-2 -mx-[3px] z-20 cursor-col-resize items-stretch justify-center touch-none focus:outline-none"
    >
      <span
        className={`w-px transition-all ${
          dragging === side ? "w-0.5 bg-amber-500" : nt.handleLine
        }`}
      />
      <span
        className={`absolute top-1/2 -translate-y-1/2 h-10 w-1.5 rounded-full transition-colors ${
          dragging === side ? "bg-amber-500" : nt.handleGrip
        }`}
      />
    </div>
  );

  // ---------- effects ----------
  // Pick the starting topic: requested -> last viewed -> first unread -> first
  useEffect(() => {
    if (!flat.length) { setActiveTopicId(""); return; }
    if (activeTopicId && flat.some((f) => f.topic.id === activeTopicId)) return;
    let pick = initialTopicId ? flat.find((f) => f.topic.id === initialTopicId) : undefined;
    if (!pick) {
      try {
        const saved = localStorage.getItem(`focus_last_topic_${activeSectionId}`);
        if (saved) pick = flat.find((f) => f.topic.id === saved);
      } catch {}
    }
    if (!pick) pick = flat.find((f) => !completedTopics[f.topic.id]) || flat[0];
    setActiveTopicId(pick.topic.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat, activeSectionId]);

  // Remember position, keep nav expanded on the active chapter, reset scroll
  useEffect(() => {
    if (!activeTopicId) return;
    try { localStorage.setItem(`focus_last_topic_${activeSectionId}`, activeTopicId); } catch {}
    if (current) setNavChapters((p) => ({ ...p, [current.chap.id]: true }));
    scrollRef.current?.scrollTo({ top: 0 });
    setReadPct(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopicId]);

  // Font scale persistence
  useEffect(() => {
    try {
      const s = parseFloat(localStorage.getItem("notes_font_scale") || "");
      if (!isNaN(s) && s >= MIN_SCALE && s <= MAX_SCALE) setFontScale(s);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("notes_font_scale", String(fontScale)); } catch {}
  }, [fontScale]);

  // Phones start with the index closed; page behind never scrolls
  useEffect(() => {
    if (window.innerWidth < 768) setNavOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const goTo = useCallback((id: string) => {
    setActiveTopicId(id);
    if (typeof window !== "undefined" && window.innerWidth < 768) setNavOpen(false);
  }, []);

  const exit = useCallback(() => {
    onExit(current ? { chapterId: current.chap.id, topicId: current.topic.id } : null);
  }, [onExit, current]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") { showKeys ? setShowKeys(false) : exit(); return; }
      // arrows on a focused resize handle belong to the handle
      if (t?.getAttribute?.("role") === "separator") return;
      if (e.key === "ArrowRight" && nextItem) goTo(nextItem.topic.id);
      else if (e.key === "ArrowLeft" && prevItem) goTo(prevItem.topic.id);
      else if (e.key === "[") setNavOpen((v) => !v);
      else if (e.key === "]") setAiOpen((v) => !v);
      else if (e.key.toLowerCase() === "m" && current) onToggleComplete(current.topic.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextItem, prevItem, current, goTo, exit, onToggleComplete, showKeys]);

  const onScroll = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setReadPct(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 100);
  };

  const markDoneAndNext = () => {
    if (!current) return;
    if (!completedTopics[current.topic.id]) onToggleComplete(current.topic.id);
    if (nextItem) goTo(nextItem.topic.id);
  };

  const q = query.trim().toLowerCase();

  // ---------- render ----------
  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${nt.focusRoot}`}>
      {/* ===== TOP BAR ===== */}
      {/* relative + z-40: the header (and its shortcuts popover) must sit ABOVE the body panes */}
      <header className={`relative z-40 shrink-0 h-12 flex items-center gap-2 px-2 md:px-3 border-b backdrop-blur ${nt.focusHeader}`}>
        <button
          onClick={() => setNavOpen((v) => !v)}
          title="Toggle contents  [ [ ]"
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${nt.iconBtn}`}
        >
          {navOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0 flex-1">
          {courseContentTree.map((sec) => {
            const active = sec.id === activeSectionId;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSectionId(sec.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                  active ? nt.segActive : nt.sectionTabIdle
                }`}
              >
                {getLabel(sec, contentLang)}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* progress (desktop) */}
          <div className="hidden lg:flex items-center gap-2 mr-1" title={`${doneCount} of ${totalCount} topics done`}>
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className={`text-[11px] font-bold ${nt.ink600}`}>{doneCount}/{totalCount}</span>
            <div className={`w-20 h-1.5 rounded-full overflow-hidden border ${nt.trackStone}`}>
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* text size */}
          <div className={`hidden sm:flex items-center border rounded-lg p-0.5 ${nt.chipWrap}`}>
            <button
              onClick={() => setFontScale((s) => Math.max(MIN_SCALE, +(s - 0.1).toFixed(2)))}
              disabled={fontScale <= MIN_SCALE}
              title="Smaller text"
              className={`px-1.5 py-1 rounded-md disabled:opacity-30 ${nt.chipBtn}`}
            >
              <Type className="w-3 h-3" />
            </button>
            <span className={`text-[10px] font-bold w-8 text-center select-none ${nt.ink500}`}>{Math.round(fontScale * 100)}%</span>
            <button
              onClick={() => setFontScale((s) => Math.min(MAX_SCALE, +(s + 0.1).toFixed(2)))}
              disabled={fontScale >= MAX_SCALE}
              title="Larger text"
              className={`px-1.5 py-1 rounded-md disabled:opacity-30 ${nt.chipBtn}`}
            >
              <Type className="w-4 h-4" />
            </button>
          </div>

          {/* language */}
          <div className={`flex items-center gap-0.5 border rounded-lg p-0.5 ${nt.chipWrap}`}>
            <Languages className={`w-3 h-3 ml-1 mr-0.5 hidden sm:block ${nt.ink400}`} />
            {languageOptions.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setContentLang(code)}
                className={`px-1.5 sm:px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  contentLang === code ? nt.segActive : nt.segIdle
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* DARK / LIGHT THEME SWITCH (same control as the dashboard) */}
          <ThemeToggle />

          {/* keyboard shortcuts */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowKeys((v) => !v)}
              title="Keyboard shortcuts"
              className={`p-1.5 rounded-lg transition-colors ${nt.iconBtnSoft}`}
            >
              <Keyboard className="w-4 h-4" />
            </button>
            {showKeys && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowKeys(false)} />
                <div className={`absolute right-0 top-full mt-1.5 z-50 w-60 p-3 rounded-xl border text-[11px] space-y-1.5 ${nt.popover}`}>
                  <div className={`text-[10px] font-extrabold uppercase tracking-wider mb-1 ${nt.ink400}`}>Shortcuts</div>
                  {[
                    ["← / →", "Previous / next topic"],
                    ["M", "Mark topic done"],
                    ["[", "Show / hide contents"],
                    ["]", "Show / hide AI-Guruji"],
                    ["Esc", "Exit focus mode"],
                  ].map(([k, d]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <kbd className={`px-1.5 py-0.5 rounded border border-b-2 font-mono text-[10px] font-semibold ${nt.kbd}`}>{k}</kbd>
                      <span>{d}</span>
                    </div>
                  ))}
                  <div className={`pt-1.5 mt-1 border-t ${nt.popFooter}`}>
                    Drag the panel dividers to resize. Double-click a divider to reset it.
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setAiOpen((v) => !v)}
            title="Ask AI-Guruji  [ ] ]"
            className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
              aiOpen ? "bg-amber-500 text-stone-950 border-amber-500" : nt.aiIdle
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI-Guruji</span>
          </button>

          <button
            onClick={exit}
            title="Exit focus mode  [Esc]"
            className={`flex items-center gap-1.5 text-[11px] font-bold border px-2 py-1.5 rounded-lg transition-all ${nt.exitBtn}`}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* reading progress hairline */}
      <div className={`h-0.5 shrink-0 ${nt.trackStone2}`}>
        <div className="h-full bg-amber-500 transition-[width] duration-150" style={{ width: `${readPct}%` }} />
      </div>

      {/* ===== BODY ===== */}
      <div ref={bodyRef} className="flex flex-1 min-h-0 relative">
        {/* mobile backdrop */}
        {navOpen && <div className="md:hidden absolute inset-0 z-20 bg-black/30" onClick={() => setNavOpen(false)} />}

        {/* ---- LEFT: CONTENTS ---- */}
        <aside
          style={{ "--nav-w": `${navWidth}px` } as React.CSSProperties}
          className={`${navOpen ? "flex" : "hidden"} flex-col shrink-0 ${nt.navAside}
            absolute md:static inset-y-0 left-0 z-30 w-[85%] max-w-xs md:max-w-none md:w-[var(--nav-w)]
            shadow-xl md:shadow-none border-r md:border-r-0`}
        >
          <div className={`p-3 border-b space-y-2.5 shrink-0 ${nt.bStone100}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-extrabold uppercase tracking-widest ${nt.ink400}`}>Contents</span>
              <button onClick={() => setNavOpen(false)} className={`md:hidden p-1 rounded ${nt.iconBtnSoft}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${nt.ink400}`} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics..."
                className={`w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border focus:outline-none transition-colors ${nt.ink800} ${nt.searchInput}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${nt.trackStone2}`}>
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-[10px] font-bold ${nt.ink500}`}>{doneCount}/{totalCount}</span>
            </div>
          </div>

          {/* extra bottom padding keeps the last items clear of dev overlays / browser UI */}
          <nav className="flex-1 overflow-y-auto p-2 pb-16 space-y-3 scrollbar-thin">
            {section?.notes_phases?.map((phase: any) => {
              const chaps = (phase.notes_chapters || [])
                .map((chap: any) => {
                  const topics = chap.notes_topics || [];
                  const shown = q ? topics.filter((t: any) => getLabel(t, contentLang).toLowerCase().includes(q)) : topics;
                  return { chap, topics, shown };
                })
                .filter((c: any) => !q || c.shown.length > 0);
              if (!chaps.length) return null;

              return (
                <div key={phase.id} className="space-y-1">
                  <div className={`px-2 flex items-start gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider leading-snug ${nt.ink400}`}>
                    <span className="w-1 h-3 mt-px bg-indigo-500 rounded-sm shrink-0" />
                    <span>{phaseTitle(phase)}</span>
                  </div>

                  {chaps.map(({ chap, topics, shown }: any) => {
                    const locked = isChapterLocked(chap);
                    const open = q ? true : !!navChapters[chap.id];
                    const done = topics.filter((t: any) => completedTopics[t.id]).length;
                    const complete = topics.length > 0 && done === topics.length;
                    return (
                      <div key={chap.id} className="rounded-lg">
                        <button
                          onClick={() => !locked && setNavChapters((p) => ({ ...p, [chap.id]: !p[chap.id] }))}
                          className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                            locked ? "opacity-70 cursor-not-allowed" : nt.rowHover
                          }`}
                        >
                          <span className={`shrink-0 mt-0.5 ${nt.ink400}`}>
                            {locked ? <Lock className="w-3.5 h-3.5 text-amber-500" />
                              : open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-xs font-bold leading-snug line-clamp-2 ${nt.ink800}`}>
                              {complete && <Check className={`inline w-3 h-3 mr-1 stroke-[3] ${nt.doneText}`} />}
                              {chapterNavTitle(chap)}
                            </span>
                            {locked ? (
                              <span className={`block text-[10px] font-bold uppercase tracking-wide ${nt.amberText}`}>
                                {chap.required_plan} plan
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 mt-1">
                                <span className={`flex-1 h-1 rounded-full overflow-hidden ${nt.trackStone2}`}>
                                  <span
                                    className="block h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${topics.length ? (done / topics.length) * 100 : 0}%` }}
                                  />
                                </span>
                                <span className={`text-[10px] font-mono ${nt.ink400}`}>{done}/{topics.length}</span>
                              </span>
                            )}
                          </span>
                        </button>

                        {open && !locked && (
                          <div className={`ml-3 pl-2 border-l mt-0.5 mb-1.5 space-y-0.5 ${nt.bStone200}`}>
                            {shown.length === 0 && (
                              <div className={`px-2 py-1 text-[11px] italic ${nt.ink400}`}>No topics mapped.</div>
                            )}
                            {shown.map((topic: any) => {
                              const isActive = topic.id === activeTopicId;
                              const isDone = !!completedTopics[topic.id];
                              return (
                                <div
                                  key={topic.id}
                                  className={`flex items-start gap-2 pr-2 rounded-md border-l-2 transition-colors ${
                                    isActive ? nt.rowActive : `border-transparent ${nt.rowHover}`
                                  }`}
                                >
                                  <button
                                    onClick={() => onToggleComplete(topic.id)}
                                    title={isDone ? "Mark as unread" : "Mark as done"}
                                    className={`ml-1.5 mt-2 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                      isDone ? "bg-emerald-600 border-emerald-600 text-white" : nt.checkOff
                                    }`}
                                  >
                                    {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </button>
                                  <button
                                    onClick={() => goTo(topic.id)}
                                    className={`flex-1 min-w-0 text-left py-1.5 text-[12px] leading-snug ${
                                      isActive ? `font-bold ${nt.ink900}`
                                        : isDone ? nt.ink400 : `${nt.ink600} font-medium`
                                    }`}
                                  >
                                    <span className="block line-clamp-2">{getLabel(topic, contentLang)}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        {navOpen && renderHandle("nav")}

        {/* ---- CENTER: READER ---- */}
        <main ref={scrollRef} onScroll={onScroll} className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
          {current ? (
            <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 md:py-10" style={{ zoom: fontScale } as React.CSSProperties}>
              {/* header */}
              <div className="mb-5">
                <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-extrabold uppercase tracking-wider ${nt.ink400}`}>
                  <span>{phaseTitle(current.phase)}</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  <span className={nt.amberStrong}>{chapterTitle(current.chap)}</span>
                </div>

                <h1 dir="auto" className={`mt-2 text-2xl md:text-[28px] leading-tight font-black tracking-tight ${nt.ink900}`}>
                  {getLabel(current.topic, contentLang)}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`text-[11px] font-bold border px-2 py-0.5 rounded-full ${nt.pill}`}>
                    Topic {index + 1} of {totalCount}
                  </span>
                  <span className={`text-[11px] font-bold border px-2 py-0.5 rounded-full flex items-center gap-1 ${nt.pill}`}>
                    <Clock className="w-3 h-3" /> {readMins} min read
                  </span>
                  <button
                    onClick={() => onToggleComplete(current.topic.id)}
                    className={`ml-auto text-[11px] px-3 py-1 rounded-full border font-bold flex items-center gap-1.5 transition-all ${
                      completedTopics[current.topic.id] ? nt.doneBtn : nt.undoneBtn
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${completedTopics[current.topic.id] ? nt.doneIcon : nt.todoIcon}`} />
                    {completedTopics[current.topic.id] ? "Completed" : "Mark done"}
                  </button>
                </div>

                {missingTranslation && (
                  <div className={`mt-3 text-[10px] font-bold border px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${nt.notice}`}>
                    <Languages className="w-3 h-3" />
                    Translation not available yet -- showing English
                  </div>
                )}
              </div>

              {/* content */}
              <article
                dir="auto"
                className={`rounded-2xl border p-5 md:p-8 text-[13px] leading-relaxed whitespace-pre-wrap font-sans antialiased tracking-wide select-text ${nt.article}`}
              >
                {renderContent(paragraph, imageMap)}
              </article>

              {/* linked test */}
              {current.topic.test_id && (
                <div className={`mt-5 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${nt.testBox}`}>
                  <div className="space-y-0.5">
                    <span className={`text-[10px] font-mono font-bold tracking-wider uppercase block ${nt.testLabel}`}>Assessment Milestone</span>
                    <p className={`text-xs font-semibold ${nt.ink800}`}>Test what you just learned with the linked evaluation.</p>
                  </div>
                  <button
                    onClick={() => window.open(`/student/tests/${current.topic.test_id}`, "_blank")}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    Launch Linked Test <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* prev / next */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prevItem ? (
                  <button
                    onClick={() => goTo(prevItem.topic.id)}
                    className={`group text-left p-3.5 rounded-2xl border transition-all ${nt.navCard}`}
                  >
                    <span className={`flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider ${nt.ink400}`}>
                      <ChevronLeft className="w-3 h-3" /> Previous
                    </span>
                    <span className={`block mt-1 text-[13px] font-bold truncate ${nt.ink800}`}>{getLabel(prevItem.topic, contentLang)}</span>
                  </button>
                ) : <div className="hidden sm:block" />}

                {nextItem ? (
                  <button
                    onClick={markDoneAndNext}
                    className={`group text-left sm:text-right p-3.5 rounded-2xl transition-all shadow-sm ${nt.nextCard}`}
                  >
                    <span className={`flex sm:justify-end items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider ${nt.nextLabel}`}>
                      {nextItem.chap.id !== current.chap.id ? "Next chapter" : "Next"}
                      {!completedTopics[current.topic.id] && " · marks this done"}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                    <span className="block mt-1 text-[13px] font-bold truncate">{getLabel(nextItem.topic, contentLang)}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { if (!completedTopics[current.topic.id]) onToggleComplete(current.topic.id); }}
                    className="p-3.5 rounded-2xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 transition-all"
                  >
                    {completedTopics[current.topic.id] ? "🎉 You reached the end of this subject" : "Finish & mark done"}
                  </button>
                )}
              </div>

              <div className="h-16" />
            </div>
          ) : (
            <div className={`h-full flex items-center justify-center text-center px-6 ${nt.ink400}`}>
              <div>
                <p className={`text-sm font-semibold ${nt.ink500}`}>No readable topics here yet</p>
                <p className="text-xs mt-1">Pick another subject above, or check your plan for locked chapters.</p>
              </div>
            </div>
          )}
        </main>

        {aiOpen && renderHandle("ai")}

        {/* ---- RIGHT: AI-GURUJI (kept mounted so the chat survives open/close) ---- */}
        <aside
          style={{ "--ai-w": `${aiWidth}px` } as React.CSSProperties}
          className={`${aiOpen ? "flex" : "hidden"} flex-col shrink-0 bg-[#0A0D16]
            absolute md:static inset-y-0 right-0 z-30 w-full sm:w-[400px] md:w-[var(--ai-w)]`}
        >
          <div className="flex-1 min-h-0">{aiPanel(() => setAiOpen(false))}</div>
        </aside>
      </div>
    </div>
  );
}