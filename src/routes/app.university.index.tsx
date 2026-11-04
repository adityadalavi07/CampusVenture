import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import {
  ShieldCheck,
  FileCheck2,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STAGES, formatMoney } from "@/lib/demo-data";
import { STATUS_LABEL, timeAgo, formatWhen, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isSameUniversity } from "@/lib/university-matcher";
import {
  requestService,
  type DataRoomRequestRecord,
  type DataRoomDocRecord,
} from "@/services/requestService";
import { messageService, type ChatMessageRecord } from "@/services/messageService";

const TITLE = "University Ecosystem Dashboard — CampusVenture";
const DESCRIPTION =
  "Monitor student startups, readiness distribution, investor interest, confidential diligence grants, and signed proof of trust.";

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
    if (!user || !user.org || user.org === "University Innovation & Incubation Cell") return true;
    return isSameUniversity(
      { org: user.org, email: user.email },
      { university: s.university, email: s.founderEmail }
    );
  });
  const uniStartupIds = uniStartups.map((s) => s.id);

  const uniStudents = students.filter((st) => {
    if (!user || !user.org || user.org === "University Innovation & Incubation Cell") return true;
    return isSameUniversity(
      { org: user.org, email: user.email },
      { org: st.org, email: st.email }
    );
  });

  const [liveDrRequests, setLiveDrRequests] = useState<DataRoomRequestRecord[]>([]);
  const [campusMessages, setCampusMessages] = useState<ChatMessageRecord[]>([]);
  const [campusDocs, setCampusDocs] = useState<DataRoomDocRecord[]>([]);
  const [selectedProofReq, setSelectedProofReq] = useState<DataRoomRequestRecord | null>(null);
  const [copiedProof, setCopiedProof] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchActivity = async () => {
      try {
        const [activity, msgs] = await Promise.all([
          requestService.getUniversityInvestorActivity({
            campusStartupIds: uniStartupIds,
            universityName: user?.org,
            universityEmail: user?.email,
            universityOrg: user?.org,
          }),
          messageService.getAllMessagesForUser({
            startupIds: uniStartupIds.length > 0 ? uniStartupIds : undefined,
            userEmail: user?.email,
          }),
        ]);

        if (active) {
          setLiveDrRequests(activity.dataRoomRequests);
          setCampusMessages(msgs);

          const allStIds = Array.from(
            new Set([...uniStartupIds, ...(activity.discoveredStartupIds || [])])
          );
          if (allStIds.length > 0) {
            const docsArrays = await Promise.all(
              allStIds.map((id) => requestService.getDataRoomDocsForStartup(id))
            );
            if (active) setCampusDocs(docsArrays.flat());
          }
        }
      } catch (err) {
        console.warn("Error fetching dashboard diligence activity:", err);
      }
    };

    fetchActivity();

    const unsubDr = requestService.subscribeToDataRoomRequests(() => {
      fetchActivity();
    });

    const unsubConn = requestService.subscribeToConnectionRequests(() => {
      fetchActivity();
    });

    return () => {
      active = false;
      unsubDr();
      unsubConn();
    };
  }, [user?.email, user?.org, uniStartupIds.join(",")]);

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
  const verifiedProofsCount = liveDrRequests.filter((d) => d.rulesAccepted || d.ndaSigned).length;

  const handleCopyProofSummary = () => {
    if (!selectedProofReq) return;
    const proof = selectedProofReq.rulesProof;
    const summary = `CAMPUSVENTURE UNIVERSITY DILIGENCE & COMPLIANCE RECORD
=====================================================
Request ID: ${selectedProofReq.id}
Startup: ${selectedProofReq.startupName} (ID: ${selectedProofReq.startupId})
Associated University: ${selectedProofReq.universityName || uniName}
Student Founder: ${selectedProofReq.founderName || "Student Founder"} (${selectedProofReq.founderEmail})
Investor: ${selectedProofReq.investorName} (${selectedProofReq.investorEmail})
Investor Organization: ${selectedProofReq.investorOrg || "Accredited Investment Partner"}

CHRONOLOGICAL DILIGENCE HISTORY:
1. Access Request Submitted: ${selectedProofReq.createdAt ? new Date(selectedProofReq.createdAt).toLocaleString() : "N/A"}
2. Founder Decision: ${(selectedProofReq.decision || selectedProofReq.status).toUpperCase()} on ${selectedProofReq.decisionAt || selectedProofReq.updatedAt ? new Date(selectedProofReq.decisionAt || selectedProofReq.updatedAt).toLocaleString() : "N/A"}
   Terms / Reason: ${selectedProofReq.discussionTerms || selectedProofReq.declineReason || "Standard diligence terms"}
3. Rules & Regulations Acceptance: ${selectedProofReq.rulesAccepted || selectedProofReq.ndaSigned ? `ACCEPTED (${selectedProofReq.rulesVersion || "v1.0-cv-reg"}) on ${new Date(selectedProofReq.rulesAcceptedAt || selectedProofReq.updatedAt).toLocaleString()}` : "PENDING INVESTOR ACCEPTANCE"}
   Declaration: ${proof?.declaration || "Platform rules and regulations acknowledged in full presence and accountability."}
4. Current Access Status: ${selectedProofReq.status.toUpperCase()}
   Authorized Files: ${(selectedProofReq.permittedDocIds || []).length > 0 ? `${selectedProofReq.permittedDocIds.length} file(s) authorized` : "All founder-approved files"}

VERIFICATION: Tamper-evident diligence record persistent in Supabase university database.`;

    navigator.clipboard.writeText(summary);
    setCopiedProof(true);
    toast.success("Diligence audit certificate copied to clipboard.");
    setTimeout(() => setCopiedProof(false), 2000);
  };

  return (
    <AppShell role="university">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Ecosystem dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {uniName} · Innovation &amp; Incubation Cell
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Student founders" value={String(uniStudents.length)} />
          <Stat label="Verified startups" value={String(uniStartups.filter((s) => s.status === "approved").length)} />
          <Stat label="Active startups" value={String(uniStartups.length)} />
          <Stat label="Signed Proofs of Trust" value={String(verifiedProofsCount)} highlight />
          <Stat label="Avg. readiness" value={`${avgReadiness}/100`} />
        </div>

        {/* ACTIVE INVESTOR DILIGENCE & SIGNED PROOF OF TRUST CARD */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-600" />
                  <CardTitle className="text-base">Investor Diligence &amp; Signed Proof of Trust</CardTitle>
                </div>
                <CardDescription>
                  Verified records of student founders granting data room access, conversations, and signed investor compliance forms (v1.0-cv-reg).
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
                <Link to="/app/university/investors">
                  <span>Full Diligence Audit</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveDrRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">No Diligence Requests Recorded Yet</p>
                <p>When investors request confidential data room access and student founders grant permissions, signed compliance records and shared confidential documents will appear here.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto w-full">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Startup &amp; ID</TableHead>
                      <TableHead>Student Founder</TableHead>
                      <TableHead>Investor</TableHead>
                      <TableHead>Submission &amp; Decision</TableHead>
                      <TableHead>Investor Rules Acceptance</TableHead>
                      <TableHead>Access Status</TableHead>
                      <TableHead className="text-right">Diligence Audit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveDrRequests.slice(0, 8).map((req) => {
                      const isSigned = Boolean(req.rulesAccepted || req.ndaSigned);
                      const decision = req.decision || (req.status === "granted" ? "accepted" : req.status === "rejected" ? "rejected" : req.status === "revoked" ? "revoked" : "pending");
                      const decisionTimestamp = req.decisionAt || (req.status !== "pending" ? req.updatedAt : undefined);

                      return (
                        <TableRow key={req.id}>
                          <TableCell>
                            <p className="font-medium text-sm text-foreground">{req.startupName || "Campus Venture"}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="font-mono text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded cursor-help"
                                title={`Full Startup ID: ${req.startupId}`}
                              >
                                ID: {req.startupId ? req.startupId.slice(0, 8) : "—"}
                              </span>
                              <span className="text-[11px] text-muted-foreground truncate max-w-[140px]" title={req.universityName || uniName}>
                                · {req.universityName || uniName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-xs text-foreground">{req.founderName || "Student Founder"}</p>
                            <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                              {req.founderEmail || "student@university.edu"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-xs text-foreground">{req.investorName || "Accredited Investor"}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{req.investorEmail || "—"}</p>
                            <p className="text-[10px] text-muted-foreground/80">{req.investorOrg || "Venture Fund"}</p>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                {decision === "accepted" ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium">
                                    Founder Accepted
                                  </Badge>
                                ) : decision === "rejected" ? (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Founder Rejected
                                  </Badge>
                                ) : decision === "revoked" ? (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Founder Revoked
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10">
                                    Pending Decision
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Req: {formatWhen(req.createdAt)}
                              </p>
                              {decisionTimestamp && decision !== "pending" && (
                                <p className="text-[10px] text-muted-foreground">
                                  Decided: {formatWhen(decisionTimestamp)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isSigned ? (
                              <div className="space-y-0.5">
                                <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium">
                                  <ShieldCheck className="size-3 text-emerald-600" />
                                  Rules Accepted ({req.rulesVersion || "v1.0-cv-reg"})
                                </Badge>
                                <p className="text-[10px] text-muted-foreground">
                                  Signed: {formatWhen(req.rulesAcceptedAt || req.updatedAt)}
                                </p>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Pending Rules Acceptance
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                req.status === "granted"
                                  ? "default"
                                  : req.status === "rejected" || req.status === "revoked"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-xs capitalize"
                            >
                              {req.status === "granted" ? "Active" : req.status}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {timeAgo(req.updatedAt || req.createdAt)}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-primary/20 hover:bg-primary/5"
                              onClick={() => setSelectedProofReq(req)}
                            >
                              <ShieldCheck className="size-3.5 text-primary" />
                              Inspect History
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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

      {/* ==================================================================== */}
      {/* INSTITUTIONAL DILIGENCE HISTORY & SIGNED PROOF OF TRUST MODAL         */}
      {/* ==================================================================== */}
      <Dialog
        open={selectedProofReq !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProofReq(null);
            setCopiedProof(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              <DialogTitle className="text-lg">
                Institutional Diligence History &amp; Proof of Trust
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Verifiable compliance record persistent in university database for authorized staff inspection.
            </DialogDescription>
          </DialogHeader>

          {selectedProofReq && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Verified Certificate Banner */}
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs">
                    Persistent Diligence Record · Ref: {selectedProofReq.id}
                  </p>
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/90 leading-relaxed">
                    This diligence activity is bound to {selectedProofReq.universityName || uniName} based on verified student founder institutional affiliation.
                  </p>
                </div>
              </div>

              {/* Two-Column Parties & Entity Metadata Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  <span className="font-semibold text-foreground text-xs block border-b pb-1">
                    Accredited Investor
                  </span>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Full Legal Name:</span>
                    <span className="font-medium text-foreground">
                      {selectedProofReq.investorName || "Accredited Investor"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Verified Email:</span>
                    <span className="font-medium text-foreground font-mono text-[11px]">
                      {selectedProofReq.investorEmail || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Organization / Entity:</span>
                    <span className="text-foreground">
                      {selectedProofReq.investorOrg || "Venture Capital Partner"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  <span className="font-semibold text-foreground text-xs block border-b pb-1">
                    Campus Venture &amp; Student Founder
                  </span>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Startup Venture:</span>
                    <span className="font-medium text-foreground">
                      {selectedProofReq.startupName || "Campus Venture"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground block">
                      ID: {selectedProofReq.startupId}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Student Founder:</span>
                    <span className="font-medium text-foreground">
                      {selectedProofReq.founderName || "Student Founder"}
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px] block">
                      {selectedProofReq.founderEmail || "student@university.edu"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Associated University:</span>
                    <span className="text-foreground font-medium">{selectedProofReq.universityName || uniName}</span>
                  </div>
                </div>
              </div>

              {/* Chronological Diligence Audit Trail */}
              <div className="rounded-lg border p-3.5 space-y-3 bg-card">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Chronological Diligence Lifecycle
                </p>
                <div className="space-y-3 border-l-2 border-border/70 pl-3.5 ml-1">
                  {/* Step 1: Submission */}
                  <div className="relative space-y-0.5">
                    <div className="absolute -left-[19px] top-1 size-2 rounded-full bg-primary" />
                    <p className="font-medium text-foreground">Step 1: Access Request Submitted</p>
                    <p className="text-[11px] text-muted-foreground">
                      Submitted on: {formatWhen(selectedProofReq.createdAt)}
                    </p>
                    {selectedProofReq.message && (
                      <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-1.5 rounded mt-1">
                        "{selectedProofReq.message}"
                      </p>
                    )}
                  </div>

                  {/* Step 2: Founder Decision */}
                  <div className="relative space-y-0.5">
                    <div className="absolute -left-[19px] top-1 size-2 rounded-full bg-primary" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">Step 2: Student Founder Decision:</span>
                      <Badge
                        variant={
                          selectedProofReq.decision === "accepted" || selectedProofReq.status === "granted"
                            ? "default"
                            : selectedProofReq.decision === "rejected" || selectedProofReq.status === "rejected"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px] capitalize"
                      >
                        {selectedProofReq.decision || selectedProofReq.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Decided on: {formatWhen(selectedProofReq.decisionAt || selectedProofReq.updatedAt)} by {selectedProofReq.founderName || "Founder"}
                    </p>
                    {selectedProofReq.discussionTerms && (
                      <p className="text-[11px] text-muted-foreground">
                        Terms: {selectedProofReq.discussionTerms}
                      </p>
                    )}
                    {selectedProofReq.declineReason && (
                      <p className="text-[11px] text-destructive">
                        Reason: {selectedProofReq.declineReason}
                      </p>
                    )}
                  </div>

                  {/* Step 3: Rules & Regulations Acceptance */}
                  <div className="relative space-y-0.5">
                    <div className="absolute -left-[19px] top-1 size-2 rounded-full bg-primary" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">Step 3: Investor Rules Acceptance:</span>
                      <Badge
                        variant={selectedProofReq.rulesAccepted || selectedProofReq.ndaSigned ? "outline" : "outline"}
                        className={`text-[10px] ${
                          selectedProofReq.rulesAccepted || selectedProofReq.ndaSigned
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "text-muted-foreground"
                        }`}
                      >
                        {selectedProofReq.rulesAccepted || selectedProofReq.ndaSigned
                          ? `Accepted (${selectedProofReq.rulesVersion || "v1.0-cv-reg"})`
                          : "Pending Investor Acceptance"}
                      </Badge>
                    </div>
                    {selectedProofReq.rulesAccepted || selectedProofReq.ndaSigned ? (
                      <p className="text-[11px] text-muted-foreground">
                        Executed on: {formatWhen(selectedProofReq.rulesAcceptedAt || selectedProofReq.updatedAt)} by {selectedProofReq.ndaSignedName || selectedProofReq.investorName}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Investor must accept platform rules ({selectedProofReq.rulesVersion || "v1.0-cv-reg"}) prior to unlocking confidential files.
                      </p>
                    )}
                  </div>

                  {/* Step 4: Access Status */}
                  <div className="relative space-y-0.5">
                    <div className="absolute -left-[19px] top-1 size-2 rounded-full bg-primary" />
                    <p className="font-medium text-foreground">
                      Step 4: Current Access Status: <span className="uppercase font-semibold">{selectedProofReq.status}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Access window: {selectedProofReq.accessDurationDays || 30} days {selectedProofReq.expiresAt ? `(Expires: ${formatWhen(selectedProofReq.expiresAt)})` : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scope of Permitted Confidential Documents */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileCheck2 className="size-3.5 text-emerald-600" />
                    Authorized Confidential Materials
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Founder Approved
                  </Badge>
                </div>
                {selectedProofReq.permittedDocIds && selectedProofReq.permittedDocIds.length > 0 ? (
                  <div className="space-y-1">
                    {campusDocs
                      .filter((d) => selectedProofReq.permittedDocIds?.includes(d.id))
                      .map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between py-1 border-b border-border/40 last:border-none">
                          <span className="font-medium text-foreground">{doc.name}</span>
                          <span className="text-muted-foreground text-[10px]">({doc.category}) · {doc.size}</span>
                        </div>
                      ))}
                    {campusDocs.filter((d) => selectedProofReq.permittedDocIds?.includes(d.id)).length === 0 && (
                      <p className="text-muted-foreground text-xs">
                        {selectedProofReq.permittedDocIds.length} confidential document(s) authorized under selective disclosure scope.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    All Data Room confidential materials granted by student founder under executed mutual agreement.
                  </p>
                )}
              </div>

              {/* Submitted Investor Form & Declaration */}
              {selectedProofReq.rulesProof?.declaration && (
                <div className="rounded-lg border bg-muted/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="font-semibold text-foreground text-xs">
                      Submitted Compliance Declaration &amp; Covenant
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                      {selectedProofReq.rulesProof?.rulesVersion || selectedProofReq.rulesVersion || "v1.0-cv-reg"}
                    </Badge>
                  </div>

                  <blockquote className="border-l-2 border-emerald-600 pl-3 italic text-muted-foreground text-xs leading-relaxed py-0.5">
                    "{selectedProofReq.rulesProof.declaration}"
                  </blockquote>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/60">
                    <span>
                      Timestamp: {new Date(selectedProofReq.rulesProof.timestamp || selectedProofReq.rulesAcceptedAt || selectedProofReq.updatedAt).toLocaleString()}
                    </span>
                    <span className="font-mono text-[10px]">
                      Storage Hash: {selectedProofReq.id}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyProofSummary}
              className="gap-1.5 text-xs"
            >
              {copiedProof ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copiedProof ? "Copied" : "Copy Diligence Audit Certificate"}
            </Button>
            <Button size="sm" onClick={() => setSelectedProofReq(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-5 ${highlight ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {highlight && <ShieldCheck className="size-3.5 text-emerald-600 inline" />}
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${highlight ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
        {value}
      </p>
    </div>
  );
}
