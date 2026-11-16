import { sguLogoSvg } from "./generate_svgs.js";

function makePrelimFooter(romanPage) {
  return `
  <div class="page-footer">
    <span>UCSFP301 — Field Project Report</span>
    <span>Department of Computer Science &amp; Engineering, SGU</span>
    <span>Page ${romanPage}</span>
  </div>`;
}

export function getPreliminaryPages() {
  const pages = [];

  // ==========================================
  // PRELIMINARY PAGE 1: TITLE PAGE (NO FOOTER)
  // ==========================================
  pages.push(`
  <div class="page title-page">
    <div style="text-align: center; margin-top: 10mm; margin-bottom: 8mm;">
      ${sguLogoSvg}
    </div>
    <div style="text-align: center; font-size: 13pt; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 6mm;">
      A FIELD PROJECT REPORT ON
    </div>
    <div style="text-align: center; font-size: 18pt; font-weight: bold; color: #0f172a; margin-bottom: 6mm; line-height: 1.35;">
      CampusVenture: Multi-Tenant Student Startup Incubation, Diligence &amp; Angel Investor Platform
    </div>
    <div style="text-align: center; font-size: 11pt; font-style: italic; margin-bottom: 3mm;">
      Submitted in partial fulfilment of the requirements for
    </div>
    <div style="text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 3mm;">
      UCSFP301 — Field Project
    </div>
    <div style="text-align: center; font-size: 11pt; margin-bottom: 10mm;">
      Second Year — Bachelor of Technology in Computer Science and Engineering
    </div>
    <div style="text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 3mm;">
      SUBMITTED BY
    </div>
    <table style="margin: 0 auto 10mm auto; border-collapse: collapse; font-size: 11pt; text-align: left;">
      <tr><td style="padding: 1.5mm 4mm; font-weight: bold;">Aayush Patil</td><td style="padding: 1.5mm 4mm;">PRN: 252921378</td></tr>
      <tr><td style="padding: 1.5mm 4mm; font-weight: bold;">Aditya Dalavi</td><td style="padding: 1.5mm 4mm;">PRN: 252921389</td></tr>
      <tr><td style="padding: 1.5mm 4mm; font-weight: bold;">Krish Kumar</td><td style="padding: 1.5mm 4mm;">PRN: 252921413</td></tr>
      <tr><td style="padding: 1.5mm 4mm; font-weight: bold;">Sarthak More</td><td style="padding: 1.5mm 4mm;">PRN: 252921075</td></tr>
    </table>
    <div style="text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 2mm;">
      UNDER THE GUIDANCE OF
    </div>
    <div style="text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 12mm;">
      Mr. Gurunath Machhale
    </div>
    <div style="text-align: center; font-size: 11.5pt; font-weight: bold; line-height: 1.45;">
      Department of Computer Science and Engineering<br/>
      Sanjay Ghodawat University, Kolhapur<br/>
      Academic Year 2026–27
    </div>
  </div>
  `);

  // ==========================================
  // PRELIMINARY PAGE 2: CERTIFICATE (PAGE ii)
  // ==========================================
  pages.push(`
  <div class="page cert-page">
    <div style="text-align: center; margin-top: 8mm; margin-bottom: 6mm;">
      ${sguLogoSvg}
    </div>
    <div style="text-align: center; font-size: 16pt; font-weight: bold; letter-spacing: 1px; margin-bottom: 8mm;">
      CERTIFICATE
    </div>
    <p style="text-align: justify; line-height: 1.75; font-size: 10.5pt; margin-bottom: 6mm;">
      This is to certify that the Field Project entitled <strong>“CAMPUSVENTURE: MULTI-TENANT STUDENT STARTUP INCUBATION, DILIGENCE &amp; ANGEL INVESTOR PLATFORM”</strong> has been satisfactorily completed and submitted by the following students of Second Year B.Tech. Computer Science and Engineering, in partial fulfilment of the requirements for the course <strong>UCSFP301 — Field Project</strong>, during the academic year 2026–27, under our guidance.
    </p>
    <div style="margin: 4mm 0 16mm 10mm; line-height: 1.85; font-size: 10.5pt;">
      1. Aayush Patil &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; PRN No: 252921378<br/>
      2. Aditya Dalavi &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; PRN No: 252921389<br/>
      3. Krish Kumar &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; PRN No: 252921413<br/>
      4. Sarthak More &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; PRN No: 252921075
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10.5pt; margin-bottom: 22mm;">
      <div>Place: Kolhapur</div>
      <div>Date: 04/11/2026</div>
    </div>
    <div style="display: flex; justify-content: space-between; text-align: center; font-size: 10pt; font-weight: bold;">
      <div style="width: 30%;">
        ___________________________<br/>
        Mr. Gurunath Machhale<br/>
        <span style="font-weight: normal; font-size: 9pt;">(Mentor / Guide)</span>
      </div>
      <div style="width: 30%;">
        ___________________________<br/>
        Mrs. Seema Sambhushete<br/>
        <span style="font-weight: normal; font-size: 9pt;">(Course Coordinator)</span>
      </div>
      <div style="width: 30%;">
        ___________________________<br/>
        Dr. Deepika Patil<br/>
        <span style="font-weight: normal; font-size: 9pt;">(HOD, CSE)</span>
      </div>
    </div>
    ${makePrelimFooter("ii")}
  </div>
  `);

  // ==========================================
  // PRELIMINARY PAGE 3: DECLARATION (PAGE iii)
  // ==========================================
  pages.push(`
  <div class="page decl-page">
    <div style="text-align: center; font-size: 16pt; font-weight: bold; letter-spacing: 1px; margin-top: 12mm; margin-bottom: 8mm;">
      DECLARATION
    </div>
    <p style="text-align: justify; line-height: 1.75; font-size: 10.5pt; margin-bottom: 6mm;">
      We hereby declare that the Field Project report titled <strong>“CampusVenture: Multi-Tenant Student Startup Incubation, Diligence &amp; Angel Investor Platform”</strong> submitted for <strong>UCSFP301 — Field Project</strong> is our original academic work prepared under the guidance of <strong>Mr. Gurunath Machhale</strong>. Technical explanations, system architecture, database models, security policies, and application interfaces represented in this report are authentic and reflect the functioning web application deployed and tested. All external references, software libraries, and academic documentation used in the project have been acknowledged where appropriate. We have not represented undocumented features, mock data, or synthetic results as verified outcomes.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 8mm; margin-bottom: 20mm; font-size: 10.5pt;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="border: 1px solid #334155; padding: 3mm 4mm; width: 12%; text-align: center;">Sr. No</th>
          <th style="border: 1px solid #334155; padding: 3mm 4mm; width: 38%;">Name</th>
          <th style="border: 1px solid #334155; padding: 3mm 4mm; width: 25%; text-align: center;">PRN No</th>
          <th style="border: 1px solid #334155; padding: 3mm 4mm; width: 25%; text-align: center;">Signature</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #334155; padding: 3mm 4mm; text-align: center;">1.</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm;">Aayush Patil</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm; text-align: center;">252921378</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm;"></td>
        </tr>
        <tr>
          <td style="border: 1px solid #334155; padding: 3mm 4mm; text-align: center;">2.</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm;">Aditya Dalavi</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm; text-align: center;">252921389</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm;"></td>
        </tr>
        <tr>
          <td style="border: 1px solid #334155; padding: 3mm 4mm; text-align: center;">3.</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm;">Krish Kumar</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm; text-align: center;">252921413</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm;"></td>
        </tr>
        <tr>
          <td style="border: 1px solid #334155; padding: 3mm 4mm; text-align: center;">4.</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm;">Sarthak More</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm; text-align: center;">252921075</td>
          <td style="border: 1px solid #334155; padding: 3mm 4mm;"></td>
        </tr>
      </tbody>
    </table>
    <div style="display: flex; justify-content: space-between; font-size: 10.5pt;">
      <div>Place: Kolhapur</div>
      <div>Date: 04/11/2026</div>
    </div>
    ${makePrelimFooter("iii")}
  </div>
  `);

  // ==========================================
  // PRELIMINARY PAGE 4: ACKNOWLEDGEMENT (PAGE iv)
  // ==========================================
  pages.push(`
  <div class="page ack-page">
    <div style="text-align: center; font-size: 16pt; font-weight: bold; letter-spacing: 1px; margin-top: 12mm; margin-bottom: 8mm;">
      ACKNOWLEDGEMENT
    </div>
    <p style="text-align: justify; line-height: 1.7; font-size: 10.5pt; margin-bottom: 4mm;">
      We sincerely express our deep gratitude to our project guide, <strong>Mr. Gurunath Machhale</strong>, for his continuous encouragement, technical counsel, architectural insights, and constructive feedback throughout the lifecycle of this field project. His expert recommendations in multi-tenant authorization, database policy enforcement, and report structuring significantly elevated the technical rigor and practical stability of our work.
    </p>
    <p style="text-align: justify; line-height: 1.7; font-size: 10.5pt; margin-bottom: 4mm;">
      We also express our heartfelt appreciation to the <strong>Department of Computer Science and Engineering, Sanjay Ghodawat University, Kolhapur</strong>, for providing the academic infrastructure, development facilities, cloud trial environments, and institutional encouragement necessary to execute this project. The department created an inspiring space for technical discourse, design iteration, and peer collaboration from initial conceptualization to final live deployment.
    </p>
    <p style="text-align: justify; line-height: 1.7; font-size: 10.5pt; margin-bottom: 4mm;">
      Our sincere thanks go to <strong>Dr. Deepika Patil</strong> (Head of Department, CSE) and <strong>Mrs. Seema Sambhushete</strong> (Course Coordinator) for their administrative oversight, procedural guidance, and academic benchmarks during the planning, intermediate evaluation, and final verification stages of UCSFP301.
    </p>
    <p style="text-align: justify; line-height: 1.7; font-size: 10.5pt; margin-bottom: 4mm;">
      We are grateful to our classmates, student founders at the Sanjay Ghodawat University Incubation Centre, and institutional mentors who participated in early workflow simulations, diligence trials, and usability reviews. Their candid observations assisted us in refining the virtual data room interface, responsive touch interactions, and multi-tenant audit synchronization.
    </p>
    <p style="text-align: justify; line-height: 1.7; font-size: 10.5pt; margin-bottom: 4mm;">
      Finally, we acknowledge the developer communities behind modern open-source web technologies, including React 19, TypeScript, Tailwind CSS, Supabase PostgreSQL, and Vercel. Their official documentation and tooling ecosystems enabled our four-member team to construct an enterprise-grade, secure software system for campus venture acceleration.
    </p>
    ${makePrelimFooter("iv")}
  </div>
  `);

  // ==========================================
  // PRELIMINARY PAGE 5: TABLE OF CONTENTS (PAGE v) - EXACT MATCHING NUMBERS
  // ==========================================
  pages.push(`
  <div class="page toc-page">
    <div style="text-align: center; font-size: 16pt; font-weight: bold; letter-spacing: 1px; margin-top: 8mm; margin-bottom: 6mm;">
      TABLE OF CONTENTS
    </div>
    <table style="width: 100%; border: none; font-size: 9pt; line-height: 1.48;">
      <tbody>
        <tr><td><strong>1. Introduction</strong></td><td style="text-align: right;"><strong>1</strong></td></tr>
        <tr><td><strong>2. Literature Review</strong></td><td style="text-align: right;"><strong>2</strong></td></tr>
        <tr><td style="padding-left: 5mm;">2.1 Background Study</td><td style="text-align: right;">2</td></tr>
        <tr><td style="padding-left: 5mm;">2.2 Gaps Identified (Table 2.1: G1 to G6)</td><td style="text-align: right;">3</td></tr>
        <tr><td><strong>3. Motivation, Problem Statement and Objectives</strong></td><td style="text-align: right;"><strong>4</strong></td></tr>
        <tr><td style="padding-left: 5mm;">3.1 Motivation</td><td style="text-align: right;">4</td></tr>
        <tr><td style="padding-left: 5mm;">3.2 Problem Statement</td><td style="text-align: right;">4</td></tr>
        <tr><td style="padding-left: 5mm;">3.3 Objectives (Objectives 1 to 9)</td><td style="text-align: right;">4</td></tr>
        <tr><td><strong>4. System Architecture</strong></td><td style="text-align: right;"><strong>5</strong></td></tr>
        <tr><td style="padding-left: 5mm;">4.1 Architecture Overview</td><td style="text-align: right;">5</td></tr>
        <tr><td style="padding-left: 5mm;">4.2 Layers of the Architecture (Figure 4.1 Request Flow)</td><td style="text-align: right;">5</td></tr>
        <tr><td style="padding-left: 5mm;">4.3 Technology Stack (Table 4.1 Production Stack)</td><td style="text-align: right;">6</td></tr>
        <tr><td style="padding-left: 5mm;">4.4 Project Files and Components (Table 4.2 Module Map)</td><td style="text-align: right;">6</td></tr>
        <tr><td><strong>5. System Design</strong></td><td style="text-align: right;"><strong>7</strong></td></tr>
        <tr><td style="padding-left: 5mm;">5.1 Use Case Diagram (Figure 5.1 Unified Actor Model)</td><td style="text-align: right;">7</td></tr>
        <tr><td style="padding-left: 5mm;">5.2 Class Diagram (Figure 5.2 Entity Model)</td><td style="text-align: right;">8</td></tr>
        <tr><td style="padding-left: 5mm;">5.3 Object Diagram (Figure 5.3 AutoCampus AI Instance)</td><td style="text-align: right;">8</td></tr>
        <tr><td style="padding-left: 5mm;">5.4 Sequence Diagram (Figure 5.4 Diligence &amp; NDA Protocol)</td><td style="text-align: right;">9</td></tr>
        <tr><td style="padding-left: 5mm;">5.5 Activity Diagram (Figure 5.5 Diligence Decision Tree)</td><td style="text-align: right;">10</td></tr>
        <tr><td style="padding-left: 5mm;">5.6 State Chart Diagram (Figure 5.6 VDR State Machine)</td><td style="text-align: right;">10</td></tr>
        <tr><td style="padding-left: 5mm;">5.7 Communication Diagram (Figure 5.7 Inter-Object Messages)</td><td style="text-align: right;">11</td></tr>
        <tr><td style="padding-left: 5mm;">5.8 Component Diagram (Figure 5.8 Package Boundaries)</td><td style="text-align: right;">11</td></tr>
        <tr><td style="padding-left: 5mm;">5.9 Deployment Diagram (Figure 5.9 Cloud Topology)</td><td style="text-align: right;">12</td></tr>
        <tr><td style="padding-left: 5mm;">5.10 Data Flow Diagram (Figure 5.10 DFD Level 0 &amp; Level 1)</td><td style="text-align: right;">12</td></tr>
        <tr><td><strong>6. Methodology</strong></td><td style="text-align: right;"><strong>13</strong></td></tr>
        <tr><td style="padding-left: 5mm;">6.1 Development Approach (Agile Sprints)</td><td style="text-align: right;">13</td></tr>
        <tr><td style="padding-left: 5mm;">6.2 Working of the System</td><td style="text-align: right;">13</td></tr>
        <tr><td style="padding-left: 5mm;">6.3 Team Roles &amp; Technical Ownership (Table 6.1 Playbook)</td><td style="text-align: right;">13</td></tr>
        <tr><td style="padding-left: 5mm;">6.4 Formulas and Scoring Units (IRS, DRI, Valuation)</td><td style="text-align: right;">14</td></tr>
        <tr><td style="padding-left: 5mm;">6.5 Data Handling and Validation</td><td style="text-align: right;">14</td></tr>
        <tr><td style="padding-left: 5mm;">6.6 Testing Approach</td><td style="text-align: right;">14</td></tr>
        <tr><td><strong>7. Field Work Details &amp; Data Collected</strong></td><td style="text-align: right;"><strong>15</strong></td></tr>
        <tr><td style="padding-left: 5mm;">7.1 Nature of the Field Work at SGU Incubation Centre</td><td style="text-align: right;">15</td></tr>
        <tr><td style="padding-left: 5mm;">7.2 Input Data Used by the System</td><td style="text-align: right;">15</td></tr>
        <tr><td style="padding-left: 5mm;">7.3 Worked Case Study: AutoCampus AI (Table 7.1)</td><td style="text-align: right;">15</td></tr>
        <tr><td style="padding-left: 5mm;">7.4 Application Interface (Figures 7.1, 7.2, 7.3 Live Mockups)</td><td style="text-align: right;">16</td></tr>
        <tr><td><strong>8. Result &amp; Analysis</strong></td><td style="text-align: right;"><strong>17</strong></td></tr>
        <tr><td style="padding-left: 5mm;">8.1 Implemented Features &amp; Expected Behaviour (Table 8.1)</td><td style="text-align: right;">17</td></tr>
        <tr><td style="padding-left: 5mm;">8.2 Real-World Diligence Verification Results</td><td style="text-align: right;">17</td></tr>
        <tr><td style="padding-left: 5mm;">8.3 Performance, Audit Trail &amp; Responsiveness (Table 8.2)</td><td style="text-align: right;">18</td></tr>
        <tr><td style="padding-left: 5mm;">8.4 Input Validation &amp; Security Verification (RLS Policies)</td><td style="text-align: right;">18</td></tr>
        <tr><td style="padding-left: 5mm;">8.5 Test Cases (Table 8.3: TC01 to TC09 Verification)</td><td style="text-align: right;">19</td></tr>
        <tr><td style="padding-left: 5mm;">8.6 Strengths and Limitations</td><td style="text-align: right;">19</td></tr>
        <tr><td><strong>9. Conclusion and Future Scope</strong></td><td style="text-align: right;"><strong>20</strong></td></tr>
        <tr><td style="padding-left: 5mm;">9.1 Conclusion</td><td style="text-align: right;">20</td></tr>
        <tr><td style="padding-left: 5mm;">9.2 Future Scope</td><td style="text-align: right;">20</td></tr>
        <tr><td><strong>10. References</strong></td><td style="text-align: right;"><strong>20</strong></td></tr>
        <tr><td><strong>11. Appendix</strong></td><td style="text-align: right;"><strong>20</strong></td></tr>
        <tr><td style="padding-left: 5mm;">Appendix A: Database Schema &amp; Row Level Security Policy</td><td style="text-align: right;">20</td></tr>
        <tr><td style="padding-left: 5mm;">Appendix B: Technical Abbreviations</td><td style="text-align: right;">20</td></tr>
      </tbody>
    </table>
    ${makePrelimFooter("v")}
  </div>
  `);

  // ==========================================
  // PRELIMINARY PAGE 6: ABSTRACT (PAGE vi)
  // ==========================================
  pages.push(`
  <div class="page abs-page">
    <div style="text-align: center; font-size: 16pt; font-weight: bold; letter-spacing: 1px; margin-top: 10mm; margin-bottom: 8mm;">
      ABSTRACT
    </div>
    <p style="text-align: justify; line-height: 1.7; font-size: 10.5pt; margin-bottom: 4mm;">
      <strong>CampusVenture</strong> is a production-deployed, multi-tenant software-as-a-service (SaaS) web platform engineered to bridge the critical structural divide between university student innovators, accredited angel investors, and collegiate incubation centres. While collegiate engineering campuses foster high concentrations of early-stage intellectual property, commercialization is frequently hindered by fragmented outreach, unverified pitch materials, lack of standardized investment diligence, and vulnerability to confidential document leakage.
    </p>
    <p style="text-align: justify; line-height: 1.7; font-size: 10.5pt; margin-bottom: 4mm;">
      The application unites three independent stakeholder dashboards into a single cryptographically secure ecosystem: (1) <strong>Student Founders</strong> build structured venture profiles, upload confidential pitch decks, manage a virtual data room, and receive 9-category AI-assisted investment readiness scoring; (2) <strong>Accredited Investors</strong> discover university-verified deal flow, filter opportunities by thesis and stage, request data room diligence access, execute legally binding mutual Non-Disclosure Agreements (NDAs), and review approved files; and (3) <strong>University Incubation Cells</strong> evaluate student venture submissions, verify student bona fides, and maintain a tamper-resistant real-time diligence audit ledger that synchronizes investor document interactions across institutions without cross-tenant data exposure.
    </p>
    <p style="text-align: justify; line-height: 1.7; font-size: 10.5pt; margin-bottom: 4mm;">
      CampusVenture is architected using React 19, TypeScript, and Tailwind CSS on the presentation tier, powered by Supabase managed PostgreSQL, Supabase Auth, private Supabase Storage buckets, and deployed globally across Vercel Edge networks. Security boundaries are strictly enforced at the database level utilizing comprehensive PostgreSQL Row Level Security (RLS) policies, domain-level institutional email filters (e.g. <code>@sguk.ac.in</code>), short-lived cryptographically signed document URLs, and resilient blob downloading mechanisms. The platform was validated on real campus ventures, including <em>AutoCampus AI</em> from Sanjay Ghodawat University, verifying complete end-to-end multi-tenant isolation, real-time audit logging, and responsive cross-device usability.
    </p>
    <div style="margin-top: 8mm; font-size: 10.5pt;">
      <strong>Keywords:</strong> Multi-Tenant SaaS, Student Startups, Angel Investment, Virtual Data Room, Mutual NDA, Row Level Security, Supabase PostgreSQL, Tamper-Resistant Audit Ledger, Academic Incubation.
    </div>
    ${makePrelimFooter("vi")}
  </div>
  `);

  return pages;
}
