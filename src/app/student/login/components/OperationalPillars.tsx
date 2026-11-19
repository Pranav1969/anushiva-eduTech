"use client";

import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { useTheme } from "@/app/student/theme/ThemeProvider";
import { PillarContent } from "../types/login.types";

export function OperationalPillars({ pillars }: { pillars: PillarContent[] }) {
  const { theme } = useTheme();

  return (
    <div className="grid grid-cols-1 gap-4 pt-4">
      {pillars.map((pillar, idx) => {
        // Resolve the icon by name, falling back to Activity
        const IconComponent = (LucideIcons as any)[pillar.iconName] || LucideIcons.Activity;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 * idx }}
            whileHover={{ scale: 1.01 }}
            className={`group flex gap-4 p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${theme.ui.pipelineCard}`}
          >
            <div className={`flex-shrink-0 p-2.5 h-fit rounded-lg border transition-all duration-300 ${theme.ui.iconBoxNormal}`}>
              <IconComponent size={18} />
            </div>
            <div className="space-y-1">
              <h4 className={`text-xs font-bold tracking-wide uppercase transition-colors ${theme.ui.titleNormal}`}>
                {pillar.title}
              </h4>
              <p className={`text-xs leading-relaxed font-medium ${theme.text.muted}`}>{pillar.description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}