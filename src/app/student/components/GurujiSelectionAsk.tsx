"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, Lightbulb, MessageCircleQuestion } from "lucide-react";

export type SelectionKind = "word" | "line" | "passage";

/** Topic-level context sent to AI Guruji */
export type GuruTopicCtx = {
  chapterId: string;
  topicId?: string;
  chapter?: string;
  topic?: string;
  topicText?: string;
  topicDone?: boolean;
  chapterProgress?: string;
};
export type GuruContext = Partial<GuruTopicCtx> & { section: string; lang?: string };

export type GuruAsk = {
  id: number;
  quote: string;
  kind: SelectionKind;
  action: "explain" | "example" | "doubt";
};

/** Removes our note markup so the AI reads clean text */
export const cleanForAI = (raw: string = "", max = 3500): string =>
  raw
    .replace(/\{\/?[a-z0-9-]+\}/gi, "")
    .replace(/\[\/?[A-Z0-9]+(?::[^\]\n]*)?\]/g, "")
    .replace(/\[img:[^\]]+\]/g, "")
    .replace(/==/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

const detectKind = (t: string): SelectionKind => {
  if (t.length <= 28 && !/\s/.test(t)) return "word";
  if (t.length <= 180) return "line";
  return "passage";
};

type Pos = { top: number; left: number };

export function SelectionAskPopover({
  onAsk,
}: {
  onAsk: (quote: string, kind: SelectionKind, action: GuruAsk["action"]) => void;
}) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [sel, setSel] = useState<{ quote: string; kind: SelectionKind } | null>(null);
  
  // FIX: Provide an initial value (null) to satisfy React's useRef type definitions
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(() => {
    const s = window.getSelection();
    if (!s || s.isCollapsed || s.rangeCount === 0) { setPos(null); return; }

    const text = s.toString().replace(/\s+/g, " ").trim();
    if (text.length < 2) { setPos(null); return; }

    const inside = (n: Node | null) => {
      const el = n?.nodeType === 1 ? (n as Element) : n?.parentElement;
      return !!el?.closest("[data-guru-selectable]");
    };
    if (!inside(s.anchorNode) || !inside(s.focusNode)) { setPos(null); return; }

    const rect = s.getRangeAt(0).getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) { setPos(null); return; }

    const W = 292;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - W / 2, 8), window.innerWidth - W - 8);
    // On touch devices the native menu sits above the selection, so we go below
    let top = coarse ? rect.bottom + 14 : rect.top - 58;
    if (top < 8) top = rect.bottom + 12;

    setSel({ quote: text.slice(0, 700), kind: detectKind(text) });
    setPos({ top, left });
  }, []);

  useEffect(() => {
    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(check, 160);
    };
    document.addEventListener("mouseup", schedule);
    document.addEventListener("keyup", schedule);
    document.addEventListener("selectionchange", schedule);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("mouseup", schedule);
      document.removeEventListener("keyup", schedule);
      document.removeEventListener("selectionchange", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [check]);

  if (!pos || !sel) return null;

  const fire = (action: GuruAsk["action"]) => {
    onAsk(sel.quote, sel.kind, action);
    window.getSelection()?.removeAllRanges();
    setPos(null);
  };

  const btn =
    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-100 bg-white/5 hover:bg-amber-500 hover:text-slate-950 border border-white/10 transition-colors whitespace-nowrap";

  return (
    <>
      <style>{`@keyframes guruPop{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}`}</style>
      <div
        // keeps the text selected while the student taps a button
        onMouseDown={(e) => e.preventDefault()}
        style={{ position: "fixed", top: pos.top, left: pos.left, width: 320, zIndex: 80, animation: "guruPop .18s ease-out" }}
        className="rounded-2xl border border-amber-500/30 bg-[#0A0D16]/95 backdrop-blur-xl shadow-[0_10px_40px_-8px_rgba(245,158,11,0.35)] p-2"
      >
        <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[10px] font-bold text-amber-400 tracking-wide">
          <Sparkles className="w-3 h-3" />
          {sel.kind === "word" ? "New word? Guruji can explain it" : "Want this made easier? Ask Guruji"}
        </div>
        <div className="flex items-center gap-1.5">
          <button className={btn} onClick={() => fire("explain")}>
            <Sparkles className="w-3 h-3" /> Explain simply
          </button>
          <button className={btn} onClick={() => fire("example")}>
            <Lightbulb className="w-3 h-3" /> Example
          </button>
          <button className={btn} onClick={() => fire("doubt")}>
            <MessageCircleQuestion className="w-3 h-3" /> My doubt
          </button>
        </div>
      </div>
    </>
  );
}