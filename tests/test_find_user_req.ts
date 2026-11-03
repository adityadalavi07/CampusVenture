import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Polyfill window / localStorage for node test
global.window = {
  dispatchEvent: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
} as any;
global.localStorage = (global.window as any).localStorage;

async function testFetch() {
  const { requestService } = await import("../src/services/requestService.ts");

  console.log("Fetching for SGU University user (252921043@sguk.ac.in)...");
  const res = await requestService.getUniversityInvestorActivity({
    universityEmail: "252921043@sguk.ac.in",
    universityName: "Sanjay Ghodawat University (SGU), Kolhapur",
    universityOrg: "Sanjay Ghodawat University (SGU), Kolhapur",
  });

  console.log("Total Data Room Requests returned:", res.dataRoomRequests.length);
  const targetReq = res.dataRoomRequests.find((r) => r.id === "a7ac36a3-6312-43ab-8bb1-8ff19fe65cb1");
  console.log("Did it find user's test request 'a7ac36a3-6312-43ab-8bb1-8ff19fe65cb1'?", Boolean(targetReq));
  if (targetReq) {
    console.log("Target Request Details:");
    console.log("  Startup:", targetReq.startupName, `(${targetReq.startupId})`);
    console.log("  Investor:", targetReq.investorName, `(${targetReq.investorEmail})`);
    console.log("  Founder:", targetReq.founderName, `(${targetReq.founderEmail})`);
    console.log("  Status:", targetReq.status);
    console.log("  Decision:", targetReq.decision);
    console.log("  University:", targetReq.universityName);
    console.log("  Permitted docs:", targetReq.permittedDocIds);
  }
}

testFetch();
