import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileLock2,
  FolderLock,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  AlertCircle,
  Building2,
  Lock,
  RefreshCw,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { timeAgo, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import {
  requestService,
  type DataRoomRequestRecord,
  type DataRoomDocRecord,
  type DataRoomDocCategory,
} from "@/services/requestService";

const TITLE = "Data Rooms — CampusVenture Investor";
const DESCRIPTION =
  "Access and review confidential startup documents, sign mutual NDAs, and manage diligence requests.";

export const Route = createFileRoute("/app/investor/dataroom")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <AppShell role="investor">
      <div className="mx-auto max-w-lg my-12 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-4">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Unable to load Data Rooms</h2>
          <p className="text-xs text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            Try Again
          </Button>
          <Button asChild size="sm">
            <Link to="/app/investor">Return to Discovery</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  ),
  component: InvestorDataRooms,
});

function isRequestExpired(req: DataRoomRequestRecord): boolean {
  if (req.status === "expired") return true;
  if (req.expiresAt) {
    return new Date(req.expiresAt).getTime() <= Date.now();
  }
  return false;
}

const CATEGORIES: DataRoomDocCategory[] = [
  "Financials",
  "Legal",
  "Product",
  "Metrics",
  "Cap Table",
  "Other",
];

function InvestorDataRooms() {
  const { startups, signNda, registerDownload, notify } = useVenture();
  const { user } = useAuth();
  const myInvestorId = user?.id || "";
  const investorName = user?.name || "Investor Partner";

  const [liveRequests, setLiveRequests] = useState<DataRoomRequestRecord[]>([]);
  const [startupDocsMap, setStartupDocsMap] = useState<Record<string, DataRoomDocRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"accessible" | "requests" | "rejected" | "expired">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p && ["accessible", "requests", "rejected", "expired"].includes(p)) {
        return p as any;
      }
    }
    return "accessible";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p && ["accessible", "requests", "rejected", "expired"].includes(p)) {
        setActiveTab(p as any);
      }
    }
  }, []);

  // In-app preview state
  const [previewDoc, setPreviewDoc] = useState<DataRoomDocRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewStartupId, setPreviewStartupId] = useState<string>("");

  // NDA signing state
  const [ndaRequest, setNdaRequest] = useState<DataRoomRequestRecord | null>(null);
  const [signerName, setSignerName] = useState(investorName);
  const [signerOrg, setSignerOrg] = useState(user?.org || "Venture Capital Partner");
  const [ndaAgreed, setNdaAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Category filter state for accessible tab
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Platform Rules & Regulations (v1.0-cv-reg) intercept state
  const [rulesModalRequest, setRulesModalRequest] = useState<{
    req: DataRoomRequestRecord;
    action: "preview" | "download";
    doc: DataRoomDocRecord;
  } | null>(null);
  const [rulesConfirmed, setRulesConfirmed] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRequests = async () => {
      try {
        const reqs = await requestService.getDataRoomRequestsForInvestor(myInvestorId, user?.email);
        if (active) {
          setLiveRequests(reqs);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Failed to fetch investor data room requests:", err);
        if (active) setLoading(false);
      }
    };

    fetchRequests();
    const unsub = requestService.subscribeToDataRoomRequests(fetchRequests);
    return () => {
      active = false;
      unsub();
    };
  }, [myInvestorId, user?.email]);

  // Load real uploaded documents for all relevant startups
  useEffect(() => {
    let active = true;
    const loadDocs = async () => {
      const map: Record<string, DataRoomDocRecord[]> = {};
      const uniqueStartupIds = Array.from(new Set(liveRequests.map((r) => r.startupId).filter(Boolean)));
      for (const stId of uniqueStartupIds) {
        const files = await requestService.getDataRoomDocsForStartup(stId);
        map[stId] = files;
      }
      if (active) setStartupDocsMap(map);
    };

    if (liveRequests.length > 0) {
      loadDocs();
    }

    const unsubDocs = requestService.subscribeToDataRoomDocs(() => {
      loadDocs();
    });

    return () => {
      active = false;
      unsubDocs();
    };
  }, [liveRequests]);

  // Categorize requests into 4 distinct workflow phases
  const accessibleRequests = useMemo(() => {
    return liveRequests.filter(
      (r) =>
        r.status === "granted" &&
        (r.ndaStatus === "signed" || r.ndaSigned) &&
        !isRequestExpired(r)
    );
  }, [liveRequests]);

  const pendingOrAwaitingNdaRequests = useMemo(() => {
    return liveRequests.filter(
      (r) =>
        r.status === "pending" ||
        (r.status === "granted" && r.ndaStatus !== "signed" && !r.ndaSigned)
    );
  }, [liveRequests]);

  const rejectedRequests = useMemo(() => {
    return liveRequests.filter((r) => r.status === "rejected");
  }, [liveRequests]);

  const expiredOrRevokedRequests = useMemo(() => {
    return liveRequests.filter(
      (r) =>
        r.status === "revoked" ||
        r.status === "expired" ||
        (r.status === "granted" && isRequestExpired(r))
    );
  }, [liveRequests]);

  // Handle in-app document preview
  const handlePreview = async (doc: DataRoomDocRecord, startupId: string) => {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    setPreviewStartupId(startupId);
    toast.loading("Loading document preview...", { id: "preview-link" });

    try {
      const res = await requestService.getDocumentSignedUrl({
        docId: doc.id,
        startupId,
        storagePath: doc.storagePath,
        requesterUserId: user?.id || myInvestorId,
        requesterEmail: user?.email,
        requesterRole: "investor",
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

  // Handle document download with short-lived signed URL and audit logging
  const handleDownload = async (
    doc: DataRoomDocRecord,
    startupId: string,
    startupName?: string,
    founderEmail?: string
  ) => {
    toast.loading(`Preparing secure download for ${doc.name}...`, { id: "download-link" });
    const res = await requestService.getDocumentSignedUrl({
      docId: doc.id,
      startupId,
      storagePath: doc.storagePath,
      requesterUserId: user?.id || myInvestorId,
      requesterEmail: user?.email,
      requesterRole: "investor",
      isDownload: true,
    });

    if (res.success && res.signedUrl) {
      toast.dismiss("download-link");
      // Trigger browser download via invisible link
      const link = document.createElement("a");
      link.href = res.signedUrl;
      link.download = doc.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      registerDownload(startupId, myInvestorId);
      notify(
        "student",
        "Confidential Document Downloaded",
        `${investorName} downloaded "${doc.name}" from the ${startupName || "your venture"} Data Room.`,
        founderEmail ? { recipientEmail: founderEmail } : undefined
      );
      toast.success(`${doc.name} download initiated.`);
    } else {
      toast.error(res.error || "Unable to generate download URL.", { id: "download-link" });
    }
  };

  // Intercept document viewing/downloading until platform rules (v1.0-cv-reg) are acknowledged
  const onInitiatePreview = (doc: DataRoomDocRecord, req: DataRoomRequestRecord) => {
    if (!req.rulesAccepted || req.rulesVersion !== "v1.0-cv-reg") {
      setRulesModalRequest({ req, action: "preview", doc });
      setRulesConfirmed(false);
      return;
    }
    handlePreview(doc, req.startupId);
  };

  const onInitiateDownload = (doc: DataRoomDocRecord, req: DataRoomRequestRecord) => {
    if (!req.rulesAccepted || req.rulesVersion !== "v1.0-cv-reg") {
      setRulesModalRequest({ req, action: "download", doc });
      setRulesConfirmed(false);
      return;
    }
    handleDownload(doc, req.startupId, req.startupName, req.founderEmail);
  };

  // Record rules acceptance permanently in Supabase and audit ledger
  const handleAcceptRulesAndProceed = async () => {
    if (!rulesModalRequest || !rulesConfirmed) return;
    setIsSavingRules(true);
    const { req, action, doc } = rulesModalRequest;
    const startup = startups.find((s) => s.id === req.startupId);

    try {
      const res = await requestService.recordRulesAcceptance({
        requestId: req.id,
        investorId: user?.id || myInvestorId,
        investorName,
        investorEmail: user?.email || "",
        founderId: req.founderId,
        founderEmail: req.founderEmail,
        startupId: req.startupId,
        rulesVersion: "v1.0-cv-reg",
        universityId: startup?.universityId,
        universityName: startup?.university || req.universityName,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to record compliance acceptance.");
        setIsSavingRules(false);
        return;
      }

      setLiveRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? {
                ...r,
                rulesAccepted: true,
                rulesVersion: "v1.0-cv-reg",
                rulesAcceptedAt: new Date().toISOString(),
              }
            : r
        )
      );

      // Notify Student C's university as proof of verification and security
      const targetUnivName = startup?.university || req.universityName;
      if (targetUnivName || req.founderEmail) {
        try {
          const { data: univProfiles } = await (supabase as any)
            .from("profiles")
            .select("id, email, org")
            .eq("role", "university");

          const targetUniv = (univProfiles || []).find((u: any) =>
            (targetUnivName && u.org?.toLowerCase().includes(targetUnivName.toLowerCase())) ||
            (targetUnivName && targetUnivName.toLowerCase().includes(u.org?.toLowerCase() || "")) ||
            (req.founderEmail && u.email && req.founderEmail.split("@")[1] === u.email.split("@")[1])
          );

          if (targetUniv?.email) {
            notify(
              "university",
              `Diligence Rules & NDA Executed: ${req.startupName || "Startup"}`,
              `Investor ${investorName} (${user?.email || "Investor"}) in full presence executed the Platform Rules & Regulations under v1.0-cv-reg for ${req.startupName || "the venture"} (Founder: ${req.founderEmail || "Student"}). Verification stored in database.`,
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

      toast.success("Platform Rules & Regulations (v1.0-cv-reg) acknowledged.");
      setRulesModalRequest(null);
      setIsSavingRules(false);

      if (action === "preview") {
        handlePreview(doc, req.startupId);
      } else {
        handleDownload(doc, req.startupId, req.startupName, req.founderEmail);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to record compliance acceptance.");
      setIsSavingRules(false);
    }
  };

  // Open NDA modal
  const openNdaModal = (req: DataRoomRequestRecord) => {
    setNdaRequest(req);
    setSignerName(user?.name || investorName);
    setSignerOrg(user?.org || "Venture Capital Partner");
    setNdaAgreed(false);
  };

  // Submit NDA execution
  const handleExecuteNda = async () => {
    if (!ndaRequest) return;
    if (signerName.trim().length < 3) {
      toast.error("Please enter your legal full name to sign.");
      return;
    }
    if (!ndaAgreed) {
      toast.error("You must agree to the Mutual NDA terms before unlocking the Data Room.");
      return;
    }

    setIsSigning(true);
    const cleanSig = signerName.trim();
    const reqId = ndaRequest.id;
    const startupId = ndaRequest.startupId;
    const stName = ndaRequest.startupName || "Startup";

    try {
      const res = await requestService.signDataRoomNda(reqId, {
        signedName: cleanSig,
        signerUserId: user?.id || myInvestorId,
        signerEmail: user?.email,
        ndaVersion: "v1.0",
      });

      if (!res.success) {
        toast.error(res.error || "Failed to sign NDA. Please try again.");
        setIsSigning(false);
        return;
      }

      // Update store state and local state
      signNda(startupId, myInvestorId, cleanSig);
      setLiveRequests((prev) =>
        prev.map((r) =>
          r.id === reqId
            ? {
                ...r,
                ndaStatus: "signed",
                ndaSigned: true,
                ndaSignedName: cleanSig,
                ndaSignedAt: new Date().toISOString(),
                ndaVersion: "v1.0",
              }
            : r
        )
      );

      // Notify student founder
      notify(
        "student",
        "Mutual NDA Executed & Data Room Unlocked",
        `${cleanSig} (${signerOrg || "Accredited Investor"}) signed the Mutual NDA (v1.0) for ${stName}. Confidential diligence files are now unlocked.`,
        ndaRequest.founderEmail ? { recipientEmail: ndaRequest.founderEmail } : undefined
      );

      toast.success("Mutual NDA executed! Data Room unlocked.");
      setNdaRequest(null);
      setActiveTab("accessible");
    } catch (err: any) {
      toast.error(err?.message || "Error executing NDA.");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Data Rooms &amp; Diligence Hub</h1>
            <p className="text-sm text-muted-foreground">
              Review confidential documents under mutual NDA, monitor access requests, and coordinate next steps with founders.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/investor">Browse Startups</Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="accessible" className="gap-1.5 text-xs">
              <FolderLock className="size-3.5 text-emerald-600" />
              Accessible Rooms ({accessibleRequests.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5 text-xs">
              <Clock className="size-3.5 text-amber-600" />
              My Requests ({pendingOrAwaitingNdaRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5 text-xs">
              <XCircle className="size-3.5 text-destructive" />
              Rejected Requests ({rejectedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-1.5 text-xs">
              <ShieldAlert className="size-3.5 text-muted-foreground" />
              Expired / Revoked ({expiredOrRevokedRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* ==================================================================== */}
          {/* TAB 1: ACCESSIBLE DATA ROOMS (Granted + NDA Signed + Not Expired)   */}
          {/* ==================================================================== */}
          <TabsContent value="accessible" className="space-y-4">
            {accessibleRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
                <div className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <FolderLock className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">No Accessible Data Rooms Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    When student founders grant you diligence access and you sign their mutual NDA,
                    unlocked proprietary documents will appear here.
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <Button asChild size="sm">
                    <Link to="/app/investor">Explore Verified Startups</Link>
                  </Button>
                  {pendingOrAwaitingNdaRequests.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("requests")}>
                      View Pending Requests ({pendingOrAwaitingNdaRequests.length})
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              accessibleRequests.map((req) => {
                const startup = startups.find((s) => s.id === req.startupId);
                const allFiles = startupDocsMap[req.startupId] || [];
                // Filter strictly to founder-permitted documents if permittedDocIds is specified
                const hasRestrictedScope = Array.isArray(req.permittedDocIds) && req.permittedDocIds.length > 0;
                const authorizedFiles = hasRestrictedScope
                  ? allFiles.filter((f) => req.permittedDocIds!.includes(f.id))
                  : allFiles;

                const filteredFiles =
                  selectedCategory === "All"
                    ? authorizedFiles
                    : authorizedFiles.filter((f) => f.category === selectedCategory);

                const daysRemaining = req.expiresAt
                  ? Math.max(0, Math.ceil((new Date(req.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : null;

                return (
                  <Card key={req.id} className="border-border">
                    <CardHeader className="pb-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">
                              {req.startupName || startup?.name || "Startup"}
                            </CardTitle>
                            {startup?.university && (
                              <Badge variant="outline" className="text-xs">
                                {startup.university}
                              </Badge>
                            )}
                            <Badge variant="default" className="bg-emerald-600 text-white text-xs gap-1">
                              <CheckCircle2 className="size-3" />
                              Access Active
                            </Badge>
                          </div>
                          <CardDescription>
                            {startup?.sector || "Technology"} · {startup?.stage || "Early Stage"} · Approved by founder
                          </CardDescription>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">
                            <ShieldCheck className="size-3 mr-1" />
                            NDA Signed {req.ndaVersion ? `(${req.ndaVersion})` : ""}
                          </Badge>
                          {req.rulesAccepted && (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">
                              <CheckCircle2 className="size-3 mr-1" />
                              Rules Verified ({req.rulesVersion || "v1.0-cv-reg"})
                            </Badge>
                          )}
                          {daysRemaining !== null && (
                            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-300">
                              <Clock className="size-3 mr-1" />
                              Expires in {daysRemaining} days
                            </Badge>
                          )}
                          <Button size="sm" variant="outline" asChild className="h-8 gap-1.5 text-xs">
                            <Link to="/app/investor/messages">
                              <MessageSquare className="size-3.5" />
                              Message Founder
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5 text-sm">
                      {/* FOUNDER'S COLLABORATION & NEXT STEPS */}
                      {(req.discussionTerms || req.nextSteps) && (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="size-4 text-emerald-600" />
                              Founder Diligence Terms &amp; Agreed Next Steps
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-background">
                              Authorized Diligence Scope
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
                              <span className="font-semibold text-foreground">Agreed Next Steps: </span>
                              <p className="text-muted-foreground whitespace-pre-line mt-0.5">{req.nextSteps}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/10">
                            <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
                              <Link to="/app/investor/meetings">
                                <Calendar className="size-3 mr-1" />
                                Schedule Diligence Sync
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* CONFIDENTIAL DOCUMENTS SECTION */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <FileCheck2 className="size-4 text-emerald-600" />
                              Confidential Documents ({authorizedFiles.length})
                            </h4>
                            {hasRestrictedScope && (
                              <Badge variant="secondary" className="text-[10px]">
                                Custom Scope
                              </Badge>
                            )}
                          </div>

                          {/* Category Filter Pills */}
                          <div className="flex flex-wrap items-center gap-1 text-xs">
                            <Button
                              size="sm"
                              variant={selectedCategory === "All" ? "secondary" : "ghost"}
                              className="h-6 px-2 text-xs"
                              onClick={() => setSelectedCategory("All")}
                            >
                              All ({authorizedFiles.length})
                            </Button>
                            {CATEGORIES.map((cat) => {
                              const count = authorizedFiles.filter((f) => f.category === cat).length;
                              if (count === 0) return null;
                              return (
                                <Button
                                  key={cat}
                                  size="sm"
                                  variant={selectedCategory === cat ? "secondary" : "ghost"}
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setSelectedCategory(cat)}
                                >
                                  {cat} ({count})
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {authorizedFiles.length === 0 ? (
                          allFiles.length > 0 ? (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-6 text-center text-xs space-y-1">
                              <p className="font-semibold text-amber-800 dark:text-amber-300">Access Scope Restricted by Founder</p>
                              <p className="text-muted-foreground max-w-md mx-auto">
                                The founder has granted your Data Room access, but has scoped specific documents. Please contact the founder via chat to authorize file permissions.
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground space-y-1">
                              <p className="font-medium text-foreground">No documents uploaded yet by founder.</p>
                              <p>
                                The founder has not uploaded materials for this venture yet. You can message the founder directly to request specific diligence files.
                              </p>
                            </div>
                          )
                        ) : filteredFiles.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                            No documents in the "{selectedCategory}" category.
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {filteredFiles.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 bg-card hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                                    <FileLock2 className="size-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{doc.name}</p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                        {doc.category}
                                      </Badge>
                                      <span>{doc.size}</span>
                                      <span>·</span>
                                      <span>Uploaded {timeAgo(doc.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-xs"
                                    onClick={() => onInitiatePreview(doc, req)}
                                  >
                                    <Eye className="size-3.5" />
                                    Preview
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-8 gap-1.5 text-xs"
                                    onClick={() => onInitiateDownload(doc, req)}
                                  >
                                    <Download className="size-3.5" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ==================================================================== */}
          {/* TAB 2: MY REQUESTS (Pending Founder Review OR Awaiting NDA)          */}
          {/* ==================================================================== */}
          <TabsContent value="requests" className="space-y-4">
            {pendingOrAwaitingNdaRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
                <div className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Clock className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">No Pending Requests</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    You have no outstanding Data Room access requests pending founder approval or NDA signature.
                  </p>
                </div>
                <Button asChild size="sm" className="mt-2">
                  <Link to="/app/investor">Browse Startups</Link>
                </Button>
              </div>
            ) : (
              pendingOrAwaitingNdaRequests.map((req) => {
                const startup = startups.find((s) => s.id === req.startupId);
                const isGrantedAwaitingNda =
                  req.status === "granted" && req.ndaStatus !== "signed" && !req.ndaSigned;

                return (
                  <Card key={req.id} className="border-border">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              {req.startupName || startup?.name || "Startup"}
                            </CardTitle>
                            {startup?.university && (
                              <Badge variant="outline" className="text-xs">
                                {startup.university}
                              </Badge>
                            )}
                          </div>
                          <CardDescription>
                            Requested {timeAgo(req.createdAt)} · Initial Status: {req.status}
                          </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                          {isGrantedAwaitingNda ? (
                            <>
                              <Badge variant="default" className="bg-amber-600 text-white text-xs">
                                Access Granted — NDA Required
                              </Badge>
                              <Button
                                size="sm"
                                className="bg-primary gap-1.5 text-xs"
                                onClick={() => openNdaModal(req)}
                              >
                                <FileCheck2 className="size-3.5" />
                                Review &amp; Sign Mutual NDA
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs gap-1">
                              <Clock className="size-3" />
                              Pending Founder Approval
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs">
                      {req.message && (
                        <div className="rounded-lg border bg-muted/40 p-3 text-muted-foreground">
                          <span className="font-semibold text-foreground">Your Note to Founder: </span>
                          "{req.message}"
                        </div>
                      )}

                      {isGrantedAwaitingNda ? (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                          <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <CheckCircle2 className="size-4 text-amber-600" />
                            The founder has authorized your access request!
                          </p>
                          <p className="text-muted-foreground">
                            Before private documents can be unlocked, you must review and execute the Mutual
                            Confidentiality and Non-Disclosure Agreement (v1.0).
                          </p>
                          {req.discussionTerms && (
                            <div className="pt-1">
                              <span className="font-semibold text-foreground">Founder's Proposed Terms: </span>
                              <span className="text-muted-foreground">{req.discussionTerms}</span>
                            </div>
                          )}
                          <div className="pt-2">
                            <Button size="sm" onClick={() => openNdaModal(req)} className="gap-1.5">
                              <FileCheck2 className="size-3.5" />
                              Sign NDA &amp; Unlock Data Room
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground">Waiting for Founder Approval</p>
                          <p>
                            Private documents, financial models, and cap tables are protected and remain locked until the founder approves this request.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ==================================================================== */}
          {/* TAB 3: REJECTED REQUESTS                                            */}
          {/* ==================================================================== */}
          <TabsContent value="rejected" className="space-y-4">
            {rejectedRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-muted-foreground" />
                <h3 className="text-base font-semibold">No Declined Requests</h3>
                <p className="text-xs text-muted-foreground">
                  None of your Data Room access requests have been declined.
                </p>
              </div>
            ) : (
              rejectedRequests.map((req) => (
                <Card key={req.id} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{req.startupName || "Startup"}</CardTitle>
                        <CardDescription>Requested {timeAgo(req.createdAt)}</CardDescription>
                      </div>
                      <Badge variant="destructive" className="capitalize text-xs">
                        Request Declined
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-muted-foreground space-y-1.5">
                      <p className="font-semibold text-destructive flex items-center gap-1.5">
                        <XCircle className="size-4" />
                        Access Declined by Founder
                      </p>
                      <p>
                        {req.declineReason ||
                          "The founder is not expanding diligence access or raising capital for this venture at this time."}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/app/investor">Browse Other Ventures</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ==================================================================== */}
          {/* TAB 4: EXPIRED OR REVOKED ACCESS                                    */}
          {/* ==================================================================== */}
          <TabsContent value="expired" className="space-y-4">
            {expiredOrRevokedRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center space-y-2">
                <ShieldCheck className="size-8 mx-auto text-muted-foreground" />
                <h3 className="text-base font-semibold">No Expired or Revoked Access</h3>
                <p className="text-xs text-muted-foreground">
                  All active diligence permissions remain in good standing.
                </p>
              </div>
            ) : (
              expiredOrRevokedRequests.map((req) => {
                const isRevoked = req.status === "revoked";
                return (
                  <Card key={req.id} className="border-border">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">{req.startupName || "Startup"}</CardTitle>
                          <CardDescription>
                            {isRevoked ? "Access revoked by founder" : "Diligence access period concluded"}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="border-destructive/40 text-destructive text-xs capitalize">
                          {isRevoked ? "Access Revoked" : "Access Expired"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-muted-foreground space-y-1.5">
                        <p className="font-semibold text-destructive flex items-center gap-1.5">
                          <Lock className="size-4" />
                          {isRevoked ? "Access Revoked" : "Diligence Window Concluded"}
                        </p>
                        <p>
                          {req.revokedReason ||
                            (isRevoked
                              ? "The founder has revoked access to this Data Room. All proprietary files are locked."
                              : `The scheduled ${req.accessDurationDays || 30}-day diligence access window has expired.`)}
                        </p>
                        {req.expiresAt && (
                          <p className="text-[11px] text-muted-foreground pt-1">
                            Expired on: {new Date(req.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Under the executed Mutual NDA, confidential materials downloaded previously must be handled in accordance with the survival and destruction provisions.
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================================================================== */}
      {/* PHASE 5: MUTUAL NON-DISCLOSURE AGREEMENT (NDA v1.0) MODAL            */}
      {/* ==================================================================== */}
      <Dialog open={ndaRequest !== null} onOpenChange={(open) => !open && setNdaRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <DialogTitle className="text-lg">
                Mutual Confidentiality &amp; Non-Disclosure Agreement (v1.0)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Review and execute the legally binding mutual NDA for{" "}
              <strong className="text-foreground">{ndaRequest?.startupName || "Startup"}</strong>{" "}
              to unlock proprietary Data Room materials.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[340px] rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-3">
            <div className="font-semibold text-foreground text-sm border-b pb-2">
              MUTUAL NON-DISCLOSURE AND DILIGENCE AGREEMENT
            </div>

            <p>
              This Mutual Non-Disclosure Agreement ("Agreement") is entered into by and between the Student Founder
              ("Disclosing Party") representing <strong>{ndaRequest?.startupName || "the Venture"}</strong> and the
              undersigned Accredited Investor or Institutional Representative ("Receiving Party").
            </p>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">1. Definition of Confidential Information</p>
              <p>
                "Confidential Information" refers to all proprietary, non-public materials disclosed via the CampusVenture
                Data Room, including but not limited to financial models, business plans, customer traction metrics,
                cap tables, software architectures, patent filings, and strategic roadmaps.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">2. Standard of Care &amp; Duty of Confidentiality</p>
              <p>
                The Receiving Party agrees to maintain the strict confidentiality of all Confidential Information, using
                the same degree of care it employs to protect its own sensitive proprietary assets, and in no event less
                than reasonable commercial care. The Receiving Party shall not duplicate, reverse engineer, or distribute
                the materials without prior written consent.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">3. Permitted Diligence Use</p>
              <p>
                Confidential Information shall be accessed and reviewed solely for the evaluation of a potential investment,
                financing, or strategic partnership. The Receiving Party shall not use any Confidential Information to develop
                competing products, solicit clients, or interfere with founder relationships.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">4. Term, Expiration, and Survival</p>
              <p>
                Access to the Data Room is granted for the diligence duration established by the founder (standard {ndaRequest?.accessDurationDays || 30} days).
                Notwithstanding any expiration or revocation of access, the Receiving Party's duty of confidentiality
                with respect to trade secrets and non-public financials shall survive for a period of two (2) years.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">5. Return or Destruction of Materials</p>
              <p>
                Upon written notice by the founder or upon termination of diligence discussions, the Receiving Party
                agrees to promptly cease use of and permanently delete or destroy all downloaded copies and summaries.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">6. Governing Law &amp; Enforceability</p>
              <p>
                This Agreement shall be governed by and construed in accordance with the laws of commercial contracts
                in the startup's institutional jurisdiction, without regard to conflict of law principles.
              </p>
            </div>
          </ScrollArea>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="signer-name" className="text-xs">
                  Signer Full Legal Name *
                </Label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="signer-org" className="text-xs">
                  Investment Entity / Organization
                </Label>
                <Input
                  id="signer-org"
                  value={signerOrg}
                  onChange={(e) => setSignerOrg(e.target.value)}
                  placeholder="e.g. Apex Ventures"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3">
              <Checkbox
                id="nda-agree"
                checked={ndaAgreed}
                onCheckedChange={(c) => setNdaAgreed(Boolean(c))}
                className="mt-0.5"
              />
              <Label
                htmlFor="nda-agree"
                className="text-xs font-normal leading-relaxed text-foreground cursor-pointer"
              >
                I confirm that I have legal authority to sign on behalf of the designated entity, and I accept the terms of this Mutual Non-Disclosure Agreement (v1.0).
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNdaRequest(null)}
              disabled={isSigning}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteNda}
              disabled={isSigning || !ndaAgreed || signerName.trim().length < 3}
              className="gap-1.5"
            >
              <FileCheck2 className="size-4" />
              {isSigning ? "Executing NDA..." : "Sign NDA & Unlock Data Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IN-APP DOCUMENT PREVIEW DIALOG FOR INVESTORS */}
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
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                AUTHORIZED DILIGENCE ACCESS — NDA v1.0 ACTIVE
              </span>
              <span className="text-[10px] font-mono opacity-80">VERIFIED ACCREDITED INVESTOR</span>
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
                    <span className="font-medium text-foreground">Access Scope:</span> Authorized Diligence Review
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Confidentiality:</span> Governed by executed Mutual NDA
                  </div>
                </div>
                <div className="rounded border bg-muted/40 p-3 text-[11px] text-muted-foreground leading-relaxed">
                  This document contains proprietary information regarding the venture including technical architectures, capitalization terms, and operational milestones. Viewing and downloading are logged under the founder's audit ledger.
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
                onClick={() =>
                  handleDownload(previewDoc, previewStartupId)
                }
              >
                <Download className="size-4" /> Download File
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* PLATFORM RULES & REGULATIONS (v1.0-cv-reg) INTERCEPT MODAL          */}
      {/* ==================================================================== */}
      <Dialog
        open={rulesModalRequest !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRulesModalRequest(null);
            setRulesConfirmed(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-600" />
              <DialogTitle className="text-lg">
                Platform Rules &amp; Regulations (v1.0-cv-reg)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Before opening or downloading confidential documents for{" "}
              <strong className="text-foreground">
                {rulesModalRequest?.req.startupName || "this venture"}
              </strong>
              , you must acknowledge your responsibilities, confidentiality covenants, and consequences of violations.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[340px] rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-3 [scrollbar-width:thin]">
            <div className="font-semibold text-foreground text-sm border-b pb-2">
              CAMPUSVENTURE DILIGENCE COMPLIANCE &amp; CONFIDENTIALITY COVENANT (v1.0-cv-reg)
            </div>

            <p>
              This Compliance Agreement governs the review and handling of proprietary student venture materials accessed via
              CampusVenture by accredited investors, institutional partners, and angel syndicates.
            </p>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">1. Bona Fide Diligence &amp; Permitted Use</p>
              <p>
                All documents, cap tables, software blueprints, financial projections, and customer traction data
                are disclosed strictly and exclusively for evaluating a potential venture investment, financing, or strategic
                partnership with the founder. No competitive benchmarking, product copying, or exploratory reverse-engineering
                is permitted.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">2. Absolute Confidentiality &amp; Non-Circumvention</p>
              <p>
                You covenant to maintain all materials in strict confidence. You shall not duplicate, publish, distribute,
                transmit, or disclose any confidential materials to unauthorized third parties or competitive ventures without
                prior explicit written approval from the student founder.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">3. Student Founder Protection &amp; Academic IP Integrity</p>
              <p>
                CampusVenture maintains zero tolerance for idea appropriation, unauthorized IP transfer, or predatory deal
                structures. You acknowledge that venture assets may be incubated under university guidelines and are protected
                by applicable academic and trade secret protections.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">4. Diligence Oversight &amp; Audit Logging</p>
              <p>
                Your authenticated investor identity, acceptance timestamp, rules version, and document access events are
                permanently recorded in a tamper-resistant audit ledger accessible to the venture's authorized university incubation
                office for institutional diligence oversight.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">5. Consequences of Violations</p>
              <p>
                Any breach of these rules will result in immediate termination of platform privileges, revocation of accredited
                status, formal reporting to university administration and partner investment networks, and civil liability
                for damages and equitable injunctive relief under applicable commercial laws.
              </p>
            </div>
          </ScrollArea>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3">
              <Checkbox
                id="rules-agree"
                checked={rulesConfirmed}
                onCheckedChange={(c) => setRulesConfirmed(Boolean(c))}
                className="mt-0.5"
              />
              <Label
                htmlFor="rules-agree"
                className="text-xs font-normal leading-relaxed text-foreground cursor-pointer"
              >
                I confirm that I am investor <strong>{investorName}</strong> ({user?.email || "Investor"}), in my full presence and legal authority. I am okay with all rules and regulations and the consequences of rule breaks. I agree and submit this form as permanent proof of verification and security for <strong>{rulesModalRequest?.req.startupName || "the venture"}</strong> and founder ({rulesModalRequest?.req.founderEmail || "Student Founder"}).
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRulesModalRequest(null);
                setRulesConfirmed(false);
              }}
              disabled={isSavingRules}
            >
              Decline &amp; Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptRulesAndProceed}
              disabled={!rulesConfirmed || isSavingRules}
              className="gap-1.5"
            >
              <ShieldCheck className="size-4" />
              {isSavingRules ? "Recording Acceptance..." : "Accept Rules & Proceed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}