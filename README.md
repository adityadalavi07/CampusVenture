# CampusVenture — Early-Stage Student Startup Discovery & AI Due Diligence

Build a complete, production-ready, deployable web application called **CampusVenture**.

CampusVenture is an **AI-powered Investment Readiness and Discovery Platform for verified early-stage student founders**.

The platform connects three major user groups:

1. **Student Founders**

2. **Universities / Incubators**

3. **Verified Investors**

The goal is to help promising student startups gain visibility, improve investment readiness, and connect with relevant investors in a trusted and secure environment.

This must NOT be a static UI prototype.

Build a **fully functional application with real authentication, real database persistence, real file uploads, real role-based dashboards, real AI integration, real notifications, real access control, and working workflows**.

Do not create fake buttons, fake dashboards, fake statistics, or non-functional UI elements.

---

# 1. PRODUCT VISION

Every year, thousands of students build websites, applications, and startup ideas through academic projects, hackathons, incubators, and personal initiatives.

Many promising ideas become inactive because student founders lack:

* exposure

* investor networks

* credibility

* pitch-readiness

* mentorship

* access to relevant funding opportunities

At the same time, investors struggle to discover genuine, verified, early-stage student startups.

CampusVenture solves this by creating a trusted ecosystem where:

Student Founder → Verification → Startup Profile → AI Readiness Analysis → Investor Discovery → Match → Data Room Access → NDA → Secure Meeting → Continued Discussion

Important:

CampusVenture is initially a **discovery, introduction, readiness, and communication platform**.

Do NOT build payment processing, investment transactions, securities trading, equity transfers, or transaction settlement into the MVP.

---

# 2. TECHNOLOGY STACK

Use a modern, production full-stack SaaS architecture:

Frontend:

* React

* TypeScript

* Vite

* Tailwind CSS

* shadcn/ui

* Lucide icons

* Responsive design

Backend:

* Supabase

* PostgreSQL

* Supabase Auth

* Supabase Storage

* Supabase Realtime

* Supabase Edge Functions

AI:

* OpenAI API through secure server-side Edge Functions

* Use structured JSON responses for the investment-readiness assessment

* Never expose the OpenAI API key in frontend code

AI model should be configurable through environment variables.

Storage:

* Supabase Storage for MVP

* Private buckets

* Signed URLs

* Role-based access

* Expiring access where appropriate

Deployment:

* Make the application deployable through Vercel and standard cloud hosts

* Keep environment variables separate from source code

* Make the application responsive on desktop, tablet, and mobile

---

# 3. BRANDING AND UI

Brand:

**CampusVenture**

Tagline:

**Where Student Startups Meet Their First Opportunity**

Visual identity:

* Premium startup/fintech aesthetic

* Professional

* Modern

* Trustworthy

* AI-powered

* Minimal but impressive

* Suitable for investors and universities

Provide:

* Dark mode

* Light mode

* Theme switcher in Settings

* Responsive navigation

* Desktop sidebar

* Mobile bottom navigation where appropriate

* Professional cards

* Smooth transitions

* Skeleton loaders

* Empty states

* Toast notifications

* Confirmation dialogs

* Error states

* Success states

Primary visual style:

Dark:

* near-black / deep navy background

* white typography

* subtle blue/violet accents

* glass-like cards used carefully

Light:

* white / very light gray background

* dark typography

* blue/violet accents

Do not make the interface look like a generic admin template.

---

# 4. USER ROLES

Implement strict role-based access control.

Roles:

## STUDENT

Student founder can:

* create profile

* verify university identity

* create startup

* upload pitch deck

* upload startup documents

* upload presentation video

* add startup information

* receive AI readiness score

* receive AI recommendations

* discover investors

* filter investors

* save investors

* request connection

* request data-room access

* approve/reject data-room requests

* accept NDA

* access approved data room

* message investors

* schedule meetings

* manage startup updates

* view analytics

* manage notifications

* manage privacy/settings

---

## INVESTOR

Investor can:

* create investor profile

* complete verification

* specify investment preferences

* specify preferred sectors

