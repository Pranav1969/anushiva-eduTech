// src/lib/textbee-otp.ts
// TEMPORARY dev-stage OTP provider. Sends the SMS through your own Android
// phone via textbee.dev, and handles code generation / storage / checking
// itself (Twilio Verify normally does that part).
// Same return shape as twilio-verify.ts so it can be swapped later.

import { createClient } from "@supabase/supabase-js";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

type Result = { ok: true } | { ok: false; error: string; code?: string };

const OTP_TTL_MINUTES = 5;
const MAX_CHECK_ATTEMPTS = 5;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function hashCode(phone: string, code: string) {
  const secret = process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret";
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

export async function sendTextbeeOtp(e164Phone: string): Promise<Result> {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  if (!apiKey || !deviceId) {
    console.error("[textbee-otp] Missing TEXTBEE_API_KEY / TEXTBEE_DEVICE_ID");
    return { ok: false, code: "NOT_CONFIGURED", error: "Mobile verification is temporarily unavailable." };
  }

  const code = String(randomInt(100000, 1000000)); // 6 digits
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

  // Store (replaces any earlier code for this phone)
  const { error: dbErr } = await supabaseAdmin
    .from("phone_otps")
    .upsert({ phone: e164Phone, code_hash: hashCode(e164Phone, code), expires_at: expiresAt, attempts: 0 });

  if (dbErr) {
    console.error("[textbee-otp] DB error (did you create the phone_otps table?):", dbErr.message);
    return { ok: false, code: "DB_ERROR", error: "Could not send the code. Please try again." };
  }

  try {
    const res = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        recipients: [e164Phone],
        message: `Your verification code is ${code}. It is valid for ${OTP_TTL_MINUTES} minutes. Do not share it with anyone.`,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[textbee-otp] send failed:", res.status, body);
      await supabaseAdmin.from("phone_otps").delete().eq("phone", e164Phone);
      return {
        ok: false,
        code: "SEND_FAILED",
        error: "Could not send the code. Please try again in a moment.",
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[textbee-otp] network error:", err);
    await supabaseAdmin.from("phone_otps").delete().eq("phone", e164Phone);
    return { ok: false, code: "NETWORK", error: "SMS service is slow right now. Please try again." };
  }
}

export async function checkTextbeeOtp(e164Phone: string, code: string): Promise<Result> {
  const { data: row, error } = await supabaseAdmin
    .from("phone_otps")
    .select("code_hash, expires_at, attempts")
    .eq("phone", e164Phone)
    .maybeSingle();

  if (error) {
    console.error("[textbee-otp] DB error on check:", error.message);
    return { ok: false, code: "DB_ERROR", error: "Could not verify the code. Please try again." };
  }

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    if (row) await supabaseAdmin.from("phone_otps").delete().eq("phone", e164Phone);
    return { ok: false, code: "EXPIRED", error: "This code has expired. Please request a new one." };
  }

  if (row.attempts >= MAX_CHECK_ATTEMPTS) {
    await supabaseAdmin.from("phone_otps").delete().eq("phone", e164Phone);
    return { ok: false, code: "TOO_MANY_CHECKS", error: "Too many wrong attempts. Please request a new code." };
  }

  const given = Buffer.from(hashCode(e164Phone, code));
  const stored = Buffer.from(row.code_hash);
  const match = given.length === stored.length && timingSafeEqual(given, stored);

  if (!match) {
    await supabaseAdmin.from("phone_otps").update({ attempts: row.attempts + 1 }).eq("phone", e164Phone);
    return { ok: false, code: "WRONG_CODE", error: "That code is incorrect. Please check and try again." };
  }

  // One-time use
  await supabaseAdmin.from("phone_otps").delete().eq("phone", e164Phone);
  return { ok: true };
}