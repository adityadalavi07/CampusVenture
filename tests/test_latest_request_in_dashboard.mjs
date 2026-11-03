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
    universityName: meta.universityName,
  };
}

async function testWhatUniSees() {
  // Query exactly as University Dashboard would
  const { data: allRequests } = await supabase
    .from("data_room_requests")
    .select("*")
    .order("created_at", { ascending: false });

  console.log("Total DR requests in Supabase:", allRequests?.length);

  const mapped = (allRequests || []).map(mapDbRequestToRecord);
  const latest = mapped[0];
  console.log("Latest request:", latest);

  // Check if latest is in SGU
  console.log("Is SGU? Startup:", latest.startupName, "Univ in next_steps:", latest.universityName);
}

testWhatUniSees();
