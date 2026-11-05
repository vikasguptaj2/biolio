# Biolio v6.0 Enterprise — Database Design & Schema Architecture
**Document ID:** `DOC-PHASE1-03`  
**Status:** Approved / Authoritative  
**Scope:** PostgreSQL 17 Canonical Schema, Multi-Tenant RLS Policies, Forward Migrations `000`–`010`, Five-Layer Locks, and Atomic Stored Procedures  
**Date:** 2026-11-05  

---

## 1. Relational Database Principles (PostgreSQL 17)

1. **Composite Tenant Keys**: Every child table carries `(id, workspace_id)` and child foreign keys reference `(parent_id, workspace_id)` rather than `id` alone. This makes cross-tenant reference leaks mathematically impossible at the database engine level.
2. **Default-Privilege Lockdown**: Default privileges are revoked from `PUBLIC`, `anon`, and `authenticated`. Permissions are granted selectively per table and per column (e.g., creators can update `full_name` and `avatar_url` on `user_profiles`, but never `account_status`).
3. **Atomic State Transitions**: All complex state changes (Bio snapshot publishing, workspace provisioning, coupon redemptions, and plan entitlement updates) run inside atomic PostgreSQL stored procedures (`SECURITY DEFINER` with fixed `search_path = public, pg_temp`).
4. **Append-Only Auditing**: Operational mutations (plan overrides, suspensions, feature flag flips, admin logins) trigger immutable audit log entries in `public.admin_audit_logs`.

---

## 2. Entity Relationship Overview

```
┌─────────────────┐       ┌─────────────────┐
│   auth.users    │◄──────┤  user_profiles  │
└────────┬────────┘       └────────┬────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│   workspaces    │◄──────┤workspace_members│
└────────┬────────┘       └─────────────────┘
         │
         ├──────────────────────────┬──────────────────────────┐
         ▼                          ▼                          ▼
┌───────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│workspace_         │      │   bio_profiles   │      │   instagram_     │
│entitlements       │      └────────┬─────────┘      │   connections    │
└───────────────────┘               │                └────────┬─────────┘
         ▲                          │                         │
         │                          ├──────────────┐          ▼
┌───────────────────┐               ▼              ▼ ┌──────────────────┐
│   subscriptions   │      ┌─────────────┐ ┌──────┐  │ automation_rules │
└────────┬──────────┘      │  bio_links  │ │blog/ │  └────────┬─────────┘
         │                 └─────────────┘ │collab│           │
         ▼                                 └──────┘           ▼
┌───────────────────┐                        ┌──────────────────────────┐
│   billing_plans   │                        │  automation_executions   │
└───────────────────┘                        └──────────────────────────┘
```

---

## 3. Migration Lineage (`000` through `010`)

| Migration File | Stage | Core Entities & Changes Introduced |
| :--- | :--- | :--- |
| `000_v6_foundation_and_extensions.sql` | Applied | PostgreSQL extensions (`pgcrypto`, `uuid-ossp`, `citext`), custom enums, schema privilege revocations. |
| `001_v6_auth_and_workspaces.sql` | Applied | `workspaces`, `workspace_members`, `user_profiles`, RBAC definitions. |
| `002_v6_bio_profiles_and_links.sql` | Applied | `bio_profiles`, `bio_links`, `bio_gallery_items`, `bio_collaborations`, `bio_templates`. |
| `003_v6_instagram_automation.sql` | Applied | `instagram_connections`, `automation_rules`, `automation_executions`, `instagram_webhook_events`. |
| `004_v6_billing_and_entitlements.sql` | Applied | `billing_plans`, `subscriptions`, `workspace_entitlements`, 76 multi-tenant RLS policies. |
| `005_v6_atomic_rpcs_and_worker_queues.sql` | Applied | 11 atomic stored procedures: `handle_new_auth_user`, `publish_bio_snapshot`, `preview_coupon`, `claim_next_jobs`. |
| `006_v6_seeds_and_bootstrap.sql` | Applied | 17 Bio templates seeded, feature flags, initial system roles, baseline `reserved_handles`. |
| `007_v6_pgtap_and_privilege_verification.sql` | Applied | Automated security assertion suite verifying RLS enablement and zero public write access. |
| `008_v6_enterprise_entitlements_and_admin_lock.sql` | Applied | Atomic `apply_workspace_plan_entitlements` and `admin_override_workspace_status` restricted to `service_role`. |
| `009_v6_hardened_billing_and_admin.sql` | **Forward** | `checkout_sessions`, `admin_sessions`, `admin_login_attempts`, canonical INR plans (`₹299`–`₹1,199`), `project_workspace_entitlements`. |
| `010_v6_five_layer_module_locks_and_public_rpc.sql` | **Forward** | `is_module_unlocked`, module-aware RLS `WITH CHECK` policies, quota triggers, `public_get_bio`, expanded `reserved_handles`. |

---

## 4. Five-Layer Module Locking in PostgreSQL

To fulfill Audit Finding `B-07`, module locking is enforced inside the database engine:

### 4.1 Module Unlocked Predicate (`public.is_module_unlocked`)
```sql
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
```

### 4.2 Module-Aware RLS Policies
Every write policy on `bio_*` and `automation_*` tables includes `is_module_unlocked`:
```sql
-- Bio Links Policy
CREATE POLICY members_insert_bio_links
  ON public.bio_links FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'bio')
  );

-- Automation Rules Policy
CREATE POLICY members_insert_automation_rules
  ON public.automation_rules FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_workspace(workspace_id)
    AND public.is_module_unlocked(workspace_id, 'instagram_automation')
  );
```

### 4.3 Row-Locking Quota Enforcement Triggers
`BEFORE INSERT` triggers lock the parent workspace row and prevent quota overages even under concurrent requests:
```sql
CREATE OR REPLACE FUNCTION public.tg_check_bio_link_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max INTEGER;
  v_curr INTEGER;
BEGIN
  SELECT bio_max_links INTO v_max
    FROM public.workspace_entitlements
   WHERE workspace_id = NEW.workspace_id
     FOR SHARE;

  IF v_max IS NOT NULL THEN
    SELECT COUNT(*) INTO v_curr
      FROM public.bio_links
     WHERE workspace_id = NEW.workspace_id;

    IF v_curr >= v_max THEN
      RAISE EXCEPTION 'QUOTA_EXCEEDED: Maximum links reached (% / %)', v_curr, v_max
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
```

---

## 5. Canonical Stored Procedures (Atomic RPCs)

1. `public.publish_bio_snapshot(p_workspace_id UUID, p_expected_draft_version INTEGER)`: Compiles the full profile, links, galleries, collaborations, and blog excerpts into a single denormalized JSON snapshot payload in `bio_published_versions`, increments version, and updates `bio_profiles.current_published_version_id` atomically.
2. `public.public_get_bio(p_handle TEXT)`: Cache-first reading procedure callable by `anon`. Looks up active published snapshot in `bio_published_versions` and returns NULL if workspace is suspended or `bio_state = 'locked'`.
3. `public.project_workspace_entitlements(p_workspace_id UUID)`: Evaluates current subscription in `subscriptions` against `billing_plans.entitlements` and updates `workspace_entitlements` atomically.
4. `public.claim_next_jobs(p_batch_size INTEGER)`: Worker claim function locking queued executions using `FOR UPDATE SKIP LOCKED` and returning assigned jobs.
5. `public.reserve_coupon_for_checkout(...)`: Atomically checks coupon availability, applies percentage/fixed discount, decrements redemption counters, and creates a reservation row with 30-minute expiry.

