# Biolio v6.0 Enterprise — Archive & Implementation Comparison
**Document ID:** `DOC-PHASE0-03`  
**Status:** Canonical Reference  
**Scope:** Comparative Analysis of Development Baseline, Hardened v6 Archive, and Specifications  
**Date:** 2026-11-05  

---

## 1. Comparative Overview of Implementations

| Dimension | Current Development Baseline (`Projects/Biolio/web`) | Hardened Enterprise Archive (`biolio-main-v6-hardened-complete.zip`) | Specification & Audit Pack (`files(1).zip`) | Authoritative Target Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **Framework & Build** | Next.js 16.4.4, React 19.3, Turbopack, Partial Prerendering, TS 5. Passes `pnpm build` (35/35 routes). | Next.js 16 / React 19, strict route handlers, production-hardened scripts. | Prescribes Next.js App Router, strict TypeScript, zero suppressions. | **Retain Baseline Next.js 16 setup**, integrate hardened route handlers and server services. |
| **Super Admin Authentication** | Single-email & fixed-password constant-time compare (`ADMIN_SUPER_EMAIL` / `ADMIN_SUPER_PASSWORD`), HMAC session cookie. | Scrypt password hashing (`ADMIN_PASSWORD_HASH`), `public.admin_sessions` table, 5-strike lockout, strict `__Host-biolio_admin` cookie. | Mandates isolated single-credential auth, lockout protection, session revocation, step-up check. | **Upgrade to Hardened Scrypt + Session Table model** (`009_*.sql` & `lib/server/admin/`). |
| **Creator Authentication** | Email & password forms (`/signin`, `/signup`) with Supabase Auth + PKCE callback. | Exclusive **Continue with Google** OAuth PKCE flow; deleted plain-text signup handler (`B-04`). | Mandates Google OAuth only to prevent pre-hijacking and account enumeration. | **Adopt Google OAuth PKCE standard** across `/signin` and `/signup`. |
| **Billing Lifecycle** | Prototype subscription endpoint (`/api/billing/subscribe`) applying plans directly in DB. | Production Razorpay checkout (`/api/billing/checkout`), HMAC webhook verification (`/api/webhooks/razorpay`), server coupon preview. | Requires authoritative server-side pricing, INR currencies, raw-body HMAC verification, idempotent webhooks. | **Adopt Hardened Razorpay Implementation** and deprecate free client subscribe endpoint (`B-01`). |
| **Plan Pricing & Currency** | USD pricing ($9, $15, $19, $29, $39) seeded in early migrations. | INR pricing (`₹299` Bio Creator, `₹499` Bio Pro, `₹599` IG Creator, `₹999` IG Pro, `₹1,199` Bundle Pro). | Mandates domestic INR pricing and dynamic coupon discount engine. | **Adopt Canonical INR Plans** via forward migration `009_*.sql`. |
| **Module Locking** | UI paywalls (`<ProductLockPaywall />`), evaluated entitlements, RPC `apply_workspace_plan_entitlements`. | **Five-Layer Module Locking**: UX paywalls, server guard `requireEntitlement`, RLS `WITH CHECK` triggers, webhook skip, public 404. | Strict multi-layer enforcement: hiding a button is not security. | **Adopt Five-Layer Module Lock Standard** (`B-07`, `010_*.sql`). |
| **Instagram Automation** | Basic signature verification, substring matching, basic execution queue. | Fail-closed HMAC verification, deterministic 5-mode word-boundary matcher (zero user regexes), 7-day window, `/api/jobs/drain`. | Forbids user regexes (ReDoS safe), requires raw body signature check, queue lease claiming. | **Adopt Hardened Matcher & Queue Drain Pipeline** (`B-03`, `B-14`, `B-15`). |
| **Public Profiles & Links** | Dynamic snapshot rendering directly from `bio_published_versions.snapshot_payload`. | Cookie-free public client (`createPublicClient`), RPC `public_get_bio`, opaque token redirects (`/r/[token]`). | Snapshot contract isolation, public token redirect tracking, zero cookie leaks on CDN cache. | **Adopt Cookie-Free Public Client & Opaque Token Redirects** (`B-19`, `B-20`). |
| **Media Management** | Direct Cloudinary sign route. | Whitelisted purpose check (`avatar`, `cover`, `gallery`, `blog`, `collaboration`), 10MB limit, tenant prefix verification. | Strict signed upload security, preventing arbitrary asset injection. | **Adopt Hardened Cloudinary Sign & Finalize Routes** (`B-06`). |
| **Database Migrations** | Migrations `000` through `008`. | Migrations `000` through `010` (adding checkout sessions, admin sessions, quota triggers). | Canonical PostgreSQL 17 schema with forward-only migrations. | **Apply Forward Migrations `009` and `010`** without altering applied history. |

---

## 2. Code-Level Reconciliation Decisions

### Decision 1: Canonical Application Base
- **Verdict**: The existing project in `Projects/Biolio/web` serves as the primary working repository. It already has Next.js 16.4.4 Turbopack caching, Partial Prerendering skeletons, and TypeScript compilation fully verified (0 errors).
- **Action**: Incrementally merge the hardened modules from `biolio-main-v6-hardened-complete.zip` into `Projects/Biolio/web` without breaking existing clean builds.

### Decision 2: Billing & Checkout Engine
- **Verdict**: Delete `/api/billing/subscribe/route.ts` (as identified in `B-01`).
- **Action**: Integrate `/api/billing/checkout/route.ts`, `/api/billing/coupon-preview/route.ts`, and `/api/webhooks/razorpay/route.ts` from the hardened archive, backed by `009_*.sql`.

### Decision 3: Instagram Keyword Matcher & Webhook Ingress
- **Verdict**: Replace naive regex or substring matching with `lib/server/instagram/matcher.ts` (deterministic 5-mode word-boundary tokenizer).
- **Action**: Update `/api/webhooks/instagram/route.ts` to fail closed on missing secret and reject unverified signatures with `401 UNAUTHENTICATED`. Add `/api/jobs/drain/route.ts` for asynchronous worker queue execution.

### Decision 4: Super Admin Session & Scrypt Credentials
- **Verdict**: Modernize `lib/admin-auth.ts` to support scrypt password hash verification (`ADMIN_PASSWORD_HASH`) alongside constant-time fallback, and record sessions in `public.admin_sessions`.
- **Action**: Update `/api/admin/auth/route.ts` to log attempts in `public.admin_login_attempts` with a 5-failure lockout window.

### Decision 5: Five-Layer Module Entitlements
- **Verdict**: Upgrade database schema with migration `010_v6_five_layer_module_locks.sql` to enforce row-locking triggers and RLS policies on direct PostgREST inserts.
- **Action**: Update route handlers with `requireEntitlement(workspaceId, module)` checks.

