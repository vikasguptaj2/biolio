import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/server/config/env";
import { hashCouponCode } from "@/lib/server/coupons/hash";
import {
  handleRouteError,
  requireWorkspaceAccess,
  verifySameOrigin,
} from "@/lib/server/http/guard";

interface PlanRow {
  id: string;
  version: number;
  module: string;
  is_active_for_sale: boolean;
  price_annual_minor: number;
  price_monthly_minor: number;
  currency: string;
}

interface CouponReserveResult {
  valid: boolean;
  redemption_id?: string;
  final_amount_minor?: number;
  message?: string;
}

interface CheckoutRow {
  id: string;
  workspace_id: string;
  user_id: string;
  amount_minor: number;
  currency: string;
  razorpay_order_id: string | null;
  status: string;
}

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

async function readRequestBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  const raw = await request.text();
  if (raw.length > 8_192) return null;
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({ minRole: "admin", module: "bio" });
    const body = await readRequestBody(request);
    if (!body) return jsonError("VALIDATION_ERROR", "Invalid or oversized request body.", 400);

    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const planVersion = Number(body.planVersion ?? 1);
    const billingInterval = body.billingInterval === "annual" ? "annual" : "monthly";
    const rawCoupon = typeof body.couponCode === "string"
      ? body.couponCode.trim().toUpperCase()
      : "";
    const requestKey = request.headers.get("idempotency-key")?.trim() || crypto.randomUUID();

    if (
      !/^[a-zA-Z0-9._:-]{8,128}$/.test(requestKey) ||
      !/^[a-z0-9_]{1,64}$/.test(planId) ||
      !Number.isSafeInteger(planVersion) || planVersion < 1 || rawCoupon.length > 64
    ) return jsonError("VALIDATION_ERROR", "Invalid checkout details.", 422);

    const env = getServerEnv();
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) {
      return jsonError(
        "PROVIDER_NOT_READY",
        "Razorpay is not fully configured. Add the key ID, key secret, and webhook secret before accepting payments.",
        503
      );
    }

    const db = createAdminClient();
    const checkouts = db.from("checkout_sessions" as never) as unknown as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column2: string, value2: string) => {
            maybeSingle: () => Promise<{ data: CheckoutRow | null; error: unknown }>;
          };
        };
      };
      insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string } | null }>;
      update: (row: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<{ error: unknown }>;
      };
    };

    const { data: previous } = await checkouts
      .select("id, workspace_id, user_id, amount_minor, currency, razorpay_order_id, status")
      .eq("idempotency_key", requestKey)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    if (previous) {
      if (previous.user_id !== ctx.userId) return jsonError("CONFLICT", "Checkout key is already in use.", 409);
      if (previous.status === "pending" && previous.razorpay_order_id) {
        return NextResponse.json({
          ok: true,
          checkoutSessionId: previous.id,
          razorpayOrderId: previous.razorpay_order_id,
          amountMinor: previous.amount_minor,
          currency: previous.currency,
          keyId: env.RAZORPAY_KEY_ID,
        }, { headers: { "Cache-Control": "no-store" } });
      }
      return jsonError("CHECKOUT_IN_PROGRESS", "This checkout key has already been used. Start a new checkout.", 409);
    }

    const planQuery = db.from("billing_plans" as never) as unknown as {
      select: (columns: string) => {
        eq: (column: string, value: string | number) => {
          eq: (column2: string, value2: string | number) => {
            maybeSingle: () => Promise<{ data: PlanRow | null; error: unknown }>;
          };
        };
      };
    };
    const { data: plan, error: planError } = await planQuery
      .select("id, version, module, is_active_for_sale, price_annual_minor, price_monthly_minor, currency")
      .eq("id", planId)
      .eq("version", planVersion)
      .maybeSingle();

    if (planError) return jsonError("INTERNAL_ERROR", "Could not load plan details.", 500);
    if (!plan || !plan.is_active_for_sale || plan.module !== "bio") {
      return jsonError("NOT_FOUND", "This Biolio Bio plan is unavailable.", 404);
    }

    const baseMinor = billingInterval === "annual"
      ? plan.price_annual_minor
      : plan.price_monthly_minor;
    if (!Number.isSafeInteger(baseMinor) || baseMinor < 1 || plan.currency !== "INR") {
      return jsonError("VALIDATION_ERROR", "This plan cannot be checked out through Razorpay.", 422);
    }

    const checkoutSessionId = crypto.randomUUID();
    let finalMinor = baseMinor;
    let redemptionId: string | null = null;

    if (rawCoupon) {
      const { data: reserve, error: reserveError } = await (db.rpc as unknown as (
        name: string,
        args: Record<string, unknown>
      ) => Promise<{ data: CouponReserveResult | null; error: unknown }>) (
        "reserve_coupon_for_checkout",
        {
          p_workspace_id: ctx.workspaceId,
          p_user_id: ctx.userId,
          p_user_email: ctx.userEmail,
          p_raw_code: hashCouponCode(rawCoupon),
          p_plan_id: plan.id,
          p_plan_version: plan.version,
          p_billing_interval: billingInterval,
          p_subtotal_minor: baseMinor,
          p_idempotency_key: requestKey,
        }
      );
      if (reserveError || !reserve?.valid) {
        return jsonError("COUPON_INVALID", reserve?.message || "Coupon is invalid or unavailable.", 422);
      }
      redemptionId = reserve.redemption_id || null;
      if (typeof reserve.final_amount_minor === "number") finalMinor = reserve.final_amount_minor;
    }

    if (!Number.isSafeInteger(finalMinor) || finalMinor < 1 || finalMinor > baseMinor) {
      return jsonError("VALIDATION_ERROR", "The final checkout amount is invalid.", 422);
    }

    const { error: insertError } = await checkouts.insert({
      id: checkoutSessionId,
      workspace_id: ctx.workspaceId,
      user_id: ctx.userId,
      plan_id: plan.id,
      plan_version: plan.version,
      billing_interval: billingInterval,
      amount_minor: finalMinor,
      currency: plan.currency,
      idempotency_key: requestKey,
      coupon_redemption_id: redemptionId,
      status: "pending",
    });
    if (insertError) return jsonError("CONFLICT", "Could not start this checkout. Retry with a new checkout attempt.", 409);

    const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
    let orderId: string;
    try {
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalMinor,
          currency: plan.currency,
          receipt: checkoutSessionId.replace(/-/g, "").slice(0, 40),
          notes: { checkout_session_id: checkoutSessionId },
        }),
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Razorpay order request failed.");
      const result: unknown = await response.json();
      orderId = result && typeof result === "object" && "id" in result && typeof result.id === "string"
        ? result.id
        : "";
      if (!/^order_[A-Za-z0-9]+$/.test(orderId)) throw new Error("Razorpay returned an invalid order ID.");
    } catch {
      await checkouts.update({ status: "failed" }).eq("id", checkoutSessionId);
      return jsonError("PAYMENT_PROVIDER_ERROR", "Razorpay could not start the payment. Please retry.", 502);
    }

    const { error: orderSaveError } = await checkouts
      .update({ razorpay_order_id: orderId })
      .eq("id", checkoutSessionId);
    if (orderSaveError) {
      return jsonError("INTERNAL_ERROR", "The payment order could not be linked to its checkout.", 500);
    }

    return NextResponse.json({
      ok: true,
      checkoutSessionId,
      razorpayOrderId: orderId,
      amountMinor: finalMinor,
      currency: plan.currency,
      keyId: env.RAZORPAY_KEY_ID,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error);
  }
}
