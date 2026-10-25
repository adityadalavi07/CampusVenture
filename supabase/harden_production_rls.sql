-- ==============================================================================
-- CampusVenture Production Database Hardening & Row-Level Security (RLS)
-- Paste and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lirfkzpehmxtynjsjzib/sql/new
-- ==============================================================================

-- 1. Enable Row-Level Security (RLS) on sensitive tables
alter table public.startups enable row level security;
alter table public.profiles enable row level security;

-- 2. Drop any legacy open or permissive policies
drop policy if exists "Public access startups" on public.startups;
drop policy if exists "Enable read access for all users" on public.startups;
drop policy if exists "Enable insert for authenticated users only" on public.startups;
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Approved startups are viewable by everyone" on public.startups;
drop policy if exists "Founders can view their own startups" on public.startups;
drop policy if exists "Universities can view their campus startups" on public.startups;
drop policy if exists "Founders can insert startup" on public.startups;
drop policy if exists "Founders can update their own startup" on public.startups;
drop policy if exists "University reviewers can update review status" on public.startups;
drop policy if exists "Founders can delete their own startups" on public.startups;

-- ==============================================================================
-- 3. POLICIES FOR public.profiles
-- ==============================================================================

-- Public & Authenticated users can view profile cards (name, org, role)
create policy "Profiles are viewable by everyone" on public.profiles
  for select
  using (true);

-- Authenticated users can only insert their own profile matching auth.uid()
create policy "Users can insert their own profile" on public.profiles
  for insert
  with check (auth.uid() = id);

-- Users can only update their own profile
create policy "Users can update their own profile" on public.profiles
  for update
  using (auth.uid() = id);

-- ==============================================================================
-- 4. POLICIES FOR public.startups
-- ==============================================================================

-- (A) SELECT / READ PERMISSIONS:
-- 1. Anyone (including accredited investors) can view approved, verified startups
create policy "Approved startups are viewable by everyone" on public.startups
  for select
  using (status = 'approved' or verified = true);

-- 2. Founders can view their own startups (including drafts & pending review)
create policy "Founders can view their own startups" on public.startups
  for select
  using (
    auth.uid() = founder_id
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
  );

-- 3. University reviewers can view all submissions belonging to their institution
create policy "Universities can view their campus startups" on public.startups
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'university'
        and (
          lower(profiles.org) = lower(startups.university)
          or split_part(profiles.email, '@', 2) = split_part(startups.founder_email, '@', 2)
        )
    )
  );

-- (B) INSERT / CREATE PERMISSIONS:
-- Founders can insert their startup idea
create policy "Founders can insert startup" on public.startups
  for insert
  with check (
    auth.uid() = founder_id
    or founder_id is null
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
  );

-- (C) UPDATE / EDIT PERMISSIONS:
-- 1. Founders can update their own startup details
create policy "Founders can update their own startup" on public.startups
  for update
  using (
    auth.uid() = founder_id
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
  );

-- 2. University incubation cells can review, approve, and record review notes
create policy "University reviewers can update review status" on public.startups
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'university'
        and (
          lower(profiles.org) = lower(startups.university)
          or split_part(profiles.email, '@', 2) = split_part(startups.founder_email, '@', 2)
        )
    )
  );

-- (D) DELETE PERMISSIONS:
-- Only founders can delete their own startups
create policy "Founders can delete their own startups" on public.startups
  for delete
  using (
    auth.uid() = founder_id
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
  );

-- 5. Add Performance Indexes
create index if not exists idx_startups_status on public.startups(status);
create index if not exists idx_startups_university on public.startups(university);
create index if not exists idx_startups_founder_email on public.startups(founder_email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- ==============================================================================
-- 6. DATA ROOM SCHEMA ENHANCEMENTS
-- ==============================================================================
alter table public.data_room_requests
  add column if not exists permitted_doc_ids text[],
  add column if not exists rules_accepted boolean default false not null,
  add column if not exists rules_version text default 'v1.0-cv-reg',
  add column if not exists rules_accepted_at timestamp with time zone,
  add column if not exists university_name text,
  add column if not exists university_id text;

-- ==============================================================================
-- 7. ROW-LEVEL SECURITY FOR public.data_room_requests
-- ==============================================================================
alter table public.data_room_requests enable row level security;

-- Drop legacy open policies
drop policy if exists "Public access to data room requests" on public.data_room_requests;
drop policy if exists "Founders can view requests for their startups" on public.data_room_requests;
drop policy if exists "Investors can view their own requests" on public.data_room_requests;
drop policy if exists "Investors can insert requests" on public.data_room_requests;
drop policy if exists "Founders can update requests for their startups" on public.data_room_requests;
drop policy if exists "Investors can update their own requests" on public.data_room_requests;
drop policy if exists "Universities can view requests for their campus" on public.data_room_requests;

-- (a) Investors can view their own requests
create policy "Investors can view their own requests" on public.data_room_requests
  for select
  using (
    auth.uid()::text = investor_id
    or (auth.jwt()->>'email' is not null and lower(investor_email) = lower(auth.jwt()->>'email'))
  );

-- (b) Founders can view requests for their startups
create policy "Founders can view requests for their startups" on public.data_room_requests
  for select
  using (
    auth.uid()::text = founder_id
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
    or exists (
      select 1 from public.startups
      where startups.id = data_room_requests.startup_id
        and (
          auth.uid()::text = startups.founder_id::text
          or (auth.jwt()->>'email' is not null and lower(startups.founder_email) = lower(auth.jwt()->>'email'))
        )
    )
  );

-- (c) University reviewers can view requests for startups on their campus (audit log view)
create policy "Universities can view requests for their campus" on public.data_room_requests
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id::text = auth.uid()::text
        and profiles.role = 'university'
        and exists (
          select 1 from public.startups
          where startups.id = data_room_requests.startup_id
            and (
              lower(profiles.org) = lower(startups.university)
              or split_part(profiles.email, '@', 2) = split_part(startups.founder_email, '@', 2)
            )
        )
    )
  );

