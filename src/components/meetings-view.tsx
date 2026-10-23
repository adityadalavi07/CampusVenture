import { useState } from "react";
import { CalendarClock, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_INVESTORS } from "@/lib/demo-data";
import { MY_INVESTOR_ID, MY_STARTUP_ID, formatWhen, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";

export function MeetingsView({ as }: { as: "student" | "investor" }) {
  const { meetings, startups, requestMeeting, setMeetingStatus, notify } = useVenture();
  const { user } = useAuth();
  const currentStartupId =
    startups.find(
      (s) =>
        (user?.email && s.founderEmail?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.name && s.founder === user.name)
    )?.id || MY_STARTUP_ID;

  const mine = meetings.filter((m) =>
    as === "student"
      ? m.startupId === currentStartupId || m.startupId === MY_STARTUP_ID
      : m.investorId === MY_INVESTOR_ID,
  );

  const [target, setTarget] = useState(
    as === "student" ? DEMO_INVESTORS[0]!.id : startups[0]?.id ?? MY_STARTUP_ID,
  );
  const [title, setTitle] = useState("Intro call");
  const [when, setWhen] = useState("");
  const [minutes, setMinutes] = useState("30");

  function schedule() {
    if (!when) {
      toast.error("Pick a date and time.");
      return;
    }
    requestMeeting({
      startupId: as === "student" ? currentStartupId : target,
      investorId: as === "student" ? target : MY_INVESTOR_ID,
      title: title.trim() || "Meeting",
      at: new Date(when).toISOString(),
      minutes: Number(minutes),
      requestedBy: as,
    });
    notify(as === "student" ? "investor" : "student", "Meeting request", `${title} — ${formatWhen(new Date(when).toISOString())}`);
    toast.success("Meeting request sent");
    setWhen("");
  }

  const label = (sId: string, iId: string) =>
    as === "student"
      ? DEMO_INVESTORS.find((i) => i.id === iId)?.name ?? "Investor"
      : startups.find((s) => s.id === sId)?.name ?? "Startup";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your meetings</CardTitle>
          <CardDescription>Confirm, decline or track upcoming calls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mine.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No meetings yet.
            </p>
          )}
          {mine
            .slice()
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {m.title} · {label(m.startupId, m.investorId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(m.at)} · {m.minutes} min · requested by {m.requestedBy}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === "confirmed" ? "default" : "secondary"}>
                    {m.status}
                  </Badge>
                  {m.status === "requested" && m.requestedBy !== as && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setMeetingStatus(m.id, "confirmed");
                          toast.success("Meeting confirmed");
                        }}
                      >
                        <Check className="size-4" aria-hidden="true" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMeetingStatus(m.id, "declined");
                          toast("Meeting declined");
                        }}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule a meeting</CardTitle>
          <CardDescription>Send a slot request to the other side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>{as === "student" ? "Investor" : "Startup"}</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {as === "student"
                  ? DEMO_INVESTORS.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} — {i.organization}
                      </SelectItem>
                    ))
                  : startups.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-title">Title</Label>
            <Input id="mt-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-when">Date & time</Label>
            <Input
              id="mt-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-min">Duration (minutes)</Label>
            <Input
              id="mt-min"
              type="number"
              min={15}
              step={15}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={schedule}>
            <CalendarClock className="size-4" aria-hidden="true" /> Send request
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
