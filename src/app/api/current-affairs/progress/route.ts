import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl || "", supabaseServiceKey || "");

export const dynamic = "force-dynamic";

// Resolves the actual logged-in student's students.id from their real session cookie —
// never trusts anything the client sends for identity.
async function getAuthenticatedStudentId(): Promise<string | null> {
  const cookieStore = await cookies(); // ← add await here
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return null;

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  return student?.id ?? null;
}
// GET /api/current-affairs/progress?capsule_ids=id1,id2,id3
// (student_id no longer needed in the query — it's derived from the session)
export async function GET(request: Request) {
  const studentId = await getAuthenticatedStudentId();
  if (!studentId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const capsuleIdsParam = searchParams.get("capsule_ids");

  if (!capsuleIdsParam) {
    return NextResponse.json(
      { success: false, error: "capsule_ids is required" },
      { status: 400 }
    );
  }

  const capsuleIds = capsuleIdsParam.split(",").filter(Boolean);
  if (capsuleIds.length === 0) {
    return NextResponse.json({ success: true, progress: {} });
  }

  const { data, error } = await supabaseAdmin
    .from("student_capsule_progress")
    .select("capsule_id, is_read, is_bookmarked")
    .eq("student_id", studentId)
    .in("capsule_id", capsuleIds);

  if (error) {
    console.error("Progress fetch failed:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const progress: Record<string, { is_read: boolean; is_bookmarked: boolean }> = {};
  for (const row of data || []) {
    progress[row.capsule_id] = { is_read: row.is_read, is_bookmarked: row.is_bookmarked };
  }

  return NextResponse.json({ success: true, progress });
}

// POST /api/current-affairs/progress
// body: { capsule_id, is_read: boolean, is_bookmarked: boolean }
// (student_id removed from body — server derives it from the authenticated session)
export async function POST(request: Request) {
  const studentId = await getAuthenticatedStudentId();
  if (!studentId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { capsule_id, is_read, is_bookmarked } = body || {};

  if (!capsule_id) {
    return NextResponse.json(
      { success: false, error: "capsule_id is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("student_capsule_progress").upsert(
    {
      student_id: studentId,
      capsule_id,
      is_read: Boolean(is_read),
      is_bookmarked: Boolean(is_bookmarked),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,capsule_id" }
  );

  if (error) {
    console.error("Progress upsert failed:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}