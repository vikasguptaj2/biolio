-- ============================================================================
-- 006_v6_seeds_and_bootstrap.sql
-- Seeds canonical reserved handles, 6 Bio templates, 7 billing plans,
-- 7 admin roles, 32 granular permissions, default safety flags, and
-- owner-controlled first Super Admin bootstrap function.
-- ============================================================================
BEGIN;

-- 1. Seed Reserved Handles (Fixes P1.14)
INSERT INTO public.reserved_handles (handle, reason) VALUES
  ('admin', 'system_route'), ('api', 'system_route'), ('auth', 'system_route'),
  ('bio', 'system_route'), ('automation', 'system_route'), ('templates', 'system_route'),
  ('pricing', 'system_route'), ('faq', 'system_route'), ('signin', 'system_route'),
  ('signup', 'system_route'), ('onboarding', 'system_route'), ('dashboard', 'system_route'),
  ('settings', 'system_route'), ('webhooks', 'system_route'), ('support', 'system_route'),
  ('terms', 'system_route'), ('privacy', 'system_route'), ('status', 'system_route'),
  ('assets', 'system_route'), ('static', 'system_route'), ('r', 'system_route'),
  ('blog', 'system_route'), ('biolio', 'brand_protection'), ('root', 'system_route')
ON CONFLICT (handle) DO NOTHING;

-- 2. Seed 6 Editorial Bio Templates (Fixes P1.14)
INSERT INTO public.bio_templates (id, name, category, description, is_premium, sort_order, default_theme_config) VALUES
  ('sunday-studio', 'Sunday Studio', 'Editorial · Creator', 'Quiet, editorial and personal serif layout.', FALSE, 1, '{"palette":"studio-ink","headingFont":"Playfair Display","bodyFont":"DM Sans","buttonStyle":"rounded"}'),
  ('coastline', 'Coastline', 'Photography · Travel', 'Made for image-led visual stories.', FALSE, 2, '{"palette":"coastal","headingFont":"Playfair Display","bodyFont":"DM Sans","buttonStyle":"pill"}'),
  ('form-function', 'Form & Function', 'Portfolio · Freelancer', 'Structured showcase for designers and makers.', FALSE, 3, '{"palette":"olive-sand","headingFont":"Manrope","bodyFont":"DM Sans","buttonStyle":"sharp"}'),
  ('soft-focus', 'Soft Focus', 'Creator · Personal brand', 'Warm lifestyle and personal identity layout.', TRUE, 4, '{"palette":"soft-lilac","headingFont":"Playfair Display","bodyFont":"DM Sans","buttonStyle":"rounded"}'),
  ('field-notes', 'Field Notes', 'Writer · Journal', 'Publishing-first layout for essays and guides.', TRUE, 5, '{"palette":"terracotta","headingFont":"Playfair Display","bodyFont":"DM Sans","buttonStyle":"sharp"}'),
  ('studio-hours', 'Studio Hours', 'Artist · Creative work', 'Gallery-led presentation for studios.', TRUE, 6, '{"palette":"sunday-warm","headingFont":"Manrope","bodyFont":"DM Sans","buttonStyle":"rounded"}')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed 7 Initial Billing Plans (Version 1 — Configurable Proposal)
