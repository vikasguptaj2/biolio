-- =============================================================================
-- BIOLIO V6.0 HARDENED ENTERPRISE MIGRATION — PHASE 10
-- Five-Layer Module Locking (DB RLS + Quota Triggers) & Cache-First Public Bio RPC
-- Closes Audit Findings: B-07, B-20, B-25
-- File: supabase/migrations/010_v6_five_layer_module_locks_and_public_rpc.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- 0. DEFENSIVE SCHEMA PREREQUISITES
-- Ensure workspace_entitlements has module state columns before predicates
-- =============================================================================
ALTER TABLE public.workspace_entitlements
  ADD COLUMN IF NOT EXISTS bio_state TEXT NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS ig_state TEXT NOT NULL DEFAULT 'starter';

CREATE TABLE IF NOT EXISTS public.handle_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  old_handle      TEXT NOT NULL,
  new_handle      TEXT NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redirect_until  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_handle_history_lookup
  ON public.handle_history (old_handle, redirect_until);

-- =============================================================================
-- 1. MODULE STATE PREDICATE FOR RLS & TRIGGERS (Closes B-07 Layer 3)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_module_unlocked(
  p_workspace_id UUID,
  p_module       TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.workspaces w
      JOIN public.workspace_entitlements we ON we.workspace_id = w.id
     WHERE w.id = p_workspace_id
       AND w.status IN ('active', 'past_due')
       AND (
         (p_module = 'bio' AND we.bio_state <> 'locked')
         OR
         (p_module = 'instagram_automation' AND we.ig_state <> 'locked')
       )
  );
$$;

REVOKE ALL ON FUNCTION public.is_module_unlocked(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_module_unlocked(UUID, TEXT) TO authenticated, service_role;

-- =============================================================================
-- 2. MODULE-AWARE RLS POLICIES ON BIO & AUTOMATION TABLES (Closes B-07)
-- Prevents a Bio-only customer from writing to automation_rules via PostgREST,
-- and prevents an IG-only customer from writing to bio_* tables via PostgREST.
-- =============================================================================

-- Bio Profiles
DROP POLICY IF EXISTS members_insert_bio_profiles ON public.bio_profiles;
CREATE POLICY members_insert_bio_profiles
  ON public.bio_profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

DROP POLICY IF EXISTS members_update_bio_profiles ON public.bio_profiles;
CREATE POLICY members_update_bio_profiles
  ON public.bio_profiles FOR UPDATE TO authenticated
  USING (public.can_edit_workspace(workspace_id))
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

-- Bio Links
DROP POLICY IF EXISTS members_insert_bio_links ON public.bio_links;
CREATE POLICY members_insert_bio_links
  ON public.bio_links FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

DROP POLICY IF EXISTS members_update_bio_links ON public.bio_links;
CREATE POLICY members_update_bio_links
  ON public.bio_links FOR UPDATE TO authenticated
  USING (public.can_edit_workspace(workspace_id))
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

-- Bio Gallery Items
DROP POLICY IF EXISTS members_insert_bio_gallery_items ON public.bio_gallery_items;
CREATE POLICY members_insert_bio_gallery_items
  ON public.bio_gallery_items FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

DROP POLICY IF EXISTS members_update_bio_gallery_items ON public.bio_gallery_items;
CREATE POLICY members_update_bio_gallery_items
  ON public.bio_gallery_items FOR UPDATE TO authenticated
  USING (public.can_edit_workspace(workspace_id))
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

-- Bio Collaborations
DROP POLICY IF EXISTS members_insert_bio_collaborations ON public.bio_collaborations;
CREATE POLICY members_insert_bio_collaborations
  ON public.bio_collaborations FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

DROP POLICY IF EXISTS members_update_bio_collaborations ON public.bio_collaborations;
CREATE POLICY members_update_bio_collaborations
  ON public.bio_collaborations FOR UPDATE TO authenticated
  USING (public.can_edit_workspace(workspace_id))
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

-- Bio Blog Posts
DROP POLICY IF EXISTS members_insert_bio_blog_posts ON public.bio_blog_posts;
CREATE POLICY members_insert_bio_blog_posts
  ON public.bio_blog_posts FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

DROP POLICY IF EXISTS members_update_bio_blog_posts ON public.bio_blog_posts;
CREATE POLICY members_update_bio_blog_posts
  ON public.bio_blog_posts FOR UPDATE TO authenticated
  USING (public.can_edit_workspace(workspace_id))
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

-- Automation Rules & Message Templates
DROP POLICY IF EXISTS members_insert_automation_rules ON public.automation_rules;
CREATE POLICY members_insert_automation_rules
  ON public.automation_rules FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'instagram_automation')
  );