* specify geography

* specify startup stage

* specify ticket size

* discover startups

* filter startups

* sort startups

* view public startup profiles

* view AI readiness score where founder allows it

* save startups

* request connection

* request data-room access

* accept NDA

* access approved documents

* message founders

* schedule meetings

* manage portfolio/watchlist

* receive recommendations

* manage notifications

* manage settings

---

## UNIVERSITY / INCUBATOR

University/incubator users can:

* create organization profile

* verify organization

* manage student founders associated with the institution

* review submitted startups

* approve/reject institutional verification

* view startup ecosystem dashboard

* monitor startup stages

* view aggregated startup statistics

* highlight promising startups

* publish incubation programs

* publish mentorship opportunities

* publish events

* send announcements

* view investor interest analytics

* manage organization settings

Do NOT allow universities to access confidential investor-founder documents unless explicitly authorized.

---

## ADMIN

Create a secure admin dashboard.

Admin can:

* manage users

* manage verification requests

* manage universities

* manage investors

* manage startups

* review reported content

* manage sectors

* manage startup stages

* manage system settings

* monitor AI assessment jobs

* view platform analytics

* suspend users

* manage verification status

Admin-only routes must be protected.

---

# 5. AUTHENTICATION

Build a complete authentication system.

Pages:

* Landing page

* Sign up

* Login

* Forgot password

* Reset password

* Email verification

* Role selection

* Onboarding

During signup ask:

"What are you joining as?"

Options:

* Student Founder

* Investor

* University / Incubator

After role selection, route the user into the correct onboarding flow.

Use Supabase Auth.

Support:

* Email/password

* University email verification for students

* Optional Google authentication if configured

Do not trust frontend role selection alone.

Store roles securely in the database and enforce authorization using database policies.

---

# 6. STUDENT VERIFICATION

Student verification should include:

* Full name

* University

* University email

* Course

* Department

* Graduation year

* Student ID field

* Optional verification document

Verification status:

* Pending

* Verified

* Rejected

* Needs Review

For the MVP, university email verification should be the primary verification mechanism.

Create an architecture that allows future integration with third-party identity/KYC providers.

Do not store sensitive identity documents unnecessarily.

---

# 7. INVESTOR VERIFICATION

Investor onboarding:

* Full name

* Organization

* Role

* Investor type

* Website

* LinkedIn

* Country

* Preferred sectors

* Preferred startup stage

* Investment range

* Geography

* Investment thesis

* Verification information

Verification statuses:

* Pending

* Verified

* Rejected

* Needs Review

For sensitive KYC information, use a third-party verification provider when configured.

Do not expose raw identity documents to other users.

Do not store sensitive KYC data unless necessary.

---

# 8. STUDENT PROFILE

Create a professional founder profile.

Fields:

* Profile photo

* Name

* University

* Degree

* Department

* Graduation year

* Skills

* Interests

* Founder role

* Previous projects

* Achievements

* Hackathons

* LinkedIn

* GitHub

* Portfolio

* Short founder bio

Show verification badge when verified.

Include:

**Founder Profile Completeness**

Example:

78% complete

Show suggestions:

* Add GitHub

* Add pitch video

* Add achievements

* Complete startup information

---

# 9. STARTUP PROFILE

Students can create one or more startup profiles depending on account configuration.

Startup fields:

* Startup name

* Logo

* One-line description

* Problem

* Solution

* Target users

* Industry

* Sub-sector

* Business model

* Current stage

* Location

* Team size

* Founder information

* Website

* Demo URL

* GitHub

* Traction

* Revenue

* Monthly users

* Growth metrics

* Funding raised

* Funding required

* Use of funds

* Competitors

* Competitive advantage

* Future roadmap

Startup stages:

* Idea

* Prototype

* MVP

* Early Traction

* Revenue

* Growth

---

# 10. STARTUP PRESENTATION VIDEO

Allow founders to upload a short startup pitch video.

Recommended duration:

2–3 minutes.

Video upload requirements:

* preview before publishing

* progress indicator

* thumbnail

* replace video

