import { createFileRoute, Link } from "@tanstack/react-router";
import { BookmarkX, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/score-ring";
import { DEMO_INVESTORS, formatMoney, matchScore } from "@/lib/demo-data";
import { MY_INVESTOR_ID, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";

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
  const { startups, saved, toggleSaved, requestAccess, notify } = useVenture();
  const { user } = useAuth();
  const myInvestorId = user?.id || MY_INVESTOR_ID;
  const me = DEMO_INVESTORS[0]!;
  const list = startups.filter((s) => saved.includes(s.id));

  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Saved startups</h1>
          <p className="text-sm text-muted-foreground">
            {list.length} startup{list.length === 1 ? "" : "s"} on your watchlist.
          </p>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            Nothing saved yet —{" "}
            <Link to="/app/investor" className="underline">
              discover startups
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((s) => {
              const { score } = matchScore(me, s);
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
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/app/investor/startup/$id" params={{ id: s.id }}>
                          <ExternalLink className="size-4" aria-hidden="true" /> Open profile
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          requestAccess(s.id, myInvestorId);
                          notify("student", "Data-room request", `${user?.name || me.name} requested access to ${s.name}.`);
                          toast.success("Data-room access requested");
                        }}
                      >
                        Request data room
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