DROP POLICY IF EXISTS members_update_automation_rules ON public.automation_rules;
CREATE POLICY members_update_automation_rules
  ON public.automation_rules FOR UPDATE TO authenticated
  USING (public.can_edit_workspace(workspace_id))
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'instagram_automation')
  );

DROP POLICY IF EXISTS members_insert_automation_message_templates ON public.automation_message_templates;
CREATE POLICY members_insert_automation_message_templates
  ON public.automation_message_templates FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'instagram_automation')
  );

DROP POLICY IF EXISTS members_update_automation_message_templates ON public.automation_message_templates;
CREATE POLICY members_update_automation_message_templates
  ON public.automation_message_templates FOR UPDATE TO authenticated
  USING (public.can_edit_workspace(workspace_id))
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'instagram_automation')
  );

-- =============================================================================
-- 3. ROW-LOCKING QUOTA ENFORCEMENT TRIGGERS (Closes B-07 Layer 3 Race Protection)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_workspace_resource_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ent   RECORD;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_ent
    FROM public.workspace_entitlements
   WHERE workspace_id = NEW.workspace_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MODULE_LOCKED: No entitlement projection found for workspace %', NEW.workspace_id
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_TABLE_NAME = 'bio_links' THEN
    IF v_ent.bio_state = 'locked' THEN
      RAISE EXCEPTION 'MODULE_LOCKED: Biolio Bio is locked on your current plan.' USING ERRCODE = 'P0001';
    END IF;
    IF v_ent.bio_max_links IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count FROM public.bio_links WHERE workspace_id = NEW.workspace_id;
      IF v_count >= v_ent.bio_max_links THEN
        RAISE EXCEPTION 'QUOTA_EXCEEDED: Bio links quota (%) reached.', v_ent.bio_max_links USING ERRCODE = 'P0001';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'bio_gallery_items' THEN
    IF v_ent.bio_state = 'locked' THEN
      RAISE EXCEPTION 'MODULE_LOCKED: Biolio Bio is locked on your current plan.' USING ERRCODE = 'P0001';
    END IF;
    IF v_ent.bio_max_gallery_items IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count FROM public.bio_gallery_items WHERE workspace_id = NEW.workspace_id;
      IF v_count >= v_ent.bio_max_gallery_items THEN
        RAISE EXCEPTION 'QUOTA_EXCEEDED: Bio gallery items quota (%) reached.', v_ent.bio_max_gallery_items USING ERRCODE = 'P0001';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'bio_blog_posts' THEN
    IF v_ent.bio_state = 'locked' THEN
      RAISE EXCEPTION 'MODULE_LOCKED: Biolio Bio is locked on your current plan.' USING ERRCODE = 'P0001';
    END IF;
    IF v_ent.bio_max_blog_posts IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count FROM public.bio_blog_posts WHERE workspace_id = NEW.workspace_id;
      IF v_count >= v_ent.bio_max_blog_posts THEN
        RAISE EXCEPTION 'QUOTA_EXCEEDED: Bio blog posts quota (%) reached.', v_ent.bio_max_blog_posts USING ERRCODE = 'P0001';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'automation_rules' THEN
    IF v_ent.ig_state = 'locked' THEN
      RAISE EXCEPTION 'MODULE_LOCKED: Instagram Automation is locked on your current plan.' USING ERRCODE = 'P0001';
    END IF;
    IF v_ent.automation_max_active_rules IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count
        FROM public.automation_rules
       WHERE workspace_id = NEW.workspace_id
         AND is_enabled = TRUE;
      IF NEW.is_enabled IS DISTINCT FROM FALSE AND v_count >= v_ent.automation_max_active_rules THEN
        RAISE EXCEPTION 'QUOTA_EXCEEDED: Active automation rules quota (%) reached.', v_ent.automation_max_active_rules USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_bio_links_quota ON public.bio_links;
CREATE TRIGGER trg_enforce_bio_links_quota
  BEFORE INSERT ON public.bio_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_resource_quota();

DROP TRIGGER IF EXISTS trg_enforce_bio_gallery_quota ON public.bio_gallery_items;
CREATE TRIGGER trg_enforce_bio_gallery_quota
  BEFORE INSERT ON public.bio_gallery_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_resource_quota();

