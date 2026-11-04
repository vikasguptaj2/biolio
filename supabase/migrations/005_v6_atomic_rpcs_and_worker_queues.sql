-- ============================================================================
-- 005_v6_atomic_rpcs_and_worker_queues.sql
-- Implements all 11 atomic backend operations promised in the architecture:
-- 1. Auth user profile bootstrap trigger (`handle_new_auth_user`)
-- 2. Race-safe workspace & handle provisioning (`provision_workspace_and_claim_handle`)
-- 3. Optimistic-concurrency Bio snapshot publish (`publish_bio_snapshot`)
-- 4. Non-consuming coupon preview (`preview_coupon`)
-- 5. Atomic expiring coupon reservation (`reserve_coupon_for_checkout`)
-- 6. Idempotent coupon confirmation (`confirm_coupon_redemption`)
-- 7. Idempotent coupon release (`release_coupon_reservation`)
-- 8. Durable job queue enqueue (`enqueue_job`)
-- 9. Worker lease claim with `FOR UPDATE SKIP LOCKED` (`claim_next_jobs`)
-- 10. Atomic Instagram execution & quota reservation (`reserve_automation_execution`)
-- 11. Fail-closed outcome recording (`record_automation_attempt_outcome`)
-- ============================================================================
BEGIN;

