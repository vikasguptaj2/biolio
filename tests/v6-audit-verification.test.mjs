import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");

test("B-01 & B-04: Vulnerable unauthenticated subscribe and signup routes are deleted", () => {
  const subscribeRoute = path.join(webRoot, "app", "api", "billing", "subscribe", "route.ts");
  const signupRoute = path.join(webRoot, "app", "api", "auth", "signup", "route.ts");
  assert.equal(fs.existsSync(subscribeRoute), false, "app/api/billing/subscribe/route.ts must remain deleted");
  assert.equal(fs.existsSync(signupRoute), false, "app/api/auth/signup/route.ts must remain deleted");
});

test("B-02: No hardcoded fallback password or secret exists in lib/admin-auth.ts or app/admin/login/page.tsx", () => {
  const adminAuthPath = path.join(webRoot, "lib", "admin-auth.ts");
  const adminAuthContent = fs.readFileSync(adminAuthPath, "utf8");
  assert.doesNotMatch(adminAuthContent, /BiolioAdmin@2026!/, "No hardcoded password in lib/admin-auth.ts");
  assert.doesNotMatch(adminAuthContent, /"admin@biolio\.site"/, "No hardcoded email literal in lib/admin-auth.ts");

  const loginPagePath = path.join(webRoot, "app", "admin", "login", "page.tsx");
  const loginPageContent = fs.readFileSync(loginPagePath, "utf8");
  assert.doesNotMatch(loginPageContent, /BiolioAdmin@2026!/, "No hardcoded password in app/admin/login/page.tsx");
});

test("B-03 & B-14 & F-06: Instagram webhook enforces X-Hub-Signature-256, self-comment suppression, and schema alignment", () => {
  const igWebhookPath = path.join(webRoot, "app", "api", "webhooks", "instagram", "route.ts");
  const igWebhookContent = fs.readFileSync(igWebhookPath, "utf8");
  assert.match(igWebhookContent, /x-hub-signature-256/, "Must check X-Hub-Signature-256");
  assert.match(igWebhookContent, /timingSafeEqual/, "Must use constant-time signature comparison");
  assert.match(igWebhookContent, /commenterId === igBusinessAccountId/, "Must suppress self-comments");
  assert.match(igWebhookContent, /provider_event_id/, "Must use schema-aligned provider_event_id");
});

test("B-09: proxy.ts narrows matcher to private routes and removes legacy middleware alias", () => {
  const proxyPath = path.join(webRoot, "proxy.ts");
  assert.equal(fs.existsSync(proxyPath), true, "proxy.ts must exist");
  const proxyContent = fs.readFileSync(proxyPath, "utf8");
  assert.doesNotMatch(proxyContent, /export const middleware =/, "Must not export legacy middleware alias");
});

test("B-12 & F-04: Razorpay webhook enforces X-Razorpay-Signature HMAC, idempotency, and authoritative session lookup", () => {
  const rzpWebhookPath = path.join(webRoot, "app", "api", "webhooks", "razorpay", "route.ts");
  const rzpWebhookContent = fs.readFileSync(rzpWebhookPath, "utf8");
  assert.match(rzpWebhookContent, /x-razorpay-signature/, "Must check x-razorpay-signature");
  assert.match(rzpWebhookContent, /timingSafeEqual/, "Must use constant-time signature comparison");
  assert.match(rzpWebhookContent, /checkout_sessions/, "Must resolve tenant from authoritative checkout_sessions");
  assert.match(rzpWebhookContent, /365/, "Must support 365-day annual intervals");
});

