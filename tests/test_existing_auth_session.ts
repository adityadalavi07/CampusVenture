import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testSignIn() {
  console.log("=== TESTING SIGN IN WITH EXISTING USERS ===");
  const testAccounts = [
    { email: "252921389@sguk.ac.in", password: "Password123" },
    { email: "252921043@sguk.ac.in", password: "Password123" },
    { email: "dalaviaditya07@gmail.com", password: "Password123" },
    { email: "jonecornar@gmail.com", password: "Password123" },
    { email: "aayush@coep.ac.in", password: "Password123" },
  ];

  for (const acc of testAccounts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });
    if (error) {
      console.log(`[${acc.email}]: Login FAILED - ${error.message}`);
    } else {
      console.log(`[${acc.email}]: Login SUCCESS! User ID: ${data.user.id}, Token length: ${data.session.access_token.length}`);
      
      // Test direct RLS with this user's token!
      const userClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
      });

      // Try updating own profile
      const { data: ownProf, error: ownProfErr } = await userClient
        .from("profiles")
        .update({ bio: "Updated by authentic user token" })
        .eq("id", data.user.id)
        .select();
      console.log(`  Updating own profile: ${ownProfErr ? `FAILED (${ownProfErr.message})` : `SUCCESS (rows=${ownProf?.length})`}`);

      // Try updating someone else's profile!
      const { data: otherProf, error: otherProfErr } = await userClient
        .from("profiles")
        .update({ name: "Malicious Tampering" })
        .neq("id", data.user.id)
        .select();
      console.log(`  Tampering other profiles: ${otherProfErr ? `BLOCKED (${otherProfErr.message})` : `FAILED CHECK - rows affected=${otherProf?.length}`}`);
      break; // Test once with first working user
    }
  }
}

testSignIn();