* delete video

* playback

* private/public visibility

Create a video section on the startup profile.

If AI video analysis is enabled:

Analyze:

* speech clarity

* pitch structure

* confidence indicators where technically appropriate

* filler-word frequency

* speaking pace

* key points covered

Do NOT claim psychological or personality conclusions from facial analysis.

Show:

**AI Pitch Feedback**

with:

* Strengths

* Improvement areas

* Suggested pitch structure

---

# 11. AI INVESTMENT READINESS ENGINE

This is one of the core features of CampusVenture.

Create a button:

**Analyze Startup with AI**

When clicked:

1. Collect startup information.

2. Read pitch deck/document content.

3. Analyze startup description.

4. Analyze business model.

5. Analyze market information.

6. Analyze traction.

7. Analyze competitive advantage.

8. Analyze funding requirement.

9. Generate structured assessment.

10. Save assessment to database.

11. Display results visually.

Create an **Investment Readiness Score from 0–100**.

Break it into:

* Problem clarity — 15%

* Solution strength — 15%

* Market opportunity — 15%

* Business model — 10%

* Product readiness — 10%

* Traction — 15%

* Competitive advantage — 10%

* Team readiness — 5%

* Funding clarity — 5%

Make the weights configurable.

Do not present the AI score as an actual prediction of investment success.

Label it:

**AI-generated readiness assessment, not investment advice.**

---

# 12. AI OUTPUT

The AI assessment must return structured information.

Show:

## Overall Score

Example:

**78 / 100**

Investment Readiness:

**Strong Potential**

Then show:

### Strengths

* Strong problem definition

* Clear target users

* Working MVP

### Weaknesses

* Limited traction evidence

* Business model needs clarification

### Recommendations

1. Add measurable traction

2. Improve competitive analysis

3. Clarify customer acquisition strategy

### Missing Information

* Market size

* Revenue evidence

* Customer validation

### Investor Preparation Checklist

* Pitch deck

* Financial projections

* Traction metrics

* Product demo

* Team profile

* Use of funds

Allow founders to rerun the analysis after updating their startup.

Store assessment history.

Show score improvement over time.

---

# 13. AI STARTUP CATEGORY DETECTION

Automatically classify startup into sectors such as:

* AI

* FinTech

* HealthTech

* EdTech

* AgriTech

* ClimateTech

* SaaS

* Cybersecurity

* DeepTech

* Consumer

* Mobility

* Web3

* Robotics

* Other

Allow founder to edit AI classification.

---

# 14. INVESTOR DISCOVERY

Create an investor discovery page.

Investor cards should show:

* Investor name

* Organization

* Verification badge

* Investor type

* Preferred sectors

* Preferred stages

* Investment range

* Geography

* Short thesis

* Match percentage

Buttons:

* View Profile

* Save

* Connect

* Request Introduction

---

# 15. STARTUP DISCOVERY FOR INVESTORS

Create an investor startup marketplace.

Each startup card shows:

* Logo

* Startup name

* One-line description

* Industry

* Stage

* Location

* Funding requirement

* AI readiness score if publicly visible

* Verification badge

* Traction summary

* Match percentage

Buttons:

* View Startup

* Save

* Request Connection

* Request Data Room

---

# 16. ADVANCED FILTERING

Investors must be able to filter startups by:

* Industry

* Sub-sector

* Startup stage

* Location

* Funding requirement

* Revenue status

* Traction

* AI readiness score

* Team size

* University

* Technology

* Business model

Sorting:

* Highest match

* Highest readiness

* Newest

* Most traction

* Funding requirement

* Recently updated

Create filter chips and a clear-all button.

Persist filter preferences.

---

# 17. INVESTOR MATCHING ENGINE

Start with a transparent weighted matching algorithm rather than pretending to have trained ML.

Calculate match using:

* Sector match — 30%

* Startup stage match — 20%

* Funding range match — 15%

* Geography match — 10%

* Technology match — 10%

* Business model match — 5%

* Investor thesis similarity — 10%

Return:

**82% Match**

Also show:

"Why this is a match"

