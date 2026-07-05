// src/app/api/current-affairs/progress/route.ts
//
// Students authenticate through the custom students/authManager system, not
// Supabase Auth -- there is no auth.uid() for RLS to key off of here. So this
// route uses the service-role client and trusts the student_id the client
// sends (taken from authManager.getSession().id, which is itself only set
// after a real login). This mirrors how the rest of the student-side app
// already trusts that session shape.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

export const dynamic = "force-dynamic";

// GET /api/current-affairs/progress?student_id=...&capsule_ids=id1,id2,id3
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");
  const capsuleIdsParam = searchParams.get("capsule_ids");

  if (!studentId || !capsuleIdsParam) {
    return NextResponse.json(
      { success: false, error: "student_id and capsule_ids are required" },
      { status: 400 }
    );
  }

  const capsuleIds = capsuleIdsParam.split(",").filter(Boolean);
  if (capsuleIds.length === 0) {
    return NextResponse.json({ success: true, progress: {} });
  }

  const { data, error } = await supabase
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
// body: { student_id, capsule_id, is_read: boolean, is_bookmarked: boolean }
// Always send BOTH flags (the client already tracks both locally) so this can
// be a plain upsert without needing a read-modify-write round trip.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { student_id, capsule_id, is_read, is_bookmarked } = body || {};

  if (!student_id || !capsule_id) {
    return NextResponse.json(
      { success: false, error: "student_id and capsule_id are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("student_capsule_progress").upsert(
    {
      student_id,
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