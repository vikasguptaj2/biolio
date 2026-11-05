# Biolio v6.0 Enterprise — Security Architecture & Threat Models
**Document ID:** `DOC-PHASE1-05`  
**Status:** Approved / Authoritative  
**Scope:** Threat Modeling, Cryptographic Primitives, Identity Segregation, CSRF Defense, and MCP Guardrails  
**Date:** 2026-11-05  

---

## 1. Identity Segregation & Perimeter Defense

Biolio enforces complete architectural segregation between creator accounts and the platform operator:

| Dimension | Creator Perimeter | Super Admin Perimeter |
| :--- | :--- | :--- |
| **Authentication Method** | **Continue with Google** (OAuth 2.0 PKCE) | Single operator email + scrypt password hash |
| **Identity Store** | `auth.users` -> `public.user_profiles` | Environment variable + `public.admin_sessions` |
| **Session Representation** | Supabase Auth rotating JWT cookie | 32-byte opaque token in `__Host-biolio_admin` cookie |
| **Database Authorization** | PostgreSQL RLS (`authenticated` role) | Transactional `service_role` inside atomic RPCs only |
| **Login Entrypoint** | `/signin` (public navigation) | `/admin/login` (unlinked, rate-limited) |

A creator session can never access `/admin/*` or `/api/admin/*`, and an admin session carries zero creator tenancy privileges.

---

## 2. Threat Models & Specific Audit Closures

### 2.1 Threat 1: Arbitrary Plan & Entitlement Granting (`B-01`)
- **Vulnerability:** Unauthenticated `POST /api/billing/subscribe` trusted client-supplied `workspaceId` and `planId`, granting pro entitlements without payment verification.
- **Mitigation:**
  - Complete deletion of `/api/billing/subscribe/route.ts`.
  - Subscriptions can only be created via verified `POST /api/webhooks/razorpay` HMAC events or signed admin overrides with mandatory reason logging.
  - Payment orders must be initiated via authenticated `POST /api/billing/checkout` requiring workspace ownership.

### 2.2 Threat 2: Hardcoded Secrets & Timing Oracles (`B-02`, `B-10`)
- **Vulnerability:** Fallback passwords (`BiolioAdmin@2026!`) and session secrets in source code; timing attacks on string comparisons.
- **Mitigation:**
  - Refusal to start (`lib/server/config/env.ts`) if secrets are missing or under minimum cryptographic entropy (min 32 chars).
  - Admin passwords hashed using scrypt (`scrypt$16384$8$1$<salt>$<hash>`).
  - Constant-time verification (`crypto.timingSafeEqual`) performed uniformly on every login attempt (even on non-matching emails) to eliminate timing oracles.
  - Brute-force lockout: maximum 5 failed attempts per 15-minute window recorded in `public.admin_login_attempts`.

### 2.3 Threat 3: Webhook Forgery & Replay Attacks (`B-03`)
- **Vulnerability:** Meta webhook signature verification only ran if both secret and header were truthy, allowing unsigned requests to pass as valid.
- **Mitigation:**
  - Fail closed: if `META_APP_SECRET` is unset, return `500 PROVIDER_NOT_READY`. If `X-Hub-Signature-256` is missing or fails HMAC-SHA256 check, return `401 UNAUTHENTICATED` and store nothing.
  - Unique constraint on `instagram_webhook_events(provider_event_id)` prevents replay attacks.

### 2.4 Threat 4: Account Pre-Hijacking & Enumeration (`B-04`)
- **Vulnerability:** Password signup with `email_confirm: true` allowed attackers to register a victim's email before the victim signed in with Google, locking them out or intercepting data.
- **Mitigation:**
  - Deletion of `/api/auth/signup/route.ts` and all password forms.
  - Creator authentication exclusively uses Google OAuth 2.0 PKCE. Supabase Auth links verified Google identities directly to `user_profiles`.

### 2.5 Threat 5: Open Redirect Vulnerabilities (`B-05`)
- **Vulnerability:** `/auth/callback` passed raw `next` parameter to `new URL()`, allowing `https://evil.com` or relative bypasses (`//evil.com`, `/\evil.com`) to redirect authenticated users.
- **Mitigation:**
  - `sanitizeNextPath()` enforces:
    1. Must begin with a single `/`.
    2. Must NOT begin with `//` or `/\`.
    3. Must NOT contain `://` or control characters.
    4. Must decode safely without protocol injection.
    5. Must strictly match `/dashboard*` or `/onboarding*`. Unmatched inputs default to `/dashboard`.

### 2.6 Threat 6: Media Asset Spoofing & Tracking Pixels (`B-06`)
- **Vulnerability:** Upload finalize endpoint trusted client `secureUrl` and `cloudinaryPublicId`, allowing injection of external tracking pixels or cross-tenant asset references.
- **Mitigation:**
  - Strict purpose allowlist (`avatar`, `cover`, `gallery`, `blog`, `collaboration`).
  - Signed Cloudinary uploads restrict folder path: `biolio/workspaces/${workspaceId}/${purpose}/`.
  - Finalize checks that `cloudinaryPublicId` starts with tenant folder prefix and `secureUrl` is hosted on `https://res.cloudinary.com/${cloudName}/`. Max asset size capped at 10 MB.

### 2.7 Threat 7: Regular Expression Denial of Service & Keyword Confusion (`B-14`, `B-15`)
- **Vulnerability:** Compiling user-supplied regexes created ReDoS vulnerability; naive substring matching caused `"guide"` to trigger on `"misguided"`.
- **Mitigation:**
  - Zero dynamic regex compilation (`new RegExp()` forbidden).
  - Deterministic 5-mode word-boundary tokenizer (`lib/server/instagram/matcher.ts`) normalizes text via Unicode NFKC and extracts discrete alphanumeric tokens. `"guide"` matches `"Send me the GUIDE!"` but never `"misguided"`.

---

## 3. Cryptographic Primitives & Key Management

1. **Password Hashing**: Scrypt (`N=16384, r=8, p=1`, 32-byte salt, 64-byte key length).
2. **Session Cookies**: `__Host-biolio_admin` issued with `HttpOnly; Secure; SameSite=Strict; Path=/`.
3. **Session Epoch Invalidation**: In-memory `ADMIN_SESSION_EPOCH` increment immediately invalidates all active admin sessions across the fleet.
4. **Coupon Hashing**: Raw promotional codes are hashed using HMAC-SHA256 with `COUPON_HASH_PEPPER` before database queries to prevent enumeration or rainbow-table attacks.
5. **Visitor Privacy HMAC**: Visitor IPs on contact forms and analytics are hashed with `VISITOR_HASH_SALT` daily, ensuring GDPR/privacy compliance with zero plaintext IP storage.

---

## 4. Supabase MCP Operational Guardrails (`B-08`)

Autonomous agent tools (such as Supabase MCP) must obey strict operational constraints:
1. **Never point write MCP tools at production.**
2. **Audit Mode Must Be Read-Only**: Use `?read_only=true` when inspecting database tables so untrusted visitor data cannot execute SQL injection via prompt manipulation.
3. **Additive-Only Migrations**: Schema alterations must be submitted as versioned SQL migration files (`009_*.sql`, `010_*.sql`) and verified against `007_pgtap` assertions.

