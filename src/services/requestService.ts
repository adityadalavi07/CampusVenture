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
  rulesAccepted?: boolean | undefined;
  rulesVersion?: string | undefined;
  rulesAcceptedAt?: string | undefined;
  rulesProof?: {
    investorName?: string;
    investorEmail?: string;
    investorOrg?: string;
    founderName?: string;
    founderEmail?: string;
    startupName?: string;
    universityName?: string;
    rulesVersion?: string;
    declaration?: string;
    timestamp?: string;
    accessScope?: string[];
    [key: string]: any;
  } | undefined;
  universityName?: string | undefined;
  permittedDocIds?: string[] | undefined;
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

// Global multiplexed Realtime channel and listeners for immediate sync across all clients
const drUpdateListeners = new Set<(detail?: any) => void>();
let globalDrChannel: any = null;

function ensureGlobalDrSubscription() {
  if (typeof window === "undefined") return;
  if (!globalDrChannel) {
    globalDrChannel = supabase
      .channel("cv-dataroom-realtime-broadcast")
      .on("broadcast", { event: "dataroom_state_changed" }, (payload: any) => {
        const detail = payload?.payload;
        drUpdateListeners.forEach((cb) => {
          try {
            cb(detail);
          } catch (e) {
            console.warn(e);
          }
        });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "data_room_requests" },
        (payload: any) => {
          drUpdateListeners.forEach((cb) => {
            try {
              cb(payload);
            } catch (e) {
              console.warn(e);
            }
          });
        }
      )
      .subscribe();
  }
}

const connUpdateListeners = new Set<(detail?: any) => void>();
let globalConnChannel: any = null;

