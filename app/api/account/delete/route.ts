import { NextRequest, NextResponse } from "next/server";
import {
  requireWorkspaceAccess,
  verifySameOrigin,
  handleRouteError,
  RouteAccessError,
} from "@/lib/server/http/guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DPDP RIGHT TO ERASURE / ACCOUNT DELETION (`POST /api/account/delete`)
 * Reference: SECURITY.md §10, ROUTES_AND_ACCESS.md §4
 *
 * Requirements:
 * 1. Requires workspace session with minRole 'owner'.
 * 2. Requires confirmation body matching the exact workspace handle (prevents accidental clicks).
 * 3. Enforces same-origin CSRF protection.
 * 4. Marks workspace status = 'closed_anonymized'.
 * 5. Purges private Instagram tokens and credentials.
 * 6. Records an audit event before anonymization.
 */
export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({ minRole: "owner" });

    const body = await request.json().catch(() => ({}));
    const confirmSlug = String(body.confirmSlug || "").trim().toLowerCase();

    if (confirmSlug !== ctx.workspaceSlug.toLowerCase()) {
      throw new RouteAccessError(
        422,
        "CONFIRMATION_MISMATCH",
        `To confirm deletion, you must type your exact workspace handle: "${ctx.workspaceSlug}".`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    // 1. Audit log the deletion before anonymization
    try {
      await db.from("admin_audit_logs").insert({
        actor_user_id: ctx.userId,
        actor_role: ctx.role,
        action: "account.erasure_request",
        target_type: "workspace",
        target_id: ctx.workspaceId,
        reason: "User requested permanent DPDP account erasure.",
        result_status: "success",
      });
    } catch {
      // Non-fatal
    }

    // 2. Disconnect & purge Instagram credentials
    const { data: conn } = await db
      .from("instagram_connections")
      .select("id")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    if (conn?.id) {
      await db
        .from("private_integrations.instagram_credentials" as never)
        .delete()
        .eq("connection_id", conn.id);
    }

    // 3. Mark workspace closed & anonymized
    await db
      .from("workspaces")
      .update({
        status: "closed_anonymized",
        name: "[Deleted Workspace]",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.workspaceId);

    // 4. Update user account status
    await db
      .from("user_profiles")
      .update({
        account_status: "suspended",
        suspended_reason: "Account closed and erased by owner request.",
        full_name: "Deleted Creator",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.userId);

    return NextResponse.json({
      ok: true,
      status: "deleted",
      message: "Your Biolio workspace and credentials have been permanently closed and anonymized.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

