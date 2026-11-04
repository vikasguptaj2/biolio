-- =============================================================================
-- BIOLIO V6.0 MASTER MIGRATION — PHASE 6
-- Canonical Seeds: Templates, Plans, RBAC Matrix, Reserved Handles & Flags
-- File: supabase/migrations/006_v6_seeds_and_bootstrap.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- =============================================================================
-- 1. SEED 17 BIO TEMPLATES (All 12 UI Design Token Templates + 5 Classic Templates)
-- =============================================================================
-- Ensure all columns required by 002 and application layers are present
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS preview_image_url TEXT;
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS default_theme_config JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS default_tokens JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS tokens JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS default_section_order TEXT[] DEFAULT ARRAY['hero', 'links', 'gallery', 'collaborations', 'blog', 'contact']::TEXT[];
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS min_tier TEXT DEFAULT 'free';
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;
ALTER TABLE public.bio_templates ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

INSERT INTO public.bio_templates (
  id,
  name,
  description,
  category,
  tokens,
  default_tokens,
  default_theme_config,
  default_section_order,
  preview_image_url,
  is_active,
  min_tier,
  is_premium,
  sort_order
)
VALUES
  (
    'atelier-editorial',
    'Atelier Editorial',
    'Refined editorial layout with Playfair Display and warm linen tones.',
    'Writers & High Fashion',
    '{"bg":"#f4efe7","surface":"#fffdf8","ink":"#211b29","accent":"#f36b3f","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"solid-pill"}'::jsonb,
    '{"bg":"#f4efe7","surface":"#fffdf8","ink":"#211b29","accent":"#f36b3f","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"solid-pill"}'::jsonb,
    '{"bg":"#f4efe7","surface":"#fffdf8","ink":"#211b29","accent":"#f36b3f"}'::jsonb,
    ARRAY['hero', 'links', 'gallery', 'collaborations', 'blog', 'contact'],
    '/templates/atelier-editorial.png',
    TRUE,
    'free',
    FALSE,
    1
  ),
  (
    'obsidian-noir',
    'Obsidian Noir',
    'Dark luxury aesthetic with deep inks, lilac glow, and high-contrast typography.',
    'Creators & Tech Founders',
    '{"bg":"#16131b","surface":"#211b29","ink":"#fdfcfe","accent":"#c9b5f4","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"outline-glow"}'::jsonb,
    '{"bg":"#16131b","surface":"#211b29","ink":"#fdfcfe","accent":"#c9b5f4","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"outline-glow"}'::jsonb,
    '{"bg":"#16131b","surface":"#211b29","ink":"#fdfcfe","accent":"#c9b5f4"}'::jsonb,
    ARRAY['hero', 'gallery', 'links', 'collaborations', 'blog', 'contact'],
    '/templates/obsidian-noir.png',
    TRUE,
    'free',
    FALSE,
    2
  ),
  (
    'sage-botanical',
    'Sage Botanical',
    'Earthy organic tones with calming forest hues and delicate serif accents.',
    'Wellness & Skincare',
    '{"bg":"#f2f5f3","surface":"#ffffff","ink":"#1c2e27","accent":"#277a67","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"soft-rounded"}'::jsonb,
    '{"bg":"#f2f5f3","surface":"#ffffff","ink":"#1c2e27","accent":"#277a67","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"soft-rounded"}'::jsonb,
    '{"bg":"#f2f5f3","surface":"#ffffff","ink":"#1c2e27","accent":"#277a67"}'::jsonb,
    ARRAY['hero', 'links', 'blog', 'gallery', 'collaborations', 'contact'],
    '/templates/sage-botanical.png',
    TRUE,
    'free',
    FALSE,
    3
  ),
  (
    'studio-minimal',
    'Studio Minimal',
    'Swiss architectural minimalism with crisp lines and vivid tangerine pops.',
    'Photographers & Designers',
    '{"bg":"#ffffff","surface":"#f8f9fa","ink":"#111111","accent":"#f36b3f","fontDisplay":"Plus Jakarta Sans","fontBody":"Plus Jakarta Sans","buttonStyle":"sharp-grid"}'::jsonb,
    '{"bg":"#ffffff","surface":"#f8f9fa","ink":"#111111","accent":"#f36b3f","fontDisplay":"Plus Jakarta Sans","fontBody":"Plus Jakarta Sans","buttonStyle":"sharp-grid"}'::jsonb,
    '{"bg":"#ffffff","surface":"#f8f9fa","ink":"#111111","accent":"#f36b3f"}'::jsonb,
    ARRAY['hero', 'links', 'collaborations', 'gallery', 'blog', 'contact'],
    '/templates/studio-minimal.png',
    TRUE,
    'free',
    FALSE,
    4
  ),
  (
    'sunset-amber',
    'Sunset Amber',
    'Rich terracotta warmth, glowing peach accents, and warm sun-drenched feel.',
    'Culinary & Lifestyle',
    '{"bg":"#fcf5ee","surface":"#ffffff","ink":"#331f18","accent":"#e0633b","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"shadow-pop"}'::jsonb,
    '{"bg":"#fcf5ee","surface":"#ffffff","ink":"#331f18","accent":"#e0633b","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"shadow-pop"}'::jsonb,
    '{"bg":"#fcf5ee","surface":"#ffffff","ink":"#331f18","accent":"#e0633b"}'::jsonb,
    ARRAY['hero', 'links', 'collaborations', 'blog', 'gallery', 'contact'],
    '/templates/sunset-amber.png',
    TRUE,
    'creator',
    TRUE,
    5
  ),
  (
    'tokyo-cyber',
    'Tokyo Cyber',
    'Vibrant neon violet on dark obsidian for stream setups and music artists.',
    'Music & Gaming',
    '{"bg":"#0d0b12","surface":"#1a1622","ink":"#ffffff","accent":"#9d65ff","fontDisplay":"Plus Jakarta Sans","fontBody":"JetBrains Mono","buttonStyle":"cyber-border"}'::jsonb,
    '{"bg":"#0d0b12","surface":"#1a1622","ink":"#ffffff","accent":"#9d65ff","fontDisplay":"Plus Jakarta Sans","fontBody":"JetBrains Mono","buttonStyle":"cyber-border"}'::jsonb,
    '{"bg":"#0d0b12","surface":"#1a1622","ink":"#ffffff","accent":"#9d65ff"}'::jsonb,
    ARRAY['hero', 'links', 'gallery', 'blog', 'collaborations', 'contact'],
    '/templates/tokyo-cyber.png',
    TRUE,
    'creator',
    TRUE,
    6
  ),
  (
    'monochrome-stark',
    'Monochrome Stark',
    'Pure black and stark white brutalist grid for architectural statements.',
    'Architects & Engineers',
    '{"bg":"#0a0a0a","surface":"#141414","ink":"#f5f5f5","accent":"#ffffff","fontDisplay":"Manrope","fontBody":"DM Sans","buttonStyle":"sharp-mono"}'::jsonb,
    '{"bg":"#0a0a0a","surface":"#141414","ink":"#f5f5f5","accent":"#ffffff","fontDisplay":"Manrope","fontBody":"DM Sans","buttonStyle":"sharp-mono"}'::jsonb,
    '{"bg":"#0a0a0a","surface":"#141414","ink":"#f5f5f5","accent":"#ffffff"}'::jsonb,
    ARRAY['hero', 'links', 'collaborations', 'gallery', 'blog', 'contact'],
    '/templates/monochrome-stark.png',
    TRUE,
    'free',
    FALSE,
    7
  ),
  (
    'terracotta-warmth',
    'Terracotta Warmth',
    'Rich earthenware pottery tones with toasted almond paper background.',
    'Ceramics & Artisans',
    '{"bg":"#f7f1eb","surface":"#fffaf5","ink":"#3c2921","accent":"#c45c3d","fontDisplay":"Playfair Display","fontBody":"DM Sans","buttonStyle":"soft-pill"}'::jsonb,
    '{"bg":"#f7f1eb","surface":"#fffaf5","ink":"#3c2921","accent":"#c45c3d","fontDisplay":"Playfair Display","fontBody":"DM Sans","buttonStyle":"soft-pill"}'::jsonb,
    '{"bg":"#f7f1eb","surface":"#fffaf5","ink":"#3c2921","accent":"#c45c3d"}'::jsonb,
    ARRAY['hero', 'links', 'gallery', 'collaborations', 'blog', 'contact'],
    '/templates/terracotta-warmth.png',
    TRUE,
    'creator',
    TRUE,
    8
  ),
  (
    'electric-indigo',
    'Electric Indigo',
    'Deep oceanic navy with high-voltage indigo and cyan highlights.',
    'SaaS Founders & Devs',
    '{"bg":"#0b1120","surface":"#111c35","ink":"#f1f5f9","accent":"#38bdf8","fontDisplay":"Manrope","fontBody":"DM Sans","buttonStyle":"electric-pill"}'::jsonb,
    '{"bg":"#0b1120","surface":"#111c35","ink":"#f1f5f9","accent":"#38bdf8","fontDisplay":"Manrope","fontBody":"DM Sans","buttonStyle":"electric-pill"}'::jsonb,
    '{"bg":"#0b1120","surface":"#111c35","ink":"#f1f5f9","accent":"#38bdf8"}'::jsonb,
    ARRAY['hero', 'links', 'gallery', 'blog', 'collaborations', 'contact'],
    '/templates/electric-indigo.png',
    TRUE,
    'creator',
    TRUE,
    9
  ),
  (
    'brutalist-raw',
    'Brutalist Raw',
    'Heavy 3px borders, hard drop shadows, and raw high-energy pop.',
    'Streetwear & Subculture',
    '{"bg":"#ffea79","surface":"#ffffff","ink":"#000000","accent":"#ff3366","fontDisplay":"Manrope","fontBody":"DM Sans","buttonStyle":"hard-shadow"}'::jsonb,
    '{"bg":"#ffea79","surface":"#ffffff","ink":"#000000","accent":"#ff3366","fontDisplay":"Manrope","fontBody":"DM Sans","buttonStyle":"hard-shadow"}'::jsonb,
    '{"bg":"#ffea79","surface":"#ffffff","ink":"#000000","accent":"#ff3366"}'::jsonb,
    ARRAY['hero', 'links', 'gallery', 'blog', 'collaborations', 'contact'],
    '/templates/brutalist-raw.png',
    TRUE,
    'pro',
    TRUE,
    10
  ),
  (
    'sunday-studio',
    'Sunday Studio',
    'Breezy coastal neutrals, soft linen textures, and sunlit clarity.',
    'Authors & Podcasters',
    '{"bg":"#faf8f5","surface":"#ffffff","ink":"#232323","accent":"#997027","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"linen-pill"}'::jsonb,
    '{"bg":"#faf8f5","surface":"#ffffff","ink":"#232323","accent":"#997027","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans","buttonStyle":"linen-pill"}'::jsonb,
    '{"bg":"#faf8f5","surface":"#ffffff","ink":"#232323","accent":"#997027"}'::jsonb,
    ARRAY['hero', 'links', 'gallery', 'collaborations', 'blog', 'contact'],
    '/templates/sunday-studio.png',
    TRUE,
    'free',
    FALSE,
    11
  ),
  (
    'velvet-night',
    'Velvet Night',
    'Deep burgundy luxury with champagne gold typography for fine dining & hospitality.',
    'Hospitality & Spirits',
    '{"bg":"#180d14","surface":"#261521","ink":"#faede8","accent":"#d4af37","fontDisplay":"Playfair Display","fontBody":"DM Sans","buttonStyle":"gold-glow"}'::jsonb,
    '{"bg":"#180d14","surface":"#261521","ink":"#faede8","accent":"#d4af37","fontDisplay":"Playfair Display","fontBody":"DM Sans","buttonStyle":"gold-glow"}'::jsonb,
    '{"bg":"#180d14","surface":"#261521","ink":"#faede8","accent":"#d4af37"}'::jsonb,
    ARRAY['hero', 'gallery', 'links', 'collaborations', 'blog', 'contact'],
    '/templates/velvet-night.png',
    TRUE,
    'pro',
    TRUE,
    12
  ),
  (
    'coastline',
    'Coastline',
    'Breezy coastal cards with sage accents and airy photography framing.',
    'Lifestyle & Outdoors',
    '{"bg":"#f4f8f7","surface":"#ffffff","ink":"#182625","accent":"#277a67","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans"}'::jsonb,
    '{"bg":"#f4f8f7","surface":"#ffffff","ink":"#182625","accent":"#277a67","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans"}'::jsonb,
    '{"bg":"#f4f8f7","surface":"#ffffff","ink":"#182625","accent":"#277a67"}'::jsonb,
    ARRAY['hero', 'gallery', 'links', 'collaborations', 'blog', 'contact'],
    '/templates/coastline.png',
    TRUE,
    'free',
    FALSE,
    13
  ),
  (
    'form-function',
    'Form & Function',
    'High-contrast architectural grid with crisp borders and monospace metadata.',
    'Designers & Makers',
    '{"bg":"#f6f5f2","surface":"#ffffff","ink":"#141413","accent":"#211b29","fontDisplay":"Plus Jakarta Sans","fontBody":"JetBrains Mono"}'::jsonb,
    '{"bg":"#f6f5f2","surface":"#ffffff","ink":"#141413","accent":"#211b29","fontDisplay":"Plus Jakarta Sans","fontBody":"JetBrains Mono"}'::jsonb,
    '{"bg":"#f6f5f2","surface":"#ffffff","ink":"#141413","accent":"#211b29"}'::jsonb,
    ARRAY['hero', 'links', 'collaborations', 'gallery', 'blog', 'contact'],
    '/templates/form-function.png',
    TRUE,
    'free',
    FALSE,
    14
  ),
  (
    'soft-focus',
    'Soft Focus',
    'Pastel lavender and warm blush gradients built for lifestyle and beauty creators.',
    'Beauty & Wellness',
    '{"bg":"#faf6fe","surface":"#ffffff","ink":"#261c33","accent":"#9d75e8","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans"}'::jsonb,
    '{"bg":"#faf6fe","surface":"#ffffff","ink":"#261c33","accent":"#9d75e8","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans"}'::jsonb,
    '{"bg":"#faf6fe","surface":"#ffffff","ink":"#261c33","accent":"#9d75e8"}'::jsonb,
    ARRAY['hero', 'links', 'gallery', 'blog', 'collaborations', 'contact'],
    '/templates/soft-focus.png',
    TRUE,
    'creator',
    TRUE,
    15
  ),
  (
    'field-notes',
    'Field Notes',
    'Writer-first journal aesthetic highlighting blog essays, notes, and curated links.',
    'Writers & Journalists',
    '{"bg":"#f9f5eb","surface":"#fffdf7","ink":"#2b261f","accent":"#b85d19","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans"}'::jsonb,
    '{"bg":"#f9f5eb","surface":"#fffdf7","ink":"#2b261f","accent":"#b85d19","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans"}'::jsonb,
    '{"bg":"#f9f5eb","surface":"#fffdf7","ink":"#2b261f","accent":"#b85d19"}'::jsonb,
    ARRAY['hero', 'blog', 'links', 'gallery', 'collaborations', 'contact'],
    '/templates/field-notes.png',
    TRUE,
    'creator',
    TRUE,
    16
  ),
  (
    'studio-hours',
    'Studio Hours',
    'Rich dark mode obsidian canvas with warm gold and coral highlights.',
    'Agencies & Studios',
    '{"bg":"#17131d","surface":"#221c2b","ink":"#fbf8f2","accent":"#f36b3f","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans"}'::jsonb,
    '{"bg":"#17131d","surface":"#221c2b","ink":"#fbf8f2","accent":"#f36b3f","fontDisplay":"Fraunces","fontBody":"Plus Jakarta Sans"}'::jsonb,
    '{"bg":"#17131d","surface":"#221c2b","ink":"#fbf8f2","accent":"#f36b3f"}'::jsonb,
    ARRAY['hero', 'links', 'gallery', 'collaborations', 'blog', 'contact'],
    '/templates/studio-hours.png',
    TRUE,
    'pro',
    TRUE,
    17
  )
