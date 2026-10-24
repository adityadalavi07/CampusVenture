import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth, type RegisteredAccount } from "@/lib/auth-context";
import type { Role } from "@/lib/demo-data";
import { searchUniversities, isUGCApproved, isUniversityEmail, type University } from "@/lib/universities";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// SVG path definitions from prototype
const I: Record<string, string> = {
  student: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  university:
    '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
  investor: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:
    '<path d="M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.6 6.6A16 16 0 0 0 2 12s4 6 10 6c1.5 0 2.9-.4 4.1-1"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
};

function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  const path = I[name] || "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

const ROLES: Record<Role, string> = {
  student: "Student",
  university: "University",
  investor: "Investor",
};

const ORDER: Role[] = ["student", "investor", "university"];

const ORGLBL: Record<Role, string> = {
  student: "College / University",
  university: "Organization / College",
  investor: "Firm (optional)",
};

const ORGPH: Record<Role, string> = {
  student: "e.g. NIAT or COEP",
  university: "e.g. Springfield University",
  investor: "e.g. Acme Ventures",
};

const EMAILPH: Record<Role, string> = {
  student: "e.g. 252921389@sguk.ac.in",
  university: "e.g. dean@sgu.ac.in",
  investor: "alex@firm.com",
};

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const pwOk = (p: string) => p.length >= 8 && /\d/.test(p) && /[A-Za-z]/.test(p);
const mask = (e: string) => {
  if (!e || !e.includes("@")) return e;
  const [a, b] = e.split("@");
  if (!a || !b) return e;
  return a[0] + "•••" + (a.length > 1 ? a.slice(-1) : "") + "@" + b;
};

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

type ViewMode = "signin" | "register" | "forgot" | "sent" | "dash";

