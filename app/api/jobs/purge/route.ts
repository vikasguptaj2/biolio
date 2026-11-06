import { NextRequest, NextResponse } from "next/server";
import { constantTimeCompare } from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";

function verifyCronAuth(request: NextRequest, envSecret?: string): boolean {
  if (!envSecret) return false;

  const xSecret = request.headers.get("x-cron-secret");
  if (xSecret && constantTimeCompare(xSecret, envSecret)) {
    return true;
  }

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (constantTimeCompare(token, envSecret)) {
      return true;
    }
  }

  return false;
}

/**
 * DPDP RETENTION PURGE CRON WORKER (`GET /api/jobs/purge`)
 * Reference: SECURITY.md §10, DATABASE.md §8, ROUTES_AND_ACCESS.md §4
 *
 * Runs daily to enforce strict privacy compliance:
 * - Purges Instagram comment webhooks older than 30 days (Meta & DPDP contract).
 * - Purges raw analytics click/view events older than 90 days.
 * - Purges stale admin login attempts older than 30 days.
 * - Cleans abandoned pending checkout sessions older than 7 days.
 */
export async function GET(request: NextRequest) {
  const env = getServerEnv();

  if (!verifyCronAuth(request, env.CRON_SECRET)) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Invalid cron secret." } },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const nowIso = new Date().toISOString();
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgoIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const results: Record<string, number | string> = {};

  // 1. Purge Instagram webhook events where retention has expired
  try {
    const { count } = await db
      .from("instagram_webhook_events")
      .delete({ count: "exact" })
      .lte("retention_expires_at", nowIso);
    results.purged_webhook_events = count ?? 0;
  } catch {
    results.purged_webhook_events = "skipped_or_not_migrated";
  }

  // 2. Purge raw analytics events older than 90 days
  try {
    const { count } = await db
      .from("analytics_events")
      .delete({ count: "exact" })
      .lte("occurred_at", ninetyDaysAgoIso);
    results.purged_analytics_events = count ?? 0;
  } catch {
    results.purged_analytics_events = "skipped_or_not_migrated";
  }

  // 3. Purge admin login attempts older than 30 days
  try {
    const { count } = await db
      .from("admin_login_attempts" as never)
      .delete({ count: "exact" })
      .lte("attempted_at", thirtyDaysAgoIso);
    results.purged_login_attempts = count ?? 0;
  } catch {
    results.purged_login_attempts = "skipped_or_not_migrated";
  }

  // 4. Purge stale uncompleted checkout sessions older than 7 days
  try {
    const { count } = await db
      .from("checkout_sessions")
      .delete({ count: "exact" })
      .eq("status", "pending")
      .lte("created_at", sevenDaysAgoIso);
    results.purged_stale_checkouts = count ?? 0;
  } catch {
    results.purged_stale_checkouts = "skipped_or_not_migrated";
  }

  return NextResponse.json({
    ok: true,
    purged: results,
    completed_at: new Date().toISOString(),
  });
}

