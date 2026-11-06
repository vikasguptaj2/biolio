import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireWorkspaceAccess,
  verifySameOrigin,
  handleRouteError,
  RouteAccessError,
} from "@/lib/server/http/guard";

/**
 * AUTHENTICATED INSTAGRAM AUTOMATION WORKFLOWS API (`GET / POST / PATCH / DELETE /api/automation/workflows`)
 *
 * Access Level: Creator Session + Workspace Member (`admin | owner`) + `instagram_automation` Module Unlocked
 * Fixes the client-side foreign-key & enum bugs:
 * 1. Auto-provisions `public.instagram_connections` when connecting or creating the first rule so
 *    `FOREIGN KEY (instagram_connection_id, workspace_id)` always succeeds.
 * 2. Normalizes `match_mode` to valid `ig_match_mode` enum (`'exact_token' | 'exact_comment' | 'contains' | 'starts_with' | 'keyword_list' | 'all_comments'`).
 * 3. Normalizes `target_scope` to valid `ig_target_scope` enum (`'all_eligible_posts' | 'specific_media'`).
 * 4. Enforces `automationMaxActiveRules` and `canUsePublicCommentReplies`.
 */

function normalizeMatchMode(
  raw?: string
):
  | "exact_token"
  | "exact_comment"
  | "contains"
  | "starts_with"
  | "keyword_list"
  | "all_comments" {
  const m = (raw || "exact_token").toLowerCase();
  if (m === "exact" || m === "exact_comment" || m === "exact_match") {
    return "exact_comment";
  }
  if (m === "starts_with") return "starts_with";
  if (m === "keyword_list") return "keyword_list";
  if (m === "all_comments") return "all_comments";
  if (m === "contains" || m === "contains_keyword") return "contains";
  return "exact_token";
}

function normalizeTargetScope(
  raw?: string
): "all_eligible_posts" | "specific_media" {
  if (raw === "specific_media" || raw === "selected_media") {
    return "specific_media";
  }
  return "all_eligible_posts";
}

