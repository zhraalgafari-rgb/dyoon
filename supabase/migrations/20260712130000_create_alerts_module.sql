-- ============================================================
-- Integrated Alerts Module — Backend Engine
-- All business rules (note -> alert linkage, due/overdue
-- materialization) live here so the frontend stays presentational.
-- ============================================================

-- 1. Enums
create type public.alert_source as enum ('note', 'reminder', 'followup', 'transaction', 'overdue');
create type public.alert_status as enum ('pending', 'triggered', 'done', 'dismissed', 'snoozed');
create type public.followup_channel as enum ('whatsapp', 'call', 'email', 'note', 'other');

-- 2. transaction_notes (contextual notes attached to a transaction)
create table public.transaction_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  person_id      uuid references public.people(id) on delete set null,
  author         text not null default 'owner',
  body           text not null,
  has_reminder   boolean not null default false,
  parsed_due_at  timestamptz,
  matched_text   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_txn_notes_tx on public.transaction_notes(transaction_id);
create index idx_txn_notes_person on public.transaction_notes(person_id);

-- 3. smart_alerts (unified alert source of truth for both dashboards)
create table public.smart_alerts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  source_type        public.alert_source not null,
  source_id          text not null,
  person_id          uuid references public.people(id) on delete set null,
  transaction_id     uuid references public.transactions(id) on delete set null,
  title              text not null,
  body               text,
  due_at             timestamptz,
  status             public.alert_status not null default 'pending',
  priority           public.notif_priority not null default 'normal',
  channel            public.notif_channel not null default 'in_app',
  notification_job_id uuid references public.notification_jobs(id) on delete set null,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (source_type, source_id)
);
create index idx_smart_alerts_user_due on public.smart_alerts(user_id, due_at, status);
create index idx_smart_alerts_person on public.smart_alerts(person_id, status);

-- 4. followup_logs (persisted follow-up history / attempts)
create table public.followup_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  person_id      uuid references public.people(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  channel        public.followup_channel not null default 'note',
  message        text,
  outcome        text,
  created_at     timestamptz not null default now()
);
create index idx_followup_logs_person on public.followup_logs(person_id, created_at desc);

-- 5. Link existing tables to the alert model
alter table public.notification_jobs add column alert_id uuid references public.smart_alerts(id) on delete set null;
alter table public.notification_inbox add column alert_id uuid references public.smart_alerts(id) on delete set null;
alter table public.reminders add column alert_id uuid references public.smart_alerts(id) on delete set null;
alter table public.profiles add column timezone text not null default 'Asia/Riyadh';

-- 6. RLS (same user-scoped pattern as the rest of the app)
alter table public.transaction_notes enable row level security;
alter table public.smart_alerts enable row level security;
alter table public.followup_logs enable row level security;

create policy "own txn notes" on public.transaction_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own alerts" on public.smart_alerts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own followup logs" on public.followup_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. updated_at triggers (reuse existing function)
create trigger trg_txn_notes_updated before update on public.transaction_notes
  for each row execute function public.update_notification_updated_at();
create trigger trg_smart_alerts_updated before update on public.smart_alerts
  for each row execute function public.update_notification_updated_at();

-- 8. Core rule: a note containing a parsed date auto-creates a synchronized alert.
create or replace function public.create_alert_from_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  pname text;
begin
  if new.parsed_due_at is null then
    return new;
  end if;
  select person_id into pid from public.transactions where id = new.transaction_id;
  select name into pname from public.people where id = pid;
  insert into public.smart_alerts
    (user_id, source_type, source_id, person_id, transaction_id, title, body, due_at, priority, channel)
  values
    (new.user_id, 'note', new.id, pid, new.transaction_id,
     'متابعة: ' || coalesce(pname, 'عميل'),
     new.body, new.parsed_due_at, 'normal', 'in_app')
  on conflict (source_type, source_id) do nothing;
  return new;
end;
$$;

create trigger trg_note_to_alert
  after insert on public.transaction_notes
  for each row execute function public.create_alert_from_note();

-- 9. Materialize DUE alerts into the notification pipeline (server-side, tz-correct).
create or replace function public.fire_due_alerts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  jid uuid;
  n int := 0;
begin
  for a in
    select * from public.smart_alerts
    where status = 'pending' and due_at is not null and due_at <= now()
  loop
    insert into public.notification_jobs
      (user_id, category, priority, channel, payload, scheduled_at, status, alert_id)
    values
      (a.user_id, 'reminder', a.priority, a.channel,
       jsonb_build_object('alert_id', a.id, 'source_type', a.source_type,
                          'source_id', a.source_id, 'title', a.title, 'body', a.body, 'due_at', a.due_at),
       now(), 'pending', a.id)
    returning id into jid;

    insert into public.notification_inbox
      (user_id, job_id, category, title, body, data, alert_id)
    values
      (a.user_id, jid, 'reminder', a.title, a.body,
       jsonb_build_object('alert_id', a.id, 'source_type', a.source_type, 'due_at', a.due_at), jid);

    update public.notification_jobs
      set status = 'delivered', delivered_at = now()
      where id = jid;

    insert into public.notification_events (job_id, user_id, event_type, channel)
    values (jid, a.user_id, 'delivered', a.channel);

    update public.smart_alerts
      set status = 'triggered', notification_job_id = jid, updated_at = now()
      where id = a.id;

    n := n + 1;
  end loop;
  return n;
end;
$$;

-- 10. Materialize OVERDUE debts into alerts (idempotent per transaction).
create or replace function public.sync_overdue_alerts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  pname text;
  n int := 0;
begin
  for t in
    select tx.id, tx.user_id, tx.person_id, tx.details, tx.due_date
    from public.transactions tx
    where tx.is_paid = false
      and tx.due_date is not null
      and tx.due_date < now()
  loop
    if exists (
      select 1 from public.smart_alerts sa
      where sa.source_type = 'overdue' and sa.source_id = t.id
    ) then
      continue;
    end if;
    select name into pname from public.people where id = t.person_id;
    insert into public.smart_alerts
      (user_id, source_type, source_id, person_id, transaction_id, title, body, due_at, priority, status)
    values
      (t.user_id, 'overdue', t.id, t.person_id, t.id,
       'دين متأخر: ' || coalesce(pname, 'عميل'),
       t.details, t.due_date, 'high', 'pending');
    n := n + 1;
  end loop;
  return n;
end;
$$;
