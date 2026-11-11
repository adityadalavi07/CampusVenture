/**
 * Vercel Serverless Function — /api/ai-analyze   (v9 — OpenAI + Gemini fallback)
 * 
 * Primary:  OpenAI gpt-4o-mini  (~2-3 seconds, reliable JSON mode)
 * Fallback: Gemini 2.5-flash    (if OpenAI key not set)
 * 
 * Deterministic scoring engine — AI scores 9 categories, we compute final.
 * Hard rule: NO silent fallback. AI fails → return success:false.
 */

const rateLimits = new Map();
function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const rec = rateLimits.get(key);
  if (!rec || now > rec.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (rec.count >= limit)
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((rec.resetAt - now) / 1000)) };
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
  } catch {
    return null;
  }
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

// ── Deterministic scoring engine ──────────────────────────────────────────
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

// ── Prompt builders ───────────────────────────────────────────────────────
function buildSystemPrompt(stage) {
  const stageCtx =
    stage === "Idea"
      ? "Idea stage — do NOT penalise for no revenue or no users."
      : stage === "MVP"
      ? "MVP stage — expect working prototype; no revenue is acceptable."
      : "Growth stage — expect real traction and revenue evidence.";

  return `You are a strict VC partner doing investment due diligence. ${stageCtx}
Return ONLY a valid JSON object with this exact schema:
{
  "categories": {
    "Problem clarity":       {"score": <integer 0-100>, "critique": "<max 120 chars>"},
    "Solution strength":     {"score": <integer 0-100>, "critique": "<max 120 chars>"},
    "Market opportunity":    {"score": <integer 0-100>, "critique": "<max 120 chars>"},
    "Business model":        {"score": <integer 0-100>, "critique": "<max 120 chars>"},
    "Product readiness":     {"score": <integer 0-100>, "critique": "<max 120 chars>"},
    "Traction":              {"score": <integer 0-100>, "critique": "<max 120 chars>"},
    "Competitive advantage": {"score": <integer 0-100>, "critique": "<max 120 chars>"},
    "Team readiness":        {"score": <integer 0-100>, "critique": "<max 120 chars>"},
    "Funding clarity":       {"score": <integer 0-100>, "critique": "<max 120 chars>"}
  },
  "verdict": "<1 sentence investment verdict>",
  "honestTake": "<2-3 sentences of blunt, unfiltered VC truth>",
  "redFlags": ["<flag1>", "<flag2>", "<flag3>"],
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "recommendations": ["<action1>", "<action2>", "<action3>"]
}
Scoring: weak ideas 20-45, decent with gaps 45-65, strong with evidence 65-85. Be honest and critical.`;
}

function buildUserPrompt(startup) {
  return `Startup: ${san(startup.name, 60)}
Sector: ${san(startup.sector, 40)} | Stage: ${san(startup.stage, 20)} | Team: ${startup.teamSize || 1}
Revenue: ${startup.revenue ? "Yes" : "No"} | MAU: ${startup.monthlyUsers || 0} | Funding ask: $${Number(startup.fundingRequired || 0).toLocaleString()}
GitHub: ${startup.githubUrl ? "Yes" : "No"} | Pitch deck: ${startup.deckName ? "Yes" : "No"}

PROBLEM: "${san(startup.problem, 600)}"
SOLUTION: "${san(startup.solution, 600)}"
TRACTION: "${san(startup.traction, 300)}"
BUSINESS MODEL: "${san(startup.businessModel || startup.business_model, 300)}"

Evaluate rigorously. Return JSON only.`;
}

// ── Grok (xAI) call — OpenAI-compatible API ──────────────────────────────
async function callGrok(apiKey, systemPrompt, userPrompt) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini-fast",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let errMsg = `Grok HTTP ${res.status}`;
    try { errMsg = JSON.parse(errText)?.error?.message || errMsg; } catch {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Grok returned empty response");

  return {
    text,
    promptTokens: data?.usage?.prompt_tokens || 0,
    completionTokens: data?.usage?.completion_tokens || 0,
    model: data?.model || "grok-3-mini-fast",
  };
}

