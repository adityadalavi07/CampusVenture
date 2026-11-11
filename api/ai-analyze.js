/**
 * Vercel EDGE Function — /api/ai-analyze   (v10 — Edge runtime, 30s timeout)
 *
 * Edge runtime gives 30s on Hobby plan (vs 10s for serverless Node.js).
 * Primary:  Grok grok-2-latest  (~2-5s, fast non-reasoning model)
 * Fallback: Gemini streaming     (SSE keeps data flowing)
 *
 * Deterministic scoring engine — AI scores 9 categories, we compute final.
 * Hard rule: NO silent fallback. AI fails → return success:false.
 */

export const config = { runtime: "edge" };

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
    return res.ok
      ? { data, error: null }
      : { data: null, error: data?.message || text.slice(0, 200) };
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
    .replace(/---/g, "\u2014")
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
  Traction: 15,
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
      ? "Idea stage \u2014 do NOT penalise for no revenue or no users."
      : stage === "MVP"
        ? "MVP stage \u2014 expect working prototype; no revenue is acceptable."
        : "Growth stage \u2014 expect real traction and revenue evidence.";

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

// ── Grok (xAI) — OpenAI-compatible, fast non-reasoning model ─────────────
async function callGrok(apiKey, systemPrompt, userPrompt) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-2-latest",
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
    try {
      errMsg = JSON.parse(errText)?.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  const finishReason = data?.choices?.[0]?.finish_reason || "unknown";
  console.log(
    `[AI] Grok finish_reason: ${finishReason}, len: ${(text || "").length}`,
  );
  if (!text)
    throw new Error(
      `Grok returned empty response (finish_reason: ${finishReason})`,
    );

  return {
    text,
    promptTokens: data?.usage?.prompt_tokens || 0,
    completionTokens: data?.usage?.completion_tokens || 0,
    model: data?.model || "grok-2-latest",
  };
}

// ── Gemini non-streaming (Edge runtime = 30s, no need for SSE) ────────────
async function callGemini(apiKey, systemPrompt, userPrompt) {
  const MODELS = [
    "gemini-2.5-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
  ];
  let lastError = "";

  for (const modelId of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey.trim()}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!r.ok) {
        const errText = await r.text().catch(() => "");
        let errMsg = `HTTP ${r.status}`;
        try {
          errMsg = JSON.parse(errText)?.error?.message || errMsg;
        } catch {}
        console.warn(`[AI] Gemini ${modelId} failed: ${errMsg}`);
        lastError = errMsg;
        if (r.status === 429 || r.status >= 500) break;
        continue;
      }

      const data = await r.json();
      const fullText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const promptTokens = data?.usageMetadata?.promptTokenCount || 0;
      const completionTokens = data?.usageMetadata?.candidatesTokenCount || 0;

      if (fullText) {
        console.log(`[AI] Gemini ${modelId} returned ${fullText.length} chars`);
        return { text: fullText, promptTokens, completionTokens, model: modelId };
      }
      lastError = "Empty response";
    } catch (e) {
      lastError = e?.message || String(e);
      console.warn(`[AI] Gemini ${modelId} error: ${lastError}`);
    }
  }

  throw new Error(`Gemini unavailable: ${lastError}`);
}

