import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function patchUserReq() {
  const reqId = "a7ac36a3-6312-43ab-8bb1-8ff19fe65cb1";
  const { data: row } = await supabase.from("data_room_requests").select("*").eq("id", reqId).single();
  console.log("Current row:", row);

  let meta = {};
  try {
    meta = JSON.parse(row.next_steps || "{}");
  } catch {}

  const updatedMeta = {
    ...meta,
    founderName: "Aditya Dnyaneshwar Dalavi",
    founderEmail: "252921389@sguk.ac.in",
    startupId: "s-mvktiqwp",
    startupName: "nevorox",
    universityName: "Sanjay Ghodawat University (SGU), Kolhapur",
    decision: "accepted",
    decisionAt: row.updated_at || new Date().toISOString(),
    decisionTimestamp: row.updated_at || new Date().toISOString(),
    rulesAccepted: true,
    rulesVersion: "v1.0-cv-reg",
    rulesAcceptedAt: row.updated_at || new Date().toISOString(),
    permittedDocIds: meta.permittedDocIds || [
      "284b34d8-d2d4-41a5-b321-a75ee866552a",
      "6a052191-49dd-462a-84fd-ea3dfa42c849"
    ],
  };

  const { error } = await supabase
    .from("data_room_requests")
    .update({
      next_steps: JSON.stringify(updatedMeta),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reqId);

  console.log("Update error:", error);
  console.log("Successfully patched user request in DB!");
}

patchUserReq();
