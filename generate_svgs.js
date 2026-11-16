// High-Resolution SVG Diagrams for CampusVenture Project Report

export const sguLogoSvg = `
<svg width="86" height="92" viewBox="0 0 90 95" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="86" height="91" rx="6" fill="#c4161c" stroke="#8b0000" stroke-width="2"/>
  <rect x="5" y="5" width="80" height="18" fill="#8b0000" rx="3"/>
  <g fill="#ffffff" transform="translate(11, 8)">
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="scale(0.8)"/>
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="translate(16,0) scale(0.8)"/>
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="translate(32,0) scale(0.8)"/>
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="translate(48,0) scale(0.8)"/>
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="translate(64,0) scale(0.8)"/>
  </g>
  <text x="45" y="47" font-family="'Times New Roman', serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">SGU</text>
  <g transform="translate(45, 68)" stroke="#ffffff" stroke-width="1.8" fill="none">
    <circle cx="0" cy="0" r="6" fill="#ffffff"/>
    <line x1="0" y1="-14" x2="0" y2="14"/>
    <line x1="-14" y1="0" x2="14" y2="0"/>
    <line x1="-10" y1="-10" x2="10" y2="10"/>
    <line x1="-10" y1="10" x2="10" y2="-10"/>
    <line x1="-5" y1="-13" x2="5" y2="13"/>
    <line x1="-13" y1="-5" x2="13" y2="5"/>
    <line x1="-13" y1="5" x2="13" y2="-5"/>
    <line x1="-5" y1="13" x2="5" y2="-13"/>
    <circle cx="0" cy="0" r="14" stroke-dasharray="2,3"/>
  </g>
</svg>
`;

// Figure 1: System Architecture (3-Tier Multi-Tenant Request Flow)
export const figure1Architecture = `
<svg width="100%" height="240" viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <defs>
    <linearGradient id="tier1" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#eff6ff"/><stop offset="100%" stop-color="#dbeafe"/>
    </linearGradient>
    <linearGradient id="tier2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f0fdf4"/><stop offset="100%" stop-color="#dcfce7"/>
    </linearGradient>
    <linearGradient id="tier3" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#faf5ff"/><stop offset="100%" stop-color="#f3e8ff"/>
    </linearGradient>
    <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#334155"/>
    </marker>
  </defs>

  <!-- Presentation Tier -->
  <rect x="10" y="10" width="210" height="220" rx="8" fill="url(#tier1)" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="115" y="30" font-size="11" font-weight="bold" fill="#1e40af" text-anchor="middle">Presentation Tier (Client SPA)</text>
  
  <rect x="25" y="45" width="180" height="35" rx="5" fill="#ffffff" stroke="#93c5fd"/>
  <text x="115" y="60" font-size="9.5" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Student Founder Portal</text>
  <text x="115" y="73" font-size="8" fill="#64748b" text-anchor="middle">Profile, Pitch Deck, Data Room Vault</text>

  <rect x="25" y="90" width="180" height="35" rx="5" fill="#ffffff" stroke="#93c5fd"/>
  <text x="115" y="105" font-size="9.5" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Accredited Investor Portal</text>
  <text x="115" y="118" font-size="8" fill="#64748b" text-anchor="middle">Discovery, Diligence, Digital NDA</text>

  <rect x="25" y="135" width="180" height="35" rx="5" fill="#ffffff" stroke="#93c5fd"/>
  <text x="115" y="150" font-size="9.5" font-weight="bold" fill="#1e3a8a" text-anchor="middle">University Incubation Hub</text>
  <text x="115" y="163" font-size="8" fill="#64748b" text-anchor="middle">Verification, Diligence Audit, Cohorts</text>

  <rect x="25" y="180" width="180" height="38" rx="5" fill="#ffffff" stroke="#93c5fd"/>
  <text x="115" y="195" font-size="8.5" font-weight="bold" fill="#1e3a8a" text-anchor="middle">React 19 + Tailwind CSS + Lucide</text>
  <text x="115" y="208" font-size="7.5" fill="#64748b" text-anchor="middle">Responsive Safe-Area Touch Layouts</text>

  <!-- Connectors T1 to T2 -->
  <line x1="220" y1="62" x2="248" y2="62" stroke="#334155" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="220" y1="107" x2="248" y2="107" stroke="#334155" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="220" y1="152" x2="248" y2="152" stroke="#334155" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Edge & Logic Tier -->
  <rect x="250" y="10" width="200" height="220" rx="8" fill="url(#tier2)" stroke="#22c55e" stroke-width="1.5"/>
  <text x="350" y="30" font-size="11" font-weight="bold" fill="#166534" text-anchor="middle">Application &amp; Edge Tier</text>

  <rect x="265" y="45" width="170" height="35" rx="5" fill="#ffffff" stroke="#86efac"/>
  <text x="350" y="60" font-size="9" font-weight="bold" fill="#14532d" text-anchor="middle">Vercel Global Edge Network</text>
  <text x="350" y="73" font-size="8" fill="#64748b" text-anchor="middle">TLS 1.3 Termination &amp; Nitro SSR/SPA</text>

  <rect x="265" y="90" width="170" height="35" rx="5" fill="#ffffff" stroke="#86efac"/>
  <text x="350" y="105" font-size="9" font-weight="bold" fill="#14532d" text-anchor="middle">Auth &amp; Institutional Gateway</text>
  <text x="350" y="118" font-size="8" fill="#64748b" text-anchor="middle">Domain Classifier (@sguk.ac.in filter)</text>

  <rect x="265" y="135" width="170" height="35" rx="5" fill="#ffffff" stroke="#86efac"/>
  <text x="350" y="150" font-size="9" font-weight="bold" fill="#14532d" text-anchor="middle">Diligence &amp; NDA Signer Service</text>
  <text x="350" y="163" font-size="8" fill="#64748b" text-anchor="middle">Digital Signatures, Realtime Broadcast</text>

  <rect x="265" y="180" width="170" height="38" rx="5" fill="#ffffff" stroke="#86efac"/>
  <text x="350" y="195" font-size="8.5" font-weight="bold" fill="#14532d" text-anchor="middle">Signed URL Generator &amp; Proxy</text>
  <text x="350" y="208" font-size="7.5" fill="#64748b" text-anchor="middle">60-Sec Temporary Tokenized Links</text>

  <!-- Connectors T2 to T3 -->
  <line x1="450" y1="62" x2="478" y2="62" stroke="#334155" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="450" y1="107" x2="478" y2="107" stroke="#334155" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="450" y1="152" x2="478" y2="152" stroke="#334155" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Persistence & Security Tier -->
  <rect x="480" y="10" width="210" height="220" rx="8" fill="url(#tier3)" stroke="#a855f7" stroke-width="1.5"/>
  <text x="585" y="30" font-size="11" font-weight="bold" fill="#6b21a8" text-anchor="middle">Persistence &amp; Security Tier</text>

  <rect x="495" y="45" width="180" height="35" rx="5" fill="#ffffff" stroke="#d8b4fe"/>
  <text x="585" y="60" font-size="9" font-weight="bold" fill="#581c87" text-anchor="middle">PostgreSQL 15 (Supabase Cloud)</text>
  <text x="585" y="73" font-size="8" fill="#64748b" text-anchor="middle">Startups, Users, Requests, Metrics</text>

  <rect x="495" y="90" width="180" height="35" rx="5" fill="#ffffff" stroke="#d8b4fe"/>
  <text x="585" y="105" font-size="9" font-weight="bold" fill="#581c87" text-anchor="middle">Row Level Security (RLS) Engine</text>
  <text x="585" y="118" font-size="8" fill="#64748b" text-anchor="middle">Tenant Isolation, User ID Verification</text>

  <rect x="495" y="135" width="180" height="35" rx="5" fill="#ffffff" stroke="#d8b4fe"/>
  <text x="585" y="150" font-size="9" font-weight="bold" fill="#581c87" text-anchor="middle">Encrypted Storage Bucket</text>
  <text x="585" y="163" font-size="8" fill="#64748b" text-anchor="middle">Private Pitch Decks &amp; Financial Models</text>

  <rect x="495" y="180" width="180" height="38" rx="5" fill="#ffffff" stroke="#d8b4fe"/>
  <text x="585" y="195" font-size="8.5" font-weight="bold" fill="#581c87" text-anchor="middle">Diligence Audit Ledger</text>
  <text x="585" y="208" font-size="7.5" fill="#64748b" text-anchor="middle">Immutable Realtime Transaction Log</text>
</svg>
`;

