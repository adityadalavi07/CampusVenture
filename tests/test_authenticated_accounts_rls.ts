import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testAuthUsers() {
  console.log("=== TESTING REAL SUPABASE AUTHENTICATION & MULTI-USER ISOLATION ===");

  const suffix = Date.now().toString(36);
  const password = "TestPassword123!";

  const studentAEmail = `student_a_${suffix}@sguk.ac.in`;
  const studentBEmail = `student_b_${suffix}@coep.ac.in`;
  const investorCEmail = `investor_c_${suffix}@gmail.com`;

  console.log("\n[1] Registering Student A (SGU)...");
  const { data: userA, error: errA } = await supabase.auth.signUp({
    email: studentAEmail,
    password,
    options: {
      data: {
        name: "Student A (SGU)",
        role: "student",
        org: "Sanjay Ghodawat University (SGU), Kolhapur",
      },
    },
  });
  console.log(`Student A signUp: ${errA ? `FAILED (${errA.message})` : `SUCCESS (ID: ${userA.user?.id})`}`);

  console.log("\n[2] Registering Student B (COEP)...");
  const { data: userB, error: errB } = await supabase.auth.signUp({
    email: studentBEmail,
    password,
    options: {
      data: {
        name: "Student B (COEP)",
        role: "student",
        org: "COEP Technological University, Pune",
      },
    },
  });
  console.log(`Student B signUp: ${errB ? `FAILED (${errB.message})` : `SUCCESS (ID: ${userB.user?.id})`}`);

  console.log("\n[3] Registering Investor C...");
  const { data: userC, error: errC } = await supabase.auth.signUp({
    email: investorCEmail,
    password,
    options: {
      data: {
        name: "Investor C",
        role: "investor",
        org: "Venture Partners",
      },
    },
  });
  console.log(`Investor C signUp: ${errC ? `FAILED (${errC.message})` : `SUCCESS (ID: ${userC.user?.id})`}`);

  // Now create an authenticated client for Student A
  if (userA.session?.access_token) {
    console.log("\n[4] Student A Authenticated Client Operations:");
    const clientA = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userA.session.access_token}` } },
    });

    // Student A tries to update Student B's profile
    if (userB.user?.id) {
      const { error: hackProfileErr } = await clientA
        .from("profiles")
        .update({ name: "Hacked by Student A" })
        .eq("id", userB.user.id);
      console.log(`Student A modifying Student B profile: ${hackProfileErr ? `BLOCKED (${hackProfileErr.message})` : "FAILED CHECK - Modified or no error"}`);
    }

    // Student A creates a startup
    const startupIdA = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    const { error: stErrA } = await clientA.from("startups").insert({
      id: startupIdA,
      name: "SGU Robotics",
      tagline: "Autonomous farm rovers",
      sector: "AI",
      stage: "Prototype",
      location: "Kolhapur",
      university: "Sanjay Ghodawat University (SGU), Kolhapur",
      founder_id: userA.user?.id,
      founder_email: studentAEmail,
      status: "pending",
      verified: false,
    });
    console.log(`Student A insert startup: ${stErrA ? `FAILED (${stErrA.message})` : `SUCCESS (${startupIdA})`}`);

    // Student B attempts to modify Student A's startup
    if (userB.session?.access_token) {
      console.log("\n[5] Student B (COEP) attempts cross-account tampering on Student A's startup:");
      const clientB = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${userB.session.access_token}` } },
      });

      const { data: bUpdate, error: bUpdateErr } = await clientB
        .from("startups")
        .update({ name: "HACKED BY COEP", verified: true, status: "approved" })
        .eq("id", startupIdA)
        .select();

      console.log(`Student B tampering Student A startup: error=${bUpdateErr?.message || "none"}, rows_affected=${bUpdate?.length || 0}`);
      if (bUpdate && bUpdate.length > 0) {
        console.log("CRITICAL SECURITY VULNERABILITY: Student B was able to modify Student A's startup directly in Supabase!");
      } else {
        console.log("PASS: Student B could not tamper with Student A's startup.");
      }
    }

    // Clean up
    await clientA.from("startups").delete().eq("id", startupIdA);
  } else {
    console.log("\nNotice: Email confirmation might be enabled in Supabase Auth, session was not returned immediately in signUp.");
  }
}

testAuthUsers();
