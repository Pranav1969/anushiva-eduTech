// src/app/api/student/phone/verify-otp/route.ts
//
// purpose: "signup" — Twilio confirms the code, we hand back a short-lived
//   signed token proving this phone was verified. The signup route
//   re-validates that token before creating the account. No DB write here.
// purpose: "link"   — Twilio confirms the code, we immediately update the
//   already-existing student's row (phone, phone_verified: true).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientIp, logPhoneVerificationEvent } from "@/lib/otp-rate-limit";
// import { checkTwilioOtp, toE164India } from "@/lib/twilio-verify";
import { toE164India } from "@/lib/twilio-verify";
import { checkOtp } from "@/lib/otp-provider";
import { createPhoneVerifiedToken } from "@/lib/phone-verification-token";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawPhone = body?.phone;
  const code = body?.code;
  const purpose = body?.purpose;

  if (!rawPhone || !code || (purpose !== "link" && purpose !== "signup")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const phone = toE164India(rawPhone);
  const ip = getClientIp(request);

  // const twilioCheck = await checkTwilioOtp(phone, String(code));
  const twilioCheck = await checkOtp(phone, String(code));

  if (!twilioCheck.ok) {
    await logPhoneVerificationEvent({ phone, purpose, outcome: "failed", ipAddress: ip });
    return NextResponse.json({ error: twilioCheck.error }, { status: 400 });
  }

  if (purpose === "signup") {
    await logPhoneVerificationEvent({ phone, purpose, outcome: "verified", ipAddress: ip });
    const token = createPhoneVerifiedToken(phone);
    return NextResponse.json({ verified: true, phone, verificationToken: token });
  }

  // purpose === "link": update the existing student's row right now.
  const accessToken = body?.access_token;
  if (!accessToken) return NextResponse.json({ error: "Missing session." }, { status: 401 });

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
  if (userErr || !userRes?.user) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  const { data: student, error: findErr } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("auth_id", userRes.user.id)
    .maybeSingle();

  if (findErr || !student) {
    return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("students")
    .update({ phone, phone_verified: true })
    .eq("id", student.id);

  if (updateErr) {
    const isConflict = updateErr.code === "23505";
    await logPhoneVerificationEvent({ studentId: student.id, phone, purpose, outcome: "failed", ipAddress: ip });
    return NextResponse.json(
      {
        error: isConflict
          ? "This mobile number is already linked to another account."
          : "Could not save your verified number. Please try again.",
      },
      { status: isConflict ? 409 : 500 }
    );
  }

  await logPhoneVerificationEvent({ studentId: student.id, phone, purpose, outcome: "verified", ipAddress: ip });

  return NextResponse.json({ verified: true, phone });
}
