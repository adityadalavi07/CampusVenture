import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testAuthBypass() {
  console.log("=== TESTING DOCUMENT AUTHORIZATION CHECK ===");
  const startupId = "23463a51-ea0a-4876-a73b-b8ec7356fe0d";
  const unpermittedDocId = "6a052191-49dd-462a-84fd-ea3dfa42c849";
  const attackerEmail = "attacker_student@othercollege.ac.in";
  const attackerId = "00000000-0000-4000-a000-000000000099";

  // Check actual founder of startup
  const { data: st } = await supabase.from("startups").select("name, founder, founder_email").eq("id", startupId).single();
  console.log("Target Startup:", st?.name, "| Actual Founder Email:", st?.founder_email);

  // If attacker passes requesterRole: "student", but is NOT the founder:
  const attackerIsClaimingStudent = true;
  const legacyIsFounderCheck = attackerIsClaimingStudent; // OLD BUGGY CODE: const isFounder = requesterRole === "student";
  console.log(`Legacy code allowed attacker to bypass diligence check: ${legacyIsFounderCheck}`);

  // Secure founder verification:
  const secureIsFounder = Boolean(
    st?.founder_email && attackerEmail && st.founder_email.toLowerCase() === attackerEmail.toLowerCase()
  );
  console.log(`Secure code verifies actual founder identity: ${secureIsFounder}`);
}

testAuthBypass();
