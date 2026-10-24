import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileLock2, FileUp, ShieldCheck, Trash2 } from "lucide-react";
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

  const currentStartup = startups.find(
    (s) =>
      (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.name && s.founder === user.name)
  );
  const currentStartupId = currentStartup?.id || user?.id || MY_STARTUP_ID;

  const myDocs = docs.filter((d) => d.startupId === currentStartupId || d.startupId === MY_STARTUP_ID);
  const myAccess = access.filter((a) => a.startupId === currentStartupId || a.startupId === MY_STARTUP_ID);

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
            <CardTitle className="text-base">Access requests</CardTitle>
            <CardDescription>Grant or revoke investor access to the data room.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {myAccess.length === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No access requests yet.
              </p>
            )}
            {myAccess.map((a) => {
              const inv = DEMO_INVESTORS.find((i) => i.id === a.investorId);
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{inv?.name ?? a.investorId}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv?.organization} · requested {timeAgo(a.requestedAt)} · {a.downloads} downloads
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.ndaSigned ? "default" : "secondary"}>
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      {a.ndaSigned ? `NDA signed by ${a.ndaSignedName}` : "NDA pending"}
                    </Badge>
                    <Badge variant="outline">{a.status}</Badge>
                    {a.status !== "granted" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setAccessStatus(a.id, "granted");
                          notify("investor", "Data-room access granted", `${inv?.name} can now view files.`);
                          toast.success("Access granted");
                        }}
                      >
                        Grant
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAccessStatus(a.id, "revoked");
                          toast("Access revoked");
                        }}
                      >
                        Revoke
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
