// src/app/api/student/phone/send-otp/route.ts
//
// purpose: "signup" — used on the signup page, before any account exists.
//   No auth required.
// purpose: "link"   — used on /student/verify-phone, for an existing logged
//   -in student adding/re-verifying their number. Requires access_token.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAndRecordOtpRequest, getClientIp, logPhoneVerificationEvent } from "@/lib/otp-rate-limit";
// import { sendTwilioOtp, toE164India } from "@/lib/twilio-verify";
import { toE164India } from "@/lib/twilio-verify";
import { sendOtp } from "@/lib/otp-provider";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawPhone = body?.phone;
  const purpose = body?.purpose;

  if (!rawPhone || (purpose !== "link" && purpose !== "signup")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length < 10) {
    return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
  }

  const phone = toE164India(rawPhone);
  const ip = getClientIp(request);

  // "link" requires an authenticated existing student
  let studentId: string | null = null;
  if (purpose === "link") {
    const accessToken = body?.access_token;
    if (!accessToken) return NextResponse.json({ error: "Missing session." }, { status: 401 });

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("auth_id", userRes.user.id)
      .maybeSingle();

    if (!student) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    studentId = student.id;
  }

  // "signup" requires the phone isn't already claimed by another account
  if (purpose === "signup") {
    const { data: existing } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This mobile number is already registered. Please log in instead." },
        { status: 409 }
      );
    }
  }

  const rl = await checkAndRecordOtpRequest(phone, purpose, ip);

  if (!rl.allowed) {
    await logPhoneVerificationEvent({ studentId, phone, purpose, outcome: "rate_limited", ipAddress: ip });
    const messages: Record<string, string> = {
      cooldown: `Please wait ${rl.retryAfterSeconds}s before requesting another code.`,
      phone_limit: "Too many attempts for this number. Please try again in 30 minutes.",
      ip_limit: "Too many attempts from this network. Please try again in 30 minutes.",
    };
    return NextResponse.json(
      { error: messages[rl.reason], retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 }
    );
  }

  // const twilioRes = await sendTwilioOtp(phone);
const twilioRes = await sendOtp(phone);
  if (!twilioRes.ok) {
    await logPhoneVerificationEvent({ studentId, phone, purpose, outcome: "failed", ipAddress: ip });
    return NextResponse.json({ error: twilioRes.error }, { status: 502 });
  }

  await logPhoneVerificationEvent({ studentId, phone, purpose, outcome: "otp_sent", ipAddress: ip });

  return NextResponse.json({ sent: true, phone });
}
