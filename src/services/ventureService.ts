import { supabase } from "@/lib/supabase";
import { DEMO_STARTUPS } from "@/lib/demo-data";
import type { Startup, Venture, VentureApplication } from "@/types/database";

export const ventureService = {
  /**
   * Fetch all startups/ventures from Supabase, falling back to demo data if the table is empty
   */
  async getVentures(sector?: string, stage?: string): Promise<Startup[]> {
    try {
      let query = supabase.from("startups").select("*");

      if (sector && sector !== "All") {
        query = query.eq("sector", sector);
      }
      if (stage && stage !== "All") {
        query = query.eq("stage", stage);
      }

      const { data, error } = await query;

      if (error) {
        console.warn("Could not query startups table from Supabase, using demo data fallback:", error.message);
        return filterDemoStartups(sector, stage);
      }

      if (data && data.length > 0) {
        return data as Startup[];
      }

      // If remote table has no rows yet, return demo startups for rich preview
      return filterDemoStartups(sector, stage);
    } catch (err) {
      console.error("Venture fetch error:", err);
      return filterDemoStartups(sector, stage);
    }
  },

  /**
   * Fetch a single venture/startup by ID
   */
  async getVentureById(id: string): Promise<Startup | null> {
    try {
      const { data, error } = await (supabase as any)
        .from("startups")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        return data as Startup;
      }
    } catch (e) {
      // Fall through to demo data
    }

    const demo = DEMO_STARTUPS.find((s) => s.id === id);
    return demo ? (demo as unknown as Startup) : null;
  },

  /**
   * Create a new venture/startup in Supabase
   */
  async createVenture(ventureData: Partial<Venture>): Promise<Venture> {
    const payload = {
      ...ventureData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from("startups")
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      console.error("Error creating startup in Supabase:", error.message);
      throw error;
    }

    return data as Venture;
  },

  /**
   * Update an existing venture
   */
  async updateVenture(id: string, updates: Partial<Venture>): Promise<Venture> {
    const { data, error } = await (supabase as any)
      .from("startups")
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating startup in Supabase:", error.message);
      throw error;
    }

    return data as Venture;
  },

  /**
   * Submit an investment or mentorship application for a venture
   */
  async submitApplication(application: {
    venture_id: string;
    applicant_id: string;
    type: "investment" | "mentorship" | "team_member" | "partnership";
    message: string;
  }): Promise<VentureApplication> {
    const payload = {
      ...application,
      status: "pending" as const,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from("venture_applications")
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      console.warn("Venture applications table insertion notice:", error.message);
      // Return optimistic record so UI flow succeeds
      return { id: `app-${Date.now()}`, ...payload };
    }

    return data as VentureApplication;
  },
};

function filterDemoStartups(sector?: string, stage?: string): Startup[] {
  let list = DEMO_STARTUPS as unknown as Startup[];
  if (sector && sector !== "All") {
    list = list.filter((s) => s.sector.toLowerCase() === sector.toLowerCase());
  }
  if (stage && stage !== "All") {
    list = list.filter((s) => s.stage === stage);
  }
  return list;
}
