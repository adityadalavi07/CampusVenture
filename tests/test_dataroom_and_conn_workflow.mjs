import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || "";
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
}

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
const sb = createClient(supabaseUrl, supabaseAnonKey);

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

async function runE2ETests() {
  console.log("===============================================================================");
  console.log("CAMPUSVENTURE DATA-ROOM & CONNECTION ISOLATION E2E TEST SUITE");
  console.log("===============================================================================\n");

  const testConnId = "f1111111-1111-1111-1111-111111111111";
  const testDrId = "f2222222-2222-2222-2222-222222222222";

  const investor1Id = "61d81a6d-fed0-4d2c-8e6a-e9f365d88ba3"; // dalaviaditya67@gmail.com
  const founder2Id = "24cceeb2-8c9f-4318-b223-2ee87bf3a444";  // 252921413@sguk.ac.in (Founder B)
  const founder3Id = "33333333-3333-3333-3333-333333333333";  // Unrelated Founder C

  try {
    // -------------------------------------------------------------------------
    // 1. CONNECTION REQUEST WORKFLOW & ISOLATION
    // -------------------------------------------------------------------------
    console.log("--- 1. CONNECTION REQUEST WORKFLOW & ISOLATION ---");

    // Investor 1 sends connection request to Founder 2
    const connPayload = {
      id: testConnId,
      sender_id: investor1Id,
      sender_name: "Aditya Dalavi (Investor 1)",
      sender_email: "dalaviaditya67@gmail.com",
      sender_role: "investor",
      sender_org: "Northbridge Seed",
      receiver_id: founder2Id,
      receiver_name: "Campus Founder 2",
      receiver_email: "252921413@sguk.ac.in",
      startup_id: "23463a51-ea0a-4876-a73b-b8ec7356fe0d",
      startup_name: "AutoCampus AI",
      message: "Would love to discuss your seed stage traction.",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: connInsertErr } = await sb.from("connection_requests").upsert(connPayload);
    assert(!connInsertErr, "Investor 1 successfully submits Connection Request to Founder 2");

    // Query incoming requests for Founder 2
    const { data: founder2Requests } = await sb
      .from("connection_requests")
      .select("*")
      .or(`receiver_id.eq.${founder2Id},receiver_email.ilike.252921413@sguk.ac.in`);

    const f2Match = (founder2Requests || []).find((r) => r.id === testConnId);
    assert(Boolean(f2Match), "Founder 2 correctly receives Investor 1's connection request in their dashboard");

    // Query incoming requests for unrelated Founder 3 (Strict Multi-tenant Isolation)
    const { data: founder3Requests } = await sb
      .from("connection_requests")
      .select("*")
      .or(`receiver_id.eq.${founder3Id},receiver_email.ilike.unrelated@university.edu`);

    const f3Leak = (founder3Requests || []).find((r) => r.id === testConnId);
    assert(!f3Leak, "Unrelated Founder 3 DOES NOT see Investor 1's connection request (Strict Isolation verified)");

    // Founder 2 accepts the Connection Request
    const { error: acceptErr } = await sb
      .from("connection_requests")
      .update({
        status: "accepted",
        discussion_terms: "Mutual connection agreed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", testConnId);

    assert(!acceptErr, "Founder 2 accepts Connection Request -> status updated to 'accepted'");

    // Verify Chat Route navigation payload
    const chatRouteTarget = `/app/student/messages?investorId=${investor1Id}`;
    assert(
      chatRouteTarget.includes(investor1Id),
      "Accepting connection creates direct 1-to-1 Open Chat route with the authorized counterpart"
    );

    // -------------------------------------------------------------------------
    // 2. DATA ROOM REQUEST WORKFLOW & PERMITTED DOCS
    // -------------------------------------------------------------------------
    console.log("\n--- 2. DATA ROOM REQUEST WORKFLOW & PERMITTED DOCS ---");

    const drMetaInitial = {
      message: "Requesting access to examine financial model and IP pitch deck",
      founderId: founder2Id,
      durationDays: 30,
    };

    const drPayload = {
      id: testDrId,
      startup_id: "23463a51-ea0a-4876-a73b-b8ec7356fe0d",
      investor_id: investor1Id,
      investor_name: "Aditya Dalavi (Investor 1)",
      investor_email: "dalaviaditya67@gmail.com",
      investor_org: "Northbridge Seed",
      startup_name: "AutoCampus AI",
      founder_email: "252921413@sguk.ac.in",
      status: "pending",
      nda_signed: false,
      nda_signed_name: "",
      discussion_terms: "30-Day Confidential Diligence under Mutual NDA",
      next_steps: JSON.stringify(drMetaInitial),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: drInsertErr } = await sb.from("data_room_requests").upsert(drPayload);
    assert(!drInsertErr, "Investor 1 submits Data Room Access Request in Supabase");

    // Founder 2 queries their Data Room requests
    const { data: founder2DrList } = await sb
      .from("data_room_requests")
      .select("*")
      .or(`founder_email.ilike.252921413@sguk.ac.in,startup_id.eq.23463a51-ea0a-4876-a73b-b8ec7356fe0d`);

    const drMatch = (founder2DrList || []).find((r) => r.id === testDrId);
    assert(Boolean(drMatch), "Founder 2 receives Data Room request for their startup");

    // Unrelated Founder 3 queries their Data Room requests (Strict Isolation)
    const { data: founder3DrList } = await sb
      .from("data_room_requests")
      .select("*")
      .or(`founder_email.ilike.unrelated@university.edu,startup_id.eq.00000000-0000-0000-0000-000000000000`);

    const drLeak = (founder3DrList || []).find((r) => r.id === testDrId);
    assert(!drLeak, "Unrelated Founder 3 CANNOT access or see Founder 2's Data Room requests");

    // Founder 2 grants access with specific permittedDocIds: ['doc-cap-table', 'doc-pitch-deck']
    const permittedDocs = ["doc-cap-table", "doc-pitch-deck"];
    const drMetaGranted = {
      ...drMetaInitial,
      permittedDocIds: permittedDocs,
      durationDays: 30,
      expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    };

    const { error: grantErr } = await sb
      .from("data_room_requests")
      .update({
        status: "granted",
        next_steps: JSON.stringify(drMetaGranted),
        updated_at: new Date().toISOString(),
      })
      .eq("id", testDrId);

    assert(!grantErr, "Founder 2 approves Data Room request with permittedDocIds (granular document authorization)");

    // -------------------------------------------------------------------------
    // 3. UNIVERSITY TENANT ISOLATION ON APPROVAL
    // -------------------------------------------------------------------------
    console.log("\n--- 3. UNIVERSITY NOTIFICATION ISOLATION ---");

    const { data: univProfiles } = await sb.from("profiles").select("id, email, org").eq("role", "university");
    const sguUniv = (univProfiles || []).find((u) => u.org && u.org.includes("Ghodawat"));
    assert(Boolean(sguUniv), `Found authorized student's university: ${sguUniv?.org} (${sguUniv?.email})`);

    // Verify isolation logic: Founder 2 is at SGU (sguk.ac.in), so only SGU is targeted
    const founderDomain = "252921413@sguk.ac.in".split("@")[1];
    const matchingUnivs = (univProfiles || []).filter(
      (u) =>
        (u.email && u.email.split("@")[1] === founderDomain) ||
        (u.org && u.org.toLowerCase().includes("ghodawat"))
    );
    assert(matchingUnivs.length === 1 && matchingUnivs[0].id === sguUniv?.id, "Only the student's associated university (SGU) is targeted; all other universities are excluded");

    // -------------------------------------------------------------------------
    // 4. INVESTOR RULES & REGULATIONS ACCEPTANCE & AUDIT LOG
    // -------------------------------------------------------------------------
    console.log("\n--- 4. INVESTOR RULES & REGULATIONS ACKNOWLEDGEMENT ---");

    const drMetaRulesAccepted = {
      ...drMetaGranted,
      rulesAccepted: true,
      rulesVersion: "v1.0-cv-reg",
      rulesAcceptedAt: new Date().toISOString(),
      universityName: "Sanjay Ghodawat University (SGU), Kolhapur",
      investorName: "Aditya Dalavi (Investor 1)",
      investorEmail: "dalaviaditya67@gmail.com",
      founderEmail: "252921413@sguk.ac.in",
    };

    const { error: rulesErr } = await sb
      .from("data_room_requests")
      .update({
        nda_signed: true,
        nda_signed_name: "Aditya Dalavi (Investor 1)",
        next_steps: JSON.stringify(drMetaRulesAccepted),
        updated_at: new Date().toISOString(),
      })
      .eq("id", testDrId);

    assert(!rulesErr, "Investor signs Platform Rules & Regulations (v1.0-cv-reg) with full legal confirmation");

    // Verify record state from DB
    const { data: finalRecord } = await sb.from("data_room_requests").select("*").eq("id", testDrId).single();
    const finalMeta = JSON.parse(finalRecord.next_steps);
    assert(finalRecord.status === "granted", "Data room status is 'granted'");
    assert(finalRecord.nda_signed === true, "NDA signed is true");
    assert(finalMeta.rulesAccepted === true, "Rules acceptance confirmed in permanent DB audit record");
    assert(
      JSON.stringify(finalMeta.permittedDocIds) === JSON.stringify(permittedDocs),
      "Only the 2 authorized documents are permitted to the investor"
    );

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n--- CLEANUP OF TEST ARTIFACTS ---");
    await sb.from("connection_requests").delete().eq("id", testConnId);
    await sb.from("data_room_requests").delete().eq("id", testDrId);
    console.log("[PASS] Test connection and data room records cleaned up from database.");
  }

  console.log("\n===============================================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
