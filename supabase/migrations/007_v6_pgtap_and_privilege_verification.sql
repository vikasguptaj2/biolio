-- ============================================================================
-- 007_v6_pgtap_and_privilege_verification.sql
-- Automated post-migration verification script that aborts if any P0/P1
-- security invariant is violated.
-- ============================================================================
DO $$
DECLARE
  v_unprotected_tables INTEGER;
  v_policyless_tables INTEGER;
  v_sample_token TEXT;
BEGIN
  -- 1. Verify PG17 token generator works and returns URL-safe characters
  v_sample_token := public.gen_opaque_token(12);
  IF v_sample_token IS NULL OR length(v_sample_token) < 12 OR v_sample_token ~ '[+/=]' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED (P0.2): gen_opaque_token() returned invalid token: %', v_sample_token;
  END IF;

  -- 2. Verify every table in `public` has RLS enabled
  SELECT COUNT(*) INTO v_unprotected_tables
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = FALSE;

  IF v_unprotected_tables > 0 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED (P0.3): % public tables do not have RLS enabled.', v_unprotected_tables;
  END IF;

  -- 3. Verify every table in `public` has at least one RLS policy defined
  SELECT COUNT(*) INTO v_policyless_tables
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = t.tablename
    );

  IF v_policyless_tables > 0 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED (P0.3): % public tables have 0 RLS policies.', v_policyless_tables;
  END IF;

  -- 4. Verify `anon` and `authenticated` have ZERO access to `private_integrations`
  IF has_schema_privilege('anon', 'private_integrations', 'USAGE')
     OR has_schema_privilege('authenticated', 'private_integrations', 'USAGE') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED (P1.1): Browser roles have USAGE on private_integrations schema.';
  END IF;

  -- 5. Verify `anon` has no write privileges on any public table
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE grantee = 'anon' AND table_schema = 'public' AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ) THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: anon has write privileges on a public table.';
  END IF;

  RAISE NOTICE 'BIOLIO V6 SQL VERIFICATION PASSED: All tables have RLS + policies, PG17 token generator works, and private_integrations is isolated.';
END $$;
