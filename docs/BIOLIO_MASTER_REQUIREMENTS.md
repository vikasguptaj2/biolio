# Biolio v6.0 Enterprise — Master Requirements & Traceability Matrix
**Document ID:** `DOC-PHASE1-01`  
**Status:** Approved / Authoritative  
**Scope:** Functional Requirements, Audit Closures (`B-01`–`B-27`), Non-Functional Invariants, and Test Verification Matrix  
**Date:** 2026-11-05  

---

## 1. System Vision & Objective

Biolio (`biolio.site`) is an enterprise-grade multi-tenant creator SaaS designed to unify two complementary creator engines into one cohesive platform:
1. **Bio Website Studio**: Editorial link-in-bio website builder featuring 17 curated aesthetic design themes, high-DPI portfolio galleries, micro-blogging, and visitor inquiry lead capture.
2. **Instagram Automation Engine**: Comment-to-DM automation leveraging Meta Graph API v21.0, durable PostgreSQL worker queues, per-user cooldowns, and a deterministic 5-mode word-boundary keyword matcher.

The commercial model enables creators to purchase either product independently (**Bio Only** or **Instagram Automation Only**) or together at a discount (**Bundle**). Any product not subscribed to is locked across all architectural layers.

---

## 2. Core Functional Requirements Traceability Matrix

| Requirement ID | Module / Domain | Description & Invariants | Architecture Component | DB Table / RPC | Test Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-BIO-01** | Bio Studio | Creator can customize profile (display name, bio, avatar, cover, social links, template, tokens). | `/dashboard/bio`, `PublicBioRenderer` | `bio_profiles`, `bio_templates` | Manual UI / E2E |
| **REQ-BIO-02** | Bio Studio | Draft vs. Published versioning with atomic optimistic concurrency. | `publish_bio_snapshot` RPC | `bio_published_versions` | Database snapshot test |
| **REQ-BIO-03** | Bio Studio | Dynamic links with icon selection, click tracking, and opaque token redirects. | `/r/[token]/route.ts` | `bio_links`, `public_get_bio` | Link redirect unit test |
| **REQ-BIO-04** | Bio Studio | Portfolio galleries supporting images, external URLs, and categories within plan caps. | `/dashboard/bio`, `/api/media` | `bio_gallery_items`, `media_assets` | Quota trigger test |
| **REQ-BIO-05** | Bio Studio | Micro-blog engine supporting Markdown authoring, slug generation, and reading time. | `app/[handle]/blog/[slug]` | `bio_blog_posts` | Slug resolution test |
| **REQ-BIO-06** | Bio Studio | Public contact inquiry form with server-side handle resolution and honeypot bot trap. | `/api/bio/contact/route.ts` | `bio_contact_submissions` | Honeypot & length test |
| **REQ-IG-01** | Instagram | Creator connects Professional Instagram account via Meta Graph API OAuth. | `/dashboard/automation` | `instagram_connections` | OAuth state verification |
| **REQ-IG-02** | Instagram | Fail-closed webhook ingress receiving comment events with HMAC verification. | `/api/webhooks/instagram` | `instagram_webhook_events` | Signature failure test (`B-03`) |
| **REQ-IG-03** | Instagram | Deterministic keyword matching with 5 modes (`word`, `exact`, `phrase`, `starts_with`, `all_comments`). | `lib/server/instagram/matcher.ts` | Pure function | Matcher boundary test (`B-15`) |
| **REQ-IG-04** | Instagram | Meta 7-day reply window enforcement and self-comment loop suppression. | `/api/webhooks/instagram` | `automation_executions` | Timestamp & author check |
| **REQ-IG-05** | Instagram | Durable worker queue claiming jobs via `FOR UPDATE SKIP LOCKED` with cron secret. | `/api/jobs/drain/route.ts` | `automation_executions`, RPC `claim_next_jobs` | Queue lease concurrency test |
| **REQ-BILL-01** | Billing | Canonical INR plan catalogue (`₹299`–`₹1,199`) priced in integer minor units. | `/dashboard/billing`, `billing_plans` | `billing_plans` | Plan versioning test (`B-13`) |
| **REQ-BILL-02** | Billing | Authenticated Razorpay checkout initialization storing checkout sessions. | `/api/billing/checkout` | `checkout_sessions` | Checkout session creation (`B-01`) |
| **REQ-BILL-03** | Billing | Authoritative Razorpay webhook ingress verifying `X-Razorpay-Signature`. | `/api/webhooks/razorpay` | `provider_events`, `subscriptions` | Webhook HMAC verification |
| **REQ-BILL-04** | Billing | Dynamic promotion & coupon discount engine with server-side HMAC hashing. | `/api/billing/coupon-preview` | `coupon_codes`, `coupon_redemptions` | Coupon pepper hash test (`B-17`) |
| **REQ-LOCK-01** | Entitlements | **Five-Layer Module Locking** preventing unauthorized access to unpurchased features. | Guard, RLS, Triggers, Webhook, RPC | `is_module_unlocked`, quota triggers | Multi-layer audit test (`B-07`) |
| **REQ-AUTH-01** | Authentication | Creator authentication exclusively via Google OAuth 2.0 PKCE. | `/signin`, `/signup`, `/auth/callback` | Supabase Auth, `user_profiles` | Google OAuth redirect test (`B-04`) |
| **REQ-AUTH-02** | Authentication | Open redirect protection rejecting arbitrary protocols and relative path bypasses. | `app/auth/callback/route.ts` | `sanitizeNextPath` | Open redirect test (`B-05`) |
| **REQ-ADM-01** | Super Admin | Single-operator administration isolated from creator identity using scrypt hashing. | `/api/admin/auth`, `lib/admin-auth.ts` | `admin_sessions`, `admin_login_attempts` | Constant-time scrypt test (`B-02`) |
| **REQ-ADM-02** | Super Admin | Brute-force lockout: maximum 5 failed attempts per 15-minute window per IP/email. | `/api/admin/auth/route.ts` | `admin_login_attempts` | Brute force lockout test (`B-10`) |
| **REQ-ADM-03** | Super Admin | Transactional operations with mandatory `reason` (>= 5 chars) and step-up auth. | `/api/admin/ops/route.ts` | `admin_audit_logs`, atomic RPCs | Step-up and audit check (`B-11`) |

