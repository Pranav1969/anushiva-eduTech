//src\app\student\components\AnushivaBrand.tsx
"use client";

// One place to control how the ANUSHIVA name appears on premium reports.
// The star-A mark below is traced directly from the official logo, so the shape never drifts.
// Rule of thumb: visible enough to survive a screenshot, quiet enough never to annoy.

export const BRAND = {
  name: "ANUSHIVA",
  product: "Strategy Analytics",
  title: "Speed & Strategy Report · ANUSHIVA",
};

// Official star-A silhouette (viewBox 0 0 215 285). Use fill-rule evenodd so the inner cut-outs stay open.
const MARK_PATH =
  "M32.0,268.8C38.0,253.7 59.2,198.7 72.5,163.5C75.4,155.8 78.1,148.8 78.5,147.8C79.0,146.6 77.6,145.1 72.8,141.9C69.3,139.6 64.7,136.2 62.5,134.5C60.3,132.7 54.0,128.2 48.5,124.5C43.0,120.7 32.5,113.1 25.1,107.6L11.6,97.5L54.7,97.2L97.9,97.0L102.8,84.2C113.6,56.6 130.0,13.0 130.0,12.0C130.0,8.8 132.2,12.1 134.8,19.2C136.5,23.8 139.9,32.9 142.5,39.5C145.0,46.1 150.0,59.4 153.6,69.0C157.2,78.6 161.1,88.9 162.2,91.8L164.2,97.0L183.9,97.0L203.5,97.1L193.4,101.0C187.8,103.1 180.0,105.8 176.1,107.1C172.2,108.4 169.0,109.8 169.0,110.3C169.0,110.7 170.5,114.8 172.3,119.3C174.2,123.8 177.6,132.4 179.9,138.5C182.2,144.6 189.4,163.2 195.9,180.0C202.4,196.8 207.6,210.6 207.5,210.8C207.1,211.3 190.4,201.7 187.6,199.3C182.1,194.7 177.0,187.5 174.6,181.0C173.2,177.4 167.0,160.4 160.8,143.2L149.5,112.0L137.6,112.0C126.8,112.0 125.8,111.9 126.4,110.2C126.8,109.3 128.1,105.9 129.3,102.8L131.5,97.0L137.7,97.0C141.2,97.0 144.0,96.8 144.0,96.6C144.0,96.4 142.5,92.2 140.6,87.3C138.8,82.5 136.1,74.8 134.5,70.2C133.0,65.6 131.7,62.0 131.5,62.2C131.4,62.4 126.0,76.4 119.6,93.5C113.1,110.6 106.3,128.5 104.3,133.3C101.1,141.2 100.9,142.2 102.4,143.3C133.3,166.4 159.9,186.6 160.0,187.1C160.0,187.4 155.9,188.4 150.8,189.4C100.9,198.9 50.9,231.1 35.5,263.5C32.2,270.5 29.9,273.9 32.0,268.8ZM89.3,191.8C92.7,190.1 101.2,186.3 108.2,183.5L120.9,178.4L108.7,169.1C102.0,164.0 96.0,159.9 95.5,159.8C95.0,159.8 93.4,162.7 92.1,166.2C90.1,171.5 83.0,189.6 81.3,193.8C80.5,195.7 82.6,195.2 89.3,191.8ZM88.8,120.6C90.6,116.2 91.8,112.5 91.6,112.3C91.4,112.1 84.4,112.1 76.1,112.2L60.9,112.5L72.7,121.3C79.1,126.1 84.7,129.7 85.0,129.3C85.4,128.8 87.1,124.9 88.8,120.6Z";

/**
 * The logo's star-A mark in champagne-to-gold metal.
 * - `tile`  : sits on a dark rounded tile with a soft gold glow (for headers).
 * - default : the bare gold mark (for seals and hero lockups).
 */
