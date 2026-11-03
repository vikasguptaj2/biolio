-- ============================================================================
-- 004_v6_grants_and_complete_rls_policies.sql
-- Complete two-layer authorization: Explicit table/column GRANTS + 100% RLS
-- policy coverage across every exposed public table (Fixes P0.3).
-- ============================================================================
BEGIN;

-- 1. Helper Functions for Cached RLS Predicates
CREATE OR REPLACE FUNCTION public.is_active_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = (SELECT auth.uid())
      AND wm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_workspace(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = (SELECT auth.uid())
      AND wm.status = 'active'
      AND wm.role IN ('owner', 'admin', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_user_roles aur
    JOIN public.admin_role_permissions arp ON arp.role_id = aur.role_id
    WHERE aur.user_id = (SELECT auth.uid())
      AND aur.is_active = TRUE
      AND (arp.permission_id = p_permission_id OR aur.role_id = 'super_admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_workspace_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_workspace_member(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.can_edit_workspace(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_workspace(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_admin_permission(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(TEXT) TO authenticated, service_role;

-- 2. Enable RLS on all 40 public tables
DO $$
DECLARE
  v_tbl TEXT;
BEGIN
  FOR v_tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_tbl);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated;', v_tbl);
  END LOOP;
END $$;

-- 3. Explicit Least-Privilege Grants
-- 3a. Anonymous (`anon`) read grants for Public Bio, Published Blog Posts, Public Catalogs, and Public Settings
GRANT SELECT ON public.reserved_handles, public.bio_templates, public.bio_published_versions, public.billing_plans, public.platform_settings TO anon;
GRANT SELECT (id, workspace_id, handle, display_name, is_published, current_published_version_id, moderation_state) ON public.bio_profiles TO anon;
GRANT SELECT (id, bio_profile_id, workspace_id, title, slug, category, excerpt, sanitized_html, cover_media_id, reading_time_minutes, seo_title, seo_description, status, published_at) ON public.bio_blog_posts TO anon;

-- 3b. Authenticated (`authenticated`) grants
GRANT SELECT, UPDATE (full_name, avatar_url) ON public.user_profiles TO authenticated;
GRANT SELECT, UPDATE (name, creator_role) ON public.workspaces TO authenticated;
GRANT SELECT ON public.workspace_members, public.reserved_handles, public.bio_templates, public.billing_plans, public.workspace_entitlements, public.subscriptions, public.payments, public.refund_events, public.coupon_redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_profiles, public.bio_links, public.bio_gallery_items, public.bio_collaborations, public.bio_blog_posts, public.automation_message_templates, public.automation_rules TO authenticated;
GRANT SELECT, UPDATE (status) ON public.bio_contact_submissions TO authenticated;
GRANT SELECT ON public.media_assets, public.bio_published_versions, public.instagram_connections, public.automation_executions, public.automation_attempts, public.analytics_events, public.analytics_daily_aggregates TO authenticated;
GRANT SELECT, INSERT ON public.support_tickets, public.support_messages, public.moderation_appeals, public.data_requests TO authenticated;
GRANT SELECT ON public.admin_role_definitions, public.admin_permission_definitions, public.admin_role_permissions, public.admin_user_roles, public.admin_audit_logs, public.security_events, public.instagram_webhook_events, public.provider_events, public.promotions, public.coupon_code_batches, public.coupon_codes, public.moderation_cases, public.platform_settings, public.feature_flags TO authenticated;

-- 4. Complete Per-Table RLS Policies
-- [01] reserved_handles
CREATE POLICY "public_read_reserved_handles" ON public.reserved_handles FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "admin_manage_reserved_handles" ON public.reserved_handles FOR ALL TO authenticated USING (public.has_admin_permission('settings.manage')) WITH CHECK (public.has_admin_permission('settings.manage'));

-- [02] user_profiles
CREATE POLICY "users_read_own_or_admin_profile" ON public.user_profiles FOR SELECT TO authenticated USING (id = (SELECT auth.uid()) OR public.has_admin_permission('users.read'));
CREATE POLICY "users_update_own_profile" ON public.user_profiles FOR UPDATE TO authenticated USING (id = (SELECT auth.uid()) AND account_status = 'active') WITH CHECK (id = (SELECT auth.uid()) AND account_status = 'active');

-- [03] workspaces
CREATE POLICY "members_or_admin_read_workspaces" ON public.workspaces FOR SELECT TO authenticated USING (public.is_active_workspace_member(id) OR public.has_admin_permission('workspaces.read'));
CREATE POLICY "owners_update_workspace" ON public.workspaces FOR UPDATE TO authenticated USING (public.can_edit_workspace(id) AND status = 'active') WITH CHECK (public.can_edit_workspace(id));

-- [04] workspace_members
CREATE POLICY "members_or_admin_read_memberships" ON public.workspace_members FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('workspaces.read'));

-- [05-08] admin RBAC tables
CREATE POLICY "admin_read_role_defs" ON public.admin_role_definitions FOR SELECT TO authenticated USING (public.has_admin_permission('admin.dashboard.read'));
CREATE POLICY "admin_read_perm_defs" ON public.admin_permission_definitions FOR SELECT TO authenticated USING (public.has_admin_permission('admin.dashboard.read'));
CREATE POLICY "admin_read_role_perms" ON public.admin_role_permissions FOR SELECT TO authenticated USING (public.has_admin_permission('admin.dashboard.read'));
CREATE POLICY "admin_read_user_roles" ON public.admin_user_roles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.has_admin_permission('admin_team.manage'));

