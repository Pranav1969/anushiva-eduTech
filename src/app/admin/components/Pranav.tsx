// src/app/admin/components/Pranav.tsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  X,
  Search,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const BUCKET = "documents";
const TABLE = "documents";
const MAX_FILE_SIZE_MB = 25;
const MAX_PREVIEW_ROWS = 1000;

type DocKind = "word" | "excel";

interface DocRow {
  id: string;
  title: string;
  file_name: string;
  file_type: DocKind;
  mime_type: string | null;
  file_size: number;
  storage_path: string;
  created_at: string;
}

interface SheetData {
  name: string;
  rows: (string | number | boolean | null)[][];
  totalRows: number;
}

type PreviewState =
  | { status: "idle" }
  | { status: "loading"; doc: DocRow }
  | { status: "word"; doc: DocRow; html: string }
  | { status: "excel"; doc: DocRow; sheets: SheetData[] }
  | { status: "unsupported"; doc: DocRow; message: string }
  | { status: "error"; doc: DocRow; message: string };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function detectKind(fileName: string): DocKind | null {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "xlsm"].includes(ext)) return "excel";
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeStorageName(name: string): string {
  // Storage keys must be URL-safe; keep the extension, strip everything odd.
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function colLetter(index: number): string {
  let n = index;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function Pranav() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [titleInput, setTitleInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | DocKind>("all");

  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [activeSheet, setActiveSheet] = useState(0);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- load list ---------- */
  const loadDocs = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setListError(error.message);
    else setDocs((data as DocRow[]) || []);
    setIsLoadingList(false);
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // auto-hide notices
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  /* ---------- file picking ---------- */
  const acceptFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!detectKind(file.name)) {
      setNotice({ type: "err", text: "Only Word (.doc, .docx) and Excel (.xls, .xlsx, .xlsm) files are allowed." });
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setNotice({ type: "err", text: `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.` });
      return;
    }
    setPendingFile(file);
    if (!titleInput.trim()) setTitleInput(file.name.replace(/\.[^.]+$/, ""));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  /* ---------- upload ---------- */
  const handleUpload = async () => {
    if (!pendingFile) return;
    const kind = detectKind(pendingFile.name);
    if (!kind) return;

    const storagePath = `${crypto.randomUUID()}-${safeStorageName(pendingFile.name)}`;
    try {
      setIsUploading(true);

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, pendingFile, {
          contentType: pendingFile.type || undefined,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data, error: dbErr } = await supabase
        .from(TABLE)
        .insert({
          title: titleInput.trim() || pendingFile.name,
          file_name: pendingFile.name,
          file_type: kind,
          mime_type: pendingFile.type || null,
          file_size: pendingFile.size,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (dbErr) {
        // roll back the orphaned file
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw dbErr;
      }

      setDocs((prev) => [data as DocRow, ...prev]);
      setPendingFile(null);
      setTitleInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice({ type: "ok", text: "Document uploaded successfully." });
    } catch (err: any) {
      setNotice({ type: "err", text: "Upload failed: " + (err?.message || "unknown error") });
    } finally {
      setIsUploading(false);
    }
  };

  /* ---------- download ---------- */
  const fetchBlob = async (doc: DocRow): Promise<Blob> => {
    const { data, error } = await supabase.storage.from(BUCKET).download(doc.storage_path);
    if (error || !data) throw error || new Error("File not found in storage");
    return data;
  };

  const handleDownload = async (doc: DocRow) => {
    try {
      setDownloadingId(doc.id);
      const blob = await fetchBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setNotice({ type: "err", text: "Download failed: " + (err?.message || "unknown error") });
    } finally {
      setDownloadingId(null);
    }
  };

  /* ---------- preview (read in page) ---------- */
  const handlePreview = async (doc: DocRow) => {
    setActiveSheet(0);
    setPreview({ status: "loading", doc });
    try {
      const ext = doc.file_name.split(".").pop()?.toLowerCase();
      const blob = await fetchBlob(doc);
      const buffer = await blob.arrayBuffer();

      if (doc.file_type === "word") {
        if (ext === "doc") {
          setPreview({
            status: "unsupported",
            doc,
            message:
              "Old .doc files can't be shown in the browser. Download it, or re-save it as .docx to enable in-page reading.",
          });
          return;
        }
        const mod: any = await import("mammoth");
        const mammoth = mod.default ?? mod;
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        setPreview({ status: "word", doc, html: result.value || "<p><em>This document is empty.</em></p>" });
      } else {
        const mod: any = await import("xlsx");
        const XLSX = mod.default ?? mod;
        const wb = XLSX.read(buffer, { type: "array" });
        const sheets: SheetData[] = wb.SheetNames.map((name: string) => {
          const all: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], {
            header: 1,
            defval: "",
            blankrows: false,
          });
          return { name, rows: all.slice(0, MAX_PREVIEW_ROWS), totalRows: all.length };
        });
        setPreview({ status: "excel", doc, sheets });
      }
    } catch (err: any) {
      setPreview({ status: "error", doc, message: err?.message || "Could not read this file." });
    }
  };

  const closePreview = () => setPreview({ status: "idle" });

  /* ---------- delete ---------- */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const { error: stErr } = await supabase.storage.from(BUCKET).remove([deleteTarget.storage_path]);
      if (stErr) throw stErr;
      const { error: dbErr } = await supabase.from(TABLE).delete().eq("id", deleteTarget.id);
      if (dbErr) throw dbErr;
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      if (preview.status !== "idle" && preview.doc.id === deleteTarget.id) closePreview();
      setNotice({ type: "ok", text: "Document deleted." });
      setDeleteTarget(null);
    } catch (err: any) {
      setNotice({ type: "err", text: "Delete failed: " + (err?.message || "unknown error") });
    } finally {
      setIsDeleting(false);
    }
  };

  /* ---------- derived ---------- */
  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (filter !== "all" && d.file_type !== filter) return false;
      if (!q) return true;
      return d.title.toLowerCase().includes(q) || d.file_name.toLowerCase().includes(q);
    });
  }, [docs, search, filter]);

  const wordCount = docs.filter((d) => d.file_type === "word").length;
  const excelCount = docs.filter((d) => d.file_type === "excel").length;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="w-full min-h-screen bg-[#020408] text-slate-100 flex flex-col font-sans">
      {/* Scoped styles for the rendered Word document */}
      <style>{`
        .doc-body { color:#1e293b; font-size:15px; line-height:1.7; word-wrap:break-word; }
        .doc-body h1 { font-size:1.8em; font-weight:700; margin:1em 0 .5em; }
        .doc-body h2 { font-size:1.5em; font-weight:700; margin:1em 0 .5em; }
        .doc-body h3 { font-size:1.25em; font-weight:600; margin:1em 0 .4em; }
        .doc-body p { margin:.6em 0; }
        .doc-body ul { list-style:disc; padding-left:1.6em; margin:.6em 0; }
        .doc-body ol { list-style:decimal; padding-left:1.6em; margin:.6em 0; }
        .doc-body table { border-collapse:collapse; margin:1em 0; max-width:100%; }
        .doc-body td, .doc-body th { border:1px solid #cbd5e1; padding:6px 10px; vertical-align:top; }
        .doc-body th { background:#f1f5f9; font-weight:600; }
        .doc-body img { max-width:100%; height:auto; }
        .doc-body a { color:#4f46e5; text-decoration:underline; }
        .doc-body strong { font-weight:700; }
        .doc-body em { font-style:italic; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#040814]/80 backdrop-blur-md border-b border-slate-900/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight">Document Vault</h1>
            <p className="text-[11px] text-slate-500 tracking-wide font-mono">
              Upload // Read // Download &mdash; Word &amp; Excel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-[#090f1d] border border-slate-900 text-slate-400">
            Total <span className="text-slate-100 font-semibold">{docs.length}</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
            Word <span className="font-semibold">{wordCount}</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            Excel <span className="font-semibold">{excelCount}</span>
          </span>
        </div>
      </header>

      {/* Toast */}
      {notice && (
        <div className="fixed top-20 right-6 z-[90]">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium shadow-2xl border ${
              notice.type === "ok"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {notice.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {notice.text}
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Upload card */}
        <section className="bg-[#040814] border border-slate-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Upload a document</h2>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl px-6 py-10 flex flex-col items-center justify-center text-center transition-all ${
              isDragging
                ? "border-emerald-400/70 bg-emerald-500/5"
                : "border-slate-800 hover:border-slate-700 bg-[#050a16]"
            }`}
          >
            <UploadCloud className={`w-9 h-9 mb-3 ${isDragging ? "text-emerald-400" : "text-slate-500"}`} />
            <p className="text-sm text-slate-300 font-medium">Drag &amp; drop a file here, or click to browse</p>
            <p className="text-[11px] text-slate-600 mt-1 font-mono">
              .docx .doc .xlsx .xls .xlsm &middot; max {MAX_FILE_SIZE_MB} MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".doc,.docx,.xls,.xlsx,.xlsm"
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />
          </div>

          {pendingFile && (
            <div className="flex flex-col md:flex-row md:items-end gap-3 bg-[#050a16] border border-slate-900 rounded-xl p-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {detectKind(pendingFile.name) === "word" ? (
                  <FileText className="w-8 h-8 text-blue-400 shrink-0" />
                ) : (
                  <FileSpreadsheet className="w-8 h-8 text-emerald-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs text-slate-400 truncate font-mono">
                    {pendingFile.name} &middot; {formatSize(pendingFile.size)}
                  </p>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Document title"
                    className="w-full bg-[#070c19] border border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-indigo-500/40"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingFile(null);
                    setTitleInput("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-400 disabled:opacity-40"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 disabled:opacity-50 transition-all"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  {isUploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Library */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-200">Your documents</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="bg-[#070c19] border border-slate-900 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-slate-800 w-48"
                />
              </div>
              <div className="flex items-center gap-1 bg-[#090f1d] p-1 border border-slate-900 rounded-xl">
                {(["all", "word", "excel"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                      filter === f ? "bg-slate-800/80 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoadingList ? (
            <div className="flex items-center justify-center py-16 text-slate-500 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading documents...
            </div>
          ) : listError ? (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs space-y-2">
              <p className="font-semibold">Could not load documents</p>
              <p className="font-mono text-rose-400/80">{listError}</p>
              <button onClick={loadDocs} className="underline">
                Try again
              </button>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="border border-dashed border-slate-900 rounded-2xl py-16 text-center text-xs text-slate-600">
              {docs.length === 0 ? "No documents yet. Upload your first file above." : "No documents match your search."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => {
                const isWord = doc.file_type === "word";
                return (
                  <div
                    key={doc.id}
                    className="bg-[#040814] border border-slate-900 hover:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl border shrink-0 ${
                          isWord ? "bg-blue-500/10 border-blue-500/20" : "bg-emerald-500/10 border-emerald-500/20"
                        }`}
                      >
                        {isWord ? (
                          <FileText className="w-5 h-5 text-blue-400" />
                        ) : (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-100 truncate" title={doc.title}>
                          {doc.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate font-mono" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1 font-mono">
                          {formatSize(doc.file_size)} &middot; {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreview(doc)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 rounded-xl py-1.5 text-xs font-medium transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> Open
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 rounded-xl py-1.5 text-xs font-medium transition-all disabled:opacity-40"
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Download
                      </button>
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        title="Delete"
                        className="px-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl flex items-center justify-center transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Preview modal */}
      {preview.status !== "idle" && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
          <div className="bg-[#040814] border border-slate-900 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* modal header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-900">
              <div className="flex items-center gap-3 min-w-0">
                {preview.doc.file_type === "word" ? (
                  <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{preview.doc.title}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{preview.doc.file_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(preview.doc)}
                  disabled={downloadingId === preview.doc.id}
                  className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* modal body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {preview.status === "loading" && (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Opening document...
                </div>
              )}

              {preview.status === "error" && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                  <p className="text-sm text-slate-200">Couldn&apos;t open this file</p>
                  <p className="text-xs text-slate-500 font-mono max-w-md">{preview.message}</p>
                </div>
              )}

              {preview.status === "unsupported" && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                  <p className="text-sm text-slate-200">Preview not available</p>
                  <p className="text-xs text-slate-500 max-w-md">{preview.message}</p>
                </div>
              )}

              {preview.status === "word" && (
                <div className="flex-1 overflow-y-auto bg-[#0a1020] p-4 md:p-8">
                  <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl px-6 md:px-12 py-8 md:py-12 min-h-full">
                    {/* Content comes from files uploaded by you (admin). */}
                    <div className="doc-body" dangerouslySetInnerHTML={{ __html: preview.html }} />
                  </div>
                </div>
              )}

              {preview.status === "excel" && (
                <>
                  <div className="flex-1 overflow-auto bg-[#020408]">
                    {preview.sheets[activeSheet] && preview.sheets[activeSheet].rows.length > 0 ? (
                      <table className="text-xs border-collapse min-w-full">
                        <thead className="sticky top-0 z-10">
                          <tr>
                            <th className="bg-[#0b1224] border border-slate-800 w-10 px-2 py-1 text-slate-600 font-mono" />
                            {Array.from({
                              length: Math.max(...preview.sheets[activeSheet].rows.map((r) => r.length), 1),
                            }).map((_, i) => (
                              <th
                                key={i}
                                className="bg-[#0b1224] border border-slate-800 px-3 py-1 text-slate-500 font-mono font-medium"
                              >
                                {colLetter(i)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.sheets[activeSheet].rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-900/40">
                              <td className="bg-[#0b1224] border border-slate-800 px-2 py-1 text-center text-slate-600 font-mono sticky left-0">
                                {rIdx + 1}
                              </td>
                              {Array.from({
                                length: Math.max(...preview.sheets[activeSheet].rows.map((r) => r.length), 1),
                              }).map((_, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="border border-slate-900 px-3 py-1 text-slate-300 whitespace-nowrap max-w-[320px] overflow-hidden text-ellipsis"
                                  title={String(row[cIdx] ?? "")}
                                >
                                  {String(row[cIdx] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-600">
                        This sheet is empty.
                      </div>
                    )}
                  </div>

                  {/* sheet tabs */}
                  <div className="border-t border-slate-900 bg-[#040814] px-3 py-2 flex items-center gap-2 overflow-x-auto">
                    {preview.sheets.map((s, i) => (
                      <button
                        key={s.name + i}
                        onClick={() => setActiveSheet(i)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                          activeSheet === i
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "text-slate-400 hover:text-slate-200 border border-transparent"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                    {preview.sheets[activeSheet] && preview.sheets[activeSheet].totalRows > MAX_PREVIEW_ROWS && (
                      <span className="ml-auto text-[10px] text-amber-400 font-mono whitespace-nowrap">
                        Showing first {MAX_PREVIEW_ROWS} of {preview.sheets[activeSheet].totalRows} rows &mdash; download for the full file
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#040814] border border-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Delete this document?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-200 font-semibold">&ldquo;{deleteTarget.title}&rdquo;</span> will be
              permanently removed from storage. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 rounded-xl py-2 text-xs font-medium text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 border border-rose-500/20 text-white rounded-xl py-2 text-xs font-semibold disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}