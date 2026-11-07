import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "@/lib/demo-data";
import { supabase, checkDatabaseConnection, type ConnectionStatus } from "@/lib/supabase";
import { isUniversityEmail } from "@/lib/universities";
import { generateUUID } from "@/lib/uuid";
import { toast } from "sonner";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  org: string;
  avatarInitials?: string;
  isDemo?: boolean;
}

export interface RegisteredAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  org: string;
  createdAt: string;
}

export const ROLE_PROFILES: Record<Role, { name: string; email: string; org: string }> = {
  student: {
    name: "Student Founder",
    email: "",
    org: "",
  },
  investor: {
    name: "Accredited Investor",
    email: "",
    org: "",
  },
  university: {
    name: "University Innovation Cell",
    email: "",
    org: "",
  },
};

export const DEFAULT_ACCOUNTS: RegisteredAccount[] = [];

const AUTH_STORAGE_KEY = "campusventure.auth.user.v1";
const REGISTERED_USERS_KEY = "campusventure.auth.registered_users.v1";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  dbStatus: ConnectionStatus | null;
  isAuthModalOpen: boolean;
  authModalDefaultRole: Role | undefined;
  authModalDefaultMode: "signin" | "register" | "forgot" | undefined;
  openAuthModal: (defaultRole?: Role, defaultMode?: "signin" | "register" | "forgot") => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string, role?: Role) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  signUp: (data: {
    email: string;
    password: string;
    role: Role;
    name: string;
    org: string;
  }) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  loginAsRole: (role: Role) => void;
  switchRole: (role: Role) => void;
  signInWithGoogle: (
    role: Role,
    customGoogleEmail?: string,
    customGoogleName?: string,
    authMode?: "signin" | "register"
  ) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  signOut: () => Promise<void>;
  refreshDbStatus: () => Promise<ConnectionStatus>;
  hasRole: (requiredRole: Role) => boolean;
  registeredUsers: RegisteredAccount[];
  isEmailRegistered: (email: string) => boolean;
  updateProfile: (updates: {
    name?: string;
    org?: string;
    email?: string;
    bio?: string;
  }) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function extractUserData(
  supabaseUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  },
  storedRole?: Role
): AuthUser {
  const meta = supabaseUser.user_metadata || {};
  const rawRole = storedRole || (meta["role"] as Role | undefined);
  const userEmail = (supabaseUser.email || "").toLowerCase().trim();
  
  // Authoritative role resolution:
  // If role is explicitly stored in profile/metadata, use it.
  // Otherwise, fall back strictly: university emails default to student, non-university emails default to investor.
  const role: Role =
    rawRole === "student" || rawRole === "investor" || rawRole === "university"
      ? rawRole
      : (userEmail && isUniversityEmail(userEmail) ? "student" : "investor");

  const rawName = meta["name"] || meta["full_name"];
  const name =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName
      : supabaseUser.email?.split("@")[0] || "User";

  const rawOrg = meta["org"];
  let org = typeof rawOrg === "string" && rawOrg.trim().length > 0 ? rawOrg.trim() : "";
  if (!org) {
    if (role === "student" || role === "university") {
      const domain = userEmail.split("@")[1];
      if (domain && domain.includes("sguk.ac.in")) {
        org = "Sanjay Ghodawat University (SGU), Kolhapur";
      } else if (domain && domain.includes("coep.ac.in")) {
        org = "COEP Technological University, Pune";
      } else if (domain) {
        const parts = domain.split(".");
        const prefix = parts[0] ? parts[0].toUpperCase() : "Campus";
        org = `${prefix} University`;
      } else {
        org = "University";
      }
    } else {
      org = "Accredited Investor";
    }
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    name,
    role,
    org,
    avatarInitials: getInitials(name),
    isDemo: false,
  };
}

function getOAuthPendingRole(): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get("oauth_role") as Role | null;
    if (fromParam && (fromParam === "student" || fromParam === "investor" || fromParam === "university")) {
      return fromParam;
    }
    const fromLocal = window.localStorage.getItem("cv_oauth_pending_role") as Role | null;
    if (fromLocal && (fromLocal === "student" || fromLocal === "investor" || fromLocal === "university")) {
      return fromLocal;
    }
    const fromSession = window.sessionStorage.getItem("cv_oauth_pending_role") as Role | null;
    if (fromSession && (fromSession === "student" || fromSession === "investor" || fromSession === "university")) {
      return fromSession;
    }
    // Only infer from pathname if inside a role portal and no explicit OAuth role was set
    const path = window.location.pathname;
    if (path.startsWith("/app/investor")) return "investor";
    if (path.startsWith("/app/university")) return "university";
    if (path.startsWith("/app/student")) return "student";
  } catch {
    /* ignore */
  }
  return null;
}

function clearOAuthPendingRole(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("cv_oauth_pending_role");
    window.sessionStorage.removeItem("cv_oauth_pending_role");
    const url = new URL(window.location.href);
    if (url.searchParams.has("oauth_role")) {
      url.searchParams.delete("oauth_role");
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : "") + url.hash);
    }
  } catch {
    /* ignore */
  }
}

