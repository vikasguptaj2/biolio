import { NextRequest, NextResponse } from "next/server";
import { constantTimeCompare } from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";

interface PendingSessionRow {
  id: string;
  workspace_id: string;
  plan_id: string;
  billing_interval: string;
  amount_inr: number;
  razorpay_order_id: string;
  reserved_coupon_id: string | null;
  created_at: string;
}

interface RzpPaymentsResponse {
  entity?: string;
  count?: number;
  items?: Array<{
    id: string;
    status: string;
    amount: number;
    currency: string;
  }>;
}

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
 * RAZORPAY BILLING RECONCILIATION CRON WORKER (`GET /api/jobs/reconcile`)
 * Reference: BILLING_AND_COUPONS.md §5, ROUTES_AND_ACCESS.md §4
 *
 * Runs every 15-30 minutes.
 * Scans pending checkout sessions older than 15 minutes to reconcile missed webhooks.
 */
export async function GET(request: NextRequest) {
  const env = getServerEnv();

  if (!verifyCronAuth(request, env.CRON_SECRET)) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Invalid cron secret." } },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { ok: true, message: "Razorpay not configured; reconciliation skipped." },
      { status: 200 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch pending sessions created between 15m and 24h ago with a Razorpay Order ID
  const { data: pendingSessions, error: qErr } = (await db
    .from("checkout_sessions")
    .select(
      "id, workspace_id, plan_id, billing_interval, amount_inr, razorpay_order_id, reserved_coupon_id, created_at"
    )
    .eq("status", "pending")
    .lte("created_at", fifteenMinutesAgo)
    .gte("created_at", twentyFourHoursAgo)
    .limit(25)) as { data: PendingSessionRow[] | null; error: unknown };

  if (qErr) {
    return NextResponse.json(
      { error: { code: "QUERY_FAILED", message: "Failed to scan pending sessions." } },
      { status: 500 }
    );
  }

  let capturedCount = 0;
  let expiredCount = 0;

  const authHeader = `Basic ${Buffer.from(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
  ).toString("base64")}`;

  for (const session of pendingSessions || []) {
    if (!session.razorpay_order_id) continue;

    try {
      const res = await fetch(
        `https://api.razorpay.com/v1/orders/${encodeURIComponent(session.razorpay_order_id)}/payments`,
        {
          headers: { Authorization: authHeader },
        }
      );

      if (!res.ok) continue;

      const paymentList = (await res.json()) as RzpPaymentsResponse;
      const capturedPayment = paymentList.items?.find((p) => p.status === "captured");

      if (capturedPayment) {
        // Payment was captured on Razorpay! Reconcile and activate subscription
        const periodDays = session.billing_interval === "annual" ? 365 : 30;
        const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

        // Update checkout session
        await db
          .from("checkout_sessions")
          .update({
            status: "completed",
            razorpay_payment_id: capturedPayment.id,
            completed_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        // Update or insert subscription
        await db.from("workspace_subscriptions").upsert(
          {
            workspace_id: session.workspace_id,
            plan_id: session.plan_id,
            billing_interval: session.billing_interval,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );

        // Activate entitlements
        const isBio = session.plan_id.startsWith("bio_") || session.plan_id.startsWith("bundle_");
        const isIg = session.plan_id.startsWith("ig_") || session.plan_id.startsWith("bundle_");
        const isPro = session.plan_id.includes("pro");

        await db
          .from("workspace_entitlements")
          .update({
            bio_state: isBio ? (isPro ? "pro" : "creator") : "locked",
            ig_state: isIg ? (isPro ? "pro" : "creator") : "locked",
            bio_tier: isBio ? (isPro ? "pro" : "creator") : "free",
            ig_tier: isIg ? (isPro ? "pro" : "creator") : "free",
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", session.workspace_id);

        // Confirm coupon usage
        if (session.reserved_coupon_id) {
          await db
            .from("coupon_redemptions")
            .update({ status: "confirmed" })
            .eq("coupon_id", session.reserved_coupon_id)
            .eq("workspace_id", session.workspace_id);
        }

        capturedCount++;
      } else {
        // If older than 2 hours without payment, mark session expired
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        if (new Date(session.created_at) < twoHoursAgo) {
          await db
            .from("checkout_sessions")
            .update({ status: "expired" })
            .eq("id", session.id);

          // Release coupon reservation if any
          if (session.reserved_coupon_id) {
            await db
              .from("coupon_redemptions")
              .delete()
              .eq("coupon_id", session.reserved_coupon_id)
              .eq("workspace_id", session.workspace_id)
              .eq("status", "reserved");
          }

          expiredCount++;
        }
      }
    } catch {
      // Continue next session
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: pendingSessions?.length || 0,
    reconciled_captured: capturedCount,
    expired: expiredCount,
    timestamp: new Date().toISOString(),
  });
}

