// src/lib/phone-verification-token.ts
// Server-only. Used ONLY for the "signup" purpose: there's no account and no
// session yet when the phone gets verified, so we can't just check a
// database row tied to a user. Instead we hand the client a short-lived,
// tamper-proof token that says "this exact phone number was verified within
// the last N minutes." The signup route re-validates it before creating the
// account — the client can carry it around, but can't forge or extend it
// without knowing PHONE_VERIFICATION_TOKEN_SECRET.

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.PHONE_VERIFICATION_TOKEN_SECRET!;
const TOKEN_TTL_MS = 20 * 60 * 1000; // 20 minutes — enough time to fill in the signup form

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createPhoneVerifiedToken(e164Phone: string): string {
  if (!SECRET) throw new Error("PHONE_VERIFICATION_TOKEN_SECRET is not set");
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${e164Phone}|${expiresAt}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

export function verifyPhoneVerifiedToken(
  token: string,
  expectedE164Phone: string
): { valid: true } | { valid: false; reason: string } {
  if (!SECRET) return { valid: false, reason: "Server misconfigured." };

  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return { valid: false, reason: "Malformed verification token." };
  }

  const parts = decoded.split("|");
  if (parts.length !== 3) return { valid: false, reason: "Malformed verification token." };

  const [phone, expiresAtStr, signature] = parts;
  const expectedSignature = sign(`${phone}|${expiresAtStr}`);

  const sigBuf = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedSigBuf.length || !timingSafeEqual(sigBuf, expectedSigBuf)) {
    return { valid: false, reason: "Invalid verification token." };
  }

  if (phone !== expectedE164Phone) {
    return { valid: false, reason: "Verification token does not match this phone number." };
  }

  if (Date.now() > Number(expiresAtStr)) {
    return { valid: false, reason: "Phone verification expired. Please verify again." };
  }

  return { valid: true };
}