// Figure 2: Use Case Diagram
export const figure2UseCase = `
<svg width="100%" height="250" viewBox="0 0 700 250" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <defs>
    <marker id="uc-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#475569"/>
    </marker>
  </defs>

  <!-- System Boundary -->
  <rect x="150" y="10" width="400" height="230" rx="8" fill="#f8fafc" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="350" y="26" font-size="11" font-weight="bold" fill="#1e293b" text-anchor="middle">CampusVenture System Boundary</text>

  <!-- Actor 1: Student Founder (Left) -->
  <g transform="translate(45, 60)" fill="#1e40af" stroke="#1e40af" stroke-width="1.5">
    <circle cx="20" cy="12" r="8" fill="none"/>
    <line x1="20" y1="20" x2="20" y2="45"/>
    <line x1="5" y1="28" x2="35" y2="28"/>
    <line x1="20" y1="45" x2="5" y2="65"/>
    <line x1="20" y1="45" x2="35" y2="65"/>
    <text x="20" y="80" font-size="10" font-weight="bold" text-anchor="middle" stroke="none" fill="#1e40af">Student Founder</text>
  </g>

  <!-- Actor 2: Accredited Investor (Right) -->
  <g transform="translate(615, 60)" fill="#166534" stroke="#166534" stroke-width="1.5">
    <circle cx="20" cy="12" r="8" fill="none"/>
    <line x1="20" y1="20" x2="20" y2="45"/>
    <line x1="5" y1="28" x2="35" y2="28"/>
    <line x1="20" y1="45" x2="5" y2="65"/>
    <line x1="20" y1="45" x2="35" y2="65"/>
    <text x="20" y="80" font-size="10" font-weight="bold" text-anchor="middle" stroke="none" fill="#166534">Accredited Investor</text>
  </g>

  <!-- Actor 3: University Incubation Head (Bottom) -->
  <g transform="translate(325, 175)" fill="#6b21a8" stroke="#6b21a8" stroke-width="1.5">
    <circle cx="20" cy="10" r="7" fill="none"/>
    <line x1="20" y1="17" x2="20" y2="38"/>
    <line x1="7" y1="24" x2="33" y2="24"/>
    <line x1="20" y1="38" x2="8" y2="54"/>
    <line x1="20" y1="38" x2="32" y2="54"/>
    <text x="20" y="67" font-size="9" font-weight="bold" text-anchor="middle" stroke="none" fill="#6b21a8">University Head</text>
  </g>

  <!-- Use Cases (Ellipses) -->
  <!-- UC1: Register & Profile -->
  <ellipse cx="230" cy="50" rx="65" ry="16" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="230" y="53" font-size="8" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Create Venture Profile</text>

  <!-- UC2: Upload Diligence Docs -->
  <ellipse cx="230" cy="90" rx="65" ry="16" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="230" y="93" font-size="8" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Manage Data Room Vault</text>

  <!-- UC3: View Readiness Score -->
  <ellipse cx="230" cy="130" rx="65" ry="16" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="230" y="133" font-size="8" font-weight="bold" fill="#1e3a8a" text-anchor="middle">View 9-Metric Readiness</text>

  <!-- UC4: Discover Startups -->
  <ellipse cx="465" cy="50" rx="65" ry="16" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.2"/>
  <text x="465" y="53" font-size="8" font-weight="bold" fill="#14532d" text-anchor="middle">Explore Verified Dealflow</text>

  <!-- UC5: Request Data Room -->
  <ellipse cx="465" cy="90" rx="65" ry="16" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.2"/>
  <text x="465" y="93" font-size="8" font-weight="bold" fill="#14532d" text-anchor="middle">Request Data Room Access</text>

  <!-- UC6: Sign Digital NDA -->
  <ellipse cx="350" cy="90" rx="45" ry="15" fill="#fef08a" stroke="#ca8a04" stroke-width="1.2"/>
  <text x="350" y="93" font-size="7.5" font-weight="bold" fill="#854d0e" text-anchor="middle">&lt;&lt;include&gt;&gt; Sign NDA</text>

  <!-- UC7: Review Approved Files -->
  <ellipse cx="465" cy="130" rx="65" ry="16" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.2"/>
  <text x="465" y="133" font-size="8" font-weight="bold" fill="#14532d" text-anchor="middle">Download Signed Diligence</text>

  <!-- UC8: Verify Student Bona Fides -->
  <ellipse cx="230" cy="175" rx="65" ry="16" fill="#faf5ff" stroke="#a855f7" stroke-width="1.2"/>
  <text x="230" y="178" font-size="8" font-weight="bold" fill="#581c87" text-anchor="middle">Verify Student Identity</text>

  <!-- UC9: Inspect Audit Ledger -->
  <ellipse cx="465" cy="175" rx="65" ry="16" fill="#faf5ff" stroke="#a855f7" stroke-width="1.2"/>
  <text x="465" y="178" font-size="8" font-weight="bold" fill="#581c87" text-anchor="middle">Track Diligence Audit Logs</text>

  <!-- Actor Lines -->
  <!-- Student lines -->
  <line x1="85" y1="80" x2="165" y2="53" stroke="#475569" stroke-width="1.2"/>
  <line x1="85" y1="90" x2="165" y2="90" stroke="#475569" stroke-width="1.2"/>
  <line x1="85" y1="100" x2="165" y2="128" stroke="#475569" stroke-width="1.2"/>

  <!-- Investor lines -->
  <line x1="615" y1="80" x2="530" y2="53" stroke="#475569" stroke-width="1.2"/>
  <line x1="615" y1="90" x2="530" y2="90" stroke="#475569" stroke-width="1.2"/>
  <line x1="615" y1="100" x2="530" y2="128" stroke="#475569" stroke-width="1.2"/>

  <!-- Include line from UC5 to UC6 -->
  <line x1="400" y1="90" x2="395" y2="90" stroke="#ca8a04" stroke-width="1.2" stroke-dasharray="3,3" marker-end="url(#uc-arr)"/>

  <!-- University lines -->
  <line x1="325" y1="200" x2="295" y2="182" stroke="#475569" stroke-width="1.2"/>
  <line x1="365" y1="200" x2="400" y2="182" stroke="#475569" stroke-width="1.2"/>
</svg>
`;

