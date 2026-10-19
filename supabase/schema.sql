-- ====================================================================
-- CampusVenture Database Schema & RLS Policies for Supabase
-- ====================================================================

-- 1. Profiles Table (Linked with Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  role text check (role in ('student', 'investor', 'university', 'admin', 'mentor', 'founder')) default 'student',
  org text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are readable by everyone" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 2. Startups / Ventures Table
create table if not exists public.startups (
  id uuid default gen_random_uuid() primary key,
  founder_id uuid references public.profiles(id) on delete set null,
  name text not null,
  tagline text not null,
  sector text not null,
  stage text not null,
  location text not null,
  university text not null,
  team_size integer default 1,
  funding_required numeric(12, 2) default 0.00,
  revenue boolean default false,
  monthly_users integer default 0,
  readiness integer default 50,
  verified boolean default false,
  traction text,
  business_model text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Startups
alter table public.startups enable row level security;

-- Startups Policies
create policy "Startups are viewable by everyone" on public.startups
  for select using (true);

create policy "Authenticated users can create startups" on public.startups
  for insert with check (auth.role() = 'authenticated');

create policy "Founders can update their own startups" on public.startups
  for update using (auth.uid() = founder_id);

-- 3. Venture Applications Table
create table if not exists public.venture_applications (
  id uuid default gen_random_uuid() primary key,
  venture_id uuid references public.startups(id) on delete cascade not null,
  applicant_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('investment', 'mentorship', 'team_member', 'partnership')) not null,
  message text not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Applications
alter table public.venture_applications enable row level security;

create policy "Applicants can view their own applications" on public.venture_applications
  for select using (auth.uid() = applicant_id);

create policy "Founders can view applications for their startups" on public.venture_applications
  for select using (
    exists (
      select 1 from public.startups
      where startups.id = venture_applications.venture_id
      and startups.founder_id = auth.uid()
    )
  );

create policy "Authenticated users can submit applications" on public.venture_applications
  for insert with check (auth.uid() = applicant_id);

-- 4. Messages Table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Messages
alter table public.messages enable row level security;

create policy "Users can view messages sent to or by them" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can insert messages as sender" on public.messages
  for insert with check (auth.uid() = sender_id);

-- 5. Automatic Profile Creation Trigger on Supabase Auth Sign Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, org)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'org'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