DROP TRIGGER IF EXISTS trg_enforce_bio_blog_quota ON public.bio_blog_posts;
CREATE TRIGGER trg_enforce_bio_blog_quota
  BEFORE INSERT ON public.bio_blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_resource_quota();

DROP TRIGGER IF EXISTS trg_enforce_automation_rules_quota ON public.automation_rules;
CREATE TRIGGER trg_enforce_automation_rules_quota
  BEFORE INSERT ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_resource_quota();

-- =============================================================================
-- 4. CACHE-FIRST PUBLIC BIO READ RPC: public_get_bio(p_handle) (Closes B-20 & Layer 5)
-- Returns the published snapshot only if:
--   - profile.is_published = TRUE and moderation_state = 'normal'
--   - workspace.status IN ('active', 'past_due')
--   - owner user_profiles.account_status = 'active'
--   - workspace_entitlements.bio_state <> 'locked'
-- =============================================================================
CREATE OR REPLACE FUNCTION public.public_get_bio(p_handle TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_handle TEXT := lower(trim(p_handle));
  v_row          RECORD;
  v_redirect     RECORD;
BEGIN
  SELECT
    bp.id AS bio_profile_id,
    bp.workspace_id,
    bp.handle,
    bp.display_name,
    bp.tagline,
    bp.short_bio,
    bp.template_id,
    bp.allow_indexing,
    COALESCE(we.bio_remove_branding, false) AS remove_branding,
    bpv.version_number,
    bpv.snapshot_payload,
    bpv.published_at
  INTO v_row
  FROM public.bio_profiles bp
  JOIN public.workspaces w ON w.id = bp.workspace_id
  JOIN public.user_profiles up ON up.id = w.owner_id
  LEFT JOIN public.workspace_entitlements we ON we.workspace_id = w.id
  LEFT JOIN public.bio_published_versions bpv ON bpv.id = bp.current_published_version_id
  WHERE bp.handle = v_clean_handle
    AND bp.is_published = TRUE
    AND bp.moderation_state = 'normal'
    AND w.status IN ('active', 'past_due')
    AND up.account_status = 'active'
    AND COALESCE(we.bio_state, 'starter') <> 'locked'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'ok',
      'handle', v_row.handle,
      'workspace_id', v_row.workspace_id,
      'bio_profile_id', v_row.bio_profile_id,
      'version_number', COALESCE(v_row.version_number, 1),
      'published_at', v_row.published_at,
      'show_branding', NOT v_row.remove_branding,
      'contact_enabled', TRUE,
      'allow_indexing', COALESCE(v_row.allow_indexing, TRUE),
      'snapshot', COALESCE(
        v_row.snapshot_payload,
        jsonb_build_object(
          'handle', v_row.handle,
          'display_name', v_row.display_name,
          'tagline', v_row.tagline,
          'bio_text', v_row.short_bio,
          'template_id', v_row.template_id
        )
      )
    );
  END IF;

  -- Check 90-day handle redirect history
  SELECT new_handle INTO v_redirect
    FROM public.handle_history hh
   WHERE hh.old_handle = v_clean_handle
     AND hh.redirect_until > NOW()
   ORDER BY hh.changed_at DESC
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'redirect',
      'redirect_to', v_redirect.new_handle
    );
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_bio(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_bio(TEXT) TO anon, authenticated, service_role;

-- =============================================================================
-- 5. COMPLETE RESERVED HANDLES SEED FROM ROUTE TREE (Closes B-25)
-- =============================================================================
INSERT INTO public.reserved_handles (handle, reason)
VALUES
  ('r', 'system_route'),
  ('forgot-password', 'system_route'),
  ('reset-password', 'system_route'),
  ('l', 'system_route'),
  ('u', 'system_route'),
  ('s', 'system_route'),
  ('faq', 'system_route'),
  ('mail', 'system_route'),
  ('about', 'system_route'),
  ('press', 'system_route'),
  ('assets', 'system_route'),
  ('static', 'system_route'),
  ('cdn', 'system_route'),
  ('_next', 'system_route'),
  ('.well-known', 'system_route'),
  ('robots.txt', 'system_route'),
  ('sitemap.xml', 'system_route'),
  ('manifest.webmanifest', 'system_route'),
  ('favicon.ico', 'system_route'),
  ('opengraph-image', 'system_route'),
  ('razorpay', 'brand_protection'),
  ('stripe', 'brand_protection'),
  ('google', 'brand_protection'),
  ('official', 'brand_protection')
ON CONFLICT (handle) DO NOTHING;

COMMIT;