-- (d) Investors can submit requests for data rooms
create policy "Investors can insert requests" on public.data_room_requests
  for insert
  with check (
    auth.uid()::text = investor_id
    or (auth.jwt()->>'email' is not null and lower(investor_email) = lower(auth.jwt()->>'email'))
    or auth.uid() is not null
  );

-- (e) Founders can update request status (grant, decline, revoke, update permitted_doc_ids)
create policy "Founders can update requests for their startups" on public.data_room_requests
  for update
  using (
    auth.uid()::text = founder_id
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
    or exists (
      select 1 from public.startups
      where startups.id = data_room_requests.startup_id
        and (
          auth.uid()::text = startups.founder_id::text
          or (auth.jwt()->>'email' is not null and lower(startups.founder_email) = lower(auth.jwt()->>'email'))
        )
    )
  );

-- (f) Investors can sign NDA and acknowledge rules (v1.0-cv-reg) on their own granted requests
create policy "Investors can update their own requests" on public.data_room_requests
  for update
  using (
    auth.uid()::text = investor_id
    or (auth.jwt()->>'email' is not null and lower(investor_email) = lower(auth.jwt()->>'email'))
  );

-- ==============================================================================
-- 8. ROW-LEVEL SECURITY FOR public.data_room_docs
-- ==============================================================================
alter table public.data_room_docs enable row level security;

drop policy if exists "Public access to data room docs" on public.data_room_docs;
drop policy if exists "Founders manage their own startup docs" on public.data_room_docs;
drop policy if exists "Approved investors can view permitted docs" on public.data_room_docs;

-- (a) Founders have full CRUD access to their own startup docs
create policy "Founders manage their own startup docs" on public.data_room_docs
  for all
  using (
    auth.uid()::text = owner_id
    or exists (
      select 1 from public.startups
      where startups.id = data_room_docs.startup_id
        and (
          auth.uid()::text = startups.founder_id::text
          or (auth.jwt()->>'email' is not null and lower(startups.founder_email) = lower(auth.jwt()->>'email'))
        )
    )
  )
  with check (
    auth.uid()::text = owner_id
    or exists (
      select 1 from public.startups
      where startups.id = data_room_docs.startup_id
        and (
          auth.uid()::text = startups.founder_id::text
          or (auth.jwt()->>'email' is not null and lower(startups.founder_email) = lower(auth.jwt()->>'email'))
        )
    )
  );

-- (b) Approved investors with active granted access can view document metadata
create policy "Approved investors can view permitted docs" on public.data_room_docs
  for select
  using (
    exists (
      select 1 from public.data_room_requests r
      where r.startup_id = data_room_docs.startup_id
        and (r.investor_id = auth.uid()::text or (auth.jwt()->>'email' is not null and lower(r.investor_email) = lower(auth.jwt()->>'email')))
        and r.status = 'granted'
        and (r.nda_signed = true or r.nda_status = 'signed')
        and (r.expires_at is null or r.expires_at > now())
        and (
          r.permitted_doc_ids is null
          or array_length(r.permitted_doc_ids, 1) is null
          or data_room_docs.id::text = any(r.permitted_doc_ids)
        )
    )
  );

-- ==============================================================================
-- 9. ROW-LEVEL SECURITY FOR public.data_room_audit_logs
-- ==============================================================================
alter table public.data_room_audit_logs enable row level security;

