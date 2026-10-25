import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load environment variables from .env
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
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function isUniversityEmail(email) {
  const norm = email.trim().toLowerCase();
  const domain = norm.split("@")[1] || "";
  const freeEmailDomains = [
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "hotmail.com",
    "outlook.com", "live.com", "icloud.com", "proton.me", "protonmail.com"
  ];
  if (freeEmailDomains.includes(domain)) return false;
  return (
    domain.endsWith(".edu") ||
    domain.endsWith(".ac.in") ||
    domain.endsWith(".edu.in") ||
    domain.includes(".edu.") ||
    domain.endsWith(".ac.uk") ||
    domain === "sguk.ac.in"
  );
}

async function runAuthTests() {
  console.log("===============================================================================");
  console.log("CAMPUSVENTURE AUTHENTICATION & MULTI-ROLE RECOVERY VERIFICATION SUITE");
  console.log("===============================================================================");

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

  // Test 1: Check dalavi015@gmail.com role in Supabase
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", "dalavi015@gmail.com")
    .maybeSingle();

  assert(!error && profile, "dalavi015@gmail.com profile exists in Supabase");
  assert(profile?.role === "investor", `dalavi015@gmail.com is set to 'investor' role (got: '${profile?.role}')`);

  // Test 2: Verify personal email rules
  assert(!isUniversityEmail("dalavi015@gmail.com"), "dalavi015@gmail.com correctly identified as personal email");
  assert(!isUniversityEmail("test@gmail.com"), "Personal gmail correctly identified as non-university");
  assert(isUniversityEmail("student@sguk.ac.in"), "Official SGU email recognized as institutional");
  assert(isUniversityEmail("student@coep.ac.in"), "Official COEP email recognized as institutional");

  // Test 3: Check other investor accounts
  const { data: investors, error: invError } = await supabase
    .from("profiles")
    .select("email, role")
    .in("email", [
      "dalavi015@gmail.com",
      "krishpatil69work@gmail.com",
      "poojakrishnamrta7@gmail.com",
      "aayushnimalkar1@gmail.com"
    ]);

  assert(!invError && investors?.length === 4, "All 4 recovered investor profiles exist");
  const allInvestors = investors?.every((inv) => inv.role === "investor");
  assert(allInvestors, "All 4 recovered personal accounts are assigned 'investor' role");

  console.log("===============================================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================================");

  if (failed > 0) process.exit(1);
}

runAuthTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
