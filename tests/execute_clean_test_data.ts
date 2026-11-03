import { supabase } from "../src/lib/supabase";

async function cleanTestData() {
  console.log("=== CLEANING NON-REAL DEMO & TEST DATA IN SUPABASE ===");

  // 1. Delete orphaned test data room docs
  const testDocIds = [
    "e0f39dae-9d74-4918-93bf-793b607f9ea2",
    "1a6debb7-e585-4abb-98cb-09a9db9eb259",
    "0d4fa6fc-ccff-44e5-b089-7c2197831673",
    "4742eae0-00f4-425a-90f4-0e0a606c1151"
  ];
  const { error: docErr } = await (supabase as any)
    .from("data_room_docs")
    .delete()
    .in("id", testDocIds);
  console.log("Deleted orphaned test docs:", docErr ? docErr.message : "SUCCESS");

  // 2. Delete test data room requests
  const testRequestIds = [
    "24509a31-90e4-4370-b7dc-175849a47b08",
    "15aee018-dac9-4b16-acca-37103cd6b8dc",
    "da7e9948-9ac5-4bf8-bd31-be53c3564837",
    "0b8270ae-483f-4d1c-ba99-0153e148f69e",
    "84a74c7d-862a-43a7-aa83-d3ded5ba0a3d",
    "25093e75-3e5c-4106-82be-83f0c52a6739",
    "9a6fa926-78ca-4f2f-8d8d-32b4361e6a67",
    "a67a2a46-15d6-46e0-9192-36b771020fa6",
    "fb352850-1123-4d7e-9e07-b847ce460206",
    "e101156b-e27c-4ee7-bf00-ba2b4d3a6c78",
    "a7ac36a3-6312-43ab-8bb1-8ff19fe65cb1",
    "2e2cc044-7cca-4484-859e-8983ef26c6b4",
    "a3a66ea5-59a2-446c-827b-118c7f18e2a8",
    "5b3656f7-424b-451c-b4b6-b58150c61199",
    "245e97c3-aa66-47dc-9921-df25b2a1e7c4",
    "a1ca7e74-95dd-4602-9fea-c491fa80c1dd",
    "d832a33d-c0b4-4600-99db-95ebfb4e6787"
  ];
  const { error: reqErr } = await (supabase as any)
    .from("data_room_requests")
    .delete()
    .in("id", testRequestIds);
  console.log("Deleted test data room requests:", reqErr ? reqErr.message : "SUCCESS");

  // 3. Delete test connection requests
  const { error: connErr } = await (supabase as any)
    .from("connection_requests")
    .delete()
    .in("startup_id", ["802680eb-1c73-4b8f-96f4-77701ce4a0a9", "4f573cab-be98-4a7c-9397-b7f29f420201"]);
  console.log("Deleted test connection requests:", connErr ? connErr.message : "SUCCESS");

  // 4. Delete test startup 'Safe Upsert Test'
  const { error: stErr } = await (supabase as any)
    .from("startups")
    .delete()
    .eq("id", "802680eb-1c73-4b8f-96f4-77701ce4a0a9");
  console.log("Deleted test startup:", stErr ? stErr.message : "SUCCESS");

  // 5. Delete synthetic test profiles
  const testProfileIds = [
    "06cc54c1-86fd-4be0-9d08-32303e695270",
    "648220bf-923c-44e3-908e-db4eba977a2e",
    "47c5f0f9-bfd0-483a-872c-65c0a98c675e"
  ];
  const { error: profErr } = await (supabase as any)
    .from("profiles")
    .delete()
    .in("id", testProfileIds);
  console.log("Deleted test profiles:", profErr ? profErr.message : "SUCCESS");

  console.log("=== SUPABASE DATABASE CLEANUP FINISHED ===");
}

cleanTestData();
