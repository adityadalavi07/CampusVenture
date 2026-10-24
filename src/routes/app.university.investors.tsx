import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Eye, HandCoins } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, type Investor } from "@/lib/demo-data";
import { timeAgo, useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isSameUniversity } from "@/lib/university-matcher";
import { investorService } from "@/services/investorService";
import { requestService, type DataRoomRequestRecord, type ConnectionRequestRecord } from "@/services/requestService";

const TITLE = "Investor Interest — CampusVenture University";
const DESCRIPTION =
  "See which investors are engaging with your campus startups: requests, data rooms and meetings.";

export const Route = createFileRoute("/app/university/investors")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: InvestorInterest,
});

function InvestorInterest() {
  const { requests, access, meetings, messages, startups } = useVenture();
  const { user } = useAuth();
  const myUniversity = user?.org || "";

  // Strictly filter startups belonging to this authenticated university
  const campusStartups = startups.filter((s) => isSameUniversity(myUniversity, s.university));
  const campusStartupIds = campusStartups.map((s) => s.id);

  const [investors, setInvestors] = useState<Investor[]>([]);
  const [liveDrRequests, setLiveDrRequests] = useState<DataRoomRequestRecord[]>([]);
  const [liveConnRequests, setLiveConnRequests] = useState<ConnectionRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      investorService.getAllInvestors(),
      requestService.getUniversityInvestorActivity(campusStartupIds),
    ]).then(([invList, activity]) => {
      if (active) {
        setInvestors(invList);
        setLiveDrRequests(activity.dataRoomRequests);
        setLiveConnRequests(activity.connectionRequests);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [campusStartupIds.length, myUniversity]);

  // Combine store state with live database requests
  const campusRequests = [
    ...liveConnRequests,
    ...requests.filter((r) => campusStartupIds.includes(r.startupId)),
  ];

  const campusDataRoomGrants = [
    ...liveDrRequests.filter((d) => d.status === "granted"),
    ...access.filter((a) => campusStartupIds.includes(a.startupId) && a.status === "granted"),
  ];

  const campusMeetings = meetings.filter((m) => campusStartupIds.includes(m.startupId));

  const stats = [
    { label: "Connection requests", value: campusRequests.length, icon: HandCoins },
    { label: "Data-room grants", value: campusDataRoomGrants.length, icon: Eye },
    { label: "Meetings booked", value: campusMeetings.length, icon: Building2 },
  ];

  const rows = investors
    .map((i) => {
      const invRequests = campusRequests.filter((r: any) => (r.senderId === i.id || r.investorId === i.id)).length;
      const invRooms = campusDataRoomGrants.filter((a: any) => a.investorId === i.id).length;
      const invMeetings = campusMeetings.filter((m) => m.investorId === i.id).length;
      const invMessages = messages.filter((m) => m.investorId === i.id && campusStartupIds.includes(m.startupId)).length;

      return {
        investor: i,
        requests: invRequests,
        rooms: invRooms,
        meetings: invMeetings,
        messages: invMessages,
        totalActivity: invRequests + invRooms + invMeetings + invMessages,
      };
    })
    .sort((a, b) => b.totalActivity - a.totalActivity);

  // Recent activity specifically for this campus
  const recentActivities: Array<{ id: string; investorName: string; startupName: string; kind: string; status: string; at: string }> = [];

  liveDrRequests.forEach((d) => {
    recentActivities.push({
      id: d.id,
      investorName: d.investorName || "Investor",
      startupName: d.startupName || "Campus Venture",
      kind: "Data-room request",
      status: d.status,
      at: d.createdAt,
    });
  });

  liveConnRequests.forEach((c) => {
    recentActivities.push({
      id: c.id,
      investorName: c.senderName || "Investor",
      startupName: c.startupName || "Campus Venture",
      kind: "Connection request",
      status: c.status,
      at: c.createdAt,
    });
  });

  const recent = recentActivities.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  return (
    <AppShell role="university">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Investor interest</h1>
          <p className="text-sm text-muted-foreground">
            Live institutional engagement across startups from {myUniversity || "your campus"}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 pt-6">
                <s.icon className="size-5 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investors engaging with your campus</CardTitle>
            <CardDescription>Ranked by total verified activity for {myUniversity || "your university"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Cheque</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Data rooms</TableHead>
                  <TableHead className="text-right">Meetings</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.investor.id}>
                    <TableCell>
                      <p className="font-medium">{r.investor.name}</p>
                      <p className="text-xs text-muted-foreground">{r.investor.organization}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatMoney(r.investor.ticketMin)}–{formatMoney(r.investor.ticketMax)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.requests}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.rooms}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.meetings}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.messages}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent campus activity</CardTitle>
            <CardDescription>Latest investor requests for {myUniversity || "your startups"}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recent.length === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No investor activity recorded for {myUniversity || "your campus"} yet. When investors request data rooms or send connection requests, they will appear here.
              </p>
            )}
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">
                    {r.investorName} → {r.startupName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.kind} · {timeAgo(r.at)}
                  </p>
                </div>
                <Badge variant={r.status === "granted" || r.status === "accepted" ? "default" : "outline"} className="capitalize">
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
