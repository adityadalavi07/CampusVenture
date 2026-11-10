/**
 * Vercel Serverless Function — /api/ai-analyze
 * Node.js runtime. GEMINI_API_KEY read from process.env.
 * Compact prompt → fast response (target <8s). Full scoring engine.
 */

const rateLimits = new Map();
function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const rec = rateLimits.get(key);
  if (!rec || now > rec.resetAt) { rateLimits.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true }; }
  if (rec.count >= limit) return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((rec.resetAt - now) / 1000)) };
  rec.count++;
  return { allowed: true };
}

const SUPABASE_URL = "https://lirfkzpehmxtynjsjzib.supabase.co";

function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_CJjApu3rUsNReyUx7jW2Lg_NUM8oqR-";
}

async function sbFetch(key, path, method = "GET", body, token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method, body: body ? JSON.stringify(body) : undefined,
      headers: { "Content-Type": "application/json", apikey: key,
        Authorization: token ? `Bearer ${token}` : `Bearer ${key}`,
        Prefer: method === "POST" ? "return=representation" : "" },
    });
    const text = await res.text();
    let data = null; try { data = JSON.parse(text); } catch { data = text; }
    return res.ok ? { data, error: null } : { data: null, error: data?.message || text.slice(0, 200) };
  } catch (e) { return { data: null, error: e?.message || String(e) }; }
}

async function verifyJWT(key, token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.id ? { userId: d.id, email: d.email || "" } : null;
  } catch { return null; }
}

