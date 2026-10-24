import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Download,
  FileLock2,
  MessageSquare,
  ShieldCheck,
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
import { DEMO_INVESTORS } from "@/lib/demo-data";
import { timeAgo, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { requestService, type DataRoomRequestRecord, type DataRoomDocRecord } from "@/services/requestService";

const TITLE = "Data Rooms — CampusVenture Investor";
const DESCRIPTION =
  "Sign the NDA and review confidential startup documents you have been granted access to.";

export const Route = createFileRoute("/app/investor/dataroom")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: InvestorDataRooms,
});

function InvestorDataRooms() {
  const { startups, signNda, registerDownload, notify } = useVenture();
  const { user } = useAuth();
  const myInvestorId = user?.id || "usr-investor";
  const investorName = user?.name || DEMO_INVESTORS[0]?.name || "Investor";
  const [liveRequests, setLiveRequests] = useState<DataRoomRequestRecord[]>([]);
  const [startupDocsMap, setStartupDocsMap] = useState<Record<string, DataRoomDocRecord[]>>({});

  useEffect(() => {
    let active = true;
    const fetchRequests = () => {
      requestService.getDataRoomRequestsForInvestor(myInvestorId, user?.email).then((reqs) => {
        if (active) setLiveRequests(reqs);
      });
    };

    fetchRequests();
    const unsub = requestService.subscribeToDataRoomRequests(fetchRequests);
    return () => {
      active = false;
      unsub();
    };
  }, [myInvestorId, user?.email]);

  // Load real uploaded documents for each granted/requested startup
  useEffect(() => {
    let active = true;
    const loadDocs = async () => {
      const map: Record<string, DataRoomDocRecord[]> = {};
      for (const req of liveRequests) {
        if (req.startupId) {
          const files = await requestService.getDataRoomDocsForStartup(req.startupId);
          map[req.startupId] = files;
        }
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

  const [ndaFor, setNdaFor] = useState<string | null>(null);
  const [signature, setSignature] = useState(investorName);

  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Data rooms</h1>
          <p className="text-sm text-muted-foreground">
            Confidential files unlock once the founder grants access and you sign the NDA.
          </p>
        </div>

        {liveRequests.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            No data-room requests yet. Discover verified startups and request diligence access.
          </div>
        )}

        {liveRequests.map((a) => {
          const startup = startups.find((s) => s.id === a.startupId);
          const files = startupDocsMap[a.startupId] || [];
          const unlocked = a.status === "granted" && a.ndaSigned;

          return (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{a.startupName || startup?.name || "Startup"}</CardTitle>
                    <CardDescription>
                      Requested {timeAgo(a.createdAt)} · {files.length} document{files.length === 1 ? "" : "s"} available
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "granted" ? "default" : (a.status === "rejected" || a.status === "revoked") ? "destructive" : "outline"} className="capitalize">
                      {a.status}
                    </Badge>
                    <Badge variant={a.ndaSigned ? "default" : "secondary"}>
                      <ShieldCheck className="size-3.5 mr-1" aria-hidden="true" />
                      {a.ndaSigned ? "NDA signed" : "NDA required"}
                    </Badge>
                    {!a.ndaSigned && a.status === "granted" && (
                      <Button size="sm" onClick={() => setNdaFor(a.startupId)}>
                        Sign NDA &amp; Unlock
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* ACTIVE COLLABORATION & NEXT STEPS */}
                {a.status === "granted" && (
                  <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" /> Founder Discussion Terms &amp; Projected Next Steps
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-background border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                        Access Authorized
                      </Badge>
                    </div>

                    {a.discussionTerms && (
                      <div>
                        <span className="font-semibold text-foreground">Diligence &amp; Discussion Terms: </span>
                        <span className="text-muted-foreground">{a.discussionTerms}</span>
                      </div>
                    )}

                    {a.nextSteps && (
                      <div>
                        <span className="font-semibold text-foreground">Agreed Next Steps: </span>
                        <p className="text-muted-foreground whitespace-pre-line mt-0.5">{a.nextSteps}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/10">
                      <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1.5">
                        <Link to="/app/investor/messages">
                          <MessageSquare className="size-3" />
                          Start Discussion with Founder
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1.5">
                        <Link to="/app/investor/meetings">
                          <Calendar className="size-3" />
                          Schedule Diligence Meeting
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

                {a.status === "rejected" || a.status === "revoked" ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-destructive">
                      {a.status === "revoked" ? "Data-Room Access Revoked by Founder" : "Data-Room Access Request Declined"}
                    </p>
                    <p>
                      {a.declineReason ||
                        (a.status === "revoked"
                          ? "Access to this data room has been revoked by the founder. All proprietary files are locked."
                          : "The founder is not expanding diligence access or raising capital for this venture at this time.")}
                    </p>
                  </div>
                ) : a.status !== "granted" ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                    Waiting for {a.startupName || startup?.name || "founder"} to approve your data room request.
                  </p>
                ) : files.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">No confidential documents uploaded by founder yet.</p>
                    <p>The founder has not added diligence files to this data room. You can message the founder directly to request specific materials.</p>
                  </div>
                ) : (
                  files.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <FileLock2 className="size-4 text-muted-foreground" aria-hidden="true" />
                        <div>
                          <p className="font-medium text-sm">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.category} · {d.size}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={unlocked ? "default" : "outline"}
                        disabled={d.confidential && !unlocked}
                        onClick={() => {
                          registerDownload(a.startupId, myInvestorId);
                          notify("student", "Data-room activity", `${investorName} downloaded ${d.name}.`, {
                            recipientEmail: a.founderEmail,
                          });
                          toast.success(`${d.name} downloaded successfully`);
                        }}
                      >
                        <Download className="size-4 mr-1.5" aria-hidden="true" />
                        {d.confidential && !unlocked ? "Locked (NDA Required)" : "Download"}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={ndaFor !== null} onOpenChange={(o) => !o && setNdaFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Non-disclosure agreement</DialogTitle>
            <DialogDescription>
              You agree to keep all documents in this data room confidential, to use them solely to
              evaluate a potential investment, and not to share them with third parties without
              written consent from the founder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nda-sign">Type your full name to sign</Label>
            <Input
              id="nda-sign"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (signature.trim().length < 3) {
                  toast.error("Enter your full name to sign.");
                  return;
                }
                const cleanSig = signature.trim();
                signNda(ndaFor!, myInvestorId, cleanSig);
                const reqItem = liveRequests.find((r) => r.startupId === ndaFor);
                if (reqItem) {
                  await requestService.signDataRoomNda(reqItem.id, cleanSig);
                  setLiveRequests((prev) =>
                    prev.map((r) =>
                      r.id === reqItem.id ? { ...r, ndaSigned: true, ndaSignedName: cleanSig } : r
                    )
                  );
                }
                const st = startups.find((s) => s.id === ndaFor);
                notify(
                  "student",
                  "NDA Signed & Data Room Unlocked",
                  `${cleanSig} signed your data-room NDA for ${st?.name || "your venture"}. Confidential files are now unlocked.`,
                  reqItem?.founderEmail || st?.founderEmail
                    ? { recipientEmail: reqItem?.founderEmail || st?.founderEmail }
                    : undefined
                );
                toast.success("NDA signed — documents unlocked");
                setNdaFor(null);
              }}
            >
              Sign and unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
