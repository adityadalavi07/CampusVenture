/**
 * Analysis Service — CampusVenture
 * Client-side job management for AI startup analysis.
 * All actual AI calls happen server-side through /api/ai/analyze.
 * This service manages job lifecycle, polling, and report retrieval from Supabase.
 */

import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type JobStatus = "pending" | "processing" | "validating" | "completed" | "failed" | "cancelled";

export interface AnalysisJob {
  id: string;
  startupId: string;
  ownerId: string;
  status: JobStatus;
  analysisVersion: number;
  aiProvider: string;
  modelId: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AnalysisReport {
  id: string;
  jobId: string;
  startupId: string;
  ownerId: string;
  analysisVersion: number;
  aiProvider: string;
  modelId: string;
  readinessScore: number;
  evidenceConfidence: number;
  riskExposure: number;
  investorGrade: string;
  verdict: string;
  reportJson: Record<string, unknown>;
  createdAt: string;
}

export interface AnalysisHistoryItem {
  reportId: string;
  analysisVersion: number;
  readinessScore: number;
  evidenceConfidence: number;
  riskExposure: number;
  investorGrade: string;
  verdict: string;
  modelId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------
function rowToJob(row: Record<string, unknown>): AnalysisJob {
  return {
    id:              String(row["id"]),
    startupId:       String(row["startup_id"]),
    ownerId:         String(row["owner_id"]),
    status:          (row["status"] as JobStatus) || "pending",
    analysisVersion: Number(row["analysis_version"] || 1),
    aiProvider:      String(row["ai_provider"] || "gemini"),
    modelId:         String(row["model_id"] || "gemini-2.0-flash"),
    errorMessage:    row["error_message"] as string | undefined,
    retryCount:      Number(row["retry_count"] || 0),
    createdAt:       String(row["created_at"]),
    startedAt:       row["started_at"] as string | undefined,
    completedAt:     row["completed_at"] as string | undefined,
  };
}

function rowToReport(row: Record<string, unknown>): AnalysisReport {
  return {
    id:                 String(row["id"]),
    jobId:              String(row["job_id"]),
    startupId:          String(row["startup_id"]),
    ownerId:            String(row["owner_id"]),
    analysisVersion:    Number(row["analysis_version"] || 1),
    aiProvider:         String(row["ai_provider"] || "gemini"),
    modelId:            String(row["model_id"] || "gemini-2.0-flash"),
    readinessScore:     Number(row["readiness_score"] || 0),
    evidenceConfidence: Number(row["evidence_confidence"] || 0),
    riskExposure:       Number(row["risk_exposure"] || 0),
    investorGrade:      String(row["investor_grade"] || "F"),
    verdict:            String(row["verdict"] || ""),
    reportJson:         (row["report_json"] as Record<string, unknown>) || {},
    createdAt:          String(row["created_at"]),
  };
}

// ---------------------------------------------------------------------------
// Analysis Service
// ---------------------------------------------------------------------------
export const analysisService = {
  /**
   * Submit a startup for AI analysis.
   * Calls the secure backend API — never touches AI keys on the client.
   * Returns the job ID on success.
   */
  async submitAnalysis(
    startupId: string,
    startup: Record<string, unknown>,
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: "You must be signed in to run an analysis." };
      }

      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ startupId, startup }),
      });

      const payload = await response.json() as Record<string, unknown>;

      if (!response.ok || !payload["success"]) {
        return {
          success: false,
          error: String(payload["error"] || payload["message"] || `HTTP ${response.status}`),
        };
      }

      return {
        success: true,
        jobId: String(payload["jobId"] || ""),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error submitting analysis",
      };
    }
  },

  /**
   * Poll a job until it completes or fails.
   * Resolves when status is "completed" | "failed" | "cancelled".
   */
  async pollJob(
    jobId: string,
    onProgress?: (status: JobStatus) => void,
    timeoutMs = 90_000,
    intervalMs = 2_500,
  ): Promise<{ status: JobStatus; reportId?: string; error?: string }> {
    const start = Date.now();

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          resolve({ status: "failed", error: "Analysis timed out waiting for completion" });
          return;
        }

        try {
          const { data, error } = await (supabase as unknown as {
            from: (t: string) => {
              select: (c: string) => {
                eq: (c: string, v: string) => {
                  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
                };
              };
            };
          })
            .from("startup_analysis_jobs")
            .select("status, error_message")
            .eq("id", jobId)
            .maybeSingle();

          if (error || !data) return; // Keep polling

          const status = data["status"] as JobStatus;
          onProgress?.(status);

          if (status === "completed" || status === "failed" || status === "cancelled") {
            clearInterval(interval);

            if (status !== "completed") {
              resolve({
                status,
                error: String(data["error_message"] || `Analysis ${status}`),
              });
              return;
            }

            // Fetch the report ID
            const { data: rep } = await (supabase as any)
              .from("startup_analysis_reports")
              .select("id")
              .eq("job_id", jobId)
              .maybeSingle();

            resolve({ status: "completed", reportId: rep?.id });
          }
        } catch {
          /* keep polling */
        }
      }, intervalMs);
    });
  },

  /**
   * Fetch the latest analysis report for a startup (owned by current user).
   */
  async getLatestReport(startupId: string): Promise<AnalysisReport | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("startup_analysis_reports")
        .select("*")
        .eq("startup_id", startupId)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return rowToReport(data as Record<string, unknown>);
    } catch {
      return null;
    }
  },

  /**
   * Fetch analysis history for a startup.
   */
  async getAnalysisHistory(startupId: string): Promise<AnalysisHistoryItem[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("startup_analysis_reports")
        .select("id, analysis_version, readiness_score, evidence_confidence, risk_exposure, investor_grade, verdict, model_id, created_at")
        .eq("startup_id", startupId)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(data)) return [];

      return (data as Record<string, unknown>[]).map((row) => ({
        reportId:           String(row["id"]),
        analysisVersion:    Number(row["analysis_version"] || 1),
        readinessScore:     Number(row["readiness_score"] || 0),
        evidenceConfidence: Number(row["evidence_confidence"] || 0),
        riskExposure:       Number(row["risk_exposure"] || 0),
        investorGrade:      String(row["investor_grade"] || "F"),
        verdict:            String(row["verdict"] || ""),
        modelId:            String(row["model_id"] || ""),
        createdAt:          String(row["created_at"]),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Fetch a full report by ID (ownership enforced by RLS).
   */
  async getReportById(reportId: string): Promise<AnalysisReport | null> {
    try {
      const { data, error } = await (supabase as any)
        .from("startup_analysis_reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();

      if (error || !data) return null;
      return rowToReport(data as Record<string, unknown>);
    } catch {
      return null;
    }
  },

  /**
   * Check if there's an active (pending/processing) job for a startup.
   * Used to prevent duplicate submissions.
   */
  async getActiveJob(startupId: string): Promise<AnalysisJob | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("startup_analysis_jobs")
        .select("*")
        .eq("startup_id", startupId)
        .eq("owner_id", user.id)
        .in("status", ["pending", "processing", "validating"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return rowToJob(data as Record<string, unknown>);
    } catch {
      return null;
    }
  },
};
