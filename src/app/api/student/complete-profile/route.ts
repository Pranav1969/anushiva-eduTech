// src/app/api/student/complete-profile/route.ts
// Creates the students row for a Google OR phone sign-in that had no prior account.
// Uses the user's own session (not service-role) since RLS should allow
// a logged-in user to insert their own students row keyed to their auth_id.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { access_token, name, state, district, gender, exam, date_of_birth } = body;

  if (!access_token || !name || !state || !district || !gender || !exam) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${access_token}` } } }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(access_token);
  if (userErr || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  // Don't allow overwriting an existing profile through this endpoint
  const { data: existing } = await supabase
    .from("students")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Profile already exists." }, { status: 409 });
  }

  // Determine how this user arrived. This is derived entirely from the
  // server-trusted Supabase user object — never from client input — so a
  // phone-first signup can't be spoofed into skipping verification, and a
  // Google signup can't be spoofed into claiming a phone number.
  const isPhoneFirstSignup = Boolean(user.phone && user.phone_confirmed_at && !user.email);

  // Username: Google accounts derive one from email; phone accounts have no
  // email, so derive from the phone digits instead. Both fall back to the
  // auth id on collision, since username is UNIQUE NOT NULL.
  const baseUsername = isPhoneFirstSignup
    ? `student${user.phone!.replace(/\D/g, "").slice(-8)}`
    : user.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || user.id.slice(0, 8);

  let username = baseUsername;
  const { data: clash } = await supabase.from("students").select("id").eq("username", username).maybeSingle();
  if (clash) username = `${baseUsername}_${user.id.slice(0, 6)}`;

  const insertPayload: Record<string, unknown> = {
    name,
    username,
    exam,
    state,
    district,
    gender,
    date_of_birth: date_of_birth || null,
    auth_id: user.id,
  };

  if (isPhoneFirstSignup) {
    insertPayload.auth_provider = "phone";
    insertPayload.phone = `+${user.phone!.replace(/^\+/, "")}`;
    insertPayload.phone_verified = true; // Supabase/Twilio already confirmed this at OTP login
    // Phone-first accounts can already log back in via phone+OTP, so there's
    // no security reason to force a password on top of that. They can add
    // one later from settings if they want a second login method.
    insertPayload.password_set = true;
  } else {
    insertPayload.auth_provider = "google";
    // Google users must still set a password before reaching /student — see /student/set-password
    insertPayload.password_set = false;
    // phone_verified stays at its default (false) — they'll hit /student/verify-phone
    // once password_set is handled, per the middleware gate order.
  }

  const { error: insertErr } = await supabase.from("students").insert(insertPayload);

  if (insertErr) {
    return NextResponse.json({ error: "Could not save profile: " + insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, authProvider: insertPayload.auth_provider });
}
