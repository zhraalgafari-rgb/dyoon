-- ============================================================
-- Fix rpc_get_top_debtors to return per-currency net balances
-- instead of a single merged total across all currencies.
-- ============================================================

DROP FUNCTION IF EXISTS public.rpc_get_top_debtors(integer);

CREATE OR REPLACE FUNCTION public.rpc_get_top_debtors(p_limit INT DEFAULT 10)
RETURNS TABLE(person_id UUID, currency_id UUID, net NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    t.person_id,
    t.currency_id,
    (SUM(CASE WHEN t.direction = 'credit' THEN t.amount ELSE 0 END) -
     SUM(CASE WHEN t.direction = 'debit' THEN t.amount ELSE 0 END))::NUMERIC AS net
  FROM public.transactions t
  WHERE t.user_id = uid
  GROUP BY t.person_id, t.currency_id
  ORDER BY ABS(
    SUM(CASE WHEN t.direction = 'credit' THEN t.amount ELSE 0 END) -
    SUM(CASE WHEN t.direction = 'debit' THEN t.amount ELSE 0 END)
  ) DESC
  LIMIT p_limit;
END;
$$;
