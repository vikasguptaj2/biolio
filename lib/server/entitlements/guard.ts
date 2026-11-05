import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  evaluateWorkspaceEntitlements,
  type EvaluatedWorkspaceEntitlements,
} from "@/lib/entitlements";

export class EntitlementError extends Error {
  public readonly status: number;
  public readonly code: "MODULE_LOCKED" | "QUOTA_EXCEEDED" | "ACCOUNT_SUSPENDED";
  public readonly meta?: Record<string, unknown>;

  constructor(
    status: number,
    code: "MODULE_LOCKED" | "QUOTA_EXCEEDED" | "ACCOUNT_SUSPENDED",
    message: string,
    meta?: Record<string, unknown>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

/**
 * LAYER 2 SERVICE GUARD (`requireEntitlement`) — Closes Audit B-07
 *
 * Reads `workspaces` and `workspace_entitlements` from PostgreSQL and rejects
 * mutations when:
 *  - Workspace status is not `active` or `past_due`
 *  - Target module (`bio` or `instagram_automation`) is `locked`
 */
export async function requireEntitlement(
  workspaceId: string,
  module: "bio" | "instagram_automation"
): Promise<EvaluatedWorkspaceEntitlements> {
  const adminDb = createAdminClient();

  const { data: ws } = await (
    adminDb.from("workspaces" as never) as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{
            data: {
              id: string;
              status: string;
              intended_modules: string[];
              workspace_entitlements: unknown;
            } | null;
          }>;
        };
      };
    }
  )
    .select("id, status, intended_modules, workspace_entitlements(*)")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws || !["active", "past_due"].includes(ws.status)) {
    throw new EntitlementError(
      403,
      "ACCOUNT_SUSPENDED",
      "This workspace is currently suspended or inactive."
    );
  }

  const rawEnt = Array.isArray(ws.workspace_entitlements)
    ? ws.workspace_entitlements[0]
    : ws.workspace_entitlements;

  const evaluated = evaluateWorkspaceEntitlements(rawEnt, ws.intended_modules);

  if (module === "bio" && evaluated.isBioProductLocked) {
    throw new EntitlementError(
      403,
      "MODULE_LOCKED",
      evaluated.bioLockReason ||
        "Biolio Bio is locked on your current standalone subscription.",
      { module: "bio", activePlanId: evaluated.activePlanId }
    );
  }

  if (
    module === "instagram_automation" &&
    evaluated.isAutomationProductLocked
  ) {
    throw new EntitlementError(
      403,
      "MODULE_LOCKED",
      evaluated.automationLockReason ||
        "Instagram Automation is locked on your current standalone subscription.",
      { module: "instagram_automation", activePlanId: evaluated.activePlanId }
    );
  }

  return evaluated;
}

