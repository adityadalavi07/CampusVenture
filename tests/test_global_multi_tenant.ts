import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import {
  isSameUniversity,
  isInstitutionalDomain,
  areMatchingDomains,
  getEmailDomain,
} from "../src/lib/university-matcher.ts";

// Polyfill window / localStorage for requestService node execution
global.window = {
  dispatchEvent: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
} as any;
global.localStorage = (global.window as any).localStorage;

async function runGlobalMultiTenantVerification() {
  console.log("================================================================================");
  console.log("CAMPUSVENTURE — GLOBAL MULTI-TENANT & DILIGENCE SYNCHRONIZATION VERIFICATION");
  console.log("================================================================================\n");

  const { requestService } = await import("../src/services/requestService.ts");

  console.log("[TEST 1] Global University Domain Isolation Unit Tests:");
  const unitTests = [
    {
      label: "COEP vs SGU (different institutional domains)",
      a: { email: "innovation@coep.ac.in", org: "College of Engineering, Pune" },
      b: { email: "student@sguk.ac.in", org: "Sanjay Ghodawat University" },
      expected: false,
    },
    {
      label: "MIT vs Stanford (different institutional domains)",
      a: { email: "dean@mit.edu", org: "MIT" },
      b: { email: "student@stanford.edu", org: "Stanford University" },
      expected: false,
    },
    {
      label: "Harvard vs Harvard Subdomain (same institutional domain)",
      a: { email: "dean@harvard.edu", org: "Harvard University" },
      b: { email: "student@fas.harvard.edu", org: "Harvard University" },
      expected: true,
    },
    {
      label: "Oxford vs Cambridge (different institutional domains)",
      a: { email: "incubator@ox.ac.uk", org: "University of Oxford" },
      b: { email: "student@cam.ac.uk", org: "University of Cambridge" },
      expected: false,
    },
    {
      label: "IIT Bombay vs IIT Delhi (different institutional domains)",
      a: { email: "tbi@iitb.ac.in", org: "IIT Bombay" },
      b: { email: "student@iitd.ac.in", org: "IIT Delhi" },
      expected: false,
    },
    {
      label: "SGU staff vs SGU student (same institutional domain)",
      a: { email: "252921043@sguk.ac.in", org: "Sanjay Ghodawat University (SGU), Kolhapur" },
      b: { email: "252921389@sguk.ac.in", org: "Sanjay Ghodawat University (SGU), Kolhapur" },
      expected: true,
    },
    {
      label: "Stanford staff vs Stanford student with Gmail (name match fallback)",
      a: { email: "dean@stanford.edu", org: "Stanford University" },
      b: { email: "john.doe@gmail.com", org: "Stanford University" },
      expected: true,
    },
  ];

  let unitFailed = false;
  for (const test of unitTests) {
    const actual = isSameUniversity(test.a, test.b);
    if (actual !== test.expected) {
      console.error(`  FAIL: ${test.label} -> expected ${test.expected}, got ${actual}`);
      unitFailed = true;
    } else {
      console.log(`  PASS: ${test.label}`);
    }
  }

  if (unitFailed) {
    console.error("Unit test failure! Aborting.");
    process.exit(1);
  }

  console.log("\n[TEST 2] Runtime getUniversityInvestorActivity for Sanjay Ghodawat University (SGU)...");
  const sguResult = await requestService.getUniversityInvestorActivity({
    universityEmail: "252921043@sguk.ac.in",
    universityName: "Sanjay Ghodawat University (SGU), Kolhapur",
    universityOrg: "Sanjay Ghodawat University (SGU), Kolhapur",
  });

  console.log(`  SGU Discovered Campus Startup IDs: ${sguResult.discoveredStartupIds.length}`);
  console.log(`  SGU Retrieved Data Room Requests:   ${sguResult.dataRoomRequests.length}`);

  if (sguResult.dataRoomRequests.length === 0) {
    console.error("  FAIL: SGU should have retrieved its campus data room records!");
    process.exit(1);
  }
  console.log("  PASS: SGU successfully retrieved its live diligence records.");

  const sample = sguResult.dataRoomRequests[0];
  console.log("\n  Sample SGU Diligence Record (All 11 Mandatory University Dashboard Fields):");
  console.log("    1. Investor:           ", sample.investorName, `(${sample.investorEmail})`);
  console.log("    2. Student Founder:    ", sample.founderName, `(${sample.founderEmail})`);
  console.log("    3. Startup:            ", sample.startupName, `(ID: ${sample.startupId})`);
  console.log("    4. Associated Univ:    ", sample.universityName);
  console.log("    5. Request Submitted:  ", sample.createdAt);
  console.log("    6. Founder Decision:   ", sample.decision || sample.status);
  console.log("    7. Decision Timestamp: ", sample.decisionAt || sample.updatedAt);
  console.log("    8. Investor Rules:     ", sample.rulesAccepted ? "Accepted" : "Pending");
  console.log("    9. Rules Version & At: ", sample.rulesVersion, "@", sample.rulesAcceptedAt);
  console.log("   10. Current Status:     ", sample.status);
  console.log("   11. Verifiable Proof:   ", Boolean(sample.rulesProof));

  console.log("\n[TEST 3] Global Multi-Tenant Cross-University Leaks Verification (Testing 5 Global Universities):");
  const externalUniversities = [
    { email: "innovation@coep.ac.in", name: "College of Engineering, Pune" },
    { email: "incubator@ox.ac.uk", name: "University of Oxford" },
    { email: "dean@mit.edu", name: "Massachusetts Institute of Technology" },
    { email: "dean@stanford.edu", name: "Stanford University" },
    { email: "dean@iitb.ac.in", name: "Indian Institute of Technology Bombay" },
  ];

  for (const ext of externalUniversities) {
    const extResult = await requestService.getUniversityInvestorActivity({
      universityEmail: ext.email,
      universityName: ext.name,
      universityOrg: ext.name,
    });

    if (extResult.dataRoomRequests.length !== 0) {
      console.error(`  FAIL: Cross-tenant data leak! ${ext.name} (${ext.email}) received records:`, extResult.dataRoomRequests);
      process.exit(1);
    }
    console.log(`  PASS: ${ext.name} received exactly 0 records. (100% strict isolation)`);
  }

  console.log("\n================================================================================");
  console.log("ALL GLOBAL MULTI-TENANCY & DILIGENCE SYNCHRONIZATION TESTS PASSED WITH 100% SUCCESS");
  console.log("================================================================================\n");
}

runGlobalMultiTenantVerification().catch((err) => {
  console.error("Unexpected error during verification:", err);
  process.exit(1);
});
