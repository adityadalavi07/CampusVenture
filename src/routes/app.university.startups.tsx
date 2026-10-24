import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/demo-data";
import { STATUS_LABEL, completeness, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isSameUniversity } from "@/lib/university-matcher";

const TITLE = "Campus Startups — CampusVenture University";
const DESCRIPTION = "Track every student startup on campus: stage, readiness, funding ask and status.";

export const Route = createFileRoute("/app/university/startups")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: CampusStartups,
});

function CampusStartups() {
  const { startups } = useVenture();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const uniStartups = startups.filter((s) => {
    if (!user) return true;
    return isSameUniversity(
      { org: user.org, email: user.email },
      { university: s.university, email: s.founderEmail }
    );
  });

  const list = uniStartups.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      `${s.name} ${s.sector} ${s.stage} ${s.university}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell role="university">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Campus startups</h1>
          <p className="text-sm text-muted-foreground">
            {uniStartups.length} startups from {user?.org || "your university"} · {uniStartups.filter((s) => s.verified).length} verified
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search startups"
              aria-label="Search startups"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Changes requested</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {list.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <CardDescription>
                      {s.sector} · {s.stage} · {s.teamSize} people
                    </CardDescription>
                  </div>
                  <Badge variant={s.status === "approved" ? "default" : "secondary"}>
                    {STATUS_LABEL[s.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{s.tagline}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Profile completeness</span>
                    <span>{completeness(s)}%</span>
                  </div>
                  <Progress value={completeness(s)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Raising {formatMoney(s.fundingRequired)} · readiness {s.readiness}/100 · {s.views} views
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/app/university/review">Open review queue</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
