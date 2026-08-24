// scripts/migrate-students.ts — run once, from a trusted machine/CI, NEVER in client code
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role — never expose this to the browser or Android app
);

async function migrate() {
  const { data: students, error } = await supabaseAdmin
    .from("students")
    .select("*")
    .is("auth_id", null); // only migrate students not yet migrated (safe to re-run)

  if (error || !students) {
    console.error(error);
    return;
  }

  for (const s of students) {
    const email = `${s.username}@yourapp.internal`;

    if ((s.password || "").length < 6) {
      console.warn(`Skipping ${s.username}: password too short for Supabase Auth (min 6 chars). Handle manually.`);
      continue;
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: s.password,
      email_confirm: true,
      user_metadata: { username: s.username, name: s.name },
    });

    if (createErr) {
      console.error(`Failed for ${s.username}:`, createErr.message);
      continue;
    }

    await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      username: s.username,
      role: "student",
    });

    await supabaseAdmin.from("students").update({ auth_id: created.user.id }).eq("id", s.id);

    console.log(`Migrated ${s.username}`);
  }
}

migrate();