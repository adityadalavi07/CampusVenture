import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Test querying data_room_requests directly with our updated query clauses
async function testQuery(univName, univEmail) {
  const domain = univEmail.includes("@") && !univEmail.endsWith("@gmail.com") && !univEmail.endsWith("@yahoo.com")
    ? univEmail.split("@")[1].toLowerCase().trim()
    : "";

  let cleanIds = [];
  let campusStudentEmails = [];

  if (univName || domain) {
    const { data: dbProfiles } = await supabase.from("profiles").select("id, email, org").eq("role", "student");
    campusStudentEmails = (dbProfiles || [])
      .filter((p) => {
        if (domain && p.email?.toLowerCase().endsWith(domain)) return true;
        if (univName && (p.org?.toLowerCase().includes(univName.toLowerCase()) || univName.toLowerCase().includes(p.org?.toLowerCase() || ""))) return true;
        return false;
      })
      .map((p) => p.email.toLowerCase().trim());

    const { data: dbStartups } = await supabase.from("startups").select("id, name, university, founder_email");
    const matched = (dbStartups || []).filter((s) => {
      if (domain && s.founder_email?.toLowerCase().endsWith(domain)) return true;
      if (univName && (s.university?.toLowerCase().includes(univName.toLowerCase()) || univName.toLowerCase().includes(s.university?.toLowerCase() || ""))) return true;
      if (campusStudentEmails.includes(s.founder_email?.toLowerCase().trim())) return true;
      return false;
    });
    cleanIds = matched.map((s) => String(s.id));
  }

  const isGeneric = (!univName || univName === "University Innovation & Incubation Cell") && !domain && cleanIds.length === 0;

  let query = supabase.from("data_room_requests").select("*").order("created_at", { ascending: false });
  if (!isGeneric) {
    const clauses = [];
    if (cleanIds.length > 0) clauses.push(`startup_id.in.(${cleanIds.join(",")})`);
    if (campusStudentEmails.length > 0) clauses.push(`founder_email.in.(${campusStudentEmails.join(",")})`);
    if (domain) clauses.push(`founder_email.ilike.%${domain}`);
    if (univName) {
      const mainWord = univName.replace(/[(),.\-–—/]/g, " ").trim().split(" ").filter((w) => w.length > 3)[0];
      if (mainWord) clauses.push(`next_steps.ilike.%${mainWord}%`);
    }
    if (clauses.length > 0) query = query.or(clauses.join(","));
  } else {
    query = query.limit(50);
  }

  const { data: dr } = await query;
  console.log(`[${univName || "Unassigned"}] Total: ${dr?.length || 0}`);
  const signed = (dr || []).filter((d) => {
    let meta = {};
    try { meta = JSON.parse(d.next_steps); } catch {}
    return Boolean(meta.rulesAccepted || d.nda_signed);
  });
  console.log(`[${univName || "Unassigned"}] Signed Proofs of Trust: ${signed.length}`);
}

async function run() {
  await testQuery("Sanjay Ghodawat University (SGU), Kolhapur", "252921043@sguk.ac.in");
  await testQuery("Sanjay Ghodawat University", "");
  await testQuery("University Innovation & Incubation Cell", "");
}

run();
