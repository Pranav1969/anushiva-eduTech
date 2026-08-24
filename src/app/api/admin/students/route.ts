import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Confirms the request is coming from a logged-in admin — never trust a client-sent role.
async function requireAdmin() {
  const cookieStore = await cookies();
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("students")
    .select("id, name, username")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ students: data });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { name, username, password, state, district, gender, exam } = body || {};

  if (!name || !username || !password || !state || !district || !gender || !exam) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters (Supabase Auth minimum)" }, { status: 400 });
  }

  const cleanUsername = username.trim().toLowerCase();
  const email = `${cleanUsername}@yourapp.internal`;

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: cleanUsername, name },
  });

  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || "Failed to create account" }, { status: 500 });
  }

  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
   id: created.user.id,
   username: cleanUsername,
   role: "student",
 });

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id); // rollback the orphaned auth user
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  const { error: studentErr } = await supabaseAdmin.from("students").insert({
    name: name.trim(),
    username: cleanUsername,
    state: state.trim(),
    district: district.trim(),
    gender,
    exam,
    auth_id: created.user.id,
  });

  if (studentErr) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id); // rollback (cascades the profiles row too)
    return NextResponse.json({ error: studentErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { username } = body || {};
  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

  const { data: student, error: findErr } = await supabaseAdmin
    .from("students")
    .select("auth_id")
    .eq("username", username)
    .single();

  if (findErr || !student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Delete the students row first — its auth_id FK would otherwise block deleting the auth user
  const { error: deleteErr } = await supabaseAdmin.from("students").delete().eq("username", username);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  if (student.auth_id) {
    await supabaseAdmin.auth.admin.deleteUser(student.auth_id); // cascades the profiles row automatically
  }

  return NextResponse.json({ success: true });
}