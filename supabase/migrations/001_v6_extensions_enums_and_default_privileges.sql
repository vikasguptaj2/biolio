-- ============================================================================
-- 001_v6_extensions_enums_and_default_privileges.sql
-- Fixes P0.2 (PG17 URL-safe token encoding compatibility), P0.5 (Default Privileges), & P1.1
-- ============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 1. Create private schemas for credentials and internal worker queues (P1.1)
CREATE SCHEMA IF NOT EXISTS private_integrations;
REVOKE ALL ON SCHEMA private_integrations FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private_integrations TO service_role;

-- 2. Configure Default Privileges so future migrations never leak grants to anon/authenticated (P0.5)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA private_integrations REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private_integrations REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private_integrations REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private_integrations GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private_integrations GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private_integrations GRANT ALL ON FUNCTIONS TO service_role;

-- 3. PostgreSQL 17.11 Compatible URL-Safe Opaque Token Generator (Fixes P0.2)
-- Uses PG17-supported `encode(..., 'base64')` + `translate(..., '+/', '-_')` + `replace(..., '=', '')`
CREATE OR REPLACE FUNCTION public.gen_opaque_token(p_num_bytes INTEGER DEFAULT 12)
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = public, extensions, pg_temp
AS $$
  SELECT translate(
    replace(encode(extensions.gen_random_bytes(GREATEST(9, LEAST(p_num_bytes, 64))), 'base64'), '=', ''),
    '+/' || chr(10) || chr(13),
    '-_'
  );
$$;

GRANT EXECUTE ON FUNCTION public.gen_opaque_token(INTEGER) TO authenticated, service_role;

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- 4. Canonical Reserved Handles Registry (Fixes P1.14)
CREATE TABLE IF NOT EXISTS public.reserved_handles (
  handle CITEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'system_route',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Domain Enums
DO $$ BEGIN
  CREATE TYPE product_module AS ENUM ('bio', 'instagram_automation', 'bundle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('free', 'creator', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE billing_interval AS ENUM ('monthly', 'annual', 'lifetime');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coupon_discount_type AS ENUM ('percentage', 'fixed_amount', 'free_trial_days', 'bundle_upgrade');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coupon_duration_type AS ENUM ('once', 'repeating', 'forever');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coupon_scope_type AS ENUM ('any', 'bio_only', 'automation_only', 'bundle_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived', 'soft_hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inquiry_status AS ENUM ('new', 'read', 'replied', 'archived', 'spam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ig_connection_status AS ENUM ('not_connected', 'pending_authorization', 'connected', 'degraded', 'expired', 'revoked', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ig_match_mode AS ENUM ('exact_token', 'exact_comment', 'contains', 'starts_with', 'keyword_list', 'all_comments');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ig_target_scope AS ENUM ('all_eligible_posts', 'specific_media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ig_execution_status AS ENUM (
    'received', 'verified', 'deduplicated', 'queued', 'evaluating',
    'skipped', 'matched', 'reserved', 'dispatching', 'accepted',
    'failed_permanent', 'retry_scheduled', 'outcome_unknown', 'reconciled', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
