// src/utils/istDate.ts
//
// Every "what date is it" or "what date was this article published" decision
// in this app MUST go through here instead of raw `new Date()`. The reason:
// Vercel's serverless functions run in UTC, but the audience is IST
// (UTC+5:30). Between 12:00 AM and 5:30 AM IST, the UTC calendar date is
// still "yesterday" -- a naive `new Date().toISOString().split("T")[0]`
// during that window silently mislabels articles and mis-detects "today" on
// both the server (page.tsx) and the client (NewsFeedClientWrapper), which
// is exactly the drift reported: news from just after midnight IST showing
// up filed under the previous day.
//
// The functions here work identically whether called from server code
// (Vercel/UTC) or client code (whatever the browser's local timezone is),
// because they never rely on the runtime's local timezone at all -- they
// operate on the UTC timestamp plus a fixed +5:30 offset.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Converts any Date into its IST calendar date, as "YYYY-MM-DD". */
export function toISTDateString(date: Date): string {
  const istShifted = new Date(date.getTime() + IST_OFFSET_MS);
  return istShifted.toISOString().split("T")[0];
}

/** Today's date, in IST, as "YYYY-MM-DD". Use this instead of `new Date()` everywhere. */
export function todayIST(): string {
  return toISTDateString(new Date());
}

/** Shifts an ISO date string ("YYYY-MM-DD") by N days (negative = past) via pure UTC date math -- no timezone ambiguity. */
export function shiftISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split("T")[0];
}

/**
 * Formats an ISO date string ("YYYY-MM-DD") for display, pinned to Asia/Kolkata
 * so the label is correct regardless of what timezone the rendering environment
 * (server or browser) happens to be in.
 */
export function formatISTDateLabel(
  iso: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }
): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { ...options, timeZone: "Asia/Kolkata" });
}