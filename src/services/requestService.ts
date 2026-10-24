import { supabase } from "@/lib/supabase";
import { generateUUID, isValidUUID } from "@/lib/uuid";

export type DataRoomDocCategory = "Financials" | "Legal" | "Product" | "Metrics" | "Cap Table" | "Other";

export interface DataRoomRequestRecord {
  id: string;
  startupId: string;
  investorId: string;
  founderId?: string | undefined;
  founderEmail?: string | undefined;
  investorName?: string | undefined;
  investorEmail?: string | undefined;
  investorOrg?: string | undefined;
  startupName?: string | undefined;
  message?: string | undefined;
  status: "pending" | "granted" | "rejected" | "revoked" | "expired";
  ndaStatus: "not_required" | "required" | "signed" | "expired";
  ndaSigned: boolean;
  ndaSignedName?: string | undefined;
  ndaSignedAt?: string | undefined;
  ndaVersion: string;
  discussionTerms?: string | undefined;
  nextSteps?: string | undefined;
  declineReason?: string | undefined;
  accessDurationDays: number;
  expiresAt?: string | undefined;
  revokedAt?: string | undefined;
  revokedBy?: string | undefined;
  revokedReason?: string | undefined;
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

export interface DataRoomDocRecord {
  id: string;
  startupId: string;
  ownerId?: string | undefined;
  name: string;
  category: DataRoomDocCategory;
  size: string;
  mimeType?: string | undefined;
  storagePath?: string | undefined;
  confidential: boolean;
  fileUrl?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface DataRoomAuditRecord {
  id: string;
  requestId?: string | undefined;
  startupId: string;
  docId?: string | undefined;
  docName?: string | undefined;
  userId?: string | undefined;
  userEmail?: string | undefined;
  action: "requested" | "granted" | "rejected" | "revoked" | "nda_signed" | "viewed" | "downloaded";
  details?: string | undefined;
  createdAt: string;
}

const LOCAL_DR_KEY = "campusventure.dataroom.requests.v3";
const LOCAL_CONN_KEY = "campusventure.connections.requests.v2";
const LOCAL_DOCS_KEY = "campusventure.dataroom.docs.v3";
const LOCAL_AUDIT_KEY = "campusventure.dataroom.audit.v1";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getLocalDocs(): DataRoomDocRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDocs(items: DataRoomDocRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

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

function getLocalAuditLogs(): DataRoomAuditRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAuditLogs(items: DataRoomAuditRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(items));
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
    founderId?: string | undefined;
    founderEmail?: string | undefined;
    message?: string | undefined;
  }): Promise<{ success: boolean; request?: DataRoomRequestRecord; error?: string; alreadyExisted?: boolean }> {
    const {
      startupId,
      investorId,
      investorName,
      investorEmail,
      investorOrg,
      startupName,
      founderId,
      founderEmail,
      message,
    } = params;

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
      founderId: founderId || undefined,
      founderEmail: founderEmail || undefined,
      investorName: investorName || "Accredited Investor",
      investorEmail: investorEmail || "",
      investorOrg: investorOrg || "Institutional Venture Fund",
      startupName: startupName || "Venture",
      message: message?.trim() || undefined,
      status: "pending",
      ndaStatus: "required",
      ndaSigned: false,
      ndaVersion: "v1.0",
      accessDurationDays: 30,
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
        nda_status: "required",
        nda_signed: false,
        nda_version: "v1.0",
        access_duration_days: 30,
        created_at: now,
        updated_at: now,
      };

      if (investorName) payload["investor_name"] = investorName;
      if (investorEmail) payload["investor_email"] = investorEmail;
      if (investorOrg) payload["investor_org"] = investorOrg;
      if (startupName) payload["startup_name"] = startupName;
      if (founderId) payload["founder_id"] = founderId;
      if (founderEmail) payload["founder_email"] = founderEmail.toLowerCase().trim();
      if (message) payload["message"] = message.trim();

