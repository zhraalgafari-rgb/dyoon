-- ============================================================
-- Notification System — Core Schema
-- ============================================================

-- 1. Notification channels
create type public.notif_channel as enum ('in_app', 'push', 'email', 'sms');

-- 2. Notification categories
create type public.notif_category as enum (
  'reminder',
  'overdue',
  'payment_received',
  'payment_sent',
  'recurring',
  'backup',
  'system',
  'marketing'
);

-- 3. Notification priority
create type public.notif_priority as enum ('critical', 'high', 'normal', 'low');

-- 4. Notification status
create type public.notif_status as enum ('pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'cancelled');

-- ============================================================
-- Tables
-- ============================================================

-- 5. notification_templates
create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notif_category not null,
  channel public.notif_channel not null,
  name text not null,
  subject text,
  body text not null,
  body_ar text,
  variables jsonb default '[]'::jsonb,
  is_active boolean default true,
  variant_of uuid references public.notification_templates(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_notification_templates_user_category on public.notification_templates(user_id, category, channel);

-- 6. notification_preferences
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notif_category not null,
  channel public.notif_channel not null,
  enabled boolean default true,
  quiet_hours_start time,
  quiet_hours_end time,
  max_per_day integer,
  max_per_week integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, category, channel)
);

-- 7. notification_jobs (outbox / queue)
create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notif_category not null,
  priority public.notif_priority default 'normal',
  status public.notif_status default 'pending',
  channel public.notif_channel,
  template_id uuid references public.notification_templates(id),
  payload jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  idempotency_key text unique,
  retry_count integer default 0,
  max_retries integer default 3,
  parent_job_id uuid references public.notification_jobs(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_notification_jobs_user_status on public.notification_jobs(user_id, status, scheduled_at);
create index idx_notification_jobs_idempotency on public.notification_jobs(idempotency_key);
create index idx_notification_jobs_scheduled on public.notification_jobs(scheduled_at) where status = 'pending';

-- 8. notification_inbox (in-app messages)
create table public.notification_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.notification_jobs(id) on delete cascade,
  category public.notif_category not null,
  title text not null,
  body text,
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz default now()
);

create index idx_notification_inbox_user_unread on public.notification_inbox(user_id, is_read, created_at desc);

-- 9. notification_events (analytics / delivery receipts)
create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.notification_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  channel public.notif_channel,
  provider text,
  provider_message_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index idx_notification_events_job on public.notification_events(job_id, created_at);
create index idx_notification_events_user on public.notification_events(user_id, created_at);

-- 10. notification_delivery_logs (provider-level detail)
create table public.notification_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.notification_jobs(id) on delete cascade,
  channel public.notif_channel not null,
  provider text,
  status text not null,
  request_payload jsonb,
  response_payload jsonb,
  error_code text,
  error_message text,
  latency_ms integer,
  created_at timestamptz default now()
);

create index idx_notification_delivery_logs_job on public.notification_delivery_logs(job_id, created_at);

-- ============================================================
-- RLS Policies
-- ============================================================

alter table public.notification_templates enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.notification_inbox enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_delivery_logs enable row level security;

create policy "Users manage own templates" on public.notification_templates for all using (auth.uid() = user_id);
create policy "Users manage own preferences" on public.notification_preferences for all using (auth.uid() = user_id);
create policy "Users view own jobs" on public.notification_jobs for select using (auth.uid() = user_id);
create policy "Users view own inbox" on public.notification_inbox for all using (auth.uid() = user_id);
create policy "Users view own events" on public.notification_events for select using (auth.uid() = user_id);

-- Service role can insert/update jobs for processing
create policy "Service role manages jobs" on public.notification_jobs for all using (auth.role() = 'service_role');
create policy "Service role manages events" on public.notification_events for all using (auth.role() = 'service_role');
create policy "Service role manages delivery logs" on public.notification_delivery_logs for all using (auth.role() = 'service_role');

-- ============================================================
-- Functions
-- ============================================================

create or replace function public.get_notification_inbox(
  p_user_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  job_id uuid,
  category public.notif_category,
  title text,
  body text,
  data jsonb,
  is_read boolean,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz
)
language sql
security definer
as $$
  select id, job_id, category, title, body, data, is_read, read_at, archived_at, created_at
  from public.notification_inbox
  where user_id = p_user_id and archived_at is null
  order by created_at desc
  limit p_limit offset p_offset;
$$;

create or replace function public.get_notification_stats(
  p_user_id uuid,
  p_days integer default 30
)
returns table (
  total_sent bigint,
  total_delivered bigint,
  total_read bigint,
  total_failed bigint,
  by_channel jsonb,
  by_category jsonb
)
language sql
security definer
as $$
  with sent as (
    select count(*) as cnt from public.notification_jobs
    where user_id = p_user_id and status in ('sent', 'delivered', 'read')
      and created_at >= now() - (p_days || ' days')::interval
  ),
  delivered as (
    select count(*) as cnt from public.notification_jobs
    where user_id = p_user_id and status in ('delivered', 'read')
      and created_at >= now() - (p_days || ' days')::interval
  ),
  read as (
    select count(*) as cnt from public.notification_jobs
    where user_id = p_user_id and status = 'read'
      and created_at >= now() - (p_days || ' days')::interval
  ),
  failed as (
    select count(*) as cnt from public.notification_jobs
    where user_id = p_user_id and status = 'failed'
      and created_at >= now() - (p_days || ' days')::interval
  ),
  channel_stats as (
    select channel, count(*) as cnt from public.notification_jobs
    where user_id = p_user_id and created_at >= now() - (p_days || ' days')::interval
    group by channel
  ),
  category_stats as (
    select category, count(*) as cnt from public.notification_jobs
    where user_id = p_user_id and created_at >= now() - (p_days || ' days')::interval
    group by category
  )
  select
    (select cnt from sent),
    (select cnt from delivered),
    (select cnt from read),
    (select cnt from failed),
    (select jsonb_object_agg(channel::text, cnt) from channel_stats where channel is not null) as by_channel,
    (select jsonb_object_agg(category::text, cnt) from category_stats where category is not null) as by_category;
$$;

-- ============================================================
-- Triggers
-- ============================================================

create or replace function public.update_notification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_notification_templates_updated_at before update on public.notification_templates for each row execute function public.update_notification_updated_at();
create trigger trg_notification_preferences_updated_at before update on public.notification_preferences for each row execute function public.update_notification_updated_at();
create trigger trg_notification_jobs_updated_at before update on public.notification_jobs for each row execute function public.update_notification_updated_at();

-- ============================================================
-- Seed: default templates & preferences
-- ============================================================

insert into public.notification_preferences (user_id, category, channel, enabled, max_per_day, max_per_week)
select id, 'reminder', 'in_app', true, 10, 50 from auth.users where not exists (select 1 from public.notification_preferences where user_id = auth.users.id and category = 'reminder' and channel = 'in_app');

insert into public.notification_preferences (user_id, category, channel, enabled, max_per_day, max_per_week)
select id, 'overdue', 'in_app', true, 10, 50 from auth.users where not exists (select 1 from public.notification_preferences where user_id = auth.users.id and category = 'overdue' and channel = 'in_app');

insert into public.notification_preferences (user_id, category, channel, enabled, max_per_day, max_per_week)
select id, 'reminder', 'push', true, 5, 20 from auth.users where not exists (select 1 from public.notification_preferences where user_id = auth.users.id and category = 'reminder' and channel = 'push');
