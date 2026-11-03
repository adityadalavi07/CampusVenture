import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function clean() {
  const { error } = await supabase
    .from("startups")
    .delete()
    .in("id", ["43d67660-a8a6-47a0-a25b-2893639ab46b", "28c0f6ae-20ed-4d42-9372-ae27005d04c7"]);
  console.log("Cleanup result:", error ? error.message : "Success");
}

clean();
