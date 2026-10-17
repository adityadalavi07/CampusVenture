import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  Sparkles,
  TriangleAlert,
  CalendarCheck,
  UserPlus,
  Users,
  Send,
  CheckCircle2,
  Clock,
  Mail,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ScoreRing } from "@/components/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_INVESTORS, READINESS_WEIGHTS, formatMoney, matchScore } from "@/lib/demo-data";
import { STATUS_LABEL, completeness, useVenture, type StartupRecord } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";

const TITLE = "Founder Dashboard — CampusVenture";
const DESCRIPTION =
  "Track investment readiness, profile completeness and investor interest for your student startup.";

export const Route = createFileRoute("/app/student/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: StudentDashboard,
});

/** Derive per-category scores from what the founder has actually filled in. */
function categoryScores(s: StartupRecord): Record<string, number> {
  const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
  const clamp = (n: number) => Math.max(20, Math.min(98, Math.round(n)));
  return {
    "Problem clarity": clamp(30 + words(s.problem) * 2.2),
    "Solution strength": clamp(30 + words(s.solution) * 2.2),
    "Market opportunity": clamp(45 + s.monthlyUsers / 200),
    "Business model": clamp(35 + words(s.businessModel) * 9),
    "Product readiness": clamp((s.githubUrl ? 55 : 30) + (s.videoUrl ? 20 : 0) + s.githubStars / 30),
    Traction: clamp((s.revenue ? 55 : 35) + words(s.traction) * 3),
    "Competitive advantage": clamp(40 + words(s.solution)),
    "Team readiness": clamp(45 + s.teamSize * 8),
    "Funding clarity": clamp((s.fundingRequired > 0 ? 55 : 25) + (s.deckName ? 25 : 0)),
  };
}

function assessment(s: StartupRecord, scores: Record<string, number>) {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const strengths = entries.slice(0, 3).map(([k, v]) => `${k} is solid (${v}/100)`);
  const weaknesses = entries
    .slice(-3)
    .reverse()
    .map(([k, v]) => `${k} needs work (${v}/100)`);
  const recs: string[] = [];
  if (!s.videoUrl) recs.push("Record a 2–3 minute video pitch");
  if (!s.deckName) recs.push("Upload your pitch deck to the data room");
  if (!s.githubUrl) recs.push("Connect your GitHub repository");
  if (s.problem.trim().split(/\s+/).filter(Boolean).length < 40)
    recs.push("Expand the problem statement with cost and frequency data");
  if (!s.revenue) recs.push("Show a path to first revenue with pricing");
  recs.push("Quantify the addressable market");
  return { strengths, weaknesses, recommendations: recs.slice(0, 4) };
}


interface WeeklyUpdate {
  id: string;
  date: string;
  content: string;
  tags: string[];
}

interface CoFounder {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "pending" | "accepted";
  invitedAt: string;
}

const DEFAULT_WEEKLY_UPDATES: WeeklyUpdate[] = [
  {
    id: "up-1",
    date: "Oct 16, 2026",
    content: "Shipped v1.2 onboarding with university email verification. Onboarded 120 pilot students and improved AI grading accuracy by 22%.",
    tags: ["ShippedFeature", "MetricGrowth"],
  },
  {
    id: "up-2",
    date: "Oct 09, 2026",
    content: "Conducted 15 user testing interviews with campus founders. Finalized student investor pitch deck and data room assets.",
    tags: ["CustomerFeedback", "MilestoneReached"],
  },
];

const AVAILABLE_TAGS = ["ShippedFeature", "MetricGrowth", "CustomerFeedback", "BugFixes", "Partnership"];

