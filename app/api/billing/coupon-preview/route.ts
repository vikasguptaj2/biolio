import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/server/config/env";

interface PlanRow {
  price_monthly_minor: number;
  price_annual_minor: number;
  currency: string;
}

interface CouponPreviewResult {
  valid: boolean;
  discount_type?: "percentage" | "fixed_amount";
  discount_value?: number;
  final_amount_minor?: number;
  message?: string;
}

/**
 * ATOMIC COUPON PREVIEW ENDPOINT (`POST /api/billing/coupon-preview`)
 * Closes Audit Findings: B-01, B-16
 *
 * Rules:
 * - Requires authenticated workspace member.
 * - Computes HMAC SHA-256 peppered hash on server before invoking preview RPC.
 * - Never leaks internal DB error details.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawCode = String(body.code || "").trim().toUpperCase();
    const planId = String(body.planId || "").trim();
    const planVersion = Number(body.planVersion || 1);
    const billingInterval =
      body.billingInterval === "annual" ? "annual" : "monthly";

    if (!rawCode || !planId) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Coupon code and planId are required.",
          },
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Get user workspace membership
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    const workspaceId = memberships?.[0]?.workspace_id;
    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active workspace." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const adminDb = createAdminClient();

    // Load plan details
    const { data: plan } = await (
      adminDb.from("billing_plans" as never) as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string | number) => {
            eq: (col2: string, val2: string | number) => {
              maybeSingle: () => Promise<{ data: PlanRow | null }>;
            };
          };
        };
      }
    )
      .select("price_monthly_minor, price_annual_minor, currency")
      .eq("id", planId)
      .eq("version", planVersion)
      .maybeSingle();

    if (!plan) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Plan not found." } },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const subtotalMinor =
      billingInterval === "annual"
        ? plan.price_annual_minor
        : plan.price_monthly_minor;

    const env = getServerEnv();
    const pepper = env.COUPON_HASH_PEPPER || "biolio_coupon_pepper_2026";
    const pepperedCode = crypto
      .createHmac("sha256", pepper)
      .update(rawCode)
      .digest("hex");

    const { data: previewRes, error: rpcErr } = await (
      adminDb.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: CouponPreviewResult | null; error: unknown }>
    )(
      "preview_coupon",
      {
        p_workspace_id: workspaceId,
        p_user_email: user.email || "",
        p_raw_code: pepperedCode,
        p_plan_id: planId,
        p_plan_version: planVersion,
        p_billing_interval: billingInterval,
        p_currency: plan.currency || "INR",
        p_subtotal_minor: subtotalMinor,
      }
    );

    if (rpcErr || !previewRes) {
      return NextResponse.json(
        {
          valid: false,
          message: "Coupon is invalid or cannot be applied to this plan.",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json({
      valid: previewRes.valid,
      discountType: previewRes.discount_type,
      discountValue: previewRes.discount_value,
      finalAmountMinor: previewRes.final_amount_minor,
      currency: plan.currency || "INR",
      message: previewRes.message || "Coupon applied successfully.",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Coupon preview failed.";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
