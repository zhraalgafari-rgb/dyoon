-- ============================================================
-- Phase 2: Customer Risk Score System
-- Creates customer_risk_scores table, scoring function, and triggers
-- ============================================================

-- ============================================================
-- SECTION 1: customer_risk_scores table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_risk_scores (
  person_id       UUID PRIMARY KEY REFERENCES public.people(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  classification  TEXT NOT NULL CHECK (classification IN ('excellent', 'good', 'fair', 'high_risk', 'critical')),
  factors         JSONB NOT NULL DEFAULT '{}',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_user ON public.customer_risk_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_score ON public.customer_risk_scores(score DESC);

-- ============================================================
-- SECTION 2: RLS policies
-- ============================================================

ALTER TABLE public.customer_risk_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "own risk scores" ON public.customer_risk_scores;
END $$;

CREATE POLICY "own risk scores" ON public.customer_risk_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SECTION 3: Risk score calculation function
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_calculate_risk_score(p_person_id UUID)
RETURNS TABLE (
  score INTEGER,
  classification TEXT,
  factors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_score INTEGER := 100; -- Start with perfect score
  v_factors JSONB := '{}';
  v_outstanding_debt NUMERIC := 0;
  v_overdue_amount NUMERIC := 0;
  v_overdue_count INTEGER := 0;
  v_broken_promises INTEGER := 0;
  v_avg_delay INTEGER := 0;
  v_payment_success_ratio NUMERIC := 0;
  v_last_payment_date DATE;
  v_total_transactions INTEGER := 0;
  v_paid_on_time INTEGER := 0;
  v_paid_late INTEGER := 0;
BEGIN
  -- Get user_id from person
  SELECT user_id INTO v_user_id FROM public.people WHERE id = p_person_id;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Calculate outstanding debt (unpaid transactions)
  SELECT COALESCE(SUM(amount), 0) INTO v_outstanding_debt
  FROM public.transactions
  WHERE person_id = p_person_id
    AND user_id = v_user_id
    AND is_paid = false
    AND direction = 'debit';

  -- Calculate overdue amount and count
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
  INTO v_overdue_amount, v_overdue_count
  FROM public.transactions
  WHERE person_id = p_person_id
    AND user_id = v_user_id
    AND is_paid = false
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE;

  -- Count broken promises
  SELECT COUNT(*) INTO v_broken_promises
  FROM public.payment_promises
  WHERE person_id = p_person_id
    AND user_id = v_user_id
    AND status = 'broken';

  -- Calculate payment statistics
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN is_paid = true AND due_date >= transaction_date::date THEN 1 END),
    COUNT(CASE WHEN is_paid = true AND due_date < transaction_date::date THEN 1 END),
    MAX(CASE WHEN direction = 'credit' THEN transaction_date::date END)
  INTO v_total_transactions, v_paid_on_time, v_paid_late, v_last_payment_date
  FROM public.transactions
  WHERE person_id = p_person_id
    AND user_id = v_user_id
    AND direction = 'debit'
    AND due_date IS NOT NULL;

  -- Calculate average delay for overdue payments
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (CURRENT_DATE - due_date)) / 86400), 0)
  INTO v_avg_delay
  FROM public.transactions
  WHERE person_id = p_person_id
    AND user_id = v_user_id
    AND is_paid = false
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE;

  -- Calculate payment success ratio
  IF v_total_transactions > 0 THEN
    v_payment_success_ratio := (v_paid_on_time::NUMERIC / v_total_transactions::NUMERIC) * 100;
  END IF;

  -- Store factors
  v_factors := jsonb_build_object(
    'outstanding_debt', v_outstanding_debt,
    'overdue_amount', v_overdue_amount,
    'overdue_count', v_overdue_count,
    'broken_promises', v_broken_promises,
    'avg_delay_days', ROUND(v_avg_delay),
    'payment_success_ratio', ROUND(v_payment_success_ratio, 2),
    'last_payment_date', v_last_payment_date,
    'total_transactions', v_total_transactions,
    'paid_on_time', v_paid_on_time,
    'paid_late', v_paid_late
  );

  -- Calculate score (start at 100, subtract penalties)
  
  -- Factor 1: Outstanding debt ratio (max -20 points)
  IF v_outstanding_debt > 0 THEN
    v_score := v_score - LEAST(20, FLOOR(LOG(10, v_outstanding_debt + 1) * 5));
  END IF;

  -- Factor 2: Overdue amount (max -25 points)
  IF v_overdue_amount > 0 THEN
    v_score := v_score - LEAST(25, FLOOR(LOG(10, v_overdue_amount + 1) * 6));
  END IF;

  -- Factor 3: Overdue count (max -15 points)
  v_score := v_score - LEAST(15, v_overdue_count * 3);

  -- Factor 4: Broken promises (max -15 points)
  v_score := v_score - LEAST(15, v_broken_promises * 5);

  -- Factor 5: Average delay (max -10 points)
  v_score := v_score - LEAST(10, FLOOR(v_avg_delay / 7) * 2);

  -- Factor 6: Payment success ratio (max -10 points)
  IF v_payment_success_ratio < 100 THEN
    v_score := v_score - LEAST(10, FLOOR((100 - v_payment_success_ratio) / 10));
  END IF;

  -- Factor 7: Recency of last payment (max -5 points)
  IF v_last_payment_date IS NOT NULL THEN
    DECLARE
      days_since_last_payment INTEGER := EXTRACT(EPOCH FROM (CURRENT_DATE - v_last_payment_date)) / 86400;
    BEGIN
      IF days_since_last_payment > 90 THEN
        v_score := v_score - 5;
      ELSIF days_since_last_payment > 60 THEN
        v_score := v_score - 3;
      ELSIF days_since_last_payment > 30 THEN
        v_score := v_score - 1;
      END IF;
    END;
  END IF;

  -- Ensure score is within bounds
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Determine classification
  IF v_score >= 80 THEN
    RETURN QUERY SELECT v_score, 'excellent'::TEXT, v_factors;
  ELSIF v_score >= 60 THEN
    RETURN QUERY SELECT v_score, 'good'::TEXT, v_factors;
  ELSIF v_score >= 40 THEN
    RETURN QUERY SELECT v_score, 'fair'::TEXT, v_factors;
  ELSIF v_score >= 20 THEN
    RETURN QUERY SELECT v_score, 'high_risk'::TEXT, v_factors;
  ELSE
    RETURN QUERY SELECT v_score, 'critical'::TEXT, v_factors;
  END IF;
