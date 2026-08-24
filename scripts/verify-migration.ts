// scripts/verify-migration.ts
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  const { data: students, error } = await supabaseAdmin.from("students").select("*");
  if (error || !students) {
    console.error(error);
    return;
  }

  let allGood = true;

  for (const s of students) {
    if (!s.auth_id) {
      console.error(`❌ ${s.username}: missing auth_id`);
      allGood = false;
      continue;
    }

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(s.auth_id);
    if (authErr || !authUser?.user) {
      console.error(`❌ ${s.username}: auth_id set but no matching auth.users entry`);
      allGood = false;
      continue;
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", s.auth_id)
      .single();

    if (profileErr || !profile) {
      console.error(`❌ ${s.username}: no matching profiles row`);
      allGood = false;
      continue;
    }

    if (profile.role !== "student") {
      console.error(`❌ ${s.username}: profile role is "${profile.role}", expected "student"`);
      allGood = false;
      continue;
    }

    console.log(`✅ ${s.username}: OK (auth_id, auth.users, profiles all consistent)`);
  }

  console.log(allGood ? "\nAll students verified successfully." : "\nSome students need attention — see ❌ above.");
}

verify();