-- CampusVenture Requests and Connections Migration

create table if not exists public.data_room_requests (
  id uuid default gen_random_uuid() primary key,
  startup_id uuid references public.startups(id) on delete cascade not null,
  investor_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'granted', 'rejected', 'revoked')) default 'pending' not null,
  nda_signed boolean default false not null,
  nda_signed_name text,
  discussion_terms text,
  next_steps text,
  decline_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(startup_id, investor_id)
);

alter table public.data_room_requests add column if not exists discussion_terms text;
alter table public.data_room_requests add column if not exists next_steps text;
alter table public.data_room_requests add column if not exists decline_reason text;
alter table public.data_room_requests enable row level security;

drop policy if exists "Investors can view their own data room requests" on public.data_room_requests;
drop policy if exists "Founders can view requests for their startups" on public.data_room_requests;
drop policy if exists "Investors can create data room requests" on public.data_room_requests;
drop policy if exists "Founders can update request status" on public.data_room_requests;
drop policy if exists "Universities can view requests for campus startups" on public.data_room_requests;
drop policy if exists "Allow read access to data room requests" on public.data_room_requests;
drop policy if exists "Allow insert to data room requests" on public.data_room_requests;
drop policy if exists "Allow update to data room requests" on public.data_room_requests;

create policy "Allow read access to data room requests" on public.data_room_requests
  for select
  using (
    auth.uid() = investor_id
    or exists (
      select 1 from public.startups
      where startups.id = data_room_requests.startup_id
        and (
          startups.founder_id = auth.uid()
          or (auth.jwt()->>'email' is not null and lower(startups.founder_email) = lower(auth.jwt()->>'email'))
        )
    )
    or exists (
      select 1 from public.profiles
      join public.startups on startups.id = data_room_requests.startup_id
      where profiles.id = auth.uid()
        and profiles.role = 'university'
        and lower(profiles.org) = lower(startups.university)
    )
    or auth.role() = 'authenticated'
  );

create policy "Allow insert to data room requests" on public.data_room_requests
  for insert
  with check (
    auth.uid() = investor_id
    or auth.role() = 'authenticated'
  );

create policy "Allow update to data room requests" on public.data_room_requests
  for update
  using (
    auth.uid() = investor_id
    or exists (
      select 1 from public.startups
      where startups.id = data_room_requests.startup_id
        and (
          startups.founder_id = auth.uid()
          or (auth.jwt()->>'email' is not null and lower(startups.founder_email) = lower(auth.jwt()->>'email'))
        )
    )
    or auth.role() = 'authenticated'
  );

create table if not exists public.connection_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  startup_id uuid references public.startups(id) on delete set null,
  message text,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  discussion_terms text,
  next_steps text,
  decline_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(sender_id, receiver_id, startup_id)
);

alter table public.connection_requests add column if not exists discussion_terms text;
alter table public.connection_requests add column if not exists next_steps text;
alter table public.connection_requests add column if not exists decline_reason text;
alter table public.connection_requests enable row level security;

drop policy if exists "Users can view connections they are part of" on public.connection_requests;
drop policy if exists "Users can create connection requests" on public.connection_requests;
drop policy if exists "Receivers can update connection status" on public.connection_requests;
drop policy if exists "Allow read access to connection requests" on public.connection_requests;
drop policy if exists "Allow insert to connection requests" on public.connection_requests;
drop policy if exists "Allow update to connection requests" on public.connection_requests;

create policy "Allow read access to connection requests" on public.connection_requests
  for select
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from public.profiles
      join public.startups on startups.id = connection_requests.startup_id
      where profiles.id = auth.uid()
        and profiles.role = 'university'
        and lower(profiles.org) = lower(startups.university)
    )
    or auth.role() = 'authenticated'
  );

create policy "Allow insert to connection requests" on public.connection_requests
  for insert
  with check (
    auth.uid() = sender_id
    or auth.role() = 'authenticated'
  );

create policy "Allow update to connection requests" on public.connection_requests
  for update
  using (
    auth.uid() = receiver_id
    or auth.uid() = sender_id
    or auth.role() = 'authenticated'
  );

create index if not exists idx_dr_requests_startup on public.data_room_requests(startup_id);
create index if not exists idx_dr_requests_investor on public.data_room_requests(investor_id);
create index if not exists idx_dr_requests_status on public.data_room_requests(status);
create index if not exists idx_conn_sender on public.connection_requests(sender_id);
create index if not exists idx_conn_receiver on public.connection_requests(receiver_id);
create index if not exists idx_conn_status on public.connection_requests(status);

-- Centralized Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  recipient_email text,
  role text not null,
  title text not null,
  body text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_role on public.notifications(role);
create index if not exists idx_notifications_email on public.notifications(lower(recipient_email));

alter table public.notifications enable row level security;

drop policy if exists "Allow read access to notifications" on public.notifications;
drop policy if exists "Allow insert to notifications" on public.notifications;
drop policy if exists "Allow update to notifications" on public.notifications;

create policy "Allow read access to notifications" on public.notifications
  for select
  using (
    auth.uid() = user_id
    or (auth.jwt()->>'email' is not null and lower(recipient_email) = lower(auth.jwt()->>'email'))
    or auth.role() = 'authenticated'
  );

create policy "Allow insert to notifications" on public.notifications
  for insert
  with check (
    auth.role() = 'authenticated' or true
  );

create policy "Allow update to notifications" on public.notifications
  for update
  using (
    auth.uid() = user_id
    or (auth.jwt()->>'email' is not null and lower(recipient_email) = lower(auth.jwt()->>'email'))
    or auth.role() = 'authenticated'
  );