Example:

* Sector preference matches

* Funding range matches

* Preferred stage matches

* Geography matches

Design the architecture so this can later be replaced with embeddings/ML once enough platform data exists.

---

# 18. SECURE DATA ROOM

This is a critical feature.

Each startup can have a private data room.

Possible folders:

* Pitch Deck

* Financials

* Product Demo

* Market Research

* Legal Documents

* Traction

* Team

* Other

Files must be stored in private storage.

Never expose raw storage URLs publicly.

Use signed URLs.

Implement:

* Access control

* File permissions

* Upload

* Download

* Preview where supported

* Delete

* Versioning where practical

* Access logs

Access log should contain:

* User

* File

* Action

* Timestamp

Actions:

* Viewed

* Downloaded

* Uploaded

* Deleted

---

# 19. DATA ROOM ACCESS FLOW

Investor opens startup profile.

Investor clicks:

**Request Data Room Access**

Founder receives notification.

Founder can:

* Approve

* Reject

If approved:

Show NDA step.

Both parties must accept the platform's NDA workflow before confidential documents become accessible.

Store:

* NDA version

* Accepted by

* Timestamp

* User ID

After acceptance:

Grant access to the data room.

Allow founder to revoke access.

When access is revoked, signed URLs must stop working after their expiry.

---

# 20. NDA DISCLAIMER

Display clearly:

"CampusVenture provides a digital NDA workflow for platform use. It does not guarantee protection against idea theft and does not replace professional legal advice."

Do not make unrealistic claims that an NDA completely prevents idea theft.

---

# 21. SECURE MESSAGING

Build real-time messaging.

Features:

* One-to-one founder/investor conversations

* Conversation list

* Unread messages

* Read status

* Timestamps

* Attachments where allowed

* Report/block

* Notifications

Only allow messaging after an appropriate connection/request state.

---

# 22. SECURE MEETINGS

Create a meeting system.

Founder and investor can:

* propose meeting

* select date

* select time

* add agenda

* confirm

* cancel

* reschedule

Meeting states:

* Requested

* Accepted

* Declined

* Rescheduled

* Completed

* Cancelled

For video meetings:

Create an integration layer for a provider such as Daily or another configured video meeting provider.

Use server-side functions for meeting-room creation and access tokens.

Meeting room should only be accessible to authorized participants.

If a video provider is not configured yet, display a clearly labeled configuration state instead of pretending the video system works.

Do not create fake video functionality.

---

# 23. UNIVERSITY / INCUBATOR DASHBOARD

Dashboard cards:

* Total student founders

* Verified founders

* Active startups

* Startups by stage

* Startups by sector

* Investor interest

* Connection requests

* Data-room requests

* Startup readiness average

Charts:

* Startups by sector

* Startups by stage

* Readiness distribution

* Monthly startup activity

* Investor interest

University can highlight:

**Top Emerging Startups**

based on transparent platform metrics.

Do not claim that the platform guarantees investment.

---

# 24. UNIVERSITY PROGRAMS

Allow universities/incubators to create:

* Incubation programs

* Mentorship programs

* Workshops

* Demo days

* Startup challenges

* Events

Students can:

* discover

* apply

* bookmark

University can manage applicants.

---

# 25. STUDENT DASHBOARD

Dashboard should contain:

Welcome message

Startup status

Investment readiness score

Profile completeness

Investor views

Saved investors

Connection requests

Data-room requests

Upcoming meetings

AI recommendations

Recent activity

Startup performance overview

Primary CTA:

**Improve Investment Readiness**

---

# 26. INVESTOR DASHBOARD

Dashboard:

* Recommended startups

* New startups

* Saved startups

* Connection requests

* Data-room requests

* Upcoming meetings

* Recent activity

Main CTA:

**Discover Startups**

---

# 27. NOTIFICATION SYSTEM

Create real notifications.

Examples:

* Your account has been verified

* Investor requested connection

* Investor requested data room

* Data room approved

* NDA accepted

* New message

* Meeting requested

* Meeting confirmed

* AI analysis completed

