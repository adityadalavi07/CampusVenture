import { createFileRoute, Link } from "@tanstack/react-router";
import { BookmarkX, ExternalLink, FolderLock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/score-ring";
import { formatMoney, matchScore, type Stage, type Startup } from "@/lib/demo-data";
import { useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { requestService } from "@/services/requestService";

const TITLE = "Saved Startups — CampusVenture Investor";
const DESCRIPTION = "Your watchlist of student startups, with live match scores and quick actions.";

export const Route = createFileRoute("/app/investor/saved")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: SavedStartups,
});

function SavedStartups() {
  const { startups, saved, toggleSaved, notify } = useVenture();
  const { user } = useAuth();

  const activeInvestor = {
    id: user?.id || "usr-investor",
    name: user?.name || "Accredited Investor",
    organization: user?.org || "Angel / Venture Partner",
    type: "Seed / Pre-Seed Venture Fund",
    sectors: ["AI", "SaaS", "FinTech", "HealthTech", "EdTech"],
    stages: ["Idea", "Prototype", "MVP", "Early Traction"] as Stage[],
    ticketMin: 25000,
    ticketMax: 250000,
    geography: "India & Global",
    thesis: "Early-stage backing for high-conviction student founders in technology, software, and hardware ecosystems.",
    verified: true,
  };

  const list = startups.filter((s) => saved.includes(s.id));

  const handleRequestDataRoom = async (s: Startup) => {
    let resolvedFounderEmail = s.founderEmail;
    let resolvedFounderId: string | undefined = undefined;

    if (!resolvedFounderEmail) {
      try {
        const { data: dbSt } = await (supabase as any)
          .from("startups")
          .select("founder_email, founder_id")
          .eq("id", s.id)
          .maybeSingle();
        if (dbSt?.founder_email) {
          resolvedFounderEmail = dbSt.founder_email;
          resolvedFounderId = dbSt.founder_id || undefined;
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
          .maybeSingle();
        if (prof?.id) resolvedFounderId = prof.id;
      } catch {
        /* ignore */
      }
    }

    const res = await requestService.requestDataRoomAccess({
      startupId: s.id,
      investorId: activeInvestor.id,
      investorName: activeInvestor.name,
      investorEmail: user?.email,
      investorOrg: activeInvestor.organization,
      startupName: s.name,
      founderId: resolvedFounderId,
      founderEmail: resolvedFounderEmail,
      message: `Hi ${s.founder || "Founder"}, we would like to request diligence access to your Data Room under mutual NDA.`,
    });

    if (res.alreadyExisted) {
      toast.info(`Data-room request is already pending founder review for ${s.name}.`);
      return;
    }

    if (resolvedFounderEmail || resolvedFounderId) {
      notify(
        "student",
        "Data-room access requested",
        `${activeInvestor.name} (${activeInvestor.organization}) requested diligence access to ${s.name} Data Room under mutual NDA.`,
        {
          recipientEmail: resolvedFounderEmail,
          recipientUserId: resolvedFounderId,
          senderEmail: user?.email,
          senderUserId: activeInvestor.id,
        }
      );
    }

    toast.info(`Data-room access requested from ${s.name}`, {
      description: "Founder review requested. You will be notified once access is approved.",
    });
  };

  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Saved startups</h1>
          <p className="text-sm text-muted-foreground">
            {list.length} startup{list.length === 1 ? "" : "s"} on your personal watchlist.
          </p>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            Nothing saved yet —{" "}
            <Link to="/app/investor" className="underline text-primary">
              discover startups
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((s) => {
              const { score } = matchScore(activeInvestor, s);
              return (
                <Card key={s.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <CardDescription>
                          {s.sector} · {s.stage} · {s.location}
                        </CardDescription>
                      </div>
                      <ScoreRing value={score} size={56} label="match" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">{s.tagline}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">Raising {formatMoney(s.fundingRequired)}</Badge>
                      <Badge variant="outline">{s.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/app/investor/startup/$id" params={{ id: s.id }}>
                          <ExternalLink className="size-4" aria-hidden="true" /> Open profile
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestDataRoom(s)}
                        className="gap-1.5"
                      >
                        <FolderLock className="size-3.5" aria-hidden="true" /> Request data room
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          toggleSaved(s.id);
                          toast(`${s.name} removed from watchlist`);
                        }}
                      >
                        <BookmarkX className="size-4" aria-hidden="true" /> Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
