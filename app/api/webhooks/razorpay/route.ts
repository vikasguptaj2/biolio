import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";

interface ProviderEventRow {
  id: string;
  processing_status: string;
}

interface CheckoutSessionRow {
  id: string;
  workspace_id: string;
  plan_id: string;
  plan_version: number;
  billing_interval: "monthly" | "annual";
  amount_minor: number;
  currency: string;
  coupon_redemption_id: string | null;
  status: string;
}

interface SubscriptionRow {
  id: string;
}

/**
 * AUTHORITATIVE RAZORPAY WEBHOOK INGRESS (`POST /api/webhooks/razorpay`)
 * Closes Audit Findings: B-01, B-12, B-16, F-04 (05_BILLING_ENTITLEMENTS_COUPONS.md §5)
 *
 * Security & Reliability Rules:
 * 1. Constant-time `X-Razorpay-Signature` HMAC verification against `RAZORPAY_WEBHOOK_SECRET`.
 * 2. Idempotent recording in `public.provider_events` (`UNIQUE (provider, provider_event_id)`).
 * 3. Resolves tenant and plan ONLY from authoritative `checkout_sessions` (never trusts unverified payload notes).
 * 4. Verifies amount and currency against session before granting access.
 * 5. Computes `current_period_end` dynamically (365 days for annual, 30 days for monthly).
 * 6. Handles payment.captured, order.paid, payment.failed, and refund.processed.
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
  const expectedSig = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

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

    // 1. Idempotent insert into provider_events
    const { data: evRow, error: evErr } = await (
      adminDb.from("provider_events" as never) as unknown as {
        insert: (row: Record<string, unknown>) => {
          select: (cols: string) => {
            maybeSingle: () => Promise<{ data: ProviderEventRow | null; error: { code?: string } | null }>;
          };
        };
      }
    )
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
      .select("id, processing_status")
      .maybeSingle();

    if (evErr) {
      if (evErr.code === "23505") {
        // Query existing event row
        const { data: existingEv } = await (
          adminDb.from("provider_events" as never) as unknown as {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                eq: (col2: string, val2: string) => {
                  maybeSingle: () => Promise<{ data: ProviderEventRow | null }>;
                };
              };
            };
          }
        )
          .select("id, processing_status")
          .eq("provider", "razorpay")
          .eq("provider_event_id", eventId)
          .maybeSingle();

        if (existingEv?.processing_status === "processed") {
          return NextResponse.json({ received: true, duplicate: true });
        }
      } else {
        return NextResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "Event persistence failed" } },
          { status: 500 }
        );
      }
    }

    // 2. Resolve target order_id and payment details from payload
    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;
    const notes = paymentEntity?.notes || orderEntity?.notes || {};

    const targetOrderId = String(
      paymentEntity?.order_id || orderEntity?.id || ""
    ).trim();
    const checkoutSessionId = notes.checkout_session_id ? String(notes.checkout_session_id).trim() : null;

    // Resolve authoritative checkout session from DB (F-04 Rule 4)
    let session: CheckoutSessionRow | null = null;
    if (targetOrderId) {
      const { data } = await (
        adminDb.from("checkout_sessions" as never) as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: CheckoutSessionRow | null }>;
            };
          };
        }
      )
        .select("id, workspace_id, plan_id, plan_version, billing_interval, amount_minor, currency, coupon_redemption_id, status")
        .eq("razorpay_order_id", targetOrderId)
        .maybeSingle();

      session = data;
    }

    if (!session && checkoutSessionId) {
      const { data } = await (
        adminDb.from("checkout_sessions" as never) as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: CheckoutSessionRow | null }>;
            };
          };
        }
      )
        .select("id, workspace_id, plan_id, plan_version, billing_interval, amount_minor, currency, coupon_redemption_id, status")
        .eq("id", checkoutSessionId)
        .maybeSingle();

      session = data;
    }

    // 3. Handle Business Events
    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (session) {
        const paymentAmount = paymentEntity?.amount ?? orderEntity?.amount_paid ?? session.amount_minor;
        const paymentCurrency = (paymentEntity?.currency || orderEntity?.currency || session.currency).toUpperCase();

        // Integrity check: payment amount and currency must match session
        if (
          paymentAmount >= session.amount_minor &&
          paymentCurrency === session.currency.toUpperCase()
        ) {
          const workspaceId = session.workspace_id;
          const planId = session.plan_id;
          const moduleType = planId.startsWith("bio_")
            ? "bio"
            : planId.startsWith("ig_")
            ? "instagram_automation"
            : "bundle";

          // Calculate period end dynamically (F-04 Rule 5)
          const isAnnual = session.billing_interval === "annual";
          const periodDays = isAnnual ? 365 : 30;
          const periodStart = new Date();
          const periodEnd = new Date(Date.now() + periodDays * 86400 * 1000);

          // Upsert active subscription
          const { data: subRow } = await (
            adminDb.from("subscriptions" as never) as unknown as {
              upsert: (
                row: Record<string, unknown>,
                opt: { onConflict: string }
              ) => {
                select: (cols: string) => {
                  single: () => Promise<{ data: SubscriptionRow | null }>;
                };
              };
            }
          )
            .upsert(
              {
                workspace_id: workspaceId,
                plan_id: planId,
                plan_version: session.plan_version,
                module: moduleType,
                billing_interval: session.billing_interval,
                currency: session.currency,
                base_amount_minor: session.amount_minor,
                final_amount_minor: session.amount_minor,
                status: "active",
                provider: "razorpay",
                provider_subscription_id: paymentEntity?.id || eventId,
                current_period_start: periodStart.toISOString(),
                current_period_end: periodEnd.toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "workspace_id" }
            )
            .select("id")
            .single();

          // Mark checkout_session completed
          await (
            adminDb.from("checkout_sessions" as never) as unknown as {
              update: (vals: Record<string, unknown>) => {
                eq: (col: string, val: string) => Promise<unknown>;
              };
            }
          )
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", session.id);

          // Confirm reserved coupon if applicable
          if (session.coupon_redemption_id && subRow?.id) {
            await (
              adminDb.rpc as unknown as (
                fn: string,
                args: Record<string, unknown>
              ) => Promise<unknown>
            )("confirm_coupon_redemption", {
              p_redemption_id: session.coupon_redemption_id,
              p_subscription_id: subRow.id,
            });
          }

          // Project authoritative workspace entitlements
          await (
            adminDb.rpc as unknown as (
              fn: string,
              args: Record<string, unknown>
            ) => Promise<unknown>
          )("project_workspace_entitlements", {
            p_workspace_id: workspaceId,
          });
        }
      }
    } else if (eventType === "payment.failed") {
      if (session) {
        await (
          adminDb.from("checkout_sessions" as never) as unknown as {
            update: (vals: Record<string, unknown>) => {
              eq: (col: string, val: string) => Promise<unknown>;
            };
          }
        )
          .update({
            status: "failed",
          })
          .eq("id", session.id);
      }
    } else if (eventType === "refund.processed") {
      if (session) {
        await (
          adminDb.from("subscriptions" as never) as unknown as {
            update: (vals: Record<string, unknown>) => {
              eq: (col: string, val: string) => Promise<unknown>;
            };
          }
        )
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", session.workspace_id);

        await (
          adminDb.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<unknown>
        )("project_workspace_entitlements", {
          p_workspace_id: session.workspace_id,
        });
      }
    }

    // 4. Mark provider_events as processed
    const targetEventDbId = evRow?.id;
    if (targetEventDbId) {
      await (
        adminDb.from("provider_events" as never) as unknown as {
          update: (vals: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<unknown>;
          };
        }
      )
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", targetEventDbId);
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Webhook processing failed" } },
      { status: 500 }
    );
  }
}