// Figure 3 & 4: Class & Object Diagrams
export const figure3ClassDiagram = `
<svg width="100%" height="240" viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <!-- Class 1: UserProfile -->
  <rect x="10" y="10" width="155" height="100" fill="#ffffff" stroke="#1e40af" stroke-width="1.2"/>
  <rect x="10" y="10" width="155" height="20" fill="#dbeafe"/>
  <text x="87" y="24" font-size="9" font-weight="bold" fill="#1e3a8a" text-anchor="middle">UserProfile</text>
  <text x="16" y="42" font-size="7.5" fill="#334155">+ id: UUID [PK]</text>
  <text x="16" y="54" font-size="7.5" fill="#334155">+ email: String (sguk.ac.in)</text>
  <text x="16" y="66" font-size="7.5" fill="#334155">+ role: RoleType</text>
  <text x="16" y="78" font-size="7.5" fill="#334155">+ institution_id: UUID</text>
  <line x1="10" y1="84" x2="165" y2="84" stroke="#cbd5e1"/>
  <text x="16" y="98" font-size="7.5" fill="#1e40af">+ verifyBonaFide(): Boolean</text>

  <!-- Class 2: Startup -->
  <rect x="195" y="10" width="165" height="100" fill="#ffffff" stroke="#166534" stroke-width="1.2"/>
  <rect x="195" y="10" width="165" height="20" fill="#dcfce7"/>
  <text x="277" y="24" font-size="9" font-weight="bold" fill="#14532d" text-anchor="middle">Startup</text>
  <text x="201" y="42" font-size="7.5" fill="#334155">+ id: UUID [PK]</text>
  <text x="201" y="54" font-size="7.5" fill="#334155">+ founder_id: UUID [FK]</text>
  <text x="201" y="66" font-size="7.5" fill="#334155">+ name: String</text>
  <text x="201" y="78" font-size="7.5" fill="#334155">+ readiness_score: Float</text>
  <line x1="195" y1="84" x2="360" y2="84" stroke="#cbd5e1"/>
  <text x="201" y="98" font-size="7.5" fill="#166534">+ calculateReadiness(): Float</text>

  <!-- Class 3: DataRoomDocument -->
  <rect x="390" y="10" width="155" height="100" fill="#ffffff" stroke="#ca8a04" stroke-width="1.2"/>
  <rect x="390" y="10" width="155" height="20" fill="#fef08a"/>
  <text x="467" y="24" font-size="9" font-weight="bold" fill="#854d0e" text-anchor="middle">DataRoomDocument</text>
  <text x="396" y="42" font-size="7.5" fill="#334155">+ id: UUID [PK]</text>
  <text x="396" y="54" font-size="7.5" fill="#334155">+ startup_id: UUID [FK]</text>
  <text x="396" y="66" font-size="7.5" fill="#334155">+ category: DocCategory</text>
  <text x="396" y="78" font-size="7.5" fill="#334155">+ storage_path: String</text>
  <line x1="390" y1="84" x2="545" y2="84" stroke="#cbd5e1"/>
  <text x="396" y="98" font-size="7.5" fill="#ca8a04">+ generateSignedUrl(): String</text>

  <!-- Class 4: DataRoomRequest -->
  <rect x="195" y="130" width="165" height="100" fill="#ffffff" stroke="#b91c1c" stroke-width="1.2"/>
  <rect x="195" y="130" width="165" height="20" fill="#fee2e2"/>
  <text x="277" y="144" font-size="9" font-weight="bold" fill="#991b1b" text-anchor="middle">DataRoomRequest</text>
  <text x="201" y="162" font-size="7.5" fill="#334155">+ id: UUID [PK]</text>
  <text x="201" y="174" font-size="7.5" fill="#334155">+ investor_id: UUID [FK]</text>
  <text x="201" y="186" font-size="7.5" fill="#334155">+ startup_id: UUID [FK]</text>
  <text x="201" y="198" font-size="7.5" fill="#334155">+ status: RequestState</text>
  <line x1="195" y1="204" x2="360" y2="204" stroke="#cbd5e1"/>
  <text x="201" y="218" font-size="7.5" fill="#b91c1c">+ approveAccess(): Void</text>

  <!-- Class 5: NDAContract -->
  <rect x="390" y="130" width="155" height="100" fill="#ffffff" stroke="#7c3aed" stroke-width="1.2"/>
  <rect x="390" y="130" width="155" height="20" fill="#ede9fe"/>
  <text x="467" y="144" font-size="9" font-weight="bold" fill="#6d28d9" text-anchor="middle">NDAContract</text>
  <text x="396" y="162" font-size="7.5" fill="#334155">+ id: UUID [PK]</text>
  <text x="396" y="174" font-size="7.5" fill="#334155">+ request_id: UUID [FK]</text>
  <text x="396" y="186" font-size="7.5" fill="#334155">+ digital_signature: Text</text>
  <text x="396" y="198" font-size="7.5" fill="#334155">+ signed_at: Timestamp</text>
  <line x1="390" y1="204" x2="545" y2="204" stroke="#cbd5e1"/>
  <text x="396" y="218" font-size="7.5" fill="#7c3aed">+ verifySignature(): Boolean</text>

  <!-- Class 6: DiligenceAuditLog -->
  <rect x="565" y="70" width="125" height="110" fill="#ffffff" stroke="#475569" stroke-width="1.2"/>
  <rect x="565" y="70" width="125" height="20" fill="#f1f5f9"/>
  <text x="627" y="84" font-size="8.5" font-weight="bold" fill="#334155" text-anchor="middle">DiligenceAuditLog</text>
  <text x="571" y="102" font-size="7" fill="#334155">+ id: UUID [PK]</text>
  <text x="571" y="114" font-size="7" fill="#334155">+ institution_id: UUID</text>
  <text x="571" y="126" font-size="7" fill="#334155">+ actor_email: Text</text>
  <text x="571" y="138" font-size="7" fill="#334155">+ action: String</text>
  <text x="571" y="150" font-size="7" fill="#334155">+ created_at: Timestamp</text>
  <line x1="565" y1="156" x2="690" y2="156" stroke="#cbd5e1"/>
  <text x="571" y="168" font-size="7" fill="#475569">+ recordSync(): Void</text>

  <!-- Relationships -->
  <line x1="165" y1="50" x2="195" y2="50" stroke="#334155" stroke-width="1.2"/>
  <text x="170" y="45" font-size="7" fill="#64748b">1</text>
  <text x="187" y="45" font-size="7" fill="#64748b">0..1</text>

  <line x1="360" y1="50" x2="390" y2="50" stroke="#334155" stroke-width="1.2"/>
  <text x="365" y="45" font-size="7" fill="#64748b">1</text>
  <text x="382" y="45" font-size="7" fill="#64748b">1..*</text>

  <line x1="277" y1="110" x2="277" y2="130" stroke="#334155" stroke-width="1.2"/>
  <text x="282" y="118" font-size="7" fill="#64748b">1</text>
  <text x="282" y="127" font-size="7" fill="#64748b">0..*</text>

  <line x1="360" y1="180" x2="390" y2="180" stroke="#334155" stroke-width="1.2"/>
  <text x="365" y="175" font-size="7" fill="#64748b">1</text>
  <text x="382" y="175" font-size="7" fill="#64748b">1</text>

  <line x1="545" y1="160" x2="565" y2="140" stroke="#334155" stroke-width="1.2"/>
</svg>
`;

export const figure4ObjectDiagram = `
<svg width="100%" height="160" viewBox="0 0 700 160" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <rect x="15" y="20" width="195" height="120" rx="4" fill="#f8fafc" stroke="#3b82f6" stroke-width="1.2"/>
  <rect x="15" y="20" width="195" height="22" rx="4" fill="#dbeafe"/>
  <text x="112" y="35" font-size="9" font-weight="bold" fill="#1e40af" text-anchor="middle" text-decoration="underline">adityaUser: UserProfile</text>
  <text x="22" y="55" font-size="7.5" fill="#334155">id = "252921389-uuid"</text>
  <text x="22" y="70" font-size="7.5" fill="#334155">email = "aditya@sguk.ac.in"</text>
  <text x="22" y="85" font-size="7.5" fill="#334155">role = "STUDENT_FOUNDER"</text>
  <text x="22" y="100" font-size="7.5" fill="#334155">institution_id = "sgu-kolhapur"</text>
  <text x="22" y="115" font-size="7.5" fill="#334155">bona_fide_status = "VERIFIED"</text>

  <rect x="250" y="20" width="200" height="120" rx="4" fill="#f8fafc" stroke="#166534" stroke-width="1.2"/>
  <rect x="250" y="20" width="200" height="22" rx="4" fill="#dcfce7"/>
  <text x="350" y="35" font-size="9" font-weight="bold" fill="#15803d" text-anchor="middle" text-decoration="underline">autoCampusAI: Startup</text>
  <text x="257" y="55" font-size="7.5" fill="#334155">id = "st-autocampus-01"</text>
  <text x="257" y="70" font-size="7.5" fill="#334155">name = "AutoCampus AI"</text>
  <text x="257" y="85" font-size="7.5" fill="#334155">readiness_score = 88.5</text>
  <text x="257" y="100" font-size="7.5" fill="#334155">sector = "EdTech / Campus AI"</text>
  <text x="257" y="115" font-size="7.5" fill="#334155">target_ask = "INR 35,00,000"</text>

  <rect x="490" y="20" width="195" height="120" rx="4" fill="#f8fafc" stroke="#7c3aed" stroke-width="1.2"/>
  <rect x="490" y="20" width="195" height="22" rx="4" fill="#ede9fe"/>
  <text x="587" y="35" font-size="9" font-weight="bold" fill="#6d28d9" text-anchor="middle" text-decoration="underline">seedRoundNda: NDAContract</text>
  <text x="497" y="55" font-size="7.5" fill="#334155">id = "nda-ac-2026-09"</text>
  <text x="497" y="70" font-size="7.5" fill="#334155">signatory = "investor@angel.in"</text>
  <text x="497" y="85" font-size="7.5" fill="#334155">signature = "SHA256:d8a4f1..."</text>
  <text x="497" y="100" font-size="7.5" fill="#334155">signed_at = "2026-10-24 14:22"</text>
  <text x="497" y="115" font-size="7.5" fill="#334155">governing_law = "India (MH)"</text>

  <!-- Connectors -->
  <line x1="210" y1="80" x2="250" y2="80" stroke="#334155" stroke-width="1.2"/>
  <line x1="450" y1="80" x2="490" y2="80" stroke="#334155" stroke-width="1.2"/>
</svg>
`;

