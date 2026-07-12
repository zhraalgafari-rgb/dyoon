-- ============================================================
-- RPC functions for the Reports page
-- ============================================================

-- 1. rpc_get_dashboard_totals: total owed to user, total user owes, net balance
CREATE OR REPLACE FUNCTION public.rpc_get_dashboard_totals()
RETURNS TABLE(total_owe NUMERIC, total_owed NUMERIC, net_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN t.direction = 'debit' THEN t.amount * c.rate ELSE 0 END), 0)::NUMERIC AS total_owe,
    COALESCE(SUM(CASE WHEN t.direction = 'credit' THEN t.amount * c.rate ELSE 0 END), 0)::NUMERIC AS total_owed,
    COALESCE(
      SUM(CASE WHEN t.direction = 'credit' THEN t.amount * c.rate ELSE 0 END) -
      SUM(CASE WHEN t.direction = 'debit' THEN t.amount * c.rate ELSE 0 END),
      0
    )::NUMERIC AS net_balance
  FROM public.transactions t
  JOIN public.currencies c ON c.id = t.currency_id
  WHERE t.user_id = uid;
END;
$$;

-- 2. rpc_get_monthly_expenses: monthly expense totals grouped by month + currency
CREATE OR REPLACE FUNCTION public.rpc_get_monthly_expenses()
RETURNS TABLE(expense_month TEXT, total NUMERIC, currency_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(e.expense_date, 'YYYY-MM')::TEXT AS expense_month,
    SUM(e.amount)::NUMERIC AS total,
    e.currency_id
  FROM public.expenses e
  WHERE e.user_id = uid
    AND e.expense_date >= DATE_TRUNC('month', NOW()) - INTERVAL '6 months'
  GROUP BY expense_month, e.currency_id
  ORDER BY expense_month ASC;
END;
$$;

-- 3. rpc_get_top_debtors: top people by net balance (absolute value)
CREATE OR REPLACE FUNCTION public.rpc_get_top_debtors(p_limit INT DEFAULT 8)
RETURNS TABLE(person_id UUID, net_base NUMERIC)
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
    (SUM(CASE WHEN t.direction = 'credit' THEN t.amount * c.rate ELSE 0 END) -
     SUM(CASE WHEN t.direction = 'debit' THEN t.amount * c.rate ELSE 0 END))::NUMERIC AS net_base
  FROM public.transactions t
  JOIN public.currencies c ON c.id = t.currency_id
  WHERE t.user_id = uid
  GROUP BY t.person_id
  ORDER BY ABS(net_base) DESC
  LIMIT p_limit;
END;
$$;