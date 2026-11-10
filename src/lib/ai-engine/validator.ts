/**
 * Response Validator — CampusVenture Central AI Engine
 * Validates AI-generated JSON against the expected schema before
 * any scores are computed or persisted. Prevents corrupt data entering the DB.
 */

export interface DimensionScore {
  key: string;
  score: number;
  weight: number;
  weighted_contribution: number;
  evidence_level: "verified" | "stated" | "assumed" | "missing";
  critique: string;
  supporting_evidence: string;
  identified_weaknesses: string[];
  missing_information: string[];
  recommendations: string[];
  confidence: "high" | "medium" | "low" | "insufficient";
}

export interface RealityCheckFinding {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  observation: string;
  concern: string;
  evidence_needed: string;
  recommended_action: string;
}

export interface CriticalRisk {
  risk: string;
  severity: "critical" | "high" | "medium";
  mitigation: string;
}

export interface NextMilestone {
  milestone: string;
  timeframe: string;
  success_criteria: string;
}

export interface AIAnalysisPayload {
  startup_summary: {
    name: string;
    one_line: string;
    stage_assessment: string;
  };
  readiness_score: number;
  evidence_confidence_score: number;
  risk_exposure_score: number;
  investor_grade: "A+" | "A" | "B" | "C" | "D" | "F";
  verdict: string;
  honest_take: string;
  dimension_scores: DimensionScore[];
  strengths: string[];
  weaknesses: string[];
  reality_check: RealityCheckFinding[];
  feature_scope_analysis: {
    mvp_features: string[];
    secondary_features: string[];
    premature_features: string[];
    missing_critical_features: string[];
    recommended_mvp_scope: string;
  };
  market_analysis: {
    addressable_market_assessment: string;
    customer_segment_clarity: "clear" | "partial" | "vague" | "missing";
    competitor_research_quality: "thorough" | "basic" | "minimal" | "missing";
    market_timing_assessment: string;
    differentiation_assessment: string;
  };
  financial_analysis: {
    funding_ask_assessment: string;
    revenue_model_clarity: "clear" | "partial" | "vague" | "missing";
    unit_economics_assessment: string;
    runway_assessment: string;
    financial_risk: "low" | "medium" | "high" | "critical";
  };
  growth_analysis: {
    optimistic_scenario: string;
    baseline_scenario: string;
    conservative_scenario: string;
    key_growth_assumptions: string[];
    scalability_assessment: string;
    customer_acquisition_assessment: string;
  };
  critical_risks: CriticalRisk[];
  recommended_actions: string[];
  next_milestones: NextMilestone[];
  missing_information: string[];
  assumptions: string[];
  limitations: string[];
}

export interface ValidationResult {
  valid: boolean;
  payload?: AIAnalysisPayload;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clampInt(val: unknown, min = 0, max = 100): number {
  const n = Math.round(Number(val));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function ensureArray(val: unknown, fallback: unknown[] = []): unknown[] {
  return Array.isArray(val) ? val : fallback;
}

function ensureStr(val: unknown, fallback = ""): string {
  return typeof val === "string" && val.trim() ? val.trim() : fallback;
}

const VALID_GRADES = new Set(["A+", "A", "B", "C", "D", "F"]);
const VALID_EVIDENCE = new Set(["verified", "stated", "assumed", "missing"]);
const VALID_CONFIDENCE = new Set(["high", "medium", "low", "insufficient"]);
const VALID_SEVERITY_4 = new Set(["critical", "high", "medium", "low"]);
const VALID_SEVERITY_3 = new Set(["critical", "high", "medium"]);

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------
export function validateAIResponse(raw: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // 2. Parse JSON
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(cleaned);
  } catch (e) {
    errors.push(`JSON parse failed: ${e instanceof Error ? e.message : String(e)}`);
    return { valid: false, errors, warnings };
  }

  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    errors.push("Response is not a JSON object");
    return { valid: false, errors, warnings };
  }

  // 3. Validate top-level scores
  const readiness_score        = clampInt(obj["readiness_score"]);
  const evidence_confidence_score = clampInt(obj["evidence_confidence_score"]);
  const risk_exposure_score    = clampInt(obj["risk_exposure_score"]);