// Figure 5: Sequence Diagram
export const figure5SequenceDiagram = `
<svg width="100%" height="240" viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <defs>
    <marker id="s-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#334155"/>
    </marker>
  </defs>

  <!-- Lifeline Boxes -->
  <rect x="20" y="10" width="90" height="24" rx="4" fill="#dbeafe" stroke="#3b82f6"/>
  <text x="65" y="26" font-size="8.5" font-weight="bold" fill="#1e40af" text-anchor="middle">Investor UI</text>

  <rect x="155" y="10" width="110" height="24" rx="4" fill="#dcfce7" stroke="#22c55e"/>
  <text x="210" y="26" font-size="8.5" font-weight="bold" fill="#15803d" text-anchor="middle">Diligence Service</text>

  <rect x="310" y="10" width="100" height="24" rx="4" fill="#fef08a" stroke="#ca8a04"/>
  <text x="360" y="26" font-size="8.5" font-weight="bold" fill="#854d0e" text-anchor="middle">NDA Engine</text>

  <rect x="455" y="10" width="105" height="24" rx="4" fill="#fee2e2" stroke="#dc2626"/>
  <text x="507" y="26" font-size="8.5" font-weight="bold" fill="#991b1b" text-anchor="middle">PostgreSQL / RLS</text>

  <rect x="600" y="10" width="90" height="24" rx="4" fill="#ede9fe" stroke="#7c3aed"/>
  <text x="645" y="26" font-size="8.5" font-weight="bold" fill="#6d28d9" text-anchor="middle">Audit Ledger</text>

  <!-- Lifeline Dashed Lines -->
  <line x1="65" y1="34" x2="65" y2="230" stroke="#94a3b8" stroke-dasharray="3,3"/>
  <line x1="210" y1="34" x2="210" y2="230" stroke="#94a3b8" stroke-dasharray="3,3"/>
  <line x1="360" y1="34" x2="360" y2="230" stroke="#94a3b8" stroke-dasharray="3,3"/>
  <line x1="507" y1="34" x2="507" y2="230" stroke="#94a3b8" stroke-dasharray="3,3"/>
  <line x1="645" y1="34" x2="645" y2="230" stroke="#94a3b8" stroke-dasharray="3,3"/>

  <!-- Messages -->
  <!-- 1. Request Data Room -->
  <line x1="65" y1="52" x2="210" y2="52" stroke="#334155" stroke-width="1.2" marker-end="url(#s-arr)"/>
  <text x="137" y="47" font-size="7.5" fill="#0f172a" text-anchor="middle">1: requestDataRoom(startupId)</text>

  <!-- 2. Check NDA -->
  <line x1="210" y1="68" x2="360" y2="68" stroke="#334155" stroke-width="1.2" marker-end="url(#s-arr)"/>
  <text x="285" y="63" font-size="7.5" fill="#0f172a" text-anchor="middle">2: checkExistingNda(userId)</text>

  <!-- 3. Return Pending Status -->
  <line x1="360" y1="84" x2="65" y2="84" stroke="#475569" stroke-width="1.2" stroke-dasharray="2,2" marker-end="url(#s-arr)"/>
  <text x="210" y="79" font-size="7.5" fill="#475569" text-anchor="middle">3: promptNDADialog(terms)</text>

  <!-- 4. Submit Signature -->
  <line x1="65" y1="105" x2="360" y2="105" stroke="#334155" stroke-width="1.2" marker-end="url(#s-arr)"/>
  <text x="210" y="100" font-size="7.5" fill="#0f172a" text-anchor="middle">4: submitSignature(digitalSig, consent)</text>

  <!-- 5. Store NDA & Update Request -->
  <line x1="360" y1="125" x2="507" y2="125" stroke="#334155" stroke-width="1.2" marker-end="url(#s-arr)"/>
  <text x="433" y="120" font-size="7.5" fill="#0f172a" text-anchor="middle">5: insertNDA() &amp; setStatus('APPROVED')</text>

  <!-- 6. Emit Realtime Sync & Audit -->
  <line x1="507" y1="145" x2="645" y2="145" stroke="#334155" stroke-width="1.2" marker-end="url(#s-arr)"/>
  <text x="576" y="140" font-size="7.5" fill="#0f172a" text-anchor="middle">6: logAuditEvent('NDA_SIGNED')</text>

  <!-- 7. Confirm Access Granted -->
  <line x1="507" y1="165" x2="65" y2="165" stroke="#15803d" stroke-width="1.2" stroke-dasharray="2,2" marker-end="url(#s-arr)"/>
  <text x="285" y="160" font-size="7.5" fill="#15803d" text-anchor="middle">7: notifySuccess('DILIGENCE_ACCESS_GRANTED')</text>

  <!-- 8. Request Download -->
  <line x1="65" y1="188" x2="210" y2="188" stroke="#334155" stroke-width="1.2" marker-end="url(#s-arr)"/>
  <text x="137" y="183" font-size="7.5" fill="#0f172a" text-anchor="middle">8: downloadDocument(docId)</text>

  <!-- 9. Issue 60s Signed URL -->
  <line x1="210" y1="208" x2="65" y2="208" stroke="#334155" stroke-width="1.2" marker-end="url(#s-arr)"/>
  <text x="137" y="203" font-size="7.5" fill="#0f172a" text-anchor="middle">9: returnSignedStorageBlobUrl()</text>
</svg>
`;

