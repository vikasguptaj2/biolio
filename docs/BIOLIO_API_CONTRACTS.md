# Biolio v6.0 Enterprise — API Contracts & Route Catalogue
**Document ID:** `DOC-PHASE1-04`  
**Status:** Approved / Authoritative  
**Scope:** Complete Route Catalogue, HTTP Verbs, Authentication Guards, Request Payloads, and Response Envelopes  
**Date:** 2026-11-05  

---

## 1. Global Response Standards

### 1.1 Success Response Envelope
All non-redirect JSON responses return standard HTTP 200/201 status codes with predictable objects:
```json
{
  "ok": true,
  "data": { ... }
}
```

### 1.2 Error Response Envelope
All error responses adhere to the standard error model:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable explanation of error.",
    "details": { ... }
  }
}
```

Standard Error Codes:
- `UNAUTHENTICATED`: Missing or invalid session credentials (401).
- `FORBIDDEN`: Valid session, but insufficient workspace role or permissions (403).
- `MODULE_LOCKED`: Feature belongs to a product module not subscribed to (403).
- `QUOTA_EXCEEDED`: Resource creation exceeded plan ceiling (409).
- `VALIDATION_ERROR`: Input payload failed schema or type assertions (400).
- `RATE_LIMITED`: Request volume exceeded bucket allowance (429).
- `PROVIDER_NOT_READY`: Underlying third-party credentials or webhook secrets unconfigured (500).

---

## 2. Public & Edge Endpoints

### 2.1 `GET /r/[token]` — Tracked Outbound Link Redirect
- **Guard:** Public (Rate-limited, cookie-free).
- **Parameters:** `token` (String, 4..64 chars, base64url).
- **Behavior:** Resolves `bio_links.public_token` -> `url`. Verifies destination protocol is in `['https:', 'mailto:', 'tel:']`. Verifies workspace `bio_state !== 'locked'`.
- **Response:** `302 Found` with `Location: <destination_url>` and `Referrer-Policy: strict-origin-when-cross-origin`. Returns `404 Not Found` if link is invalid, disabled, or locked.

### 2.2 `POST /api/bio/handle/check` — Handle Availability Check
- **Guard:** Public (Rate-limited: 20 req/min/IP).
- **Request Body:**
  ```json
  { "handle": "creatorname" }
  ```
- **Validation:** `^[a-z0-9][a-z0-9_-]{2,29}$`.
- **Response:**
  ```json
  { "status": "available" | "taken" | "reserved" | "invalid" }
  ```

### 2.3 `POST /api/bio/contact` — Public Contact Inquiry
- **Guard:** Public + Honeypot bot protection.
- **Request Body:**
  ```json
  {
    "handle": "creatorname",
    "senderName": "Jane Doe",
    "senderEmail": "jane@example.com",
    "company": "Brand Co",
    "budgetRange": "$1,000 - $5,000",
    "message": "Hello, we want to partner...",
    "website_url": ""
  }
  ```
- **Behavior:** If `website_url` is filled, bot is detected and endpoint returns `{ "ok": true }` silently. Resolves workspace from `handle` server-side via `public_get_bio(handle)`. Hashes client IP (`VISITOR_HASH_SALT`) and stores inquiry in `public.bio_contact_submissions`.
- **Response:** `{ "ok": true }` (Status 200).

### 2.4 `GET /api/health` — Liveness Probe
- **Guard:** Public (Zero DB call).
- **Response:** `{ "status": "ok", "service": "biolio-web", "ts": "2026-11-05T06:00:00Z" }`.

### 2.5 `GET /api/ready` — Readiness Probe
- **Guard:** Public (Executes `SELECT key FROM platform_settings LIMIT 1`).
- **Response:** `{ "status": "ready", "latencyMs": 12 }` (Status 200) or `{ "status": "degraded" }` (Status 503).

---

## 3. Creator Authenticated Endpoints

### 3.1 `GET /auth/callback` — Google OAuth PKCE Session Exchange
- **Guard:** Valid OAuth PKCE exchange code.
- **Query Params:** `code`, `next` (sanitized).
- **Security:** `sanitizeNextPath()` ensures destination starts with `/dashboard` or `/onboarding` and rejects `//evil.com` or `/\evil.com`. Verifies `user_profiles.account_status === 'active'`.

### 3.2 `POST /api/billing/coupon-preview` — Server Coupon Validation
- **Guard:** Authenticated creator session.
- **Request Body:**
  ```json
  {
    "code": "LAUNCH50",
    "planId": "bio_pro",
    "planVersion": 1,
    "billingInterval": "monthly"
  }
  ```
- **Behavior:** Hashes raw coupon using HMAC-SHA256 (`COUPON_HASH_PEPPER`) and calls database RPC `preview_coupon` using `service_role`.
- **Response:**
  ```json
  {
    "valid": true,
    "discountMinor": 29900,
    "finalMinor": 30000,
    "discountType": "percentage",
    "discountValue": 50
  }
  ```

