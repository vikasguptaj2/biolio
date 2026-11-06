-- =============================================================================
-- 013_blog_and_bio_security.sql
-- Closes Findings: F-01, F-08 (DATABASE.md §4.2)
-- Column-level grants for bio_profiles and service-role protection for blog posts
-- =============================================================================

BEGIN;

-- 1. Restrict creator column mutations on bio_profiles
REVOKE INSERT, UPDATE, DELETE ON public.bio_profiles FROM authenticated;

GRANT UPDATE (
  display_name,
  tagline,
  short_bio,
  about_story,
  category,
  location,
  avatar_media_id,
  cover_media_id,
  template_id,
  theme_config,
  section_order,
  sections_visibility,
  creator_metrics,
  seo_title,
  seo_description,
  allow_indexing
) ON public.bio_profiles TO authenticated;

-- Protected columns: workspace_id, handle, is_published, current_published_version_id,
-- moderation_state, draft_version, published_at are controlled by server RPCs only.

-- 2. Restrict direct mutations on bio_blog_posts (writes routed via authenticated server actions)
REVOKE INSERT, UPDATE, DELETE ON public.bio_blog_posts FROM authenticated;
GRANT SELECT ON public.bio_blog_posts TO authenticated;
GRANT ALL ON public.bio_blog_posts TO service_role;

COMMIT;

