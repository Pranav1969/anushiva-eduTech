"use client";

import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { PillarContent } from "../types/login.types";

export function OperationalPillars({ pillars }: { pillars: PillarContent[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 pt-4">
      {pillars.map((pillar, idx) => {
        // Dynamic Lucide Resolution Icon Map safely falling back to Activity
        const IconComponent = (LucideIcons as any)[pillar.iconName] || LucideIcons.Activity;
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 * idx }}
            whileHover={{ scale: 1.01, border: "1px solid rgba(59, 130, 246, 0.4)" }}
            className="group flex gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex-shrink-0 p-2.5 h-fit rounded-lg bg-slate-800/60 border border-slate-700/50 group-hover:bg-blue-950/40 group-hover:border-blue-800/50 text-slate-400 group-hover:text-cyan-400 transition-all duration-300">
              <IconComponent size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-100 tracking-wide uppercase group-hover:text-white transition-colors">
                {pillar.title}
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                {pillar.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}