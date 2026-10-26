import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, FolderLock, MessagesSquare, Search, UserPlus, X } from "lucide-react";
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
import { SECTORS, STAGES, formatMoney, matchScore, type Stage, type Startup } from "@/lib/demo-data";
import { useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  requestService,
  type ConnectionRequestRecord,
  type DataRoomRequestRecord,
} from "@/services/requestService";

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

type SortKey = "match" | "readiness" | "updated" | "funding";

function InvestorDashboard() {
  const { startups, saved, toggleSaved, notify } = useVenture();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [stage, setStage] = useState("all");
  const [sort, setSort] = useState<SortKey>("match");
  const [savedOnly, setSavedOnly] = useState(false);

  // Live database records for this authenticated investor (strictly isolated)
  const [incomingConns, setIncomingConns] = useState<ConnectionRequestRecord[]>([]);
  const [sentConns, setSentConns] = useState<ConnectionRequestRecord[]>([]);
  const [liveDrRequests, setLiveDrRequests] = useState<DataRoomRequestRecord[]>([]);

  const activeInvestor = useMemo(() => {
    return {
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
  }, [user]);

  // Real-time synchronization of requests for this authenticated investor
  useEffect(() => {
    if (!user?.id && !user?.email) return;
    let active = true;

    const fetchAll = () => {
      requestService
        .getIncomingConnectionRequests(activeInvestor.id, user?.email)
        .then((conns) => {
          if (active) setIncomingConns(conns);
        });

      requestService
        .getSentConnectionRequests(activeInvestor.id, user?.email)
        .then((conns) => {
          if (active) setSentConns(conns);
        });

      requestService
        .getDataRoomRequestsForInvestor(activeInvestor.id, user?.email)
        .then((drs) => {
          if (active) setLiveDrRequests(drs);
        });
    };

    fetchAll();
    const unsubConn = requestService.subscribeToConnectionRequests(fetchAll);
    const unsubDr = requestService.subscribeToDataRoomRequests(fetchAll);

    return () => {
      active = false;
      unsubConn();
      unsubDr();
    };
  }, [activeInvestor.id, user?.id, user?.email]);

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
      notify(
        "student",
        "Investor saved your startup! ⭐",
        `${activeInvestor.name} (${activeInvestor.organization}) added ${name} to their portfolio watchlist.`
      );
    }
    toast.success(added ? `Saved ${name} to your watchlist` : `Removed ${name}`);
  }

  // Resolve founder identity and send connection request to the central database
  async function handleRequestConnection(startup: Startup) {
    let resolvedFounderEmail = startup.founderEmail;
    let resolvedFounderId: string | undefined = undefined;

    if (!resolvedFounderEmail) {
      try {
        const { data: dbSt } = await (supabase as any)
          .from("startups")
          .select("founder_email, founder_id")
          .eq("id", startup.id)
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

    const res = await requestService.sendConnectionRequest({
      senderId: activeInvestor.id,
      senderName: activeInvestor.name,
      senderEmail: user?.email,
      senderRole: "investor",
      senderOrg: activeInvestor.organization,
      receiverId: resolvedFounderId || startup.id,
      receiverName: startup.founder || startup.name,
      receiverEmail: resolvedFounderEmail,
      startupId: startup.id,
      startupName: startup.name,
      message: `Hi ${startup.founder || "Founder"}, I reviewed ${startup.name} on CampusVenture and would love to connect.`,
    });

    if (res.alreadyExisted) {
      toast.info(`Connection request is already pending with ${startup.name}.`);
      return;
    }

    if (resolvedFounderEmail || resolvedFounderId) {
      notify(
        "student",
        "New investor connection request",
        `${activeInvestor.name} (${activeInvestor.organization}) requested to connect with ${startup.name}.`,
        {
          recipientEmail: resolvedFounderEmail,
          recipientUserId: resolvedFounderId,
          senderEmail: user?.email,
          senderUserId: activeInvestor.id,
        }
      );
    }

    toast.success(`Connection requested with ${startup.name}`);
  }

  // Resolve founder identity and send Data Room request to the central database
  async function handleRequestDataRoom(startup: Startup) {
    let resolvedFounderEmail = startup.founderEmail;
    let resolvedFounderId: string | undefined = undefined;

    if (!resolvedFounderEmail) {
      try {
        const { data: dbSt } = await (supabase as any)
          .from("startups")
          .select("founder_email, founder_id")
          .eq("id", startup.id)
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
      startupId: startup.id,
      investorId: activeInvestor.id,
      investorName: activeInvestor.name,
      investorEmail: user?.email,
      investorOrg: activeInvestor.organization,
      startupName: startup.name,
      founderId: resolvedFounderId,
      founderEmail: resolvedFounderEmail,
      message: `Hi ${startup.founder || "Founder"}, we would like to request diligence access to your Data Room under mutual NDA.`,
    });

    if (res.alreadyExisted) {
      toast.info(`Data-room request is already pending founder review for ${startup.name}.`);
      return;
    }

    if (resolvedFounderEmail || resolvedFounderId) {
      notify(
        "student",
        "Data-room access requested",
        `${activeInvestor.name} (${activeInvestor.organization}) requested diligence access to ${startup.name} Data Room under mutual NDA.`,
        {
          recipientEmail: resolvedFounderEmail,
          recipientUserId: resolvedFounderId,
          senderEmail: user?.email,
          senderUserId: activeInvestor.id,
        }
      );
    }

    toast.info(`Data-room access requested from ${startup.name}`, {
      description: "Founder review requested. You will be notified once access is approved.",
    });
  }

  // Handle incoming connection requests sent by students to this investor
  const handleRespondToIncoming = async (reqId: string, status: "accepted" | "rejected") => {
    await requestService.respondToConnectionRequest(reqId, status);
    const target = incomingConns.find((c) => c.id === reqId);
    if (target) {
      notify(
        "student",
        status === "accepted" ? "Connection request accepted! 🤝" : "Connection request update",
        status === "accepted"
          ? `${activeInvestor.name} (${activeInvestor.organization}) accepted your connection request. Direct messaging is now unlocked.`
          : `${activeInvestor.name} is unable to connect at this time.`,
        {
          recipientEmail: target.senderEmail,
          recipientUserId: target.senderId,
          senderEmail: user?.email,
          senderUserId: activeInvestor.id,
        }
      );
    }
    toast.success(status === "accepted" ? "Connection request accepted! You can now chat." : "Connection request declined.");
  };

  const pendingIncoming = incomingConns.filter((c) => c.status === "pending");

  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Discover startups</h1>
          <p className="text-sm text-muted-foreground">
            {activeInvestor.organization} · Cross-University Verified Deal Flow · All Participating Universities
          </p>
        </div>

        {/* Live, Isolated Dashboard Metric Counters */}
        <div className="grid gap-4 sm:grid-cols-4">
          <MiniStat label="Matches" value={String(results.length)} />
          <MiniStat label="Saved Startups" value={String(saved.length)} />
          <MiniStat
            label="Connection Requests"
            value={String(pendingIncoming.length + sentConns.filter((c) => c.status === "pending").length)}
          />
          <MiniStat
            label="Data-Room Requests"
            value={String(liveDrRequests.filter((r) => r.status === "pending").length)}
          />
        </div>

        {/* INCOMING FOUNDER CONNECTION REQUESTS BANNER */}
        {pendingIncoming.length > 0 && (
          <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="size-4 text-primary" />
                  Incoming Founder Connection Requests ({pendingIncoming.length})
                </CardTitle>
                <Badge variant="default" className="text-xs bg-primary">Action Required</Badge>
              </div>
              <CardDescription>
                Student founders requesting to connect and discuss venture alignment with {activeInvestor.organization}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingIncoming.map((conn) => (
                <div
                  key={conn.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {conn.senderName} · {conn.startupName || "Startup Venture"}
                      <Badge variant="outline" className="text-[10px]">{conn.senderOrg || "Campus"}</Badge>
                    </p>
                    {conn.message && (
                      <p className="text-xs text-muted-foreground italic">"{conn.message}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRespondToIncoming(conn.id, "accepted")}
                      className="gap-1.5"
                    >
                      <Check className="size-3.5" /> Accept Connection
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespondToIncoming(conn.id, "rejected")}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      className="gap-1 text-xs"
                    >
                      <Link to={`/app/investor/messages?partnerId=${conn.senderId}`}>
                        <MessagesSquare className="size-3.5" /> Open Messages
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
                  <SelectValue placeholder="All sectors" />
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
                  <SelectValue placeholder="All stages" />
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

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>Sort by:</span>
                {(
                  [
                    ["match", "Match score"],
                    ["readiness", "Readiness"],
                    ["funding", "Funding ask"],
                    ["updated", "Recently active"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={sort === key ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSort(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

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
            {results.map(({ startup, score, reasons }) => {
              const hasSentConn = sentConns.some(
                (c) => c.startupId === startup.id && (c.status === "pending" || c.status === "accepted")
              );
              const hasSentDr = liveDrRequests.some(
                (r) => r.startupId === startup.id && (r.status === "pending" || r.status === "granted")
              );

              return (
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
                        variant={hasSentConn ? "secondary" : "outline"}
                        disabled={hasSentConn}
                        onClick={() => handleRequestConnection(startup)}
                      >
                        {hasSentConn ? "Connection Requested" : "Request connection"}
                      </Button>
                      <Button
                        size="sm"
                        variant={hasSentDr ? "secondary" : "outline"}
                        disabled={hasSentDr}
                        onClick={() => handleRequestDataRoom(startup)}
                      >
                        <FolderLock className="size-3.5" aria-hidden="true" />
                        {hasSentDr ? "Data Room Requested" : "Request data room"}
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