* Startup profile incomplete

Support:

* In-app notifications

* Read/unread

* Mark all as read

Email notifications should be architected through a configurable provider.

---

# 28. SEARCH

Global search should support:

* Startups

* Investors

* Universities

* Programs

Use debounced search.

Show relevant results.

---

# 29. STARTUP FEED

Create a professional discovery feed.

Students can publish startup updates such as:

* Product launch

* Milestone

* New feature

* Competition win

* Funding milestone

* Team update

* Demo

Investors can discover updates.

Implement:

* Like

* Save

* Share internally

* Report

Avoid turning the platform into a generic social network.

The main purpose remains startup discovery and investment readiness.

---

# 30. SETTINGS

Create a complete settings section.

Categories:

## Account

* Name

* Email

* Profile photo

* Password

## Appearance

* Light

* Dark

* System

## Privacy

* Profile visibility

* Startup visibility

* Investor visibility

* Data-room preferences

## Notifications

* Messages

* Connection requests

* Data-room requests

* Meetings

* AI analysis

## Security

* Active sessions

* Sign out all devices

* Two-factor authentication architecture if supported

## Verification

Show current verification status.

---

# 31. DATABASE DESIGN

Create a normalized PostgreSQL schema.

Main tables:

users

profiles

user_roles

universities

university_members

student_verifications

investor_verifications

startups

startup_members

startup_media

startup_documents

startup_updates

startup_metrics

startup_assessments

assessment_history

investor_profiles

investor_preferences

investor_saved_startups

startup_saved_investors

matches

connection_requests

data_room_requests

data_room_members

data_room_files

data_room_access_logs

ndas

conversations

conversation_members

messages

meetings

notifications

programs

program_applications

reports

audit_logs

Use UUID primary keys.

Add created_at and updated_at.

Use proper foreign keys.

Use indexes for search/filter fields.

---

# 32. SECURITY

Security is extremely important.

Implement Supabase Row Level Security for every sensitive table.

Rules should enforce:

* users can only edit their own profile

* founders can only edit their own startups

* investors cannot access private startup documents without permission

* university users can only manage their organization

* only authorized users can access data rooms

* only participants can access private conversations

* only meeting participants can access meeting rooms

* admin routes require admin role

Never use unrestricted policies such as allowing all authenticated users to read every row.

Never expose:

* service-role keys

* OpenAI API keys

* KYC secrets

* private storage credentials

in frontend code.

---

# 33. AI SECURITY

All AI API requests must go through a backend Edge Function.

Never call OpenAI directly from browser code with a secret API key.

Create an Edge Function such as:

/functions/analyze-startup

Input:

startup_id

The function:

1. authenticates the user

2. verifies startup ownership/authorization

3. retrieves allowed startup information

4. retrieves pitch deck content if available

5. sends only necessary data to AI

6. validates structured AI output

7. stores assessment

8. returns assessment to authorized user

Handle:

* API failures

* rate limits

* timeouts

* invalid output

* missing documents

---

# 34. AI OUTPUT SCHEMA

Use structured output.

Required fields:

overall_score

readiness_label

category_scores

strengths

weaknesses

recommendations

missing_information

investor_questions

founder_action_plan

risk_flags

Do not generate fake certainty.

AI should explicitly state that the assessment is informational and not investment advice.

---

# 35. DEMO MODE

Create a safe demo environment for hackathon presentation.

Include demo accounts:

Demo Student Founder

Demo Investor

Demo University

Clearly label them as:

**DEMO ACCOUNT**

Seed realistic example startups and investor profiles.

Demo data must be separated from real user data.

Do not fake AI results when the AI API is configured.

If AI API is unavailable, show an informative configuration error instead of pretending that a real analysis happened.

---

# 36. LANDING PAGE

Create an impressive landing page.

Hero:

**Great Student Ideas Deserve the Right Opportunity.**

Subtitle:

**CampusVenture connects verified student founders with investors through AI-powered investment readiness, intelligent discovery, and secure collaboration.**

Buttons:

**I'm a Student Founder**

**I'm an Investor**

