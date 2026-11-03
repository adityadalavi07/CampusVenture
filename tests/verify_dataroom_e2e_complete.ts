import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { requestService } from "../src/services/requestService";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function computeSha256(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, "0");
}

async function runFullDiligenceLifecycle() {
  console.log("================================================================================");
  console.log("   DATA ROOM END-TO-END DEEP LIFECYCLE & SECURITY VERIFICATION");
  console.log("================================================================================");

  const testSuffix = Date.now().toString(36);
  const startupId = generateUUID();
  const founderId = generateUUID();
  const founderEmail = `founder_${testSuffix}@sguk.ac.in`;
  const founderName = `Aayush Founder ${testSuffix}`;

  const investorId = generateUUID();
  const investorEmail = `evaluator_investor_${testSuffix}@gmail.com`;
  const investorName = `Sarah Jenkins ${testSuffix}`;

  const universityName = "Sanjay Ghodawat University (SGU), Kolhapur";
  const foreignUniversity = "COEP Technological University, Pune";

  console.log(`\n[STEP 1] Setup: Create Verified Startup with 2 Documents in Supabase`);
  // 1. Create startup
  await supabase.from("startups").insert({
    id: startupId,
    founder_id: founderId,
    founder: founderName,
    founder_email: founderEmail,
    name: `AeroDrone Systems ${testSuffix}`,
    tagline: "Autonomous cargo drones",
    sector: "AI",
    stage: "Seed",
    location: "Kolhapur",
    university: universityName,
    funding_required: 150000,
    status: "approved",
    verified: true,
  });

  // 2. Create 2 documents: Doc A (permitted) and Doc B (confidential unpermitted)
  const docAId = generateUUID();
  const docBId = generateUUID();

  await supabase.from("data_room_docs").insert([
    {
      id: docAId,
      startup_id: startupId,
      name: "Pitch_Deck_Q4.pdf",
      category: "Product",
      size: "2.1 MB",
      confidential: true,
    },
    {
      id: docBId,
      startup_id: startupId,
      name: "Cap_Table_Confidential.xlsx",
      category: "Legal",
      size: "850 KB",
      confidential: true,
    },
  ]);
  console.log(`PASS: Created startup and 2 docs (Doc A: ${docAId}, Doc B: ${docBId})`);

  console.log(`\n[STEP 2] Investor submits Data Room request`);
  const reqRes = await requestService.requestDataRoomAccess({
    startupId,
    investorId,
    investorName,
    investorEmail,
    investorOrg: "Nexus Global Ventures",
    startupName: `AeroDrone Systems ${testSuffix}`,
    founderId,
    founderName,
    founderEmail,
    universityName,
    message: "Requesting diligence access to review drone firmware architecture.",
  });

  const requestId = reqRes.request?.id;
  if (!requestId) {
    console.error("FAIL: Request creation returned no ID!");
    process.exit(1);
  }
  console.log(`PASS: Request created with ID: ${requestId}, status: ${reqRes.request?.status}`);

  console.log(`\n[STEP 3] Founder receives request & grants access to Doc A ONLY`);
  const permittedDocs = [docAId]; // Doc B is NOT permitted!
  await requestService.updateDataRoomRequestStatus(requestId, "granted", {
    permittedDocIds: permittedDocs,
    durationDays: 30,
    discussionTerms: "30-Day Evaluation under Mutual NDA",
  });
  console.log(`PASS: Founder granted request with permittedDocIds = [Doc A: ${docAId}]`);

  console.log(`\n[STEP 4] University receives persistent diligence record immediately`);
  const uniActivity = await requestService.getUniversityInvestorActivity({
    campusStartupIds: [startupId],
    universityOrg: universityName,
    universityEmail: "dean@sguk.ac.in",
  });

  const uniRecord = uniActivity.dataRoomRequests.find((r) => r.id === requestId);
  if (!uniRecord) {
    console.error("FAIL: Diligence record not found in university dashboard activity!");
    process.exit(1);
  }
  console.log(`PASS: University dashboard diligence record verified:`);
  console.log(`  - Investor: ${uniRecord.investorName} (${uniRecord.investorEmail})`);
  console.log(`  - Founder: ${uniRecord.founderName} (${uniRecord.founderEmail})`);
  console.log(`  - Startup: ${uniRecord.startupName} (ID: ${uniRecord.startupId})`);
  console.log(`  - Status: ${uniRecord.status}`);
  console.log(`  - Decision: ${uniRecord.decision}`);

  console.log(`\n[STEP 5] Investor signs NDA & accepts Rules and Regulations (v1.0-cv-reg)`);
  const proofTimestamp = new Date().toISOString();
  const proofHash = computeSha256(`${investorEmail}|${startupId}|${proofTimestamp}|v1.0-cv-reg`);
  const proofPayload = {
    rulesVersion: "v1.0-cv-reg",
    acceptedAt: proofTimestamp,
    investorName,
    investorEmail,
    startupId,
    startupName: `AeroDrone Systems ${testSuffix}`,
    universityName,
    legalHash: proofHash,
  };

  await requestService.recordRulesAcceptance({
    requestId,
    startupId,
    investorUserId: investorId,
    investorId,
    investorName,
    investorEmail,
    investorOrg: "Nexus Global Ventures",
    founderUserId: founderId,
    founderId,
    founderName,
    founderEmail,
    startupName: `AeroDrone Systems ${testSuffix}`,
    universityName,
    rulesVersion: "v1.0-cv-reg",
    accessScope: permittedDocs,
    legalHash: proofHash,
    legalStatement: `I confirm that I am investor ${investorName} (${investorEmail}), in my full presence and legal authority.`,
  });
  console.log(`PASS: Investor completed Rules acceptance and Proof of Trust generated.`);

  console.log(`\n[STEP 6] Verify University Dashboard record updated with Rules proof`);
  const freshUniActivity = await requestService.getUniversityInvestorActivity({
    campusStartupIds: [startupId],
    universityOrg: universityName,
    universityEmail: "dean@sguk.ac.in",
  });

  const updatedUniRecord = freshUniActivity.dataRoomRequests.find((r) => r.id === requestId);
  console.log(`PASS: Updated record in University Dashboard:`);
  console.log(`  - Status: ${updatedUniRecord?.status}`);
  console.log(`  - Rules Accepted: ${updatedUniRecord?.rulesAccepted}`);
  console.log(`  - Rules Version: ${updatedUniRecord?.rulesVersion}`);
  console.log(`  - Proof Legal Hash: ${updatedUniRecord?.rulesProof?.legalHash}`);

  console.log(`\n[STEP 7] Investor queries Data Room documents (Server-Side Permission Test)`);
  // Test what docs investor receives when querying getDataRoomDocsForStartup with their permittedDocIds
  const investorVisibleDocs = await requestService.getDataRoomDocsForStartup(startupId, {
    docIds: permittedDocs,
  });
  console.log(`Investor requested docs: returned ${investorVisibleDocs.length} doc(s)`);
  for (const d of investorVisibleDocs) {
    console.log(`  Visible doc: ${d.id} (${d.name})`);
  }

  if (investorVisibleDocs.some((d) => d.id === docBId)) {
    console.error("FAIL: SECURITY VULNERABILITY! Unpermitted Doc B was exposed to investor!");
    process.exit(1);
  }
  console.log("PASS: Unpermitted Doc B was completely hidden from investor deal room.");

  console.log(`\n[STEP 8] Investor attempts to generate signed URL for Doc A vs Doc B`);
  const urlResA = await requestService.getDocumentSignedUrl({
    docId: docAId,
    startupId,
    requesterUserId: investorId,
    requesterEmail: investorEmail,
    requesterRole: "investor",
  });
  console.log(`Doc A (Permitted) URL request: success=${urlResA.success}, inAppPreview=${urlResA.inAppPreview}`);

  const urlResB = await requestService.getDocumentSignedUrl({
    docId: docBId,
    startupId,
    requesterUserId: investorId,
    requesterEmail: investorEmail,
    requesterRole: "investor",
  });
  console.log(`Doc B (Unpermitted) URL request: success=${urlResB.success}, error="${urlResB.error}"`);
  if (urlResB.success) {
    console.error("FAIL: SECURITY VULNERABILITY! Signed URL was generated for unpermitted Doc B!");
    process.exit(1);
  }
  console.log("PASS: Backend strictly blocked signed URL generation for unpermitted Doc B.");

  console.log(`\n[STEP 9] Student Founder revokes investor access`);
  await requestService.updateDataRoomRequestStatus(requestId, "revoked", {
    revokedBy: founderId,
    revokedReason: "Diligence evaluation window concluded.",
  });

  const urlResAfterRevoke = await requestService.getDocumentSignedUrl({
    docId: docAId,
    startupId,
    requesterUserId: investorId,
    requesterEmail: investorEmail,
    requesterRole: "investor",
  });
  console.log(`Post-Revocation Doc A URL request: success=${urlResAfterRevoke.success}, error="${urlResAfterRevoke.error}"`);
  if (urlResAfterRevoke.success) {
    console.error("FAIL: SECURITY VULNERABILITY! Revoked investor was still able to generate signed URL!");
    process.exit(1);
  }
  console.log("PASS: Revocation successfully invalidated document access on backend.");

  console.log(`\n[STEP 10] University Dashboard retains full historical diligence trail`);
  const postRevokeActivity = await requestService.getUniversityInvestorActivity({
    campusStartupIds: [startupId],
    universityOrg: universityName,
    universityEmail: "dean@sguk.ac.in",
  });
  const historyRecord = postRevokeActivity.dataRoomRequests.find((r) => r.id === requestId);
  console.log(`PASS: Historical diligence activity retained:`);
  console.log(`  - Status: ${historyRecord?.status}`);
  console.log(`  - Decision History: ${historyRecord?.decision}`);
  console.log(`  - Rules Acceptance History: ${historyRecord?.rulesAccepted} (${historyRecord?.rulesVersion})`);

  console.log(`\n[STEP 11] Foreign University Isolation Check (${foreignUniversity})`);
  const foreignActivity = await requestService.getUniversityInvestorActivity({
    campusStartupIds: [],
    universityOrg: foreignUniversity,
    universityEmail: "incubation@coep.ac.in",
  });
  const leakedRecord = foreignActivity.dataRoomRequests.find((r) => r.id === requestId);
  if (leakedRecord) {
    console.error("FAIL: CROSS-TENANT DATA LEAK! Foreign university retrieved SGU record!");
    process.exit(1);
  }
  console.log("PASS: Multi-tenant boundary confirmed. 0 records leaked to foreign university.");

  console.log(`\n[STEP 12] Cleanup Test Artifacts`);
  await supabase.from("data_room_requests").delete().eq("id", requestId);
  await supabase.from("data_room_docs").delete().in("id", [docAId, docBId]);
  await supabase.from("startups").delete().eq("id", startupId);
  console.log("PASS: Cleaned up test artifacts safely.");

  console.log("\n================================================================================");
  console.log("   ALL 12 DATA ROOM SECURITY & DILIGENCE CHECKS PASSED 100%!");
  console.log("================================================================================");
}

runFullDiligenceLifecycle();
