//src\app\student\login\components\HeroSection.tsx
"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { HeroContent } from "../types/login.types";

export function HeroSection({ hero }: { hero: HeroContent }) {
  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950/40 border border-blue-800/60 text-cyan-400 text-[11px] font-bold uppercase tracking-wider rounded-md backdrop-blur-sm"
      >
        <Sparkles size={12} className="text-cyan-400 animate-pulse" /> Unified Testing Ecosystem
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400"
      >
        {hero.title}
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-slate-300 text-sm md:text-base max-w-xl font-normal leading-relaxed"
      >
        <span className="text-cyan-400 font-semibold">{hero.subtitle}</span> {hero.description}
      </motion.p>
    </div>
  );
}