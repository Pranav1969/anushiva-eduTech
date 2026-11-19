// src/components/admin/cms/NotesPreviewRenderer.tsx
// Live preview for the CMS editor. Uses the SAME markdown pipeline and look as the
// student-side StudyDesk (GFM tables, KaTeX math, amber bold, code styling, dark theme),
// plus the custom [img:name] / [img:name|w-50] image tokens.
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; // remove if KaTeX CSS is already imported globally
import { supabase } from "@/utils/supabase";
import { BookOpen, Sparkles } from "lucide-react";

interface NotesPreviewRendererProps {
  title: string;
  content: string;
}

// =====================================================================
// Markdown body: same look as the student side
// =====================================================================
function MarkdownBody({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h1: ({ node, ...props }) => (
          <h2 className="text-xl font-extrabold text-slate-50 mt-8 mb-4 tracking-tight" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h3 className="text-lg font-bold text-slate-100 mt-6 mb-3 tracking-tight border-b border-slate-800 pb-1" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h4 className="text-base font-semibold text-slate-200 mt-5 mb-2 tracking-tight" {...props} />
        ),
        strong: ({ node, ...props }) => <strong className="text-amber-400 font-bold" {...props} />,
        em: ({ node, ...props }) => <em className="italic text-slate-300" {...props} />,
        // whitespace-pre-line keeps single line breaks typed by the editor
        p: ({ node, ...props }) => (
          <p className="mb-2 last:mb-0 text-sm text-slate-200 leading-relaxed whitespace-pre-line" {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className="list-disc pl-6 space-y-1.5 my-3 text-sm text-slate-200 marker:text-amber-500/70" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal pl-6 space-y-1.5 my-3 text-sm text-slate-200 marker:text-amber-500/70" {...props} />
        ),
        li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
        a: ({ node, ...props }) => (
          <a className="text-amber-400 underline underline-offset-2 hover:text-amber-300" target="_blank" rel="noreferrer" {...props} />
        ),
        blockquote: ({ node, ...props }) => (
          <blockquote className="my-3 border-l-2 border-amber-500/50 bg-amber-500/5 rounded-r-lg pl-3 pr-2 py-1.5 text-slate-300 italic" {...props} />
        ),
        hr: () => <hr className="my-5 border-slate-800" />,
        code: ({ node, className, children, ...props }: any) => {
          const isBlock = /language-/.test(className || "");
          return isBlock ? (
            <code className={`${className} font-mono text-xs text-amber-200`} {...props}>{children}</code>
          ) : (
            <code className="bg-black/30 px-1 py-0.5 rounded text-xs font-mono text-amber-200" {...props}>{children}</code>
          );
        },
        pre: ({ node, ...props }) => (
          <pre className="my-3 overflow-x-auto rounded-xl bg-black/40 border border-slate-800 p-3 text-xs" {...props} />
        ),
        table: ({ node, ...props }) => (
          <div className="my-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm text-left text-slate-200" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => <thead className="bg-slate-800/70 text-slate-100" {...props} />,
        th: ({ node, ...props }) => (
          <th className="px-3 py-2 font-semibold border-b border-slate-700 text-xs uppercase tracking-wide" {...props} />
        ),
        td: ({ node, ...props }) => <td className="px-3 py-2 border-b border-slate-800/70 align-top" {...props} />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

// =====================================================================
// Image tokens: [img:name] or [img:name|w-50]  (alone on a line)
// =====================================================================
type Segment =
  | { type: "md"; text: string }
  | { type: "img"; name: string; size: string };

const IMG_LINE = /^\s*\[img:([^\]|]+)(?:\|([^\]]+))?\]\s*$/;

/** splits the notes into markdown chunks and image blocks, so math/tables/lists inside a chunk stay intact */
const splitSegments = (text: string): Segment[] => {
  const segments: Segment[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const joined = buffer.join("\n");
    if (joined.trim()) segments.push({ type: "md", text: joined });
    buffer = [];
  };
  // keep fenced code blocks safe: image tokens inside ``` fences are not treated as images
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const m = !inFence ? line.match(IMG_LINE) : null;
    if (m) {
      flush();
      segments.push({ type: "img", name: m[1].trim(), size: (m[2] || "w-full").trim() });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return segments;
};

const sizeClassFor = (size: string) => {
  if (size === "w-50" || size === "small" || size === "half") return "w-full md:w-1/2 max-w-md mx-auto";
  if (size === "w-25" || size === "mini") return "w-full sm:w-1/3 max-w-xs mx-auto";
  if (size === "w-75" || size === "medium") return "w-full md:w-3/4 max-w-2xl mx-auto";
  return "w-full max-w-3xl";
};

function NotesBody({ text, imageMap }: { text: string; imageMap: Record<string, string> }) {
  const segments = useMemo(() => splitSegments(text), [text]);

  return (
    <div className="text-sm text-slate-200 leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "md") return <MarkdownBody key={`md-${i}`} text={seg.text} />;

        const url = imageMap[seg.name];
        if (!url) {
          return (
            <span
              key={`img-err-${i}`}
              className="block my-2 text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-900/50 px-1.5 py-0.5 rounded"
            >
              Image Token Missing: "{seg.name}"
            </span>
          );
        }
        return (
          <span key={`img-${i}`} className="block my-5 clear-both text-center select-none">
            <img
              src={url}
              alt={`Syllabus Diagram Asset: ${seg.name}`}
              className={`${sizeClassFor(seg.size)} inline-block rounded-xl border border-slate-800 shadow-sm max-h-[420px] object-contain bg-[#04060B] p-1.5 hover:scale-[1.01] transition-transform duration-200`}
              loading="lazy"
            />
          </span>
        );
      })}
    </div>
  );
}

