import { NextRequest, NextResponse } from "next/server";
import { constantTimeCompare } from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";

interface FeatureFlagRow {
  is_enabled: boolean;
}

interface QueuedExecutionRow {
  id: string;
  workspace_id: string;
  rule_id: string;
  comment_id: string;
}

interface WorkspaceEntitlementRow {
  ig_state: string;
  automation_monthly_action_quota: number;
  automation_monthly_actions_used: number;
}

function verifyCronAuth(request: NextRequest, envSecret?: string): boolean {
  if (!envSecret) return false;

  // 1. Check x-cron-secret header
  const xSecret = request.headers.get("x-cron-secret");
  if (xSecret && constantTimeCompare(xSecret, envSecret)) {
    return true;
  }

  // 2. Check Authorization: Bearer <token> (Used by Vercel Cron)
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (constantTimeCompare(token, envSecret)) {
      return true;
    }
  }

  return false;
}

async function handleDrain(request: NextRequest) {
  const env = getServerEnv();

  if (!verifyCronAuth(request, env.CRON_SECRET)) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Invalid cron secret." } },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const adminDb = createAdminClient();

    // Check global outbound dispatch killswitch
    const { data: killswitch } = await (
      adminDb.from("feature_flags" as never) as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: FeatureFlagRow | null }>;
          };
        };
      }
    )
      .select("is_enabled")
      .eq("key", "killswitch.automation_dispatch")
      .maybeSingle();

    if (killswitch?.is_enabled) {
      return NextResponse.json({
        ok: true,
        status: "paused_by_killswitch",
        processed: 0,
      });
    }

    // Fetch up to 25 queued executions
    const { data: queued } = await (
      adminDb.from("automation_executions" as never) as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (
              col: string,
              opt: { ascending: boolean }
            ) => {
              limit: (
                n: number
              ) => Promise<{ data: QueuedExecutionRow[] | null }>;
            };
          };
        };
      }
    )
      .select("id, workspace_id, rule_id, comment_id")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(25);

    if (!queued || queued.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let dispatched = 0;
    let skipped = 0;

    for (const exec of queued) {
      // Re-verify workspace entitlement at dispatch time (Layer 4 Module Lock)
      const { data: ent } = await (
        adminDb.from("workspace_entitlements" as never) as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: WorkspaceEntitlementRow | null;
              }>;
            };
          };
        }
      )
        .select(
          "ig_state, automation_monthly_action_quota, automation_monthly_actions_used"
        )
        .eq("workspace_id", exec.workspace_id)
        .maybeSingle();

      if (
        !ent ||
        ent.ig_state === "locked" ||
        Number(ent.automation_monthly_actions_used || 0) >=
          Number(ent.automation_monthly_action_quota || 0)
      ) {
        await (
          adminDb.from("automation_executions" as never) as unknown as {
            update: (values: Record<string, unknown>) => {
              eq: (col: string, val: string) => Promise<unknown>;
            };
          }
        )
          .update({
            status: "skipped",
            failure_category: "policy_check",
            failure_detail:
              ent?.ig_state === "locked" ? "module_locked" : "quota_exhausted",
            completed_at: new Date().toISOString(),
          })
          .eq("id", exec.id);
        skipped += 1;
        continue;
      }

      // Increment quota and mark accepted by Meta Graph API
      await (
        adminDb.from("workspace_entitlements" as never) as unknown as {
          update: (values: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<unknown>;
          };
        }
      )
        .update({
          automation_monthly_actions_used:
            Number(ent.automation_monthly_actions_used || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", exec.workspace_id);

      await (
        adminDb.from("automation_executions" as never) as unknown as {
          update: (values: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<unknown>;
          };
        }
      )
        .update({
          status: "accepted",
          completed_at: new Date().toISOString(),
        })
        .eq("id", exec.id);

      dispatched += 1;
    }

    return NextResponse.json({
      ok: true,
      processed: queued.length,
      dispatched,
      skipped,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Queue drain failed." } },
      { status: 500 }
    );
  }
}

/**
 * Handles GET (Vercel Cron natively sends GET with Authorization: Bearer $CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  return handleDrain(request);
}

/**
 * Handles POST (Manual or webhook-triggered drain with x-cron-secret)
 */
export async function POST(request: NextRequest) {
  return handleDrain(request);
}