// Figure 6 & 7: Activity Diagram & State Chart Diagram
export const figure6ActivityDiagram = `
<svg width="100%" height="220" viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <defs>
    <marker id="act-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#334155"/>
    </marker>
  </defs>

  <!-- Start Circle -->
  <circle cx="40" cy="110" r="10" fill="#0f172a"/>
  
  <line x1="50" y1="110" x2="80" y2="110" stroke="#334155" stroke-width="1.2" marker-end="url(#act-arr)"/>

  <!-- Step 1: Browse Startups -->
  <rect x="80" y="90" width="105" height="40" rx="5" fill="#eff6ff" stroke="#3b82f6"/>
  <text x="132" y="106" font-size="8" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Explore Startups</text>
  <text x="132" y="120" font-size="7" fill="#64748b" text-anchor="middle">Filter by Stage / Uni</text>

  <line x1="185" y1="110" x2="215" y2="110" stroke="#334155" stroke-width="1.2" marker-end="url(#act-arr)"/>

  <!-- Step 2: Request Diligence -->
  <rect x="215" y="90" width="105" height="40" rx="5" fill="#f0fdf4" stroke="#22c55e"/>
  <text x="267" y="106" font-size="8" font-weight="bold" fill="#14532d" text-anchor="middle">Click "Request Access"</text>
  <text x="267" y="120" font-size="7" fill="#64748b" text-anchor="middle">Verify Role &amp; Session</text>

  <line x1="320" y1="110" x2="350" y2="110" stroke="#334155" stroke-width="1.2" marker-end="url(#act-arr)"/>

  <!-- Decision: NDA Signed? -->
  <polygon points="380,85 415,110 380,135 345,110" fill="#fef08a" stroke="#ca8a04"/>
  <text x="380" y="113" font-size="7" font-weight="bold" fill="#854d0e" text-anchor="middle">NDA Signed?</text>

  <!-- No Branch (Top) -->
  <line x1="380" y1="85" x2="380" y2="40" stroke="#334155" stroke-width="1.2"/>
  <line x1="380" y1="40" x2="430" y2="40" stroke="#334155" stroke-width="1.2" marker-end="url(#act-arr)"/>
  <text x="390" y="60" font-size="7" fill="#dc2626">[No]</text>

  <rect x="430" y="20" width="120" height="40" rx="5" fill="#fee2e2" stroke="#dc2626"/>
  <text x="490" y="36" font-size="8" font-weight="bold" fill="#991b1b" text-anchor="middle">Mutual NDA Modal</text>
  <text x="490" y="50" font-size="7" fill="#64748b" text-anchor="middle">Review &amp; Digital Signature</text>

  <!-- Connect signed NDA back down -->
  <line x1="550" y1="40" x2="585" y2="40" stroke="#334155" stroke-width="1.2"/>
  <line x1="585" y1="40" x2="585" y2="90" stroke="#334155" stroke-width="1.2" marker-end="url(#act-arr)"/>

  <!-- Yes Branch (Right) -->
  <line x1="415" y1="110" x2="530" y2="110" stroke="#334155" stroke-width="1.2" marker-end="url(#act-arr)"/>
  <text x="440" y="105" font-size="7" fill="#15803d">[Yes]</text>

  <!-- Step 3: Grant Access & Log -->
  <rect x="530" y="90" width="110" height="40" rx="5" fill="#faf5ff" stroke="#a855f7"/>
  <text x="585" y="106" font-size="8" font-weight="bold" fill="#581c87" text-anchor="middle">Grant Vault Access</text>
  <text x="585" y="120" font-size="7" fill="#64748b" text-anchor="middle">Log Institutional Audit</text>

  <line x1="585" y1="130" x2="585" y2="160" stroke="#334155" stroke-width="1.2" marker-end="url(#act-arr)"/>

  <!-- Step 4: Download via Helper -->
  <rect x="530" y="160" width="110" height="40" rx="5" fill="#dbeafe" stroke="#3b82f6"/>
  <text x="585" y="176" font-size="8" font-weight="bold" fill="#1e40af" text-anchor="middle">Download Signed Files</text>
  <text x="585" y="190" font-size="7" fill="#64748b" text-anchor="middle">Resilient Blob Engine</text>

  <line x1="640" y1="180" x2="665" y2="180" stroke="#334155" stroke-width="1.2" marker-end="url(#act-arr)"/>

  <!-- Final Node -->
  <circle cx="675" cy="180" r="10" fill="none" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="675" cy="180" r="6" fill="#0f172a"/>
</svg>
`;

export const figure7StateChartDiagram = `
<svg width="100%" height="160" viewBox="0 0 700 160" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <defs>
    <marker id="sc-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#334155"/>
    </marker>
  </defs>

  <circle cx="30" cy="80" r="8" fill="#0f172a"/>
  <line x1="38" y1="80" x2="65" y2="80" stroke="#334155" stroke-width="1.2" marker-end="url(#sc-arr)"/>

  <!-- State 1: NONE -->
  <rect x="65" y="60" width="90" height="40" rx="8" fill="#f1f5f9" stroke="#64748b"/>
  <text x="110" y="84" font-size="9" font-weight="bold" fill="#334155" text-anchor="middle">NONE</text>

  <line x1="155" y1="80" x2="195" y2="80" stroke="#334155" stroke-width="1.2" marker-end="url(#sc-arr)"/>
  <text x="175" y="74" font-size="7" fill="#475569" text-anchor="middle">Request</text>

  <!-- State 2: REQUESTED -->
  <rect x="195" y="60" width="105" height="40" rx="8" fill="#eff6ff" stroke="#3b82f6"/>
  <text x="247" y="84" font-size="9" font-weight="bold" fill="#1e40af" text-anchor="middle">REQUESTED</text>

  <line x1="300" y1="80" x2="340" y2="80" stroke="#334155" stroke-width="1.2" marker-end="url(#sc-arr)"/>
  <text x="320" y="74" font-size="7" fill="#475569" text-anchor="middle">Validate</text>

  <!-- State 3: NDA_PENDING -->
  <rect x="340" y="60" width="110" height="40" rx="8" fill="#fef08a" stroke="#ca8a04"/>
  <text x="395" y="84" font-size="9" font-weight="bold" fill="#854d0e" text-anchor="middle">NDA_PENDING</text>

  <line x1="450" y1="80" x2="495" y2="80" stroke="#334155" stroke-width="1.2" marker-end="url(#sc-arr)"/>
  <text x="472" y="74" font-size="7" fill="#475569" text-anchor="middle">Signed</text>

  <!-- State 4: APPROVED -->
  <rect x="495" y="60" width="105" height="40" rx="8" fill="#dcfce7" stroke="#16a34a"/>
  <text x="547" y="84" font-size="9" font-weight="bold" fill="#15803d" text-anchor="middle">APPROVED</text>

  <!-- Transition to EXPIRED -->
  <line x1="600" y1="80" x2="635" y2="80" stroke="#334155" stroke-width="1.2" marker-end="url(#sc-arr)"/>

  <!-- Final State: EXPIRED -->
  <rect x="635" y="60" width="55" height="40" rx="8" fill="#fee2e2" stroke="#dc2626"/>
  <text x="662" y="84" font-size="7.5" font-weight="bold" fill="#991b1b" text-anchor="middle">EXPIRED</text>

  <!-- Alternate Reject Line from REQUESTED -->
  <path d="M 247,100 L 247,135 L 547,135 L 547,100" fill="none" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="2,2" marker-end="url(#sc-arr)"/>
  <text x="395" y="148" font-size="7" fill="#dc2626" text-anchor="middle">Rejected by Founder / Incubation Head (REJECTED)</text>
</svg>
`;

// Figure 8 & 9: Communication & Component Diagrams
export const figure8CommunicationDiagram = `
<svg width="100%" height="180" viewBox="0 0 700 180" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <rect x="20" y="65" width="120" height="50" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="80" y="88" font-size="9" font-weight="bold" fill="#1e40af" text-anchor="middle">:InvestorClient</text>
  <text x="80" y="103" font-size="7.5" fill="#64748b" text-anchor="middle">React View</text>

  <rect x="220" y="20" width="130" height="50" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1.2"/>
  <text x="285" y="43" font-size="9" font-weight="bold" fill="#15803d" text-anchor="middle">:DiligenceController</text>
  <text x="285" y="58" font-size="7.5" fill="#64748b" text-anchor="middle">Access Coordinator</text>

  <rect x="220" y="110" width="130" height="50" rx="5" fill="#fef08a" stroke="#ca8a04" stroke-width="1.2"/>
  <text x="285" y="133" font-size="9" font-weight="bold" fill="#854d0e" text-anchor="middle">:NDAManager</text>
  <text x="285" y="148" font-size="7.5" fill="#64748b" text-anchor="middle">Digital Sig Verifier</text>

  <rect x="440" y="65" width="130" height="50" rx="5" fill="#faf5ff" stroke="#a855f7" stroke-width="1.2"/>
  <text x="505" y="88" font-size="9" font-weight="bold" fill="#6d28d9" text-anchor="middle">:AuditRepository</text>
  <text x="505" y="103" font-size="7.5" fill="#64748b" text-anchor="middle">Supabase Postgres</text>

  <!-- Connectors with numbered labels -->
  <line x1="140" y1="78" x2="220" y2="52" stroke="#334155" stroke-width="1.2"/>
  <text x="175" y="58" font-size="7" font-weight="bold" fill="#0f172a">1: requestAccess()</text>

  <line x1="285" y1="70" x2="285" y2="110" stroke="#334155" stroke-width="1.2"/>
  <text x="290" y="94" font-size="7" font-weight="bold" fill="#0f172a">2: verifyNDA()</text>

  <line x1="350" y1="52" x2="440" y2="78" stroke="#334155" stroke-width="1.2"/>
  <text x="390" y="58" font-size="7" font-weight="bold" fill="#0f172a">3: logEvent()</text>

  <line x1="350" y1="130" x2="440" y2="102" stroke="#334155" stroke-width="1.2"/>
  <text x="390" y="125" font-size="7" font-weight="bold" fill="#0f172a">4: storeSigHash()</text>
</svg>
`;

