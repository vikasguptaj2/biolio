-- =============================================================================
-- BIOLIO V6.0 HARDENED ENTERPRISE MIGRATION — PHASE 9
-- Hardened Checkout Sessions, Admin Sessions & Lockout, and Canonical INR Plans
-- Closes Audit Findings: B-01, B-10, B-12, B-13, B-17
-- File: supabase/migrations/009_v6_hardened_billing_and_admin.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CHECKOUT SESSIONS TABLE (Closes B-01 & 05_BILLING §5)
-- Records initiated checkouts and binds Razorpay order to workspace & plan
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  plan_id                TEXT NOT NULL,
  plan_version           INTEGER NOT NULL DEFAULT 1,
  billing_interval       public.billing_interval NOT NULL DEFAULT 'monthly',
  amount_minor           INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency               TEXT NOT NULL DEFAULT 'INR',
  idempotency_key        TEXT UNIQUE NOT NULL,
  razorpay_order_id      TEXT UNIQUE,
  coupon_redemption_id   UUID REFERENCES public.coupon_redemptions(id) ON DELETE SET NULL,
  status                 TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at           TIMESTAMPTZ
);

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS members_select_checkout_sessions ON public.checkout_sessions;
CREATE POLICY members_select_checkout_sessions
  ON public.checkout_sessions FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

GRANT SELECT ON public.checkout_sessions TO authenticated;
GRANT ALL ON public.checkout_sessions TO service_role;

-- =============================================================================
-- 2. SUPER ADMIN SESSIONS & BRUTE-FORCE LOCKOUT (Closes B-10 & 03_AUTH §5)
-- Database-backed session table with instant revocation and brute-force tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash      TEXT UNIQUE NOT NULL,
  email_hash      TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  step_up_at      TIMESTAMPTZ NOT NULL,
  ip_hash         TEXT NOT NULL,
  user_agent_hash TEXT NOT NULL,
  epoch           INTEGER NOT NULL DEFAULT 1,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_sessions TO service_role;

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON public.admin_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON public.admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash   TEXT NOT NULL,
  ip_hash      TEXT NOT NULL,
  success      BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_login_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_login_attempts TO service_role;

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_lookup
  ON public.admin_login_attempts (ip_hash, email_hash, attempted_at DESC);

-- =============================================================================
-- 3. DEFENSIVELY ENSURE ENTITLEMENT COLUMNS EXIST ON WORKSPACE_ENTITLEMENTS
-- =============================================================================
ALTER TABLE public.workspace_entitlements
  ADD COLUMN IF NOT EXISTS bio_state TEXT NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS ig_state TEXT NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS bio_custom_themes BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bio_analytics_retention_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS automation_attribution_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS projection_version INTEGER NOT NULL DEFAULT 1;

-- =============================================================================
-- 4. REVOKE DIRECT BROWSER EXECUTION ON PREVIEW_COUPON (Closes B-17)
-- Dynamically queries pg_proc to find registered signature, avoiding parameter mismatches
-- =============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS func_signature
    FROM pg_proc
    WHERE proname = 'preview_coupon'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.func_signature || ' FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.func_signature || ' TO service_role';
  END LOOP;
END;
$$;

-- =============================================================================
-- 5. CANONICAL DOMESTIC INR PLANS (Closes B-12, B-13 & 05_BILLING §2)
-- Prices in minor units (paise: ₹299 = 29900 paise)
-- =============================================================================
ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS entitlements JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS is_active_for_sale BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

