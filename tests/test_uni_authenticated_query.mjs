import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

// Create client with anon key
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testAuthQuery() {
  console.log("=== Testing Anon Query (no session) ===");
  const { data: anonData, error: anonErr } = await supabase
    .from("data_room_requests")
    .select("*");
  console.log("Anon query count:", anonData?.length, "Error:", anonErr);

  console.log("\n=== Testing Authenticated Query as University (252921043@sguk.ac.in) ===");
  // Try sign in
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "252921043@sguk.ac.in",
    password: "Password123"
  });

  if (authErr) {
    console.log("Auth sign in error:", authErr.message);
  } else {
    console.log("Signed in successfully as:", authData.user?.email, "ID:", authData.user?.id);
    const { data: uniData, error: uniErr } = await supabase
      .from("data_room_requests")
      .select("*");
    console.log("Authenticated University DR query count:", uniData?.length, "Error:", uniErr);
    if (uniData && uniData.length > 0) {
      uniData.forEach(r => console.log(" - Req ID:", r.id, "Startup:", r.startup_name, "Founder:", r.founder_email));
    }
  }

  console.log("\n=== Testing Authenticated Query as another University (e.g. innovation@coep.ac.in) ===");
  const { data: coepAuth, error: coepAuthErr } = await supabase.auth.signInWithPassword({
    email: "innovation@coep.ac.in",
    password: "Password123"
  });
  if (coepAuthErr) {
    console.log("COEP sign in error:", coepAuthErr.message);
  } else {
    console.log("COEP signed in:", coepAuth.user?.email);
    const { data: coepData, error: coepErr } = await supabase
      .from("data_room_requests")
      .select("*");
    console.log("COEP University DR query count:", coepData?.length, "Error:", coepErr);
  }
}

testAuthQuery();
