/**
 * Vercel Serverless Function — /api/ai-analyze
 * Pure Node.js runtime. Reads GEMINI_API_KEY from process.env (guaranteed on Vercel).
 * Called by the frontend to run AI due-diligence analysis on a startup.
 */

// In-memory rate limiter (per cold-start instance; good enough for Vercel)
const rateLimits = new Map();
function checkRateLimit(key, limit, windowMs) {
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

const READINESS_WEIGHTS = [
  { key: "Problem clarity", weight: 15 },
  { key: "Solution strength", weight: 15 },
  { key: "Market opportunity", weight: 15 },
  { key: "Business model", weight: 10 },
  { key: "Product readiness", weight: 10 },
  { key: "Traction", weight: 15 },
  { key: "Competitive advantage", weight: 10 },
  { key: "Team readiness", weight: 5 },
  { key: "Funding clarity", weight: 5 },
];

function computeWeightedScore(categoryScores) {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const { key, weight } of READINESS_WEIGHTS) {
    const score = categoryScores[key]?.score ?? 35;
    weightedSum += score * (weight / 100);
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round(weightedSum * (100 / totalWeight));
}

export default async function handler(req, res) {
  // CORS — allow same-origin requests from the frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Rate limit: 10 AI analyses per IP per 60 seconds
  const rawIp =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const rateCheck = checkRateLimit(`ai:${rawIp}`, 10, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      fallback: true,
      error: `Rate limit reached. Please wait ${rateCheck.retryAfterSec}s before running another analysis.`,
    });
  }

  // Read the Gemini API key from Vercel environment (guaranteed to work in Node.js runtime)
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.error("[AI Analyze] GEMINI_API_KEY is not set in Vercel environment variables.");
    return res.status(200).json({
      success: false,
      fallback: true,
      error: "Server AI is not configured. GEMINI_API_KEY missing.",
    });
  }

  let body;
  try {
    body = req.body;
    if (!body || typeof body !== "object") {
      body = JSON.parse(req.body);
    }
  } catch {
    return res.status(400).json({ success: false, error: "Invalid JSON body" });
  }

  const { startup, honestyLevel = "brutal" } = body || {};
  if (!startup) {
    return res.status(400).json({ success: false, error: "Missing startup data" });
  }

  const countWords = (t) => (t || "").trim().split(/\s+/).filter(Boolean).length;
  const pWords = countWords(startup.problem);
  const sWords = countWords(startup.solution);

  // If problem or solution is under 50 words, return an immediate failing audit result
  // (don't waste an API call — return structured scored JSON)
  if (pWords < 50 || sWords < 50) {
    const isBoth = pWords < 50 && sWords < 50;
    const failReason = isBoth
      ? `Both problem (${pWords}/50 words) and solution (${sWords}/50 words) are too short.`
      : pWords < 50
      ? `Problem statement has only ${pWords}/50 words.`
      : `Solution statement has only ${sWords}/50 words.`;

    const lowResult = {
      overallScore: isBoth ? 6 : 10,
      investorGrade: "F",
      verdict: "Uninvestable — Insufficient Problem/Solution Detail",
      honestTake: `Blunt institutional truth: This submission fails basic diligence screening. ${failReason} Expand both sections to at least 50 words before requesting investor review.`,
      redFlags: [`Pre-screening rejection: ${failReason}`, "Incomplete customer discovery and architecture detail."],
      fatalFlaws: [`CRITICAL: ${failReason}`, "Cannot evaluate a venture with unarticulated core thesis."],
      grillingQuestions: [
        "Who specifically suffers from this problem and what is their annual financial cost of inaction?",
        "What is your proprietary technical architecture?",
        "Why have you not completed basic customer discovery interviews before seeking investment?",
      ],
      categories: Object.fromEntries(
        READINESS_WEIGHTS.map(({ key }) => [
          key,
          {
            score:
              key === "Problem clarity"
                ? pWords < 50 ? 5 : 45
                : key === "Solution strength"
                ? sWords < 50 ? 5 : 45
                : 30,
            critique: `Assessment blocked: ${failReason}`,
            honestFeedback: "Insufficient data for evaluation.",
            actionItem: "Expand problem and solution to at least 50 words each.",
          },
        ])
      ),
      strengths: ["Startup has been submitted for review."],
      weaknesses: [failReason, "No technical architecture described.", "No customer discovery evidence."],
      recommendations: [
        "Expand problem statement to 60+ words describing customer pain and cost of inaction.",
        "Expand solution to 60+ words detailing your technical architecture and defensibility.",
        "Conduct 10 customer interviews before the next submission.",
        "Upload a pitch deck and connect a GitHub repository.",
      ],
    };

    return res.status(200).json({ success: true, rawJson: JSON.stringify(lowResult) });
  }

  // Build system + user prompt
  const systemPrompt = `You are an elite Tier-1 VC Investment Partner conducting a strict, uncompromising due diligence review.
Honesty Level: ${String(honestyLevel).toUpperCase()}.
MANDATORY: If problem or solution is nonsense/gibberish/under 50 words, award overallScore 0-15 and grade F.
Output ONLY a single valid JSON object (no markdown, no backticks) with EXACTLY these fields:
{
  "overallScore": <integer 0-100>,
  "investorGrade": <one of "A+","A","B","C","D","F">,
  "verdict": <string>,
  "honestTake": <2-3 sentences of blunt institutional truth>,
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
}`;

  const userPrompt = `STARTUP PROFILE:
Name: ${startup.name || "Untitled"}
Tagline: ${startup.tagline || ""}
Sector: ${startup.sector || ""}
Stage: ${startup.stage || ""}
University: ${startup.university || ""}
Team Size: ${startup.teamSize || 1}
Funding Required: $${Number(startup.fundingRequired || 0).toLocaleString()}
Revenue: ${startup.revenue ? "Yes" : "No"}
Monthly Users: ${Number(startup.monthlyUsers || 0).toLocaleString()}
Traction: "${startup.traction || ""}"
Business Model: "${startup.businessModel || ""}"
Problem (${pWords} words): "${startup.problem}"
Solution (${sWords} words): "${startup.solution}"
GitHub: ${startup.githubUrl || "Not connected"}
Pitch Deck: ${startup.deckName || "Not uploaded"}
Video: ${startup.videoUrl || "Not provided"}

Perform deep institutional due diligence. Score truthfully — a weak idea should score 25-45. Return JSON only.`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[AI Analyze] Gemini API error:", geminiRes.status, errText);
      return res.status(200).json({
        success: false,
        fallback: true,
        error: `Gemini API error ${geminiRes.status}: ${errText.slice(0, 200)}`,
      });
    }

    const geminiData = await geminiRes.json();
    const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      console.error("[AI Analyze] Empty Gemini response:", JSON.stringify(geminiData).slice(0, 500));
      return res.status(200).json({ success: false, fallback: true, error: "Empty AI response from Gemini" });
    }

    // Validate it's parseable JSON before returning
    const cleaned = candidateText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    JSON.parse(cleaned); // throws if invalid — caught below

    return res.status(200).json({ success: true, rawJson: cleaned, provider: "gemini-1.5-flash" });
  } catch (err) {
    console.error("[AI Analyze] Fatal error calling Gemini:", err);
    return res.status(200).json({
      success: false,
      fallback: true,
      error: err?.message || "Unexpected server error during AI analysis",
    });
  }
}
