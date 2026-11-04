-- =============================================================================
-- BIOLIO V6.0 ENTERPRISE MIGRATION — PHASE 8
-- Enterprise Single-Product vs. Bundle Feature Locks & Plan Entitlements RPC
-- File: supabase/migrations/008_v6_enterprise_entitlements_and_admin_lock.sql
-- =============================================================================

BEGIN;

-- 1. Ensure subscriptions table has workspace_id unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_workspace_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_workspace_id_key UNIQUE (workspace_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 2. Atomic Plan & Single-Product Entitlements Application RPC
CREATE OR REPLACE FUNCTION public.apply_workspace_plan_entitlements(
  p_workspace_id UUID,
  p_plan_id TEXT,
  p_billing_interval TEXT DEFAULT 'monthly',
  p_override_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bio_tier public.plan_tier := 'free';
  v_ig_tier public.plan_tier := 'free';
  v_bio_max_links INTEGER := 5;
  v_bio_max_gallery INTEGER := 3;
  v_bio_max_blog INTEGER := 0;
  v_bio_remove_branding BOOLEAN := FALSE;
  v_bio_export_analytics BOOLEAN := FALSE;
  v_auto_max_rules INTEGER := 1;
  v_auto_quota INTEGER := 100;
  v_auto_public_replies BOOLEAN := FALSE;
  v_auto_retention INTEGER := 7;
  v_scope TEXT := 'free';
  v_module public.product_module := 'bundle';
  v_override TEXT;
  v_result JSONB;
BEGIN
  -- Support plan aliases
  IF p_plan_id IN ('bundle_creator', 'creator_bundle') THEN
    p_plan_id := 'bundle_creator';
  ELSIF p_plan_id IN ('bundle_pro', 'enterprise_bundle') THEN
    p_plan_id := 'bundle_pro';
  END IF;

  -- Strict Feature Lock & Quota Matrix:
  -- free_default: Both active with Starter caps (5 links, 1 rule, 100 DMs/mo)
  -- bio_creator: Bio Creator ($9/mo); IG Automation STRICTLY LOCKED (0 rules, 0 DMs)
  -- bio_pro: Bio Pro ($19/mo); IG Automation STRICTLY LOCKED (0 rules, 0 DMs)
  -- ig_creator: IG Automation Creator ($15/mo); Bio Studio STRICTLY LOCKED (0 links)
  -- ig_pro: IG Automation Pro ($29/mo); Bio Studio STRICTLY LOCKED (0 links)
  -- bundle_creator / creator_bundle: Both Unlocked ($19/mo)
  -- bundle_pro / enterprise_bundle: Both Unlocked ($39/mo)
  IF p_plan_id = 'free_default' THEN
    v_scope := 'free';
    v_bio_tier := 'free';
    v_ig_tier := 'free';
    v_bio_max_links := 5;
    v_bio_max_gallery := 3;
    v_bio_max_blog := 0;
    v_auto_max_rules := 1;
    v_auto_quota := 100;
    v_auto_public_replies := FALSE;
    v_auto_retention := 7;
  ELSIF p_plan_id = 'bio_creator' THEN
    v_scope := 'bio_only';
    v_bio_tier := 'creator';
    v_ig_tier := 'free';
    v_bio_max_links := 25;
    v_bio_max_gallery := 24;
    v_bio_max_blog := 20;
    v_auto_max_rules := 0;
    v_auto_quota := 0;
    v_auto_public_replies := FALSE;
    v_auto_retention := 7;
  ELSIF p_plan_id = 'bio_pro' THEN
    v_scope := 'bio_only';
    v_bio_tier := 'pro';
    v_ig_tier := 'free';
    v_bio_max_links := NULL;
    v_bio_max_gallery := 100;
    v_bio_max_blog := NULL;
    v_bio_remove_branding := TRUE;
    v_bio_export_analytics := TRUE;
    v_auto_max_rules := 0;
    v_auto_quota := 0;
    v_auto_public_replies := FALSE;
    v_auto_retention := 7;
  ELSIF p_plan_id = 'ig_creator' THEN
    v_scope := 'automation_only';
    v_bio_tier := 'free';
    v_ig_tier := 'creator';
    v_bio_max_links := 0;
    v_bio_max_gallery := 0;
    v_bio_max_blog := 0;
    v_auto_max_rules := 10;
    v_auto_quota := 2500;
    v_auto_public_replies := TRUE;
    v_auto_retention := 30;
  ELSIF p_plan_id = 'ig_pro' THEN
    v_scope := 'automation_only';
    v_bio_tier := 'free';
    v_ig_tier := 'pro';
    v_bio_max_links := 0;
    v_bio_max_gallery := 0;
    v_bio_max_blog := 0;
    v_auto_max_rules := NULL;
    v_auto_quota := 25000;
    v_auto_public_replies := TRUE;
    v_auto_retention := 365;
  ELSIF p_plan_id = 'bundle_creator' THEN
    v_scope := 'bundle';
    v_bio_tier := 'creator';
    v_ig_tier := 'creator';
    v_bio_max_links := 25;
    v_bio_max_gallery := 24;
    v_bio_max_blog := 20;
    v_auto_max_rules := 10;
    v_auto_quota := 2500;
    v_auto_public_replies := TRUE;
    v_auto_retention := 30;
  ELSIF p_plan_id = 'bundle_pro' THEN
    v_scope := 'bundle';
    v_bio_tier := 'pro';
    v_ig_tier := 'pro';
    v_bio_max_links := NULL;
    v_bio_max_gallery := 100;
    v_bio_max_blog := NULL;
    v_bio_remove_branding := TRUE;
    v_bio_export_analytics := TRUE;
    v_auto_max_rules := NULL;
    v_auto_quota := 25000;
    v_auto_public_replies := TRUE;
    v_auto_retention := 365;
  ELSE
    RAISE EXCEPTION 'Unknown plan_id: %', p_plan_id;
  END IF;

  v_module := CASE
    WHEN p_plan_id LIKE 'bio_%' THEN 'bio'::public.product_module
    WHEN p_plan_id LIKE 'ig_%' THEN 'instagram_automation'::public.product_module
    ELSE 'bundle'::public.product_module
  END;

  v_override := COALESCE(p_override_reason, 'ACTIVE_PLAN:' || p_plan_id || ':' || v_scope);

  -- Atomically upsert workspace_entitlements
  INSERT INTO public.workspace_entitlements (
    workspace_id,
    bio_tier,
    ig_tier,
    bio_max_links,
    bio_max_gallery_items,
    bio_max_blog_posts,
    bio_remove_branding,
    bio_export_analytics,
    automation_max_active_rules,
    automation_monthly_action_quota,
    automation_public_replies_enabled,
    automation_log_retention_days,
    override_reason,
    updated_at
  )
  VALUES (
    p_workspace_id,
    v_bio_tier,
    v_ig_tier,
    v_bio_max_links,
    v_bio_max_gallery,
    v_bio_max_blog,
    v_bio_remove_branding,
    v_bio_export_analytics,
    v_auto_max_rules,
    v_auto_quota,
    v_auto_public_replies,
    v_auto_retention,
    v_override,
    NOW()
  )
  ON CONFLICT (workspace_id)
  DO UPDATE SET
    bio_tier = EXCLUDED.bio_tier,
    ig_tier = EXCLUDED.ig_tier,
    bio_max_links = EXCLUDED.bio_max_links,
    bio_max_gallery_items = EXCLUDED.bio_max_gallery_items,
    bio_max_blog_posts = EXCLUDED.bio_max_blog_posts,
    bio_remove_branding = EXCLUDED.bio_remove_branding,
    bio_export_analytics = EXCLUDED.bio_export_analytics,
    automation_max_active_rules = EXCLUDED.automation_max_active_rules,
    automation_monthly_action_quota = EXCLUDED.automation_monthly_action_quota,
    automation_public_replies_enabled = EXCLUDED.automation_public_replies_enabled,
    automation_log_retention_days = EXCLUDED.automation_log_retention_days,
    override_reason = EXCLUDED.override_reason,
    updated_at = NOW();

  -- Update intended_modules in workspaces table
  UPDATE public.workspaces
     SET intended_modules = CASE
           WHEN v_scope = 'bio_only' THEN ARRAY['bio']::TEXT[]
           WHEN v_scope = 'automation_only' THEN ARRAY['instagram_automation']::TEXT[]
           ELSE ARRAY['bio', 'instagram_automation']::TEXT[]
         END,
         updated_at = NOW()
   WHERE id = p_workspace_id;

  -- Upsert active row in subscriptions table
  INSERT INTO public.subscriptions (
    workspace_id,
    plan_id,
    plan_version,
    module,
    billing_interval,
    currency,
    status,
    current_period_start,
    current_period_end
  )
  VALUES (
    p_workspace_id,
    p_plan_id,
    1,
    v_module,
    CASE WHEN p_billing_interval = 'annual' THEN 'annual'::public.billing_interval ELSE 'monthly'::public.billing_interval END,
    'USD',
    'active',
    NOW(),
    NOW() + INTERVAL '1 month'
  )
  ON CONFLICT (workspace_id)
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    plan_version = 1,
    module = EXCLUDED.module,
    billing_interval = EXCLUDED.billing_interval,
    currency = EXCLUDED.currency,
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW();

  v_result := jsonb_build_object(
    'ok', TRUE,
    'success', TRUE,
    'workspace_id', p_workspace_id,
    'plan_id', p_plan_id,
    'scope', v_scope,
    'module', v_module,
    'bio_tier', v_bio_tier,
    'ig_tier', v_ig_tier
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_workspace_plan_entitlements(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_workspace_plan_entitlements(UUID, TEXT, TEXT, TEXT) TO service_role;

-- 3. Super Admin Workspace Status & Suspension Override RPC
CREATE OR REPLACE FUNCTION public.admin_override_workspace_status(
  p_workspace_id UUID,
  p_status TEXT,
  p_override_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_status TEXT;
  v_reason TEXT;
  v_result JSONB;
BEGIN
  IF p_status NOT IN ('active', 'suspended', 'past_due', 'closed_anonymized') THEN
    RAISE EXCEPTION 'Invalid workspace status: %', p_status;
  END IF;

  SELECT status INTO v_old_status FROM public.workspaces WHERE id = p_workspace_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace % not found', p_workspace_id;
  END IF;

  v_reason := COALESCE(NULLIF(trim(p_override_reason), ''), 'Status override to ' || p_status);

  UPDATE public.workspaces
     SET status = p_status,
         suspended_reason = CASE WHEN p_status = 'suspended' THEN v_reason ELSE NULL END,
         updated_at = NOW()
   WHERE id = p_workspace_id;

  INSERT INTO public.admin_audit_logs (
    actor_role,
    action,
    target_type,
    target_id,
    before_summary,
    after_summary,
    reason,
    result_status
  ) VALUES (
    'super_admin',
    'ADMIN_OVERRIDE_WORKSPACE_STATUS',
    'workspace',
    p_workspace_id::TEXT,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_status, 'suspended_reason', CASE WHEN p_status = 'suspended' THEN v_reason ELSE NULL END),
    v_reason,
    'success'
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'success', TRUE,
    'workspace_id', p_workspace_id,
    'old_status', v_old_status,
    'status', p_status,
    'updated_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_override_workspace_status(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_override_workspace_status(UUID, TEXT, TEXT) TO service_role;

COMMIT;

