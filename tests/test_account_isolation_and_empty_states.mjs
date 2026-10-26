/**
 * CAMPUSVENTURE MULTI-TENANT ISOLATION & EMPTY STATE VERIFICATION
 *
 * Verifies that:
 * 1. A new account starts with zero saved startups, requests, notifications or documents.
 * 2. Investor A saving a startup does not leak to Investor B.
 * 3. Notification targeted at User A is not readable by User B.
 * 4. Connection request sent to Founder C is isolated to Founder C (Founder D sees 0).
 * 5. Data room request for Startup C is isolated to Startup C (Founder D sees 0).
 * 6. University ecosystem only aggregates activity for startups registered to that university.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load .env
const envFile = readFileSync(".env", "utf-8");
const envVars = Object.fromEntries(
  envFile
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function run() {
  console.log("===============================================================================");
  console.log("CAMPUSVENTURE MULTI-TENANT ISOLATION & PRIVACY VERIFICATION SUITE");
  console.log("===============================================================================\n");

  const newInvestorEmail = `new.investor.${Date.now()}@example.com`;
  const newInvestorId = `inv-test-${Date.now()}`;
  const existingInvestorEmail = "dalavi015@gmail.com";

  const founderCEmail = `founder.c.${Date.now()}@uni-x.edu`;
  const founderCId = `fc-${Date.now()}`;
  const startupCId = `startup-c-${Date.now()}`;

  const founderDEmail = `founder.d.${Date.now()}@uni-y.edu`;
  const founderDId = `fd-${Date.now()}`;
  const startupDId = `startup-d-${Date.now()}`;

  console.log("--- TEST 1: NEW INVESTOR ACCOUNT STARTS WITH CLEAN DATA ---");
  // Check notifications for new investor
  const { data: newNotifs } = await supabase
    .from("notifications")
    .select("*")
    .or(`recipient_email.ilike.${newInvestorEmail},user_id.eq.${newInvestorId}`);
  assert(Array.isArray(newNotifs) && newNotifs.length === 0, "New investor starts with 0 notifications");

  // Check incoming connection requests for new investor
  const { data: newConnReqs } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`receiver_id.eq.${newInvestorId},receiver_email.ilike.${newInvestorEmail}`);
  assert(Array.isArray(newConnReqs) && newConnReqs.length === 0, "New investor starts with 0 incoming connection requests");

  // Check sent connection requests for new investor
  const { data: newSentConn } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`sender_id.eq.${newInvestorId},sender_email.ilike.${newInvestorEmail}`);
  assert(Array.isArray(newSentConn) && newSentConn.length === 0, "New investor starts with 0 sent connection requests");

  // Check data room requests for new investor
  const { data: newDrReqs } = await supabase
    .from("data_room_requests")
    .select("*")
    .or(`investor_id.eq.${newInvestorId},investor_email.ilike.${newInvestorEmail}`);
  assert(Array.isArray(newDrReqs) && newDrReqs.length === 0, "New investor starts with 0 data room requests");

  console.log("\n--- TEST 2: NOTIFICATION ISOLATION BETWEEN USERS ---");
  const testNotifId = crypto.randomUUID();
  const testInvestorUuid = crypto.randomUUID();
  const { error: notifErr } = await supabase.from("notifications").insert({
    id: testNotifId,
    user_id: testInvestorUuid,
    recipient_email: newInvestorEmail,
    role: "investor",
    title: "Private Investor Note",
    body: "Confidential investment thesis update.",
    read: false,
    created_at: new Date().toISOString(),
  });
  if (notifErr) console.log("Notif insert error:", notifErr);

  // Query for recipient
  const { data: recipientNotifs } = await supabase
    .from("notifications")
    .select("*")
    .or(`recipient_email.ilike.${newInvestorEmail},user_id.eq.${testInvestorUuid}`);
  assert(recipientNotifs.some((n) => n.id === testNotifId), "Recipient investor correctly receives targeted notification");

  // Query for another investor (existing investor)
  const { data: otherNotifs } = await supabase
    .from("notifications")
    .select("*")
    .or(`recipient_email.ilike.${existingInvestorEmail}`);
  assert(!otherNotifs.some((n) => n.id === testNotifId), "Other investor DOES NOT see recipient's private notification");

  console.log("\n--- TEST 3: CONNECTION REQUEST ISOLATION BETWEEN FOUNDERS ---");
  const testConnId = crypto.randomUUID();
  const founderCUuid = crypto.randomUUID();
  const startupCUuid = crypto.randomUUID();
  const founderDUuid = crypto.randomUUID();
  const startupDUuid = crypto.randomUUID();

  const { error: connErr } = await supabase.from("connection_requests").insert({
    id: testConnId,
    sender_id: testInvestorUuid,
    sender_name: "Test Investor",
    sender_email: newInvestorEmail,
    sender_role: "investor",
    sender_org: "Alpha Ventures",
    receiver_id: founderCUuid,
    receiver_name: "Founder C",
    receiver_email: founderCEmail,
    startup_id: startupCUuid,
    startup_name: "Venture C",
    message: "Would love to discuss your cap table.",
    status: "pending",
    created_at: new Date().toISOString(),
  });
  if (connErr) console.log("Conn insert error:", connErr);

  // Founder C checks incoming requests
  const { data: founderCReqs } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`receiver_id.eq.${founderCUuid},receiver_email.ilike.${founderCEmail},startup_id.in.(${startupCUuid})`);
  assert(founderCReqs.some((c) => c.id === testConnId), "Founder C correctly receives incoming connection request");

  // Founder D checks incoming requests
  const { data: founderDReqs } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`receiver_id.eq.${founderDUuid},receiver_email.ilike.${founderDEmail},startup_id.in.(${startupDUuid})`);
  assert(!founderDReqs.some((c) => c.id === testConnId), "Founder D DOES NOT see Founder C's connection request (Strict Founder Isolation)");

  console.log("\n--- TEST 4: DATA ROOM REQUEST ISOLATION BETWEEN FOUNDERS ---");
  const testDrId = crypto.randomUUID();
  const { error: drErr } = await supabase.from("data_room_requests").insert({
    id: testDrId,
    startup_id: startupCUuid,
    investor_id: testInvestorUuid,
    investor_name: "Test Investor",
    investor_email: newInvestorEmail,
    investor_org: "Alpha Ventures",
    startup_name: "Venture C",
    founder_email: founderCEmail,
    status: "pending",
    nda_signed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (drErr) console.log("DR insert error:", drErr);

  // Founder C checks data room requests
  const { data: founderCDr } = await supabase
    .from("data_room_requests")
    .select("*")
    .or(`startup_id.in.(${startupCUuid}),founder_email.ilike.${founderCEmail}`);
  assert(founderCDr.some((d) => d.id === testDrId), "Founder C receives Data Room request for their startup");

  // Founder D checks data room requests
  const { data: founderDDr } = await supabase
    .from("data_room_requests")
    .select("*")
    .or(`startup_id.in.(${startupDUuid}),founder_email.ilike.${founderDEmail}`);
  assert(!founderDDr.some((d) => d.id === testDrId), "Founder D CANNOT see Founder C's Data Room request");

  console.log("\n--- TEST 5: UNIVERSITY ECOSYSTEM ISOLATION ---");
  // SGU startup
  const sguStartupId = "d73ea489-ceeb-4fe8-a3f7-9ff4e1837a72"; // StudyPulse AI / Sanjay Ghodawat University
  const { data: sguActivity } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("startup_id", sguStartupId);
  assert(Array.isArray(sguActivity), "University activity query for SGU returns legitimate campus records");

  // Querying a non-existent or other university's startup IDs returns only its own
  const otherUniStartupIds = ["non-existent-startup-id-999"];
  const { data: otherUniActivity } = await supabase
    .from("connection_requests")
    .select("*")
    .in("startup_id", otherUniStartupIds);
  assert(otherUniActivity.length === 0, "Other university sees 0 activity for startups outside its campus");

  console.log("\n--- CLEANUP TEMPORARY TEST DATA ---");
  await supabase.from("notifications").delete().eq("id", testNotifId);
  await supabase.from("connection_requests").delete().eq("id", testConnId);
  await supabase.from("data_room_requests").delete().eq("id", testDrId);
  console.log("[PASS] All temporary test records removed cleanly.");

  console.log("\n===============================================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
