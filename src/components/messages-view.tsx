import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DEMO_INVESTORS } from "@/lib/demo-data";
import { MY_INVESTOR_ID, MY_STARTUP_ID, timeAgo, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";

/** Shared two-pane inbox. `as` decides which side of the thread you speak from. */
export function MessagesView({ as }: { as: "student" | "investor" }) {
  const { messages, startups, sendMessage, markThreadRead, notify } = useVenture();
  const { user } = useAuth();
  const currentStartupId =
    startups.find(
      (s) =>
        (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.name && s.founder === user.name)
    )?.id || MY_STARTUP_ID;

  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const threads = useMemo(() => {
    const map = new Map<string, { startupId: string; investorId: string; last: string; unread: number }>();
    for (const m of messages) {
      if (as === "student" && m.startupId !== currentStartupId && m.startupId !== MY_STARTUP_ID) continue;
      if (as === "investor" && m.investorId !== MY_INVESTOR_ID) continue;
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
  }, [messages, as]);

  const activeKey = active ?? (threads[0] ? `${threads[0].startupId}:${threads[0].investorId}` : null);
  const [startupId, investorId] = (activeKey ?? ":").split(":");

  useEffect(() => {
    if (startupId && investorId) markThreadRead(startupId, investorId, as);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const thread = messages
    .filter((m) => m.startupId === startupId && m.investorId === investorId)
    .sort((a, b) => a.at.localeCompare(b.at));

  const title = (sId: string, iId: string) =>
    as === "student"
      ? (DEMO_INVESTORS.find((i) => i.id === iId)?.name ?? "Investor")
      : (startups.find((s) => s.id === sId)?.name ?? "Startup");

  const subtitle = (sId: string, iId: string) =>
    as === "student"
      ? (DEMO_INVESTORS.find((i) => i.id === iId)?.organization ?? "")
      : (startups.find((s) => s.id === sId)?.sector ?? "");

  function send() {
    const text = draft.trim();
    if (!text || !startupId || !investorId) return;
    sendMessage(startupId, investorId, as, text);
    notify(
      as === "student" ? "investor" : "student",
      "New message",
      `${title(startupId, investorId)}: ${text.slice(0, 60)}`,
    );
    setDraft("");
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        No conversations yet.
      </div>
    );
  }

  return (
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
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">{title(startupId!, investorId!)}</p>
          <p className="text-xs text-muted-foreground">{subtitle(startupId!, investorId!)}</p>
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
  );
}