INSERT INTO public.billing_plans (
  id,
  version,
  name,
  module,
  tier,
  price_monthly_minor,
  price_annual_minor,
  currency,
  is_active_for_sale,
  sort_order,
  entitlements
)
VALUES
  (
    'free_default',
    1,
    'Starter',
    'bundle',
    'free',
    0,
    0,
    'INR',
    TRUE,
    0,
    '{
      "bio.max_links": 5,
      "bio.max_gallery_items": 6,
      "bio.max_blog_posts": 1,
      "bio.custom_themes": false,
      "bio.remove_branding": false,
      "bio.export_analytics": false,
      "bio.analytics_retention_days": 7,
      "ig.max_active_rules": 1,
      "ig.monthly_action_quota": 100,
      "ig.public_replies": false,
      "ig.attribution": false,
      "ig.log_retention_days": 7
    }'::jsonb
  ),
  (
    'bio_creator',
    1,
    'Bio Creator',
    'bio',
    'creator',
    29900,
    299000,
    'INR',
    TRUE,
    10,
    '{
      "bio.max_links": null,
      "bio.max_gallery_items": 30,
      "bio.max_blog_posts": 20,
      "bio.custom_themes": true,
      "bio.remove_branding": false,
      "bio.export_analytics": false,
      "bio.analytics_retention_days": 90,
      "ig.max_active_rules": 0,
      "ig.monthly_action_quota": 0,
      "ig.public_replies": false,
      "ig.attribution": false,
      "ig.log_retention_days": 0
    }'::jsonb
  ),
  (
    'bio_pro',
    1,
    'Bio Pro',
    'bio',
    'pro',
    69900,
    699000,
    'INR',
    TRUE,
    20,
    '{
      "bio.max_links": null,
      "bio.max_gallery_items": null,
      "bio.max_blog_posts": null,
      "bio.custom_themes": true,
      "bio.remove_branding": true,
      "bio.export_analytics": true,
      "bio.analytics_retention_days": 365,
      "ig.max_active_rules": 0,
      "ig.monthly_action_quota": 0,
      "ig.public_replies": false,
      "ig.attribution": false,
      "ig.log_retention_days": 0
    }'::jsonb
  ),
  (
    'ig_creator',
    1,
    'Automation Creator',
    'instagram_automation',
    'creator',
    49900,
    499000,
    'INR',
    TRUE,
    30,
    '{
      "bio.max_links": 0,
      "bio.max_gallery_items": 0,
      "bio.max_blog_posts": 0,
      "bio.custom_themes": false,
      "bio.remove_branding": false,
      "bio.export_analytics": false,
      "bio.analytics_retention_days": 0,
      "ig.max_active_rules": 5,
      "ig.monthly_action_quota": 2500,
      "ig.public_replies": true,
      "ig.attribution": true,
      "ig.log_retention_days": 30
    }'::jsonb
  ),
  (
    'ig_pro',
    1,
    'Automation Pro',
    'instagram_automation',
    'pro',
    99900,
    999000,
    'INR',
    TRUE,
    40,
    '{
      "bio.max_links": 0,
      "bio.max_gallery_items": 0,
      "bio.max_blog_posts": 0,
      "bio.custom_themes": false,
      "bio.remove_branding": false,
      "bio.export_analytics": false,
      "bio.analytics_retention_days": 0,
      "ig.max_active_rules": null,
      "ig.monthly_action_quota": 25000,
      "ig.public_replies": true,
      "ig.attribution": true,
      "ig.log_retention_days": 365
    }'::jsonb
  ),
  (
    'bundle_creator',
    1,
    'Bundle Creator',
    'bundle',
    'creator',
    59900,
    599000,
    'INR',
    TRUE,
    50,
    '{
      "bio.max_links": null,
      "bio.max_gallery_items": 30,
      "bio.max_blog_posts": 20,
      "bio.custom_themes": true,
      "bio.remove_branding": false,
      "bio.export_analytics": false,
      "bio.analytics_retention_days": 90,
      "ig.max_active_rules": 5,
      "ig.monthly_action_quota": 2500,
      "ig.public_replies": true,
      "ig.attribution": true,
      "ig.log_retention_days": 30
    }'::jsonb
  ),
  (
    'bundle_pro',
    1,
    'Bundle Pro',
    'bundle',
    'pro',
    119900,
    1199000,
    'INR',
    TRUE,
    60,
    '{
      "bio.max_links": null,
      "bio.max_gallery_items": null,
      "bio.max_blog_posts": null,
      "bio.custom_themes": true,
      "bio.remove_branding": true,
      "bio.export_analytics": true,
      "bio.analytics_retention_days": 365,
      "ig.max_active_rules": null,
      "ig.monthly_action_quota": 25000,
      "ig.public_replies": true,
      "ig.attribution": true,
      "ig.log_retention_days": 365
    }'::jsonb
  )
ON CONFLICT (id, version) DO UPDATE
  SET
    price_monthly_minor = EXCLUDED.price_monthly_minor,
    price_annual_minor  = EXCLUDED.price_annual_minor,
    currency            = EXCLUDED.currency,
    entitlements        = EXCLUDED.entitlements,
    is_active_for_sale  = EXCLUDED.is_active_for_sale;

