// src/app/student/components/ShareTestButton.tsx
"use client";

import { useState } from "react";
import { Share2, Check, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { buildShareUrl } from "@/utils/shareLinks";

export default function ShareTestButton({
  testId,
  testName,
  className = "",
  iconOnly = false,
}: {
  testId: string;
  testName: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      const { data: code, error } = await supabase.rpc("get_or_create_share_code", { p_test_id: testId });
      if (error || !code) throw error || new Error("No code");

      const url = buildShareUrl(code as string);
      const text = `Try this test "${testName}" on ANUSHIVA`;

      if (navigator.share) {
        try {
          await navigator.share({ title: testName, text, url });
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.prompt("Copy this link:", url);
      }
    } catch (err: any) {
      alert("Could not create share link. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      data-share
      onClick={handleShare}
      disabled={busy}
      title="Share with a friend"
      className={`inline-flex items-center justify-center gap-1 text-[10px] font-bold transition-colors disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {!iconOnly && (copied ? "Copied" : "Share")}
    </button>
  );
}