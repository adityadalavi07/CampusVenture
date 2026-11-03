import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { isSameUniversity, normalizeUniversityName } from "../src/lib/university-matcher.ts";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: startups } = await supabase.from("startups").select("id, name, university, founder_email");
  console.log("Found startups:", startups?.length);

  const univEmail = "innovation@coep.ac.in";
  const univName = "College of Engineering, Pune";

  console.log("Checking COEP vs each startup:");
  for (const s of startups || []) {
    const isSame = isSameUniversity(
      { org: univName, email: univEmail },
      { university: s.university, email: s.founder_email }
    );
    console.log(`- Startup "${s.name}" (univ: "${s.university}", email: "${s.founder_email}") -> isSame: ${isSame}`);
    if (isSame) {
      console.log("   normA:", normalizeUniversityName(univName));
      console.log("   normB:", normalizeUniversityName(s.university));
    }
  }
}

check();
