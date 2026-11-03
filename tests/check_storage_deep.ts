import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testStorage() {
  console.log("=== CHECKING STORAGE DETAILS ===");
  // Check the two data_room_docs in Supabase
  const { data: docs } = await supabase.from("data_room_docs").select("*");
  console.log("Existing data_room_docs in DB:", docs);

  for (const doc of docs || []) {
    console.log(`\nDoc ${doc.id}:`);
    console.log(`  name: ${doc.name}`);
    console.log(`  file_url: ${doc.file_url}`);
    
    // Test if file_url is reachable via fetch
    if (doc.file_url) {
      try {
        const res = await fetch(doc.file_url);
        console.log(`  Direct GET fetch status: ${res.status} ${res.statusText}`);
      } catch (err: any) {
        console.log(`  Direct GET fetch error: ${err.message}`);
      }
    }
  }

  // Test creating a bucket or uploading a file anonymously
  console.log("\nTesting anonymous file upload to 'dataroom-documents'...");
  const dummyData = Buffer.from("confidential test pitch deck");
  const { data: upData, error: upErr } = await supabase.storage
    .from("dataroom-documents")
    .upload("test-anon.txt", dummyData, { upsert: true });

  if (upErr) {
    console.log(`Anon upload to 'dataroom-documents': BLOCKED - ${upErr.message}`);
  } else {
    console.log(`Anon upload to 'dataroom-documents': ALLOWED - ${JSON.stringify(upData)}`);
  }

  // Test createSignedUrl
  const { data: signData, error: signErr } = await supabase.storage
    .from("dataroom-documents")
    .createSignedUrl("test-anon.txt", 60);

  if (signErr) {
    console.log(`Anon createSignedUrl: ${signErr.message}`);
  } else {
    console.log(`Anon createSignedUrl: SUCCESS - ${signData?.signedUrl}`);
  }
}

testStorage();
