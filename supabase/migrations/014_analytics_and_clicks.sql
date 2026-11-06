-- =============================================================================
-- 014_analytics_and_clicks.sql
-- Closes Finding: F-10 (DATABASE.md §7)
-- Analytics indexing, service-role tracking RPCs, and query optimization
-- =============================================================================

BEGIN;

-- 1. Indexing for fast analytics aggregation by workspace and target
CREATE INDEX IF NOT EXISTS idx_analytics_events_workspace_time
  ON public.analytics_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_link_time
  ON public.analytics_events (link_id, created_at DESC)
  WHERE link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_blog_time
  ON public.analytics_events (blog_post_id, created_at DESC)
  WHERE blog_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_retention
  ON public.analytics_events (retention_expires_at);

-- 2. Service-role link click tracking RPC
CREATE OR REPLACE FUNCTION public.record_link_click(
  p_link_id UUID,
  p_visitor_daily_hmac TEXT,
  p_referrer_host TEXT DEFAULT 'direct',
  p_device_class TEXT DEFAULT 'mobile'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workspace_id UUID;
  v_bio_profile_id UUID;
BEGIN
  SELECT workspace_id, bio_profile_id
    INTO v_workspace_id, v_bio_profile_id
    FROM public.bio_links
   WHERE id = p_link_id;

  IF v_workspace_id IS NOT NULL THEN
    INSERT INTO public.analytics_events (
      workspace_id,
      bio_profile_id,
      event_type,
      link_id,
      visitor_daily_hmac,
      referrer_host,
      device_class
    )
    VALUES (
      v_workspace_id,
      v_bio_profile_id,
      'bio.link_click',
      p_link_id,
      p_visitor_daily_hmac,
      COALESCE(p_referrer_host, 'direct'),
      COALESCE(p_device_class, 'mobile')
    );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_link_click FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_link_click TO service_role;

-- 3. Daily retention cleanup helper
CREATE OR REPLACE FUNCTION public.purge_expired_analytics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.analytics_events
   WHERE retention_expires_at < NOW();
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_analytics FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_analytics TO service_role;

COMMIT;

