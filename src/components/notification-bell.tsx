import { useState } from "react";
import { Bell, CheckCheck, ExternalLink, Trash2, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVenture, timeAgo } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/demo-data";

export function NotificationBell({ role }: { role: Role }) {
  const { notifications, markAllRead, clearAllNotifications, hydrated } = useVenture();
  const { user } = useAuth();
  const [filterMode, setFilterMode] = useState<"unread" | "all">("unread");
  const [open, setOpen] = useState(false);

  const cleanUserEmail = user?.email?.toLowerCase().trim();
  const cleanUserId = user?.id;

  // Filter out any notification originating from the user themselves, and verify recipient targeting
  const items = notifications.filter((n) => {
    // 1. Strict anti-loop: SENDER MUST NEVER RECEIVE THEIR OWN NOTIFICATIONS
    if (cleanUserEmail && n.senderEmail && n.senderEmail.toLowerCase() === cleanUserEmail) {
      return false;
    }
    if (cleanUserId && n.senderUserId && n.senderUserId === cleanUserId) {
      return false;
    }

    // 2. Role matching
    if (n.role !== role) return false;

    // 3. Strict recipient check: If recipient is designated, it MUST match the current user
    if (n.recipientEmail) {
      return cleanUserEmail ? n.recipientEmail.toLowerCase() === cleanUserEmail : false;
    }
    if (n.recipientUserId) {
      return cleanUserId ? n.recipientUserId === cleanUserId : false;
    }

    // 4. If notification had no specific recipient (system broadcast), exclude if initiated by this user
    return true;
  });

  const unreadItems = items.filter((n) => !n.read);
  const count = hydrated ? unreadItems.length : 0;

  // By default, display unread items so that clicking "Mark all read" causes them to disappear cleanly
  const displayedItems = filterMode === "unread" ? unreadItems : items;

  const getTargetLink = (n: { title: string; body: string }) => {
    const text = `${n.title} ${n.body}`.toLowerCase();
    if (role === "student") {
      if (text.includes("data-room") || text.includes("data room") || text.includes("diligence") || text.includes("nda")) {
        return "/app/student/dataroom?tab=access-requests";
      }
      if (text.includes("connection")) {
        return "/app/student/dataroom?tab=connections";
      }
      if (text.includes("message") || text.includes("chat") || text.includes("intro")) {
        return "/app/student/messages";
      }
      if (text.includes("meeting") || text.includes("sync") || text.includes("schedule")) {
        return "/app/student/meetings";
      }
      return "/app/student";
    }
    if (role === "investor") {
      if (text.includes("granted") || text.includes("unlocked") || text.includes("active terms")) {
        return "/app/investor/dataroom?tab=accessible";
      }
      if (text.includes("data-room") || text.includes("data room") || text.includes("nda") || text.includes("terms")) {
        return "/app/investor/dataroom?tab=requests";
      }
      if (text.includes("connection") || text.includes("message") || text.includes("chat") || text.includes("intro")) {
        return "/app/investor/messages";
      }
      if (text.includes("meeting") || text.includes("sync") || text.includes("schedule")) {
        return "/app/investor/meetings";
      }
      return "/app/investor";
    }
    return "/app/university";
  };

  const handleMarkAllRead = () => {
    markAllRead(role);
    setFilterMode("unread");
  };

  const handleClearAll = () => {
    clearAllNotifications(role);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
          aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        >
          <Bell className="size-4" />
          {count > 0 && (
            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground animate-in zoom-in-50 duration-200">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-88 p-0 shadow-lg border">
        {/* Header with Title and Clear/Mark-read Actions */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Notifications</p>
            {count > 0 && (
              <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground font-semibold">
                {count} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                onClick={handleMarkAllRead}
                title="Mark all as read and clear panel"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Mark all read
              </Button>
            )}
            {items.length > 0 && count === 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={handleClearAll}
                title="Clear notification list"
              >
                <Trash2 className="size-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filter Toggle: Unread vs All */}
        {items.length > 0 && (
          <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs bg-muted/10">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterMode === "unread"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setFilterMode("unread")}
              >
                Unread ({count})
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterMode === "all"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setFilterMode("all")}
              >
                All ({items.length})
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground">Click item to take action</span>
          </div>
        )}

        {/* Scrollable Notifications List with Visible Scrollbar */}
        <div className="max-h-80 overflow-y-auto overscroll-contain divide-y [scrollbar-width:thin] [scrollbar-color:oklch(var(--border))_transparent]">
          {displayedItems.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500/70" />
              <p className="text-sm font-medium text-foreground">You're all caught up</p>
              <p className="text-xs text-muted-foreground">
                {filterMode === "unread" && items.length > 0
                  ? "All notifications have been read. Switch to 'All' to review history."
                  : "No notifications pending. We will notify you when someone reaches out."}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {displayedItems.map((n) => {
                const targetLink = getTargetLink(n);
                return (
                  <li key={n.id} className="transition-colors hover:bg-muted/40">
                    <Link
                      to={targetLink}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 block text-left group"
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full transition-colors ${
                          n.read ? "bg-muted-foreground/30" : "bg-primary ring-2 ring-primary/20"
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                            {n.title}
                          </p>
                          <ExternalLink className="size-3 text-muted-foreground shrink-0 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/80 font-mono">
                          {timeAgo(n.at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/20">
          <Badge variant="outline" className="text-[10px] py-0 uppercase tracking-wider font-semibold border-border">
            Verified Security Feed
          </Badge>
          <span>Real-time Sync Active</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