  if (!Number.isFinite(Number(obj["readiness_score"])))
    errors.push("readiness_score is missing or not a number");
  if (!Number.isFinite(Number(obj["evidence_confidence_score"])))
    warnings.push("evidence_confidence_score missing — defaulting to 50");
  if (!Number.isFinite(Number(obj["risk_exposure_score"])))
    warnings.push("risk_exposure_score missing — defaulting to 50");

  const investor_grade = ensureStr(obj["investor_grade"]);
  if (!VALID_GRADES.has(investor_grade)) {
    warnings.push(`Invalid investor_grade "${investor_grade}" — defaulting to "F"`);
  }

  // 4. Validate dimension_scores
  const rawDims = ensureArray(obj["dimension_scores"]);
  if (rawDims.length === 0) {
    errors.push("dimension_scores array is empty or missing");
  }

  const dimension_scores: DimensionScore[] = rawDims.map((d: unknown, i) => {
    const dim = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
    const score = clampInt(dim["score"]);
    const weight = clampInt(dim["weight"], 0, 50);
    const evidence_level = VALID_EVIDENCE.has(String(dim["evidence_level"]))
      ? (dim["evidence_level"] as DimensionScore["evidence_level"])
      : "missing";
    const confidence = VALID_CONFIDENCE.has(String(dim["confidence"]))
      ? (dim["confidence"] as DimensionScore["confidence"])
      : "low";

    if (!dim["key"]) warnings.push(`dimension_scores[${i}] missing key`);

    return {
      key:                   ensureStr(dim["key"], `Dimension ${i + 1}`),
      score,
      weight,
      weighted_contribution: score * weight / 100,
      evidence_level,
      critique:              ensureStr(dim["critique"], "No critique provided"),
      supporting_evidence:   ensureStr(dim["supporting_evidence"], "None"),
      identified_weaknesses: ensureArray(dim["identified_weaknesses"]).map(String),
      missing_information:   ensureArray(dim["missing_information"]).map(String),
      recommendations:       ensureArray(dim["recommendations"]).map(String),
      confidence,
    };
  });

  // 5. Validate reality_check
  const reality_check: RealityCheckFinding[] = ensureArray(obj["reality_check"]).map((r: unknown) => {
    const rc = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const severity = VALID_SEVERITY_4.has(String(rc["severity"]))
      ? (rc["severity"] as RealityCheckFinding["severity"])
      : "medium";
    return {
      title:              ensureStr(rc["title"], "Finding"),
      severity,
      observation:        ensureStr(rc["observation"], ""),
      concern:            ensureStr(rc["concern"], ""),
      evidence_needed:    ensureStr(rc["evidence_needed"], ""),
      recommended_action: ensureStr(rc["recommended_action"], ""),
    };
  });

  // 6. Validate critical_risks
  const critical_risks: CriticalRisk[] = ensureArray(obj["critical_risks"]).map((r: unknown) => {
    const cr = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const severity = VALID_SEVERITY_3.has(String(cr["severity"]))
      ? (cr["severity"] as CriticalRisk["severity"])
      : "high";
    return {
      risk:       ensureStr(cr["risk"], "Risk not specified"),
      severity,
      mitigation: ensureStr(cr["mitigation"], "No mitigation specified"),
    };
  });

  // 7. Validate next_milestones
  const next_milestones: NextMilestone[] = ensureArray(obj["next_milestones"]).map((m: unknown) => {
    const ms = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
    return {
      milestone:        ensureStr(ms["milestone"], "Milestone"),
      timeframe:        ensureStr(ms["timeframe"], "TBD"),
      success_criteria: ensureStr(ms["success_criteria"], ""),
    };
  });

  // 8. Validate nested objects with safe defaults
  const rawFsa = (obj["feature_scope_analysis"] && typeof obj["feature_scope_analysis"] === "object"
    ? obj["feature_scope_analysis"]
    : {}) as Record<string, unknown>;

  const rawMkt = (obj["market_analysis"] && typeof obj["market_analysis"] === "object"
    ? obj["market_analysis"]
    : {}) as Record<string, unknown>;

  const rawFin = (obj["financial_analysis"] && typeof obj["financial_analysis"] === "object"
    ? obj["financial_analysis"]
    : {}) as Record<string, unknown>;

  const rawGrw = (obj["growth_analysis"] && typeof obj["growth_analysis"] === "object"
    ? obj["growth_analysis"]
    : {}) as Record<string, unknown>;