function san(text, max = 2000) {
  if (!text) return "Not provided";
  return String(text).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/---/g, "—").replace(/```/g, "'''").trim().slice(0, max);
}

// Weights for 9 categories (matches READINESS_WEIGHTS in demo-data.ts)
const WEIGHTS = {
  "Problem clarity": 15, "Solution strength": 15, "Market opportunity": 15,
  "Business model": 10, "Product readiness": 10, "Traction": 15,
  "Competitive advantage": 10, "Team readiness": 5, "Funding clarity": 5,
};

function computeScore(cats) {
  let ws = 0, tw = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    ws += (cats[k]?.score ?? 35) * (w / 100); tw += w;
  }
  return tw > 0 ? Math.round(ws * (100 / tw)) : 0;
}

function grade(s) {
  if (s >= 90) return "A+"; if (s >= 80) return "A"; if (s >= 70) return "B";
  if (s >= 55) return "C"; if (s >= 40) return "D"; return "F";
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  // Rate limit
  const rawIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const rl = checkRateLimit(`ai:${rawIp}`, 10, 60000);
  if (!rl.allowed) return res.status(429).json({ success: false, error: `Rate limit. Wait ${rl.retryAfterSec}s.` });

  // API key check
  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (!geminiKey) return res.status(200).json({ success: false, error: "Server AI not configured. GEMINI_API_KEY missing." });

  // Auth
  const supabaseKey = getSupabaseKey();
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "").trim();
  let ownerId = null, ownerEmail = "";
  if (token) {
    const u = await verifyJWT(supabaseKey, token);
    if (u) { ownerId = u.userId; ownerEmail = u.email; }
  }

  // Parse body
  let body = req.body;
  if (!body || typeof body !== "object") { try { body = JSON.parse(req.body); } catch { return res.status(400).json({ success: false, error: "Invalid JSON" }); } }
  const startup = body?.startup;
  const startupId = body?.startupId || startup?.id;
  if (!startup) return res.status(400).json({ success: false, error: "Missing startup data" });

  // Ownership check
  if (ownerId && startupId) {
    const { data: dbS } = await sbFetch(supabaseKey, `startups?id=eq.${startupId}&select=founder_id,founder_email`, "GET", undefined, token);
    if (Array.isArray(dbS) && dbS.length > 0) {
      const row = dbS[0];
      const ok = row["founder_id"] === ownerId || (row["founder_email"] && String(row["founder_email"]).toLowerCase() === ownerEmail.toLowerCase());
      if (!ok) return res.status(403).json({ success: false, error: "Access denied: you do not own this startup." });
    }
  }

  // Job record
  let jobId = null, analysisVersion = 1;
  if (ownerId && startupId) {
    const { data: prev } = await sbFetch(supabaseKey, `startup_analysis_reports?startup_id=eq.${startupId}&owner_id=eq.${ownerId}&select=analysis_version&order=analysis_version.desc&limit=1`, "GET", undefined, token);
    if (Array.isArray(prev) && prev.length > 0) analysisVersion = Number(prev[0]["analysis_version"] || 0) + 1;
    const { data: jd } = await sbFetch(supabaseKey, "startup_analysis_jobs", "POST", {
      startup_id: startupId, owner_id: ownerId, status: "processing",
      analysis_version: analysisVersion, ai_provider: "gemini", model_id: "gemini-3.8-flash",
      prompt_version: "v5.0", started_at: new Date().toISOString(),
    }, token);
    if (Array.isArray(jd) && jd.length > 0) jobId = String(jd[0]["id"]);
  }

  // Build compact prompt
  const stage = String(startup.stage || "Idea");
  const pW = san(startup.problem).split(/\s+/).filter(Boolean).length;
  const sW = san(startup.solution).split(/\s+/).filter(Boolean).length;

  const systemPrompt = `You are a strict VC partner doing investment due diligence on a ${stage}-stage startup.
Return ONLY a compact valid JSON object (no markdown, no backticks):
{
  "overallScore": <integer 0-100>,
  "investorGrade": <"A+"|"A"|"B"|"C"|"D"|"F">,
  "verdict": <string, 1 sentence>,
  "honestTake": <string, 2-3 sentences of blunt truth>,
  "redFlags": [<2-4 strings>],
  "fatalFlaws": [<1-3 strings>],
  "grillingQuestions": [<3 tough VC questions>],
  "categories": {
    "Problem clarity": {"score":<0-100>,"critique":<string>,"honestFeedback":<string>,"actionItem":<string>},
    "Solution strength": {"score":<0-100>,"critique":<string>,"honestFeedback":<string>,"actionItem":<string>},
    "Market opportunity": {"score":<0-100>,"critique":<string>,"honestFeedback":<string>,"actionItem":<string>},
    "Business model": {"score":<0-100>,"critique":<string>,"honestFeedback":<string>,"actionItem":<string>},
    "Product readiness": {"score":<0-100>,"critique":<string>,"honestFeedback":<string>,"actionItem":<string>},
    "Traction": {"score":<0-100>,"critique":<string>,"honestFeedback":<string>,"actionItem":<string>},
    "Competitive advantage": {"score":<0-100>,"critique":<string>,"honestFeedback":<string>,"actionItem":<string>},
    "Team readiness": {"score":<0-100>,"critique":<string>,"honestFeedback":<string>,"actionItem":<string>},
    "Funding clarity": {"score":<0-100>,"critique":<string>,"honestFeedback":<string>,"actionItem":<string>}
  },
  "strengths": [<3 strings>],
  "weaknesses": [<3 strings>],
  "recommendations": [<4 actionable strings>]
}
Stage rule: ${stage === "Idea" ? "Do NOT penalise for no revenue or no users." : stage === "MVP" ? "Expect working prototype; penalise for zero users." : "Expect traction and revenue evidence."}
Score truthfully. Weak ideas score 25-48. Keep all string values under 120 chars.`;

  const userPrompt = `Startup: ${san(startup.name)} | Sector: ${san(startup.sector)} | Stage: ${stage}
Team: ${startup.teamSize || 1} | Funding ask: $${Number(startup.fundingRequired || 0).toLocaleString()} | Revenue: ${startup.revenue ? "Yes" : "No"} | MAU: ${startup.monthlyUsers || 0}
Traction: "${san(startup.traction, 400)}"
Business model: "${san(startup.businessModel || startup.business_model, 400)}"
Problem (${pW}w): "${san(startup.problem, 1200)}"
Solution (${sW}w): "${san(startup.solution, 1200)}"
GitHub: ${startup.githubUrl ? "Yes" : "No"} | Deck: ${startup.deckName ? "Yes" : "No"}
Return JSON only.`;

  // Call Gemini
  const tStart = Date.now();
  let geminiRes;
  try {
    geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey.trim()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.25, responseMimeType: "application/json", maxOutputTokens: 2048 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });
  } catch (e) {
    const msg = e?.message || String(e);
    if (jobId) await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH", { status: "failed", error_message: msg, completed_at: new Date().toISOString() }, token);
    return res.status(200).json({ success: false, error: `AI network error: ${msg}` });
  }

  const latencyMs = Date.now() - tStart;

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => "");
    let errMsg = `Gemini HTTP ${geminiRes.status}`;
    try { errMsg = JSON.parse(errText)?.error?.message || errMsg; } catch { /* */ }
    if (jobId) await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH", { status: "failed", error_message: errMsg, completed_at: new Date().toISOString() }, token);
    return res.status(200).json({ success: false, error: errMsg });
  }

  const geminiData = await geminiRes.json();
  const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    const reason = geminiData?.candidates?.[0]?.finishReason || "EMPTY";
    if (jobId) await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH", { status: "failed", error_message: `Empty response (${reason})`, completed_at: new Date().toISOString() }, token);
    return res.status(200).json({ success: false, error: `AI returned empty response (${reason})` });
  }

  // Parse JSON
  let parsed;
  const cleaned = candidateText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
  try { parsed = JSON.parse(cleaned); } catch {
    if (jobId) await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH", { status: "failed", error_message: "Malformed JSON", completed_at: new Date().toISOString() }, token);
    return res.status(200).json({ success: false, error: "AI returned malformed JSON — please retry" });
  }

  // Deterministic scoring: use OUR weights, not AI's overallScore
  const cats = parsed.categories || {};
  const readinessScore = computeScore(cats);
  const investorGrade = grade(readinessScore);
  const verdict = String(parsed.verdict || "Assessment complete");
  const honestTake = String(parsed.honestTake || "");

  const promptTokens = geminiData?.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = geminiData?.usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens = geminiData?.usageMetadata?.totalTokenCount ?? 0;

  // Persist to Supabase
  if (ownerId && startupId && jobId) {
    await sbFetch(supabaseKey, "startup_analysis_reports", "POST", {
      job_id: jobId, startup_id: startupId, owner_id: ownerId,
      analysis_version: analysisVersion, ai_provider: "gemini", model_id: "gemini-3.8-flash",
      readiness_score: readinessScore, evidence_confidence: 65, risk_exposure: 50,
      investor_grade: investorGrade, verdict, report_json: parsed, startup_snapshot: startup,
      prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens,
    }, token);
    await sbFetch(supabaseKey, `startups?id=eq.${startupId}`, "PATCH", { readiness: readinessScore }, token);
    await sbFetch(supabaseKey, `startup_analysis_jobs?id=eq.${jobId}`, "PATCH", { status: "completed", completed_at: new Date().toISOString() }, token);
    await sbFetch(supabaseKey, "ai_provider_usage", "POST", {
      job_id: jobId, owner_id: ownerId, provider: "gemini", model_id: "gemini-3.8-flash",
      prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens,
      estimated_cost_usd: (promptTokens / 1_000_000) * 0.075 + (completionTokens / 1_000_000) * 0.30,
      request_ok: true, latency_ms: latencyMs,
    }, token);
  }

  return res.status(200).json({
    success: true, jobId, readinessScore,
    evidenceConfidence: 65, riskExposure: 50,
    investorGrade, verdict, honestTake,
    rawJson: cleaned, modelUsed: "gemini-3.8-flash", latencyMs,
  });
}