END;
$$;

-- ============================================================
-- SECTION 4: Trigger functions to auto-recalculate risk score
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_recalc_risk_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person_id UUID;
  v_user_id UUID;
  v_result RECORD;
BEGIN
  -- Get person_id and user_id
  IF TG_OP = 'DELETE' THEN
    v_person_id := OLD.person_id;
    v_user_id := OLD.user_id;
  ELSE
    v_person_id := NEW.person_id;
    v_user_id := NEW.user_id;
  END IF;

  -- Only process if person_id exists
  IF v_person_id IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- Recalculate risk score
  SELECT * INTO v_result FROM public.rpc_calculate_risk_score(v_person_id);

  -- Upsert the risk score
  INSERT INTO public.customer_risk_scores (person_id, user_id, score, classification, factors, computed_at)
  VALUES (v_person_id, v_user_id, v_result.score, v_result.classification, v_result.factors, now())
  ON CONFLICT (person_id) DO UPDATE
    SET score = EXCLUDED.score,
        classification = EXCLUDED.classification,
        factors = EXCLUDED.factors,
        computed_at = EXCLUDED.computed_at;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_risk_on_promise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person_id UUID;
  v_user_id UUID;
  v_result RECORD;
BEGIN
  -- Get person_id and user_id
  v_person_id := NEW.person_id;
  v_user_id := NEW.user_id;

  -- Only process if status changed to broken
  IF NEW.status = 'broken' AND OLD.status != 'broken' THEN
    -- Recalculate risk score
    SELECT * INTO v_result FROM public.rpc_calculate_risk_score(v_person_id);

    -- Upsert the risk score
    INSERT INTO public.customer_risk_scores (person_id, user_id, score, classification, factors, computed_at)
    VALUES (v_person_id, v_user_id, v_result.score, v_result.classification, v_result.factors, now())
    ON CONFLICT (person_id) DO UPDATE
      SET score = EXCLUDED.score,
          classification = EXCLUDED.classification,
          factors = EXCLUDED.factors,
          computed_at = EXCLUDED.computed_at;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- SECTION 5: Attach triggers
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recalc_risk_on_transaction'
  ) THEN
    CREATE TRIGGER trg_recalc_risk_on_transaction
      AFTER INSERT OR UPDATE OR DELETE ON public.transactions
      FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_risk_on_transaction();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recalc_risk_on_promise'
  ) THEN
    CREATE TRIGGER trg_recalc_risk_on_promise
      AFTER UPDATE ON public.payment_promises
      FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_risk_on_promise();
  END IF;
END $$;

-- ============================================================
-- SECTION 6: RPC function to get high-risk customers
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_get_high_risk_customers(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  person_id UUID,
  person_name TEXT,
  score INTEGER,
  classification TEXT,
  outstanding_debt NUMERIC,
  overdue_count INTEGER,
  broken_promises INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    crs.person_id,
    p.name,
    crs.score,
    crs.classification,
    (crs.factors->>'outstanding_debt')::NUMERIC,
    (crs.factors->>'overdue_count')::INTEGER,
    (crs.factors->>'broken_promises')::INTEGER
  FROM public.customer_risk_scores crs
  JOIN public.people p ON p.id = crs.person_id
  WHERE crs.user_id = p_user_id
    AND crs.score < 60 -- High risk and critical
  ORDER BY crs.score ASC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- SECTION 7: Initial calculation for all existing customers
-- ============================================================

DO $$
DECLARE
  person_record RECORD;
BEGIN
  FOR person_record IN SELECT id, user_id FROM public.people WHERE is_archived = false LOOP
    PERFORM rpc_calculate_risk_score(person_record.id);
  END LOOP;
END $$;