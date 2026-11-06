import { NextResponse } from "next/server";
import {
  requireWorkspaceAccess,
  handleRouteError,
} from "@/lib/server/http/guard";
import { createAdminClient } from "@/lib/supabase/admin";

interface CompletedSessionRow {
  id: string;
  plan_id: string;
  billing_interval: string;
  amount_inr: number;
  discount_inr: number;
  final_amount_inr: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  completed_at: string;
}

/**
 * WORKSPACE INVOICES & RECEIPTS API (`GET /api/billing/invoices`)
 * Reference: ROUTES_AND_ACCESS.md §4, BILLING_AND_COUPONS.md §7
 *
 * Requirements:
 * 1. Requires workspace session with minRole 'admin'.
 * 2. Fetches completed checkout sessions for this workspace.
 * 3. Returns structured invoice line items with GST breakdown (18% inclusive/exclusive).
 */
export async function GET() {
  try {
    const ctx = await requireWorkspaceAccess({ minRole: "admin" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { data: sessions, error } = (await db
      .from("checkout_sessions")
      .select(
        "id, plan_id, billing_interval, amount_inr, discount_inr, final_amount_inr, razorpay_order_id, razorpay_payment_id, completed_at"
      )
      .eq("workspace_id", ctx.workspaceId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50)) as { data: CompletedSessionRow[] | null; error: unknown };

    if (error) {
      return NextResponse.json(
        { error: { code: "FETCH_FAILED", message: "Failed to load invoices." } },
        { status: 500 }
      );
    }

    const invoices = (sessions || []).map((s) => {
      const finalAmount = s.final_amount_inr ?? s.amount_inr;
      const baseAmount = Math.round((finalAmount / 1.18) * 100) / 100;
      const gstAmount = Math.round((finalAmount - baseAmount) * 100) / 100;

      return {
        id: s.id,
        date: s.completed_at,
        plan_id: s.plan_id,
        interval: s.billing_interval,
        total_inr: finalAmount,
        base_inr: baseAmount,
        gst_inr: gstAmount,
        currency: "INR",
        payment_id: s.razorpay_payment_id,
        order_id: s.razorpay_order_id,
        status: "paid",
        receipt_url: `https://biolio.site/dashboard/billing?receipt=${encodeURIComponent(
          s.id
        )}`,
      };
    });

    return NextResponse.json({
      ok: true,
      invoices,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

