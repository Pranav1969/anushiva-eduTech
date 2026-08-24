import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { username } = await req.json();

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("auth_id")
    .eq("username", username)
    .maybeSingle();

  if (!student) {
    // Deliberately vague — don't reveal whether the username exists
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(student.auth_id);

  if (error || !authUser.user?.email) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({ email: authUser.user.email });
}