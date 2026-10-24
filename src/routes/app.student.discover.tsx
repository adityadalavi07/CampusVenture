import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MessagesSquare, Rocket, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScoreRing } from "@/components/score-ring";
import { DEMO_INVESTORS, formatMoney, matchScore } from "@/lib/demo-data";
import { useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";

const TITLE = "Discover Investors — CampusVenture";
const DESCRIPTION =
  "Find investors whose sector, stage and cheque size match your student startup, and open a conversation.";

export const Route = createFileRoute("/app/student/discover")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: DiscoverInvestors,
});

function DiscoverInvestors() {
  const { startups, sendMessage, notify } = useVenture();
  const { user } = useAuth();
  const startup = startups.find(
    (s) =>
      (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.name && s.founder === user.name)
  );
  const [q, setQ] = useState("");

  if (!startup) {
    return (
      <AppShell role="student">
        <div className="mx-auto max-w-lg space-y-6 py-16 text-center animate-in fade-in-50">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Rocket className="size-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Create your startup profile first</h1>
            <p className="text-sm text-muted-foreground">
              To discover matching venture funds and angel investors, build and submit your startup idea so our AI matchmaker can compute thesis compatibility.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/app/student/startup">Build My Startup Profile</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const list = DEMO_INVESTORS.map((investor) => ({ investor, ...matchScore(investor, startup) }))
    .filter(({ investor }) =>
      `${investor.name} ${investor.organization} ${investor.sectors.join(" ")} ${investor.thesis}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    )
    .sort((a, b) => b.score - a.score);

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Discover investors</h1>
          <p className="text-sm text-muted-foreground">
            Ranked against {startup.name} — sector, stage, cheque size and thesis fit.
          </p>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search investors, sectors or thesis"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search investors"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {list.map(({ investor, score, reasons }) => (
            <Card key={investor.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{investor.name}</CardTitle>
                    <CardDescription>
                      {investor.organization} · {investor.type}
                    </CardDescription>
                  </div>
                  <ScoreRing value={score} size={56} label="fit" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{investor.thesis}</p>
                <div className="flex flex-wrap gap-1.5">
                  {investor.sectors.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cheque {formatMoney(investor.ticketMin)}–{formatMoney(investor.ticketMax)} ·{" "}
                  {investor.geography} · {investor.stages.join(", ")}
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {reasons.slice(0, 3).map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  onClick={() => {
                    sendMessage(
                      startup.id,
                      investor.id,
                      "student",
                      `Hi ${investor.name.split(" ")[0]}, I'm building ${startup.name} — ${startup.tagline} Would you be open to a short intro call?`,
                    );
                    notify("investor", "New intro message", `${startup.name} reached out.`);
                    toast.success(`Intro sent to ${investor.name}`);
                  }}
                >
                  <MessagesSquare className="size-4" aria-hidden="true" /> Send intro
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
