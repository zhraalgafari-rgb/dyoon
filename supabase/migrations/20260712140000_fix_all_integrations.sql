-- ============================================================
-- Fix All Integrations — Comprehensive Migration
-- 1. Alerts Module (smart_alerts, transaction_notes, followup_logs)
-- 2. INSERT policy for notification_jobs (authenticated users)
-- 3. Fixes exchange_rate_sync_log RLS (idempotent)
-- 4. pg_cron jobs for fire_due_alerts + sync_overdue_alerts
-- 5. Missing notification_preferences seeds
-- 6. Notification inbox alert_id column
-- ============================================================

-- ============================================================
-- SECTION 1: Enum types for the alerts module
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.alert_source AS ENUM ('note', 'reminder', 'followup', 'transaction', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_status AS ENUM ('pending', 'triggered', 'done', 'dismissed', 'snoozed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.followup_channel AS ENUM ('whatsapp', 'call', 'email', 'note', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 2: transaction_notes table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transaction_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  person_id      uuid REFERENCES public.people(id) ON DELETE SET NULL,
  author         text NOT NULL DEFAULT 'owner',
  body           text NOT NULL,
  has_reminder   boolean NOT NULL DEFAULT false,
  parsed_due_at  timestamptz,
  matched_text   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_txn_notes_tx     ON public.transaction_notes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_txn_notes_person ON public.transaction_notes(person_id);
CREATE INDEX IF NOT EXISTS idx_txn_notes_user   ON public.transaction_notes(user_id, created_at DESC);

-- ============================================================
-- SECTION 3: smart_alerts table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.smart_alerts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type         public.alert_source NOT NULL,
  source_id           text NOT NULL,
  person_id           uuid REFERENCES public.people(id) ON DELETE SET NULL,
  transaction_id      uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  title               text NOT NULL,
  body                text,
  due_at              timestamptz,
  status              public.alert_status NOT NULL DEFAULT 'pending',
  priority            public.notif_priority NOT NULL DEFAULT 'normal',
  channel             public.notif_channel NOT NULL DEFAULT 'in_app',
  notification_job_id uuid REFERENCES public.notification_jobs(id) ON DELETE SET NULL,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_smart_alerts_user_due ON public.smart_alerts(user_id, due_at, status);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_person   ON public.smart_alerts(person_id, status);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_status   ON public.smart_alerts(status, due_at) WHERE status = 'pending';

-- ============================================================
-- SECTION 4: followup_logs table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.followup_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id      uuid REFERENCES public.people(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  channel        public.followup_channel NOT NULL DEFAULT 'note',
  message        text,
  outcome        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_logs_person ON public.followup_logs(person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followup_logs_user   ON public.followup_logs(user_id, created_at DESC);

-- ============================================================
-- SECTION 5: Add alert_id columns to existing tables
-- ============================================================

ALTER TABLE public.notification_jobs
  ADD COLUMN IF NOT EXISTS alert_id uuid REFERENCES public.smart_alerts(id) ON DELETE SET NULL;

ALTER TABLE public.notification_inbox
  ADD COLUMN IF NOT EXISTS alert_id uuid REFERENCES public.smart_alerts(id) ON DELETE SET NULL;

ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS alert_id uuid REFERENCES public.smart_alerts(id) ON DELETE SET NULL;

-- Add timezone to profiles (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Riyadh';

-- ============================================================
-- SECTION 6: RLS policies for new tables
-- ============================================================

ALTER TABLE public.transaction_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_logs     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "own txn notes"    ON public.transaction_notes;
  DROP POLICY IF EXISTS "own alerts"       ON public.smart_alerts;
  DROP POLICY IF EXISTS "own followup logs" ON public.followup_logs;
END $$;

CREATE POLICY "own txn notes" ON public.transaction_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own alerts" ON public.smart_alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own followup logs" ON public.followup_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SECTION 7: Fix notification_jobs — add INSERT for authenticated users
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_jobs'
      AND policyname = 'Users insert own jobs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users insert own jobs" ON public.notification_jobs
        FOR INSERT WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;

-- Also allow authenticated to UPDATE their own jobs (for markRead etc.)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_jobs'
      AND policyname = 'Users update own jobs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users update own jobs" ON public.notification_jobs
        FOR UPDATE USING (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;

-- ============================================================
-- SECTION 8: Fix exchange_rate_sync_log RLS (ensure policies exist)
-- ============================================================

ALTER TABLE public.exchange_rate_sync_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'exchange_rate_sync_log'
      AND policyname = 'read_sync_log'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY read_sync_log ON public.exchange_rate_sync_log
        FOR SELECT USING (auth.role() = 'authenticated')
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'exchange_rate_sync_log'
      AND policyname = 'service_write_sync_log'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY service_write_sync_log ON public.exchange_rate_sync_log
        FOR ALL USING (auth.role() = 'service_role')
    $policy$;
  END IF;
END $$;

-- ============================================================
-- SECTION 9: updated_at triggers (reuse existing function)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_txn_notes_updated'
  ) THEN
    CREATE TRIGGER trg_txn_notes_updated
      BEFORE UPDATE ON public.transaction_notes
      FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_smart_alerts_updated'
  ) THEN
    CREATE TRIGGER trg_smart_alerts_updated
      BEFORE UPDATE ON public.smart_alerts
      FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();
  END IF;
END $$;

-- ============================================================
-- SECTION 10: create_alert_from_note() trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_alert_from_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid   uuid;
  pname text;
BEGIN
  -- Only create an alert if there is a parsed due date
  IF new.parsed_due_at IS NULL THEN
    RETURN new;
  END IF;

  -- Look up person from the linked transaction
  SELECT person_id INTO pid
    FROM public.transactions
   WHERE id = new.transaction_id;

  -- Look up the person's name for the alert title
  SELECT name INTO pname
    FROM public.people
   WHERE id = pid;

  INSERT INTO public.smart_alerts
    (user_id, source_type, source_id, person_id, transaction_id,
     title, body, due_at, priority, channel)
  VALUES
    (new.user_id, 'note', new.id::text, pid, new.transaction_id,
     'متابعة: ' || COALESCE(pname, 'عميل'),
     new.body, new.parsed_due_at, 'normal', 'in_app')
  ON CONFLICT (source_type, source_id) DO UPDATE
    SET due_at     = EXCLUDED.due_at,
        body       = EXCLUDED.body,
        status     = 'pending',
        updated_at = now();

  RETURN new;
END;
$$;

-- Attach the trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_note_to_alert'
  ) THEN
    CREATE TRIGGER trg_note_to_alert
      AFTER INSERT ON public.transaction_notes
      FOR EACH ROW EXECUTE FUNCTION public.create_alert_from_note();
  END IF;
END $$;

-- ============================================================
-- SECTION 11: fire_due_alerts() — materialize due alerts into the pipeline
-- ============================================================

CREATE OR REPLACE FUNCTION public.fire_due_alerts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a   record;
  jid uuid;
  n   int := 0;
BEGIN
  FOR a IN
    SELECT * FROM public.smart_alerts
     WHERE status = 'pending'
       AND due_at IS NOT NULL
       AND due_at <= now()
     ORDER BY priority DESC, due_at ASC
     LIMIT 500                       -- safety cap per run
  LOOP
    -- Create the notification job
    INSERT INTO public.notification_jobs
      (user_id, category, priority, channel, payload, scheduled_at, status, alert_id)
    VALUES
      (a.user_id, 'reminder', a.priority, a.channel,
       jsonb_build_object(
         'alert_id',   a.id,
         'source_type', a.source_type,
         'source_id',  a.source_id,
         'title',      a.title,
         'body',       a.body,
         'due_at',     a.due_at
       ),
       now(), 'delivered', a.id)
    RETURNING id INTO jid;

    -- Push to inbox
    INSERT INTO public.notification_inbox
      (user_id, job_id, category, title, body, data, alert_id)
    VALUES
      (a.user_id, jid, 'reminder', a.title, a.body,
       jsonb_build_object(
         'alert_id',   a.id,
         'source_type', a.source_type,
         'due_at',     a.due_at
       ),
       a.id);                          -- ← correct: alert FK = smart_alerts.id

    -- Record the delivery event
    INSERT INTO public.notification_events (job_id, user_id, event_type, channel)
    VALUES (jid, a.user_id, 'delivered', a.channel);

    -- Mark alert as triggered
    UPDATE public.smart_alerts
       SET status              = 'triggered',
           notification_job_id = jid,
           updated_at          = now()
     WHERE id = a.id;

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

-- ============================================================
-- SECTION 12: sync_overdue_alerts() — overdue debt → smart_alert
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_overdue_alerts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t     record;
  pname text;
  n     int := 0;
BEGIN
  FOR t IN
    SELECT tx.id, tx.user_id, tx.person_id, tx.details, tx.due_date, tx.amount
      FROM public.transactions tx
     WHERE tx.is_paid = false
       AND tx.due_date IS NOT NULL
       AND tx.due_date < now()
  LOOP
    -- Idempotent: skip if alert already exists for this transaction
    IF EXISTS (
      SELECT 1 FROM public.smart_alerts sa
       WHERE sa.source_type = 'overdue'
         AND sa.source_id   = t.id::text
    ) THEN
      CONTINUE;
    END IF;

    SELECT name INTO pname FROM public.people WHERE id = t.person_id;

    INSERT INTO public.smart_alerts
      (user_id, source_type, source_id, person_id, transaction_id,
       title, body, due_at, priority, status)
    VALUES
      (t.user_id, 'overdue', t.id::text, t.person_id, t.id,
       'دين متأخر: ' || COALESCE(pname, 'عميل'),
       COALESCE(t.details, 'دين غير مدفوع'),
       t.due_date, 'high', 'pending');

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

-- ============================================================
-- SECTION 13: pg_cron jobs
-- ============================================================

-- Fire due alerts every 15 minutes
SELECT cron.schedule(
  'fire-due-alerts',
  '*/15 * * * *',
  $$ SELECT public.fire_due_alerts(); $$
)
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fire-due-alerts'
);

-- Sync overdue debts every hour
SELECT cron.schedule(
  'sync-overdue-alerts',
  '0 * * * *',
  $$ SELECT public.sync_overdue_alerts(); $$
)
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-overdue-alerts'
);

-- ============================================================
-- SECTION 14: Seed missing notification_preferences for all users
-- ============================================================

INSERT INTO public.notification_preferences
  (user_id, category, channel, enabled, max_per_day, max_per_week)
SELECT u.id, s.category::public.notif_category, s.channel::public.notif_channel,
       true, s.max_per_day, s.max_per_week
FROM auth.users u
CROSS JOIN (
  VALUES
    ('reminder',         'in_app', 10, 50),
    ('reminder',         'push',    5, 20),
    ('overdue',          'in_app', 10, 50),
    ('payment_received', 'in_app', 20, 100),
    ('payment_sent',     'in_app', 20, 100),
    ('recurring',        'in_app', 10, 50),
    ('backup',           'in_app',  5, 20),
    ('system',           'in_app', 10, 50)
) AS s(category, channel, max_per_day, max_per_week)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_preferences np
   WHERE np.user_id  = u.id
     AND np.category = s.category::public.notif_category
     AND np.channel  = s.channel::public.notif_channel
);

-- ============================================================
-- SECTION 15: Run initial overdue sync immediately
-- ============================================================

SELECT public.sync_overdue_alerts();
