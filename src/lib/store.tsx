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
  founder?: string;
  founderEmail?: string;
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

const STORAGE_KEY = "campusventure.state.v2";

const SEED_EXTRAS: Record<string, Partial<StartupRecord>> = {
  s1: {
    problem:
      "Engineering students get feedback on coursework days after submission, so misconceptions compound across an entire semester.",
    solution:
      "An adaptive AI tutor that grades submissions in minutes, explains every deduction and generates a personalised practice path.",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    deckName: "lumen-labs-seed-deck.pdf",
    githubUrl: "https://github.com/lumenlabs/adaptive-tutor",
    githubStars: 412,
    status: "approved",
    views: 126,
  },
  s2: { status: "pending", views: 54 },
  s3: { status: "draft", views: 18 },
  s4: { status: "approved", views: 233 },
  s5: { status: "pending", views: 61 },
  s6: { status: "approved", views: 147 },
};

function seed(): State {
  const startups = DEMO_STARTUPS.map<StartupRecord>((s) => ({
    ...s,
    problem: "",
    solution: "",
    videoUrl: "",
    deckName: "",
    githubUrl: "",
    githubStars: 0,
    status: "draft",
    reviewNote: "",
    views: 0,
    ...SEED_EXTRAS[s.id],
  }));

  const now = Date.now();
  const at = (min: number) => new Date(now - min * 60000).toISOString();
  const soon = (hours: number) => new Date(now + hours * 3600000).toISOString();

  return {
    startups,
    saved: ["s4"],
    requests: [
      {
        id: "r-seed-1",
        startupId: MY_STARTUP_ID,
        investorId: "i1",
        kind: "connection",
        status: "accepted",
        at: at(2600),
      },
      {
        id: "r-seed-2",
        startupId: "s4",
        investorId: "i2",
        kind: "dataroom",
        status: "pending",
        at: at(180),
      },
    ],
    messages: [
      {
        id: "m1",
        startupId: MY_STARTUP_ID,
        investorId: "i1",
        from: "investor",
        text: "Loved the demo. What does retention look like after the first semester?",
        at: at(220),
        readByStudent: false,
        readByInvestor: true,
      },
      {
        id: "m2",
        startupId: MY_STARTUP_ID,
        investorId: "i1",
        from: "student",
        text: "Semester-2 retention is 71% across the three campus pilots. Happy to share the cohort chart.",
        at: at(180),
        readByStudent: true,
        readByInvestor: false,
      },
      {
        id: "m3",
        startupId: MY_STARTUP_ID,
        investorId: "i4",
        from: "investor",
        text: "We write first cheques for verified student teams — are you raising now?",
        at: at(60),
        readByStudent: false,
        readByInvestor: true,
      },
      {
        id: "m4",
        startupId: "s4",
        investorId: "i1",
        from: "investor",
        text: "Can you share the regulatory timeline for the wearable?",
        at: at(500),
        readByStudent: false,
        readByInvestor: true,
      },
    ],
    meetings: [
      {
        id: "mt1",
        startupId: MY_STARTUP_ID,
        investorId: "i1",
        title: "Product deep dive",
        at: soon(26),
        minutes: 30,
        status: "confirmed",
        requestedBy: "investor",
      },
      {
        id: "mt2",
        startupId: MY_STARTUP_ID,
        investorId: "i4",
        title: "Intro call",
        at: soon(72),
        minutes: 20,
        status: "requested",
        requestedBy: "investor",
      },
    ],
    docs: [
      {
        id: "d1",
        startupId: MY_STARTUP_ID,
        name: "Financial model FY26.xlsx",
        category: "Financials",
        size: "412 KB",
        confidential: true,
        addedAt: at(4000),
      },
      {
        id: "d2",
        startupId: MY_STARTUP_ID,
        name: "Cap table (post-angel).pdf",
        category: "Cap table",
        size: "88 KB",
        confidential: true,
        addedAt: at(3800),
      },
      {
        id: "d3",
        startupId: MY_STARTUP_ID,
        name: "Product roadmap 2026.pdf",
        category: "Product",
        size: "1.2 MB",
        confidential: false,
        addedAt: at(2200),
      },
      {
        id: "d4",
        startupId: "s4",
        name: "Clinical trial summary.pdf",
        category: "Metrics",
        size: "760 KB",
        confidential: true,
        addedAt: at(900),
      },
    ],
    access: [
      {
        id: "a1",
        startupId: MY_STARTUP_ID,
        investorId: "i1",
        status: "granted",
        ndaSigned: true,
        ndaSignedName: "Anaya Krishnan",
        requestedAt: at(2500),
        downloads: 6,
      },
      {
        id: "a2",
        startupId: MY_STARTUP_ID,
        investorId: "i3",
        status: "pending",
        ndaSigned: false,
        ndaSignedName: "",
        requestedAt: at(140),
        downloads: 0,
      },
    ],
    programs: [
      {
        id: "p1",
        name: "Seed Sprint",
        cohort: "Autumn 2026",
        seats: 12,
        enrolled: ["s1", "s2", "s5"],
        mentor: "Dr. Meera Joshi",
        status: "running",
        startsOn: "2026-09-01",
      },
      {
        id: "p2",
        name: "Deep Tech Residency",
        cohort: "Autumn 2026",
        seats: 8,
        enrolled: ["s4"],
        mentor: "Prof. Alok Nair",
        status: "open",
        startsOn: "2026-10-05",
      },
      {
        id: "p3",
        name: "Investor Readiness Bootcamp",
        cohort: "Summer 2026",
        seats: 20,
        enrolled: ["s3", "s6"],
        mentor: "Kavya Rao",
        status: "closed",
        startsOn: "2026-05-12",
      },
    ],
    students: [
      {
        id: "u1",
        name: "Aayush Patil",
        email: "aayush@coep.ac.in",
        branch: "Computer Engineering",
        year: "Final year",
        startupId: "s1",
        verified: true,
      },
      {
        id: "u2",
        name: "Ishita Rane",
        email: "ishita@vjti.ac.in",
        branch: "Electronics",
        year: "Third year",
        startupId: "s2",
        verified: true,
      },
      {
        id: "u3",
        name: "Kabir Shah",
        email: "kabir@iiitb.ac.in",
        branch: "Information Technology",
        year: "Second year",
        startupId: "s3",
        verified: false,
      },
      {
        id: "u4",
        name: "Neha Verma",
        email: "neha@iitd.ac.in",
        branch: "Biomedical",
        year: "PhD",
        startupId: "s4",
        verified: true,
      },
      {
        id: "u5",
        name: "Rahul Iyer",
        email: "rahul@iiith.ac.in",
        branch: "Electrical",
        year: "Final year",
        startupId: "s5",
        verified: true,
      },
      {
        id: "u6",
        name: "Sana Qureshi",
        email: "sana@annauniv.edu",
        branch: "Computer Science",
        year: "Third year",
        startupId: "s6",
        verified: false,
      },
    ],
    notifications: [
      {
        id: "n1",
        role: "student",
        title: "Northbridge Seed viewed your profile",
        body: "Anaya Krishnan opened Lumen Labs twice this week.",
        at: at(35),
        read: false,
      },
      {
        id: "n2",
        role: "student",
        title: "Your startup was approved",
        body: "COEP Innovation Cell verified Lumen Labs.",
        at: at(400),
        read: false,
      },
      {
        id: "n3",
        role: "investor",
        title: "3 new startups match your thesis",
        body: "EdTech and SaaS founders published updates today.",
        at: at(90),
        read: false,
      },
      {
        id: "n4",
        role: "investor",
        title: "Data-room access granted",
        body: "NeuroPulse approved your request.",
        at: at(600),
        read: true,
      },
      {
        id: "n5",
        role: "university",
        title: "2 startups awaiting review",
        body: "CropSense and GridShift submitted profiles for verification.",
        at: at(20),
        read: false,
      },
      {
        id: "n6",
        role: "university",
        title: "Investor interest is up 24%",
        body: "Weekly ecosystem digest is ready.",
        at: at(1500),
        read: true,
      },
    ],
  };
}

