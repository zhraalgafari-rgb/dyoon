-- ============================================================
-- Fix rpc_get_dashboard_totals to return PER-CURRENCY rows
-- instead of a single merged total across all currencies.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_get_dashboard_totals()
RETURNS TABLE(
  currency_id   UUID,
  total_owed    NUMERIC,   -- مجموع له  (credit)
  total_owe     NUMERIC    -- مجموع عليه (debit)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    t.currency_id,
    COALESCE(SUM(CASE WHEN t.direction = 'credit' THEN t.amount ELSE 0 END), 0)::NUMERIC AS total_owed,
    COALESCE(SUM(CASE WHEN t.direction = 'debit'  THEN t.amount ELSE 0 END), 0)::NUMERIC AS total_owe
  FROM public.transactions t
  WHERE t.user_id = uid
  GROUP BY t.currency_id
  HAVING SUM(t.amount) > 0;
END;
$$;