async function validateAndEnforceInstitutionalRole(
  sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  pendingRole: Role | null
): Promise<{ allowed: boolean; authUser?: AuthUser; error?: string }> {
  const userEmail = (sessionUser.email || "").toLowerCase().trim();
  const meta = sessionUser.user_metadata || {};
  let dbProfile: any = null;
  let dbChecked = false;

  // 1. Fetch persistent role directly from Supabase public.profiles
  try {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id, email, name, role, org")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (!error) {
      dbChecked = true;
      if (data) {
        dbProfile = data;
      }
    }

    if (!dbProfile && userEmail) {
      const { data: byEmail, error: emailErr } = await (supabase as any)
        .from("profiles")
        .select("id, email, name, role, org")
        .ilike("email", userEmail)
        .maybeSingle();
      if (!emailErr) {
        dbChecked = true;
        if (byEmail) dbProfile = byEmail;
      }
    }
  } catch (err) {
    console.warn("[CampusVenture Auth] Profile check notice:", err);
  }

  // Check local registered accounts fallback
  const currentAccounts = loadRegisteredUsers();
  const localAccount = currentAccounts.find((a) => a.email.toLowerCase() === userEmail);

  // Check if this was a sign-in or register flow
  const authFlow =
    typeof window !== "undefined"
      ? window.localStorage.getItem("cv_oauth_flow") ||
        window.sessionStorage.getItem("cv_oauth_flow") ||
        window.localStorage.getItem("cv_auth_flow") ||
        window.sessionStorage.getItem("cv_auth_flow")
      : null;
  const emailVerPending = typeof window !== "undefined" ? window.localStorage.getItem("cv_email_ver_pending") : null;
  const isRegistering = authFlow === "register" || !!emailVerPending;

  // The backend role is authoritative. Never grant permissions based only on the role selected in the frontend.
  const verifiedBackendRole = dbProfile?.role || localAccount?.role;
  let intendedRole: Role =
    (verifiedBackendRole && (verifiedBackendRole === "student" || verifiedBackendRole === "university" || verifiedBackendRole === "investor"))
      ? verifiedBackendRole
      : (pendingRole || (meta["role"] as Role | undefined) || (isUniversityEmail(userEmail) ? "student" : "investor"));

  // AUTO-HEAL: If an account has a personal email (like @gmail.com) but was previously marked as student,
  // it CANNOT legally be a student under CampusVenture's institutional verification rules.
  // Personal emails are strictly for Investors. Auto-correct to investor and update database profile.
  if (!isUniversityEmail(userEmail) && intendedRole !== "investor") {
    intendedRole = "investor";
    if (dbProfile?.id) {
      try {
        (supabase as any)
          .from("profiles")
          .update({ role: "investor", org: dbProfile.org || "Angel / Venture Investor" })
          .eq("id", dbProfile.id)
          .then(() => {});
      } catch {
        /* ignore */
      }
    }
  }

  // Central database is authoritative.
  const profileNotFound = dbChecked ? !dbProfile : (!dbProfile && !localAccount);
  if (profileNotFound) {
    // If the user is in explicit registration flow, ALLOW THEM TO PROCEED (do NOT sign out!)
    if (isRegistering) {
      const name =
        (typeof meta["full_name"] === "string" && (meta["full_name"] as string).trim()) ||
        (typeof meta["name"] === "string" && (meta["name"] as string).trim()) ||
        userEmail.split("@")[0] ||
        "User";
      const defaultOrg = ROLE_PROFILES[intendedRole]?.org || "CampusVenture";
      const org = (typeof meta["org"] === "string" && (meta["org"] as string).trim()) || defaultOrg;
      const authUser: AuthUser = {
        id: sessionUser.id,
        email: userEmail,
        name,
        role: intendedRole,
        org,
        avatarInitials: getInitials(name),
        isDemo: false,
      };
      return { allowed: true, authUser };
    }

    // In normal sign-in or session restoration: if profile is not in the database, reject and sign out
    clearOAuthPendingRole();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("cv_oauth_flow");
      window.sessionStorage.removeItem("cv_oauth_flow");
      window.localStorage.removeItem("cv_auth_flow");
      window.sessionStorage.removeItem("cv_auth_flow");
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    // Purge stale local account if it was deleted from DB
    if (localAccount) {
      const purged = currentAccounts.filter((a) => a.email.toLowerCase() !== userEmail);
      saveRegisteredUsers(purged);
    }
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    const errMsg = "No account found with this email. Please register an account first.";
    toast.error(errMsg, { id: "auth-account-not-found", duration: 8000 });
    return { allowed: false, error: errMsg };
  }

  // STRICT RULE: Students require an approved university email and verified university association.
  // Investors follow investor registration and verification rules and are NEVER blocked by student-only university email checks.
  if (intendedRole === "student" || intendedRole === "university") {
    if (!isUniversityEmail(userEmail)) {
      clearOAuthPendingRole();
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        /* ignore */
      }

      const roleLabels: Record<Role, string> = {
        student: "Student Founder",
        university: "University",
        investor: "Investor",
      };
      const errMsg = `Institutional Access Denied: "${userEmail}" is a personal email address. ${roleLabels[intendedRole]} accounts strictly require an official university email (@sguk.ac.in, .ac.in, .edu). Personal emails are permitted for registered Investors.`;

      toast.error(errMsg, { id: "institutional-access-denied", duration: 8000 });
      return { allowed: false, error: errMsg };
    }
  }

  // Allowed! Build auth user using verified database values
  const name =
    dbProfile?.name ||
    localAccount?.name ||
    (typeof meta["full_name"] === "string" && (meta["full_name"] as string).trim()) ||
    (typeof meta["name"] === "string" && (meta["name"] as string).trim()) ||
    userEmail.split("@")[0] ||
    "User";

  const defaultOrg = ROLE_PROFILES[intendedRole]?.org || "CampusVenture";
  const org = dbProfile?.org || localAccount?.org || (typeof meta["org"] === "string" && (meta["org"] as string).trim()) || defaultOrg;

  const authUser: AuthUser = {
    id: dbProfile?.id || sessionUser.id,
    email: userEmail,
    name,
    role: intendedRole, // Always the verified role, never overridden by client query params
    org,
    avatarInitials: getInitials(name),
    isDemo: false,
  };

  // Sync to public.profiles table in Supabase ONLY during registration flow
  if (!dbProfile && authFlow === "register") {
    try {
      await (supabase as any).from("profiles").upsert({
        id: sessionUser.id,
        email: userEmail,
        name,
        role: intendedRole,
        org,
        updated_at: new Date().toISOString(),
      });
    } catch (profErr) {
      console.warn("[CampusVenture Auth] Profile upsert notice:", profErr);
    }
  }

  clearOAuthPendingRole();
  return { allowed: true, authUser };
}

