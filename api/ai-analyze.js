/**
 * Vercel Serverless Function — /api/ai-analyze
 * Node.js 20.x runtime. GEMINI_API_KEY read from process.env (Vercel env vars).
 * Central AI engine: authenticates user, calls Gemini 2.0 Flash, runs deterministic
 * scoring, persists to Supabase, returns structured report.
 */

// In-memory rate limiter
const rateLimits = new Map();
function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const record = rateLimits.get(key);
  if (!record || now > record.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (record.count >= limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((record.resetAt - now) / 1000)) };
  }
  record.count++;
  return { allowed: true };
}

const SUPABASE_URL = "https://lirfkzpehmxtynjsjzib.supabase.co";

function getSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "sb_publishable_CJjApu3rUsNReyUx7jW2Lg_NUM8oqR-"
  );
}

async function sbFetch(supabaseKey, path, method = "GET", body, authToken) {
  const headers = {
    "Content-Type": "application/json",
    apikey: supabaseKey,
    Authorization: authToken ? `Bearer ${authToken}` : `Bearer ${supabaseKey}`,
    Prefer: method === "POST" ? "return=representation" : "",
  };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) {
      const errMsg = data?.message || text.slice(0, 200);
      return { data: null, error: errMsg };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err?.message || String(err) };
  }
}

async function verifyJWT(supabaseKey, token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.id) return { userId: data.id, email: data.email || "" };
    return null;
  } catch { return null; }
}