ON CONFLICT (id) DO UPDATE
  SET name                  = EXCLUDED.name,
  description           = EXCLUDED.description,
  category              = EXCLUDED.category,
  tokens                = EXCLUDED.tokens,
  default_tokens        = EXCLUDED.default_tokens,
  default_theme_config  = EXCLUDED.default_theme_config,
  default_section_order = EXCLUDED.default_section_order,
  preview_image_url     = EXCLUDED.preview_image_url,
  is_active             = EXCLUDED.is_active,
  min_tier              = EXCLUDED.min_tier,
  is_premium            = EXCLUDED.is_premium,
  sort_order            = EXCLUDED.sort_order;

-- =============================================================================
-- 2. SEED CANONICAL BILLING PLANS (Bio Alone, IG Automation Alone, Combined Bundle)
-- =============================================================================
INSERT INTO public.billing_plans (
  id, version, name, module, tier, price_monthly_minor, price_annual_minor, currency, entitlements
)
VALUES
  (
    'free_default', 1, 'Biolio Starter (Free)', 'bundle', 'free', 0, 0, 'USD',
    '{"active_module_scope":"free","bio_tier":"free","ig_tier":"free","bio_max_links":5,"bio_max_gallery_items":3,"bio_max_blog_posts":0,"bio_custom_themes":false,"bio_remove_branding":false,"bio_export_analytics":false,"bio_analytics_retention_days":7,"automation_max_active_rules":1,"automation_monthly_action_quota":100,"automation_public_replies_enabled":false,"automation_attribution_enabled":false,"automation_log_retention_days":7}'::jsonb
  ),
  (
    'bio_creator', 1, 'Biolio Bio — Creator (Single Product)', 'bio', 'creator', 900, 8400, 'USD',
    '{"active_module_scope":"bio_only","bio_tier":"creator","ig_tier":"free","bio_max_links":25,"bio_max_gallery_items":24,"bio_max_blog_posts":20,"bio_custom_themes":true,"bio_remove_branding":false,"bio_export_analytics":false,"bio_analytics_retention_days":30,"automation_max_active_rules":0,"automation_monthly_action_quota":0,"automation_public_replies_enabled":false,"automation_attribution_enabled":false,"automation_log_retention_days":7}'::jsonb
  ),
  (
    'bio_pro', 1, 'Biolio Bio — Pro (Single Product)', 'bio', 'pro', 1900, 18000, 'USD',
    '{"active_module_scope":"bio_only","bio_tier":"pro","ig_tier":"free","bio_max_links":null,"bio_max_gallery_items":100,"bio_max_blog_posts":null,"bio_custom_themes":true,"bio_remove_branding":true,"bio_export_analytics":true,"bio_analytics_retention_days":365,"automation_max_active_rules":0,"automation_monthly_action_quota":0,"automation_public_replies_enabled":false,"automation_attribution_enabled":false,"automation_log_retention_days":7}'::jsonb
  ),
  (
    'ig_creator', 1, 'Biolio Instagram Automation — Creator (Single Product)', 'instagram_automation', 'creator', 1500, 14400, 'USD',
    '{"active_module_scope":"automation_only","bio_tier":"free","ig_tier":"creator","bio_max_links":0,"bio_max_gallery_items":0,"bio_max_blog_posts":0,"bio_custom_themes":false,"bio_remove_branding":false,"bio_export_analytics":false,"bio_analytics_retention_days":7,"automation_max_active_rules":10,"automation_monthly_action_quota":2500,"automation_public_replies_enabled":true,"automation_attribution_enabled":true,"automation_log_retention_days":30}'::jsonb
  ),
  (
    'ig_pro', 1, 'Biolio Instagram Automation — Pro (Single Product)', 'instagram_automation', 'pro', 2900, 27600, 'USD',
    '{"active_module_scope":"automation_only","bio_tier":"free","ig_tier":"pro","bio_max_links":0,"bio_max_gallery_items":0,"bio_max_blog_posts":0,"bio_custom_themes":false,"bio_remove_branding":false,"bio_export_analytics":false,"bio_analytics_retention_days":7,"automation_max_active_rules":null,"automation_monthly_action_quota":25000,"automation_public_replies_enabled":true,"automation_attribution_enabled":true,"automation_log_retention_days":365}'::jsonb
  ),
  (
    'bundle_creator', 1, 'Biolio All-in-One Bundle — Creator', 'bundle', 'creator', 1900, 18000, 'USD',
    '{"active_module_scope":"bundle","bio_tier":"creator","ig_tier":"creator","bio_max_links":25,"bio_max_gallery_items":24,"bio_max_blog_posts":20,"bio_custom_themes":true,"bio_remove_branding":false,"bio_export_analytics":false,"bio_analytics_retention_days":30,"automation_max_active_rules":10,"automation_monthly_action_quota":2500,"automation_public_replies_enabled":true,"automation_attribution_enabled":true,"automation_log_retention_days":30}'::jsonb
  ),
  (
    'bundle_pro', 1, 'Biolio All-in-One Bundle — Pro', 'bundle', 'pro', 3900, 37200, 'USD',
    '{"active_module_scope":"bundle","bio_tier":"pro","ig_tier":"pro","bio_max_links":null,"bio_max_gallery_items":100,"bio_max_blog_posts":null,"bio_custom_themes":true,"bio_remove_branding":true,"bio_export_analytics":true,"bio_analytics_retention_days":365,"automation_max_active_rules":null,"automation_monthly_action_quota":25000,"automation_public_replies_enabled":true,"automation_attribution_enabled":true,"automation_log_retention_days":365}'::jsonb
  )
