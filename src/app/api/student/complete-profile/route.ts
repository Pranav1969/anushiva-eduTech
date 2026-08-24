// src\app\api\student\complete-profile\route.ts
// Creates the students row for a Google sign-in that had no prior account.
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

  // Google accounts don't have a "username" in your schema's sense — derive one from email,
  // falling back to the auth id if there's a collision. Uniqueness matters since it's UNIQUE NOT NULL.
  const baseUsername = user.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || user.id.slice(0, 8);
  let username = baseUsername;
  const { data: clash } = await supabase.from("students").select("id").eq("username", username).maybeSingle();
  if (clash) username = `${baseUsername}_${user.id.slice(0, 6)}`;

  const { error: insertErr } = await supabase.from("students").insert({
    name,
    username,
    exam,
    state,
    district,
    gender,
    date_of_birth: date_of_birth || null,
    auth_id: user.id,
    auth_provider: "google",
    password_set: false, // Google users must set a password before reaching /student — see /student/set-password
  });

  if (insertErr) {
    return NextResponse.json({ error: "Could not save profile: " + insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}