-- [09-10] admin_audit_logs & security_events
CREATE POLICY "admin_read_audit_logs" ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.has_admin_permission('audit.read'));
CREATE POLICY "admin_read_security_events" ON public.security_events FOR SELECT TO authenticated USING (public.has_admin_permission('audit.read'));

-- [11] bio_templates
CREATE POLICY "public_read_bio_templates" ON public.bio_templates FOR SELECT TO anon, authenticated USING (TRUE);

-- [12] media_assets
CREATE POLICY "members_or_admin_read_media" ON public.media_assets FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('bio.moderate'));

-- [13] bio_profiles (Includes P0.3 fix for anonymous public lookup of published profiles)
CREATE POLICY "anon_read_published_bio_profiles" ON public.bio_profiles FOR SELECT TO anon, authenticated USING (is_published = TRUE AND moderation_state = 'normal');
CREATE POLICY "members_or_admin_read_bio_profiles" ON public.bio_profiles FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('bio.moderate'));
CREATE POLICY "members_insert_bio_profile" ON public.bio_profiles FOR INSERT TO authenticated WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_update_bio_profile" ON public.bio_profiles FOR UPDATE TO authenticated USING (public.can_edit_workspace(workspace_id)) WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_delete_bio_profile" ON public.bio_profiles FOR DELETE TO authenticated USING (public.can_edit_workspace(workspace_id));

-- [14] bio_published_versions (Works seamlessly with anon_read_published_bio_profiles)
CREATE POLICY "public_read_active_published_snapshot" ON public.bio_published_versions FOR SELECT TO anon, authenticated USING (
  EXISTS (
    SELECT 1 FROM public.bio_profiles bp
    WHERE bp.id = bio_published_versions.bio_profile_id
      AND bp.current_published_version_id = bio_published_versions.id
      AND bp.is_published = TRUE
      AND bp.moderation_state = 'normal'
  )
);
CREATE POLICY "members_or_admin_read_all_snapshots" ON public.bio_published_versions FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('bio.moderate'));

-- [15] bio_links
CREATE POLICY "members_or_admin_read_bio_links" ON public.bio_links FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('bio.moderate'));
CREATE POLICY "members_insert_bio_links" ON public.bio_links FOR INSERT TO authenticated WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_update_bio_links" ON public.bio_links FOR UPDATE TO authenticated USING (public.can_edit_workspace(workspace_id)) WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_delete_bio_links" ON public.bio_links FOR DELETE TO authenticated USING (public.can_edit_workspace(workspace_id));

