import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useDebouncedField } from "@/hooks/use-debounced-field";
import {
  CheckCircle2,
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
import { STATUS_LABEL, completeness, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { SECTORS, STAGES, type Stage } from "@/lib/demo-data";

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
  const { startups, updateStartup, notify } = useVenture();
  const { user } = useAuth();
  const startup =
    startups.find(
      (s) =>
        (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.name && s.founder === user.name)
    ) || startups[0]!;
  const fileRef = useRef<HTMLInputElement>(null);
  const [github, setGithub] = useState(startup.githubUrl);

  // Sync startup founder and university with authenticated user
  useEffect(() => {
    if (user?.name && user?.org && (startup.founder !== user.name || startup.university !== user.org || startup.founderEmail !== user.email)) {
      updateStartup(startup.id, {
        founder: user.name,
        university: user.org,
        founderEmail: user.email,
      });
    }
  }, [user, startup.id, startup.founder, startup.university, startup.founderEmail, updateStartup]);

  const [stName, setStName] = useDebouncedField(startup.name, (v) =>
    updateStartup(startup.id, { name: v })
  );
  const [stTagline, setStTagline] = useDebouncedField(startup.tagline || "", (v) =>
    updateStartup(startup.id, { tagline: v })
  );
  const [stLocation, setStLocation] = useDebouncedField(startup.location || "", (v) =>
    updateStartup(startup.id, { location: v })
  );
  const [problem, setProblem] = useDebouncedField(startup.problem, (v) =>
    updateStartup(startup.id, { problem: v }),
  );
  const [solution, setSolution] = useDebouncedField(startup.solution, (v) =>
    updateStartup(startup.id, { solution: v }),
  );
  const [model, setModel] = useDebouncedField(startup.businessModel, (v) =>
    updateStartup(startup.id, { businessModel: v }),
  );
  const [traction, setTraction] = useDebouncedField(startup.traction, (v) =>
    updateStartup(startup.id, { traction: v }),
  );
  const [videoUrl, setVideoUrl] = useDebouncedField(startup.videoUrl, (v) =>
    updateStartup(startup.id, { videoUrl: v }),
  );

  const pct = completeness(startup);
  const embed = embedUrl(startup.videoUrl);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Pitch decks must be under 20 MB.");
      return;
    }
    updateStartup(startup.id, { deckName: file.name });
    toast.success(`${file.name} attached to your data room`);
  }

  function connectGithub() {
    const ok = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(github.trim());
    if (!ok) {
      toast.error("Enter a full repository URL, e.g. https://github.com/team/project");
      return;
    }
    const stars = 40 + (github.length * 17) % 900;
    updateStartup(startup.id, { githubUrl: github.trim(), githubStars: stars });
    toast.success("GitHub project connected", {
      description: `Repository verified · ${stars} stars indexed.`,
    });
  }

  function submitForReview() {
    if (pct < 60) {
      toast.error("Complete at least 60% of your profile before submitting.");
      return;
    }
    updateStartup(startup.id, { status: "pending" });
    notify("university", "New startup submitted", `${startup.name} is awaiting verification.`);
    notify("student", "Submitted for review", "Your university cell will respond within 48 hours.");
    toast.success("Submitted to your university for verification");
  }

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold">{startup.name}</h1>
              <Badge variant="outline" className="text-xs">{startup.sector}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {startup.tagline || "Campus-incubated venture"} · {startup.stage} · {user?.org || startup.university}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={startup.status === "approved" ? "default" : "secondary"}>
              {STATUS_LABEL[startup.status]}
            </Badge>
            <Button onClick={submitForReview} disabled={startup.status === "pending"}>
              <Send className="size-4" aria-hidden="true" />
              {startup.status === "pending" ? "Awaiting review" : "Submit for review"}
            </Button>
          </div>
        </div>

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
                      onChange={(e) => updateStartup(startup.id, { sector: e.target.value })}
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
                      onChange={(e) => updateStartup(startup.id, { stage: e.target.value as Stage })}
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
                      onChange={(e) => updateStartup(startup.id, { university: e.target.value })}
                      placeholder="e.g. Sanjay Ghodawat University (SGU)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="st-founder">Lead Founder Name</Label>
                    <Input
                      id="st-founder"
                      value={user?.name || startup.founder || "Founder"}
                      onChange={(e) => updateStartup(startup.id, { founder: e.target.value })}
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
                        updateStartup(startup.id, { fundingRequired: Number(e.target.value) })
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
                      onChange={(e) => updateStartup(startup.id, { teamSize: Number(e.target.value) })}
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
                        updateStartup(startup.id, { deckName: "" });
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
