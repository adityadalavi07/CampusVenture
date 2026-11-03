import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testQuery() {
  const startupId = "23463a51-ea0a-4876-a73b-b8ec7356fe0d";
  const permittedDocIds = ["284b34d8-d2d4-41a5-b321-a75ee866552a"]; // Only 1 doc permitted out of 2!

  console.log("--- Testing with OR query ---");
  const { data: orData } = await (supabase as any)
    .from("data_room_docs")
    .select("id, name")
    .or(`startup_id.eq.${startupId},id.in.(${permittedDocIds.join(",")})`);

  console.log(`OR query returned ${orData?.length} docs:`);
  for (const d of orData || []) {
    console.log(`  - ${d.id}: ${d.name}`);
  }

  console.log("\n--- Testing with AND query ---");
  const { data: andData } = await (supabase as any)
    .from("data_room_docs")
    .select("id, name")
    .eq("startup_id", startupId)
    .in("id", permittedDocIds);

  console.log(`AND query returned ${andData?.length} docs:`);
  for (const d of andData || []) {
    console.log(`  - ${d.id}: ${d.name}`);
  }
}

testQuery();
