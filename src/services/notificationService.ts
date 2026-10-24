import { supabase } from "@/lib/supabase";
import { generateUUID, isValidUUID } from "@/lib/uuid";
import type { Role } from "@/lib/demo-data";

export interface NotificationRecord {
  id: string;
  role: Role;
  recipientEmail?: string | undefined;
  recipientUserId?: string | undefined;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const LOCAL_NOTIFICATIONS_KEY = "campusventure.notifications.live.v1";

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
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export const notificationService = {
  /**
   * Dispatch a notification globally to Supabase central database and local cache
   */
  async sendNotification(params: {
    role: Role;
    title: string;
    body: string;
    recipientEmail?: string | undefined;
    recipientUserId?: string | undefined;
  }): Promise<{ success: boolean; notification: NotificationRecord }> {
    const { role, title, body, recipientEmail, recipientUserId } = params;
    const safeId = generateUUID();
    const now = new Date().toISOString();

    const record: NotificationRecord = {
      id: safeId,
      role,
      recipientEmail: recipientEmail ? recipientEmail.toLowerCase().trim() : undefined,
      recipientUserId: recipientUserId && isValidUUID(recipientUserId) ? recipientUserId : undefined,
      title,
      body,
      read: false,
      createdAt: now,
    };

    // Save locally immediately
    const existing = getLocalNotifications();
    saveLocalNotifications([record, ...existing.filter((n) => n.id !== safeId)]);

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

      if (recipientEmail) {
        payload["recipient_email"] = recipientEmail.toLowerCase().trim();
      }
      if (recipientUserId && isValidUUID(recipientUserId)) {
        payload["user_id"] = recipientUserId;
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
   * Fetch all notifications relevant to this user/role from Supabase and local cache
   */
  async getNotificationsForUser(
    role: Role,
    userEmail?: string | undefined,
    userId?: string | undefined
  ): Promise<NotificationRecord[]> {
    const local = getLocalNotifications().filter((n) => {
      if (n.role === role) return true;
      if (userEmail && n.recipientEmail && n.recipientEmail.toLowerCase() === userEmail.toLowerCase()) return true;
      if (userId && n.recipientUserId && n.recipientUserId === userId) return true;
      return false;
    });

    try {
      const query = (supabase as any)
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);

      // Filter by role or matching recipient email
      if (userEmail) {
        query.or(`role.eq.${role},recipient_email.ilike.${userEmail.trim()}`);
      } else {
        query.eq("role", role);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const dbRecords: NotificationRecord[] = data.map((d: any) => ({
          id: d.id,
          role: d.role as Role,
          recipientEmail: d.recipient_email || undefined,
          recipientUserId: d.user_id || undefined,
          title: d.title,
          body: d.body,
          read: Boolean(d.read),
          createdAt: d.created_at,
        }));

        // Merge DB records with local
        const map = new Map<string, NotificationRecord>();
        dbRecords.forEach((r) => map.set(r.id, r));
        local.forEach((l) => {
          if (!map.has(l.id)) map.set(l.id, l);
        });

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveLocalNotifications(merged);
        return merged;
      }
    } catch (err) {
      console.warn("[NotificationService] Fetch error:", err);
    }

    return local;
  },

  /**
   * Mark all notifications as read for a given role/user
   */
  async markAllRead(role: Role, userEmail?: string | undefined): Promise<void> {
    const local = getLocalNotifications().map((n) => {
      if (n.role === role || (userEmail && n.recipientEmail?.toLowerCase() === userEmail.toLowerCase())) {
        return { ...n, read: true };
      }
      return n;
    });
    saveLocalNotifications(local);

    try {
      const query = (supabase as any).from("notifications").update({ read: true });
      if (userEmail) {
        query.or(`role.eq.${role},recipient_email.ilike.${userEmail.trim()}`);
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
