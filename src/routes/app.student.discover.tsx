import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, MessagesSquare, RefreshCw, Rocket, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScoreRing } from "@/components/score-ring";
import { formatMoney, matchScore, type Investor } from "@/lib/demo-data";
import { useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { investorService } from "@/services/investorService";
import { requestService } from "@/services/requestService";

const TITLE = "Discover Investors — CampusVenture";
const DESCRIPTION =
  "Find investors whose sector, stage and cheque size match your student startup, and open a conversation.";

export const Route = createFileRoute("/app/student/discover")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: DiscoverInvestors,
});

function DiscoverInvestors() {
  const { startups, sendMessage, notify, addRequest } = useVenture();
  const { user } = useAuth();
  const startup = startups.find(
    (s) =>
      (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.name && s.founder === user.name)
  );

  const [q, setQ] = useState("");
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentConnections, setSentConnections] = useState<Record<string, boolean>>({});

  const fetchInvestors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await investorService.getAllInvestors();
      setInvestors(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load investors from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, []);

  if (!startup) {
    return (
      <AppShell role="student">
        <div className="mx-auto max-w-lg space-y-6 py-16 text-center animate-in fade-in-50">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Rocket className="size-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Create your startup profile first</h1>
            <p className="text-sm text-muted-foreground">
              To discover matching venture funds and angel investors, build and submit your startup idea so our AI matchmaker can compute thesis compatibility.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/app/student/startup">Build My Startup Profile</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const list = investors
    .map((investor) => ({ investor, ...matchScore(investor, startup) }))
    .filter(({ investor }) =>
      `${investor.name} ${investor.organization} ${investor.sectors.join(" ")} ${investor.thesis}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
    .sort((a, b) => b.score - a.score);

  const handleSendConnection = async (investor: Investor) => {
    setSentConnections((prev) => ({ ...prev, [investor.id]: true }));
    addRequest(startup.id, investor.id, "connection");
    await requestService.sendConnectionRequest({
      senderId: user?.id || startup.id,
      senderName: user?.name || startup.founder || "Founder",
      senderEmail: user?.email,
      senderRole: "student",
      senderOrg: user?.org || startup.university,
      receiverId: investor.id,
      receiverName: investor.name,
      receiverEmail: investor.email,
      startupId: startup.id,
      startupName: startup.name,
      message: `Hi ${investor.name.split(" ")[0]}, I am the founder of ${startup.name} (${startup.university}). We would love to connect with ${investor.organization}.`,
    });
    notify("investor", "New connection request", `${startup.name} founder sent a connection request.`, {
      recipientEmail: investor.email,
      recipientUserId: investor.id,
      senderEmail: user?.email,
      senderUserId: user?.id,
    });
    toast.success(`Connection request sent to ${investor.name}`);
  };

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Discover investors</h1>
            <p className="text-sm text-muted-foreground">
              Real registered investors ranked against {startup.name} by sector, stage, cheque size and thesis fit.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchInvestors} disabled={loading} className="gap-1.5">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Directory
          </Button>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search investors by name, firm, sector, or thesis..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search investors"
          />
        </div>

        {loading && (
          <div className="flex min-h-[300px] flex-col items-center justify-center space-y-3">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading registered investors from database...</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchInvestors}>
              Retry Connection
            </Button>
          </div>
        )}

        {!loading && !error && list.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
            <p className="text-sm font-medium">No investors found matching &ldquo;{q}&rdquo;</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search terms or clear the filter to see all active investors.
            </p>
            <Button variant="outline" size="sm" onClick={() => setQ("")}>
              Clear Filter
            </Button>
          </div>
        )}

        {!loading && !error && list.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map(({ investor, score, reasons }) => {
              const isConnected = sentConnections[investor.id];

              return (
                <Card key={investor.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{investor.name}</CardTitle>
                        <CardDescription>
                          {investor.organization} · {investor.type}
                        </CardDescription>
                      </div>
                      <ScoreRing value={score} size={56} label="fit" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-xs leading-relaxed">{investor.thesis}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {investor.sectors.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[11px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cheque {formatMoney(investor.ticketMin)}–{formatMoney(investor.ticketMax)} ·{" "}
                        {investor.geography} · {investor.stages.join(", ")}
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {reasons.slice(0, 3).map((r) => (
                          <li key={r}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {isConnected ? (
                        <Button size="sm" variant="secondary" disabled className="gap-1.5 text-xs flex-1">
                          <Check className="size-3.5 text-emerald-600" /> Connection Requested
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs flex-1"
                          onClick={() => handleSendConnection(investor)}
                        >
                          <UserPlus className="size-3.5" /> Connect
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs flex-1"
                        onClick={() => {
                          sendMessage(
                            startup.id,
                            investor.id,
                            "student",
                            `Hi ${investor.name.split(" ")[0]}, I'm building ${startup.name} — ${startup.tagline} Would you be open to a short intro call?`
                          );
                          notify("investor", "New intro message", `${startup.name} reached out.`, {
                            recipientEmail: investor.email,
                            recipientUserId: investor.id,
                            senderEmail: user?.email,
                            senderUserId: user?.id,
                          });
                          toast.success(`Intro message sent to ${investor.name}`);
                        }}
                      >
                        <MessagesSquare className="size-3.5" aria-hidden="true" /> Send intro
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
