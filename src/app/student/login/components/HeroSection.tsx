"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTheme } from "@/app/student/theme/ThemeProvider";
import { HeroContent } from "../types/login.types";
import { AnushivaOrbitLogo, AnushivaWordmark } from "./AnushivaLogo";

export function HeroSection({ hero }: { hero: HeroContent }) {
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Brand lockup: left edges line up with the heading below */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-4"
      >
        <AnushivaOrbitLogo size={60} />
        <div className="leading-tight">
          <AnushivaWordmark className="text-2xl md:text-3xl" />
          <p className={`mt-1 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.3em] ${theme.text.faint}`}>
            Bank Exam Preparation
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className={`inline-flex items-center gap-2 px-3 py-1 border text-[11px] font-bold uppercase tracking-wider rounded-md backdrop-blur-sm ${theme.ui.chipBlue}`}
      >
        <Sparkles size={12} className={`animate-pulse ${theme.ui.cyanText}`} /> India&apos;s Bank Exam Practice Platform
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] ${theme.text.heading}`}
      >
        {hero.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`text-sm md:text-base max-w-xl font-normal leading-relaxed ${theme.text.body}`}
      >
        <span className={`font-semibold ${theme.ui.cyanText}`}>{hero.subtitle}</span> {hero.description}
      </motion.p>
    </div>
  );
}