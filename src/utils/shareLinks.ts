// src/utils/shareLinks.ts
export const SHARE_PATH = "/student/anushiva/test"; // link always contains "anushiva"
const KEY = "anushiva_post_login_redirect";
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export function buildShareUrl(testId: string): string {
  // Optional: set NEXT_PUBLIC_SITE_URL=https://www.anushiva.com in .env so links always use your real domain
  const base = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
  return `${base}${SHARE_PATH}/${testId}`;
}

// Called by the share page when the visitor is NOT logged in
export function savePostLoginRedirect(path: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, ts: Date.now() }));
  } catch {}
}

// Called by the dashboard right after login. Returns the saved path once, then clears it.
export function consumePostLoginRedirect(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const { path, ts } = JSON.parse(raw);
    if (typeof path !== "string" || Date.now() - ts > MAX_AGE_MS) return null;
    // safety: only allow our own share links (prevents open-redirect abuse)
    if (!path.startsWith(`${SHARE_PATH}/`)) return null;
    return path;
  } catch {
    return null;
  }
}