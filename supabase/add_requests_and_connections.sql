-- CampusVenture Comprehensive Real-Time Database Migration
-- Includes: Data Room Requests, Connection Requests, Central Notifications,
-- Real-time Messages, and Co-Founder Invitations.

-- STEP 1: CREATE ALL TABLES FIRST IF THEY DO NOT EXIST
-- This guarantees every relation exists before any policy, constraint, or alter operations run,
-- completely preventing PostgreSQL 42P01 ("relation does not exist") errors.

-- 1. DATA ROOM REQUESTS TABLE
create table if not exists public.data_room_requests (
  id uuid default gen_random_uuid() primary key,
  startup_id text not null,
  investor_id text not null,
  founder_email text,
  investor_name text,
  investor_email text,
  investor_org text,
  startup_name text,
  status text check (status in ('pending', 'granted', 'rejected', 'revoked')) default 'pending' not null,
  nda_signed boolean default false not null,
  nda_signed_name text,
  discussion_terms text,
  next_steps text,
  decline_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CONNECTION REQUESTS TABLE
create table if not exists public.connection_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id text not null,
  receiver_id text not null,
  sender_name text,
  sender_email text,
  sender_role text,
  sender_org text,
  receiver_name text,
  receiver_email text,
  startup_id text,
  startup_name text,
  message text,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  discussion_terms text,
  next_steps text,
  decline_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. CENTRAL NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  recipient_email text,
  role text not null,
  title text not null,
  body text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. REAL-TIME MESSAGES TABLE
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id text not null,
  recipient_id text not null,
  startup_id text,
  sender_name text,
  sender_role text,
  content text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. CO-FOUNDER INVITATIONS TABLE
create table if not exists public.cofounder_invitations (
  id uuid default gen_random_uuid() primary key,
  startup_id text not null,
  startup_name text not null,
  founder_id text,
  founder_name text not null,
  founder_email text not null,
  cofounder_name text not null,
  cofounder_email text not null,
  cofounder_user_id text,
  role text default 'Co-Founder' not null,
  equity text,
  notes text,
  status text check (status in ('pending', 'accepted', 'rejected', 'revoked')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- STEP 2: DYNAMICALLY DROP ALL EXISTING POLICIES
-- This prevents PostgreSQL Error 0A000 ("cannot alter type of a column used in a policy definition")
-- Because tables now exist, this runs cleanly and drops policies only where they exist.
do $$
declare
  pol record;
begin
  for pol in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'data_room_requests',
        'connection_requests',
        'notifications',
        'messages',
        'cofounder_invitations'
      )
  ) loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
exception when others then null;
end $$;


-- STEP 3: DYNAMICALLY DROP FOREIGN KEY CONSTRAINTS THAT LOCK COLUMN TYPES
do $$
declare
  c record;
begin
  for c in (
    select conname, conrelid::regclass as relname
    from pg_constraint
    where conrelid in (
      select oid from pg_class
      where relname in ('data_room_requests', 'connection_requests', 'messages', 'cofounder_invitations', 'notifications')
        and relnamespace = 'public'::regnamespace
    )
    and contype = 'f'
  ) loop
    execute format('alter table %s drop constraint if exists %I cascade', c.relname, c.conname);
  end loop;
exception when others then null;
end $$;


-- STEP 4: SAFELY ALTER COLUMN TYPES TO TEXT
-- Now that all policies and foreign keys have been cleared, type alterations succeed without errors.
alter table public.data_room_requests alter column startup_id type text using startup_id::text;
alter table public.data_room_requests alter column investor_id type text using investor_id::text;

alter table public.connection_requests alter column sender_id type text using sender_id::text;
alter table public.connection_requests alter column receiver_id type text using receiver_id::text;
alter table public.connection_requests alter column startup_id type text using startup_id::text;

alter table public.notifications alter column user_id type text using user_id::text;

alter table public.messages alter column sender_id type text using sender_id::text;
alter table public.messages alter column recipient_id type text using recipient_id::text;
alter table public.messages alter column startup_id type text using startup_id::text;


-- STEP 5: ADD MISSING COLUMNS SAFELY
alter table public.data_room_requests add column if not exists founder_email text;
alter table public.data_room_requests add column if not exists investor_name text;
alter table public.data_room_requests add column if not exists investor_email text;
alter table public.data_room_requests add column if not exists investor_org text;
alter table public.data_room_requests add column if not exists startup_name text;
alter table public.data_room_requests add column if not exists discussion_terms text;
alter table public.data_room_requests add column if not exists next_steps text;
alter table public.data_room_requests add column if not exists decline_reason text;

alter table public.connection_requests add column if not exists sender_name text;
alter table public.connection_requests add column if not exists sender_email text;
alter table public.connection_requests add column if not exists sender_role text;
alter table public.connection_requests add column if not exists sender_org text;
alter table public.connection_requests add column if not exists receiver_name text;
alter table public.connection_requests add column if not exists receiver_email text;
alter table public.connection_requests add column if not exists startup_name text;
alter table public.connection_requests add column if not exists discussion_terms text;
alter table public.connection_requests add column if not exists next_steps text;
alter table public.connection_requests add column if not exists decline_reason text;

alter table public.notifications add column if not exists recipient_email text;

alter table public.messages add column if not exists startup_id text;
alter table public.messages add column if not exists sender_name text;
alter table public.messages add column if not exists sender_role text;


-- STEP 6: ENSURE UNIQUE CONSTRAINTS FOR SAFE UPSERTS
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'data_room_requests_startup_investor_key'
      and conrelid = 'public.data_room_requests'::regclass
  ) then
    alter table public.data_room_requests add constraint data_room_requests_startup_investor_key unique (startup_id, investor_id);
  end if;
