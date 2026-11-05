# Biolio v6.0 Enterprise — Architecture Assessment
**Document ID:** `DOC-PHASE0-02`  
**Status:** Canonical Reference  
**Scope:** Architectural Integrity, Security Boundaries, Data Flows, and Audit Closure Analysis  
**Date:** 2026-11-05  

---

## 1. System Architecture Overview

Biolio is architected as a modular, event-driven, multi-tenant creator platform designed to scale independently across two primary product suites:
1. **Biolio Bio Website Studio**: High-performance editorial page builder with live mobile preview, portfolio galleries, micro-blogging, and visitor lead capture.
2. **Instagram Comment-to-DM Automation**: Meta Graph API v21.0 webhook ingress, durable PostgreSQL worker queues, per-user cooldowns, and deterministic keyword dispatch.

```
                    ┌────────────────────────────┐
                    │      Public Visitors       │
                    └──────────────┬─────────────┘
                                   │ HTTPS / CDN
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js 16 App Router (Turbopack)                    │
│  ┌──────────────────────┬──────────────────────┬────────────────────┐  │
│  │   Public Marketing   │   Creator Studio     │  Super Admin Ops   │  │
│  │ (/, /bio, /pricing)  │ (/dashboard/*)       │ (/admin/*)         │  │
│  └──────────────────────┴──────────────────────┴────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Proxy / Middleware (proxy.ts, Route Handlers)        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Supabase Client / Server SSR
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Supabase Platform (PostgreSQL 17 + Auth)                  │
│  ┌────────────────────┬────────────────────┬────────────────────────┐  │
│  │ Multi-Tenant RLS   │ Atomic Stored RPCs │ Append-Only Audit Logs │  │
│  ├────────────────────┼────────────────────┼────────────────────────┤  │
│  │ bio_published_*    │ project_workspace_ │ admin_audit_logs       │  │
│  │ bio_profiles       │ apply_workspace_*  │ admin_sessions         │  │
│  │ automation_rules   │ publish_bio_*      │ checkout_sessions      │  │
│  └────────────────────┴────────────────────┴────────────────────────┘  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ External Providers
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Razorpay API    │       │ Meta Graph API  │       │ Cloudinary CDN  │
│ Order & Webhook │       │ DM Dispatch     │       │ Asset Signing   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 2. Assessment of Critical Enterprise Pillars

### 2.1 Pillar 1: Super Admin Single-Credential Authentication Gate
- **Current State in Baseline**:
  - Validated via `ADMIN_SUPER_EMAIL` and `ADMIN_SUPER_PASSWORD` using constant-time `crypto.timingSafeEqual`.
  - Issues HMAC-SHA256 session cookie `biolio_admin_session`.
  - Triple-layer enforcement active across `proxy.ts`, `app/admin/layout.tsx`, and `app/api/admin/ops/route.ts`.
- **Hardened Standard (`B-02`, `B-10`, `B-11`)**:
  - Upgrade password verification to scrypt password hash (`scrypt$16384$8$1$...`) stored in `ADMIN_PASSWORD_HASH` without falling back to plain-text literals.
  - Enforce server-side session tracking in `public.admin_sessions` and login attempt throttling in `public.admin_login_attempts` (5 failed attempts per 15-minute window).
  - Use `__Host-biolio_admin` cookie prefix with `SameSite=Strict; Secure; HttpOnly`.
  - Require mandatory `reason` (minimum 5 characters) and step-up authentication timestamp for all operational mutations in `/api/admin/ops`.

### 2.2 Pillar 2: Creator Onboarding & Transactional Provisioning
- **Current State in Baseline**:
  - `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users` attached in migration `005`.
  - `provision_workspace_and_claim_handle` defensively upserts `user_profiles` with `ON CONFLICT DO NOTHING`.
  - All 17 templates seeded in `006_v6_seeds_and_bootstrap.sql`.
- **Hardened Standard (`B-04`, `B-05`)**:
  - Creator authentication transitioned exclusively to **Continue with Google** (OAuth PKCE) to prevent email enumeration and account pre-hijacking via arbitrary password sign-ups.
  - `app/auth/callback/route.ts` strictly sanitizes `redirectTo` paths (preventing open redirect vulnerabilities such as `//attacker.com` or `/\attacker.com`).
  - Verifies account status (`active` vs. `suspended`) before granting workspace access.

