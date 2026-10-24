import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Check, FolderLock, Github, Star, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ScoreRing } from "@/components/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_INVESTORS, formatMoney, matchScore } from "@/lib/demo-data";
import { STATUS_LABEL, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { requestService, type DataRoomRequestRecord, type ConnectionRequestRecord } from "@/services/requestService";

const TITLE = "Startup Profile — CampusVenture";
const DESCRIPTION =
  "Full startup profile: problem, solution, video pitch, deck, GitHub project and match rationale.";

export const Route = createFileRoute("/app/investor/startup/$id")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: StartupDetail,
});

function embedUrl(url: string) {
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function StartupDetail() {
  const { id } = useParams({ from: "/app/investor/startup/$id" });
  const { startups, saved, toggleSaved, addRequest, requestAccess, notify, hydrated } = useVenture();
  const { user } = useAuth();
  const startup = startups.find((s) => s.id === id);

  if (!hydrated) {
    return (
      <AppShell role="investor">
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading verified startup profile...</p>
        </div>
      </AppShell>
    );
  }

  if (!startup) {
    return (
      <AppShell role="investor">
        <div className="mx-auto max-w-3xl rounded-xl border border-dashed p-12 text-center">
          <p className="font-medium">This startup is no longer listed.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/app/investor">Back to discovery</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  // Institutional Protection: Prevent investors from viewing unapproved or pending ideas
  if (startup.status !== "approved" && !startup.verified) {
    return (
      <AppShell role="investor">
        <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center space-y-4 my-8 shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <FolderLock className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold">Startup Awaiting University Verification</h1>
            <p className="text-xs text-muted-foreground">
              This startup is currently undergoing incubator due diligence by {startup.university || "its university"} and is not yet available for investor access.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/investor">Return to Verified Discovery</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const investor = {
    ...DEMO_INVESTORS[0]!,
    id: user?.id || DEMO_INVESTORS[0]!.id,
    name: user?.name || DEMO_INVESTORS[0]!.name,
    organization: user?.org || DEMO_INVESTORS[0]!.organization,
  };
  const { score, reasons } = matchScore(investor, startup);
  const isSaved = saved.includes(startup.id);
  const embed = embedUrl(startup.videoUrl);

  const [drStatus, setDrStatus] = useState<"none" | "pending" | "granted" | "rejected">("none");
  const [connStatus, setConnStatus] = useState<"none" | "pending" | "accepted">("none");

  useEffect(() => {
    let active = true;
    requestService.getDataRoomRequestsForInvestor(investor.id).then((reqs) => {
      if (!active) return;
      const found = reqs.find((r) => r.startupId === startup.id);
      if (found) {
        setDrStatus(found.status === "revoked" ? "rejected" : found.status);
      }
    });
    return () => {
      active = false;
    };
  }, [investor.id, startup.id]);

  const handleRequestDataRoom = async () => {
    addRequest(startup.id, investor.id, "dataroom");
    requestAccess(startup.id, investor.id);
    setDrStatus("pending");
    await requestService.requestDataRoomAccess({
      startupId: startup.id,
      investorId: investor.id,
      investorName: investor.name,
      investorEmail: user?.email,
      investorOrg: investor.organization,
      startupName: startup.name,
    });
    notify(
      "student",
      "Data-room request",
      `${investor.name} (${investor.organization || "Accredited Investor"}) requested access to ${startup.name} data room.`,
      startup.founderEmail ? { recipientEmail: startup.founderEmail } : undefined
    );
    toast.success(`Data-room request sent to ${startup.name}`);
  };

  const handleRequestConnection = async () => {
    addRequest(startup.id, investor.id, "connection");
    setConnStatus("pending");
    await requestService.sendConnectionRequest({
      senderId: investor.id,
      senderName: investor.name,
      senderEmail: user?.email,
      senderRole: "investor",
      senderOrg: investor.organization,
      receiverId: startup.founder || startup.id,
      receiverName: startup.founder || startup.name,
      startupId: startup.id,
      startupName: startup.name,
      message: `Hi ${startup.founder || "Founder"}, I reviewed ${startup.name} on CampusVenture and would love to connect.`,
    });
    notify(
      "student",
      "New connection request",
      `${investor.name} wants to connect regarding ${startup.name}.`,
      startup.founderEmail ? { recipientEmail: startup.founderEmail } : undefined
    );
    toast.success(`Connection requested with ${startup.name}`);
  };

  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to="/app/investor"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to discovery
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-gradient-brand text-base font-semibold text-primary-foreground">
              {startup.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold">
                {startup.name}
                {startup.verified && <BadgeCheck className="size-5 text-primary" aria-label="Verified" />}
              </h1>
              <p className="text-sm text-muted-foreground">
                {startup.sector} · {startup.stage} · {startup.location} · {startup.university}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{STATUS_LABEL[startup.status]}</Badge>
            <Badge>{score}% match</Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Metric label="Raising" value={formatMoney(startup.fundingRequired)} />
          <Metric label="Readiness" value={`${startup.readiness}/100`} />
          <Metric label="Team" value={String(startup.teamSize)} />
          <Metric label="Monthly users" value={startup.monthlyUsers.toLocaleString("en-US")} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Problem &amp; solution</CardTitle>
              <CardDescription>{startup.tagline}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Block title="Problem" text={startup.problem} />
              <Block title="Solution" text={startup.solution} />
              <Block title="Business model" text={startup.businessModel} />
              <Block title="Traction" text={startup.traction} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Match rationale</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <ScoreRing value={score} label="Match" size={120} />
              <ul className="w-full space-y-1 text-xs text-muted-foreground">
                {reasons.map((r) => (
                  <li key={r}>· {r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Video pitch</CardTitle>
          </CardHeader>
          <CardContent>
            {embed ? (
              <div className="aspect-video overflow-hidden rounded-xl border">
                <iframe
                  src={embed}
                  title={`${startup.name} pitch video`}
                  className="size-full"
                  allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                This founder hasn't uploaded a video pitch yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Github className="size-4" aria-hidden="true" /> GitHub project
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {startup.githubUrl && /^https:\/\//i.test(startup.githubUrl) ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={startup.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {startup.githubUrl.replace("https://github.com/", "")}
                  </a>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Star className="size-3.5" aria-hidden="true" />
                    {startup.githubStars}
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground">No repository linked.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderLock className="size-4" aria-hidden="true" /> Data room
              </CardTitle>
              <CardDescription>Founder approval required before documents unlock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {startup.deckName ? `1 document: ${startup.deckName}` : "No documents uploaded yet."}
              </p>
              {drStatus === "none" && (
                <Button size="sm" onClick={handleRequestDataRoom}>
                  Request access
                </Button>
              )}
              {drStatus === "pending" && (
                <Badge variant="secondary" className="px-3 py-1 font-medium text-xs">
                  Access Requested (Pending Founder Approval)
                </Badge>
              )}
              {drStatus === "granted" && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-emerald-600 text-white text-xs">
                    Access Granted
                  </Badge>
                  <Button size="sm" asChild variant="outline">
                    <Link to="/app/investor/dataroom">Open Data Room</Link>
                  </Button>
                </div>
              )}
              {drStatus === "rejected" && (
                <div className="space-y-1">
                  <Badge variant="destructive" className="text-xs">
                    Access Request Declined
                  </Badge>
                  <Button size="sm" variant="ghost" className="text-xs block" onClick={handleRequestDataRoom}>
                    Re-request access
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={isSaved ? "secondary" : "outline"}
            onClick={() => {
              const added = toggleSaved(startup.id);
              toast.success(added ? `Saved ${startup.name}` : `Removed ${startup.name}`);
            }}
          >
            {isSaved ? "Saved to watchlist" : "Save startup"}
          </Button>
          {connStatus === "none" ? (
            <Button onClick={handleRequestConnection}>
              Request connection
            </Button>
          ) : (
            <Button variant="secondary" disabled className="gap-1.5">
              <Check className="size-4 text-emerald-600" />
              Connection Requested
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 text-muted-foreground">{text || "Not provided yet."}</p>
    </div>
  );
}
