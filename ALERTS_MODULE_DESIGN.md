# Integrated Alerts Module — Audit & Functional Architecture

**Scope:** A new integrated module delivering (1) a Notifications & Reminders Dashboard, (2) a Customer Follow-up Management System, and (3) contextual transaction notes that auto-generate synchronized alerts when they contain a date/time trigger.

---

## Part 1 — Application Audit

### 1.1 What the app is
A multi-tenant personal-finance / debt-tracking PWA ("dyoon") built on **TanStack Start** (React Router + server functions) with a **Supabase (Postgres + RLS)** backend. UI is Arabic / RTL. Core entities: `people`, `transactions`, `reminders`, `recurring_rules`, `expenses`, plus a newly-added notification subsystem.

### 1.2 Strengths worth preserving
- **Sound multi-tenant RLS model** — every table is `user_id`-scoped with `auth.uid()` policies (`supabase/migrations/20260429224310_*.sql:43-50`). Keep this pattern for the new tables.
- **Outbox/queue notification schema already exists** — `notification_jobs`, `notification_inbox`, `notification_events`, `notification_delivery_logs`, idempotency keys, and a `PolicyEngine` with quiet hours + caps (`src/lib/notifications/policy.ts`, `supabase/migrations/20260712120000_create_notification_system.sql`). This is the backbone we extend, not rebuild.
- **Reminder auto-sync from transactions** — `syncRemindersFromTransactions()` (`src/lib/reminders.ts:51`) and the cron (`src/routes/api/public/cron/process.ts:25-52`) already derive `reminders` from unpaid `transactions` that have a `due_date`.
- **Follow-up severity engine** — `buildBuckets()` (`src/lib/money/followup.ts:32`) computes `ok|soon|late|critical` buckets with AI-generated WhatsApp drafts (`src/routes/app.followup.tsx:83`).

### 1.3 Gaps blocking the requested module (the audit findings)
| # | Gap | Where | Impact on the new module |
|---|-----|-------|--------------------------|
| **G1** | No dedicated **transaction note** entity. Notes live in free-text `transactions.details` (`maxLength={500}`, `AddTransactionDialog.tsx:156`), with no author, timestamp, per-note state, or date trigger. | `transactions.details` (`migrations/20260429224310_*.sql:32`) | Cannot attach a contextual note to a transaction *and* derive a reminder from it. |
| **G2** | **No date/time extraction** from any text. Nothing parses "اتصل بالعميل في 2026-07-20 10:00". | none | The "note containing a date → alert" link does not exist yet. |
| **G3** | **Reminders ↔ Notifications are decoupled.** `triggerReminderNotification()` exists (`src/lib/notifications/triggers.ts:4`) but is **never called**; the cron only *creates reminder rows* and **never enqueues `notification_jobs`**. | `triggers.ts:4`, `cron/process.ts:48` | Due reminders never surface as alerts. |
| **G4** | **Follow-up is ephemeral.** Buckets are recomputed every load; draft messages send via WhatsApp but **nothing is persisted** (no attempt history, no schedule, no link to notifications). Local push is `sessionStorage`-gated (`app.followup.tsx:60-65`). | `app.followup.tsx`, `FollowupDraftDialog.tsx` | No "Customer Follow-up Management System" data exists to manage. |
| **G5** | **No unified alert model.** Reminders, follow-ups, and notifications share no common `source_type`/`source_id` linkage, so a note-triggered alert cannot be cross-rendered in both dashboards automatically. | schema | The "synchronized alert in both dashboards" requirement is unachievable today. |
| **G6** | **Notification scheduler is browser-only / in-memory.** `Scheduler` + `InMemoryQueueAdapter` run client-side via `setInterval` (`src/lib/notifications/index.ts:29`, `queue.ts:12`). Jobs are lost on reload and never fire when the app is closed. | `notifications/index.ts`, `queue.ts` | Scheduled reminders can't fire reliably. Need **server-side** scheduling (pg_cron + DB function). |
| **G7** | **`app.notifications.tsx` reads `userId` from URL search param** (`Route.useSearch().userId ?? ""`, `app.notifications.tsx:14`) instead of auth context → inbox is empty on normal nav and is a security smell. | `app.notifications.tsx:14`, `useNotifications.ts:14` | Notifications Dashboard is effectively broken for normal users. |
| **G8** | **No timezone handling.** Quiet hours (`policy.ts:69`) and `dueState`/`buildBuckets` use local machine time with no stored user tz. | `policy.ts:69`, `followup.ts:34` | Scheduled alerts drift across users/timezones. |
| **G9** | **Overdue detection not wired to notifications.** `triggerOverdueNotification()` (`triggers.ts:19`) is never invoked. | `triggers.ts:19` | Overdue debts never alert. |
| **G10** | **No realtime linkage** between dashboards; each screen polls independently. | — | A note saved in one place won't refresh the other. |

