// src/app/student/components/StudentBrand.tsx
"use client";

// Silver edition of the ANUSHIVA brand for the student side.
// Same official star-A silhouette as AnushivaBrand.tsx (gold / premium pages),
// finished in polished platinum-silver.
// Wordmark / footer / loader follow the active theme (dark or light) automatically;
// pass `tone` only when a page needs to override it (e.g. the cream notes view).
// NOTE: the Dark/Light toggle is NOT here. It lives only in the dashboard header.

import { useTheme } from "../theme/ThemeProvider";

export const STUDENT_BRAND = {
  name: "ANUSHIVA",
  product: "Student Portal",
  tagline: "Learn · Practice · Excel",
};

type Tone = "dark" | "light";

// Official star-A silhouette (viewBox 0 0 215 285). Use fill-rule evenodd so the inner cut-outs stay open.
const MARK_PATH =
  "M32.0,268.8C38.0,253.7 59.2,198.7 72.5,163.5C75.4,155.8 78.1,148.8 78.5,147.8C79.0,146.6 77.6,145.1 72.8,141.9C69.3,139.6 64.7,136.2 62.5,134.5C60.3,132.7 54.0,128.2 48.5,124.5C43.0,120.7 32.5,113.1 25.1,107.6L11.6,97.5L54.7,97.2L97.9,97.0L102.8,84.2C113.6,56.6 130.0,13.0 130.0,12.0C130.0,8.8 132.2,12.1 134.8,19.2C136.5,23.8 139.9,32.9 142.5,39.5C145.0,46.1 150.0,59.4 153.6,69.0C157.2,78.6 161.1,88.9 162.2,91.8L164.2,97.0L183.9,97.0L203.5,97.1L193.4,101.0C187.8,103.1 180.0,105.8 176.1,107.1C172.2,108.4 169.0,109.8 169.0,110.3C169.0,110.7 170.5,114.8 172.3,119.3C174.2,123.8 177.6,132.4 179.9,138.5C182.2,144.6 189.4,163.2 195.9,180.0C202.4,196.8 207.6,210.6 207.5,210.8C207.1,211.3 190.4,201.7 187.6,199.3C182.1,194.7 177.0,187.5 174.6,181.0C173.2,177.4 167.0,160.4 160.8,143.2L149.5,112.0L137.6,112.0C126.8,112.0 125.8,111.9 126.4,110.2C126.8,109.3 128.1,105.9 129.3,102.8L131.5,97.0L137.7,97.0C141.2,97.0 144.0,96.8 144.0,96.6C144.0,96.4 142.5,92.2 140.6,87.3C138.8,82.5 136.1,74.8 134.5,70.2C133.0,65.6 131.7,62.0 131.5,62.2C131.4,62.4 126.0,76.4 119.6,93.5C113.1,110.6 106.3,128.5 104.3,133.3C101.1,141.2 100.9,142.2 102.4,143.3C133.3,166.4 159.9,186.6 160.0,187.1C160.0,187.4 155.9,188.4 150.8,189.4C100.9,198.9 50.9,231.1 35.5,263.5C32.2,270.5 29.9,273.9 32.0,268.8ZM89.3,191.8C92.7,190.1 101.2,186.3 108.2,183.5L120.9,178.4L108.7,169.1C102.0,164.0 96.0,159.9 95.5,159.8C95.0,159.8 93.4,162.7 92.1,166.2C90.1,171.5 83.0,189.6 81.3,193.8C80.5,195.7 82.6,195.2 89.3,191.8ZM88.8,120.6C90.6,116.2 91.8,112.5 91.6,112.3C91.4,112.1 84.4,112.1 76.1,112.2L60.9,112.5L72.7,121.3C79.1,126.1 84.7,129.7 85.0,129.3C85.4,128.8 87.1,124.9 88.8,120.6Z";

/** Resolve the effective tone: explicit override wins, otherwise follow the theme. */
function useTone(tone?: Tone): Tone {
  const { theme } = useTheme();
  return tone ?? theme.mode;
}

/** Shared styles: one slow shine sweep + gentle pulse, both disabled for reduced-motion users. */
function BrandStyles() {
  return (
    <style>{`
      .sb-shine{animation:sbShine 7s ease-in-out infinite}
      @keyframes sbShine{0%,60%{transform:translateX(0) skewX(-18deg)}100%{transform:translateX(420px) skewX(-18deg)}}
      .sb-pulse{animation:sbPulse 2.4s ease-in-out infinite}
      @keyframes sbPulse{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
      @media (prefers-reduced-motion: reduce){.sb-shine,.sb-pulse{animation:none}}
    `}</style>
  );
}

/**
 * The star-A mark in polished silver.
 * - `tile`  : sits on a dark rounded tile with a soft silver glow (works on dark AND light backgrounds).
 * - default : the bare silver mark.
 */