ON CONFLICT (id, version) DO UPDATE
  SET name                = EXCLUDED.name,
      price_monthly_minor = EXCLUDED.price_monthly_minor,
      price_annual_minor  = EXCLUDED.price_annual_minor,
      entitlements        = EXCLUDED.entitlements;

-- =============================================================================
-- 3. SEED ADMIN ROLES, PERMISSIONS & ROLE-PERMISSION MATRIX
-- =============================================================================
INSERT INTO public.admin_role_definitions (id, name, description, requires_mfa)
VALUES
  ('super_admin', 'Super Admin', 'Full system access and security administration', TRUE),
  ('ops_admin', 'Operations Admin', 'System operations, queues, flags, and workspace troubleshooting', TRUE),
  ('trust_safety_admin', 'Trust & Safety Admin', 'Content moderation, abuse reports, and creator handle governance', TRUE),
  ('billing_growth_admin', 'Billing & Growth Admin', 'Subscription management, coupon campaigns, and financial analytics', TRUE),
  ('support_readonly', 'Support Read-Only', 'Customer support tier 1 read-only inspection', FALSE)
ON CONFLICT (id) DO UPDATE
  SET name         = EXCLUDED.name,
      description  = EXCLUDED.description,
      requires_mfa = EXCLUDED.requires_mfa;

