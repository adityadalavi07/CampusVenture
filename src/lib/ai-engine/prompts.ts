/**
 * Prompt Builder — CampusVenture Central AI Engine
 * Constructs structured evaluation prompts with startup-stage awareness.
 * Sanitises founder-submitted text to prevent prompt injection.
 */

import type { StartupRecord } from "@/lib/store";

// ---------------------------------------------------------------------------
// Sanitise — strip control chars and neutralise prompt-injection attempts
// ---------------------------------------------------------------------------
function sanitise(text: unknown, maxChars = 2000): string {
  if (text === null || text === undefined) return "Not provided";
  const str = String(text)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .replace(/---/g, "—")                               // separator injection
    .replace(/```/g, "'''")                             // code-block injection
    .trim();
  return str.length > maxChars ? str.slice(0, maxChars) + "… [truncated]" : str || "Not provided";
}

// ---------------------------------------------------------------------------
// Stage-aware weight overrides
// ---------------------------------------------------------------------------
export const DIMENSION_WEIGHTS: Record<string, number> = {
  "Founder & Team Readiness":      10,
  "Problem Validation":            15,
  "Market Opportunity":            12,
  "Product & Technical Feasibility": 12,
  "Product-Market Fit":            12,
  "Business Model Viability":      10,
  "Competitive Advantage":         10,
  "Financial Readiness":            9,
  "Growth & Scalability":           5,
  "Legal & Operational Risk":       5,
};

/** Early-stage startups are not penalised for absent revenue / traction */
export function getStageWeights(stage: string): Record<string, number> {
  const isEarly = /idea|concept|pre-?seed|pre-?mvp/i.test(stage);
  const isMvp   = /mvp|prototype|alpha|beta/i.test(stage);
  const isGrowth = /growth|revenue|series|scale/i.test(stage);

  const weights = { ...DIMENSION_WEIGHTS };
  if (isEarly) {
    weights["Problem Validation"]  = 20;
    weights["Founder & Team Readiness"] = 15;
    weights["Business Model Viability"] = 6;
    weights["Financial Readiness"]  = 4;
    weights["Growth & Scalability"] = 3;
  } else if (isMvp) {
    weights["Product & Technical Feasibility"] = 15;
    weights["Product-Market Fit"] = 15;
    weights["Financial Readiness"] = 7;
  } else if (isGrowth) {
    weights["Business Model Viability"] = 14;
    weights["Growth & Scalability"]     = 10;
    weights["Financial Readiness"]      = 12;
    weights["Product-Market Fit"]       = 14;
  }

  // Normalise to exactly 100
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  if (total !== 100) {
    const adj = Object.keys(weights)[0];
    weights[adj] += 100 - total;
  }
  return weights;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
export function buildSystemPrompt(stage: string): string {
  const weights = getStageWeights(stage);
  const dimensionList = Object.entries(weights)
    .map(([k, w]) => `  - "${k}" (weight: ${w}%)`)
    .join("\n");

  return `You are an elite Startup Due Diligence Analyst and Investment Readiness Evaluator.
Your task is to produce a rigorous, honest, structured evaluation of a student startup.

STAGE CONTEXT: "${stage}" — adjust your scoring rubric accordingly:
- Idea/Concept stage: evaluate potential, founder quality, problem clarity. Do NOT penalise for no revenue.
- MVP stage: evaluate prototype quality, early user feedback, technical feasibility.
- Growth stage: evaluate traction, revenue, unit economics, scalability.

EVALUATION DIMENSIONS AND WEIGHTS FOR THIS STAGE:
${dimensionList}

SCORING RULES:
1. Each dimension score must be an integer 0–100.
2. Assign scores that reflect REAL evidence in the submission. Do not inflate.
3. Missing information is NOT automatically a zero — mark it as "insufficient_evidence".
4. A critical flaw in one dimension (e.g. legal risk, unvalidated market) must surface in "critical_risks".
5. Do not let a high average hide a fatal flaw.

OUTPUT FORMAT:
You MUST reply with ONLY a single valid JSON object — no markdown, no backticks, no explanation text.
The JSON must exactly match this schema:

{
  "startup_summary": {
    "name": "string",
    "one_line": "string — your honest 1-line assessment",
    "stage_assessment": "string — is the submitted stage accurate?"
  },
  "readiness_score": <integer 0–100 — weighted average of all dimensions>,
  "evidence_confidence_score": <integer 0–100 — how much verifiable evidence was provided>,
  "risk_exposure_score": <integer 0–100 — 0=low risk, 100=extreme risk>,
  "investor_grade": <"A+" | "A" | "B" | "C" | "D" | "F">,
  "verdict": "string — one sentence investment verdict",
  "honest_take": "string — 2-3 sentences of blunt, unfiltered assessment",
  "dimension_scores": [
    {
      "key": "string — exact dimension name from the list above",
      "score": <integer 0–100>,
      "weight": <integer — weight percentage>,
      "weighted_contribution": <number — score * weight / 100>,
      "evidence_level": <"verified" | "stated" | "assumed" | "missing">,
      "critique": "string — specific, honest assessment",
      "supporting_evidence": "string — what evidence exists",
      "identified_weaknesses": ["string"],
      "missing_information": ["string — specific gaps that limit this score"],
      "recommendations": ["string — 1-3 specific, actionable steps"],
      "confidence": <"high" | "medium" | "low" | "insufficient">
    }
  ],
  "strengths": ["string — 3 genuine strengths with evidence"],
  "weaknesses": ["string — 3 real weaknesses with specifics"],
  "reality_check": [
    {
      "title": "string",
      "severity": <"critical" | "high" | "medium" | "low">,
      "observation": "string — what was submitted",
      "concern": "string — why this is concerning",
      "evidence_needed": "string",
      "recommended_action": "string"
    }
  ],
  "feature_scope_analysis": {
    "mvp_features": ["string — essential features for launch"],
    "secondary_features": ["string — good-to-have post-MVP"],
    "premature_features": ["string — too early or over-engineered"],
    "missing_critical_features": ["string — gaps that would block adoption"],
    "recommended_mvp_scope": "string — 2-3 sentence description of lean MVP"
  },
  "market_analysis": {
    "addressable_market_assessment": "string",
    "customer_segment_clarity": <"clear" | "partial" | "vague" | "missing">,
    "competitor_research_quality": <"thorough" | "basic" | "minimal" | "missing">,
    "market_timing_assessment": "string",
    "differentiation_assessment": "string"
  },
  "financial_analysis": {
    "funding_ask_assessment": "string",
    "revenue_model_clarity": <"clear" | "partial" | "vague" | "missing">,
    "unit_economics_assessment": "string",
    "runway_assessment": "string",
    "financial_risk": <"low" | "medium" | "high" | "critical">
  },
  "growth_analysis": {
    "optimistic_scenario": "string",
    "baseline_scenario": "string",
    "conservative_scenario": "string",
    "key_growth_assumptions": ["string"],
    "scalability_assessment": "string",
    "customer_acquisition_assessment": "string"
  },
  "critical_risks": [
    {
      "risk": "string",
      "severity": <"critical" | "high" | "medium">,
      "mitigation": "string"
    }
  ],
  "recommended_actions": ["string — top 5 prioritised actions, specific and measurable"],
  "next_milestones": [
    {
      "milestone": "string",
      "timeframe": "string — e.g. 30 days, 90 days, 6 months",
      "success_criteria": "string"
    }
  ],
  "missing_information": ["string — specific data points that would significantly improve the score"],
  "assumptions": ["string — assumptions made due to missing data"],
  "limitations": ["string — limitations of this analysis"]
}`;
}

// ---------------------------------------------------------------------------
// User prompt
// ---------------------------------------------------------------------------
export function buildUserPrompt(startup: StartupRecord): string {
  const words = (t: string) => (t || "").trim().split(/\s+/).filter(Boolean).length;

  return `STARTUP SUBMISSION FOR EVALUATION:

=== IDENTITY ===
Name: ${sanitise(startup.name)}
Tagline: ${sanitise(startup.tagline)}
Industry / Sector: ${sanitise(startup.sector)}
Stage: ${sanitise(startup.stage)}
Location: ${sanitise(startup.location)}
University / Institution: ${sanitise(startup.university)}
Team Size: ${startup.teamSize || 1}
Founded: ${startup.updatedAt ? new Date(startup.updatedAt).getFullYear() : "Unknown"}

=== PROBLEM STATEMENT (${words(startup.problem)} words) ===
"${sanitise(startup.problem, 3000)}"

=== PROPOSED SOLUTION (${words(startup.solution)} words) ===
"${sanitise(startup.solution, 3000)}"

=== TRACTION & VALIDATION ===
Revenue Generating: ${startup.revenue ? "Yes" : "No"}
Monthly Active Users: ${(startup.monthlyUsers || 0).toLocaleString()}
Traction Description: "${sanitise(startup.traction)}"

=== BUSINESS MODEL ===
"${sanitise(startup.businessModel)}"

=== FINANCIALS ===
Funding Required: $${(startup.fundingRequired || 0).toLocaleString()}

=== PRODUCT STATUS ===
GitHub Repository: ${startup.githubUrl ? `Connected (${startup.githubUrl}, ${startup.githubStars || 0} stars)` : "Not connected"}
Video Pitch: ${startup.videoUrl ? "Provided" : "Not provided"}
Pitch Deck: ${startup.deckName ? `Uploaded (${startup.deckName})` : "Not uploaded"}

=== INSTRUCTIONS ===
Evaluate this startup rigorously and honestly.
Stage context: "${startup.stage}" — apply appropriate stage-calibrated rubric.
Return only the JSON object matching the specified schema. No markdown. No commentary outside the JSON.`;
}
