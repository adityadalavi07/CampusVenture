export type Role = "student" | "investor" | "university";

export type Stage = "Idea" | "Prototype" | "MVP" | "Early Traction" | "Revenue" | "Growth";

export const SECTORS = [
  "AI",
  "FinTech",
  "HealthTech",
  "EdTech",
  "AgriTech",
  "ClimateTech",
  "SaaS",
  "Cybersecurity",
  "DeepTech",
  "Consumer",
  "Mobility",
  "Web3",
  "Robotics",
  "Other",
] as const;

export const STAGES: Stage[] = [
  "Idea",
  "Prototype",
  "MVP",
  "Early Traction",
  "Revenue",
  "Growth",
];

export interface Startup {
  id: string;
  name: string;
  tagline: string;
  sector: string;
  stage: Stage;
  location: string;
  university: string;
  teamSize: number;
  fundingRequired: number;
  revenue: boolean;
  monthlyUsers: number;
  readiness: number;
  verified: boolean;
  traction: string;
  businessModel: string;
  updatedAt: string;
  founder?: string;
  founderEmail?: string;
}

export interface Investor {
  id: string;
  name: string;
  email?: string;
  organization: string;
  type: string;
  sectors: string[];
  stages: Stage[];
  ticketMin: number;
  ticketMax: number;
  geography: string;
  thesis: string;
  verified: boolean;
}

export const DEMO_STARTUPS: Startup[] = [];

export const DEMO_INVESTORS: Investor[] = [];

export interface DemoStudent {
  id: string;
  name: string;
  email: string;
  university: string;
  startupId: string;
}

export const DEMO_STUDENTS: DemoStudent[] = [];

export interface MatchResult {
  score: number;
  reasons: string[];
}

const WEIGHTS = {
  sector: 30,
  stage: 20,
  funding: 15,
  geography: 10,
  technology: 10,
  businessModel: 5,
  thesis: 10,
};

/** Transparent weighted match between an investor and a startup. */
export function matchScore(investor: Investor, startup: Startup): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  if (investor.sectors.includes(startup.sector)) {
    score += WEIGHTS.sector;
    reasons.push(`Sector preference matches (${startup.sector})`);
  }
  if (investor.stages.includes(startup.stage)) {
    score += WEIGHTS.stage;
    reasons.push(`Preferred stage matches (${startup.stage})`);
  }
  if (
    startup.fundingRequired >= investor.ticketMin &&
    startup.fundingRequired <= investor.ticketMax
  ) {
    score += WEIGHTS.funding;
    reasons.push("Funding requirement fits ticket size");
  }
  if (investor.geography === "Global" || startup.location.includes(investor.geography)) {
    score += WEIGHTS.geography;
    reasons.push(`Geography matches (${investor.geography})`);
  }
  if (["AI", "DeepTech", "Robotics", "SaaS"].includes(startup.sector)) {
    score += WEIGHTS.technology / 2;
  }
  if (startup.businessModel.toLowerCase().includes("saas")) {
    score += WEIGHTS.businessModel;
  }
  // Thesis similarity: keyword overlap, deliberately simple and explainable.
  const words = new Set(
    investor.thesis
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4),
  );
  const text = `${startup.tagline} ${startup.traction} ${startup.businessModel}`.toLowerCase();
  const overlap = [...words].filter((w) => text.includes(w)).length;
  if (overlap > 0) {
    score += Math.min(WEIGHTS.thesis, overlap * 4);
    reasons.push("Investment thesis keywords overlap");
  }
  // Readiness nudge inside remaining technology weight.
  score += Math.round((startup.readiness / 100) * (WEIGHTS.technology / 2));

  return { score: Math.min(99, Math.round(score)), reasons };
}

export function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

export const READINESS_WEIGHTS = [
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