### 1.4 Opportunity (the unifying idea)
Introduce a single **`smart_alerts`** table as the *source of truth* for everything that needs to "fire later," and make **transaction notes** the *producer* of alerts. A note containing a date creates one `smart_alert` (linked by `source_type='note'`, `source_id=note.id`). A server-side cron materializes *due* alerts into `notification_jobs` so they appear in the **Notifications & Reminders Dashboard**, while the same alert row renders in the **Customer Follow-up interface** keyed by `person_id`. One record, two synchronized surfaces.

---

## Part 2 — Functional Architecture

```
┌─────────────────────────┐   contains date/time   ┌──────────────────────┐
│ Transaction Notes UI    │ ──────────────────────►│  parseNoteDate()     │  (G2)
│ (TransactionNotesSheet) │                         │  src/lib/alerts/parse│
└────────────┬────────────┘                         └──────────┬───────────┘
             │ inserts                                      creates
             ▼                                                 ▼
   ┌──────────────────┐   DB trigger (after insert)   ┌────────────────────┐
   │ transaction_notes│ ────────────────────────────► │    smart_alerts    │  ← single source of truth (G5)
   │ (new table)      │                               │ (new, unified)     │
   └──────────────────┘                               └─────────┬──────────┘
                                                              │ due_at reached
                                                              ▼ (pg_cron → materialize)
                                                   ┌────────────────────┐
                                                   │  notification_jobs  │  → notification_inbox
                                                   │  (existing schema)  │  → Notifications & Reminders Dashboard
                                                   └─────────┬──────────┘
                                                             │ same alert row also rendered by
                                                             ▼
                                              Customer Follow-up Interface (by person_id)
```

### 2.1 Sub-system A — Notifications & Reminders Dashboard
A unified feed that merges two sources into one chronological "Alerts" surface:
- **In-app notifications** from `notification_inbox` (existing).
- **Pending/scheduled/overdue alerts** from `smart_alerts` (new), shown as "upcoming" cards with a live countdown.
Filters: Overdue · Today · Upcoming · Done. Reuses the existing `NotificationCenter`/`NotificationStats` components and `useNotifications` hook (after fixing **G7** to read `user.id` from `useAuth()`).

### 2.2 Sub-system B — Customer Follow-up Management System
Replaces the ephemeral follow-up screen with **persisted** follow-ups:
- Every follow-up attempt (AI draft, WhatsApp send, call, note) is stored against a `person` + optional `transaction` (`source_type='followup'`).
- "Schedule follow-up" creates a `transaction_notes` row (or a `smart_alert` directly) → automatically appears in the dashboard when due.
- Per-customer timeline: buckets (`ok|soon|late|critical`) **plus** historical follow-up actions and upcoming scheduled alerts.
- Uses the existing `severityMeta`/`buildBuckets` logic (`src/lib/money/followup.ts:25`) for severity coloring — keep it.

