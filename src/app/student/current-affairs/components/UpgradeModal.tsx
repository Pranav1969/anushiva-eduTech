// src/app/student/current-affairs/components/UpgradeModal.tsx
//
// Self-contained upgrade prompt. Uses a real <Link> to /student/upgrade so
// navigation works even if router.push is intercepted by overlays/state.

"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Lock, X } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan: string;
  /** Optional name of the feature that triggered the prompt, e.g. "Audio notes" */
  featureLabel?: string;
}

export default function UpgradeModal({ isOpen, onClose, requiredPlan, featureLabel }: UpgradeModalProps) {
  const { theme: t } = useTheme();
  const href = `/student/upgrade?plan=${encodeURIComponent(requiredPlan)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`fixed inset-0 z-[90] flex items-center justify-center p-4 ${t.drawer.overlay} backdrop-blur-sm`}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-sm rounded-2xl border ${t.drawer.surface} p-6 text-center shadow-2xl`}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className={`absolute right-3 top-3 rounded-lg border p-1.5 ${t.iconButton}`}
            >
              <X className="h-4 w-4" />
            </button>

            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border ${t.amber.iconWrap}`}>
              <Lock className={`h-5 w-5 ${t.amber.icon}`} />
            </div>

            <h3 className={`text-lg font-bold ${t.text.heading}`}>
              {featureLabel ? `${featureLabel} is a premium feature` : "Upgrade to unlock"}
            </h3>
            <p className={`mt-1.5 text-sm leading-relaxed ${t.text.muted}`}>
              This needs the <span className="font-semibold capitalize">{requiredPlan}</span> plan or higher.
            </p>

            <Link
              href={href}
              onClick={onClose}
              className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl ${t.accent.solid} ${t.accent.solidHover} px-5 py-2.5 text-sm font-semibold transition-colors`}
            >
              <Crown className="h-4 w-4" /> View plans
            </Link>
            <button onClick={onClose} className={`mt-2 w-full py-2 text-xs font-medium ${t.text.faint}`}>
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}