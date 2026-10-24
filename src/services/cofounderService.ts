import { supabase } from "@/lib/supabase";
import { generateUUID, isValidUUID } from "@/lib/uuid";
import { notificationService } from "./notificationService";

export interface CofounderInvitationRecord {
  id: string;
  startupId: string;
  startupName: string;
  founderId?: string | undefined;
  founderName: string;
  founderEmail: string;
  cofounderName: string;
  cofounderEmail: string;
  role: string;
  equity?: string | undefined;
  notes?: string | undefined;
  status: "pending" | "accepted" | "rejected" | "revoked";
  createdAt: string;
  updatedAt: string;
}

const LOCAL_COFOUNDER_KEY = "campusventure.cofounder.invitations.v1";

function getLocalInvitations(): CofounderInvitationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_COFOUNDER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalInvitations(items: CofounderInvitationRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_COFOUNDER_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export const cofounderService = {
  /**
   * Dispatch a formal co-founder invitation via database, email service, and real-time notification
   */
  async sendInvitation(params: {
    startupId: string;
    startupName: string;
    founderId?: string | undefined;
    founderName: string;
    founderEmail: string;
    cofounderName: string;
    cofounderEmail: string;
    role: string;
    equity?: string | undefined;
    notes?: string | undefined;
  }): Promise<{ success: boolean; invitation?: CofounderInvitationRecord | undefined; error?: string | undefined }> {
    const {
      startupId,
      startupName,
      founderId,
      founderName,
      founderEmail,
      cofounderName,
      cofounderEmail,
      role,
      equity,
      notes,
    } = params;

    const cleanCofounderEmail = cofounderEmail.trim().toLowerCase();
    const cleanFounderEmail = founderEmail.trim().toLowerCase();

    if (!cleanCofounderEmail || !cleanCofounderEmail.includes("@")) {
      return { success: false, error: "Please provide a valid email address." };
    }

    if (cleanCofounderEmail === cleanFounderEmail) {
      return { success: false, error: "You cannot invite yourself as a co-founder." };
    }

    const safeId = generateUUID();
    const now = new Date().toISOString();

    const record: CofounderInvitationRecord = {
      id: safeId,
      startupId,
      startupName,
      founderId: founderId && isValidUUID(founderId) ? founderId : undefined,
      founderName,
      founderEmail: cleanFounderEmail,
      cofounderName: cofounderName.trim(),
      cofounderEmail: cleanCofounderEmail,
      role: role.trim() || "Co-Founder",
      equity: equity?.trim() || undefined,
      notes: notes?.trim() || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    // Save locally
    const existing = getLocalInvitations();
    saveLocalInvitations([record, ...existing.filter((i) => i.id !== safeId)]);

    // Persist to Supabase if table exists
    try {
      const payload: Record<string, any> = {
        id: safeId,
        startup_id: startupId,
        startup_name: startupName,
        founder_name: founderName,
        founder_email: cleanFounderEmail,
        cofounder_name: record.cofounderName,
        cofounder_email: cleanCofounderEmail,
        role: record.role,
        status: "pending",
        created_at: now,
        updated_at: now,
      };

      if (founderId && isValidUUID(founderId)) payload["founder_id"] = founderId;
      if (equity) payload["equity"] = equity;
      if (notes) payload["notes"] = notes;

      const { data, error } = await (supabase as any)
        .from("cofounder_invitations")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.warn("[CofounderService] Supabase insert notice:", error.message);
      } else if (data) {
        record.id = data.id;
      }
    } catch (err) {
      console.warn("[CofounderService] DB exception inserting invitation:", err);
    }

    // Dispatch real-time notification to the cofounder email
    try {
      await notificationService.sendNotification({
        role: "student",
        title: `Co-Founder Invitation from ${founderName}`,
        body: `${founderName} invited you to join ${startupName} as ${record.role}. Open your dashboard to accept.`,
        recipientEmail: cleanCofounderEmail,
      });
    } catch {
      /* ignore notification failure */
    }

    // Dispatch transactional email via server API if available
    try {
      if (typeof window !== "undefined") {
        fetch("/api/cofounder/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitationId: record.id,
            startupName,
            founderName,
            founderEmail: cleanFounderEmail,
            cofounderName: record.cofounderName,
            cofounderEmail: cleanCofounderEmail,
            role: record.role,
            equity: record.equity,
            notes: record.notes,
          }),
        }).catch(() => {
          /* background task */
        });
      }
    } catch {
      /* ignore */
    }

    return { success: true, invitation: record };
  },

  /**
   * Fetch all cofounder invitations for a given startup
   */
  async getInvitationsForStartup(startupId: string): Promise<CofounderInvitationRecord[]> {
    const local = getLocalInvitations().filter(
      (i) => i.startupId === startupId || (startupId === "s1" && i.startupId === "s1")
    );

    try {
      const { data, error } = await (supabase as any)
        .from("cofounder_invitations")
        .select("*")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const dbRecords: CofounderInvitationRecord[] = data.map((d: any) => ({
          id: d.id,
          startupId: d.startup_id,
          startupName: d.startup_name,
          founderId: d.founder_id || undefined,
          founderName: d.founder_name,
          founderEmail: d.founder_email,
          cofounderName: d.cofounder_name,
          cofounderEmail: d.cofounder_email,
          role: d.role,
          equity: d.equity || undefined,
          notes: d.notes || undefined,
          status: d.status,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const map = new Map<string, CofounderInvitationRecord>();
        dbRecords.forEach((r) => map.set(r.id, r));
        local.forEach((l) => {
          if (!map.has(l.id)) map.set(l.id, l);
        });

        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err) {
      console.warn("[CofounderService] Error fetching invitations for startup:", err);
    }

    return local;
  },

  /**
   * Fetch pending co-founder invitations for a user by email
   */
  async getPendingInvitationsForEmail(email: string): Promise<CofounderInvitationRecord[]> {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();

    const local = getLocalInvitations().filter(
      (i) => i.cofounderEmail.toLowerCase() === cleanEmail && i.status === "pending"
    );

    try {
      const { data, error } = await (supabase as any)
        .from("cofounder_invitations")
        .select("*")
        .eq("status", "pending")
        .ilike("cofounder_email", cleanEmail)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const dbRecords: CofounderInvitationRecord[] = data.map((d: any) => ({
          id: d.id,
          startupId: d.startup_id,
          startupName: d.startup_name,
          founderId: d.founder_id || undefined,
          founderName: d.founder_name,
          founderEmail: d.founder_email,
          cofounderName: d.cofounder_name,
          cofounderEmail: d.cofounder_email,
          role: d.role,
          equity: d.equity || undefined,
          notes: d.notes || undefined,
          status: d.status,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const map = new Map<string, CofounderInvitationRecord>();
        dbRecords.forEach((r) => map.set(r.id, r));
        local.forEach((l) => {
          if (!map.has(l.id)) map.set(l.id, l);
        });

        return Array.from(map.values());
      }
    } catch (err) {
      console.warn("[CofounderService] Error fetching pending invitations for email:", err);
    }

    return local;
  },

  /**
   * Accept co-founder invitation
   */
  async acceptInvitation(
    invitationId: string,
    cofounderUserId?: string
  ): Promise<{ success: boolean; invitation?: CofounderInvitationRecord | undefined; error?: string | undefined }> {
    const now = new Date().toISOString();

    const local = getLocalInvitations();
    let target = local.find((i) => i.id === invitationId);

    const updated = local.map((i) =>
      i.id === invitationId ? { ...i, status: "accepted" as const, updatedAt: now } : i
    );
    saveLocalInvitations(updated);

    try {
      const payload: Record<string, any> = {
        status: "accepted",
        updated_at: now,
      };
      if (cofounderUserId && isValidUUID(cofounderUserId)) {
        payload["cofounder_user_id"] = cofounderUserId;
      }

      const { data, error } = await (supabase as any)
        .from("cofounder_invitations")
        .update(payload)
        .eq("id", invitationId)
        .select()
        .single();

      if (!error && data) {
        target = {
          id: data.id,
          startupId: data.startup_id,
          startupName: data.startup_name,
          founderId: data.founder_id || undefined,
          founderName: data.founder_name,
          founderEmail: data.founder_email,
          cofounderName: data.cofounder_name,
          cofounderEmail: data.cofounder_email,
          role: data.role,
          equity: data.equity || undefined,
          notes: data.notes || undefined,
          status: "accepted",
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn("[CofounderService] Error accepting invitation in DB:", err);
    }

    // Send celebration notification to founder
    if (target) {
      try {
        await notificationService.sendNotification({
          role: "student",
          title: "🎉 Co-Founder Accepted Invitation!",
          body: `${target.cofounderName} officially accepted your invitation to join ${target.startupName} as ${target.role}!`,
          recipientEmail: target.founderEmail,
        });
      } catch {
        /* ignore */
      }
    }

    return { success: true, ...(target ? { invitation: target } : {}) };
  },

  /**
   * Reject / decline co-founder invitation
   */
  async rejectInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();

    const local = getLocalInvitations();
    const updated = local.map((i) =>
      i.id === invitationId ? { ...i, status: "rejected" as const, updatedAt: now } : i
    );
    saveLocalInvitations(updated);

    try {
      await (supabase as any)
        .from("cofounder_invitations")
        .update({ status: "rejected", updated_at: now })
        .eq("id", invitationId);
    } catch (err) {
      console.warn("[CofounderService] Error declining invitation in DB:", err);
    }

    return { success: true };
  },

  /**
   * Revoke invitation by founder
   */
  async revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();

    const local = getLocalInvitations();
    const updated = local.map((i) =>
      i.id === invitationId ? { ...i, status: "revoked" as const, updatedAt: now } : i
    );
    saveLocalInvitations(updated);

    try {
      await (supabase as any)
        .from("cofounder_invitations")
        .update({ status: "revoked", updated_at: now })
        .eq("id", invitationId);
    } catch (err) {
      console.warn("[CofounderService] Error revoking invitation in DB:", err);
    }

    return { success: true };
  },

  /**
   * Subscribe to real-time co-founder invitation updates
   */
  subscribeToInvitations(onUpdate: () => void) {
    let pollingTimer: any = null;

    const channel = supabase
      .channel("public-cofounder-invites-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cofounder_invitations" },
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
};
