import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

// Polyfill window / localStorage for Node test
global.window = {
  dispatchEvent: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
};
global.localStorage = global.window.localStorage;

async function testRuntime() {
  const { requestService } = await import("../src/services/requestService.ts");

  console.log("\n--- Testing SGU getUniversityInvestorActivity ---");
  const sguResult = await requestService.getUniversityInvestorActivity({
    universityEmail: "252921043@sguk.ac.in",
    universityName: "Sanjay Ghodawat University (SGU), Kolhapur",
    universityOrg: "Sanjay Ghodawat University (SGU), Kolhapur",
  });

  console.log(`SGU Data Room Requests count: ${sguResult.dataRoomRequests.length}`);
  console.log(`SGU Discovered Startup IDs: ${sguResult.discoveredStartupIds.length}`);

  if (sguResult.dataRoomRequests.length === 0) {
    console.error("FAIL: SGU should have data room requests!");
    process.exit(1);
  }

  const sample = sguResult.dataRoomRequests[0];
  console.log("\nSample SGU Diligence Record (All 11 Fields):");
  console.log("  1. Investor:           ", sample.investorName, `(${sample.investorEmail})`);
  console.log("  2. Student Founder:    ", sample.founderName, `(${sample.founderEmail})`);
  console.log("  3. Startup:            ", sample.startupName, `(ID: ${sample.startupId})`);
  console.log("  4. University:         ", sample.universityName);
  console.log("  5. Submission Date:    ", sample.createdAt);
  console.log("  6. Founder Decision:   ", sample.decision || sample.status);
  console.log("  7. Decision Timestamp: ", sample.decisionAt || sample.updatedAt);
  console.log("  8. Rules Accepted:     ", sample.rulesAccepted);
  console.log("  9. Rules Version & At: ", sample.rulesVersion, "@", sample.rulesAcceptedAt);
  console.log(" 10. Access Status:      ", sample.status);
  console.log(" 11. Proof of Trust:     ", Boolean(sample.rulesProof));

  console.log("\n--- Testing COEP getUniversityInvestorActivity (Tenant Isolation) ---");
  const coepResult = await requestService.getUniversityInvestorActivity({
    universityEmail: "innovation@coep.ac.in",
    universityName: "College of Engineering, Pune",
    universityOrg: "College of Engineering, Pune",
  });

  console.log(`COEP Data Room Requests count: ${coepResult.dataRoomRequests.length}`);
  console.log(`COEP Discovered Startup IDs: ${coepResult.discoveredStartupIds.length}`);

  if (coepResult.dataRoomRequests.length !== 0) {
    console.error("FAIL: Cross-tenant data leak! COEP received records:", coepResult.dataRoomRequests);
    process.exit(1);
  }

  console.log("PASS: COEP received exactly 0 records. Complete isolation verified!");
}

testRuntime().catch((e) => {
  console.error("Error running test:", e);
  process.exit(1);
});
