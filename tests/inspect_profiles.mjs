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
  const { data: d } = await supabase.from("data_room_requests").select("*").eq("id", "5b3656f7-424b-451c-b4b6-b58150c61199").single();
  console.log("Jone Cornar request:", JSON.stringify(d, null, 2));
}

run();
