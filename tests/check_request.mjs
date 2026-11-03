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
  const { data } = await supabase
    .from("data_room_requests")
    .select("*")
    .eq("id", "a3a66ea5-59a2-446c-827b-118c7f18e2a8")
    .single();

  console.log("Record a3a66ea5:", JSON.stringify(data, null, 2));
}

run();
