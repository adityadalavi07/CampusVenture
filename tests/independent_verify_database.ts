import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function runDatabaseAudit() {
  console.log("================================================================================");
  console.log("   INDEPENDENT DATABASE AUDIT & RLS POLICY INSPECTION");
  console.log("================================================================================");

  const tables = [
    "profiles",
    "startups",
    "data_room_requests",
    "data_room_docs",
    "data_room_audit_logs",
    "connection_requests",
    "messages",
    "notifications",
    "cofounder_invitations",
    "watchlist",
    "programs"
  ];

  console.log("\n--- SECTION 1: TABLE EXISTENCE & ANONYMOUS ACCESS ---");
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select("*", { count: "exact" }).limit(1);
    if (error) {
      console.log(`[${table}]: ERROR ${error.code} - ${error.message}`);
    } else {
      console.log(`[${table}]: OK, total_rows=${count}, accessible_sample=${data?.length}`);
      if (data && data.length > 0) {
        console.log(`    Columns: ${Object.keys(data[0]).join(", ")}`);
      }
    }
  }

  console.log("\n--- SECTION 2: STORAGE BUCKETS INSPECTION ---");
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log(`Storage buckets query error: ${bErr.message}`);
  } else {
    console.log(`Buckets found: ${buckets?.length || 0}`);
    for (const b of buckets || []) {
      console.log(`  Bucket: ${b.name} | Public: ${b.public} | Created: ${b.created_at}`);
    }
  }

  // Also check direct access to dataroom-documents or dataroom bucket
  const possibleBuckets = ["dataroom-documents", "dataroom", "documents", "campusventure"];
  for (const bName of possibleBuckets) {
    const { data: files, error: fErr } = await supabase.storage.from(bName).list();
    if (fErr) {
      console.log(`Bucket '${bName}' list check: ERROR - ${fErr.message}`);
    } else {
      console.log(`Bucket '${bName}' list check: SUCCESS - found ${files?.length || 0} files/folders`);
    }
  }

  console.log("\n--- SECTION 3: DIRECT INSERT & WRITE PERMISSION FOR ANON ---");
  // Test if anonymous user can write to profiles
  const fakeId = "00000000-0000-4000-a000-000000000001";
  const { error: pInsErr } = await supabase.from("profiles").insert({
    id: fakeId,
    email: "anon_test@gmail.com",
    name: "Anon Attack",
    role: "admin",
  });
  console.log(`Anon insert to profiles: ${pInsErr ? `BLOCKED (${pInsErr.message})` : "ALLOWED (SECURITY VULNERABILITY!)"}`);
  if (!pInsErr) {
    // clean up
    await supabase.from("profiles").delete().eq("id", fakeId);
  }

  // Test if anonymous user can insert a startup with fake data
  const fakeStartupId = "00000000-0000-4000-a000-000000000002";
  const { error: sInsErr } = await supabase.from("startups").insert({
    id: fakeStartupId,
    name: "Anon Startup Hack",
    tagline: "Testing anon write",
    sector: "AI",
    stage: "Idea",
    location: "Unknown",
    university: "COEP",
    status: "approved",
    verified: true,
  });
  console.log(`Anon insert to startups: ${sInsErr ? `BLOCKED (${sInsErr.message})` : "ALLOWED (PERMISSIVE RLS)"}`);
  if (!sInsErr) {
    await supabase.from("startups").delete().eq("id", fakeStartupId);
  }

  // Test if anonymous user can insert a data_room_request
  const fakeReqId = "00000000-0000-4000-a000-000000000003";
  const { error: rInsErr } = await supabase.from("data_room_requests").insert({
    id: fakeReqId,
    startup_id: "00000000-0000-4000-a000-000000000000",
    investor_id: "anon",
    status: "granted",
  });
  console.log(`Anon insert to data_room_requests: ${rInsErr ? `BLOCKED (${rInsErr.message})` : "ALLOWED (PERMISSIVE RLS)"}`);
  if (!rInsErr) {
    await supabase.from("data_room_requests").delete().eq("id", fakeReqId);
  }

  // Test if anonymous user can insert a message
  const fakeMsgId = "00000000-0000-4000-a000-000000000004";
  const { error: mInsErr } = await supabase.from("messages").insert({
    id: fakeMsgId,
    sender_id: fakeId,
    recipient_id: fakeId,
    content: "Spam injection",
  });
  console.log(`Anon insert to messages: ${mInsErr ? `BLOCKED (${mInsErr.message})` : "ALLOWED (PERMISSIVE RLS)"}`);
  if (!mInsErr) {
    await supabase.from("messages").delete().eq("id", fakeMsgId);
  }
}

runDatabaseAudit();