-- =============================================================================
-- 6. PROJECT WORKSPACE ENTITLEMENTS RPC (Closes B-12)
-- Calculates entitlements from billing_plans (single source of truth)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.project_workspace_entitlements(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub          RECORD;
  v_plan         RECORD;
  v_bio_state    TEXT := 'starter';
  v_ig_state     TEXT := 'starter';
  v_bio_tier     public.plan_tier := 'free';
  v_ig_tier      public.plan_tier := 'free';
  v_ent          JSONB;
  v_res          JSONB;
BEGIN
  -- Look for active or trialing subscription
  SELECT * INTO v_sub
    FROM public.subscriptions
   WHERE workspace_id = p_workspace_id
     AND status IN ('active', 'trialing')
   LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_plan
      FROM public.billing_plans
     WHERE id = v_sub.plan_id
       AND version = v_sub.plan_version
     LIMIT 1;

    IF FOUND THEN
      v_ent := v_plan.entitlements;
      IF v_plan.module = 'bio' THEN
        v_bio_state := 'active';
        v_bio_tier := v_plan.tier;
        v_ig_state := 'locked'; -- strict lock: paying for one locks the other
        v_ig_tier := 'free';
      ELSIF v_plan.module = 'instagram_automation' THEN
        v_ig_state := 'active';
        v_ig_tier := v_plan.tier;
        v_bio_state := 'locked';
        v_bio_tier := 'free';
      ELSIF v_plan.module = 'bundle' THEN
        v_bio_state := 'active';
        v_ig_state := 'active';
        v_bio_tier := v_plan.tier;
        v_ig_tier := v_plan.tier;
      END IF;
    END IF;
  ELSE
    -- Default free starter plan
    SELECT * INTO v_plan
      FROM public.billing_plans
     WHERE id = 'free_default'
     LIMIT 1;
    v_ent := COALESCE(v_plan.entitlements, '{}'::jsonb);
    v_bio_state := 'starter';
    v_ig_state := 'starter';
  END IF;

  -- Upsert into workspace_entitlements
  INSERT INTO public.workspace_entitlements (
    workspace_id,
    bio_tier,
    ig_tier,
    bio_max_links,
    bio_max_gallery_items,
    bio_max_blog_posts,
    bio_custom_themes,
    bio_remove_branding,
    bio_export_analytics,
    bio_analytics_retention_days,
    automation_max_active_rules,
    automation_monthly_action_quota,
    automation_public_replies_enabled,
    automation_attribution_enabled,
    automation_log_retention_days,
    bio_state,
    ig_state,
    projection_version,
    updated_at
  )
  VALUES (
    p_workspace_id,
    v_bio_tier,
    v_ig_tier,
    (v_ent->>'bio.max_links')::integer,
    (v_ent->>'bio.max_gallery_items')::integer,
    (v_ent->>'bio.max_blog_posts')::integer,
    COALESCE((v_ent->>'bio.custom_themes')::boolean, false),
    COALESCE((v_ent->>'bio.remove_branding')::boolean, false),
    COALESCE((v_ent->>'bio.export_analytics')::boolean, false),
    COALESCE((v_ent->>'bio.analytics_retention_days')::integer, 7),
    (v_ent->>'ig.max_active_rules')::integer,
    COALESCE((v_ent->>'ig.monthly_action_quota')::integer, 100),
    COALESCE((v_ent->>'ig.public_replies')::boolean, false),
    COALESCE((v_ent->>'ig.attribution')::boolean, false),
    COALESCE((v_ent->>'ig.log_retention_days')::integer, 7),
    v_bio_state,
    v_ig_state,
    1,
    NOW()
  )
  ON CONFLICT (workspace_id) DO UPDATE
    SET
      bio_tier                          = EXCLUDED.bio_tier,
      ig_tier                           = EXCLUDED.ig_tier,
      bio_max_links                     = EXCLUDED.bio_max_links,
      bio_max_gallery_items             = EXCLUDED.bio_max_gallery_items,
      bio_max_blog_posts                = EXCLUDED.bio_max_blog_posts,
      bio_custom_themes                 = EXCLUDED.bio_custom_themes,
      bio_remove_branding               = EXCLUDED.bio_remove_branding,
      bio_export_analytics              = EXCLUDED.bio_export_analytics,
      bio_analytics_retention_days      = EXCLUDED.bio_analytics_retention_days,
      automation_max_active_rules       = EXCLUDED.automation_max_active_rules,
      automation_monthly_action_quota   = EXCLUDED.automation_monthly_action_quota,
      automation_public_replies_enabled = EXCLUDED.automation_public_replies_enabled,
      automation_attribution_enabled    = EXCLUDED.automation_attribution_enabled,
      automation_log_retention_days     = EXCLUDED.automation_log_retention_days,
      bio_state                         = EXCLUDED.bio_state,
      ig_state                          = EXCLUDED.ig_state,
      projection_version                = public.workspace_entitlements.projection_version + 1,
      updated_at                        = NOW();

  v_res := jsonb_build_object(
    'workspace_id', p_workspace_id,
    'bio_state', v_bio_state,
    'ig_state', v_ig_state,
    'bio_tier', v_bio_tier,
    'ig_tier', v_ig_tier
  );

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.project_workspace_entitlements(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_workspace_entitlements(UUID) TO service_role;

COMMIT;
