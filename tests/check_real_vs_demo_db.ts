import { supabase } from "../src/lib/supabase";

async function inspectDb() {
  console.log("=== INSPECTING ALL ROWS IN SUPABASE ===");

  const tables = [
    "startups",
    "profiles",
    "data_room_requests",
    "data_room_docs",
    "connection_requests",
    "messages",
    "notifications",
    "programs",
    "watchlist",
    "cofounder_invitations",
    "data_room_audit_logs"
  ];

  for (const table of tables) {
    const { data, error } = await (supabase as any).from(table).select("*");
    if (error) {
      console.log(`Table ${table}: ERROR ${error.message}`);
    } else {
      console.log(`\nTable [${table}] (${data?.length || 0} rows):`);
      if (data && data.length > 0) {
        for (const row of data) {
          if (table === "startups") {
            console.log(`  - ID: ${row.id} | Name: "${row.name}" | Founder: "${row.founder_name}" (${row.founder_email}) | Uni: "${row.university}" | Status: ${row.status}`);
          } else if (table === "profiles") {
            console.log(`  - ID: ${row.id} | Name: "${row.name}" | Email: "${row.email}" | Role: ${row.role} | Org: "${row.org}"`);
          } else if (table === "data_room_requests") {
            console.log(`  - ID: ${row.id} | Startup: "${row.startup_name}" (${row.startup_id}) | Investor: "${row.investor_name}" (${row.investor_email}) | Founder: "${row.founder_email}" | Status: ${row.status}`);
          } else if (table === "data_room_docs") {
            console.log(`  - ID: ${row.id} | StartupId: ${row.startup_id} | Name: "${row.name}" | File: ${row.file_url || row.storage_path}`);
          } else if (table === "connection_requests") {
            console.log(`  - ID: ${row.id} | StartupId: ${row.startup_id} | InvestorId: ${row.investor_id} | Status: ${row.status}`);
          } else if (table === "messages") {
            console.log(`  - ID: ${row.id} | From: ${row.from_role} | Text: "${row.text?.slice(0, 50)}"`);
          } else if (table === "notifications") {
            console.log(`  - ID: ${row.id} | Title: "${row.title}" | Recipient: ${row.recipient_email || row.user_id}`);
          } else {
            console.log(`  - ${JSON.stringify(row).slice(0, 100)}`);
          }
        }
      }
    }
  }
}

inspectDb();
