// src/components/admin/cms/ImageManager.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { UploadCloud, Copy, Check, Search, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";

export default function ImageManager() {
  const [images, setImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Storage Target Bucket Key Context Configuration
  const BUCKET_NAME = "notes_images";

  useEffect(() => {
    fetchImages();
  }, []);

  // Listen for clipboard Ctrl+V paste events globally/locally within the container scope
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept paste if the user is actively typing a custom lookup name slug or searching
      if (
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [customName]); // Depend on customName state to accurately evaluate validation rules inside the closure

  async function fetchImages() {
    try {
      const { data, error } = await supabase
        .from("notes_images")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      if (data) setImages(data);
    } catch (err: any) {
      console.error("Error fetching images registry:", err.message);
    }
  }

  // Abstracted upload logic handler to process images coming from both the file picker and keyboard clipboard paste
  async function processImageFile(file: File) {
    try {
      if (!customName.trim()) {
        alert("Please assign a unique lookup syntax reference name before execution.");
        return;
      }

      setUploading(true);

      // 1. Generate clean slug and append a short random token to guarantee unique table index constraints
      const baseCleanName = customName.trim().toLowerCase().replace(/\s+/g, "-");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const cleanName = `${baseCleanName}-${randomSuffix}`;
      
      const fileExt = file.name ? file.name.split(".").pop() : "png"; // Fallback to png for raw pasted buffer streams
      const filePath = `notes/${Date.now()}-${cleanName}.${fileExt}`;

      // A. Stream file data directly to the storage bucket
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });
        
      if (uploadError) {
        throw new Error(`Storage Engine Error: ${uploadError.message}`);
      }

      // B. Retrieve static asset public path parameters
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // C. Record reference coordinates inside public.notes_images metadata table
      const { error: dbError } = await supabase.from("notes_images").insert([
        {
          image_name: cleanName,
          image_url: publicUrl,
        }
      ]);

      if (dbError) {
        throw new Error(`Database Entry Error: ${dbError.message}`);
      }

      setCustomName("");
      await fetchImages();
    } catch (err: any) {
      console.error("Upload failure pipeline exception:", err);
      alert(err.message || "Failed uploading asset.");
    } finally {
      setUploading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    await processImageFile(file);
    // Clear file input DOM reference safely
    e.target.value = "";
  }

  async function deleteAsset(id: string, storagePath: string) {
    if (!confirm("Are you sure you want to remove this asset registry completely?")) return;
    
    try {
      const lookupMarker = `/${BUCKET_NAME}/`;
      const markerIndex = storagePath.indexOf(lookupMarker);
      
      if (markerIndex !== -1) {
        const targetFile = storagePath.substring(markerIndex + lookupMarker.length);
        if (targetFile) {
          await supabase.storage.from(BUCKET_NAME).remove([targetFile]);
        }
      }

      const { error: deleteError } = await supabase.from("notes_images").delete().eq("id", id);
      if (deleteError) throw deleteError;
      
      await fetchImages();
    } catch (err: any) {
      alert("Error purging asset tracking system: " + err.message);
    }
  }

  const handleCopySyntax = (name: string, id: string) => {
    const syntax = `[img:${name}]`;
    navigator.clipboard.writeText(syntax);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredImages = images.filter((img) =>
    img.image_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="bg-[#070b13] border border-slate-900 rounded-xl p-5 space-y-5 outline-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Asset Canvas & Image Token Library</h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden md:inline-block bg-[#0b0f19] px-2 py-0.5 rounded border border-slate-900">
          💡 Tip: You can press Ctrl + V here to paste an image directly
        </span>
      </div>

      <div className="space-y-3 p-4 rounded-xl bg-[#0b0f19] border border-slate-900">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Step 1: Assign Custom Unique Slug</label>
          <input
            type="text"
            placeholder="e.g., cell-structure-diagram"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full bg-[#04060b] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Step 2: Upload Source File</label>
          <label className={`w-full h-24 border border-dashed border-slate-800 hover:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            {uploading ? (
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            ) : (
              <>
                <UploadCloud className="w-5 h-5 text-slate-500 mb-1" />
                <span className="text-[11px] text-slate-400">Trigger upload runtime engine or press Ctrl+V</span>
              </>
            )}
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search registry library..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b0f19] border border-slate-900 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
          {filteredImages.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-900/60 rounded-xl bg-[#04060b]">
              <p className="text-[11px] text-slate-500 font-mono">No matching images tracked.</p>
            </div>
          ) : (
            filteredImages.map((img) => (
              <div key={img.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0b0f19] border border-slate-900 group">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img src={img.image_url} alt="" className="w-9 h-9 object-cover rounded bg-slate-950 border border-slate-800" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-mono font-medium text-slate-200 truncate">{img.image_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{`[img:${img.image_name}]`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleCopySyntax(img.image_name, img.id)}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Copy token block markup"
                  >
                    {copiedId === img.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAsset(img.id, img.image_url)}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}