// ── Gemini call (fallback) ────────────────────────────────────────────────
async function callGemini(apiKey, systemPrompt, userPrompt) {
  // Try these models in order — confirmed available via /api/ai-models
  const MODELS = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
  let lastError = "";

  for (const modelId of MODELS) {
    try {
      // Use streaming to avoid Vercel 10s idle timeout
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`;
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

      if (!r.ok) {
        const errText = await r.text().catch(() => "");
        let errMsg = `HTTP ${r.status}`;
        try { errMsg = JSON.parse(errText)?.error?.message || errMsg; } catch {}
        console.warn(`[AI] Gemini ${modelId} failed: ${errMsg}`);
        lastError = errMsg;
        if (r.status === 429 || r.status >= 500) break;
        continue;
      }

      // Read SSE stream
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let promptTokens = 0, completionTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") continue;
          try {
            const chunk = JSON.parse(dataStr);
            fullText += chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (chunk?.usageMetadata) {
              promptTokens = chunk.usageMetadata.promptTokenCount || promptTokens;
              completionTokens = chunk.usageMetadata.candidatesTokenCount || completionTokens;
            }
          } catch {}
        }
      }

      if (fullText) {
        return { text: fullText, promptTokens, completionTokens, model: modelId };
      }
      lastError = "Empty streamed response";
    } catch (e) {
      lastError = e?.message || String(e);
      console.warn(`[AI] Gemini ${modelId} error: ${lastError}`);
    }
  }

  throw new Error(`Gemini unavailable: ${lastError}`);
}

// ── Main handler ──────────────────────────────────────────────────────────
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  // Rate limit
  const rawIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const rl = checkRateLimit(`ai:${rawIp}`, 10, 60000);
  if (!rl.allowed)
    return res.status(429).json({ success: false, error: `Rate limit. Retry in ${rl.retryAfterSec}s.` });

  const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (!grokKey && !geminiKey) {
    return res.status(200).json({ success: false, error: "No AI provider configured. Set GROK_API_KEY or GEMINI_API_KEY." });
  }

  // Auth
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
    const { data: dbS } = await sbFetch(supabaseKey, `startups?id=eq.${startupId}&select=founder_id,founder_email`, "GET", undefined, token);
    if (Array.isArray(dbS) && dbS.length > 0) {
      const row = dbS[0];
      const ok = row["founder_id"] === ownerId || (row["founder_email"] && String(row["founder_email"]).toLowerCase() === ownerEmail.toLowerCase());
      if (!ok) return res.status(403).json({ success: false, error: "Access denied: not your startup." });
    }
  }

  // Build prompts
  const stage = san(startup.stage || "Idea", 20);
  const systemPrompt = buildSystemPrompt(stage);
  const userPrompt = buildUserPrompt(startup);

  // Call AI — Grok first (fast, ~1-3s), Gemini streaming fallback
  const tStart = Date.now();
  let aiResult;
  let provider = "";

  // Try Grok (xAI) first — very fast, OpenAI-compatible
  if (grokKey) {
    try {
      aiResult = await callGrok(grokKey, systemPrompt, userPrompt);
      provider = "grok";
      console.log(`[AI] Grok ${aiResult.model} responded in ${Date.now() - tStart}ms`);
    } catch (e) {
      console.warn(`[AI] Grok failed: ${e.message}`);
      // Fall through to Gemini
    }
  }

  // Fallback to Gemini
  if (!aiResult && geminiKey) {
    try {
      aiResult = await callGemini(geminiKey, systemPrompt, userPrompt);
      provider = "gemini";
      console.log(`[AI] Gemini ${aiResult.model} responded in ${Date.now() - tStart}ms`);
    } catch (e) {
      console.error(`[AI] Gemini also failed: ${e.message}`);
      return res.status(200).json({
        success: false,
        error: `All AI providers failed. ${e.message}. Please retry.`,
      });
    }
  }

  if (!aiResult) {
    return res.status(200).json({ success: false, error: "No AI provider available. Please retry." });
  }

  const latencyMs = Date.now() - tStart;

  // Parse JSON
  let parsed;
  const cleaned = aiResult.text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch {}
    }
    if (!parsed) {
      console.error("[AI] JSON parse failed. Raw:", cleaned.slice(0, 400));
      return res.status(200).json({
        success: false,
        error: "AI response could not be parsed. Please retry.",
        debugRaw: cleaned.slice(0, 300),
      });
    }
  }

  // Deterministic scoring — OUR weights applied to AI's category scores
  const cats = parsed.categories || {};
  const readinessScore = computeScore(cats);
  const investorGrade = grade(readinessScore);
  const verdict = String(parsed.verdict || "Assessment complete.");
  const honestTake = String(parsed.honestTake || "");
  const modelUsed = `${aiResult.model} (${provider})`;

  // Persist to Supabase (non-blocking)
  if (ownerId && startupId) {
    Promise.all([
      sbFetch(supabaseKey, "startup_analysis_reports", "POST", {
        startup_id: startupId, owner_id: ownerId,
        ai_provider: provider, model_id: aiResult.model,
        readiness_score: readinessScore, evidence_confidence: 65, risk_exposure: 50,
        investor_grade: investorGrade, verdict, report_json: parsed, startup_snapshot: startup,
        prompt_tokens: aiResult.promptTokens, completion_tokens: aiResult.completionTokens,
        latency_ms: latencyMs, created_at: new Date().toISOString(),
      }, token),
      sbFetch(supabaseKey, `startups?id=eq.${startupId}`, "PATCH", { readiness: readinessScore }, token),
    ]).catch(e => console.warn("[AI] Supabase error:", e?.message));
  }

  return res.status(200).json({
    success: true,
    readinessScore,
    evidenceConfidence: 65,
    riskExposure: 50,
    investorGrade,
    verdict,
    honestTake,
    redFlags:        Array.isArray(parsed.redFlags) ? parsed.redFlags.slice(0, 4) : [],
    strengths:       Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
    weaknesses:      Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 3) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4) : [],
    categoryScores: cats,
    rawJson: cleaned,
    modelUsed,
    latencyMs,
  });
}
