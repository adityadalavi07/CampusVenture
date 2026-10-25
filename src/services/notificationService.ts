import { supabase } from "@/lib/supabase";
import { generateUUID } from "@/lib/uuid";
import type { Role } from "@/lib/demo-data";

export interface NotificationRecord {
  id: string;
  role: Role;
  recipientEmail?: string | undefined;
  recipientUserId?: string | undefined;
  senderEmail?: string | undefined;
  senderUserId?: string | undefined;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const LOCAL_NOTIFICATIONS_KEY = "campusventure.notifications.live.v2";

function getLocalNotifications(): NotificationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalNotifications(items: NotificationRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 60)));
  } catch {
    /* ignore */
  }
}

export const notificationService = {
  /**
   * Dispatch a notification globally to Supabase central database and local cache.
   * Tracks sender identity to prevent self-notification loops and prevents duplicate alerts.
   */
  async sendNotification(params: {
    role: Role;
    title: string;
    body: string;
    recipientEmail?: string | undefined;
    recipientUserId?: string | undefined;
    senderEmail?: string | undefined;
    senderUserId?: string | undefined;
  }): Promise<{ success: boolean; notification: NotificationRecord }> {
    const { role, title, body, recipientEmail, recipientUserId, senderEmail, senderUserId } = params;
    const cleanRecipientEmail = recipientEmail ? recipientEmail.toLowerCase().trim() : undefined;
    const cleanSenderEmail = senderEmail ? senderEmail.toLowerCase().trim() : undefined;
    const safeRecipientUserId = recipientUserId ? String(recipientUserId) : undefined;
    const safeSenderUserId = senderUserId ? String(senderUserId) : undefined;

    // Deduplication check: Prevent identical unread notifications within 60 seconds
    const existingRecent = getLocalNotifications().find(
      (n) =>
        n.role === role &&
        n.title === title &&
        n.recipientEmail === cleanRecipientEmail &&
        n.recipientUserId === safeRecipientUserId &&
        !n.read &&
        Date.now() - new Date(n.createdAt).getTime() < 60000
    );
    if (existingRecent) {
      return { success: true, notification: existingRecent };
    }

    const safeId = generateUUID();
    const now = new Date().toISOString();

    const record: NotificationRecord = {
      id: safeId,
      role,
      recipientEmail: cleanRecipientEmail,
      recipientUserId: safeRecipientUserId,
      senderEmail: cleanSenderEmail,
      senderUserId: safeSenderUserId,
      title,
      body,
      read: false,
      createdAt: now,
    };

    // Update local notifications cache
    const local = getLocalNotifications();
    saveLocalNotifications([record, ...local]);

    // Persist to Supabase
    try {
      const payload: Record<string, any> = {
        id: safeId,
        role,
        title,
        body,
        read: false,
        created_at: now,
      };

      if (cleanRecipientEmail) {
        payload["recipient_email"] = cleanRecipientEmail;
      }
      if (safeRecipientUserId) {
        payload["user_id"] = safeRecipientUserId;
      }
      if (cleanSenderEmail) {
        payload["sender_email"] = cleanSenderEmail;
      }
      if (safeSenderUserId) {
        payload["sender_id"] = safeSenderUserId;
      }

      const { error } = await (supabase as any).from("notifications").insert(payload);
      if (error) {
        console.warn("[NotificationService] Notice saving notification to Supabase:", error.message);
      }
    } catch (err) {
      console.warn("[NotificationService] Supabase insert exception:", err);
    }

    return { success: true, notification: record };
  },

  /**
   * Fetch all notifications relevant ONLY to this specific user from Supabase and local cache.
   * Strictly isolates private notifications by recipient_user_id and recipient_email.
   * Excludes notifications originating from the user themselves.
   */
  async getNotificationsForUser(
    role: Role,
    userEmail?: string | undefined,
    userId?: string | undefined
  ): Promise<NotificationRecord[]> {
    const cleanEmail = userEmail?.toLowerCase().trim();

    // If neither email nor userId is provided, cannot safely determine recipient
    if (!cleanEmail && !userId) {
      return [];
    }

    const local = getLocalNotifications().filter((n) => {
      // Exclude self-notifications
      if (cleanEmail && n.senderEmail && n.senderEmail.toLowerCase() === cleanEmail) {
        return false;
      }
      if (userId && n.senderUserId && n.senderUserId === userId) {
        return false;
      }
      if (n.role !== role) return false;

      // Strictly isolated match: Must match recipientEmail OR recipientUserId
      const matchesEmail = cleanEmail && n.recipientEmail && n.recipientEmail.toLowerCase() === cleanEmail;
      const matchesUserId = userId && n.recipientUserId && n.recipientUserId === userId;

      return Boolean(matchesEmail || matchesUserId);
    });

    try {
      let query = (supabase as any)
        .from("notifications")
        .select("*")
        .eq("role", role)
        .order("created_at", { ascending: false })
        .limit(50);

      const orClauses: string[] = [];
      if (cleanEmail) {
        orClauses.push(`recipient_email.ilike.${cleanEmail}`);
      }
      if (userId) {
        orClauses.push(`user_id.eq.${userId}`);
      }

      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      } else {
        return local;
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const dbRecords: NotificationRecord[] = data
          .map((d: any) => ({
            id: d.id,
            role: d.role as Role,
            recipientEmail: d.recipient_email || undefined,
            recipientUserId: d.user_id || undefined,
            senderEmail: d.sender_email || undefined,
            senderUserId: d.sender_id || undefined,
            title: d.title,
            body: d.body,
            read: Boolean(d.read),
            createdAt: d.created_at,
          }))
          .filter((d: NotificationRecord) => {
            // Strictly exclude self-notifications
            if (cleanEmail && d.senderEmail && d.senderEmail.toLowerCase() === cleanEmail) {
              return false;
            }
            if (userId && d.senderUserId && d.senderUserId === userId) {
              return false;
            }
            // Strictly check intended recipient
            const matchesEmail = cleanEmail && d.recipientEmail && d.recipientEmail.toLowerCase() === cleanEmail;
            const matchesUserId = userId && d.recipientUserId && d.recipientUserId === userId;
            return Boolean(matchesEmail || matchesUserId);
          });

        const map = new Map<string, NotificationRecord>();
        local.forEach((l) => map.set(l.id, l));
        dbRecords.forEach((r) => map.set(r.id, r));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveLocalNotifications(merged);
        return merged;
      }
    } catch (err) {
      console.warn("[NotificationService] DB getNotificationsForUser exception:", err);
    }

    return local;
  },

  /**
   * Mark all notifications as read for a given role/user
   */
  async markAllRead(role: Role, userEmail?: string | undefined): Promise<void> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const local = getLocalNotifications().map((n) => {
      if (
        n.role === role &&
        (!n.recipientEmail || (cleanEmail && n.recipientEmail.toLowerCase() === cleanEmail))
      ) {
        return { ...n, read: true };
      }
      return n;
    });
    saveLocalNotifications(local);

    try {
      const query = (supabase as any).from("notifications").update({ read: true });
      if (cleanEmail) {
        query.or(`role.eq.${role},recipient_email.ilike.${cleanEmail}`);
      } else {
        query.eq("role", role);
      }
      await query;
    } catch {
      /* ignore */
    }
  },

  /**
   * Clear all notifications so they disappear from the panel
   */
  async clearAllNotifications(role: Role, userEmail?: string | undefined): Promise<void> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const local = getLocalNotifications().filter((n) => {
      if (n.role !== role) return true;
      if (cleanEmail && n.recipientEmail && n.recipientEmail.toLowerCase() === cleanEmail) {
        return false;
      }
      if (!n.recipientEmail) return false;
      return true;
    });
    saveLocalNotifications(local);

    try {
      const query = (supabase as any).from("notifications").update({ read: true });
      if (cleanEmail) {
        query.or(`role.eq.${role},recipient_email.ilike.${cleanEmail}`);
      } else {
        query.eq("role", role);
      }
      await query;
    } catch {
      /* ignore */
    }
  },

  /**
   * Subscribe to real-time notification changes across browser tabs and devices
   */
  subscribeToNotifications(
    role: Role,
    userEmail: string | undefined,
    onUpdate: (notifications: NotificationRecord[]) => void
  ) {
    let pollingTimer: any = null;

    // 1. Initial fetch
    notificationService.getNotificationsForUser(role, userEmail).then(onUpdate);

    // 2. Real-time postgres channel listener
    const channel = supabase
      .channel(`public-notifications-${role}-${userEmail || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        async () => {
          const fresh = await notificationService.getNotificationsForUser(role, userEmail);
          onUpdate(fresh);
        }
      )
      .subscribe();

    // 3. Periodic fallback poll every 5 seconds to ensure cross-device consistency
    pollingTimer = setInterval(async () => {
      const fresh = await notificationService.getNotificationsForUser(role, userEmail);
      onUpdate(fresh);
    }, 5000);

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
      supabase.removeChannel(channel);
    };
  },
};