  const rawSum = (obj["startup_summary"] && typeof obj["startup_summary"] === "object"
    ? obj["startup_summary"]
    : {}) as Record<string, unknown>;

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const payload: AIAnalysisPayload = {
    startup_summary: {
      name:             ensureStr(rawSum["name"]),
      one_line:         ensureStr(rawSum["one_line"]),
      stage_assessment: ensureStr(rawSum["stage_assessment"]),
    },
    readiness_score,
    evidence_confidence_score: Number.isFinite(Number(obj["evidence_confidence_score"]))
      ? evidence_confidence_score : 50,
    risk_exposure_score: Number.isFinite(Number(obj["risk_exposure_score"]))
      ? risk_exposure_score : 50,
    investor_grade: (VALID_GRADES.has(investor_grade)
      ? investor_grade
      : "F") as AIAnalysisPayload["investor_grade"],
    verdict:    ensureStr(obj["verdict"], "Assessment incomplete"),
    honest_take: ensureStr(obj["honest_take"], ""),
    dimension_scores,
    strengths:   ensureArray(obj["strengths"]).map(String).slice(0, 5),
    weaknesses:  ensureArray(obj["weaknesses"]).map(String).slice(0, 5),
    reality_check,
    feature_scope_analysis: {
      mvp_features:              ensureArray(rawFsa["mvp_features"]).map(String),
      secondary_features:        ensureArray(rawFsa["secondary_features"]).map(String),
      premature_features:        ensureArray(rawFsa["premature_features"]).map(String),
      missing_critical_features: ensureArray(rawFsa["missing_critical_features"]).map(String),
      recommended_mvp_scope:     ensureStr(rawFsa["recommended_mvp_scope"]),
    },
    market_analysis: {
      addressable_market_assessment: ensureStr(rawMkt["addressable_market_assessment"]),
      customer_segment_clarity: (["clear","partial","vague","missing"].includes(String(rawMkt["customer_segment_clarity"]))
        ? rawMkt["customer_segment_clarity"] : "missing") as AIAnalysisPayload["market_analysis"]["customer_segment_clarity"],
      competitor_research_quality: (["thorough","basic","minimal","missing"].includes(String(rawMkt["competitor_research_quality"]))
        ? rawMkt["competitor_research_quality"] : "missing") as AIAnalysisPayload["market_analysis"]["competitor_research_quality"],
      market_timing_assessment:   ensureStr(rawMkt["market_timing_assessment"]),
      differentiation_assessment: ensureStr(rawMkt["differentiation_assessment"]),
    },
    financial_analysis: {
      funding_ask_assessment:    ensureStr(rawFin["funding_ask_assessment"]),
      revenue_model_clarity: (["clear","partial","vague","missing"].includes(String(rawFin["revenue_model_clarity"]))
        ? rawFin["revenue_model_clarity"] : "missing") as AIAnalysisPayload["financial_analysis"]["revenue_model_clarity"],
      unit_economics_assessment: ensureStr(rawFin["unit_economics_assessment"]),
      runway_assessment:         ensureStr(rawFin["runway_assessment"]),
      financial_risk: (["low","medium","high","critical"].includes(String(rawFin["financial_risk"]))
        ? rawFin["financial_risk"] : "high") as AIAnalysisPayload["financial_analysis"]["financial_risk"],
    },
    growth_analysis: {
      optimistic_scenario:            ensureStr(rawGrw["optimistic_scenario"]),
      baseline_scenario:              ensureStr(rawGrw["baseline_scenario"]),
      conservative_scenario:          ensureStr(rawGrw["conservative_scenario"]),
      key_growth_assumptions:         ensureArray(rawGrw["key_growth_assumptions"]).map(String),
      scalability_assessment:         ensureStr(rawGrw["scalability_assessment"]),
      customer_acquisition_assessment: ensureStr(rawGrw["customer_acquisition_assessment"]),
    },
    critical_risks,
    recommended_actions: ensureArray(obj["recommended_actions"]).map(String).slice(0, 7),
    next_milestones,
    missing_information: ensureArray(obj["missing_information"]).map(String),
    assumptions:         ensureArray(obj["assumptions"]).map(String),
    limitations:         ensureArray(obj["limitations"]).map(String),
  };

  return { valid: true, payload, errors: [], warnings };
}
