// src/app/api/student/profile/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

// Allow-list: the ONLY columns that can ever leave the server.
const SAFE_COLUMNS = [
  "id", "name", "username", "exam", "state", "district", "gender",
  "date_of_birth", "phone", "phone_verified", "email", "email_verified",
  "current_plan", "plan_expires_at", "created_at",
].join(",");

const noStore = { "Cache-Control": "no-store" };

// Set DEBUG_API_ERRORS=1 in .env.local to see reasons even in a production build.
const showReason =
  process.env.NODE_ENV !== "production" || process.env.DEBUG_API_ERRORS === "1";

const fail = (status: number, error: string, reason: string) =>
  NextResponse.json(showReason ? { error, reason } : { error }, {
    status,
    headers: noStore,
  });

export async function GET() {
  // 1) Identity: verified by Supabase from the login cookie.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Unauthorized", "no signed-in Supabase user");

  // 2) Data: read with the admin client, but ONLY the verified user's own row
  //    and ONLY allow-listed columns.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("students")
    .select(SAFE_COLUMNS)
    .eq("auth_id", user.id)
    .maybeSingle();

  if (error) return fail(500, "Could not load profile", `database error: ${error.message}`);
  if (!data) return fail(404, "Not found", `no students row with auth_id = ${user.id}`);

  return NextResponse.json(data, { headers: noStore });
}