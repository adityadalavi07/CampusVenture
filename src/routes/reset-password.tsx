import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, KeyRound, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

const TITLE = "Reset Password — CampusVenture";
const DESCRIPTION = "Enter and confirm your new secure password for your CampusVenture account.";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { openAuthModal } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasSession, setHasSession] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>("");

  // Extract session from recovery link parameters (PKCE code, token_hash, or hash fragment)
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function initRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const hash = window.location.hash || "";

        // Check for error in hash or search query
        if (hash.includes("error=") || searchParams.has("error")) {
          const params = new URLSearchParams(hash.replace("#", "?"));
          const desc = params.get("error_description") || searchParams.get("error_description");
          setErrorMsg(desc || "This password reset link has expired or is invalid. Please request a new link.");
          setHasSession(false);
          return;
        }

        // 1. Check for PKCE code in query string (?code=...)
        const code = searchParams.get("code");
        if (code) {
          setIsLoading(true);
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          setIsLoading(false);
          if (!error && data.session) {
            setHasSession(true);
            setUserEmail(data.session.user.email || "");
            setErrorMsg("");
            return;
          }
        }

        // 2. Check for token_hash & type=recovery in query string
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        if (tokenHash && type === "recovery") {
          setIsLoading(true);
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          setIsLoading(false);
          if (!error && data.session) {
            setHasSession(true);
            setUserEmail(data.session.user.email || "");
            setErrorMsg("");
            return;
          }
        }

        // 3. Check for implicit hash fragment (#access_token=...&refresh_token=...)
        if (hash.includes("access_token")) {
          const hashParams = new URLSearchParams(hash.replace("#", ""));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            setIsLoading(true);
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            setIsLoading(false);
            if (!error && data.session) {
              setHasSession(true);
              setUserEmail(data.session.user.email || "");
              setErrorMsg("");
              return;
            }
          }
        }

        // 4. Check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
          setUserEmail(session.user.email || "");
        } else {
          // Listen for incoming recovery auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
            if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && s) {
              setHasSession(true);
              setUserEmail(s.user.email || "");
              setErrorMsg("");
            }
          });
          setTimeout(() => subscription.unsubscribe(), 6000);
        }
      } catch (err: any) {
        console.warn("Recovery session init notice:", err);
      }
    }

    initRecoverySession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);

    try {
      // Ensure active session before calling updateUser
      let session = (await supabase.auth.getSession()).data.session;
      if (!session && typeof window !== "undefined") {
        const hash = window.location.hash || "";
        if (hash.includes("access_token")) {
          const hashParams = new URLSearchParams(hash.replace("#", ""));
          const at = hashParams.get("access_token");
          const rt = hashParams.get("refresh_token");
          if (at && rt) {
            const { data } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
            session = data.session;
          }
        }
        const code = new URLSearchParams(window.location.search).get("code");
        if (code && !session) {
          const { data } = await supabase.auth.exchangeCodeForSession(code);
          session = data.session;
        }
      }

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      // Update password in local registered accounts cache as well
      const resolvedEmail = data.user?.email || userEmail || session?.user?.email;
      if (resolvedEmail) {
        const cleanEmail = resolvedEmail.trim().toLowerCase();
        try {
          const stored = localStorage.getItem("campusventure_registered_users");
          if (stored) {
            const users = JSON.parse(stored);
            const updated = users.map((u: any) =>
              u.email.toLowerCase() === cleanEmail ? { ...u, password: newPassword } : u
            );
            localStorage.setItem("campusventure_registered_users", JSON.stringify(updated));
          }
        } catch {
          /* ignore */
        }

        // Broadcast real-time event to open desktop devices and tabs
        try {
          const ch = supabase.channel(`password-reset-${cleanEmail}`);
          ch.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              ch.send({
                type: "broadcast",
                event: "password-updated",
                payload: { email: cleanEmail },
              });
            }
          });
        } catch (broadcastErr) {
          console.warn("Realtime broadcast notice:", broadcastErr);
        }
      }

      setIsSuccess(true);
      toast.success("Password updated successfully! You can now log into your account.");
    } catch (err: any) {
      console.error("Password update error:", err);
      const isSessionErr =
        err?.message?.includes("session") ||
        err?.message?.includes("Auth session missing") ||
        err?.code === "auth_session_missing";

      if (isSessionErr) {
        setErrorMsg("Your reset session has expired or was already used. Please request a new password reset link.");
      } else {
        setErrorMsg(err?.message || "Failed to update password. Please try again.");
      }
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-brand text-primary-foreground text-sm font-extrabold">
              CV
            </span>
            <span>CampusVenture</span>
          </Link>
          <p className="text-xs text-muted-foreground">Institutional Student &amp; Investor Venture Platform</p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary mb-2">
              <KeyRound className="size-6" />
            </div>
            <CardTitle className="text-xl">Set New Password</CardTitle>
            <CardDescription className="text-xs">
              {isSuccess
                ? "Your security credentials have been refreshed."
                : "Create a new strong password for your verified account."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Password Updated</h3>
                  <p className="text-xs text-muted-foreground">
                    Your password has been changed securely. You can now sign in with your new credentials.
                  </p>
                </div>
                <Button
                  className="w-full gap-2 mt-4"
                  onClick={() => {
                    navigate({ to: "/" });
                    setTimeout(() => openAuthModal(), 300);
                  }}
                >
                  Sign In Now <ArrowRight className="size-4" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {errorMsg && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive space-y-2">
                    <p>{errorMsg}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-semibold"
                      onClick={() => {
                        navigate({ to: "/" });
                        setTimeout(() => openAuthModal(undefined, "forgot"), 300);
                      }}
                    >
                      Request New Reset Link
                    </Button>
                  </div>
                )}

                {isLoading && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary flex items-center justify-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Authenticating secure reset session...</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="new-pw" className="text-xs">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-pw"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className="pr-10 text-xs"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw" className="text-xs">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-pw"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    className="text-xs"
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                  <Lock className="size-4" />
                  {isLoading ? "Updating Password..." : "Update Password"}
                </Button>

                <div className="text-center pt-2">
                  <Link to="/" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                    Back to CampusVenture Home
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
