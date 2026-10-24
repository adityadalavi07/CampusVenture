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
  ArrowRight,
  Info,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_INVESTORS } from "@/lib/demo-data";
import { MY_STARTUP_ID, timeAgo, useVenture, type DataRoomDoc } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { requestService, type DataRoomRequestRecord } from "@/services/requestService";

const TITLE = "Data Room — CampusVenture Founder";
const DESCRIPTION =
  "Share confidential documents with investors under NDA, and grant or revoke access at any time.";

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
});

const CATEGORIES: DataRoomDoc["category"][] = [
  "Financials",
  "Legal",
  "Product",
  "Metrics",
  "Cap table",
];

function StudentDataRoom() {
  const { docs, access, addDoc, removeDoc, setAccessStatus, notify, startups } = useVenture();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<DataRoomDoc["category"]>("Financials");
  const [liveRequests, setLiveRequests] = useState<DataRoomRequestRecord[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const userStartups = startups.filter(
    (s) =>
      (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.name && s.founder === user.name)
  );
  const currentStartup = userStartups[0];
  const startupIds = Array.from(new Set([
    ...(userStartups.map((s) => s.id)),
    ...(currentStartup?.id ? [currentStartup.id] : []),
    ...(user?.id ? [user.id] : []),
    MY_STARTUP_ID,
  ]));
  const currentStartupId = currentStartup?.id || user?.id || MY_STARTUP_ID;

  const myDocs = docs.filter((d) => d.startupId === currentStartupId || d.startupId === MY_STARTUP_ID);
  const myAccess = access.filter((a) => a.startupId === currentStartupId || a.startupId === MY_STARTUP_ID);

  // Real-time synchronization of data room requests from investors across browsers & devices
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
          if (active) {
            setLiveRequests(reqs);
            setLoadingRequests(false);
          }
        });
    };

    fetchRequests();
    const unsub = requestService.subscribeToDataRoomRequests(fetchRequests);
    return () => {
      active = false;
      unsub();
    };
  }, [startupIds.join(","), user?.id, user?.email]);

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
        r.id === reqId
          ? { ...r, status: "granted", discussionTerms, nextSteps }
          : r
      )
    );
    notify(
      "investor",
      "Data-room access granted & terms shared",
      `${invName} can now view confidential diligence files and review discussion terms for ${selectedReq.startupName || "Startup"}.`,
      {
        ...(selectedReq.investorEmail ? { recipientEmail: selectedReq.investorEmail } : {}),
        ...(selectedReq.investorId ? { recipientUserId: selectedReq.investorId } : {}),
      }
    );
    toast.success(`Access granted to ${invName}! Next steps projected.`);
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
      prev.map((r) =>
        r.id === reqId ? { ...r, status: "rejected", declineReason } : r
      )
    );
    notify(
      "investor",
      "Data-room request declined",
      `Founder declined data-room access for ${selectedReq.startupName || "Startup"}. Feedback: "${declineReason}"`,
      {
        ...(selectedReq.investorEmail ? { recipientEmail: selectedReq.investorEmail } : {}),
        ...(selectedReq.investorId ? { recipientUserId: selectedReq.investorId } : {}),
      }
    );
    toast.info(`Request declined with feedback note sent to ${invName}`);
    setDeclineModalOpen(false);
  };

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Data room</h1>
          <p className="text-sm text-muted-foreground">
            Confidential files are only visible to investors you approve after they sign the NDA.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Documents ({myDocs.length})</CardTitle>
                <CardDescription>Upload financials, legal papers and metrics.</CardDescription>
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    addDoc({
                      startupId: currentStartupId,
                      name: file.name,
                      category,
                      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                      confidential: true,
                    });
                    toast.success(`${file.name} added to the data room`);
                    e.target.value = "";
                  }}
                />
                <Button size="sm" onClick={() => fileRef.current?.click()}>
                  <FileUp className="size-4" aria-hidden="true" /> Upload
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {myDocs.length === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No documents yet.
              </p>
            )}
            {myDocs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileLock2 className="size-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.category} · {d.size} · added {timeAgo(d.addedAt)}
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
                    onClick={() => {
                      removeDoc(d.id);
                      toast("Document removed");
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access requests ({liveRequests.length})</CardTitle>
            <CardDescription>Grant or decline investor access to your proprietary documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {liveRequests.length === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No access requests yet. When accredited investors discover your venture and request data room access, they will appear here.
              </p>
            )}
            {liveRequests.map((req) => {
              const displayName = req.investorName || "Accredited Investor";
              const displayOrg = req.investorOrg || "Venture Fund";
              const isGranted = req.status === "granted";
              const isRejected = req.status === "rejected";

              return (
                <div
                  key={req.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{displayName}</p>
                        <Badge variant="outline" className="text-[11px]">
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
                        {req.ndaSigned ? `NDA signed` : "NDA pending"}
                      </Badge>
                      <Badge
                        variant={
                          isGranted
                            ? "default"
                            : isRejected
                            ? "destructive"
                            : "outline"
                        }
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
                          onClick={() => openDeclineDialog(req)}
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

                  {/* ACTIVE COLLABORATION & NEXT STEPS OF DISCUSSION */}
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
                          <span className="font-semibold text-foreground">Agreed Discussion Terms: </span>
                          <span className="text-muted-foreground">{req.discussionTerms}</span>
                        </div>
                      )}

                      {req.nextSteps && (
                        <div>
                          <span className="font-semibold text-foreground">Projected Next Steps: </span>
                          <p className="text-muted-foreground whitespace-pre-line mt-0.5">{req.nextSteps}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/10">
                        <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1.5">
                          <Link to="/app/student/messages">
                            <MessageSquare className="size-3" />
                            Message Investor
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1.5">
                          <Link to="/app/student/meetings">
                            <Calendar className="size-3" />
                            Schedule Discussion Meeting
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* REJECTION REASON & TERMS FEEDBACK */}
                  {isRejected && req.declineReason && (
                    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-destructive">
                        <Info className="size-3.5" />
                        Decline Feedback / Terms Note Shared:
                      </div>
                      <p className="text-muted-foreground">{req.declineReason}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG 1: GRANT ACCESS & SET DISCUSSION TERMS */}
      <Dialog open={grantModalOpen} onOpenChange={setGrantModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Data-Room Access &amp; Discussion Terms</DialogTitle>
            <DialogDescription>
              Authorize {selectedReq?.investorName || "Investor"} ({selectedReq?.investorOrg || "Venture Fund"}) to inspect confidential documents and set mutual next steps.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="terms-note" className="text-xs font-semibold">
                Diligence &amp; Access Terms
              </Label>
              <Textarea
                id="terms-note"
                rows={2}
                value={discussionTerms}
                onChange={(e) => setDiscussionTerms(e.target.value)}
                placeholder="Specify NDA duration, access period, or specific terms..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="next-steps-note" className="text-xs font-semibold">
                Projected Next Steps of Discussion
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

      {/* DIALOG 2: DECLINE REQUEST & SEND FEEDBACK */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Access Request</DialogTitle>
            <DialogDescription>
              Politely decline access to {selectedReq?.investorName || "Investor"}. You can specify the reason or term mismatch so expectations remain clear.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="decline-presets" className="text-xs font-semibold">
                Select Common Reason
              </Label>
              <Select
                onValueChange={(val) => {
                  if (val === "round_full") setDeclineReason("Current financing round is fully subscribed. We are not adding new investors at this time.");
                  else if (val === "stage_mismatch") setDeclineReason("Our current round stage / check size is not aligned with this fund's mandate.");
                  else if (val === "geo_mismatch") setDeclineReason("Focusing exclusively on localized campus incubation partners for this phase.");
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
    </AppShell>
  );
}
