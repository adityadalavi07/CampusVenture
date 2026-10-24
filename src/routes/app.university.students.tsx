import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVenture } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isSameUniversity } from "@/lib/university-matcher";

const TITLE = "Students — CampusVenture University";
const DESCRIPTION = "Verify student founders, see their startups and manage campus enrolment.";

export const Route = createFileRoute("/app/university/students")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const { students, startups, setStudentVerified, notify, updateStudent } = useVenture();
  const { registeredUsers, user } = useAuth();
  const [q, setQ] = useState("");

  // Auto-sync registered student accounts with the university roster
  useEffect(() => {
    registeredUsers.forEach((reg) => {
      if (reg.role === "student") {
        const found = students.some((st) => st.email.toLowerCase() === reg.email.toLowerCase());
        if (!found) {
          const matchingStartup = startups.find(
            (s) => s.founderEmail?.toLowerCase() === reg.email.toLowerCase() || s.founder === reg.name
          );
          updateStudent(reg.email, {
            name: reg.name,
            email: reg.email,
            branch: "Computer Science & Engineering",
            year: "Final year",
            startupId: matchingStartup?.id || null,
            verified: false,
            org: reg.org,
          });
        }
      }
    });
  }, [registeredUsers, students, startups, updateStudent]);

  const uniStudents = students.filter((s) => {
    if (!user) return true;
    return isSameUniversity(
      { org: user.org, email: user.email },
      { org: s.org, email: s.email }
    );
  });

  const rows = uniStudents.filter((s) =>
    `${s.name} ${s.email} ${s.branch}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell role="university">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Students</h1>
          <p className="text-sm text-muted-foreground">
            {uniStudents.filter((s) => s.verified).length} of {uniStudents.length} student founders verified from {user?.org || "your university"}.
          </p>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students"
            aria-label="Search students"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student roster</CardTitle>
            <CardDescription>Verification unlocks investor visibility.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Startup</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const startup = startups.find((x) => x.id === s.startupId);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.branch}
                        <span className="block text-xs text-muted-foreground">{s.year}</span>
                      </TableCell>
                      <TableCell className="text-sm">{startup?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.verified ? "default" : "secondary"}>
                          {s.verified ? "Verified" : "Unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={s.verified ? "outline" : "default"}
                          onClick={() => {
                            setStudentVerified(s.id, !s.verified);
                            if (!s.verified)
                              notify("student", "Student verified", `${s.name} is now verified.`);
                            toast.success(s.verified ? `${s.name} unverified` : `${s.name} verified`);
                          }}
                        >
                          {s.verified ? (
                            <ShieldX className="size-4" aria-hidden="true" />
                          ) : (
                            <ShieldCheck className="size-4" aria-hidden="true" />
                          )}
                          {s.verified ? "Revoke" : "Verify"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
