import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: drs } = await supabase
    .from("data_room_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("=== MOST RECENT 5 DR REQUESTS IN SUPABASE ===");
  drs?.forEach((d) => {
    console.log(`[${d.created_at}] ID: ${d.id}`);
    console.log(`  Startup: ${d.startup_name} (ID: ${d.startup_id})`);
    console.log(`  Status: ${d.status} | nda_signed: ${d.nda_signed}`);
    console.log(`  Founder: ${d.founder_email} | Investor: ${d.investor_name} (${d.investor_email})`);
    console.log(`  next_steps: ${d.next_steps?.substring(0, 100)}...`);
  });

  const { data: profs } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5);

  console.log("\n=== RECENTLY UPDATED PROFILES ===");
  profs?.forEach((p) => {
    console.log(`[${p.updated_at || p.created_at}] ${p.email} | role: ${p.role} | org: ${p.org}`);
  });
}

run();
