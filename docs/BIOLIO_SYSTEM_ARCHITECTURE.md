# Biolio v6.0 Enterprise — System Architecture
**Document ID:** `DOC-PHASE1-02`  
**Status:** Approved / Authoritative  
**Scope:** Multi-Layered Architecture, Bounded Contexts, Edge Guard Pipeline, and Durable Job Queue Processing  
**Date:** 2026-11-05  

---

## 1. Architectural Principles

1. **Defense in Depth**: The database is the authoritative last line of defense (RLS, composite foreign keys, constraints, triggers, and atomic RPCs). The service layer acts as the first line of defense to provide clear domain errors.
2. **Thin Route Handlers, Fat Services**: Route handlers (`route.ts`) are restricted to parsing, authenticating, validating request schemas, calling domain services, and returning formatted JSON/HTTP responses. Zero business logic or direct PostgREST mutations reside in route files.
3. **Single Source of Truth**: Plan quotas and pricing live in `public.billing_plans.entitlements`. Active entitlements are projected via database RPC `public.project_workspace_entitlements()`. No application component hard-codes plan matrix limits.
4. **Provider Events are Authoritative**: Subscription state and automation outcomes are updated strictly via verified provider webhooks or signed provider callbacks. Browser client assertions are untrusted.
5. **Idempotency by Construction**: Every side effect is keyed by a natural idempotency identifier (`provider_event_id`, `idempotency_key`, `comment_id`) protected by database `UNIQUE` constraints.
6. **Fail-Closed Boundary**: Missing secrets, invalid signatures, unknown actions, or suspended accounts immediately terminate processing with explicit error codes; silent degradation or permissive fallbacks are forbidden.
7. **Public Routes are Cache-First; Private Routes are Guard-First**: Public profile pages (`/[handle]`, `/r/[token]`) use cookie-free clients and avoid Supabase Auth calls, enabling global CDN caching. Private routes enforce strict session and entitlement guards.

---

## 2. Multi-Layered Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│      Public Visitors (Browser / CDN)      │     Creator Studio UI      │
└───────────────────┬───────────────────────┴────────────┬───────────────┘
                    │                                    │
                    ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EDGE PROXY & ROUTING TIER                       │