INSERT INTO public.admin_permission_definitions (id, category, description, is_high_risk)
VALUES
  ('settings.manage',       'platform',    'Manage system configuration and platform settings', TRUE),
  ('users.read',            'users',       'View user profiles and account metadata', FALSE),
  ('workspaces.read',       'workspaces',  'View workspaces, members, handles, and entitlements', FALSE),
  ('workspaces.write',      'workspaces',  'Suspend, reactivate, or override workspace entitlements', TRUE),
  ('admin.dashboard.read',  'admin',       'Access internal administration control center', FALSE),
  ('admin_team.manage',     'admin',       'Assign or revoke internal staff roles', TRUE),
  ('audit_logs.read',       'audit',       'Inspect immutable administrative audit logs', FALSE),
  ('handles.manage',        'governance',  'Reserve, release, or transfer creator handles', TRUE),
  ('bio.moderate',          'moderation',  'Review and resolve moderation reports and unpublish content', TRUE),
  ('moderation.manage',     'moderation',  'Manage moderation queues and policy violations', TRUE),
  ('automation.read',       'automation',  'Inspect Instagram accounts, webhook events, and job queues', FALSE),
  ('automation.ops',        'automation',  'Replay dead-letter jobs, pause rules, or trigger circuit breakers', TRUE),
  ('plans.manage',          'billing',     'Create and modify billing plan definitions', TRUE),
  ('billing.read',          'billing',     'View subscriptions, invoices, and coupon redemptions', FALSE),
  ('promotions.manage',     'billing',     'Create, pause, or archive promotional coupon campaigns', TRUE),
  ('coupons.manage',        'billing',     'Manage promotional coupons and discount rules', TRUE),
  ('flags.manage',          'operations',  'Toggle global feature flags and operational killswitches', TRUE),
  ('admins.manage',         'admin',       'Manage administrative privileges and access levels', TRUE),
  ('support.manage',        'support',     'Manage customer support tickets and user inquiries', FALSE),
  ('data_requests.manage',  'compliance',  'Process GDPR and CCPA creator data export requests', TRUE),
  ('analytics.read',        'analytics',   'Inspect aggregate and daily tenant platform analytics', FALSE)
