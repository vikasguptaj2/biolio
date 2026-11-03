-- ============================================================================
-- 002_v6_tables_and_composite_constraints.sql
-- Complete 42-table schema with Composite Tenant FKs (P1.3), Immutable Plan
-- Versions (P1.9), Circular Snapshot FK (P1.4), False-Default Signatures (P1.6),
-- Retention-Safe Deletes (P1.7/P1.8), and Full Operational Admin Tables (P1.2).
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- DOMAIN 1: IDENTITY, WORKSPACES & ADMIN RBAC (9 Tables)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'risk_review')),
  suspended_reason TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  slug CITEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  creator_role TEXT NOT NULL DEFAULT 'Creator / Influencer',
  intended_modules TEXT[] NOT NULL DEFAULT ARRAY['bio']::TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'past_due', 'closed_anonymized')),
  suspended_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'editor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.admin_role_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  requires_mfa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_permission_definitions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  is_high_risk BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES public.admin_role_definitions(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES public.admin_permission_definitions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.admin_user_roles (
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES public.admin_role_definitions(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  mfa_enforced BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  permission_used TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 3),
  request_id TEXT,
  provider_reference TEXT,
  before_summary JSONB,
  after_summary JSONB,
  result_status TEXT NOT NULL DEFAULT 'success' CHECK (result_status IN ('success', 'denied', 'failed', 'provider_pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ip_hmac TEXT,
  endpoint TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- DOMAIN 2: BIOLIO BIO & MEDIA LEDGER (9 Tables + Composite Tenant FKs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bio_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  default_theme_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  schema_version INTEGER NOT NULL DEFAULT 1,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('avatar', 'cover', 'gallery', 'blog_cover', 'collab_logo')),
  cloudinary_asset_id TEXT UNIQUE,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL DEFAULT 'image' CHECK (resource_type IN ('image', 'video', 'raw')),
  delivery_type TEXT NOT NULL DEFAULT 'authenticated' CHECK (delivery_type IN ('upload', 'private', 'authenticated')),
  format TEXT NOT NULL,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  bytes INTEGER NOT NULL CHECK (bytes > 0 AND bytes <= 10485760),
  secure_url TEXT NOT NULL CHECK (secure_url ~* '^https://'),
  lifecycle_state TEXT NOT NULL DEFAULT 'upload_intent' CHECK (lifecycle_state IN ('upload_intent', 'finalized', 'published', 'pending_delete', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Composite key so child tables can prove media belongs to the same workspace (P1.3)
  UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.bio_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  handle CITEXT NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 1 AND 80),
  tagline TEXT CHECK (tagline IS NULL OR char_length(tagline) <= 120),
  short_bio TEXT CHECK (short_bio IS NULL OR char_length(short_bio) <= 160),
  about_story TEXT CHECK (about_story IS NULL OR char_length(about_story) <= 2500),
  category TEXT NOT NULL DEFAULT 'Photography & Travel',
  location TEXT CHECK (location IS NULL OR char_length(location) <= 80),
  avatar_media_id UUID,
  cover_media_id UUID,
  template_id TEXT NOT NULL DEFAULT 'sunday-studio' REFERENCES public.bio_templates(id),
  theme_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  section_order TEXT[] NOT NULL DEFAULT ARRAY['links', 'featured_work', 'gallery', 'collaborations', 'blog', 'about', 'contact']::TEXT[],
  sections_visibility JSONB NOT NULL DEFAULT '{"links":true,"featured_work":true,"gallery":true,"collaborations":true,"blog":true,"about":true,"services":false,"contact":true}'::JSONB,
  creator_metrics JSONB NOT NULL DEFAULT '[]'::JSONB,
  seo_title TEXT CHECK (seo_title IS NULL OR char_length(seo_title) <= 120),
  seo_description TEXT CHECK (seo_description IS NULL OR char_length(seo_description) <= 300),
  allow_indexing BOOLEAN NOT NULL DEFAULT TRUE,
  draft_version INTEGER NOT NULL DEFAULT 1 CHECK (draft_version >= 1),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  current_published_version_id UUID,
  moderation_state TEXT NOT NULL DEFAULT 'normal' CHECK (moderation_state IN ('normal', 'soft_hidden', 'restricted')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- P1.3 Composite key for child table tenant integrity
  UNIQUE (id, workspace_id),
  FOREIGN KEY (avatar_media_id, workspace_id) REFERENCES public.media_assets(id, workspace_id) ON DELETE SET NULL (avatar_media_id),
  FOREIGN KEY (cover_media_id, workspace_id) REFERENCES public.media_assets(id, workspace_id) ON DELETE SET NULL (cover_media_id)
);

CREATE TABLE IF NOT EXISTS public.bio_published_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_profile_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  handle_at_publish CITEXT NOT NULL,
  -- Complete, self-contained immutable public render projection (P1.4)
  snapshot_payload JSONB NOT NULL,
  published_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bio_profile_id, version_number),
  UNIQUE (id, bio_profile_id),
  FOREIGN KEY (bio_profile_id, workspace_id) REFERENCES public.bio_profiles(id, workspace_id) ON DELETE CASCADE
);

-- P1.4 Fix: Enforce that `bio_profiles.current_published_version_id` belongs to that exact `bio_profile_id`
ALTER TABLE public.bio_profiles
  DROP CONSTRAINT IF EXISTS fk_bio_profiles_current_published_version,
  ADD CONSTRAINT fk_bio_profiles_current_published_version
  FOREIGN KEY (current_published_version_id, id)
  REFERENCES public.bio_published_versions(id, bio_profile_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS public.bio_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_profile_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  -- P0.2 Fix: Uses PG17-compatible `public.gen_opaque_token(12)`
  opaque_token TEXT NOT NULL UNIQUE DEFAULT public.gen_opaque_token(12),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  url TEXT NOT NULL CHECK (url ~* '^(https://|mailto:)'),
  icon TEXT NOT NULL DEFAULT '↗',
  link_type TEXT NOT NULL DEFAULT 'standard' CHECK (link_type IN ('standard', 'social', 'featured', 'cta')),
  platform TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (bio_profile_id, workspace_id) REFERENCES public.bio_profiles(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.bio_gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_profile_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  media_asset_id UUID,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  caption TEXT CHECK (caption IS NULL OR char_length(caption) <= 500),
  category TEXT NOT NULL DEFAULT 'All work',
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video_embed', 'project')),
  external_url TEXT CHECK (external_url IS NULL OR external_url ~* '^https://'),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  -- P1.5 Fix: Default to 'draft' so new uploads are never published before explicit review
  status content_status NOT NULL DEFAULT 'draft',
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (bio_profile_id, workspace_id) REFERENCES public.bio_profiles(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (media_asset_id, workspace_id) REFERENCES public.media_assets(id, workspace_id) ON DELETE SET NULL (media_asset_id)
);

CREATE TABLE IF NOT EXISTS public.bio_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_profile_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  brand_name TEXT NOT NULL CHECK (char_length(trim(brand_name)) BETWEEN 1 AND 100),
  brand_logo_text TEXT NOT NULL DEFAULT 'B' CHECK (char_length(brand_logo_text) BETWEEN 1 AND 4),
  logo_media_id UUID,
  category TEXT,
  collab_year TEXT,
  campaign_title TEXT,
  campaign_summary TEXT CHECK (campaign_summary IS NULL OR char_length(campaign_summary) <= 1000),
  case_study_url TEXT CHECK (case_study_url IS NULL OR case_study_url ~* '^https://'),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  status content_status NOT NULL DEFAULT 'draft',
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (bio_profile_id, workspace_id) REFERENCES public.bio_profiles(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (logo_media_id, workspace_id) REFERENCES public.media_assets(id, workspace_id) ON DELETE SET NULL (logo_media_id)
);

CREATE TABLE IF NOT EXISTS public.bio_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_profile_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 180),
  slug CITEXT NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  category TEXT NOT NULL DEFAULT 'CREATIVE NOTES',
  excerpt TEXT CHECK (excerpt IS NULL OR char_length(excerpt) <= 400),
  content_markdown TEXT NOT NULL DEFAULT '',
  sanitized_html TEXT NOT NULL DEFAULT '',
  cover_media_id UUID,
  reading_time_minutes INTEGER NOT NULL DEFAULT 3 CHECK (reading_time_minutes >= 1),
  seo_title TEXT CHECK (seo_title IS NULL OR char_length(seo_title) <= 120),
  seo_description TEXT CHECK (seo_description IS NULL OR char_length(seo_description) <= 300),
  status content_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, slug),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (bio_profile_id, workspace_id) REFERENCES public.bio_profiles(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (cover_media_id, workspace_id) REFERENCES public.media_assets(id, workspace_id) ON DELETE SET NULL (cover_media_id)
);

CREATE TABLE IF NOT EXISTS public.bio_contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_profile_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  sender_name TEXT NOT NULL CHECK (char_length(trim(sender_name)) BETWEEN 1 AND 100),
  sender_email CITEXT NOT NULL,
  sender_company TEXT CHECK (sender_company IS NULL OR char_length(sender_company) <= 100),
  inquiry_type TEXT NOT NULL DEFAULT 'Collaboration',
  budget_range TEXT,
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 5 AND 5000),
  status inquiry_status NOT NULL DEFAULT 'new',
  rate_limit_key_hmac TEXT,
  retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '365 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (bio_profile_id, workspace_id) REFERENCES public.bio_profiles(id, workspace_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- DOMAIN 3: INSTAGRAM AUTOMATION (7 Tables + Private Credentials Store)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  login_product TEXT NOT NULL DEFAULT 'instagram_login' CHECK (login_product IN ('instagram_login', 'facebook_login')),
  ig_user_id TEXT NOT NULL UNIQUE,
  ig_username TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'CREATOR' CHECK (account_type IN ('BUSINESS', 'CREATOR')),
  profile_picture_url TEXT,
  granted_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  token_expires_at TIMESTAMPTZ,
  webhook_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  status ig_connection_status NOT NULL DEFAULT 'not_connected',
  last_error_code TEXT,
  last_error_category TEXT,
  hourly_replies_sent INTEGER NOT NULL DEFAULT 0 CHECK (hourly_replies_sent >= 0),
  hourly_ceiling INTEGER NOT NULL DEFAULT 600 CHECK (hourly_ceiling BETWEEN 1 AND 750),
  hourly_window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', NOW()),
  last_webhook_received_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- P1.13: 1 Instagram connection per workspace in initial release, with composite key for child FKs (P1.3)
  UNIQUE (workspace_id),
  UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS private_integrations.instagram_credentials (
  connection_id UUID PRIMARY KEY REFERENCES public.instagram_connections(id) ON DELETE CASCADE,
  vault_secret_id UUID,
  encrypted_access_token BYTEA,
  key_version INTEGER NOT NULL DEFAULT 1 CHECK (key_version >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.automation_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  private_message_body TEXT NOT NULL CHECK (char_length(trim(private_message_body)) BETWEEN 1 AND 1000),
  cta_button_label TEXT CHECK (cta_button_label IS NULL OR char_length(cta_button_label) <= 40),
  destination_url TEXT CHECK (destination_url IS NULL OR destination_url ~* '^https://'),
  public_reply_body TEXT CHECK (public_reply_body IS NULL OR char_length(public_reply_body) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  instagram_connection_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100 CHECK (priority BETWEEN 1 AND 10000),
  target_scope ig_target_scope NOT NULL DEFAULT 'all_eligible_posts',
  target_media_id TEXT,
  match_mode ig_match_mode NOT NULL DEFAULT 'exact_token',
  keywords TEXT[] NOT NULL DEFAULT ARRAY['GUIDE']::TEXT[],
  private_message_template TEXT NOT NULL CHECK (char_length(trim(private_message_template)) BETWEEN 1 AND 1000),
  cta_button_label TEXT DEFAULT 'Open link' CHECK (cta_button_label IS NULL OR char_length(cta_button_label) <= 40),
  destination_url TEXT CHECK (destination_url IS NULL OR destination_url ~* '^https://'),
  send_public_reply BOOLEAN NOT NULL DEFAULT FALSE,
  public_reply_template TEXT CHECK (public_reply_template IS NULL OR char_length(public_reply_template) <= 300),
  cooldown_hours INTEGER NOT NULL DEFAULT 24 CHECK (cooldown_hours >= 0 AND cooldown_hours <= 720),
  rule_version INTEGER NOT NULL DEFAULT 1 CHECK (rule_version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, workspace_id),
  -- P1.3 Composite FK guaranteeing rule and connection share the exact same workspace
  FOREIGN KEY (instagram_connection_id, workspace_id) REFERENCES public.instagram_connections(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.instagram_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT NOT NULL UNIQUE,
  instagram_connection_id UUID REFERENCES public.instagram_connections(id) ON DELETE SET NULL,
  ig_user_id TEXT NOT NULL,
  surface_type TEXT NOT NULL DEFAULT 'post_or_reel' CHECK (surface_type IN ('post_or_reel', 'ad', 'live')),
  comment_id TEXT NOT NULL,
  media_id TEXT,
  commenter_ig_id TEXT,
  commenter_username TEXT,
  comment_text_redacted TEXT,
  comment_created_at TIMESTAMPTZ NOT NULL,
  -- P1.6 Fix: Default to FALSE; only verified webhook ingress RPC may set TRUE
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  processing_status ig_execution_status NOT NULL DEFAULT 'received',
  retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  instagram_connection_id UUID NOT NULL,
  rule_id UUID,
  rule_version_evaluated INTEGER,
  -- P1.8 Fix: Nullable with ON DELETE SET NULL so expiring raw webhook envelopes never delete execution history
  webhook_event_id UUID REFERENCES public.instagram_webhook_events(id) ON DELETE SET NULL,
  provider_event_id_snapshot TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  commenter_ig_id TEXT,
  commenter_username TEXT,
  matched_keyword TEXT,
  -- P0.2 Fix: Uses PG17-compatible `public.gen_opaque_token(12)`
  attribution_token TEXT NOT NULL UNIQUE DEFAULT public.gen_opaque_token(12),
  status ig_execution_status NOT NULL DEFAULT 'evaluating',
  provider_message_id TEXT,
  failure_category TEXT,
  failure_detail TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (instagram_connection_id, comment_id),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (instagram_connection_id, workspace_id) REFERENCES public.instagram_connections(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id, workspace_id) REFERENCES public.automation_rules(id, workspace_id) ON DELETE SET NULL (rule_id)
);

CREATE TABLE IF NOT EXISTS public.automation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
  action_type TEXT NOT NULL CHECK (action_type IN ('private_reply', 'public_reply')),
  http_status INTEGER,
  provider_error_code TEXT,
  provider_error_subcode TEXT,
  outcome_classification TEXT NOT NULL CHECK (outcome_classification IN ('accepted', 'transient_error', 'permanent_error', 'outcome_unknown')),
  response_summary TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (execution_id, attempt_number, action_type),
  FOREIGN KEY (execution_id, workspace_id) REFERENCES public.automation_executions(id, workspace_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- DOMAIN 4: BILLING, ENTITLEMENTS & PROMOTIONS (9 Tables + Retention-Safe FKs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  name TEXT NOT NULL,
  module product_module NOT NULL,
  tier plan_tier NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
  price_monthly_minor INTEGER NOT NULL DEFAULT 0 CHECK (price_monthly_minor >= 0),
  price_annual_minor INTEGER NOT NULL DEFAULT 0 CHECK (price_annual_minor >= 0),
  provider_plan_refs JSONB NOT NULL DEFAULT '{}'::JSONB,
  entitlements JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active_for_sale BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- P1.9 Fix: Composite primary key so plan versions are immutable and referentially enforced
  PRIMARY KEY (id, version)
);

CREATE TABLE IF NOT EXISTS public.workspace_entitlements (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bio_tier plan_tier NOT NULL DEFAULT 'free',
  ig_tier plan_tier NOT NULL DEFAULT 'free',
  bio_max_links INTEGER CHECK (bio_max_links IS NULL OR bio_max_links >= 0),
  bio_max_gallery_items INTEGER CHECK (bio_max_gallery_items IS NULL OR bio_max_gallery_items >= 0),
  bio_max_blog_posts INTEGER CHECK (bio_max_blog_posts IS NULL OR bio_max_blog_posts >= 0),
  bio_custom_themes BOOLEAN NOT NULL DEFAULT FALSE,
  bio_remove_branding BOOLEAN NOT NULL DEFAULT FALSE,
  bio_export_analytics BOOLEAN NOT NULL DEFAULT FALSE,
  bio_analytics_retention_days INTEGER NOT NULL DEFAULT 7 CHECK (bio_analytics_retention_days >= 1),
  automation_max_active_rules INTEGER CHECK (automation_max_active_rules IS NULL OR automation_max_active_rules >= 0),
  automation_monthly_action_quota INTEGER NOT NULL DEFAULT 100 CHECK (automation_monthly_action_quota >= 0),
  automation_monthly_actions_used INTEGER NOT NULL DEFAULT 0 CHECK (automation_monthly_actions_used >= 0),
  automation_public_replies_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  automation_attribution_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  automation_log_retention_days INTEGER NOT NULL DEFAULT 7 CHECK (automation_log_retention_days >= 1),
  override_reason TEXT,
  override_expires_at TIMESTAMPTZ,
  quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  projection_version INTEGER NOT NULL DEFAULT 1 CHECK (projection_version >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- P1.7 Fix: ON DELETE SET NULL so financial/subscription records survive workspace deletion
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL DEFAULT 1,
  module product_module NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  billing_interval billing_interval NOT NULL DEFAULT 'monthly',
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
  base_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (base_amount_minor >= 0),
  discount_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0 AND discount_amount_minor <= base_amount_minor),
  final_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (final_amount_minor = base_amount_minor - discount_amount_minor),
  provider TEXT NOT NULL DEFAULT 'razorpay' CHECK (provider IN ('razorpay', 'stripe', 'manual_grant')),
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  last_provider_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_subscription_id),
  -- P1.9 Fix: Composite FK to exact immutable plan version
  FOREIGN KEY (plan_id, plan_version) REFERENCES public.billing_plans(id, version) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe', 'meta')),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  -- P1.6 Fix: Default to FALSE; only verified webhook handler sets TRUE
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processed', 'ignored_out_of_order', 'failed')),
  redacted_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- P1.7 Fix: ON DELETE SET NULL so accounting ledger survives workspace deletion
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe')),
  provider_payment_id TEXT NOT NULL,
  provider_order_id TEXT,
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  refunded_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount_minor >= 0 AND refunded_amount_minor <= amount_minor),
  status TEXT NOT NULL CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'partially_refunded', 'refunded', 'disputed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_payment_id)
);

CREATE TABLE IF NOT EXISTS public.refund_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  -- P1.7 Fix: ON DELETE SET NULL so refund ledger never conflicts with workspace closure
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe')),
  provider_refund_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 3),
  initiated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'provider_pending' CHECK (status IN ('provider_pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  UNIQUE (provider, provider_refund_id)
);

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  description TEXT,
  discount_type coupon_discount_type NOT NULL,
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  currency TEXT NOT NULL DEFAULT 'ANY' CHECK (currency IN ('INR', 'USD', 'ANY')),
  max_discount_minor INTEGER CHECK (max_discount_minor IS NULL OR max_discount_minor > 0),
  duration_type coupon_duration_type NOT NULL DEFAULT 'once',
  duration_in_months INTEGER CHECK (duration_in_months IS NULL OR duration_in_months >= 1),
  scope_type coupon_scope_type NOT NULL DEFAULT 'any',
  applicable_plan_ids TEXT[] DEFAULT NULL,
  applicable_intervals billing_interval[] DEFAULT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_stackable BOOLEAN NOT NULL DEFAULT FALSE,
  exclusivity_group TEXT,
  max_redemptions_total INTEGER CHECK (max_redemptions_total IS NULL OR max_redemptions_total >= 1),
  reserved_or_redeemed_total INTEGER NOT NULL DEFAULT 0 CHECK (reserved_or_redeemed_total >= 0 AND (max_redemptions_total IS NULL OR reserved_or_redeemed_total <= max_redemptions_total)),
  max_redemptions_per_workspace INTEGER NOT NULL DEFAULT 1 CHECK (max_redemptions_per_workspace >= 1),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_code_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  code_prefix TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 50000),
  max_uses_per_code INTEGER NOT NULL DEFAULT 1 CHECK (max_uses_per_code >= 1),
  assigned_email_domain TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'generating', 'completed', 'failed')),
  last_exported_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  last_exported_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.coupon_code_batches(id) ON DELETE CASCADE,
  hash_key_version INTEGER NOT NULL DEFAULT 1 CHECK (hash_key_version >= 1),
  code_hash TEXT NOT NULL UNIQUE,
  code_masked_preview TEXT NOT NULL,
  is_public_master_code BOOLEAN NOT NULL DEFAULT FALSE,
  max_redemptions INTEGER NOT NULL DEFAULT 1 CHECK (max_redemptions >= 1),
  reserved_or_redeemed_count INTEGER NOT NULL DEFAULT 0 CHECK (reserved_or_redeemed_count >= 0 AND reserved_or_redeemed_count <= max_redemptions),
  assigned_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  assigned_email_domain TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE RESTRICT,
  coupon_code_id UUID NOT NULL REFERENCES public.coupon_codes(id) ON DELETE RESTRICT,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  redeemed_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL CHECK (currency IN ('INR', 'USD')),
  subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor >= 0),
  discount_minor INTEGER NOT NULL CHECK (discount_minor >= 0 AND discount_minor <= subtotal_minor),
  final_minor INTEGER NOT NULL CHECK (final_minor = subtotal_minor - discount_minor),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'released', 'expired')),
  reservation_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  FOREIGN KEY (plan_id, plan_version) REFERENCES public.billing_plans(id, version) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- DOMAIN 5: ADMIN OPERATIONS, SUPPORT, MODERATION, PRIVACY, FLAGS, ANALYTICS & QUEUES (10 Tables — Fixes P1.2 & P1.10)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  requester_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  requester_email CITEXT NOT NULL,
  requester_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('account_access', 'bio_publishing', 'instagram_connection', 'automation_failure', 'billing', 'privacy_request', 'abuse_report', 'other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'waiting_user', 'waiting_provider', 'resolved', 'closed')),
  assigned_admin_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL CHECK (char_length(trim(subject)) BETWEEN 3 AND 200),
  sla_due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public_reply' CHECK (visibility IN ('public_reply', 'internal_note')),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moderation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('bio_profile', 'gallery_item', 'blog_post', 'collaboration')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 3),
  reporter_email CITEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'soft_hidden', 'unpublished', 'dismissed', 'appealed')),
  decision_notes TEXT,
  reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moderation_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  appeal_statement TEXT NOT NULL CHECK (char_length(trim(appeal_statement)) BETWEEN 10 AND 4000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'upheld', 'overturned')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  requester_email CITEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion', 'correction')),
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified', 'legal_hold', 'processing', 'completed', 'rejected')),
  legal_hold_reason TEXT,
  due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  completion_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  is_public_readable BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  allowed_workspace_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bio_profile_id UUID REFERENCES public.bio_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('bio.page_view', 'bio.link_click', 'bio.blog_view', 'bio.contact_submit', 'bio.publish', 'automation.api_accepted', 'automation.dm_link_click')),
  link_id UUID REFERENCES public.bio_links(id) ON DELETE SET NULL,
  blog_post_id UUID REFERENCES public.bio_blog_posts(id) ON DELETE SET NULL,
  automation_rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  visitor_daily_hmac TEXT NOT NULL,
  referrer_host TEXT NOT NULL DEFAULT 'direct',
  device_class TEXT NOT NULL DEFAULT 'mobile' CHECK (device_class IN ('mobile', 'desktop', 'tablet')),
  retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_daily_aggregates (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bio_profile_id UUID NOT NULL REFERENCES public.bio_profiles(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0 CHECK (page_views >= 0),
  unique_visitors_est INTEGER NOT NULL DEFAULT 0 CHECK (unique_visitors_est >= 0),
  link_clicks INTEGER NOT NULL DEFAULT 0 CHECK (link_clicks >= 0),
  blog_views INTEGER NOT NULL DEFAULT 0 CHECK (blog_views >= 0),
  contact_submits INTEGER NOT NULL DEFAULT 0 CHECK (contact_submits >= 0),
  dm_attributed_visits INTEGER NOT NULL DEFAULT 0 CHECK (dm_attributed_visits >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, bio_profile_id, metric_date)
);

-- Durable PostgreSQL Job Queue (`private_integrations.job_queue`) with visibility leases & dead-letter (Fixes P1.10)
CREATE TABLE IF NOT EXISTS private_integrations.job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL CHECK (queue_name IN ('instagram-comment-actions', 'bio-publish', 'analytics-aggregate', 'coupon-batch-generate', 'media-cleanup')),
  idempotency_key TEXT NOT NULL UNIQUE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'delayed', 'leased', 'completed', 'dead_letter', 'paused')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  visible_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  last_error_category TEXT,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

COMMIT;
