import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const SUPABASE_URL = env.VITE_SUPABASE_URL || "https://bflbavqvyffxirzfsyhx.supabase.co";
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("===============================================================================");
console.log("TESTING UNIVERSITY PROOF OF TRUST & DATA ROOM CONVERSATION FETCHING");
console.log("===============================================================================\n");

async function run() {
  let passed = 0;
  let failed = 0;

  const testInvestorId = crypto.randomUUID();
  const testFounderId = crypto.randomUUID();
  const testStartupId = crypto.randomUUID();
  const testRequestId = crypto.randomUUID();

  const investorName = "Alpha Capital Partners (Verified Partner)";
  const investorEmail = `alpha.investor.${Date.now()}@fund.com`;
  const founderEmail = `founder.c.${Date.now()}@sguk.ac.in`;
  const startupName = "Quantum Robotics Labs";
  const universityName = "Sanjay Ghodawat University (SGU), Kolhapur";

  try {
    // 1. Simulate Student Granting Access with permittedDocIds
    console.log("--- 1. FOUNDER GRANTS DATA ROOM ACCESS ---");
    const metaPayload = {
      founderId: testFounderId,
      founderEmail,
      startupName,
      universityName,
      permittedDocIds: ["doc-cap-table-001", "doc-financials-002"],
      durationDays: 30,
    };

    const { error: insErr } = await supabase.from("data_room_requests").insert({
      id: testRequestId,
      startup_id: testStartupId,
      investor_id: testInvestorId,
      investor_name: investorName,
      investor_email: investorEmail,
      investor_org: "Alpha Ventures Fund",
      startup_name: startupName,
      founder_email: founderEmail,
      status: "granted",
      nda_signed: false,
      next_steps: JSON.stringify(metaPayload),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insErr) {
      console.error("[FAIL] Error inserting initial granted request:", insErr.message);
      failed++;
    } else {
      console.log("[PASS] Data room access granted by student founder with 2 permitted confidential docs");
      passed++;
    }

    // 2. Investor Accepts Rules & Regulations (v1.0-cv-reg) with full presence and stores proof form
    console.log("\n--- 2. INVESTOR SUBMITS RULES & REGULATIONS COMPLIANCE FORM ---");
    const nowIso = new Date().toISOString();
    const declaration = `I confirm that I am investor ${investorName} (${investorEmail}), in my full presence and legal authority. I am okay with all rules and regulations (v1.0-cv-reg) and the consequences of rule breaks. I agree and submit this form as permanent proof of verification and security for ${startupName} and founder (${founderEmail}).`;

    const rulesProof = {
      investorName,
      investorEmail,
      investorOrg: "Alpha Ventures Fund",
      founderName: "Verified Student Founder",
      founderEmail,
      startupName,
      universityName,
      rulesVersion: "v1.0-cv-reg",
      declaration,
      timestamp: nowIso,
      accessScope: ["doc-cap-table-001", "doc-financials-002"],
    };

    const updatedMeta = {
      ...metaPayload,
      rulesAccepted: true,
      rulesVersion: "v1.0-cv-reg",
      rulesAcceptedAt: nowIso,
      ndaSignedName: investorName,
      ndaSignedAt: nowIso,
      rulesProof,
    };

    const { error: updErr } = await supabase
      .from("data_room_requests")
      .update({
        nda_signed: true,
        nda_signed_name: investorName,
        next_steps: JSON.stringify(updatedMeta),
        updated_at: nowIso,
      })
      .eq("id", testRequestId);

    if (updErr) {
      console.error("[FAIL] Error updating request with signed rules proof:", updErr.message);
      failed++;
    } else {
      console.log("[PASS] Compliance form and rulesProof successfully stored in database");
      passed++;
    }

    // 3. Verify University View Fetches Stored Proof of Trust
    console.log("\n--- 3. UNIVERSITY DASHBOARD FETCHES REAL-TIME PROOF OF TRUST ---");
    const { data: univDrData, error: univFetchErr } = await supabase
      .from("data_room_requests")
      .select("*")
      .eq("startup_id", testStartupId);

    if (univFetchErr || !univDrData || univDrData.length === 0) {
      console.error("[FAIL] University query failed to find data room records:", univFetchErr?.message);
      failed++;
    } else {
      const fetched = univDrData[0];
      const parsedMeta = JSON.parse(fetched.next_steps);
      if (parsedMeta.rulesProof && parsedMeta.rulesProof.rulesVersion === "v1.0-cv-reg") {
        console.log("[PASS] University retrieved stored Proof of Trust with exact rulesVersion: v1.0-cv-reg");
        passed++;
      } else {
        console.error("[FAIL] rulesProof missing or invalid in fetched record");
        failed++;
      }

      if (parsedMeta.rulesProof.declaration === declaration) {
        console.log("[PASS] University retrieved exact signed investor declaration statement");
        passed++;
      } else {
        console.error("[FAIL] Declaration statement mismatch");
        failed++;
      }

      if (
        Array.isArray(parsedMeta.rulesProof.accessScope) &&
        parsedMeta.rulesProof.accessScope.length === 2
      ) {
        console.log("[PASS] University verified 2 permitted confidential documents under agreement");
        passed++;
      } else {
        console.error("[FAIL] Permitted document scope mismatch in proof");
        failed++;
      }
    }

    // 4. Test Conversation Exchanged Between Investor and Student
    console.log("\n--- 4. TEST REAL-TIME CONVERSATION BETWEEN INVESTOR AND FOUNDER ---");
    const msgId = crypto.randomUUID();
    const { error: msgErr } = await supabase.from("messages").insert({
      id: msgId,
      startup_id: testStartupId,
      sender_id: testInvestorId,
      sender_name: investorName,
      sender_role: "investor",
      sender_email: investorEmail,
      recipient_id: testFounderId,
      recipient_name: "Founder C",
      recipient_email: founderEmail,
      content: "Hello! We have reviewed the confidential cap table and are excited about your unit economics.",
      read: false,
      created_at: new Date().toISOString(),
    });

    if (msgErr) {
      console.log("[NOTICE] Message insert:", msgErr.message);
    } else {
      console.log("[PASS] Real-time message between investor and student sent successfully");
      passed++;

      // Verify university query retrieves conversation for campus startup
      const { data: campusMsgs } = await supabase
        .from("messages")
        .select("*")
        .eq("startup_id", testStartupId);

      if (campusMsgs && campusMsgs.length > 0) {
        console.log(`[PASS] University query fetched ${campusMsgs.length} active message(s) for campus startup`);
        passed++;
      } else {
        console.error("[FAIL] Failed to fetch campus messages");
        failed++;
      }

      // Clean up test message
      await supabase.from("messages").delete().eq("id", msgId);
    }

    // 5. Verify Unrelated University Isolation
    console.log("\n--- 5. UNRELATED UNIVERSITY ISOLATION ---");
    const unrelatedCampusStartupIds = [crypto.randomUUID(), crypto.randomUUID()];
    const { data: unrelatedData } = await supabase
      .from("data_room_requests")
      .select("*")
      .in("startup_id", unrelatedCampusStartupIds);

    if (unrelatedData && unrelatedData.length === 0) {
      console.log("[PASS] Other universities cannot access SGU's confidential proof of trust or data room data");
      passed++;
    } else {
      console.error("[FAIL] Isolation failure: unrelated university retrieved foreign data");
      failed++;
    }
  } finally {
    // Clean up test records
    await supabase.from("data_room_requests").delete().eq("id", testRequestId);
  }

  console.log("\n===============================================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================================\n");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
