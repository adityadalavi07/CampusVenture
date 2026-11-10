/**
 * Deterministic Scoring Engine — CampusVenture Central AI Engine
 * Calculates the final readiness score from AI dimension evaluations
 * using documented, weighted rules. The language model never sets the final score.
 */

import type { AIAnalysisPayload, DimensionScore } from "./validator";
import { DIMENSION_WEIGHTS, getStageWeights } from "./prompts";

export interface ScoringResult {
  readinessScore: number;
  evidenceConfidence: number;
  riskExposure: number;
  investorGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  verdict: string;
  dimensionResults: DimensionScore[];
  hasCriticalFlaw: boolean;
  criticalFlawNote: string | null;
}

// ---------------------------------------------------------------------------
// Grade thresholds
// ---------------------------------------------------------------------------
function scoreToGrade(score: number): ScoringResult["investorGrade"] {
  if (score >= 85) return "A+";
  if (score >= 75) return "A";
  if (score >= 63) return "B";
  if (score >= 50) return "C";
  if (score >= 38) return "D";
  return "F";
}

function scoreToVerdict(score: number, hasCritical: boolean): string {
  if (hasCritical) return "Uninvestable — Critical Flaw Identified";
  if (score >= 85) return "Investment Ready — High Conviction Opportunity";
  if (score >= 75) return "Promising — Seed Investable with Targeted Improvements";
  if (score >= 63) return "Early Stage — Notable Gaps but Fundable Path Exists";
  if (score >= 50) return "Pre-Seed Potential — Significant Gaps Must Be Addressed";
  if (score >= 38) return "High Risk — Major Deficiencies Across Multiple Dimensions";
  return "Uninvestable in Current State — Pivot or Substantial Overhaul Required";
}

// ---------------------------------------------------------------------------
// Evidence confidence: how much of the submission was verifiable vs assumed
// ---------------------------------------------------------------------------
function computeEvidenceConfidence(dims: DimensionScore[]): number {
  if (dims.length === 0) return 0;
  const evidenceMap: Record<string, number> = {
    verified: 100,
    stated:    65,
    assumed:   35,
    missing:    0,
  };
  const scores = dims.map((d) => evidenceMap[d.evidence_level] ?? 35);
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}

// ---------------------------------------------------------------------------
// Risk exposure: driven by critical_risks severity and financial risk
// ---------------------------------------------------------------------------
function computeRiskExposure(payload: AIAnalysisPayload): number {
  let riskPoints = 0;
  const risks = payload.critical_risks || [];
  for (const r of risks) {
    if (r.severity === "critical") riskPoints += 25;
    else if (r.severity === "high") riskPoints += 15;
    else riskPoints += 8;
  }

  const finRisk = payload.financial_analysis?.financial_risk;
  if (finRisk === "critical") riskPoints += 20;
  else if (finRisk === "high") riskPoints += 12;
  else if (finRisk === "medium") riskPoints += 6;

  // Reality check findings
  for (const rc of payload.reality_check || []) {
    if (rc.severity === "critical") riskPoints += 15;
    else if (rc.severity === "high") riskPoints += 8;
  }

  return Math.min(100, riskPoints);
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------
export function computeScores(payload: AIAnalysisPayload, startupStage: string): ScoringResult {
  const stageWeights = getStageWeights(startupStage);
  const dims = payload.dimension_scores || [];

  // Merge AI-provided scores with stage weights
  // We trust the AI for SCORES but use our OWN weights for the formula
  let weightedSum = 0;
  let totalWeight = 0;

  const dimensionResults: DimensionScore[] = [];

  for (const [dimKey, weight] of Object.entries(stageWeights)) {
    // Find matching AI dimension (fuzzy match by key)
    const aiDim = dims.find(
      (d) =>
        d.key.toLowerCase().trim() === dimKey.toLowerCase().trim() ||
        d.key.toLowerCase().includes(dimKey.toLowerCase().split(" ")[0]) ||
        dimKey.toLowerCase().includes(d.key.toLowerCase().split(" ")[0]),
    );

    const score = aiDim ? Math.max(0, Math.min(100, Math.round(aiDim.score))) : 35; // 35 = neutral default for missing
    const insufficientEvidence = aiDim?.evidence_level === "missing" || !aiDim;

    // If evidence is missing, cap contribution at 50 to avoid inflating score
    const cappedScore = insufficientEvidence ? Math.min(score, 50) : score;

    weightedSum += cappedScore * (weight / 100);
    totalWeight += weight;

    dimensionResults.push({
      key:                   dimKey,
      score,
      weight,
      weighted_contribution: score * weight / 100,
      evidence_level:        aiDim?.evidence_level || "missing",
      critique:              aiDim?.critique || `No data provided for ${dimKey}.`,
      supporting_evidence:   aiDim?.supporting_evidence || "None",
      identified_weaknesses: aiDim?.identified_weaknesses || [],
      missing_information:   aiDim?.missing_information || [`${dimKey} data not provided`],
      recommendations:       aiDim?.recommendations || [],
      confidence:            aiDim?.confidence || "insufficient",
    });
  }

  const rawScore = totalWeight > 0 ? weightedSum * (100 / totalWeight) : 0;
  let readinessScore = Math.round(rawScore);

  // Check for critical flaws — do not let high average hide a fatal issue
  const hasCriticalFlaw = (payload.critical_risks || []).some((r) => r.severity === "critical") ||
    (payload.reality_check || []).some((r) => r.severity === "critical");

  let criticalFlawNote: string | null = null;
  if (hasCriticalFlaw) {
    readinessScore = Math.min(readinessScore, 35); // Cap at 35 if critical flaw exists
    const critRisk = payload.critical_risks?.find((r) => r.severity === "critical");
    criticalFlawNote = critRisk?.risk || "Critical flaw detected — score capped";
  }

  const evidenceConfidence = computeEvidenceConfidence(dimensionResults);
  const riskExposure = computeRiskExposure(payload);
  const investorGrade = scoreToGrade(readinessScore);
  const verdict = scoreToVerdict(readinessScore, hasCriticalFlaw);

  return {
    readinessScore,
    evidenceConfidence,
    riskExposure,
    investorGrade,
    verdict,
    dimensionResults,
    hasCriticalFlaw,
    criticalFlawNote,
  };
}

// ---------------------------------------------------------------------------
// Legacy compatibility: map new dimension keys → old 9-category keys
// (Used to update the existing startups.readiness column)
// ---------------------------------------------------------------------------
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  "Founder & Team Readiness":        "Team readiness",
  "Problem Validation":              "Problem clarity",
  "Market Opportunity":              "Market opportunity",
  "Product & Technical Feasibility": "Product readiness",
  "Product-Market Fit":              "Solution strength",
  "Business Model Viability":        "Business model",
  "Competitive Advantage":           "Competitive advantage",
  "Financial Readiness":             "Funding clarity",
  "Growth & Scalability":            "Traction",
};

export function toLegacyCategoryScores(dims: DimensionScore[]): Record<string, { score: number }> {
  const result: Record<string, { score: number }> = {};
  for (const dim of dims) {
    const legacyKey = LEGACY_CATEGORY_MAP[dim.key];
    if (legacyKey) {
      result[legacyKey] = { score: dim.score };
    }
  }
  return result;
}
