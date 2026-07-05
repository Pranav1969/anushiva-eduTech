// // src/app/api/current-affairs/notes/route.ts

// import { NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
// // Anon/publishable key is enough here -- this is a read of already-public study
// // content, gated in the UI by the existing required_plan lock, not by RLS secrecy.
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// export const dynamic = "force-dynamic";

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);
//   const capsuleId = searchParams.get("capsule_id");

//   if (!capsuleId) {
//     return NextResponse.json({ success: false, error: "capsule_id is required" }, { status: 400 });
//   }

//   const { data: note, error: noteError } = await supabase
//     .from("daily_dose_notes")
//     .select("*")
//     .eq("capsule_id", capsuleId)
//     .maybeSingle();

//   if (noteError) {
//     console.error("Notes fetch failed:", noteError.message);
//     return NextResponse.json({ success: false, error: noteError.message }, { status: 500 });
//   }

//   if (!note) {
//     // Notes may not exist yet if generation failed for this article, or it
//     // predates this feature. The UI should fall back to just the summary.
//     return NextResponse.json({ success: true, note: null, quiz: [] });
//   }

//   const { data: quiz, error: quizError } = await supabase
//     .from("daily_dose_quiz_questions")
//     .select("*")
//     .eq("note_id", note.id)
//     .order("sequence_order", { ascending: true });

//   if (quizError) {
//     console.error("Quiz fetch failed:", quizError.message);
//     return NextResponse.json({ success: true, note, quiz: [] });
//   }

//   return NextResponse.json({ success: true, note, quiz: quiz || [] });
// }