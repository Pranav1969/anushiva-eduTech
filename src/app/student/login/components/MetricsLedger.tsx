//src\app\student\login\components\MetricsLedger.tsx
"use client";

import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { MetricContent } from "../types/login.types";

export function MetricsLedger({ metrics }: { metrics: MetricContent[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-800/60">
      {metrics.map((metric, idx) => {
        const IconComponent = (LucideIcons as any)[metric.iconName] || LucideIcons.Terminal;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
            className="p-3 rounded-xl bg-gradient-to-b from-slate-900/60 to-slate-950/60 border border-slate-800/50 backdrop-blur-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-lg font-black text-white tracking-tight font-mono bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-400">
                {metric.value}
              </span>
              <IconComponent size={12} className="text-slate-500" />
            </div>
            <p className="text-[10px] leading-tight font-semibold text-slate-400 uppercase tracking-wider">
              {metric.label}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}