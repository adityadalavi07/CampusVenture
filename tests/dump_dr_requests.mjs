import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function dump() {
  const { data: dr, error } = await supabase.from("data_room_requests").select("*");
  if (error) {
    console.error("Error fetching data_room_requests:", error);
    return;
  }
  console.log("Total DR requests in Supabase:", dr.length);
  dr.forEach((r, idx) => {
    console.log(`\n--- Request #${idx + 1} ---`);
    console.log("ID:", r.id);
    console.log("Startup:", r.startup_name, "| ID:", r.startup_id);
    console.log("Investor:", r.investor_name, "| Email:", r.investor_email, "| Org:", r.investor_org);
    console.log("Founder Email:", r.founder_email);
    console.log("Status:", r.status, "| NDA Signed:", r.nda_signed, "| Signed Name:", r.nda_signed_name);
    console.log("Created At:", r.created_at, "| Updated At:", r.updated_at);
    let meta = null;
    try {
      meta = JSON.parse(r.next_steps);
    } catch {
      meta = r.next_steps;
    }
    console.log("Meta next_steps:", JSON.stringify(meta, null, 2));
  });
}

dump();