-- [16] bio_gallery_items
CREATE POLICY "members_or_admin_read_gallery" ON public.bio_gallery_items FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('bio.moderate'));
CREATE POLICY "members_insert_gallery" ON public.bio_gallery_items FOR INSERT TO authenticated WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_update_gallery" ON public.bio_gallery_items FOR UPDATE TO authenticated USING (public.can_edit_workspace(workspace_id)) WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_delete_gallery" ON public.bio_gallery_items FOR DELETE TO authenticated USING (public.can_edit_workspace(workspace_id));

-- [17] bio_collaborations
CREATE POLICY "members_or_admin_read_collabs" ON public.bio_collaborations FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('bio.moderate'));
CREATE POLICY "members_insert_collabs" ON public.bio_collaborations FOR INSERT TO authenticated WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_update_collabs" ON public.bio_collaborations FOR UPDATE TO authenticated USING (public.can_edit_workspace(workspace_id)) WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_delete_collabs" ON public.bio_collaborations FOR DELETE TO authenticated USING (public.can_edit_workspace(workspace_id));

-- [18] bio_blog_posts
CREATE POLICY "public_read_published_blog_posts" ON public.bio_blog_posts FOR SELECT TO anon, authenticated USING (
  status = 'published' AND EXISTS (
    SELECT 1 FROM public.bio_profiles bp
    WHERE bp.id = bio_blog_posts.bio_profile_id AND bp.is_published = TRUE AND bp.moderation_state = 'normal'
  )
);
CREATE POLICY "members_or_admin_read_blog_posts" ON public.bio_blog_posts FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('bio.moderate'));
CREATE POLICY "members_insert_blog_posts" ON public.bio_blog_posts FOR INSERT TO authenticated WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_update_blog_posts" ON public.bio_blog_posts FOR UPDATE TO authenticated USING (public.can_edit_workspace(workspace_id)) WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_delete_blog_posts" ON public.bio_blog_posts FOR DELETE TO authenticated USING (public.can_edit_workspace(workspace_id));

-- [19] bio_contact_submissions
CREATE POLICY "members_or_admin_read_inquiries" ON public.bio_contact_submissions FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('support.manage'));
CREATE POLICY "members_update_inquiry_status" ON public.bio_contact_submissions FOR UPDATE TO authenticated USING (public.can_edit_workspace(workspace_id)) WITH CHECK (public.can_edit_workspace(workspace_id));

-- [20] instagram_connections
CREATE POLICY "members_or_admin_read_ig_connections" ON public.instagram_connections FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('instagram.connections.read'));

-- [21] automation_message_templates
CREATE POLICY "members_read_automation_templates" ON public.automation_message_templates FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('instagram.connections.read'));
CREATE POLICY "members_insert_automation_templates" ON public.automation_message_templates FOR INSERT TO authenticated WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_update_automation_templates" ON public.automation_message_templates FOR UPDATE TO authenticated USING (public.can_edit_workspace(workspace_id)) WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_delete_automation_templates" ON public.automation_message_templates FOR DELETE TO authenticated USING (public.can_edit_workspace(workspace_id));

-- [22] automation_rules
CREATE POLICY "members_or_admin_read_automation_rules" ON public.automation_rules FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('instagram.connections.read'));
CREATE POLICY "members_insert_automation_rules" ON public.automation_rules FOR INSERT TO authenticated WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_update_automation_rules" ON public.automation_rules FOR UPDATE TO authenticated USING (public.can_edit_workspace(workspace_id)) WITH CHECK (public.can_edit_workspace(workspace_id));
CREATE POLICY "members_delete_automation_rules" ON public.automation_rules FOR DELETE TO authenticated USING (public.can_edit_workspace(workspace_id));

-- [23-25] instagram_webhook_events, automation_executions, automation_attempts
CREATE POLICY "admin_read_ig_webhook_events" ON public.instagram_webhook_events FOR SELECT TO authenticated USING (public.has_admin_permission('webhooks.read'));
CREATE POLICY "members_or_admin_read_executions" ON public.automation_executions FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('instagram.connections.read'));
CREATE POLICY "members_or_admin_read_attempts" ON public.automation_attempts FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('instagram.connections.read'));