### 2.3 Sub-system C — Contextual Transaction Notes
- A `TransactionNotesSheet` attached to each transaction row (`TransactionRow.tsx`) adds/view lists notes.
- Live parsing: as the user types, `parseNoteDate()` detects a date/time and shows a chip: "🔔 تذكير مُكتشف: 2026-07-20 10:00".
- On save, a DB trigger creates the linked `smart_alert` automatically — **no manual "create reminder" step required** (this satisfies the core requirement).

---

## Part 3 — Data Model & Required Fields

### 3.1 New table: `transaction_notes`
```sql
create table public.transaction_notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  person_id     uuid references public.people(id) on delete set null, -- denormalized for fast queries
  author        text not null default 'owner',
  body          text not null,                  -- longer than transactions.details (no 500 cap)
  has_reminder  boolean not null default false, -- set true when a date was detected
  parsed_due_at timestamptz,                    -- the extracted trigger time (UTC)
  matched_text  text,                           -- the exact substring that matched (for UI chip)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_txn_notes_tx on public.transaction_notes(transaction_id);
create index idx_txn_notes_person on public.transaction_notes(person_id);
alter table public.transaction_notes enable row level security;
create policy "own txn notes" on public.transaction_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 3.2 New table: `smart_alerts` (unified alert source of truth)
```sql
create type public.alert_source as enum ('note','reminder','followup','transaction','overdue');
create type public.alert_status as enum ('pending','triggered','done','dismissed','snoozed');

create table public.smart_alerts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  source_type       public.alert_source not null,
  source_id         uuid not null,             -- note.id / reminder.id / followup.id / transaction.id
  person_id         uuid references public.people(id) on delete set null,
  title             text not null,
  body              text,
  due_at            timestamptz,               -- when it should fire (UTC)
  status            public.alert_status not null default 'pending',
  priority          public.notif_priority not null default 'normal',
  channel           public.notif_channel not null default 'in_app',
  notification_job_id uuid references public.notification_jobs(id) on delete set null, -- link to dashboard
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- idempotency: one alert per source row
  unique (source_type, source_id)
);
create index idx_smart_alerts_user_due on public.smart_alerts(user_id, due_at, status);
create index idx_smart_alerts_person on public.smart_alerts(person_id, status);
alter table public.smart_alerts enable row level security;
create policy "own alerts" on public.smart_alerts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 3.3 Schema extensions (link the existing tables)
```sql
-- Link a notification_job back to its alert (so inbox entries open the right alert)
alter table public.notification_jobs add column alert_id uuid references public.smart_alerts(id) on delete set null;
alter table public.notification_inbox add column alert_id uuid references public.smart_alerts(id) on delete set null;
-- Link reminders to alerts (migrate existing reminders into the unified model)
alter table public.reminders add column alert_id uuid references public.smart_alerts(id) on delete set null;

-- User timezone for correct firing (fixes G8)
alter table public.profiles add column timezone text not null default 'Asia/Riyadh';
```

### 3.4 Field summary
| Field | Table | Purpose |
|---|---|---|
| `body` | `transaction_notes` | The contextual note text (e.g. "اتصل بالعميل في 20 يوليو 10:00"). |
| `has_reminder` / `parsed_due_at` / `matched_text` | `transaction_notes` | Capture the detected trigger so the UI can confirm and the trigger can fire. |
| `source_type` / `source_id` | `smart_alerts` | The join key that lets **both** dashboards render the same alert. |
| `due_at` | `smart_alerts` | UTC fire time; cron compares against `now()`. |
| `status` | `smart_alerts` | pending → triggered → done/dismissed/snoozed lifecycle shared by both UIs. |
| `notification_job_id` | `smart_alerts` | Synchronizes the alert with the Notifications Dashboard (`notification_inbox`). |
| `person_id` | `smart_alerts` / `transaction_notes` | Drives the Customer Follow-up interface per customer. |
| `timezone` | `profiles` | Correct due-time evaluation per user (fixes G8). |

