import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testUpdate() {
  const { error } = await supabase.from("profiles").update({ verified: true } as any).eq("id", "00000000-0000-0000-0000-000000000000");
  console.log("Update verified result:", error ? error.message : "Success (column exists!)");
}

testUpdate();
