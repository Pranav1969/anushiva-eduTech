//src\app\api\student\signup\route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

  const { data: existing } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Username already taken." }, { status: 409 });
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
  });

  if (studentErr) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id); // rollback orphaned auth user
    return NextResponse.json({ error: "Could not create student profile." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}