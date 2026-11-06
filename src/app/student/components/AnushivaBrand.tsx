//src\app\student\components\AnushivaBrand.tsx
"use client";

// One place to control how the ANUSHIVA name appears on premium reports.
// Rule of thumb: visible enough to survive a screenshot, quiet enough never to annoy.

export const BRAND = {
  name: "ANUSHIVA",
  product: "Strategy Analytics",
  title: "Speed & Strategy Report · ANUSHIVA",
};

/** Monogram: a small gold-edged tile with the initial. */
function Mark({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="da-head inline-flex shrink-0 items-center justify-center rounded-[7px] font-extrabold text-[#0C1915]"
      style={{
        width: size, height: size, fontSize: size * 0.58,
        background: "linear-gradient(160deg,#FFE29A,#FFB627 55%,#E8892B)",
        boxShadow: "0 0 18px -2px rgba(255,182,39,.55), inset 0 1px 0 rgba(255,255,255,.55)",
      }}
    >
      A
    </span>
  );
}

/** Header / hero lockup:  [A] ANUSHIVA™ | Strategy Analytics */
export function Wordmark({ large = false, className = "" }: { large?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap ${className}`} aria-label={`${BRAND.name} ${BRAND.product}`}>
      <Mark size={large ? 28 : 22} />
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

/** Tiny corner stamp for the big shareable chart cards. */
export function CardMark() {
  return (
    <span
      aria-hidden
      className="da-head pointer-events-none absolute bottom-2.5 right-5 select-none text-[10px] font-bold tracking-[0.3em] text-white/30"
    >
      {BRAND.name}
    </span>
  );
}

/** Verification seal, shown at the end of the report. */
export function ReportSeal({ student, test, reportId, verified }: { student?: string | null; test?: string | null; reportId: string; verified?: number | null }) {
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/[0.07] bg-[#07110D]/60 p-5 text-center sm:flex-row sm:text-left">
      <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="sealG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFE29A" /><stop offset="100%" stopColor="#E8892B" /></linearGradient>
        </defs>
        <circle cx="40" cy="40" r="37" fill="none" stroke="url(#sealG)" strokeWidth="1.5" />
        <circle cx="40" cy="40" r="31" fill="none" stroke="url(#sealG)" strokeWidth="0.8" strokeDasharray="2 3" />
        <circle cx="40" cy="40" r="24" fill="rgba(255,182,39,.10)" stroke="url(#sealG)" strokeWidth="1" />
        <text x="40" y="49" textAnchor="middle" fontSize="26" fontWeight="800" fill="url(#sealG)" fontFamily="'Bricolage Grotesque', sans-serif">A</text>
      </svg>
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