// =====================================================================
export default function NotesPreviewRenderer({ title, content }: NotesPreviewRendererProps) {
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const imageMapRef = useRef(imageMap);
  imageMapRef.current = imageMap;

  const loadAssetLibrary = async () => {
    try {
      const { data, error } = await supabase.from("notes_images").select("image_name, image_url");
      if (error) throw error;
      if (data) {
        const mapping = data.reduce((acc: Record<string, string>, curr: any) => {
          if (curr.image_name && curr.image_url) acc[curr.image_name] = curr.image_url;
          return acc;
        }, {});
        setImageMap(mapping);
      }
    } catch (err: any) {
      console.error("Error building live asset mapping:", err.message);
    }
  };

  // load once
  useEffect(() => {
    loadAssetLibrary();
  }, []);

  // reload (debounced) only when the editor uses an image name we don't know yet,
  // e.g. right after uploading a new image — not on every keystroke
  useEffect(() => {
    if (!content) return;
    const names = Array.from(content.matchAll(/\[img:([^\]|]+)/g)).map((m) => m[1].trim());
    const missing = names.some((n) => !imageMapRef.current[n]);
    if (!missing) return;
    const id = setTimeout(loadAssetLibrary, 800);
    return () => clearTimeout(id);
  }, [content]);

  return (
    <div className="w-full h-full bg-[#0A0D16] border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl font-sans">
      {/* Top banner (same header style as the student side) */}
      <div className="shrink-0 border-b border-slate-800 bg-gradient-to-br from-amber-500/10 via-[#0A0D16] to-[#0A0D16] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-amber-400/20 to-amber-600/10 rounded-xl text-amber-400 ring-1 ring-amber-500/30">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Live Study View</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-900/50">
          <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-medium tracking-wide">Sync Active</span>
        </div>
      </div>

      {/* Main render canvas */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-8 scrollbar-thin custom-scrollbar">
        <article className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-6 pb-4 border-b border-slate-800">
            {title || "Untitled Topic"}
          </h1>
          {content ? (
            <NotesBody text={content} imageMap={imageMap} />
          ) : (
            <p className="text-sm italic text-slate-600">
              No content drafted yet. Enter notes on the left pane to initialize render.
            </p>
          )}
        </article>
      </div>
    </div>
  );
}