---

## Part 4 — Logic: Linking Transaction Notes → Automated Reminders

### 4.1 Date/time parser (`src/lib/alerts/parseNoteDate.ts`) — fixes G2
Pure, unit-testable function returning the first detected trigger. Supports Arabic + English cues:
- Absolute: `2026-07-20`, `20/07/2026`, `20 يوليو`, `يوم الاثنين`.
- Relative: `غداً` / `بعد 3 أيام` / `next Monday` / `في أسبوعين`.
- Time: `10:00`, `الساعة 9 صباحاً`, `2pm`.
```ts
export interface ParsedTrigger { dueAt: string; matchedText: string; confidence: "high" | "medium" }
export function parseNoteDate(text: string, tz = "Asia/Riyadh"): ParsedTrigger | null { /* regex + chrono-style resolve */ }
```
Return `null` when no date is found → no alert is created (safe default).

### 4.2 DB trigger — auto-create the alert on note insert (the core requirement)
```sql
create or replace function public.create_alert_from_note()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
  pname text;
begin
  if new.parsed_due_at is null then return new; end if;          -- no date → no alert
  select person_id into pid from public.transactions where id = new.transaction_id;
  select name into pname from public.people where id = pid;
  insert into public.smart_alerts (user_id, source_type, source_id, person_id, title, body, due_at, priority, channel)
  values (new.user_id, 'note', new.id, pid,
          'متابعة: ' || coalesce(pname, 'عميل'),
          new.body, new.parsed_due_at, 'normal', 'in_app')
  on conflict (source_type, source_id) do nothing;               -- idempotent (G5)
  return new;
end; $$;
create trigger trg_note_to_alert after insert on public.transaction_notes
  for each row execute function public.create_alert_from_alert_from_note();
```
> The client sets `parsed_due_at` by calling `parseNoteDate()` before insert (so the parser stays in TS and is testable), and the trigger guarantees the alert is always created — even if a note is inserted from the API/cron.

### 4.3 Server-side materialization — fixes G3/G6 (fire when due)
A DB function the existing pg_cron calls (extend `cron/process.ts:runForUser`):
```sql
create or replace function public.fire_due_alerts()
returns int language plpgsql security definer set search_path = public as $$
declare
  a record; n int := 0;
begin
  for a in
    select * from public.smart_alerts
    where status = 'pending' and due_at is not null and due_at <= now()
  loop
    insert into public.notification_jobs (user_id, category, priority, channel, payload, scheduled_at, status)
    values (a.user_id, 'reminder', a.priority, a.channel,
            jsonb_build_object('alert_id', a.id, 'source_type', a.source_type, 'source_id', a.source_id, 'title', a.title, 'body', a.body),
            now(), 'pending')
    returning id into ... ;  -- capture job id, set a.notification_job_id
    update public.smart_alerts set status = 'triggered', notification_job_id = <job>, updated_at = now() where id = a.id;
    n := n + 1;
  end loop;
  return n;
end; $$;
```
This makes reminders fire **reliably on the server** (fixes G6) and **links every fired alert** to a `notification_jobs` row → it shows in the Notifications & Reminders Dashboard automatically, while the same `smart_alerts` row (keyed by `person_id`) shows in the Follow-up interface. **One trigger → two synchronized surfaces.**

### 4.4 Synchronization guarantees
- **Idempotency:** `unique(source_type, source_id)` on `smart_alerts`; `idempotency_key` on `notification_jobs` (`migrations/20260712120000_*.sql:81`). Re-running cron never duplicates.
- **Two-way status:** completing the alert in either dashboard updates `smart_alerts.status`; a cron cleanup cancels the linked `notification_job` (`status='cancelled'`) so the other surface reflects it.
- **RLS:** both new tables use the same `auth.uid() = user_id` policy pattern as the rest of the app (G1-safe).

