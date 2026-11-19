"use client";

import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { useTheme } from "@/app/student/theme/ThemeProvider";
import { MetricContent } from "../types/login.types";

export function MetricsLedger({ metrics }: { metrics: MetricContent[] }) {
  const { theme } = useTheme();

  return (
    <div className={`grid grid-cols-3 gap-3 pt-6 border-t ${theme.divider}`}>
      {metrics.map((metric, idx) => {
        const IconComponent = (LucideIcons as any)[metric.iconName] || LucideIcons.Terminal;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
            className={`p-3 rounded-xl border flex flex-col justify-between ${theme.ui.statSolid}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-lg font-black tracking-tight font-mono ${theme.ui.textStrong}`}>
                {metric.value}
              </span>
              <IconComponent size={12} className={theme.text.faint} />
            </div>
            <p className={`text-[10px] leading-tight font-semibold uppercase tracking-wider ${theme.text.muted}`}>
              {metric.label}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}