export function StarMark({ size = 28, tile = false, id = "sm" }: { size?: number; tile?: boolean; id?: string }) {
  const gid = `${id}-silver`;
  const sid = `${id}-shine`;
  const mark = (
    <svg
      viewBox="0 0 215 285"
      aria-hidden
      className="block"
      style={{ height: tile ? size * 0.68 : size, width: "auto", filter: "drop-shadow(0 0 8px rgba(203,213,225,.40))" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#CBD5E1" />
          <stop offset="75%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id={sid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity=".7" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={MARK_PATH} fillRule="evenodd" />
        </clipPath>
      </defs>
      <path d={MARK_PATH} fill={`url(#${gid})`} fillRule="evenodd" />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="-80" y="0" width="70" height="285" fill={`url(#${sid})`} transform="skewX(-18)" className="sb-shine" />
      </g>
    </svg>
  );
  if (!tile) return mark;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-[10px] border"
      style={{
        width: size,
        height: size,
        borderColor: "rgba(203,213,225,.38)",
        background: "linear-gradient(160deg,#1E293B,#0B1220)",
        boxShadow: "0 0 20px -5px rgba(203,213,225,.45), inset 0 1px 0 rgba(255,255,255,.14)",
      }}
    >
      {mark}
    </span>
  );
}

/**
 * Header lockup:  [silver star-A tile]  ANUSHIVA™ | Student Portal
 * Follows the theme (silver-white lettering on dark, deep slate on light).
 */
export function Wordmark({
  tone,
  large = false,
  className = "",
}: {
  tone?: Tone;
  large?: boolean;
  className?: string;
}) {
  const isDark = useTone(tone) === "dark";
  const nameGradient = isDark
    ? "linear-gradient(180deg,#FFFFFF 0%,#CBD5E1 55%,#94A3B8 100%)"
    : "linear-gradient(180deg,#1E293B 0%,#334155 55%,#64748B 100%)";
  return (
    <span
      className={`inline-flex items-center gap-2.5 whitespace-nowrap select-none ${className}`}
      aria-label={`${STUDENT_BRAND.name} ${STUDENT_BRAND.product}`}
    >
      <BrandStyles />
      <StarMark size={large ? 40 : 32} tile id={large ? "wm-l" : "wm-s"} />
      <span
        className={`font-extrabold tracking-[0.22em] transition-all duration-500 ${large ? "text-base" : "text-[13px]"}`}
        style={{
          backgroundImage: nameGradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        }}
      >
        {STUDENT_BRAND.name}
        <sup
          className="ml-0.5 text-[8px] tracking-normal"
          style={{ WebkitTextFillColor: isDark ? "#94A3B8" : "#64748B", color: isDark ? "#94A3B8" : "#64748B" }}
        >
          ™
        </sup>
      </span>
      <span aria-hidden className={`h-4 w-px transition-colors duration-500 ${isDark ? "bg-white/15" : "bg-stone-300"}`} />
      <span
        className={`font-medium tracking-wide transition-colors duration-500 ${large ? "text-sm" : "text-[11px]"} ${
          isDark ? "text-slate-400" : "text-stone-500"
        }`}
      >
        {STUDENT_BRAND.product}
      </span>
    </span>
  );
}

/** Slim brand strip at the top of a page. Tagline hides on small screens. */
export function BrandBar({ tone }: { tone?: Tone }) {
  const isDark = useTone(tone) === "dark";
  return (
    <div className="flex items-center justify-between gap-3">
      <Wordmark tone={tone} />
      <span
        className={`hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] transition-colors duration-500 sm:inline-flex ${
          isDark ? "text-slate-500" : "text-stone-400"
        }`}
      >
        <span
          aria-hidden
          className="h-px w-8"
          style={{
            background: isDark
              ? "linear-gradient(90deg,transparent,rgba(203,213,225,.45))"
              : "linear-gradient(90deg,transparent,rgba(100,116,139,.5))",
          }}
        />
        {STUDENT_BRAND.tagline}
      </span>
    </div>
  );
}

/** Quiet signature at the bottom of the page: star mark plus name. */
export function BrandFooter({ tone }: { tone?: Tone }) {
  const isDark = useTone(tone) === "dark";
  return (
    <div className="mt-10 flex flex-col items-center gap-2 pb-2 select-none" aria-hidden>
      <span
        className="h-px w-24"
        style={{
          background: isDark
            ? "linear-gradient(90deg,transparent,rgba(203,213,225,.35),transparent)"
            : "linear-gradient(90deg,transparent,rgba(100,116,139,.4),transparent)",
        }}
      />
      <div className={`flex items-center gap-2 transition-opacity duration-500 ${isDark ? "opacity-60" : "opacity-70"}`}>
        <StarMark size={16} id="ft" />
        <span className={`text-[10px] font-bold tracking-[0.34em] ${isDark ? "text-slate-300" : "text-stone-600"}`}>
          {STUDENT_BRAND.name}
        </span>
      </div>
      <p className={`text-[9px] uppercase tracking-[0.25em] ${isDark ? "text-slate-600" : "text-stone-400"}`}>
        Crafted for aspirants
      </p>
    </div>
  );
}

/** Branded loading mark: the silver star gently breathing. Used on the initial loading screen. */
export function BrandLoader({ tone }: { tone?: Tone }) {
  const isDark = useTone(tone) === "dark";
  return (
    <div className="flex flex-col items-center gap-4">
      <BrandStyles />
      <div className="sb-pulse">
        <StarMark size={64} tile id="ld" />
      </div>
      <span className={`text-[11px] font-bold tracking-[0.4em] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
        {STUDENT_BRAND.name}
      </span>
    </div>
  );
}