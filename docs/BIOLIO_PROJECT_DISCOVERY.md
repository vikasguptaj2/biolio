# Biolio v6.0 Enterprise — Project Discovery & Provenance Audit
**Document ID:** `DOC-PHASE0-01`  
**Status:** Canonical Reference  
**Scope:** Repository Inventory, Architecture History, Migration Lineage, and Environment Contracts  
**Date:** 2026-11-05  

---

## 1. Executive Summary

Biolio (`biolio.site`) is a multi-tenant creator platform unifying an editorial link-in-bio website studio, high-DPI portfolio galleries, micro-blogging, and deterministic Instagram comment-to-DM automation. 

Over its development lifecycle, multiple iterations and external reference models were generated:
1. **Existing Development Baseline (`Projects/Biolio/web`)**: Next.js 16.4.4 (Turbopack, Partial Prerendering, React 19.3, Tailwind CSS v4, TypeScript 5) with Supabase (PostgreSQL 17, RLS, Auth, Atomic RPCs).
2. **Hardened Enterprise Archive (`biolio-main-v6-hardened-complete.zip`)**: Incorporating audit findings `B-01` through `B-27`, Razorpay checkout & webhook lifecycle, scrypt-based Super Admin authentication, five-layer module locking, and deterministic 5-mode word-boundary keyword matching.
3. **Backend Audit & Architecture Pack (`files(1).zip` & `biolio_v6_audit_closure_and_architecture_pack.md`)**: Containing specifications across `01_BACKEND_AUDIT.md`, `02_ARCHITECTURE.md`, `03_AUTH_AND_ACCESS.md`, `05_BILLING_ENTITLEMENTS_COUPONS.md`, and `06_PUBLIC_LINKS_AND_ROUTING.md`.

This document establishes the verified baseline of all archives, dependencies, migrations, environment secrets, and architectural seams before forward-only development begins.

---

## 2. Archive & Source Inventory

| Artifact / Archive | Source Path | Role & Content | Status |
| :--- | :--- | :--- | :--- |
| **Current Development Repo** | `C:\Users\vikas\AI-Product-OS\Projects\Biolio\web` | Primary active workspace. Clean Next.js 16 build (35/35 routes), zero lint warnings, migrations `000`–`008`. | **PRIMARY CANONICAL** |
| **Hardened Complete Archive** | `c:\Users\vikas\Downloads\biolio-main-v6-hardened-complete.zip` | Hardened codebase resolving `B-01`–`B-27`: Razorpay billing, scrypt admin auth, 5-layer module locks, migrations `000`–`010`. | **REFERENCE HARDENED** |
| **Backend Specifications** | `c:\Users\vikas\Downloads\files(1).zip` | Comprehensive architecture specifications, threat models, database schemas, and billing lifecycle contracts. | **REFERENCE SPECIFICATIONS** |
| **Audit Closure Pack** | `c:\Users\vikas\Downloads\biolio_v6_audit_closure_and_architecture_pack.md` | Verification map of all 27 audit findings and mitigation strategies. | **AUTHORITATIVE AUDIT MAP** |
| **Legacy Archives** | `Projects/Biolio/03-Archives/biolio-main-backup` | Historical nested repository backups isolated to prevent workspace collisions. | **ARCHIVED READ-ONLY** |

---

## 3. Technology Stack & Pinned Dependencies

| Layer | Technology | Declared Version | Purpose & Invariants |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js App Router | `16.4.4` | Turbopack compilation, Partial Prerendering (`cacheComponents: true`, `partialPrefetching: true`), Server/Client component isolation. |
| **UI Library** | React | `19.3.0` | React Server Components, Suspense boundaries, modern hooks. |
| **Styling** | Tailwind CSS | `^4.0.0` | Engine-level CSS tokens, `@tailwindcss/turbopack`, responsive typography. |
| **Database & Auth** | Supabase / PostgreSQL 17 | `@supabase/ssr` `0.5.2`<br>`@supabase/supabase-js` `2.49.1` | Multi-tenant RLS, atomic RPC transactions, cookie-based SSR sessions, PostgreSQL 17 JSONB snapshots. |
| **Icons** | Lucide React | `^1.16.0` | Production UI iconography. |
| **Runtime & Utility** | Node.js / TypeScript | `Node 20+` / `TS 5.x` | Strict type checking, zero generic collapse to `never`. |
| **Package Manager** | pnpm | `12.16.1` | Deterministic dependency tree locked via `pnpm-lock.yaml`. |

