//src\app\api\student\signup\route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifyPhoneVerifiedToken } from "@/lib/phone-verification-token";
import { toE164India } from "@/lib/twilio-verify";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = body.username?.trim().toLowerCase();

  if (!username || !body.password || !body.name || !body.state || !body.district || !body.gender) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!body.phone || !body.verificationToken) {
    return NextResponse.json({ error: "Please verify your mobile number first." }, { status: 400 });
  }

  const phone = toE164India(body.phone);

  // Re-validate the signed proof from /api/student/phone/verify-otp. This is
  // the only thing standing between "someone typed a phone number" and
  // "someone actually received and re-entered the OTP for that number" —
  // never trust body.phone_verified or similar from the client directly.
  const tokenCheck = verifyPhoneVerifiedToken(body.verificationToken, phone);
  if (!tokenCheck.valid) {
    return NextResponse.json({ error: tokenCheck.reason }, { status: 400 });
  }

  const { data: existingUsername } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUsername) {
    return NextResponse.json({ error: "Username already taken." }, { status: 409 });
  }

  const { data: existingPhone } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingPhone) {
    return NextResponse.json({ error: "This mobile number is already registered." }, { status: 409 });
  }

  if (body.email) {
    const { data: existingEmail } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("email", body.email.trim().toLowerCase())
      .maybeSingle();

    if (existingEmail) {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }
  }

  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: `${username}@yourapp.internal`,
    password: body.password,
    email_confirm: true,
  });

  if (authErr || !authUser.user) {
    return NextResponse.json({ error: authErr?.message || "Could not create account." }, { status: 500 });
  }

  await supabaseAdmin.from("profiles").insert({ id: authUser.user.id, username, role: "student" });

  const { error: studentErr } = await supabaseAdmin.from("students").insert({
    name: body.name,
    username,
    exam: body.exam,
    state: body.state,
    district: body.district,
    gender: body.gender,
    date_of_birth: body.date_of_birth || null,
    auth_id: authUser.user.id,
    auth_provider: "password",
    phone,
    phone_verified: true, // proven by the verification token above, not client say-so
    email: body.email ? body.email.trim().toLowerCase() : null,
  });

  if (studentErr) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id); // rollback orphaned auth user
    const isConflict = studentErr.code === "23505";
    return NextResponse.json(
      { error: isConflict ? "This phone number or email is already registered." : "Could not create student profile." },
      { status: isConflict ? 409 : 500 }
    );
  }

  return NextResponse.json({ success: true });
}
