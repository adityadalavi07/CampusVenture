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
  founderEmail?: string | undefined;
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
  receiverEmail?: string | undefined;
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

const LOCAL_DR_KEY = "campusventure.dataroom.requests.v2";
const LOCAL_CONN_KEY = "campusventure.connections.requests.v2";

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
    founderEmail?: string | undefined;
  }): Promise<{ success: boolean; request?: DataRoomRequestRecord; error?: string; alreadyExisted?: boolean }> {
    const { startupId, investorId, investorName, investorEmail, investorOrg, startupName, founderEmail } = params;

    // Duplicate check: Prevent duplicate requests and repeated notifications if already pending or granted
    const existing = getLocalDrRequests().find(
      (r) =>
        r.startupId === startupId &&
        (r.investorId === investorId ||
          (investorEmail && r.investorEmail?.toLowerCase() === investorEmail.toLowerCase()))
    );
    if (existing && (existing.status === "pending" || existing.status === "granted")) {
      return { success: true, request: existing, alreadyExisted: true };
    }

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
      founderEmail: founderEmail || undefined,
      status: "pending",
      ndaSigned: false,
      createdAt: now,
      updatedAt: now,
    };

    // Update local cache
    const existingLocal = getLocalDrRequests();
    const filteredLocal = existingLocal.filter(
      (r) => !(r.startupId === startupId && r.investorId === investorId)
    );
    saveLocalDrRequests([record, ...filteredLocal]);

    // Persist to Supabase
    try {
      const payload: Record<string, any> = {
        id: safeId,
        startup_id: startupId,
        investor_id: investorId,
        status: "pending",
        nda_signed: false,
        created_at: now,
        updated_at: now,
      };

      if (investorName) payload["investor_name"] = investorName;
      if (investorEmail) payload["investor_email"] = investorEmail;
      if (investorOrg) payload["investor_org"] = investorOrg;
      if (startupName) payload["startup_name"] = startupName;
      if (founderEmail) payload["founder_email"] = founderEmail.toLowerCase().trim();

      const { data, error } = await (supabase as any)
        .from("data_room_requests")
        .upsert(payload, { onConflict: "startup_id,investor_id" })
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

    return { success: true, request: record };
  },

  /**
   * Fetch all data room requests for a given startup (for Student Founder view)
   */
  async getDataRoomRequestsForStartup(startupId: string): Promise<DataRoomRequestRecord[]> {
    const local = getLocalDrRequests().filter((r) => r.startupId === startupId);

    try {
      const { data, error } = await (supabase as any)
        .from("data_room_requests")
        .select("*")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const dbRecords: DataRoomRequestRecord[] = data.map((d: any) => ({
          id: d.id,
          startupId: d.startup_id,
          investorId: d.investor_id,
          investorName: d.investor_name || "Investor",
          investorEmail: d.investor_email || "",
          investorOrg: d.investor_org || "Venture Fund",
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
      console.warn("[RequestService] Error fetching data room requests for startup:", err);
    }

    return local;
  },

  /**
   * Fetch all data room requests made by an investor
   */
  async getDataRoomRequestsForInvestor(investorId: string, investorEmail?: string): Promise<DataRoomRequestRecord[]> {
    const local = getLocalDrRequests().filter(
      (r) => r.investorId === investorId || (investorEmail && r.investorEmail?.toLowerCase() === investorEmail.toLowerCase())
    );

    try {
      let query = (supabase as any)
        .from("data_room_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (investorEmail) {
        query = query.or(`investor_id.eq.${investorId},investor_email.ilike.${investorEmail.trim()}`);
      } else {
        query = query.eq("investor_id", investorId);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const dbRecords: DataRoomRequestRecord[] = data.map((d: any) => ({
          id: d.id,
          startupId: d.startup_id,
          investorId: d.investor_id,
          startupName: d.startup_name || "Startup",
          investorName: d.investor_name || "Investor",
          investorEmail: d.investor_email || "",
          investorOrg: d.investor_org || "Fund",
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
        local.forEach((l) => map.set(l.id, l));
        dbRecords.forEach((d) => map.set(d.id, d));
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err) {
      console.warn("[RequestService] Error fetching investor data room requests:", err);
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

    return { success: true };
  },

  /**
   * Fetch all data room requests for a student founder across all their startup IDs and email
   */
  async getDataRoomRequestsForStudent(params: {
    startupIds: string[];
    founderId?: string | undefined;
    founderEmail?: string | undefined;
  }): Promise<DataRoomRequestRecord[]> {
    const { startupIds, founderEmail } = params;
    const cleanIds = startupIds.filter(Boolean);
    const cleanEmail = founderEmail?.toLowerCase().trim();

    const local = getLocalDrRequests().filter((r) =>
      cleanIds.includes(r.startupId) ||
      r.startupId === "s1" ||
      (cleanEmail && r.founderEmail?.toLowerCase() === cleanEmail)
    );

    try {
      let query = (supabase as any)
        .from("data_room_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (cleanIds.length > 0 && cleanEmail) {
        query = query.or(`startup_id.in.(${cleanIds.join(",")}),founder_email.ilike.${cleanEmail}`);
      } else if (cleanIds.length > 0) {
        query = query.in("startup_id", cleanIds);
      } else if (cleanEmail) {
        query = query.ilike("founder_email", cleanEmail);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const dbRecords: DataRoomRequestRecord[] = data.map((d: any) => ({
          id: d.id,
          startupId: d.startup_id,
          investorId: d.investor_id,
          investorName: d.investor_name || "Accredited Investor",
          investorEmail: d.investor_email || "",
          investorOrg: d.investor_org || "Venture Fund",
          startupName: d.startup_name || "Venture",
          founderEmail: d.founder_email || undefined,
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
        local.forEach((l) => map.set(l.id, l));
        dbRecords.forEach((r) => map.set(r.id, r));

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
    receiverEmail?: string | undefined;
    startupId?: string | undefined;
    startupName?: string | undefined;
    message?: string | undefined;
  }): Promise<{ success: boolean; request?: ConnectionRequestRecord; error?: string; alreadyExisted?: boolean }> {
    const {
      senderId,
      senderName,
      senderEmail,
      senderRole,
      senderOrg,
      receiverId,
      receiverName,
      receiverEmail,
      startupId,
      startupName,
      message,
    } = params;

    if (senderId === receiverId) {
      return { success: false, error: "Cannot send a connection request to yourself." };
    }

    // Duplicate check: Prevent duplicate requests if already pending or accepted
    const existing = getLocalConnRequests().find(
      (c) =>
        (startupId ? c.startupId === startupId : true) &&
        (c.senderId === senderId || (senderEmail && c.senderEmail?.toLowerCase() === senderEmail.toLowerCase())) &&
        (c.receiverId === receiverId || (receiverEmail && c.receiverEmail?.toLowerCase() === receiverEmail.toLowerCase()))
    );
    if (existing && (existing.status === "pending" || existing.status === "accepted")) {
      return { success: true, request: existing, alreadyExisted: true };
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
      receiverEmail: receiverEmail || "",
      startupId,
      startupName,
      message: message || "I would like to connect on CampusVenture.",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    // Update local cache
    const local = getLocalConnRequests();
    const filteredLocal = local.filter(
      (c) => !(c.senderId === senderId && c.receiverId === receiverId && c.startupId === startupId)
    );
    saveLocalConnRequests([record, ...filteredLocal]);

    // Persist to Supabase
    try {
      const payload: Record<string, any> = {
        id: safeId,
        sender_id: senderId,
        receiver_id: receiverId,
        message: record.message,
        status: "pending",
        created_at: now,
        updated_at: now,
      };

      if (senderName) payload["sender_name"] = senderName;
      if (senderEmail) payload["sender_email"] = senderEmail.toLowerCase().trim();
      if (senderRole) payload["sender_role"] = senderRole;
      if (senderOrg) payload["sender_org"] = senderOrg;
      if (receiverName) payload["receiver_name"] = receiverName;
      if (receiverEmail) payload["receiver_email"] = receiverEmail.toLowerCase().trim();
      if (startupId) payload["startup_id"] = startupId;
      if (startupName) payload["startup_name"] = startupName;

      const { data, error } = await (supabase as any)
        .from("connection_requests")
        .upsert(payload, { onConflict: "sender_id,receiver_id,startup_id" })
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

    return { success: true, request: record };
  },

  /**
   * Get all incoming connection requests for a user (by userId, email, or startupIds)
   */
  async getIncomingConnectionRequests(
    userId: string,
    userEmail?: string,
    startupIds?: string[]
  ): Promise<ConnectionRequestRecord[]> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const local = getLocalConnRequests().filter(
      (c) =>
        c.receiverId === userId ||
        (cleanEmail && c.receiverEmail?.toLowerCase() === cleanEmail) ||
        (startupIds && c.startupId && startupIds.includes(c.startupId))
    );

    try {
      let query = (supabase as any)
        .from("connection_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const orClauses: string[] = [];
      if (userId) orClauses.push(`receiver_id.eq.${userId}`);
      if (cleanEmail) orClauses.push(`receiver_email.ilike.${cleanEmail}`);
      if (startupIds && startupIds.length > 0) {
        orClauses.push(`startup_id.in.(${startupIds.join(",")})`);
      }

      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const dbRecords: ConnectionRequestRecord[] = data.map((d: any) => ({
          id: d.id,
          senderId: d.sender_id,
          senderName: d.sender_name || "Member",
          senderEmail: d.sender_email || "",
          senderRole: d.sender_role || "investor",
          senderOrg: d.sender_org || "",
          receiverId: d.receiver_id,
          receiverName: d.receiver_name || "Member",
          receiverEmail: d.receiver_email || "",
          startupId: d.startup_id,
          startupName: d.startup_name || "",
          message: d.message,
          status: d.status,
          discussionTerms: d.discussion_terms || undefined,
          nextSteps: d.next_steps || undefined,
          declineReason: d.decline_reason || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const map = new Map<string, ConnectionRequestRecord>();
        local.forEach((l) => map.set(l.id, l));
        dbRecords.forEach((d) => map.set(d.id, d));

        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err) {
      console.warn("[RequestService] Error fetching incoming connection requests:", err);
    }

    return local;
  },

  /**
   * Get all sent connection requests for a user (by senderId or senderEmail)
   */
  async getSentConnectionRequests(
    senderId: string,
    senderEmail?: string
  ): Promise<ConnectionRequestRecord[]> {
    const cleanEmail = senderEmail?.toLowerCase().trim();
    const local = getLocalConnRequests().filter(
      (c) =>
        c.senderId === senderId ||
        (cleanEmail && c.senderEmail?.toLowerCase() === cleanEmail)
    );

    try {
      let query = (supabase as any)
        .from("connection_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (senderId && cleanEmail) {
        query = query.or(`sender_id.eq.${senderId},sender_email.ilike.${cleanEmail}`);
      } else if (senderId) {
        query = query.eq("sender_id", senderId);
      } else if (cleanEmail) {
        query = query.ilike("sender_email", cleanEmail);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const dbRecords: ConnectionRequestRecord[] = data.map((d: any) => ({
          id: d.id,
          senderId: d.sender_id,
          senderName: d.sender_name || "Member",
          senderEmail: d.sender_email || "",
          senderRole: d.sender_role || "investor",
          senderOrg: d.sender_org || "",
          receiverId: d.receiver_id,
          receiverName: d.receiver_name || "Member",
          receiverEmail: d.receiver_email || "",
          startupId: d.startup_id,
          startupName: d.startup_name || "",
          message: d.message,
          status: d.status,
          discussionTerms: d.discussion_terms || undefined,
          nextSteps: d.next_steps || undefined,
          declineReason: d.decline_reason || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const map = new Map<string, ConnectionRequestRecord>();
        local.forEach((l) => map.set(l.id, l));
        dbRecords.forEach((d) => map.set(d.id, d));
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err) {
      console.warn("[RequestService] Error fetching sent connection requests:", err);
    }

    return local;
  },

  /**
   * Get specific connection request between an investor/sender and a startup
   */
  async getConnectionRequestBetween(
    senderId: string,
    startupId: string,
    senderEmail?: string
  ): Promise<ConnectionRequestRecord | null> {
    const sent = await requestService.getSentConnectionRequests(senderId, senderEmail);
    return sent.find((c) => c.startupId === startupId) || null;
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

    return { success: true };
  },

  /**
   * Subscribe to real-time incoming connection requests
   */
  subscribeToConnectionRequests(onUpdate: () => void) {
    let pollingTimer: any = null;

    const channel = supabase
      .channel("public-conn-requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connection_requests" },
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

  /**
   * Fetch all investor activity for a university's campus startups
   */
  async getUniversityInvestorActivity(campusStartupIds: string[]): Promise<{
    dataRoomRequests: DataRoomRequestRecord[];
    connectionRequests: ConnectionRequestRecord[];
  }> {
    const localDr = getLocalDrRequests().filter((r) => campusStartupIds.includes(r.startupId));
    const localConn = getLocalConnRequests().filter((c) => c.startupId && campusStartupIds.includes(c.startupId));

    try {
      const { data: drData } = await (supabase as any)
        .from("data_room_requests")
        .select("*")
        .in("startup_id", campusStartupIds);

      const { data: connData } = await (supabase as any)
        .from("connection_requests")
        .select("*")
        .in("startup_id", campusStartupIds);

      const mergedDr = Array.isArray(drData)
        ? drData.map((d: any) => ({
            id: d.id,
            startupId: d.startup_id,
            startupName: d.startup_name || "Campus Startup",
            investorId: d.investor_id,
            investorName: d.investor_name || "Investor",
            investorEmail: d.investor_email || "",
            investorOrg: d.investor_org || "Venture Fund",
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
            senderName: d.sender_name || "Investor",
            senderEmail: d.sender_email || "",
            senderRole: d.sender_role || "investor",
            senderOrg: d.sender_org || "Fund",
            receiverId: d.receiver_id,
            startupId: d.startup_id,
            startupName: d.startup_name || "Campus Startup",
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

    return { dataRoomRequests: localDr, connectionRequests: localConn };
  },
};
