// src/components/admin/cms/NotesPreviewRenderer.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { BookOpen, Sparkles } from "lucide-react";

interface NotesPreviewRendererProps {
  title: string;
  content: string;
}

// Custom parser component mirroring the responsive structural token properties
const renderPreviewContentWithImages = (text: string, imageMap: Record<string, string>) => {
  if (!text) return null;

  // Global Regex capturing signature layout tags with optional width modifications: [img:name] or [img:name|w-50]
  const imageRegex = /\[img:([^\]|]+)(?:\|([^\]]+))?\]/g;
  
  // Custom split configuration to safely cycle tokens
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = imageRegex.exec(text)) !== null) {
    const plainText = text.substring(lastIndex, match.index);
    if (plainText) parts.push({ type: "text", val: plainText });
    
    parts.push({ type: "image", name: match[1], size: match[2] || "w-full" });
    lastIndex = imageRegex.lastIndex;
  }
  const remainingText = text.substring(lastIndex);
  if (remainingText) parts.push({ type: "text", val: remainingText });

  return parts.map((part, index) => {
    if (part.type === "image") {
      const imageUrl = imageMap[part.name!];
      
      // Determine explicit rendering widths according to token parameter flags
      let sizeClass = "w-full max-w-3xl"; // default sizing configurations
      if (part.size === "w-50" || part.size === "small" || part.size === "half") {
        sizeClass = "w-full md:w-1/2 max-w-md mx-auto";
      } else if (part.size === "w-25" || part.size === "mini") {
        sizeClass = "w-full sm:w-1/3 max-w-xs mx-auto";
      } else if (part.size === "w-75" || part.size === "medium") {
        sizeClass = "w-full md:w-3/4 max-w-2xl mx-auto";
      }

      if (imageUrl) {
        return (
          <span key={index} className="block my-5 clear-both text-center select-none">
            <img 
              src={imageUrl} 
              alt={`Syllabus Diagram Asset: ${part.name}`} 
              className={`${sizeClass} rounded-xl border border-slate-800 shadow-xs max-h-[420px] object-contain bg-[#090d16] p-1.5 hover:scale-[1.01] transition-transform duration-200`}
              loading="lazy"
            />
          </span>
        );
      }
      return <span key={index} className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-900/50 px-1.5 py-0.5 rounded block my-2">Image Token Missing: "{part.name}"</span>;
    }
    return <span key={index} className="text-slate-300">{part.val}</span>;
  });
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
          <div className="space-y-4 whitespace-pre-wrap leading-relaxed">
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