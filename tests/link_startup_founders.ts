import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testFounderResolution() {
  console.log("=== CHECKING STARTUP FOUNDER EMAIL TO PROFILES ID MAPPING ===");
  const { data: startups } = await supabase.from("startups").select("id, name, founder_email, founder_id");
  const { data: profiles } = await supabase.from("profiles").select("id, email, name");

  const profMap = new Map();
  profiles?.forEach((p) => profMap.set(p.email.toLowerCase().trim(), p.id));

  for (const s of startups || []) {
    const email = s.founder_email?.toLowerCase().trim();
    const matchedProfileId = email ? profMap.get(email) : null;
    console.log(`Startup "${s.name}": founder_email="${s.founder_email}" -> matching profile ID: ${matchedProfileId || "NONE"}`);
    
    if (matchedProfileId && !s.founder_id) {
      const { error } = await supabase.from("startups").update({ founder_id: matchedProfileId }).eq("id", s.id);
      console.log(`  Linked founder_id to ${matchedProfileId}: ${error ? `FAILED (${error.message})` : "SUCCESS"}`);
    }
  }
}

testFounderResolution();
