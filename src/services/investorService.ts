import { supabase } from "@/lib/supabase";
import { DEMO_INVESTORS, type Investor, type Stage } from "@/lib/demo-data";

export const investorService = {
  /**
   * Fetch all registered investors from Supabase public.profiles, merged with institutional investors.
   */
  async getAllInvestors(): Promise<Investor[]> {
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, name, email, org, role, created_at")
        .eq("role", "investor");

      if (error) {
        console.warn("[InvestorService] Notice querying profiles for investors:", error.message);
        return DEMO_INVESTORS;
      }

      if (Array.isArray(data) && data.length > 0) {
        const dbInvestors: Investor[] = data.map((p: any, idx: number) => {
          const org = p.org || "Venture Capital Partner";
          const defaultSectors = ["AI", "SaaS", "FinTech", "HealthTech", "EdTech"];
          const defaultStages: Stage[] = ["Idea", "Prototype", "MVP", "Early Traction"];

          return {
            id: p.id,
            name: p.name || p.email?.split("@")[0] || "Accredited Investor",
            organization: org,
            type: "Seed / Pre-Seed Venture Fund",
            sectors: defaultSectors,
            stages: defaultStages,
            ticketMin: 25000,
            ticketMax: 250000,
            geography: "India & Global",
            thesis: `Early-stage backing for high-conviction student founders in technology, scalable software, and hardware ecosystems.`,
            verified: true,
          };
        });

        // Merge with DEMO_INVESTORS without duplicates by ID or name
        const combined = [...dbInvestors];
        for (const demo of DEMO_INVESTORS) {
          if (!combined.some((c) => c.id === demo.id || c.name.toLowerCase() === demo.name.toLowerCase())) {
            combined.push(demo);
          }
        }
        return combined;
      }

      return DEMO_INVESTORS;
    } catch (err) {
      console.warn("[InvestorService] Network error fetching investors:", err);
      return DEMO_INVESTORS;
    }
  },

  /**
   * Search investors by query
   */
  async searchInvestors(query: string): Promise<Investor[]> {
    const all = await this.getAllInvestors();
    const clean = query.trim().toLowerCase();
    if (!clean) return all;

    return all.filter((inv) => {
      const text = `${inv.name} ${inv.organization} ${inv.type} ${inv.sectors.join(" ")} ${inv.thesis} ${inv.geography}`.toLowerCase();
      return text.includes(clean);
    });
  },
};
