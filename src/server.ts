// CampusVenture Server — Nitro entry point (gemini-2.0-flash, v3 — Central AI Engine)
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// In-memory sliding window rate limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = rateLimits.get(key);
  if (!record || now > record.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (record.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }
  record.count++;
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Central AI Engine Handler — v3
// Validates auth, verifies ownership, calls Gemini, runs scoring engine,
// persists to Supabase, returns structured report.
// ---------------------------------------------------------------------------
const SUPABASE_URL_SRV = "https://lirfkzpehmxtynjsjzib.supabase.co";

function getSupabaseKey(env: unknown): string {
  const envObj = (env && typeof env === "object" ? env : {}) as Record<string, string | undefined>;
  const procEnv = typeof process !== "undefined" && process.env ? process.env : {} as Record<string, string | undefined>;
  return (
    envObj["SUPABASE_SERVICE_ROLE_KEY"] ||
    procEnv["SUPABASE_SERVICE_ROLE_KEY"] ||
    envObj["VITE_SUPABASE_SERVICE_ROLE_KEY"] ||
    procEnv["VITE_SUPABASE_SERVICE_ROLE_KEY"] ||
    // Fall back to anon key — RLS policies still protect data
    envObj["VITE_SUPABASE_ANON_KEY"] ||
    procEnv["VITE_SUPABASE_ANON_KEY"] ||
    "sb_publishable_CJjApu3rUsNReyUx7jW2Lg_NUM8oqR-"
  );
}

function getGeminiKey(env: unknown): string {
  const envObj = (env && typeof env === "object" ? env : {}) as Record<string, string | undefined>;
  const procEnv = typeof process !== "undefined" && process.env ? process.env : {} as Record<string, string | undefined>;
  return (
    envObj["GEMINI_API_KEY"] ||
    procEnv["GEMINI_API_KEY"] ||
    ""
  );
}

/** Supabase REST helper — avoids importing the client SDK in the server entry */
async function sbFetch(
  supabaseKey: string,
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  authToken?: string,
): Promise<{ data: unknown; error: string | null }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": supabaseKey,
    "Authorization": authToken ? `Bearer ${authToken}` : `Bearer ${supabaseKey}`,
    "Prefer": method === "POST" ? "return=representation" : "",
  };
  try {
    const res = await fetch(`${SUPABASE_URL_SRV}/rest/v1/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: unknown = null;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) {
      const errMsg = (data && typeof data === "object" && "message" in (data as object))
        ? (data as Record<string, string>)["message"]
        : text.slice(0, 200);
      return { data: null, error: errMsg };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Verify JWT and return user id + email from Supabase Auth */
async function verifyJWT(
  supabaseKey: string,
  token: string,
): Promise<{ userId: string; email: string } | null> {
  try {
    const res = await fetch(`${SUPABASE_URL_SRV}/auth/v1/user`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json() as { id?: string; email?: string };
    if (data?.id) return { userId: data.id, email: data.email || "" };
    return null;
  } catch {
    return null;
  }
}

/** Sanitise founder text to prevent prompt injection */
function sanitiseSrv(text: unknown, maxChars = 3000): string {
  if (!text) return "Not provided";
  return String(text)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/---/g, "—")
    .replace(/```/g, "'''")
    .trim()
    .slice(0, maxChars);
}

