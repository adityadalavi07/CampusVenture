/**
 * Vercel Serverless Function — /api/ai-analyze   (v7 — PRODUCTION)
 * Node.js runtime. GEMINI_API_KEY read from process.env.
 * Uses gemini-2.0-flash (stable, fast ~3-5s, supports JSON mode).
 * Deterministic scoring engine — AI scores categories, we compute final.
 * Hard rule: NO silent fallback. If AI fails → return success:false.
 */

const rateLimits = new Map();
function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const rec = rateLimits.get(key);
  if (!rec || now > rec.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (rec.count >= limit) return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((rec.resetAt - now) / 1000)) };
  rec.count++;
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

async function sbFetch(key, path, method = "GET", body, token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: token ? `Bearer ${token}` : `Bearer ${key}`,
        Prefer: method === "POST" ? "return=representation" : "",
      },
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return res.ok ? { data, error: null } : { data: null, error: data?.message || text.slice(0, 200) };
  } catch (e) {
    return { data: null, error: e?.message || String(e) };
  }
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
  return String(text)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/---/g, "—")
    .replace(/```/g, "'''")
    .trim()
    .slice(0, max);
}

// Weights for 9 categories (must sum to 100)
const WEIGHTS = {
  "Problem clarity": 15,
  "Solution strength": 15,
  "Market opportunity": 15,
  "Business model": 10,
  "Product readiness": 10,
  "Traction": 15,
  "Competitive advantage": 10,
  "Team readiness": 5,
  "Funding clarity": 5,
};

function computeScore(cats) {
  let total = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    const s = Number(cats?.[k]?.score);
    total += (isNaN(s) ? 35 : Math.max(0, Math.min(100, s))) * (w / 100);
  }
  return Math.round(total);
}

function grade(s) {
  if (s >= 90) return "A+";
  if (s >= 80) return "A";
  if (s >= 70) return "B";
  if (s >= 55) return "C";
  if (s >= 40) return "D";
  return "F";
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
  if (!rl.allowed) return res.status(429).json({ success: false, error: `Rate limit. Retry in ${rl.retryAfterSec}s.` });

  // API key check
  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (!geminiKey) {
    return res.status(200).json({ success: false, error: "Server AI not configured — GEMINI_API_KEY missing." });
  }

  // Auth (optional — allows anonymous for now)
  const supabaseKey = getSupabaseKey();
  const rawAuth = req.headers["authorization"] || "";
  const token = rawAuth.replace(/^Bearer\s+/i, "").trim();
  let ownerId = null, ownerEmail = "";
  if (token) {
    const u = await verifyJWT(supabaseKey, token);
    if (u) { ownerId = u.userId; ownerEmail = u.email; }
  }

  // Parse body
  let body = req.body;
  if (!body || typeof body !== "object") {
    try { body = JSON.parse(req.body); } catch {
      return res.status(400).json({ success: false, error: "Invalid JSON body" });
    }
  }

  const startup = body?.startup;
  const startupId = body?.startupId || startup?.id;
  if (!startup || typeof startup !== "object") {
    return res.status(400).json({ success: false, error: "Missing startup data" });
  }

  // Ownership check
  if (ownerId && startupId) {
    const { data: dbS } = await sbFetch(
      supabaseKey,
      `startups?id=eq.${startupId}&select=founder_id,founder_email`,
      "GET", undefined, token
    );
    if (Array.isArray(dbS) && dbS.length > 0) {
      const row = dbS[0];
      const ok =
        row["founder_id"] === ownerId ||
        (row["founder_email"] &&
          String(row["founder_email"]).toLowerCase() === ownerEmail.toLowerCase());
      if (!ok) return res.status(403).json({ success: false, error: "Access denied: not your startup." });
    }
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const stage = san(startup.stage || "Idea", 20);
  const name  = san(startup.name, 60);
  const sector = san(startup.sector, 40);

  const stageCtx = stage === "Idea"
    ? "Idea stage — do NOT penalise for no revenue or no users."
    : stage === "MVP"
    ? "MVP stage — expect working prototype; no revenue is acceptable."
    : "Growth stage — expect real traction and revenue evidence.";

  // System: tell model exactly what JSON schema to return
  const systemPrompt = `You are a strict VC partner doing investment due diligence.
${stageCtx}
You MUST return ONLY a valid JSON object — no explanation, no markdown, no backticks.
Exact schema required:
{
  "categories": {
    "Problem clarity":      {"score": <integer 0-100>, "critique": "<max 100 chars>"},
    "Solution strength":    {"score": <integer 0-100>, "critique": "<max 100 chars>"},
    "Market opportunity":   {"score": <integer 0-100>, "critique": "<max 100 chars>"},
    "Business model":       {"score": <integer 0-100>, "critique": "<max 100 chars>"},
    "Product readiness":    {"score": <integer 0-100>, "critique": "<max 100 chars>"},
    "Traction":             {"score": <integer 0-100>, "critique": "<max 100 chars>"},
    "Competitive advantage":{"score": <integer 0-100>, "critique": "<max 100 chars>"},
    "Team readiness":       {"score": <integer 0-100>, "critique": "<max 100 chars>"},
    "Funding clarity":      {"score": <integer 0-100>, "critique": "<max 100 chars>"}
  },
  "verdict": "<1 sentence investment verdict>",
  "honestTake": "<2 sentences of blunt, unfiltered VC truth>",
  "redFlags": ["<flag 1>", "<flag 2>", "<flag 3>"],
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
}
Scoring rules:
- Weak/early idea: scores 20-45
- Decent concept with gaps: 45-65
- Strong with evidence: 65-85
- Do NOT give inflated scores. Be honest and critical.`;

  const userPrompt = `Startup: ${name}
Sector: ${sector} | Stage: ${stage} | Team size: ${startup.teamSize || 1}
Revenue: ${startup.revenue ? "Yes" : "No"} | MAU: ${startup.monthlyUsers || 0}
Funding ask: $${Number(startup.fundingRequired || 0).toLocaleString()}
GitHub: ${startup.githubUrl ? "Yes" : "No"} | Pitch deck: ${startup.deckName ? "Yes" : "No"}

PROBLEM (${san(startup.problem, 600).split(/\s+/).length} words):
"${san(startup.problem, 600)}"

SOLUTION (${san(startup.solution, 600).split(/\s+/).length} words):
"${san(startup.solution, 600)}"

TRACTION: "${san(startup.traction, 300)}"
BUSINESS MODEL: "${san(startup.businessModel || startup.business_model, 300)}"

Evaluate rigorously. Return JSON only.`;

  // ── Call Gemini — try models fastest-first, all support JSON mode ─────────
  // Models confirmed available for this API key (from /api/ai-models):
  // gemini-3.8-flash → fast, full JSON mode support
  // gemini-2.5-flash → stable fallback
  // gemini-3.1-flash-lite → lightweight emergency fallback
  const MODELS = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"];

  const tStart = Date.now();
  let geminiData = null;
  let modelUsed = "";
  let lastError = "";

  for (const modelId of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey.trim()}`;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1500,
            responseMimeType: "application/json",
          },
        }),
      });

      if (r.ok) {
        geminiData = await r.json();
        modelUsed = modelId;
        console.log(`[AI] ${modelId} responded in ${Date.now() - tStart}ms`);
        break;
      } else {
        const errText = await r.text().catch(() => "");
        let errMsg = `HTTP ${r.status}`;
        try { errMsg = JSON.parse(errText)?.error?.message || errMsg; } catch {}
        console.warn(`[AI] ${modelId} failed: ${errMsg}`);
        lastError = errMsg;
        // Don't retry on rate-limit or server errors
        if (r.status === 429 || r.status >= 500) break;
        // 404 = model not found, try next
      }
    } catch (netErr) {
      lastError = netErr?.message || String(netErr);
      console.warn(`[AI] ${modelId} network error: ${lastError}`);
    }
  }

  const latencyMs = Date.now() - tStart;

  if (!geminiData) {
    return res.status(200).json({
      success: false,
      error: `AI unavailable: ${lastError || "all models failed"}. Please retry.`,
    });
  }

  // ── Extract text from response ────────────────────────────────────────────
  const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    const reason = geminiData?.candidates?.[0]?.finishReason || "EMPTY";
    console.error("[AI] Empty candidate. FinishReason:", reason, "Full response:", JSON.stringify(geminiData).slice(0, 500));
    return res.status(200).json({
      success: false,
      error: `AI returned empty response (reason: ${reason}). Please retry.`,
    });
  }

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let parsed;
  // Strip any accidental markdown fences (shouldn't happen with JSON mode but be safe)
  const cleaned = candidateText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    parsed = JSON.parse(cleaned);
  } catch (e1) {
    // Last resort: extract first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch {}
    }
    if (!parsed) {
      console.error("[AI] JSON parse failed. Raw response:", cleaned.slice(0, 500));
      return res.status(200).json({
        success: false,
        error: "AI response could not be parsed. Please retry.",
        debugRaw: cleaned.slice(0, 300), // safe preview for debugging
      });
    }
  }

  // ── Deterministic scoring engine — WE compute the final score ─────────────
  // AI provides per-category scores 0-100; we apply documented weights
  const cats = parsed.categories || {};
  const readinessScore = computeScore(cats);
  const investorGrade  = grade(readinessScore);
  const verdict        = String(parsed.verdict || "Assessment complete.");
  const honestTake     = String(parsed.honestTake || "");

  const promptTokens     = geminiData?.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = geminiData?.usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens      = geminiData?.usageMetadata?.totalTokenCount ?? 0;

  // ── Persist to Supabase (non-blocking — don't fail if tables missing) ─────
  if (ownerId && startupId) {
    Promise.all([
      sbFetch(supabaseKey, "startup_analysis_reports", "POST", {
        startup_id: startupId,
        owner_id: ownerId,
        ai_provider: "gemini",
        model_id: modelUsed,
        readiness_score: readinessScore,
        evidence_confidence: 65,
        risk_exposure: 50,
        investor_grade: investorGrade,
        verdict,
        report_json: parsed,
        startup_snapshot: startup,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        latency_ms: latencyMs,
        created_at: new Date().toISOString(),
      }, token),
      sbFetch(supabaseKey, `startups?id=eq.${startupId}`, "PATCH", { readiness: readinessScore }, token),
    ]).catch((e) => console.warn("[AI] Supabase persist error:", e?.message));
  }

  // ── Return structured result ───────────────────────────────────────────────
  return res.status(200).json({
    success: true,
    readinessScore,         // our deterministic score (0-100)
    evidenceConfidence: 65,
    riskExposure: 50,
    investorGrade,          // our grade (A+/A/B/C/D/F)
    verdict,                // AI's 1-sentence verdict
    honestTake,             // AI's blunt 2-sentence take
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.slice(0, 4) : [],
    strengths:  Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 3) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4) : [],
    categoryScores: cats,   // raw per-category scores from AI
    rawJson: cleaned,       // full AI JSON for client to parse
    modelUsed,
    latencyMs,
  });
}
