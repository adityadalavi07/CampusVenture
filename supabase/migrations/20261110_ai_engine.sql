-- ============================================================================
-- CampusVenture — Central AI Startup Readiness Engine
-- Migration: 20261110_ai_engine.sql
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lirfkzpehmxtynjsjzib/sql/new
-- ============================================================================

-- ============================================================================
-- 1. ANALYSIS JOBS TABLE
-- Tracks the lifecycle of every AI analysis request.
-- Statuses: pending → processing → validating → completed | failed | cancelled
-- ============================================================================
create table if not exists public.startup_analysis_jobs (
  id            uuid default gen_random_uuid() primary key,
  startup_id    uuid references public.startups(id) on delete cascade not null,
  owner_id      uuid references public.profiles(id) on delete cascade not null,
  status        text check (status in (
                  'pending','processing','validating','completed','failed','cancelled'
                )) not null default 'pending',
  analysis_version integer not null default 1,
  ai_provider   text not null default 'gemini',
  model_id      text not null default 'gemini-2.0-flash',
  prompt_version text not null default 'v2.0',
  error_message text,
  retry_count   integer not null default 0,
  idempotency_key text unique,              -- prevents duplicate billing on retry
  created_at    timestamptz default now() not null,
  started_at    timestamptz,
  completed_at  timestamptz
);

-- ============================================================================
-- 2. ANALYSIS REPORTS TABLE
-- Persists the full structured AI report for each completed analysis job.
-- One report per job. Historical reports are preserved (never overwritten).
-- ============================================================================
create table if not exists public.startup_analysis_reports (
  id                     uuid default gen_random_uuid() primary key,
  job_id                 uuid references public.startup_analysis_jobs(id) on delete cascade not null,
  startup_id             uuid references public.startups(id) on delete cascade not null,
  owner_id               uuid references public.profiles(id) on delete cascade not null,
  analysis_version       integer not null default 1,
  ai_provider            text not null default 'gemini',
  model_id               text not null default 'gemini-2.0-flash',

  -- Three distinct scores (not interchangeable)
  readiness_score        integer not null check (readiness_score between 0 and 100),
  evidence_confidence    integer not null check (evidence_confidence between 0 and 100),
  risk_exposure          integer not null check (risk_exposure between 0 and 100),

  investor_grade         text check (investor_grade in ('A+','A','B','C','D','F')),
  verdict                text,

  -- Full structured report as JSONB for flexible querying
  report_json            jsonb not null,

  -- Startup data snapshot used for this analysis (for audit trail)
  startup_snapshot       jsonb,

  -- Token usage tracking
  prompt_tokens          integer,
  completion_tokens      integer,
  total_tokens           integer,

  created_at             timestamptz default now() not null
);

-- ============================================================================
-- 3. ANALYSIS DIMENSIONS TABLE
-- Per-dimension scores for every report (queryable, chartable).
-- ============================================================================
create table if not exists public.startup_analysis_dimensions (
  id               uuid default gen_random_uuid() primary key,
  report_id        uuid references public.startup_analysis_reports(id) on delete cascade not null,
  startup_id       uuid references public.startups(id) on delete cascade not null,
  owner_id         uuid references public.profiles(id) on delete cascade not null,
  dimension_key    text not null,
  dimension_label  text not null,
  score            integer not null check (score between 0 and 100),
  weight           integer not null,
  weighted_score   numeric(6,2) not null,
  critique         text,
  evidence         text,
  weaknesses       text[],
  recommendations  text[],
  confidence_level text check (confidence_level in ('high','medium','low','insufficient')),
  missing_info     text[],
  created_at       timestamptz default now() not null
);

-- ============================================================================
-- 4. AI PROVIDER USAGE TABLE
-- Tracks token consumption and API costs per request.
-- ============================================================================
create table if not exists public.ai_provider_usage (
  id               uuid default gen_random_uuid() primary key,
  job_id           uuid references public.startup_analysis_jobs(id) on delete set null,
  owner_id         uuid references public.profiles(id) on delete set null,
  provider         text not null default 'gemini',
  model_id         text not null,
  prompt_tokens    integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens     integer not null default 0,
  estimated_cost_usd numeric(10,6) default 0,
  request_ok       boolean not null default true,
  error_code       text,
  latency_ms       integer,
  created_at       timestamptz default now() not null
);

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================
create index if not exists idx_analysis_jobs_startup   on public.startup_analysis_jobs(startup_id);
create index if not exists idx_analysis_jobs_owner     on public.startup_analysis_jobs(owner_id);
create index if not exists idx_analysis_jobs_status    on public.startup_analysis_jobs(status);
create index if not exists idx_analysis_jobs_created   on public.startup_analysis_jobs(created_at desc);