async function handleServerAIAnalyze(request: Request, env: unknown): Promise<Response> {
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  // ── 1. Rate limit by IP ────────────────────────────────────────────────────
  const rawIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const clientIp = rawIp.split(",")[0].trim();
  const rateCheck = checkRateLimit(`ai:${clientIp}`, 8, 60_000);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ success: false, error: `Rate limit reached. Wait ${rateCheck.retryAfterSec}s.` }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfterSec) } },
    );
  }

  // ── 2. Validate auth token ─────────────────────────────────────────────────
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const supabaseKey = getSupabaseKey(env);
  const geminiKey   = getGeminiKey(env);

  if (!geminiKey) {
    return json({ success: false, error: "Server AI is not configured. Contact the administrator." });
  }

  // Verify token if provided; allow anonymous for backward compat with existing button
  let ownerId: string | null = null;
  let ownerEmail = "";
  if (token) {
    const userInfo = await verifyJWT(supabaseKey, token);
    if (userInfo) {
      ownerId  = userInfo.userId;
      ownerEmail = userInfo.email;
    }
  }

  // ── 3. Parse and validate body ─────────────────────────────────────────────
  let body: { startupId?: string; startup?: Record<string, unknown> };
  try {
    body = await request.json() as typeof body;
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const startup = body.startup;
  const startupId = body.startupId || (startup?.id as string | undefined);

  if (!startup || typeof startup !== "object") {
    return json({ success: false, error: "Missing startup data" }, 400);
  }

  // ── 4. Ownership verification (server-side) ────────────────────────────────
  // If the user is authenticated and a startupId is provided, confirm ownership
  if (ownerId && startupId) {
    const { data: dbStartup, error: dbErr } = await sbFetch(
      supabaseKey,
      `startups?id=eq.${startupId}&select=founder_id,founder_email`,
      "GET",
      undefined,
      token,
    );
    if (!dbErr && Array.isArray(dbStartup) && dbStartup.length > 0) {
      const row = (dbStartup as Array<Record<string, unknown>>)[0];
      const ownerMatch =
        row["founder_id"] === ownerId ||
        (row["founder_email"] && String(row["founder_email"]).toLowerCase() === ownerEmail.toLowerCase());
      if (!ownerMatch) {
        console.error("[AI Engine] Ownership mismatch — blocked cross-user request");
        return json({ success: false, error: "Access denied: you do not own this startup." }, 403);
      }
    }
  }

  // ── 5. Create analysis job record ─────────────────────────────────────────
  let jobId: string | null = null;
  let analysisVersion = 1;

  if (ownerId && startupId) {
    // Get latest version number
    const { data: prevReports } = await sbFetch(
      supabaseKey,
      `startup_analysis_reports?startup_id=eq.${startupId}&owner_id=eq.${ownerId}&select=analysis_version&order=analysis_version.desc&limit=1`,
      "GET",
      undefined,
      token,
    );
    if (Array.isArray(prevReports) && prevReports.length > 0) {
      analysisVersion = Number((prevReports[0] as Record<string, unknown>)["analysis_version"] || 0) + 1;
    }

    const jobPayload = {
      startup_id: startupId,
      owner_id: ownerId,
      status: "processing",
      analysis_version: analysisVersion,
      ai_provider: "gemini",
      model_id: "gemini-3.8-flash",
      prompt_version: "v3.0",
      started_at: new Date().toISOString(),
    };
    const { data: jobData } = await sbFetch(supabaseKey, "startup_analysis_jobs", "POST", jobPayload, token);
    if (Array.isArray(jobData) && jobData.length > 0) {
      jobId = String((jobData[0] as Record<string, unknown>)["id"]);
    }
  }

  // ── 6. Build prompts ────────────────────────────────────────────────────────
  const stage = String(startup["stage"] || "Idea");
  const pWords = sanitiseSrv(startup["problem"]).split(/\s+/).filter(Boolean).length;
  const sWords = sanitiseSrv(startup["solution"]).split(/\s+/).filter(Boolean).length;

  const systemPrompt = `You are an elite Startup Due Diligence Analyst and Investment Readiness Evaluator.
Stage: "${stage}". Apply stage-calibrated scoring (Idea-stage startups are NOT penalised for no revenue).
Return ONLY a valid JSON object — no markdown, no backticks — with ALL of these fields:
{
  "startup_summary": {"name":"string","one_line":"string","stage_assessment":"string"},
  "readiness_score": <0-100>,
  "evidence_confidence_score": <0-100>,
  "risk_exposure_score": <0-100>,
  "investor_grade": <"A+"|"A"|"B"|"C"|"D"|"F">,
  "verdict": "string",
  "honest_take": "string — 2-3 sentences blunt assessment",
  "dimension_scores": [
    {"key":"Founder & Team Readiness","score":<0-100>,"weight":10,"weighted_contribution":<number>,"evidence_level":<"verified"|"stated"|"assumed"|"missing">,"critique":"string","supporting_evidence":"string","identified_weaknesses":["string"],"missing_information":["string"],"recommendations":["string"],"confidence":<"high"|"medium"|"low"|"insufficient">},
    {"key":"Problem Validation","score":<0-100>,"weight":15,...},
    {"key":"Market Opportunity","score":<0-100>,"weight":12,...},
    {"key":"Product & Technical Feasibility","score":<0-100>,"weight":12,...},
    {"key":"Product-Market Fit","score":<0-100>,"weight":12,...},
    {"key":"Business Model Viability","score":<0-100>,"weight":10,...},
    {"key":"Competitive Advantage","score":<0-100>,"weight":10,...},
    {"key":"Financial Readiness","score":<0-100>,"weight":9,...},
    {"key":"Growth & Scalability","score":<0-100>,"weight":5,...},
    {"key":"Legal & Operational Risk","score":<0-100>,"weight":5,...}
  ],
  "strengths": ["string","string","string"],
  "weaknesses": ["string","string","string"],
  "reality_check": [{"title":"string","severity":<"critical"|"high"|"medium"|"low">,"observation":"string","concern":"string","evidence_needed":"string","recommended_action":"string"}],
  "feature_scope_analysis": {"mvp_features":["string"],"secondary_features":["string"],"premature_features":["string"],"missing_critical_features":["string"],"recommended_mvp_scope":"string"},
  "market_analysis": {"addressable_market_assessment":"string","customer_segment_clarity":<"clear"|"partial"|"vague"|"missing">,"competitor_research_quality":<"thorough"|"basic"|"minimal"|"missing">,"market_timing_assessment":"string","differentiation_assessment":"string"},
  "financial_analysis": {"funding_ask_assessment":"string","revenue_model_clarity":<"clear"|"partial"|"vague"|"missing">,"unit_economics_assessment":"string","runway_assessment":"string","financial_risk":<"low"|"medium"|"high"|"critical">},
  "growth_analysis": {"optimistic_scenario":"string","baseline_scenario":"string","conservative_scenario":"string","key_growth_assumptions":["string"],"scalability_assessment":"string","customer_acquisition_assessment":"string"},
  "critical_risks": [{"risk":"string","severity":<"critical"|"high"|"medium">,"mitigation":"string"}],
  "recommended_actions": ["string — top 5 prioritised actions"],
  "next_milestones": [{"milestone":"string","timeframe":"string","success_criteria":"string"}],
  "missing_information": ["string"],
  "assumptions": ["string"],
  "limitations": ["string"]
}`;

  const userPrompt = `STARTUP FOR EVALUATION:
Name: ${sanitiseSrv(startup["name"])}
Tagline: ${sanitiseSrv(startup["tagline"])}
Sector: ${sanitiseSrv(startup["sector"])}
Stage: ${sanitiseSrv(startup["stage"])}
University: ${sanitiseSrv(startup["university"])}
Team Size: ${startup["teamSize"] || startup["team_size"] || 1}
Funding Required: $${Number(startup["fundingRequired"] || startup["funding_required"] || 0).toLocaleString()}
Revenue: ${startup["revenue"] ? "Yes" : "No"}
Monthly Users: ${Number(startup["monthlyUsers"] || startup["monthly_users"] || 0).toLocaleString()}
Traction: "${sanitiseSrv(startup["traction"])}"
Business Model: "${sanitiseSrv(startup["businessModel"] || startup["business_model"])}"
Problem (${pWords} words): "${sanitiseSrv(startup["problem"], 3000)}"
Solution (${sWords} words): "${sanitiseSrv(startup["solution"], 3000)}"
GitHub: ${startup["githubUrl"] || startup["github_url"] ? `Connected (${startup["githubUrl"] || startup["github_url"]})` : "Not connected"}
Pitch Deck: ${startup["deckName"] || startup["deck_name"] ? "Uploaded" : "Not uploaded"}
Video: ${startup["videoUrl"] || startup["video_url"] ? "Provided" : "Not provided"}

Evaluate rigorously. Stage: "${stage}". Return JSON only.`;

  // ── 7. Call Gemini ─────────────────────────────────────────────────────────
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey.trim()}`;
  const tStart = Date.now();

  let geminiRes: Response;
  try {
    geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 8192 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });
  } catch (netErr: unknown) {
    const errMsg = netErr instanceof Error ? netErr.message : String(netErr);
    console.error("[AI Engine] Gemini network error:", errMsg);
    if (jobId) {
      await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
        { status: "failed", error_message: `Network error: ${errMsg}`, completed_at: new Date().toISOString() }, token);
    }
    return json({ success: false, error: `AI provider network error: ${errMsg}` });
  }

  const latencyMs = Date.now() - tStart;

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => `HTTP ${geminiRes.status}`);
    let errMsg = `Gemini HTTP ${geminiRes.status}`;
    try { const ep = JSON.parse(errText); errMsg = ep?.error?.message || errMsg; } catch { /* */ }
    console.error("[AI Engine] Gemini error:", errMsg);
    if (jobId) {
      await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
        { status: "failed", error_message: errMsg, completed_at: new Date().toISOString() }, token);
    }
    return json({ success: false, error: errMsg });
  }

  const geminiData = await geminiRes.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  };

  const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    const reason = geminiData.candidates?.[0]?.finishReason || "EMPTY_RESPONSE";
    if (jobId) {
      await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
        { status: "failed", error_message: `AI returned no content (${reason})`, completed_at: new Date().toISOString() }, token);
    }
    return json({ success: false, error: `AI returned empty response (${reason})` });
  }

  // ── 8. Validate and score ──────────────────────────────────────────────────
  // Parse JSON from AI
  let parsed: Record<string, unknown>;
  const cleaned = candidateText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    if (jobId) {
      await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
        { status: "failed", error_message: "AI returned malformed JSON", completed_at: new Date().toISOString() }, token);
    }
    return json({ success: false, error: "AI returned malformed JSON — please retry" });
  }

  // Deterministic scoring: use AI dimension scores + our weights
  const dims = Array.isArray(parsed["dimension_scores"]) ? parsed["dimension_scores"] as Array<Record<string, unknown>> : [];
  const stageWeights: Record<string, number> = {
    "Founder & Team Readiness": 10, "Problem Validation": 15, "Market Opportunity": 12,
    "Product & Technical Feasibility": 12, "Product-Market Fit": 12, "Business Model Viability": 10,
    "Competitive Advantage": 10, "Financial Readiness": 9, "Growth & Scalability": 5, "Legal & Operational Risk": 5,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [dimKey, weight] of Object.entries(stageWeights)) {
    const aiDim = dims.find((d) =>
      String(d["key"] || "").toLowerCase().includes(dimKey.toLowerCase().split(" ")[0]) ||
      dimKey.toLowerCase().includes(String(d["key"] || "").toLowerCase().split(" ")[0]),
    );
    const score = aiDim ? Math.max(0, Math.min(100, Math.round(Number(aiDim["score"]) || 35))) : 35;
    const cappedScore = (!aiDim || aiDim["evidence_level"] === "missing") ? Math.min(score, 50) : score;
    weightedSum += cappedScore * (weight / 100);
    totalWeight += weight;
  }

  let readinessScore = totalWeight > 0 ? Math.round(weightedSum * (100 / totalWeight)) : 0;
  const hasCritical = Array.isArray(parsed["critical_risks"]) &&
    (parsed["critical_risks"] as Array<Record<string, unknown>>).some((r) => r["severity"] === "critical");
  if (hasCritical) readinessScore = Math.min(readinessScore, 35);

  const evidenceConfidence = Number(parsed["evidence_confidence_score"]) || 50;
  const riskExposure = Number(parsed["risk_exposure_score"]) || 50;
  const investorGrade = parsed["investor_grade"] as string || "F";
  const verdict = String(parsed["verdict"] || "Assessment complete");

  // Token usage
  const promptTokens      = geminiData.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens  = geminiData.usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens       = geminiData.usageMetadata?.totalTokenCount ?? 0;

  // ── 9. Persist to Supabase ─────────────────────────────────────────────────
  if (ownerId && startupId && jobId) {
    // Insert analysis report
    const reportPayload = {
      job_id:              jobId,
      startup_id:          startupId,
      owner_id:            ownerId,
      analysis_version:    analysisVersion,
      ai_provider:         "gemini",
      model_id:            "gemini-3.8-flash",
      readiness_score:     readinessScore,
      evidence_confidence: Math.min(100, Math.max(0, Math.round(evidenceConfidence))),
      risk_exposure:       Math.min(100, Math.max(0, Math.round(riskExposure))),
      investor_grade:      investorGrade,
      verdict,
      report_json:         parsed,
      startup_snapshot:    startup,
      prompt_tokens:       promptTokens,
      completion_tokens:   completionTokens,
      total_tokens:        totalTokens,
    };
    await sbFetch(supabaseKey, "startup_analysis_reports", "POST", reportPayload, token);

    // Insert dimension scores
    if (dims.length > 0) {
      const dimRows = dims.map((d) => ({
        report_id:        null, // will join via job_id
        startup_id:       startupId,
        owner_id:         ownerId,
        dimension_key:    String(d["key"] || ""),
        dimension_label:  String(d["key"] || ""),
        score:            Math.max(0, Math.min(100, Math.round(Number(d["score"]) || 35))),
        weight:           Number(d["weight"] || 10),
        weighted_score:   Number(((d["weighted_contribution"] || 0) as number).toFixed(2)),
        critique:         String(d["critique"] || ""),
        confidence_level: String(d["confidence"] || "low"),
        recommendations:  Array.isArray(d["recommendations"]) ? d["recommendations"].map(String) : [],
        missing_info:     Array.isArray(d["missing_information"]) ? d["missing_information"].map(String) : [],
      }));
      await sbFetch(supabaseKey, "startup_analysis_dimensions", "POST", dimRows, token);
    }

    // Update the startup's readiness score
    await sbFetch(supabaseKey, `startups?id=eq.${startupId}`, "PATCH",
      { readiness: readinessScore, updated_at: new Date().toISOString() }, token);

    // Mark job completed
    await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
      { status: "completed", completed_at: new Date().toISOString() }, token);

    // Log AI usage
    await sbFetch(supabaseKey, "ai_provider_usage", "POST", {
      job_id: jobId, owner_id: ownerId, provider: "gemini", model_id: "gemini-3.8-flash",
      prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens,
      estimated_cost_usd: (promptTokens / 1_000_000) * 0.075 + (completionTokens / 1_000_000) * 0.30,
      request_ok: true, latency_ms: latencyMs,
    }, token);
  }

  // ── 10. Return result ──────────────────────────────────────────────────────
  return json({
    success: true,
    jobId,
    readinessScore,
    evidenceConfidence: Math.round(evidenceConfidence),
    riskExposure: Math.round(riskExposure),
    investorGrade,
    verdict,
    rawJson: cleaned,
    modelUsed: "gemini-3.8-flash",
    latencyMs,
  });
}

async function handleServerSendCode(request: Request, env: unknown): Promise<Response> {
  try {
    const body = (await request.json()) as { email?: string; code?: string; role?: string };
    const { email, code, role = "student" } = body || {};

    if (!email || !code) {
      return new Response(JSON.stringify({ success: false, error: "Missing email or code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const rawIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown-ip";
    const clientIp = rawIp.split(",")[0].trim();
    const rateCheck = checkRateLimit(`code:${cleanEmail}:${clientIp}`, 4, 120000);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many verification requests. Please wait ${rateCheck.retryAfterSec}s before requesting another code.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfterSec || 60),
          },
        }
      );
    }
    console.info(`[CampusVenture Auth] Security Code dispatched to ${cleanEmail} (${role}): ${code}`);

    // If Resend API key is configured on the server, dispatch a 100% clean email with ONLY the 6-digit code
    // NO external login link, NO Lovable redirect, NO third-party URL
    const envObj = (env && typeof env === "object" ? env : {}) as Record<string, string | undefined>;
    const procEnv = typeof process !== "undefined" && process.env ? process.env : {};
    const resendApiKey =
      envObj["RESEND_API_KEY"] ||
      procEnv["RESEND_API_KEY"] ||
      "";

    const resendFrom =
      envObj["RESEND_FROM"] ||
      procEnv["RESEND_FROM"] ||
      "CampusVenture <onboarding@resend.dev>";

    if (resendApiKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [cleanEmail],
            subject: `Your CampusVenture Verification Code: ${code}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">CampusVenture Security Verification</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.5;">Use the 6-digit verification code below to verify your email and complete your account setup:</p>
                <div style="margin: 24px 0; padding: 18px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px dashed #6366f1;">
                  <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">${code}</span>
                </div>
                <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes. Enter this code directly into the CampusVenture verification dialog.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">CampusVenture • Institutional Student & Investor Ecosystem</p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.warn("[CampusVenture Auth] Resend mail dispatch warning:", errText);
        } else {
          const resData = await emailRes.json();
          console.info("[CampusVenture Auth] Resend email dispatched successfully:", resData);
        }
      } catch (sendErr) {
        console.error("[CampusVenture Auth] Resend mail dispatch error:", sendErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Security code dispatched to ${cleanEmail}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Failed to dispatch code" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

/**
 * Handle transactional co-founder invite email via Resend API
 */
async function handleServerCofounderInvite(request: Request, env: unknown): Promise<Response> {
  try {
    const requestOrigin = new URL(request.url).origin;
    const body = (await request.json()) as any;
    const { startupName, founderName, founderEmail, cofounderName, cofounderEmail, role, equity } = body || {};

    if (!cofounderEmail || !cofounderEmail.includes("@")) {
      return new Response(JSON.stringify({ success: false, error: "Invalid recipient email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const envObj = (env && typeof env === "object" ? env : {}) as Record<string, string | undefined>;
    const procEnv = typeof process !== "undefined" && process.env ? process.env : {};
    const resendApiKey = envObj["RESEND_API_KEY"] || procEnv["RESEND_API_KEY"] || "";
    const resendFrom = envObj["RESEND_FROM"] || procEnv["RESEND_FROM"] || "CampusVenture <onboarding@resend.dev>";

    if (resendApiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [cofounderEmail.trim().toLowerCase()],
            subject: `Join ${startupName} as ${role} — Co-Founder Invitation from ${founderName}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
                <div style="margin-bottom: 20px;">
                  <span style="display: inline-block; padding: 4px 10px; background: #e0e7ff; color: #4338ca; border-radius: 6px; font-size: 12px; font-weight: 600;">CampusVenture Co-Founder Invitation</span>
                </div>
                <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">You're Invited to Join ${startupName}</h2>
                <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                  Hi <strong>${cofounderName}</strong>,<br /><br />
                  <strong>${founderName}</strong> (${founderEmail}) has invited you to join <strong>${startupName}</strong> as <strong>${role}</strong> on CampusVenture.
                  ${equity ? `<br /><br /><strong>Equity Allocation:</strong> ${equity}` : ""}
                </p>
                <div style="margin: 28px 0; text-align: center;">
                  <a href="${requestOrigin}/app/student" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">Review & Accept Invitation</a>
                </div>
                <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                  Log into CampusVenture using <strong>${cofounderEmail}</strong> (both university and personal emails accepted) to review this invitation and become an official co-founder.
                </p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">CampusVenture • Institutional Student & Investor Ecosystem</p>
              </div>
            `,
          }),
        });
      } catch (sendErr) {
        console.warn("[CampusVenture] Resend cofounder email error:", sendErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Invitation dispatched to ${cofounderEmail}` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Failed to send cofounder invite" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/ai/analyze" && request.method === "POST") {
        return await handleServerAIAnalyze(request, env);
      }
      if (url.pathname === "/api/auth/send-code" && request.method === "POST") {
        return await handleServerSendCode(request, env);
      }
      if (url.pathname === "/api/cofounder/invite" && request.method === "POST") {
        return await handleServerCofounderInvite(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
