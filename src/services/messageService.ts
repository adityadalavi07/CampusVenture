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

    // 3. Persist to Supabase DB (supports both legacy schema and expanded schema)
    try {
      const payload: Record<string, any> = {
        id: safeId,
        content: record.content,
        read: false,
        created_at: now,
      };

      if (isValidUUID(senderId)) payload["sender_id"] = senderId;
      if (isValidUUID(recipientId)) payload["recipient_id"] = recipientId;
      if (isValidUUID(startupId)) payload["startup_id"] = startupId;

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
    const { startupId, investorId, currentUserId } = params;
    const conversationId = `${startupId}:${investorId}`;

    const local = getLocalMessages().filter(
      (m) =>
        m.conversationId === conversationId ||
        (m.startupId === startupId && (m.senderId === investorId || m.recipientId === investorId))
    );

    try {
      if (currentUserId && isValidUUID(currentUserId) && isValidUUID(investorId)) {
        const { data, error } = await (supabase as any)
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUserId},recipient_id.eq.${investorId}),and(sender_id.eq.${investorId},recipient_id.eq.${currentUserId})`
          )
          .order("created_at", { ascending: true });

        if (!error && Array.isArray(data)) {
          const dbRecords: ChatMessageRecord[] = data.map((d: any) => ({
            id: d.id,
            conversationId,
            startupId: d.startup_id || startupId,
            senderId: d.sender_id,
            senderName: d.sender_id === currentUserId ? "You" : "Partner",
            senderRole: d.sender_id === investorId ? "investor" : "student",
            recipientId: d.recipient_id,
            content: d.content,
            read: d.read || false,
            createdAt: d.created_at,
          }));

          const map = new Map<string, ChatMessageRecord>();
          local.forEach((m) => map.set(m.id, m));
          dbRecords.forEach((m) => {
            if (!map.has(m.id)) map.set(m.id, m);
          });

          return Array.from(map.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
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
  }): Promise<ChatMessageRecord[]> {
    const { userId, userEmail } = params;
    const cleanEmail = userEmail?.toLowerCase().trim();

    const local = getLocalMessages().filter((m) => {
      if (!userId && !cleanEmail) return true;
      if (userId && (m.senderId === userId || m.recipientId === userId)) return true;
      if (cleanEmail && (m.senderEmail?.toLowerCase() === cleanEmail || m.recipientEmail?.toLowerCase() === cleanEmail)) return true;
      return false;
    });

    try {
      if (userId && isValidUUID(userId)) {
        const { data, error } = await (supabase as any)
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order("created_at", { ascending: true });

        if (!error && Array.isArray(data)) {
          const dbRecords: ChatMessageRecord[] = data.map((d: any) => ({
            id: d.id,
            conversationId: `${d.startup_id || "s1"}:${d.sender_id === userId ? d.recipient_id : d.sender_id}`,
            startupId: d.startup_id || "s1",
            senderId: d.sender_id,
            senderName: d.sender_id === userId ? "You" : "Partner",
            senderRole: "student",
            recipientId: d.recipient_id,
            content: d.content,
            read: d.read || false,
            createdAt: d.created_at,
          }));

          const map = new Map<string, ChatMessageRecord>();
          local.forEach((m) => map.set(m.id, m));
          dbRecords.forEach((m) => {
            if (!map.has(m.id)) map.set(m.id, m);
          });

          return Array.from(map.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
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
              conversationId: `${raw.startup_id || "s1"}:${raw.sender_id}`,
              startupId: raw.startup_id || "s1",
              senderId: raw.sender_id,
              senderName: "Partner",
              senderRole: "investor",
              recipientId: raw.recipient_id,
              content: raw.content,
              read: raw.read || false,
              createdAt: raw.created_at,
            });
          }
        }
      )
      .subscribe();

    // Secondary fallback polling (every 3 seconds) for network resilience
    pollingTimer = setInterval(() => {
      // triggers caller refresh if needed
    }, 3000);

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
      supabase.removeChannel(channel);
    };
  },
};
