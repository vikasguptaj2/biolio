-- ============================================================================
-- 003_v6_indexes.sql
-- 36 explicit indexes covering all RLS predicates, composite tenant FKs,
-- status/time-series queries, and durable queue lease polling.
-- ============================================================================
BEGIN;

-- Identity & Workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces (owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_active ON public.workspace_members (user_id, workspace_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_active ON public.admin_user_roles (user_id, role_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs (created_at DESC, actor_user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events (created_at DESC, severity);

-- Biolio Bio & Media
CREATE INDEX IF NOT EXISTS idx_media_assets_workspace_state ON public.media_assets (workspace_id, lifecycle_state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bio_profiles_published_handle ON public.bio_profiles (handle) WHERE is_published = TRUE AND moderation_state = 'normal';
CREATE INDEX IF NOT EXISTS idx_bio_published_versions_profile ON public.bio_published_versions (bio_profile_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_bio_links_profile_pos ON public.bio_links (bio_profile_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_bio_links_workspace ON public.bio_links (workspace_id);
CREATE INDEX IF NOT EXISTS idx_bio_gallery_profile_pos ON public.bio_gallery_items (bio_profile_id, status, position ASC);
CREATE INDEX IF NOT EXISTS idx_bio_gallery_workspace ON public.bio_gallery_items (workspace_id);
CREATE INDEX IF NOT EXISTS idx_bio_collabs_profile_pos ON public.bio_collaborations (bio_profile_id, status, position ASC);
CREATE INDEX IF NOT EXISTS idx_bio_blog_posts_profile_status ON public.bio_blog_posts (bio_profile_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_bio_contact_workspace_status ON public.bio_contact_submissions (workspace_id, status, created_at DESC);

-- Instagram Automation
CREATE INDEX IF NOT EXISTS idx_ig_connections_status_expiry ON public.instagram_connections (status, token_expires_at);
CREATE INDEX IF NOT EXISTS idx_automation_templates_workspace ON public.automation_message_templates (workspace_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_dispatch_order ON public.automation_rules (instagram_connection_id, is_enabled, priority ASC, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_automation_rules_workspace ON public.automation_rules (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ig_webhook_events_status ON public.instagram_webhook_events (processing_status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_executions_workspace_created ON public.automation_executions (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_executions_retry ON public.automation_executions (status, next_retry_at) WHERE status IN ('retry_scheduled', 'outcome_unknown');
CREATE INDEX IF NOT EXISTS idx_automation_attempts_execution ON public.automation_attempts (execution_id, attempt_number ASC);

-- Billing & Promotions
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_status ON public.subscriptions (workspace_id, status, current_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_provider_events_status_received ON public.provider_events (provider, processing_status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_workspace_created ON public.payments (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_events_payment ON public.refund_events (payment_id, status);
CREATE INDEX IF NOT EXISTS idx_promotions_active_window ON public.promotions (is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_promotion ON public.coupon_codes (promotion_id, is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_workspace_promo ON public.coupon_redemptions (workspace_id, promotion_id, status);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_expiry ON public.coupon_redemptions (status, reservation_expires_at) WHERE status = 'reserved';

-- Support, Moderation, Privacy, Analytics & Job Queue
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority ON public.support_tickets (status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_workspace ON public.support_tickets (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_status ON public.moderation_cases (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_requests_status_due ON public.data_requests (status, due_at ASC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_workspace_created ON public.analytics_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_queue_poll ON private_integrations.job_queue (queue_name, status, visible_at ASC) WHERE status IN ('ready', 'delayed', 'leased');

COMMIT;