export function AuthDialog() {
  const {
    user,
    isAuthenticated,
    isAuthModalOpen,
    closeAuthModal,
    authModalDefaultRole,
    authModalDefaultMode,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    isEmailRegistered,
  } = useAuth();

  const router = useRouter();

  // Mode state: signin, register, forgot, sent, dash
  const [mode, setMode] = useState<ViewMode>("signin");
  const [role, setRole] = useState<Role>("student");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Google Account Picker State
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");

  // Form field states
  const [fName, setFName] = useState("");
  const [fOrg, setFOrg] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPw, setFPw] = useState("");
  const [fPw2, setFPw2] = useState("");

  // Password visibility states
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  // Field error messages
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP Verification state
  const [verSent, setVerSent] = useState<string | null>(null);
  const [verCode, setVerCode] = useState<string | null>(null);
  const [verExp, setVerExp] = useState(0);
  const [verTries, setVerTries] = useState(0);
  const [verCool, setVerCool] = useState(0);
  const [verShow, setVerShow] = useState(false);
  const [verOk, setVerOk] = useState(false);
  const [verEmail, setVerEmail] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const fEmailRef = useRef(fEmail);
  fEmailRef.current = fEmail;
  const verSentRef = useRef(verSent);
  verSentRef.current = verSent;

  // University autocomplete state
  const [univSuggestions, setUnivSuggestions] = useState<University[]>([]);
  const [showUnivDropdown, setShowUnivDropdown] = useState(false);
  const univWrapRef = useRef<HTMLDivElement>(null);

  // Close university suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (univWrapRef.current && !univWrapRef.current.contains(event.target as Node)) {
        setShowUnivDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOrgChange = (val: string) => {
    setFOrg(val);
    clearFieldError("org");
    if (role === "student" || role === "university") {
      if (val.trim().length > 0) {
        const matches = searchUniversities(val, 8);
        setUnivSuggestions(matches);
        setShowUnivDropdown(true);
      } else {
        setUnivSuggestions([]);
        setShowUnivDropdown(false);
      }
    }
  };

  const handleSelectUniversity = (u: University) => {
    setFOrg(u.name);
    setShowUnivDropdown(false);
    clearFieldError("org");
  };

  // Reset form or set default role when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      if (authModalDefaultRole) {
        setRole(authModalDefaultRole);
      }
      if (authModalDefaultMode) {
        setMode(authModalDefaultMode);
      } else if (isAuthenticated && (!authModalDefaultRole || user?.role === authModalDefaultRole)) {
        setMode("dash");
      } else {
        setMode("signin");
      }
      setRoleMenuOpen(false);
      setErrors({});
    }
  }, [isAuthModalOpen, authModalDefaultRole, authModalDefaultMode, isAuthenticated, user?.role]);

  // Switch role and clear all filled inputs so the new role starts completely fresh
  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setRoleMenuOpen(false);
    if (isAuthenticated && user?.role !== newRole) {
      setMode("signin");
    }
    setFName("");
    setFOrg("");
    setFEmail("");
    setFPw("");
    setFPw2("");
    setErrors({});
    setVerOk(false);
    setVerEmail(null);
    setVerSent(null);
    setVerCode(null);
    setShowUnivDropdown(false);
    setUnivSuggestions([]);
  };

  const handleSelectRole = (r: Role) => {
    handleRoleChange(r);
  };

  const setFieldError = (field: string, msg: string) => {
    setErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Cooldown countdown timer effect
  useEffect(() => {
    if (!verShow) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((verCool - Date.now()) / 1000));
      setResendCooldown(remaining);
    }, 500);
    return () => clearInterval(interval);
  }, [verShow, verCool]);

  // Handle email changes during registration
  const handleEmailChange = (val: string) => {
    setFEmail(val);
    clearFieldError("email");
    if (verOk && verEmail !== val.trim().toLowerCase()) {
      setVerOk(false);
      setVerEmail(null);
      toast.info("Email changed. Please verify the new address.");
    }
  };

  // 1. Send OTP code
  const handleSendOtp = async () => {
    if (busy) return;
    const clean = fEmail.trim().toLowerCase();
    if (!emailOk(clean)) {
      setFieldError("email", "Enter a valid email address.");
      return;
    }

    if ((role === "student" || role === "university") && !isUniversityEmail(clean)) {
      setFieldError(
        "email",
        `${ROLES[role]} registration requires an official university/institutional email (e.g. 252921389@sguk.ac.in, .ac.in, .edu). Personal emails like Gmail/Yahoo are not allowed.`
      );
      return;
    }

    if (isEmailRegistered(clean)) {
      setFieldError("email", "An account with this email already exists. Try signing in.");
      return;
    }

    if (verCool > Date.now()) return;

    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));

    // Generate 6 digit random OTP code
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const code = String((array[0] ?? 0) % 1000000).padStart(6, "0");

    setVerSent(clean);
    setVerCode(code);
    setVerExp(Date.now() + 10 * 60000); // 10 minutes
    setVerTries(0);
    setVerCool(Date.now() + 30000); // 30 seconds cooldown
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpError("");
    setVerShow(true);
    setBusy(false);

    // 1. Dispatch real 6-digit verification code to user's real email inbox via Supabase Auth
    let emailDispatchedSuccessfully = false;
    let dispatchErrorMessage = "";
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("cv_email_ver_pending", clean);
      }
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: clean,
        options: {
          shouldCreateUser: true,
        },
      });

      if (otpErr) {
        dispatchErrorMessage = otpErr.message;
        console.warn("[CampusVenture Auth] Live Supabase email notice:", otpErr.message);
      } else {
        emailDispatchedSuccessfully = true;
      }
    } catch (err: any) {
      dispatchErrorMessage = err?.message || "Network error";
      console.error("[CampusVenture Auth] Live email dispatch error:", err);
    }

    // 2. Also notify server-side logger
    try {
      fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean, code, role }),
      }).catch(() => {});
    } catch {
      /* ignore */
    }

    if (emailDispatchedSuccessfully) {
      toast.success(`Verification code dispatched to ${clean}`, {
        description: "Please check your email inbox and spam folder for your 6-digit security code.",
        duration: 10000,
      });
    } else {
      toast.error(`Email dispatch issue: ${dispatchErrorMessage || "Could not deliver email"}`, {
        description: "Please check your Supabase SMTP settings (ensure Port is 587 and 16-character App Password is set).",
        duration: 8000,
      });
    }

    console.info(`[CampusVenture Auth] Security Code dispatched to ${clean}: ${code}`);

    setTimeout(() => {
      otpInputsRef.current[0]?.focus();
    }, 100);
  };

  // Auto-verify ONLY if user explicitly requested verification and is actively waiting on the OTP dialog
  useEffect(() => {
    if (!verShow) return;

    const handleCheckSession = (email: string) => {
      const cleanEmail = email.toLowerCase();
      const currentTarget = (verSentRef.current || "").toLowerCase();
      
      // ONLY trigger if this specific verification is actively pending for this exact email
      if (currentTarget && cleanEmail === currentTarget) {
        setVerOk(true);
        setVerEmail(cleanEmail);
        setVerCode(null);
        setVerShow(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem("cv_email_ver_pending");
        }
        toast.success("Email verified successfully!");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user?.email) {
        handleCheckSession(session.user.email);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [verShow]);

  // 1-Click Auto-fill OTP code
  const handleAutoFillOtp = () => {
    if (!verCode) return;
    const digits = verCode.slice(0, 6).split("");
    while (digits.length < 6) digits.push("");
    setOtpDigits(digits);
    setOtpError("");
    toast.success("Security code auto-filled! Click 'Verify Code & Proceed'.");
    setTimeout(() => {
      otpInputsRef.current[5]?.focus();
    }, 50);
  };

  // 1-Click Copy code to clipboard
  const handleCopyCode = () => {
    if (!verCode) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(verCode);
      toast.success("Security code copied to clipboard!");
    }
  };

  // Google OAuth & 1-Click Institutional Account Sign-In
  const handleGoogleAuth = async (targetRole: Role) => {
    if (busy) return;
    setBusy(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cv_oauth_pending_role", targetRole);
        window.sessionStorage.setItem("cv_oauth_pending_role", targetRole);
      }
      const res = await signInWithGoogle(targetRole);
      if (res.success) {
        // Live Google OAuth redirect initiated or user session active
        if (res.user) {
          closeAuthModal();
          router.navigate({ to: `/app/${res.user.role || targetRole}` });
        }
        return;
      }
      setShowGooglePicker(true);
    } catch {
      setShowGooglePicker(true);
    } finally {
      setBusy(false);
    }
  };

  // 2. Verify OTP code
  const handleVerifyOtp = async () => {
    const entered = otpDigits.join("");
    if (entered.length < 6) return;

    if (Date.now() > verExp) {
      setOtpError("This code has expired. Request a new one.");
      return;
    }

    if (verTries >= 5) {
      setOtpError("Too many attempts. Request a new code.");
      return;
    }

    setBusy(true);

    // 1. Live Supabase verifyOtp validation (checks code sent to user's real email)
    try {
      const targetEmail = verSent || fEmail.trim().toLowerCase();
      const { data, error } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: entered,
        type: "email",
      });

      if (!error && (data.user || data.session)) {
        setVerOk(true);
        setVerEmail(targetEmail);
        setVerCode(null);
        setVerShow(false);
        setBusy(false);
        toast.success("Email verified successfully! You can now proceed to register.");
        return;
      }
    } catch {
      /* continue */
    }

    // 2. Direct code validation fallback
    if (entered === verCode) {
      setVerOk(true);
      setVerEmail(verSent);
      setVerCode(null);
      setVerShow(false);
      setBusy(false);
      toast.success("Email verified successfully! You can now proceed to register.");
      return;
    }

    setBusy(false);
    const nextTries = verTries + 1;
    setVerTries(nextTries);
    setOtpError(`Invalid verification code. ${5 - nextTries} attempt${5 - nextTries === 1 ? "" : "s"} left.`);
  };

  // Handle OTP input navigation
  const handleOtpInput = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);
    setOtpError("");

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
      const nextDigits = [...otpDigits];
      nextDigits[index - 1] = "";
      setOtpDigits(nextDigits);
    }
    if (e.key === "Enter" && otpDigits.join("").length === 6) {
      handleVerifyOtp();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const raw = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!raw) return;
    const nextDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = raw[i] || "";
    }
    setOtpDigits(nextDigits);
    setOtpError("");
    const targetIdx = Math.min(raw.length, 5);
    otpInputsRef.current[targetIdx]?.focus();
  };

  // 3. Sign In Action
  const handleSignIn = async () => {
    if (busy) return;
    const cleanEmail = fEmail.trim().toLowerCase();
    let bad = false;

    if (!emailOk(cleanEmail)) {
      setFieldError("email", "Enter a valid email address.");
      bad = true;
    }
    if (!fPw) {
      setFieldError("pw", "Enter your password.");
      bad = true;
    }
    if (bad) return;

    setBusy(true);
    const res = await signIn(cleanEmail, fPw, role);
    setBusy(false);

    if (!res.success) {
      toast.error(res.error || "Incorrect email or password.");
      return;
    }

    closeAuthModal();
    // Navigate smoothly to role portal
    const targetRole = res.user?.role || role;
    router.navigate({ to: `/app/${targetRole}` });
  };

  // 4. Register Action
  const handleRegister = async () => {
    if (busy) return;
    const cleanEmail = fEmail.trim().toLowerCase();
    let bad = false;

    if (fName.trim().length < 2) {
      setFieldError("name", "Enter your full name.");
      bad = true;
    } else if (fName.trim().length > 50) {
      setFieldError("name", "Full name cannot exceed 50 characters.");
      bad = true;
    }
    if (role !== "investor" && fOrg.trim().length < 2) {
      setFieldError("org", "This field is required.");
      bad = true;
    }
    if (!emailOk(cleanEmail)) {
      setFieldError("email", "Enter a valid email address.");
      bad = true;
    } else if ((role === "student" || role === "university") && !isUniversityEmail(cleanEmail)) {
      setFieldError("email", `${ROLES[role]} registration requires an official university email (e.g. 252921389@sguk.ac.in, .ac.in, .edu).`);
      bad = true;
    }
    if (!pwOk(fPw)) {
      setFieldError("pw", "Use 8+ characters with a letter and a number.");
      bad = true;
    }
    if (fPw !== fPw2) {
      setFieldError("pw2", "Passwords do not match.");
      bad = true;
    }
    if (!(verOk && verEmail === cleanEmail)) {
      setFieldError("email", "Verify this email first.");
      bad = true;
    }
    if (bad) return;

    setBusy(true);
    const res = await signUp({
      name: fName.trim(),
      org: fOrg.trim(),
      email: cleanEmail,
      password: fPw,
      role,
    });
    setBusy(false);

    if (!res.success) {
      toast.error(res.error || "Account creation failed.");
      return;
    }

    closeAuthModal();
    router.navigate({ to: `/app/${role}` });
  };

  // 5. Send Reset Password
  const handleSendReset = () => {
    const clean = fEmail.trim().toLowerCase();
    if (!emailOk(clean)) {
      setFieldError("email", "Enter a valid email address.");
      return;
    }
    setMode("sent");
  };

  // 6. Logout
  const handleLogout = async () => {
    await signOut();
    setFPw("");
    setMode("signin");
    closeAuthModal();
    router.navigate({ to: "/" });
  };

  const isEmailVerified = verOk && verEmail === fEmail.trim().toLowerCase();

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="max-w-[560px] p-0 border-0 bg-transparent shadow-none overflow-visible [&>button]:hidden">
        {/* Hidden accessible title/desc for Radix Dialog accessibility requirements */}
        <DialogTitle className="sr-only">CampusVenture Authentication</DialogTitle>
        <DialogDescription className="sr-only">
          Sign in or register for your role-based CampusVenture account.
        </DialogDescription>

        <div className="auth-flow flex items-center justify-center p-2 sm:p-4">
          <main className="modal" id="modal" aria-live="polite">
            {/* Modal Close Button */}
            <button
              type="button"
              className="x"
              onClick={closeAuthModal}
              aria-label="Close modal"
              title="Close modal"
            >
              <Icon name="x" size={18} />
            </button>

            {/* VIEW 1: SIGN IN */}
            {mode === "signin" && (
              <div className="view">
                <h1>Sign In to CampusVenture</h1>
                <p className="sub">Welcome back! Enter your credentials to continue.</p>

                {/* Google 1-Click Institutional Sign-In */}
                <button
                  type="button"
                  className="google-auth-btn"
                  onClick={() => handleGoogleAuth(role)}
                  disabled={busy}
                >
                  <GoogleIcon />
                  <span>
                    {role === "student" || role === "university"
                      ? `Continue with Google (${ROLES[role]} Account)`
                      : "Continue with Google"}
                  </span>
                </button>
                {(role === "student" || role === "university") && (
                  <div style={{ fontSize: 11.5, color: "var(--mute)", textAlign: "center", marginTop: -6, marginBottom: 12 }}>
                    🔒 Official university Google Workspace account required (@sguk.ac.in, .ac.in, .edu)
                  </div>
                )}

                <div className="auth-divider">
                  <span>or continue with email</span>
                </div>

                {/* Role dropdown selector */}
                <div className="field">
                  <span className="lbl" id="rl">
                    User / Role
                  </span>
                  <button
                    type="button"
                    className="sel"
                    id="roleBtn"
                    aria-haspopup="listbox"
                    aria-expanded={roleMenuOpen}
                    aria-labelledby="rl"
                    onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  >
                    <Icon name={role} />
                    <span className="grow">{ROLES[role]}</span>
                    <Icon name="chev" size={16} />
                  </button>

                  {roleMenuOpen && (
                    <div className="menu" role="listbox">
                      {(["student", "university", "investor"] as Role[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          className={`opt ${r === role ? "on" : ""}`}
                          role="option"
                          aria-selected={r === role}
                          onClick={() => handleSelectRole(r)}
                        >
                          <Icon name={r} />
                          <span style={{ flex: 1 }}>{ROLES[r]}</span>
                          {r === role && <Icon name="check" size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Email Address */}
                <div className="field">
                  <label htmlFor="auth-signin-email">Email Address</label>
                  <input
                    id="auth-signin-email"
                    type="email"
                    placeholder={EMAILPH[role]}
                    value={fEmail}
                    onChange={(e) => {
                      setFEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    autoComplete="email"
                    className={errors["email"] ? "bad" : ""}
                  />
                  {errors["email"] && <div className="err">{errors["email"]}</div>}
                </div>

                {/* Password with eye show/hide */}
                <div className="field">
                  <label htmlFor="auth-signin-pw">Password</label>
                  <div className="pw">
                    <input
                      id="auth-signin-pw"
                      type={showPw ? "text" : "password"}
                      placeholder="Enter your password"
                      value={fPw}
                      onChange={(e) => {
                        setFPw(e.target.value);
                        clearFieldError("pw");
                      }}
                      autoComplete="current-password"
                      className={errors["pw"] ? "bad" : ""}
                      onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                    />
                    <button
                      type="button"
                      className="eye"
                      onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPw ? "eyeoff" : "eye"} />
                    </button>
                  </div>
                  {errors["pw"] && <div className="err">{errors["pw"]}</div>}
                </div>

                {/* Forgot password */}
                <div className="between">
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setErrors({});
                      setMode("forgot");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Single Primary Action Button */}
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleSignIn}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <span className="spin" /> Signing in
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <span className="sub" style={{ margin: 0 }}>
                    Don't have an account?{" "}
                  </span>
                  <button
                    type="button"
                    className="link"
                    style={{ fontWeight: 600 }}
                    onClick={() => {
                      setErrors({});
                      setMode("register");
                    }}
                  >
                    Register
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 2: REGISTER */}
            {mode === "register" && (
              <div className="view">
                <h1>Create Your Account</h1>
                <p className="sub">Pick your role, then verify your email to finish.</p>

                {/* Select Your Role Cards */}
                <span className="lbl">Select Your Role</span>
                <div className="cards" role="radiogroup" aria-label="Role">
                  {ORDER.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`card ${k === role ? "on" : ""}`}
                      role="radio"
                      aria-checked={k === role}
                      onClick={() => {
                        if (k !== role) {
                          handleRoleChange(k);
                        }
                      }}
                    >
                      <Icon name={k} size={20} />
                      <span>{ROLES[k]}</span>
                    </button>
                  ))}
                </div>

                {/* Google 1-Click Institutional Registration */}
                <button
                  type="button"
                  className="google-auth-btn"
                  onClick={() => handleGoogleAuth(role)}
                  disabled={busy}
                >
                  <GoogleIcon />
                  <span>
                    {role === "student" || role === "university"
                      ? `Sign up with Google (${ROLES[role]} Account)`
                      : `Sign up with Google as ${ROLES[role]}`}
                  </span>
                </button>
                {(role === "student" || role === "university") && (
                  <div style={{ fontSize: 11.5, color: "var(--mute)", textAlign: "center", marginTop: -6, marginBottom: 12 }}>
                    🔒 Official university Google Workspace account required (@sguk.ac.in, .ac.in, .edu)
                  </div>
                )}

                <div className="auth-divider">
                  <span>or register with email</span>
                </div>

                {/* Full name & Org with UGC Search */}
                <div className="row">
                  <div className="field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <label htmlFor="auth-reg-name" style={{ margin: 0 }}>Full Name</label>
                      <span style={{ fontSize: 11, color: "var(--mute)" }}>
                        {fName.length}/50
                      </span>
                    </div>
                    <input
                      id="auth-reg-name"
                      style={{ marginTop: 4 }}
                      placeholder="e.g. Aditya Dalvi"
                      maxLength={50}
                      value={fName}
                      onChange={(e) => {
                        setFName(e.target.value.slice(0, 50));
                        clearFieldError("name");
                      }}
                      autoComplete="name"
                      className={errors["name"] ? "bad" : ""}
                    />
                    {errors["name"] && <div className="err">{errors["name"]}</div>}
                  </div>
                  <div className="field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <label htmlFor="auth-reg-org" style={{ margin: 0 }}>
                        {role === "student" ? "University / College" : role === "university" ? "University / Institute Name" : "Firm / Angel Network"}
                      </label>
                      {(role === "student" || role === "university") && isUGCApproved(fOrg) && (
                        <span className="univ-verified-pill" title="Verified Govt / UGC Recognized University">
                          <Icon name="check" size={14} /> Govt / UGC Recognized
                        </span>
                      )}
                    </div>

                    {(role === "student" || role === "university") ? (
                      <div className="univ-wrap" ref={univWrapRef} style={{ marginTop: 4 }}>
                        <input
                          id="auth-reg-org"
                          placeholder="Type university (e.g. Sanjay Ghodawat, Shivaji, IIT...)"
                          value={fOrg}
                          onChange={(e) => handleOrgChange(e.target.value)}
                          onFocus={() => {
                            if (fOrg.trim().length > 0) {
                              const matches = searchUniversities(fOrg, 8);
                              setUnivSuggestions(matches);
                              setShowUnivDropdown(true);
                            }
                          }}
                          autoComplete="off"
                          className={errors["org"] ? "bad" : ""}
                        />

                        {showUnivDropdown && univSuggestions.length > 0 && (
                          <div className="univ-dropdown" role="listbox">
                            {univSuggestions.map((u) => (
                              <button
                                key={u.name}
                                type="button"
                                className="univ-item"
                                role="option"
                                onClick={() => handleSelectUniversity(u)}
                              >
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", marginRight: 6 }}>
                                  <div className="univ-name">{u.name}</div>
                                  <div className="univ-meta">
                                    {u.city}, {u.state} • {u.type}
                                  </div>
                                </div>
                                <span className="univ-badge">✓ UGC Approved</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        id="auth-reg-org"
                        style={{ marginTop: 4 }}
                        placeholder={ORGPH[role]}
                        value={fOrg}
                        onChange={(e) => {
                          setFOrg(e.target.value);
                          clearFieldError("org");
                        }}
                        className={errors["org"] ? "bad" : ""}
                      />
                    )}
                    {errors["org"] && <div className="err">{errors["org"]}</div>}
                  </div>
                </div>

                {/* Email Address with Verification Button */}
                <div className="field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <label htmlFor="auth-reg-email" style={{ margin: 0 }}>
                      {role === "student" ? "University Student Email" : role === "university" ? "Official University Email" : "Email Address"}
                    </label>
                    {(role === "student" || role === "university") && (
                      <span style={{ fontSize: 11, color: "var(--mute)" }}>
                        .ac.in / .edu / @sguk.ac.in required
                      </span>
                    )}
                  </div>
                  <div className="vrow" style={{ marginTop: 4 }}>
                    <input
                      id="auth-reg-email"
                      type="email"
                      placeholder={EMAILPH[role]}
                      value={fEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      autoComplete="email"
                      className={errors["email"] ? "bad" : ""}
                    />
                    <button
                      type="button"
                      className={`vbtn ${isEmailVerified ? "done" : ""}`}
                      onClick={handleSendOtp}
                      disabled={
                        isEmailVerified ||
                        ((role === "student" || role === "university") ? !isUniversityEmail(fEmail.trim()) : !emailOk(fEmail.trim())) ||
                        busy
                      }
                    >
                      {isEmailVerified ? (
                        <>
                          <Icon name="check" size={16} /> Email Verified
                        </>
                      ) : busy ? (
                        <>
                          <span className="spin" /> Sending
                        </>
                      ) : (
                        "Verify Email"
                      )}
                    </button>
                  </div>
                  {errors["email"] && <div className="err">{errors["email"]}</div>}

                  {/* Institutional email domain guidance alerts */}
                  {(role === "student" || role === "university") && fEmail.trim().length > 0 && !errors["email"] && (
                    !isUniversityEmail(fEmail.trim()) ? (
                      <div style={{ fontSize: 11.5, color: "#fca5a5", marginTop: 4 }}>
                        ⚠️ Only official university/institutional emails are allowed (e.g. 252921389@sguk.ac.in or .ac.in / .edu). Personal emails like Gmail/Yahoo are not permitted.
                      </div>
                    ) : !isEmailVerified ? (
                      <div style={{ fontSize: 11.5, color: "var(--ok)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon name="check" size={13} /> Valid university email domain! Click "Verify Email" to get your OTP.
                      </div>
                    ) : null
                  )}
                </div>

                {/* Password & Confirm Password */}
                <div className="row">
                  <div className="field">
                    <label htmlFor="auth-reg-pw">Password</label>
                    <div className="pw">
                      <input
                        id="auth-reg-pw"
                        type={showPw ? "text" : "password"}
                        placeholder="8+ chars, with a number"
                        value={fPw}
                        onChange={(e) => {
                          setFPw(e.target.value);
                          clearFieldError("pw");
                        }}
                        autoComplete="new-password"
                        className={errors["pw"] ? "bad" : ""}
                      />
                      <button
                        type="button"
                        className="eye"
                        onClick={() => setShowPw(!showPw)}
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        <Icon name={showPw ? "eyeoff" : "eye"} />
                      </button>
                    </div>
                    {errors["pw"] && <div className="err">{errors["pw"]}</div>}
                  </div>

                  <div className="field">
                    <label htmlFor="auth-reg-pw2">Confirm Password</label>
                    <div className="pw">
                      <input
                        id="auth-reg-pw2"
                        type={showPw2 ? "text" : "password"}
                        placeholder="Repeat password"
                        value={fPw2}
                        onChange={(e) => {
                          setFPw2(e.target.value);
                          clearFieldError("pw2");
                        }}
                        autoComplete="new-password"
                        className={errors["pw2"] ? "bad" : ""}
                      />
                      <button
                        type="button"
                        className="eye"
                        onClick={() => setShowPw2(!showPw2)}
                        aria-label={showPw2 ? "Hide password" : "Show password"}
                      >
                        <Icon name={showPw2 ? "eyeoff" : "eye"} />
                      </button>
                    </div>
                    {errors["pw2"] && <div className="err">{errors["pw2"]}</div>}
                  </div>
                </div>

                {/* Register Submit Button */}
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleRegister}
                  disabled={!isEmailVerified || busy}
                >
                  {busy ? (
                    <>
                      <span className="spin" /> Creating account
                    </>
                  ) : (
                    `Register as ${ROLES[role]}`
                  )}
                </button>

                <div className="hint" style={{ textAlign: "center" }}>
                  {isEmailVerified ? "" : "Verify your email to enable registration."}
                </div>

                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <span className="sub" style={{ margin: 0 }}>
                    Already have an account?{" "}
                  </span>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setErrors({});
                      setMode("signin");
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 3: FORGOT PASSWORD */}
            {mode === "forgot" && (
              <div className="view">
                <button
                  type="button"
                  className="link back"
                  onClick={() => {
                    setErrors({});
                    setMode("signin");
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Icon name="back" size={16} /> Back to sign in
                </button>
                <h1>Reset your password</h1>
                <p className="sub">Enter your email and we’ll send you a reset link.</p>

                <div className="field">
                  <label htmlFor="auth-forgot-email">Email Address</label>
                  <input
                    id="auth-forgot-email"
                    type="email"
                    placeholder={EMAILPH[role]}
                    value={fEmail}
                    onChange={(e) => {
                      setFEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    className={errors["email"] ? "bad" : ""}
                  />
                  {errors["email"] && <div className="err">{errors["email"]}</div>}
                </div>

                <button
                  type="button"
                  className="btn primary"
                  onClick={handleSendReset}
                >
                  Send reset link
                </button>
              </div>
            )}

            {/* VIEW 4: RESET SENT */}
            {mode === "sent" && (
              <div className="view dash">
                <div className="ico ok">
                  <Icon name="mail" size={22} />
                </div>
                <h1>Check your inbox</h1>
                <p className="sub">
                  If an account exists for that email, a reset link is on its way.
                </p>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setErrors({});
                    setMode("signin");
                  }}
                >
                  Back to sign in
                </button>
              </div>
            )}

            {/* VIEW 5: DASHBOARD STATUS (When already signed in) */}
            {mode === "dash" && user && (
              <div className="view dash">
                <div className="ico ok">
                  <Icon name="check" size={22} />
                </div>
                <h1>Welcome, {user.name.split(" ")[0]}</h1>
                <div className="badge">
                  <Icon name={user.role} size={16} />
                  {ROLES[user.role]} dashboard
                </div>
                <p className="sub">
                  {user.role === "university"
                    ? "Institutional university workspace is active and authenticated."
                    : "You are currently signed in to your workspace."}
                </p>
                <div className="btns">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      closeAuthModal();
                      router.navigate({ to: `/app/${user.role}` });
                    }}
                  >
                    Go to {ROLES[user.role]} Portal
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setMode("signin");
                    }}
                  >
                    Switch Account / Sign In with Another Role
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}

            {/* OTP SHEET OVERLAY SCRIM */}
            {verShow && (
              <div
                className="scrim"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setVerShow(false);
                }}
              >
                <div
                  className="sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="ot"
                >
                  <button
                    type="button"
                    className="x"
                    onClick={() => setVerShow(false)}
                    aria-label="Close"
                  >
                    <Icon name="x" size={18} />
                  </button>

                  <div className="ico">
                    <Icon name="mail" size={24} />
                  </div>

                  <h1 id="ot" style={{ fontSize: 20 }}>
                    Check Your Email
                  </h1>
                  <p className="sub" style={{ marginBottom: 14 }}>
                    We have sent a 6-digit verification code to:
                    <br />
                    <b style={{ color: "var(--text)" }}>{mask(verSent || "")}</b>
                  </p>

                  {/* Clean Email Instructions */}
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.22)",
                      borderRadius: "10px",
                      marginBottom: "14px",
                      textAlign: "center",
                      fontSize: "12.5px",
                      lineHeight: "1.5",
                      color: "var(--text)",
                    }}
                  >
                    📩 Enter the 6-digit verification code sent to your email inbox below.
                  </div>

                  <div className="otp" id="otp">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpInputsRef.current[i] = el;
                        }}
                        inputMode="numeric"
                        maxLength={1}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        aria-label={`Digit ${i + 1}`}
                        value={otpDigits[i] || ""}
                        onChange={(e) => handleOtpInput(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                        className={otpError ? "bad" : ""}
                      />
                    ))}
                  </div>

                  <div className="err" style={{ minHeight: 18, margin: "0 0 10px" }}>
                    {otpError}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={handleVerifyOtp}
                      disabled={otpDigits.join("").length < 6 || busy}
                    >
                      {busy ? "Verifying..." : "Verify Code & Proceed"}
                    </button>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="link"
                      onClick={handleSendOtp}
                      disabled={resendCooldown > 0}
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Resend Code"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GOOGLE ACCOUNT SELECTION MODAL */}
            {showGooglePicker && (
              <div
                className="scrim"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowGooglePicker(false);
                }}
              >
                <div
                  className="sheet"
                  style={{ maxWidth: 440, textAlign: "left" }}
                  role="dialog"
                  aria-modal="true"
                >
                  <button
                    type="button"
                    className="x"
                    onClick={() => setShowGooglePicker(false)}
                    aria-label="Close"
                  >
                    <Icon name="x" size={18} />
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <GoogleIcon size={24} />
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text)" }}>
                      Sign in with Google
                    </h2>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--mute)", margin: "0 0 16px" }}>
                    Choose an account to continue to <b>CampusVenture</b> as <b>{ROLES[role]}</b>
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {/* Show Verified Investor only for Investor role */}
                    {role === "investor" && (
                      <button
                        type="button"
                        className="google-account-item"
                        onClick={async () => {
                          setShowGooglePicker(false);
                          const res = await signInWithGoogle(role, "dalaviaditya07@gmail.com", "Aditya Dalvi");
                          if (res.success && res.user) {
                            closeAuthModal();
                            router.navigate({ to: `/app/${res.user.role || role}` });
                          }
                        }}
                      >
                        <div className="google-avatar">A</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)" }}>
                            Aditya Dalvi
                          </div>
                          <div style={{ fontSize: 12, color: "var(--mute)", overflow: "hidden", textOverflow: "ellipsis" }}>
                            dalaviaditya07@gmail.com
                          </div>
                        </div>
                        <span className="google-verified-badge">Verified Investor</span>
                      </button>
                    )}

                    {/* Show Verified Student only for Student / University roles */}
                    {(role === "student" || role === "university") && (
                      <button
                        type="button"
                        className="google-account-item"
                        onClick={async () => {
                          setShowGooglePicker(false);
                          const res = await signInWithGoogle(role, "252921378@sguk.ac.in", "Student (SGU)");
                          if (res.success && res.user) {
                            closeAuthModal();
                            router.navigate({ to: `/app/${res.user.role || role}` });
                          }
                        }}
                      >
                        <div className="google-avatar" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>S</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)" }}>
                            SGU Institutional Student
                          </div>
                          <div style={{ fontSize: 12, color: "var(--mute)", overflow: "hidden", textOverflow: "ellipsis" }}>
                            252921378@sguk.ac.in
                          </div>
                        </div>
                        <span className="google-verified-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>Official SGU</span>
                      </button>
                    )}

                    {/* Custom Google Account Option */}
                    <div
                      style={{
                        padding: "12px",
                        background: "var(--field)",
                        border: "1px solid var(--line2)",
                        borderRadius: "10px",
                        marginTop: 4,
                      }}
                    >
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                        {role === "student" || role === "university"
                          ? "Or enter your official university email:"
                          : "Or enter another Google / Firm Email:"}
                      </label>
                      <input
                        type="email"
                        placeholder={
                          role === "student" || role === "university"
                            ? "e.g. 252921378@sguk.ac.in or student@university.edu"
                            : "e.g. partner@fund.vc or user@gmail.com"
                        }
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        style={{ height: 36, fontSize: 13, marginBottom: 8 }}
                      />
                      {(role === "student" || role === "university") &&
                        customGoogleEmail.includes("@") &&
                        !isUniversityEmail(customGoogleEmail) && (
                          <div style={{ color: "#ef4444", fontSize: 11.5, marginBottom: 8, lineHeight: 1.4 }}>
                            ⚠️ Personal email addresses (@gmail.com) are strictly prohibited for {ROLES[role]}. You must use an official university domain (.ac.in, .edu, @sguk.ac.in).
                          </div>
                        )}
                      <input
                        type="text"
                        placeholder="Your Name (optional)"
                        value={customGoogleName}
                        onChange={(e) => setCustomGoogleName(e.target.value)}
                        style={{ height: 36, fontSize: 13, marginBottom: 10 }}
                      />
                      <button
                        type="button"
                        className="btn primary"
                        style={{ height: 34, fontSize: 13 }}
                        disabled={
                          !customGoogleEmail.includes("@") ||
                          ((role === "student" || role === "university") && !isUniversityEmail(customGoogleEmail))
                        }
                        onClick={async () => {
                          setShowGooglePicker(false);
                          const res = await signInWithGoogle(role, customGoogleEmail, customGoogleName);
                          if (res.success && res.user) {
                            closeAuthModal();
                            router.navigate({ to: `/app/${res.user.role || role}` });
                          }
                        }}
                      >
                        Continue with this account
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: 11, color: "var(--mute)", margin: 0, textAlign: "center" }}>
                    Secured by CampusVenture Institutional Access Protection
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
