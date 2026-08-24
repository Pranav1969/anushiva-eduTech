// src/app/api/student/refresh-session-token/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token, platform } = await request.json();

    if (!access_token || !refresh_token || !platform) {
      return NextResponse.json({ error: "Missing session tokens or platform" }, { status: 400 });
    }
    if (platform !== "web" && platform !== "mobile") {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
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
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Context handled by route handler
            }
          },
        },
      }
    );

    // 1. Sync Supabase auth cookies
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError || !sessionData.user) {
      return NextResponse.json({ error: sessionError?.message ?? "Invalid session" }, { status: 400 });
    }

    // 2. Stamp a fresh token into the correct slot (web or mobile)
    const column = platform === "web" ? "web_session_token" : "mobile_session_token";
    const newToken = crypto.randomUUID();

    const { error: updateError } = await supabase
      .from("students")
      .update({ [column]: newToken })
      .eq("auth_id", sessionData.user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to register device session" }, { status: 500 });
    }

    // 3. Save this device's own token in a cookie so middleware can compare it later
    cookieStore.set(column, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to sync session cookies" }, { status: 500 });
  }
}