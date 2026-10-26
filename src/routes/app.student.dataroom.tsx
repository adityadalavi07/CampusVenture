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
  ExternalLink,
  RefreshCw,
  Eye,
  FileText,
  AlertTriangle,
  History,
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
import { Checkbox } from "@/components/ui/checkbox";
import { timeAgo, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import {
  requestService,
  type DataRoomRequestRecord,
  type ConnectionRequestRecord,
  type DataRoomDocRecord,
  type DataRoomDocCategory,
  type DataRoomAuditRecord,
} from "@/services/requestService";
import { messageService, type ChatMessageRecord } from "@/services/messageService";

const TITLE = "Data Room & Requests — CampusVenture Founder";
const DESCRIPTION =
  "Manage confidential files under NDA, review data room access requests, and respond to investor inquiries.";

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

const CATEGORIES: DataRoomDocCategory[] = [
  "Financials",
  "Legal",
  "Product",
  "Metrics",
  "Cap Table",
  "Other",
];

function StudentDataRoom() {
  const { setAccessStatus, notify, startups } = useVenture();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

  const [category, setCategory] = useState<DataRoomDocCategory>("Financials");
  const [isUploading, setIsUploading] = useState(false);

  // Requests and inquiry states
  const [liveRequests, setLiveRequests] = useState<DataRoomRequestRecord[]>([]);
  const [connRequests, setConnRequests] = useState<ConnectionRequestRecord[]>([]);
  const [recentMessages, setRecentMessages] = useState<ChatMessageRecord[]>([]);
  const [realDocs, setRealDocs] = useState<DataRoomDocRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<DataRoomAuditRecord[]>([]);

  const [previewDoc, setPreviewDoc] = useState<DataRoomDocRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p && ["documents", "access-requests", "connections", "inquiries", "audit"].includes(p)) {
        return p;
      }
    }
    return "documents";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p && ["documents", "access-requests", "connections", "inquiries", "audit"].includes(p)) {
        setActiveTab(p);
      }
    }
  }, []);

  const userStartups = (startups || []).filter(
    (s) =>
      (user?.email && s?.founderEmail?.toLowerCase() === user.email?.toLowerCase()) ||
      (user?.name && s?.founder === user.name)
  );
  const currentStartup = userStartups[0];
  const startupIds = userStartups.map((s) => s.id);
  const currentStartupId = currentStartup?.id || "";

  // Real-time synchronization of confidential documents from Supabase
  useEffect(() => {
    let active = true;
    const fetchDocs = () => {
      requestService.getDataRoomDocsForStartup(currentStartupId).then((files) => {
        if (active) setRealDocs(files);
      });
      requestService.getDataRoomAuditLogs(currentStartupId).then((logs) => {
        if (active) setAuditLogs(logs);
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
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [manageDocsModalOpen, setManageDocsModalOpen] = useState(false);
  const [managingReq, setManagingReq] = useState<DataRoomRequestRecord | null>(null);
  const [managingDocIds, setManagingDocIds] = useState<string[]>([]);
  const [selectedDocIdsForGrant, setSelectedDocIdsForGrant] = useState<string[]>([]);
  const [selectedReq, setSelectedReq] = useState<DataRoomRequestRecord | null>(null);

  const [durationDays, setDurationDays] = useState(30);
  const [discussionTerms, setDiscussionTerms] = useState(
    "30-Day Confidential Diligence under Mutual NDA. Includes cap table, pitch deck, and financial model."
  );
  const [nextSteps, setNextSteps] = useState(
    "1. Investor completes initial review of confidential documents and metrics.\n2. Schedule a 30-minute founder diligence call via CampusVenture Meetings.\n3. Discuss valuation terms, syndicate check size, and closing schedule."
  );
  const [declineReason, setDeclineReason] = useState(
    "Our current financing round is fully subscribed at this stage. We would love to stay in touch for future milestones."
  );
  const [revokeReason, setRevokeReason] = useState(
    "Diligence window concluded or terms not aligned for this stage."
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
    if (req.accessDurationDays) setDurationDays(req.accessDurationDays);
    setSelectedDocIdsForGrant(
      req.permittedDocIds && req.permittedDocIds.length > 0
        ? req.permittedDocIds
        : realDocs.map((d) => d.id)
    );
    setGrantModalOpen(true);
  };

  const handleOpenManageDocs = (req: DataRoomRequestRecord) => {
    setManagingReq(req);
    setManagingDocIds(
      req.permittedDocIds && req.permittedDocIds.length > 0
        ? req.permittedDocIds
        : realDocs.map((d) => d.id)
    );
    setManageDocsModalOpen(true);
  };

  const handleSavePermittedDocs = async () => {
    if (!managingReq) return;
    await requestService.updatePermittedDocs(managingReq.id, managingDocIds);
    setLiveRequests((prev) =>
      prev.map((r) => (r.id === managingReq.id ? { ...r, permittedDocIds: managingDocIds } : r))
    );
    notify(
      "investor",
      "Data Room Document Permissions Updated",
      `${user?.name || "Founder"} updated the authorized documents available to you for ${managingReq.startupName || "Startup"}.`,
      {
        recipientEmail: managingReq.investorEmail,
        recipientUserId: managingReq.investorId,
      }
    );
    toast.success(`Updated document permissions for ${managingReq.investorName || "Investor"}.`);
    setManageDocsModalOpen(false);
  };

  const openDeclineDialog = (req: DataRoomRequestRecord) => {
    setSelectedReq(req);
    if (req.declineReason) setDeclineReason(req.declineReason);
    setDeclineModalOpen(true);
  };

  const openRevokeDialog = (req: DataRoomRequestRecord) => {
    setSelectedReq(req);
    setRevokeModalOpen(true);
  };

  const handleConfirmGrant = async () => {
    if (!selectedReq) return;
    const reqId = selectedReq.id;
    const invName = selectedReq.investorName || "Investor";

    await requestService.updateDataRoomRequestStatus(reqId, "granted", {
      discussionTerms,
      nextSteps,
      durationDays,
      ndaRequired: true,
      permittedDocIds: selectedDocIdsForGrant,
    });
    setAccessStatus(reqId, "granted");
    setLiveRequests((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? {
              ...r,
              status: "granted",
              discussionTerms,
              nextSteps,
              accessDurationDays: durationDays,
              permittedDocIds: selectedDocIdsForGrant,
              ndaStatus: "required",
            }
          : r
      )
    );
    notify(
      "investor",
      "Data-room access granted & terms shared",
      `${invName} can now view confidential diligence files and review discussion terms for ${selectedReq.startupName || "Startup"}. Please review and sign the Mutual NDA.`,
      {
        recipientEmail: selectedReq.investorEmail,
        recipientUserId: selectedReq.investorId,
      }
    );

    // Notify exclusively Student C's university (University X) about diligence approval
    const studentUniv = currentStartup?.university || user?.org;
    if (studentUniv || user?.email) {
      try {
        const { data: univProfiles } = await (supabase as any)
          .from("profiles")
          .select("id, email, org")
          .eq("role", "university");

        const targetUniv = (univProfiles || []).find((u: any) =>
          (studentUniv && u.org?.toLowerCase().includes(studentUniv.toLowerCase())) ||
          (studentUniv && studentUniv.toLowerCase().includes(u.org?.toLowerCase() || "")) ||
          (user?.email && u.email && user.email.split("@")[1] === u.email.split("@")[1])
        );

        if (targetUniv?.email) {
          notify(
            "university",
            `Data-room diligence approved: ${selectedReq.startupName || currentStartup?.name || "Startup"}`,
            `Founder ${user?.name || "Student"} has granted Data Room access to ${invName} (${selectedReq.investorOrg || "Investor"}) with ${selectedDocIdsForGrant.length} authorized document(s).`,
            {
              recipientEmail: targetUniv.email,
              recipientUserId: targetUniv.id,
              senderEmail: user?.email,
              senderUserId: user?.id,
            }
          );
        }
      } catch {
        /* ignore */
      }
    }

    toast.success(`Access granted to ${invName}! ${selectedDocIdsForGrant.length} documents permitted.`);
    setGrantModalOpen(false);
  };

  const handleConfirmDecline = async () => {
    if (!selectedReq) return;
    const reqId = selectedReq.id;
    const invName = selectedReq.investorName || "Investor";

    await requestService.updateDataRoomRequestStatus(reqId, "rejected", {
      declineReason,
    });
    setAccessStatus(reqId, "revoked");
    setLiveRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "rejected", declineReason } : r))
    );
    notify(
      "investor",
      "Data-room request declined",
      `Founder declined data-room access for ${selectedReq.startupName || "Startup"}. Feedback: "${declineReason}"`,
      {
        recipientEmail: selectedReq.investorEmail,
        recipientUserId: selectedReq.investorId,
      }
    );
    toast.info(`Request declined with feedback note sent to ${invName}`);
    setDeclineModalOpen(false);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedReq) return;
    const reqId = selectedReq.id;
    const invName = selectedReq.investorName || "Investor";

    await requestService.updateDataRoomRequestStatus(reqId, "revoked", {
      revokedBy: user?.id,
      revokedReason: revokeReason,
    });
    setAccessStatus(reqId, "revoked");
    setLiveRequests((prev) =>
      prev.map((r) =>
        r.id === reqId ? { ...r, status: "revoked", revokedReason: revokeReason } : r
      )
    );
    notify(
      "investor",
      "Data-room access revoked",
      `Founder revoked data-room access for ${selectedReq.startupName || "Startup"}. Reason: "${revokeReason}"`,
      {
        recipientEmail: selectedReq.investorEmail,
        recipientUserId: selectedReq.investorId,
      }
    );
    toast.info(`Access revoked for ${invName}. All protected files locked.`);
    setRevokeModalOpen(false);
  };

  // Connection Request handlers
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

  // Document Upload Handler
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds 50MB limit.");
      return;
    }

    setIsUploading(true);
    toast.loading(`Uploading ${file.name} to private Data Room...`, { id: "upload-doc" });

    try {
      const res = await requestService.uploadDataRoomDocFile({
        file,
        startupId: currentStartupId,
        ownerId: user?.id,
        category,
        confidential: true,
      });

      if (res.success && res.doc) {
        setRealDocs((prev) => [res.doc!, ...prev]);
        toast.success(`${file.name} securely stored in Data Room under NDA.`, { id: "upload-doc" });
      } else {
        toast.error(`Upload failed: ${res.error || "Please try again"}`, { id: "upload-doc" });
      }
    } catch {
      toast.error("Upload error. Please try again.", { id: "upload-doc" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Document Replace Handler
  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDocId) return;

    toast.loading(`Replacing document with ${file.name}...`, { id: "replace-doc" });
    try {
      const res = await requestService.replaceDataRoomDocFile(replacingDocId, file, {
        startupId: currentStartupId,
        ownerId: user?.id,
      });

      if (res.success && res.doc) {
        setRealDocs((prev) => prev.map((d) => (d.id === replacingDocId ? res.doc! : d)));
        toast.success(`Document updated to ${file.name}.`, { id: "replace-doc" });
      } else {
        toast.error("Failed to replace document.", { id: "replace-doc" });
      }
    } catch {
      toast.error("Error replacing document.", { id: "replace-doc" });
    } finally {
      setReplacingDocId(null);
      e.target.value = "";
    }
  };

  // Document Preview / In-App Viewer Handler
  const handlePreviewDoc = async (doc: DataRoomDocRecord) => {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    toast.loading("Loading document preview...", { id: "preview-link" });

    try {
      const res = await requestService.getDocumentSignedUrl({
        docId: doc.id,
        startupId: currentStartupId,
        storagePath: doc.storagePath,
        requesterUserId: user?.id,
        requesterEmail: user?.email,
        requesterRole: "student",
        isDownload: false,
      });

      toast.dismiss("preview-link");
      if (res.success && res.signedUrl) {
        setPreviewUrl(res.signedUrl);
      }
    } catch {
      toast.dismiss("preview-link");
    }
  };

  const pendingDrCount = liveRequests.filter((r) => r.status === "pending").length;
  const pendingConnCount = connRequests.filter((c) => c.status === "pending").length;

  if (!currentStartup) {
    return (
      <AppShell role="student">
        <div className="mx-auto max-w-lg space-y-6 py-16 text-center animate-in fade-in-50">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FileLock2 className="size-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Create your startup profile first</h1>
            <p className="text-sm text-muted-foreground">
              To upload confidential diligence documents under NDA and manage investor data room access, build and publish your startup profile.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/app/student/startup">Build My Startup Profile</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Data Room &amp; Investor Diligence Hub</h1>
          <p className="text-sm text-muted-foreground">
            Manage proprietary documents under NDA, review data room access requests, and collaborate with interested investors.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="documents" className="gap-1.5 text-xs">
              <FileLock2 className="size-3.5" />
              My Documents ({realDocs.length})
            </TabsTrigger>
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
            <TabsTrigger value="audit" className="gap-1.5 text-xs">
              <History className="size-3.5" />
              Audit Log ({auditLogs.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MY DOCUMENTS (FOUNDER MANAGEMENT) */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Confidential Documents ({realDocs.length})</CardTitle>
                    <CardDescription>
                      Upload pitch decks, financial models, legal structures, cap tables, and metrics for authorized investor review.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={category} onValueChange={(v) => setCategory(v as DataRoomDocCategory)}>
                      <SelectTrigger className="w-40 h-8 text-xs">
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
                      onChange={handleUploadFile}
                      accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg,.pptx"
                    />
                    <input
                      ref={replaceFileRef}
                      type="file"
                      className="hidden"
                      onChange={handleReplaceFile}
                      accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg,.pptx"
                    />
                    <Button
                      size="sm"
                      className="h-8 gap-1.5"
                      disabled={isUploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <FileUp className="size-3.5" aria-hidden="true" />
                      {isUploading ? "Uploading..." : "Upload Document"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {realDocs.length === 0 && (
                  <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground space-y-1">
                    <FileLock2 className="size-8 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="font-medium text-foreground">
                      No documents uploaded yet. Upload your first document to prepare your Data Room.
                    </p>
                    <p className="text-xs">
                      Confidential documents are encrypted and only accessible to accredited investors you explicitly approve under Mutual NDA.
                    </p>
                  </div>
                )}
                {realDocs.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5 bg-card">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground shrink-0">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{d.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {d.category}
                          </Badge>
                          <span>{d.size}</span>
                          <span>· Uploaded {timeAgo(d.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                        <ShieldCheck className="size-3 mr-1" />
                        Founder Asset · Full Access
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handlePreviewDoc(d)}
                      >
                        <Eye className="size-3" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          setReplacingDocId(d.id);
                          replaceFileRef.current?.click();
                        }}
                      >
                        <RefreshCw className="size-3" />
                        Replace
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        aria-label={`Remove ${d.name}`}
                        onClick={async () => {
                          await requestService.deleteDataRoomDoc(d.id, d.storagePath);
                          setRealDocs((prev) => prev.filter((doc) => doc.id !== d.id));
                          toast.success(`${d.name} removed from data room.`);
                        }}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: DATA ROOM ACCESS REQUESTS */}
          <TabsContent value="access-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Data Room Access Requests ({liveRequests.length})</CardTitle>
                    <CardDescription>
                      Accredited investors requesting permission to review proprietary diligence documents under Mutual NDA.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {liveRequests.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">No data room access requests yet.</p>
                    <p className="text-xs">
                      When accredited investors discover your venture and request confidential access under NDA, they will appear here.
                    </p>
                  </div>
                )}
                {liveRequests.map((req) => {
                  const displayName = req.investorName || "Accredited Investor";
                  const displayOrg = req.investorOrg || "Venture Fund";
                  const isGranted = req.status === "granted";
                  const isRejected = req.status === "rejected";
                  const isRevoked = req.status === "revoked";

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
                            {req.ndaSigned ? "NDA Signed" : "NDA Required"}
                          </Badge>
                          <Badge
                            variant={isGranted ? "default" : isRejected || isRevoked ? "destructive" : "outline"}
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
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1"
                                onClick={() => handleOpenManageDocs(req)}
                              >
                                <FileText className="size-3.5" />
                                Permitted Docs ({req.permittedDocIds ? `${req.permittedDocIds.length}/${realDocs.length}` : `${realDocs.length}/${realDocs.length}`})
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => openRevokeDialog(req)}
                              >
                                Revoke Access
                              </Button>
                            </div>
                          )}

                          {(isRejected || isRevoked) && (
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

                      {/* INVESTOR NOTE/MESSAGE */}
                      {req.message && (
                        <div className="rounded-md border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Investor Note: </span>
                          "{req.message}"
                        </div>
                      )}

                      {/* ACTIVE TERMS & NEXT STEPS */}
                      {isGranted && (
                        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5" /> Access Active · Diligence Terms Projected
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-background border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                              {req.accessDurationDays || 30}-Day Window
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

                      {/* DECLINED FEEDBACK */}
                      {isRejected && (
                        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground space-y-1">
                          <span className="font-semibold text-destructive">Decline Feedback Sent:</span>
                          <p>{req.declineReason || "Round fully subscribed or stage mismatch."}</p>
                        </div>
                      )}

                      {/* REVOKED FEEDBACK */}
                      {isRevoked && (
                        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground space-y-1">
                          <span className="font-semibold text-destructive">Access Revoked:</span>
                          <p>{req.revokedReason || "Diligence access ended by founder."}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: CONNECTIONS */}
          <TabsContent value="connections" className="space-y-4">
            {/* 1. INCOMING PENDING CONNECTION REQUESTS */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="size-4 text-amber-500" />
                      Incoming Requests ({connRequests.filter((c) => c.status === "pending").length})
                    </CardTitle>
                    <CardDescription>
                      Pending connection requests requiring your review and introduction decision.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    Awaiting Action
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {connRequests.filter((c) => c.status === "pending").length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">No pending connection requests.</p>
                    <p className="text-xs">When new investors request connections with your startup, you can review and accept them here.</p>
                  </div>
                ) : (
                  connRequests
                    .filter((c) => c.status === "pending")
                    .map((conn) => (
                      <div key={conn.id} className="rounded-lg border p-4 space-y-3 bg-card border-amber-500/20">
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
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Sent {timeAgo(conn.createdAt)} {conn.senderEmail ? `· ${conn.senderEmail}` : ""}
                            </p>
                          </div>

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
                        </div>

                        {conn.message && (
                          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Investor Introduction Note: </span>
                            "{conn.message}"
                          </div>
                        )}
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            {/* 2. ACTIVE CONNECTED PARTNERS */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      Active Connections ({connRequests.filter((c) => c.status === "accepted").length})
                    </CardTitle>
                    <CardDescription>
                      Approved investor partners. Chat is unlocked directly between you two.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                    Connected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {connRequests.filter((c) => c.status === "accepted").length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No active connections yet. Accept an incoming request above to connect and start direct messaging.
                  </div>
                ) : (
                  connRequests
                    .filter((c) => c.status === "accepted")
                    .map((conn) => (
                      <div key={conn.id} className="rounded-lg border p-4 space-y-3 bg-card border-emerald-500/20">
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
                              <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                                Active Partner
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Connected {timeAgo(conn.updatedAt || conn.createdAt)} {conn.senderEmail ? `· ${conn.senderEmail}` : ""}
                            </p>
                          </div>

                          <Button size="sm" variant="outline" asChild className="h-8 text-xs gap-1.5 border-primary/40 hover:bg-primary/5">
                            <Link to={`/app/student/messages?investorId=${conn.senderId}&startupId=${conn.startupId || currentStartupId}`}>
                              <MessageSquare className="size-3.5 text-primary" />
                              Open Chat
                            </Link>
                          </Button>
                        </div>

                        {conn.discussionTerms && (
                          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-muted-foreground">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Discussion Scope: </span>
                            {conn.discussionTerms}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            {/* 3. DECLINED REQUESTS HISTORY */}
            {connRequests.some((c) => c.status === "rejected") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Declined Connection Requests ({connRequests.filter((c) => c.status === "rejected").length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {connRequests
                    .filter((c) => c.status === "rejected")
                    .map((conn) => (
                      <div key={conn.id} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">{conn.senderName || "Investor Partner"} {conn.senderOrg ? `(${conn.senderOrg})` : ""}</p>
                          <p className="text-[11px]">Reason: {conn.declineReason || "Focusing on other priorities."}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                          Declined
                        </Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 4: INQUIRIES */}
          <TabsContent value="inquiries" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Investor Inquiries &amp; Messages ({recentMessages.length})</CardTitle>
                    <CardDescription>Direct messages from accredited investors.</CardDescription>
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

          {/* TAB 5: AUDIT LOG */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Room Access &amp; Diligence Audit Log</CardTitle>
                <CardDescription>
                  Verifiable audit trail recording document uploads, access requests, founder decisions, NDA signings, and downloads.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {auditLogs.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No activity recorded in audit trail yet.
                  </div>
                )}
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-xs bg-card">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {log.action}
                        </Badge>
                        <span className="font-medium text-foreground">{log.details || log.action}</span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        {log.userEmail ? `User: ${log.userEmail}` : ""} {log.docName ? `· File: ${log.docName}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOG 1: GRANT DATA ROOM ACCESS */}
      <Dialog open={grantModalOpen} onOpenChange={setGrantModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Data Room Access &amp; Diligence Scope</DialogTitle>
            <DialogDescription>
              Grant {selectedReq?.investorName || "Investor"} access to confidential startup files under Mutual NDA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="duration-select" className="text-xs font-semibold">
                Diligence Duration Window
              </Label>
              <Select value={String(durationDays)} onValueChange={(v) => setDurationDays(Number(v))}>
                <SelectTrigger id="duration-select" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">14 Days (Fast Diligence)</SelectItem>
                  <SelectItem value="30">30 Days (Standard Window)</SelectItem>
                  <SelectItem value="60">60 Days (Extended Review)</SelectItem>
                  <SelectItem value="90">90 Days (Lead Investor Syndicate)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discussion-terms" className="text-xs font-semibold">
                Discussion &amp; Diligence Terms
              </Label>
              <Textarea
                id="discussion-terms"
                rows={2}
                value={discussionTerms}
                onChange={(e) => setDiscussionTerms(e.target.value)}
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
                className="text-xs font-mono"
              />
            </div>

            {/* Granular Document Selection */}
            <div className="space-y-1.5 pt-1 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Authorised Documents Scope</Label>
                <button
                  type="button"
                  className="text-[11px] font-medium text-primary hover:underline"
                  onClick={() => {
                    if (selectedDocIdsForGrant.length === realDocs.length) {
                      setSelectedDocIdsForGrant([]);
                    } else {
                      setSelectedDocIdsForGrant(realDocs.map((d) => d.id));
                    }
                  }}
                >
                  {selectedDocIdsForGrant.length === realDocs.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto rounded border p-2 space-y-1.5 bg-muted/20 [scrollbar-width:thin]">
                {realDocs.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No documents uploaded yet in Data Room.</p>
                ) : (
                  realDocs.map((doc) => {
                    const isChecked = selectedDocIdsForGrant.includes(doc.id);
                    return (
                      <label key={doc.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(c) => {
                            if (c) {
                              setSelectedDocIdsForGrant((prev) => [...prev, doc.id]);
                            } else {
                              setSelectedDocIdsForGrant((prev) => prev.filter((id) => id !== doc.id));
                            }
                          }}
                        />
                        <span className="font-medium truncate flex-1">{doc.name}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1">{doc.category}</Badge>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Only selected files will be unlocked for this investor. You can change this at any time.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setGrantModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmGrant}>
              <Check className="size-3.5 mr-1.5" />
              Confirm Grant &amp; Share Terms
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 1.5: MANAGE DOCUMENT PERMISSIONS FOR APPROVED INVESTOR */}
      <Dialog open={manageDocsModalOpen} onOpenChange={setManageDocsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Authorised Documents</DialogTitle>
            <DialogDescription>
              Control which uploaded documents are accessible to {managingReq?.investorName || "Investor"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Authorised Document Access</span>
              <button
                type="button"
                className="text-[11px] font-medium text-primary hover:underline"
                onClick={() => {
                  if (managingDocIds.length === realDocs.length) {
                    setManagingDocIds([]);
                  } else {
                    setManagingDocIds(realDocs.map((d) => d.id));
                  }
                }}
              >
                {managingDocIds.length === realDocs.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded border p-2 space-y-1.5 bg-muted/20 [scrollbar-width:thin]">
              {realDocs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                realDocs.map((doc) => {
                  const isChecked = managingDocIds.includes(doc.id);
                  return (
                    <label key={doc.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(c) => {
                          if (c) {
                            setManagingDocIds((prev) => [...prev, doc.id]);
                          } else {
                            setManagingDocIds((prev) => prev.filter((id) => id !== doc.id));
                          }
                        }}
                      />
                      <span className="font-medium truncate flex-1">{doc.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1">{doc.category}</Badge>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Unchecked files are strictly restricted. The investor will immediately lose access to unselected documents.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setManageDocsModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleSavePermittedDocs}>
              <Check className="size-3.5 mr-1.5" />
              Save Document Scope ({managingDocIds.length})
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
                Feedback Message to Investor
              </Label>
              <Textarea
                id="decline-note"
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
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
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: REVOKE ACCESS */}
      <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Revoke Data Room Access
            </DialogTitle>
            <DialogDescription>
              Immediately lock all confidential files and deny further downloads for {selectedReq?.investorName || "Investor"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="revoke-reason" className="text-xs font-semibold">
                Reason for Revocation
              </Label>
              <Textarea
                id="revoke-reason"
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Diligence period expired, terms not agreed..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setRevokeModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleConfirmRevoke}>
              Confirm Revocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: ACCEPT CONNECTION REQUEST */}
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

      {/* DIALOG 5: DECLINE CONNECTION REQUEST */}
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

      {/* DIALOG 6: IN-APP DOCUMENT PREVIEW DIALOG */}
      <Dialog open={previewDoc !== null} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileLock2 className="size-5 text-primary" />
                <DialogTitle className="text-base truncate max-w-[380px]">{previewDoc?.name}</DialogTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {previewDoc?.category}
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Confidential diligence asset · {previewDoc?.size} · Uploaded {previewDoc ? timeAgo(previewDoc.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 my-3 rounded-lg border bg-muted/20 p-4 overflow-y-auto max-h-[380px] space-y-4 [scrollbar-width:thin]">
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" />
                CAMPUSVENTURE CONFIDENTIAL DILIGENCE ASSET
              </span>
              <span className="text-[10px] font-mono opacity-80">PROTECTED UNDER NDA v1.0</span>
            </div>

            {previewUrl && (previewUrl.startsWith("data:image/") || previewUrl.startsWith("http://") || previewUrl.startsWith("https://")) && (previewDoc?.mimeType?.startsWith("image/") || previewDoc?.name.match(/\.(png|jpe?g|gif|webp)$/i)) ? (
              <div className="grid place-items-center bg-background rounded-lg border p-2">
                <img src={previewUrl} alt={previewDoc.name} className="max-h-[300px] object-contain rounded" />
              </div>
            ) : previewUrl && (previewUrl.startsWith("data:application/pdf") || previewUrl.startsWith("http://") || previewUrl.startsWith("https://")) && (previewDoc?.mimeType === "application/pdf" || previewDoc?.name.endsWith(".pdf")) ? (
              <div className="h-[320px] rounded border bg-background overflow-hidden">
                <iframe src={previewUrl} title={previewDoc.name} className="size-full border-0" />
              </div>
            ) : (
              <div className="space-y-3 bg-card rounded-lg border p-4 text-xs">
                <div className="border-b pb-2">
                  <h4 className="font-semibold text-sm text-foreground">{previewDoc?.name}</h4>
                  <p className="text-muted-foreground mt-0.5">Category: {previewDoc?.category}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground py-1">
                  <div>
                    <span className="font-medium text-foreground">Format:</span> {previewDoc?.mimeType || "application/octet-stream"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">File Size:</span> {previewDoc?.size}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Access Scope:</span> Authorized Diligence Investors
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Audit Status:</span> Logged in tamper-evident audit trail
                  </div>
                </div>
                <div className="rounded border bg-muted/40 p-3 text-[11px] text-muted-foreground leading-relaxed">
                  This document contains proprietary information regarding {currentStartup?.name || "the startup"} including technical architectures, capitalization terms, and operational milestones. Viewing and downloading are logged under the founder's audit ledger.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setPreviewDoc(null)}>
              Close Preview
            </Button>
            {previewDoc && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  toast.loading("Preparing download...", { id: "dl" });
                  const res = await requestService.getDocumentSignedUrl({
                    docId: previewDoc.id,
                    startupId: currentStartupId,
                    storagePath: previewDoc.storagePath,
                    requesterUserId: user?.id,
                    requesterEmail: user?.email,
                    requesterRole: "student",
                    isDownload: true,
                  });
                  toast.dismiss("dl");
                  if (res.signedUrl) {
                    const a = document.createElement("a");
                    a.href = res.signedUrl;
                    a.download = previewDoc.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success(`Downloaded ${previewDoc.name}`);
                  } else {
                    toast.info(`Downloaded metadata copy of ${previewDoc.name}`);
                  }
                }}
              >
                <FileLock2 className="size-4" /> Download File
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
