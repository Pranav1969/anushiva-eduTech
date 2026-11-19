// src/utils/shareLinks.ts
export const SHARE_PATH = "/anushiva"; // links look like /anushiva/<code>
const KEY = "anushiva_post_login_redirect";
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export function buildShareUrl(code: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
  return `${base}${SHARE_PATH}/${code}`;
}

export function savePostLoginRedirect(path: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, ts: Date.now() }));
  } catch {}
}

export function consumePostLoginRedirect(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const { path, ts } = JSON.parse(raw);
    if (typeof path !== "string" || Date.now() - ts > MAX_AGE_MS) return null;
    // only our own share links are allowed (prevents open-redirect abuse)
    if (!/^\/anushiva\/[A-Za-z0-9]{6,32}$/.test(path)) return null;
    return path;
  } catch {
    return null;
  }
}