export const figure9ComponentDiagram = `
<svg width="100%" height="200" viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <!-- Component 1: Web Client Component -->
  <rect x="15" y="20" width="190" height="160" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="110" y="38" font-size="9" font-weight="bold" fill="#1e40af" text-anchor="middle">&lt;&lt;component&gt;&gt; Web Client</text>
  
  <rect x="30" y="50" width="160" height="26" fill="#ffffff" stroke="#93c5fd"/>
  <text x="110" y="67" font-size="8" fill="#1e3a8a" text-anchor="middle">Student Data Room UI</text>

  <rect x="30" y="85" width="160" height="26" fill="#ffffff" stroke="#93c5fd"/>
  <text x="110" y="102" font-size="8" fill="#1e3a8a" text-anchor="middle">Investor Diligence UI</text>

  <rect x="30" y="120" width="160" height="26" fill="#ffffff" stroke="#93c5fd"/>
  <text x="110" y="137" font-size="8" fill="#1e3a8a" text-anchor="middle">Download Helper Engine</text>

  <!-- Component 2: API & Business Logic -->
  <rect x="250" y="20" width="200" height="160" rx="6" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.2"/>
  <text x="350" y="38" font-size="9" font-weight="bold" fill="#15803d" text-anchor="middle">&lt;&lt;component&gt;&gt; Business Layer</text>

  <rect x="265" y="50" width="170" height="26" fill="#ffffff" stroke="#86efac"/>
  <text x="350" y="67" font-size="8" fill="#14532d" text-anchor="middle">Auth &amp; Domain Classifier</text>

  <rect x="265" y="85" width="170" height="26" fill="#ffffff" stroke="#86efac"/>
  <text x="350" y="102" font-size="8" fill="#14532d" text-anchor="middle">Readiness Scoring Algorithm</text>

  <rect x="265" y="120" width="170" height="26" fill="#ffffff" stroke="#86efac"/>
  <text x="350" y="137" font-size="8" fill="#14532d" text-anchor="middle">Realtime Diligence Broadcaster</text>

  <!-- Component 3: Storage & Database -->
  <rect x="495" y="20" width="190" height="160" rx="6" fill="#faf5ff" stroke="#a855f7" stroke-width="1.2"/>
  <text x="590" y="38" font-size="9" font-weight="bold" fill="#6d28d9" text-anchor="middle">&lt;&lt;component&gt;&gt; Supabase Cloud</text>

  <rect x="510" y="50" width="160" height="26" fill="#ffffff" stroke="#d8b4fe"/>
  <text x="590" y="67" font-size="8" fill="#581c87" text-anchor="middle">PostgreSQL Database (RLS)</text>

  <rect x="510" y="85" width="160" height="26" fill="#ffffff" stroke="#d8b4fe"/>
  <text x="590" y="102" font-size="8" fill="#581c87" text-anchor="middle">Private Storage Buckets</text>

  <rect x="510" y="120" width="160" height="26" fill="#ffffff" stroke="#d8b4fe"/>
  <text x="590" y="137" font-size="8" fill="#581c87" text-anchor="middle">Audit Log Persistence</text>

  <!-- Connectors -->
  <line x1="205" y1="100" x2="250" y2="100" stroke="#334155" stroke-width="1.5"/>
  <line x1="450" y1="100" x2="495" y2="100" stroke="#334155" stroke-width="1.5"/>
</svg>
`;

// Figure 10 & 11: Deployment Diagram & Data Flow Diagram (DFD)
export const figure10DeploymentDiagram = `
<svg width="100%" height="180" viewBox="0 0 700 180" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <!-- Node 1: Client Devices -->
  <rect x="15" y="20" width="185" height="140" fill="#f8fafc" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="107" y="38" font-size="9" font-weight="bold" fill="#1e40af" text-anchor="middle">&lt;&lt;device&gt;&gt; Client Tier</text>
  <text x="107" y="52" font-size="7.5" fill="#64748b" text-anchor="middle">Mobile Phone / Desktop Browser</text>
  <rect x="30" y="65" width="155" height="40" fill="#ffffff" stroke="#93c5fd"/>
  <text x="107" y="82" font-size="8" font-weight="bold" fill="#1e3a8a" text-anchor="middle">&lt;&lt;execution environment&gt;&gt;</text>
  <text x="107" y="96" font-size="7.5" fill="#334155" text-anchor="middle">V8 Engine / WebKit / Blink</text>
  <text x="107" y="140" font-size="7.5" fill="#64748b" text-anchor="middle">React 19 SPA + Service Worker</text>

  <!-- Node 2: Vercel Edge Server -->
  <rect x="255" y="20" width="190" height="140" fill="#f8fafc" stroke="#22c55e" stroke-width="1.5"/>
  <text x="350" y="38" font-size="9" font-weight="bold" fill="#15803d" text-anchor="middle">&lt;&lt;server&gt;&gt; Vercel Edge CDN</text>
  <text x="350" y="52" font-size="7.5" fill="#64748b" text-anchor="middle">Global Anycast Serverless Nodes</text>
  <rect x="270" y="65" width="160" height="40" fill="#ffffff" stroke="#86efac"/>
  <text x="350" y="82" font-size="8" font-weight="bold" fill="#14532d" text-anchor="middle">&lt;&lt;runtime&gt;&gt;</text>
  <text x="350" y="96" font-size="7.5" fill="#334155" text-anchor="middle">Nitro Engine / Edge Middleware</text>
  <text x="350" y="140" font-size="7.5" fill="#64748b" text-anchor="middle">HTTPS TLS 1.3 / Auto Brotli</text>

  <!-- Node 3: Supabase Cloud Database -->
  <rect x="495" y="20" width="190" height="140" fill="#f8fafc" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="590" y="38" font-size="9" font-weight="bold" fill="#6d28d9" text-anchor="middle">&lt;&lt;cloud cluster&gt;&gt; Supabase</text>
  <text x="590" y="52" font-size="7.5" fill="#64748b" text-anchor="middle">AWS ap-south-1 (Mumbai Region)</text>
  <rect x="510" y="65" width="160" height="40" fill="#ffffff" stroke="#d8b4fe"/>
  <text x="590" y="82" font-size="8" font-weight="bold" fill="#581c87" text-anchor="middle">&lt;&lt;database engine&gt;&gt;</text>
  <text x="590" y="96" font-size="7.5" fill="#334155" text-anchor="middle">PostgreSQL 15 + RLS Kernel</text>
  <text x="590" y="140" font-size="7.5" fill="#64748b" text-anchor="middle">S3 Encrypted Object Store</text>

  <!-- Protocol Connectors -->
  <line x1="200" y1="85" x2="255" y2="85" stroke="#334155" stroke-width="1.5"/>
  <text x="227" y="78" font-size="7" fill="#0f172a" text-anchor="middle">HTTPS/443</text>

  <line x1="445" y1="85" x2="495" y2="85" stroke="#334155" stroke-width="1.5"/>
  <text x="470" y="78" font-size="7" fill="#0f172a" text-anchor="middle">WSS / TLS</text>
</svg>
`;

