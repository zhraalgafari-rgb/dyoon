-- ============================================================
-- Exchange Rate Sync Infrastructure
-- 1. Log table for daily sync from ye-rial.com/aden
-- 2. Daily cron job at 07:00 UTC (10:00 Aden time)
-- ============================================================

-- 1. Sync log table
CREATE TABLE IF NOT EXISTS public.exchange_rate_sync_log (
  id                  BIGSERIAL PRIMARY KEY,
  synced_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  source              TEXT DEFAULT 'ye-rial.com/aden' NOT NULL,
  currencies_updated  INT DEFAULT 0,
  raw_data            JSONB,
  error_msg           TEXT
);

ALTER TABLE public.exchange_rate_sync_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read the sync log
DO $$
BEGIN
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

-- 2. Enable pg_net for HTTP calls from cron
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 3. Daily cron at 07:00 UTC (= 10:00 Aden/Arabia Standard Time)
SELECT cron.schedule(
  'daily-exchange-rate-sync',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://uojgqshqlprucjvprvpv.supabase.co/functions/v1/sync-exchange-rates',
      body    := '{}'::jsonb,
      headers := '{"Content-Type": "application/json"}'::jsonb
    )
  $$
);

COMMENT ON TABLE public.exchange_rate_sync_log IS
  'Daily exchange rate sync log from ye-rial.com/aden. Triggered by cron at 07:00 UTC.';
