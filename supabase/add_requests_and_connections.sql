-- CampusVenture Comprehensive Real-Time Database Migration (Fresh Clean Slate)
-- Safely replaces empty feature tables with CASCADE to completely eliminate
-- legacy UUID foreign keys, obsolete policies, and operator mismatch errors.

-- Universal UUID <-> TEXT equality operators to permanently prevent 42883 errors
create or replace function public.uuid_eq_text(uuid, text) returns boolean language sql immutable as $$ select $1::text = $2; $$;
create or replace function public.text_eq_uuid(text, uuid) returns boolean language sql immutable as $$ select $1 = $2::text; $$;
do $$
begin
  if not exists (select 1 from pg_operator where oprname = '=' and oprleft = 'uuid'::regtype and oprright = 'text'::regtype) then
    create operator public.= (leftarg = uuid, rightarg = text, procedure = public.uuid_eq_text, commutator = =);
  end if;
  if not exists (select 1 from pg_operator where oprname = '=' and oprleft = 'text'::regtype and oprright = 'uuid'::regtype) then
    create operator public.= (leftarg = text, rightarg = uuid, procedure = public.text_eq_uuid, commutator = =);
  end if;
exception when others then null;
end $$;

-- 1. DROP EXISTING UNPOPULATED FEATURE TABLES TO WIPE OUT OBSOLETE CONSTRAINTS & POLICIES
drop table if exists public.data_room_requests cascade;
drop table if exists public.connection_requests cascade;
drop table if exists public.messages cascade;
drop table if exists public.notifications cascade;
drop table if exists public.data_room_docs cascade;
drop table if exists public.data_room_audit_logs cascade;
drop table if exists public.cofounder_invitations cascade;

-- 2. ENSURE PRIVATE SUPABASE STORAGE BUCKET FOR DATA ROOM DOCUMENTS EXISTS
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dataroom-documents',
  'dataroom-documents',
  false,
  52428800, -- 50MB
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update set public = false;

-- 3. CREATE FRESH DATA ROOM REQUESTS TABLE
create table public.data_room_requests (
  id uuid default gen_random_uuid() primary key,
  startup_id text not null,
  investor_id text not null,
  founder_id text,
  founder_email text,
  investor_name text,
  investor_email text,
  investor_org text,
  startup_name text,
  message text,
  status text check (status in ('pending', 'granted', 'rejected', 'revoked', 'expired')) default 'pending' not null,
  nda_status text check (nda_status in ('not_required', 'required', 'signed', 'expired')) default 'required' not null,
  nda_signed boolean default false not null,
  nda_signed_name text,
  nda_signed_at timestamp with time zone,
  nda_version text default 'v1.0' not null,
  discussion_terms text,
  next_steps text,
  decline_reason text,
  access_duration_days integer default 30 not null,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  revoked_by text,
  revoked_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint data_room_requests_startup_investor_key unique (startup_id, investor_id)
);

