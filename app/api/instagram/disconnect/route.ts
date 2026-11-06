import { NextRequest, NextResponse } from "next/server";
import {
  requireWorkspaceAccess,
  verifySameOrigin,
  handleRouteError,
} from "@/lib/server/http/guard";
import { createAdminClient } from "@/lib/supabase/admin";

interface ConnRow {
  id: string;
}

/**
 * INSTAGRAM DISCONNECT HANDLER (`POST /api/instagram/disconnect`)
 * Reference: META_INTEGRATION.md §2, ROUTES_AND_ACCESS.md §4
 *
 * Requirements:
 * 1. Requires workspace session with minRole 'admin'.
 * 2. Enforces same-origin CSRF protection.
 * 3. Deletes private_integrations.instagram_credentials row (purges access token).
 * 4. Updates public.instagram_connections: status = 'revoked', is_paused = true.
 * 5. Pauses all active automation rules to prevent orphaned queue execution.
 * 6. Records audit entry in public.admin_audit_logs.
 */
export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({
      minRole: "admin",
      module: "instagram_automation",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    // 1. Fetch connection ID for this workspace
    const { data: connection } = (await db
      .from("instagram_connections")
      .select("id")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle()) as { data: ConnRow | null };

    if (!connection) {
      return NextResponse.json(
        { ok: true, message: "No active Instagram connection found." },
        { status: 200 }
      );
    }

    // 2. Delete encrypted access credentials
    await db
      .from("private_integrations.instagram_credentials" as never)
      .delete()
      .eq("connection_id", connection.id);

    // 3. Mark connection as revoked and paused
    await db
      .from("instagram_connections")
      .update({
        status: "revoked",
        is_paused: true,
        webhook_subscribed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    // 4. Pause all active rules for this workspace
    await db
      .from("automation_rules")
      .update({
        is_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", ctx.workspaceId);

    // 5. Audit log entry
    try {
      await db.from("admin_audit_logs").insert({
        actor_user_id: ctx.userId,
        actor_role: ctx.role,
        action: "instagram.disconnect",
        target_type: "instagram_connection",
        target_id: connection.id,
        reason: "User requested Instagram disconnect from workspace dashboard.",
        result_status: "success",
      });
    } catch {
      // Non-fatal if audit table is inaccessible
    }

    return NextResponse.json(
      {
        ok: true,
        status: "disconnected",
        message: "Instagram account disconnected and credentials safely purged.",
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

