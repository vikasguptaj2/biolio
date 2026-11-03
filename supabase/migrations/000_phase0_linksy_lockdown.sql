-- ============================================================================
-- 000_phase0_linksy_lockdown.sql
-- Remediates P0.1: Table-level SELECT on `public.instagram_accounts` overrides
-- column-level REVOKE in PostgreSQL unless table-level SELECT is revoked first.
-- ============================================================================
BEGIN;

-- 1. Safely archive colliding legacy Linksy tables before v6 tables are provisioned
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_rules' AND column_name = 'ig_account_id') THEN
    ALTER TABLE public.automation_rules RENAME TO legacy_automation_rules_v0;
  END IF;
END $$;

-- 2. Enable RLS and revoke ALL table-level privileges from PUBLIC, anon, AND authenticated
DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['instagram_accounts', 'automation_rules', 'dm_logs']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = v_table) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_table);
      -- CRITICAL P0.1 FIX: Revoke ALL privileges (including table-level SELECT) from authenticated too
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated;', v_table);
    END IF;
  END LOOP;
END $$;

-- 2. Re-grant ONLY safe non-secret columns on `public.instagram_accounts` to `authenticated`
DO $$
DECLARE
  v_safe_cols TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'instagram_accounts') THEN
    SELECT string_agg(quote_ident(column_name), ', ')
    INTO v_safe_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'instagram_accounts'
      AND column_name NOT IN ('access_token', 'refresh_token', 'encrypted_access_token', 'webhook_secret');

    IF v_safe_cols IS NOT NULL THEN
      EXECUTE format('GRANT SELECT (%s) ON TABLE public.instagram_accounts TO authenticated;', v_safe_cols);
    END IF;
  END IF;
END $$;

-- 3. Grant safe operations on `automation_rules` (read/write own rules) and `dm_logs` (read-only; worker writes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_rules') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.automation_rules TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dm_logs') THEN
    -- P0.1 FIX: Execution logs are written only by server/worker (`service_role`), never mutated by browser clients
    GRANT SELECT ON TABLE public.dm_logs TO authenticated;
  END IF;
END $$;

-- 4. Automated Self-Test Assertion: Abort transaction if `anon` or `authenticated` can still SELECT `access_token`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instagram_accounts' AND column_name = 'access_token'
  ) THEN
    IF has_column_privilege('anon', 'public.instagram_accounts', 'access_token', 'SELECT') THEN
      RAISE EXCEPTION 'P0.1 SECURITY FAILURE: anon still has SELECT on instagram_accounts.access_token';
    END IF;
    IF has_column_privilege('authenticated', 'public.instagram_accounts', 'access_token', 'SELECT') THEN
      RAISE EXCEPTION 'P0.1 SECURITY FAILURE: authenticated still has SELECT on instagram_accounts.access_token';
    END IF;
  END IF;
END $$;

COMMIT;