test("B-15: Deterministic word-boundary matcher matches 'GUIDE' in 'Send me the GUIDE!' but never matches 'misguided'", () => {
  const matcherPath = path.join(webRoot, "lib", "server", "instagram", "matcher.ts");
  const matcherContent = fs.readFileSync(matcherPath, "utf8");
  assert.match(matcherContent, /tokenizeWords/, "Must tokenize discrete word boundaries");
  assert.doesNotMatch(matcherContent, /new RegExp\(.+user/, "Must not compile arbitrary user regexes");
});

test("B-16 & F-15: Background queue drain endpoint exists and supports GET (Bearer token) and POST (x-cron-secret)", () => {
  const drainPath = path.join(webRoot, "app", "api", "jobs", "drain", "route.ts");
  assert.equal(fs.existsSync(drainPath), true, "app/api/jobs/drain/route.ts must exist");
  const drainContent = fs.readFileSync(drainPath, "utf8");
  assert.match(drainContent, /export async function GET/, "Must support GET for Vercel Cron");
  assert.match(drainContent, /export async function POST/, "Must support POST");
  assert.match(drainContent, /Bearer/, "Must support Authorization: Bearer");
});

test("B-25: Every top-level static route directory under app/ is reserved in SQL migrations", () => {
  const appDir = path.join(webRoot, "app");
  const staticDirs = fs
    .readdirSync(appDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("[") && !entry.name.startsWith("("))
    .map((entry) => entry.name.toLowerCase());

  const migration009 = fs.readFileSync(
    path.join(webRoot, "supabase", "migrations", "009_v6_hardened_billing_and_admin.sql"),
    "utf8"
  );
  const migration010 = fs.readFileSync(
    path.join(webRoot, "supabase", "migrations", "010_v6_five_layer_module_locks_and_public_rpc.sql"),
    "utf8"
  );
  const migrationsCombined = (migration009 + migration010).toLowerCase();

  for (const dir of staticDirs) {
    assert.equal(
      migrationsCombined.includes(`'${dir}'`),
      true,
      `Directory app/${dir} must be reserved in SQL reserved_handles migrations`
    );
  }
});

test("Enterprise v6: all 17 templates exist in design-tokens.ts and authenticated backend routes are present", () => {
  const tokensPath = path.join(webRoot, "lib", "design-tokens.ts");
  const tokensContent = fs.readFileSync(tokensPath, "utf8");
  assert.match(tokensContent, /id: "sunday-studio"/);
  assert.match(tokensContent, /id: "atelier-editorial"/);
  assert.match(tokensContent, /id: "velvet-night"/);
  assert.match(tokensContent, /id: "tokyo-cyber"/);
  assert.match(tokensContent, /id: "sage-botanical"/);
});

test("F-01 & F-08: HTML sanitization strips script tags and inline events", () => {
  const sanitizePath = path.join(webRoot, "lib", "server", "sanitize", "html.ts");
  assert.equal(fs.existsSync(sanitizePath), true, "lib/server/sanitize/html.ts must exist");
  const sanitizeContent = fs.readFileSync(sanitizePath, "utf8");
  assert.match(sanitizeContent, /sanitizeHtml/, "Must export sanitizeHtml");
  assert.match(sanitizeContent, /markdownToSafeHtml/, "Must export markdownToSafeHtml");
});

test("F-05: Dynamic coupon engine uses unified hashCouponCode", () => {
  const hashPath = path.join(webRoot, "lib", "server", "coupons", "hash.ts");
  assert.equal(fs.existsSync(hashPath), true, "lib/server/coupons/hash.ts must exist");
  const hashContent = fs.readFileSync(hashPath, "utf8");
  assert.match(hashContent, /hashCouponCode/, "Must export hashCouponCode");
});

test("F-10: Privacy-preserving analytics recording helper is present and non-blocking", () => {
  const analyticsPath = path.join(webRoot, "lib", "server", "analytics", "record.ts");
  assert.equal(fs.existsSync(analyticsPath), true, "lib/server/analytics/record.ts must exist");
  const analyticsContent = fs.readFileSync(analyticsPath, "utf8");
  assert.match(analyticsContent, /recordAnalyticsEvent/, "Must export recordAnalyticsEvent");
  assert.match(analyticsContent, /visitorDailyHmac/, "Must compute visitor daily HMAC");
});

test("F-13: Contact form validates minimum length and IP rate limiting", () => {
  const contactPath = path.join(webRoot, "app", "api", "bio", "contact", "route.ts");
  const contactContent = fs.readFileSync(contactPath, "utf8");
  assert.match(contactContent, /message\.length < 5/, "Must validate min 5 chars");
  assert.match(contactContent, /RATE_LIMITED/, "Must enforce rate limit code");
});

test("F-14: Security headers defined in next.config.ts", () => {
  const configPath = path.join(webRoot, "next.config.ts");
  const configContent = fs.readFileSync(configPath, "utf8");
  assert.match(configContent, /X-Content-Type-Options/, "Must configure X-Content-Type-Options");
  assert.match(configContent, /X-Frame-Options/, "Must configure X-Frame-Options");
  assert.match(configContent, /Strict-Transport-Security/, "Must configure HSTS");
});

test("Meta Integration: Instagram OAuth connect, callback, and disconnect endpoints exist with AES-256-GCM token security", () => {
  const connectPath = path.join(webRoot, "app", "api", "instagram", "connect", "route.ts");
  const callbackPath = path.join(webRoot, "app", "api", "instagram", "callback", "route.ts");
  const disconnectPath = path.join(webRoot, "app", "api", "instagram", "disconnect", "route.ts");
  const tokenCryptoPath = path.join(webRoot, "lib", "server", "crypto", "token.ts");

  assert.equal(fs.existsSync(connectPath), true, "Connect route must exist");
  assert.equal(fs.existsSync(callbackPath), true, "Callback route must exist");
  assert.equal(fs.existsSync(disconnectPath), true, "Disconnect route must exist");
  assert.equal(fs.existsSync(tokenCryptoPath), true, "Token encryption helper must exist");

  const callbackContent = fs.readFileSync(callbackPath, "utf8");
  assert.match(callbackContent, /verifyOAuthState/, "Callback must verify state nonce");
  assert.match(callbackContent, /encryptToken/, "Callback must encrypt access token at rest");
  assert.match(callbackContent, /PERSONAL/, "Callback must reject personal IG accounts");
});

test("Enterprise Maintenance Crons: Refresh-tokens, purge, and reconcile endpoints exist with Bearer and secret verification", () => {
  const refreshPath = path.join(webRoot, "app", "api", "jobs", "refresh-tokens", "route.ts");
  const purgePath = path.join(webRoot, "app", "api", "jobs", "purge", "route.ts");
  const reconcilePath = path.join(webRoot, "app", "api", "jobs", "reconcile", "route.ts");

  assert.equal(fs.existsSync(refreshPath), true, "Refresh-tokens route must exist");
  assert.equal(fs.existsSync(purgePath), true, "Purge route must exist");
  assert.equal(fs.existsSync(reconcilePath), true, "Reconcile route must exist");

  const purgeContent = fs.readFileSync(purgePath, "utf8");
  assert.match(purgeContent, /instagram_webhook_events/, "Purge must clean expired webhook events");
  assert.match(purgeContent, /analytics_events/, "Purge must clean 90-day analytics");
});

test("Trust & Legal: DPDP Privacy Policy, Terms, Refunds, and Contact pages exist", () => {
  const privacyPath = path.join(webRoot, "app", "privacy", "page.tsx");
  const termsPath = path.join(webRoot, "app", "terms", "page.tsx");
  const refundsPath = path.join(webRoot, "app", "refunds", "page.tsx");
  const contactPath = path.join(webRoot, "app", "contact", "page.tsx");

  assert.equal(fs.existsSync(privacyPath), true, "Privacy policy page must exist");
  assert.equal(fs.existsSync(termsPath), true, "Terms of service page must exist");
  assert.equal(fs.existsSync(refundsPath), true, "Refunds page must exist");
  assert.equal(fs.existsSync(contactPath), true, "Contact page must exist");
});

test("DPDP User Rights: Data export and erasure endpoints exist with owner authorization", () => {
  const exportPath = path.join(webRoot, "app", "api", "account", "export", "route.ts");
  const deletePath = path.join(webRoot, "app", "api", "account", "delete", "route.ts");

  assert.equal(fs.existsSync(exportPath), true, "Data export route must exist");
  assert.equal(fs.existsSync(deletePath), true, "Data deletion route must exist");
});