ON CONFLICT (id) DO UPDATE
  SET category     = EXCLUDED.category,
      description  = EXCLUDED.description,
      is_high_risk = EXCLUDED.is_high_risk;

-- Super Admin gets all permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT 'super_admin', id FROM public.admin_permission_definitions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ops Admin
INSERT INTO public.admin_role_permissions (role_id, permission_id)
VALUES
  ('ops_admin', 'admin.dashboard.read'),
  ('ops_admin', 'workspaces.read'),
  ('ops_admin', 'workspaces.write'),
  ('ops_admin', 'handles.manage'),
  ('ops_admin', 'automation.read'),
  ('ops_admin', 'automation.ops'),
  ('ops_admin', 'flags.manage'),
  ('ops_admin', 'audit_logs.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Trust & Safety Admin
INSERT INTO public.admin_role_permissions (role_id, permission_id)
VALUES
  ('trust_safety_admin', 'admin.dashboard.read'),
  ('trust_safety_admin', 'workspaces.read'),
  ('trust_safety_admin', 'workspaces.write'),
  ('trust_safety_admin', 'handles.manage'),
  ('trust_safety_admin', 'bio.moderate'),
  ('trust_safety_admin', 'moderation.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Billing & Growth Admin
INSERT INTO public.admin_role_permissions (role_id, permission_id)
VALUES
  ('billing_growth_admin', 'admin.dashboard.read'),
  ('billing_growth_admin', 'workspaces.read'),
  ('billing_growth_admin', 'billing.read'),
  ('billing_growth_admin', 'plans.manage'),
  ('billing_growth_admin', 'promotions.manage'),
  ('billing_growth_admin', 'coupons.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Support Read-Only
INSERT INTO public.admin_role_permissions (role_id, permission_id)
VALUES
  ('support_readonly', 'admin.dashboard.read'),
  ('support_readonly', 'workspaces.read'),
  ('support_readonly', 'automation.read'),
  ('support_readonly', 'billing.read'),
  ('support_readonly', 'support.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================================================
-- 4. SEED GLOBAL FEATURE FLAGS & OPERATIONAL KILLSWITCHES
-- =============================================================================
INSERT INTO public.feature_flags (key, is_enabled, description)
VALUES
  ('killswitch.instagram_webhooks',   FALSE, 'When TRUE, drops or defers incoming Meta webhook processing immediately.'),
  ('killswitch.automation_dispatch',  FALSE, 'When TRUE, pauses all outbound Instagram Graph API DM/comment dispatches.'),
  ('killswitch.public_bio_writes',    FALSE, 'When TRUE, places Bio Studio publishing into read-only maintenance mode.'),
  ('killswitch.coupon_redemptions',   FALSE, 'When TRUE, temporarily disables promotional coupon redemptions at checkout.'),
  ('feature.new_creator_onboarding',  TRUE,  'Enables self-serve workspace provisioning and handle claiming.'),
  ('feature.public_contact_inquiries',TRUE,  'Allows visitors to submit contact inquiries on published Bio pages.')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 5. SEED SYSTEM RESERVED HANDLES (Preventing Route Collisions)
-- =============================================================================
INSERT INTO public.reserved_handles (handle, reason)
VALUES
  ('admin', 'system_route'),
  ('api', 'system_route'),
  ('app', 'system_route'),
  ('auth', 'system_route'),
  ('automation', 'system_route'),
  ('billing', 'system_route'),
  ('bio', 'system_route'),
  ('biolio', 'brand_protection'),
  ('blog', 'system_route'),
  ('careers', 'system_route'),
  ('checkout', 'system_route'),
  ('contact', 'system_route'),
  ('Creator', 'system_route'),
  ('dashboard', 'system_route'),
  ('docs', 'system_route'),
  ('explore', 'system_route'),
  ('help', 'system_route'),
  ('instagram', 'brand_protection'),
  ('legal', 'system_route'),
  ('login', 'system_route'),
  ('logout', 'system_route'),
  ('meta', 'brand_protection'),
  ('onboarding', 'system_route'),
  ('pricing', 'system_route'),
  ('privacy', 'system_route'),
  ('pro', 'system_route'),
  ('root', 'system_route'),
  ('security', 'system_route'),
  ('settings', 'system_route'),
  ('signin', 'system_route'),
  ('signup', 'system_route'),
  ('status', 'system_route'),
  ('studio', 'system_route'),
  ('support', 'system_route'),
  ('system', 'system_route'),
  ('templates', 'system_route'),
  ('terms', 'system_route'),
  ('webhooks', 'system_route'),
  ('workspace', 'system_route'),
  ('www', 'system_route')
ON CONFLICT (handle) DO NOTHING;

COMMIT;