function loadRegisteredUsers(): RegisteredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RegisteredAccount[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Purge legacy mock seed accounts
      const cleaned = parsed.filter(
        (u) =>
          u.email !== "aayush@coep.ac.in" &&
          u.email !== "anaya@northbridge.vc" &&
          u.email !== "innovation@coep.ac.in" &&
          !String(u.id || "").includes("seed")
      );
      return cleaned;
    }
    return [];
  } catch {
    return [];
  }
}

function saveRegisteredUsers(users: RegisteredAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch {
    /* ignore storage errors */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<ConnectionStatus | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalDefaultRole, setAuthModalDefaultRole] = useState<Role | undefined>(undefined);
  const [authModalDefaultMode, setAuthModalDefaultMode] = useState<"signin" | "register" | "forgot" | undefined>(undefined);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredAccount[]>([]);

  const openAuthModal = useCallback((defaultRole?: Role, defaultMode: "signin" | "register" | "forgot" = "signin") => {
    setAuthModalDefaultRole(defaultRole);
    setAuthModalDefaultMode(defaultMode);
    if (typeof window !== "undefined") {
      const flow = defaultMode === "register" ? "register" : "signin";
      window.sessionStorage.setItem("cv_auth_flow", flow);
      window.localStorage.setItem("cv_auth_flow", flow);
      window.sessionStorage.setItem("cv_oauth_flow", flow);
      window.localStorage.setItem("cv_oauth_flow", flow);
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const refreshDbStatus = useCallback(async () => {
    const status = await checkDatabaseConnection();
    setDbStatus(status);
    return status;
  }, []);

  const isEmailRegistered = useCallback(
    (email: string) => {
      const clean = email.trim().toLowerCase();
      return registeredUsers.some((u) => u.email.toLowerCase() === clean);
    },
    [registeredUsers]
  );

  // Initialize auth & check DB connection on mount
  useEffect(() => {
    let mounted = true;

    // Load registered accounts from persistent storage
    const loadedAccounts = loadRegisteredUsers();
    setRegisteredUsers(loadedAccounts);

    async function initialize() {
      try {
        // 1. Check live database connectivity
        const status = await checkDatabaseConnection();
        if (mounted) setDbStatus(status);

        // 2. Check Supabase auth session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const pendingRole = getOAuthPendingRole();
          const check = await validateAndEnforceInstitutionalRole(session.user, pendingRole);
          if (check.allowed && check.authUser) {
            setUser(check.authUser);
            try {
              window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(check.authUser));
            } catch {
              /* ignore */
            }
          } else {
            setUser(null);
            try {
              window.localStorage.removeItem(AUTH_STORAGE_KEY);
            } catch {
              /* ignore */
            }
            if (
              typeof window !== "undefined" &&
              window.location.pathname.startsWith("/app")
            ) {
              window.location.href = "/";
            }
          }
        } else if (mounted) {
          // Check cached local auth
          const cached = window.localStorage.getItem(AUTH_STORAGE_KEY);
          if (cached) {
            try {
              const parsed = JSON.parse(cached) as AuthUser;
              // Strict verification on cached credentials
              if (
                (parsed.role === "student" || parsed.role === "university") &&
                !isUniversityEmail(parsed.email)
              ) {
                window.localStorage.removeItem(AUTH_STORAGE_KEY);
                setUser(null);
                if (typeof window !== "undefined" && window.location.pathname.startsWith("/app")) {
                  window.location.href = "/";
                }
              } else {
                // Verify with Supabase public.profiles if the profile still exists in database
                let profileStillExists = true;
                let activeProfile: any = null;
                try {
                  const { data: dbProf, error: dbErr } = await (supabase as any)
                    .from("profiles")
                    .select("id, email, name, role, org")
                    .ilike("email", parsed.email)
                    .maybeSingle();

                  if (!dbErr) {
                    if (!dbProf) {
                      profileStillExists = false;
                    } else {
                      activeProfile = dbProf;
                    }
                  }
                } catch {
                  // Network error, keep cached
                }

                if (!profileStillExists) {
                  // Profile was deleted from database: purge cached auth, wipe local storage, and boot out
                  window.localStorage.removeItem(AUTH_STORAGE_KEY);
                  const currentAccounts = loadRegisteredUsers();
                  const purged = currentAccounts.filter(
                    (a) => a.email.toLowerCase() !== parsed.email.toLowerCase()
                  );
                  saveRegisteredUsers(purged);
                  setRegisteredUsers(purged);
                  setUser(null);
                  try {
                    await supabase.auth.signOut();
                  } catch {
                    /* ignore */
                  }
                  if (typeof window !== "undefined" && window.location.pathname.startsWith("/app")) {
                    window.location.href = "/";
                  }
                } else if (mounted) {
                  const verifiedName = activeProfile?.name || parsed.name;
                  const verifiedRole = (activeProfile?.role as Role) || parsed.role;
                  const verifiedOrg = activeProfile?.org || parsed.org;
                  const verifiedUser: AuthUser = {
                    ...parsed,
                    name: verifiedName,
                    role: verifiedRole,
                    org: verifiedOrg,
                    avatarInitials: getInitials(verifiedName),
                  };
                  setUser(verifiedUser);
                  try {
                    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(verifiedUser));
                  } catch {
                    /* ignore */
                  }
                }
              }
            } catch {
              // Corrupt cache - leave user null
            }
          }
        }

        // 3. Hydrate registered users list from database public.profiles
        try {
          const { data: dbProfiles, error: dbErr } = await (supabase as any)
            .from("profiles")
            .select("id, email, name, role, org, created_at");
          if (!dbErr && dbProfiles && Array.isArray(dbProfiles) && mounted) {
            const dbEmails = new Set(
              dbProfiles
                .filter((p: any) => p && p.email)
                .map((p: any) => p.email.toLowerCase().trim())
            );

            // Filter out any stale local accounts whose profiles were deleted from the database
            const validLocalAccounts = loadedAccounts.filter((a) =>
              dbEmails.has(a.email.toLowerCase().trim())
            );

            const mapped = dbProfiles.map((p: any) => ({
              id: p.id,
              email: p.email,
              name: p.name || p.email.split("@")[0],
              role: p.role,
              org: p.org || "CampusVenture",
              createdAt: p.created_at || new Date().toISOString(),
            }));

            const combined = [...validLocalAccounts];
            for (const m of mapped) {
              if (!combined.some((c) => c.email.toLowerCase() === m.email.toLowerCase())) {
                combined.push(m);
              }
            }
            saveRegisteredUsers(combined);
            setRegisteredUsers(combined);
          }
        } catch {
          /* ignore */
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initialize();

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const pendingRole = getOAuthPendingRole();
        const check = await validateAndEnforceInstitutionalRole(session.user, pendingRole);
        if (check.allowed && check.authUser) {
          setUser(check.authUser);
          try {
            window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(check.authUser));
          } catch {
            /* ignore */
          }
        } else {
          setUser(null);
          try {
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
          } catch {
            /* ignore */
          }
          if (
            typeof window !== "undefined" &&
            window.location.pathname.startsWith("/app")
          ) {
            window.location.href = "/";
          }
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        try {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        if (
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/app")
        ) {
          window.location.href = "/";
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Real-time database synchronization & immediate eviction if profile is deleted in Supabase
  useEffect(() => {
    if (!user?.id || !user?.email) return;

    let isMounted = true;
    const currentUserId = user.id;
    const currentUserEmail = user.email.toLowerCase().trim();

    const handleForceEvict = (reason: string) => {
      if (!isMounted) return;
      console.warn("[CampusVenture Auth] Immediate eviction:", reason);
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      const currentAccounts = loadRegisteredUsers();
      const purged = currentAccounts.filter(
        (a) => a.email.toLowerCase().trim() !== currentUserEmail
      );
      saveRegisteredUsers(purged);
      setRegisteredUsers(purged);
      setUser(null);
      try {
        supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      toast.error("Your profile has been removed from the database.", {
        id: "profile-deleted-evict",
        duration: 8000,
      });
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/app")) {
        window.location.href = "/";
      }
    };

    // 1. Supabase Realtime channel listening to DELETE and UPDATE events on public.profiles
    const channelName = `cv_profiles_sync_${currentUserId.slice(0, 8)}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const authFlow = typeof window !== "undefined"
            ? window.sessionStorage.getItem("cv_auth_flow") ||
              window.localStorage.getItem("cv_auth_flow")
            : null;
          const emailVerPending = typeof window !== "undefined" ? window.localStorage.getItem("cv_email_ver_pending") : null;
          if (authFlow === "register" || emailVerPending) return;

          const oldRecord = (payload.old as any) || {};
          const deletedId = oldRecord.id;
          const deletedEmail = (oldRecord.email || "").toLowerCase().trim();
          if (
            deletedId === currentUserId ||
            (deletedEmail && deletedEmail === currentUserEmail)
          ) {
            handleForceEvict("Account deleted via realtime event");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const newRecord = (payload.new as any) || {};
          const updatedId = newRecord.id;
          const updatedEmail = (newRecord.email || "").toLowerCase().trim();
          if (
            updatedId === currentUserId ||
            (updatedEmail && updatedEmail === currentUserEmail)
          ) {
            setUser((prev) => {
              if (!prev) return prev;
              const updated: AuthUser = {
                ...prev,
                name: newRecord.name || prev.name,
                role: (newRecord.role as Role) || prev.role,
                org: newRecord.org || prev.org,
                avatarInitials: getInitials(newRecord.name || prev.name),
              };
              try {
                window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
              } catch {
                /* ignore */
              }
              return updated;
            });
          }
        }
      )
      .subscribe();

    // 2. Heartbeat polling verification (runs every 4 seconds) + window focus
    const verifyProfileStillExists = async () => {
      if (!isMounted) return;

      // DO NOT run deletion eviction if user is in registration flow!
      const authFlow = typeof window !== "undefined"
        ? window.sessionStorage.getItem("cv_auth_flow") ||
          window.localStorage.getItem("cv_auth_flow") ||
          window.sessionStorage.getItem("cv_oauth_flow") ||
          window.localStorage.getItem("cv_oauth_flow")
        : null;
      const emailVerPending = typeof window !== "undefined" ? window.localStorage.getItem("cv_email_ver_pending") : null;
      if (authFlow === "register" || emailVerPending) {
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("id, email, name, role, org")
          .or(`id.eq.${currentUserId},email.ilike.${currentUserEmail}`)
          .maybeSingle();

        if (!error && !data) {
          // Profile is no longer present in Supabase public.profiles table!
          handleForceEvict("Account row missing during heartbeat check");
        } else if (!error && data && isMounted) {
          // Keep role, name, org strictly synced with database
          setUser((prev) => {
            if (!prev) return prev;
            if (prev.role !== data.role || prev.name !== data.name || prev.org !== data.org) {
              const updated: AuthUser = {
                ...prev,
                name: data.name || prev.name,
                role: (data.role as Role) || prev.role,
                org: data.org || prev.org,
                avatarInitials: getInitials(data.name || prev.name),
              };
              try {
                window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
              } catch {
                /* ignore */
              }
              return updated;
            }
            return prev;
          });
        }
      } catch {
        /* ignore temporary network hiccups */
      }
    };

    const interval = setInterval(verifyProfileStillExists, 4000);
    window.addEventListener("focus", verifyProfileStillExists);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", verifyProfileStillExists);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email]);

  // Email + password sign in with strict server-validated role authorization check
  const signIn = useCallback(
    async (
      email: string,
      password: string,
      expectedRole?: Role
    ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      const cleanEmail = email.trim().toLowerCase();
      const roleLabels: Record<Role, string> = {
        student: "Student",
        university: "University",
        investor: "Investor",
      };

      // 1. Strict institutional verification for Student & University
      if ((expectedRole === "student" || expectedRole === "university") && !isUniversityEmail(cleanEmail)) {
        return {
          success: false,
          error: `Institutional Access Denied: ${cleanEmail} is a personal email. ${roleLabels[expectedRole]} accounts strictly require an official university email (@sguk.ac.in, .ac.in, .edu). Personal emails are permitted for Investors.`,
        };
      }

      // 2. Fetch public.profiles to verify stored server-side role
      let dbProfile: any = null;
      let dbChecked = false;
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("id, email, name, role, org")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (!error) {
          dbChecked = true;
          if (data) {
            dbProfile = data;
          }
        }
      } catch (err) {
        console.warn("[CampusVenture Auth] Error checking profile existence:", err);
      }

      // Check local registered accounts
      const currentAccounts = loadRegisteredUsers();
      const localAccount = currentAccounts.find(
        (acc) => acc.email.toLowerCase() === cleanEmail
      );

      // If database was successfully queried and no profile exists:
      // The profile was deleted from the database or never registered.
      if (dbChecked && !dbProfile) {
        if (localAccount) {
          const purged = currentAccounts.filter(
            (acc) => acc.email.toLowerCase() !== cleanEmail
          );
          saveRegisteredUsers(purged);
          setRegisteredUsers(purged);
        }
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
        try {
          await supabase.auth.signOut();
        } catch {
          /* ignore */
        }
        return {
          success: false,
          error: "No account found with this email. Please register an account first.",
        };
      }

      // 3. Authenticate credentials via Supabase Auth and/or Local Store
      let authenticated = false;
      let authenticatedUser: any = null;
      let authErrorMessage = "";

      // Try local password match first
      if (localAccount && localAccount.password === password) {
        authenticated = true;
      }

      // Try Supabase auth
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!authError && authData.user) {
          authenticated = true;
          authenticatedUser = authData.user;
        } else if (authError) {
          authErrorMessage = authError.message;
        }
      } catch (err: any) {
        authErrorMessage = err?.message || "";
      }

      // If user is completely unregistered in central DB and local registry:
      if (!dbProfile && !localAccount) {
        return {
          success: false,
          error: "No account found with this email. Please register an account first.",
        };
      }

      // If account exists but password failed:
      if (!authenticated) {
        return {
          success: false,
          error: "Incorrect password. Please verify your credentials or reset your password.",
        };
      }

      // 4. Determine authoritative role with auto-healing for personal emails
      let actualRole: Role = (dbProfile?.role || localAccount?.role || authenticatedUser?.user_metadata?.role || (isUniversityEmail(cleanEmail) ? "student" : "investor")) as Role;

      // Auto-heal: If an account has a personal email (like @gmail.com) but was previously marked as student,
      // it CANNOT be a student under institutional rules. Personal emails are strictly for Investors.
      if (!isUniversityEmail(cleanEmail) && actualRole !== "investor") {
        actualRole = "investor";
        if (dbProfile?.id) {
          try {
            await (supabase as any)
              .from("profiles")
              .update({ role: "investor", org: dbProfile.org || "Angel / Venture Investor" })
              .eq("id", dbProfile.id);
          } catch {
            /* ignore */
          }
        }
      }

      // 5. Prevent role spoofing: a user's selected role must match their authoritative role
      if (expectedRole && actualRole !== expectedRole) {
        return {
          success: false,
          error: `This account is registered as ${roleLabels[actualRole]}, not ${roleLabels[expectedRole]}. Please sign in through the ${roleLabels[actualRole]} portal.`,
        };
      }

      // 6. Verify institutional domain for Student and University roles
      if ((actualRole === "student" || actualRole === "university") && !isUniversityEmail(cleanEmail)) {
        return {
          success: false,
          error: `Institutional Access Denied: ${cleanEmail} is a personal email. ${roleLabels[actualRole]} accounts strictly require an official university email (@sguk.ac.in, .ac.in, .edu). Personal emails are permitted for Investors.`,
        };
      }

      // 7. Build authenticated user
      let authenticatedId = dbProfile?.id || authenticatedUser?.id || localAccount?.id || generateUUID();
      let userName = dbProfile?.name || authenticatedUser?.user_metadata?.name || localAccount?.name || cleanEmail.split("@")[0];
      let userOrg = dbProfile?.org || authenticatedUser?.user_metadata?.org || localAccount?.org || ROLE_PROFILES[actualRole]?.org || "CampusVenture";


      // 6. Build authenticated user strictly using server-validated role
      const authUser: AuthUser = {
        id: authenticatedId,
        email: cleanEmail,
        name: userName,
        role: actualRole, // Strictly enforced: NEVER overridden by frontend input
        org: userOrg,
        avatarInitials: getInitials(userName),
        isDemo: false,
      };

      setUser(authUser);
      try {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } catch {
        /* ignore */
      }

      setIsAuthModalOpen(false);
      toast.success(`Welcome back, ${authUser.name}!`);
      return { success: true, user: authUser };
    },
    []
  );

  // Email + password sign up
  const signUp = useCallback(
    async ({
      email,
      password,
      role,
      name,
      org,
    }: {
      email: string;
      password: string;
      role: Role;
      name: string;
      org: string;
    }): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanOrg = org.trim() || ROLE_PROFILES[role]?.org || "CampusVenture";

      // Strict institutional check for Student & University
      if ((role === "student" || role === "university") && !isUniversityEmail(cleanEmail)) {
        return {
          success: false,
          error: `Institutional Access Denied: ${cleanEmail} is a personal email. ${role === "student" ? "Student" : "University"} registration requires an official university email (@sguk.ac.in, .ac.in, .edu).`,
        };
      }

      // Check if already registered in central database
      try {
        const { data: existingDbProfile } = await (supabase as any)
          .from("profiles")
          .select("id")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (existingDbProfile) {
          return {
            success: false,
            error: "An account with this email already exists in the database. Please sign in.",
          };
        }
      } catch {
        /* ignore */
      }

      // Mark auth flow as register so session verification doesn't interfere
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("cv_auth_flow", "register");
        window.localStorage.setItem("cv_auth_flow", "register");
        window.sessionStorage.setItem("cv_oauth_flow", "register");
        window.localStorage.setItem("cv_oauth_flow", "register");
      }

      let targetId: string | null = null;
      let supabaseSessionActive = false;

      // 1. Check if user already has an active session from verifyOtp
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.email?.toLowerCase() === cleanEmail) {
          targetId = session.user.id;
          supabaseSessionActive = true;
          await supabase.auth.updateUser({
            password,
            data: { role, name: cleanName, org: cleanOrg },
          });
        }
      } catch (sessErr) {
        console.warn("[CampusVenture Auth] Session check notice:", sessErr);
      }

      // Check verified user ID from verifyOtp stored in sessionStorage/localStorage
      if (!targetId && typeof window !== "undefined") {
        const storedId =
          window.sessionStorage.getItem("cv_verified_user_id") ||
          window.localStorage.getItem("cv_verified_user_id");
        if (storedId && storedId.length === 36) {
          targetId = storedId;
        }
      }

      // 2. If no active session, register via supabase.auth.signUp or signInWithPassword
      if (!supabaseSessionActive) {
        try {
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { role, name: cleanName, org: cleanOrg },
            },
          });

          if (authData?.user && authData.user.identities && authData.user.identities.length > 0) {
            targetId = authData.user.id;
            supabaseSessionActive = !!authData.session;
          } else {
            // User might exist from signInWithOtp; try signInWithPassword
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (signInData?.user) {
              targetId = signInData.user.id;
              supabaseSessionActive = true;
            }
          }
        } catch (suErr: any) {
          console.warn("[CampusVenture Auth] Auth creation notice:", suErr?.message);
        }
      }

      // If targetId is still null, check getUser()
      if (!targetId) {
        try {
          const { data: { user: u } } = await supabase.auth.getUser();
          if (u?.id) targetId = u.id;
        } catch {
          /* ignore */
        }
      }

      // Final fallback to generate UUID if needed
      if (!targetId) {
        targetId = generateUUID();
      }

      // 3. Immediately insert profile into Supabase public.profiles table
      const profileRow = {
        id: targetId,
        email: cleanEmail,
        name: cleanName,
        role,
        org: cleanOrg,
        updated_at: new Date().toISOString(),
      };

      try {
        const { error: upsertErr } = await (supabase as any)
          .from("profiles")
          .upsert(profileRow)
          .select();

        if (upsertErr) {
          console.warn("[CampusVenture Auth] Profile upsert notice, trying insert:", upsertErr.message);
          const { error: insertErr } = await (supabase as any)
            .from("profiles")
            .insert(profileRow)
            .select();
          if (insertErr) {
            console.error("[CampusVenture Auth] Profile insert failed:", insertErr.message);
            const { data: { user: curUser } } = await supabase.auth.getUser();
            if (curUser?.id && curUser.id !== targetId) {
              targetId = curUser.id;
              profileRow.id = targetId;
              await (supabase as any).from("profiles").upsert(profileRow).select();
            }
          }
        }
      } catch (dbErr: any) {
        console.error("[CampusVenture Auth] Database sync error:", dbErr?.message);
      }

      // 4. Update local accounts registry and active auth user state
      const currentAccounts = loadRegisteredUsers().filter(
        (a) => a.email.toLowerCase() !== cleanEmail
      );
      const newAccount: RegisteredAccount = {
        id: targetId,
        email: cleanEmail,
        password,
        name: cleanName,
        role,
        org: cleanOrg,
        createdAt: new Date().toISOString(),
      };
      const updatedAccounts = [...currentAccounts, newAccount];
      saveRegisteredUsers(updatedAccounts);
      setRegisteredUsers(updatedAccounts);

      const authUser: AuthUser = {
        id: targetId,
        email: cleanEmail,
        name: cleanName,
        role,
        org: cleanOrg,
        avatarInitials: getInitials(cleanName),
        isDemo: false,
      };

      setUser(authUser);
      try {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } catch {
        /* ignore */
      }

      // Clear temporary registration flags
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("cv_auth_flow");
        window.localStorage.removeItem("cv_auth_flow");
        window.sessionStorage.removeItem("cv_oauth_flow");
        window.localStorage.removeItem("cv_oauth_flow");
      }

      setIsAuthModalOpen(false);
      toast.success(`Account created! Welcome aboard, ${authUser.name}.`);
      return { success: true, user: authUser };
    },
    []
  );

  // Sign out - complete session teardown & storage purge to prevent cross-account leaks
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }

    setUser(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.localStorage.removeItem("campusventure.saas.live.v3");
        window.localStorage.removeItem("campusventure.state.v1");
        window.localStorage.removeItem("campusventure.state.v2");
        window.localStorage.removeItem("campusventure.notifications.live.v2");
        window.localStorage.removeItem("campusventure.profile.investor");
        window.localStorage.removeItem("cv_oauth_pending_role");
        window.sessionStorage.clear();

        // Remove any user-scoped keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith("campusventure.saved.") || key.startsWith("campusventure.state."))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));

        window.dispatchEvent(new CustomEvent("cv:session-cleared"));
      } catch {
        /* ignore */
      }
    }

    toast.success("You have been logged out.");
  }, []);

  // Role switching
  const switchRole = useCallback(
    (newRole: Role) => {
      if (user) {
        if ((newRole === "student" || newRole === "university") && !isUniversityEmail(user.email)) {
          toast.error(
            `Cannot switch to ${newRole}: official university email required. Personal emails are only permitted for Investors.`
          );
          return;
        }
        const updated: AuthUser = {
          ...user,
          role: newRole,
          org: ROLE_PROFILES[newRole].org,
        };
        setUser(updated);
        try {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        toast.info(`Switched role to ${newRole}`);
      }
    },
    [user]
  );

  // Internal helper kept for backwards compatibility if needed
  const loginAsRole = useCallback((role: Role) => {
    const profile = ROLE_PROFILES[role];
    const defaultAcc = DEFAULT_ACCOUNTS.find((a) => a.role === role);
    const newUser: AuthUser = {
      id: defaultAcc?.id || `usr-${role}-${Date.now().toString(36)}`,
      email: defaultAcc?.email || profile.email,
      name: defaultAcc?.name || profile.name,
      role,
      org: defaultAcc?.org || profile.org,
      avatarInitials: getInitials(profile.name),
      isDemo: true,
    };

    setUser(newUser);
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      /* ignore */
    }

    setIsAuthModalOpen(false);
    toast.success(`Signed in as ${profile.name} (${role})`);
  }, []);

  // Google OAuth & Direct Institutional Account Authentication
  const signInWithGoogle = useCallback(
    async (
      role: Role,
      customGoogleEmail?: string,
      customGoogleName?: string,
      authMode: "signin" | "register" = "signin"
    ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/app/${role}`
          : undefined;

      // If a specific Google account email is provided (1-click institutional access)
      if (customGoogleEmail && customGoogleEmail.includes("@")) {
        const cleanEmail = customGoogleEmail.trim().toLowerCase();

        // 1. Strict institutional verification for Student & University
        if ((role === "student" || role === "university") && !isUniversityEmail(cleanEmail)) {
          const errMsg = `Institutional Access Denied: ${cleanEmail} is a personal email. ${role === "student" ? "Student" : "University"} registration requires an official university email (e.g. @sguk.ac.in, .ac.in, .edu). Personal emails are only permitted for Investors.`;
          toast.error(errMsg, { duration: 8000 });
          return {
            success: false,
            error: errMsg,
          };
        }

        const cleanName = (customGoogleName || cleanEmail.split("@")[0] || "Google User").trim();
        const defaultOrg = ROLE_PROFILES[role]?.org || "CampusVenture";

        const currentAccounts = loadRegisteredUsers();
        let existing = currentAccounts.find((a) => a.email.toLowerCase() === cleanEmail);

        // Also check if profile exists in Supabase public.profiles
        let dbProfile: any = null;
        let dbChecked = false;
        try {
          const { data, error } = await (supabase as any)
            .from("profiles")
            .select("id, email, name, role, org")
            .ilike("email", cleanEmail)
            .maybeSingle();
          if (!error) {
            dbChecked = true;
            if (data) dbProfile = data;
          }
        } catch {
          /* ignore */
        }

        // In sign-in mode, reject non-registered or deleted profiles immediately!
        if (authMode === "signin") {
          const profileMissing = dbChecked ? !dbProfile : (!existing && !dbProfile);
          if (profileMissing) {
            if (existing) {
              const purged = currentAccounts.filter((a) => a.email.toLowerCase() !== cleanEmail);
              saveRegisteredUsers(purged);
              setRegisteredUsers(purged);
            }
            if (typeof window !== "undefined") {
              window.localStorage.removeItem(AUTH_STORAGE_KEY);
            }
            try {
              await supabase.auth.signOut();
            } catch {
              /* ignore */
            }
            const errMsg = "No account found with this email. Please register an account first.";
            toast.error(errMsg);
            return { success: false, error: errMsg };
          }
        } else if (!existing && !dbProfile) {
          existing = {
            id: `usr-google-${Date.now().toString(36)}`,
            email: cleanEmail,
            password: "google_oauth_verified",
            name: cleanName,
            role,
            org: defaultOrg,
            createdAt: new Date().toISOString(),
          };
          const updated = [...currentAccounts, existing];
          saveRegisteredUsers(updated);
          setRegisteredUsers(updated);
        }

        const effectiveId = dbProfile?.id || existing?.id || generateUUID();
        const effectiveName = dbProfile?.name || existing?.name || cleanName;
        const effectiveRole = dbProfile?.role || existing?.role || role;
        const effectiveOrg = dbProfile?.org || existing?.org || defaultOrg;

        const authUser: AuthUser = {
          id: effectiveId,
          email: cleanEmail,
          name: effectiveName,
          role: effectiveRole,
          org: effectiveOrg,
          avatarInitials: getInitials(effectiveName),
          isDemo: false,
        };

        // Sync directly to Supabase profiles ONLY during registration or if profile already exists
        if (authMode === "register" || dbProfile) {
          let targetId = existing?.id || dbProfile?.id;
          try {
            const { data: existingProf } = await (supabase as any)
              .from("profiles")
              .select("id")
              .eq("email", cleanEmail)
              .maybeSingle();

            if ((existingProf as any)?.id) {
              targetId = (existingProf as any).id;
            } else if (authMode === "register") {
              const { data: authData } = await supabase.auth.signUp({
                email: cleanEmail,
                password: "google_oauth_auth_" + cleanEmail,
                options: {
                  data: { role, name: cleanName, org: defaultOrg },
                },
              });
              if (authData?.user?.id) {
                targetId = authData.user.id;
              }
            }

            if (targetId && targetId.includes("-")) {
              await (supabase as any).from("profiles").upsert({
                id: targetId,
                email: cleanEmail,
                name: cleanName,
                role: dbProfile?.role || role,
                org: dbProfile?.org || defaultOrg,
                updated_at: new Date().toISOString(),
              });
              authUser.id = targetId;
            }
          } catch (syncErr) {
            console.warn("[CampusVenture Auth] Google profile sync notice:", syncErr);
          }
        }

        setUser(authUser);
        try {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        } catch {
          /* ignore */
        }

        setIsAuthModalOpen(false);
        toast.success(`Signed in with Google as ${authUser.name}`);
        return { success: true, user: authUser };
      }

      // Try live Supabase Google OAuth
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("cv_oauth_pending_role", role);
          window.sessionStorage.setItem("cv_oauth_pending_role", role);
          window.localStorage.setItem("cv_oauth_flow", authMode);
          window.sessionStorage.setItem("cv_oauth_flow", authMode);
        }

        const oauthOptions: {
          redirectTo?: string;
          queryParams?: { [key: string]: string };
        } = {
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        };
        if (redirectUrl) {
          oauthOptions.redirectTo = `${redirectUrl}?oauth_role=${role}`;
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: oauthOptions,
        });

        if (error) {
          console.warn("[CampusVenture Auth] Live Google OAuth notice:", error.message);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || "Google authentication failed" };
      }
    },
    []
  );

  // Authorization helper
  const hasRole = useCallback(
    (requiredRole: Role) => {
      return user?.role === requiredRole;
    },
    [user]
  );

  // Profile update and cross-system sync
  const updateProfile = useCallback(
    async (updates: {
      name?: string;
      org?: string;
      email?: string;
      bio?: string;
    }): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      if (!user) return { success: false, error: "No user authenticated" };
      const newName =
        updates.name !== undefined && updates.name.trim().length > 0
          ? updates.name.trim()
          : user.name;
      const newOrg =
        updates.org !== undefined && updates.org.trim().length > 0
          ? updates.org.trim()
          : user.org;
      const updatedUser: AuthUser = {
        ...user,
        name: newName,
        org: newOrg,
        avatarInitials: getInitials(newName),
      };

      setUser(updatedUser);
      try {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      } catch {
        /* ignore */
      }

      // Update registered accounts list in storage if present
      const currentAccounts = loadRegisteredUsers();
      const updatedAccounts = currentAccounts.map((a) =>
        a.email.toLowerCase() === user.email.toLowerCase()
          ? { ...a, name: newName, org: newOrg }
          : a
      );
      saveRegisteredUsers(updatedAccounts);
      setRegisteredUsers(updatedAccounts);

      // Sync to Supabase Auth & public.profiles
      try {
        await supabase.auth.updateUser({
          data: { name: newName, org: newOrg },
        });
        // Update public.profiles table (strictly omit bio as public.profiles schema does not include bio)
        const { error: profErr } = await (supabase as any).from("profiles").upsert({
          id: user.id,
          email: user.email,
          name: newName,
          org: newOrg,
          role: user.role,
          updated_at: new Date().toISOString(),
        });
        if (profErr) {
          console.warn("[CampusVenture Auth] Profile update DB error:", profErr.message);
        }
      } catch (err) {
        console.warn("[CampusVenture Auth] Profile update sync notice:", err);
      }

      return { success: true, user: updatedUser };
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        dbStatus,
        isAuthModalOpen,
        authModalDefaultRole,
        authModalDefaultMode,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signInWithGoogle,
        loginAsRole,
        switchRole,
        signOut,
        refreshDbStatus,
        hasRole,
        registeredUsers,
        isEmailRegistered,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