exception when others then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'connection_requests_sender_receiver_startup_key'
      and conrelid = 'public.connection_requests'::regclass
  ) then
    alter table public.connection_requests add constraint connection_requests_sender_receiver_startup_key unique (sender_id, receiver_id, startup_id);
  end if;
exception when others then null;
end $$;


-- STEP 7: ENABLE ROW LEVEL SECURITY & ADD UNIVERSAL PERMISSIVE POLICIES
alter table public.data_room_requests enable row level security;
alter table public.connection_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.cofounder_invitations enable row level security;

create policy "Public access to data room requests" on public.data_room_requests
  for all using (true) with check (true);

create policy "Public access to connection requests" on public.connection_requests
  for all using (true) with check (true);

create policy "Public access to notifications" on public.notifications
  for all using (true) with check (true);

create policy "Public access to messages" on public.messages
  for all using (true) with check (true);

create policy "Public access to cofounder_invitations" on public.cofounder_invitations
  for all using (true) with check (true);


-- STEP 8: CREATE PERFORMANCE INDEXES
create index if not exists idx_dr_requests_startup on public.data_room_requests(startup_id);
create index if not exists idx_dr_requests_investor on public.data_room_requests(investor_id);
create index if not exists idx_dr_requests_status on public.data_room_requests(status);

create index if not exists idx_conn_sender on public.connection_requests(sender_id);
create index if not exists idx_conn_receiver on public.connection_requests(receiver_id);
create index if not exists idx_conn_status on public.connection_requests(status);
create index if not exists idx_conn_receiver_email on public.connection_requests(lower(receiver_email));

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_role on public.notifications(role);
create index if not exists idx_notifications_email on public.notifications(lower(recipient_email));

create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_recipient on public.messages(recipient_id);
create index if not exists idx_messages_startup on public.messages(startup_id);

create index if not exists idx_cofounder_startup on public.cofounder_invitations(startup_id);
create index if not exists idx_cofounder_email on public.cofounder_invitations(lower(cofounder_email));
create index if not exists idx_cofounder_status on public.cofounder_invitations(status);


-- STEP 9: ENABLE SUPABASE REALTIME REPLICATION
do $$
begin
  begin
    alter publication supabase_realtime add table public.data_room_requests;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.connection_requests;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.messages;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.cofounder_invitations;
  exception when others then null;
  end;
end $$;
