-- =============================================================================
-- 015_coupon_and_billing_alignment.sql
-- Closes Findings: F-04, F-05, F-16 (BILLING_AND_COUPONS.md §6.2, DATABASE.md §3)
-- Unified coupon hash contract and checkout session foreign key integrity
-- =============================================================================

BEGIN;

-- 1. Index on checkout_sessions for webhook reconciliation
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_razorpay_order
  ON public.checkout_sessions (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_workspace_status
  ON public.checkout_sessions (workspace_id, status);

-- 2. Enhanced preview_coupon supporting direct hash contract (F-05)
CREATE OR REPLACE FUNCTION public.preview_coupon(
  p_raw_code TEXT,
  p_workspace_id UUID,
  p_user_email TEXT,
  p_plan_id TEXT,
  p_plan_version INTEGER,
  p_billing_interval public.billing_interval,
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
  v_code public.coupon_codes%ROWTYPE;
  v_promo public.promotions%ROWTYPE;
  v_plan public.billing_plans%ROWTYPE;
  v_ws_used INTEGER;
  v_discount INTEGER := 0;
  v_email_domain TEXT;
BEGIN
  -- Match either direct server-computed HMAC hash (hashCouponCode) or legacy sha256 digest
  SELECT * INTO v_code
    FROM public.coupon_codes
   WHERE (code_hash = p_raw_code OR code_hash = encode(digest(upper(trim(p_raw_code)), 'sha256'), 'hex'))
     AND is_active = TRUE
   LIMIT 1;

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
    v_discount := LEAST(p_subtotal_minor, v_promo.discount_value);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'duration_type', v_promo.duration_type,
    'duration_in_months', v_promo.duration_in_months,
    'subtotal_minor', p_subtotal_minor,
    'discount_minor', v_discount,
    'final_minor', GREATEST(0, p_subtotal_minor - v_discount),
    'final_amount_minor', GREATEST(0, p_subtotal_minor - v_discount),
    'message', 'Promotion applied successfully.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preview_coupon(TEXT, UUID, TEXT, TEXT, INTEGER, public.billing_interval, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_coupon(TEXT, UUID, TEXT, TEXT, INTEGER, public.billing_interval, TEXT, INTEGER) TO service_role;

-- 3. Enhanced reserve_coupon_for_checkout supporting direct hash contract (F-05)
CREATE OR REPLACE FUNCTION public.reserve_coupon_for_checkout(
  p_idempotency_key TEXT,
  p_raw_code TEXT,
  p_workspace_id UUID,
  p_user_id UUID,
  p_user_email TEXT,
  p_plan_id TEXT,
  p_plan_version INTEGER,
  p_billing_interval public.billing_interval,
  p_subtotal_minor INTEGER,
  p_currency TEXT DEFAULT 'INR'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_existing public.coupon_redemptions%ROWTYPE;
  v_code public.coupon_codes%ROWTYPE;
  v_promo public.promotions%ROWTYPE;
  v_preview JSONB;
  v_redemption_id UUID;
BEGIN
  -- Idempotency check
  SELECT * INTO v_existing FROM public.coupon_redemptions WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'valid', true,
      'ok', true,
      'idempotent_replay', true,
      'redemption_id', v_existing.id,
      'discount_minor', v_existing.discount_minor,
      'final_amount_minor', v_existing.final_minor,
      'final_minor', v_existing.final_minor
    );
  END IF;

  -- Lock coupon code & promotion rows
  SELECT * INTO v_code
    FROM public.coupon_codes
   WHERE (code_hash = p_raw_code OR code_hash = encode(digest(upper(trim(p_raw_code)), 'sha256'), 'hex'))
     AND is_active = TRUE
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'ok', false, 'error_code', 'INVALID_OR_INELIGIBLE', 'message', 'Coupon is invalid.');
  END IF;

  SELECT * INTO v_promo FROM public.promotions WHERE id = v_code.promotion_id FOR UPDATE;

  -- Re-evaluate with preview logic
  v_preview := public.preview_coupon(
    p_raw_code, p_workspace_id, p_user_email, p_plan_id, p_plan_version, p_billing_interval, p_currency, p_subtotal_minor
  );

  IF COALESCE((v_preview->>'valid')::BOOLEAN, FALSE) IS FALSE THEN
    RETURN jsonb_build_object(
      'valid', false,
      'ok', false,
      'error_code', v_preview->>'error_code',
      'message', v_preview->>'message'
    );
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
    (v_preview->>'discount_minor')::INTEGER, (v_preview->>'final_minor')::INTEGER, 'reserved'
  ) RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'valid', true,
    'ok', true,
    'redemption_id', v_redemption_id,
    'discount_minor', (v_preview->>'discount_minor')::INTEGER,
    'final_amount_minor', (v_preview->>'final_minor')::INTEGER,
    'final_minor', (v_preview->>'final_minor')::INTEGER,
    'expires_at', NOW() + INTERVAL '30 minutes'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_coupon_for_checkout(TEXT, TEXT, UUID, UUID, TEXT, TEXT, INTEGER, public.billing_interval, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_coupon_for_checkout(TEXT, TEXT, UUID, UUID, TEXT, TEXT, INTEGER, public.billing_interval, INTEGER, TEXT) TO service_role;

COMMIT;

