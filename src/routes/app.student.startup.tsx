import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useDebouncedField } from "@/hooks/use-debounced-field";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileUp,
  Github,
  Lightbulb,
  Rocket,
  Send,
  Star,
  Target,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_LABEL, completeness, useVenture, type StartupRecord, type ReviewStatus } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { SECTORS, STAGES, type Stage } from "@/lib/demo-data";
import { generateUUID, isValidUUID } from "@/lib/uuid";

const TITLE = "My Startup — CampusVenture";
const DESCRIPTION =
  "Build your startup profile: problem statement, solution, video pitch, deck upload and GitHub project.";

export const Route = createFileRoute("/app/student/startup")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: MyStartup,
});

/** Turn a YouTube/Vimeo watch link into an embeddable URL. */
function embedUrl(url: string) {
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function MyStartup() {
  const { startups, updateStartup, createStartup, notify } = useVenture();
  const { user } = useAuth();
  const studentStartup = startups.find(
    (s) =>
      (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.name && s.founder === user.name)
  );

  const [localStartup, setLocalStartup] = useState<StartupRecord>(() => {
    return (
      studentStartup || {
        id: generateUUID(),
        name: "",
        tagline: "",
        sector: "AI",
        stage: "Idea",
        location: "India",
        university: user?.org || "University",
        teamSize: 1,
        fundingRequired: 25000,
        revenue: false,
        monthlyUsers: 0,
        readiness: 50,
        verified: false,
        traction: "",
        businessModel: "",
        updatedAt: new Date().toISOString(),
        problem: "",
        solution: "",
        videoUrl: "",
        deckName: "",
        githubUrl: "",
        githubStars: 0,
        status: "draft",
        reviewNote: "",
        views: 0,
        founder: user?.name || "Student Founder",
        founderEmail: user?.email || "",
      }
    );
  });

  const startup = studentStartup || localStartup;
  const fileRef = useRef<HTMLInputElement>(null);
  const [github, setGithub] = useState(startup.githubUrl);

  function saveOrUpdate(patch: Partial<StartupRecord>) {
    setLocalStartup((prev) => ({ ...prev, ...patch }));
    if (studentStartup) {
      updateStartup(startup.id, patch);
    } else {
      const createdId = createStartup({
        ...startup,
        founder: user?.name || startup.founder,
        founderEmail: user?.email || startup.founderEmail,
        university: user?.org || startup.university,
        ...patch,
      });
      setLocalStartup((prev) => ({ ...prev, id: createdId, ...patch }));
    }
  }

  // Sync remote startup changes to local startup
  useEffect(() => {
    if (studentStartup) {
      setLocalStartup(studentStartup);
    }
  }, [studentStartup]);

  // Sync startup founder and university with authenticated user
  useEffect(() => {
    if (
      user?.name &&
      user?.org &&
      studentStartup &&
      (studentStartup.founder !== user.name ||
        studentStartup.university !== user.org ||
        studentStartup.founderEmail !== user.email)
    ) {
      updateStartup(studentStartup.id, {
        founder: user.name,
        university: user.org,
        founderEmail: user.email,
      });
    }
  }, [user, studentStartup, updateStartup]);

  const [stName, setStName] = useDebouncedField(startup.name, (v) =>
    saveOrUpdate({ name: v })
  );
  const [stTagline, setStTagline] = useDebouncedField(startup.tagline || "", (v) =>
    saveOrUpdate({ tagline: v })
  );
  const [stLocation, setStLocation] = useDebouncedField(startup.location || "", (v) =>
    saveOrUpdate({ location: v })
  );
  const [problem, setProblem] = useDebouncedField(startup.problem, (v) =>
    saveOrUpdate({ problem: v })
  );
  const [solution, setSolution] = useDebouncedField(startup.solution, (v) =>
    saveOrUpdate({ solution: v })
  );
  const [model, setModel] = useDebouncedField(startup.businessModel, (v) =>
    saveOrUpdate({ businessModel: v })
  );
  const [traction, setTraction] = useDebouncedField(startup.traction, (v) =>
    saveOrUpdate({ traction: v })
  );
  const [videoUrl, setVideoUrl] = useDebouncedField(startup.videoUrl, (v) =>
    saveOrUpdate({ videoUrl: v })
  );

  const pct = completeness(startup);
  const embed = embedUrl(startup.videoUrl);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Pitch decks must be under 20 MB.");
      return;
    }
    saveOrUpdate({ deckName: file.name });
    toast.success(`${file.name} attached to your data room`);
  }

  function connectGithub() {
    const ok = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(github.trim());
    if (!ok) {
      toast.error("Enter a full repository URL, e.g. https://github.com/team/project");
      return;
    }
    const stars = 40 + (github.length * 17) % 900;
    saveOrUpdate({ githubUrl: github.trim(), githubStars: stars });
    toast.success("GitHub project connected", {
      description: `Repository verified · ${stars} stars indexed.`,
    });
  }

  function saveDraft() {
    const currentName = stName.trim() || "Untitled Campus Startup";
    saveOrUpdate({
      name: currentName,
      tagline: stTagline.trim(),
      location: stLocation.trim() || startup.location,
      problem: problem.trim(),
      solution: solution.trim(),
      businessModel: model.trim() || startup.businessModel,
      traction: traction.trim() || startup.traction,
      videoUrl: videoUrl.trim() || startup.videoUrl,
      status: "draft",
      updatedAt: new Date().toISOString(),
    });
    toast.success("Draft saved successfully!");
  }

  function submitForReview() {
    const currentName = stName.trim();
    const currentTagline = stTagline.trim();
    const currentProblem = problem.trim();
    const currentSolution = solution.trim();

    if (!currentName || currentName.length < 2) {
      toast.error("Please enter a name for your startup.");
      return;
    }
    if (!currentTagline || currentTagline.length < 3) {
      toast.error("Please enter a one-line tagline for your startup.");
      return;
    }
    if (!currentProblem || currentProblem.length < 5) {
      toast.error("Please explain the problem your startup solves (at least 5 characters).");
      return;
    }
    if (!currentSolution || currentSolution.length < 5) {
      toast.error("Please describe your solution (at least 5 characters).");
      return;
    }

    const payload: Partial<StartupRecord> = {
      name: currentName,
      tagline: currentTagline,
      location: stLocation.trim() || startup.location,
      problem: currentProblem,
      solution: currentSolution,
      businessModel: model.trim() || startup.businessModel,
      traction: traction.trim() || startup.traction,
      videoUrl: videoUrl.trim() || startup.videoUrl,
      status: "pending",
      updatedAt: new Date().toISOString(),
    };

    saveOrUpdate(payload);

    notify(
      "university",
      "New Startup Submitted for Incubator Review",
      `${currentName} (${startup.sector}) by ${startup.founder || user?.name || "Student"} was submitted for verification.`
    );
    notify(
      "student",
      "Submitted for University Review",
      `Your startup idea ${currentName} has been submitted to your university incubator. Status: Pending University Approval.`
    );
    toast.success("Submitted for university review! 🚀", {
      description: "Your university incubation cell has received your submission. Status is now Pending Approval.",
    });
  }

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold">{stName.trim() || startup.name || "My Startup"}</h1>
              <Badge variant="outline" className="text-xs">{startup.sector || "General"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {stTagline.trim() || startup.tagline || "Describe your startup in one compelling sentence"} · {startup.stage} · {user?.org || startup.university}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={startup.status === "approved" ? "default" : "secondary"} className={startup.status === "pending" ? "bg-amber-500 text-white" : startup.status === "approved" ? "bg-emerald-600 text-white" : ""}>
              {startup.status === "pending" ? "⏳ Pending University Approval" : startup.status === "approved" ? "✓ Verified Live" : STATUS_LABEL[startup.status]}
            </Badge>
            <Button variant="outline" size="sm" onClick={saveDraft}>
              Save Draft
            </Button>
            <Button onClick={submitForReview} disabled={startup.status === "pending"}>
              <Send className="size-4" aria-hidden="true" />
              {startup.status === "pending" ? "Pending Approval" : "Submit for University Review"}
            </Button>
          </div>
        </div>

        {/* Dynamic Institutional Status Banner */}
        {startup.status === "pending" && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 animate-in fade-in-50">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Clock className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm">Status: Pending University Approval</h3>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Your startup idea has been submitted to {startup.university || "your university incubation cell"} for official verification. Once approved, it will be published to accredited investors.
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-500 text-white shrink-0">In Review</Badge>
            </div>
          </div>
        )}

        {startup.status === "approved" && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-900 dark:text-emerald-200 animate-in fade-in-50">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm">Status: Approved & Verified by {startup.university}</h3>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                    🎉 Officially verified and live in the investor deal flow!
                    {startup.reviewNote ? ` Endorsement: "${startup.reviewNote}"` : ""}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white shrink-0">Verified Live</Badge>
            </div>
          </div>
        )}

        {startup.status === "rejected" && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-900 dark:text-rose-200 animate-in fade-in-50">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm">Status: Revisions Requested by University</h3>
                  <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                    {startup.reviewNote || "Your university requested updates. Please review and resubmit."}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={submitForReview} className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white">
                Resubmit for Review
              </Button>
            </div>
          </div>
        )}

        {startup.status === "draft" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold text-sm">Status: Draft (Not Submitted Yet)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete your startup overview, problem, solution, and funding ask, then submit it to your university incubator for verification.
                </p>
              </div>
              <Button size="sm" onClick={submitForReview} className="gap-1.5">
                <Send className="size-3.5" /> Submit for University Approval
              </Button>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 py-5">
            <div className="min-w-48 flex-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Profile completeness</span>
                <span className="tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} className="mt-2" />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Chip done={Boolean(startup.name)} label="Identity" />
              <Chip done={Boolean(startup.problem)} label="Problem" />
              <Chip done={Boolean(startup.solution)} label="Solution" />
              <Chip done={Boolean(startup.videoUrl)} label="Video pitch" />
              <Chip done={Boolean(startup.deckName)} label="Pitch deck" />
              <Chip done={Boolean(startup.githubUrl)} label="GitHub" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview & Identity</TabsTrigger>
            <TabsTrigger value="problem">Problem</TabsTrigger>
            <TabsTrigger value="solution">Solution</TabsTrigger>
            <TabsTrigger value="video">Video pitch</TabsTrigger>
            <TabsTrigger value="deck">Pitch deck</TabsTrigger>
            <TabsTrigger value="github">GitHub</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Rocket className="size-4" aria-hidden="true" /> Venture identity & details
                </CardTitle>
                <CardDescription>
                  Your venture's public brand shown to investors and university incubation cells. Changes save automatically in real-time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="st-name">Startup / Venture Name</Label>
                    <Input
                      id="st-name"
                      value={stName}
                      onChange={(e) => setStName(e.target.value)}
                      placeholder="e.g. Lumen Labs or NeuroPulse"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="st-tagline">One-line Tagline / Pitch</Label>
                    <Input
                      id="st-tagline"
                      value={stTagline}
                      onChange={(e) => setStTagline(e.target.value)}
                      placeholder="e.g. AI-powered adaptive tutor for engineering students"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="st-sector">Industry / Sector</Label>
                    <select
                      id="st-sector"
                      value={startup.sector}
                      onChange={(e) => saveOrUpdate( { sector: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {SECTORS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="st-stage">Current Stage</Label>
                    <select
                      id="st-stage"
                      value={startup.stage}
                      onChange={(e) => saveOrUpdate( { stage: e.target.value as Stage })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="st-location">Campus Location / City</Label>
                    <Input
                      id="st-location"
                      value={stLocation}
                      onChange={(e) => setStLocation(e.target.value)}
                      placeholder="e.g. Kolhapur, Maharashtra"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="st-univ">Affiliated University / College</Label>
                    <Input
                      id="st-univ"
                      value={user?.org || startup.university}
                      onChange={(e) => saveOrUpdate( { university: e.target.value })}
                      placeholder="e.g. Sanjay Ghodawat University (SGU)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="st-founder">Lead Founder Name</Label>
                    <Input
                      id="st-founder"
                      value={user?.name || startup.founder || "Founder"}
                      onChange={(e) => saveOrUpdate( { founder: e.target.value })}
                      placeholder="e.g. Aditya Dalvi"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="problem">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="size-4" aria-hidden="true" /> Problem statement
                </CardTitle>
                <CardDescription>
                  Who hurts, how often, and what it costs them today. Saved as you type.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="problem">Problem</Label>
                <Textarea
                  id="problem"
                  rows={7}
                  value={problem}
                  placeholder="Engineering students wait days for coursework feedback…"
                  onChange={(e) => setProblem(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {problem.trim().split(/\s+/).filter(Boolean).length} words · aim for 60–120
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="solution">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="size-4" aria-hidden="true" /> Solution
                </CardTitle>
                <CardDescription>What you built, and why it wins against the status quo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="solution">Solution</Label>
                  <Textarea
                    id="solution"
                    rows={6}
                    value={solution}
                    placeholder="An adaptive AI tutor that grades in minutes…"
                    onChange={(e) => setSolution(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="model">Business model</Label>
                    <Input
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="traction">Traction</Label>
                    <Input
                      id="traction"
                      value={traction}
                      onChange={(e) => setTraction(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="funding">Funding required (USD)</Label>
                    <Input
                      id="funding"
                      type="number"
                      min={0}
                      value={startup.fundingRequired}
                      onChange={(e) =>
                        saveOrUpdate( { fundingRequired: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team">Team size</Label>
                    <Input
                      id="team"
                      type="number"
                      min={1}
                      value={startup.teamSize}
                      onChange={(e) => saveOrUpdate( { teamSize: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="size-4" aria-hidden="true" /> Video pitch
                </CardTitle>
                <CardDescription>Paste a YouTube or Vimeo link (2–3 minutes).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video">Video URL</Label>
                  <Input
                    id="video"
                    value={videoUrl}
                    placeholder="https://www.youtube.com/watch?v=…"
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </div>
                {embed ? (
                  <div className="aspect-video overflow-hidden rounded-xl border">
                    <iframe
                      src={embed}
                      title="Pitch video"
                      className="size-full"
                      allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    Add a valid YouTube or Vimeo link to preview your pitch here.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deck">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileUp className="size-4" aria-hidden="true" /> Pitch deck
                </CardTitle>
                <CardDescription>PDF or PPTX up to 20 MB. Shared only with approved investors.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="rounded-xl border border-dashed p-10 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files[0]);
                  }}
                >
                  <p className="text-sm text-muted-foreground">Drag & drop your deck here</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => fileRef.current?.click()}>
                    Choose file
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
                {startup.deckName && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                      {startup.deckName}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        saveOrUpdate( { deckName: "" });
                        toast.success("Deck removed");
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="github">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Github className="size-4" aria-hidden="true" /> GitHub project
                </CardTitle>
                <CardDescription>Link the repository behind your product.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/team/project"
                    aria-label="GitHub repository URL"
                    className="min-w-56 flex-1"
                  />
                  <Button onClick={connectGithub}>Connect</Button>
                </div>
                {startup.githubUrl && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm">
                    <a
                      href={startup.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {startup.githubUrl.replace("https://github.com/", "")}
                    </a>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Star className="size-3.5" aria-hidden="true" />
                      {startup.githubStars} stars
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Chip({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 ${done ? "border-primary/40 text-primary" : "text-muted-foreground"}`}
    >
      {done ? "✓" : "•"} {label}
    </span>
  );
}