**I'm a University**

Sections:

* The problem

* How CampusVenture works

* AI Investment Readiness

* Verified Ecosystem

* Secure Data Rooms

* Investor Discovery

* University Ecosystem

* Impact

* FAQ

* CTA

---

# 37. ABOUT CAMPUSVENTURE

Include:

Problem:

Thousands of students build promising startups, but many struggle with exposure, investor access, credibility, and funding.

Solution:

CampusVenture creates a trusted bridge between verified student founders and verified investors.

Mission:

**Make promising student startups discoverable, investment-ready, and connected to the right opportunities.**

---

# 38. ADMIN ANALYTICS

Admin dashboard:

* Total users

* Student founders

* Investors

* Universities

* Verified accounts

* Active startups

* Connection requests

* Data-room requests

* Meetings

* AI assessments

* Platform activity

Charts and exportable reports.

---

# 39. RESPONSIVENESS

The application must work correctly on:

* Desktop

* Laptop

* Tablet

* Mobile

Test:

* Chrome

* Edge

* Safari where possible

Avoid horizontal overflow.

---

# 40. PERFORMANCE

Implement:

* lazy loading

* pagination

* debounced search

* optimized images

* compressed thumbnails

* loading states

* error boundaries

* efficient database queries

Do not load every startup or every message at once.

---

# 41. ACCESSIBILITY

Implement:

* keyboard navigation

* semantic HTML

* visible focus states

* sufficient contrast

* accessible labels

* alt text

* screen-reader-friendly forms

---

# 42. ERROR HANDLING

Every API/database action must have:

* loading state

* success state

* error state

Never leave buttons permanently loading.

Show useful error messages.

---

# 43. EMPTY STATES

Create meaningful empty states.

Examples:

"No investor matches yet."

"No data-room requests."

"No upcoming meetings."

"No startup updates."

"No saved startups."

Each should have an appropriate CTA.

---

# 44. AUDIT LOGGING

Create audit logs for sensitive actions:

* verification

* data-room access

* document upload

* document download

* document deletion

* NDA acceptance

* access revocation

* admin actions

Display relevant activity to authorized users.

---

# 45. IMPORTANT PRODUCT RULES

Do NOT:

* process investments

* transfer money

* execute equity transactions

* guarantee funding

* claim that AI predicts investment success

* expose confidential startup documents publicly

* expose private investor information

* store unnecessary KYC documents

* expose API keys

* create fake functionality

* use fake "AI" responses

* create fake "secure" meetings

CampusVenture is a discovery, readiness, verification, and collaboration platform.

---

# 46. NAVIGATION

Student:

Dashboard

My Startup

AI Readiness

Discover Investors

Connections

Data Room

Messages

Meetings

Updates

Notifications

Settings

Investor:

Dashboard

Discover Startups

Recommendations

Saved Startups

Connections

Data Rooms

Messages

Meetings

Settings

University:

Dashboard

Students

Startups

Programs

Investor Interest

Analytics

Announcements

Settings

Admin:

Dashboard

Users

Students

Investors

Universities

Startups

Verification

Reports

AI Assessments

Analytics

Settings

---

# 47. CORE USER JOURNEYS

## Student journey

Landing page

→ Student signup

→ University verification

→ Profile creation

→ Create startup

→ Upload pitch deck

→ Upload 2–3 minute pitch video

→ Complete startup information

→ Run AI assessment

→ Receive readiness score

→ Improve startup

→ Publish startup

→ Discover investors

→ Receive investor request

→ Approve connection

→ Investor requests data room

→ Founder approves

→ NDA acceptance

→ Data room access

→ Secure messaging

→ Schedule meeting

→ Continue discussion

---

## Investor journey

Landing page

→ Investor signup

→ Investor profile

→ Verification

→ Select sectors

→ Select stages

→ Select investment range

→ Investor dashboard

→ Recommended startups

→ Filter startups

→ View startup

→ View readiness information

→ Request connection

→ Request data room

→ NDA acceptance

→ Secure data room

→ Message founder

→ Schedule meeting

→ Continue discussion

