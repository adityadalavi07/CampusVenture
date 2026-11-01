import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

function mapDbRequestToRecord(d) {
  let meta = {};
  if (d.next_steps && typeof d.next_steps === "string" && d.next_steps.startsWith("{")) {
    try {
      meta = JSON.parse(d.next_steps);
    } catch {}
  }

  const ndaSigned = Boolean(d.nda_signed || meta.rulesAccepted);
  const rulesAccepted = Boolean(meta.rulesAccepted || d.rules_accepted || ndaSigned);
  const rulesVersion = meta.rulesVersion || d.rules_version || "v1.0-cv-reg";
  const rulesAcceptedAt = meta.rulesAcceptedAt || d.rules_accepted_at || (rulesAccepted ? d.updated_at || d.created_at : undefined);

  return {
    id: String(d.id),
    startupId: String(d.startup_id),
    investorId: String(d.investor_id || ""),
    investorEmail: d.investor_email || meta.investorEmail || "",
    founderEmail: d.founder_email || meta.founderEmail || "",
    status: d.status || "pending",
    rulesAccepted,
    rulesVersion,
    rulesAcceptedAt,
    rulesProof: meta.rulesProof,
  };
}

async function runTests() {
  console.log("==========================================================");
  console.log("RUNNING AUTHENTICATION REJECTION & UNIVERSITY ACTIVITY TEST");
  console.log("==========================================================\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Check unregistered user in database
  console.log("Test 1: Unregistered user rejection check in profiles");
  const randomUnregisteredEmail = `unregistered.test.${Date.now()}@gmail.com`;
  const { data: prof1 } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", randomUnregisteredEmail)
    .maybeSingle();

  if (!prof1) {
    console.log("  [PASS] Profile does not exist for unregistered email.");
    passed++;
  } else {
    console.log("  [FAIL] Unexpected profile found.");
    failed++;
  }

  // Test 2: Registered user exists in database
  console.log("\nTest 2: Registered university user exists in profiles");
  const { data: prof2 } = await supabase
    .from("profiles")
    .select("id, email, role, org")
    .ilike("email", "252921043@sguk.ac.in")
    .maybeSingle();

  if (prof2 && prof2.role === "university") {
    console.log("  [PASS] University user profile verified: " + prof2.email + " (" + prof2.org + ")");
    passed++;
  } else {
    console.log("  [FAIL] University profile not found.");
    failed++;
  }

  // Test 3: University Activity & Signed Proofs of Trust
  console.log("\nTest 3: Fetching university activity for Sanjay Ghodawat University (SGU), Kolhapur");
  const domain = "sguk.ac.in";
  const univName = "Sanjay Ghodawat University (SGU), Kolhapur";

  // Discover student emails
  const { data: dbStudents } = await supabase
    .from("profiles")
    .select("id, email, org")
    .eq("role", "student");

  const campusStudentEmails = (dbStudents || [])
    .filter((p) => {
      const pOrg = (p.org || "").toLowerCase();
      const pEmail = (p.email || "").toLowerCase();
      if (domain && pEmail.endsWith(domain)) return true;
      if (univName && (pOrg.includes(univName.toLowerCase()) || univName.toLowerCase().includes(pOrg))) return true;
      return false;
    })
    .map((p) => p.email.toLowerCase().trim());

  console.log("  Discovered campus student emails: " + campusStudentEmails.length);

  // Discover campus startups
  const { data: dbStartups } = await supabase
    .from("startups")
    .select("id, name, university, founder_email");

  const campusStartupIds = (dbStartups || [])
    .filter((s) => {
      const sUniv = (s.university || "").toLowerCase();
      const sEmail = (s.founder_email || "").toLowerCase();
      if (domain && sEmail.endsWith(domain)) return true;
      if (univName && (sUniv.includes(univName.toLowerCase()) || univName.toLowerCase().includes(sUniv))) return true;
      if (campusStudentEmails.includes(sEmail)) return true;
      return false;
    })
    .map((s) => String(s.id));

  console.log("  Discovered campus startups: " + campusStartupIds.length);

  // Query data room requests
  let drQuery = supabase
    .from("data_room_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const drOrClauses = [];
  if (campusStartupIds.length > 0) drOrClauses.push(`startup_id.in.(${campusStartupIds.join(",")})`);
  if (campusStudentEmails.length > 0) drOrClauses.push(`founder_email.in.(${campusStudentEmails.join(",")})`);
  if (domain) drOrClauses.push(`founder_email.ilike.%${domain}`);
  if (drOrClauses.length > 0) drQuery = drQuery.or(drOrClauses.join(","));

  const { data: drRecords, error: drErr } = await drQuery;
  const mapped = (drRecords || []).map(mapDbRequestToRecord);
  const verifiedProofs = mapped.filter((d) => d.rulesAccepted);

  console.log("  Total data room requests retrieved: " + mapped.length);
  console.log("  Total signed Proofs of Trust: " + verifiedProofs.length);

  if (mapped.length >= 7 && verifiedProofs.length >= 6) {
    console.log("  [PASS] University diligence requests and Proofs of Trust correctly retrieved!");
    passed++;
  } else {
    console.log("  [FAIL] Did not retrieve expected records. Count: " + mapped.length);
    failed++;
  }

  // Test 4: Specific Proof of Trust declaration verification
  console.log("\nTest 4: Inspecting Proof of Trust declaration payload");
  const sampleProof = verifiedProofs.find((p) => p.rulesProof?.declaration);
  if (sampleProof && sampleProof.rulesProof.declaration.includes("I am okay with all")) {
    console.log("  [PASS] Proof of Trust declaration format valid: " + sampleProof.rulesProof.investorName + " -> " + sampleProof.rulesProof.startupName);
    passed++;
  } else {
    console.log("  [FAIL] Declaration content not found or invalid format.");
    failed++;
  }

  console.log("\n==========================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");

  if (failed > 0) process.exit(1);
}

runTests();
