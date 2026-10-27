import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  Eye,
  HandCoins,
  ShieldCheck,
  FileCheck2,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MessageSquare,
  Copy,
  Check,
  FileText,
  Lock,
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
import { formatMoney, type Investor } from "@/lib/demo-data";
import { timeAgo, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isSameUniversity } from "@/lib/university-matcher";
import { investorService } from "@/services/investorService";
import { messageService, type ChatMessageRecord } from "@/services/messageService";
import {
  requestService,
  type DataRoomRequestRecord,
  type ConnectionRequestRecord,
  type DataRoomAuditRecord,
  type DataRoomDocRecord,
} from "@/services/requestService";

const TITLE = "Investor Interest — CampusVenture University";
const DESCRIPTION =
  "See which investors are engaging with your campus startups: requests, data rooms, verified conversations and signed proof of trust.";

export const Route = createFileRoute("/app/university/investors")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: InvestorInterest,
});

function InvestorInterest() {
  const { requests, access, startups } = useVenture();
  const { user } = useAuth();
  const myUniversity = user?.org || "";

  // Strictly filter startups belonging to this authenticated university using email domain & name
  const campusStartups = startups.filter((s) =>
    isSameUniversity(
      { org: user?.org, email: user?.email },
      { university: s.university, email: s.founderEmail }
    )
  );
  const campusStartupIds = campusStartups.map((s) => s.id);

  const [investors, setInvestors] = useState<Investor[]>([]);
  const [liveDrRequests, setLiveDrRequests] = useState<DataRoomRequestRecord[]>([]);
  const [liveConnRequests, setLiveConnRequests] = useState<ConnectionRequestRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<DataRoomAuditRecord[]>([]);
  const [campusMessages, setCampusMessages] = useState<ChatMessageRecord[]>([]);
  const [campusDocs, setCampusDocs] = useState<DataRoomDocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProofReq, setSelectedProofReq] = useState<DataRoomRequestRecord | null>(null);
  const [copiedProof, setCopiedProof] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchAll = async () => {
      try {
        const [invList, activity, msgs] = await Promise.all([
          investorService.getAllInvestors(),
          requestService.getUniversityInvestorActivity({
            campusStartupIds,
            universityName: myUniversity,
            universityEmail: user?.email,
            universityOrg: user?.org,
          }),
          messageService.getAllMessagesForUser({
            startupIds: campusStartupIds.length > 0 ? campusStartupIds : undefined,
            userEmail: user?.email,
          }),
        ]);

        if (active) {
          setInvestors(invList);
          setLiveDrRequests(activity.dataRoomRequests);
          setLiveConnRequests(activity.connectionRequests);
          setAuditLogs(activity.auditLogs);
          setCampusMessages(msgs);

          const allStIds = Array.from(
            new Set([...campusStartupIds, ...(activity.discoveredStartupIds || [])])
          );
          if (allStIds.length > 0) {
            const docsArrays = await Promise.all(
              allStIds.map((id) => requestService.getDataRoomDocsForStartup(id))
            );
            if (active) setCampusDocs(docsArrays.flat());
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn("Error fetching university investor activity:", err);
        if (active) setLoading(false);
      }
    };

    fetchAll();

    // Subscribe to real-time multi-channel updates (WebSockets, BroadcastChannel, focus, and fast polling)
    const unsubDr = requestService.subscribeToDataRoomRequests(() => {
      fetchAll();
    });

    const unsubConn = requestService.subscribeToConnectionRequests(() => {
      fetchAll();
    });

    return () => {
      active = false;
      unsubDr();
      unsubConn();
    };
  }, [user?.email, user?.org, campusStartupIds.join(",")]);

  // Combine store state with live database requests
  const campusRequests = [
    ...liveConnRequests,
    ...requests.filter((r) => campusStartupIds.includes(r.startupId)),
  ];

  const campusDataRoomGrants = [
    ...liveDrRequests.filter((d) => d.status === "granted"),
    ...access.filter((a) => campusStartupIds.includes(a.startupId) && a.status === "granted"),
  ];

  const verifiedProofsCount = liveDrRequests.filter((d) => d.rulesAccepted || d.ndaSigned).length;

  const stats = [
    { label: "Connection requests", value: campusRequests.length, icon: HandCoins },
    { label: "Data-room grants", value: campusDataRoomGrants.length, icon: Eye },
    { label: "Signed Proofs of Trust", value: verifiedProofsCount, icon: ShieldCheck },
  ];

  const rows = investors
    .map((i) => {
      const invRequests = campusRequests.filter((r: any) => (r.senderId === i.id || r.investorId === i.id)).length;
      const invRooms = campusDataRoomGrants.filter((a: any) => a.investorId === i.id).length;
      const invMessages = campusMessages.filter(
        (m) =>
          (m.senderId === i.id || m.recipientId === i.id || (i.email && (m.senderEmail?.toLowerCase() === i.email.toLowerCase() || m.recipientEmail?.toLowerCase() === i.email.toLowerCase()))) &&
          campusStartupIds.includes(m.startupId)
      ).length;
      const invProofs = liveDrRequests.filter(
        (r) =>
          (r.investorId === i.id || (i.email && r.investorEmail?.toLowerCase() === i.email.toLowerCase())) &&
          (r.rulesAccepted || r.ndaSigned)
      ).length;

      return {
        investor: i,
        requests: invRequests,
        rooms: invRooms,
        messages: invMessages,
        proofs: invProofs,
        totalActivity: invRequests + invRooms + invMessages + invProofs,
      };
    })
    .sort((a, b) => b.totalActivity - a.totalActivity);

  // Recent activity specifically for this campus
  const recentActivities: Array<{ id: string; investorName: string; startupName: string; kind: string; status: string; at: string }> = [];

  liveDrRequests.forEach((d) => {
    recentActivities.push({
      id: d.id,
      investorName: d.investorName || "Investor",
      startupName: d.startupName || "Campus Venture",
      kind: d.rulesAccepted || d.ndaSigned ? "Data-room access granted (Rules Signed)" : "Data-room request",
      status: d.status,
      at: d.updatedAt || d.createdAt,
    });
  });

  liveConnRequests.forEach((c) => {
    recentActivities.push({
      id: c.id,
      investorName: c.senderName || "Investor",
      startupName: c.startupName || "Campus Venture",
      kind: "Connection request",
      status: c.status,
      at: c.createdAt,
    });
  });

  const recent = recentActivities.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  const handleCopyProofSummary = () => {
    if (!selectedProofReq) return;
    const proof = selectedProofReq.rulesProof;
    const summary = `CAMPUSVENTURE PROOF OF TRUST CERTIFICATE (v1.0-cv-reg)
Reference ID: ${selectedProofReq.id}
Investor: ${proof?.investorName || selectedProofReq.investorName} (${proof?.investorEmail || selectedProofReq.investorEmail})
Organization: ${proof?.investorOrg || selectedProofReq.investorOrg || "Accredited Investment Partner"}
Startup Venture: ${selectedProofReq.startupName}
Founder: ${selectedProofReq.founderEmail}
University: ${myUniversity || "Campus Partner University"}
Execution Timestamp: ${proof?.timestamp || selectedProofReq.rulesAcceptedAt || selectedProofReq.updatedAt}
Rules Version: ${proof?.rulesVersion || selectedProofReq.rulesVersion || "v1.0-cv-reg"}
Status: Legally Acknowledged & Stored in University Database
Declaration: ${proof?.declaration || "Rules and Regulations acknowledged in full presence and accountability."}`;

    navigator.clipboard.writeText(summary);
    setCopiedProof(true);
    toast.success("Signed Proof of Trust copied to clipboard.");
    setTimeout(() => setCopiedProof(false), 2000);
  };

  return (
    <AppShell role="university">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Investor interest</h1>
          <p className="text-sm text-muted-foreground">
            Live institutional engagement across startups from {myUniversity || "your campus"}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 pt-6">
                <s.icon className="size-5 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investors engaging with your campus</CardTitle>
            <CardDescription>Ranked by total verified activity for {myUniversity || "your university"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Cheque</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Data rooms</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Proof of Trust</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.investor.id}>
                    <TableCell>
                      <p className="font-medium">{r.investor.name}</p>
                      <p className="text-xs text-muted-foreground">{r.investor.organization}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatMoney(r.investor.ticketMin)}–{formatMoney(r.investor.ticketMax)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.requests}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.rooms}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.messages}</TableCell>
                    <TableCell className="text-right">
                      {r.proofs > 0 ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-medium">
                          {r.proofs} Verified
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent campus activity</CardTitle>
            <CardDescription>Latest investor requests for {myUniversity || "your startups"}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recent.length === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No investor activity recorded for {myUniversity || "your campus"} yet. When investors request data rooms or send connection requests, they will appear here.
              </p>
            )}
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">
                    {r.investorName} → {r.startupName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.kind} · {timeAgo(r.at)}
                  </p>
                </div>
                <Badge variant={r.status === "granted" || r.status === "accepted" ? "default" : "outline"} className="capitalize">
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* INSTITUTIONAL DILIGENCE & SIGNED PROOF OF TRUST AUDIT VIEW */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-600" />
                  <CardTitle className="text-base">Diligence &amp; Rules Acceptance Audit Log</CardTitle>
                </div>
                <CardDescription>
                  Verified records of student founders granting access, conversations, confidential documents shared, and signed investor compliance forms (v1.0-cv-reg) stored for {myUniversity || "your campus"}.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                Official Compliance Archive · Privacy Preserved
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveDrRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">No Data Room Diligence Requests Recorded Yet</p>
                <p>When accredited investors request Data Room access for startups from your institution, diligence status, confidential document scopes, and signed compliance proofs will be tracked here.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Startup &amp; Founder</TableHead>
                      <TableHead>Investor</TableHead>
                      <TableHead>Diligence Status</TableHead>
                      <TableHead>Conversation</TableHead>
                      <TableHead>Confidential Docs</TableHead>
                      <TableHead className="text-right">Signed Proof of Trust</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveDrRequests.map((req) => {
                      const st = campusStartups.find((s) => s.id === req.startupId);
                      const isSigned = Boolean(req.rulesAccepted || req.ndaSigned);
                      const msgsWithInvestor = campusMessages.filter(
                        (m) =>
                          m.startupId === req.startupId &&
                          (m.senderId === req.investorId ||
                            m.recipientId === req.investorId ||
                            (req.investorEmail &&
                              (m.senderEmail?.toLowerCase() === req.investorEmail.toLowerCase() ||
                                m.recipientEmail?.toLowerCase() === req.investorEmail.toLowerCase())))
                      );

                      const permittedDocs = campusDocs.filter(
                        (d) =>
                          d.startupId === req.startupId &&
                          (!req.permittedDocIds || req.permittedDocIds.length === 0 || req.permittedDocIds.includes(d.id))
                      );

                      return (
                        <TableRow key={req.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{req.startupName || st?.name || "Campus Venture"}</p>
                            <p className="text-xs text-muted-foreground">Founder: {req.founderEmail || st?.founder || "Verified Student"}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{req.investorName || "Investor"}</p>
                            <p className="text-xs text-muted-foreground">{req.investorOrg || req.investorEmail || "Accredited Entity"}</p>
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
                              {req.status}
                            </Badge>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {timeAgo(req.updatedAt || req.createdAt)}
                            </p>
                          </TableCell>
                          <TableCell>
                            {msgsWithInvestor.length > 0 ? (
                              <Badge variant="outline" className="gap-1 text-xs border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10">
                                <MessageSquare className="size-3" />
                                {msgsWithInvestor.length} message{msgsWithInvestor.length === 1 ? "" : "s"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No messages yet</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {req.status === "granted" ? (
                              <div>
                                <span className="font-medium text-xs text-foreground flex items-center gap-1">
                                  <FileCheck2 className="size-3.5 text-emerald-600" />
                                  {permittedDocs.length > 0
                                    ? `${permittedDocs.length} file${permittedDocs.length === 1 ? "" : "s"} granted`
                                    : Array.isArray(req.permittedDocIds) && req.permittedDocIds.length > 0
                                    ? `${req.permittedDocIds.length} file(s) authorized`
                                    : "All files authorized"}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  Confidential diligence scope
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isSigned ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                                onClick={() => setSelectedProofReq(req)}
                              >
                                <ShieldCheck className="size-3.5 text-emerald-600" />
                                View Signed Proof
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                Pending Opening
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground pt-1 italic">
              Notice: Under platform privacy rules, university incubators monitor institutional diligence interactions, compliance status, and regulatory execution. Proprietary file payloads, cap table details, and IP downloads remain private to the founder and approved investor.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ==================================================================== */}
      {/* SIGNED PROOF OF TRUST & REGULATORY COMPLIANCE MODAL                  */}
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
                Signed Proof of Trust &amp; Diligence Compliance
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Official institutional certificate stored in university database verifying legal adherence to Platform Rules &amp; Regulations (v1.0-cv-reg).
            </DialogDescription>
          </DialogHeader>

          {selectedProofReq && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Verified Certificate Banner */}
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs">Legally Executed &amp; Stored as Permanent Trust Proof</p>
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/90 leading-relaxed">
                    The investor confirmed in full capacity and presence their acceptance of all confidentiality rules, founder protections, and consequences before gaining access to confidential documents.
                  </p>
                </div>
              </div>

              {/* Two-Column Parties Metadata Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  <span className="font-semibold text-foreground text-xs block border-b pb-1">
                    Accredited Investor
                  </span>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Full Legal Name:</span>
                    <span className="font-medium text-foreground">
                      {selectedProofReq.rulesProof?.investorName || selectedProofReq.investorName || "Accredited Investor"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Email Address:</span>
                    <span className="font-medium text-foreground font-mono text-[11px]">
                      {selectedProofReq.rulesProof?.investorEmail || selectedProofReq.investorEmail || "investor@venture.com"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Organization / Entity:</span>
                    <span className="text-foreground">
                      {selectedProofReq.rulesProof?.investorOrg || selectedProofReq.investorOrg || "Venture Capital Partner"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  <span className="font-semibold text-foreground text-xs block border-b pb-1">
                    Campus Venture &amp; Founder
                  </span>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Startup Venture:</span>
                    <span className="font-medium text-foreground">
                      {selectedProofReq.startupName || "Campus Venture"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Student Founder:</span>
                    <span className="font-medium text-foreground font-mono text-[11px]">
                      {selectedProofReq.rulesProof?.founderEmail || selectedProofReq.founderEmail || "student@university.edu"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">University Institution:</span>
                    <span className="text-foreground">
                      {myUniversity || selectedProofReq.universityName || "Campus Partner University"}
                    </span>
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
                    All Data Room confidential materials (pitch decks, cap tables, financial models) granted by student founder under executed mutual agreement.
                  </p>
                )}
              </div>

              {/* The Submitted Investor Form & Declaration */}
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
                  "{selectedProofReq.rulesProof?.declaration ||
                    `I confirm that I am investor ${selectedProofReq.investorName} (${selectedProofReq.investorEmail}), in my full presence and legal authority. I am okay with all platform rules and regulations (v1.0-cv-reg) and the consequences of rule breaks. I agree and submit this form as permanent proof of verification and security for ${selectedProofReq.startupName} and founder.`}"
                </blockquote>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/60">
                  <span>
                    Timestamp: {new Date(selectedProofReq.rulesProof?.timestamp || selectedProofReq.rulesAcceptedAt || selectedProofReq.updatedAt).toLocaleString()}
                  </span>
                  <span className="font-mono text-[10px]">
                    Storage Hash: {selectedProofReq.id}
                  </span>
                </div>
              </div>
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
              {copiedProof ? "Copied" : "Copy Verification Proof"}
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