---

## 3. Audit Closure Traceability (`B-01` through `B-27`)

Every finding identified in `01_BACKEND_AUDIT.md` is mapped to an authoritative architectural implementation and test constraint:

| Audit ID | Severity | Problem Summary | Permanent Resolution |
| :--- | :--- | :--- | :--- |
| **B-01** | **P0** | Unauthenticated `/api/billing/subscribe` granted plans for free. | Deleted route. Implemented authenticated `/api/billing/checkout` and HMAC-verified `/api/webhooks/razorpay`. |
| **B-02** | **P0** | Hardcoded admin credentials/secrets fallback in `lib/admin-auth.ts`. | Removed all fallbacks. Implemented `lib/server/config/env.ts` boot validation and scrypt verification. |
| **B-03** | **P0** | Optional Meta webhook signature verification. | Fail closed: missing secret -> 500; invalid signature -> 401; zero storage. |
| **B-04** | **P0** | Password sign-up via admin API with `email_confirm: true`. | Deleted `/api/auth/signup/route.ts`. Standardized `/signin` and `/signup` on Google OAuth PKCE. |
| **B-05** | **P0** | Open redirect in `/auth/callback`. | Added `sanitizeNextPath()` restricting redirects to `/dashboard*` and `/onboarding*`. |
| **B-06** | **P0** | Insecure Cloudinary finalize and signing routes. | Enforced 5-value purpose enum, 10MB limit, tenant prefix `biolio/workspaces/${id}/${purpose}/`, and Cloudinary origin check. |
| **B-07** | **P0** | Product locks existed only in UI. | Five-Layer Module Locking: UI, Service Guard, PostgreSQL RLS + Quota Triggers, Webhook Skip, and Public 404. |
| **B-08** | **P0** | Unrestricted Supabase MCP write access for agents. | Read-only mode configuration (`?read_only=true`) and strict forward migration discipline. |
| **B-09** | **P1** | `proxy.ts` ran Supabase Auth on every route; legacy export. | Narrowed matcher to `["/dashboard/:path*", "/onboarding", "/admin/:path*"]`, removed `export const middleware`. |
| **B-10** | **P1** | Admin login lacked lockout and session revocation. | Added `admin_sessions`, `admin_login_attempts`, 5-failure lockout, `__Host-biolio_admin` Strict cookie. |
| **B-11** | **P1** | `/api/admin/ops` lacked mandatory reason and transactional audit. | Enforced `reason` (>= 5 chars), step-up check, and atomic database RPC executions. |
| **B-12** | **P1** | Quotas duplicated and parsed from `override_reason`. | Added `public.project_workspace_entitlements(workspace_id)` reading `billing_plans.entitlements` as single source of truth. |
| **B-13** | **P1** | Plan pricing in USD instead of domestic INR. | Seeded INR plans (`₹299`, `₹499`, `₹599`, `₹999`, `₹1,199`) in integer minor units (paise). |
| **B-14** | **P1** | Webhook inline execution and missed 7-day Meta window. | Enforced 7-day window, self-comment suppression, durable queuing, and `/api/jobs/drain`. |
| **B-15** | **P1** | ReDoS regex and substring matcher flaws. | Deterministic 5-mode word-boundary tokenizer with zero regex compilation. |
| **B-16** | **P1** | Missing core API endpoints. | Implemented `/api/billing/checkout`, `/api/billing/coupon-preview`, `/api/webhooks/razorpay`, `/api/jobs/drain`, `/api/bio/handle/check`, `/r/[token]`, `/api/health`, `/api/ready`. |
| **B-17** | **P1** | Browser coupon enumeration oracle. | Revoked `EXECUTE` on `preview_coupon` from `authenticated`; wrapped in server route with HMAC pepper hashing. |
| **B-18** | **P1** | `/api/bio/contact` trusted client workspace ID. | Resolved workspace from `handle` server-side via `public_get_bio`, added honeypot and IP hashing. |
| **B-19** | **P1** | `server.ts` used `.single()` on memberships. | Replaced with `.limit(1)` and `.maybeSingle()`. |
| **B-20** | **P1** | Public Bio pages bound to user cookies. | Built cookie-free `createPublicClient()` and `public_get_bio` RPC for CDN cacheability. |
| **B-21** | **P1** | Missing package scripts for typecheck and testing. | Added `"typecheck": "tsc --noEmit"` and `"test": "node --test tests/*.test.mjs"`. |
| **B-22** | **P1** | Missing unit test suite. | Added `tests/security-and-matcher.test.mjs`. |
| **B-23** | **P1** | Missing architecture documentation in repo. | Created complete `docs/` documentation pack. |
| **B-24** | **P2** | Duplicate `types/` directory causing import confusion. | Consolidated all types under `src/types/database.types.ts`. |
| **B-25** | **P1** | Top-level route tree collision with creator handles. | Automated test checking `app/` entries against `reserved_handles` seed in SQL migrations. |
| **B-26** | **P2** | Incomplete agent operational instructions. | Updated `AGENTS.md` and repository guidelines. |
| **B-27** | **P2** | Incomplete audit closure tracking. | Verified closure matrix in `00_BACKEND_ROADMAP.md` and `docs/`. |

---

## 4. Non-Functional Invariants

1. **Deterministic Latency**: Public bio lookups (`GET /[handle]`) resolve through single JSON snapshot reads with zero session overhead, maintaining p95 latency under 50ms at edge CDN cache.
2. **Meta Webhook Target Ack**: Ingress webhook (`POST /api/webhooks/instagram`) validates HMAC, deduplicates, and enqueues in PostgreSQL in under 150ms.
3. **Data Isolation**: Multi-tenant RLS guarantees that no tenant can read or mutate another tenant's rows, backed by composite foreign keys `(id, workspace_id)`.
4. **Idempotency**: All provider events (Razorpay, Meta) and financial actions are strictly keyed by unique event identifiers, guaranteeing exactly-once side effects.
5. **Zero Autonomous Command Execution**: Coding assistants must never execute commands autonomously; all shell/build instructions must be formatted for manual operator execution.