---

## University journey

University signup

→ Organization verification

→ Dashboard

→ Add/verify students

→ View student startups

→ Support incubation

→ Publish programs

→ Track ecosystem metrics

→ View investor interest

→ Highlight promising startups

---

# 48. DESIGN DETAILS

Create polished components:

* Startup cards

* Investor cards

* Verification badges

* AI score rings

* Progress bars

* Match score badges

* Data-room file cards

* Timeline components

* Meeting cards

* Notification dropdown

* Search/filter drawer

* Profile completion widget

* Analytics cards

* Charts

* Modal dialogs

* Confirmation dialogs

Use consistent spacing and typography.

Avoid excessive gradients.

Use animations only where they improve UX.

---

# 49. DEMO EXPERIENCE

The application should be impressive during a live hackathon demo.

Create a smooth demo path:

1. Login as student

2. Show startup profile

3. Upload/select pitch deck

4. Run AI analysis

5. Display readiness score

6. Show recommendations

7. Switch to investor demo

8. Show recommended startups

9. Apply filters

10. Open a startup

11. Request data room

12. Switch to student

13. Approve request

14. Accept NDA

15. Open secure data room

16. Show access logs

17. Open messaging

18. Schedule meeting

19. Show university dashboard

20. Show ecosystem analytics

Make the entire flow actually work with seeded demo data.

---

# 50. FINAL QUALITY REQUIREMENT

Before considering the project complete, verify:

* Authentication works

* Role routing works

* Database writes work

* Database reads work

* RLS policies work

* File uploads work

* Private storage works

* Signed URLs work

* AI analysis works when API key is configured

* AI results are persisted

* Investor filtering works

* Matching works

* Connection requests work

* Data-room requests work

* NDA workflow works

* Messaging works

* Notifications work

* Meetings work when provider is configured

* Settings work

* Light/dark mode works

* Mobile layout works

* Error handling works

* No fake buttons remain

* No sensitive secrets are exposed

* No confidential data is publicly accessible

Run a full end-to-end test of all three major roles before declaring the application complete.

---

# 51. BUILD PRIORITY

Build in this order:

PHASE 1:

Authentication + roles + onboarding

PHASE 2:

Profiles + university/investor/student verification

PHASE 3:

Startup creation + pitch deck + video + startup profiles

PHASE 4:

AI Investment Readiness Engine

PHASE 5:

Investor discovery + filtering + matching

PHASE 6:

Connections + notifications

PHASE 7:

Secure Data Room + access control + audit logs

PHASE 8:

NDA workflow

PHASE 9:

Messaging + meetings

PHASE 10:

University dashboard + programs + analytics

PHASE 11:

Admin dashboard

PHASE 12:

Security audit + responsive testing + deployment preparation

Do not build all features as disconnected mockups.

Build the backend and database logic together with each feature so every screen is connected to real data.

---

# CORE ARCHITECTURE & PRODUCTION STANDARDS

Treat this as a serious production SaaS product.

Prioritize:

**FUNCTIONALITY → SECURITY → DATA INTEGRITY → USER EXPERIENCE → VISUAL POLISH**

When a feature requires an external API key, create the complete integration architecture and clearly identify the required environment variable/configuration.

Never put secret keys in frontend code.

Never fake successful API responses.

Never create a UI element that appears functional but has no backend behavior.

Use real Supabase authentication, PostgreSQL, Storage, Realtime, RLS, and Edge Functions.

Build CampusVenture as a coherent, deployable application that can be demonstrated end-to-end by a student founder, investor, and university administrator.

Start by creating the application architecture, database schema, authentication, RLS policies, and core role-based navigation. Then implement each feature in the priority order above.

The final result should feel like a professional early-stage startup product rather than a hackathon mockup.

dont force any user for real authentication for now days we will add them at the end

## Getting Started

To run CampusVenture locally:

```sh
git clone https://github.com/adityadalavi07/CampusVenture.git
cd CampusVenture
npm install
npm run dev
```

Visit [http://localhost:8080/](http://localhost:8080/) in your browser.
