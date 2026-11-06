-- =============================================================================
-- BIOLIO V6.0 HARDENED ENTERPRISE MIGRATION — PHASE 16
-- System Route Reservations (Privacy, Terms, Refunds, Contact) & Retention Views
-- Closes Audit Findings: B-25, DPDP 2027 Compliance, Meta Platform Terms
-- File: supabase/migrations/016_v6_compliance_and_reserved_routes.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. RESERVE STATUTORY LEGAL & TRUST ROUTES FROM CREATOR HANDLE CLAIM
-- Prevents any user from claiming biolio.site/privacy, biolio.site/terms, etc.
-- =============================================================================
INSERT INTO public.reserved_handles (handle, reason)
VALUES
  ('automation', 'system_route_product'),
  ('privacy', 'system_route_legal'),
  ('terms', 'system_route_legal'),
  ('refunds', 'system_route_legal'),
  ('contact', 'system_route_support'),
  ('support', 'system_route_support'),
  ('grievance', 'system_route_legal'),
  ('security', 'system_route_security'),
  ('compliance', 'system_route_legal')
ON CONFLICT (handle) DO NOTHING;

-- =============================================================================
-- 2. ENSURE DPDP RETENTION INDEXES
-- Optimizes daily /api/jobs/purge queries
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ig_webhooks_retention
  ON public.instagram_webhook_events (retention_expires_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_retention
  ON public.analytics_events (retention_expires_at);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_stale
  ON public.checkout_sessions (status, created_at)
  WHERE status = 'pending';

COMMIT;

