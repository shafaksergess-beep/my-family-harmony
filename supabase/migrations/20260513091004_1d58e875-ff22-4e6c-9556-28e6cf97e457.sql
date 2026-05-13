
-- Private schema for cron secret
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE TABLE IF NOT EXISTS private.cron_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  cron_secret TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cron_config_single_row CHECK (id = 1)
);
REVOKE ALL ON private.cron_config FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON private.cron_config TO postgres, service_role;

-- Reader for cron jobs (postgres role runs cron commands)
CREATE OR REPLACE FUNCTION private.get_cron_secret()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = private
AS $$
  SELECT cron_secret FROM private.cron_config WHERE id = 1;
$$;
REVOKE ALL ON FUNCTION private.get_cron_secret() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_cron_secret() TO postgres, service_role;

-- Public verifier for edge functions (called via service-role RPC)
CREATE OR REPLACE FUNCTION public.verify_cron_secret(provided TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.cron_config
    WHERE id = 1 AND cron_secret = provided
  );
$$;
REVOKE ALL ON FUNCTION public.verify_cron_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(TEXT) TO service_role;

-- Attach auto-log triggers to transactional tables
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'contributions','loans','loan_payments','savings','meetings',
    'attendance','assistance_events','expenses','dividends',
    'dividend_payments','shares','member_wallets','join_requests',
    'invitations','family_events','transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_log_activity ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_auto_log_activity AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity()',
        t
      );
    END IF;
  END LOOP;
END $$;
