import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGES, formatMoney } from "@/lib/demo-data";
import { STATUS_LABEL, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isSameUniversity } from "@/lib/university-matcher";

const TITLE = "University Ecosystem Dashboard — CampusVenture";
const DESCRIPTION =
  "Monitor student startups, readiness distribution, investor interest and incubation programs.";

export const Route = createFileRoute("/app/university/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: UniversityDashboard,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function UniversityDashboard() {
  const { startups, students } = useVenture();
  const { user } = useAuth();
  const uniName = user?.org || "University Innovation & Incubation Cell";

  const uniStartups = startups.filter((s) => {
    if (!user) return true;
    return isSameUniversity(
      { org: user.org, email: user.email },
      { university: s.university, email: s.founderEmail }
    );
  });

  const uniStudents = students.filter((st) => {
    if (!user) return true;
    return isSameUniversity(
      { org: user.org, email: user.email },
      { org: st.org, email: st.email }
    );
  });

  const pending = uniStartups.filter((s) => s.status === "pending");
  const byStage = STAGES.map((stage) => ({
    stage,
    count: uniStartups.filter((s) => s.stage === stage).length,
  }));

  const bySector = Object.entries(
    uniStartups.reduce<Record<string, number>>((acc, s) => {
      acc[s.sector] = (acc[s.sector] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const avgReadiness =
    uniStartups.length > 0
      ? Math.round(uniStartups.reduce((sum, s) => sum + s.readiness, 0) / uniStartups.length)
      : 0;

  const top = [...uniStartups].sort((a, b) => b.readiness - a.readiness).slice(0, 3);

  return (
    <AppShell role="university">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Ecosystem dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {uniName} · Innovation &amp; Incubation Cell
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Student founders" value={String(uniStudents.length)} />
          <Stat label="Verified startups" value={String(uniStartups.filter((s) => s.status === "approved").length)} />
          <Stat label="Active startups" value={String(uniStartups.length)} />
          <Stat label="Avg. readiness" value={`${avgReadiness}/100`} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Startups by stage</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="stage" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Startups by sector</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bySector} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {bySector.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top emerging startups</CardTitle>
            <CardDescription>
              Ranked by platform readiness metrics. This is not a guarantee of investment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {top.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.sector} · {s.stage} · raising {formatMoney(s.fundingRequired)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.verified && <Badge variant="secondary">Verified</Badge>}
                  <Badge>{s.readiness}/100</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awaiting verification</CardTitle>
            <CardDescription>
              {pending.length === 0
                ? "Nothing in the queue right now."
                : `${pending.length} startup${pending.length > 1 ? "s" : ""} submitted for review.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.sector} · {s.stage} · {STATUS_LABEL[s.status]}
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/app/university/review">Review</Link>
                </Button>
              </div>
            ))}
            <Button size="sm" asChild>
              <Link to="/app/university/review">Open review queue</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programs &amp; events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">No programs published yet.</p>
              <Button variant="outline" size="sm" className="mt-3">
                Publish a program
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
