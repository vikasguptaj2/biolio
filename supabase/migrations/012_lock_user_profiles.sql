-- =============================================================================
-- BIOLIO V6.0 HOTFIX MIGRATION — PHASE 12
-- Lock User Profiles & Prevent Account Status Self-Reactivation (Closes F-02, F-08)
-- File: supabase/migrations/012_lock_user_profiles.sql
-- =============================================================================

BEGIN;

-- 1. Remove table-wide grants on user_profiles from authenticated
REVOKE ALL ON public.user_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, updated_at) ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

-- 2. Clean RLS Policies on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Restrict updates: only allowed if account is currently active (not suspended)
CREATE POLICY "Users can update own non-privileged profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id AND account_status = 'active')
  WITH CHECK (auth.uid() = id AND account_status = 'active');

-- 3. Automatic Profile Creation via Trigger on auth.users (No Client Upsert Needed)
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
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;

