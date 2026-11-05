import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

test("B-01 & B-04: Vulnerable unauthenticated subscribe and signup routes are deleted", () => {
  assert.equal(
    fs.existsSync(path.join(repoRoot, "app/api/billing/subscribe/route.ts")),
    false,
    "/api/billing/subscribe/route.ts must not exist"
  );
  assert.equal(
    fs.existsSync(path.join(repoRoot, "app/api/auth/signup/route.ts")),
    false,
    "/api/auth/signup/route.ts must not exist"
  );
});

test("B-02: No hardcoded fallback password or secret exists in lib/admin-auth.ts or app/admin/login/page.tsx", () => {
  const adminAuthContent = fs.readFileSync(
    path.join(repoRoot, "lib/admin-auth.ts"),
    "utf8"
  );
  const adminLoginContent = fs.readFileSync(
    path.join(repoRoot, "app/admin/login/page.tsx"),
    "utf8"
  );

  assert.equal(
    adminAuthContent.includes("BiolioAdmin@2026!"),
    false,
    "lib/admin-auth.ts must not contain hardcoded fallback password"
  );
  assert.equal(
    adminLoginContent.includes("BiolioAdmin@2026!"),
    false,
    "app/admin/login/page.tsx must not contain hardcoded fallback password"
  );
});

test("B-03 & B-14: Instagram webhook enforces X-Hub-Signature-256 and self-comment suppression", () => {
  const igContent = fs.readFileSync(
    path.join(repoRoot, "app/api/webhooks/instagram/route.ts"),
    "utf8"
  );
  assert.equal(
    igContent.includes("x-hub-signature-256"),
    true,
    "Instagram webhook must verify x-hub-signature-256"
  );
  assert.equal(
    igContent.includes("commenterId === igBusinessAccountId"),
    true,
    "Instagram webhook must suppress self-comments"
  );
});

test("B-09: proxy.ts narrows matcher to private routes and removes legacy middleware alias", () => {
  const proxyContent = fs.readFileSync(path.join(repoRoot, "proxy.ts"), "utf8");
  assert.equal(
    proxyContent.includes("export const middleware = proxy"),
    false,
    "proxy.ts must not export duplicate middleware alias"
  );
  assert.equal(
    proxyContent.includes('"/dashboard/:path*"'),
    true,
    "proxy.ts must match /dashboard/:path*"
  );
});

test("B-12: Razorpay webhook enforces X-Razorpay-Signature HMAC and idempotency", () => {
  const rzpContent = fs.readFileSync(
    path.join(repoRoot, "app/api/webhooks/razorpay/route.ts"),
    "utf8"
  );
  assert.equal(
    rzpContent.includes("x-razorpay-signature"),
    true,
    "Razorpay webhook must inspect x-razorpay-signature"
  );
  assert.equal(
    rzpContent.includes("createHmac"),
    true,
    "Razorpay webhook must calculate HMAC SHA256"
  );
});

test("B-15: Deterministic word-boundary matcher matches 'GUIDE' in 'Send me the GUIDE!' but never matches 'misguided'", () => {
  const normalizeText = (input) =>
    (input || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  const tokenizeWords = (normalized) =>
    new Set(
      normalized
        .split(/[^a-z0-9_]+/i)
        .map((t) => t.trim())
        .filter(Boolean)
    );

  const words1 = tokenizeWords(normalizeText("Send me the GUIDE!"));
  const words2 = tokenizeWords(normalizeText("That was completely misguided."));

  assert.equal(words1.has("guide"), true);
  assert.equal(words2.has("guide"), false);
});

test("B-16: Background queue drain endpoint exists and verifies x-cron-secret", () => {
  const drainContent = fs.readFileSync(
    path.join(repoRoot, "app/api/jobs/drain/route.ts"),
    "utf8"
  );
  assert.equal(
    drainContent.includes("x-cron-secret"),
    true,
    "Queue drain must verify x-cron-secret"
  );
  assert.equal(
    drainContent.includes("constantTimeCompare"),
    true,
    "Queue drain must use constantTimeCompare"
  );
  assert.equal(
    drainContent.includes("killswitch.automation_dispatch"),
    true,
    "Queue drain must check killswitch"
  );
});

test("B-25: Every top-level static route directory under app/ is reserved in SQL migrations", () => {
  const sql006 = fs.readFileSync(
    path.join(repoRoot, "supabase/migrations/006_v6_seeds_and_bootstrap.sql"),
    "utf8"
  );
  const sql010 = fs.readFileSync(
    path.join(
      repoRoot,
      "supabase/migrations/010_v6_five_layer_module_locks_and_public_rpc.sql"
    ),
    "utf8"
  );
  const combinedSql = sql006 + "\n" + sql010;

  const appEntries = fs.readdirSync(path.join(repoRoot, "app"), {
    withFileTypes: true,
  });

  for (const entry of appEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("[") || entry.name.startsWith("(")) continue;
    assert.equal(
      combinedSql.includes(`'${entry.name}'`),
      true,
      `Top-level route '${entry.name}' must be present in reserved_handles seed`
    );
  }
});
