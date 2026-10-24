import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  FileLock2,
  FileUp,
  MessageSquare,
  Calendar,
  ShieldCheck,
  Trash2,
  X,
  Clock,
  UserCheck,
  Send,
  Building,
  Mail,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MY_STARTUP_ID, timeAgo, useVenture, type DataRoomDoc } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { requestService, type DataRoomRequestRecord, type ConnectionRequestRecord, type DataRoomDocRecord } from "@/services/requestService";
import { messageService, type ChatMessageRecord } from "@/services/messageService";

const TITLE = "Data Room & Requests — CampusVenture Founder";
const DESCRIPTION =
  "Manage confidential files under NDA, review data room access requests, and respond to investor connection inquiries.";

export const Route = createFileRoute("/app/student/dataroom")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: StudentDataRoom,
  errorComponent: ({ error, reset }) => (
    <AppShell role="student">
      <div className="mx-auto max-w-lg py-12 text-center space-y-3">
        <h2 className="text-lg font-semibold text-destructive">Data Room Error</h2>
        <p className="text-xs text-muted-foreground">
          {error?.message || "An unexpected error occurred while loading the data room."}
        </p>
        <Button size="sm" onClick={() => reset()}>
          Retry
        </Button>
      </div>
    </AppShell>
  ),
});

const CATEGORIES: DataRoomDoc["category"][] = [
  "Financials",
  "Legal",
  "Product",
  "Metrics",
  "Cap table",
];

