import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testOrQuery() {
  const startupId = "s-mvktiqwp";
  const docIds = ["284b34d8-d2d4-41a5-b321-a75ee866552a", "6a052191-49dd-462a-84fd-ea3dfa42c849"];

  const { data, error } = await supabase
    .from("data_room_docs")
    .select("*")
    .or(`startup_id.eq.${startupId},id.in.(${docIds.join(",")})`);

  console.log("Error:", error);
  console.log("Found docs count:", data?.length);
  for (const d of data || []) {
    console.log("- Doc:", d.name, "ID:", d.id);
  }
}

testOrQuery();
