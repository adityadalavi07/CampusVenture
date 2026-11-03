import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkNevorox() {
  const { data, error } = await supabase.from("startups").select("*").ilike("name", "%nevorox%");
  console.log("Nevorox search in startups table:", data);
  console.log("Error:", error);
}

checkNevorox();