export function StarMark({ size = 28, tile = false, id = "sm" }: { size?: number; tile?: boolean; id?: string }) {
  const gid = `${id}-metal`;
  const sid = `${id}-shine`;
  const mark = (
    <svg
      viewBox="0 0 215 285"
      aria-hidden
      className="block"
      style={{ height: tile ? size * 0.68 : size, width: "auto", filter: "drop-shadow(0 0 10px rgba(212,175,55,.45))" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FBEFC2" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#9C7A1E" />
        </linearGradient>
        <linearGradient id={sid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity=".55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}><path d={MARK_PATH} fillRule="evenodd" /></clipPath>
      </defs>
      <path d={MARK_PATH} fill={`url(#${gid})`} fillRule="evenodd" />
      {/* one slow sweep of light across the metal, clipped to the mark */}
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="-80" y="0" width="70" height="285" fill={`url(#${sid})`} transform="skewX(-18)" className="da-markshine" />
      </g>
    </svg>
  );
  if (!tile) return mark;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-[10px] border"
      style={{
        width: size, height: size,
        borderColor: "rgba(212,175,55,.45)",
        background: "linear-gradient(160deg,#1A2440,#0B1220)",
        boxShadow: "0 0 22px -4px rgba(212,175,55,.45), inset 0 1px 0 rgba(255,255,255,.12)",
      }}
    >
      {mark}
    </span>
  );
}

/** Header / hero lockup:  [star-A tile] ANUSHIVA™ | Strategy Analytics */
export function Wordmark({ large = false, className = "" }: { large?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap ${className}`} aria-label={`${BRAND.name} ${BRAND.product}`}>
      <style>{`
        .da-markshine{animation:daMarkShine 6s ease-in-out infinite}
        @keyframes daMarkShine{0%,55%{transform:translateX(0) skewX(-18deg)}100%{transform:translateX(420px) skewX(-18deg)}}
      `}</style>
      <StarMark size={large ? 40 : 30} tile id={large ? "wm-l" : "wm-s"} />
      <span className={`da-head da-grad-chalk font-extrabold tracking-[0.2em] ${large ? "text-base" : "text-[13px]"}`}>
        {BRAND.name}<sup className="ml-0.5 text-[8px] tracking-normal text-[var(--mute)]">™</sup>
      </span>
      <span aria-hidden className="h-4 w-px bg-white/15" />
      <span className={`font-medium tracking-wide text-[var(--mute)] ${large ? "text-sm" : "text-[11px]"}`}>{BRAND.product}</span>
    </span>
  );
}

/**
 * Whole-page watermark. Very faint repeated "ANUSHIVA · student name" so any screenshot
 * carries the brand (and who it belongs to) without distracting the reader.
 */
export function Watermark({ label }: { label?: string | null }) {
  const text = label ? `${BRAND.name}  ·  ${label}` : BRAND.name;
  const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='460' height='260'>` +
    `<text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' transform='rotate(-22 230 130)' ` +
    `font-family='Arial, sans-serif' font-size='17' font-weight='700' letter-spacing='5' fill='white'>${safe}</text></svg>`;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 select-none"
      style={{ opacity: 0.045, backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, backgroundSize: "460px 260px" }}
    />
  );
}

/** Tiny corner stamp for the big shareable chart cards: star mark plus name. */
export function CardMark() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-2.5 right-5 flex select-none items-center gap-2 opacity-40"
    >
      <svg viewBox="0 0 215 285" className="h-3.5 w-auto"><path d={MARK_PATH} fill="#fff" fillRule="evenodd" /></svg>
      <span className="da-head text-[10px] font-bold tracking-[0.3em] text-white">{BRAND.name}</span>
    </span>
  );
}

/** Verification seal, shown at the end of the report. The star-A sits inside a gold ring. */
export function ReportSeal({ student, test, reportId, verified }: { student?: string | null; test?: string | null; reportId: string; verified?: number | null }) {
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/[0.07] bg-[#090F1C]/60 p-5 text-center sm:flex-row sm:text-left">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="sealG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F1D98B" /><stop offset="100%" stopColor="#B8932A" /></linearGradient>
          </defs>
          <circle cx="40" cy="40" r="37" fill="none" stroke="url(#sealG)" strokeWidth="1.5" />
          <circle cx="40" cy="40" r="31" fill="none" stroke="url(#sealG)" strokeWidth="0.8" strokeDasharray="2 3" />
          <circle cx="40" cy="40" r="24" fill="rgba(212,175,55,.10)" stroke="url(#sealG)" strokeWidth="1" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center"><StarMark size={30} id="seal" /></span>
      </div>
      <div className="min-w-0 space-y-1">
        <div className="da-head da-grad-chalk text-base font-extrabold tracking-[0.14em]">{BRAND.name} {BRAND.product.toUpperCase()}</div>
        <p className="text-sm leading-relaxed text-[var(--mute)]">
          Prepared for <span className="font-semibold text-[var(--ink)]">{student || "this aspirant"}</span>
          {test ? <> · {test}</> : null}
        </p>
        <p className="text-xs text-[var(--mute)]">
          {verified ? `Benchmarked against ${verified} verified attempt${verified > 1 ? "s" : ""} · ` : ""}Report {reportId} · {date}
        </p>
      </div>
    </div>
  );
}