export const figure11DataFlowDiagram = `
<svg width="100%" height="220" viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <defs>
    <marker id="dfd-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#334155"/>
    </marker>
  </defs>

  <!-- Entities (Rectangles) -->
  <rect x="20" y="20" width="100" height="40" fill="#ffffff" stroke="#1e40af" stroke-width="1.5"/>
  <text x="70" y="44" font-size="8.5" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Student Founder</text>

  <rect x="580" y="20" width="100" height="40" fill="#ffffff" stroke="#15803d" stroke-width="1.5"/>
  <text x="630" y="44" font-size="8.5" font-weight="bold" fill="#14532d" text-anchor="middle">Angel Investor</text>

  <rect x="20" y="160" width="100" height="40" fill="#ffffff" stroke="#6d28d9" stroke-width="1.5"/>
  <text x="70" y="184" font-size="8.5" font-weight="bold" fill="#581c87" text-anchor="middle">Incubation Head</text>

  <!-- Process Circles (Level 1) -->
  <!-- Process 1.0 -->
  <circle cx="210" cy="40" r="28" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="210" y="36" font-size="7.5" font-weight="bold" fill="#1e40af" text-anchor="middle">1.0</text>
  <text x="210" y="48" font-size="6.5" fill="#1e3a8a" text-anchor="middle">Auth &amp; Domain</text>

  <!-- Process 2.0 -->
  <circle cx="350" cy="40" r="28" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="350" y="36" font-size="7.5" font-weight="bold" fill="#1e40af" text-anchor="middle">2.0</text>
  <text x="350" y="48" font-size="6.5" fill="#1e3a8a" text-anchor="middle">Venture &amp; Vault</text>

  <!-- Process 3.0 -->
  <circle cx="490" cy="40" r="28" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="490" y="36" font-size="7.5" font-weight="bold" fill="#1e40af" text-anchor="middle">3.0</text>
  <text x="490" y="48" font-size="6.5" fill="#1e3a8a" text-anchor="middle">NDA &amp; Diligence</text>

  <!-- Process 4.0 -->
  <circle cx="350" cy="180" r="28" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="350" y="176" font-size="7.5" font-weight="bold" fill="#1e40af" text-anchor="middle">4.0</text>
  <text x="350" y="188" font-size="6.5" fill="#1e3a8a" text-anchor="middle">Audit Ledger</text>

  <!-- Data Stores (Open-ended rects) -->
  <!-- D1: Profiles -->
  <line x1="170" y1="105" x2="250" y2="105" stroke="#334155" stroke-width="1.2"/>
  <line x1="170" y1="125" x2="250" y2="125" stroke="#334155" stroke-width="1.2"/>
  <text x="210" y="118" font-size="7.5" font-weight="bold" fill="#334155" text-anchor="middle">D1: Profiles &amp; Roles</text>

  <!-- D2: Startups & Vault -->
  <line x1="310" y1="105" x2="390" y2="105" stroke="#334155" stroke-width="1.2"/>
  <line x1="310" y1="125" x2="390" y2="125" stroke="#334155" stroke-width="1.2"/>
  <text x="350" y="118" font-size="7.5" font-weight="bold" fill="#334155" text-anchor="middle">D2: Startups &amp; Docs</text>

  <!-- D3: NDAs & Requests -->
  <line x1="450" y1="105" x2="530" y2="105" stroke="#334155" stroke-width="1.2"/>
  <line x1="450" y1="125" x2="530" y2="125" stroke="#334155" stroke-width="1.2"/>
  <text x="490" y="118" font-size="7.5" font-weight="bold" fill="#334155" text-anchor="middle">D3: Requests &amp; NDAs</text>

  <!-- Flows -->
  <line x1="120" y1="40" x2="182" y2="40" stroke="#334155" stroke-width="1.2" marker-end="url(#dfd-arr)"/>
  <text x="151" y="34" font-size="6.5" fill="#475569" text-anchor="middle">Credentials</text>

  <line x1="210" y1="68" x2="210" y2="105" stroke="#334155" stroke-width="1.2" marker-end="url(#dfd-arr)"/>
  
  <line x1="238" y1="40" x2="322" y2="40" stroke="#334155" stroke-width="1.2" marker-end="url(#dfd-arr)"/>
  <text x="280" y="34" font-size="6.5" fill="#475569" text-anchor="middle">Verified Id</text>

  <line x1="350" y1="68" x2="350" y2="105" stroke="#334155" stroke-width="1.2" marker-end="url(#dfd-arr)"/>

  <line x1="378" y1="40" x2="462" y2="40" stroke="#334155" stroke-width="1.2" marker-end="url(#dfd-arr)"/>
  <text x="420" y="34" font-size="6.5" fill="#475569" text-anchor="middle">Public Deck</text>

  <line x1="580" y1="40" x2="518" y2="40" stroke="#334155" stroke-width="1.2" marker-end="url(#dfd-arr)"/>
  <text x="549" y="34" font-size="6.5" fill="#475569" text-anchor="middle">NDA Sig</text>

  <line x1="490" y1="68" x2="490" y2="105" stroke="#334155" stroke-width="1.2" marker-end="url(#dfd-arr)"/>

  <line x1="490" y1="135" x2="380" y2="170" stroke="#334155" stroke-width="1.2" marker-end="url(#dfd-arr)"/>

  <line x1="120" y1="180" x2="322" y2="180" stroke="#334155" stroke-width="1.2" marker-end="url(#dfd-arr)"/>
  <text x="221" y="174" font-size="6.5" fill="#475569" text-anchor="middle">Audit Queries</text>
</svg>
`;

// Figures 12, 13, 14: Application UI Mockups (Clean Vectors)
export const figure12StudentUI = `
<svg width="100%" height="150" viewBox="0 0 700 150" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <rect x="5" y="5" width="690" height="140" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
  <!-- Top bar -->
  <rect x="5" y="5" width="690" height="24" rx="6" fill="#1e293b"/>
  <circle cx="20" cy="17" r="4" fill="#ef4444"/><circle cx="32" cy="17" r="4" fill="#eab308"/><circle cx="44" cy="17" r="4" fill="#22c55e"/>
  <text x="350" y="21" font-size="8.5" fill="#cbd5e1" text-anchor="middle">CampusVenture — Student Founder Portal (/app/student/dataroom)</text>

  <!-- Left Sidebar Mock -->
  <rect x="12" y="35" width="130" height="102" fill="#ffffff" stroke="#e2e8f0" rx="3"/>
  <text x="22" y="50" font-size="8" font-weight="bold" fill="#1e3a8a">AutoCampus AI</text>
  <rect x="20" y="58" width="114" height="16" fill="#eff6ff" rx="2"/>
  <text x="26" y="70" font-size="7.5" fill="#1d4ed8">📁 Data Room Vault</text>
  <text x="26" y="88" font-size="7.5" fill="#64748b">📊 Readiness Radar</text>
  <text x="26" y="104" font-size="7.5" fill="#64748b">🤝 Investor Requests (2)</text>
  <text x="26" y="120" font-size="7.5" fill="#64748b">⚙ Settings &amp; Legal</text>

  <!-- Main Content Mock -->
  <rect x="150" y="35" width="370" height="102" fill="#ffffff" stroke="#e2e8f0" rx="3"/>
  <text x="160" y="50" font-size="8.5" font-weight="bold" fill="#0f172a">Confidential Diligence Vault</text>
  <text x="160" y="62" font-size="7" fill="#64748b">Tier-1 Encryption | Automatic Watermarking | Signed Download Access</text>

  <!-- File Table Mock -->
  <rect x="160" y="70" width="350" height="18" fill="#f1f5f9"/>
  <text x="168" y="82" font-size="7" font-weight="bold" fill="#334155">Document Name</text>
  <text x="320" y="82" font-size="7" font-weight="bold" fill="#334155">Category</text>
  <text x="420" y="82" font-size="7" font-weight="bold" fill="#334155">Action</text>

  <text x="168" y="100" font-size="7" fill="#1e293b">📄 AutoCampus_Pitch_Deck_v2.pdf</text>
  <text x="320" y="100" font-size="7" fill="#475569">Pitch Deck</text>
  <rect x="420" y="90" width="55" height="14" rx="2" fill="#dbeafe"/>
  <text x="447" y="100" font-size="6.5" font-weight="bold" fill="#1d4ed8" text-anchor="middle">Download</text>

  <text x="168" y="118" font-size="7" fill="#1e293b">📊 Financial_Projections_3Yr.xlsx</text>
  <text x="320" y="118" font-size="7" fill="#475569">Financial Model</text>
  <rect x="420" y="108" width="55" height="14" rx="2" fill="#dbeafe"/>
  <text x="447" y="118" font-size="6.5" font-weight="bold" fill="#1d4ed8" text-anchor="middle">Download</text>

  <!-- Right Stat Panel -->
  <rect x="530" y="35" width="155" height="102" fill="#ffffff" stroke="#e2e8f0" rx="3"/>
  <text x="540" y="50" font-size="8" font-weight="bold" fill="#0f172a">Readiness Index</text>
  <text x="540" y="75" font-size="20" font-weight="bold" fill="#16a34a">88.5 <tspan font-size="10" fill="#64748b">/ 100</tspan></text>
  <text x="540" y="92" font-size="7" fill="#15803d">✔ University Endorsed</text>
  <text x="540" y="106" font-size="7" fill="#15803d">✔ Berkus Scorecard Passed</text>
  <text x="540" y="120" font-size="7" fill="#3b82f6">ℹ Diligence Package Ready</text>
</svg>
`;

