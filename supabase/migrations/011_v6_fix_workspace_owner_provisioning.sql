-- =============================================================================
-- BIOLIO V6.0 HOTFIX MIGRATION — PHASE 11
-- Fix Workspaces Foreign Key Constraint (workspaces_owner_id_fkey)
-- Resolves: User Profile missing when claiming handle in onboarding
-- File: supabase/migrations/011_v6_fix_workspace_owner_provisioning.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ENSURE RLS POLICIES ON USER_PROFILES ALLOW SELF-MANAGEMENT
-- =============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

-- =============================================================================
-- 2. BACKFILL USER_PROFILES FOR ALL EXISTING AUTH.USERS
-- Fixes any currently logged in user whose profile was not yet created
-- =============================================================================
INSERT INTO public.user_profiles (id, email, full_name, account_status)
SELECT
  u.id,
  COALESCE(u.email, u.id::TEXT || '@placeholder.biolio.site'),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(COALESCE(u.email, 'Creator'), '@', 1)),
  'active'
FROM auth.users u
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      account_status = 'active',
      updated_at = NOW();

-- =============================================================================
-- 3. BULLETPROOF PROVISION_WORKSPACE_AND_CLAIM_HANDLE RPC
-- Uses direct VALUES row insertion into user_profiles before creating workspace
-- =============================================================================
CREATE OR REPLACE FUNCTION public.provision_workspace_and_claim_handle(
  p_handle TEXT,
  p_display_name TEXT,
  p_creator_role TEXT DEFAULT 'Creator / Influencer',
  p_intended_modules TEXT[] DEFAULT ARRAY['bio']::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_clean_handle TEXT := lower(trim(p_handle));
  v_workspace_id UUID;
  v_bio_profile_id UUID;
  v_user_email TEXT;
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

  -- 1. Resolve user email safely
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    v_user_email := v_clean_handle || '@biolio.site';
  END IF;

  -- 2. Guaranteed direct VALUES insertion into public.user_profiles
  -- Eliminates foreign key violation on workspaces_owner_id_fkey
  INSERT INTO public.user_profiles (id, email, full_name, account_status)
  VALUES (
    v_user_id,
    v_user_email,
    COALESCE(NULLIF(trim(p_display_name), ''), v_clean_handle),
    'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(NULLIF(trim(p_display_name), ''), public.user_profiles.full_name),
        account_status = 'active',
        updated_at = NOW();

  -- 3. Atomically create workspace
  BEGIN
    INSERT INTO public.workspaces (owner_id, name, slug, creator_role, intended_modules)
    VALUES (v_user_id, trim(p_display_name), v_clean_handle, p_creator_role, p_intended_modules)
    RETURNING id INTO v_workspace_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'HANDLE_TAKEN', 'message', 'This username is already claimed.');
  END;

  -- 4. Create owner membership
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (v_workspace_id, v_user_id, 'owner', 'active')
  ON CONFLICT DO NOTHING;

  -- 5. Seed default entitlements with module state
  INSERT INTO public.workspace_entitlements (
    workspace_id,
    bio_tier,
    ig_tier,
    bio_max_links,
    bio_max_gallery_items,
    bio_max_blog_posts,
    automation_max_active_rules,
    automation_monthly_action_quota,
    bio_state,
    ig_state
  ) VALUES (
    v_workspace_id,
    'free',
    'free',
    5,
    6,
    1,
    1,
    100,
    'starter',
    'starter'
  )
  ON CONFLICT (workspace_id) DO NOTHING;

  -- 6. Create primary bio profile
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

REVOKE ALL ON FUNCTION public.provision_workspace_and_claim_handle(TEXT, TEXT, TEXT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_workspace_and_claim_handle(TEXT, TEXT, TEXT, TEXT[]) TO authenticated, service_role;

-- =============================================================================
-- 4. BOOTSTRAP TRIGGER ON AUTH.USERS FOR FUTURE SIGNUPS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::TEXT || '@placeholder.biolio.site'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'Creator'), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        account_status = 'active',
        updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;

