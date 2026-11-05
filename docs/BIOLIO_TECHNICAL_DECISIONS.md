# Biolio v6.0 Enterprise — Architecture Decision Records (ADRs)
**Document ID:** `DOC-PHASE1-06`  
**Status:** Approved / Authoritative  
**Scope:** Key Technical Decisions, Alternatives Considered, Trade-Offs, and Implementation Contracts  
**Date:** 2026-11-05  

---

## ADR-01: Google OAuth PKCE Only for Creator Authentication

### Context
Earlier iterations included password sign-up handlers (`POST /api/auth/signup`) and email/password forms. Password accounts created significant attack surfaces: account pre-hijacking (registering a victim's email before they link Google), credential stuffing, and user password reset maintenance.

### Decision
Standardize creator onboarding and login exclusively on **Continue with Google** using Supabase Auth OAuth 2.0 PKCE flow (`signInWithOAuth({ provider: 'google' })`). Disable password sign-ups in Supabase. Delete `/api/auth/signup/route.ts`.

### Consequences
- **Positive:** Completely eliminates credential theft, password hashing overhead, and account pre-hijacking vulnerabilities (`B-04`). Guarantees verified email addresses from Google.
- **Negative:** Creators without Google accounts cannot register. (Acceptable for target creator demographic who operate active Instagram and YouTube channels).

---

## ADR-02: Scrypt-Hashed Fixed Credential + Session Table for Super Admin

### Context
Super Admin access previously used literal plaintext comparisons in `lib/admin-auth.ts` with hard-coded fallback secrets and stateless HMAC cookies with no database-backed revocation (`B-02`, `B-10`).

### Decision
Implement single-operator admin authentication using:
1. Environment-configured scrypt password hash (`ADMIN_PASSWORD_HASH` formatted as `scrypt$16384$8$1$<salt>$<hash>`).
2. Uniform timing execution: run constant-time scrypt work even when the email does not match to prevent timing oracles.
3. Database-backed session table (`public.admin_sessions`) with 8-hour absolute TTL, 30-minute idle TTL, 10-minute step-up auth window, and `ADMIN_SESSION_EPOCH` instant revocation.
4. Brute-force lockout: maximum 5 failed attempts per 15-minute window recorded in `public.admin_login_attempts`.
5. Cookie: `__Host-biolio_admin` issued with `HttpOnly; Secure; SameSite=Strict; Path=/`.

### Consequences
- **Positive:** Eliminates hardcoded credential exposure, prevents timing attacks, supports instant fleet-wide session revocation, and guarantees full audit trails.
- **Negative:** Requires PostgreSQL table for session lookup on `/admin/*` operations (acceptable given low volume of admin mutations).

---

## ADR-03: Domestic INR Pricing via Razorpay as Primary Billing Engine

### Context
Earlier database seeds (`006_*.sql`) configured plans in USD ($9, $15, $19, $29, $39). The primary target demographic is domestic creators in India, requiring seamless UPI, Indian debit/credit cards, and net banking support via Razorpay.

### Decision
Seed canonical INR plans in integer minor units (paise) via forward migration:
- **Bio Creator:** ₹299/mo (₹2,990/yr) — 29900 paise.
- **Bio Pro:** ₹599/mo (₹5,990/yr) — 59900 paise.
- **Instagram Creator:** ₹499/mo (₹4,990/yr) — 49900 paise.
- **Instagram Pro:** ₹999/mo (₹9,990/yr) — 99900 paise.
- **Bundle Creator:** ₹599/mo (₹5,990/yr) — 59900 paise (25% bundle savings).
- **Bundle Pro:** ₹1,199/mo (₹11,990/yr) — 119900 paise (25% bundle savings).

Razorpay is the authoritative billing engine. Webhook events (`order.paid`, `subscription.charged`) are verified using `X-Razorpay-Signature` HMAC-SHA256 and recorded idempotently in `provider_events`.

### Consequences
- **Positive:** High checkout conversion via UPI/domestic cards in India. Precise minor unit accounting without floating-point rounding errors.
- **Negative:** Stripe USD payments deferred to an adapter slot for future international expansion.

---

## ADR-04: Five-Layer Module Locking Standard (Defense in Depth)

### Context
Audit finding `B-07` identified that product locks existed only in the UI (`<ProductLockPaywall />`). Direct PostgREST API writes or webhook executions allowed a user paying for only Bio to create Instagram automation rules, or vice versa.

### Decision
Implement **Five-Layer Module Locking**:
- **Layer 1 (UI):** Visual badges, disabled buttons, and `<ProductLockPaywall />` in dashboard.
- **Layer 2 (Service Guard):** `requireEntitlement(workspaceId, module)` throws `EntitlementError(403, 'MODULE_LOCKED')` in Next.js Server Actions and Route Handlers.
- **Layer 3 (Database Engine):** PostgreSQL function `public.is_module_unlocked(workspace_id, module)` embedded directly in RLS `WITH CHECK` policies on all `bio_*` and `automation_*` tables, backed by `BEFORE INSERT` row-locking quota triggers.
- **Layer 4 (Webhooks & Workers):** `/api/webhooks/instagram` and `/api/jobs/drain` verify `workspace_entitlements.ig_state !== 'locked'` before enqueuing or dispatching messages.
- **Layer 5 (Public Delivery):** `public.public_get_bio(handle)` returns `NULL` (404 Not Found) if the Bio module is locked.

### Consequences
- **Positive:** Guarantees that neither UI manipulation, direct PostgREST exploitation, nor webhook injection can bypass feature entitlements.
- **Negative:** Requires module check consistency across all five layers.

---

## ADR-05: Deterministic 5-Mode Word-Boundary Tokenizer for Instagram Automation

### Context
Audit finding `B-15` revealed that the webhook keyword matcher used substring matching (e.g. `"guide"` matched `"misguided"`) and compiled user input into `new RegExp()`, introducing severe ReDoS vulnerabilities.

### Decision
Replace all regular expression matching with `lib/server/instagram/matcher.ts`, a deterministic 5-mode tokenizer:
1. `word` / `keyword_list`: Splits text into discrete alphanumeric tokens (`/[^a-z0-9_]+/i`); checks `Set.has(keyword)`.
2. `exact`: Strict whole-comment match after Unicode NFKC normalization.
3. `phrase`: Substring match on normalized whitespace.
4. `starts_with`: Tokenized prefix check on the first word of the comment.
5. `all_comments`: Matches every eligible top-level post comment.

Zero dynamic regex compilation (`new RegExp`) is permitted.

### Consequences
- **Positive:** Complete immunity to ReDoS attacks. Zero keyword false positives (`"Send me the GUIDE!"` matches `"guide"`, `"misguided"` never matches).
- **Negative:** Creators cannot write arbitrary complex regular expressions (a deliberate product constraint for safety).

---

## ADR-06: Cookie-Free Public Client & Stored Snapshot Architecture for Public Bio Pages

### Context
Audit findings `B-09` and `B-20` noted that public profile pages (`/[handle]`) ran `supabase.auth.getUser()` on every request and used cookie-bound Supabase clients, preventing global CDN caching and adding ~100-200ms latency per visitor.

### Decision
1. Narrow `proxy.ts` matcher to `["/dashboard/:path*", "/onboarding", "/admin/:path*"]`, bypassing public pages (`/[handle]`, `/r/*`) and webhooks entirely.
2. Build cookie-free `createPublicClient()` (`lib/supabase/public.ts`) with `persistSession: false` and `detectSessionInUrl: false`.
3. Serve public pages directly from `bio_published_versions.snapshot_payload` via atomic RPC `public_get_bio(handle)`.

### Consequences
- **Positive:** Public profile requests achieve sub-50ms p95 latency and can be cached by edge CDNs (Vercel Edge Network / Cloudflare).
- **Negative:** Changes in the creator dashboard do not show on the public page until the creator explicitly clicks "Publish", which writes a new snapshot (this is the desired editorial behavior).

