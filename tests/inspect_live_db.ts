import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspectDb() {
  console.log("=== INSPECTING LATEST DATA ROOM REQUESTS ===");
  const { data: reqs, error: rErr } = await supabase
    .from("data_room_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  console.log("Error:", rErr);
  console.log("Count:", reqs?.length);
  for (const r of reqs || []) {
    console.log(`\nID: ${r.id}`);
    console.log(`  Startup: "${r.startup_name}" (${r.startup_id})`);
    console.log(`  Investor: "${r.investor_name}" (${r.investor_email}) [${r.investor_id}]`);
    console.log(`  Founder: "${r.founder_email}"`);
    console.log(`  Status: "${r.status}" | nda_signed: ${r.nda_signed}`);
    console.log(`  next_steps:`, r.next_steps);
    console.log(`  created_at: ${r.created_at} | updated_at: ${r.updated_at}`);
  }

  console.log("\n=== INSPECTING DATA ROOM DOCUMENTS ===");
  const { data: docs, error: dErr } = await supabase
    .from("data_room_documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  console.log("Docs Error:", dErr);
  console.log("Docs Count:", docs?.length);
  for (const d of docs || []) {
    console.log(`- Doc ID: ${d.id} | Startup: ${d.startup_id} | Name: "${d.name}" | Access: "${d.access_level}" | URL: "${d.file_url}"`);
  }

  console.log("\n=== INSPECTING STARTUPS ===");
  const { data: startups } = await supabase.from("startups").select("id, name, university, founder_email, founder");
  console.log("Startups:", startups);
}

inspectDb();
