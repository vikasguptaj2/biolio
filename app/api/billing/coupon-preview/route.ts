import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashCouponCode } from "@/lib/server/coupons/hash";
import { handleRouteError, requireWorkspaceAccess, verifySameOrigin } from "@/lib/server/http/guard";

interface PlanRow {
  module: string;
  is_active_for_sale: boolean;
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
 * Closes Audit Findings: B-01, B-16, F-05
 *
 * Rules:
 * - Requires authenticated workspace member.
 * - Uses authoritative hash from `lib/server/coupons/hash.ts` before calling preview RPC.
 * - Never leaks internal DB error details.
 */
export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({ minRole: "admin" });
    const raw = await request.text();
    if (raw.length > 8_192) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Request is too large." } }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request body." } }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const rawCode = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const planVersion = Number(body.planVersion ?? 1);
    const billingInterval = body.billingInterval === "annual" ? "annual" : body.billingInterval === "monthly" ? "monthly" : "";

    if (!rawCode || rawCode.length > 64 || !/^[a-z0-9_]{1,64}$/i.test(planId) || !Number.isSafeInteger(planVersion) || planVersion < 1 || !billingInterval) {
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
          .select("module, is_active_for_sale, price_monthly_minor, price_annual_minor, currency")
      .eq("id", planId)
      .eq("version", planVersion)
      .maybeSingle();

    if (!plan || !plan.is_active_for_sale || plan.module !== "bio") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Plan not found." } },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const subtotalMinor =
      billingInterval === "annual"
        ? plan.price_annual_minor
        : plan.price_monthly_minor;

    const codeHash = hashCouponCode(rawCode);

    const { data: previewRes, error: rpcErr } = await (
      adminDb.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: CouponPreviewResult | null; error: unknown }>
    )(
      "preview_coupon",
      {
        p_workspace_id: ctx.workspaceId,
        p_user_email: ctx.userEmail,
        p_raw_code: codeHash,
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
    if (err instanceof Error && "status" in err) return handleRouteError(err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Coupon preview failed." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
