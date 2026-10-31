// src/lib/otp-rate-limit.ts
// Server-only. Never import this from a "use client" file.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export type Purpose = "link" | "signup";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window
const COOLDOWN_MS = 45 * 1000; // 45s between OTP requests for the same phone
const MAX_PER_PHONE_PER_WINDOW = 5;
const MAX_PER_IP_PER_WINDOW = 10;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "cooldown" | "phone_limit" | "ip_limit"; retryAfterSeconds: number };

export async function checkAndRecordOtpRequest(
  phone: string,
  purpose: Purpose,
  ipAddress: string | null
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS).toISOString();

  const { data: recent } = await supabaseAdmin
    .from("otp_rate_limits")
    .select("last_requested_at")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .order("last_requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    const elapsed = now - new Date(recent.last_requested_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      return {
        allowed: false,
        reason: "cooldown",
        retryAfterSeconds: Math.ceil((COOLDOWN_MS - elapsed) / 1000),
      };
    }
  }

  const { count: phoneCount } = await supabaseAdmin
    .from("otp_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .eq("purpose", purpose)
    .gte("window_started_at", windowStart);

  if ((phoneCount ?? 0) >= MAX_PER_PHONE_PER_WINDOW) {
    return { allowed: false, reason: "phone_limit", retryAfterSeconds: 60 * 30 };
  }

  if (ipAddress) {
    const { count: ipCount } = await supabaseAdmin
      .from("otp_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .gte("window_started_at", windowStart);

    if ((ipCount ?? 0) >= MAX_PER_IP_PER_WINDOW) {
      return { allowed: false, reason: "ip_limit", retryAfterSeconds: 60 * 30 };
    }
  }

  await supabaseAdmin.from("otp_rate_limits").insert({
    phone,
    ip_address: ipAddress,
    purpose,
    window_started_at: new Date().toISOString(),
    last_requested_at: new Date().toISOString(),
  });

  return { allowed: true };
}

export async function logPhoneVerificationEvent(params: {
  studentId?: string | null;
  phone: string;
  purpose: Purpose;
  outcome: "otp_sent" | "verified" | "failed" | "rate_limited";
  ipAddress: string | null;
}) {
  await supabaseAdmin.from("phone_verification_audit").insert({
    student_id: params.studentId ?? null,
    phone: params.phone,
    purpose: params.purpose,
    outcome: params.outcome,
    ip_address: params.ipAddress,
  });
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
