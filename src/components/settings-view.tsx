import { useState, useEffect } from "react";
import { RotateCcw, Save, ShieldCheck, CheckCircle2, LogOut } from "lucide-react";
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
  const { user, signOut } = useAuth();
  const router = useRouter();

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
        {/* Account & Security Card */}
        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Account &amp; Security
              </CardTitle>
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
              >
                <CheckCircle2 className="size-3 mr-1" />
                Active Session
              </Badge>
            </div>
            <CardDescription>
              Manage your credentials, role privileges, and session authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs">
            <div className="grid gap-2 rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account Status:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Verified Member
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assigned Role:</span>
                <Badge variant="secondary" className="capitalize text-[11px]">
                  {user?.role || role}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Primary Email:</span>
                <span className="font-medium text-foreground">{user?.email || profile.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Security Protection:</span>
                <span className="text-muted-foreground font-medium">Row-Level Security Active</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="size-3.5 mr-1.5" />
              Sign Out of Account
            </Button>
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
