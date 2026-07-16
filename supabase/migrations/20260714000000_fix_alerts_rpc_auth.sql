-- ============================================================
-- Fix sync_overdue_alerts to allow RPC call by authenticated users
-- (filters to current user via auth.uid())
-- ============================================================

-- Replace sync_overdue_alerts to filter by current user when called as RPC
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
  -- When called via pg_cron, auth.uid() is NULL so we sync all users.
  -- When called via RPC from a logged-in user, we only sync that user's data.
  calling_user uuid := auth.uid();
BEGIN
  FOR t IN
    SELECT tx.id, tx.user_id, tx.person_id, tx.details, tx.due_date, tx.amount
      FROM public.transactions tx
     WHERE tx.is_paid = false
       AND tx.due_date IS NOT NULL
       AND tx.due_date < now()
       -- filter by calling user when triggered from client, else sync all
       AND (calling_user IS NULL OR tx.user_id = calling_user)
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

-- Also grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_overdue_alerts() TO authenticated;

-- Grant execute on fire_due_alerts too (for the manual sync button)
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
  calling_user uuid := auth.uid();
BEGIN
  FOR a IN
    SELECT * FROM public.smart_alerts
     WHERE status = 'pending'
       AND due_at IS NOT NULL
       AND due_at <= now()
       AND (calling_user IS NULL OR user_id = calling_user)
     ORDER BY priority DESC, due_at ASC
     LIMIT 500
  LOOP
    -- Create the notification job
    INSERT INTO public.notification_jobs
      (user_id, category, priority, channel, payload, scheduled_at, status, alert_id)
    VALUES
      (a.user_id, 'reminder', a.priority, a.channel,
       jsonb_build_object(
         'alert_id',    a.id,
         'source_type', a.source_type,
         'source_id',   a.source_id,
         'title',       a.title,
         'body',        a.body,
         'due_at',      a.due_at
       ),
       now(), 'delivered', a.id)
    RETURNING id INTO jid;

    -- Push to inbox
    INSERT INTO public.notification_inbox
      (user_id, job_id, category, title, body, data, alert_id)
    VALUES
      (a.user_id, jid, 'reminder', a.title, a.body,
       jsonb_build_object(
         'alert_id',    a.id,
         'source_type', a.source_type,
         'due_at',      a.due_at
       ),
       a.id);

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

GRANT EXECUTE ON FUNCTION public.fire_due_alerts() TO authenticated;
