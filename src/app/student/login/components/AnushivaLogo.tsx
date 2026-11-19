"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@/app/student/theme/ThemeProvider";

/* Official star-A silhouette (viewBox 0 0 215 285), copied from AnushivaBrand.tsx.
   Must be drawn with fillRule="evenodd" so the inner cut-outs stay open. */
export const MARK_PATH =
  "M32.0,268.8C38.0,253.7 59.2,198.7 72.5,163.5C75.4,155.8 78.1,148.8 78.5,147.8C79.0,146.6 77.6,145.1 72.8,141.9C69.3,139.6 64.7,136.2 62.5,134.5C60.3,132.7 54.0,128.2 48.5,124.5C43.0,120.7 32.5,113.1 25.1,107.6L11.6,97.5L54.7,97.2L97.9,97.0L102.8,84.2C113.6,56.6 130.0,13.0 130.0,12.0C130.0,8.8 132.2,12.1 134.8,19.2C136.5,23.8 139.9,32.9 142.5,39.5C145.0,46.1 150.0,59.4 153.6,69.0C157.2,78.6 161.1,88.9 162.2,91.8L164.2,97.0L183.9,97.0L203.5,97.1L193.4,101.0C187.8,103.1 180.0,105.8 176.1,107.1C172.2,108.4 169.0,109.8 169.0,110.3C169.0,110.7 170.5,114.8 172.3,119.3C174.2,123.8 177.6,132.4 179.9,138.5C182.2,144.6 189.4,163.2 195.9,180.0C202.4,196.8 207.6,210.6 207.5,210.8C207.1,211.3 190.4,201.7 187.6,199.3C182.1,194.7 177.0,187.5 174.6,181.0C173.2,177.4 167.0,160.4 160.8,143.2L149.5,112.0L137.6,112.0C126.8,112.0 125.8,111.9 126.4,110.2C126.8,109.3 128.1,105.9 129.3,102.8L131.5,97.0L137.7,97.0C141.2,97.0 144.0,96.8 144.0,96.6C144.0,96.4 142.5,92.2 140.6,87.3C138.8,82.5 136.1,74.8 134.5,70.2C133.0,65.6 131.7,62.0 131.5,62.2C131.4,62.4 126.0,76.4 119.6,93.5C113.1,110.6 106.3,128.5 104.3,133.3C101.1,141.2 100.9,142.2 102.4,143.3C133.3,166.4 159.9,186.6 160.0,187.1C160.0,187.4 155.9,188.4 150.8,189.4C100.9,198.9 50.9,231.1 35.5,263.5C32.2,270.5 29.9,273.9 32.0,268.8ZM89.3,191.8C92.7,190.1 101.2,186.3 108.2,183.5L120.9,178.4L108.7,169.1C102.0,164.0 96.0,159.9 95.5,159.8C95.0,159.8 93.4,162.7 92.1,166.2C90.1,171.5 83.0,189.6 81.3,193.8C80.5,195.7 82.6,195.2 89.3,191.8ZM88.8,120.6C90.6,116.2 91.8,112.5 91.6,112.3C91.4,112.1 84.4,112.1 76.1,112.2L60.9,112.5L72.7,121.3C79.1,126.1 84.7,129.7 85.0,129.3C85.4,128.8 87.1,124.9 88.8,120.6Z";

export const MARK_W = 215;
export const MARK_H = 285;

/* Small generic 4-point sparkle, used only for the twinkling background dots */
export const STAR_PATH =
  "M50 2 C53 30 70 47 98 50 C70 53 53 70 50 98 C47 70 30 53 2 50 C30 47 47 30 50 2 Z";

/* Champagne-to-gold metal, same family as the dashboard's StarMark.
   Light mode uses a slightly deeper gold so it stays visible on the pearl background. */
