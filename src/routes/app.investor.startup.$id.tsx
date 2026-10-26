import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  FolderLock,
  Github,
  Send,
  ShieldCheck,
  Star,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ScoreRing } from "@/components/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, matchScore, type Investor } from "@/lib/demo-data";
import { STATUS_LABEL, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  requestService,
  type DataRoomRequestRecord,
  type ConnectionRequestRecord,
} from "@/services/requestService";

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
  errorComponent: ({ error, reset }) => (
    <AppShell role="investor">
      <div className="mx-auto max-w-lg my-12 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-4">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Unable to load startup profile</h2>
          <p className="text-xs text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            Try Again
          </Button>
          <Button asChild size="sm">
            <Link to="/app/investor">Return to Discovery</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  ),
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

  let savedInvestorOrg = "";
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("campusventure.profile.investor");
      if (raw) savedInvestorOrg = JSON.parse(raw)?.org || "";
    } catch {}
  }

  const investor: Investor = {
    id: user?.id || "",
    name: user?.name || "Investor Partner",
    organization: user?.org || savedInvestorOrg || "Venture Fund",
    email: user?.email,
    sectors: [],
    stages: [],
    thesis: "",
    ticketMin: 0,
    ticketMax: 0,
    geography: "India",
    type: "Angel / Fund",
  };
  const { score, reasons } = matchScore(investor, startup);
  const isSaved = saved.includes(startup.id);
  const embed = embedUrl(startup.videoUrl);

  const [drStatus, setDrStatus] = useState<"none" | "pending" | "granted" | "rejected">("none");
  const [connStatus, setConnStatus] = useState<"none" | "pending" | "accepted" | "rejected">("none");

  // Data Room Request Dialog State
  const [drDialogOpen, setDrDialogOpen] = useState(false);
  const [drMessage, setDrMessage] = useState("");
  const [isSubmittingDr, setIsSubmittingDr] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchDr = () => {
      requestService.getDataRoomRequestsForInvestor(investor.id, user?.email).then((reqs) => {
        if (!active) return;
        const found = reqs.find((r) => r.startupId === startup.id);
        if (found) {
          setDrStatus(found.status === "revoked" ? "rejected" : found.status);
        } else {
          setDrStatus("none");
        }
      });
    };

    const fetchConn = () => {
      requestService.getSentConnectionRequests(investor.id, user?.email).then((reqs) => {
        if (!active) return;
        const found = reqs.find((c) => c.startupId === startup.id);
        if (found) {
          setConnStatus(found.status);
        } else {
          setConnStatus("none");
        }
      });
    };

    fetchDr();
    fetchConn();

    const unsubDr = requestService.subscribeToDataRoomRequests(fetchDr);
    const unsubConn = requestService.subscribeToConnectionRequests(fetchConn);

    return () => {
      active = false;
      unsubDr();
      unsubConn();
    };
  }, [investor.id, startup.id, user?.email]);

  const handleOpenDrDialog = () => {
    setDrMessage(
      `Hi ${startup.founder || "Founder"}, we are reviewing ventures in ${startup.sector || "your industry"} and would like to request diligence access to your Data Room under mutual NDA.`
    );
    setDrDialogOpen(true);
  };

  const handleConfirmRequestDataRoom = async () => {
    setIsSubmittingDr(true);
    addRequest(startup.id, investor.id, "dataroom");
    requestAccess(startup.id, investor.id);
    setDrStatus("pending");

    let resolvedFounderEmail =
      startup.founderEmail ||
      (startup as any).founder_email;

    let resolvedFounderId = (startup as any).founderId || (startup as any).founder_id;

    if (!resolvedFounderEmail) {
      try {
        const { data: dbStartup } = await (supabase as any)
          .from("startups")
          .select("founder_email, founder_id")
          .eq("id", startup.id)
          .maybeSingle();

        if (dbStartup?.founder_email) {
          resolvedFounderEmail = dbStartup.founder_email;
          if (dbStartup.founder_id) resolvedFounderId = dbStartup.founder_id;
        }
      } catch {
        /* ignore */
      }
    }

    if (resolvedFounderEmail && !resolvedFounderId) {
      try {
        const { data: prof } = await (supabase as any)
          .from("profiles")
          .select("id")
          .ilike("email", resolvedFounderEmail.trim())
          .limit(1)
          .maybeSingle();
        if (prof?.id) {
          resolvedFounderId = prof.id;
        }
      } catch {
        /* ignore */
      }
    }

    const res = await requestService.requestDataRoomAccess({
      startupId: startup.id,
      investorId: investor.id,
      investorName: investor.name,
      investorEmail: user?.email,
      investorOrg: investor.organization,
      startupName: startup.name,
      founderId: resolvedFounderId,
      founderEmail: resolvedFounderEmail,
      message: drMessage.trim() || undefined,
    });

    setIsSubmittingDr(false);
    setDrDialogOpen(false);

    if (res.alreadyExisted) {
      toast.info(`Data-room request is already pending founder review.`);
      return;
    }

    if (resolvedFounderEmail || resolvedFounderId) {
      notify(
        "student",
        "Data-room access requested",
        `${investor.name} (${investor.organization || "Accredited Investor"}) requested access to ${startup.name} Data Room under mutual NDA.`,
        {
          recipientEmail: resolvedFounderEmail,
          recipientUserId: resolvedFounderId,
          senderEmail: user?.email,
          senderUserId: investor.id,
        }
      );
    }
    toast.success(`Data-room access request sent to ${startup.name}`);
  };

  const handleRequestConnection = async () => {
    addRequest(startup.id, investor.id, "connection");
    setConnStatus("pending");

    let resolvedFounderEmail =
      startup.founderEmail ||
      (startup as any).founder_email;

    let resolvedReceiverId = (startup as any).founderId || (startup as any).founder_id;

    if (!resolvedFounderEmail) {
      try {
        const { data: dbStartup } = await (supabase as any)
          .from("startups")
          .select("founder_email, founder_id")
          .eq("id", startup.id)
          .maybeSingle();

        if (dbStartup?.founder_email) {
          resolvedFounderEmail = dbStartup.founder_email;
          if (dbStartup.founder_id) resolvedReceiverId = dbStartup.founder_id;
        }
      } catch {
        /* ignore */
      }
    }

    if (resolvedFounderEmail && !resolvedReceiverId) {
      try {
        const { data: prof } = await (supabase as any)
          .from("profiles")
          .select("id")
          .ilike("email", resolvedFounderEmail.trim())
          .limit(1)
          .maybeSingle();
        if (prof?.id) {
          resolvedReceiverId = prof.id;
        }
      } catch {
        /* ignore */
      }
    }

    const res = await requestService.sendConnectionRequest({
      senderId: investor.id,
      senderName: investor.name,
      senderEmail: user?.email,
      senderRole: "investor",
      senderOrg: investor.organization,
      receiverId: resolvedReceiverId || startup.id,
      receiverName: startup.founder || startup.name,
      receiverEmail: resolvedFounderEmail,
      startupId: startup.id,
      startupName: startup.name,
      message: `Hi ${startup.founder || "Founder"}, I reviewed ${startup.name} on CampusVenture and would love to connect.`,
    });

    if (res.alreadyExisted) {
      toast.info(`Connection request is already pending founder review.`);
      return;
    }

    if (resolvedFounderEmail || resolvedReceiverId) {
      notify(
        "student",
        "New connection request",
        `${investor.name} (${investor.organization || "Accredited Investor"}) wants to connect regarding ${startup.name}.`,
        {
          recipientEmail: resolvedFounderEmail,
          recipientUserId: resolvedReceiverId,
          senderEmail: user?.email,
          senderUserId: investor.id,
        }
      );
    }
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
                {startup.deckName ? `1 document: ${startup.deckName}` : "Founder-managed confidential diligence documents."}
              </p>
              {drStatus === "none" && (
                <Button size="sm" onClick={handleOpenDrDialog}>
                  Request Data Room Access
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
                  <Button size="sm" variant="ghost" className="text-xs block" onClick={handleOpenDrDialog}>
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
          {connStatus === "none" && (
            <Button onClick={handleRequestConnection}>
              Request connection
            </Button>
          )}
          {connStatus === "pending" && (
            <Button variant="secondary" disabled className="gap-1.5">
              <Check className="size-4 text-emerald-600" />
              Connection Requested (Pending)
            </Button>
          )}
          {connStatus === "accepted" && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-emerald-600 text-white text-xs gap-1 py-1.5 px-3">
                <Check className="size-3.5" /> Connected
              </Badge>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/investor/messages">Message Founder</Link>
              </Button>
            </div>
          )}
          {connStatus === "rejected" && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs py-1.5 px-3">
                Connection Declined
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleRequestConnection}>
                Re-request
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* PHASE 2: REQUEST DATA ROOM ACCESS MODAL WITH OPTIONAL MESSAGE */}
      <Dialog open={drDialogOpen} onOpenChange={setDrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <DialogTitle className="text-base">Request Data Room Access</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Request authorization to inspect confidential startup materials (financial projections, cap tables, product roadmap) for <strong>{startup.name}</strong> under a mutual non-disclosure agreement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span className="font-medium text-foreground">Venture:</span>
                <span>{startup.name} ({startup.university || "University Venture"})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-foreground">Round / Raising:</span>
                <span>{formatMoney(startup.fundingRequired)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-foreground">Legal Protection:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">Mutual NDA (v1.0) Required</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dr-message" className="text-xs">
                Investment Interest / Note to Founder (Optional)
              </Label>
              <Textarea
                id="dr-message"
                value={drMessage}
                onChange={(e) => setDrMessage(e.target.value)}
                placeholder="Explain your fund focus, typical check size, or specific diligence requirements..."
                rows={4}
                className="text-xs resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                This note will appear directly in the founder's incoming diligence requests queue and notifications.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setDrDialogOpen(false)} disabled={isSubmittingDr}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmRequestDataRoom} disabled={isSubmittingDr} className="gap-1.5">
              <Send className="size-3.5" />
              {isSubmittingDr ? "Submitting..." : "Submit Access Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
