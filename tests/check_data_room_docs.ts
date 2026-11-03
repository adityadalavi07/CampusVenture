import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkDocs() {
  const { data: docs, error } = await supabase.from("data_room_docs").select("*");
  console.log("Error:", error);
  console.log("Count:", docs?.length);
  for (const d of docs || []) {
    console.log(`- ID: ${d.id} | startup_id: ${d.startup_id} | name: "${d.name}" | category: "${d.category}" | url_len: ${d.file_url ? d.file_url.length : 0}`);
  }
}

checkDocs();
