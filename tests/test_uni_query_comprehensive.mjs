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
  const rulesAccepted = Boolean(meta.rulesAccepted || d.rules_accepted || d.nda_signed);
  return {
    id: d.id,
    startupId: d.startup_id,
    startupName: d.startup_name,
    founderEmail: d.founder_email,
    investorName: d.investor_name,
    investorEmail: d.investor_email,
    status: d.status,
    rulesAccepted,
    rulesProof: meta.rulesProof,
  };
}

async function getUniversityInvestorActivity(arg) {
  let cleanIds = Array.isArray(arg) ? arg.filter(Boolean) : (arg.campusStartupIds || []).filter(Boolean);
  const univName = (!Array.isArray(arg) ? (arg.universityName || arg.universityOrg || "") : "").trim();
  const univEmail = (!Array.isArray(arg) ? (arg.universityEmail || "") : "").trim();
  const domain = univEmail.includes("@") && !univEmail.endsWith("@gmail.com") && !univEmail.endsWith("@yahoo.com")
    ? univEmail.split("@")[1].toLowerCase().trim()
    : "";

  let campusStudentEmails = [];
  if (univName || domain) {
    try {
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
            if (univName && (pOrg.includes(univName.toLowerCase()) || univName.toLowerCase().includes(pOrg))) return true;
            return false;
          })
          .map((p) => p.email.toLowerCase().trim())
          .filter(Boolean);
      }
    } catch (err) {
      console.warn("Profiles err:", err);
    }
  }

  if (univName || domain) {
    try {
      const { data: dbStartups } = await supabase
        .from("startups")
        .select("id, name, university, founder_email");
      if (Array.isArray(dbStartups)) {
        const matched = dbStartups.filter((s) => {
          const sUniv = (s.university || "").toLowerCase();
          const sEmail = (s.founder_email || "").toLowerCase();
          if (domain && sEmail.endsWith(domain)) return true;
          if (univName && (sUniv.includes(univName.toLowerCase()) || univName.toLowerCase().includes(sUniv))) return true;
          if (campusStudentEmails.includes(sEmail)) return true;
          return false;
        });
        const dynamicIds = matched.map((s) => String(s.id));
        cleanIds = Array.from(new Set([...cleanIds, ...dynamicIds]));
      }
    } catch (err) {
      console.warn("Startups err:", err);
    }
  }

  if (cleanIds.length === 0 && !domain && campusStudentEmails.length === 0) {
    return { dataRoomRequests: [], discoveredStartupIds: [] };
  }

  let drQuery = supabase.from("data_room_requests").select("*").order("created_at", { ascending: false });
  const drOrClauses = [];
  if (cleanIds.length > 0) drOrClauses.push(`startup_id.in.(${cleanIds.join(",")})`);
  if (campusStudentEmails.length > 0) drOrClauses.push(`founder_email.in.(${campusStudentEmails.join(",")})`);
  if (domain) drOrClauses.push(`founder_email.ilike.%${domain}`);
  if (drOrClauses.length > 0) drQuery = drQuery.or(drOrClauses.join(","));

  const { data: dbDr } = await drQuery;
  const mapped = (dbDr || []).map(mapDbRequestToRecord);
  return { dataRoomRequests: mapped, discoveredStartupIds: cleanIds };
}

async function run() {
  console.log("Scenario 1: SGU full profile");
  const s1 = await getUniversityInvestorActivity({
    universityName: "Sanjay Ghodawat University (SGU), Kolhapur",
    universityEmail: "252921043@sguk.ac.in",
    universityOrg: "Sanjay Ghodawat University (SGU), Kolhapur",
  });
  console.log("Scenario 1 count:", s1.dataRoomRequests.length, "Proofs:", s1.dataRoomRequests.filter((d) => d.rulesAccepted).length);

  console.log("\nScenario 2: SGU short name without email");
  const s2 = await getUniversityInvestorActivity({
    universityName: "Sanjay Ghodawat University",
    universityEmail: "",
    universityOrg: "SGU",
  });
  console.log("Scenario 2 count:", s2.dataRoomRequests.length);

  console.log("\nScenario 3: Generic Incubation Cell (default / demo fallback)");
  const s3 = await getUniversityInvestorActivity({
    universityName: "University Innovation & Incubation Cell",
    universityEmail: "",
    universityOrg: "University Innovation & Incubation Cell",
  });
  console.log("Scenario 3 count:", s3.dataRoomRequests.length);

  console.log("\nScenario 4: COEP Technological University (seed demo)");
  const s4 = await getUniversityInvestorActivity({
    universityName: "COEP Technological University",
    universityEmail: "innovation@coep.ac.in",
    universityOrg: "COEP Technological University",
  });
  console.log("Scenario 4 count:", s4.dataRoomRequests.length);
}

run();
