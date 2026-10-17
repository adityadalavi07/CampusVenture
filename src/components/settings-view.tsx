import { useState, useEffect } from "react";
import { RotateCcw, Save, Database, ShieldCheck, CheckCircle2, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/demo-data";
import { useRouter } from "@tanstack/react-router";

const DEFAULTS: Record<Role, { name: string; email: string; org: string; bio: string }> = {
  student: {
    name: "Aayush Patil",
    email: "aayush@coep.ac.in",
    org: "COEP Technological University",
    bio: "Final-year computer engineering student building Lumen Labs.",
  },
  investor: {
    name: "Anaya Krishnan",
    email: "anaya@northbridge.vc",
    org: "Northbridge Seed",
    bio: "Backing technical student founders building software for education and work.",
  },
  university: {
    name: "COEP Innovation Cell",
    email: "innovation@coep.ac.in",
    org: "COEP Technological University",
    bio: "Verifying student startups and running readiness programmes.",
  },
};

const KEY = (role: Role) => `campusventure.profile.${role}`;

export function SettingsView({ role }: { role: Role }) {
  const { resetDemo } = useVenture();
  const { user, dbStatus, refreshDbStatus, signOut } = useAuth();
  const router = useRouter();

  const [testingDb, setTestingDb] = useState(false);
  const [profile, setProfile] = useState(() => {
    let saved: Partial<{ name: string; email: string; org: string; bio: string }> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(KEY(role));
        if (raw) saved = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    return {
      ...DEFAULTS[role],
      ...saved,
      name: user?.name || saved.name || DEFAULTS[role].name,
      email: user?.email || saved.email || DEFAULTS[role].email,
      org: user?.org || saved.org || DEFAULTS[role].org,
    };
  });

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        org: user.org || prev.org,
      }));
    }
  }, [user]);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(role === "university");

  function save() {
    try {
      window.localStorage.setItem(KEY(role), JSON.stringify(profile));
    } catch {
      /* ignore */
    }
    toast.success("Profile saved");
  }

  async function handleTestConnection() {
    setTestingDb(true);
    try {
      const status = await refreshDbStatus();
      if (status.connected) {
        toast.success(`Supabase connected! Latency: ${status.latencyMs ?? "<50"}ms`);
      } else {
        toast.error(`Database connection issue: ${status.message}`);
      }
    } catch (err) {
      toast.error("Failed to ping database");
    } finally {
      setTestingDb(false);
    }
  }

  const handleLogout = async () => {
    await signOut();
    router.navigate({ to: "/" });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Shown on your public CampusVenture profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="st-name">Name</Label>
            <Input
              id="st-name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-email">Email</Label>
            <Input
              id="st-email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-org">Organisation</Label>
            <Input
              id="st-org"
              value={profile.org}
              onChange={(e) => setProfile({ ...profile, org: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-bio">Bio</Label>
            <Textarea
              id="st-bio"
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </div>
          <Button onClick={save}>
            <Save className="size-4" aria-hidden="true" /> Save changes
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* Database & Authorization Card */}
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="size-4 text-primary" />
                Database & Authorization
              </CardTitle>
              {dbStatus?.connected ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Connecting...
                </Badge>
              )}
            </div>
            <CardDescription>
              Real-time connection status with Supabase and active RBAC role session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs">
            <div className="grid gap-2 rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Provider:</span>
                <span className="font-semibold text-foreground">Supabase Cloud</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Project ID:</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                  {dbStatus?.projectId || "fhjkuwpbnlcxtvenpnqm"}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Role:</span>
                <Badge variant="secondary" className="capitalize text-[11px]">
                  <ShieldCheck className="size-3 mr-1 text-primary" />
                  {user?.role || role}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Authenticated As:</span>
                <span className="font-medium text-foreground">{user?.email || "Guest"}</span>
              </div>
              {dbStatus?.latencyMs !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">API Latency:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {dbStatus.latencyMs} ms
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleTestConnection}
                disabled={testingDb}
              >
                <RefreshCw
                  className={`size-3.5 mr-1.5 ${testingDb ? "animate-spin" : ""}`}
                />
                {testingDb ? "Testing Connection..." : "Test Database Connection"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="size-3.5 mr-1" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>Control what reaches your inbox.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="st-alerts" className="font-normal">
                Email alerts for new activity
              </Label>
              <Switch id="st-alerts" checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="st-digest" className="font-normal">
                Weekly ecosystem digest
              </Label>
              <Switch id="st-digest" checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace data</CardTitle>
            <CardDescription>
              Reset every startup, message, meeting and data-room record back to the seeded set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                resetDemo();
                toast.success("Workspace reset");
              }}
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Reset workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
