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

export const DEMO_STARTUPS: Startup[] = [
  {
    id: "s1",
    name: "Lumen Labs",
    tagline: "Adaptive AI tutor that grades and coaches engineering coursework.",
    sector: "EdTech",
    stage: "Early Traction",
    location: "Pune, India",
    university: "COEP Technological University",
    teamSize: 4,
    fundingRequired: 150000,
    revenue: true,
    monthlyUsers: 6400,
    readiness: 78,
    verified: true,
    traction: "6.4k MAU, 3 campus pilots, ₹4.2L ARR",
    businessModel: "B2B2C campus licences",
    updatedAt: "2026-08-12",
    founder: "Aarav Mehta",
    founderEmail: "aarav@coep.ac.in",
  },
  {
    id: "s2",
    name: "CropSense",
    tagline: "Low-cost soil sensors with yield forecasting for smallholder farms.",
    sector: "AgriTech",
    stage: "MVP",
    location: "Nashik, India",
    university: "VJTI Mumbai",
    teamSize: 3,
    fundingRequired: 80000,
    revenue: false,
    monthlyUsers: 900,
    readiness: 64,
    verified: true,
    traction: "12 farm pilots, 900 monitored acres",
    businessModel: "Hardware + subscription",
    updatedAt: "2026-08-15",
    founder: "Pooja Deshmukh",
    founderEmail: "pooja@vjti.ac.in",
  },
  {
    id: "s3",
    name: "Vaultly",
    tagline: "Compliance automation for student-run fintech products.",
    sector: "FinTech",
    stage: "Prototype",
    location: "Bengaluru, India",
    university: "IIIT Bangalore",
    teamSize: 2,
    fundingRequired: 50000,
    revenue: false,
    monthlyUsers: 120,
    readiness: 51,
    verified: false,
    traction: "Design partners: 2 neobank startups",
    businessModel: "SaaS subscription",
    updatedAt: "2026-08-05",
    founder: "Rohan Iyer",
    founderEmail: "rohan@iiitb.ac.in",
  },
  {
    id: "s4",
    name: "NeuroPulse",
    tagline: "Wearable early-warning system for epileptic seizures.",
    sector: "HealthTech",
    stage: "Revenue",
    location: "Delhi, India",
    university: "IIT Delhi",
    teamSize: 6,
    fundingRequired: 400000,
    revenue: true,
    monthlyUsers: 2100,
    readiness: 84,
    verified: true,
    traction: "2.1k devices sold, 2 hospital partnerships",
    businessModel: "Device + care subscription",
    updatedAt: "2026-08-17",
    founder: "Ananya Sharma",
    founderEmail: "ananya@iitd.ac.in",
  },
  {
    id: "s5",
    name: "GridShift",
    tagline: "Campus-scale energy optimisation using load forecasting.",
    sector: "ClimateTech",
    stage: "MVP",
    location: "Hyderabad, India",
    university: "IIIT Hyderabad",
    teamSize: 5,
    fundingRequired: 220000,
    revenue: false,
    monthlyUsers: 40,
    readiness: 69,
    verified: true,
    traction: "18% energy savings in 3-building pilot",
    businessModel: "B2B SaaS",
    updatedAt: "2026-08-10",
    founder: "Vikram Nambiar",
    founderEmail: "vikram@bits-pilani.ac.in",
  },
  {
    id: "s6",
    name: "Sentrix",
    tagline: "Phishing simulation and security training for universities.",
    sector: "Cybersecurity",
    stage: "Early Traction",
    location: "Chennai, India",
    university: "Anna University",
    teamSize: 3,
    fundingRequired: 120000,
    revenue: true,
    monthlyUsers: 15200,
    readiness: 72,
    verified: true,
    traction: "15.2k trained users across 5 institutions",
    businessModel: "Per-seat SaaS",
    updatedAt: "2026-08-16",
    founder: "Sneha Sen",
    founderEmail: "sneha@ju.ac.in",
  },
];

export const DEMO_INVESTORS: Investor[] = [
  {
    id: "i1",
    name: "Anaya Krishnan",
    email: "anaya@northbridge.vc",
    organization: "Northbridge Seed",
    type: "Micro VC",
    sectors: ["EdTech", "SaaS", "AI"],
    stages: ["MVP", "Early Traction"],
    ticketMin: 50000,
    ticketMax: 250000,
    geography: "India",
    thesis: "Backing technical student founders building software for education and work.",
    verified: true,
  },
  {
    id: "i2",
    name: "Rohan Mehta",
    email: "rohan@mehtafamilyoffice.in",
    organization: "Mehta Family Office",
    type: "Angel",
    sectors: ["HealthTech", "DeepTech"],
    stages: ["Revenue", "Growth"],
    ticketMin: 100000,
    ticketMax: 500000,
    geography: "India",
    thesis: "Clinical-grade hardware with credible regulatory pathways.",
    verified: true,
  },
  {
    id: "i3",
    name: "Sara Lindqvist",
    email: "sara@terraclimate.fund",
    organization: "Terra Climate Fund",
    type: "VC",
    sectors: ["ClimateTech", "AgriTech", "Mobility"],
    stages: ["Prototype", "MVP", "Early Traction"],
    ticketMin: 100000,
    ticketMax: 400000,
    geography: "Global",
    thesis: "Measurable carbon and resource impact with defensible engineering.",
    verified: true,
  },
  {
    id: "i4",
    name: "Dev Arora",
    email: "dev@campusangels.in",
    organization: "Campus Angels Collective",
    type: "Syndicate",
    sectors: ["FinTech", "Cybersecurity", "SaaS"],
    stages: ["Idea", "Prototype", "MVP"],
    ticketMin: 25000,
    ticketMax: 100000,
    geography: "India",
    thesis: "First cheque for verified student founders shipping real products.",
    verified: false,
  },
];

export interface DemoStudent {
  id: string;
  name: string;
  email: string;
  university: string;
  startupId: string;
}

export const DEMO_STUDENTS: DemoStudent[] = [
  {
    id: "stu-1",
    name: "Aarav Mehta",
    email: "aarav@coep.ac.in",
    university: "COEP Technological University",
    startupId: "s1",
  },
  {
    id: "stu-2",
    name: "Pooja Deshmukh",
    email: "pooja@vjti.ac.in",
    university: "VJTI Mumbai",
    startupId: "s2",
  },
  {
    id: "stu-3",
    name: "Rohan Iyer",
    email: "rohan@iiitb.ac.in",
    university: "IIIT Bangalore",
    startupId: "s3",
  },
  {
    id: "stu-4",
    name: "Ananya Sharma",
    email: "ananya@iitd.ac.in",
    university: "IIT Delhi",
    startupId: "s4",
  },
  {
    id: "stu-5",
    name: "Vikram Nambiar",
    email: "vikram@bits-pilani.ac.in",
    university: "BITS Pilani",
    startupId: "s5",
  },
  {
    id: "stu-6",
    name: "Sneha Sen",
    email: "sneha@ju.ac.in",
    university: "Jadavpur University",
    startupId: "s6",
  },
];

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