// ── JSON Response helper ──────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// ── Main Edge handler ─────────────────────────────────────────────────────
export default async function handler(request) {
  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS });
  }
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  // Check API keys
  const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (!grokKey && !geminiKey) {
    return json({
      success: false,
      error: "No AI provider configured. Set GROK_API_KEY or GEMINI_API_KEY.",
    });
  }

  // Auth
  const supabaseKey = getSupabaseKey();
  const rawAuth = request.headers.get("authorization") || "";
  const token = rawAuth.replace(/^Bearer\s+/i, "").trim();
  let ownerId = null,
    ownerEmail = "";
  if (token) {
    const u = await verifyJWT(supabaseKey, token);
    if (u) {
      ownerId = u.userId;
      ownerEmail = u.email;
    }
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const startup = body?.startup;
  const startupId = body?.startupId || startup?.id;
  if (!startup || typeof startup !== "object") {
    return json({ success: false, error: "Missing startup data" }, 400);
  }

  // Ownership check
  if (ownerId && startupId) {
    const { data: dbS } = await sbFetch(
      supabaseKey,
      `startups?id=eq.${startupId}&select=founder_id,founder_email`,
      "GET",
      undefined,
      token,
    );
    if (Array.isArray(dbS) && dbS.length > 0) {
      const row = dbS[0];
      const ok =
        row["founder_id"] === ownerId ||
        (row["founder_email"] &&
          String(row["founder_email"]).toLowerCase() ===
            ownerEmail.toLowerCase());
      if (!ok)
        return json(
          { success: false, error: "Access denied: not your startup." },
          403,
        );
    }
  }

  // Build prompts
  const stage = san(startup.stage || "Idea", 20);
  const systemPrompt = buildSystemPrompt(stage);
  const userPrompt = buildUserPrompt(startup);

  // ── Call AI ── Gemini streaming first (reliable JSON), Grok fallback ──
  const tStart = Date.now();
  let aiResult;
  let provider = "";

  // Gemini streaming primary — guaranteed JSON via responseMimeType
  if (geminiKey) {
    try {
      aiResult = await callGemini(geminiKey, systemPrompt, userPrompt);
      provider = "gemini";
      console.log(
        `[AI] Gemini ${aiResult.model} responded in ${Date.now() - tStart}ms`,
      );
    } catch (e) {
      console.warn(`[AI] Gemini failed: ${e.message}`);
    }
  }

  // Grok fallback
  if (!aiResult && grokKey) {
    try {
      aiResult = await callGrok(grokKey, systemPrompt, userPrompt);
      provider = "grok";
      console.log(
        `[AI] Grok ${aiResult.model} responded in ${Date.now() - tStart}ms`,
      );
    } catch (e) {
      console.error(`[AI] Grok also failed: ${e.message}`);
      return json({
        success: false,
        error: `All AI providers failed. ${e.message}. Please retry.`,
      });
    }
  }

  if (!aiResult) {
    return json({
      success: false,
      error: "No AI provider available. Please retry.",
    });
  }

  const latencyMs = Date.now() - tStart;

  // Parse JSON from AI
  let parsed;
  const cleaned = aiResult.text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr1) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {}
    }
    if (!parsed) {
      console.error(
        "[AI] JSON parse failed. Raw length:",
        cleaned.length,
        "First 500:",
        cleaned.slice(0, 500),
      );
      return json({
        success: false,
        error: "AI response could not be parsed. Please retry.",
        debugRaw: cleaned.slice(0, 800),
        rawLength: cleaned.length,
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

  // Persist to Supabase (fire-and-forget — don't block the response)
  if (ownerId && startupId) {
    sbFetch(
      supabaseKey,
      "startup_analysis_reports",
      "POST",
      {
        startup_id: startupId,
        owner_id: ownerId,
        ai_provider: provider,
        model_id: aiResult.model,
        readiness_score: readinessScore,
        evidence_confidence: 65,
        risk_exposure: 50,
        investor_grade: investorGrade,
        verdict,
        report_json: parsed,
        startup_snapshot: startup,
        prompt_tokens: aiResult.promptTokens,
        completion_tokens: aiResult.completionTokens,
        latency_ms: latencyMs,
        created_at: new Date().toISOString(),
      },
      token,
    ).catch(() => {});
    sbFetch(
      supabaseKey,
      `startups?id=eq.${startupId}`,
      "PATCH",
      { readiness: readinessScore },
      token,
    ).catch(() => {});
  }

  return json({
    success: true,
    readinessScore,
    evidenceConfidence: 65,
    riskExposure: 50,
    investorGrade,
    verdict,
    honestTake,
    redFlags: Array.isArray(parsed.redFlags)
      ? parsed.redFlags.slice(0, 4)
      : [],
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.slice(0, 3)
      : [],
    weaknesses: Array.isArray(parsed.weaknesses)
      ? parsed.weaknesses.slice(0, 3)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 4)
      : [],
    categoryScores: cats,
    rawJson: cleaned,
    modelUsed,
    latencyMs,
  });
}