function StudentDataRoom() {
  const { docs, addDoc, removeDoc, setAccessStatus, notify, startups } = useVenture();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<DataRoomDoc["category"]>("Financials");

  // Requests and inquiry states
  const [liveRequests, setLiveRequests] = useState<DataRoomRequestRecord[]>([]);
  const [connRequests, setConnRequests] = useState<ConnectionRequestRecord[]>([]);
  const [recentMessages, setRecentMessages] = useState<ChatMessageRecord[]>([]);
  const [realDocs, setRealDocs] = useState<DataRoomDocRecord[]>([]);

  const userStartups = (startups || []).filter(
    (s) =>
      (user?.email && s?.founderEmail?.toLowerCase() === user.email?.toLowerCase()) ||
      (user?.name && s?.founder === user.name)
  );
  const currentStartup = userStartups[0];
  const startupIds = Array.from(
    new Set([
      ...userStartups.map((s) => s.id),
      ...(currentStartup?.id ? [currentStartup.id] : []),
      ...(user?.id ? [user.id] : []),
      MY_STARTUP_ID,
    ])
  );
  const currentStartupId = currentStartup?.id || user?.id || MY_STARTUP_ID;

  // Real-time synchronization of confidential documents from Supabase
  useEffect(() => {
    let active = true;
    const fetchDocs = () => {
      requestService.getDataRoomDocsForStartup(currentStartupId).then((files) => {
        if (active) setRealDocs(files);
      });
    };

    fetchDocs();
    const unsubDocs = requestService.subscribeToDataRoomDocs(fetchDocs);
    return () => {
      active = false;
      unsubDocs();
    };
  }, [currentStartupId]);

  // 1. Synchronize Data Room access requests
  useEffect(() => {
    let active = true;
    const fetchRequests = () => {
      requestService
        .getDataRoomRequestsForStudent({
          startupIds,
          ...(user?.id ? { founderId: user.id } : {}),
          ...(user?.email ? { founderEmail: user.email } : {}),
        })
        .then((reqs) => {
          if (active) setLiveRequests(reqs);
        });
    };

    fetchRequests();
    const unsub = requestService.subscribeToDataRoomRequests(fetchRequests);
    return () => {
      active = false;
      unsub();
    };
  }, [startupIds.join(","), user?.id, user?.email]);

  // 2. Synchronize Connection requests
  useEffect(() => {
    let active = true;
    const fetchConns = () => {
      requestService
        .getIncomingConnectionRequests(user?.id || currentStartupId, user?.email, startupIds)
        .then((reqs) => {
          if (active) setConnRequests(reqs);
        });
    };

    fetchConns();
    const unsub = requestService.subscribeToConnectionRequests(fetchConns);
    return () => {
      active = false;
      unsub();
    };
  }, [user?.id, user?.email, startupIds.join(","), currentStartupId]);

  // 3. Synchronize incoming messages from investors
  useEffect(() => {
    let active = true;
    const fetchMsgs = () => {
      messageService
        .getAllMessagesForUser({ userId: user?.id, userEmail: user?.email })
        .then((msgs) => {
          if (active) {
            const incoming = msgs.filter((m) => m.senderRole === "investor");
            setRecentMessages(incoming);
          }
        });
    };

    fetchMsgs();
    const unsub = messageService.subscribeToMessages(() => {
      fetchMsgs();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [user?.id, user?.email]);

  // Modals state for Data Room Access Requests
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<DataRoomRequestRecord | null>(null);
  const [discussionTerms, setDiscussionTerms] = useState(
    "30-Day Confidential Diligence under Mutual NDA. Includes cap table, pitch deck, and financial model."
  );
  const [nextSteps, setNextSteps] = useState(
    "1. Investor completes initial review of confidential documents and metrics.\n2. Schedule a 30-minute founder diligence call via CampusVenture Meetings.\n3. Discuss valuation terms, syndicate check size, and closing schedule."
  );
  const [declineReason, setDeclineReason] = useState(
    "Our current financing round is fully subscribed at this stage. We would love to stay in touch for future milestones."
  );

  // Modals state for Connection Requests
  const [connAcceptModalOpen, setConnAcceptModalOpen] = useState(false);
  const [connDeclineModalOpen, setConnDeclineModalOpen] = useState(false);
  const [selectedConn, setSelectedConn] = useState<ConnectionRequestRecord | null>(null);
  const [connTerms, setConnTerms] = useState("Open introduction and venture alignment discussion.");
  const [connNextSteps, setConnNextSteps] = useState(
    "1. Founder & Investor intro discussion.\n2. Review public deck and venture traction.\n3. Schedule diligence sync."
  );
  const [connDeclineReason, setConnDeclineReason] = useState(
    "Thank you for reaching out. We are focusing on product execution right now."
  );

  const openGrantDialog = (req: DataRoomRequestRecord) => {
    setSelectedReq(req);
    if (req.discussionTerms) setDiscussionTerms(req.discussionTerms);
    if (req.nextSteps) setNextSteps(req.nextSteps);
    setGrantModalOpen(true);
  };

  const openDeclineDialog = (req: DataRoomRequestRecord) => {
    setSelectedReq(req);
    if (req.declineReason) setDeclineReason(req.declineReason);
    setDeclineModalOpen(true);
  };

  const handleConfirmGrant = async () => {
    if (!selectedReq) return;
    const reqId = selectedReq.id;
    const invName = selectedReq.investorName || "Investor";

    await requestService.updateDataRoomRequestStatus(reqId, "granted", {
      discussionTerms,
      nextSteps,
    });
    setAccessStatus(reqId, "granted");
    setLiveRequests((prev) =>
      prev.map((r) =>
        r.id === reqId ? { ...r, status: "granted", discussionTerms, nextSteps } : r
      )
    );
    notify(
      "investor",
      "Data-room access granted & terms shared",
      `${invName} can now view confidential diligence files and review discussion terms for ${selectedReq.startupName || "Startup"}.`,
      {
        recipientEmail: selectedReq.investorEmail,
        recipientUserId: selectedReq.investorId,
      }
    );
    toast.success(`Access granted to ${invName}! Next steps projected.`);
    setGrantModalOpen(false);
  };

  const handleConfirmDecline = async () => {
    if (!selectedReq) return;
    const reqId = selectedReq.id;
    const invName = selectedReq.investorName || "Investor";
    const newStatus = selectedReq.status === "granted" ? "revoked" : "rejected";

    await requestService.updateDataRoomRequestStatus(reqId, newStatus, {
      declineReason,
    });
    setAccessStatus(reqId, "revoked");
    setLiveRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: newStatus, declineReason } : r))
    );
    notify(
      "investor",
      newStatus === "revoked" ? "Data-room access revoked" : "Data-room request declined",
      newStatus === "revoked"
        ? `Founder revoked data-room access for ${selectedReq.startupName || "Startup"}. Feedback: "${declineReason}"`
        : `Founder declined data-room access for ${selectedReq.startupName || "Startup"}. Feedback: "${declineReason}"`,
      {
        recipientEmail: selectedReq.investorEmail,
        recipientUserId: selectedReq.investorId,
      }
    );
    toast.info(newStatus === "revoked" ? `Access revoked for ${invName}` : `Request declined with feedback note sent to ${invName}`);
    setDeclineModalOpen(false);
  };

  const openConnAcceptDialog = (conn: ConnectionRequestRecord) => {
    setSelectedConn(conn);
    if (conn.discussionTerms) setConnTerms(conn.discussionTerms);
    if (conn.nextSteps) setConnNextSteps(conn.nextSteps);
    setConnAcceptModalOpen(true);
  };

  const openConnDeclineDialog = (conn: ConnectionRequestRecord) => {
    setSelectedConn(conn);
    if (conn.declineReason) setConnDeclineReason(conn.declineReason);
    setConnDeclineModalOpen(true);
  };

  const handleConfirmConnAccept = async () => {
    if (!selectedConn) return;
    const reqId = selectedConn.id;
    const partnerName = selectedConn.senderName || "Member";

    await requestService.respondToConnectionRequest(reqId, "accepted", {
      discussionTerms: connTerms,
      nextSteps: connNextSteps,
    });

    setConnRequests((prev) =>
      prev.map((c) =>
        c.id === reqId
          ? { ...c, status: "accepted", discussionTerms: connTerms, nextSteps: connNextSteps }
          : c
      )
    );

    // Send initial intro message in real-time
    const introMsg = `Hi ${partnerName.split(" ")[0]}! I accepted your connection request regarding ${selectedConn.startupName || "our startup"}. Let's discuss: ${connTerms}`;
    messageService.sendMessage({
      startupId: selectedConn.startupId || currentStartupId,
      senderId: user?.id || currentStartupId,
      senderName: user?.name || "Founder",
      senderRole: "student",
      senderEmail: user?.email,
      recipientId: selectedConn.senderId,
      recipientEmail: selectedConn.senderEmail,
      content: introMsg,
    });

    notify(
      "investor",
      "Connection request accepted!",
      `${user?.name || "Founder"} accepted your connection request regarding ${selectedConn.startupName || "Startup"}. Next steps of discussion have been projected.`,
      {
        recipientEmail: selectedConn.senderEmail,
        recipientUserId: selectedConn.senderId,
      }
    );

    toast.success(`Connection accepted! Discussion initiated with ${partnerName}.`);
    setConnAcceptModalOpen(false);
  };

  const handleConfirmConnDecline = async () => {
    if (!selectedConn) return;
    const reqId = selectedConn.id;
    const partnerName = selectedConn.senderName || "Member";

    await requestService.respondToConnectionRequest(reqId, "rejected", {
      declineReason: connDeclineReason,
    });

    setConnRequests((prev) =>
      prev.map((c) =>
        c.id === reqId ? { ...c, status: "rejected", declineReason: connDeclineReason } : c
      )
    );

    notify(
      "investor",
      "Connection request declined",
      `${user?.name || "Founder"} declined your connection request regarding ${selectedConn.startupName || "Startup"}. Feedback: "${connDeclineReason}"`,
      {
        recipientEmail: selectedConn.senderEmail,
        recipientUserId: selectedConn.senderId,
      }
    );

    toast.info(`Connection request declined for ${partnerName}.`);
    setConnDeclineModalOpen(false);
  };

  const pendingDrCount = liveRequests.filter((r) => r.status === "pending").length;
  const pendingConnCount = connRequests.filter((c) => c.status === "pending").length;

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Data Room &amp; Investor Diligence Hub</h1>
          <p className="text-sm text-muted-foreground">
            Manage proprietary documents under NDA, respond to data room access requests, and collaborate with interested investors.
          </p>
        </div>

        <Tabs defaultValue="access-requests" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="access-requests" className="gap-1.5 text-xs">
              <ShieldCheck className="size-3.5" />
              Access Requests
              {pendingDrCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 px-1.5 text-[10px] bg-emerald-600 text-white">
                  {pendingDrCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-1.5 text-xs">
              <UserCheck className="size-3.5" />
              Connections
              {pendingConnCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                  {pendingConnCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="gap-1.5 text-xs">
              <MessageSquare className="size-3.5" />
              Inquiries ({recentMessages.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs">
              <FileLock2 className="size-3.5" />
              Confidential Files ({realDocs.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DATA ROOM ACCESS REQUESTS */}
          <TabsContent value="access-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Data Room Access Requests ({liveRequests.length})</CardTitle>
                    <CardDescription>
                      Accredited investors requesting permission to review financial models, cap table, and legal documents under NDA.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {liveRequests.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">No data room access requests yet.</p>
                    <p className="text-xs">When accredited investors discover your venture and request confidential access under NDA, they will appear here.</p>
                  </div>
                )}
                {liveRequests.map((req) => {
                  const displayName = req.investorName || "Accredited Investor";
                  const displayOrg = req.investorOrg || "Venture Fund";
                  const isGranted = req.status === "granted";
                  const isRejected = req.status === "rejected" || req.status === "revoked";

                  return (
                    <div key={req.id} className="rounded-lg border p-4 space-y-3 bg-card">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{displayName}</p>
                            <Badge variant="outline" className="text-[11px] gap-1">
                              <Building className="size-3" />
                              {displayOrg}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Requested {timeAgo(req.createdAt)} {req.investorEmail ? `· ${req.investorEmail}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={req.ndaSigned ? "default" : "secondary"} className="text-xs">
                            <ShieldCheck className="size-3.5 mr-1" aria-hidden="true" />
                            {req.ndaSigned ? "NDA signed" : "NDA pending"}
                          </Badge>
                          <Badge
                            variant={isGranted ? "default" : isRejected ? "destructive" : "outline"}
                            className="text-xs capitalize"
                          >
                            {req.status}
                          </Badge>

                          {req.status === "pending" && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openGrantDialog(req)}
                              >
                                <Check className="size-3.5" />
                                Grant &amp; Set Terms
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-destructive hover:bg-destructive/10"
                                onClick={() => openDeclineDialog(req)}
                              >
                                <X className="size-3.5" />
                                Decline
                              </Button>
                            </div>
                          )}

                          {isGranted && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setSelectedReq(req);
                                setDeclineReason("Access revoked by founder.");
                                setDeclineModalOpen(true);
                              }}
                            >
                              Revoke Access
                            </Button>
                          )}

                          {isRejected && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-emerald-600 hover:bg-emerald-50"
                              onClick={() => openGrantDialog(req)}
                            >
                              Re-grant &amp; Discuss
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* ACTIVE TERMS & NEXT STEPS */}
                      {isGranted && (
                        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5" /> Access Active · Next Steps of Discussion
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-background border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                              Active Terms
                            </Badge>
                          </div>
                          {req.discussionTerms && (
                            <div>
                              <span className="font-semibold text-foreground">Terms: </span>
                              <span className="text-muted-foreground">{req.discussionTerms}</span>
                            </div>
                          )}
                          {req.nextSteps && (
                            <div>
                              <span className="font-semibold text-foreground">Projected Next Steps: </span>
                              <p className="text-muted-foreground whitespace-pre-line mt-0.5">{req.nextSteps}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* DECLINED OR REVOKED FEEDBACK NOTE */}
                      {isRejected && (
                        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground space-y-1">
                          <span className="font-semibold text-destructive">
                            {req.status === "revoked" ? "Access Revoked by Founder:" : "Decline Feedback Sent:"}
                          </span>
                          <p>{req.declineReason || (req.status === "revoked" ? "Founder revoked access to data room files." : "Round fully subscribed or stage mismatch.")}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CONNECTION & INTRODUCTION REQUESTS */}
          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Investor Connection Requests ({connRequests.length})</CardTitle>
                <CardDescription>
                  Investors requesting direct introductions and preliminary venture alignment discussions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {connRequests.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">No connection requests yet.</p>
                    <p className="text-xs">When investors request connections with your startup, you can review and accept them here.</p>
                  </div>
                )}
                {connRequests.map((conn) => {
                  const isAccepted = conn.status === "accepted";
                  const isRejected = conn.status === "rejected";
                  const isPending = conn.status === "pending";

                  return (
                    <div key={conn.id} className="rounded-lg border p-4 space-y-3 bg-card">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{conn.senderName || "Investor Partner"}</p>
                            {conn.senderOrg && (
                              <Badge variant="outline" className="text-[11px] gap-1">
                                <Building className="size-3" />
                                {conn.senderOrg}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] uppercase">
                              {conn.senderRole || "Investor"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Sent {timeAgo(conn.createdAt)} {conn.senderEmail ? `· ${conn.senderEmail}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isAccepted ? "default" : isRejected ? "destructive" : "outline"}
                            className="text-xs capitalize"
                          >
                            {conn.status}
                          </Badge>

                          {isPending && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                className="h-8 gap-1 bg-primary text-primary-foreground"
                                onClick={() => openConnAcceptDialog(conn)}
                              >
                                <Check className="size-3.5" />
                                Accept &amp; Discuss
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-destructive hover:bg-destructive/10"
                                onClick={() => openConnDeclineDialog(conn)}
                              >
                                <X className="size-3.5" />
                                Decline
                              </Button>
                            </div>
                          )}

                          {isAccepted && (
                            <Button size="sm" variant="outline" asChild className="h-8 text-xs gap-1.5">
                              <Link to="/app/student/messages">
                                <MessageSquare className="size-3.5" />
                                Open Chat
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* INTRO MESSAGE */}
                      {conn.message && (
                        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Message from Investor: </span>
                          "{conn.message}"
                        </div>
                      )}

                      {/* ACCEPTED NEXT STEPS */}
                      {isAccepted && (
                        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-primary">
                            <CheckCircle2 className="size-3.5" /> Connected · Discussion Next Steps
                          </div>
                          {conn.discussionTerms && (
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">Terms: </span>
                              {conn.discussionTerms}
                            </p>
                          )}
                          {conn.nextSteps && (
                            <p className="text-muted-foreground whitespace-pre-line mt-1">
                              <span className="font-medium text-foreground">Next Steps: </span>
                              {conn.nextSteps}
                            </p>
                          )}
                        </div>
                      )}

                      {/* DECLINED FEEDBACK */}
                      {isRejected && (
                        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground">
                          <span className="font-semibold text-destructive">Decline Note: </span>
                          {conn.declineReason || "Founder focusing on product priorities."}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: INVESTOR INQUIRIES & DIRECT MESSAGES */}
          <TabsContent value="inquiries" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Investor Inquiries &amp; Messages ({recentMessages.length})</CardTitle>
                    <CardDescription>
                      Direct inquiries sent to your venture from accredited investors across CampusVenture.
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/app/student/messages" className="gap-1.5">
                      <MessageSquare className="size-3.5" />
                      View Full Inbox
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentMessages.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">No investor messages yet.</p>
                    <p className="text-xs">Incoming messages from investors will appear here and in your Messages inbox in real-time.</p>
                  </div>
                )}
                {recentMessages.map((msg) => (
                  <div key={msg.id} className="flex items-center justify-between gap-3 rounded-lg border p-3.5 bg-card">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{msg.senderName || "Investor"}</p>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {msg.senderRole || "Investor"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">· {timeAgo(msg.createdAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-xl">"{msg.content}"</p>
                    </div>
                    <Button size="sm" variant="outline" asChild className="shrink-0 h-8 text-xs gap-1">
                      <Link to="/app/student/messages">
                        <Send className="size-3" />
                        Reply in Chat
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: CONFIDENTIAL DOCUMENTS */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Confidential Documents ({realDocs.length})</CardTitle>
                    <CardDescription>Proprietary financials, pitch decks, cap tables, and metrics.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={category} onValueChange={(v) => setCategory(v as DataRoomDoc["category"])}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const docSize = `${Math.max(1, Math.round(file.size / 1024))} KB`;
                        await requestService.uploadDataRoomDoc({
                          startupId: currentStartupId,
                          name: file.name,
                          category,
                          size: docSize,
                          confidential: true,
                        });
                        setRealDocs((prev) => [
                          {
                            id: `temp-${Date.now()}`,
                            startupId: currentStartupId,
                            name: file.name,
                            category,
                            size: docSize,
                            confidential: true,
                            createdAt: new Date().toISOString(),
                          },
                          ...prev,
                        ]);
                        toast.success(`${file.name} uploaded to the data room`);
                        e.target.value = "";
                      }}
                    />
                    <Button size="sm" onClick={() => fileRef.current?.click()}>
                      <FileUp className="size-4" aria-hidden="true" /> Upload Document
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {realDocs.length === 0 && (
                  <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No documents yet. Upload confidential files to share with verified investors under NDA.
                  </p>
                )}
                {realDocs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-card">
                    <div className="flex items-center gap-3">
                      <FileLock2 className="size-4 text-muted-foreground" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.category} · {d.size} · uploaded {timeAgo(d.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={d.confidential ? "default" : "secondary"}>
                        {d.confidential ? "NDA required" : "Open"}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${d.name}`}
                        onClick={async () => {
                          await requestService.deleteDataRoomDoc(d.id);
                          setRealDocs((prev) => prev.filter((doc) => doc.id !== d.id));
                          toast.success(`${d.name} removed from data room`);
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOG 1: GRANT DATA ROOM ACCESS & SHARE TERMS */}
      <Dialog open={grantModalOpen} onOpenChange={setGrantModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Data Room Access &amp; Set Diligence Terms</DialogTitle>
            <DialogDescription>
              Grant {selectedReq?.investorName || "Investor"} access to confidential documents under Mutual NDA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="discussion-terms" className="text-xs font-semibold">
                Discussion &amp; Diligence Terms
              </Label>
              <Textarea
                id="discussion-terms"
                rows={2}
                value={discussionTerms}
                onChange={(e) => setDiscussionTerms(e.target.value)}
                placeholder="Specify diligence window, confidentiality conditions..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="next-steps-note" className="text-xs font-semibold">
                Projected Next Steps for Diligence
              </Label>
              <Textarea
                id="next-steps-note"
                rows={3}
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="Outline the next steps for evaluation, intro calls, and terms discussion..."
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setGrantModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmGrant}>
              <Check className="size-3.5 mr-1.5" />
              Grant Access &amp; Share Terms
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: DECLINE DATA ROOM ACCESS */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Data Room Access</DialogTitle>
            <DialogDescription>
              Politely decline access to {selectedReq?.investorName || "Investor"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="decline-presets" className="text-xs font-semibold">
                Common Presets
              </Label>
              <Select
                onValueChange={(val) => {
                  if (val === "round_full")
                    setDeclineReason("Current financing round is fully subscribed. We are not adding new investors at this time.");
                  else if (val === "stage_mismatch")
                    setDeclineReason("Our current round stage / check size is not aligned with this fund's mandate.");
                  else if (val === "geo_mismatch")
                    setDeclineReason("Focusing exclusively on localized campus incubation partners for this phase.");
                }}
              >
                <SelectTrigger id="decline-presets" className="h-8 text-xs">
                  <SelectValue placeholder="Choose a preset..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_full">Round fully allocated / closed</SelectItem>
                  <SelectItem value="stage_mismatch">Stage / check size mismatch</SelectItem>
                  <SelectItem value="geo_mismatch">Strategic / geography focus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="decline-note" className="text-xs font-semibold">
                Reason &amp; Feedback Message to Investor
              </Label>
              <Textarea
                id="decline-note"
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Explain the reason or terms feedback..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setDeclineModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleConfirmDecline}>
              <X className="size-3.5 mr-1.5" />
              Confirm &amp; Send Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: ACCEPT CONNECTION REQUEST */}
      <Dialog open={connAcceptModalOpen} onOpenChange={setConnAcceptModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Investor Connection Request</DialogTitle>
            <DialogDescription>
              Accept the connection from {selectedConn?.senderName || "Investor"} to project discussion terms and start chat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="conn-terms" className="text-xs font-semibold">
                Discussion Terms &amp; Scope
              </Label>
              <Textarea
                id="conn-terms"
                rows={2}
                value={connTerms}
                onChange={(e) => setConnTerms(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conn-next-steps" className="text-xs font-semibold">
                Projected Next Steps
              </Label>
              <Textarea
                id="conn-next-steps"
                rows={3}
                value={connNextSteps}
                onChange={(e) => setConnNextSteps(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setConnAcceptModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleConfirmConnAccept}>
              <Check className="size-3.5 mr-1.5" />
              Confirm Connection &amp; Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: DECLINE CONNECTION REQUEST */}
      <Dialog open={connDeclineModalOpen} onOpenChange={setConnDeclineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Connection Request</DialogTitle>
            <DialogDescription>
              Decline the connection from {selectedConn?.senderName || "Investor"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="conn-decline-reason" className="text-xs font-semibold">
                Reason / Feedback Note
              </Label>
              <Textarea
                id="conn-decline-reason"
                rows={3}
                value={connDeclineReason}
                onChange={(e) => setConnDeclineReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setConnDeclineModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleConfirmConnDecline}>
              <X className="size-3.5 mr-1.5" />
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
