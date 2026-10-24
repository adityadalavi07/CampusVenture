import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_STARTUPS, type Role, type Startup } from "@/lib/demo-data";
import { ventureService } from "@/services/ventureService";
import { notificationService } from "@/services/notificationService";
import { generateUUID, isValidUUID } from "@/lib/uuid";

export type ReviewStatus = "draft" | "pending" | "approved" | "rejected";

/** The signed-in identities this build uses (auth is disabled). */
export const MY_STARTUP_ID = "s1";
export const MY_INVESTOR_ID = "i1";

export interface StartupRecord extends Startup {
  problem: string;
  solution: string;
  videoUrl: string;
  deckName: string;
  githubUrl: string;
  githubStars: number;
  status: ReviewStatus;
  reviewNote: string;
  views: number;
  founder?: string | undefined;
  founderEmail?: string | undefined;
}

export interface Notification {
  id: string;
  role: Role;
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface ConnectionRequest {
  id: string;
  startupId: string;
  investorId: string;
  kind: "connection" | "dataroom";
  status: "pending" | "accepted" | "declined";
  at: string;
}

export interface Message {
  id: string;
  startupId: string;
  investorId: string;
  from: "student" | "investor";
  text: string;
  at: string;
  readByStudent: boolean;
  readByInvestor: boolean;
}

export interface Meeting {
  id: string;
  startupId: string;
  investorId: string;
  title: string;
  at: string;
  minutes: number;
  status: "requested" | "confirmed" | "declined";
  requestedBy: "student" | "investor";
}

export interface DataRoomDoc {
  id: string;
  startupId: string;
  name: string;
  category: "Financials" | "Legal" | "Product" | "Metrics" | "Cap table";
  size: string;
  confidential: boolean;
  addedAt: string;
}

export interface DataRoomAccess {
  id: string;
  startupId: string;
  investorId: string;
  status: "pending" | "granted" | "revoked";
  ndaSigned: boolean;
  ndaSignedName: string;
  requestedAt: string;
  downloads: number;
}

export interface Program {
  id: string;
  name: string;
  cohort: string;
  seats: number;
  enrolled: string[];
  mentor: string;
  status: "open" | "running" | "closed";
  startsOn: string;
}

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  branch: string;
  year: string;
  startupId: string | null;
  verified: boolean;
  org?: string;
}

interface State {
  startups: StartupRecord[];
  notifications: Notification[];
  saved: string[];
  requests: ConnectionRequest[];
  messages: Message[];
  meetings: Meeting[];
  docs: DataRoomDoc[];
  access: DataRoomAccess[];
  programs: Program[];
  students: StudentRecord[];
}

const STORAGE_KEY = "campusventure.saas.live.v3";

function seed(): State {
  return {
    startups: [],
    saved: [],
    requests: [],
    messages: [],
    meetings: [],
    docs: [],
    access: [],
    programs: [],
    students: [],
    notifications: [],
  };
}

const rid = (p: string) => `${p}${Math.random().toString(36).slice(2, 9)}`;

interface Ctx extends State {
  hydrated: boolean;
  unread: (role: Role) => number;
  notify: (
    role: Role,
    title: string,
    body: string,
    meta?: { recipientEmail?: string | undefined; recipientUserId?: string | undefined }
  ) => void;
  markAllRead: (role: Role) => void;
  updateStartup: (id: string, patch: Partial<StartupRecord>) => void;
  setReview: (id: string, status: ReviewStatus, note?: string) => void;
  toggleSaved: (id: string) => boolean;
  addRequest: (startupId: string, investorId: string, kind: ConnectionRequest["kind"]) => void;
  setRequestStatus: (id: string, status: ConnectionRequest["status"]) => void;
  sendMessage: (startupId: string, investorId: string, from: Message["from"], text: string) => void;
  markThreadRead: (startupId: string, investorId: string, as: Message["from"]) => void;
  requestMeeting: (m: Omit<Meeting, "id" | "status">) => void;
  setMeetingStatus: (id: string, status: Meeting["status"]) => void;
  addDoc: (doc: Omit<DataRoomDoc, "id" | "addedAt">) => void;
  removeDoc: (id: string) => void;
  requestAccess: (startupId: string, investorId: string) => void;
  setAccessStatus: (id: string, status: DataRoomAccess["status"]) => void;
  signNda: (startupId: string, investorId: string, name: string) => void;
  registerDownload: (startupId: string, investorId: string) => void;
  toggleEnrollment: (programId: string, startupId: string) => boolean;
  setProgramStatus: (id: string, status: Program["status"]) => void;
  addProgram: (p: Omit<Program, "id" | "enrolled">) => void;
  setStudentVerified: (id: string, verified: boolean) => void;
  updateStudent: (idOrEmail: string, patch: Partial<StudentRecord>) => void;
  createStartup: (startupData: Partial<StartupRecord>) => string;
  resetDemo: () => void;
}

