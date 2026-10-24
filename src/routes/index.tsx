import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronDown,
  FolderLock,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { LogIn } from "lucide-react";

const TITLE = "CampusVenture — Where Student Startups Meet Their First Opportunity";
const DESCRIPTION =
  "CampusVenture connects verified student founders with investors through AI-powered investment readiness, intelligent discovery, and secure collaboration.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Investment Readiness",
    body: "A weighted 0–100 assessment across problem clarity, traction, business model and funding clarity — with concrete next steps. Informational, not investment advice.",
  },
  {
    icon: BadgeCheck,
    title: "Verified Ecosystem",
    body: "University-email verification for founders and organisation checks for investors, so both sides know who they are talking to.",
  },
  {
    icon: FolderLock,
    title: "Secure Data Rooms",
    body: "Private storage, approval-gated access, an NDA step and a full access log of every view, download and upload.",
  },
  {
    icon: Search,
    title: "Investor Discovery",
    body: "Transparent weighted matching on sector, stage, ticket size, geography and thesis — with a plain-English 'why this is a match'.",
  },
  {
    icon: Building2,
    title: "University Ecosystem",
    body: "Institutions track startup stages, readiness distribution and investor interest, and publish programs and demo days.",
  },
  {
    icon: TrendingUp,
    title: "Measured Impact",
    body: "Readiness improvement over time, connection outcomes and ecosystem analytics — no vanity metrics.",
  },
];

const STEPS = [
  { title: "Verify", body: "Student founders verify through their university email." },
  { title: "Build the profile", body: "Startup details, pitch deck, metrics and a 2–3 minute pitch video." },
  { title: "Assess", body: "AI readiness scoring with strengths, gaps and an action plan." },
  { title: "Discover", body: "Weighted matching surfaces genuinely relevant investors." },
  { title: "Collaborate", body: "Connection requests, NDA-gated data rooms, messaging and meetings." },
];

function Landing() {
  const { user, isAuthenticated, openAuthModal, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-brand text-sm font-bold text-primary-foreground">
              CV
            </span>
            <span className="font-semibold">CampusVenture</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Button asChild size="sm">
                  <Link to={`/app/${user.role}`}>
                    Open {user.role === "investor" ? "Investor" : user.role === "student" ? "Founder" : "University"} Portal
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => openAuthModal(undefined, "signin")}>
                  <LogIn className="size-3.5 mr-1" />
                  Sign In
                </Button>
                <Button size="sm" onClick={() => openAuthModal(undefined, "register")}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-halo" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Where Student Startups Meet Their First Opportunity
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
            Great student ideas deserve <span className="text-gradient-brand">the right opportunity.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">{DESCRIPTION}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="h-12 px-8 text-base shadow-elevated">
                  <Link to={`/app/${user.role}`}>
                    Open {user.role === "investor" ? "Investor" : user.role === "student" ? "Student Founder" : "University"} Dashboard
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 text-base"
                  onClick={() => signOut()}
                >
                  Sign Out / Switch Role
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  className="h-12 px-8 text-base shadow-elevated"
                  onClick={() => openAuthModal(undefined, "register")}
                >
                  Get Started
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base"
                  onClick={() => {
                    const el = document.getElementById("how-it-works");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  See How It Works
                  <ChevronDown className="ml-2 size-4" />
                </Button>
              </>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified University Network
            </span>
            <span className="hidden sm:inline">•</span>
            <span>AI Investment Readiness</span>
            <span className="hidden sm:inline">•</span>
            <span>Free for Student Founders</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>The problem</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Thousands of students build promising startups through hackathons, coursework and
              incubators. Most go quiet — not because the idea was weak, but because founders lack
              exposure, investor access, credibility and pitch-readiness. Investors, meanwhile,
              struggle to find genuine, verified early-stage student teams.
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Our mission</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Make promising student startups discoverable, investment-ready and connected to the
              right opportunities. CampusVenture is a discovery, readiness, verification and
              collaboration platform — it does not process investments or guarantee funding.
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-8 scroll-mt-20">
        <h2 className="text-2xl font-semibold">How CampusVenture works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border bg-card p-5">
              <span className="text-xs font-medium text-primary">Step {i + 1}</span>
              <h3 className="mt-2 font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold">Built for a trusted ecosystem</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-elevated">
              <CardHeader>
                <f.icon className="size-5 text-primary" aria-hidden="true" />
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-2xl font-semibold">FAQ</h2>
        <Accordion type="single" collapsible className="mt-6">
          <AccordionItem value="a">
            <AccordionTrigger>Does CampusVenture handle investments?</AccordionTrigger>
            <AccordionContent>
              No. There is no payment processing, equity transfer or transaction settlement. The
              platform covers discovery, readiness, verification and secure communication.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>What does the AI readiness score mean?</AccordionTrigger>
            <AccordionContent>
              It is an AI-generated readiness assessment, not investment advice and not a prediction
              of funding success. Weights are published and configurable.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="c">
            <AccordionTrigger>Is the NDA workflow legally binding protection?</AccordionTrigger>
            <AccordionContent>
              CampusVenture provides a digital NDA workflow for platform use. It does not guarantee
              protection against idea theft and does not replace professional legal advice.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-elevated">
          <h2 className="text-2xl font-semibold sm:text-3xl">Ready to launch your opportunity?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Connect verified student founders, angel & VC investors, and university incubators in one secure ecosystem.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="h-12 px-8 text-base shadow-elevated">
                  <Link to={`/app/${user.role}`}>
                    Open {user.role === "investor" ? "Investor" : user.role === "student" ? "Student Founder" : "University"} Dashboard
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 text-base"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  className="h-12 px-8 text-base shadow-elevated"
                  onClick={() => openAuthModal(undefined, "register")}
                >
                  Create Your Account
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => openAuthModal(undefined, "signin")}
                    className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    Sign in here
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        <p>
          CampusVenture — discovery, readiness and collaboration for student founders. Not investment advice.
        </p>
      </footer>
    </div>
  );
}