│  proxy.ts (Narrow matcher: /dashboard/*, /onboarding, /admin/* only)   │
│  - Session token refresh (Supabase SSR)                                │
│  - Skips public bio (/[handle]), tracked links (/r/*), and webhooks    │
└───────────────────┬────────────────────────────────────┬───────────────┘
                    │                                    │
                    ▼                                    ▼
┌───────────────────────────────────┬────────────────────────────────────┐
│      PUBLIC ROUTE HANDLERS        │     CREATOR & ADMIN ROUTE HANDLERS │
│  - GET /[handle] (ISR / Cache)    │  - POST /api/billing/checkout      │
│  - GET /r/[token] (Redirect)      │  - POST /api/media/cloudinary/*    │
│  - POST /api/bio/contact          │  - POST /api/admin/ops             │
│  - POST /api/bio/handle/check     │  - POST /api/admin/auth            │
└───────────────────┬───────────────┴────────────────────┬───────────────┘
                    │                                    │
                    ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      DOMAIN SERVICE LAYER (lib/server/*)               │
│  ┌───────────────────────┬──────────────────────┬───────────────────┐  │
│  │ config/env.ts         │ entitlements/guard.ts│ instagram/matcher │  │
│  │ Strict env validation │ requireEntitlement() │ 5-mode tokenizer  │  │
│  └───────────────────────┴──────────────────────┴───────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE / POSTGRESQL 17 TIER                       │
│  ┌─────────────────────┬──────────────────────┬─────────────────────┐  │
│  │  Multi-Tenant RLS   │  Five-Layer Locks    │  Atomic RPC Engine  │  │
│  │  Composite FKs      │  is_module_unlocked  │  publish_bio        │  │
│  │  (id, workspace_id) │  Quota Triggers      │  claim_next_jobs    │  │
│  └─────────────────────┴──────────────────────┴─────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Razorpay API    │       │ Meta Graph API  │       │ Cloudinary CDN  │
│ Order & Webhook │       │ DM Automation   │       │ Asset Signing   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 3. Bounded Contexts

| Bounded Context | Package / Namespace | Responsibility | Primary Entities |
| :--- | :--- | :--- | :--- |
| **Identity & Access** | `lib/supabase/*`, `proxy.ts`, `app/auth/*` | Creator Google OAuth PKCE, session rotation, workspace membership. | `auth.users`, `user_profiles`, `workspaces`, `workspace_members` |
| **Super Admin** | `lib/admin-auth.ts`, `app/api/admin/*` | Single-operator management, scrypt password hashing, session table, lockout. | `admin_sessions`, `admin_login_attempts`, `admin_audit_logs` |
| **Bio Studio** | `lib/server/bio/*`, `app/[handle]/*` | Page layouts, 17 design token themes, draft vs published snapshots, links. | `bio_profiles`, `bio_links`, `bio_gallery_items`, `bio_published_versions` |
| **Instagram Engine** | `lib/server/instagram/*`, `app/api/webhooks/instagram` | Meta webhook ingestion, 5-mode word-boundary keyword matching, DM dispatch. | `instagram_connections`, `automation_rules`, `automation_executions` |
| **Billing & Plans** | `app/api/billing/*`, `app/api/webhooks/razorpay` | Razorpay order initiation, webhook reconciliation, coupon reservation & redemption. | `billing_plans`, `subscriptions`, `checkout_sessions`, `coupon_codes` |
| **Entitlements** | `lib/server/entitlements/*`, `lib/entitlements.ts` | Five-layer module locking, quota enforcement, starter/creator/pro limits. | `workspace_entitlements`, `public.project_workspace_entitlements` |
| **Media Management** | `app/api/media/cloudinary/*` | Tenant-scoped Cloudinary signed uploads, format/size validation, asset tracking. | `media_assets` |
| **Analytics** | `app/r/[token]`, `app/api/analytics/*` | Daily aggregation, opaque token click tracking, UTM attribution. | `analytics_events`, `analytics_daily_aggregates` |

---

## 4. Edge Guard Pipeline

For every incoming HTTP request, the pipeline applies a deterministic sequence of guards:

```
Request ──▶ 1. Method Check (Strict HTTP Verb)
        ──▶ 2. proxy.ts (Bypass for public/webhook; Session refresh for private)
        ──▶ 3. Origin / CSRF Check (Same-origin check on mutations)
        ──▶ 4. Authentication Guard:
                ├─ Public: Cookie-free client (createPublicClient)
                ├─ Creator: getUser() + is_active_workspace_member()
                ├─ Admin: getVerifiedAdminSession() + IP Allowlist + Step-Up Check
                ├─ Webhook: Raw-body HMAC verification (Meta / Razorpay)
                └─ Worker: Constant-time CRON_SECRET header verification
        ──▶ 5. Entitlement Guard (requireEntitlement(workspaceId, module))
        ──▶ 6. Input Validation (Zod schema validation, length/enum checks)
        ──▶ 7. Domain Service Execution (Orchestration & atomic RPC)
        ──▶ 8. Structured Response (JSON envelope with Cache-Control headers)
```

---

## 5. Durable Worker Queue & Asynchronous Processing

Meta Instagram DM responses must execute reliably without blocking the 150ms webhook response window:

1. **Ingress Phase (`POST /api/webhooks/instagram`)**:
   - Verifies HMAC signature with `META_APP_SECRET`.
   - Checks `feature_flags` killswitch `killswitch.instagram_webhooks`.
   - Checks 7-day reply window (`now() - comment_created_at <= 7 days`).
   - Checks self-comment suppression (`from.id === entry.id`).
   - Checks Layer 4 module lock (`workspace_entitlements.ig_state !== 'locked'`).
   - Evaluates keyword matching via deterministic 5-mode matcher.
   - Enqueues matched execution in `public.automation_executions` (`status: queued`).
   - Returns `200 OK` in < 150ms.

2. **Drain Phase (`POST /api/jobs/drain`)**:
   - Protected by `x-cron-secret` header verified in constant time.
   - Checks global dispatch killswitch `killswitch.automation_dispatch`.
   - Claims pending jobs atomically via database RPC `claim_next_jobs(batch_size)` using PostgreSQL `FOR UPDATE SKIP LOCKED`.
   - Validates hourly quota ceilings (maximum 750 actions/hour/account).
   - Calls Meta Graph API endpoint (`POST /{ig-user-id}/messages`).
   - Updates execution status (`accepted` or `failed_permanent`) and records attempt outcomes.

