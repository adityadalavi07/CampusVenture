import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ExternalLink, Github, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/demo-data";
import { STATUS_LABEL, completeness, useVenture, type ReviewStatus } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isSameUniversity } from "@/lib/university-matcher";

const TITLE = "Startup Review Queue — CampusVenture";
const DESCRIPTION =
  "Verify student startups: review problem, solution, deck and repository, then approve or request changes.";

export const Route = createFileRoute("/app/university/review")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: ReviewQueue,
});

const FILTERS: { value: ReviewStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Changes requested" },
  { value: "draft", label: "Drafts" },
];

function ReviewQueue() {
  const { startups } = useVenture();
  const { user } = useAuth();

  const uniStartups = startups.filter((s) => {
    if (!user) return true;
    return isSameUniversity(
      { org: user.org, email: user.email },
      { university: s.university, email: s.founderEmail }
    );
  });

  return (
    <AppShell role="university">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Review queue</h1>
          <p className="text-sm text-muted-foreground">
            {user?.org || "University Incubation Cell"} · Verification decisions are logged and visible to the founder.
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label} ({uniStartups.filter((s) => s.status === f.value).length})
              </TabsTrigger>
            ))}
          </TabsList>
          {FILTERS.map((f) => {
            const list = uniStartups.filter((s) => s.status === f.value);
            return (
              <TabsContent key={f.value} value={f.value} className="space-y-4">
                {list.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                    No {f.label.toLowerCase()} submissions from {user?.org || "your university"} right now.
                  </div>
                ) : (
                  list.map((s) => <ReviewCard key={s.id} id={s.id} />)
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </AppShell>
  );
}

function ReviewCard({ id }: { id: string }) {
  const { startups, setReview, notify } = useVenture();
  const s = startups.find((x) => x.id === id)!;
  const [note, setNote] = useState(s.reviewNote);

  function decide(status: ReviewStatus) {
    if (status === "rejected" && note.trim().length < 10) {
      toast.error("Add a short note so the founder knows what to fix.");
      return;
    }
    setReview(s.id, status, note.trim());
    notify(
      "student",
      status === "approved" ? "Startup verified! 🎉" : "Changes requested",
      status === "approved"
        ? `${s.name} is verified by your university and now visible to accredited investors.`
        : `${s.name}: ${note.trim()}`,
    );
    if (status === "approved") {
      notify(
        "investor",
        "New verified startup on campus",
        `${s.name} (${s.sector}, ${s.stage}) was just verified by ${s.university}.`,
      );
    }
    toast.success(status === "approved" ? `${s.name} approved` : `Feedback sent to ${s.name}`);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{s.name}</CardTitle>
            <CardDescription>
              {s.sector} · {s.stage} · raising {formatMoney(s.fundingRequired)} · {s.teamSize} {s.teamSize === 1 ? "person" : "people"}
              {s.founder ? ` · Founder: ${s.founder}` : ""}
              {s.founderEmail ? ` (${s.founderEmail})` : ""}
              {s.university ? ` · ${s.university}` : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{completeness(s)}% complete</Badge>
            <Badge>{STATUS_LABEL[s.status]}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Field title="Problem" text={s.problem} />
          <Field title="Solution" text={s.solution} />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Deck: {s.deckName || "not uploaded"}</span>
          {s.videoUrl && (
            <a
              href={s.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" /> Video pitch
            </a>
          )}
          {s.githubUrl && (
            <a
              href={s.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Github className="size-3.5" aria-hidden="true" /> Repository
            </a>
          )}
        </div>
        <Textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reviewer note (required when requesting changes)"
          aria-label={`Reviewer note for ${s.name}`}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => decide("approved")}>
            <Check className="size-4" aria-hidden="true" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => decide("rejected")}>
            <X className="size-4" aria-hidden="true" /> Request changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{text || "Not provided."}</p>
    </div>
  );
}
