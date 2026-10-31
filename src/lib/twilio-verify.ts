// src/lib/twilio-verify.ts
// Server-only. Talks to Twilio Verify's REST API directly with plain fetch.
// Decoupled from Supabase Auth: it only answers "did this person receive and
// re-type the correct code for this phone number?"

const VERIFY_BASE = "https://verify.twilio.com/v2/Services";
const TIMEOUT_MS = 10_000;

type Result = { ok: true } | { ok: false; error: string; code?: string };

// Read env at call time (not import time) so a missing config can never break imports.
function getConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !service) return null;
  return {
    service,
    authHeader: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
  };
}

const NOT_CONFIGURED: Result = {
  ok: false,
  code: "NOT_CONFIGURED",
  error: "Mobile verification is temporarily unavailable. Please try again later.",
};

// Twilio error code -> message safe to show students.
// Full list: https://www.twilio.com/docs/api/errors
function friendlySendError(twilioCode?: number, fallback?: string): { error: string; code: string } {
  switch (twilioCode) {
    case 60200:
    case 60205: // SMS not supported (landline etc.)
      return { code: "INVALID_NUMBER", error: "This number can't receive SMS. Please check it or use another number." };
    case 60203: // max send attempts reached for this number
      return { code: "TOO_MANY_SENDS", error: "Too many codes requested for this number. Please try again in a few minutes." };
    case 60410: // blocked by Twilio fraud guard
    case 60605:
      return { code: "BLOCKED", error: "We couldn't send a code to this number. Please try a different number." };
    case 21608: // trial account: unverified destination
      return { code: "TRIAL_UNVERIFIED", error: "SMS service is still being set up. Please try again later." };
    case 21408: // geo permission not enabled
      return { code: "GEO_BLOCKED", error: "SMS to this region isn't enabled yet. Please contact support." };
    default:
      // Log the raw message server-side, show a generic one to the user.
      console.error("[twilio-verify] send failed:", twilioCode, fallback);
      return { code: "SEND_FAILED", error: "Could not send the code. Please try again in a moment." };
  }
}

async function twilioPost(path: string, params: Record<string, string>, authHeader: string) {
  return fetch(`${VERIFY_BASE}/${path}`, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function sendTwilioOtp(e164Phone: string): Promise<Result> {
  const cfg = getConfig();
  if (!cfg) {
    console.error("[twilio-verify] Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID");
    return NOT_CONFIGURED;
  }

  try {
    const res = await twilioPost(`${cfg.service}/Verifications`, { To: e164Phone, Channel: "sms" }, cfg.authHeader);
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => ({}));
    return { ok: false, ...friendlySendError(body?.code, body?.message) };
  } catch (err) {
    console.error("[twilio-verify] send network error:", err);
    return { ok: false, code: "NETWORK", error: "SMS service is slow right now. Please try again." };
  }
}

export async function checkTwilioOtp(e164Phone: string, code: string): Promise<Result> {
  const cfg = getConfig();
  if (!cfg) {
    console.error("[twilio-verify] Missing Twilio env vars");
    return NOT_CONFIGURED;
  }

  try {
    const res = await twilioPost(`${cfg.service}/VerificationCheck`, { To: e164Phone, Code: code }, cfg.authHeader);
    const body = await res.json().catch(() => ({}));

    if (res.status === 404 || body?.code === 20404) {
      // No pending verification: code expired (10 min), already used, or too many wrong tries.
      return { ok: false, code: "EXPIRED", error: "This code has expired. Please request a new one." };
    }

    if (body?.code === 60202) {
      return { ok: false, code: "TOO_MANY_CHECKS", error: "Too many wrong attempts. Please request a new code." };
    }

    if (!res.ok) {
      console.error("[twilio-verify] check failed:", body?.code, body?.message);
      return { ok: false, code: "CHECK_FAILED", error: "Could not verify the code. Please try again." };
    }

    if (body.status !== "approved") {
      return { ok: false, code: "WRONG_CODE", error: "That code is incorrect. Please check and try again." };
    }

    return { ok: true };
  } catch (err) {
    console.error("[twilio-verify] check network error:", err);
    return { ok: false, code: "NETWORK", error: "SMS service is slow right now. Please try again." };
  }
}

/** Normalizes a 10-digit Indian mobile number into E.164 (+91XXXXXXXXXX). */
export function toE164India(rawPhone: string): string {
  const digits = String(rawPhone).replace(/\D/g, "");
  return `+91${digits.slice(-10)}`;
}