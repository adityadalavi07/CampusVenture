import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testWhatUniSees(uniUserEmail, uniOrg) {
  console.log(`\n=== Testing for University User: ${uniUserEmail} (${uniOrg}) ===`);

  const domain = uniUserEmail && uniUserEmail.includes("@") && !uniUserEmail.endsWith("@gmail.com")
    ? uniUserEmail.split("@")[1].toLowerCase().trim()
    : "";

  console.log("Domain:", domain);

  // 1. student profiles
  let campusStudentEmails = [];
  const { data: dbProfiles } = await supabase
    .from("profiles")
    .select("id, email, org")
    .eq("role", "student");

  if (Array.isArray(dbProfiles)) {
    campusStudentEmails = dbProfiles
      .filter((p) => {
        const pOrg = (p.org || "").toLowerCase();
        const pEmail = (p.email || "").toLowerCase();
        if (domain && pEmail.endsWith(domain)) return true;
        if (uniOrg && (pOrg.includes(uniOrg.toLowerCase()) || uniOrg.toLowerCase().includes(pOrg))) return true;
        return false;
      })
      .map((p) => p.email.toLowerCase().trim())
      .filter(Boolean);
  }
  console.log("Campus student emails discovered:", campusStudentEmails);

  // 2. startups
  let cleanIds = [];
  const { data: dbStartups } = await supabase
    .from("startups")
    .select("id, name, university, founder_email");

  if (Array.isArray(dbStartups)) {
    const matched = dbStartups.filter((s) => {
      const sUniv = (s.university || "").toLowerCase();
      const sEmail = (s.founder_email || "").toLowerCase();
      if (domain && sEmail.endsWith(domain)) return true;
      if (uniOrg && (sUniv.includes(uniOrg.toLowerCase()) || uniOrg.toLowerCase().includes(sUniv))) return true;
      if (campusStudentEmails.includes(sEmail)) return true;
      return false;
    });
    cleanIds = matched.map((s) => String(s.id));
  }
  console.log("Discovered startup IDs:", cleanIds);

  let drQuery = supabase
    .from("data_room_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const drOrClauses = [];
  if (cleanIds.length > 0) drOrClauses.push(`startup_id.in.(${cleanIds.join(",")})`);
  if (campusStudentEmails.length > 0) drOrClauses.push(`founder_email.in.(${campusStudentEmails.join(",")})`);
  if (domain) drOrClauses.push(`founder_email.ilike.%${domain}`);
  if (drOrClauses.length > 0) drQuery = drQuery.or(drOrClauses.join(","));

  const { data: drData, error: drErr } = await drQuery;
  console.log("DR requests count:", drData?.length, "Error:", drErr);
  if (drData && drData.length > 0) {
    console.log("Found requests:");
    drData.slice(0, 3).forEach((r) => {
      console.log(` - ID: ${r.id}, Startup: ${r.startup_name}, Founder: ${r.founder_email}, Investor: ${r.investor_name} (${r.investor_email})`);
    });
  }
}

async function run() {
  // Case A: User is logged in as SGU (252921043@sguk.ac.in)
  await testWhatUniSees("252921043@sguk.ac.in", "Sanjay Ghodawat University (SGU), Kolhapur");

  // Case B: User is logged in as default seed COEP (innovation@coep.ac.in)
  await testWhatUniSees("innovation@coep.ac.in", "COEP Technological University");

  // Case C: User is not logged in / user.org is default "University Innovation & Incubation Cell"
  await testWhatUniSees("", "University Innovation & Incubation Cell");
}

run();
