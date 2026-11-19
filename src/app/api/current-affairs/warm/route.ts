// src/app/api/current-affairs/warm/route.ts
//
// Fire-and-forget cache warmer. Reading a date through getCapsulesForDate()
// fills the same cache page.tsx uses, so the later navigation is a cache hit.
// Returns 204 (no body) because the client doesn't need the data.

import { NextResponse } from "next/server";
import { getCapsulesForDate } from "@/app/student/current-affairs/lib/capsules";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");

  // Basic validation: YYYY-MM-DD only
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    await getCapsulesForDate(date);
  } catch (err) {
    console.error("Warm failed:", err);
  }
  return new NextResponse(null, { status: 204 });
}