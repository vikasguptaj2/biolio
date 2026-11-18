-- =============================================================================
-- BIOLIO V6.0 HARDENED ENTERPRISE MIGRATION — PHASE 17
-- Tiptap Rich-Text CMS Schema & Full-Text Search Optimization
-- Closes Audit Findings: F-01, F-09, Blog CMS Spec (A-N)
-- File: supabase/migrations/017_v6_tiptap_and_stable_bio_persistence.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ADD TIPTAP CANONICAL JSON & TEXT SEARCH COLUMNS TO BIO_BLOG_POSTS
-- =============================================================================
ALTER TABLE public.bio_blog_posts
  ADD COLUMN IF NOT EXISTS content_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS content_schema_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content_text TEXT NOT NULL DEFAULT '';

-- =============================================================================
-- 2. CREATE POSTGRESQL FULL-TEXT SEARCH GIN INDEX ON ARTICLES
-- Indexes title, excerpt, and extracted plain text for high-performance search
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_bio_blog_posts_fts
  ON public.bio_blog_posts
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content_text, '')));

-- =============================================================================
-- 3. ENSURE STABLE INDEXING ON SLUG & WORKSPACE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_bio_blog_posts_workspace_status
  ON public.bio_blog_posts(workspace_id, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_bio_blog_posts_profile_slug
  ON public.bio_blog_posts(bio_profile_id, slug);

-- =============================================================================
-- 4. UPDATE PUBLISH_BIO_SNAPSHOT RPC TO INCLUDE TIPTAP CANONICAL CONTENT
-- Ensures immutable published snapshots include full rich-text schema
-- =============================================================================
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

  -- Build complete, self-contained immutable render projection with Tiptap nodes
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
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id,
        'opaque_token', l.opaque_token,
        'title', l.title,
        'url', l.url,
        'icon', l.icon,
        'link_type', l.link_type,
        'platform', l.platform,
        'is_featured', l.is_featured,
        'position', l.position
      ) ORDER BY l.position ASC)
      FROM public.bio_links l WHERE l.bio_profile_id = v_profile.id AND l.is_visible = TRUE
    ), '[]'::JSONB),
    'gallery', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', g.id,
        'title', g.title,
        'caption', g.caption,
        'category', g.category,
        'media_type', g.media_type,
        'external_url', g.external_url,
        'is_featured', g.is_featured,
        'position', g.position
      ) ORDER BY g.position ASC)
      FROM public.bio_gallery_items g WHERE g.bio_profile_id = v_profile.id AND g.status = 'published'
    ), '[]'::JSONB),
    'collaborations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'brand_name', c.brand_name,
        'brand_logo_text', c.brand_logo_text,
        'category', c.category,
        'collab_year', c.collab_year,
        'campaign_title', c.campaign_title,
        'campaign_summary', c.campaign_summary,
        'case_study_url', c.case_study_url
      ) ORDER BY c.position ASC)
      FROM public.bio_collaborations c WHERE c.bio_profile_id = v_profile.id AND c.status = 'published'
    ), '[]'::JSONB),
    'blog_posts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', b.id,
        'title', b.title,
        'slug', b.slug,
        'category', b.category,
        'excerpt', b.excerpt,
        'content_json', b.content_json,
        'content_text', b.content_text,
        'sanitized_html', b.sanitized_html,
        'reading_time_minutes', b.reading_time_minutes,
        'published_at', b.published_at
      ) ORDER BY b.published_at DESC)
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

COMMIT;

