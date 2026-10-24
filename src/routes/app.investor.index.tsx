import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BadgeCheck, FolderLock, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_INVESTORS, SECTORS, STAGES, formatMoney, matchScore } from "@/lib/demo-data";
import { useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";

const TITLE = "Investor Dashboard — CampusVenture";
const DESCRIPTION =
  "Discover, filter and shortlist verified student startups with transparent match scoring.";

export const Route = createFileRoute("/app/investor/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: InvestorDashboard,
});

const ME = DEMO_INVESTORS[0]!;
type SortKey = "match" | "readiness" | "updated" | "funding";

function InvestorDashboard() {
  const { startups, saved, toggleSaved, addRequest, requestAccess, requests, notify } = useVenture();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [stage, setStage] = useState("all");
  const [sort, setSort] = useState<SortKey>("match");
  const [savedOnly, setSavedOnly] = useState(false);

  const activeInvestor = useMemo(() => {
    return {
      ...ME,
      id: user?.id || ME.id,
      name: user?.name || ME.name,
      organization: user?.org || ME.organization,
    };
  }, [user]);

  const results = useMemo(() => {
    const list = startups
      .filter((s) => s.status === "approved" || s.verified === true)
      .map((s) => ({ startup: s, ...matchScore(activeInvestor, s) }))
      .filter(({ startup }) => {
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          startup.name.toLowerCase().includes(q) ||
          startup.tagline.toLowerCase().includes(q) ||
          startup.university.toLowerCase().includes(q);
        return (
          matchesQuery &&
          (!savedOnly || saved.includes(startup.id)) &&
          (sector === "all" || startup.sector === sector) &&
          (stage === "all" || startup.stage === stage)
        );
      });

    return list.sort((a, b) => {
      if (sort === "readiness") return b.startup.readiness - a.startup.readiness;
      if (sort === "funding") return b.startup.fundingRequired - a.startup.fundingRequired;
      if (sort === "updated") return b.startup.updatedAt.localeCompare(a.startup.updatedAt);
      return b.score - a.score;
    });
  }, [startups, saved, savedOnly, query, sector, stage, sort, activeInvestor]);

  const hasFilters = query !== "" || sector !== "all" || stage !== "all" || savedOnly;

  function clearAll() {
    setQuery("");
    setSector("all");
    setStage("all");
    setSavedOnly(false);
  }

  function toggleSave(id: string, name: string) {
    const added = toggleSaved(id);
    if (added) {
      notify("student", "Investor saved your startup! ⭐", `${activeInvestor.name} (${activeInvestor.organization}) added ${name} to their portfolio watchlist.`);
    }
    toast.success(added ? `Saved ${name} to your watchlist` : `Removed ${name}`);
  }

  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Discover startups</h1>
          <p className="text-sm text-muted-foreground">
            {activeInvestor.organization} · Cross-University Verified Deal Flow · All Participating Universities
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <MiniStat label="Matches" value={String(results.length)} />
          <MiniStat label="Saved" value={String(saved.length)} />
          <MiniStat
            label="Connection requests"
            value={String(requests.filter((r) => r.kind === "connection").length)}
          />
          <MiniStat
            label="Data-room requests"
            value={String(requests.filter((r) => r.kind === "dataroom").length)}
          />
        </div>


        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Refine the marketplace to your thesis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search startups, universities…"
                  aria-label="Search startups"
                  className="pl-9"
                />
              </div>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger aria-label="Filter by sector">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sectors</SelectItem>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger aria-label="Filter by stage">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-[190px]" aria-label="Sort results">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Highest match</SelectItem>
                  <SelectItem value="readiness">Highest readiness</SelectItem>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="funding">Funding requirement</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={savedOnly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSavedOnly((v) => !v)}
              >
                Saved only
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <X className="size-3.5" aria-hidden="true" />
                  Clear all
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
            <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <BadgeCheck className="size-6" />
            </div>
            <h3 className="font-semibold text-lg">No Verified Campus Startups Live Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              University incubation cells review and approve student startups before they appear in investor deal flow. Once a university incubator approves a student's idea, it will appear here in real time.
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearAll} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {results.map(({ startup, score, reasons }) => (
              <Card key={startup.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-brand text-sm font-semibold text-primary-foreground">
                        {startup.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <CardTitle className="flex items-center gap-1.5 text-base">
                          {startup.name}
                          {startup.verified && (
                            <BadgeCheck className="size-4 text-primary" aria-label="Verified" />
                          )}
                        </CardTitle>
                        <CardDescription>
                          {startup.sector} · {startup.stage} · {startup.location}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge>{score}% match</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="text-sm text-muted-foreground">{startup.tagline}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Raising {formatMoney(startup.fundingRequired)}</span>
                    <span>Readiness {startup.readiness}/100</span>
                    <span>Team of {startup.teamSize}</span>
                    <span>{startup.university}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Traction: {startup.traction}</p>
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Why this is a match</summary>
                    <ul className="mt-1 space-y-0.5">
                      {reasons.map((r) => (
                        <li key={r}>· {r}</li>
                      ))}
                    </ul>
                  </details>
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button size="sm" asChild>
                      <Link to="/app/investor/startup/$id" params={{ id: startup.id }}>
                        View profile
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant={saved.includes(startup.id) ? "secondary" : "outline"}
                      onClick={() => toggleSave(startup.id, startup.name)}
                    >
                      {saved.includes(startup.id) ? "Saved" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        addRequest(startup.id, activeInvestor.id, "connection");
                        notify("student", "New connection request", `${activeInvestor.name} wants to connect.`);
                        toast.success(`Connection requested with ${startup.name}`);
                      }}
                    >
                      Request connection
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        addRequest(startup.id, activeInvestor.id, "dataroom");
                        requestAccess(startup.id, activeInvestor.id);
                        notify("student", "Data-room request", `${activeInvestor.organization} requested access.`);
                        toast.info(`Data-room request sent to ${startup.name}`, {
                          description: "The founder must approve, then both parties accept the NDA.",
                        });
                      }}
                    >
                      <FolderLock className="size-3.5" aria-hidden="true" />
                      Request data room
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
