import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function backfill() {
  const { data: requests, error } = await supabase.from("data_room_requests").select("*");
  if (error || !Array.isArray(requests)) {
    console.error("Error reading requests:", error);
    return;
  }

  const { data: startups } = await supabase.from("startups").select("id, name, university, founder_email");
  const { data: profiles } = await supabase.from("profiles").select("id, name, email, org");

  const stMap = new Map((startups || []).map((s) => [s.id, s]));
  const profMap = new Map((profiles || []).map((p) => [p.email?.toLowerCase(), p]));

  let updatedCount = 0;

  for (const r of requests) {
    let meta = {};
    if (r.next_steps && typeof r.next_steps === "string" && r.next_steps.startsWith("{")) {
      try {
        meta = JSON.parse(r.next_steps);
      } catch {}
    }

    const st = stMap.get(r.startup_id);
    const prof = profMap.get(r.founder_email?.toLowerCase());

    const decision = meta.decision || (r.status === "granted" ? "accepted" : r.status === "rejected" ? "rejected" : r.status === "revoked" ? "revoked" : r.status === "pending" ? "pending" : undefined);
    const decisionAt = meta.decisionAt || (r.status !== "pending" ? r.updated_at || r.created_at : undefined);
    const universityName = meta.universityName || st?.university || prof?.org || (r.founder_email?.endsWith("sguk.ac.in") ? "Sanjay Ghodawat University (SGU), Kolhapur" : undefined);
    const founderName = meta.founderName || prof?.name || meta.rulesProof?.founderName || (r.founder_email?.endsWith("sguk.ac.in") ? "Aditya Dnyaneshwar Dalavi" : "Student Founder");
    const startupName = r.startup_name || st?.name || "Campus Venture";

    const nextMeta = {
      ...meta,
      decision,
      decisionAt,
      decisionTimestamp: decisionAt,
      founderName,
      founderEmail: r.founder_email || st?.founder_email || prof?.email,
      startupId: r.startup_id,
      startupName,
      universityName,
    };

    const updatePayload = {
      next_steps: JSON.stringify(nextMeta),
      startup_name: startupName,
    };
    if (r.founder_email || st?.founder_email) {
      updatePayload.founder_email = (r.founder_email || st?.founder_email).toLowerCase().trim();
    }

    const { error: updErr } = await supabase
      .from("data_room_requests")
      .update(updatePayload)
      .eq("id", r.id);

    if (updErr) {
      console.warn("Failed to backfill request", r.id, updErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`Backfilled ${updatedCount} existing data room requests successfully.`);
}

backfill();