INSERT INTO public.billing_plans (id, version, name, module, tier, currency, price_monthly_minor, price_annual_minor, sort_order, entitlements) VALUES
  ('free', 1, 'Free Workspace', 'bundle', 'free', 'INR', 0, 0, 1, '{"bio_max_links":5,"bio_max_gallery_items":6,"bio_max_blog_posts":1,"bio_analytics_retention_days":7,"automation_max_active_rules":1,"automation_monthly_action_quota":100,"automation_log_retention_days":7}'),
  ('bio_creator', 1, 'Biolio Bio — Creator', 'bio', 'creator', 'INR', 29900, 287000, 2, '{"bio_max_links":null,"bio_max_gallery_items":30,"bio_max_blog_posts":20,"bio_custom_themes":true,"bio_analytics_retention_days":90}'),
  ('bio_pro', 1, 'Biolio Bio — Pro', 'bio', 'pro', 'INR', 59900, 575000, 3, '{"bio_max_links":null,"bio_max_gallery_items":null,"bio_max_blog_posts":null,"bio_custom_themes":true,"bio_remove_branding":true,"bio_export_analytics":true,"bio_analytics_retention_days":365}'),
  ('ig_creator', 1, 'IG Automation — Creator', 'instagram_automation', 'creator', 'INR', 49900, 479000, 4, '{"automation_max_active_rules":5,"automation_monthly_action_quota":2500,"automation_public_replies_enabled":true,"automation_log_retention_days":30}'),
  ('ig_pro', 1, 'IG Automation — Pro', 'instagram_automation', 'pro', 'INR', 99900, 959000, 5, '{"automation_max_active_rules":null,"automation_monthly_action_quota":25000,"automation_public_replies_enabled":true,"automation_attribution_enabled":true,"automation_log_retention_days":365}'),
  ('bundle_creator', 1, 'All-in-One Creator Bundle', 'bundle', 'creator', 'INR', 59900, 575000, 6, '{"bio_max_links":null,"bio_max_gallery_items":30,"bio_max_blog_posts":20,"bio_custom_themes":true,"bio_analytics_retention_days":90,"automation_max_active_rules":5,"automation_monthly_action_quota":2500,"automation_public_replies_enabled":true,"automation_log_retention_days":30}'),
  ('bundle_pro', 1, 'All-in-One Pro Bundle', 'bundle', 'pro', 'INR', 119900, 1151000, 7, '{"bio_max_links":null,"bio_max_gallery_items":null,"bio_max_blog_posts":null,"bio_custom_themes":true,"bio_remove_branding":true,"bio_export_analytics":true,"bio_analytics_retention_days":365,"automation_max_active_rules":null,"automation_monthly_action_quota":25000,"automation_public_replies_enabled":true,"automation_attribution_enabled":true,"automation_log_retention_days":365}')
ON CONFLICT (id, version) DO NOTHING;