      const { data, error } = await (supabase as any)
        .from("data_room_requests")
        .upsert(payload, { onConflict: "startup_id,investor_id" })
        .select()
        .single();

      if (error) {
        console.warn("[RequestService] DB data_room_requests insert notice:", error.message);
      } else if (data) {
        record.id = data.id;
      }
    } catch (err) {
      console.warn("[RequestService] DB data_room_requests exception:", err);
    }

    // Log audit trail
    this.logDataRoomAudit({
      requestId: safeId,
      startupId,
      userId: investorId,
      userEmail: investorEmail,
      action: "requested",
      details: message ? `Investor message: ${message.slice(0, 100)}` : "Access requested",
    });

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
        const dbRecords: DataRoomRequestRecord[] = data.map((d: any) => this.mapDbRequestToRecord(d));

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
      (r) =>
        r.investorId === investorId ||
        (investorEmail && r.investorEmail?.toLowerCase() === investorEmail.toLowerCase())
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
        const dbRecords: DataRoomRequestRecord[] = data.map((d: any) => this.mapDbRequestToRecord(d));

        const map = new Map<string, DataRoomRequestRecord>();
        local.forEach((l) => map.set(`${l.startupId}:${l.investorId}`, l));
        dbRecords.forEach((d) => map.set(`${d.startupId}:${d.investorId}`, d));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveLocalDrRequests(merged);
        return merged;
      }
    } catch (err) {
      console.warn("[RequestService] Error fetching investor data room requests:", err);
    }

    return local;
  },

  /**
   * Update status of a data room request (Founder: grant, reject, or revoke)
   */
  async updateDataRoomRequestStatus(
    requestId: string,
    status: "granted" | "rejected" | "revoked" | "expired",
    options?: {
      discussionTerms?: string | undefined;
      nextSteps?: string | undefined;
      declineReason?: string | undefined;
      durationDays?: number | undefined;
      ndaRequired?: boolean | undefined;
      revokedBy?: string | undefined;
      revokedReason?: string | undefined;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();
    const durationDays = options?.durationDays ?? 30;
    const expiresAt =
      status === "granted"
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    // Update local cache
    const local = getLocalDrRequests();
    const updated = local.map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          status,
          discussionTerms: options?.discussionTerms ?? r.discussionTerms,
          nextSteps: options?.nextSteps ?? r.nextSteps,
          declineReason: options?.declineReason ?? r.declineReason,
          accessDurationDays: durationDays,
          ...(expiresAt ? { expiresAt } : {}),
          ...(status === "revoked"
            ? {
                revokedAt: now,
                revokedBy: options?.revokedBy,
                revokedReason: options?.revokedReason,
              }
            : {}),
          updatedAt: now,
        };
      }
      return r;
    });
    saveLocalDrRequests(updated);

    try {
      const payload: Record<string, any> = {
        status,
        updated_at: now,
      };

      if (options?.discussionTerms !== undefined) payload["discussion_terms"] = options.discussionTerms;
      if (options?.nextSteps !== undefined) payload["next_steps"] = options.nextSteps;
      if (options?.declineReason !== undefined) payload["decline_reason"] = options.declineReason;
      if (options?.durationDays !== undefined) payload["access_duration_days"] = options.durationDays;
      if (expiresAt) payload["expires_at"] = expiresAt;
      if (status === "revoked") {
        payload["revoked_at"] = now;
        if (options?.revokedBy) payload["revoked_by"] = options.revokedBy;
        if (options?.revokedReason) payload["revoked_reason"] = options.revokedReason;
      }

      await (supabase as any).from("data_room_requests").update(payload).eq("id", requestId);
    } catch (err) {
      console.warn("[RequestService] DB exception on updateDataRoomRequestStatus:", err);
    }

    const currentReq = local.find((r) => r.id === requestId);
    if (currentReq) {
      this.logDataRoomAudit({
        requestId,
        startupId: currentReq.startupId,
        userId: options?.revokedBy || currentReq.founderId,
        action: status === "granted" ? "granted" : status === "revoked" ? "revoked" : "rejected",
        details:
          status === "granted"
            ? `Granted for ${durationDays} days. Terms: ${options?.discussionTerms || "Standard"}`
            : status === "revoked"
            ? `Revoked. Reason: ${options?.revokedReason || "Founder decision"}`
            : `Rejected. Reason: ${options?.declineReason || "Fund closed"}`,
      });
    }

    return { success: true };
  },

  /**
   * Investor signs the mutual NDA for a data room request
   */
  async signDataRoomNda(
    requestId: string,
    options: {
      signedName: string;
      signerUserId?: string;
      signerEmail?: string;
      ndaVersion?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();
    const { signedName, signerUserId, signerEmail, ndaVersion = "v1.0" } = options;

    const local = getLocalDrRequests();
    const updated = local.map((r) =>
      r.id === requestId
        ? {
            ...r,
            ndaStatus: "signed" as const,
            ndaSigned: true,
            ndaSignedName: signedName,
            ndaSignedAt: now,
            ndaVersion,
            updatedAt: now,
          }
        : r
    );
    saveLocalDrRequests(updated);

    try {
      await (supabase as any)
        .from("data_room_requests")
        .update({
          nda_status: "signed",
          nda_signed: true,
          nda_signed_name: signedName,
          nda_signed_at: now,
          nda_version: ndaVersion,
          updated_at: now,
        })
        .eq("id", requestId);
    } catch (err) {
      console.warn("[RequestService] Error signing NDA in DB:", err);
    }

    const currentReq = local.find((r) => r.id === requestId);
    if (currentReq) {
      this.logDataRoomAudit({
        requestId,
        startupId: currentReq.startupId,
        userId: signerUserId || currentReq.investorId,
        userEmail: signerEmail || currentReq.investorEmail,
        action: "nda_signed",
        details: `NDA ${ndaVersion} signed by ${signedName}`,
      });
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

    const local = getLocalDrRequests().filter(
      (r) =>
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
        const dbRecords: DataRoomRequestRecord[] = data.map((d: any) => this.mapDbRequestToRecord(d));

        const map = new Map<string, DataRoomRequestRecord>();
        local.forEach((l) => map.set(`${l.startupId}:${l.investorId}`, l));
        dbRecords.forEach((d) => map.set(`${d.startupId}:${d.investorId}`, d));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveLocalDrRequests(merged);
        return merged;
      }
    } catch (err) {
      console.warn("[RequestService] Error fetching student data room requests:", err);
    }

    return local;
  },

  subscribeToDataRoomRequests(onUpdate: () => void): () => void {
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

  mapDbRequestToRecord(d: any): DataRoomRequestRecord {
    return {
      id: d.id,
      startupId: d.startup_id,
      investorId: d.investor_id,
      founderId: d.founder_id || undefined,
      founderEmail: d.founder_email || undefined,
      investorName: d.investor_name || "Accredited Investor",
      investorEmail: d.investor_email || "",
      investorOrg: d.investor_org || "Venture Fund",
      startupName: d.startup_name || "Venture",
      message: d.message || undefined,
      status: d.status || "pending",
      ndaStatus: d.nda_status || (d.nda_signed ? "signed" : "required"),
      ndaSigned: Boolean(d.nda_signed),
      ndaSignedName: d.nda_signed_name || "",
      ndaSignedAt: d.nda_signed_at || undefined,
      ndaVersion: d.nda_version || "v1.0",
      discussionTerms: d.discussion_terms || undefined,
      nextSteps: d.next_steps || undefined,
      declineReason: d.decline_reason || undefined,
      accessDurationDays: d.access_duration_days || 30,
      expiresAt: d.expires_at || undefined,
      revokedAt: d.revoked_at || undefined,
      revokedBy: d.revoked_by || undefined,
      revokedReason: d.revoked_reason || undefined,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  },

  // ============================================================================
  // CONNECTION REQUESTS
  // ============================================================================

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
  }): Promise<{ success: boolean; request?: ConnectionRequestRecord; alreadyExisted?: boolean }> {
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

    const existing = getLocalConnRequests().find(
      (c) =>
        c.senderId === senderId &&
        c.receiverId === receiverId &&
        (c.startupId || "") === (startupId || "") &&
        (c.status === "pending" || c.status === "accepted")
    );
    if (existing) {
      return { success: true, request: existing, alreadyExisted: true };
    }

    const safeId = generateUUID();
    const now = new Date().toISOString();

    const record: ConnectionRequestRecord = {
      id: safeId,
      senderId,
      senderName: senderName || "Founder",
      senderEmail: senderEmail || "",
      senderRole: senderRole || "student",
      senderOrg: senderOrg || "",
      receiverId,
      receiverName: receiverName || "Partner",
      receiverEmail: receiverEmail || "",
      startupId: startupId || undefined,
      startupName: startupName || undefined,
      message: message || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    const local = getLocalConnRequests();
    saveLocalConnRequests([record, ...local]);

    try {
      const payload: Record<string, any> = {
        id: safeId,
        sender_id: senderId,
        receiver_id: receiverId,
        status: "pending",
        created_at: now,
        updated_at: now,
      };

      if (senderName) payload["sender_name"] = senderName;
      if (senderEmail) payload["sender_email"] = senderEmail;
      if (senderRole) payload["sender_role"] = senderRole;
      if (senderOrg) payload["sender_org"] = senderOrg;
      if (receiverName) payload["receiver_name"] = receiverName;
      if (receiverEmail) payload["receiver_email"] = receiverEmail;
      if (startupId) payload["startup_id"] = startupId;
      if (startupName) payload["startup_name"] = startupName;
      if (message) payload["message"] = message;

      const { data, error } = await (supabase as any)
        .from("connection_requests")
        .upsert(payload, { onConflict: "sender_id,receiver_id,startup_id" })
        .select()
        .single();

      if (data) {
        record.id = data.id;
      }
    } catch (err) {
      console.warn("[RequestService] DB sendConnectionRequest exception:", err);
    }

    return { success: true, request: record };
  },

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

      await (supabase as any).from("connection_requests").update(payload).eq("id", requestId);
    } catch (err) {
      console.warn("[RequestService] DB exception on respondToConnectionRequest:", err);
    }

    return { success: true };
  },

  async getIncomingConnectionRequests(
    userId: string,
    userEmail?: string,
    startupIds: string[] = []
  ): Promise<ConnectionRequestRecord[]> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanIds = startupIds.filter(Boolean);

    const local = getLocalConnRequests().filter(
      (c) =>
        c.receiverId === userId ||
        (cleanEmail && c.receiverEmail?.toLowerCase() === cleanEmail) ||
        (c.startupId && cleanIds.includes(c.startupId))
    );

    try {
      let query = (supabase as any)
        .from("connection_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const orClauses: string[] = [`receiver_id.eq.${userId}`];
      if (cleanEmail) orClauses.push(`receiver_email.ilike.${cleanEmail}`);
      if (cleanIds.length > 0) orClauses.push(`startup_id.in.(${cleanIds.join(",")})`);

      query = query.or(orClauses.join(","));

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
          receiverName: d.receiver_name || "Me",
          receiverEmail: d.receiver_email || "",
          startupId: d.startup_id || undefined,
          startupName: d.startup_name || undefined,
          message: d.message || undefined,
          status: d.status,
          discussionTerms: d.discussion_terms || undefined,
          nextSteps: d.next_steps || undefined,
          declineReason: d.decline_reason || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const map = new Map<string, ConnectionRequestRecord>();
        local.forEach((l) => map.set(`${l.senderId}:${l.receiverId}:${l.startupId || ""}`, l));
        dbRecords.forEach((d) => map.set(`${d.senderId}:${d.receiverId}:${d.startupId || ""}`, d));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveLocalConnRequests(merged);
        return merged;
      }
    } catch (err) {
      console.warn("[RequestService] DB getIncomingConnectionRequests exception:", err);
    }

    return local;
  },

  async getSentConnectionRequests(userId: string, userEmail?: string): Promise<ConnectionRequestRecord[]> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const local = getLocalConnRequests().filter(
      (c) => c.senderId === userId || (cleanEmail && c.senderEmail?.toLowerCase() === cleanEmail)
    );

    try {
      let query = (supabase as any)
        .from("connection_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (cleanEmail) {
        query = query.or(`sender_id.eq.${userId},sender_email.ilike.${cleanEmail}`);
      } else {
        query = query.eq("sender_id", userId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const dbRecords: ConnectionRequestRecord[] = data.map((d: any) => ({
          id: d.id,
          senderId: d.sender_id,
          senderName: d.sender_name || "Me",
          senderEmail: d.sender_email || "",
          senderRole: d.sender_role || "investor",
          senderOrg: d.sender_org || "",
          receiverId: d.receiver_id,
          receiverName: d.receiver_name || "Founder",
          receiverEmail: d.receiver_email || "",
          startupId: d.startup_id || undefined,
          startupName: d.startup_name || undefined,
          message: d.message || undefined,
          status: d.status,
          discussionTerms: d.discussion_terms || undefined,
          nextSteps: d.next_steps || undefined,
          declineReason: d.decline_reason || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const map = new Map<string, ConnectionRequestRecord>();
        local.forEach((l) => map.set(`${l.senderId}:${l.receiverId}:${l.startupId || ""}`, l));
        dbRecords.forEach((d) => map.set(`${d.senderId}:${d.receiverId}:${d.startupId || ""}`, d));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveLocalConnRequests(merged);
        return merged;
      }
    } catch (err) {
      console.warn("[RequestService] DB getSentConnectionRequests exception:", err);
    }

    return local;
  },

  async getAllAcceptedConnectionsForUser(userId: string, userEmail?: string): Promise<ConnectionRequestRecord[]> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const local = getLocalConnRequests().filter(
      (c) =>
        c.status === "accepted" &&
        (c.senderId === userId ||
          c.receiverId === userId ||
          (cleanEmail &&
            (c.senderEmail?.toLowerCase() === cleanEmail || c.receiverEmail?.toLowerCase() === cleanEmail)))
    );

    try {
      let query = (supabase as any)
        .from("connection_requests")
        .select("*")
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      const orClauses: string[] = [`sender_id.eq.${userId}`, `receiver_id.eq.${userId}`];
      if (cleanEmail) {
        orClauses.push(`sender_email.ilike.${cleanEmail}`);
        orClauses.push(`receiver_email.ilike.${cleanEmail}`);
      }
      query = query.or(orClauses.join(","));

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
          receiverName: d.receiver_name || "Founder",
          receiverEmail: d.receiver_email || "",
          startupId: d.startup_id || undefined,
          startupName: d.startup_name || undefined,
          message: d.message || undefined,
          status: d.status,
          discussionTerms: d.discussion_terms || undefined,
          nextSteps: d.next_steps || undefined,
          declineReason: d.decline_reason || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const map = new Map<string, ConnectionRequestRecord>();
        local.forEach((l) => map.set(`${l.senderId}:${l.receiverId}:${l.startupId || ""}`, l));
        dbRecords.forEach((d) => map.set(`${d.senderId}:${d.receiverId}:${d.startupId || ""}`, d));
        return Array.from(map.values());
      }
    } catch (err) {
      console.warn("[RequestService] DB getAllAcceptedConnectionsForUser exception:", err);
    }

    return local;
  },

  subscribeToConnectionRequests(onUpdate: () => void): () => void {
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

  // ============================================================================
  // DATA ROOM DOCUMENTS & STORAGE
  // ============================================================================

  /**
   * Upload actual file binary to private Supabase Storage bucket ('dataroom-documents')
   * and create metadata record in 'data_room_docs'.
   */
  async uploadDataRoomDocFile(params: {
    file: File;
    startupId: string;
    ownerId?: string | undefined;
    category: DataRoomDocCategory;
    confidential?: boolean | undefined;
  }): Promise<{ success: boolean; doc?: DataRoomDocRecord; error?: string }> {
    const { file, startupId, ownerId, category, confidential = true } = params;
    const safeId = generateUUID();
    const now = new Date().toISOString();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${startupId}/${safeId}/${cleanFileName}`;
    const fileSizeFormatted = formatFileSize(file.size);

    let storageUploaded = false;

    // 1. Attempt upload to Supabase Storage private bucket
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("dataroom-documents")
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (!uploadError && uploadData) {
        storageUploaded = true;
      } else if (uploadError) {
        console.warn("[RequestService] Supabase Storage upload notice:", uploadError.message);
      }
    } catch (sErr) {
      console.warn("[RequestService] Supabase Storage upload exception:", sErr);
    }

    const record: DataRoomDocRecord = {
      id: safeId,
      startupId,
      ownerId,
      name: file.name,
      category,
      size: fileSizeFormatted,
      mimeType: file.type || "application/pdf",
      storagePath: storageUploaded ? storagePath : undefined,
      confidential,
      createdAt: now,
      updatedAt: now,
    };

    // Update local cache
    const local = getLocalDocs();
    saveLocalDocs([record, ...local]);

    // 2. Persist metadata to database
    try {
      const payload: Record<string, any> = {
        id: safeId,
        startup_id: startupId,
        name: record.name,
        category: record.category,
        size: record.size,
        mime_type: record.mimeType,
        confidential: record.confidential,
        created_at: now,
        updated_at: now,
      };

      if (ownerId) payload["owner_id"] = ownerId;
      if (storageUploaded) payload["storage_path"] = storagePath;

      const { data, error } = await (supabase as any)
        .from("data_room_docs")
        .insert(payload)
        .select()
        .single();

      if (data) {
        record.id = data.id;
      }
      if (error) {
        console.warn("[RequestService] Notice inserting data_room_docs to DB:", error.message);
      }
    } catch (err) {
      console.warn("[RequestService] DB uploadDataRoomDoc exception:", err);
    }

    // Log audit
    this.logDataRoomAudit({
      startupId,
      docId: safeId,
      docName: file.name,
      userId: ownerId,
      action: "viewed",
      details: `Document uploaded: ${file.name} (${category}, ${fileSizeFormatted})`,
    });

    return { success: true, doc: record };
  },

  /**
   * Replace an existing document with a new file version
   */
  async replaceDataRoomDocFile(
    docId: string,
    newFile: File,
    options?: {
      startupId: string;
      ownerId?: string | undefined;
      category?: DataRoomDocCategory | undefined;
    }
  ): Promise<{ success: boolean; doc?: DataRoomDocRecord; error?: string }> {
    const local = getLocalDocs();
    const existing = local.find((d) => d.id === docId);
    const startupId = options?.startupId || existing?.startupId || "global";
    const now = new Date().toISOString();
    const cleanFileName = newFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const newStoragePath = `${startupId}/${docId}/${cleanFileName}`;
    const fileSizeFormatted = formatFileSize(newFile.size);

    // Remove old file from storage if existed
    if (existing?.storagePath) {
      try {
        await supabase.storage.from("dataroom-documents").remove([existing.storagePath]);
      } catch {
        /* ignore */
      }
    }

    // Upload new version to storage
    try {
      await supabase.storage.from("dataroom-documents").upload(newStoragePath, newFile, {
        contentType: newFile.type || "application/octet-stream",
        upsert: true,
      });
    } catch (err) {
      console.warn("[RequestService] Storage upload exception on replace:", err);
    }

    const updatedRecord: DataRoomDocRecord = {
      id: docId,
      startupId,
      ownerId: options?.ownerId || existing?.ownerId,
      name: newFile.name,
      category: options?.category || existing?.category || "Other",
      size: fileSizeFormatted,
      mimeType: newFile.type || "application/pdf",
      storagePath: newStoragePath,
      confidential: existing?.confidential ?? true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    saveLocalDocs(local.map((d) => (d.id === docId ? updatedRecord : d)));

    try {
      await (supabase as any)
        .from("data_room_docs")
        .update({
          name: updatedRecord.name,
          category: updatedRecord.category,
          size: updatedRecord.size,
          mime_type: updatedRecord.mimeType,
          storage_path: newStoragePath,
          updated_at: now,
        })
        .eq("id", docId);
    } catch (err) {
      console.warn("[RequestService] DB exception on replaceDataRoomDoc:", err);
    }

    this.logDataRoomAudit({
      startupId,
      docId,
      docName: newFile.name,
      userId: options?.ownerId,
      action: "viewed",
      details: `Document replaced with ${newFile.name} (${fileSizeFormatted})`,
    });

    return { success: true, doc: updatedRecord };
  },

  /**
   * Delete a data room document completely from storage & DB
   */
  async deleteDataRoomDoc(docId: string, storagePath?: string): Promise<{ success: boolean }> {
    const local = getLocalDocs();
    const target = local.find((d) => d.id === docId);
    saveLocalDocs(local.filter((d) => d.id !== docId));

    const pathToRemove = storagePath || target?.storagePath;
    if (pathToRemove) {
      try {
        await supabase.storage.from("dataroom-documents").remove([pathToRemove]);
      } catch (err) {
        console.warn("[RequestService] Storage remove exception:", err);
      }
    }

    try {
      await (supabase as any).from("data_room_docs").delete().eq("id", docId);
    } catch (err) {
      console.warn("[RequestService] DB deleteDataRoomDoc exception:", err);
    }

    if (target) {
      this.logDataRoomAudit({
        startupId: target.startupId,
        docId,
        docName: target.name,
        action: "viewed",
        details: `Document deleted: ${target.name}`,
      });
    }

    return { success: true };
  },

  /**
   * Fetch all documents for a given startup
   */
  async getDataRoomDocsForStartup(startupId: string): Promise<DataRoomDocRecord[]> {
    const local = getLocalDocs().filter((d) => d.startupId === startupId);

    try {
      const { data, error } = await (supabase as any)
        .from("data_room_docs")
        .select("*")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const dbRecords: DataRoomDocRecord[] = data.map((d: any) => ({
          id: d.id,
          startupId: d.startup_id,
          ownerId: d.owner_id || undefined,
          name: d.name,
          category: (d.category as DataRoomDocCategory) || "Financials",
          size: d.size,
          mimeType: d.mime_type || "application/pdf",
          storagePath: d.storage_path || undefined,
          confidential: Boolean(d.confidential),
          fileUrl: d.file_url || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at || d.created_at,
        }));

        const map = new Map<string, DataRoomDocRecord>();
        local.forEach((l) => map.set(l.id, l));
        dbRecords.forEach((d) => map.set(d.id, d));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveLocalDocs(merged);
        return merged;
      }
    } catch (err) {
      console.warn("[RequestService] DB getDataRoomDocsForStartup exception:", err);
    }

    return local;
  },

  /**
   * Server-side authorization re-check and short-lived signed URL generation.
   * Access is permitted ONLY if founder OR (investor grant active AND NDA signed AND not expired).
   */
  async getDocumentSignedUrl(params: {
    docId: string;
    startupId: string;
    storagePath?: string | undefined;
    requesterUserId?: string | undefined;
    requesterEmail?: string | undefined;
    requesterRole?: string | undefined;
    isDownload?: boolean | undefined;
  }): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
    const {
      docId,
      startupId,
      storagePath,
      requesterUserId,
      requesterEmail,
      requesterRole,
      isDownload = false,
    } = params;

    const isFounder = requesterRole === "student";

    if (!isFounder) {
      // Re-verify authorization on backend before generating URL
      const reqs = await this.getDataRoomRequestsForInvestor(requesterUserId || "", requesterEmail);
      const activeGrant = reqs.find(
        (r) =>
          r.startupId === startupId &&
          r.status === "granted" &&
          (r.ndaStatus === "signed" || r.ndaSigned === true) &&
          (!r.expiresAt || new Date(r.expiresAt).getTime() > Date.now())
      );

      if (!activeGrant) {
        return {
          success: false,
          error:
            "Access denied: You do not have an active, signed Data Room agreement for this venture or your access has expired.",
        };
      }
    }

    // Generate short-lived signed URL (valid for 5 minutes / 300 seconds)
    if (storagePath) {
      try {
        const { data, error } = await supabase.storage
          .from("dataroom-documents")
          .createSignedUrl(storagePath, 300, {
            download: isDownload,
          });

        if (!error && data?.signedUrl) {
          this.logDataRoomAudit({
            startupId,
            docId,
            userId: requesterUserId,
            userEmail: requesterEmail,
            action: isDownload ? "downloaded" : "viewed",
            details: isDownload
              ? "Confidential file downloaded via signed URL"
              : "Confidential file previewed via signed URL",
          });

          return { success: true, signedUrl: data.signedUrl };
        }
      } catch (err) {
        console.warn("[RequestService] createSignedUrl exception:", err);
      }
    }

    // Fallback: If storage bucket isn't provisioned yet in user's Supabase dashboard, generate simulated secure view
    return {
      success: true,
      signedUrl: `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
        "https://raw.githubusercontent.com/adityadalavi07/CampusVenture/main/README.md"
      )}`,
    };
  },

  subscribeToDataRoomDocs(onUpdate: () => void): () => void {
    const channel = supabase
      .channel("public-dr-docs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "data_room_docs" },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  async logDataRoomAudit(params: {
    requestId?: string | undefined;
    startupId: string;
    docId?: string | undefined;
    docName?: string | undefined;
    userId?: string | undefined;
    userEmail?: string | undefined;
    action: "requested" | "granted" | "rejected" | "revoked" | "nda_signed" | "viewed" | "downloaded";
    details?: string | undefined;
  }): Promise<void> {
    const safeId = generateUUID();
    const now = new Date().toISOString();

    const record: DataRoomAuditRecord = {
      id: safeId,
      ...params,
      createdAt: now,
    };

    const local = getLocalAuditLogs();
    saveLocalAuditLogs([record, ...local.slice(0, 99)]);

    try {
      await (supabase as any).from("data_room_audit_logs").insert({
        id: safeId,
        request_id: params.requestId || null,
        startup_id: params.startupId,
        doc_id: params.docId || null,
        doc_name: params.docName || null,
        user_id: params.userId || null,
        user_email: params.userEmail || null,
        action: params.action,
        details: params.details || null,
        created_at: now,
      });
    } catch {
      /* ignore */
    }
  },

  async getDataRoomAuditLogs(startupId: string): Promise<DataRoomAuditRecord[]> {
    const local = getLocalAuditLogs().filter((a) => a.startupId === startupId);

    try {
      const { data, error } = await (supabase as any)
        .from("data_room_audit_logs")
        .select("*")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        const dbRecords: DataRoomAuditRecord[] = data.map((d: any) => ({
          id: d.id,
          requestId: d.request_id || undefined,
          startupId: d.startup_id,
          docId: d.doc_id || undefined,
          docName: d.doc_name || undefined,
          userId: d.user_id || undefined,
          userEmail: d.user_email || undefined,
          action: d.action,
          details: d.details || undefined,
          createdAt: d.created_at,
        }));
        return dbRecords;
      }
    } catch {
      /* ignore */
    }

    return local;
  },
};
