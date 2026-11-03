async function testVercelRoutes() {
  console.log("================================================================================");
  console.log("   LIVE VERCEL DEPLOYMENT HTTP & ROUTE HEALTH PROBE");
  console.log("================================================================================");

  const baseUrl = "https://campus-venture-git-main-np-ed49.vercel.app";

  const routes = [
    "/",
    "/app/student",
    "/app/student/startup",
    "/app/student/dataroom",
    "/app/student/discover",
    "/app/investor",
    "/app/investor/dataroom",
    "/app/investor/saved",
    "/app/university",
    "/app/university/review",
    "/app/university/students",
    "/app/university/programs"
  ];

  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
      const text = await res.text();
      const hasError = text.includes("Application error") || text.includes("Internal Server Error") || text.includes("500 Server Error");
      const titleMatch = text.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? titleMatch[1] : "No title tag found";

      console.log(`Route [${route}]:`);
      console.log(`  HTTP Status: ${res.status} ${res.statusText}`);
      console.log(`  Title: "${title}"`);
      console.log(`  Payload size: ${text.length} bytes`);
      console.log(`  SSR/Crash check: ${hasError ? "CRASH DETECTED" : "HEALTHY"}`);
    } catch (err: any) {
      console.error(`Route [${route}]: NETWORK ERROR - ${err.message}`);
    }
  }

  // Check Supabase endpoint connectivity from production URL perspective
  console.log("\n--- Checking Supabase Auth endpoint from live app perspective ---");
  const sbUrl = "https://lirfkzpehmxtynjsjzib.supabase.co/auth/v1/settings";
  const anonKey = "sb_publishable_CJjApu3rUsNReyUx7jW2Lg_NUM8oqR-";
  try {
    const sbRes = await fetch(sbUrl, { headers: { apikey: anonKey } });
    console.log(`Supabase Auth Settings Ping: HTTP ${sbRes.status} ${sbRes.statusText}`);
    const sbData = await sbRes.json();
    console.log(`External providers enabled:`, Object.keys(sbData?.external || {}));
  } catch (err: any) {
    console.log(`Supabase ping error: ${err.message}`);
  }
}

testVercelRoutes();
