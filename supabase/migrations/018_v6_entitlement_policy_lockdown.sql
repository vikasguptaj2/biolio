-- Close permissive-policy OR bypasses that let workspace members write
-- Bio content without satisfying the current module entitlement check.
-- All changes are safe to re-run and preserve existing rows and the
-- entitlement-aware replacement policies.
BEGIN;

DROP POLICY IF EXISTS members_insert_automation_templates
  ON public.automation_message_templates;
DROP POLICY IF EXISTS members_update_automation_templates
  ON public.automation_message_templates;

DROP POLICY IF EXISTS members_insert_blog_posts
  ON public.bio_blog_posts;
DROP POLICY IF EXISTS members_update_blog_posts
  ON public.bio_blog_posts;

DROP POLICY IF EXISTS members_insert_collabs
  ON public.bio_collaborations;
DROP POLICY IF EXISTS members_update_collabs
  ON public.bio_collaborations;

DROP POLICY IF EXISTS members_insert_gallery
  ON public.bio_gallery_items;
DROP POLICY IF EXISTS members_update_gallery
  ON public.bio_gallery_items;

DROP POLICY IF EXISTS members_insert_bio_profile
  ON public.bio_profiles;
DROP POLICY IF EXISTS members_update_bio_profile
  ON public.bio_profiles;

-- A trigger-only quota guard must never be callable as a general RPC by a
-- browser role. Trigger execution remains attached to its existing triggers.
REVOKE EXECUTE ON FUNCTION public.enforce_workspace_resource_quota()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_workspace_resource_quota()
  TO service_role;

COMMIT;
