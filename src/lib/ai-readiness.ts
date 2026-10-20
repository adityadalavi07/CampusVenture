import { READINESS_WEIGHTS, type Startup } from "@/lib/demo-data";
import type { StartupRecord } from "@/lib/store";

export type HonestyLevel = "brutal" | "strict" | "balanced";
export type AIProvider = "gemini" | "openai" | "heuristic";

export interface CategoryEvaluation {
  score: number; // 0 - 100
  weight: number; // weight percentage
  status: "Strong" | "Moderate" | "Critical Concern" | "Fatal Gap";
  critique: string;
  honestFeedback: string;
  actionItem: string;
}

export interface AIReadinessResult {
  overallScore: number;
  investorGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  verdict: string;
  honestTake: string;
  redFlags: string[];
  fatalFlaws: string[];
  grillingQuestions: string[];
  categoryScores: Record<string, CategoryEvaluation>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  honestyLevel: HonestyLevel;
  providerUsed: AIProvider;
  modelUsed: string;
  assessedAt: string;
}

export interface AIConfig {
  provider: "gemini" | "openai";
  apiKey: string;
  model: string;
  honestyLevel: HonestyLevel;
}

const STORAGE_KEY_CONFIG = "campusventure.ai_config";
export const STORAGE_KEY_ASSESSMENT = "campusventure.ai_assessment";

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: "gemini",
  apiKey: "",
  model: "gemini-1.5-flash",
  honestyLevel: "brutal",
};

export function getAIConfig(): AIConfig {
  if (typeof window === "undefined") return DEFAULT_AI_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_AI_CONFIG,
        ...parsed,
        // Fall back to Vite environment variables if local key is empty
        apiKey:
          parsed.apiKey ||
          (parsed.provider === "gemini"
            ? (import.meta.env.VITE_GEMINI_API_KEY as string) || ""
            : (import.meta.env.VITE_OPENAI_API_KEY as string) || ""),
      };
    }
  } catch {
    /* ignore error */
  }

  const envGemini = (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
  const envOpenAI = (import.meta.env.VITE_OPENAI_API_KEY as string) || "";

  if (envGemini) {
    return { ...DEFAULT_AI_CONFIG, provider: "gemini", apiKey: envGemini };
  }
  if (envOpenAI) {
    return {
      ...DEFAULT_AI_CONFIG,
      provider: "openai",
      apiKey: envOpenAI,
      model: "gpt-4o-mini",
    };
  }

  return DEFAULT_AI_CONFIG;
}

export function saveAIConfig(patch: Partial<AIConfig>) {
  if (typeof window === "undefined") return;
  const current = getAIConfig();
  const updated = { ...current, ...patch };
  window.localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
}

export function getSavedAssessment(): AIReadinessResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ASSESSMENT);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

export function saveAssessment(result: AIReadinessResult) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_ASSESSMENT, JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

/** Compute overall weighted score from category scores */
export function computeWeightedScore(categoryScores: Record<string, { score: number }>): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { key, weight } of READINESS_WEIGHTS) {
    const item = categoryScores[key];
    const score = item ? item.score : 35;
    weightedSum += score * (weight / 100);
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum * (100 / totalWeight));
}

