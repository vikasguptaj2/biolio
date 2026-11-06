import { NextRequest, NextResponse } from "next/server";
import {
  requireWorkspaceAccess,
  verifySameOrigin,
  handleRouteError,
} from "@/lib/server/http/guard";
import { createAdminClient } from "@/lib/supabase/admin";

interface SubscriptionRow {
  id: string;
  workspace_id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

/**
 * SUBSCRIPTION CANCELLATION HANDLER (`POST /api/billing/cancel`)
 * Reference: ROUTES_AND_ACCESS.md §4, BILLING_AND_COUPONS.md §5
 *
 * Requirements:
 * 1. Requires workspace session with minRole 'admin'.
 * 2. Enforces same-origin CSRF protection.
 * 3. Sets cancel_at_period_end = true (access remains until paid period ends).
 * 4. Logs audit event.
 */
export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({ minRole: "admin" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { data: sub, error: subErr } = (await db
      .from("workspace_subscriptions")
      .select("id, workspace_id, status, current_period_end, cancel_at_period_end")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle()) as { data: SubscriptionRow | null; error: unknown };

    if (subErr || !sub) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No active subscription found to cancel." } },
        { status: 404 }
      );
    }

    await db
      .from("workspace_subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    try {
      await db.from("admin_audit_logs").insert({
        actor_user_id: ctx.userId,
        actor_role: ctx.role,
        action: "subscription.cancel",
        target_type: "workspace_subscription",
        target_id: sub.id,
        reason: "User scheduled cancellation at end of current billing period.",
        result_status: "success",
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      ok: true,
      status: "scheduled_for_cancellation",
      access_until: sub.current_period_end,
      message: `Your subscription will remain active until ${new Date(
        sub.current_period_end
      ).toLocaleDateString()}, after which it will not renew.`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

