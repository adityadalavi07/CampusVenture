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

  // Check if recovery token or hash fragment is present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash && hash.includes("error=")) {
        const params = new URLSearchParams(hash.replace("#", "?"));
        const desc = params.get("error_description");
        setErrorMsg(desc || "This password reset link has expired or is invalid. Please request a new one.");
      }
    }
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
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast.success("Password updated successfully! You can now log into your account.");
    } catch (err: any) {
      console.error("Password update error:", err);
      setErrorMsg(err?.message || "Failed to update password. Your reset session may have expired.");
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
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                    {errorMsg}
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
