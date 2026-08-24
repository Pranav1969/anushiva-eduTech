//src\app\student\auth\callback\route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/student/login?reason=oauth_error`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/student/login?reason=oauth_error`);
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_id", data.user.id)
    .maybeSingle();

  if (!student) {
    await supabase.from("profiles").upsert({ id: data.user.id, role: "student" });
    return NextResponse.redirect(`${origin}/student/complete-profile`);
  }

  const newToken = crypto.randomUUID();
  const { error: updateError } = await supabase
    .from("students")
    .update({ web_session_token: newToken })
    .eq("id", student.id);

  if (updateError) {
    return NextResponse.redirect(`${origin}/student/login?reason=oauth_error`);
  }

  cookieStore.set("web_session_token", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.redirect(`${origin}/student`);
}