function sanitise(text, maxChars = 3000) {
  if (!text) return "Not provided";
  return String(text)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/---/g, "—")
    .replace(/```/g, "'''")
    .trim()
    .slice(0, maxChars);
}

// Deterministic stage weights for 10-dimension scoring
const STAGE_WEIGHTS = {
  "Founder & Team Readiness": 10,
  "Problem Validation": 15,
  "Market Opportunity": 12,
  "Product & Technical Feasibility": 12,
  "Product-Market Fit": 12,
  "Business Model Viability": 10,
  "Competitive Advantage": 10,
  "Financial Readiness": 9,
  "Growth & Scalability": 5,
  "Legal & Operational Risk": 5,
};

export const config = { maxDuration: 90 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  // ── 1. Rate limit ──────────────────────────────────────────────────────────
  const rawIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const rateCheck = checkRateLimit(`ai:${rawIp}`, 8, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({ success: false, error: `Rate limit reached. Wait ${rateCheck.retryAfterSec}s.` });
  }

  // ── 2. Check API key ───────────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (!geminiKey) {
    console.error("[AI Engine] GEMINI_API_KEY not configured in Vercel environment.");
    return res.status(200).json({ success: false, error: "Server AI is not configured. Contact the administrator." });
  }

  // ── 3. Auth token (optional — allows anonymous analysis for backward compat) ─
  const supabaseKey = getSupabaseKey();
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  let ownerId = null;
  let ownerEmail = "";
  if (token) {
    const userInfo = await verifyJWT(supabaseKey, token);
    if (userInfo) { ownerId = userInfo.userId; ownerEmail = userInfo.email; }
  }

  // ── 4. Parse body ──────────────────────────────────────────────────────────
  let body = req.body;
  if (!body || typeof body !== "object") {
    try { body = JSON.parse(req.body); } catch {
      return res.status(400).json({ success: false, error: "Invalid JSON body" });
    }
  }

  const startup = body?.startup;
  const startupId = body?.startupId || startup?.id;
  if (!startup) return res.status(400).json({ success: false, error: "Missing startup data" });

  // ── 5. Ownership check ─────────────────────────────────────────────────────
  if (ownerId && startupId) {
    const { data: dbStartup, error: dbErr } = await sbFetch(
      supabaseKey,
      `startups?id=eq.${startupId}&select=founder_id,founder_email`,
      "GET", undefined, token,
    );
    if (!dbErr && Array.isArray(dbStartup) && dbStartup.length > 0) {
      const row = dbStartup[0];
      const ownerMatch =
        row["founder_id"] === ownerId ||
        (row["founder_email"] && String(row["founder_email"]).toLowerCase() === ownerEmail.toLowerCase());
      if (!ownerMatch) {
        console.error("[AI Engine] Cross-user request blocked");
        return res.status(403).json({ success: false, error: "Access denied: you do not own this startup." });
      }
    }
  }

  // ── 6. Create job record ───────────────────────────────────────────────────
  let jobId = null;
  let analysisVersion = 1;
  if (ownerId && startupId) {
    const { data: prevReports } = await sbFetch(
      supabaseKey,
      `startup_analysis_reports?startup_id=eq.${startupId}&owner_id=eq.${ownerId}&select=analysis_version&order=analysis_version.desc&limit=1`,
      "GET", undefined, token,
    );
    if (Array.isArray(prevReports) && prevReports.length > 0) {
      analysisVersion = Number(prevReports[0]["analysis_version"] || 0) + 1;
    }
    const { data: jobData } = await sbFetch(supabaseKey, "startup_analysis_jobs", "POST", {
      startup_id: startupId, owner_id: ownerId, status: "processing",
      analysis_version: analysisVersion, ai_provider: "gemini", model_id: "gemini-2.0-flash",
      prompt_version: "v4.0", started_at: new Date().toISOString(),
    }, token);
    if (Array.isArray(jobData) && jobData.length > 0) jobId = String(jobData[0]["id"]);
  }

  // ── 7. Build prompts ───────────────────────────────────────────────────────
  const stage = String(startup.stage || "Idea");
  const pWords = sanitise(startup.problem).split(/\s+/).filter(Boolean).length;
  const sWords = sanitise(startup.solution).split(/\s+/).filter(Boolean).length;

  const systemPrompt = `You are an elite Startup Due Diligence Analyst and Investment Readiness Evaluator.
Stage: "${stage}". Apply stage-calibrated scoring (Idea-stage startups are NOT penalised for no revenue).
Return ONLY a valid JSON object — no markdown, no backticks — with ALL of these exact fields:
{
  "startup_summary": {"name":"string","one_line":"string","stage_assessment":"string"},
  "readiness_score": <0-100>,
  "evidence_confidence_score": <0-100>,
  "risk_exposure_score": <0-100>,
  "investor_grade": <"A+"|"A"|"B"|"C"|"D"|"F">,
  "verdict": "string",
  "honest_take": "2-3 sentences blunt assessment",
  "dimension_scores": [
    {"key":"Founder & Team Readiness","score":<0-100>,"weight":10,"evidence_level":<"verified"|"stated"|"assumed"|"missing">,"critique":"string","identified_weaknesses":["string"],"missing_information":["string"],"recommendations":["string"],"confidence":<"high"|"medium"|"low"|"insufficient">},
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
  "critical_risks": [{"risk":"string","severity":<"critical"|"high"|"medium">,"mitigation":"string"}],
  "recommended_actions": ["string","string","string","string","string"],
  "next_milestones": [{"milestone":"string","timeframe":"string","success_criteria":"string"}],
  "missing_information": ["string"],
  "assumptions": ["string"]
}`;

  const userPrompt = `STARTUP FOR EVALUATION:
Name: ${sanitise(startup.name)}
Tagline: ${sanitise(startup.tagline)}
Sector: ${sanitise(startup.sector)}
Stage: ${sanitise(startup.stage)}
University: ${sanitise(startup.university)}
Team Size: ${startup.teamSize || startup.team_size || 1}
Funding Required: $${Number(startup.fundingRequired || startup.funding_required || 0).toLocaleString()}
Revenue: ${startup.revenue ? "Yes" : "No"}
Monthly Users: ${Number(startup.monthlyUsers || startup.monthly_users || 0).toLocaleString()}
Traction: "${sanitise(startup.traction)}"
Business Model: "${sanitise(startup.businessModel || startup.business_model)}"
Problem (${pWords} words): "${sanitise(startup.problem, 3000)}"
Solution (${sWords} words): "${sanitise(startup.solution, 3000)}"
GitHub: ${startup.githubUrl || startup.github_url ? "Connected" : "Not connected"}
Pitch Deck: ${startup.deckName || startup.deck_name ? "Uploaded" : "Not uploaded"}

Evaluate rigorously. Stage: "${stage}". Return JSON only.`;

  // ── 8. Call Gemini 2.0 Flash ───────────────────────────────────────────────
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey.trim()}`;
  const tStart = Date.now();

  let geminiRes;
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
  } catch (netErr) {
    const errMsg = netErr?.message || String(netErr);
    console.error("[AI Engine] Gemini network error:", errMsg);
    if (jobId) await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
      { status: "failed", error_message: `Network: ${errMsg}`, completed_at: new Date().toISOString() }, token);
    return res.status(200).json({ success: false, error: `AI provider network error: ${errMsg}` });
  }

  const latencyMs = Date.now() - tStart;

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => `HTTP ${geminiRes.status}`);
    let errMsg = `Gemini HTTP ${geminiRes.status}`;
    try { const ep = JSON.parse(errText); errMsg = ep?.error?.message || errMsg; } catch { /* */ }
    console.error("[AI Engine] Gemini error:", errMsg);
    if (jobId) await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
      { status: "failed", error_message: errMsg, completed_at: new Date().toISOString() }, token);
    return res.status(200).json({ success: false, error: errMsg });
  }

  const geminiData = await geminiRes.json();
  const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    const reason = geminiData?.candidates?.[0]?.finishReason || "EMPTY_RESPONSE";
    if (jobId) await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
      { status: "failed", error_message: `Empty AI response (${reason})`, completed_at: new Date().toISOString() }, token);
    return res.status(200).json({ success: false, error: `AI returned empty response (${reason})` });
  }

  // ── 9. Parse + deterministic score ────────────────────────────────────────
  let parsed;
  const cleaned = candidateText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    if (jobId) await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
      { status: "failed", error_message: "Malformed JSON from AI", completed_at: new Date().toISOString() }, token);
    return res.status(200).json({ success: false, error: "AI returned malformed JSON — please retry" });
  }

  const dims = Array.isArray(parsed["dimension_scores"]) ? parsed["dimension_scores"] : [];
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [dimKey, weight] of Object.entries(STAGE_WEIGHTS)) {
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
    parsed["critical_risks"].some((r) => r["severity"] === "critical");
  if (hasCritical) readinessScore = Math.min(readinessScore, 35);

  const evidenceConfidence = Number(parsed["evidence_confidence_score"]) || 50;
  const riskExposure = Number(parsed["risk_exposure_score"]) || 50;
  const investorGrade = parsed["investor_grade"] || "F";
  const verdict = String(parsed["verdict"] || "Assessment complete");

  const promptTokens = geminiData?.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = geminiData?.usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens = geminiData?.usageMetadata?.totalTokenCount ?? 0;

  // ── 10. Persist to Supabase ────────────────────────────────────────────────
  if (ownerId && startupId && jobId) {
    await sbFetch(supabaseKey, "startup_analysis_reports", "POST", {
      job_id: jobId, startup_id: startupId, owner_id: ownerId,
      analysis_version: analysisVersion, ai_provider: "gemini", model_id: "gemini-2.0-flash",
      readiness_score: readinessScore,
      evidence_confidence: Math.min(100, Math.max(0, Math.round(evidenceConfidence))),
      risk_exposure: Math.min(100, Math.max(0, Math.round(riskExposure))),
      investor_grade: investorGrade, verdict, report_json: parsed, startup_snapshot: startup,
      prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens,
    }, token);

    if (dims.length > 0) {
      await sbFetch(supabaseKey, "startup_analysis_dimensions", "POST", dims.map((d) => ({
        startup_id: startupId, owner_id: ownerId,
        dimension_key: String(d["key"] || ""),
        dimension_label: String(d["key"] || ""),
        score: Math.max(0, Math.min(100, Math.round(Number(d["score"]) || 35))),
        weight: Number(d["weight"] || 10),
        critique: String(d["critique"] || ""),
        confidence_level: String(d["confidence"] || "low"),
        recommendations: Array.isArray(d["recommendations"]) ? d["recommendations"].map(String) : [],
        missing_info: Array.isArray(d["missing_information"]) ? d["missing_information"].map(String) : [],
      })), token);
    }

    await sbFetch(supabaseKey, `startups?id=eq.${startupId}`, "PATCH",
      { readiness: readinessScore }, token);
    await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH",
      { status: "completed", completed_at: new Date().toISOString() }, token);
    await sbFetch(supabaseKey, "ai_provider_usage", "POST", {
      job_id: jobId, owner_id: ownerId, provider: "gemini", model_id: "gemini-2.0-flash",
      prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens,
      estimated_cost_usd: (promptTokens / 1_000_000) * 0.075 + (completionTokens / 1_000_000) * 0.30,
      request_ok: true, latency_ms: latencyMs,
    }, token);
  }

  // ── 11. Return result ──────────────────────────────────────────────────────
  return res.status(200).json({
    success: true,
    jobId,
    readinessScore,
    evidenceConfidence: Math.round(evidenceConfidence),
    riskExposure: Math.round(riskExposure),
    investorGrade,
    verdict,
    rawJson: cleaned,
    modelUsed: "gemini-2.0-flash",
    latencyMs,
  });
}
