import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVenture, timeAgo } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/demo-data";

export function NotificationBell({ role }: { role: Role }) {
  const { notifications, unread, markAllRead, hydrated } = useVenture();
  const { user } = useAuth();

  const items = notifications.filter((n) => {
    if (n.role !== role) return false;
    const cleanEmail = user?.email?.toLowerCase().trim();
    if (n.recipientEmail && cleanEmail) {
      return n.recipientEmail.toLowerCase() === cleanEmail;
    }
    if (n.recipientUserId && user?.id) {
      return n.recipientUserId === user.id;
    }
    // If notification was targeted to a specific email/user and user does not match, do not show
    if (n.recipientEmail || n.recipientUserId) {
      return false;
    }
    return true;
  });

  const count = hydrated
    ? items.filter((n) => !n.read).length
    : 0;

  const getTargetLink = (n: { title: string; body: string }) => {
    const text = `${n.title} ${n.body}`.toLowerCase();
    if (role === "student") {
      if (text.includes("data-room") || text.includes("data room") || text.includes("access")) {
        return "/app/student/dataroom";
      }
      if (text.includes("connection")) {
        return "/app/student/dataroom";
      }
      if (text.includes("message")) {
        return "/app/student/messages";
      }
      return "/app/student";
    }
    if (role === "investor") {
      if (text.includes("data-room") || text.includes("data room") || text.includes("terms")) {
        return "/app/investor/dataroom";
      }
      if (text.includes("connection") || text.includes("message")) {
        return "/app/investor/messages";
      }
      return "/app/investor";
    }
    return "/app/university";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        >
          <Bell className="size-4" />
          {count > 0 && (
            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => markAllRead(role)}
            disabled={count === 0}
          >
            <CheckCheck className="size-3.5" aria-hidden="true" />
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const targetLink = getTargetLink(n);
                return (
                  <li key={n.id} className="transition-colors hover:bg-muted/50">
                    <Link to={targetLink} className="flex gap-3 px-4 py-3 block text-left">
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-muted" : "bg-primary"}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium leading-snug">{n.title}</p>
                          <ExternalLink className="size-3 text-muted-foreground shrink-0 opacity-50" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.at)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t px-4 py-2">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            Verified Notifications
          </Badge>
        </div>
      </PopoverContent>
    </Popover>
  );
}