### 2.3 Pillar 3: Five-Layer Single-Product vs. Bundle Feature Locking
- **Current State in Baseline**:
  - `lib/entitlements.ts` computes evaluated entitlements (`bio_only`, `automation_only`, `bundle`).
  - `<ProductLockPaywall />` blocks unpurchased studio features in the UI.
  - Migration `008` applies atomic stored procedure `apply_workspace_plan_entitlements` restricted to `service_role`.
- **Hardened Standard (`B-07`, `B-12`, `B-13`)**:
  - Enforce **Five-Layer Security**:
    1. *L1 UX*: Sidebar lock badges & `<ProductLockPaywall />`.
    2. *L2 Server Guard*: `requireEntitlement(workspaceId, module)` checks in all route handlers.
    3. *L3 Database RLS & Quota Triggers*: Row Level Security `WITH CHECK (is_module_unlocked(workspace_id, 'bio'))` and `BEFORE INSERT` quota limit triggers in migration `010`.
    4. *L4 Queue & Drain Isolation*: Meta webhook ingress and background job drain skip locked workspaces.
    5. *L5 Public Read Isolation*: `public_get_bio(handle)` returns `404 Not Found` if `bio_state = 'locked'`.
  - Plan pricing canonicalized to INR (`₹299` Creator Bio, `₹499` Pro Bio, `₹599` Starter IG, `₹999` Pro IG, `₹1,199` Bundle Pro).

### 2.4 Pillar 4: Bio Studio Multi-Table Persistence & Snapshot Rendering
- **Current State in Baseline**:
  - `app/dashboard/bio/page.tsx` synchronizes child records (`bio_links`, `bio_gallery_items`, `bio_collaborations`, `bio_blog_posts`) before publishing.
  - `publish_bio_snapshot` returns incremented `draft_version` to prevent optimistic locking race conditions.
  - `app/[handle]/page.tsx` reads directly from immutable JSONB snapshots in `bio_published_versions`.
- **Hardened Standard (`B-18`, `B-19`, `B-20`)**:
  - Decouple public bio page rendering from cookies via cookie-free `createPublicClient()` and stored RPC `public_get_bio(handle)`.
  - Public contact inquiry API (`/api/bio/contact`) resolves the tenant workspace ID server-side from `handle` rather than trusting the client payload, and enforces a honeypot field.

---

## 3. Audit Findings Gap Closure Status (`B-01` to `B-27`)

| Category | Finding IDs | Baseline Status | Hardened Implementation Required |
| :--- | :--- | :--- | :--- |
| **Billing & Payments** | `B-01`, `B-12`, `B-16`, `B-17` | Free subscription mock endpoint exists (`/api/billing/subscribe`). | Replace with Razorpay order creation (`/api/billing/checkout`), HMAC webhook verification (`/api/webhooks/razorpay`), server coupon preview (`/api/billing/coupon-preview`), and INR billing plans. |
| **Admin & Security** | `B-02`, `B-10`, `B-11` | Env-based constant-time credentials. | Implement scrypt password hashing, `admin_sessions` table, 5-strike lockout, and mandatory mutation reason logging. |
| **Instagram Automation** | `B-03`, `B-14`, `B-15` | Webhook route validates signature. | Implement fail-closed signature verification, deterministic 5-mode word-boundary matcher (zero user regexes), 7-day event window, and background drain queue (`/api/jobs/drain`). |
| **Authentication & Routing** | `B-04`, `B-05`, `B-09` | Email + password forms and proxy.ts. | Enforce Google OAuth PKCE, strict redirect sanitization (`sanitizeNextPath`), and narrow proxy matcher to dashboard and admin paths. |
| **Media & Assets** | `B-06` | Cloudinary signed params. | Enforce strict purpose whitelist, tenant folder path verification (`biolio/workspaces/${id}/${purpose}/`), 10MB size limit, and domain validation. |
| **Module Locking** | `B-07`, `B-13` | UI paywalls and RPC. | Implement multi-layer RLS and `BEFORE INSERT` quota triggers in database migration `010`. |
| **Public Profiles & Links** | `B-18`, `B-19`, `B-20` | Dynamic snapshot rendering. | Implement opaque tracking redirects (`/r/[token]`), handle availability checks (`/api/bio/handle/check`), and cookie-free public read clients. |
| **Documentation & Quality** | `B-21`–`B-27` | Build passing with 0 errors. | Integrate full `docs/` specification suite, expanded reserved handles, and end-to-end security test harness. |

