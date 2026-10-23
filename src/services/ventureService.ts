import { supabase } from "@/lib/supabase";
import type { ReviewStatus, StartupRecord } from "@/lib/store";

export function dbRowToStartupRecord(row: any): StartupRecord {
  return {
    id: String(row.id),
    name: row.name || "Untitled Venture",
    tagline: row.tagline || "",
    sector: row.sector || "AI",
    stage: row.stage || "Idea",
    location: row.location || "India",
    university: row.university || "",
    teamSize: Number(row.team_size ?? row.teamSize ?? 1),
    fundingRequired: Number(row.funding_required ?? row.fundingRequired ?? 0),
    revenue: Boolean(row.revenue),
    monthlyUsers: Number(row.monthly_users ?? row.monthlyUsers ?? 0),
    readiness: Number(row.readiness ?? 50),
    verified: Boolean(row.verified || row.status === "approved"),
    traction: row.traction || "",
    businessModel: row.business_model || row.businessModel || "",
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    problem: row.problem || "",
    solution: row.solution || "",
    videoUrl: row.video_url || row.videoUrl || "",
    deckName: row.deck_name || row.deckName || "",
    githubUrl: row.github_url || row.githubUrl || "",
    githubStars: Number(row.github_stars ?? row.githubStars ?? 0),
    status: (row.status as ReviewStatus) || (row.verified ? "approved" : "pending"),
    reviewNote: row.review_note || row.reviewNote || "",
    views: Number(row.views ?? 0),
    founder: row.founder || undefined,
    founderEmail: row.founder_email || row.founderEmail || undefined,
  };
}

export function startupRecordToDbRow(s: StartupRecord, founderId?: string): Record<string, any> {
  return {
    id: s.id,
    founder_id: founderId || undefined,
    founder: s.founder || null,
    founder_email: s.founderEmail || null,
    name: s.name,
    tagline: s.tagline || "",
    sector: s.sector || "AI",
    stage: s.stage || "Idea",
    location: s.location || "India",
    university: s.university || "",
    team_size: s.teamSize || 1,
    funding_required: s.fundingRequired || 0,
    revenue: s.revenue ?? false,
    monthly_users: s.monthlyUsers || 0,
    readiness: s.readiness || 50,
    verified: s.verified || s.status === "approved",
    traction: s.traction || "",
    business_model: s.businessModel || "",
    problem: s.problem || "",
    solution: s.solution || "",
    video_url: s.videoUrl || "",
    deck_name: s.deckName || "",
    github_url: s.githubUrl || "",
    github_stars: s.githubStars || 0,
    status: s.status,
    review_note: s.reviewNote || "",
    views: s.views || 0,
    updated_at: new Date().toISOString(),
  };
}

export const ventureService = {
  /**
   * Fetch all startups from Supabase. Returns empty array if none exist yet.
   */
  async getAllStartups(): Promise<StartupRecord[]> {
    try {
      const { data, error } = await (supabase as any)
        .from("startups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[VentureService] Supabase fetch notice:", error.message);
        return [];
      }

      if (Array.isArray(data)) {
        return data.map(dbRowToStartupRecord);
      }
      return [];
    } catch (err) {
      console.warn("[VentureService] Network error fetching startups:", err);
      return [];
    }
  },

  /**
   * Upsert a startup in Supabase cloud database
   */
  async upsertStartup(startup: StartupRecord, founderId?: string): Promise<boolean> {
    try {
      const payload = startupRecordToDbRow(startup, founderId);
      const { error } = await (supabase as any)
        .from("startups")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.warn("[VentureService] Supabase upsert notice:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[VentureService] Supabase upsert error:", err);
      return false;
    }
  },

  /**
   * Update review status and review note in Supabase
   */
  async updateStartupReview(id: string, status: ReviewStatus, reviewNote?: string): Promise<boolean> {
    try {
      const updates: Record<string, any> = {
        status,
        verified: status === "approved",
        review_note: reviewNote ?? "",
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from("startups")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.warn("[VentureService] Supabase review update notice:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[VentureService] Supabase review update error:", err);
      return false;
    }
  },

  /**
   * Delete startup if needed
   */
  async deleteStartup(id: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from("startups")
        .delete()
        .eq("id", id);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Subscribe to Supabase real-time postgres changes on table startups
   */
  subscribeToStartups(onStartupsUpdated: (startups: StartupRecord[]) => void) {
    let pollingTimer: any = null;

    // 1. Initial fetch
    ventureService.getAllStartups().then((initial) => {
      if (initial.length > 0) {
        onStartupsUpdated(initial);
      }
    });

    // 2. Real-time channel listener
    const channel = supabase
      .channel("public-startups-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "startups" },
        async () => {
          const fresh = await ventureService.getAllStartups();
          onStartupsUpdated(fresh);
        }
      )
      .subscribe();

    // 3. Periodic polling fallback every 6 seconds to ensure cross-device consistency
    pollingTimer = setInterval(async () => {
      const fresh = await ventureService.getAllStartups();
      if (fresh.length > 0) {
        onStartupsUpdated(fresh);
      }
    }, 6000);

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
      supabase.removeChannel(channel);
    };
  },
};