export function useBrandPalette() {
  const { theme } = useTheme();
  const dark = theme.mode === "dark";
  return dark
    ? {
        dark,
        stops: ["#FBEFC2", "#D4AF37", "#9C7A1E"],
        glow: "rgba(212,175,55,0.45)",
        ring: "rgba(212,175,55,0.40)",
        accent: "#FBEFC2",
        wordmark:
          "linear-gradient(110deg,#9C7A1E 0%,#FBEFC2 30%,#D4AF37 50%,#FBEFC2 70%,#9C7A1E 100%)",
      }
    : {
        dark,
        stops: ["#E6C65A", "#C9A227", "#8A6A14"],
        glow: "rgba(201,162,39,0.40)",
        ring: "rgba(160,122,20,0.45)",
        accent: "#B8860B",
        wordmark:
          "linear-gradient(110deg,#7A5C0F 0%,#C9A227 30%,#E9CF76 50%,#C9A227 70%,#7A5C0F 100%)",
      };
}

/* The real star-A mark. `size` = its HEIGHT in px (width follows the logo's proportions). */
export function AnushivaMark({
  size = 56,
  className = "",
  sweep = true,
}: {
  size?: number;
  className?: string;
  sweep?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const p = useBrandPalette();
  const width = (size * MARK_W) / MARK_H;

  return (
    <motion.svg
      width={width}
      height={size}
      viewBox={`0 0 ${MARK_W} ${MARK_H}`}
      className={`block ${className}`}
      style={{ filter: `drop-shadow(0 0 ${Math.max(6, size / 5)}px ${p.glow})` }}
      animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      aria-label="Anushiva logo"
      role="img"
    >
      <defs>
        <linearGradient id={`m${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.stops[0]} />
          <stop offset="45%" stopColor={p.stops[1]} />
          <stop offset="100%" stopColor={p.stops[2]} />
        </linearGradient>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c${uid}`}>
          <path d={MARK_PATH} fillRule="evenodd" />
        </clipPath>
      </defs>

      <path d={MARK_PATH} fill={`url(#m${uid})`} fillRule="evenodd" />

      {/* a slow sweep of light across the metal, clipped to the mark */}
      {sweep && !reduce && (
        <g clipPath={`url(#c${uid})`}>
          <motion.rect
            y="0"
            width="60"
            height={MARK_H}
            fill={`url(#s${uid})`}
            style={{ skewX: -18 }}
            initial={{ x: -90 }}
            animate={{ x: [-90, -90, 270] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
          />
        </g>
      )}
    </motion.svg>
  );
}

/* Logo with glow halo + orbiting rings + travelling spark */
/* Logo with soft glow halo on a disc (no moving rings) */
export function AnushivaOrbitLogo({ size = 72 }: { size?: number }) {
  const reduce = useReducedMotion();
  const p = useBrandPalette();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, ${p.glow} 0%, transparent 68%)`, filter: "blur(8px)" }}
        animate={reduce ? undefined : { opacity: [0.5, 1, 0.5], scale: [0.9, 1.2, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* disc behind the mark so the gold always has contrast */}
      <div
        className="absolute inset-0 rounded-full border"
        style={{
          borderColor: p.ring,
          background: p.dark
            ? "linear-gradient(160deg,#1A2440,#0B1220)"
            : "linear-gradient(160deg,#FFFFFF,#F5EFE0)",
          boxShadow: p.dark
            ? `0 0 22px -4px ${p.glow}, inset 0 1px 0 rgba(255,255,255,.12)`
            : `0 8px 22px -8px ${p.glow}, inset 0 1px 0 rgba(255,255,255,.9)`,
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <AnushivaMark size={size * 0.6} />
      </div>
    </div>
  );
}
/* Shimmering ANUSHIVA wordmark (gold) */
export function AnushivaWordmark({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const p = useBrandPalette();

  return (
    <motion.span
      className={`font-black tracking-[0.18em] text-transparent bg-clip-text ${className}`}
      style={{ backgroundImage: p.wordmark, backgroundSize: "250% 100%", WebkitBackgroundClip: "text" }}
      animate={reduce ? undefined : { backgroundPosition: ["0% 50%", "100% 50%"] }}
      transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
    >
      ANUSHIVA
    </motion.span>
  );
}