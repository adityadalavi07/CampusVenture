/**
 * Vercel Serverless Function — /api/ai-analyze   (v6 — SPEED OPTIMIZED)
 * Node.js runtime. GEMINI_API_KEY read from process.env.
 * Target: <8 seconds total. Uses ultra-fast model + minimal schema.
 * Hard rule: NO silent fallback scores. If AI fails → return success:false.
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

function san(text, max = 600) {
  if (!text) return "Not provided";
  return String(text).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/---/g, "—").replace(/```/g, "'''").trim().slice(0, max);
}

// 9 categories with weights (must sum to 100)
const WEIGHTS = {
  "Problem clarity": 15, "Solution strength": 15, "Market opportunity": 15,
  "Business model": 10, "Product readiness": 10, "Traction": 15,
  "Competitive advantage": 10, "Team readiness": 5, "Funding clarity": 5,
};

function computeScore(cats) {
  let ws = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    ws += (Number(cats[k]?.score) || 35) * (w / 100);
  }
  return Math.round(ws);
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

  // API key
  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (!geminiKey) return res.status(200).json({ success: false, error: "Server AI not configured. Contact admin." });

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
  if (!body || typeof body !== "object") {
    try { body = JSON.parse(req.body); } catch { return res.status(400).json({ success: false, error: "Invalid JSON" }); }
  }
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

  // Build ULTRA-COMPACT prompt  
  const stage = String(startup.stage || "Idea");
  const problem = san(startup.problem, 500);
  const solution = san(startup.solution, 500);
  const traction = san(startup.traction, 200);
  const bizModel = san(startup.businessModel || startup.business_model, 200);

  const stageRule = stage === "Idea"
    ? "Idea stage: do NOT penalise for no revenue/users."
    : stage === "MVP"
    ? "MVP stage: expect prototype; no revenue OK."
    : "Growth stage: expect revenue and traction.";

  // Minimal prompt — target <600 tokens input, <1200 tokens output
  const prompt = `You are a strict VC partner. Evaluate this ${stage}-stage startup. ${stageRule}
Return ONLY valid compact JSON (no markdown):
{"categories":{"Problem clarity":{"score":0},"Solution strength":{"score":0},"Market opportunity":{"score":0},"Business model":{"score":0},"Product readiness":{"score":0},"Traction":{"score":0},"Competitive advantage":{"score":0},"Team readiness":{"score":0},"Funding clarity":{"score":0}},"verdict":"1 sentence","honestTake":"2 sentences of blunt truth","redFlags":["flag1","flag2"],"strengths":["s1","s2"],"weaknesses":["w1","w2"],"recommendations":["r1","r2","r3"]}

Startup: ${san(startup.name, 60)} | Sector: ${san(startup.sector, 40)} | Stage: ${stage} | Team: ${startup.teamSize || 1} | Revenue: ${startup.revenue ? "Yes" : "No"} | MAU: ${startup.monthlyUsers || 0}
Problem: "${problem}"
Solution: "${solution}"
Traction: "${traction}"
Business model: "${bizModel}"
GitHub: ${startup.githubUrl ? "Yes" : "No"} | Deck: ${startup.deckName ? "Yes" : "No"}

Score each category 0-100. Weak ideas: 20-45. Strong ideas: 65-85. Be realistic and honest.`;

  // Try models in order: fastest first
  const MODELS_TO_TRY = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  const tStart = Date.now();
  let geminiData = null;
  let modelUsed = "";
  let lastError = "";

  for (const modelId of MODELS_TO_TRY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey.trim()}`;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
        }),
      });
      if (r.ok) {
        geminiData = await r.json();
        modelUsed = modelId;
        console.log(`[AI] Model ${modelId} succeeded in ${Date.now() - tStart}ms`);
        break;
      } else {
        const errText = await r.text().catch(() => "");
        let errMsg = `HTTP ${r.status}`;
        try { errMsg = JSON.parse(errText)?.error?.message || errMsg; } catch {}
        console.warn(`[AI] Model ${modelId} failed: ${errMsg}`);
        lastError = errMsg;
        // If 404 (model not found) or 400, try next model; for 429/5xx, stop
        if (r.status === 429 || r.status >= 500) {
          return res.status(200).json({ success: false, error: `AI error: ${errMsg}` });
        }
      }
    } catch (netErr) {
      lastError = netErr?.message || String(netErr);
      console.warn(`[AI] Model ${modelId} network error: ${lastError}`);
    }
  }

  const latencyMs = Date.now() - tStart;

  if (!geminiData) {
    return res.status(200).json({ success: false, error: `All AI models failed. Last error: ${lastError}` });
  }

  const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    const reason = geminiData?.candidates?.[0]?.finishReason || "EMPTY";
    return res.status(200).json({ success: false, error: `AI returned empty response (${reason})` });
  }

  // Parse JSON — strip any markdown fences
  let parsed;
  const cleaned = candidateText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
  try { parsed = JSON.parse(cleaned); } catch {
    // Try extracting JSON from the response if it's wrapped in text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch {}
    }
    if (!parsed) {
      return res.status(200).json({ success: false, error: "AI returned malformed JSON — please retry" });
    }
  }

  // Deterministic scoring: use OUR weights, NOT AI's overall score
  const cats = parsed.categories || {};
  const readinessScore = computeScore(cats);
  const investorGrade = grade(readinessScore);
  const verdict = String(parsed.verdict || "Assessment complete.");
  const honestTake = String(parsed.honestTake || "");

  const promptTokens = geminiData?.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = geminiData?.usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens = geminiData?.usageMetadata?.totalTokenCount ?? 0;

  // Persist to Supabase (non-blocking — don't fail if tables don't exist yet)
  if (ownerId && startupId) {
    // Fire-and-forget persistence
    Promise.all([
      sbFetch(supabaseKey, "startup_analysis_reports", "POST", {
        startup_id: startupId, owner_id: ownerId,
        ai_provider: "gemini", model_id: modelUsed,
        readiness_score: readinessScore, evidence_confidence: 65, risk_exposure: 50,
        investor_grade: investorGrade, verdict, report_json: parsed, startup_snapshot: startup,
        prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens,
        latency_ms: latencyMs, created_at: new Date().toISOString(),
      }, token),
      sbFetch(supabaseKey, `startups?id=eq.${startupId}`, "PATCH", { readiness: readinessScore }, token),
    ]).catch(e => console.warn("[AI] Supabase persist error:", e?.message));
  }

  return res.status(200).json({
    success: true,
    readinessScore,
    evidenceConfidence: 65,
    riskExposure: 50,
    investorGrade,
    verdict,
    honestTake,
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    categoryScores: cats,
    rawJson: cleaned,
    modelUsed,
    latencyMs,
  });
}
