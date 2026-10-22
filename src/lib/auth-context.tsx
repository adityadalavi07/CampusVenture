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

function extractUserData(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  const meta = supabaseUser.user_metadata || {};
  const rawRole = meta["role"];
  const role: Role =
    rawRole === "student" || rawRole === "investor" || rawRole === "university"
      ? rawRole
      : "student";

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
          const authUser = extractUserData(session.user);
          setUser(authUser);
        } else if (mounted) {
          // Check cached local auth
          const cached = window.localStorage.getItem(AUTH_STORAGE_KEY);
          if (cached) {
            try {
              const parsed = JSON.parse(cached) as AuthUser;
              setUser({
                ...parsed,
                avatarInitials: getInitials(parsed.name),
              });
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const authUser = extractUserData(session.user);
        setUser(authUser);
        try {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
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

  // Email + password sign in with role authorization check
  const signIn = useCallback(
    async (
      email: string,
      password: string,
      expectedRole?: Role
    ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Check local registered accounts first
      const currentAccounts = loadRegisteredUsers();
      const localAccount = currentAccounts.find(
        (acc) => acc.email.toLowerCase() === cleanEmail
      );

      if (localAccount) {
        if (localAccount.password !== password) {
          return { success: false, error: "Incorrect email or password." };
        }

        if (expectedRole && localAccount.role !== expectedRole) {
          const roleLabels: Record<Role, string> = {
            student: "Student",
            university: "University",
            investor: "Investor",
          };
          return {
            success: false,
            error: `This account is registered as ${roleLabels[localAccount.role]}, not ${roleLabels[expectedRole]}.`,
          };
        }

        const authUser: AuthUser = {
          id: localAccount.id,
          email: localAccount.email,
          name: localAccount.name,
          role: localAccount.role,
          org: localAccount.org,
          avatarInitials: getInitials(localAccount.name),
          isDemo: false,
        };

        setUser(authUser);
        try {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        } catch {
          /* ignore */
        }

        // Try Supabase in background if credentials match, or auto-sync if missing
        supabase.auth.signInWithPassword({ email: cleanEmail, password })
          .then(async ({ data, error }) => {
            if (error && (error.message.toLowerCase().includes("invalid login credentials") || error.message.toLowerCase().includes("user not found"))) {
              const { data: signUpData } = await supabase.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                  data: { role: localAccount.role, name: localAccount.name, org: localAccount.org },
                },
              });
              const newId = signUpData?.user?.id || localAccount.id;
              await (supabase as any).from("profiles").upsert({
                id: newId,
                email: cleanEmail,
                name: localAccount.name,
                role: localAccount.role,
                org: localAccount.org || null,
                updated_at: new Date().toISOString(),
              });
            }
          })
          .catch(() => {});

        setIsAuthModalOpen(false);
        toast.success(`Welcome back, ${authUser.name}!`);
        return { success: true, user: authUser };
      }

      // 2. Fallback to Supabase live auth
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          return { success: false, error: error.message || "Incorrect email or password." };
        }

        if (data.user) {
          const authUser = extractUserData(data.user);

          if (expectedRole && authUser.role !== expectedRole) {
            const roleLabels: Record<Role, string> = {
              student: "Student",
              university: "University",
              investor: "Investor",
            };
            return {
              success: false,
              error: `This account is registered as ${roleLabels[authUser.role]}, not ${roleLabels[expectedRole]}.`,
            };
          }

          setUser(authUser);
          try {
            window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
          } catch {
            /* ignore */
          }

          setIsAuthModalOpen(false);
          toast.success(`Welcome back, ${authUser.name}!`);
          return { success: true, user: authUser };
        }

        return { success: false, error: "Authentication failed. No user returned." };
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        return { success: false, error: message };
      }
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
          oauthOptions.redirectTo = redirectUrl;
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
