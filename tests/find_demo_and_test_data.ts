import { supabase } from "../src/lib/supabase";

async function findDemoAndTestData() {
  console.log("=== CHECKING DEMO & TEST DATA IN SUPABASE ===");

  // 1. Check startups
  const { data: startups } = await (supabase as any).from("startups").select("id, name, founder_email");
  const testStartups = (startups || []).filter(
    (s: any) =>
      s.name.toLowerCase().includes("test") ||
      s.name.toLowerCase().includes("aerodrone") ||
      s.name.toLowerCase().includes("untitled")
  );
  console.log("Test startups to remove:", testStartups);

  // 2. Check profiles
  const { data: profiles } = await (supabase as any).from("profiles").select("id, name, email");
  const testProfiles = (profiles || []).filter(
    (p: any) =>
      p.email.includes("mw0") ||
      p.email.includes("evaluator_") ||
      p.name.includes("Student A") ||
      p.name.includes("Student B") ||
      p.name.includes("Investor C")
  );
  console.log("Test profiles to remove:", testProfiles);

  // 3. Check data_room_docs
  const realStartupIds = (startups || [])
    .filter((s: any) => !testStartups.some((ts: any) => ts.id === s.id))
    .map((s: any) => s.id);

  const { data: docs } = await (supabase as any).from("data_room_docs").select("id, startup_id, name");
  const orphanedDocs = (docs || []).filter((d: any) => !realStartupIds.includes(d.startup_id));
  console.log("Orphaned test docs to remove:", orphanedDocs);

  // 4. Check data_room_requests
  const { data: requests } = await (supabase as any)
    .from("data_room_requests")
    .select("id, startup_name, startup_id, investor_email");
  const testRequests = (requests || []).filter(
    (r: any) =>
      r.startup_name?.toLowerCase().includes("test") ||
      r.startup_name?.toLowerCase().includes("aerodrone") ||
      r.startup_name?.toLowerCase().includes("untitled") ||
      r.investor_email?.includes("rival@capital.com") ||
      r.investor_email?.includes("evaluator_") ||
      r.investor_email?.includes("mw0") ||
      !realStartupIds.includes(r.startup_id)
  );
  console.log(`Test data room requests to remove: ${testRequests.length} rows`);
  for (const r of testRequests) {
    console.log(`  - [DR Req] ${r.id}: "${r.startup_name}" | Investor: ${r.investor_email}`);
  }

  // 5. Check connection_requests
  const { data: conns } = await (supabase as any).from("connection_requests").select("id, startup_id");
  const testConns = (conns || []).filter((c: any) => !realStartupIds.includes(c.startup_id));
  console.log(`Test connection requests to remove: ${testConns.length} rows`);
}

findDemoAndTestData();
