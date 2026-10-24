import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileLock2, ShieldCheck } from "lucide-react";
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
import { MY_INVESTOR_ID, timeAgo, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { requestService, type DataRoomRequestRecord } from "@/services/requestService";

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
  const { access, docs, startups, signNda, registerDownload, notify } = useVenture();
  const { user } = useAuth();
  const myInvestorId = user?.id || MY_INVESTOR_ID;
  const investorName = user?.name || DEMO_INVESTORS[0]?.name || "Investor";
  const [liveRequests, setLiveRequests] = useState<DataRoomRequestRecord[]>([]);

  useEffect(() => {
    let active = true;
    requestService.getDataRoomRequestsForInvestor(myInvestorId).then((reqs) => {
      if (active) setLiveRequests(reqs);
    });
    return () => {
      active = false;
    };
  }, [myInvestorId]);

  // Merge live requests with store access records
  const allAccessMap = new Map<string, { id: string; startupId: string; status: string; ndaSigned: boolean; ndaSignedName: string; requestedAt: string; downloads: number }>();
  
  access.filter((a) => a.investorId === myInvestorId || a.investorId === MY_INVESTOR_ID).forEach((a) => {
    allAccessMap.set(a.startupId, a);
  });

  liveRequests.forEach((r) => {
    const existing = allAccessMap.get(r.startupId);
    allAccessMap.set(r.startupId, {
      id: r.id,
      startupId: r.startupId,
      status: r.status,
      ndaSigned: r.ndaSigned || existing?.ndaSigned || false,
      ndaSignedName: r.ndaSignedName || existing?.ndaSignedName || "",
      requestedAt: r.createdAt || existing?.requestedAt || new Date().toISOString(),
      downloads: existing?.downloads || 0,
    });
  });

  const mine = Array.from(allAccessMap.values());
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

        {mine.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            No data-room requests yet. Request access from a startup profile.
          </div>
        )}

        {mine.map((a) => {
          const startup = startups.find((s) => s.id === a.startupId);
          const files = docs.filter((d) => d.startupId === a.startupId);
          const unlocked = a.status === "granted" && a.ndaSigned;
          return (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{startup?.name}</CardTitle>
                    <CardDescription>
                      Requested {timeAgo(a.requestedAt)} · {a.downloads} downloads
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{a.status}</Badge>
                    <Badge variant={a.ndaSigned ? "default" : "secondary"}>
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      {a.ndaSigned ? "NDA signed" : "NDA required"}
                    </Badge>
                    {!a.ndaSigned && a.status === "granted" && (
                      <Button size="sm" onClick={() => setNdaFor(a.startupId)}>
                        Sign NDA
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {a.status !== "granted" ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                    Waiting for {startup?.name} to approve your request.
                  </p>
                ) : (
                  files.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileLock2 className="size-4 text-muted-foreground" aria-hidden="true" />
                        <div>
                          <p className="font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.category} · {d.size}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={d.confidential && !unlocked}
                        onClick={() => {
                          registerDownload(a.startupId, myInvestorId);
                          notify("student", "Data-room activity", `${investorName} opened ${d.name}.`);
                          toast.success(`${d.name} downloaded`);
                        }}
                      >
                        <Download className="size-4" aria-hidden="true" />
                        {d.confidential && !unlocked ? "Locked" : "Download"}
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
              onClick={() => {
                if (signature.trim().length < 3) {
                  toast.error("Enter your full name to sign.");
                  return;
                }
                signNda(ndaFor!, myInvestorId, signature.trim());
                notify("student", "NDA signed", `${signature.trim()} signed your data-room NDA.`);
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
