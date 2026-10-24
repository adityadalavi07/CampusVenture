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
    name: "Aayush Patil",
    email: "aayush@coep.ac.in",
    org: "COEP Technological University",
  },
  investor: {
    name: "Anaya Krishnan",
    email: "anaya@northbridge.vc",
    org: "Northbridge Seed",
  },
  university: {
    name: "COEP Innovation Cell",
    email: "innovation@coep.ac.in",
    org: "COEP Technological University",
  },
};

export const DEFAULT_ACCOUNTS: RegisteredAccount[] = [
  {
    id: "usr-student-seed",
    name: "Aayush Patil",
    email: "aayush@coep.ac.in",
    password: "Password123",
    role: "student",
    org: "COEP Technological University",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr-investor-seed",
    name: "Anaya Krishnan",
    email: "anaya@northbridge.vc",
    password: "Password123",
    role: "investor",
    org: "Northbridge Seed",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr-university-seed",
    name: "COEP Innovation Cell",
    email: "innovation@coep.ac.in",
    password: "Password123",
    role: "university",
    org: "COEP Technological University",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const AUTH_STORAGE_KEY = "campusventure.auth.user.v1";
const REGISTERED_USERS_KEY = "campusventure.auth.registered_users.v1";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  dbStatus: ConnectionStatus | null;
  isAuthModalOpen: boolean;
  authModalDefaultRole: Role | undefined;
  authModalDefaultMode: "signin" | "register" | undefined;
  openAuthModal: (defaultRole?: Role, defaultMode?: "signin" | "register") => void;
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
    customGoogleName?: string
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
  
  // NEVER silently default to investor. If role is explicitly stored, use it;
  // otherwise, fall back strictly to university check without granting investor privileges to arbitrary emails.
  const role: Role =
    rawRole === "student" || rawRole === "investor" || rawRole === "university"
      ? rawRole
      : (userEmail && isUniversityEmail(userEmail) ? "student" : "student");

  const rawName = meta["name"] || meta["full_name"];
  const name =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName
      : supabaseUser.email?.split("@")[0] || "User";

  const rawOrg = meta["org"];
  const org =
    typeof rawOrg === "string" && rawOrg.trim().length > 0
      ? rawOrg
      : ROLE_PROFILES[role]?.org || "CampusVenture";

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
    const path = window.location.pathname;
    if (path.includes("/app/student")) return "student";
    if (path.includes("/app/university")) return "university";
    if (path.includes("/app/investor")) return "investor";
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

  // 1. Fetch persistent role directly from Supabase public.profiles
  try {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, email, name, role, org")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (data) {
      dbProfile = data;
    } else {
      const { data: byEmail } = await (supabase as any)
        .from("profiles")
        .select("id, email, name, role, org")
        .ilike("email", userEmail)
        .maybeSingle();
      if (byEmail) dbProfile = byEmail;
    }
  } catch (err) {
    console.warn("[CampusVenture Auth] Profile check notice:", err);
  }

  // Check local registered accounts fallback
  const currentAccounts = loadRegisteredUsers();
  const localAccount = currentAccounts.find((a) => a.email.toLowerCase() === userEmail);

  // If user has not registered yet (neither in database nor in registered users)
  if (!dbProfile && !localAccount && !pendingRole && !meta["role"]) {
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
    const errMsg = "This account has not been registered yet. Please register first.";
    return { allowed: false, error: errMsg };
  }

  const rawRole = dbProfile?.role || localAccount?.role || (meta["role"] as Role | undefined);
  const intendedRole: Role =
    (rawRole && (rawRole === "student" || rawRole === "university" || rawRole === "investor")
      ? rawRole
      : pendingRole) || (isUniversityEmail(userEmail) ? "student" : "investor");

  // STRICT RULE: Student and University accounts strictly require an official university email
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
        student: "Student",
        university: "University",
        investor: "Investor",
      };
      const errMsg = `Institutional Access Denied: "${userEmail}" is a personal email address. ${roleLabels[intendedRole]} accounts strictly require an official university email (@sguk.ac.in, .ac.in, .edu). Personal emails are not permitted.`;

      toast.error(errMsg, { duration: 10000 });
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

  // Sync to public.profiles table in Supabase if not yet present
  if (!dbProfile) {
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
  if (typeof window === "undefined") return DEFAULT_ACCOUNTS;
  try {
    const raw = window.localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) {
      window.localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw) as RegisteredAccount[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    window.localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
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
  const [authModalDefaultMode, setAuthModalDefaultMode] = useState<"signin" | "register" | undefined>(undefined);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredAccount[]>([]);

  const openAuthModal = useCallback((defaultRole?: Role, defaultMode: "signin" | "register" = "signin") => {
    setAuthModalDefaultRole(defaultRole);
    setAuthModalDefaultMode(defaultMode);
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
            if (
              typeof window !== "undefined" &&
              (window.location.pathname.includes("/app/student") ||
                window.location.pathname.includes("/app/university"))
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
              } else {
                setUser({
                  ...parsed,
                  avatarInitials: getInitials(parsed.name),
                });
              }
            } catch {
              // Corrupt cache - leave user null
            }
          }
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
          if (
            typeof window !== "undefined" &&
            (window.location.pathname.includes("/app/student") ||
              window.location.pathname.includes("/app/university"))
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
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
          error: `Institutional Access Denied: ${cleanEmail} is a personal email. ${roleLabels[expectedRole]} accounts strictly require an official university email (@sguk.ac.in, .ac.in, .edu). Personal emails are not permitted.`,
        };
      }

      // 2. Check database public.profiles to verify account exists and fetch stored server-side role
      let dbProfile: any = null;
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("id, email, name, role, org")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (!error && data) {
          dbProfile = data;
        }
      } catch (err) {
        console.warn("[CampusVenture Auth] Error checking profile existence:", err);
      }

      // Check local registered accounts
      const currentAccounts = loadRegisteredUsers();
      const localAccount = currentAccounts.find(
        (acc) => acc.email.toLowerCase() === cleanEmail
      );

      // If account does not exist in central DB or local registered registry:
      if (!dbProfile && !localAccount) {
        return {
          success: false,
          error: "This account has not been registered yet. Please register first.",
        };
      }

      const actualRole: Role = (dbProfile?.role || localAccount?.role) as Role;

      // 3. Prevent role spoofing: a user's selected role must never override the server-stored role
      if (expectedRole && actualRole !== expectedRole) {
        return {
          success: false,
          error: `This account is registered as ${roleLabels[actualRole]}, not ${roleLabels[expectedRole]}. Please sign in through the ${roleLabels[actualRole]} portal.`,
        };
      }

      // 4. Verify institutional domain for Student and University roles
      if ((actualRole === "student" || actualRole === "university") && !isUniversityEmail(cleanEmail)) {
        return {
          success: false,
          error: `Institutional Access Denied: ${cleanEmail} is a personal email. ${roleLabels[actualRole]} accounts strictly require an official university email (@sguk.ac.in, .ac.in, .edu). Personal emails are not permitted.`,
        };
      }

      // 5. Authenticate credentials
      let authenticated = false;
      let authenticatedId = dbProfile?.id || localAccount?.id || generateUUID();
      let userName = dbProfile?.name || localAccount?.name || cleanEmail.split("@")[0];
      let userOrg = dbProfile?.org || localAccount?.org || ROLE_PROFILES[actualRole]?.org || "CampusVenture";

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
          authenticatedId = authData.user.id;
          const meta = authData.user.user_metadata || {};
          if (meta["name"]) userName = String(meta["name"]);
          if (meta["org"]) userOrg = String(meta["org"]);
        } else if (!authenticated) {
          // If neither local nor Supabase password matched
          return {
            success: false,
            error: "Incorrect password. Please verify your credentials or reset your password.",
          };
        }
      } catch (err) {
        if (!authenticated) {
          const message = err instanceof Error ? err.message : "Authentication error.";
          return { success: false, error: message };
        }
      }

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

      // Strict institutional check for Student & University
      if ((role === "student" || role === "university") && !isUniversityEmail(cleanEmail)) {
        return {
          success: false,
          error: `Institutional Access Denied: ${cleanEmail} is a personal email. ${role === "student" ? "Student" : "University"} registration requires an official university email (@sguk.ac.in, .ac.in, .edu).`,
        };
      }

      // Check if already registered
      const currentAccounts = loadRegisteredUsers();
      if (currentAccounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
        return {
          success: false,
          error: "An account with this email already exists. Try signing in.",
        };
      }

      // Create new account
      const newAccount: RegisteredAccount = {
        id: `usr-${role}-${Date.now().toString(36)}`,
        email: cleanEmail,
        password,
        name: name.trim(),
        role,
        org: org.trim() || ROLE_PROFILES[role]?.org || "CampusVenture",
        createdAt: new Date().toISOString(),
      };

      const updatedAccounts = [...currentAccounts, newAccount];
      saveRegisteredUsers(updatedAccounts);
      setRegisteredUsers(updatedAccounts);

      const authUser: AuthUser = {
        id: newAccount.id,
        email: newAccount.email,
        name: newAccount.name,
        role: newAccount.role,
        org: newAccount.org,
        avatarInitials: getInitials(newAccount.name),
        isDemo: false,
      };

      setUser(authUser);
      try {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } catch {
        /* ignore */
      }

      // Register or sync with Supabase Auth & public.profiles
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let targetId = newAccount.id;

        if (session?.user && session.user.email?.toLowerCase() === cleanEmail) {
          targetId = session.user.id;
          await supabase.auth.updateUser({
            password,
            data: { role, name: name.trim(), org: newAccount.org },
          });
        } else {
          const { data: authData } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { role, name: name.trim(), org: newAccount.org },
            },
          });
          if (authData?.user) {
            targetId = authData.user.id;
          }
        }

        // Upsert profile into public.profiles
        await (supabase as any).from("profiles").upsert({
          id: targetId,
          email: cleanEmail,
          name: name.trim(),
          role,
          org: newAccount.org || null,
          updated_at: new Date().toISOString(),
        });
      } catch (sbErr) {
        console.warn("[CampusVenture Auth] Supabase sync notice:", sbErr);
      }

      setIsAuthModalOpen(false);
      toast.success(`Account created! Welcome aboard, ${authUser.name}.`);
      return { success: true, user: authUser };
    },
    []
  );

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }

    setUser(null);
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      /* ignore */
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
      customGoogleName?: string
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

        if (!existing) {
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

        const authUser: AuthUser = {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          role: existing.role || role,
          org: existing.org || defaultOrg,
          avatarInitials: getInitials(existing.name),
          isDemo: false,
        };

        // Sync directly to Supabase profiles
        let targetId = existing.id;
        try {
          const { data: existingProf } = await (supabase as any)
            .from("profiles")
            .select("id")
            .eq("email", cleanEmail)
            .maybeSingle();

          if ((existingProf as any)?.id) {
            targetId = (existingProf as any).id;
          } else {
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
              role,
              org: defaultOrg,
              updated_at: new Date().toISOString(),
            });
            authUser.id = targetId;
          }
        } catch (syncErr) {
          console.warn("[CampusVenture Auth] Google profile sync notice:", syncErr);
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
          data: { name: newName, org: newOrg, bio: updates.bio },
        });
        await (supabase as any).from("profiles").upsert({
          id: user.id,
          email: user.email,
          name: newName,
          org: newOrg,
          role: user.role,
          bio: updates.bio,
          updated_at: new Date().toISOString(),
        });
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
