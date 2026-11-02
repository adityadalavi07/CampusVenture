import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkLatest() {
  console.log("Checking latest data_room_requests...");
  const { data: dr, error: drErr } = await supabase
    .from("data_room_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("Latest DR requests count:", dr?.length, drErr);
  console.log(JSON.stringify(dr, null, 2));

  console.log("\nChecking latest startups...");
  const { data: st, error: stErr } = await supabase
    .from("startups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("Latest startups count:", st?.length, stErr);
  console.log(JSON.stringify(st, null, 2));
}

checkLatest();
