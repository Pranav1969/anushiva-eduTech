// src/components/admin/cms/NotesPreviewRenderer.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { BookOpen, Sparkles } from "lucide-react";

interface NotesPreviewRendererProps {
  title: string;
  content: string;
}

// Inline helper to parse basic markdown elements inside a piece of text (like **bold**)
const parseInlineMarkdown = (text: string) => {
  if (!text) return "";
  // Simple regex conversion for **bold text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(<strong key={match.index} className="font-bold text-slate-50">{match[1]}</strong>);
    lastIndex = boldRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

// Custom block level parser handling images, headers, lists, and spacing paragraphs
const renderPreviewContentWithImages = (text: string, imageMap: Record<string, string>) => {
  if (!text) return null;

  // Split input into lines for structured block evaluation
  const lines = text.split("\n");
  const renderedBlocks: React.ReactNode[] = [];
  
  // Custom image token regex: [img:name] or [img:name|w-50]
  const imageRegex = /\[img:([^\]|]+)(?:\|([^\]]+))?\]/g;

  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = (keyPrefix: number) => {
    if (inList && listItems.length > 0) {
      renderedBlocks.push(
        <ul key={`list-${keyPrefix}`} className="list-disc pl-6 space-y-1.5 my-3 text-slate-300">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // 1. Handle Image Parsing Rows
    if (trimmedLine.startsWith("[img:") && trimmedLine.endsWith("]")) {
      flushList(index);
      imageRegex.lastIndex = 0; // Reset state regex position
      const match = imageRegex.exec(trimmedLine);
      
      if (match) {
        const imageName = match[1];
        const imageSize = match[2] || "w-full";
        const imageUrl = imageMap[imageName];

        let sizeClass = "w-full max-w-3xl"; 
        if (imageSize === "w-50" || imageSize === "small" || imageSize === "half") {
          sizeClass = "w-full md:w-1/2 max-w-md mx-auto";
        } else if (imageSize === "w-25" || imageSize === "mini") {
          sizeClass = "w-full sm:w-1/3 max-w-xs mx-auto";
        } else if (imageSize === "w-75" || imageSize === "medium") {
          sizeClass = "w-full md:w-3/4 max-w-2xl mx-auto";
        }

        if (imageUrl) {
          renderedBlocks.push(
            <span key={`img-block-${index}`} className="block my-5 clear-both text-center select-none">
              <img 
                src={imageUrl} 
                alt={`Syllabus Diagram Asset: ${imageName}`} 
                className={`${sizeClass} rounded-xl border border-slate-800 shadow-sm max-h-[420px] object-contain bg-[#090d16] p-1.5 hover:scale-[1.01] transition-transform duration-200`}
                loading="lazy"
              />
            </span>
          );
        } else {
          renderedBlocks.push(
            <span key={`img-err-${index}`} className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-900/50 px-1.5 py-0.5 rounded block my-2">
              Image Token Missing: "{imageName}"
            </span>
          );
        }
        return;
      }
    }

    // 2. Handle Markdown Heading Block Tokens
    if (trimmedLine.startsWith("### ")) {
      flushList(index);
      renderedBlocks.push(
        <h4 key={index} className="text-base font-semibold text-slate-200 mt-5 mb-2 tracking-tight">
          {parseInlineMarkdown(trimmedLine.substring(4))}
        </h4>
      );
    } else if (trimmedLine.startsWith("## ")) {
      flushList(index);
      renderedBlocks.push(
        <h3 key={index} className="text-lg font-bold text-slate-100 mt-6 mb-3 tracking-tight border-b border-slate-900/40 pb-1">
          {parseInlineMarkdown(trimmedLine.substring(3))}
        </h3>
      );
    } else if (trimmedLine.startsWith("# ")) {
      flushList(index);
      renderedBlocks.push(
        <h2 key={index} className="text-xl font-extrabold text-slate-50 mt-8 mb-4 tracking-tight">
          {parseInlineMarkdown(trimmedLine.substring(2))}
        </h2>
      );
    }
    // 3. Handle Markdown Unordered List Elements
    else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={`li-${index}`} className="text-sm leading-relaxed">
          {parseInlineMarkdown(trimmedLine.substring(2))}
        </li>
      );
    }
    // 4. Handle Empty/Blank Structural Spacers
    else if (trimmedLine === "") {
      flushList(index);
    }
    // 5. Regular Standard Text Paragraph Run
    else {
      // If a non-list line breaks continuity, close previous lists
      flushList(index);
      renderedBlocks.push(
        <p key={index} className="text-sm text-slate-300 leading-relaxed my-3">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  });

  // Final loose element validation run
  if (inList) {
    flushList(lines.length);
  }

  return <div className="space-y-2">{renderedBlocks}</div>;
};

export default function NotesPreviewRenderer({ title, content }: NotesPreviewRendererProps) {
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadAssetLibrary() {
      try {
        const { data, error } = await supabase
          .from("notes_images")
          .select("image_name, image_url");

        if (error) throw error;

        if (data) {
          const mapping = data.reduce((acc, curr) => {
            if (curr.image_name && curr.image_url) {
              acc[curr.image_name] = curr.image_url;
            }
            return acc;
          }, {} as Record<string, string>);
          
          setImageMap(mapping);
        }
      } catch (err: any) {
        console.error("Error building live asset mapping:", err.message);
      }
    }
    
    loadAssetLibrary();
  }, [content]);

  return (
    <div className="w-full h-full bg-[#030712] border border-slate-900 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
      {/* Top Banner Context */}
      <div className="bg-[#0b0f19] border-b border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Live Study View</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-900/50">
          <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-medium tracking-wide">Sync Active</span>
        </div>
      </div>

      {/* Main Render Canvas */}
      <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
        <article className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-6 pb-4 border-b border-slate-900/80">
            {title || "Untitled Topic"}
          </h1>
          <div className="whitespace-pre-wrap leading-relaxed">
            {content ? (
              renderPreviewContentWithImages(content, imageMap)
            ) : (
              <p className="text-sm italic text-slate-600">
                No content drafted yet. Enter notes on the left pane to initialize render.
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}