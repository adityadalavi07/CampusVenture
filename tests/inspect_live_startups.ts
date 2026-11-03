import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspectStartups() {
  const { data: startups, error } = await supabase.from("startups").select("*");
  console.log("Total startups in Supabase:", startups?.length);
  for (const s of startups || []) {
    console.log(`- ID: ${s.id} | Name: "${s.name}" | founder_id: ${s.founder_id} | founder_email: "${s.founder_email}" | university: "${s.university}" | verified: ${s.verified} | status: ${s.status}`);
  }
}

inspectStartups();