### 3.3 `POST /api/billing/checkout` — Razorpay Checkout Initialization
- **Guard:** Authenticated Workspace Owner + `Idempotency-Key` header.
- **Request Body:**
  ```json
  {
    "planId": "bundle_pro",
    "billingInterval": "monthly",
    "couponCode": "LAUNCH50"
  }
  ```
- **Behavior:** Loads authoritative plan price from `billing_plans`, reserves coupon (if provided) via `reserve_coupon_for_checkout`, creates `checkout_sessions` record, creates Razorpay Order, and returns checkout options.
- **Response:**
  ```json
  {
    "ok": true,
    "sessionId": "cs_uuid",
    "orderId": "order_xyz123",
    "amount": 119900,
    "currency": "INR",
    "keyId": "rzp_live_xxx"
  }
  ```

### 3.4 `POST /api/media/cloudinary/sign` — Signed Upload Parameters
- **Guard:** Authenticated Creator + `requireEntitlement('bio')`.
- **Request Body:**
  ```json
  { "purpose": "gallery" }
  ```
- **Validation:** `purpose` in `['avatar', 'cover', 'gallery', 'blog', 'collaboration']`.
- **Response:**
  ```json
  {
    "signature": "hmac_sha256_hash",
    "timestamp": 1740000000,
    "apiKey": "123456789",
    "folder": "biolio/workspaces/{workspace_id}/gallery",
    "allowedFormats": "jpg,jpeg,png,webp,avif"
  }
  ```

### 3.5 `POST /api/media/cloudinary/finalize` — Asset Registration
- **Guard:** Authenticated Creator + `requireEntitlement('bio')`.
- **Request Body:**
  ```json
  {
    "cloudinaryPublicId": "biolio/workspaces/{workspace_id}/gallery/xyz123",
    "secureUrl": "https://res.cloudinary.com/biolio/image/upload/v1/...",
    "format": "webp",
    "bytes": 204850,
    "width": 1200,
    "height": 800,
    "purpose": "gallery"
  }
  ```
- **Behavior:** Enforces tenant folder prefix, Cloudinary origin check, 10MB size ceiling, and registers record in `media_assets`.

---

## 4. Provider Webhooks & Queue Drain

### 4.1 `POST /api/webhooks/instagram` — Meta Ingress Webhook
- **Guard:** Fail-closed `X-Hub-Signature-256` HMAC-SHA256 signature check (`META_APP_SECRET`).
- **Behavior:** Checks killswitch, verifies 7-day window, ignores self-comments, checks Layer 4 module lock (`workspace_entitlements.ig_state !== 'locked'`), executes deterministic 5-mode matcher, and writes execution to `public.automation_executions`.
- **Target Latency:** < 150ms return `200 OK`.

### 4.2 `POST /api/webhooks/razorpay` — Razorpay Ingress Webhook
- **Guard:** Fail-closed `X-Razorpay-Signature` HMAC-SHA256 signature check (`RAZORPAY_WEBHOOK_SECRET`).
- **Behavior:** Idempotently records in `provider_events`. Updates `subscriptions`, confirms `coupon_redemptions`, and triggers `public.project_workspace_entitlements()`.

### 4.3 `POST /api/jobs/drain` — Asynchronous Automation Worker
- **Guard:** Constant-time `x-cron-secret` header verification (`CRON_SECRET`).
- **Behavior:** Atomically claims batch from `automation_executions` via `claim_next_jobs()`, executes Meta DM dispatch, updates execution status, and writes `automation_attempts`.

---

## 5. Super Admin Endpoints

### 5.1 `POST /api/admin/auth` — Super Admin Login
- **Guard:** Same-origin CSRF, IP allowlist, brute-force lockout (5 failures per 15 min per IP/email).
- **Body:** `{ "email": "admin@biolio.site", "password": "..." }`.
- **Behavior:** Constant-time scrypt password verification. Issues `__Host-biolio_admin` strict cookie and records session in `public.admin_sessions`.

### 5.2 `DELETE /api/admin/auth` — Super Admin Logout
- **Guard:** Verified admin session.
- **Behavior:** Revokes session in `public.admin_sessions`, clears cookie, and logs `ADMIN_LOGOUT` in `admin_audit_logs`.

### 5.3 `POST /api/admin/ops` — Super Admin Operational Mutations
- **Guard:** Verified admin session + Step-Up Check + mandatory `reason` (>= 5 chars).
- **Actions:**
  - `override_plan`: Calls `apply_workspace_plan_entitlements` RPC.
  - `override_workspace_status`: Calls `admin_override_workspace_status` RPC.
  - `toggle_flag`: Updates `public.feature_flags`.
  - `create_coupon`: Generates HMAC-peppered coupon code and batch.

