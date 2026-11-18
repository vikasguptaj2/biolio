BEGIN;

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS checkout_sessions_razorpay_payment_id_key
  ON public.checkout_sessions (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- Run the verified payment projection in one transaction. The webhook event,
-- checkout session and workspace are locked so retries and concurrent payments
-- cannot create duplicate entitlements or skip their audit state.
CREATE OR REPLACE FUNCTION public.process_razorpay_payment(
  p_checkout_session_id uuid,
  p_payment_id text,
  p_amount_minor integer,
  p_currency text,
  p_provider_event_row_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session public.checkout_sessions%ROWTYPE;
  v_plan public.billing_plans%ROWTYPE;
  v_subscription_id uuid;
  v_period_end timestamptz;
  v_base_minor integer;
BEGIN
  IF p_checkout_session_id IS NULL OR p_payment_id IS NULL
     OR length(p_payment_id) > 128 OR p_amount_minor IS NULL OR p_amount_minor < 1
     OR p_currency IS NULL OR length(p_currency) <> 3 THEN
    RAISE EXCEPTION 'Invalid payment arguments.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_session
  FROM public.checkout_sessions
  WHERE id = p_checkout_session_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_session.status = 'completed' THEN
    IF v_session.razorpay_payment_id IS DISTINCT FROM p_payment_id THEN
      RAISE EXCEPTION 'Checkout session already completed with another payment.' USING ERRCODE = '23505';
    END IF;
    UPDATE public.provider_events
       SET processing_status = 'processed', processed_at = now(), workspace_id = v_session.workspace_id
     WHERE id = p_provider_event_row_id AND provider = 'razorpay';
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  IF v_session.status <> 'pending'
     OR v_session.amount_minor <> p_amount_minor
     OR upper(v_session.currency) <> upper(p_currency) THEN
    RAISE EXCEPTION 'Payment does not match the pending checkout.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_plan
  FROM public.billing_plans
  WHERE id = v_session.plan_id AND version = v_session.plan_version
    AND is_active_for_sale = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchased plan version is unavailable.' USING ERRCODE = 'P0002';
  END IF;

  -- Serialize entitlement transitions for one tenant. A second checkout can
  -- create a new subscription only after the previous active row is retired.
  PERFORM 1 FROM public.workspaces WHERE id = v_session.workspace_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout workspace no longer exists.' USING ERRCODE = 'P0002';
  END IF;

  v_base_minor := CASE v_session.billing_interval
    WHEN 'annual' THEN v_plan.price_annual_minor
    ELSE v_plan.price_monthly_minor
  END;
  IF p_amount_minor > v_base_minor THEN
    RAISE EXCEPTION 'Payment exceeds the authoritative plan price.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.subscriptions
     SET status = 'canceled', cancel_at_period_end = false, updated_at = now()
   WHERE workspace_id = v_session.workspace_id
     AND module = v_plan.module
     AND status IN ('trialing', 'active', 'past_due');

  v_period_end := CASE v_session.billing_interval
    WHEN 'annual' THEN now() + interval '1 year'
    ELSE now() + interval '1 month'
  END;

  INSERT INTO public.subscriptions (
    workspace_id, plan_id, plan_version, module, billing_interval,
    currency, base_amount_minor, discount_amount_minor, final_amount_minor,
    status, provider, provider_subscription_id,
    current_period_start, current_period_end, updated_at
  ) VALUES (
    v_session.workspace_id, v_session.plan_id, v_session.plan_version,
    v_plan.module, v_session.billing_interval,
    upper(v_session.currency), v_base_minor, v_base_minor - p_amount_minor,
    p_amount_minor, 'active', 'razorpay', p_payment_id,
    now(), v_period_end, now()
  ) RETURNING id INTO v_subscription_id;

  UPDATE public.checkout_sessions
     SET status = 'completed', razorpay_payment_id = p_payment_id,
         completed_at = now()
   WHERE id = v_session.id;

  IF v_session.coupon_redemption_id IS NOT NULL THEN
    PERFORM public.confirm_coupon_redemption(v_session.coupon_redemption_id, v_subscription_id);
  END IF;

  PERFORM public.project_workspace_entitlements(v_session.workspace_id);

  UPDATE public.provider_events
     SET processing_status = 'processed', processed_at = now(), workspace_id = v_session.workspace_id
   WHERE id = p_provider_event_row_id AND provider = 'razorpay';

  RETURN jsonb_build_object('ok', true, 'subscription_id', v_subscription_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_razorpay_refund(
  p_provider_event_row_id uuid,
  p_payment_id text,
  p_refund_amount_minor integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session public.checkout_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM public.checkout_sessions
  WHERE razorpay_payment_id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.provider_events
       SET processing_status = 'ignored_out_of_order', processed_at = now()
     WHERE id = p_provider_event_row_id AND provider = 'razorpay';
    RETURN jsonb_build_object('ok', true, 'ignored', true);
  END IF;

  IF p_refund_amount_minor = v_session.amount_minor THEN
    PERFORM 1 FROM public.workspaces WHERE id = v_session.workspace_id FOR UPDATE;
    UPDATE public.subscriptions
       SET status = 'canceled', cancel_at_period_end = false, updated_at = now()
     WHERE provider = 'razorpay' AND provider_subscription_id = p_payment_id;
    PERFORM public.project_workspace_entitlements(v_session.workspace_id);
  END IF;

  UPDATE public.provider_events
     SET processing_status = 'processed', processed_at = now(), workspace_id = v_session.workspace_id,
         redacted_summary = redacted_summary || jsonb_build_object(
           'refund_kind', CASE WHEN p_refund_amount_minor = v_session.amount_minor THEN 'full' ELSE 'partial' END
         )
   WHERE id = p_provider_event_row_id AND provider = 'razorpay';

  RETURN jsonb_build_object('ok', true, 'full_refund', p_refund_amount_minor = v_session.amount_minor);
END;
$$;

REVOKE ALL ON FUNCTION public.process_razorpay_payment(uuid, text, integer, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_razorpay_payment(uuid, text, integer, text, uuid)
  TO service_role;
REVOKE ALL ON FUNCTION public.process_razorpay_refund(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_razorpay_refund(uuid, text, integer)
  TO service_role;

-- Analytics summaries stay inside PostgreSQL, honor analytics_events RLS, and
-- return only aggregate values. Visitor hashes rotate daily, so the total is
-- deliberately labeled as visitor-days rather than cross-day unique people.
CREATE OR REPLACE FUNCTION public.get_bio_analytics(
  p_workspace_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_workspace_id IS NULL OR p_from IS NULL OR p_to IS NULL
     OR p_from >= p_to OR p_to > now() + interval '5 minutes'
     OR p_to - p_from > interval '90 days' THEN
    RAISE EXCEPTION 'Invalid analytics range.' USING ERRCODE = '22023';
  END IF;

  WITH scoped AS (
    SELECT event_type, link_id, visitor_daily_hmac,
           COALESCE(NULLIF(referrer_host, ''), 'direct') AS referrer_host,
           device_class,
           (created_at AT TIME ZONE 'UTC')::date AS event_day
      FROM public.analytics_events
     WHERE workspace_id = p_workspace_id
       AND created_at >= p_from AND created_at < p_to
  ), daily AS (
    SELECT event_day,
           count(*) FILTER (WHERE event_type = 'bio.page_view') AS page_views,
           count(*) FILTER (WHERE event_type = 'bio.link_click') AS link_clicks,
           count(*) FILTER (WHERE event_type = 'bio.blog_view') AS blog_views,
           count(*) FILTER (WHERE event_type = 'bio.contact_submit') AS inquiries,
           count(DISTINCT visitor_daily_hmac) AS visitor_days
      FROM scoped GROUP BY event_day
  )
  SELECT jsonb_build_object(
    'series', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date', event_day, 'page_views', page_views,
        'link_clicks', link_clicks, 'blog_views', blog_views,
        'inquiries', inquiries, 'visitor_days', visitor_days
      ) ORDER BY event_day) FROM daily
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'page_views', COALESCE((SELECT sum(page_views) FROM daily), 0),
      'link_clicks', COALESCE((SELECT sum(link_clicks) FROM daily), 0),
      'blog_views', COALESCE((SELECT sum(blog_views) FROM daily), 0),
      'inquiries', COALESCE((SELECT sum(inquiries) FROM daily), 0),
      'visitor_days', COALESCE((SELECT sum(visitor_days) FROM daily), 0)
    ),
    'devices', COALESCE((
      SELECT jsonb_object_agg(device_class, event_count)
        FROM (SELECT device_class, count(*) AS event_count FROM scoped GROUP BY device_class) d
    ), '{}'::jsonb),
    'referrers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('host', referrer_host, 'count', event_count) ORDER BY event_count DESC)
        FROM (SELECT referrer_host, count(*) AS event_count FROM scoped GROUP BY referrer_host ORDER BY event_count DESC LIMIT 10) r
    ), '[]'::jsonb),
    'links', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('link_id', link_id, 'count', event_count) ORDER BY event_count DESC)
        FROM (SELECT link_id, count(*) AS event_count FROM scoped WHERE event_type = 'bio.link_click' AND link_id IS NOT NULL GROUP BY link_id) l
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_bio_analytics(uuid, timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bio_analytics(uuid, timestamptz, timestamptz)
  TO authenticated;

COMMIT;