const rid = (p: string) => `${p}${Math.random().toString(36).slice(2, 9)}`;

interface Ctx extends State {
  hydrated: boolean;
  unread: (role: Role) => number;
  notify: (role: Role, title: string, body: string) => void;
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
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...seed(), ...(JSON.parse(raw) as State) });
    } catch {
      /* corrupt storage: keep seed */
    }
    setHydrated(true);
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


  const notify = useCallback((role: Role, title: string, body: string) => {
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
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      notify,
      unread: (role) => state.notifications.filter((n) => n.role === role && !n.read).length,
      markAllRead: (role) =>
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.role === role ? { ...n, read: true } : n,
          ),
        })),
      updateStartup: (id, patch) =>
        setState((prev) => {
          const nextStartups = prev.startups.map((s) => (s.id === id ? { ...s, ...patch } : s));
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
      setReview: (id, status, note = "") =>
        setState((prev) => ({
          ...prev,
          startups: prev.startups.map((s) =>
            s.id === id ? { ...s, status, reviewNote: note, verified: status === "approved" } : s,
          ),
        })),
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
        const newId = rid("s");
        const newStartup: StartupRecord = {
          id: newId,
          name: startupData.name || "My Student Venture",
          tagline: startupData.tagline || "Innovating from campus",
          sector: startupData.sector || "AI",
          stage: startupData.stage || "MVP",
          location: startupData.location || "Maharashtra, India",
          university: startupData.university || "University",
          teamSize: startupData.teamSize || 2,
          fundingRequired: startupData.fundingRequired || 25000,
          revenue: startupData.revenue ?? false,
          monthlyUsers: startupData.monthlyUsers || 100,
          readiness: startupData.readiness || 65,
          verified: false,
          traction: startupData.traction || "Beta testing on campus",
          businessModel: startupData.businessModel || "B2B SaaS subscription",
          updatedAt: new Date().toISOString(),
          problem: startupData.problem || "",
          solution: startupData.solution || "",
          videoUrl: startupData.videoUrl || "",
          deckName: startupData.deckName || "",
          githubUrl: startupData.githubUrl || "",
          githubStars: startupData.githubStars || 0,
          status: "draft",
          reviewNote: "",
          views: 1,
          ...startupData,
        };
        setState((prev) => ({
          ...prev,
          startups: [newStartup, ...prev.startups],
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
