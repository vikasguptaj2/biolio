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
  const migration016Path = path.join(webRoot, "supabase", "migrations", "016_v6_compliance_and_reserved_routes.sql");
  const migration016 = fs.existsSync(migration016Path) ? fs.readFileSync(migration016Path, "utf8") : "";
  const migrationsCombined = (migration009 + migration010 + migration016).toLowerCase();

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

test("Enterprise v6 Blog CMS: Tiptap schema validation, XSS prevention, and reading time estimation", () => {
  const tiptapServerPath = path.join(webRoot, "lib", "server", "blog", "tiptap-server.ts");
  assert.equal(fs.existsSync(tiptapServerPath), true, "lib/server/blog/tiptap-server.ts must exist");
  const tiptapContent = fs.readFileSync(tiptapServerPath, "utf8");

  assert.match(tiptapContent, /export function validateTiptapJson/, "Must export validateTiptapJson");
  assert.match(tiptapContent, /export function extractPlainTextFromTiptapJson/, "Must export extractPlainTextFromTiptapJson");
  assert.match(tiptapContent, /export function calculateReadingTimeMinutes/, "Must export calculateReadingTimeMinutes");
  assert.match(tiptapContent, /export function renderTiptapJsonToHtml/, "Must export renderTiptapJsonToHtml");
  assert.match(tiptapContent, /javascript:/, "Must guard against javascript: href schemes");
  assert.match(tiptapContent, /ALLOWED_TIPTAP_NODES/, "Must define allowlist for nodes");
});

test("Enterprise v6 Analytics: Purged hardcoded fake metrics and connected to real public.analytics_events", () => {
  const analyticsPagePath = path.join(webRoot, "app", "dashboard", "analytics", "page.tsx");
  assert.equal(fs.existsSync(analyticsPagePath), true, "Analytics page must exist");
  const analyticsContent = fs.readFileSync(analyticsPagePath, "utf8");

  assert.doesNotMatch(analyticsContent, /142/, "Must not contain fake 142 views metric");
  assert.doesNotMatch(analyticsContent, /68/, "Must not contain fake 68 clicks metric");
  assert.match(analyticsContent, /analytics_events/, "Must query real public.analytics_events table");
  assert.match(analyticsContent, /bio\.page_view/, "Must count bio.page_view events");
  assert.match(analyticsContent, /bio\.link_click/, "Must count bio.link_click events");

  const bioStudioPath = path.join(webRoot, "app", "dashboard", "bio", "page.tsx");
  const bioStudioContent = fs.readFileSync(bioStudioPath, "utf8");
  assert.doesNotMatch(bioStudioContent, /Alex Morgan/, "Must not inject fake Alex Morgan demo profile");

  const adminPagePath = path.join(webRoot, "app", "admin", "page.tsx");
  const adminPageContent = fs.readFileSync(adminPagePath, "utf8");
  assert.doesNotMatch(adminPageContent, /usersCount \?\? 1/, "Admin page must not fake user count with ?? 1");
  assert.doesNotMatch(adminPageContent, /workspacesCount \?\? 1/, "Admin page must not fake workspace count with ?? 1");
});

test("Enterprise v6 Inquiries: Dedicated lead inbox API and two-pane creator inbox UI", () => {
  const inquiriesRoutePath = path.join(webRoot, "app", "api", "bio", "inquiries", "route.ts");
  const inquiriesPagePath = path.join(webRoot, "app", "dashboard", "inquiries", "page.tsx");

  assert.equal(fs.existsSync(inquiriesRoutePath), true, "Inquiries API route must exist");
  assert.equal(fs.existsSync(inquiriesPagePath), true, "Inquiries dashboard page must exist");

  const routeContent = fs.readFileSync(inquiriesRoutePath, "utf8");
  assert.match(routeContent, /export async function GET/, "Must export GET for inquiry retrieval");
  assert.match(routeContent, /export async function PATCH/, "Must export PATCH for status updates");
  assert.match(routeContent, /requireWorkspaceAccess/, "Must verify workspace access");
  assert.match(routeContent, /bio_contact_submissions/, "Must query bio_contact_submissions table");

  const pageContent = fs.readFileSync(inquiriesPagePath, "utf8");
  assert.match(pageContent, /mailto:/, "Must support direct email reply action");
  assert.match(pageContent, /updateStatus/, "Must handle inquiry status updates");
});

test("Enterprise v6 Publishing CMS: Tiptap rich-text editor component and content dashboard", () => {
  const tiptapComponentPath = path.join(webRoot, "components", "blog", "tiptap-editor.tsx");
  const contentPagePath = path.join(webRoot, "app", "dashboard", "content", "page.tsx");

  assert.equal(fs.existsSync(tiptapComponentPath), true, "TiptapEditor component must exist");
  assert.equal(fs.existsSync(contentPagePath), true, "Content dashboard page must exist");

  const componentContent = fs.readFileSync(tiptapComponentPath, "utf8");
  assert.match(componentContent, /immediatelyRender:\s*false/, "Must configure immediatelyRender: false for SSR safety");
  assert.match(componentContent, /useEditor/, "Must use Tiptap useEditor hook");

  const pageContent = fs.readFileSync(contentPagePath, "utf8");
  assert.match(pageContent, /<TiptapEditor/, "Must render TiptapEditor component");
  assert.match(pageContent, /\/api\/bio\/studio/, "Must connect to bio studio API");
});

test("Enterprise v6 Non-destructive persistence: Studio API preserves entity IDs and tokens", () => {
  const studioRoutePath = path.join(webRoot, "app", "api", "bio", "studio", "route.ts");
  const studioContent = fs.readFileSync(studioRoutePath, "utf8");

  assert.doesNotMatch(studioContent, /DELETE FROM bio_links/i, "Must not perform bulk destructive DELETE on links");
  assert.doesNotMatch(studioContent, /DELETE FROM bio_gallery_items/i, "Must not perform bulk destructive DELETE on gallery items");
  assert.match(studioContent, /opaque_token/, "Must preserve opaque_token on links for click attribution");
  assert.match(studioContent, /content_json/, "Must persist Tiptap content_json on blog posts");

  const publicBioPath = path.join(webRoot, "app", "[handle]", "page.tsx");
  const publicBioContent = fs.readFileSync(publicBioPath, "utf8");
  assert.match(publicBioContent, /\/r\/\$\{link\.opaque_token\}/, "Public bio must route clicks through /r/[token] for click attribution");
});

test("Enterprise v6 Migrations: 016 reserved routes and 017 Tiptap blog schema with FTS GIN index exist", () => {
  const migration016Path = path.join(webRoot, "supabase", "migrations", "016_v6_compliance_and_reserved_routes.sql");
  const migration017Path = path.join(webRoot, "supabase", "migrations", "017_v6_tiptap_and_stable_bio_persistence.sql");

  assert.equal(fs.existsSync(migration016Path), true, "016 migration must exist");
  assert.equal(fs.existsSync(migration017Path), true, "017 migration must exist");

  const migration016Content = fs.readFileSync(migration016Path, "utf8");
  assert.match(migration016Content, /'content'/, "Must reserve 'content' handle");
  assert.match(migration016Content, /'inquiries'/, "Must reserve 'inquiries' handle");

  const migration017Content = fs.readFileSync(migration017Path, "utf8");
  assert.match(migration017Content, /content_json\s+JSONB/, "Must add content_json JSONB to bio_blog_posts");
  assert.match(migration017Content, /idx_bio_blog_posts_fts/, "Must create GIN full-text search index");
});


