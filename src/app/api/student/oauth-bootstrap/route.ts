// src\app\api\student\oauth-bootstrap\route.ts
// Runs after Google login. If a `students` row already exists for this auth_id, stamp the
// session token (same single-device pattern as refresh-session-token) and send them home.
// If not, this is a brand-new Google signup -> tell the client to collect name/state/district/gender.
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { access_token, platform } = await req.json();

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(access_token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id, password_set")
    .eq("auth_id", userData.user.id)
    .single();

  if (!student) {
    // Ensure profile row exists with student role so RLS/role checks don't break mid-signup
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userData.user.id, role: "student" }, { onConflict: "id" });

    return NextResponse.json({ needsProfile: true, needsPassword: true });
  }

  if (!student.password_set) {
    // Profile exists but password was never set — don't stamp the session yet,
    // force the password step first so this device isn't "logged in" without a fallback.
    return NextResponse.json({ needsProfile: false, needsPassword: true });
  }

  const tokenField = platform === "mobile" ? "mobile_session_token" : "web_session_token";
  await supabaseAdmin
    .from("students")
    .update({ [tokenField]: crypto.randomUUID() })
    .eq("id", student.id);

  return NextResponse.json({ needsProfile: false, needsPassword: false });
}