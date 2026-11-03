import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const candidateTables = [
  "profiles",
  "startups",
  "data_room_requests",
  "data_room_docs",
  "data_room_documents",
  "data_room_audit_logs",
  "connection_requests",
  "messages",
  "chat_messages",
  "programs",
  "notifications",
  "investors",
  "cofounder_posts",
  "meetings",
  "investor_notes",
  "watchlist",
];

async function auditDatabase() {
  console.log("=== SUPABASE DATABASE AUDIT ===");
  console.log("URL:", env.VITE_SUPABASE_URL);

  const existingTables = [];
  const missingTables = [];

  for (const t of candidateTables) {
    const { data, error, count } = await supabase
      .from(t)
      .select("*", { count: "exact", head: true });

    if (error) {
      missingTables.push({ table: t, code: error.code, message: error.message });
    } else {
      existingTables.push({ table: t, rowCount: count });
    }
  }

  console.log("\n--- EXISTING TABLES & ROW COUNTS ---");
  for (const t of existingTables) {
    console.log(`[EXISTS] Table: ${t.table.padEnd(25)} | Rows: ${t.rowCount}`);
    // Inspect sample columns
    const { data: sample } = await supabase.from(t.table).select("*").limit(1);
    if (sample && sample[0]) {
      console.log(`         Columns: [${Object.keys(sample[0]).join(", ")}]`);
    } else {
      console.log(`         (Empty table - column schema hidden from anon head)`);
    }
  }

  console.log("\n--- NON-EXISTENT / MISSING TABLES ---");
  for (const m of missingTables) {
    console.log(`[MISSING] Table: ${m.table.padEnd(25)} | Code: ${m.code} | Msg: ${m.message}`);
  }

  console.log("\n--- STORAGE BUCKETS ---");
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) {
      console.log("Storage list error:", bErr.message);
    } else {
      console.log("Buckets found:", buckets?.length);
      for (const b of buckets || []) {
        console.log(`- Bucket: "${b.name}" | Public: ${b.public} | ID: ${b.id}`);
      }
    }
  } catch (err) {
    console.log("Storage bucket check exception:", err);
  }
}

auditDatabase();