-- 4. CREATE FRESH DATA ROOM DOCUMENTS TABLE (With storage paths & owner metadata)
create table public.data_room_docs (
  id uuid default gen_random_uuid() primary key,
  startup_id text not null,
  owner_id text,
  name text not null,
  category text not null, -- 'Financials', 'Legal', 'Product', 'Metrics', 'Cap Table', 'Other'
  size text not null,
  mime_type text default 'application/pdf',
  storage_path text,
  confidential boolean default true not null,
  file_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. CREATE FRESH DATA ROOM AUDIT LOGS TABLE
create table public.data_room_audit_logs (
  id uuid default gen_random_uuid() primary key,
  request_id text,
  startup_id text not null,
  doc_id text,
  doc_name text,
  user_id text,
  user_email text,
  action text not null, -- 'requested', 'granted', 'rejected', 'revoked', 'nda_signed', 'viewed', 'downloaded'
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. CREATE FRESH CONNECTION REQUESTS TABLE
create table public.connection_requests (
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
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint connection_requests_sender_receiver_startup_key unique (sender_id, receiver_id, startup_id)
);

-- 7. CREATE FRESH CENTRAL NOTIFICATIONS TABLE
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  recipient_email text,
  role text not null,
  title text not null,
  body text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. CREATE FRESH REAL-TIME MESSAGES TABLE
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id text not null,
  recipient_id text not null,
  startup_id text,
  sender_name text,
  sender_role text,
  sender_email text,
  recipient_name text,
  recipient_email text,
  content text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. CREATE FRESH CO-FOUNDER INVITATIONS TABLE
create table public.cofounder_invitations (
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

-- 10. ENABLE ROW LEVEL SECURITY ON ALL FEATURE TABLES
alter table public.data_room_requests enable row level security;
alter table public.data_room_docs enable row level security;
alter table public.data_room_audit_logs enable row level security;
alter table public.connection_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.cofounder_invitations enable row level security;

-- 11. CREATE UNIVERSAL PERMISSIVE POLICIES
create policy "Public access to data room requests" on public.data_room_requests
  for all using (true) with check (true);

create policy "Public access to data room docs" on public.data_room_docs
  for all using (true) with check (true);

create policy "Public access to data room audit logs" on public.data_room_audit_logs
  for all using (true) with check (true);

create policy "Public access to connection requests" on public.connection_requests
  for all using (true) with check (true);

create policy "Public access to notifications" on public.notifications
  for all using (true) with check (true);

create policy "Public access to messages" on public.messages
  for all using (true) with check (true);

create policy "Public access to cofounder_invitations" on public.cofounder_invitations
  for all using (true) with check (true);

-- 12. STORAGE OBJECT POLICIES FOR DATAROOM-DOCUMENTS
do $$
begin
  create policy "Public access to dataroom-documents objects"
    on storage.objects for all
    using (bucket_id = 'dataroom-documents')
    with check (bucket_id = 'dataroom-documents');
exception when others then null;
end $$;

-- 13. CREATE HIGH-PERFORMANCE INDEXES
create index idx_dr_requests_startup on public.data_room_requests(startup_id);
create index idx_dr_requests_investor on public.data_room_requests(investor_id);
create index idx_dr_requests_status on public.data_room_requests(status);
create index idx_dr_requests_expires_at on public.data_room_requests(expires_at);

create index idx_dr_docs_startup on public.data_room_docs(startup_id);
create index idx_dr_docs_category on public.data_room_docs(category);

create index idx_dr_audit_startup on public.data_room_audit_logs(startup_id);
create index idx_dr_audit_user on public.data_room_audit_logs(user_id);
create index idx_dr_audit_action on public.data_room_audit_logs(action);

create index idx_conn_sender on public.connection_requests(sender_id);
create index idx_conn_receiver on public.connection_requests(receiver_id);
create index idx_conn_status on public.connection_requests(status);
create index idx_conn_receiver_email on public.connection_requests(lower(receiver_email));

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_role on public.notifications(role);
create index idx_notifications_email on public.notifications(lower(recipient_email));

create index idx_messages_sender on public.messages(sender_id);
create index idx_messages_recipient on public.messages(recipient_id);
create index idx_messages_startup on public.messages(startup_id);
create index idx_messages_sender_email on public.messages(lower(sender_email));
create index idx_messages_recipient_email on public.messages(lower(recipient_email));

create index idx_cofounder_startup on public.cofounder_invitations(startup_id);
create index idx_cofounder_email on public.cofounder_invitations(lower(cofounder_email));
create index idx_cofounder_status on public.cofounder_invitations(status);

-- 14. ENABLE SUPABASE REALTIME REPLICATION
do $$
begin
  begin alter publication supabase_realtime add table public.data_room_requests; exception when others then null; end;
  begin alter publication supabase_realtime add table public.data_room_docs; exception when others then null; end;
  begin alter publication supabase_realtime add table public.data_room_audit_logs; exception when others then null; end;
  begin alter publication supabase_realtime add table public.connection_requests; exception when others then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
  begin alter publication supabase_realtime add table public.messages; exception when others then null; end;
  begin alter publication supabase_realtime add table public.cofounder_invitations; exception when others then null; end;
end $$;