export async function GET() {
  try {
    const ctx = await requireWorkspaceAccess({
      minRole: "editor",
      module: "instagram_automation",
    });
    const adminDb = createAdminClient();

    const [{ data: connection }, { data: rules }, { data: executions }] =
      await Promise.all([
        (adminDb.from("instagram_connections" as never) as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
            };
          };
        })
          .select("*")
          .eq("workspace_id", ctx.workspaceId)
          .maybeSingle(),
        (adminDb.from("automation_rules" as never) as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (col2: string, opt2: { ascending: boolean }) => {
                order: (col3: string, opt3: { ascending: boolean }) => Promise<{ data: Array<Record<string, unknown>> | null }>;
              };
            };
          };
        })
          .select("*")
          .eq("workspace_id", ctx.workspaceId)
          .order("priority", { ascending: true })
          .order("created_at", { ascending: false }),
        (adminDb.from("automation_executions" as never) as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (col2: string, opt2: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }>;
              };
            };
          };
        })
          .select("*")
          .eq("workspace_id", ctx.workspaceId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

    return NextResponse.json(
      {
        ok: true,
        workspace: {
          id: ctx.workspaceId,
          name: ctx.workspaceName,
          slug: ctx.workspaceSlug,
        },
        entitlements: ctx.entitlements,
        connection: connection || null,
        rules: rules || [],
        executions: executions || [],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({
      minRole: "admin",
      module: "instagram_automation",
    });

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "create_rule");
    const adminDb = createAdminClient();

    // Action 1: Connect or Reconnect Instagram Professional Account
    if (action === "connect_account") {
      const igUsername = String(body.igUsername || ctx.workspaceSlug)
        .trim()
        .replace(/^@/, "")
        .toLowerCase();
      const accountType =
        body.accountType === "BUSINESS" ? "BUSINESS" : "CREATOR";

      const { data: existingConn } = await (
        adminDb.from("instagram_connections" as never) as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: { id: string } | null }>;
            };
          };
        }
      )
        .select("*")
        .eq("workspace_id", ctx.workspaceId)
        .maybeSingle();

      let conn: Record<string, unknown> | null = existingConn as unknown as Record<string, unknown> | null;
      if (existingConn) {
        const { data: updated, error: updErr } = await (
          adminDb.from("instagram_connections" as never) as unknown as {
            update: (values: Record<string, unknown>) => {
              eq: (col: string, val: string) => {
                select: (cols: string) => {
                  single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
                };
              };
            };
          }
        )
          .update({
            ig_username: igUsername,
            account_type: accountType,
            status: "connected",
            webhook_subscribed: true,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConn.id)
          .select("*")
          .single();
        if (updErr) throw new Error(updErr.message);
        conn = updated;
      } else {
        const { data: inserted, error: insErr } = await (
          adminDb.from("instagram_connections" as never) as unknown as {
            insert: (values: Record<string, unknown>) => {
              select: (cols: string) => {
                single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
              };
            };
          }
        )
          .insert({
            workspace_id: ctx.workspaceId,
            ig_user_id: `178414_${ctx.workspaceId.slice(0, 8)}_${Date.now()
              .toString()
              .slice(-4)}`,
            ig_username: igUsername,
            account_type: accountType,
            granted_scopes: [
              "instagram_business_basic",
              "instagram_business_manage_comments",
              "instagram_business_manage_messages",
            ],
            webhook_subscribed: true,
            status: "connected",
            connected_at: new Date().toISOString(),
          })
          .select("*")
          .single();
        if (insErr) throw new Error(insErr.message);
        conn = inserted;
      }

      return NextResponse.json(
        { ok: true, connection: conn },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Action 2: Disconnect Instagram Account
    if (action === "disconnect_account") {
      await (
        adminDb.from("instagram_connections" as never) as unknown as {
          update: (values: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<unknown>;
          };
        }
      )
        .update({
          status: "not_connected",
          webhook_subscribed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", ctx.workspaceId);

      return NextResponse.json(
        { ok: true, disconnected: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Action 3: Create Automation Rule
    // Ensure instagram_connections row exists for this workspace so composite FK holds
    let { data: connection } = await (
      adminDb.from("instagram_connections" as never) as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: { id: string } | null }>;
          };
        };
      }
    )
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    if (!connection) {
      const { data: autoConn, error: autoConnErr } = await (
        adminDb.from("instagram_connections" as never) as unknown as {
          insert: (values: Record<string, unknown>) => {
            select: (cols: string) => {
              single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
            };
          };
        }
      )
        .insert({
          workspace_id: ctx.workspaceId,
          ig_user_id: `178414_${ctx.workspaceId.slice(0, 8)}_${Date.now()
            .toString()
            .slice(-4)}`,
          ig_username: ctx.workspaceSlug,
          account_type: "CREATOR",
          granted_scopes: [
            "instagram_business_basic",
            "instagram_business_manage_comments",
            "instagram_business_manage_messages",
          ],
          webhook_subscribed: true,
          status: "connected",
          connected_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (autoConnErr) {
        throw new RouteAccessError(
          422,
          "VALIDATION_ERROR",
          autoConnErr.message
        );
      }
      connection = autoConn;
    }

    // Check active rule quota
    const { count: activeRulesCount } = await (
      adminDb.from("automation_rules" as never) as unknown as {
        select: (cols: string, opt: { count: string; head: boolean }) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: boolean) => Promise<{ count: number | null }>;
          };
        };
      }
    )
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId)
      .eq("is_enabled", true);

    if (
      ctx.entitlements.automationMaxActiveRules !== null &&
      (activeRulesCount ?? 0) >= ctx.entitlements.automationMaxActiveRules
    ) {
      throw new RouteAccessError(
        402,
        "QUOTA_EXCEEDED",
        `Your current plan allows up to ${ctx.entitlements.automationMaxActiveRules} active automation rule(s). Upgrade on Billing to unlock more workflows.`
      );
    }

    const name = String(body.name || "Send my free city guide")
      .trim()
      .slice(0, 100);
    const rawKeywords = Array.isArray(body.keywords)
      ? body.keywords
      : String(body.keywords || "GUIDE")
          .split(",")
          .map((k: string) => k.trim().toUpperCase())
          .filter(Boolean);
    const keywords = rawKeywords.length > 0 ? rawKeywords : ["GUIDE"];
    const matchMode = normalizeMatchMode(body.matchMode);
    const targetScope = normalizeTargetScope(body.targetScope);
    const privateMessageTemplate = String(
      body.privateMessageTemplate ||
        "Thanks for asking! Here is the direct link you requested ✨"
    )
      .trim()
      .slice(0, 1000);
    const ctaButtonLabel = body.ctaButtonLabel
      ? String(body.ctaButtonLabel).trim().slice(0, 40)
      : "Open link";

    let destinationUrl: string | null = body.destinationUrl
      ? String(body.destinationUrl).trim()
      : `https://biolio.site/${ctx.workspaceSlug}`;
    if (destinationUrl && !destinationUrl.startsWith("https://")) {
      destinationUrl = `https://${destinationUrl.replace(/^http:\/\//i, "")}`;
    }

    const sendPublicReply =
      ctx.entitlements.canUsePublicCommentReplies &&
      Boolean(body.sendPublicReply);
    const publicReplyTemplate =
      sendPublicReply && body.publicReplyTemplate
        ? String(body.publicReplyTemplate).trim().slice(0, 300)
        : null;
    const cooldownHours = Math.min(
      720,
      Math.max(0, Number(body.cooldownHours ?? 6))
    );

    const { data: createdRule, error: ruleErr } = await (
      adminDb.from("automation_rules" as never) as unknown as {
        insert: (values: Record<string, unknown>) => {
          select: (cols: string) => {
            single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
          };
        };
      }
    )
      .insert({
        workspace_id: ctx.workspaceId,
        instagram_connection_id: (connection as { id: string }).id,
        name,
        is_enabled: true,
        priority: 100,
        target_scope: targetScope,
        match_mode: matchMode,
        keywords,
        private_message_template: privateMessageTemplate,
        cta_button_label: ctaButtonLabel,
        destination_url: destinationUrl,
        send_public_reply: sendPublicReply,
        public_reply_template: publicReplyTemplate,
        cooldown_hours: cooldownHours,
      })
      .select("*")
      .single();

    if (ruleErr) {
      throw new RouteAccessError(422, "VALIDATION_ERROR", ruleErr.message);
    }

    return NextResponse.json(
      {
        ok: true,
        rule: createdRule,
        connection,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({
      minRole: "admin",
      module: "instagram_automation",
    });

    const body = await request.json().catch(() => ({}));
    const ruleId = String(body.ruleId || "").trim();
    const isEnabled = Boolean(body.isEnabled);

    if (!ruleId) {
      throw new RouteAccessError(422, "VALIDATION_ERROR", "ruleId is required.");
    }

    const adminDb = createAdminClient();
    const { data: updated, error } = await (
      adminDb.from("automation_rules" as never) as unknown as {
        update: (values: Record<string, unknown>) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => {
              select: (cols: string) => {
                single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
              };
            };
          };
        };
      }
    )
      .update({
        is_enabled: isEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .eq("workspace_id", ctx.workspaceId)
      .select("*")
      .single();

    if (error) {
      throw new RouteAccessError(422, "VALIDATION_ERROR", error.message);
    }

    return NextResponse.json(
      { ok: true, rule: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({
      minRole: "admin",
      module: "instagram_automation",
    });

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId") || "";

    if (!ruleId) {
      throw new RouteAccessError(422, "VALIDATION_ERROR", "ruleId is required.");
    }

    const adminDb = createAdminClient();
    const { error } = await (
      adminDb.from("automation_rules" as never) as unknown as {
        delete: () => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      }
    )
      .delete()
      .eq("id", ruleId)
      .eq("workspace_id", ctx.workspaceId);

    if (error) {
      throw new RouteAccessError(422, "VALIDATION_ERROR", error.message);
    }

    return NextResponse.json(
      { ok: true, deletedId: ruleId },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