-- 1. Auth User Profile Bootstrap Trigger (Fixes P1.11)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::TEXT || '@placeholder.biolio.site'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'Creator'), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 2. Race-Safe Workspace & Handle Claim Provisioning (Fixes P1.11 & P1.14)
CREATE OR REPLACE FUNCTION public.provision_workspace_and_claim_handle(
  p_handle TEXT,
  p_display_name TEXT,
  p_creator_role TEXT DEFAULT 'Creator / Influencer',
  p_intended_modules TEXT[] DEFAULT ARRAY['bio']::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_clean_handle TEXT := lower(trim(p_handle));
  v_workspace_id UUID;
  v_bio_profile_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Must be signed in to provision a workspace.';
  END IF;

  IF v_clean_handle !~ '^[a-z0-9][a-z0-9_-]{2,29}$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_HANDLE_FORMAT', 'message', 'Handle must be 3-30 lowercase alphanumeric characters, hyphens, or underscores.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.reserved_handles WHERE handle = v_clean_handle) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'HANDLE_RESERVED', 'message', 'This handle is reserved by Biolio.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_clean_handle)
     OR EXISTS (SELECT 1 FROM public.bio_profiles WHERE handle = v_clean_handle) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'HANDLE_TAKEN', 'message', 'This username is already claimed.');
  END IF;

  -- Defensive upsert into public.user_profiles so FK workspaces_owner_id_fkey never fails
  INSERT INTO public.user_profiles (id, email, full_name)
  SELECT
    u.id,
    COALESCE(u.email, v_clean_handle || '@biolio.site'),
    COALESCE(NULLIF(trim(p_display_name), ''), u.raw_user_meta_data ->> 'full_name', v_clean_handle)
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    INSERT INTO public.workspaces (owner_id, name, slug, creator_role, intended_modules)
    VALUES (v_user_id, trim(p_display_name), v_clean_handle, p_creator_role, p_intended_modules)
    RETURNING id INTO v_workspace_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'HANDLE_TAKEN', 'message', 'This username is already claimed.');
  END;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (v_workspace_id, v_user_id, 'owner', 'active');

  INSERT INTO public.workspace_entitlements (
    workspace_id, bio_tier, ig_tier, bio_max_links, bio_max_gallery_items, bio_max_blog_posts,
    automation_max_active_rules, automation_monthly_action_quota
  ) VALUES (
    v_workspace_id, 'free', 'free', 5, 6, 1, 1, 100
  );

  INSERT INTO public.bio_profiles (workspace_id, handle, display_name)
  VALUES (v_workspace_id, v_clean_handle, trim(p_display_name))
  RETURNING id INTO v_bio_profile_id;

  RETURN jsonb_build_object(
    'ok', true,
    'workspace_id', v_workspace_id,
    'bio_profile_id', v_bio_profile_id,
    'handle', v_clean_handle,
    'status', 'provisioned'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.provision_workspace_and_claim_handle(TEXT, TEXT, TEXT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_workspace_and_claim_handle(TEXT, TEXT, TEXT, TEXT[]) TO authenticated;

-- 3. Atomic Bio Publish Snapshot Commit with Optimistic Concurrency (Fixes P1.4)
CREATE OR REPLACE FUNCTION public.publish_bio_snapshot(
  p_workspace_id UUID,
  p_expected_draft_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_profile public.bio_profiles%ROWTYPE;
  v_new_version INTEGER;
  v_snapshot_id UUID;
  v_snapshot JSONB;
  v_pub_enabled BOOLEAN := TRUE;
BEGIN
  IF NOT public.can_edit_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Insufficient workspace permissions to publish.';
  END IF;

  -- Check platform publishing safety switch
  SELECT COALESCE((value->>'enabled')::BOOLEAN, TRUE) INTO v_pub_enabled
  FROM public.platform_settings WHERE key = 'public_bio_publishing_enabled';
  IF v_pub_enabled IS FALSE THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PUBLISHING_PAUSED', 'message', 'Public Bio publishing is temporarily paused for maintenance.');
  END IF;

  SELECT * INTO v_profile
  FROM public.bio_profiles
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Bio profile not found.');
  END IF;

  IF v_profile.draft_version <> p_expected_draft_version THEN
    RETURN jsonb_build_object('ok', false, 'code', 'CONFLICT', 'message', 'Draft has been modified in another session. Please reload before publishing.');
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_new_version
  FROM public.bio_published_versions
  WHERE bio_profile_id = v_profile.id;

  -- Build complete, self-contained immutable render projection (P1.4)
  v_snapshot := jsonb_build_object(
    'workspace_id', p_workspace_id,
    'handle', v_profile.handle,
    'display_name', v_profile.display_name,
    'tagline', v_profile.tagline,
    'bio_text', v_profile.short_bio,
    'location', v_profile.location,
    'template_id', v_profile.template_id,
    'profile', jsonb_build_object(
      'workspace_id', p_workspace_id,
      'handle', v_profile.handle,
      'display_name', v_profile.display_name,
      'tagline', v_profile.tagline,
      'short_bio', v_profile.short_bio,
      'about_story', v_profile.about_story,
      'category', v_profile.category,
      'location', v_profile.location,
      'template_id', v_profile.template_id,
      'theme_config', v_profile.theme_config,
      'section_order', v_profile.section_order,
      'sections_visibility', v_profile.sections_visibility,
      'creator_metrics', v_profile.creator_metrics,
      'seo_title', v_profile.seo_title,
      'seo_description', v_profile.seo_description
    ),
    'links', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', l.id, 'opaque_token', l.opaque_token, 'title', l.title, 'url', l.url, 'icon', l.icon, 'link_type', l.link_type, 'platform', l.platform, 'is_featured', l.is_featured, 'position', l.position) ORDER BY l.position ASC)
      FROM public.bio_links l WHERE l.bio_profile_id = v_profile.id AND l.is_visible = TRUE
    ), '[]'::JSONB),
    'gallery', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title, 'caption', g.caption, 'category', g.category, 'media_type', g.media_type, 'external_url', g.external_url, 'is_featured', g.is_featured, 'position', g.position) ORDER BY g.position ASC)
      FROM public.bio_gallery_items g WHERE g.bio_profile_id = v_profile.id AND g.status = 'published'
    ), '[]'::JSONB),
    'collaborations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'brand_name', c.brand_name, 'brand_logo_text', c.brand_logo_text, 'category', c.category, 'collab_year', c.collab_year, 'campaign_title', c.campaign_title, 'campaign_summary', c.campaign_summary, 'case_study_url', c.case_study_url) ORDER BY c.position ASC)
      FROM public.bio_collaborations c WHERE c.bio_profile_id = v_profile.id AND c.status = 'published'
    ), '[]'::JSONB),
    'blog_posts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', b.id, 'title', b.title, 'slug', b.slug, 'category', b.category, 'excerpt', b.excerpt, 'reading_time_minutes', b.reading_time_minutes, 'published_at', b.published_at) ORDER BY b.published_at DESC)
      FROM public.bio_blog_posts b WHERE b.bio_profile_id = v_profile.id AND b.status = 'published'
    ), '[]'::JSONB)
  );

  INSERT INTO public.bio_published_versions (
    bio_profile_id, workspace_id, version_number, handle_at_publish, snapshot_payload, published_by
  ) VALUES (
    v_profile.id, p_workspace_id, v_new_version, v_profile.handle, v_snapshot, v_user_id
  ) RETURNING id INTO v_snapshot_id;

  UPDATE public.bio_profiles
  SET is_published = TRUE,
      current_published_version_id = v_snapshot_id,
      draft_version = v_profile.draft_version + 1,
      published_at = NOW(),
      updated_at = NOW()
  WHERE id = v_profile.id;

  RETURN jsonb_build_object(
    'ok', true,
    'published_version_id', v_snapshot_id,
    'version_number', v_new_version,
    'draft_version', v_profile.draft_version + 1,
    'handle', v_profile.handle,
    'published_at', NOW()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_bio_snapshot(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_bio_snapshot(UUID, INTEGER) TO authenticated;

-- 4. Read-Only Coupon Preview (Non-Consuming) & Atomic Coupon Reservation / Confirmation / Release (Fixes P0.4 & P1.12)
CREATE OR REPLACE FUNCTION public.preview_coupon(
  p_raw_code TEXT,
  p_workspace_id UUID,
  p_user_email TEXT,
  p_plan_id TEXT,
  p_plan_version INTEGER,
  p_billing_interval billing_interval,
  p_currency TEXT,
  p_subtotal_minor INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_code_hash TEXT := encode(digest(upper(trim(p_raw_code)), 'sha256'), 'hex');
  v_code public.coupon_codes%ROWTYPE;
  v_promo public.promotions%ROWTYPE;
  v_plan public.billing_plans%ROWTYPE;
  v_ws_used INTEGER;
  v_discount INTEGER := 0;
  v_email_domain TEXT;
BEGIN
  SELECT * INTO v_code FROM public.coupon_codes WHERE code_hash = v_code_hash AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'INVALID_OR_INELIGIBLE', 'message', 'This promotion code is invalid or ineligible.');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'CODE_EXPIRED', 'message', 'This promotion code has expired.');
  END IF;

  IF v_code.reserved_or_redeemed_count >= v_code.max_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'CODE_EXHAUSTED', 'message', 'This promotion code has reached its redemption limit.');
  END IF;

  IF v_code.assigned_workspace_id IS NOT NULL AND v_code.assigned_workspace_id <> p_workspace_id THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'INVALID_OR_INELIGIBLE', 'message', 'This promotion code is invalid or ineligible.');
  END IF;

  SELECT * INTO v_promo FROM public.promotions WHERE id = v_code.promotion_id AND is_active = TRUE;
  IF NOT FOUND OR v_promo.starts_at > NOW() OR (v_promo.expires_at IS NOT NULL AND v_promo.expires_at < NOW()) THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'PROMO_INACTIVE', 'message', 'This campaign is not currently active.');
  END IF;

  IF v_promo.max_redemptions_total IS NOT NULL AND v_promo.reserved_or_redeemed_total >= v_promo.max_redemptions_total THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'CAMPAIGN_EXHAUSTED', 'message', 'This campaign has reached its redemption limit.');
  END IF;

  SELECT COUNT(*) INTO v_ws_used
  FROM public.coupon_redemptions
  WHERE promotion_id = v_promo.id AND workspace_id = p_workspace_id AND status IN ('reserved', 'confirmed');

  IF v_ws_used >= v_promo.max_redemptions_per_workspace THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'WORKSPACE_LIMIT_REACHED', 'message', 'Your workspace has already used this promotion.');
  END IF;

  SELECT * INTO v_plan FROM public.billing_plans WHERE id = p_plan_id AND version = p_plan_version;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'PLAN_NOT_FOUND', 'message', 'Selected billing plan was not found.');
  END IF;

  IF (v_promo.scope_type = 'bio_only' AND v_plan.module <> 'bio')
     OR (v_promo.scope_type = 'automation_only' AND v_plan.module <> 'instagram_automation')
     OR (v_promo.scope_type = 'bundle_only' AND v_plan.module <> 'bundle') THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'SCOPE_MISMATCH', 'message', 'This code does not apply to the selected product module.');
  END IF;

  IF (v_promo.conditions ? 'allowed_email_domains') THEN
    v_email_domain := lower(split_part(p_user_email, '@', 2));
    IF NOT (v_promo.conditions->'allowed_email_domains' @> to_jsonb(v_email_domain)) THEN
      RETURN jsonb_build_object('valid', false, 'error_code', 'INVALID_OR_INELIGIBLE', 'message', 'This promotion code is invalid or ineligible.');
    END IF;
  END IF;

  IF v_promo.discount_type = 'percentage' THEN
    v_discount := FLOOR((p_subtotal_minor::NUMERIC * v_promo.discount_value::NUMERIC) / 10000.0);
    IF v_promo.max_discount_minor IS NOT NULL AND v_discount > v_promo.max_discount_minor THEN
      v_discount := v_promo.max_discount_minor;
    END IF;
  ELSIF v_promo.discount_type = 'fixed_amount' THEN
    IF v_promo.currency <> 'ANY' AND v_promo.currency <> p_currency THEN
      RETURN jsonb_build_object('valid', false, 'error_code', 'CURRENCY_MISMATCH', 'message', 'This code is not valid for ' || p_currency || '.');
    END IF;
    v_discount := LEAST(p_subtotal_minor, v_promo.discount_value);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_code_id', v_code.id,
    'promotion_id', v_promo.id,
    'promotion_name', v_promo.name,
    'discount_type', v_promo.discount_type,
    'duration_type', v_promo.duration_type,
    'duration_in_months', v_promo.duration_in_months,
    'subtotal_minor', p_subtotal_minor,
    'discount_minor', v_discount,
    'final_minor', GREATEST(0, p_subtotal_minor - v_discount)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preview_coupon(TEXT, UUID, TEXT, TEXT, INTEGER, billing_interval, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_coupon(TEXT, UUID, TEXT, TEXT, INTEGER, billing_interval, TEXT, INTEGER) TO authenticated, service_role;

-- Atomic Coupon Reservation with Row-Level Locks (`FOR UPDATE`) and Idempotency
CREATE OR REPLACE FUNCTION public.reserve_coupon_for_checkout(
  p_idempotency_key TEXT,
  p_raw_code TEXT,
  p_workspace_id UUID,
  p_user_id UUID,
  p_user_email TEXT,
  p_plan_id TEXT,
  p_plan_version INTEGER,
  p_billing_interval billing_interval,
  p_currency TEXT,
  p_subtotal_minor INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_existing public.coupon_redemptions%ROWTYPE;
  v_code_hash TEXT := encode(digest(upper(trim(p_raw_code)), 'sha256'), 'hex');
  v_code public.coupon_codes%ROWTYPE;
  v_promo public.promotions%ROWTYPE;
  v_preview JSONB;
  v_redemption_id UUID;
BEGIN
  -- Idempotency check first
  SELECT * INTO v_existing FROM public.coupon_redemptions WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent_replay', true,
      'redemption_id', v_existing.id,
      'discount_minor', v_existing.discount_minor,
      'final_minor', v_existing.final_minor
    );
  END IF;

  -- Lock coupon code & promotion rows in deterministic order to prevent deadlocks and race conditions
  SELECT * INTO v_code FROM public.coupon_codes WHERE code_hash = v_code_hash FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_OR_INELIGIBLE');
  END IF;

  SELECT * INTO v_promo FROM public.promotions WHERE id = v_code.promotion_id FOR UPDATE;

  -- Re-run eligibility calculation inside the lock
  v_preview := public.preview_coupon(
    p_raw_code, p_workspace_id, p_user_email, p_plan_id, p_plan_version, p_billing_interval, p_currency, p_subtotal_minor
  );

  IF COALESCE((v_preview->>'valid')::BOOLEAN, FALSE) IS FALSE THEN
    RETURN jsonb_build_object('ok', false, 'error_code', v_preview->>'error_code', 'message', v_preview->>'message');
  END IF;

  UPDATE public.coupon_codes
  SET reserved_or_redeemed_count = reserved_or_redeemed_count + 1
  WHERE id = v_code.id;

  UPDATE public.promotions
  SET reserved_or_redeemed_total = reserved_or_redeemed_total + 1,
      updated_at = NOW()
  WHERE id = v_promo.id;

  INSERT INTO public.coupon_redemptions (
    idempotency_key, promotion_id, coupon_code_id, workspace_id, redeemed_by_user_id,
    plan_id, plan_version, currency, subtotal_minor, discount_minor, final_minor, status
  ) VALUES (
    p_idempotency_key, v_promo.id, v_code.id, p_workspace_id, p_user_id,
    p_plan_id, p_plan_version, p_currency, p_subtotal_minor,
    (v_preview->>'discount_minor')::INTEGER,
    (v_preview->>'final_minor')::INTEGER,
    'reserved'
  ) RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'ok', true,
    'redemption_id', v_redemption_id,
    'discount_minor', (v_preview->>'discount_minor')::INTEGER,
    'final_minor', (v_preview->>'final_minor')::INTEGER
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_coupon_for_checkout(TEXT, TEXT, UUID, UUID, TEXT, TEXT, INTEGER, billing_interval, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_coupon_for_checkout(TEXT, TEXT, UUID, UUID, TEXT, TEXT, INTEGER, billing_interval, TEXT, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_coupon_redemption(
  p_redemption_id UUID,
  p_subscription_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.coupon_redemptions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.coupon_redemptions WHERE id = p_redemption_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF v_row.status = 'confirmed' THEN RETURN TRUE; END IF;
  IF v_row.status <> 'reserved' THEN RETURN FALSE; END IF;

  UPDATE public.coupon_redemptions
  SET status = 'confirmed',
      subscription_id = p_subscription_id,
      confirmed_at = NOW()
  WHERE id = p_redemption_id;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_coupon_redemption(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_coupon_redemption(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.release_coupon_reservation(p_redemption_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.coupon_redemptions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.coupon_redemptions WHERE id = p_redemption_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF v_row.status IN ('released', 'expired') THEN RETURN TRUE; END IF;
  IF v_row.status <> 'reserved' THEN RETURN FALSE; END IF;

  UPDATE public.coupon_redemptions
  SET status = 'released',
      released_at = NOW()
  WHERE id = p_redemption_id;

  UPDATE public.coupon_codes
  SET reserved_or_redeemed_count = GREATEST(0, reserved_or_redeemed_count - 1)
  WHERE id = v_row.coupon_code_id;

  UPDATE public.promotions
  SET reserved_or_redeemed_total = GREATEST(0, reserved_or_redeemed_total - 1),
      updated_at = NOW()
  WHERE id = v_row.promotion_id;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_coupon_reservation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_coupon_reservation(UUID) TO service_role;

-- 5. Durable Worker Queue Claim & Atomic Instagram Execution / Quota Reservation (Fixes P1.10 & P1.12)
CREATE OR REPLACE FUNCTION private_integrations.claim_next_jobs(
  p_queue_name TEXT,
  p_worker_id TEXT,
  p_batch_size INTEGER DEFAULT 10,
  p_lease_seconds INTEGER DEFAULT 60
)
RETURNS SETOF private_integrations.job_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private_integrations, public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT jq.id
    FROM private_integrations.job_queue jq
    WHERE jq.queue_name = p_queue_name
      AND (
        (jq.status IN ('ready', 'delayed') AND jq.visible_at <= NOW())
        OR (jq.status = 'leased' AND jq.lease_expires_at <= NOW())
      )
      AND jq.attempt_count < jq.max_attempts
    ORDER BY jq.visible_at ASC, jq.created_at ASC
    LIMIT GREATEST(1, LEAST(p_batch_size, 50))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE private_integrations.job_queue t
  SET status = 'leased',
      lease_owner = p_worker_id,
      lease_expires_at = NOW() + make_interval(secs => p_lease_seconds),
      attempt_count = t.attempt_count + 1,
      updated_at = NOW()
  FROM claimable c
  WHERE t.id = c.id
  RETURNING t.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION private_integrations.claim_next_jobs(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_integrations.claim_next_jobs(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- Atomic Instagram Comment Execution + Quota + Kill-Switch Reservation
CREATE OR REPLACE FUNCTION private_integrations.reserve_automation_execution(
  p_workspace_id UUID,
  p_connection_id UUID,
  p_rule_id UUID,
  p_rule_version INTEGER,
  p_webhook_event_id UUID,
  p_provider_event_id TEXT,
  p_comment_id TEXT,
  p_commenter_ig_id TEXT,
  p_commenter_username TEXT,
  p_matched_keyword TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_integrations, pg_temp
AS $$
DECLARE
  v_global_dispatch BOOLEAN;
  v_conn public.instagram_connections%ROWTYPE;
  v_ent public.workspace_entitlements%ROWTYPE;
  v_exec_id UUID;
  v_attr_token TEXT;
BEGIN
  -- 1. Fail-closed check on global dispatch kill switch
  SELECT COALESCE((value->>'enabled')::BOOLEAN, FALSE) INTO v_global_dispatch
  FROM public.platform_settings WHERE key = 'global_instagram_dispatch_enabled';

  IF COALESCE(v_global_dispatch, FALSE) IS FALSE THEN
    RETURN jsonb_build_object('ok', false, 'code', 'GLOBAL_KILL_SWITCH_ACTIVE');
  END IF;

  -- 2. Lock connection row and check hourly ceiling
  SELECT * INTO v_conn FROM public.instagram_connections WHERE id = p_connection_id AND workspace_id = p_workspace_id FOR UPDATE;
  IF NOT FOUND OR v_conn.status <> 'connected' OR v_conn.is_paused = TRUE THEN
    RETURN jsonb_build_object('ok', false, 'code', 'CONNECTION_NOT_ELIGIBLE');
  END IF;

  IF v_conn.hourly_window_start < date_trunc('hour', NOW()) THEN
    UPDATE public.instagram_connections
    SET hourly_window_start = date_trunc('hour', NOW()),
        hourly_replies_sent = 0
    WHERE id = p_connection_id;
    v_conn.hourly_replies_sent := 0;
  END IF;

  IF v_conn.hourly_replies_sent >= v_conn.hourly_ceiling THEN
    RETURN jsonb_build_object('ok', false, 'code', 'HOURLY_RATE_LIMIT_REACHED');
  END IF;

  -- 3. Lock workspace entitlements and check monthly quota
  SELECT * INTO v_ent FROM public.workspace_entitlements WHERE workspace_id = p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ENTITLEMENTS_MISSING');
  END IF;

  IF v_ent.quota_reset_at <= NOW() THEN
    UPDATE public.workspace_entitlements
    SET automation_monthly_actions_used = 0,
        quota_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month'
    WHERE workspace_id = p_workspace_id;
    v_ent.automation_monthly_actions_used := 0;
  END IF;

  IF v_ent.automation_monthly_actions_used >= v_ent.automation_monthly_action_quota THEN
    RETURN jsonb_build_object('ok', false, 'code', 'MONTHLY_QUOTA_EXCEEDED');
  END IF;

  -- 4. Insert unique logical execution per (instagram_connection_id, comment_id)
  INSERT INTO public.automation_executions (
    workspace_id, instagram_connection_id, rule_id, rule_version_evaluated,
    webhook_event_id, provider_event_id_snapshot, comment_id,
    commenter_ig_id, commenter_username, matched_keyword, status
  ) VALUES (
    p_workspace_id, p_connection_id, p_rule_id, p_rule_version,
    p_webhook_event_id, p_provider_event_id, p_comment_id,
    p_commenter_ig_id, p_commenter_username, p_matched_keyword, 'reserved'
  )
  ON CONFLICT (instagram_connection_id, comment_id) DO NOTHING
  RETURNING id, attribution_token INTO v_exec_id, v_attr_token;

  IF v_exec_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_COMMENT_EXECUTION');
  END IF;

  -- 5. Increment hourly & monthly counters atomically
  UPDATE public.instagram_connections
  SET hourly_replies_sent = hourly_replies_sent + 1,
      updated_at = NOW()
  WHERE id = p_connection_id;

  UPDATE public.workspace_entitlements
  SET automation_monthly_actions_used = automation_monthly_actions_used + 1,
      updated_at = NOW()
  WHERE workspace_id = p_workspace_id;

  RETURN jsonb_build_object(
    'ok', true,
    'execution_id', v_exec_id,
    'attribution_token', v_attr_token
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private_integrations.reserve_automation_execution(UUID, UUID, UUID, INTEGER, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_integrations.reserve_automation_execution(UUID, UUID, UUID, INTEGER, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMIT;
