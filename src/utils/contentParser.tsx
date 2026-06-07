// src/utils/contentParser.tsx
import React from "react";
import Image from "next/image";

interface ParsedBlock {
  type: "text" | "image";
  content: string;
}

/**
 * Token parsing layout engine matching custom text tokens [img:token-identifier]
 * maps layout structures directly to client views.
 */
export function parseContentTokens(text: string, imageMap: Record<string, string>): React.ReactNode[] {
  if (!text) return [];

  // Regex matches exact tags like [img:any-custom-name] or [image:any-custom-name]
  const tokenRegex = /\[(?:img|image):([^\]]+)\]/g;
  const blocks: ParsedBlock[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const currentIndex = match.index;
    const tokenValue = match[1].trim();

    // Push preceding text blocks if any exist
    if (currentIndex > lastIndex) {
      blocks.push({
        type: "text",
        content: text.substring(lastIndex, currentIndex),
      });
    }

    // Push mapped asset layouts
    blocks.push({
      type: "image",
      content: tokenValue,
    });

    lastIndex = tokenRegex.lastIndex;
  }

  // Add trailing block text
  if (lastIndex < text.length) {
    blocks.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return blocks.map((block, idx) => {
    if (block.type === "image") {
      const imageUrl = imageMap[block.content];
      if (!imageUrl) {
        return (
          <span key={idx} className="my-2 inline-block rounded bg-red-950/40 border border-red-900/50 px-2 py-1 text-xs text-red-400 font-mono">
            ⚠️ Image Token Missing: "{block.content}"
          </span>
        );
      }

      return (
        <div key={idx} className="my-6 block group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40 p-2 transition-all duration-300 hover:border-slate-700/80">
          <img
            src={imageUrl}
            alt={block.content}
            loading="lazy"
            className="w-full max-h-[480px] object-contain rounded-xl transition-transform duration-500 group-hover:scale-[1.005]"
          />
          <div className="mt-2 px-2 text-center text-xs text-slate-500 font-mono tracking-wide italic">
            Figure: {block.content}
          </div>
        </div>
      );
    }

    // Treat lines properly, parse Markdown-lite formats (Headings, quotes, info cards)
    return (
      <div key={idx} className="prose prose-invert max-w-none space-y-4 text-slate-300 leading-relaxed">
        {block.content.split("\n").map((line, lIdx) => {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("### ")) {
            return <h4 key={lIdx} className="text-lg font-semibold text-slate-100 pt-3 tracking-tight">{cleanLine.replace("### ", "")}</h4>;
          }
          if (cleanLine.startsWith("## ")) {
            return <h3 key={lIdx} className="text-xl font-bold text-white pt-4 tracking-tight">{cleanLine.replace("## ", "")}</h3>;
          }
          if (cleanLine.startsWith("> ")) {
            return (
              <blockquote key={lIdx} className="border-l-2 border-emerald-500/70 bg-emerald-950/10 px-4 py-3 rounded-r-xl my-2 text-slate-300 italic">
                {cleanLine.replace("> ", "")}
              </blockquote>
            );
          }
          if (cleanLine.startsWith("[info]")) {
            return (
              <div key={lIdx} className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-4 my-3 text-sm text-blue-300 flex items-start gap-3">
                <span>💡</span>
                <div>{cleanLine.replace("[info]", "")}</div>
              </div>
            );
          }
          return line === "" ? <div key={lIdx} className="h-2" /> : <p key={lIdx} className="text-[15px]">{line}</p>;
        })}
      </div>
    );
  });
}