drop policy if exists "Public access to data room audit logs" on public.data_room_audit_logs;
drop policy if exists "Users can insert audit logs" on public.data_room_audit_logs;
drop policy if exists "Founders and investors can view relevant audit logs" on public.data_room_audit_logs;

create policy "Users can insert audit logs" on public.data_room_audit_logs
  for insert
  with check (auth.uid() is not null);

create policy "Founders and investors can view relevant audit logs" on public.data_room_audit_logs
  for select
  using (
    auth.uid()::text = user_id
    or (auth.jwt()->>'email' is not null and lower(user_email) = lower(auth.jwt()->>'email'))
    or exists (
      select 1 from public.startups
      where startups.id = data_room_audit_logs.startup_id
        and (
          auth.uid()::text = startups.founder_id::text
          or (auth.jwt()->>'email' is not null and lower(startups.founder_email) = lower(auth.jwt()->>'email'))
        )
    )
    or exists (
      select 1 from public.profiles
      where profiles.id::text = auth.uid()::text
        and profiles.role = 'university'
        and exists (
          select 1 from public.startups
          where startups.id = data_room_audit_logs.startup_id
            and (
              lower(profiles.org) = lower(startups.university)
              or split_part(profiles.email, '@', 2) = split_part(startups.founder_email, '@', 2)
            )
        )
    )
  );

-- ==============================================================================
-- 10. ROW-LEVEL SECURITY FOR public.connection_requests
-- ==============================================================================
alter table public.connection_requests enable row level security;

drop policy if exists "Public access to connection requests" on public.connection_requests;
drop policy if exists "Users can view their connection requests" on public.connection_requests;
drop policy if exists "Users can create connection requests" on public.connection_requests;
drop policy if exists "Users can update their connection requests" on public.connection_requests;

create policy "Users can view their connection requests" on public.connection_requests
  for select
  using (
    auth.uid()::text = sender_id
    or auth.uid()::text = receiver_id
    or (auth.jwt()->>'email' is not null and (
      lower(sender_email) = lower(auth.jwt()->>'email')
      or lower(receiver_email) = lower(auth.jwt()->>'email')
    ))
  );

create policy "Users can create connection requests" on public.connection_requests
  for insert
  with check (
    auth.uid()::text = sender_id
    or (auth.jwt()->>'email' is not null and lower(sender_email) = lower(auth.jwt()->>'email'))
    or auth.uid() is not null
  );

create policy "Users can update their connection requests" on public.connection_requests
  for update
  using (
    auth.uid()::text = receiver_id
    or auth.uid()::text = sender_id
    or (auth.jwt()->>'email' is not null and (
      lower(receiver_email) = lower(auth.jwt()->>'email')
      or lower(sender_email) = lower(auth.jwt()->>'email')
    ))
  );

-- ==============================================================================
-- 11. ROW-LEVEL SECURITY FOR public.notifications
-- ==============================================================================
alter table public.notifications enable row level security;

drop policy if exists "Public access to notifications" on public.notifications;
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Authenticated users can insert notifications" on public.notifications;
drop policy if exists "Users can mark their notifications as read" on public.notifications;

create policy "Users can view their own notifications" on public.notifications
  for select
  using (
    auth.uid()::text = user_id
    or (auth.jwt()->>'email' is not null and lower(recipient_email) = lower(auth.jwt()->>'email'))
  );

create policy "Authenticated users can insert notifications" on public.notifications
  for insert
  with check (auth.uid() is not null);

create policy "Users can mark their notifications as read" on public.notifications
  for update
  using (
    auth.uid()::text = user_id
    or (auth.jwt()->>'email' is not null and lower(recipient_email) = lower(auth.jwt()->>'email'))
  );

-- ==============================================================================
-- 12. ROW-LEVEL SECURITY FOR public.messages
-- ==============================================================================
alter table public.messages enable row level security;

drop policy if exists "Public access to messages" on public.messages;
drop policy if exists "Users can view their private conversations" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Users can update their received messages" on public.messages;

create policy "Users can view their private conversations" on public.messages
  for select
  using (
    auth.uid()::text = sender_id
    or auth.uid()::text = recipient_id
    or (auth.jwt()->>'email' is not null and (
      lower(sender_email) = lower(auth.jwt()->>'email')
      or lower(recipient_email) = lower(auth.jwt()->>'email')
    ))
  );

create policy "Users can send messages" on public.messages
  for insert
  with check (
    auth.uid()::text = sender_id
    or (auth.jwt()->>'email' is not null and lower(sender_email) = lower(auth.jwt()->>'email'))
    or auth.uid() is not null
  );

create policy "Users can update their received messages" on public.messages
  for update
  using (
    auth.uid()::text = recipient_id
    or (auth.jwt()->>'email' is not null and lower(recipient_email) = lower(auth.jwt()->>'email'))
  );
