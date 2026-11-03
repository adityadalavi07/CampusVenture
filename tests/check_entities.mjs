import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: st } = await supabase.from("startups").select("id, name, university, founder_email");
  console.log("Startups in Supabase:", st);
  const { data: pr } = await supabase.from("profiles").select("id, email, full_name, role, org");
  console.log("Profiles in Supabase:", pr);
}

check();
