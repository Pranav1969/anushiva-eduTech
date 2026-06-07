"use client";
import { ClipboardX } from "lucide-react";

interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-center py-16 bg-[#1E293B]/30 border border-dashed border-slate-800 rounded-2xl text-[#CBD5E1]/50 font-semibold text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-3 shadow-inner">
      <ClipboardX size={24} className="text-slate-600 animate-bounce duration-[3000ms]" />
      <span>{message || "No mock exam instances available for this section profile."}</span>
    </div>
  );
}