export const figure13InvestorUI = `
<svg width="100%" height="150" viewBox="0 0 700 150" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <rect x="5" y="5" width="690" height="140" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
  <rect x="5" y="5" width="690" height="24" rx="6" fill="#1e293b"/>
  <circle cx="20" cy="17" r="4" fill="#ef4444"/><circle cx="32" cy="17" r="4" fill="#eab308"/><circle cx="44" cy="17" r="4" fill="#22c55e"/>
  <text x="350" y="21" font-size="8.5" fill="#cbd5e1" text-anchor="middle">CampusVenture — Accredited Investor Diligence &amp; NDA Room (/app/investor)</text>

  <!-- Deal Flow Grid Mock -->
  <rect x="15" y="35" width="320" height="102" fill="#ffffff" stroke="#e2e8f0" rx="3"/>
  <text x="25" y="50" font-size="8.5" font-weight="bold" fill="#0f172a">Curated Deal Flow (SGU Incubated)</text>
  <rect x="25" y="58" width="300" height="34" fill="#f8fafc" stroke="#e2e8f0" rx="2"/>
  <text x="35" y="72" font-size="8" font-weight="bold" fill="#1e40af">AutoCampus AI</text>
  <text x="35" y="84" font-size="7" fill="#64748b">EdTech • Seed Ask: INR 35L • SGU Kolhapur</text>
  <rect x="250" y="66" width="65" height="18" fill="#15803d" rx="2"/>
  <text x="282" y="78" font-size="7" font-weight="bold" fill="#ffffff" text-anchor="middle">Access Vault</text>

  <rect x="25" y="98" width="300" height="34" fill="#f8fafc" stroke="#e2e8f0" rx="2"/>
  <text x="35" y="112" font-size="8" font-weight="bold" fill="#1e40af">GreenRoute Logistics</text>
  <text x="35" y="124" font-size="7" fill="#64748b">CleanTech • Pre-Seed • SGU Kolhapur</text>
  <rect x="250" y="106" width="65" height="18" fill="#e0e7ff" rx="2"/>
  <text x="282" y="118" font-size="7" font-weight="bold" fill="#4338ca" text-anchor="middle">Request NDA</text>

  <!-- Modal Mock: Mutual Non-Disclosure Agreement -->
  <rect x="350" y="35" width="335" height="102" fill="#ffffff" stroke="#cbd5e1" rx="4"/>
  <rect x="350" y="35" width="335" height="20" fill="#fef08a" rx="4"/>
  <text x="517" y="49" font-size="8" font-weight="bold" fill="#854d0e" text-anchor="middle">🔒 Mutual Non-Disclosure Agreement (AutoCampus AI)</text>

  <text x="360" y="68" font-size="6.8" fill="#334155">1. Confidentiality: Recipient agrees to hold all proprietary data strictly private.</text>
  <text x="360" y="80" font-size="6.8" fill="#334155">2. Permitted Use: Solely for technical and financial investment evaluation.</text>
  <text x="360" y="92" font-size="6.8" fill="#334155">3. Governing Law: State of Maharashtra, India (Institutional Incubation Rules).</text>
  
  <rect x="360" y="106" width="180" height="18" fill="#f8fafc" stroke="#cbd5e1" rx="2"/>
  <text x="365" y="118" font-size="7" fill="#64748b">Digitally sign: Dr. V. Deshmukh (Angel)</text>
  <rect x="550" y="106" width="125" height="18" fill="#15803d" rx="2"/>
  <text x="612" y="118" font-size="7" font-weight="bold" fill="#ffffff" text-anchor="middle">Execute NDA &amp; Enter</text>
</svg>
`;

export const figure14UniversityUI = `
<svg width="100%" height="150" viewBox="0 0 700 150" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <rect x="5" y="5" width="690" height="140" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
  <rect x="5" y="5" width="690" height="24" rx="6" fill="#1e293b"/>
  <circle cx="20" cy="17" r="4" fill="#ef4444"/><circle cx="32" cy="17" r="4" fill="#eab308"/><circle cx="44" cy="17" r="4" fill="#22c55e"/>
  <text x="350" y="21" font-size="8.5" fill="#cbd5e1" text-anchor="middle">CampusVenture — University Incubation Multi-Tenant Audit Hub (/app/university)</text>

  <!-- Metric Badges -->
  <rect x="15" y="35" width="160" height="42" fill="#eff6ff" stroke="#93c5fd" rx="3"/>
  <text x="25" y="50" font-size="7.5" fill="#1e40af">Verified Startups</text>
  <text x="25" y="68" font-size="14" font-weight="bold" fill="#1e3a8a">12 Ventures</text>

  <rect x="185" y="35" width="160" height="42" fill="#f0fdf4" stroke="#86efac" rx="3"/>
  <text x="195" y="50" font-size="7.5" fill="#15803d">Accredited Angels</text>
  <text x="195" y="68" font-size="14" font-weight="bold" fill="#14532d">8 Investors</text>

  <rect x="355" y="35" width="160" height="42" fill="#fef08a" stroke="#fde047" rx="3"/>
  <text x="365" y="50" font-size="7.5" fill="#854d0e">Executed NDAs</text>
  <text x="365" y="68" font-size="14" font-weight="bold" fill="#713f12">24 Contracts</text>

  <rect x="525" y="35" width="160" height="42" fill="#faf5ff" stroke="#d8b4fe" rx="3"/>
  <text x="535" y="50" font-size="7.5" fill="#6d28d9">Capital Catalyzed</text>
  <text x="535" y="68" font-size="14" font-weight="bold" fill="#581c87">INR 62.5 Lakhs</text>

  <!-- Diligence Audit Trail Stream Mock -->
  <rect x="15" y="85" width="670" height="52" fill="#ffffff" stroke="#e2e8f0" rx="3"/>
  <text x="25" y="98" font-size="7.5" font-weight="bold" fill="#0f172a">Live Diligence Audit Trail (Realtime Broadcast)</text>
  <text x="25" y="112" font-size="7" fill="#475569">🟢 14:22:10 — NDA Executed for <tspan font-weight="bold">AutoCampus AI</tspan> by Dr. Deshmukh (Angel) | Hash verified</text>
  <text x="25" y="125" font-size="7" fill="#475569">🔵 14:23:45 — Pitch Deck Downloaded via Signed URL | IP: 103.21.244.12 | Cross-device token validated</text>
</svg>
`;