create index if not exists idx_analysis_reports_startup  on public.startup_analysis_reports(startup_id);
create index if not exists idx_analysis_reports_owner    on public.startup_analysis_reports(owner_id);
create index if not exists idx_analysis_reports_job      on public.startup_analysis_reports(job_id);
create index if not exists idx_analysis_reports_created  on public.startup_analysis_reports(created_at desc);

create index if not exists idx_analysis_dims_report   on public.startup_analysis_dimensions(report_id);
create index if not exists idx_analysis_dims_startup  on public.startup_analysis_dimensions(startup_id);

create index if not exists idx_ai_usage_owner   on public.ai_provider_usage(owner_id);
create index if not exists idx_ai_usage_created on public.ai_provider_usage(created_at desc);

-- ============================================================================
-- 6. ROW-LEVEL SECURITY
-- ============================================================================
alter table public.startup_analysis_jobs       enable row level security;
alter table public.startup_analysis_reports    enable row level security;
alter table public.startup_analysis_dimensions enable row level security;
alter table public.ai_provider_usage           enable row level security;

-- Drop old policies if re-running
drop policy if exists "Owners can view their own jobs"         on public.startup_analysis_jobs;
drop policy if exists "Owners can insert their own jobs"       on public.startup_analysis_jobs;
drop policy if exists "Service can update jobs"                on public.startup_analysis_jobs;
drop policy if exists "Owners can view their own reports"      on public.startup_analysis_reports;
drop policy if exists "Owners can view their own dimensions"   on public.startup_analysis_dimensions;
drop policy if exists "Owners can view their own usage"        on public.ai_provider_usage;

-- Jobs: owners see their own; service role (server) can write
create policy "Owners can view their own jobs" on public.startup_analysis_jobs
  for select using (auth.uid() = owner_id);

create policy "Owners can insert their own jobs" on public.startup_analysis_jobs
  for insert with check (auth.uid() = owner_id);

create policy "Service can update jobs" on public.startup_analysis_jobs
  for update using (true);

-- Reports: owners see their own only
create policy "Owners can view their own reports" on public.startup_analysis_reports
  for select using (auth.uid() = owner_id);

create policy "Service can insert reports" on public.startup_analysis_reports
  for insert with check (true);

-- Dimensions: owners see their own only
create policy "Owners can view their own dimensions" on public.startup_analysis_dimensions
  for select using (auth.uid() = owner_id);

create policy "Service can insert dimensions" on public.startup_analysis_dimensions
  for insert with check (true);

-- Usage: owners see their own only
create policy "Owners can view their own usage" on public.ai_provider_usage
  for select using (auth.uid() = owner_id);

create policy "Service can insert usage" on public.ai_provider_usage
  for insert with check (true);

-- ============================================================================
-- 7. FUNCTION: Get latest analysis report for a startup
-- ============================================================================
create or replace function public.get_latest_analysis(p_startup_id uuid, p_owner_id uuid)
returns table (
  report_id            uuid,
  job_id               uuid,
  readiness_score      integer,
  evidence_confidence  integer,
  risk_exposure        integer,
  investor_grade       text,
  verdict              text,
  report_json          jsonb,
  model_id             text,
  created_at           timestamptz
)
language sql
security definer
as $$
  select
    r.id,
    r.job_id,
    r.readiness_score,
    r.evidence_confidence,
    r.risk_exposure,
    r.investor_grade,
    r.verdict,
    r.report_json,
    r.model_id,
    r.created_at
  from public.startup_analysis_reports r
  where r.startup_id = p_startup_id
    and r.owner_id   = p_owner_id
  order by r.created_at desc
  limit 1;
$$;

-- ============================================================================
-- 8. FUNCTION: Get analysis history for a startup
-- ============================================================================
create or replace function public.get_analysis_history(p_startup_id uuid, p_owner_id uuid)
returns table (
  report_id            uuid,
  analysis_version     integer,
  readiness_score      integer,
  evidence_confidence  integer,
  risk_exposure        integer,
  investor_grade       text,
  verdict              text,
  model_id             text,
  created_at           timestamptz
)
language sql
security definer
as $$
  select
    r.id,
    r.analysis_version,
    r.readiness_score,
    r.evidence_confidence,
    r.risk_exposure,
    r.investor_grade,
    r.verdict,
    r.model_id,
    r.created_at
  from public.startup_analysis_reports r
  where r.startup_id = p_startup_id
    and r.owner_id   = p_owner_id
  order by r.created_at desc;
$$;
