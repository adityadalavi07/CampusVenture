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
  const { data: profs } = await supabase.from("profiles").select("*");
  console.log("=== ALL PROFILES IN DATABASE ===");
  profs?.forEach((p) => {
    console.log(`${p.created_at || 'no-date'} | ${p.email} | role: ${p.role} | org: ${p.org}`);
  });
}

run();
