import { supabase } from "@/lib/supabase";
import { generateUUID, isValidUUID } from "@/lib/uuid";
import type { Role } from "@/lib/demo-data";
import { notificationService } from "./notificationService";

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  startupId: string;
  senderId: string;
  senderName: string;
  senderRole: "student" | "investor" | "university";
  senderEmail?: string | undefined;
  recipientId: string;
  recipientName?: string | undefined;
  recipientEmail?: string | undefined;
  content: string;
  read: boolean;
  createdAt: string;
}

const LOCAL_MESSAGES_KEY = "campusventure.chat.messages.v2";

function getLocalMessages(): ChatMessageRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(items: ChatMessageRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(items.slice(-500)));
  } catch {
    /* ignore */
  }
}

// Global broadcast channel for instantaneous peer-to-peer real-time delivery
let chatBroadcastChannel: any = null;

function getBroadcastChannel() {
  if (!chatBroadcastChannel) {
    chatBroadcastChannel = supabase.channel("cv-chat-realtime-broadcast");
    chatBroadcastChannel.subscribe();
  }
  return chatBroadcastChannel;
}

export const messageService = {
  /**
   * Send a chat message with instant local optimistic update, Supabase DB persistence,
   * and Supabase Realtime WebSocket broadcast.
   */
  async sendMessage(params: {
    startupId: string;
    senderId: string;
    senderName: string;
    senderRole: "student" | "investor" | "university";
    senderEmail?: string | undefined;
    recipientId: string;
    recipientName?: string | undefined;
    recipientEmail?: string | undefined;
    content: string;
  }): Promise<{ success: boolean; message: ChatMessageRecord }> {
    const {
      startupId,
      senderId,
      senderName,
      senderRole,
      senderEmail,
      recipientId,
      recipientName,
      recipientEmail,
      content,
    } = params;

    const safeId = generateUUID();
    const now = new Date().toISOString();
    const conversationId = `${startupId}:${senderRole === "investor" ? senderId : recipientId}`;

    const record: ChatMessageRecord = {
      id: safeId,
      conversationId,
      startupId,
      senderId,
      senderName: senderName || "Member",
      senderRole,
      senderEmail: senderEmail || undefined,
      recipientId,
      recipientName: recipientName || undefined,
      recipientEmail: recipientEmail || undefined,
      content: content.trim(),
      read: false,
      createdAt: now,
    };

    // 1. Immediate local cache write
    const local = getLocalMessages();
    saveLocalMessages([...local, record]);

    // 2. Broadcast immediately over Supabase Realtime WebSocket channel
    try {
      const channel = getBroadcastChannel();
      channel.send({
        type: "broadcast",
        event: "new_chat_message",
        payload: record,
      });
    } catch (bcErr) {
      console.warn("[MessageService] Broadcast notice:", bcErr);
    }

    // 3. Persist to Supabase DB
    try {
      const payload: Record<string, any> = {
        id: safeId,
        sender_id: String(senderId),
        recipient_id: String(recipientId),
        content: record.content,
        read: false,
        created_at: now,
      };

      if (startupId) payload["startup_id"] = String(startupId);
      if (senderName) payload["sender_name"] = senderName;
      if (senderRole) payload["sender_role"] = senderRole;
      if (senderEmail) payload["sender_email"] = senderEmail.toLowerCase().trim();
      if (recipientName) payload["recipient_name"] = recipientName;
      if (recipientEmail) payload["recipient_email"] = recipientEmail.toLowerCase().trim();

      const { error } = await (supabase as any).from("messages").insert(payload);
      if (error) {
        console.warn("[MessageService] Notice inserting message to Supabase DB:", error.message);
      }
    } catch (dbErr) {
      console.warn("[MessageService] DB insert exception:", dbErr);
    }

    // 4. Dispatch notification to recipient
    try {
      const targetRole: Role = senderRole === "student" ? "investor" : "student";
      await notificationService.sendNotification({
        role: targetRole,
        title: `New message from ${senderName}`,
        body: record.content.length > 70 ? `${record.content.slice(0, 67)}...` : record.content,
        ...(recipientEmail ? { recipientEmail } : {}),
        ...(recipientId && isValidUUID(recipientId) ? { recipientUserId: recipientId } : {}),
      });
    } catch {
      /* ignore notification failure */
    }

    return { success: true, message: record };
  },

  /**
   * Fetch all messages for a specific conversation thread
   */
  async getMessagesForThread(params: {
    startupId: string;
    investorId: string;
    currentUserId?: string | undefined;
    currentUserEmail?: string | undefined;
  }): Promise<ChatMessageRecord[]> {
    const { startupId, investorId, currentUserId, currentUserEmail } = params;
    const conversationId = `${startupId}:${investorId}`;
    const cleanEmail = currentUserEmail?.toLowerCase().trim();

    const local = getLocalMessages().filter(
      (m) =>
        m.conversationId === conversationId ||
        (m.startupId === startupId && (m.senderId === investorId || m.recipientId === investorId))
    );

    try {
      let query = (supabase as any)
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      const orClauses: string[] = [];
      if (startupId) {
        orClauses.push(`startup_id.eq.${startupId}`);
      }
      if (currentUserId && investorId) {
        orClauses.push(
          `and(sender_id.eq.${currentUserId},recipient_id.eq.${investorId})`,
          `and(sender_id.eq.${investorId},recipient_id.eq.${currentUserId})`
        );
      }
      if (cleanEmail) {
        orClauses.push(`sender_email.ilike.${cleanEmail}`, `recipient_email.ilike.${cleanEmail}`);
      }

      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const dbRecords: ChatMessageRecord[] = data.map((d: any) => ({
          id: d.id,
          conversationId,
          startupId: d.startup_id || startupId,
          senderId: d.sender_id,
          senderName: d.sender_name || (d.sender_id === currentUserId ? "You" : "Partner"),
          senderRole: d.sender_role || (d.sender_id === investorId ? "investor" : "student"),
          senderEmail: d.sender_email || undefined,
          recipientId: d.recipient_id,
          recipientName: d.recipient_name || undefined,
          recipientEmail: d.recipient_email || undefined,
          content: d.content,
          read: d.read || false,
          createdAt: d.created_at,
        }));

        const map = new Map<string, ChatMessageRecord>();
        local.forEach((m) => map.set(m.id, m));
        dbRecords.forEach((m) => map.set(m.id, m));

        return Array.from(map.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    } catch (err) {
      console.warn("[MessageService] DB fetch thread error:", err);
    }

    return local.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },

  /**
   * Fetch all messages accessible to the current user
   */
  async getAllMessagesForUser(params: {
    userId?: string | undefined;
    userEmail?: string | undefined;
    startupIds?: string[] | undefined;
  }): Promise<ChatMessageRecord[]> {
    const { userId, userEmail, startupIds } = params;
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanStartupIds = (startupIds || []).filter(Boolean);

    const local = getLocalMessages().filter((m) => {
      if (!userId && !cleanEmail && cleanStartupIds.length === 0) return true;
      if (userId && (m.senderId === userId || m.recipientId === userId)) return true;
      if (cleanEmail && (m.senderEmail?.toLowerCase() === cleanEmail || m.recipientEmail?.toLowerCase() === cleanEmail)) return true;
      if (m.startupId && cleanStartupIds.includes(m.startupId)) return true;
      return false;
    });

    try {
      const orClauses: string[] = [];
      if (userId) {
        orClauses.push(`sender_id.eq.${userId}`, `recipient_id.eq.${userId}`);
      }
      if (cleanEmail) {
        orClauses.push(`sender_email.ilike.${cleanEmail}`, `recipient_email.ilike.${cleanEmail}`);
      }
      if (cleanStartupIds.length > 0) {
        orClauses.push(`startup_id.in.(${cleanStartupIds.join(",")})`);
      }

      let query = (supabase as any)
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const dbRecords: ChatMessageRecord[] = data.map((d: any) => ({
          id: d.id,
          conversationId: `${d.startup_id || "global"}:${d.sender_role === "investor" ? d.sender_id : d.recipient_id}`,
          startupId: d.startup_id || "",
          senderId: d.sender_id,
          senderName: d.sender_name || (d.sender_id === userId ? "You" : "Partner"),
          senderRole: d.sender_role || "student",
          senderEmail: d.sender_email || undefined,
          recipientId: d.recipient_id,
          recipientName: d.recipient_name || undefined,
          recipientEmail: d.recipient_email || undefined,
          content: d.content,
          read: d.read || false,
          createdAt: d.created_at,
        }));

        const map = new Map<string, ChatMessageRecord>();
        local.forEach((m) => map.set(m.id, m));
        dbRecords.forEach((m) => map.set(m.id, m));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        saveLocalMessages(merged);
        return merged;
      }
    } catch (err) {
      console.warn("[MessageService] DB fetch all messages error:", err);
    }

    return local;
  },

  /**
   * Subscribe to real-time incoming messages across tabs, browsers, and devices.
   */
  subscribeToMessages(onNewMessage: (msg: ChatMessageRecord) => void) {
    let pollingTimer: any = null;

    // Listen on WebSocket broadcast channel for instant delivery (< 50ms)
    const channel = supabase.channel("cv-realtime-messages-listener")
      .on("broadcast", { event: "new_chat_message" }, (event: any) => {
        if (event && event.payload) {
          onNewMessage(event.payload as ChatMessageRecord);
        }
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          if (payload && payload.new) {
            const raw = payload.new;
            onNewMessage({
              id: raw.id,
              conversationId: `${raw.startup_id || "global"}:${raw.sender_id}`,
              startupId: raw.startup_id || "",
              senderId: raw.sender_id,
              senderName: raw.sender_name || "Partner",
              senderRole: raw.sender_role || "investor",
              senderEmail: raw.sender_email || undefined,
              recipientId: raw.recipient_id,
              recipientName: raw.recipient_name || undefined,
              recipientEmail: raw.recipient_email || undefined,
              content: raw.content,
              read: raw.read || false,
              createdAt: raw.created_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
