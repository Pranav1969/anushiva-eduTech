// scripts/test-login.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // anon key mimics client login
);

async function test() {
  const username = "sachin"; // test with sachin or any valid user
  const password = "Sachin@123"; // replace with their real password

  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${username}@yourapp.internal`,
    password,
  });

  if (error) {
    console.error("❌ Login failed:", error.message);
    return;
  }

  console.log("✅ Login succeeded! Auth User ID:", data.user?.id);
}

test();