/** Map score to letter grade */
export function scoreToGrade(score: number): AIReadinessResult["investorGrade"] {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

/** Map score to investor verdict */
export function scoreToVerdict(score: number): string {
  if (score >= 80) return "Investment Ready — High Conviction";
  if (score >= 70) return "Promising — Seed Investable with Refinements";
  if (score >= 55) return "Early Stage — Notable Gaps & Execution Risks";
  if (score >= 40) return "High Risk — Major Deficiencies in Moat/Traction";
  return "Uninvestable in Current State — Pivot or Substantial Overhaul Needed";
}

function deriveCategoryStatus(score: number): CategoryEvaluation["status"] {
  if (score >= 75) return "Strong";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Critical Concern";
  return "Fatal Gap";
}

// ---------------------------------------------------------------------------
// Real API Integration: Google Gemini & OpenAI
// ---------------------------------------------------------------------------

function buildSystemPrompt(honestyLevel: HonestyLevel): string {
  const honestyDescriptions = {
    brutal: `You are an elite Tier-1 VC Investment Partner (think Benchmark, Sequoia, Founders Fund) and Y Combinator Group Partner conducting a strict, UNCOMPROMISING Investment Due Diligence.
HONESTY LEVEL: BRUTAL (ZERO SUGARCOATING / RAW VC TRUTH).
- Do NOT be polite or give false encouragement. Founders fail when advisors praise bad or mediocre ideas.
- If the problem is imaginary or low-frequency, mark it down ruthlessly.
- If the startup is an OpenAI or LLM wrapper without a structural data flywheel or distribution moat, call it out directly.
- If there is no real traction, zero recurring revenue, or fake vanity metrics, treat it as early unproven idea stage.
- Be brutally clear about why institutional investors will pass and what fatal flaws would kill the company.
- Score truthfully. If an idea is weak, a score of 30-48 is completely realistic and expected.`,
    strict: `You are a strict, analytical Angel Investor and Venture Partner.
HONESTY LEVEL: STRICT INSTITUTIONAL STANDARDS.
- Provide objective, highly candid scrutiny without sugarcoating.
- Question assumptions on unit economics, customer acquisition, and competitive moats.
- Highlight specific vulnerabilities that will block institutional funding.`,
    balanced: `You are a candid Venture Mentor.
HONESTY LEVEL: CONSTRUCTIVE & DIRECT.
- Give clear, realistic feedback pointing out both strengths and critical weaknesses.
- Be honest about gaps while providing high-value guidance on how to fix them.`,
  };

  return `${honestyDescriptions[honestyLevel]}

EVALUATION RUBRIC:
You must strictly evaluate the startup across the following 9 required categories (each weighted as indicated):
1. Problem clarity (weight: 15%): Real acute pain, validated customer hair-on-fire need, frequency, economic cost of inaction.
2. Solution strength (weight: 15%): 10x improvement over status quo, proprietary technology, IP, or workflow integration.
3. Market opportunity (weight: 15%): Realistic bottom-up TAM/SAM/SOM vs inflated vanity numbers; tailwinds.
4. Business model (weight: 10%): Monetization mechanics, pricing power, gross margins, CAC vs LTV viability.
5. Product readiness (weight: 10%): Working MVP, repo quality, demo, real architecture vs vaporware.
6. Traction (weight: 15%): Retention, recurring usage, paying customers, pilot LOIs, quantifiable weekly momentum.
7. Competitive advantage (weight: 10%): Defensibility, network effects, high switching costs, barriers to entry.
8. Team readiness (weight: 5%): Founder-market fit, technical execution ability, complementary co-founders.
9. Funding clarity (weight: 5%): Realistic ask, 18-month runway milestones, clear capital allocation plan.

OUTPUT FORMAT REQUIREMENTS:
You MUST reply with ONLY a single valid JSON object, with NO surrounding Markdown backticks or commentary.
Schema:
{
  "honestTake": "2-3 sentences of blunt, unfiltered truth that an investor whispers to their partners after the pitch",
  "redFlags": ["dealbreaker 1", "dealbreaker 2", "dealbreaker 3"],
  "fatalFlaws": ["structural flaw 1", "structural flaw 2"],
  "grillingQuestions": [
    "Toughest grilling question 1 you will be asked in a VC pitch",
    "Toughest grilling question 2",
    "Toughest grilling question 3"
  ],
  "categories": {
    "Problem clarity": {
      "score": <integer 0-100>,
      "critique": "detailed honest critique",
      "honestFeedback": "short unfiltered assessment",
      "actionItem": "exact priority action to fix"
    },
    "Solution strength": {
      "score": <integer 0-100>,
      "critique": "...",
      "honestFeedback": "...",
      "actionItem": "..."
    },
    "Market opportunity": { "score": <0-100>, "critique": "...", "honestFeedback": "...", "actionItem": "..." },
    "Business model": { "score": <0-100>, "critique": "...", "honestFeedback": "...", "actionItem": "..." },
    "Product readiness": { "score": <0-100>, "critique": "...", "honestFeedback": "...", "actionItem": "..." },
    "Traction": { "score": <0-100>, "critique": "...", "honestFeedback": "...", "actionItem": "..." },
    "Competitive advantage": { "score": <0-100>, "critique": "...", "honestFeedback": "...", "actionItem": "..." },
    "Team readiness": { "score": <0-100>, "critique": "...", "honestFeedback": "...", "actionItem": "..." },
    "Funding clarity": { "score": <0-100>, "critique": "...", "honestFeedback": "...", "actionItem": "..." }
  },
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "recommendations": ["...", "...", "..."]
}`;
}

function buildUserPrompt(startup: StartupRecord, honestyLevel: HonestyLevel): string {
  return `STARTUP PROFILE FOR DUE DILIGENCE:
Company Name: ${startup.name}
Tagline: ${startup.tagline}
Sector: ${startup.sector}
Stage: ${startup.stage}
University / Campus: ${startup.university}
Location: ${startup.location}
Founder: ${startup.founder || "Founder"}
Team Size: ${startup.teamSize}
Funding Required: $${startup.fundingRequired.toLocaleString()}
Revenue Generated: ${startup.revenue ? "Yes (Generating revenue)" : "No revenue yet (Pre-revenue)"}
Monthly Active Users: ${startup.monthlyUsers.toLocaleString()}
Stated Traction: "${startup.traction || "None specified"}"
Business Model: "${startup.businessModel || "None specified"}"
Problem Statement: "${startup.problem || "None specified"}"
Solution Statement: "${startup.solution || "None specified"}"
GitHub Connected: ${startup.githubUrl ? `Yes (${startup.githubUrl}, ${startup.githubStars} stars)` : "No"}
Pitch Deck Attached: ${startup.deckName ? `Yes (${startup.deckName})` : "No"}
Video Pitch Attached: ${startup.videoUrl ? `Yes (${startup.videoUrl})` : "No"}

CRITICAL TASK:
Perform a deep, analytical due diligence assessment of this student venture.
Honesty Level: ${honestyLevel.toUpperCase()}.
Remember: If the traction is weak, the moat is absent, or the business model is naive, do not give an unearned pass. Score realistically and identify the exact reasons. Return the JSON object matching the requested schema.`;
}

/** Call Google Gemini REST API */
async function callGeminiAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const selectedModel = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\n---\n\n${userPrompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `Gemini API returned status ${response.status}`;
    try {
      const errJson = JSON.parse(errorBody);
      if (errJson?.error?.message) message = errJson.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No text response returned from Gemini API.");
  }
  return text;
}

/** Call OpenAI Chat Completions REST API */
async function callOpenAIAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const selectedModel = model || "gpt-4o-mini";
  const url = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `OpenAI API returned status ${response.status}`;
    try {
      const errJson = JSON.parse(errorBody);
      if (errJson?.error?.message) message = errJson.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text response returned from OpenAI API.");
  }
  return text;
}

