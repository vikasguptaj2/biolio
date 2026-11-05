import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";

interface ProviderEventRow {
  id: string;
}

interface SubscriptionRow {
  id: string;
}

interface GenericDbTable {
  insert: (row: Record<string, unknown>) => {
    select: (cols: string) => {
      maybeSingle: () => Promise<{ data: ProviderEventRow | null; error: unknown }>;
    };
  };
  upsert: (
    row: Record<string, unknown>,
    opt: { onConflict: string }
  ) => {
    select: (cols: string) => {
      single: () => Promise<{ data: SubscriptionRow | null }>;
    };
  };
  update: (values: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<unknown>;
  };
}

type RpcCaller = (fn: string, args: Record<string, unknown>) => Promise<unknown>;

/**
 * AUTHORITATIVE RAZORPAY WEBHOOK INGRESS (`POST /api/webhooks/razorpay`)
 * Closes Audit Findings: B-01, B-12, B-16
 *
 * Security & Reliability Rules (05_BILLING_ENTITLEMENTS_COUPONS.md §5.3):
 * 1. Fails closed: missing `RAZORPAY_WEBHOOK_SECRET` -> 500; missing/invalid `X-Razorpay-Signature` -> 401.
 * 2. Deduplicates in `public.provider_events` (`UNIQUE (provider, provider_event_id)`).
 * 3. Updates `public.subscriptions`, confirms `coupon_redemptions`, and calls `project_workspace_entitlements(workspace_id)`.
 */
export async function POST(request: NextRequest) {
  const env = getServerEnv();
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        error: {
          code: "PROVIDER_NOT_READY",
          message: "RAZORPAY_WEBHOOK_SECRET is not configured.",
        },
      },
      { status: 500 }
    );
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Missing signature." } },
      { status: 401 }
    );
  }

  const rawBody = await request.text();
  const expectedSig = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expectedSig, "utf8");
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Invalid signature." } },
      { status: 401 }
    );
  }

  try {
    const payload = JSON.parse(rawBody);
    const eventId =
      request.headers.get("x-razorpay-event-id") ||
      payload.id ||
      `rzp_${crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 24)}`;
    const eventType = String(payload.event || "unknown");

    const adminDb = createAdminClient();
    const providerEvents = adminDb.from("provider_events" as never) as unknown as GenericDbTable;
    const subscriptions = adminDb.from("subscriptions" as never) as unknown as GenericDbTable;
    const checkoutSessions = adminDb.from("checkout_sessions" as never) as unknown as GenericDbTable;
    const rpc = adminDb.rpc as unknown as RpcCaller;

    // 1. Idempotent insert into provider_events
    const { data: evRow, error: evErr } = await providerEvents
      .insert({
        provider: "razorpay",
        provider_event_id: eventId,
        event_type: eventType,
        signature_verified: true,
        processing_status: "received",
        redacted_summary: {
          event: eventType,
          created_at: payload.created_at,
        },
      })
      .select("id")
      .maybeSingle();

    if (evErr) {
      // Duplicate delivery -> return 200 immediately
      return NextResponse.json({ received: true, duplicate: true });
    }

    const notes =
      payload?.payload?.subscription?.entity?.notes ||
      payload?.payload?.payment?.entity?.notes ||
      payload?.payload?.order?.entity?.notes ||
      {};
    const checkoutSessionId = notes.checkout_session_id;
    const workspaceId = notes.workspace_id;
    const planId = notes.plan_id;

    if (
      (eventType === "subscription.activated" ||
        eventType === "subscription.charged" ||
        eventType === "payment.captured") &&
      workspaceId &&
      planId
    ) {
      const moduleType = planId.startsWith("bio_")
        ? "bio"
        : planId.startsWith("ig_")
        ? "instagram_automation"
        : "bundle";

      const { data: subRow } = await subscriptions
        .upsert(
          {
            workspace_id: workspaceId,
            plan_id: planId,
            plan_version: Number(notes.plan_version || 1),
            module: moduleType,
            billing_interval:
              notes.billing_interval === "annual" ? "annual" : "monthly",
            currency: notes.currency || "INR",
            status: "active",
            provider: "razorpay",
            provider_subscription_id:
              payload?.payload?.subscription?.entity?.id ||
              payload?.payload?.payment?.entity?.id ||
              eventId,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 86400 * 1000
            ).toISOString(),
          },
          { onConflict: "workspace_id" }
        )
        .select("id")
        .single();

      if (checkoutSessionId) {
        await checkoutSessions
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", checkoutSessionId);
      }

      if (notes.redemption_id && subRow?.id) {
        await rpc("confirm_coupon_redemption", {
          p_redemption_id: notes.redemption_id,
          p_subscription_id: subRow.id,
        });
      }

      await rpc("project_workspace_entitlements", {
        p_workspace_id: workspaceId,
      });
    }

    if (evRow?.id) {
      await providerEvents
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", evRow.id);
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Webhook processing failed" } },
      { status: 500 }
    );
  }
}