### 4.5 Fixes folded into the build
- **G7:** `app.notifications.tsx` and `useNotifications` read `userId` from `useAuth().user.id`, not URL search.
- **G8:** evaluate `due_at`/`quiet_hours` using `profiles.timezone` (store IANA tz; compare in UTC).
- **G9:** overdue debts also materialize as `source_type='overdue'` alerts in the same cron pass.

---

## Part 5 — User Flow (end-to-end, with the example)

1. **User opens a transaction** (e.g. a credit/debt to "أحمد") → taps the new **note** icon on `TransactionRow`.
2. **`TransactionNotesSheet` opens.** User types: *"اتصل بالعميل في 20 يوليو الساعة 10:00 صباحاً لتأكيد السداد"*.
3. **Live detection** (`parseNoteDate`) shows a chip: *🔔 تذكير: 2026-07-20 10:00*. User confirms.
4. **On save**, client inserts `transaction_notes` with `parsed_due_at = 2026-07-20T10:00:00Z` (tz-adjusted). DB trigger creates `smart_alerts` (`source_type='note'`, linked `person_id=أحمد`, `status='pending'`).
5. **Immediately synchronized:**
   - **Follow-up interface** now shows a "scheduled" alert chip under أحمد's card.
   - **Notifications & Reminders Dashboard** shows the alert under "Upcoming" with a countdown.
6. **At 2026-07-20 10:00 (server time, tz-correct)**, pg_cron runs `fire_due_alerts()` → inserts `notification_jobs` → `notification_inbox` entry delivered (in-app + optional push).
7. **User gets the alert** in the dashboard; tapping it deep-links to the transaction + note. Marking it **Done** updates `smart_alerts.status='done'`, which also clears the chip in the Follow-up interface. 8. **From Follow-up**, the user can also "Schedule follow-up" → creates another note/alert, or log a WhatsApp/call attempt (persisted `source_type='followup'`) — building a real management history (fixes G4).

---

## Part 6 — Component / File Map (proposed)

| Layer | New / Changed | Responsibility |
|---|---|---|
| Parser | `src/lib/alerts/parseNoteDate.ts` | Date/time extraction (G2). |
| Service | `src/lib/alerts/index.ts` + `server.ts` | CRUD notes/alerts, `completeAlert`, `snoozeAlert`, `materializeDue` (server fns, mirroring `notifications/server.ts`). |
| Migration | `supabase/migrations/20260712xxxx_create_alerts_module.sql` | Tables + trigger + `fire_due_alerts()` + profile tz (Part 3). |
| UI-A | `src/features/alerts/TransactionNotesSheet.tsx` | Note composer with live detection chip. |
| UI-B | `src/components/notifications/AlertsDashboard.tsx` | Unified feed (inbox + alerts). |
| UI-C | `src/features/reminders/FollowupManager.tsx` | Persisted follow-up timeline + schedule action. |
| Wire | `src/routes/app.notifications.tsx` (fix G7), `src/routes/app.reminders.tsx`, `src/routes/app.followup.tsx` | Mount new surfaces; fix `userId` source. |
| Cron | `src/routes/api/public/cron/process.ts` | Call `fire_due_alerts()` + overdue materialization (G3/G6/G9). |
| Realtime | extend `useRealtimeSync` | Subscribe to `smart_alerts` so both dashboards refresh together (G10). |

---

## Part 7 — Recommended build order
1. Migration: tables, trigger, `fire_due_alerts()`, `profiles.timezone`.
2. `parseNoteDate` + unit tests (regex/chrono coverage).
3. `AlertService` + server functions.
4. `TransactionNotesSheet` + live chip → end-to-end note→alert.
5. `AlertsDashboard` (fix G7) → note alerts appear in Notifications.
6. `FollowupManager` (persist attempts, schedule) → appears in Follow-up.
7. Wire cron `fire_due_alerts()`; verify materialization + two-surface sync.
8. Realtime subscriptions; quiet-hours/tz correctness pass.
