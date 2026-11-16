import {
  figure1Architecture,
  figure2UseCase,
  figure3ClassDiagram,
  figure4ObjectDiagram,
  figure5SequenceDiagram,
  figure6ActivityDiagram,
  figure7StateChartDiagram,
  figure8CommunicationDiagram,
  figure9ComponentDiagram,
  figure10DeploymentDiagram,
  figure11DataFlowDiagram
} from "./generate_svgs.js";

function makeHeader() {
  return `
  <div class="page-header">
    <span>CampusVenture: Multi-Tenant Student Startup Platform</span>
    <span>Sanjay Ghodawat University, Kolhapur</span>
  </div>`;
}

function makeFooter(pageNum) {
  return `
  <div class="page-footer">
    <span>UCSFP301 — Field Project Report</span>
    <span>Department of Computer Science &amp; Engineering</span>
    <span>Page ${pageNum} of 20</span>
  </div>`;
}

export function getChapter1To5Pages() {
  const pages = [];

  // ==========================================
  // PAGE 7 (CH 1, NUMBERED 1): INTRODUCTION
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-bottom: 4mm;">
      1. Introduction
    </div>
    <p style="text-align: justify; line-height: 1.65; font-size: 10pt; margin-bottom: 3.5mm;">
      In contemporary higher education institutions, undergraduate engineering and technology campuses have evolved into fertile grounds for student-led innovation, intellectual property incubation, and high-impact technology ventures. However, despite the surge in student ideation, an acute structural divide persists between collegiate innovators, institutional incubation authorities, and external angel investor networks. Student founders frequently encounter severe friction when attempting to communicate their technical progress, validate institutional affiliation, and secure pre-seed or seed capital from accredited early-stage investors.
    </p>
    <p style="text-align: justify; line-height: 1.65; font-size: 10pt; margin-bottom: 3.5mm;">
      Historically, campus-based entrepreneurship relies upon ad-hoc mechanisms: pitch presentations circulated via unencrypted email attachments, informal pitch sessions with fragmented investor notes, and manual paper-based Non-Disclosure Agreements (NDAs). This loose methodology exposes collegiate ventures to severe risks, notably the leakage of confidential intellectual property, unauthorized dissemination of sensitive financial cap tables, and complete absence of an auditable trail of diligence access. Simultaneously, angel investors face elevated transaction search costs and information asymmetry, as unverified student proposals lack standardized readiness metrics, verified academic credentials, and institutional vetting.
    </p>
    <p style="text-align: justify; line-height: 1.65; font-size: 10pt; margin-bottom: 3.5mm;">
      To address these structural inefficiencies, this field project conceives, architects, and implements <strong>CampusVenture</strong>—an enterprise-grade, multi-tenant software-as-a-service (SaaS) web platform specifically engineered for collegiate startup ecosystems. CampusVenture unifies three distinct user roles into an integrated, cryptographically isolated ecosystem:
    </p>
    <ul style="font-size: 9.5pt; line-height: 1.6; margin-left: 6mm; margin-bottom: 3.5mm;">
      <li><strong>Student Founders:</strong> Empowered to publish structured venture profiles, upload pitch materials, maintain an encrypted Virtual Data Room (VDR), and track real-time investor engagement and multi-category readiness scores.</li>
      <li><strong>Accredited Angel Investors:</strong> Provided with an institutional deal-flow exploration portal, granular sector and university filtering, automated mutual Non-Disclosure Agreement execution, and temporary signed-URL access to diligence assets.</li>
      <li><strong>University Incubation Centres:</strong> Equipped with an institutional governance cockpit to verify student bona fides, audit startup viability, review diligence activity, and maintain a tamper-resistant real-time audit ledger across institutional cohorts.</li>
    </ul>
    <p style="text-align: justify; line-height: 1.65; font-size: 10pt; margin-bottom: 3.5mm;">
      Developed using React 19, TypeScript, Tailwind CSS, Supabase PostgreSQL, and Vercel Edge networks, CampusVenture enforces strict zero-trust multi-tenancy via database Row Level Security (RLS) policies and institutional domain verification, delivering a secure bridge from campus lab ideation to venture capitalization.
    </p>
    ${makeFooter(1)}
  </div>
  `);

  // ==========================================
  // PAGE 8 (CH 2.1, NUMBERED 2): LITERATURE REVIEW - BACKGROUND STUDY
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-bottom: 3mm;">
      2. Literature Review
    </div>
    <div style="font-size: 11pt; font-weight: bold; color: #334155; margin-bottom: 2.5mm;">
      2.1 Background Study
    </div>
    <p style="text-align: justify; line-height: 1.6; font-size: 9.5pt; margin-bottom: 3mm;">
      The acceleration of student entrepreneurship and academic technology transfer has been widely investigated across software engineering and information systems literature. Early-stage venture financing models highlight that information asymmetry between founders and angel syndicates represents the single highest determinant of transaction failure. Traditional commercial platforms such as AngelList, Gust, and Crunchbase cater predominantly to established, incorporated legal entities possessing audited financial statements, historical revenue traction, and experienced executive teams. Consequently, nascent student enterprises emerging from academic laboratories are systematically marginalized within these mainstream platforms.
    </p>
    <p style="text-align: justify; line-height: 1.6; font-size: 9.5pt; margin-bottom: 3mm;">
      Specialized document-sharing utilities like DocSend and Dropbox Transfer provide page-level view telemetry; however, they operate as isolated document silos detached from institutional accreditation, multi-tenant academic governance, or legally integrated mutual NDAs. Conversely, university-managed learning portals (e.g. Moodle, Canvas) and generic Google Drive shared folders lack domain-specific venture evaluation rubrics, investor discovery pipelines, and cryptographic access enforcement.
    </p>
    <div style="font-size: 10pt; font-weight: bold; color: #1e293b; margin-bottom: 2mm;">
      Key Comparative Dimensions in Existing Incubation Systems:
    </div>
    <ul style="font-size: 9.2pt; line-height: 1.55; margin-left: 5mm; margin-bottom: 3.5mm;">
      <li><strong>Commercial Venture Marketplaces:</strong> Focus on late-stage seed/Series A; lack collegiate email validation, university endorsement badging, and multi-tenant university cohort filtering.</li>
      <li><strong>Generic Cloud Storage Services:</strong> Provide basic file hosting but lack automated bilateral NDA execution workflows, role-based diligence gates, and immutable audit logs for institutional compliance.</li>
      <li><strong>Institutional Academic Repositories:</strong> Focus on academic grading and thesis submission; completely divorced from external angel investors, capital tracking, and market-standard startup metrics.</li>
      <li><strong>Manual Incubation Cell Spreadsheets:</strong> Suffer from synchronization latency, manual email chains, human error in cap-table record keeping, and lack of mobile touch accessibility.</li>
    </ul>
    <p style="text-align: justify; line-height: 1.6; font-size: 9.5pt; margin-bottom: 2.5mm;">
      Recent research in multi-tenant SaaS security emphasizes that application-tier access control is vulnerable to privilege escalation and horizontal boundary crossing if not backed by database-level policy guarantees. The modern paradigm advocates for declarative database Row Level Security (RLS) combined with ephemeral cryptographically signed object retrieval, which guarantees that authorization policies are universally evaluated regardless of access pathway.
    </p>
    ${makeFooter(2)}
  </div>
  `);

  // ==========================================
  // PAGE 9 (CH 2.2, NUMBERED 3): LITERATURE REVIEW - GAPS IDENTIFIED
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 11pt; font-weight: bold; color: #334155; margin-bottom: 3mm;">
      2.2 Gaps Identified
    </div>
    <p style="text-align: justify; line-height: 1.6; font-size: 9.5pt; margin-bottom: 3.5mm;">
      A systematic comparative analysis of existing research literature, commercial fundraising tools, and academic incubation practices revealed six fundamental structural gaps. Table 2.1 delineates these gaps and specifies the concrete architectural solutions implemented in CampusVenture.
    </p>
    <div style="font-size: 9pt; font-weight: bold; margin-bottom: 1.5mm; color: #0f172a;">
      Table 2.1: Structural Gaps in Existing Platforms vs. CampusVenture Architectural Solution
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; line-height: 1.45; margin-bottom: 4mm;">
      <thead>
        <tr style="background: #e2e8f0; color: #0f172a;">
          <th style="border: 1px solid #64748b; padding: 2.5mm 2mm; width: 8%; text-align: center;">Gap ID</th>
          <th style="border: 1px solid #64748b; padding: 2.5mm 3mm; width: 22%;">Identified Gap</th>
          <th style="border: 1px solid #64748b; padding: 2.5mm 3mm; width: 33%;">Current Existing Approach</th>
          <th style="border: 1px solid #64748b; padding: 2.5mm 3mm; width: 37%;">CampusVenture Engineering Solution</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 2mm; text-align: center; font-weight: bold;">G1</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm; font-weight: bold;">Institutional Trust Deficit</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Unverified self-declarations on social media and generic email accounts.</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Automated academic email verification (e.g. <code>@sguk.ac.in</code>) and institutional incubation cell endorsement badges.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 2mm; text-align: center; font-weight: bold;">G2</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm; font-weight: bold;">Confidential IP &amp; Pitch Leakage</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Unrestricted public drive links and circulating PDF pitch decks without agreements.</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Restricted Virtual Data Room gated by cryptographic digital mutual NDA and 60-second expiring signed download URLs.</td>
        </tr>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 2mm; text-align: center; font-weight: bold;">G3</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm; font-weight: bold;">Fragmented Diligence Channels</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Uncoordinated WhatsApp groups, scattered emails, and lost document versions.</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Centralized multi-category document vault with status tracking (Pending, Approved, Expired) and unified messaging.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 2mm; text-align: center; font-weight: bold;">G4</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm; font-weight: bold;">Subjective Readiness Assessment</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Impressionistic evaluations lacking quantitative criteria or structured feedback.</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Mathematical 9-category Investment Readiness Score (IRS) combined with Berkus &amp; Scorecard valuation models.</td>
        </tr>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 2mm; text-align: center; font-weight: bold;">G5</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm; font-weight: bold;">Cross-Tenant Data Exposure</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Software-layer if-else checks vulnerable to injection and credential tampering.</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">PostgreSQL Row Level Security (RLS) enforcing tenant isolation at SQL engine level with immutable audit log recording.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 2mm; text-align: center; font-weight: bold;">G6</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm; font-weight: bold;">Mobile Responsiveness Failure</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Desktop-centric layouts resulting in horizontal overflow and unclickable modals.</td>
          <td style="border: 1px solid #94a3b8; padding: 2mm;">Tailwind CSS safe-area touch architecture, responsive tabular containers, and cross-device blob download helper.</td>
        </tr>
      </tbody>
    </table>
    <p style="text-align: justify; line-height: 1.6; font-size: 9.5pt;">
      Resolving these gaps requires a holistic full-stack engineering solution that bridges legal compliance, database kernel security, and responsive modern user interface design into a singular coherent platform.
    </p>
    ${makeFooter(3)}
  </div>
  `);

  // ==========================================
  // PAGE 10 (CH 3, NUMBERED 4): MOTIVATION, PROBLEM STATEMENT & OBJECTIVES
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-bottom: 3.5mm;">
      3. Motivation, Problem Statement and Objectives
    </div>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      3.1 Motivation
    </div>
    <p style="text-align: justify; line-height: 1.6; font-size: 9.3pt; margin-bottom: 3mm;">
      The primary motivation behind this field project stems from direct observation of high-potential student ventures at the Sanjay Ghodawat University Incubation Centre whose growth stagnated due to barriers in accessing external angel syndicates. While technical talent and inventive spirit thrive in collegiate departments, student founders often lack the legal frameworks and digital tools required to present institutional-grade diligence materials. Developing an automated, tamper-resistant incubation SaaS creates an accessible launchpad for young engineers to transform academic research into scalable enterprises.
    </p>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      3.2 Problem Statement
    </div>
    <p style="text-align: justify; line-height: 1.6; font-size: 9.3pt; margin-bottom: 3.5mm;">
      <em>"To design, develop, secure, and deploy a responsive multi-tenant web platform that enables university student founders to curate verified venture profiles, safeguard intellectual property via digital mutual NDAs and virtual data rooms, undergo objective investment readiness scoring, and allow accredited angel investors and collegiate incubation cells to conduct streamlined diligence with complete row-level database isolation."</em>
    </p>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      3.3 Objectives
    </div>
    <ol style="font-size: 9pt; line-height: 1.55; margin-left: 5mm; margin-bottom: 3.5mm;">
      <li><strong>Multi-Tenant Architecture:</strong> Implement a robust multi-tenant architecture supporting three authenticated roles (Student Founder, Angel Investor, University Incubation Head) with isolated data perimeters.</li>
      <li><strong>Institutional Domain Verification:</strong> Enforce strict identity onboarding using institutional email domain classifications (e.g. <code>@sguk.ac.in</code>) to eliminate unverified actor profiles.</li>
      <li><strong>Virtual Data Room (VDR):</strong> Construct a private, encrypted document repository supporting multi-category file management (Pitch Decks, Cap Tables, Financial Models, IP Filings).</li>
      <li><strong>Automated Mutual NDA Protocol:</strong> Embed an in-browser bilateral digital signature workflow that legally executes and cryptographically binds NDAs before granting access to confidential files.</li>
      <li><strong>Ephemeral Signed URLs &amp; Download Engine:</strong> Integrate short-lived tokenized storage URLs (60-second TTL) and cross-device blob download handlers to eliminate direct public bucket exposure.</li>
      <li><strong>Quantitative Readiness Scoring:</strong> Formulate and compute an automated 9-category Investment Readiness Score (IRS) and Berkus pre-money valuation engine to eliminate subjective assessment bias.</li>
      <li><strong>Realtime Diligence Audit Ledger:</strong> Architect an immutable, real-time audit logging engine that tracks document views, access grants, and signature events across university dashboards.</li>
      <li><strong>Responsive Cross-Device Presentation:</strong> Build an adaptive, zero-overflow UI using React 19, Tailwind CSS, and safe-area touch components supporting screens from mobile to 4K displays.</li>
      <li><strong>Zero-Trust Database Security:</strong> Author comprehensive PostgreSQL Row Level Security (RLS) policies guaranteeing that tenant isolation is maintained at the database kernel level.</li>
    </ol>
    ${makeFooter(4)}
  </div>
  `);

  // ==========================================
  // PAGE 11 (CH 4.1 & 4.2, NUMBERED 5): SYSTEM ARCHITECTURE OVERVIEW & LAYERS
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-bottom: 2.5mm;">
      4. System Architecture
    </div>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      4.1 Architecture Overview
    </div>
    <p style="text-align: justify; line-height: 1.6; font-size: 9.3pt; margin-bottom: 2.5mm;">
      CampusVenture is architected around a modern, decoupled three-tier software architecture designed for horizontal scalability, zero-trust data segregation, and ultra-low edge latency. Figure 4.1 illustrates the architectural topology and multi-tenant request flow connecting the user presentation clients, edge routing services, and persistence engines.
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure1Architecture}
    </div>
    <div style="text-align: center; font-size: 8.5pt; font-weight: bold; color: #334155; margin-bottom: 2.5mm;">
      Figure 4.1: Three-Tier Multi-Tenant System Architecture and Request Flow
    </div>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 1.5mm;">
      4.2 Layers of the Architecture
    </div>
    <ul style="font-size: 8.8pt; line-height: 1.5; margin-left: 5mm;">
      <li><strong>Presentation Tier (Client SPA):</strong> Engineered using React 19 and Vite. Utilizes Tailwind CSS utility primitives, Lucide icon libraries, and custom responsive layouts with safe-area paddings to guarantee seamless usability across mobile phones, tablets, and desktop workstations.</li>
      <li><strong>Edge &amp; Routing Tier:</strong> Deployed on the Vercel Global Anycast Edge Network, terminating TLS 1.3 connections close to users. Houses the Nitro router, client-side session state guards, and the resilient blob download proxy.</li>
      <li><strong>Persistence &amp; Security Tier:</strong> Built on Supabase Cloud hosting PostgreSQL 15, managed Auth, and private S3-compatible Object Storage. Row Level Security (RLS) policies enforce data isolation directly inside the SQL engine.</li>
    </ul>
    ${makeFooter(5)}
  </div>
  `);

  // ==========================================
  // PAGE 12 (CH 4.3 & 4.4, NUMBERED 6): TECH STACK & PROJECT COMPONENTS
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      4.3 Technology Stack
    </div>
    <p style="text-align: justify; line-height: 1.55; font-size: 9.3pt; margin-bottom: 2mm;">
      The technology stack for CampusVenture was selected to balance high-performance rendering, strong static type safety, and database security. Table 4.1 summarizes the foundational stack components.
    </p>
    <div style="font-size: 8.5pt; font-weight: bold; margin-bottom: 1mm; color: #0f172a;">
      Table 4.1: Production Technology Stack Specifications
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 8.2pt; line-height: 1.4; margin-bottom: 3mm;">
      <thead>
        <tr style="background: #e2e8f0; color: #0f172a;">
          <th style="border: 1px solid #64748b; padding: 1.8mm 2mm; width: 22%;">Layer / Technology</th>
          <th style="border: 1px solid #64748b; padding: 1.8mm 2mm; width: 18%;">Version / Tool</th>
          <th style="border: 1px solid #64748b; padding: 1.8mm 2mm; width: 60%;">Functional Role &amp; Architectural Rationale</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-weight: bold;">Frontend Framework</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">React 19.0.0</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">High-performance reactive rendering with concurrent features and server components.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-weight: bold;">Language &amp; Types</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">TypeScript 5.8.2</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Strict static type checking across data models, API payloads, and component props.</td>
        </tr>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-weight: bold;">Styling Engine</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Tailwind CSS 3.4.1</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Utility-first responsive styles, mobile safe-area insets, and dark-mode tokens.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-weight: bold;">Bundler &amp; Dev Server</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Vite 6.2.0</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Lightning-fast ESM hot module replacement (HMR) and optimized rollup production bundles.</td>
        </tr>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-weight: bold;">Database &amp; RLS</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">PostgreSQL 15.1</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">ACID relational storage with Row Level Security (RLS) enforcing tenant isolation.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-weight: bold;">Authentication &amp; Auth</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Supabase Auth</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">JWT token issuance, email domain validation, password hashing (bcrypt), and sessions.</td>
        </tr>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-weight: bold;">Object Storage</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Supabase Storage</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Private encrypted buckets for pitch decks, issuing 60-second cryptographically signed URLs.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-weight: bold;">Cloud Hosting &amp; CDN</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Vercel Platform</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Automated CI/CD git deployments, global edge distribution, and Brotli compression.</td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      4.4 Project Files and Components
    </div>
    <div style="font-size: 8.5pt; font-weight: bold; margin-bottom: 1mm; color: #0f172a;">
      Table 4.2: Major Codebase Directory Structure and Responsibilities
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 8.2pt; line-height: 1.4;">
      <thead>
        <tr style="background: #e2e8f0; color: #0f172a;">
          <th style="border: 1px solid #64748b; padding: 1.8mm 2mm; width: 35%;">Source Directory / File</th>
          <th style="border: 1px solid #64748b; padding: 1.8mm 2mm; width: 65%;">Core Architecture Role &amp; Implementation Details</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-family: monospace;">src/routes/app.student.*</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Student founder interface: venture profile, readiness radar, and virtual data room vault.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-family: monospace;">src/routes/app.investor.*</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Angel investor portal: dealflow discovery, mutual NDA signing dialog, and diligence viewer.</td>
        </tr>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-family: monospace;">src/routes/app.university.*</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Incubation management: student verification, startup approval, and audit log inspection.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-family: monospace;">src/lib/download-helper.ts</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Resilient cross-device blob downloader resolving signed URLs with fallback synthetic packages.</td>
        </tr>
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-family: monospace;">src/components/app-shell.tsx</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Global multi-tenant shell: role switching, responsive sidebar, bottom navigation, and auth guard.</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 1.5mm; font-family: monospace;">supabase/migrations/*.sql</td>
          <td style="border: 1px solid #94a3b8; padding: 1.5mm;">Relational table schemas, foreign keys, triggers, and Row Level Security (RLS) policies.</td>
        </tr>
      </tbody>
    </table>
    ${makeFooter(6)}
  </div>
  `);

  // ==========================================
  // PAGE 13 (CH 5.1, NUMBERED 7): USE CASE DIAGRAM
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-bottom: 2.5mm;">
      5. System Design
    </div>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      5.1 Use Case Diagram
    </div>
    <p style="text-align: justify; line-height: 1.55; font-size: 9.3pt; margin-bottom: 2.5mm;">
      The Use Case model defines the functional boundaries of CampusVenture, capturing the precise interactions between external human actors and the internal system services. Figure 5.1 illustrates the actors: <strong>Student Founder</strong>, <strong>Accredited Investor</strong>, and <strong>University Incubation Head</strong>, alongside essential use cases, highlighting the mandatory <code>&lt;&lt;include&gt;&gt;</code> dependency between requesting data room access and executing the mutual Non-Disclosure Agreement.
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure2UseCase}
    </div>
    <div style="text-align: center; font-size: 8.5pt; font-weight: bold; color: #334155; margin-bottom: 2.5mm;">
      Figure 5.1: Unified Use Case Diagram for Student, Investor, and University Roles
    </div>
    <div style="font-size: 9.5pt; font-weight: bold; color: #1e293b; margin-bottom: 1mm;">
      Actor Interaction Specifications:
    </div>
    <ul style="font-size: 8.8pt; line-height: 1.45; margin-left: 5mm;">
      <li><strong>Student Founder:</strong> Can construct venture profiles, upload pitch files, view real-time readiness evaluations, and approve or monitor incoming investor access requests.</li>
      <li><strong>Accredited Investor:</strong> Can browse university-verified ventures, trigger data room access requests, digitally sign mutual NDAs, and stream authenticated diligence assets.</li>
      <li><strong>University Incubation Head:</strong> Can verify student academic identity, endorse startup readiness, and inspect immutable audit logs for compliance tracking.</li>
    </ul>
    ${makeFooter(7)}
  </div>
  `);

  // ==========================================
  // PAGE 14 (CH 5.2 & 5.3, NUMBERED 8): CLASS & OBJECT DIAGRAMS
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 1.5mm;">
      5.2 Class Diagram
    </div>
    <p style="text-align: justify; line-height: 1.5; font-size: 9pt; margin-bottom: 1.5mm;">
      The Class Diagram models the core entity objects, attributes, methods, and structural associations within the CampusVenture domain model. Figure 5.2 captures the relationships governing multi-tenant profiles, startups, documents, requests, and audit logs.
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure3ClassDiagram}
    </div>
    <div style="text-align: center; font-size: 8pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      Figure 5.2: Domain Class Diagram with Entity Attributes, Operations, and Cardinalities
    </div>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 1.5mm;">
      5.3 Object Diagram
    </div>
    <p style="text-align: justify; line-height: 1.5; font-size: 9pt; margin-bottom: 1.5mm;">
      Figure 5.3 depicts a runtime snapshot of instantiated objects representing the real campus venture <em>AutoCampus AI</em> from Sanjay Ghodawat University, illustrating live attribute bindings during an active investor diligence request.
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure4ObjectDiagram}
    </div>
    <div style="text-align: center; font-size: 8pt; font-weight: bold; color: #334155;">
      Figure 5.3: Runtime Object Diagram for AutoCampus AI Diligence Request Instance
    </div>
    ${makeFooter(8)}
  </div>
  `);

  // ==========================================
  // PAGE 15 (CH 5.4, NUMBERED 9): SEQUENCE DIAGRAM
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      5.4 Sequence Diagram
    </div>
    <p style="text-align: justify; line-height: 1.55; font-size: 9.3pt; margin-bottom: 2.5mm;">
      The Sequence Diagram chronologically details the message passing and interaction protocol between participating system components when an accredited investor requests access to a student startup's confidential virtual data room. Figure 5.4 captures the synchronous request validation, digital NDA contract execution, database record mutation, realtime event emission, and short-lived signed URL generation.
    </p>
    <div style="text-align: center; margin-bottom: 2mm;">
      ${figure5SequenceDiagram}
    </div>
    <div style="text-align: center; font-size: 8.5pt; font-weight: bold; color: #334155; margin-bottom: 3mm;">
      Figure 5.4: Chronological Sequence Diagram for Virtual Data Room Request, NDA Signing &amp; Asset Retrieval
    </div>
    <div style="font-size: 9.5pt; font-weight: bold; color: #1e293b; margin-bottom: 1.5mm;">
      Key Protocol Milestones:
    </div>
    <ol style="font-size: 8.8pt; line-height: 1.45; margin-left: 5mm;">
      <li><strong>Authorization Pre-Flight:</strong> The investor triggers <code>requestDataRoom</code>. Diligence Service inspects existing executed NDAs for the session user.</li>
      <li><strong>Legal Interception:</strong> If unexecuted, the client presents the legally formulated Mutual NDA dialog. The investor inputs their legal signatory name and consents to jurisdiction.</li>
      <li><strong>Cryptographic Commitment:</strong> The signature is converted to a SHA-256 hash digest, stored in PostgreSQL, and updates request state to <code>APPROVED</code>.</li>
      <li><strong>Realtime Audit Synchronization:</strong> An immutable audit event is emitted over WebSocket channels to notify the incubation cell, and a 60-second expiring signed URL is returned to the client.</li>
    </ol>
    ${makeFooter(9)}
  </div>
  `);

  // ==========================================
  // PAGE 16 (CH 5.5 & 5.6, NUMBERED 10): ACTIVITY & STATE CHART DIAGRAMS
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 1.5mm;">
      5.5 Activity Diagram
    </div>
    <p style="text-align: justify; line-height: 1.5; font-size: 9pt; margin-bottom: 1.5mm;">
      The Activity Diagram models the operational control flow of the diligence workflow from discovery to document download. Figure 5.5 depicts decision branching, NDA execution gates, and institutional audit logging.
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure6ActivityDiagram}
    </div>
    <div style="text-align: center; font-size: 8pt; font-weight: bold; color: #334155; margin-bottom: 2.5mm;">
      Figure 5.5: Activity Diagram for Investor Diligence Decision Flow and Access Granting
    </div>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 1.5mm;">
      5.6 State Chart Diagram
    </div>
    <p style="text-align: justify; line-height: 1.5; font-size: 9pt; margin-bottom: 1.5mm;">
      The State Chart Diagram models the finite state transitions undergone by a <code>DataRoomRequest</code> entity. Figure 5.6 details the state lifecycle: <code>NONE</code>, <code>REQUESTED</code>, <code>NDA_PENDING</code>, <code>APPROVED</code>, <code>REJECTED</code>, and <code>EXPIRED</code>.
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure7StateChartDiagram}
    </div>
    <div style="text-align: center; font-size: 8pt; font-weight: bold; color: #334155;">
      Figure 5.6: State Chart Diagram for Virtual Data Room Request Lifecycle State Machine
    </div>
    ${makeFooter(10)}
  </div>
  `);

  // ==========================================
  // PAGE 17 (CH 5.7 & 5.8, NUMBERED 11): COMMUNICATION & COMPONENT DIAGRAMS
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 1.5mm;">
      5.7 Communication Diagram
    </div>
    <p style="text-align: justify; line-height: 1.5; font-size: 9pt; margin-bottom: 1.5mm;">
      The Communication Diagram highlights the architectural structural arrangement and collaboration between runtime objects. Figure 5.7 details numbered message flows between client, diligence controllers, NDA managers, and database repositories.
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure8CommunicationDiagram}
    </div>
    <div style="text-align: center; font-size: 8pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      Figure 5.7: Communication Diagram Showing Inter-Object Message Coordination
    </div>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 1.5mm;">
      5.8 Component Diagram
    </div>
    <p style="text-align: justify; line-height: 1.5; font-size: 9pt; margin-bottom: 1.5mm;">
      Figure 5.8 specifies the software component breakdown, modular package boundaries, and inter-component dependencies spanning the Web Client, Business Layer, and Supabase Cloud persistence subsystems.
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure9ComponentDiagram}
    </div>
    <div style="text-align: center; font-size: 8pt; font-weight: bold; color: #334155;">
      Figure 5.8: Component Diagram Illustrating Package Boundaries and Interface Ports
    </div>
    ${makeFooter(11)}
  </div>
  `);

  // ==========================================
  // PAGE 18 (CH 5.9 & 5.10, NUMBERED 12): DEPLOYMENT & DFD DIAGRAMS
  // ==========================================
  pages.push(`
  <div class="page">
    ${makeHeader()}
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 1.5mm;">
      5.9 Deployment Diagram
    </div>
    <p style="text-align: justify; line-height: 1.5; font-size: 9pt; margin-bottom: 1.5mm;">
      The Deployment Diagram depicts the physical execution hardware, cloud nodes, and network communication protocols used in the production environment of CampusVenture. Figure 5.9 displays client devices, Vercel Edge nodes, and the Supabase Cloud region.
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure10DeploymentDiagram}
    </div>
    <div style="text-align: center; font-size: 8pt; font-weight: bold; color: #334155; margin-bottom: 2mm;">
      Figure 5.9: Physical Cloud Deployment Topology across Vercel Edge and AWS Mumbai (ap-south-1)
    </div>
    <div style="font-size: 10.5pt; font-weight: bold; color: #334155; margin-bottom: 1.5mm;">
      5.10 Data Flow Diagram (DFD Level 0 &amp; Level 1)
    </div>
    <p style="text-align: justify; line-height: 1.5; font-size: 9pt; margin-bottom: 1.5mm;">
      Figure 5.10 presents the Level 1 Data Flow Diagram, mapping data transformation processes (1.0 Auth, 2.0 Venture, 3.0 NDA, 4.0 Audit), external entity boundaries, and data stores (D1 Profiles, D2 Startups, D3 NDAs).
    </p>
    <div style="text-align: center; margin-bottom: 1.5mm;">
      ${figure11DataFlowDiagram}
    </div>
    <div style="text-align: center; font-size: 8pt; font-weight: bold; color: #334155;">
      Figure 5.10: Level 1 Data Flow Diagram (DFD) Mapping System Processes and Data Stores
    </div>
    ${makeFooter(12)}
  </div>
  `);

  return pages;
}
