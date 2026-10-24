import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Info,
  MessageSquare,
  Send,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";
import { DEMO_INVESTORS } from "@/lib/demo-data";
import { MY_INVESTOR_ID, MY_STARTUP_ID, timeAgo, useVenture, type Message } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { requestService, type ConnectionRequestRecord } from "@/services/requestService";
import { messageService, type ChatMessageRecord } from "@/services/messageService";

/** Shared two-pane inbox. `as` decides which side of the thread you speak from. */
export function MessagesView({ as }: { as: "student" | "investor" }) {
  const { messages, startups, sendMessage, markThreadRead, notify } = useVenture();
  const { user } = useAuth();

  const userStartups = startups.filter(
    (s) =>
      (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.name && s.founder === user.name)
  );
  const currentStartupId = userStartups[0]?.id || MY_STARTUP_ID;
  const startupIds = Array.from(new Set([
    ...userStartups.map((s) => s.id),
    currentStartupId,
    MY_STARTUP_ID,
  ]));

  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [liveChatMessages, setLiveChatMessages] = useState<ChatMessageRecord[]>([]);

  // Connection requests state
  const [connRequests, setConnRequests] = useState<ConnectionRequestRecord[]>([]);
  const [selectedConn, setSelectedConn] = useState<ConnectionRequestRecord | null>(null);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [connTerms, setConnTerms] = useState("Open introduction and venture alignment discussion.");
  const [connNextSteps, setConnNextSteps] = useState(
    "1. Founder & Investor intro chat.\n2. Review pitch materials.\n3. Schedule a 20-minute discussion sync."
  );
  const [connDeclineReason, setConnDeclineReason] = useState(
    "Thank you for reaching out. We are focusing on other priorities right now."
  );

  const myUserId = user?.id || (as === "student" ? currentStartupId : MY_INVESTOR_ID);

  // Synchronize incoming connection requests across Supabase and local cache
  useEffect(() => {
    let active = true;
    const fetchConns = () => {
      requestService.getIncomingConnectionRequests(myUserId, user?.email, startupIds).then((reqs) => {
        if (active) setConnRequests(reqs);
      });
    };

    fetchConns();
    const unsub = requestService.subscribeToConnectionRequests(fetchConns);
    return () => {
      active = false;
      unsub();
    };
  }, [myUserId, user?.email, startupIds.join(",")]);

  // Synchronize chat messages with Supabase and real-time WebSocket broadcast
  useEffect(() => {
    let active = true;
    messageService.getAllMessagesForUser({ userId: user?.id, userEmail: user?.email }).then((msgs) => {
      if (active) setLiveChatMessages(msgs);
    });

    const unsubMessages = messageService.subscribeToMessages((incoming) => {
      setLiveChatMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });

    return () => {
      active = false;
      unsubMessages();
    };
  }, [user?.id, user?.email]);

  const handleOpenAcceptModal = (req: ConnectionRequestRecord) => {
    setSelectedConn(req);
    if (req.discussionTerms) setConnTerms(req.discussionTerms);
    if (req.nextSteps) setConnNextSteps(req.nextSteps);
    setAcceptModalOpen(true);
  };

  const handleOpenDeclineModal = (req: ConnectionRequestRecord) => {
    setSelectedConn(req);
    if (req.declineReason) setConnDeclineReason(req.declineReason);
    setDeclineModalOpen(true);
  };

  const handleConfirmAccept = async () => {
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

    // Create an initial message thread and open it
    const targetStartupId = selectedConn.startupId || currentStartupId;
    const targetInvestorId = as === "student" ? selectedConn.senderId : myUserId;
    const introMsg = `Hi ${partnerName.split(" ")[0]}! I accepted your connection request. Let's discuss: ${connTerms}`;

    if (targetStartupId && targetInvestorId) {
      sendMessage(targetStartupId, targetInvestorId, as, introMsg);
      messageService.sendMessage({
        startupId: targetStartupId,
        senderId: myUserId,
        senderName: user?.name || (as === "student" ? "Founder" : "Investor"),
        senderRole: as,
        senderEmail: user?.email,
        recipientId: selectedConn.senderId,
        recipientEmail: selectedConn.senderEmail,
        content: introMsg,
      });
      setActive(`${targetStartupId}:${targetInvestorId}`);
    }

    notify(
      as === "student" ? "investor" : "student",
      "Connection request accepted!",
      `${user?.name || "Founder"} accepted your connection request regarding ${selectedConn.startupName || "Startup"}. Discussion terms and next steps are projected.`,
      {
        recipientEmail: selectedConn.senderEmail,
        recipientUserId: selectedConn.senderId,
      }
    );

    toast.success(`Connection accepted! Discussion initiated with ${partnerName}.`);
    setAcceptModalOpen(false);
  };

  const handleConfirmDecline = async () => {
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
      as === "student" ? "investor" : "student",
      "Connection request declined",
      `${user?.name || "Founder"} declined your connection request regarding ${selectedConn.startupName || "Startup"}. Feedback: "${connDeclineReason}"`,
      {
        recipientEmail: selectedConn.senderEmail,
        recipientUserId: selectedConn.senderId,
      }
    );

    toast.info(`Connection request declined for ${partnerName}.`);
    setDeclineModalOpen(false);
  };

  // Merge store messages with live Supabase messages
  const allMessages = useMemo(() => {
    const list: Array<Message & { senderRole?: string; senderName?: string }> = [...messages];
    liveChatMessages.forEach((l) => {
      if (!list.some((m) => m.id === l.id)) {
        list.push({
          id: l.id,
          startupId: l.startupId,
          investorId: l.senderRole === "investor" ? l.senderId : l.recipientId,
          from: l.senderRole === "investor" ? "investor" : "student",
          text: l.content,
          at: l.createdAt,
          readByStudent: l.read,
          readByInvestor: l.read,
          senderName: l.senderName,
          senderRole: l.senderRole,
        });
      }
    });
    return list;
  }, [messages, liveChatMessages]);

  const threads = useMemo(() => {
    const map = new Map<string, { startupId: string; investorId: string; last: string; unread: number }>();
    for (const m of allMessages) {
      if (as === "student" && !startupIds.includes(m.startupId)) continue;
      if (as === "investor" && m.investorId !== MY_INVESTOR_ID && m.investorId !== user?.id) continue;
      const key = `${m.startupId}:${m.investorId}`;
      const prev = map.get(key) ?? { startupId: m.startupId, investorId: m.investorId, last: m.at, unread: 0 };
      const unreadFlag = as === "student" ? !m.readByStudent : !m.readByInvestor;
      map.set(key, {
        ...prev,
        last: m.at > prev.last ? m.at : prev.last,
        unread: prev.unread + (unreadFlag && m.from !== as ? 1 : 0),
      });
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [allMessages, as, startupIds, user?.id]);

  const activeKey = active ?? (threads[0] ? `${threads[0].startupId}:${threads[0].investorId}` : null);
  const [startupId, investorId] = (activeKey ?? ":").split(":");

  useEffect(() => {
    if (startupId && investorId) markThreadRead(startupId, investorId, as);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const thread = allMessages
    .filter((m) => m.startupId === startupId && m.investorId === investorId)
    .sort((a, b) => a.at.localeCompare(b.at));

  const title = (sId: string, iId: string) => {
    if (as === "student") {
      const demo = DEMO_INVESTORS.find((i) => i.id === iId);
      if (demo) return demo.name;
      const conn = connRequests.find((c) => c.senderId === iId || c.receiverId === iId);
      if (conn?.senderName) return conn.senderName;
      return "Investor Partner";
    }
    const startup = startups.find((s) => s.id === sId);
    if (startup) return startup.name;
    const conn = connRequests.find((c) => c.startupId === sId);
    if (conn?.startupName) return conn.startupName;
    return "Venture Founder";
  };

  const subtitle = (sId: string, iId: string) => {
    if (as === "student") {
      const demo = DEMO_INVESTORS.find((i) => i.id === iId);
      if (demo) return demo.organization;
      const conn = connRequests.find((c) => c.senderId === iId || c.receiverId === iId);
      if (conn?.senderOrg) return conn.senderOrg;
      return "Venture Fund";
    }
    const startup = startups.find((s) => s.id === sId);
    if (startup) return startup.sector;
    return "Campus Venture";
  };

  async function send() {
    const text = draft.trim();
    if (!text || !startupId || !investorId) return;

    // Send via local store
    sendMessage(startupId, investorId, as, text);

    // Send via real-time message service
    await messageService.sendMessage({
      startupId,
      senderId: myUserId,
      senderName: user?.name || (as === "student" ? "Founder" : "Investor"),
      senderRole: as,
      senderEmail: user?.email,
      recipientId: investorId,
      content: text,
    });

    const targetStartup = startups.find((s) => s.id === startupId);
    const targetRecipientEmail = as === "investor" ? targetStartup?.founderEmail : undefined;
    const targetRecipientId = as === "student" ? investorId : targetStartup?.founder;

    notify(
      as === "student" ? "investor" : "student",
      `New message from ${user?.name || (as === "student" ? "Founder" : "Investor")}`,
      `${title(startupId, investorId)}: "${text.slice(0, 75)}"`,
      {
        ...(targetRecipientEmail ? { recipientEmail: targetRecipientEmail } : {}),
        ...(targetRecipientId ? { recipientUserId: targetRecipientId } : {}),
      }
    );
    setDraft("");
  }

  const pendingConns = connRequests.filter((c) => c.status === "pending");

  return (
    <div className="space-y-4">
      {/* INCOMING CONNECTION & INTRODUCTION REQUESTS */}
      {pendingConns.length > 0 && (
        <Card className="border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Incoming Connection &amp; Intro Requests</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              {pendingConns.length} Pending
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {pendingConns.map((req) => (
              <div
                key={req.id}
                className="flex flex-col justify-between gap-2.5 rounded-lg border bg-background p-3.5 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{req.senderName || "Member"}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {req.senderRole || "Investor"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {req.senderOrg || "Venture Partner"} · {timeAgo(req.createdAt)}
                  </p>
                  {req.message && (
                    <p className="mt-2 text-xs text-foreground/90 bg-muted/40 p-2 rounded border">
                      &ldquo;{req.message}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleOpenAcceptModal(req)}
                  >
                    <Check className="size-3" />
                    Accept &amp; Set Terms
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => handleOpenDeclineModal(req)}
                  >
                    <X className="size-3" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {threads.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No conversations yet. Connect with {as === "student" ? "investors" : "founders"} to start discussing opportunities.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="h-[560px] overflow-hidden p-0">
            <ScrollArea className="h-full">
              <ul className="divide-y">
                {threads.map((t) => {
                  const key = `${t.startupId}:${t.investorId}`;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setActive(key)}
                        className={cn(
                          "w-full px-4 py-3 text-left transition-colors hover:bg-accent",
                          key === activeKey && "bg-accent",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{title(t.startupId, t.investorId)}</span>
                          {t.unread > 0 && <Badge className="h-5 px-1.5 text-[10px]">{t.unread}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{subtitle(t.startupId, t.investorId)}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(t.last)}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </Card>

          <Card className="flex h-[560px] flex-col p-0">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{title(startupId!, investorId!)}</p>
                <p className="text-xs text-muted-foreground">{subtitle(startupId!, investorId!)}</p>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Live Sync
              </Badge>
            </div>
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-3">
                {thread.map((m) => (
                  <div key={m.id} className={cn("flex", m.from === as ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                        m.from === as ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      <p>{m.text}</p>
                      <p className="mt-1 text-[10px] opacity-70">{timeAgo(m.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <form
              className="flex items-center gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
                aria-label="Message"
              />
              <Button type="submit" size="icon" aria-label="Send message">
                <Send className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* DIALOG: ACCEPT CONNECTION & SET DISCUSSION TERMS */}
      <Dialog open={acceptModalOpen} onOpenChange={setAcceptModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Connection &amp; Set Discussion Terms</DialogTitle>
            <DialogDescription>
              Accept the connection request from {selectedConn?.senderName || "Member"} ({selectedConn?.senderOrg || "Partner"}) and outline discussion terms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="conn-terms" className="text-xs font-semibold">
                Discussion Scope / Terms
              </Label>
              <Textarea
                id="conn-terms"
                rows={2}
                value={connTerms}
                onChange={(e) => setConnTerms(e.target.value)}
                placeholder="What terms or topics will be explored in this discussion..."
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
                placeholder="1. Introduction sync.&#10;2. Diligence review.&#10;3. Terms alignment."
                className="text-xs font-mono"
              />
            </div>

            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="size-4 text-primary shrink-0" />
              <span>
                Accepting unlocks mutual real-time messaging and automatically dispatches terms to {selectedConn?.senderName || "the requester"}.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAcceptModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={handleConfirmAccept}
            >
              <Check className="size-3.5" />
              Confirm &amp; Start Discussion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: DECLINE CONNECTION REQUEST */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Connection Request</DialogTitle>
            <DialogDescription>
              Send a polite feedback response to {selectedConn?.senderName || "Member"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="conn-decline" className="text-xs font-semibold">
                Decline Reason / Feedback
              </Label>
              <Textarea
                id="conn-decline"
                rows={3}
                value={connDeclineReason}
                onChange={(e) => setConnDeclineReason(e.target.value)}
                placeholder="Let them know why you are unable to connect at this time..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeclineModalOpen(false)}>
              Back
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1"
              onClick={handleConfirmDecline}
            >
              <X className="size-3.5" />
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
