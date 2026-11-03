import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const tablesToCheck = [
  "profiles",
  "startups",
  "data_room_requests",
  "data_room_docs",
  "data_room_audit_logs",
  "connection_requests",
  "messages",
  "notifications",
  "cofounder_invitations",
  "cofounder_posts",
  "programs",
  "investor_notes",
  "saved_startups",
  "watchlist",
];

async function checkTablesAndRls() {
  console.log("=== CHECKING TABLES ACCESS WITH ANON CLIENT ===");
  for (const tbl of tablesToCheck) {
    const { data, error, count } = await supabase.from(tbl).select("*", { count: "exact" }).limit(1);
    if (error) {
      console.log(`[ERR / BLOCKED] ${tbl.padEnd(25)} -> Code: ${error.code} | Msg: ${error.message}`);
    } else {
      console.log(`[ACCESSIBLE]   ${tbl.padEnd(25)} -> Count: ${count} | Sample rows: ${data?.length}`);
    }
  }
}

checkTablesAndRls();
