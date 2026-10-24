import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, FileLock2, FileUp, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const currentStartup = startups.find(
    (s) =>
      (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.name && s.founder === user.name)
  );
  const currentStartupId = currentStartup?.id || user?.id || MY_STARTUP_ID;

  const myDocs = docs.filter((d) => d.startupId === currentStartupId || d.startupId === MY_STARTUP_ID);
  const myAccess = access.filter((a) => a.startupId === currentStartupId || a.startupId === MY_STARTUP_ID);

  useEffect(() => {
    let active = true;
    requestService.getDataRoomRequestsForStartup(currentStartupId).then((reqs) => {
      if (active) {
        setLiveRequests(reqs);
        setLoadingRequests(false);
      }
    });
    return () => {
      active = false;
    };
  }, [currentStartupId]);

  const handleGrantAccess = async (reqId: string, invName: string) => {
    await requestService.updateDataRoomRequestStatus(reqId, "granted");
    setAccessStatus(reqId, "granted");
    setLiveRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "granted" } : r))
    );
    notify("investor", "Data-room access granted", `${invName} can now view files.`);
    toast.success(`Access granted to ${invName}`);
  };

  const handleDeclineAccess = async (reqId: string, invName: string) => {
    await requestService.updateDataRoomRequestStatus(reqId, "rejected");
    setAccessStatus(reqId, "revoked");
    setLiveRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "rejected" } : r))
    );
    toast.info(`Access request declined for ${invName}`);
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5"
                >
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
                          onClick={() => handleGrantAccess(req.id, displayName)}
                        >
                          <Check className="size-3.5" />
                          Grant
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeclineAccess(req.id, displayName)}
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
                        onClick={() => handleDeclineAccess(req.id, displayName)}
                      >
                        Revoke Access
                      </Button>
                    )}

                    {isRejected && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-emerald-600 hover:bg-emerald-50"
                        onClick={() => handleGrantAccess(req.id, displayName)}
                      >
                        Re-grant Access
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