function ensureGlobalConnSubscription() {
  if (typeof window === "undefined") return;
  if (!globalConnChannel) {
    globalConnChannel = supabase
      .channel("cv-conn-realtime-broadcast")
      .on("broadcast", { event: "conn_state_changed" }, (payload: any) => {
        const detail = payload?.payload;
        connUpdateListeners.forEach((cb) => {
          try {
            cb(detail);
          } catch (e) {
            console.warn(e);
          }
        });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connection_requests" },
        (payload: any) => {
          connUpdateListeners.forEach((cb) => {
            try {
              cb(payload);
            } catch (e) {
              console.warn(e);
            }
          });
        }
      )
      .subscribe();
  }
}

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
  // REAL-TIME BROADCAST DISPATCHERS
  // ============================================================================

  /**
   * Instant multi-channel broadcast to all clients, browser tabs, and devices.
   * Dispatches via 4 parallel channels:
   * 1. In-process direct callbacks
   * 2. Window CustomEvent (DOM sync for active page)
   * 3. Browser BroadcastChannel API (0ms instant cross-tab sync)
   * 4. Supabase Realtime WebSocket broadcast (cross-browser / cross-device global sync)
   */
  async broadcastDataRoomChange(detail?: any): Promise<void> {
    drUpdateListeners.forEach((cb) => {
      try {
        cb(detail);
      } catch (e) {
        console.warn(e);
      }
    });

    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("cv:dataroom-state-changed", { detail }));
      } catch {
        /* ignore */
      }
    }

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("cv-realtime-sync");
        bc.postMessage({ type: "dataroom_changed", detail, timestamp: Date.now() });
        bc.close();
      } catch {
        /* ignore */
      }
    }

    try {
      ensureGlobalDrSubscription();
      if (globalDrChannel) {
        await globalDrChannel.send({
          type: "broadcast",
          event: "dataroom_state_changed",
          payload: detail || { timestamp: Date.now() },
        });
      }
    } catch (e) {
      console.warn("[RequestService] Realtime broadcast send notice:", e);
    }
  },

  async broadcastConnectionChange(detail?: any): Promise<void> {
    connUpdateListeners.forEach((cb) => {
      try {
        cb(detail);
      } catch (e) {
        console.warn(e);
      }
    });

    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("cv:conn-state-changed", { detail }));
      } catch {
        /* ignore */
      }
    }

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("cv-realtime-sync");
        bc.postMessage({ type: "conn_changed", detail, timestamp: Date.now() });
        bc.close();
      } catch {
        /* ignore */
      }
    }

    try {
      ensureGlobalConnSubscription();
      if (globalConnChannel) {
        await globalConnChannel.send({
          type: "broadcast",
          event: "conn_state_changed",
          payload: detail || { timestamp: Date.now() },
        });
      }
    } catch (e) {
      console.warn("[RequestService] Realtime conn broadcast send notice:", e);
    }
  },

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
      const metaPayload: Record<string, any> = {
        message: message?.trim() || undefined,
        founderId: founderId || undefined,
        durationDays: 30,
      };

      const payload: Record<string, any> = {
        id: safeId,
        startup_id: startupId,
        investor_id: investorId,
        status: "pending",
        nda_signed: false,
        nda_signed_name: "",
        discussion_terms: "30-Day Confidential Diligence under Mutual NDA",
        next_steps: JSON.stringify(metaPayload),
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
        .upsert(payload)
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

    this.broadcastDataRoomChange({
      action: "requested",
      requestId: safeId,
      startupId,
      investorId,
      investorEmail,
      startupName,
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
    const cleanId = investorId?.trim();
    const cleanEmail = investorEmail?.toLowerCase().trim();

    if (!cleanId && !cleanEmail) {
      return [];
    }

    const local = getLocalDrRequests().filter(
      (r) =>
        (cleanId && r.investorId === cleanId) ||
        (cleanEmail && r.investorEmail?.toLowerCase() === cleanEmail)
    );

    try {
      let query = (supabase as any)
        .from("data_room_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (cleanId && cleanEmail) {
        query = query.or(`investor_id.eq.${cleanId},investor_email.ilike.${cleanEmail}`);
      } else if (cleanEmail) {
        query = query.ilike("investor_email", cleanEmail);
      } else if (cleanId) {
        query = query.eq("investor_id", cleanId);
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
      permittedDocIds?: string[] | undefined;
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
          ...(options?.permittedDocIds ? { permittedDocIds: options.permittedDocIds } : {}),
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
      const current = local.find((r) => r.id === requestId);
      let existingMeta: Record<string, any> = {};
      if (current?.nextSteps && current.nextSteps.startsWith("{")) {
        try {
          existingMeta = JSON.parse(current.nextSteps);
        } catch {
          /* ignore */
        }
      }

      const metaPayload = {
        ...existingMeta,
        founderId: current?.founderId,
        message: current?.message,
        durationDays,
        ...(options?.permittedDocIds ? { permittedDocIds: options.permittedDocIds } : {}),
        ...(expiresAt ? { expiresAt } : {}),
        ...(options?.declineReason ? { declineReason: options.declineReason } : {}),
      };

      const payload: Record<string, any> = {
        status,
        discussion_terms: options?.discussionTerms || current?.discussionTerms || "Standard Diligence Terms",
        next_steps: JSON.stringify(metaPayload),
        updated_at: now,
      };

      if (options?.declineReason !== undefined) {
        payload["decline_reason"] = options.declineReason;
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

    this.broadcastDataRoomChange({
      action: status,
      requestId,
      startupId: currentReq?.startupId,
      investorId: currentReq?.investorId,
      status,
      durationDays,
    });

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
      const current = local.find((r) => r.id === requestId);
      let existingMeta: Record<string, any> = {};
      if (current?.nextSteps && current.nextSteps.startsWith("{")) {
        try {
          existingMeta = JSON.parse(current.nextSteps);
        } catch {
          /* ignore */
        }
      }

      const metaPayload = {
        ...existingMeta,
        ndaSigned: true,
        ndaSignedName: signedName,
        ndaSignedAt: now,
        ndaVersion,
        rulesAccepted: true,
      };

      await (supabase as any)
        .from("data_room_requests")
        .update({
          nda_signed: true,
          nda_signed_name: signedName,
          next_steps: JSON.stringify(metaPayload),
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

    this.broadcastDataRoomChange({
      action: "nda_signed",
      requestId,
      startupId: currentReq?.startupId,
      signedName,
      ndaVersion,
    });

    return { success: true };
  },

  /**
   * Founder updates granular document access permissions for an approved investor.
   */
  async updatePermittedDocs(
    requestId: string,
    docIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();
    const local = getLocalDrRequests();
    const updated = local.map((r) =>
      r.id === requestId
        ? {
            ...r,
            permittedDocIds: docIds,
            updatedAt: now,
          }
        : r
    );
    saveLocalDrRequests(updated);

    try {
      const current = local.find((r) => r.id === requestId);
      let existingMeta: Record<string, any> = {};
      if (current?.nextSteps && current.nextSteps.startsWith("{")) {
        try {
          existingMeta = JSON.parse(current.nextSteps);
        } catch {
          /* ignore */
        }
      }

      const metaPayload = {
        ...existingMeta,
        permittedDocIds: docIds,
      };

      await (supabase as any)
        .from("data_room_requests")
        .update({
          next_steps: JSON.stringify(metaPayload),
          updated_at: now,
        })
        .eq("id", requestId);
    } catch (err) {
      console.warn("[RequestService] DB updatePermittedDocs exception:", err);
    }

    const currentReq = local.find((r) => r.id === requestId);
    if (currentReq) {
      this.logDataRoomAudit({
        requestId,
        startupId: currentReq.startupId,
        userId: currentReq.founderId,
        action: "granted",
        details: `Permitted document scope updated: ${docIds.length} document(s) authorized for investor ${currentReq.investorName || currentReq.investorEmail}.`,
      });
    }

    this.broadcastDataRoomChange({
      action: "permitted_docs_updated",
      requestId,
      startupId: currentReq?.startupId,
      docIds,
    });

    return { success: true };
  },

  /**
   * Record legal acceptance of the platform's Rules and Regulations by an authenticated investor.
   * Persistently records investor details, timestamp, version, university context, and signed proof of trust.
   */
  async recordRulesAcceptance(params: {
    requestId: string;
    startupId: string;
    investorUserId?: string | undefined;
    investorId?: string | undefined;
    investorName: string;
    investorEmail: string;
    investorOrg?: string | undefined;
    founderUserId?: string | undefined;
    founderId?: string | undefined;
    founderName?: string | undefined;
    founderEmail?: string | undefined;
    startupName?: string | undefined;
    universityId?: string | undefined;
    universityName?: string | undefined;
    rulesVersion?: string | undefined;
    accessScope?: string[] | undefined;
    legalStatement?: string | undefined;
  }): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();
    const effectiveInvestorId = params.investorUserId || params.investorId || "";
    const effectiveStartupName = params.startupName || "Student Startup Venture";
    const effectiveInvestorOrg = params.investorOrg || "Accredited Investment Partner";
    const rulesVersion = params.rulesVersion || "v1.0-cv-reg";
    const declaration =
      params.legalStatement ||
      `I confirm that I am investor ${params.investorName} (${params.investorEmail}), in my full presence and legal authority. I am okay with all platform rules and regulations (${rulesVersion}) and the consequences of rule breaks. I agree and submit this form as permanent proof of verification and security for ${effectiveStartupName} and founder (${params.founderEmail || "Student Founder"}).`;

    const rulesProof = {
      investorName: params.investorName,
      investorEmail: params.investorEmail,
      investorOrg: effectiveInvestorOrg,
      founderName: params.founderName || "Student Founder",
      founderEmail: params.founderEmail || "",
      startupName: effectiveStartupName,
      universityName: params.universityName || "Campus Partner University",
      rulesVersion,
      declaration,
      timestamp: now,
      accessScope: params.accessScope || [],
    };

    const local = getLocalDrRequests();
    const updated = local.map((r) =>
      r.id === params.requestId ||
      (r.startupId === params.startupId &&
        (r.investorId === effectiveInvestorId || (r.investorEmail && r.investorEmail.toLowerCase() === params.investorEmail.toLowerCase())))
        ? {
            ...r,
            ndaStatus: "signed" as const,
            ndaSigned: true,
            ndaSignedName: params.investorName,
            ndaSignedAt: now,
            ndaVersion: rulesVersion,
            rulesAccepted: true,
            rulesVersion,
            rulesAcceptedAt: now,
            rulesProof,
            universityName: params.universityName || r.universityName,
            updatedAt: now,
          }
        : r
    );
    saveLocalDrRequests(updated);

    try {
      const current = local.find((r) => r.id === params.requestId);
      let existingMeta: Record<string, any> = {};
      if (current?.nextSteps && current.nextSteps.startsWith("{")) {
        try {
          existingMeta = JSON.parse(current.nextSteps);
        } catch {
          /* ignore */
        }
      }

      const metaPayload = {
        ...existingMeta,
        rulesAccepted: true,
        rulesVersion,
        rulesAcceptedAt: now,
        ndaSignedName: params.investorName,
        ndaSignedAt: now,
        universityName: params.universityName || current?.universityName,
        accessScope: params.accessScope || [],
        rulesProof,
      };

      const payload: Record<string, any> = {
        nda_signed: true,
        nda_signed_name: params.investorName,
        next_steps: JSON.stringify(metaPayload),
        updated_at: now,
      };

      await (supabase as any)
        .from("data_room_requests")
        .update(payload)
        .eq("id", params.requestId);
    } catch (err) {
      console.warn("[RequestService] DB recordRulesAcceptance notice:", err);
    }

    // Persistently log in verifiable audit trail
    await this.logDataRoomAudit({
      requestId: params.requestId,
      startupId: params.startupId,
      userId: effectiveInvestorId,
      userEmail: params.investorEmail,
      action: "nda_signed",
      details: `Platform Rules & Regulations (${rulesVersion}) signed as Proof of Trust by ${params.investorName} (${params.investorEmail}) for ${effectiveStartupName} (${params.universityName || "University Partner"}). Scope: ${(params.accessScope || []).length > 0 ? (params.accessScope || []).join(", ") : "All founder-approved materials"}. Stored in university database.`,
    });

    await this.broadcastDataRoomChange({
      action: "rules_accepted",
      requestId: params.requestId,
      startupId: params.startupId,
      investorName: params.investorName,
      investorEmail: params.investorEmail,
      universityName: params.universityName,
      rulesVersion,
    });

    return { success: true };
  },

  /**
   * Fetch aggregated investor activity and audit trail strictly for startups belonging to this campus.
   * Universities W, Y and Z cannot see University X's requests or records.
   */
  async getUniversityInvestorActivity(
    arg:
      | string[]
      | {
          campusStartupIds?: string[];
          universityName?: string;
          universityEmail?: string;
          universityOrg?: string;
        }
  ): Promise<{
    dataRoomRequests: DataRoomRequestRecord[];
    connectionRequests: ConnectionRequestRecord[];
    auditLogs: DataRoomAuditRecord[];
    discoveredStartupIds: string[];
  }> {
    let cleanIds: string[] = Array.isArray(arg) ? arg.filter(Boolean) : (arg.campusStartupIds || []).filter(Boolean);
    const univName = (!Array.isArray(arg) ? (arg.universityName || arg.universityOrg || "") : "").trim();
    const univEmail = (!Array.isArray(arg) ? (arg.universityEmail || "") : "").trim();
    const domain = univEmail.includes("@") && !univEmail.endsWith("@gmail.com") && !univEmail.endsWith("@yahoo.com")
      ? univEmail.split("@")[1].toLowerCase().trim()
      : "";

    // 1. Discover all campus student profiles by university affiliation or email domain
    let campusStudentEmails: string[] = [];
    if (univName || domain) {
      try {
        const { data: dbProfiles } = await (supabase as any)
          .from("profiles")
          .select("id, email, org")
          .eq("role", "student");
        if (Array.isArray(dbProfiles)) {
          campusStudentEmails = dbProfiles
            .filter((p: any) => {
              const pOrg = (p.org || "").toLowerCase();
              const pEmail = (p.email || "").toLowerCase();
              if (domain && pEmail.endsWith(domain)) return true;
              if (univName && (pOrg.includes(univName.toLowerCase()) || univName.toLowerCase().includes(pOrg))) return true;
              return false;
            })
            .map((p: any) => p.email.toLowerCase().trim())
            .filter(Boolean);
        }
      } catch (err) {
        console.warn("[RequestService] Error discovering campus student profiles:", err);
      }
    }

    // 2. Always dynamically query all campus startups from Supabase matching university name or domain
    if (univName || domain) {
      try {
        const { data: dbStartups } = await (supabase as any)
          .from("startups")
          .select("id, name, university, founder_email");
        if (Array.isArray(dbStartups)) {
          const matched = dbStartups.filter((s: any) => {
            const sUniv = (s.university || "").toLowerCase();
            const sEmail = (s.founder_email || "").toLowerCase();
            if (domain && sEmail.endsWith(domain)) return true;
            if (univName && (sUniv.includes(univName.toLowerCase()) || univName.toLowerCase().includes(sUniv))) return true;
            if (campusStudentEmails.includes(sEmail)) return true;
            return false;
          });
          const dynamicIds = matched.map((s: any) => String(s.id));
          cleanIds = Array.from(new Set([...cleanIds, ...dynamicIds]));
        }
      } catch (err) {
        console.warn("[RequestService] Error discovering campus startups:", err);
      }
    }

    if (cleanIds.length === 0 && !domain && campusStudentEmails.length === 0) {
      return { dataRoomRequests: [], connectionRequests: [], auditLogs: [], discoveredStartupIds: [] };
    }

    const localDr = getLocalDrRequests().filter(
      (r) =>
        (cleanIds.length > 0 && cleanIds.includes(r.startupId)) ||
        (domain && r.founderEmail?.toLowerCase().endsWith(domain)) ||
        (r.founderEmail && campusStudentEmails.includes(r.founderEmail.toLowerCase().trim()))
    );
    const localConn = getLocalConnRequests().filter(
      (c) =>
        (cleanIds.length > 0 && c.startupId && cleanIds.includes(c.startupId)) ||
        (domain && (c.receiverEmail?.toLowerCase().endsWith(domain) || c.senderEmail?.toLowerCase().endsWith(domain))) ||
        (c.receiverEmail && campusStudentEmails.includes(c.receiverEmail.toLowerCase().trim())) ||
        (c.senderEmail && campusStudentEmails.includes(c.senderEmail.toLowerCase().trim()))
    );
    const localAudit = getLocalAuditLogs().filter(
      (a) =>
        (cleanIds.length > 0 && cleanIds.includes(a.startupId)) ||
        (domain && a.userEmail?.toLowerCase().endsWith(domain)) ||
        (a.userEmail && campusStudentEmails.includes(a.userEmail.toLowerCase().trim()))
    );

    try {
      let drQuery = (supabase as any)
        .from("data_room_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const drOrClauses: string[] = [];
      if (cleanIds.length > 0) {
        drOrClauses.push(`startup_id.in.(${cleanIds.join(",")})`);
      }
      if (campusStudentEmails.length > 0) {
        drOrClauses.push(`founder_email.in.(${campusStudentEmails.join(",")})`);
      }
      if (domain) {
        drOrClauses.push(`founder_email.ilike.%${domain}`);
      }
      if (drOrClauses.length > 0) {
        drQuery = drQuery.or(drOrClauses.join(","));
      }

      let connQuery = (supabase as any)
        .from("connection_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const connOrClauses: string[] = [];
      if (cleanIds.length > 0) {
        connOrClauses.push(`startup_id.in.(${cleanIds.join(",")})`);
      }
      if (campusStudentEmails.length > 0) {
        connOrClauses.push(
          `receiver_email.in.(${campusStudentEmails.join(",")})`,
          `sender_email.in.(${campusStudentEmails.join(",")})`
        );
      }
      if (domain) {
        connOrClauses.push(`receiver_email.ilike.%${domain}`, `sender_email.ilike.%${domain}`);
      }
      if (connOrClauses.length > 0) {
        connQuery = connQuery.or(connOrClauses.join(","));
      }

      let auditQuery = (supabase as any)
        .from("data_room_audit_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (cleanIds.length > 0) {
        auditQuery = auditQuery.in("startup_id", cleanIds);
      } else if (campusStudentEmails.length > 0) {
        auditQuery = auditQuery.in("user_email", campusStudentEmails);
      } else if (domain) {
        auditQuery = auditQuery.ilike("user_email", `%${domain}`);
      }

      const [drRes, connRes, auditRes] = await Promise.all([drQuery, connQuery, auditQuery]);

      const dbDr = Array.isArray(drRes?.data) ? drRes.data.map((d: any) => this.mapDbRequestToRecord(d)) : [];
      const dbConn = Array.isArray(connRes?.data) ? connRes.data.map((c: any) => this.mapDbConnToRecord(c)) : [];
      const dbAudit = Array.isArray(auditRes?.data) ? auditRes.data.map((a: any) => this.mapDbAuditToRecord(a)) : [];

      const mergedDrMap = new Map<string, DataRoomRequestRecord>();
      localDr.forEach((r) => mergedDrMap.set(r.id, r));
      dbDr.forEach((r) => mergedDrMap.set(r.id, r));

      const mergedConnMap = new Map<string, ConnectionRequestRecord>();
      localConn.forEach((c) => mergedConnMap.set(c.id, c));
      dbConn.forEach((c) => mergedConnMap.set(c.id, c));

      const mergedAuditMap = new Map<string, DataRoomAuditRecord>();
      localAudit.forEach((a) => mergedAuditMap.set(a.id, a));
      dbAudit.forEach((a) => mergedAuditMap.set(a.id, a));

      return {
        dataRoomRequests: Array.from(mergedDrMap.values()).sort(
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        ),
        connectionRequests: Array.from(mergedConnMap.values()).sort(
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        ),
        auditLogs: Array.from(mergedAuditMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        discoveredStartupIds: cleanIds,
      };
    } catch (err) {
      console.warn("[RequestService] DB getUniversityInvestorActivity exception:", err);
      return {
        dataRoomRequests: localDr.sort(
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        ),
        connectionRequests: localConn.sort(
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        ),
        auditLogs: localAudit,
        discoveredStartupIds: cleanIds,
      };
    }
  },

  /**
   * Fetch all data room requests for a student founder across all their startup IDs and email
   */
  async getDataRoomRequestsForStudent(params: {
    startupIds: string[];
    founderId?: string | undefined;
    founderEmail?: string | undefined;
  }): Promise<DataRoomRequestRecord[]> {
    const { startupIds, founderId, founderEmail } = params;
    const cleanIds = (startupIds || []).filter(Boolean);
    const cleanEmail = founderEmail?.toLowerCase().trim();

    // If no startup, email, or founder identity provided, return empty list (no leakage)
    if (cleanIds.length === 0 && !cleanEmail && !founderId) {
      return [];
    }

    const local = getLocalDrRequests().filter(
      (r) =>
        (cleanIds.length > 0 && cleanIds.includes(r.startupId)) ||
        (cleanEmail && r.founderEmail?.toLowerCase() === cleanEmail) ||
        (founderId && r.founderId === founderId)
    );

    try {
      let query = (supabase as any)
        .from("data_room_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const orClauses: string[] = [];
      if (cleanIds.length > 0) {
        orClauses.push(`startup_id.in.(${cleanIds.join(",")})`);
      }
      if (cleanEmail) {
        orClauses.push(`founder_email.ilike.${cleanEmail}`);
      }

      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      } else {
        return local;
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

  /**
   * Subscribe to Data Room requests with 6 synchronized triggers:
   * 1. Supabase Realtime WebSocket broadcast
   * 2. Postgres changes event listener
   * 3. Browser BroadcastChannel API (cross-tab 0ms instant sync)
   * 4. Window CustomEvent listener (same-page instant sync)
   * 5. Tab focus / visibilitychange listener (instant refresh on return)
   * 6. High-speed 1200ms background polling fallback
   */
  subscribeToDataRoomRequests(onUpdate: (payload?: any) => void): () => void {
    ensureGlobalDrSubscription();
    drUpdateListeners.add(onUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("cv-realtime-sync");
        bc.onmessage = (ev) => {
          if (ev.data?.type === "dataroom_changed") {
            onUpdate(ev.data.detail);
          }
        };
      } catch {
        /* ignore */
      }
    }

    const customEventListener = (e: any) => {
      onUpdate(e.detail);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cv:dataroom-state-changed", customEventListener);
    }

    const onVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        onUpdate({ source: "focus_visibility" });
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onVisibilityOrFocus);
      document.addEventListener("visibilitychange", onVisibilityOrFocus);
    }

    const pollingTimer = setInterval(() => {
      onUpdate({ source: "polling" });
    }, 1200);

    return () => {
      drUpdateListeners.delete(onUpdate);
      if (bc) {
        try {
          bc.close();
        } catch {
          /* ignore */
        }
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("cv:dataroom-state-changed", customEventListener);
        window.removeEventListener("focus", onVisibilityOrFocus);
        document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      }
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
    };
  },

  mapDbRequestToRecord(d: any): DataRoomRequestRecord {
    let meta: Record<string, any> = {};
    if (d.next_steps && typeof d.next_steps === "string" && d.next_steps.startsWith("{")) {
      try {
        meta = JSON.parse(d.next_steps);
      } catch {
        /* ignore */
      }
    }

    const permitted =
      meta.permittedDocIds ||
      (Array.isArray(d.permitted_doc_ids)
        ? d.permitted_doc_ids
        : typeof d.permitted_doc_ids === "string" && d.permitted_doc_ids.trim().length > 0
          ? (d.permitted_doc_ids.startsWith("[") ? JSON.parse(d.permitted_doc_ids) : d.permitted_doc_ids.split(",").filter(Boolean))
          : undefined);

    const ndaSigned = Boolean(d.nda_signed || meta.rulesAccepted);
    const ndaStatus = ndaSigned ? "signed" : (d.status === "granted" ? "required" : "required");

    const rulesAccepted = Boolean(meta.rulesAccepted || d.rules_accepted || ndaSigned);
    const rulesVersion = meta.rulesVersion || d.rules_version || "v1.0-cv-reg";
    const rulesAcceptedAt = meta.rulesAcceptedAt || d.rules_accepted_at || (rulesAccepted ? d.updated_at || d.created_at : undefined);

    const rulesProof =
      meta.rulesProof ||
      (rulesAccepted
        ? {
            investorName: d.investor_name || meta.ndaSignedName || "Verified Investor",
            investorEmail: d.investor_email || "",
            investorOrg: d.investor_org || "Accredited Investment Partner",
            founderName: meta.founderName || "Student Founder",
            founderEmail: d.founder_email || "",
            startupName: d.startup_name || "Campus Venture",
            universityName: meta.universityName || d.university_name || "Campus Partner University",
            rulesVersion,
            declaration: `I, ${d.investor_name || "the Investor"} (${d.investor_email || ""}), in my full presence and legal authority, confirm that I am okay with all platform rules and regulations (${rulesVersion}) and the consequences of rule breaks. I agree and submit this form as permanent proof of verification and security for ${d.startup_name || "the venture"} and founder.`,
            timestamp: rulesAcceptedAt || d.created_at,
            accessScope: permitted || [],
          }
        : undefined);

    return {
      id: d.id,
      startupId: d.startup_id,
      investorId: d.investor_id,
      founderId: meta.founderId || d.founder_id || undefined,
      founderEmail: d.founder_email || undefined,
      investorName: d.investor_name || "Accredited Investor",
      investorEmail: d.investor_email || "",
      investorOrg: d.investor_org || "Venture Fund",
      startupName: d.startup_name || "Venture",
      message: meta.message || d.message || undefined,
      status: d.status || "pending",
      ndaStatus: ndaStatus as any,
      ndaSigned,
      ndaSignedName: d.nda_signed_name || meta.ndaSignedName || "",
      ndaSignedAt: meta.ndaSignedAt || d.nda_signed_at || undefined,
      ndaVersion: meta.rulesVersion || d.nda_version || "v1.0",
      rulesAccepted,
      rulesVersion,
      rulesAcceptedAt,
      rulesProof,
      universityName: meta.universityName || d.university_name || undefined,
      permittedDocIds: permitted,
      discussionTerms: d.discussion_terms || undefined,
      nextSteps: typeof d.next_steps === "string" && !d.next_steps.startsWith("{") ? d.next_steps : undefined,
      declineReason: d.decline_reason || meta.declineReason || undefined,
      accessDurationDays: meta.durationDays || d.access_duration_days || 30,
      expiresAt: meta.expiresAt || d.expires_at || undefined,
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

    this.broadcastConnectionChange({
      action: "requested",
      requestId: safeId,
      senderId,
      receiverId,
      startupId,
    });

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

    this.broadcastConnectionChange({
      action: status,
      requestId,
      status,
    });

    return { success: true };
  },

  async getIncomingConnectionRequests(
    userId: string,
    userEmail?: string,
    startupIds: string[] = []
  ): Promise<ConnectionRequestRecord[]> {
    const cleanUserId = userId?.trim();
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanIds = (startupIds || []).filter(Boolean);

    if (!cleanUserId && !cleanEmail && cleanIds.length === 0) {
      return [];
    }

    const local = getLocalConnRequests().filter(
      (c) =>
        (cleanUserId && c.receiverId === cleanUserId) ||
        (cleanEmail && c.receiverEmail?.toLowerCase() === cleanEmail) ||
        (c.startupId && cleanIds.includes(c.startupId))
    );

    try {
      let query = (supabase as any)
        .from("connection_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const orClauses: string[] = [];
      if (cleanUserId) orClauses.push(`receiver_id.eq.${cleanUserId}`);
      if (cleanEmail) orClauses.push(`receiver_email.ilike.${cleanEmail}`);
      if (cleanIds.length > 0) orClauses.push(`startup_id.in.(${cleanIds.join(",")})`);

      if (orClauses.length === 0) {
        return local;
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
    const cleanUserId = userId?.trim();
    const cleanEmail = userEmail?.toLowerCase().trim();

    if (!cleanUserId && !cleanEmail) {
      return [];
    }

    const local = getLocalConnRequests().filter(
      (c) => (cleanUserId && c.senderId === cleanUserId) || (cleanEmail && c.senderEmail?.toLowerCase() === cleanEmail)
    );

    try {
      let query = (supabase as any)
        .from("connection_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (cleanUserId && cleanEmail) {
        query = query.or(`sender_id.eq.${cleanUserId},sender_email.ilike.${cleanEmail}`);
      } else if (cleanEmail) {
        query = query.ilike("sender_email", cleanEmail);
      } else if (cleanUserId) {
        query = query.eq("sender_id", cleanUserId);
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

  async getAllAcceptedConnectionsForUser(userId?: string, userEmail?: string, startupIds: string[] = []): Promise<ConnectionRequestRecord[]> {
    const cleanUserId = userId?.trim();
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanIds = (startupIds || []).filter(Boolean);

    if (!cleanUserId && !cleanEmail && cleanIds.length === 0) {
      return [];
    }

    const local = getLocalConnRequests().filter(
      (c) =>
        c.status === "accepted" &&
        ((cleanUserId && (c.senderId === cleanUserId || c.receiverId === cleanUserId)) ||
          (cleanEmail &&
            (c.senderEmail?.toLowerCase() === cleanEmail || c.receiverEmail?.toLowerCase() === cleanEmail)) ||
          (c.startupId && cleanIds.includes(c.startupId)))
    );

    try {
      let query = (supabase as any)
        .from("connection_requests")
        .select("*")
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      const orClauses: string[] = [];
      if (cleanUserId) {
        orClauses.push(`sender_id.eq.${cleanUserId}`, `receiver_id.eq.${cleanUserId}`);
      }
      if (cleanEmail) {
        orClauses.push(`sender_email.ilike.${cleanEmail}`, `receiver_email.ilike.${cleanEmail}`);
      }
      if (cleanIds.length > 0) {
        orClauses.push(`startup_id.in.(${cleanIds.join(",")})`);
      }

      if (orClauses.length === 0) {
        return local;
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

  subscribeToConnectionRequests(onUpdate: (payload?: any) => void): () => void {
    ensureGlobalConnSubscription();
    connUpdateListeners.add(onUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("cv-realtime-sync");
        bc.onmessage = (ev) => {
          if (ev.data?.type === "conn_changed") {
            onUpdate(ev.data.detail);
          }
        };
      } catch {
        /* ignore */
      }
    }

    const customEventListener = (e: any) => {
      onUpdate(e.detail);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cv:conn-state-changed", customEventListener);
    }

    const onVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        onUpdate({ source: "focus_visibility" });
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onVisibilityOrFocus);
      document.addEventListener("visibilitychange", onVisibilityOrFocus);
    }

    const pollingTimer = setInterval(() => {
      onUpdate({ source: "polling" });
    }, 1200);

    return () => {
      connUpdateListeners.delete(onUpdate);
      if (bc) {
        try {
          bc.close();
        } catch {
          /* ignore */
        }
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("cv:conn-state-changed", customEventListener);
        window.removeEventListener("focus", onVisibilityOrFocus);
        document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      }
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
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

    // 1. Convert file to dataURL for persistent in-app viewing & preview
    let fileDataUrl: string | undefined = undefined;
    if (typeof FileReader !== "undefined") {
      try {
        fileDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve("");
          if (file.size < 12 * 1024 * 1024) {
            reader.readAsDataURL(file);
          } else {
            resolve("");
          }
        });
      } catch {
        /* ignore */
      }
    }

    // 2. Attempt upload to Supabase Storage private bucket
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
      fileUrl: fileDataUrl || undefined,
      confidential,
      createdAt: now,
      updatedAt: now,
    };

    // Update local cache
    const local = getLocalDocs();
    saveLocalDocs([record, ...local]);

    // 3. Persist metadata to database (only existing columns)
    try {
      const payload: Record<string, any> = {
        id: safeId,
        startup_id: startupId,
        name: record.name,
        category: record.category,
        size: record.size,
        confidential: record.confidential,
        created_at: now,
      };

      if (fileDataUrl && fileDataUrl.length < 1500000) {
        payload["file_url"] = fileDataUrl;
      }

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
      const payload: Record<string, any> = {
        name: updatedRecord.name,
        category: updatedRecord.category,
        size: updatedRecord.size,
        confidential: updatedRecord.confidential,
      };
      if (updatedRecord.fileUrl) payload["file_url"] = updatedRecord.fileUrl;

      await (supabase as any)
        .from("data_room_docs")
        .update(payload)
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
  }): Promise<{ success: boolean; signedUrl?: string; inAppPreview?: boolean; error?: string }> {
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

      // Check per-document permissions set by the founder
      if (
        activeGrant.permittedDocIds &&
        activeGrant.permittedDocIds.length > 0 &&
        !activeGrant.permittedDocIds.includes(docId)
      ) {
        return {
          success: false,
          error: "Access restricted: The founder has not permitted access to this specific document.",
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

    // Check if doc has local data/fileUrl
    const localDoc = getLocalDocs().find((d) => d.id === docId);
    if (localDoc?.fileUrl) {
      return { success: true, signedUrl: localDoc.fileUrl, inAppPreview: true };
    }

    try {
      const { data: dbDoc } = await (supabase as any)
        .from("data_room_docs")
        .select("file_url")
        .eq("id", docId)
        .maybeSingle();

      if (dbDoc?.file_url) {
        return { success: true, signedUrl: dbDoc.file_url, inAppPreview: true };
      }
    } catch {
      /* ignore */
    }

    // Log the view or download action in audit trail
    this.logDataRoomAudit({
      startupId,
      docId,
      userId: requesterUserId,
      userEmail: requesterEmail,
      action: isDownload ? "downloaded" : "viewed",
      details: isDownload
        ? "Confidential file downloaded"
        : "Confidential file previewed in-app",
    });

    return {
      success: true,
      inAppPreview: true,
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