function StudentDashboard() {
  const { startups, saved, requests, updateStartup, notify } = useVenture();
  const { user } = useAuth();
  const STARTUP = startups[0]!;
  const [analyzing, setAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(true);

  // Dynamic founder name and university from authenticated user
  const founderName = user?.name || STARTUP.founder || "Founder";
  const universityName = user?.org || STARTUP.university || "University";

  // Auto-sync startup founder & university with authenticated user
  useEffect(() => {
    if (user?.name && user?.org && (STARTUP.founder !== user.name || STARTUP.university !== user.org)) {
      updateStartup(STARTUP.id, { founder: user.name, university: user.org });
    }
  }, [user, STARTUP.id, STARTUP.founder, STARTUP.university, updateStartup]);

  // Weekly updates state
  const [weeklyUpdates, setWeeklyUpdates] = useState<WeeklyUpdate[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("cv_student_weekly_updates");
        if (raw) return JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    return DEFAULT_WEEKLY_UPDATES;
  });
  const [newUpdateContent, setNewUpdateContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["ShippedFeature"]);

  // Co-founders state
  const [coFounders, setCoFounders] = useState<CoFounder[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("cv_student_cofounders");
        if (raw) return JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    return [];
  });
  const [isInviting, setIsInviting] = useState(false);
  const [cfName, setCfName] = useState("");
  const [cfEmail, setCfEmail] = useState("");
  const [cfRole, setCfRole] = useState("CTO & Technical Co-Founder");

  function handlePostUpdate() {
    if (!newUpdateContent.trim()) {
      toast.error("Please enter what your team worked on this past week.");
      return;
    }
    const newEntry: WeeklyUpdate = {
      id: `up-${Date.now()}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      content: newUpdateContent.trim(),
      tags: selectedTags.length > 0 ? selectedTags : ["ShippedFeature"],
    };
    const updated = [newEntry, ...weeklyUpdates];
    setWeeklyUpdates(updated);
    try {
      window.localStorage.setItem("cv_student_weekly_updates", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    setNewUpdateContent("");
    setSelectedTags(["ShippedFeature"]);
    notify("student", "Weekly Progress Logged", `Logged weekly sprint progress: "${newEntry.content.slice(0, 50)}..."`);
    toast.success("Weekly project progress saved successfully!");
  }

  function handleDeleteUpdate(id: string) {
    const updated = weeklyUpdates.filter((u) => u.id !== id);
    setWeeklyUpdates(updated);
    try {
      window.localStorage.setItem("cv_student_weekly_updates", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    toast.info("Update removed from sprint log.");
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSendInvite() {
    if (!cfName.trim()) {
      toast.error("Please enter your co-founder's full name.");
      return;
    }
    if (!cfEmail.trim() || !cfEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const cleanEmail = cfEmail.trim().toLowerCase();
    if (user?.email && cleanEmail === user.email.toLowerCase()) {
      toast.error("You cannot invite yourself as a co-founder.");
      return;
    }
    if (coFounders.some((c) => c.email.toLowerCase() === cleanEmail)) {
      toast.error("An invitation or active record for this email already exists.");
      return;
    }

    const newCf: CoFounder = {
      id: `cf-${Date.now()}`,
      name: cfName.trim(),
      email: cleanEmail,
      role: cfRole.trim() || "Co-Founder",
      status: "pending",
      invitedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };

    const updated = [...coFounders, newCf];
    setCoFounders(updated);
    try {
      window.localStorage.setItem("cv_student_cofounders", JSON.stringify(updated));
    } catch {
      /* ignore */
    }

    notify("student", "Co-Founder Request Sent", `Invitation email sent to ${cleanEmail} for ${newCf.role}.`);
    toast.success(`Request email dispatched to ${cleanEmail}`, {
      description: "Invitation sent! They can click their email link or you can simulate acceptance below.",
    });

    setCfName("");
    setCfEmail("");
    setCfRole("CTO & Technical Co-Founder");
    setIsInviting(false);
  }

  function handleAcceptInvite(id: string) {
    const target = coFounders.find((c) => c.id === id);
    if (!target) return;

    const updated = coFounders.map((c) =>
      c.id === id ? { ...c, status: "accepted" as const } : c
    );
    setCoFounders(updated);
    try {
      window.localStorage.setItem("cv_student_cofounders", JSON.stringify(updated));
    } catch {
      /* ignore */
    }

    const acceptedCount = updated.filter((c) => c.status === "accepted").length;
    updateStartup(STARTUP.id, { teamSize: 1 + acceptedCount });

    notify("student", "Co-Founder Accepted!", `🎉 ${target.name} joined ${STARTUP.name} as ${target.role}.`);
    toast.success(`🎉 ${target.name} is now an active Co-Founder!`, {
      description: `They are officially linked to ${STARTUP.name} as ${target.role}.`,
    });
  }

  function handleRemoveCoFounder(id: string) {
    const updated = coFounders.filter((c) => c.id !== id);
    setCoFounders(updated);
    try {
      window.localStorage.setItem("cv_student_cofounders", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    const acceptedCount = updated.filter((c) => c.status === "accepted").length;
    updateStartup(STARTUP.id, { teamSize: 1 + acceptedCount });
    toast.info("Co-founder removed from startup roster.");
  }

  const scores = categoryScores(STARTUP);
  const weighted = Math.round(
    READINESS_WEIGHTS.reduce((sum, { key, weight }) => sum + (scores[key] ?? 0) * (weight / 100), 0),
  );
  const review = assessment(STARTUP, scores);
  const pct = completeness(STARTUP);

  const matches = DEMO_INVESTORS.map((investor) => ({
    investor,
    ...matchScore(investor, STARTUP),
  })).sort((a, b) => b.score - a.score);

  const todo = [
    !STARTUP.problem && "Write your problem statement",
    !STARTUP.solution && "Describe your solution",
    !STARTUP.videoUrl && "Upload a 2–3 minute pitch video",
    !STARTUP.deckName && "Upload your pitch deck",
    !STARTUP.githubUrl && "Connect your GitHub project",
  ].filter(Boolean) as string[];

  function runAnalysis() {
    setAnalyzing(true);
    setShowResult(false);
    window.setTimeout(() => {
      const previous = STARTUP.readiness;
      updateStartup(STARTUP.id, { readiness: weighted });
      setAnalyzing(false);
      setShowResult(true);
      const delta = weighted - previous;
      toast.success(`Readiness re-scored: ${weighted}/100`, {
        description:
          delta === 0
            ? "No change since your last assessment."
            : `${delta > 0 ? "+" : ""}${delta} points versus your previous score.`,
      });
      notify("student", "AI assessment updated", `${STARTUP.name} now scores ${weighted}/100.`);
    }, 900);
  }

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Welcome back, {founderName}</h1>
            <p className="text-sm text-muted-foreground">
              {STARTUP.name} · {STARTUP.stage} · {universityName} ·{" "}
              {STATUS_LABEL[STARTUP.status]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/student/startup">Edit my startup</Link>
            </Button>
            <Button onClick={runAnalysis} disabled={analyzing}>
              <Sparkles className="size-4" aria-hidden="true" />
              {analyzing ? "Analyzing…" : "Analyze Startup with AI"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Investment readiness</CardTitle>
              <CardDescription>
                {STARTUP.readiness >= 75
                  ? "Strong potential"
                  : STARTUP.readiness >= 55
                    ? "Promising, needs polish"
                    : "Early — keep building"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {analyzing ? (
                <Skeleton className="size-[132px] rounded-full" />
              ) : (
                <ScoreRing value={STARTUP.readiness} />
              )}
              <p className="text-center text-xs text-muted-foreground">
                AI-generated readiness assessment, not investment advice.
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Category breakdown</CardTitle>
              <CardDescription>Weighted scoring across nine dimensions</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {READINESS_WEIGHTS.map(({ key, weight }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>{key}</span>
                    <span className="text-muted-foreground">
                      {scores[key]} · {weight}%
                    </span>
                  </div>
                  <Progress value={scores[key]} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Project Progress & Co-Founder Connect */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Card 1: Weekly Project Progress (Flexbox) */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarCheck className="size-4 text-primary" aria-hidden="true" />
                  Weekly Project Progress
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {weeklyUpdates.length} Sprints Logged
                </Badge>
              </div>
              <CardDescription>
                Write what your team built, shipped, and achieved this past week to show execution speed.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              {/* Flexbox Compose Area */}
              <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-3">
                <Textarea
                  value={newUpdateContent}
                  onChange={(e) => setNewUpdateContent(e.target.value)}
                  placeholder="What did you build/ship this past week? (e.g. Launched MVP to 120 campus students, integrated auth, and fixed 14 bugs...)"
                  className="min-h-[85px] resize-none bg-background text-sm"
                />
                
                {/* Milestone Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1">Tags:</span>
                  {AVAILABLE_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Pinned to your venture timeline
                  </span>
                  <Button
                    size="sm"
                    onClick={handlePostUpdate}
                    disabled={!newUpdateContent.trim()}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Send className="size-3.5" aria-hidden="true" />
                    Post Update
                  </Button>
                </div>
              </div>

              {/* Feed of updates */}
              <div className="flex-1 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {weeklyUpdates.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No weekly updates logged yet. Share your team's latest shipping sprint above!
                  </div>
                ) : (
                  weeklyUpdates.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Clock className="size-3 text-primary" />
                          {item.date}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteUpdate(item.id)}
                            className="text-muted-foreground opacity-60 hover:text-destructive hover:opacity-100 transition-opacity"
                            title="Delete this update"
                            aria-label="Delete this update"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Co-Founders & Team Connect */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-primary" aria-hidden="true" />
                  Co-Founders &amp; Team
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {1 + coFounders.filter((c) => c.status === "accepted").length} Co-Founders Active
                </Badge>
              </div>
              <CardDescription>
                Connect and invite your co-founder via their university email. Once accepted, they appear alongside you on the startup profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              {/* Team Roster */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {/* Primary / Lead Founder (Authenticated User) */}
                <div className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold leading-tight">{founderName}</p>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 px-1.5">
                        Lead Founder
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || "founder@university.ac.in"}</p>
                    <p className="text-[11px] text-muted-foreground/80">{universityName}</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                    CEO / Lead
                  </Badge>
                </div>

                {/* Co-Founders List */}
                {coFounders.map((cf) => (
                  <div
                    key={cf.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-tight">{cf.name}</p>
                        {cf.status === "accepted" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Active Co-Founder
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <Clock className="size-3" /> Invite Sent
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{cf.email}</p>
                      <p className="text-[11px] text-muted-foreground/80">{cf.role}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {cf.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcceptInvite(cf.id)}
                          className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 font-medium"
                          title="Simulate co-founder accepting invitation from their email"
                        >
                          <CheckCircle2 className="size-3 mr-1" />
                          Simulate Accept
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveCoFounder(cf.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove co-founder"
                        aria-label="Remove co-founder"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {coFounders.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-1">
                    Solo founder right now. Invite a technical or business co-founder below!
                  </p>
                )}
              </div>

              {/* Invite Co-Founder Form / Toggle */}
              {isInviting ? (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-xs">
                  <div className="flex items-center justify-between font-medium text-foreground">
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="size-3.5 text-primary" />
                      Invite New Co-Founder via Email
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsInviting(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-2">
                    <Input
                      placeholder="Full Name (e.g. Rohan Deshmukh)"
                      value={cfName}
                      onChange={(e) => setCfName(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                    <Input
                      type="email"
                      placeholder="University Email (e.g. rohan@sguk.ac.in)"
                      value={cfEmail}
                      onChange={(e) => setCfEmail(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                    <Input
                      placeholder="Role (e.g. CTO & Co-Founder, Chief Product Officer)"
                      value={cfRole}
                      onChange={(e) => setCfRole(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[10px] text-muted-foreground">
                      An invitation email with access link will be dispatched.
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsInviting(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSendInvite}
                        className="h-7 text-xs gap-1"
                      >
                        <Send className="size-3" />
                        Send Invite
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviting(true)}
                  className="w-full border-dashed text-xs gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Connect &amp; Invite Co-Founder
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile completeness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{pct}%</span>
                <span className="text-xs text-muted-foreground">complete</span>
              </div>
              <Progress value={pct} />
              <ul className="space-y-1 text-sm text-muted-foreground">
                {todo.length === 0 ? (
                  <li>· Everything essential is filled in.</li>
                ) : (
                  todo.map((t) => <li key={t}>· {t}</li>)
                )}
              </ul>
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/student/startup">Complete profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Stat label="Investor profile views" value={String(STARTUP.views)} />
              <Stat label="Saved by investors" value={String(saved.length)} />
              <Stat
                label="Connection requests"
                value={String(
                  requests.filter((r) => r.startupId === STARTUP.id && r.kind === "connection")
                    .length,
                )}
              />
              <Stat
                label="Data-room requests"
                value={String(
                  requests.filter((r) => r.startupId === STARTUP.id && r.kind === "dataroom").length,
                )}
              />

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
                <Button variant="link" size="sm" className="mt-1">
                  Propose a meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {showResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest AI assessment</CardTitle>
              <CardDescription>
                Live scoring from your current profile · weighted score {weighted}/100
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <Section title="Strengths" items={review.strengths} />
              <Section title="Weaknesses" items={review.weaknesses} />
              <Section title="Recommendations" items={review.recommendations} />
            </CardContent>
          </Card>
        )}


        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investor matches</CardTitle>
            <CardDescription>Transparent weighted matching against your startup profile</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {matches.map(({ investor, score, reasons }) => (
              <div key={investor.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{investor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {investor.organization} · {investor.type}
                    </p>
                  </div>
                  <Badge variant="secondary">{score}% match</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{investor.thesis}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Ticket {formatMoney(investor.ticketMin)}–{formatMoney(investor.ticketMax)} ·{" "}
                  {investor.geography}
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {reasons.slice(0, 3).map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    notify(
                      "investor",
                      "New founder outreach",
                      `${STARTUP.name} requested a connection.`,
                    );
                    toast.success(`Connection request sent to ${investor.name}`);
                  }}
                >
                  Request connection
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          Demo build: data is seeded locally and authentication is intentionally disabled.
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>· {i}</li>
        ))}
      </ul>
    </div>
  );
}
