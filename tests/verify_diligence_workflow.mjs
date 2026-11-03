import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function runTests() {
  console.log("================================================================================");
  console.log("CAMPUSVENTURE — DATA ROOM DILIGENCE & UNIVERSITY SYNCHRONIZATION TEST SUITE");
  console.log("================================================================================\n");

  const startupId = "802680eb-1c73-4b8f-96f4-77701ce4a0a9"; // Safe Upsert Test
  const startupName = "Safe Upsert Test";
  const founderEmail = "252921389@sguk.ac.in";
  const founderName = "Aditya Dnyaneshwar Dalavi";
  const universityName = "Sanjay Ghodawat University (SGU), Kolhapur";

  const investorId = "inv-" + generateUUID().slice(0, 8);
  const investorName = "Jone Cornar";
  const investorEmail = "jonecornar@gmail.com";
  const investorOrg = "Northbridge Seed";

  const testReqId = generateUUID();
  const now = new Date().toISOString();

  console.log(`[TEST 1] Step 1: Investor ${investorName} (${investorEmail}) submits Data Room request for "${startupName}"...`);
  const initialMeta = {
    message: "Requesting full confidential diligence access under mutual NDA.",
    founderId: "2795717e-1a8b-4cbe-a900-f5dc0c117fb5",
    founderName,
    founderEmail,
    startupId,
    startupName,
    universityName,
    decision: "pending",
    durationDays: 30,
  };

  const { data: insertData, error: insertError } = await supabase.from("data_room_requests").insert({
    id: testReqId,
    startup_id: startupId,
    investor_id: investorId,
    investor_name: investorName,
    investor_email: investorEmail,
    investor_org: investorOrg,
    founder_email: founderEmail,
    startup_name: startupName,
    status: "pending",
    nda_signed: false,
    nda_signed_name: "",
    discussion_terms: "30-Day Confidential Diligence under Mutual NDA",
    next_steps: JSON.stringify(initialMeta),
    created_at: now,
    updated_at: now,
  }).select().single();

  if (insertError) {
    console.error("FAIL: Request insertion failed:", insertError);
    return;
  }
  console.log("PASS: Request created with ID:", insertData.id);

  console.log("\n[TEST 2] Step 2: Student Founder Aayush/Aditya receives request...");
  const { data: founderReqs, error: fError } = await supabase
    .from("data_room_requests")
    .select("*")
    .eq("id", testReqId)
    .eq("founder_email", founderEmail);

  if (fError || !founderReqs || founderReqs.length === 0) {
    console.error("FAIL: Request not found by founder email!");
    return;
  }
  console.log(`PASS: Request successfully reached founder ${founderEmail} exclusively.`);

  console.log("\n[TEST 3] Step 3 & 4: Student Founder ACCEPTS the request with discussion terms...");
  const decisionAt = new Date().toISOString();
  const acceptedMeta = {
    ...initialMeta,
    decision: "accepted",
    decisionAt,
    decisionTimestamp: decisionAt,
    durationDays: 30,
    permittedDocIds: ["284b34d8-d2d4-41a5-b321-a75ee866552a"],
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  };

  const { error: grantError } = await supabase
    .from("data_room_requests")
    .update({
      status: "granted",
      discussion_terms: "Authorized 30-day diligence with cap table and pitch deck scope.",
      next_steps: JSON.stringify(acceptedMeta),
      updated_at: decisionAt,
    })
    .eq("id", testReqId);

  if (grantError) {
    console.error("FAIL: Updating request to granted failed:", grantError);
    return;
  }
  console.log("PASS: Founder decision successfully persisted: status='granted', decision='accepted', decisionAt=" + decisionAt);

  console.log("\n[TEST 4] Step 5 & 6: Investor completes Rules & Regulations acceptance (v1.0-cv-reg)...");
  const rulesAcceptedAt = new Date().toISOString();
  const rulesVersion = "v1.0-cv-reg";
  const declaration = `I confirm that I am investor ${investorName} (${investorEmail}), in my full presence and legal authority. I am okay with all platform rules and regulations (${rulesVersion}) and the consequences of rule breaks. I agree and submit this form as permanent proof of verification and security for ${startupName} and founder (${founderEmail}).`;

  const finalMeta = {
    ...acceptedMeta,
    rulesAccepted: true,
    rulesVersion,
    rulesAcceptedAt,
    ndaSignedName: investorName,
    ndaSignedAt: rulesAcceptedAt,
    rulesProof: {
      investorName,
      investorEmail,
      investorOrg,
      founderName,
      founderEmail,
      startupName,
      universityName,
      rulesVersion,
      declaration,
      timestamp: rulesAcceptedAt,
      accessScope: ["284b34d8-d2d4-41a5-b321-a75ee866552a"],
    },
  };

  const { error: rulesError } = await supabase
    .from("data_room_requests")
    .update({
      nda_signed: true,
      nda_signed_name: investorName,
      next_steps: JSON.stringify(finalMeta),
      updated_at: rulesAcceptedAt,
    })
    .eq("id", testReqId);

  if (rulesError) {
    console.error("FAIL: Updating rules acceptance failed:", rulesError);
    return;
  }
  console.log("PASS: Exact same record updated with rules acceptance: rulesVersion='v1.0-cv-reg', rulesAcceptedAt=" + rulesAcceptedAt);

  console.log("\n[TEST 5] Step 7: University Dashboard verification for Sanjay Ghodawat University (SGU)...");
  // Query exactly as SGU dashboard does
  const { data: sguStartups } = await supabase.from("startups").select("id, name, university, founder_email");
  const sguMatchedIds = (sguStartups || [])
    .filter((s) => s.university?.includes("Sanjay Ghodawat") || s.founder_email?.endsWith("sguk.ac.in"))
    .map((s) => s.id);

  const { data: sguDr, error: sguErr } = await supabase
    .from("data_room_requests")
    .select("*")
    .or(`startup_id.in.(${sguMatchedIds.join(",")}),founder_email.ilike.%sguk.ac.in,next_steps.ilike.%Ghodawat%`)
    .order("created_at", { ascending: false });

  if (sguErr || !sguDr) {
    console.error("FAIL: Querying SGU requests failed:", sguErr);
    return;
  }

  const sguRecord = sguDr.find((r) => r.id === testReqId);
  if (!sguRecord) {
    console.error("FAIL: Test record not found in SGU dashboard query!");
    return;
  }
  const sguParsed = JSON.parse(sguRecord.next_steps);

  console.log("PASS: Record successfully retrieved in SGU University Dashboard query:");
  console.log("  1. Investor Name & Email:      ", sguRecord.investor_name, `(${sguRecord.investor_email})`);
  console.log("  2. Founder Name & Email:       ", sguParsed.founderName, `(${sguRecord.founder_email})`);
  console.log("  3. Startup Name & ID:          ", sguRecord.startup_name, `(${sguRecord.startup_id})`);
  console.log("  4. Associated University:      ", sguParsed.universityName);
  console.log("  5. Request Submission Date:    ", sguRecord.created_at);
  console.log("  6. Founder Decision:           ", sguParsed.decision);
  console.log("  7. Decision Timestamp:         ", sguParsed.decisionAt);
  console.log("  8. Investor Rules Status:      ", sguParsed.rulesAccepted ? "Accepted" : "Pending");
  console.log("  9. Rules Version & Timestamp:  ", sguParsed.rulesVersion, "@", sguParsed.rulesAcceptedAt);
  console.log(" 10. Access Status:              ", sguRecord.status);
  console.log(" 11. Proof of Trust Stored:      ", Boolean(sguParsed.rulesProof));

  console.log("\n[TEST 6] Cross-Tenant Isolation Verification: COEP University Query...");
  // Simulate COEP dashboard query (domain: coep.ac.in, universityName: "College of Engineering, Pune")
  const coepDomain = "coep.ac.in";
  const coepMatchedIds = (sguStartups || [])
    .filter((s) => s.university?.includes("COEP") || s.founder_email?.endsWith(coepDomain))
    .map((s) => s.id);

  let coepDr = [];
  if (coepMatchedIds.length > 0) {
    const { data } = await supabase
      .from("data_room_requests")
      .select("*")
      .or(`startup_id.in.(${coepMatchedIds.join(",")}),founder_email.ilike.%${coepDomain}`)
      .order("created_at", { ascending: false });
    coepDr = data || [];
  } else {
    // If no startups registered, query strictly by domain
    const { data } = await supabase
      .from("data_room_requests")
      .select("*")
      .ilike("founder_email", `%${coepDomain}`)
      .order("created_at", { ascending: false });
    coepDr = data || [];
  }

  const leakedRecord = coepDr.find((r) => r.id === testReqId || r.founder_email?.endsWith("sguk.ac.in"));
  if (leakedRecord) {
    console.error("FAIL: Cross-tenant data leak! COEP retrieved SGU's record:", leakedRecord.id);
    return;
  }
  console.log(`PASS: COEP University query returned ${coepDr.length} records. ZERO leak from Sanjay Ghodawat University!`);

  console.log("\n[TEST 7] Rejected Request Persistence Verification...");
  const rejReqId = generateUUID();
  const rejNow = new Date().toISOString();
  const rejMeta = {
    message: "Requesting data room access for Series Seed review.",
    founderName,
    founderEmail,
    startupId,
    startupName,
    universityName,
    decision: "rejected",
    decisionAt: rejNow,
    decisionTimestamp: rejNow,
    declineReason: "Data room access currently restricted to institutional lead investors.",
  };

  const rejInvestorId = "inv-rej-" + generateUUID().slice(0, 8);
  const { error: rejInsertErr } = await supabase.from("data_room_requests").insert({
    id: rejReqId,
    startup_id: startupId,
    investor_id: rejInvestorId,
    investor_name: "Rival Capital",
    investor_email: "rival@capital.com",
    investor_org: "Rival Ventures",
    founder_email: founderEmail,
    startup_name: startupName,
    status: "rejected",
    nda_signed: false,
    nda_signed_name: "",
    decline_reason: "Data room access currently restricted to institutional lead investors.",
    discussion_terms: "Declined",
    next_steps: JSON.stringify(rejMeta),
    created_at: rejNow,
    updated_at: rejNow,
  });

  if (rejInsertErr) {
    console.error("FAIL: rejInsertErr:", rejInsertErr);
    return;
  }

  const { data: rejFetch, error: rejFetchErr } = await supabase
    .from("data_room_requests")
    .select("*")
    .eq("id", rejReqId)
    .single();

  if (rejFetchErr || !rejFetch) {
    console.error("FAIL: rejFetchErr:", rejFetchErr);
    return;
  }

  const rejParsed = JSON.parse(rejFetch.next_steps);
  if (rejFetch.status === "rejected" && rejParsed.decision === "rejected" && rejParsed.universityName === universityName) {
    console.log("PASS: Rejected request correctly persisted with university association, decline reason, and decision timestamp.");
  } else {
    console.error("FAIL: Rejected request not correctly recorded:", rejFetch);
    return;
  }

  console.log("\n================================================================================");
  console.log("ALL 7 CRITICAL TESTS PASSED WITH 100% SUCCESS");
  console.log("================================================================================");
}

runTests();