-- [26-34] Billing & Promotions
CREATE POLICY "public_read_active_plans" ON public.billing_plans FOR SELECT TO anon, authenticated USING (is_active_for_sale = TRUE OR public.has_admin_permission('plans.manage'));
CREATE POLICY "members_or_admin_read_entitlements" ON public.workspace_entitlements FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('billing.read'));
CREATE POLICY "members_or_admin_read_subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('billing.read'));
CREATE POLICY "admin_read_provider_events" ON public.provider_events FOR SELECT TO authenticated USING (public.has_admin_permission('webhooks.read') OR public.has_admin_permission('billing.read'));
CREATE POLICY "members_or_admin_read_payments" ON public.payments FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('billing.read'));
CREATE POLICY "members_or_admin_read_refunds" ON public.refund_events FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('billing.read'));
CREATE POLICY "admin_read_promotions" ON public.promotions FOR SELECT TO authenticated USING (public.has_admin_permission('promotions.manage'));
CREATE POLICY "admin_read_coupon_batches" ON public.coupon_code_batches FOR SELECT TO authenticated USING (public.has_admin_permission('promotions.manage'));
CREATE POLICY "admin_read_coupon_codes" ON public.coupon_codes FOR SELECT TO authenticated USING (public.has_admin_permission('promotions.manage'));
CREATE POLICY "members_or_admin_read_redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('promotions.manage'));

-- [35-40] Support, Moderation, Data Requests, Settings, Flags, Analytics
CREATE POLICY "users_or_support_read_tickets" ON public.support_tickets FOR SELECT TO authenticated USING (requester_user_id = (SELECT auth.uid()) OR public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('support.manage'));
CREATE POLICY "users_insert_support_tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (requester_user_id = (SELECT auth.uid()));
CREATE POLICY "users_or_support_read_messages" ON public.support_messages FOR SELECT TO authenticated USING (
  public.has_admin_permission('support.manage') OR (
    visibility = 'public_reply' AND EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND (st.requester_user_id = (SELECT auth.uid()) OR public.is_active_workspace_member(st.workspace_id))
    )
  )
);
CREATE POLICY "users_insert_public_support_reply" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (
  sender_user_id = (SELECT auth.uid()) AND (
    public.has_admin_permission('support.manage') OR (
      visibility = 'public_reply' AND EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = support_messages.ticket_id AND st.requester_user_id = (SELECT auth.uid())
      )
    )
  )
);
CREATE POLICY "members_or_admin_read_moderation" ON public.moderation_cases FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('bio.moderate'));
CREATE POLICY "members_or_admin_read_appeals" ON public.moderation_appeals FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('bio.moderate'));
CREATE POLICY "members_insert_appeals" ON public.moderation_appeals FOR INSERT TO authenticated WITH CHECK (public.can_edit_workspace(workspace_id) AND submitted_by = (SELECT auth.uid()));
CREATE POLICY "users_or_admin_read_data_requests" ON public.data_requests FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.has_admin_permission('data_requests.manage'));
CREATE POLICY "users_insert_data_requests" ON public.data_requests FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "public_or_admin_read_settings" ON public.platform_settings FOR SELECT TO anon, authenticated USING (is_public_readable = TRUE OR public.has_admin_permission('settings.manage'));
CREATE POLICY "authenticated_read_feature_flags" ON public.feature_flags FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "members_or_admin_read_analytics_events" ON public.analytics_events FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('analytics.read'));
CREATE POLICY "members_or_admin_read_analytics_daily" ON public.analytics_daily_aggregates FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id) OR public.has_admin_permission('analytics.read'));

-- 5. Append-Only Audit Log Enforcement Trigger
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_logs is append-only and cannot be modified or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_admin_audit_logs ON public.admin_audit_logs;
CREATE TRIGGER trg_immutable_admin_audit_logs
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

COMMIT;