const VentureContext = createContext<Ctx | null>(null);

export function VentureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => seed());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.removeItem("campusventure.state.v1");
      window.localStorage.removeItem("campusventure.state.v2");
    } catch {}
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setState((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      /* corrupt storage: keep clean seed */
    }
    setHydrated(true);

    const unsub = ventureService.subscribeToStartups((remoteStartups) => {
      if (Array.isArray(remoteStartups) && remoteStartups.length > 0) {
        setState((prev) => {
          const map = new Map();
          prev.startups.forEach((s) => map.set(s.id, s));
          remoteStartups.forEach((s) => map.set(s.id, s));
          return {
            ...prev,
            startups: Array.from(map.values()),
          };
        });
      }
    });

    ventureService.getAllStudentProfiles().then((remoteStudents) => {
      if (Array.isArray(remoteStudents) && remoteStudents.length > 0) {
        setState((prev) => {
          const map = new Map();
          prev.students.forEach((st) => map.set(st.email.toLowerCase(), st));
          remoteStudents.forEach((st) => {
            const existing = map.get(st.email.toLowerCase());
            map.set(st.email.toLowerCase(), {
              ...st,
              verified: existing?.verified ?? false,
              startupId: existing?.startupId ?? null,
            });
          });
          return {
            ...prev,
            students: Array.from(map.values()),
          };
        });
      }
    });

    const unsubNotifsStudent = notificationService.subscribeToNotifications("student", undefined, (fresh) => {
      if (Array.isArray(fresh) && fresh.length > 0) {
        setState((prev) => {
          const map = new Map<string, Notification>();
          prev.notifications.forEach((n) => map.set(n.id, n));
          fresh.forEach((f) => {
            map.set(f.id, {
              id: f.id,
              role: f.role,
              title: f.title,
              body: f.body,
              at: f.createdAt,
              read: f.read,
            });
          });
          return {
            ...prev,
            notifications: Array.from(map.values()).sort(
              (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
            ),
          };
        });
      }
    });

    const unsubNotifsInvestor = notificationService.subscribeToNotifications("investor", undefined, (fresh) => {
      if (Array.isArray(fresh) && fresh.length > 0) {
        setState((prev) => {
          const map = new Map<string, Notification>();
          prev.notifications.forEach((n) => map.set(n.id, n));
          fresh.forEach((f) => {
            map.set(f.id, {
              id: f.id,
              role: f.role,
              title: f.title,
              body: f.body,
              at: f.createdAt,
              read: f.read,
            });
          });
          return {
            ...prev,
            notifications: Array.from(map.values()).sort(
              (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
            ),
          };
        });
      }
    });

    const unsubNotifsUni = notificationService.subscribeToNotifications("university", undefined, (fresh) => {
      if (Array.isArray(fresh) && fresh.length > 0) {
        setState((prev) => {
          const map = new Map<string, Notification>();
          prev.notifications.forEach((n) => map.set(n.id, n));
          fresh.forEach((f) => {
            map.set(f.id, {
              id: f.id,
              role: f.role,
              title: f.title,
              body: f.body,
              at: f.createdAt,
              read: f.read,
            });
          });
          return {
            ...prev,
            notifications: Array.from(map.values()).sort(
              (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
            ),
          };
        });
      }
    });

    return () => {
      unsub();
      unsubNotifsStudent();
      unsubNotifsInvestor();
      unsubNotifsUni();
    };
  }, []);

  // Cross-tab and multi-window live sync: updates in one role/tab immediately reflect across all roles
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const fresh = JSON.parse(e.newValue) as Partial<State>;
          if (fresh && Array.isArray(fresh.startups)) {
            setState((prev) => ({ ...prev, ...fresh }));
          }
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Persist off the critical path: typing shouldn't pay for a full serialise.
  useEffect(() => {
    if (!hydrated) return;
    const idle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (cb: () => void) =>
            (window as unknown as { requestIdleCallback: (c: () => void, o?: object) => number })
              .requestIdleCallback(cb, { timeout: 1000 })
        : (cb: () => void) => window.setTimeout(cb, 300);
    const cancel =
      typeof window !== "undefined" && "cancelIdleCallback" in window
        ? (id: number) =>
            (window as unknown as { cancelIdleCallback: (i: number) => void }).cancelIdleCallback(id)
        : (id: number) => window.clearTimeout(id);

    let pending: number | undefined;
    const timer = window.setTimeout(() => {
      const id = idle(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
          /* quota: ignore */
        }
      });
      pending = id;
    }, 250);

    return () => {
      window.clearTimeout(timer);
      if (pending !== undefined) cancel(pending);
    };
  }, [state, hydrated]);


  const notify = useCallback(
    (
      role: Role,
      title: string,
      body: string,
      meta?: { recipientEmail?: string | undefined; recipientUserId?: string | undefined }
    ) => {
      notificationService.sendNotification({
        role,
        title,
        body,
        recipientEmail: meta?.recipientEmail,
        recipientUserId: meta?.recipientUserId,
      });

      setState((prev) => ({
        ...prev,
        notifications: [
          {
            id: rid("n"),
            role,
            title,
            body,
            at: new Date().toISOString(),
            read: false,
          },
          ...prev.notifications,
        ],
      }));
    },
    []
  );

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      notify,
      unread: (role) => state.notifications.filter((n) => n.role === role && !n.read).length,
      markAllRead: (role) => {
        notificationService.markAllRead(role);
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.role === role ? { ...n, read: true } : n,
          ),
        }));
      },
      updateStartup: (id, patch) =>
        setState((prev) => {
          const nextStartups = prev.startups.map((s) => (s.id === id ? { ...s, ...patch } : s));
          const updated = nextStartups.find((s) => s.id === id);
          if (updated) {
            ventureService.upsertStartup(updated);
          }
          const nextStudents = prev.students.map((st) => {
            if (st.startupId === id) {
              return {
                ...st,
                name: patch.founder || st.name,
              };
            }
            return st;
          });
          return {
            ...prev,
            startups: nextStartups,
            students: nextStudents,
          };
        }),
      setReview: (id, status, note = "") => {
        ventureService.updateStartupReview(id, status, note);
        setState((prev) => ({
          ...prev,
          startups: prev.startups.map((s) =>
            s.id === id ? { ...s, status, reviewNote: note, verified: status === "approved" } : s,
          ),
        }));
      },
      toggleSaved: (id) => {
        let added = false;
        setState((prev) => {
          added = !prev.saved.includes(id);
          return {
            ...prev,
            saved: added ? [...prev.saved, id] : prev.saved.filter((x) => x !== id),
          };
        });
        return added;
      },
      addRequest: (startupId, investorId, kind) =>
        setState((prev) => ({
          ...prev,
          requests: [
            {
              id: rid("r"),
              startupId,
              investorId,
              kind,
              status: "pending",
              at: new Date().toISOString(),
            },
            ...prev.requests,
          ],
        })),
      setRequestStatus: (id, status) =>
        setState((prev) => ({
          ...prev,
          requests: prev.requests.map((r) => (r.id === id ? { ...r, status } : r)),
        })),
      sendMessage: (startupId, investorId, from, text) =>
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: rid("m"),
              startupId,
              investorId,
              from,
              text,
              at: new Date().toISOString(),
              readByStudent: from === "student",
              readByInvestor: from === "investor",
            },
          ],
        })),
      markThreadRead: (startupId, investorId, as) =>
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.startupId === startupId && m.investorId === investorId
              ? as === "student"
                ? { ...m, readByStudent: true }
                : { ...m, readByInvestor: true }
              : m,
          ),
        })),
      requestMeeting: (m) =>
        setState((prev) => ({
          ...prev,
          meetings: [{ ...m, id: rid("mt"), status: "requested" }, ...prev.meetings],
        })),
      setMeetingStatus: (id, status) =>
        setState((prev) => ({
          ...prev,
          meetings: prev.meetings.map((m) => (m.id === id ? { ...m, status } : m)),
        })),
      addDoc: (doc) =>
        setState((prev) => ({
          ...prev,
          docs: [{ ...doc, id: rid("d"), addedAt: new Date().toISOString() }, ...prev.docs],
        })),
      removeDoc: (id) =>
        setState((prev) => ({ ...prev, docs: prev.docs.filter((d) => d.id !== id) })),
      requestAccess: (startupId, investorId) =>
        setState((prev) => {
          if (prev.access.some((a) => a.startupId === startupId && a.investorId === investorId)) {
            return prev;
          }
          return {
            ...prev,
            access: [
              {
                id: rid("a"),
                startupId,
                investorId,
                status: "pending",
                ndaSigned: false,
                ndaSignedName: "",
                requestedAt: new Date().toISOString(),
                downloads: 0,
              },
              ...prev.access,
            ],
          };
        }),
      setAccessStatus: (id, status) =>
        setState((prev) => ({
          ...prev,
          access: prev.access.map((a) => (a.id === id ? { ...a, status } : a)),
        })),
      signNda: (startupId, investorId, name) =>
        setState((prev) => ({
          ...prev,
          access: prev.access.map((a) =>
            a.startupId === startupId && a.investorId === investorId
              ? { ...a, ndaSigned: true, ndaSignedName: name }
              : a,
          ),
        })),
      registerDownload: (startupId, investorId) =>
        setState((prev) => ({
          ...prev,
          access: prev.access.map((a) =>
            a.startupId === startupId && a.investorId === investorId
              ? { ...a, downloads: a.downloads + 1 }
              : a,
          ),
        })),
      toggleEnrollment: (programId, startupId) => {
        let added = false;
        setState((prev) => ({
          ...prev,
          programs: prev.programs.map((p) => {
            if (p.id !== programId) return p;
            added = !p.enrolled.includes(startupId);
            return {
              ...p,
              enrolled: added
                ? [...p.enrolled, startupId]
                : p.enrolled.filter((x) => x !== startupId),
            };
          }),
        }));
        return added;
      },
      setProgramStatus: (id, status) =>
        setState((prev) => ({
          ...prev,
          programs: prev.programs.map((p) => (p.id === id ? { ...p, status } : p)),
        })),
      addProgram: (p) =>
        setState((prev) => ({
          ...prev,
          programs: [{ ...p, id: rid("p"), enrolled: [] }, ...prev.programs],
        })),
      setStudentVerified: (id, verified) =>
        setState((prev) => ({
          ...prev,
          students: prev.students.map((s) => (s.id === id ? { ...s, verified } : s)),
        })),
      updateStudent: (idOrEmail, patch) =>
        setState((prev) => {
          const clean = idOrEmail.toLowerCase().trim();
          const exists = prev.students.some(
            (s) => s.id === idOrEmail || s.email.toLowerCase().trim() === clean
          );
          if (exists) {
            return {
              ...prev,
              students: prev.students.map((s) =>
                s.id === idOrEmail || s.email.toLowerCase().trim() === clean
                  ? { ...s, ...patch }
                  : s
              ),
            };
          }
          const newStudent: StudentRecord = {
            id: rid("u"),
            name: patch.name || "Student Founder",
            email: patch.email || idOrEmail,
            branch: patch.branch || "Computer Engineering",
            year: patch.year || "Final year",
            startupId: patch.startupId || MY_STARTUP_ID,
            verified: patch.verified ?? false,
          };
          return {
            ...prev,
            students: [newStudent, ...prev.students],
          };
        }),
      createStartup: (startupData) => {
        const newId = isValidUUID(startupData.id) ? (startupData.id as string) : generateUUID();
        const newStartup: StartupRecord = {
          id: newId,
          name: startupData.name || "My Student Venture",
          tagline: startupData.tagline || "",
          sector: startupData.sector || "AI",
          stage: startupData.stage || "Idea",
          location: startupData.location || "India",
          university: startupData.university || "",
          teamSize: startupData.teamSize || 1,
          fundingRequired: startupData.fundingRequired || 0,
          revenue: startupData.revenue ?? false,
          monthlyUsers: startupData.monthlyUsers || 0,
          readiness: startupData.readiness || 50,
          verified: false,
          traction: startupData.traction || "",
          businessModel: startupData.businessModel || "",
          updatedAt: new Date().toISOString(),
          problem: startupData.problem || "",
          solution: startupData.solution || "",
          videoUrl: startupData.videoUrl || "",
          deckName: startupData.deckName || "",
          githubUrl: startupData.githubUrl || "",
          githubStars: startupData.githubStars || 0,
          status: (startupData.status as ReviewStatus) || "draft",
          reviewNote: "",
          views: 0,
          ...startupData,
        };
        ventureService.upsertStartup(newStartup);
        setState((prev) => ({
          ...prev,
          startups: [newStartup, ...prev.startups.filter((s) => s.id !== newId)],
        }));
        return newId;
      },
      resetDemo: () => setState(seed()),
    }),
    [state, hydrated, notify],
  );

  return <VentureContext.Provider value={value}>{children}</VentureContext.Provider>;
}

export function useVenture() {
  const ctx = useContext(VentureContext);
  if (!ctx) throw new Error("useVenture must be used inside VentureProvider");
  return ctx;
}

export function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Changes requested",
};

/** Profile completeness from the fields founders actually fill in. */
export function completeness(s: StartupRecord) {
  const checks = [
    Boolean(s.problem.trim()),
    Boolean(s.solution.trim()),
    Boolean(s.videoUrl.trim()),
    Boolean(s.deckName.trim()),
    Boolean(s.githubUrl.trim()),
    Boolean(s.traction.trim()),
    Boolean(s.businessModel.trim()),
    s.fundingRequired > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