// ---------------------------------------------------------------------------
// Intelligent Rule-Based Engine (Fallback when no API Key is available)
// ---------------------------------------------------------------------------

export function evaluateStartupLocally(
  startup: StartupRecord,
  honestyLevel: HonestyLevel = "brutal",
): AIReadinessResult {
  const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
  const pWords = words(startup.problem);
  const sWords = words(startup.solution);
  const tWords = words(startup.traction);
  const mWords = words(startup.businessModel);

  // Honesty penalty factor: brutal mode is more rigorous
  const honestyMultiplier = honestyLevel === "brutal" ? 0.88 : honestyLevel === "strict" ? 0.94 : 1.0;

  // 1. Problem Clarity (15%)
  let problemScore = 30;
  if (pWords >= 15) problemScore += 25;
  if (pWords >= 35) problemScore += 20;
  if (/\b(cost|hours|waste|delay|loss|inefficiency|expensive|struggle)\b/i.test(startup.problem)) {
    problemScore += 15;
  }
  if (!startup.problem.trim()) problemScore = 15;
  problemScore = Math.min(95, Math.round(problemScore * honestyMultiplier));

  // 2. Solution Strength (15%)
  let solutionScore = 30;
  if (sWords >= 15) solutionScore += 20;
  if (sWords >= 35) solutionScore += 20;
  if (/\b(adaptive|proprietary|algorithm|patent|hardware|sensor|automated|real-time|deep)\b/i.test(startup.solution)) {
    solutionScore += 15;
  }
  if (startup.githubUrl) solutionScore += 10;
  if (!startup.solution.trim()) solutionScore = 15;
  solutionScore = Math.min(94, Math.round(solutionScore * honestyMultiplier));

  // 3. Market Opportunity (15%)
  let marketScore = 40;
  if (startup.monthlyUsers > 5000) marketScore += 35;
  else if (startup.monthlyUsers > 1000) marketScore += 25;
  else if (startup.monthlyUsers > 100) marketScore += 15;
  if (["AI", "FinTech", "HealthTech", "ClimateTech", "SaaS", "DeepTech"].includes(startup.sector)) {
    marketScore += 15;
  }
  marketScore = Math.min(92, Math.round(marketScore * honestyMultiplier));

  // 4. Business Model (10%)
  let modelScore = 30;
  if (mWords >= 6) modelScore += 20;
  if (startup.revenue) modelScore += 25;
  if (/\b(b2b|b2b2c|saas|subscription|licence|margin|per-seat|contract)\b/i.test(startup.businessModel)) {
    modelScore += 15;
  }
  if (!startup.revenue && honestyLevel === "brutal") modelScore -= 10;
  modelScore = Math.max(18, Math.min(92, Math.round(modelScore * honestyMultiplier)));

  // 5. Product Readiness (10%)
  let productScore = 25;
  if (startup.githubUrl) productScore += 25;
  if (startup.githubStars > 50) productScore += 15;
  if (startup.videoUrl) productScore += 20;
  if (startup.stage === "Growth" || startup.stage === "Revenue" || startup.stage === "Early Traction") {
    productScore += 15;
  }
  productScore = Math.min(96, Math.round(productScore * honestyMultiplier));

  // 6. Traction (15%)
  let tractionScore = 20;
  if (startup.revenue) tractionScore += 30;
  if (startup.monthlyUsers > 5000) tractionScore += 25;
  else if (startup.monthlyUsers > 1000) tractionScore += 18;
  else if (startup.monthlyUsers > 100) tractionScore += 10;
  if (tWords >= 8) tractionScore += 15;
  if (!startup.revenue && startup.monthlyUsers < 500 && honestyLevel === "brutal") {
    tractionScore = Math.min(38, tractionScore);
  }
  tractionScore = Math.max(15, Math.min(94, Math.round(tractionScore * honestyMultiplier)));

  // 7. Competitive Advantage (10%)
  let moatScore = 35;
  if (startup.githubStars > 200) moatScore += 20;
  if (/\b(patent|proprietary|dataset|integrations|network effect|lock-in|clinical|hospital)\b/i.test(
    `${startup.problem} ${startup.solution} ${startup.traction}`,
  )) {
    moatScore += 25;
  }
  if (honestyLevel === "brutal" && moatScore < 60) moatScore -= 10;
  moatScore = Math.max(18, Math.min(90, Math.round(moatScore * honestyMultiplier)));

  // 8. Team Readiness (5%)
  let teamScore = 35;
  if (startup.teamSize >= 3) teamScore += 30;
  else if (startup.teamSize >= 2) teamScore += 20;
  if (startup.university) teamScore += 15;
  if (startup.teamSize === 1 && honestyLevel === "brutal") {
    teamScore = 32; // Solo founder penalty in brutal VC mode
  }
  teamScore = Math.min(95, Math.round(teamScore * honestyMultiplier));

  // 9. Funding Clarity (5%)
  let fundingScore = 35;
  if (startup.fundingRequired > 0) fundingScore += 25;
  if (startup.deckName) fundingScore += 25;
  if (startup.fundingRequired > 300000 && !startup.revenue && honestyLevel === "brutal") {
    fundingScore -= 15; // Unrealistic ask without revenue
  }
  fundingScore = Math.max(20, Math.min(95, Math.round(fundingScore * honestyMultiplier)));

  const rawCategoryScores: Record<string, number> = {
    "Problem clarity": problemScore,
    "Solution strength": solutionScore,
    "Market opportunity": marketScore,
    "Business model": modelScore,
    "Product readiness": productScore,
    Traction: tractionScore,
    "Competitive advantage": moatScore,
    "Team readiness": teamScore,
    "Funding clarity": fundingScore,
  };

  const weightsMap = Object.fromEntries(READINESS_WEIGHTS.map((w) => [w.key, w.weight]));

  const categoryScores: Record<string, CategoryEvaluation> = {
    "Problem clarity": {
      score: problemScore,
      weight: weightsMap["Problem clarity"] || 15,
      status: deriveCategoryStatus(problemScore),
      critique:
        problemScore >= 75
          ? "Well-articulated customer pain point with clear indicators of cost and frequency."
          : problemScore >= 50
            ? "Problem is recognizable but lacks quantitative evidence of economic cost or daily urgency."
            : "Vague, hypothetical problem. Founders have not demonstrated direct customer discovery interviews.",
      honestFeedback:
        problemScore >= 75
          ? "Credible problem statement. Investors can immediately grasp who suffers from this."
          : "Sounds like a solution in search of a problem. Need hard numbers on how much time or money customers waste.",
      actionItem: "Interview 15 target users and document their exact annual budget lost to this specific pain.",
    },
    "Solution strength": {
      score: solutionScore,
      weight: weightsMap["Solution strength"] || 15,
      status: deriveCategoryStatus(solutionScore),
      critique:
        solutionScore >= 75
          ? "Clear value proposition with technical defensibility and clear workflow benefits."
          : solutionScore >= 50
            ? "Functionally viable solution, but risks being viewed as a feature rather than an independent company."
            : "High risk of being an undifferentiated wrapper around commercial LLMs/APIs with low technical depth.",
      honestFeedback:
        solutionScore >= 75
          ? "Solid product architecture. The workflow differentiation is clear."
          : "Big incumbents could clone this in a sprint. You need a 10x defensible angle.",
      actionItem: "Specify your proprietary data flywheel or unique technical mechanism in the architecture overview.",
    },
    "Market opportunity": {
      score: marketScore,
      weight: weightsMap["Market opportunity"] || 15,
      status: deriveCategoryStatus(marketScore),
      critique:
        marketScore >= 75
          ? "Compelling sector tailwinds with strong expansion potential beyond initial student/campus niche."
          : marketScore >= 50
            ? "Adequate niche, but TAM expansion path beyond initial college pilots needs rigorous sizing."
            : "Market appears too narrow or capped at university pilots without a clear commercial scale roadmap.",
      honestFeedback:
        marketScore >= 75
          ? "Large venture-scale upside if the team can expand into adjacent enterprise segments."
          : "University markets have notoriously slow procurement. Show how this translates to enterprise TAM.",
      actionItem: "Build a bottom-up TAM model demonstrating a path to $100M+ in annual revenue potential.",
    },
    "Business model": {
      score: modelScore,
      weight: weightsMap["Business model"] || 10,
      status: deriveCategoryStatus(modelScore),
      critique:
        modelScore >= 75
          ? "Demonstrated willingness to pay with clear recurring revenue drivers and healthy margins."
          : modelScore >= 50
            ? "Plausible revenue model, but unit economics and customer acquisition costs remain unvalidated."
            : "No pricing proof. Academic and student users are price-sensitive and churn rapidly.",
      honestFeedback:
        modelScore >= 75
          ? "Clean commercial structure. Investors will look closely at renewal and expansion rates."
          : "Without verified paid contracts, this is still a hobby project, not a proven business.",
      actionItem: "Convert at least 3 campus pilots into signed paid LOIs or upfront annual subscriptions.",
    },
    "Product readiness": {
      score: productScore,
      weight: weightsMap["Product readiness"] || 10,
      status: deriveCategoryStatus(productScore),
      critique:
        productScore >= 75
          ? "Live working application, code repository verified, and visual demonstrations accessible."
          : productScore >= 50
            ? "Functional prototype in place, but lacks automated tests, public demo, or polished onboarding."
            : "Vaporware risk. Incomplete code presence and missing video walkthrough.",
      honestFeedback:
        productScore >= 75
          ? "Tangible execution speed. Founders build and ship."
          : "Investors want to click a live URL, not read promises. Ship a public sandbox link.",
      actionItem: "Record a 2-minute unedited product demo walkthrough showing the core workflow end-to-end.",
    },
    Traction: {
      score: tractionScore,
      weight: weightsMap["Traction"] || 15,
      status: deriveCategoryStatus(tractionScore),
      critique:
        tractionScore >= 75
          ? "Definite user momentum, growing active users, and real pilot engagement metrics."
          : tractionScore >= 50
            ? "Early signs of adoption, but lacks cohort retention curves and weekly organic growth rate."
            : "Virtually zero validated traction. Growth claims are unsupported by verified analytics.",
      honestFeedback:
        tractionScore >= 75
          ? "Traction speaks louder than pitch decks. Keep proving weekly retention."
          : "Vanity signups do not equal traction. What is your 30-day cohort retention?",
      actionItem: "Publish cohort retention metrics showing weekly active engagement over at least 6 weeks.",
    },
    "Competitive advantage": {
      score: moatScore,
      weight: weightsMap["Competitive advantage"] || 10,
      status: deriveCategoryStatus(moatScore),
      critique:
        moatScore >= 75
          ? "Defensible competitive moat driven by data network effects, high switching friction, or IP."
          : moatScore >= 50
            ? "First-mover speed in campus niche, but defensibility against capitalized incumbents is thin."
            : "Zero visible moat. Easily duplicated by any software engineering team in a weekend.",
      honestFeedback:
        moatScore >= 75
          ? "Strong barrier to entry through localized distribution and domain integration."
          : "If OpenAI or Google updates their native features tomorrow, does this startup still exist?",
      actionItem: "Define and patent/lock in your proprietary data moat or university-specific integrations.",
    },
    "Team readiness": {
      score: teamScore,
      weight: weightsMap["Team readiness"] || 5,
      status: deriveCategoryStatus(teamScore),
      critique:
        teamScore >= 75
          ? "Complementary founding team with verified technical execution and institutional backing."
          : teamScore >= 50
            ? "Capable technical foundation, but lacks experienced sales, growth, or domain co-founders."
            : "Solo founder vulnerability with unproven technical delivery capability.",
      honestFeedback:
        teamScore >= 75
          ? "High energy, coachable founders with strong campus credibility."
          : "Need a balanced team: one who builds product, one who sells relentlessly.",
      actionItem: "Formally onboard and link your technical and business co-founders to the venture roster.",
    },
    "Funding clarity": {
      score: fundingScore,
      weight: weightsMap["Funding clarity"] || 5,
      status: deriveCategoryStatus(fundingScore),
      critique:
        fundingScore >= 75
          ? "Realistic capital ask mapped to 18-month milestones, runway discipline, and pitch deck."
          : fundingScore >= 50
            ? "Funding ask is within industry norm, but specific monthly burn breakdown is missing."
            : "Arbitrary valuation or capital ask with no financial projections or data-room materials.",
      honestFeedback:
        fundingScore >= 75
          ? "Professional financial ask that matches the startup's current development stage."
          : "Explain exactly which inflection milestones this round unlocks before the next capital raise.",
      actionItem: "Upload an explicit 18-month use-of-funds model to the venture data room.",
    },
  };

  const overallScore = computeWeightedScore(categoryScores);
  const investorGrade = scoreToGrade(overallScore);
  const verdict = scoreToVerdict(overallScore);

  // Generate honesty-specific critiques
  const redFlags: string[] = [];
  const fatalFlaws: string[] = [];
  const grillingQuestions: string[] = [];

  if (!startup.revenue) {
    redFlags.push("Pre-revenue with no demonstrated pricing power or customer payment validation");
  }
  if (startup.monthlyUsers < 1000) {
    redFlags.push("Low monthly user count (< 1,000 MAU) — market adoption is unproven");
  }
  if (!startup.videoUrl || !startup.deckName) {
    redFlags.push("Incomplete data room: missing pitch deck or video walkthrough destroys investor response rates");
  }
  if (startup.teamSize < 2) {
    redFlags.push("Single-founder risk: solo founders suffer an 80% lower early-stage term sheet rate");
  }
  if (!startup.githubUrl) {
    redFlags.push("No code repository connected — engineering diligence cannot verify technical claims");
  }

  // Ensure at least 2 red flags in brutal mode
  if (redFlags.length === 0) {
    redFlags.push("High reliance on campus procurement cycles which often experience 6–12 month budget freezes");
    redFlags.push("Defensibility against large incumbents entering the space remains unproven");
  }

  fatalFlaws.push("Vulnerability to platform risk if core foundation models (OpenAI/Google) ship adjacent features");
  if (!startup.revenue) {
    fatalFlaws.push("Lack of monetization feedback: users may love a free student tool but refuse to pay once paywalled");
  } else {
    fatalFlaws.push("High sales friction: institutional campus contracts have long sales cycles and high bureaucracy");
  }

  grillingQuestions.push(
    `If a well-funded competitor launches the exact same concept next month with $5M in funding, what is your unfair moat that stops them from taking your customers?`,
  );
  grillingQuestions.push(
    `Why haven't your current pilot users pre-paid for an annual contract right now if the pain point is truly urgent?`,
  );
  grillingQuestions.push(
    `What is your exact Customer Acquisition Cost (CAC) and how does it scale beyond your own university campus?`,
  );

  const honestTake =
    overallScore >= 75
      ? `${startup.name} displays legitimate execution and promising pilot engagement. However, top-tier VCs will ruthlessly test whether this is an enduring enterprise software company or merely a temporary campus feature that struggles to monetize at scale.`
      : overallScore >= 55
        ? `${startup.name} has identifiable potential, but its investment readiness is crippled by weak monetization evidence and an unproven moat. In its current form, most institutional funds will pass and advise you to 'keep in touch' until you show paid retention.`
        : `${startup.name} is currently uninvestable for institutional venture capital. The problem statement is too generic, there is zero verifiable customer traction, and the competitive moat is nonexistent. Stop pitching investors and focus 100% on building an indispensable MVP that 10 users cannot live without.`;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  Object.entries(categoryScores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .forEach(([cat, data]) => {
      strengths.push(`${cat}: ${data.critique} (${data.score}/100)`);
    });

  Object.entries(categoryScores)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3)
    .forEach(([cat, data]) => {
      weaknesses.push(`${cat}: ${data.honestFeedback} (${data.score}/100)`);
      recommendations.push(data.actionItem);
    });

  return {
    overallScore,
    investorGrade,
    verdict,
    honestTake,
    redFlags: redFlags.slice(0, 4),
    fatalFlaws: fatalFlaws.slice(0, 3),
    grillingQuestions: grillingQuestions.slice(0, 3),
    categoryScores,
    strengths,
    weaknesses,
    recommendations,
    honestyLevel,
    providerUsed: "heuristic",
    modelUsed: "Institutional Due Diligence Engine (Rule-based Fallback)",
    assessedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main Evaluation Dispatcher
// ---------------------------------------------------------------------------

export async function runAIReadinessAnalysis(
  startup: StartupRecord,
  configOverride?: Partial<AIConfig>,
): Promise<AIReadinessResult> {
  const config = { ...getAIConfig(), ...configOverride };
  const honestyLevel = config.honestyLevel || "brutal";

  // If no API key is provided, execute the thorough local heuristic engine
  if (!config.apiKey.trim()) {
    const localResult = evaluateStartupLocally(startup, honestyLevel);
    saveAssessment(localResult);
    return localResult;
  }

  const systemPrompt = buildSystemPrompt(honestyLevel);
  const userPrompt = buildUserPrompt(startup, honestyLevel);

  let rawJsonText = "";
  try {
    if (config.provider === "gemini") {
      rawJsonText = await callGeminiAPI(
        config.apiKey.trim(),
        config.model || "gemini-1.5-flash",
        systemPrompt,
        userPrompt,
      );
    } else {
      rawJsonText = await callOpenAIAPI(
        config.apiKey.trim(),
        config.model || "gpt-4o-mini",
        systemPrompt,
        userPrompt,
      );
    }
  } catch (apiError: unknown) {
    console.warn("AI API call failed, falling back to local due diligence engine:", apiError);
    // Return local evaluation with warning embedded
    const localResult = evaluateStartupLocally(startup, honestyLevel);
    const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
    localResult.honestTake = `[Notice: Live API error (${errMsg}) — showing local due diligence benchmark] ${localResult.honestTake}`;
    saveAssessment(localResult);
    return localResult;
  }

  // Parse and validate the response
  try {
    // Strip possible markdown fences if returned
    const cleaned = rawJsonText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const weightsMap = Object.fromEntries(READINESS_WEIGHTS.map((w) => [w.key, w.weight]));
    const categoryScores: Record<string, CategoryEvaluation> = {};

    for (const { key, weight } of READINESS_WEIGHTS) {
      const incoming = parsed.categories?.[key];
      const score = Math.max(0, Math.min(100, Math.round(Number(incoming?.score) || 40)));
      categoryScores[key] = {
        score,
        weight,
        status: deriveCategoryStatus(score),
        critique: incoming?.critique || `Assessment conducted for ${key}.`,
        honestFeedback: incoming?.honestFeedback || `Feedback noted for ${key}.`,
        actionItem: incoming?.actionItem || `Refine ${key} with validated customer proof.`,
      };
    }

    const overallScore = computeWeightedScore(categoryScores);
    const investorGrade = scoreToGrade(overallScore);
    const verdict = scoreToVerdict(overallScore);

    const result: AIReadinessResult = {
      overallScore,
      investorGrade,
      verdict,
      honestTake: parsed.honestTake || "Honest assessment generated.",
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.slice(0, 4) : [],
      fatalFlaws: Array.isArray(parsed.fatalFlaws) ? parsed.fatalFlaws.slice(0, 3) : [],
      grillingQuestions: Array.isArray(parsed.grillingQuestions)
        ? parsed.grillingQuestions.slice(0, 3)
        : [],
      categoryScores,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 3) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4) : [],
      honestyLevel,
      providerUsed: config.provider,
      modelUsed: config.provider === "gemini" ? config.model || "gemini-1.5-flash" : config.model || "gpt-4o-mini",
      assessedAt: new Date().toISOString(),
    };

    saveAssessment(result);
    return result;
  } catch (parseErr) {
    console.error("Failed to parse AI output, falling back to local engine:", parseErr, rawJsonText);
    const localResult = evaluateStartupLocally(startup, honestyLevel);
    saveAssessment(localResult);
    return localResult;
  }
}

/** Test API connection */
export async function testAIConnection(
  config: AIConfig,
): Promise<{ success: boolean; message: string }> {
  if (!config.apiKey.trim()) {
    return {
      success: false,
      message: "Please enter an API key before testing.",
    };
  }

  try {
    if (config.provider === "gemini") {
      const model = config.model || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey.trim()}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ping. Reply with: OK" }] }],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(text);
          if (j?.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        return { success: false, message: `Gemini API Error: ${msg}` };
      }
      return { success: true, message: `Connected to Gemini (${model}) successfully!` };
    } else {
      const model = config.model || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Ping. Reply with: OK" }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(text);
          if (j?.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        return { success: false, message: `OpenAI API Error: ${msg}` };
      }
      return { success: true, message: `Connected to OpenAI (${model}) successfully!` };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Network or Connection error: ${msg}` };
  }
}
