-- ============================================================
-- Phase 1: Promise to Pay System
-- Creates payment_promises table, triggers, and RPC functions
-- ============================================================

-- ============================================================
-- SECTION 1: payment_promises table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_promises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id     UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  amount        NUMERIC NOT NULL CHECK (amount > 0),
  promise_date  DATE NOT NULL,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' 
                CHECK (status IN ('pending', 'fulfilled', 'broken', 'cancelled')),
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promises_person ON public.payment_promises(person_id, status);
CREATE INDEX IF NOT EXISTS idx_promises_user ON public.payment_promises(user_id, promise_date);
CREATE INDEX IF NOT EXISTS idx_promises_status ON public.payment_promises(status, promise_date) WHERE status = 'pending';

-- ============================================================
-- SECTION 2: RLS policies
-- ============================================================

ALTER TABLE public.payment_promises ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "own payment promises" ON public.payment_promises;
END $$;

CREATE POLICY "own payment promises" ON public.payment_promises
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SECTION 3: updated_at trigger
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_promises_updated'
  ) THEN
    CREATE TRIGGER trg_promises_updated
      BEFORE UPDATE ON public.payment_promises
      FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();
  END IF;
END $$;

-- ============================================================
-- SECTION 4: Auto-fulfill promise when payment is recorded
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_fulfill_promise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promise RECORD;
  total_paid NUMERIC;
BEGIN
  -- Only process credit transactions (payments received)
  IF NEW.direction != 'credit' THEN
    RETURN NEW;
  END IF;

  -- Find pending promise for this person
  FOR promise IN
    SELECT * FROM public.payment_promises
    WHERE person_id = NEW.person_id
      AND user_id = NEW.user_id
      AND status = 'pending'
      AND promise_date >= NEW.transaction_date::date
    ORDER BY promise_date ASC
    LIMIT 1
  LOOP
    -- Calculate total paid for this person up to this transaction date
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.transactions
    WHERE person_id = NEW.person_id
      AND user_id = NEW.user_id
      AND direction = 'credit'
      AND transaction_date <= NEW.transaction_date
      AND is_paid = true;

    -- If total paid >= promise amount, mark as fulfilled
    IF total_paid >= promise.amount THEN
      UPDATE public.payment_promises
      SET status = 'fulfilled',
          updated_at = now()
      WHERE id = promise.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_fulfill_promise'
  ) THEN
    CREATE TRIGGER trg_auto_fulfill_promise
      AFTER INSERT OR UPDATE ON public.transactions
      FOR EACH ROW 
      WHEN (NEW.direction = 'credit' AND NEW.is_paid = true)
      EXECUTE FUNCTION public.auto_fulfill_promise();
  END IF;
END $$;

-- ============================================================
-- SECTION 5: Auto-mark broken promises (daily cron)
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_mark_broken_promises()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promise RECORD;
  total_paid NUMERIC;
  n INT := 0;
BEGIN
  FOR promise IN
    SELECT * FROM public.payment_promises
    WHERE status = 'pending'
      AND promise_date < CURRENT_DATE
  LOOP
    -- Calculate total paid for this person
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.transactions
    WHERE person_id = promise.person_id
      AND user_id = promise.user_id
      AND direction = 'credit'
      AND is_paid = true;

    -- If not fully paid, mark as broken
    IF total_paid < promise.amount THEN
      UPDATE public.payment_promises
      SET status = 'broken',
          updated_at = now()
      WHERE id = promise.id;

      -- Create notification
      INSERT INTO public.smart_alerts
        (user_id, source_type, source_id, person_id, title, body, due_at, priority, status)
      VALUES
        (promise.user_id, 'promise', promise.id::text, promise.person_id,
         'وعد سداد مكسور',
         'لم يتم سداد وعد السداد بتاريخ ' || promise.promise_date || ' بمبلغ ' || promise.amount,
         now(), 'high', 'pending')
      ON CONFLICT (source_type, source_id) DO NOTHING;

      n := n + 1;
    END IF;
  END LOOP;

  RETURN n;
END;
$$;

-- Schedule daily at midnight
SELECT cron.schedule(
  'check-broken-promises',
  '0 0 * * *',
  $$ SELECT public.auto_mark_broken_promises(); $$
)
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-broken-promises'
);

-- ============================================================
-- SECTION 6: RPC functions for promise management
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_create_promise(
  p_user_id UUID,
  p_person_id UUID,
  p_amount NUMERIC,
  p_promise_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.payment_promises
    (user_id, person_id, amount, promise_date, notes, created_by)
  VALUES
    (p_user_id, p_person_id, p_amount, p_promise_date, p_notes, p_user_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cancel_promise(p_promise_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.payment_promises
  WHERE id = p_promise_id;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.payment_promises
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_promise_id
    AND status = 'pending';

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_pending_promises(p_person_id UUID)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  promise_date DATE,
  notes TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.people
  WHERE id = p_person_id;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pp.id, pp.amount, pp.promise_date, pp.notes, pp.status, pp.created_at
  FROM public.payment_promises pp
  WHERE pp.person_id = p_person_id
    AND pp.user_id = v_user_id
    AND pp.status = 'pending'
  ORDER BY pp.promise_date ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_broken_promises(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  person_id UUID,
  person_name TEXT,
  amount NUMERIC,
  promise_date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pp.id, pp.person_id, p.name, pp.amount, pp.promise_date, pp.created_at
  FROM public.payment_promises pp
  JOIN public.people p ON p.id = pp.person_id
  WHERE pp.user_id = p_user_id
    AND pp.status = 'broken'
  ORDER BY pp.created_at DESC
  LIMIT 50;
END;
$$;

-- ============================================================
-- SECTION 7: Run initial check
-- ============================================================

SELECT public.auto_mark_broken_promises();