---

## 4. Database Migration Lineage

The database evolution spans from initial bootstrap to hardened enterprise triggers:

1. **`000_v6_foundation_and_extensions.sql`**: Enables PostgreSQL extensions (`pgcrypto`, `uuid-ossp`, `citext`), sets search paths, and establishes baseline tenant isolation.
2. **`001_v6_auth_and_workspaces.sql`**: Defines `workspaces`, `workspace_members`, `user_profiles`, and RBAC role models.
3. **`002_v6_bio_profiles_and_links.sql`**: Core bio entities: `bio_profiles`, `bio_links`, `bio_gallery_items`, `bio_collaborations`, and `bio_templates`.
4. **`003_v6_instagram_automation.sql`**: Instagram connections, `automation_rules`, `automation_executions`, and webhook ingress logs.
5. **`004_v6_billing_and_entitlements.sql`**: `billing_plans`, `workspace_entitlements`, `subscriptions`, and quota accounting.
6. **`005_v6_atomic_rpcs_and_worker_queues.sql`**: `publish_bio_snapshot` RPC, `handle_new_auth_user` trigger on `auth.users`, and worker lease mechanics.
7. **`006_v6_seeds_and_bootstrap.sql`**: Seeds all 17 templates, operational killswitches, and baseline system roles.
8. **`007_v6_pgtap_and_privilege_verification.sql`**: In-database test harness and security verification functions.
9. **`008_v6_enterprise_entitlements_and_admin_lock.sql`**: Single-product vs. bundle entitlement RPCs (`apply_workspace_plan_entitlements`, `admin_override_workspace_status`) restricted to `service_role`.
10. **`009_v6_hardened_billing_and_admin.sql` (Hardened)**: Tables `public.checkout_sessions`, `public.admin_sessions`, `public.admin_login_attempts`, INR plan seeds (`₹299`–`₹1,199`), and `public.project_workspace_entitlements`.
11. **`010_v6_five_layer_module_locks.sql` (Hardened)**: Multi-layer RLS policies and `BEFORE INSERT` quota enforcement triggers preventing PostgREST write bypasses.

---

## 5. Environment Variable Matrix & Security Boundaries

| Variable Key | Scope | Security Level | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | Low | Supabase API endpoint gateway. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Medium | RLS-restricted anonymous database access token. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | **CRITICAL / SECRET** | Bypasses RLS for worker queues, admin mutations, and webhooks. **Never sent to client.** |
| `ADMIN_SUPER_EMAIL` | Server-Only | High | Super Admin login email. |
| `ADMIN_SUPER_PASSWORD` / `ADMIN_PASSWORD_HASH` | Server-Only | **CRITICAL / SECRET** | Scrypt hash (`scrypt$16384$8$1$...`) or constant-time verified secret. |
| `ADMIN_SESSION_SECRET` | Server-Only | **CRITICAL / SECRET** | HMAC-SHA256 signature key for `__Host-biolio_admin` cookies. |
| `META_APP_ID` / `META_APP_SECRET` | Server-Only | **CRITICAL / SECRET** | Meta Graph API v21.0 authentication and HMAC webhook verification. |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | Server-Only | High | Hub verification challenge token. |
| `RAZORPAY_KEY_ID` | Server / Client | Medium | Razorpay checkout initiation identifier. |
| `RAZORPAY_KEY_SECRET` | Server-Only | **CRITICAL / SECRET** | Webhook raw body signature verification key (`X-Razorpay-Signature`). |
| `CLOUDINARY_API_KEY` / `_SECRET` | Server-Only | **CRITICAL / SECRET** | HMAC signed upload parameter generation. |

---

## 6. Safety & Non-Destructive Principles

1. **Forward-Only Migrations:** Never edit or rollback applied database migrations on live environments (`ainjrwbmsndsypbblqqo`); always sequence incremental additions (`009`, `010`).
2. **Zero Autonomous Command Execution:** All shell commands, archive extractions, and builds are provided for manual execution by the operator.
3. **Reference Isolation:** Unpack third-party and reference archives into distinct directories under `reference/` to prevent overwriting active source files.