-- 4. Seed 7 Admin Roles & 32 Granular Permissions
INSERT INTO public.admin_role_definitions (id, name, description, requires_mfa) VALUES
  ('super_admin', 'Super Admin', 'Complete platform control, emergency kill switches, and admin team management.', TRUE),
  ('platform_admin', 'Platform Admin', 'User/workspace operations, product configuration, and platform settings.', TRUE),
  ('billing_admin', 'Billing Admin', 'Plans, subscriptions, payment references, provider refunds, and promotions.', TRUE),
  ('support_agent', 'Support Agent', 'Tickets and minimal read-only customer account context.', TRUE),
  ('trust_safety', 'Trust & Safety', 'Content reports, Bio moderation, restrictions, and appeals.', TRUE),
  ('ops_engineer', 'Ops Engineer', 'Webhooks, queues, integration health, and automation operational controls.', TRUE),
  ('read_only_analyst', 'Read-Only Analyst', 'Aggregated metrics, cohort reports, and audit read access.', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_permission_definitions (id, category, description, is_high_risk) VALUES
  ('admin.dashboard.read', 'overview', 'View admin overview dashboard', FALSE),
  ('users.read', 'users', 'View creator user directory and safe profile details', FALSE),
  ('users.suspend', 'users', 'Suspend creator user account', TRUE),
  ('users.reactivate', 'users', 'Reactivate suspended user account', TRUE),
  ('users.sessions.revoke', 'users', 'Revoke active user sessions', TRUE),
  ('workspaces.read', 'workspaces', 'View workspace directory and usage', FALSE),
  ('workspaces.suspend', 'workspaces', 'Suspend workspace tenant', TRUE),
  ('entitlements.override', 'workspaces', 'Grant time-boxed manual entitlement override', TRUE),
  ('bio.moderate', 'moderation', 'Review and moderate reported Bio content', TRUE),
  ('reports.manage', 'moderation', 'Manage abuse and copyright reports', FALSE),
  ('instagram.connections.read', 'instagram', 'Inspect masked Instagram connection health and logs', FALSE),
  ('automation.pause', 'instagram', 'Pause individual rule or Instagram connection', TRUE),
  ('automation.global_pause', 'instagram', 'Trigger global Instagram dispatch kill switch', TRUE),
  ('billing.read', 'billing', 'View subscriptions and payment ledger', FALSE),
  ('billing.refund', 'billing', 'Initiate provider-backed payment refund', TRUE),
  ('plans.manage', 'billing', 'Create and version commercial billing plans', TRUE),
  ('promotions.manage', 'promotions', 'Create and edit promotion campaigns', TRUE),
  ('promotions.codes.generate', 'promotions', 'Generate bulk coupon code batches', TRUE),
  ('promotions.codes.export', 'promotions', 'Export bulk coupon code CSV', TRUE),
  ('support.manage', 'support', 'Manage support tickets, replies, and internal notes', FALSE),
  ('analytics.read', 'analytics', 'View aggregated platform analytics', FALSE),
  ('analytics.export', 'analytics', 'Export aggregated analytics reports', TRUE),
  ('webhooks.read', 'operations', 'Inspect redacted webhook deliveries', FALSE),
  ('webhooks.replay', 'operations', 'Replay idempotent webhook events', TRUE),
  ('queues.read', 'operations', 'Inspect background job queues and dead letters', FALSE),
  ('queues.retry', 'operations', 'Retry transient dead-letter queue jobs', TRUE),
  ('integrations.read', 'operations', 'View provider connectivity health', FALSE),
  ('settings.manage', 'governance', 'Update platform settings and feature flags', TRUE),
  ('admin_team.manage', 'governance', 'Invite admins and assign/revoke RBAC roles', TRUE),
  ('audit.read', 'governance', 'View append-only admin audit and security logs', FALSE),
  ('data_requests.manage', 'privacy', 'Process privacy export and deletion requests', FALSE),
  ('data_requests.approve', 'privacy', 'Approve final account deletion or data export', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Map all permissions to `super_admin`
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT 'super_admin', id FROM public.admin_permission_definitions
ON CONFLICT DO NOTHING;

-- Map role-specific subsets
INSERT INTO public.admin_role_permissions (role_id, permission_id) VALUES
  ('support_agent', 'admin.dashboard.read'), ('support_agent', 'users.read'),
  ('support_agent', 'workspaces.read'), ('support_agent', 'instagram.connections.read'),
  ('support_agent', 'support.manage'),
  ('billing_admin', 'admin.dashboard.read'), ('billing_admin', 'billing.read'),
  ('billing_admin', 'billing.refund'), ('billing_admin', 'plans.manage'),
  ('billing_admin', 'promotions.manage'), ('billing_admin', 'promotions.codes.generate'),
  ('billing_admin', 'promotions.codes.export'),
  ('trust_safety', 'admin.dashboard.read'), ('trust_safety', 'users.read'),
  ('trust_safety', 'users.suspend'), ('trust_safety', 'workspaces.read'),
  ('trust_safety', 'workspaces.suspend'), ('trust_safety', 'bio.moderate'),
  ('trust_safety', 'reports.manage'),
  ('ops_engineer', 'admin.dashboard.read'), ('ops_engineer', 'instagram.connections.read'),
  ('ops_engineer', 'automation.pause'), ('ops_engineer', 'webhooks.read'),
  ('ops_engineer', 'webhooks.replay'), ('ops_engineer', 'queues.read'),
  ('ops_engineer', 'queues.retry'), ('ops_engineer', 'integrations.read'),
  ('read_only_analyst', 'admin.dashboard.read'), ('read_only_analyst', 'analytics.read'),
  ('read_only_analyst', 'audit.read')
ON CONFLICT DO NOTHING;

-- 5. Seed Platform Safety Controls (Fail-Closed by Default for External Dispatch)
INSERT INTO public.platform_settings (key, value, is_public_readable, version) VALUES
  ('global_instagram_dispatch_enabled', '{"enabled": false, "note": "Keep false until Meta App Review and staging verification pass"}', FALSE, 1),
  ('new_workspace_signups_enabled', '{"enabled": true}', TRUE, 1),
  ('public_bio_publishing_enabled', '{"enabled": true}', TRUE, 1),
  ('maintenance_banner', '{"enabled": false, "message": ""}', TRUE, 1)
ON CONFLICT (key) DO NOTHING;

-- 6. Owner-Controlled First Super Admin Bootstrap Function (Service-Role Only)
CREATE OR REPLACE FUNCTION private_integrations.bootstrap_first_super_admin(
  p_target_user_id UUID,
  p_reason TEXT DEFAULT 'Initial platform owner super_admin provisioning'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_integrations, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_user_roles WHERE role_id = 'super_admin' AND is_active = TRUE) THEN
    RAISE EXCEPTION 'BOOTSTRAP_LOCKED: An active super_admin already exists. Use standard admin_team.manage workflow.';
  END IF;

  INSERT INTO public.admin_user_roles (user_id, role_id, assigned_by, mfa_enforced, is_active)
  VALUES (p_target_user_id, 'super_admin', p_target_user_id, TRUE, TRUE);

  INSERT INTO public.admin_audit_logs (
    actor_user_id, actor_role, permission_used, action, target_type, target_id, reason, result_status
  ) VALUES (
    p_target_user_id, 'super_admin', 'bootstrap', 'SUPER_ADMIN_BOOTSTRAPPED', 'user_profile', p_target_user_id::TEXT, p_reason, 'success'
  );

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION private_integrations.bootstrap_first_super_admin(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_integrations.bootstrap_first_super_admin(UUID, TEXT) TO service_role;

COMMIT;
