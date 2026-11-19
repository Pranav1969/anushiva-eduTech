"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@/app/student/theme/ThemeProvider";
import { MARK_PATH, MARK_W, MARK_H, STAR_PATH, useBrandPalette } from "./AnushivaLogo";

export function AnimatedGrid() {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const line = isDark ? "#1e293b" : "#c7d2fe";

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
        style={{
          backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
          opacity: isDark ? 0.2 : 0.35,
        }}
      />
    </div>
  );
}

// Fixed positions (no Math.random) so server and client render the same thing.
const TWINKLES = [
  { x: 8, y: 14, s: 10, d: 0 }, { x: 22, y: 70, s: 7, d: 1.2 }, { x: 35, y: 28, s: 6, d: 2.1 },
  { x: 48, y: 88, s: 9, d: 0.6 }, { x: 61, y: 12, s: 7, d: 1.8 }, { x: 72, y: 56, s: 11, d: 0.3 },
  { x: 84, y: 22, s: 8, d: 2.6 }, { x: 92, y: 78, s: 6, d: 1.0 }, { x: 15, y: 46, s: 6, d: 2.9 },
  { x: 54, y: 48, s: 5, d: 1.5 }, { x: 78, y: 92, s: 8, d: 0.9 }, { x: 40, y: 6, s: 6, d: 2.3 },
  { x: 96, y: 44, s: 7, d: 0.2 }, { x: 4, y: 90, s: 9, d: 1.7 },
];

function StarBackdrop() {
  const reduce = useReducedMotion();
  const p = useBrandPalette();
  const op = p.dark ? 0.08 : 0.14;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* giant watermark of the real logo, floating gently, with orbit rings behind it */}
      <div className="absolute right-[-18%] top-1/2 h-[820px] w-[820px] -translate-y-1/2 lg:right-[-6%]">
        {[0.62, 0.82, 1].map((r, i) => (
          <motion.div
            key={r}
            className="absolute rounded-full border"
            style={{
              inset: `${((1 - r) / 2) * 100}%`,
              borderColor: p.ring,
              opacity: p.dark ? 0.2 : 0.32,
              borderStyle: i === 1 ? "dashed" : "solid",
            }}
            animate={reduce ? undefined : { rotate: i % 2 ? -360 : 360 }}
            transition={{ duration: 90 + i * 40, repeat: Infinity, ease: "linear" }}
          />
        ))}

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={reduce ? undefined : { y: [-10, 12, -10], scale: [1, 1.03, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            viewBox={`0 0 ${MARK_W} ${MARK_H}`}
            className="h-[70%] w-auto"
            style={{ opacity: op }}
          >
            <defs>
              <linearGradient id="bgMark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={p.stops[0]} />
                <stop offset="45%" stopColor={p.stops[1]} />
                <stop offset="100%" stopColor={p.stops[2]} />
              </linearGradient>
            </defs>
            <path d={MARK_PATH} fill="url(#bgMark)" fillRule="evenodd" />
          </svg>
        </motion.div>
      </div>

      {/* twinkling gold sparkles */}
      {TWINKLES.map((t, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 100 100"
          className="absolute"
          style={{ left: `${t.x}%`, top: `${t.y}%`, width: t.s, height: t.s }}
          initial={{ opacity: 0.15, scale: 0.7 }}
          animate={reduce ? { opacity: 0.4 } : { opacity: [0.1, 0.85, 0.1], scale: [0.7, 1.15, 0.7] }}
          transition={{ duration: 3.5 + (i % 4), delay: t.d, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d={STAR_PATH} fill={i % 3 === 0 ? p.accent : p.stops[1]} />
        </motion.svg>
      ))}
    </div>
  );
}

export function BackgroundEffects() {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  return (
    <>
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isDark ? 0.15 : 0.5 }}
          transition={{ duration: 2 }}
          className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] ${
            isDark ? "bg-gradient-to-tr from-blue-600 to-indigo-900" : "bg-gradient-to-tr from-violet-300 to-sky-200"
          }`}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isDark ? 0.1 : 0.45 }}
          transition={{ duration: 2.5 }}
          className={`absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[100px] ${
            isDark ? "bg-gradient-to-br from-purple-600 to-cyan-900" : "bg-gradient-to-br from-fuchsia-200 to-cyan-200"
          }`}
        />
      </div>
      <StarBackdrop />
    </>
  );
}