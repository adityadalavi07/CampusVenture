import { supabase } from "@/lib/supabase";
import { generateUUID, isValidUUID } from "@/lib/uuid";

export interface DataRoomRequestRecord {
  id: string;
  startupId: string;
  investorId: string;
  investorName?: string | undefined;
  investorEmail?: string | undefined;
  investorOrg?: string | undefined;
  startupName?: string | undefined;
  status: "pending" | "granted" | "rejected" | "revoked";
  ndaSigned: boolean;
  ndaSignedName?: string | undefined;
  discussionTerms?: string | undefined;
  nextSteps?: string | undefined;
  declineReason?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionRequestRecord {
  id: string;
  senderId: string;
  senderName?: string | undefined;
  senderEmail?: string | undefined;
  senderRole?: string | undefined;
  senderOrg?: string | undefined;
  receiverId: string;
  receiverName?: string | undefined;
  startupId?: string | undefined;
  startupName?: string | undefined;
  message?: string | undefined;
  status: "pending" | "accepted" | "rejected";
  discussionTerms?: string | undefined;
  nextSteps?: string | undefined;
  declineReason?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_DR_KEY = "campusventure.dataroom.requests.v1";
const LOCAL_CONN_KEY = "campusventure.connections.requests.v1";

function getLocalDrRequests(): DataRoomRequestRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_DR_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDrRequests(items: DataRoomRequestRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_DR_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function getLocalConnRequests(): ConnectionRequestRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CONN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalConnRequests(items: ConnectionRequestRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CONN_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export const requestService = {
  // ============================================================================
  // DATA ROOM REQUESTS
  // ============================================================================

  /**
   * Request data room access for a startup by an investor
   */
  async requestDataRoomAccess(params: {
    startupId: string;
    investorId: string;
    investorName?: string | undefined;
    investorEmail?: string | undefined;
    investorOrg?: string | undefined;
    startupName?: string | undefined;
  }): Promise<{ success: boolean; request?: DataRoomRequestRecord; error?: string }> {
    const { startupId, investorId, investorName, investorEmail, investorOrg, startupName } = params;
    const safeId = generateUUID();
    const now = new Date().toISOString();

    const record: DataRoomRequestRecord = {
      id: safeId,
      startupId,
      investorId,
      investorName: investorName || "Accredited Investor",
      investorEmail: investorEmail || "",
      investorOrg: investorOrg || "Institutional Venture Fund",
      startupName: startupName || "Venture",
      status: "pending",
      ndaSigned: false,
      createdAt: now,
      updatedAt: now,
    };

    // Update local cache
    const existingLocal = getLocalDrRequests();
    const alreadyExists = existingLocal.find(
      (r) => r.startupId === startupId && r.investorId === investorId
    );
    if (!alreadyExists) {
      saveLocalDrRequests([record, ...existingLocal]);
    }

    // Persist to Supabase if UUIDs are valid and table exists
    if (isValidUUID(startupId) && isValidUUID(investorId)) {
      try {
        const { data, error } = await (supabase as any)
          .from("data_room_requests")
          .upsert({
            id: safeId,
            startup_id: startupId,
            investor_id: investorId,
            status: "pending",
            nda_signed: false,
            created_at: now,
            updated_at: now,
          }, { onConflict: "startup_id,investor_id" })
          .select()
          .single();

        if (error) {
          console.warn("[RequestService] Notice inserting data_room_requests to DB:", error.message);
        } else if (data) {
          record.id = data.id;
        }
      } catch (err) {
        console.warn("[RequestService] DB data_room_requests exception:", err);
      }
    }

    return { success: true, request: record };
  },

  /**
   * Fetch all data room requests for a given startup (for Student Founder view)
   */
  async getDataRoomRequestsForStartup(startupId: string): Promise<DataRoomRequestRecord[]> {
    const local = getLocalDrRequests().filter((r) => r.startupId === startupId);

    if (isValidUUID(startupId)) {
      try {
        const { data, error } = await (supabase as any)
          .from("data_room_requests")
          .select("*, profiles:investor_id(name, email, org)")
          .eq("startup_id", startupId)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const dbRecords: DataRoomRequestRecord[] = data.map((d: any) => ({
            id: d.id,
            startupId: d.startup_id,
            investorId: d.investor_id,
            investorName: d.profiles?.name || "Investor",
            investorEmail: d.profiles?.email || "",
            investorOrg: d.profiles?.org || "Venture Fund",
            status: d.status,
            ndaSigned: d.nda_signed || false,
            ndaSignedName: d.nda_signed_name || "",
            discussionTerms: d.discussion_terms || undefined,
            nextSteps: d.next_steps || undefined,
            declineReason: d.decline_reason || undefined,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));

          // Merge dbRecords with local
          const merged = [...dbRecords];
          for (const l of local) {
            if (!merged.some((m) => m.startupId === l.startupId && m.investorId === l.investorId)) {
              merged.push(l);
            }
          }
          return merged;
        }
      } catch (err) {
        console.warn("[RequestService] Error fetching data room requests for startup:", err);
      }
    }

    return local;
  },

  /**
   * Fetch all data room requests made by an investor
   */
  async getDataRoomRequestsForInvestor(investorId: string): Promise<DataRoomRequestRecord[]> {
    const local = getLocalDrRequests().filter((r) => r.investorId === investorId);

    if (isValidUUID(investorId)) {
      try {
        const { data, error } = await (supabase as any)
          .from("data_room_requests")
          .select("*, startups:startup_id(name, university)")
          .eq("investor_id", investorId)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const dbRecords: DataRoomRequestRecord[] = data.map((d: any) => ({
            id: d.id,
            startupId: d.startup_id,
            investorId: d.investor_id,
            startupName: d.startups?.name || "Startup",
            status: d.status,
            ndaSigned: d.nda_signed || false,
            ndaSignedName: d.nda_signed_name || "",
            discussionTerms: d.discussion_terms || undefined,
            nextSteps: d.next_steps || undefined,
            declineReason: d.decline_reason || undefined,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));

          const merged = [...dbRecords];
          for (const l of local) {
            if (!merged.some((m) => m.startupId === l.startupId && m.investorId === l.investorId)) {
              merged.push(l);
            }
          }
          return merged;
        }
      } catch (err) {
        console.warn("[RequestService] Error fetching investor data room requests:", err);
      }
    }

    return local;
  },

  /**
   * Update status of a data room request (Student Founder: approve/reject with terms & next steps)
   */
  async updateDataRoomRequestStatus(
    requestId: string,
    status: "granted" | "rejected" | "revoked",
    options?: {
      discussionTerms?: string | undefined;
      nextSteps?: string | undefined;
      declineReason?: string | undefined;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();

    // Update local cache
    const local = getLocalDrRequests();
    const updated = local.map((r) =>
      r.id === requestId
        ? {
            ...r,
            status,
            discussionTerms: options?.discussionTerms ?? r.discussionTerms,
            nextSteps: options?.nextSteps ?? r.nextSteps,
            declineReason: options?.declineReason ?? r.declineReason,
            updatedAt: now,
          }
        : r
    );
    saveLocalDrRequests(updated);

    if (isValidUUID(requestId)) {
      try {
        const payload: Record<string, any> = { status, updated_at: now };
        if (options?.discussionTerms !== undefined) payload["discussion_terms"] = options.discussionTerms;
        if (options?.nextSteps !== undefined) payload["next_steps"] = options.nextSteps;
        if (options?.declineReason !== undefined) payload["decline_reason"] = options.declineReason;

        const { error } = await (supabase as any)
          .from("data_room_requests")
          .update(payload)
          .eq("id", requestId);

        if (error) {
          console.warn("[RequestService] Error updating data room request in DB:", error.message);
        }
      } catch (err) {
        console.warn("[RequestService] DB exception on updateDataRoomRequestStatus:", err);
      }
    }

    return { success: true };
  },

  /**
   * Investor signs the mutual NDA for a data room request
   */
  async signDataRoomNda(
    requestId: string,
    signedName: string
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();

    // Update local cache
    const local = getLocalDrRequests();
    const updated = local.map((r) =>
      r.id === requestId
        ? {
            ...r,
            ndaSigned: true,
            ndaSignedName: signedName,
            updatedAt: now,
          }
        : r
    );
    saveLocalDrRequests(updated);

    if (isValidUUID(requestId)) {
      try {
        await (supabase as any)
          .from("data_room_requests")
          .update({
            nda_signed: true,
            nda_signed_name: signedName,
            updated_at: now,
          })
          .eq("id", requestId);
      } catch (err) {
        console.warn("[RequestService] Error signing NDA in DB:", err);
      }
    }

    return { success: true };
  },

  /**
   * Fetch all data room requests for a student founder across all their startup IDs
   */
  async getDataRoomRequestsForStudent(params: {
    startupIds: string[];
    founderId?: string | undefined;
    founderEmail?: string | undefined;
  }): Promise<DataRoomRequestRecord[]> {
    const { startupIds, founderId, founderEmail } = params;
    const cleanIds = startupIds.filter(Boolean);

    const local = getLocalDrRequests().filter((r) =>
      cleanIds.includes(r.startupId) || r.startupId === "s1"
    );

    try {
      const validUuids = cleanIds.filter(isValidUUID);
      let query = (supabase as any)
        .from("data_room_requests")
        .select("*, profiles:investor_id(name, email, org), startups:startup_id(name, university, founder_email, founder_id)")
        .order("created_at", { ascending: false });

      if (validUuids.length > 0) {
        query = query.in("startup_id", validUuids);
      } else if (founderId && isValidUUID(founderId)) {
        query = query.eq("startups.founder_id", founderId);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const dbRecords: DataRoomRequestRecord[] = data.map((d: any) => ({
          id: d.id,
          startupId: d.startup_id,
          investorId: d.investor_id,
          investorName: d.profiles?.name || "Investor",
          investorEmail: d.profiles?.email || "",
          investorOrg: d.profiles?.org || "Venture Fund",
          startupName: d.startups?.name || "Venture",
          status: d.status,
          ndaSigned: d.nda_signed || false,
          ndaSignedName: d.nda_signed_name || "",
          discussionTerms: d.discussion_terms || undefined,
          nextSteps: d.next_steps || undefined,
          declineReason: d.decline_reason || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const map = new Map<string, DataRoomRequestRecord>();
        dbRecords.forEach((r) => map.set(r.id, r));
        local.forEach((l) => {
          if (!map.has(l.id)) map.set(l.id, l);
        });

        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err) {
      console.warn("[RequestService] Error in getDataRoomRequestsForStudent:", err);
    }

    return local;
  },

  /**
   * Subscribe to real-time changes on data room requests across browsers/devices
   */
  subscribeToDataRoomRequests(onUpdate: () => void) {
    let pollingTimer: any = null;

    const channel = supabase
      .channel("public-dr-requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "data_room_requests" },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    pollingTimer = setInterval(() => {
      onUpdate();
    }, 4000);

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
      supabase.removeChannel(channel);
    };
  },

  // ============================================================================
  // CONNECTION REQUESTS
  // ============================================================================

  /**
   * Send connection request between users
   */
  async sendConnectionRequest(params: {
    senderId: string;
    senderName?: string | undefined;
    senderEmail?: string | undefined;
    senderRole?: string | undefined;
    senderOrg?: string | undefined;
    receiverId: string;
    receiverName?: string | undefined;
    startupId?: string | undefined;
    startupName?: string | undefined;
    message?: string | undefined;
  }): Promise<{ success: boolean; request?: ConnectionRequestRecord; error?: string }> {
    const {
      senderId,
      senderName,
      senderEmail,
      senderRole,
      senderOrg,
      receiverId,
      receiverName,
      startupId,
      startupName,
      message,
    } = params;

    if (senderId === receiverId) {
      return { success: false, error: "Cannot send a connection request to yourself." };
    }

    const safeId = generateUUID();
    const now = new Date().toISOString();

    const record: ConnectionRequestRecord = {
      id: safeId,
      senderId,
      senderName: senderName || "Member",
      senderEmail: senderEmail || "",
      senderRole: senderRole || "founder",
      senderOrg: senderOrg || "CampusVenture",
      receiverId,
      receiverName: receiverName || "Member",
      startupId,
      startupName,
      message: message || "I would like to connect on CampusVenture.",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    // Update local cache
    const local = getLocalConnRequests();
    const exists = local.find(
      (c) => c.senderId === senderId && c.receiverId === receiverId && c.startupId === startupId
    );
    if (!exists) {
      saveLocalConnRequests([record, ...local]);
    }

    // Persist to Supabase if valid UUIDs
    if (isValidUUID(senderId) && isValidUUID(receiverId)) {
      try {
        const { data, error } = await (supabase as any)
          .from("connection_requests")
          .upsert({
            id: safeId,
            sender_id: senderId,
            receiver_id: receiverId,
            startup_id: startupId && isValidUUID(startupId) ? startupId : null,
            message: record.message,
            status: "pending",
            created_at: now,
            updated_at: now,
          }, { onConflict: "sender_id,receiver_id,startup_id" })
          .select()
          .single();

        if (error) {
          console.warn("[RequestService] Notice inserting connection_requests to DB:", error.message);
        } else if (data) {
          record.id = data.id;
        }
      } catch (err) {
        console.warn("[RequestService] DB connection_requests exception:", err);
      }
    }

    return { success: true, request: record };
  },

  /**
   * Get all incoming connection requests for a user
   */
  async getIncomingConnectionRequests(userId: string): Promise<ConnectionRequestRecord[]> {
    const local = getLocalConnRequests().filter((c) => c.receiverId === userId);

    if (isValidUUID(userId)) {
      try {
        const { data, error } = await (supabase as any)
          .from("connection_requests")
          .select("*, sender:sender_id(name, email, role, org), startups:startup_id(name)")
          .eq("receiver_id", userId)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const dbRecords: ConnectionRequestRecord[] = data.map((d: any) => ({
            id: d.id,
            senderId: d.sender_id,
            senderName: d.sender?.name || "Member",
            senderEmail: d.sender?.email || "",
            senderRole: d.sender?.role || "founder",
            senderOrg: d.sender?.org || "",
            receiverId: d.receiver_id,
            startupId: d.startup_id,
            startupName: d.startups?.name || "",
            message: d.message,
            status: d.status,
            discussionTerms: d.discussion_terms || undefined,
            nextSteps: d.next_steps || undefined,
            declineReason: d.decline_reason || undefined,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));

          const merged = [...dbRecords];
          for (const l of local) {
            if (!merged.some((m) => m.id === l.id || (m.senderId === l.senderId && m.receiverId === l.receiverId))) {
              merged.push(l);
            }
          }
          return merged;
        }
      } catch (err) {
        console.warn("[RequestService] Error fetching incoming connection requests:", err);
      }
    }

    return local;
  },

  /**
   * Respond to connection request (accept/reject with terms & next steps)
   */
  async respondToConnectionRequest(
    requestId: string,
    status: "accepted" | "rejected",
    options?: {
      discussionTerms?: string | undefined;
      nextSteps?: string | undefined;
      declineReason?: string | undefined;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();

    const local = getLocalConnRequests();
    const updated = local.map((c) =>
      c.id === requestId
        ? {
            ...c,
            status,
            discussionTerms: options?.discussionTerms ?? c.discussionTerms,
            nextSteps: options?.nextSteps ?? c.nextSteps,
            declineReason: options?.declineReason ?? c.declineReason,
            updatedAt: now,
          }
        : c
    );
    saveLocalConnRequests(updated);

    if (isValidUUID(requestId)) {
      try {
        const payload: Record<string, any> = { status, updated_at: now };
        if (options?.discussionTerms !== undefined) payload["discussion_terms"] = options.discussionTerms;
        if (options?.nextSteps !== undefined) payload["next_steps"] = options.nextSteps;
        if (options?.declineReason !== undefined) payload["decline_reason"] = options.declineReason;

        const { error } = await (supabase as any)
          .from("connection_requests")
          .update(payload)
          .eq("id", requestId);

        if (error) {
          console.warn("[RequestService] DB update connection_requests notice:", error.message);
        }
      } catch (err) {
        console.warn("[RequestService] DB exception on respondToConnectionRequest:", err);
      }
    }

    return { success: true };
  },

  /**
   * Fetch all investor activity for a university's campus startups
   */
  async getUniversityInvestorActivity(campusStartupIds: string[]): Promise<{
    dataRoomRequests: DataRoomRequestRecord[];
    connectionRequests: ConnectionRequestRecord[];
  }> {
    const localDr = getLocalDrRequests().filter((r) => campusStartupIds.includes(r.startupId));
    const localConn = getLocalConnRequests().filter((c) => c.startupId && campusStartupIds.includes(c.startupId));

    const validIds = campusStartupIds.filter(isValidUUID);
    if (validIds.length > 0) {
      try {
        const { data: drData } = await (supabase as any)
          .from("data_room_requests")
          .select("*, profiles:investor_id(name, email, org), startups:startup_id(name)")
          .in("startup_id", validIds);

        const { data: connData } = await (supabase as any)
          .from("connection_requests")
          .select("*, sender:sender_id(name, email, role, org), startups:startup_id(name)")
          .in("startup_id", validIds);

        const mergedDr = Array.isArray(drData)
          ? drData.map((d: any) => ({
              id: d.id,
              startupId: d.startup_id,
              startupName: d.startups?.name || "Campus Startup",
              investorId: d.investor_id,
              investorName: d.profiles?.name || "Investor",
              investorEmail: d.profiles?.email || "",
              investorOrg: d.profiles?.org || "Venture Fund",
              status: d.status,
              ndaSigned: d.nda_signed || false,
              createdAt: d.created_at,
              updatedAt: d.updated_at,
            }))
          : localDr;

        const mergedConn = Array.isArray(connData)
          ? connData.map((d: any) => ({
              id: d.id,
              senderId: d.sender_id,
              senderName: d.sender?.name || "Investor",
              senderEmail: d.sender?.email || "",
              senderRole: d.sender?.role || "investor",
              senderOrg: d.sender?.org || "Fund",
              receiverId: d.receiver_id,
              startupId: d.startup_id,
              startupName: d.startups?.name || "Campus Startup",
              message: d.message,
              status: d.status,
              createdAt: d.created_at,
              updatedAt: d.updated_at,
            }))
          : localConn;

        return { dataRoomRequests: mergedDr, connectionRequests: mergedConn };
      } catch (err) {
        console.warn("[RequestService] DB exception on getUniversityInvestorActivity:", err);
      }
    }

    return { dataRoomRequests: localDr, connectionRequests: localConn };
  },
};
