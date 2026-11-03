import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspectPgPolicies() {
  console.log("=== INSPECTING PG_POLICIES ===");
  // Test querying pg_policies
  const { data, error } = await (supabase as any).from("pg_policies").select("*");
  if (error) {
    console.log("Cannot query pg_policies via REST anon:", error.message);
  } else {
    console.log("pg_policies rows:", data);
  }
}

inspectPgPolicies();
