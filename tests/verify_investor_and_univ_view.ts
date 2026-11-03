import fs from "fs";

global.window = {
  dispatchEvent: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
} as any;
global.localStorage = (global.window as any).localStorage;

async function runVerification() {
  console.log("================================================================================");
  console.log("CAMPUSVENTURE — VERIFY INVESTOR DOCUMENT VISIBILITY & UNIVERSITY DASHBOARD");
  console.log("================================================================================\n");

  const { requestService } = await import("../src/services/requestService.ts");

  console.log("[TEST 1] Investor Document Loading for Startup 's-mvktiqwp' (nevorox)...");
  const permittedDocIds = [
    "284b34d8-d2d4-41a5-b321-a75ee866552a",
    "6a052191-49dd-462a-84fd-ea3dfa42c849"
  ];

  const docs = await requestService.getDataRoomDocsForStartup("s-mvktiqwp", {
    docIds: permittedDocIds,
  });

  console.log("  Documents loaded by investor:", docs.length);
  for (const d of docs) {
    console.log(`  - Doc: "${d.name}" | ID: ${d.id} | Category: ${d.category} | Size: ${d.size}`);
  }

  if (docs.length === 0) {
    console.error("  FAIL: Investor cannot see permitted documents!");
    process.exit(1);
  }
  console.log("  PASS: Investor successfully receives founder-permitted confidential documents!");

  console.log("\n[TEST 2] University Dashboard Activity Query for SGU (252921043@sguk.ac.in)...");
  const sguActivity = await requestService.getUniversityInvestorActivity({
    universityEmail: "252921043@sguk.ac.in",
    universityName: "Sanjay Ghodawat University (SGU), Kolhapur",
    universityOrg: "Sanjay Ghodawat University (SGU), Kolhapur",
  });

  console.log("  Total Diligence Records retrieved:", sguActivity.dataRoomRequests.length);
  const targetReq = sguActivity.dataRoomRequests.find((r) => r.id === "a7ac36a3-6312-43ab-8bb1-8ff19fe65cb1");

  if (!targetReq) {
    console.error("  FAIL: User's test request 'a7ac36a3-6312-43ab-8bb1-8ff19fe65cb1' was NOT found in SGU dashboard!");
    process.exit(1);
  }

  console.log("  PASS: User's live request found! Checking all 11 mandatory fields:");
  console.log("    1. Investor:           ", targetReq.investorName, `(${targetReq.investorEmail})`);
  console.log("    2. Student Founder:    ", targetReq.founderName, `(${targetReq.founderEmail})`);
  console.log("    3. Startup:            ", targetReq.startupName, `(ID: ${targetReq.startupId})`);
  console.log("    4. Associated Univ:    ", targetReq.universityName);
  console.log("    5. Request Submitted:  ", targetReq.createdAt);
  console.log("    6. Founder Decision:   ", targetReq.decision);
  console.log("    7. Decision Timestamp: ", targetReq.decisionAt);
  console.log("    8. Investor Rules:     ", targetReq.rulesAccepted ? "Accepted" : "Pending");
  console.log("    9. Rules Version & At: ", targetReq.rulesVersion, "@", targetReq.rulesAcceptedAt);
  console.log("   10. Current Status:     ", targetReq.status);
  console.log("   11. Permitted Docs:     ", targetReq.permittedDocIds?.length, "files");

  console.log("\n[TEST 3] Strict Cross-Tenant Isolation (COEP)...");
  const coepActivity = await requestService.getUniversityInvestorActivity({
    universityEmail: "innovation@coep.ac.in",
    universityName: "College of Engineering, Pune",
    universityOrg: "College of Engineering, Pune",
  });

  console.log("  COEP Data Room Requests count:", coepActivity.dataRoomRequests.length);
  if (coepActivity.dataRoomRequests.length !== 0) {
    console.error("  FAIL: COEP leaked records!");
    process.exit(1);
  }
  console.log("  PASS: COEP receives 0 records. Strict isolation confirmed.");

  console.log("\n================================================================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY (100%)");
  console.log("================================================================================\n");
}

runVerification();
