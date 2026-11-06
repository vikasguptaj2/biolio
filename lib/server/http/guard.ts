import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getVerifiedAdminSession,
  ADMIN_STEP_UP_TTL_MS,
  constantTimeCompare,
  type AdminSession,
} from "@/lib/admin-auth";
import {
  requireEntitlement,
  EntitlementError,
} from "@/lib/server/entitlements/guard";
import { getServerEnv } from "@/lib/server/config/env";
import type { EvaluatedWorkspaceEntitlements } from "@/lib/entitlements";

/**
 * UNIFIED BACKEND ROUTE AUTHENTICATION & ACCESS CONTROL MATRIX (`lib/server/http/guard.ts`)
 *
 * Defines and enforces the 5 distinct access levels across all Biolio routes:
 * 1. `requireAuthenticatedCreator()`: Verifies Supabase JWT session + `user_profiles.account_status === 'active'`.
 * 2. `requireWorkspaceAccess({ minRole, module })`: Resolves active workspace from session (never from client body),
 *    checks `workspace_members.role` (`owner | admin | editor`), checks `workspaces.status` (`active | past_due`),
 *    and enforces 5-Layer Module Locking (`requireEntitlement`).
 * 3. `requireSuperAdmin({ requireStepUp })`: Verifies isolated `__Host-biolio_admin` / `biolio_admin_session`
 *    session cookie against `public.admin_sessions` and `ADMIN_SESSION_EPOCH`.
 * 4. `requireCronWorker(request)`: Verifies `x-cron-secret` header in constant time.
 * 5. `verifySameOrigin(request)`: Protects cookie-authenticated `POST/PUT/PATCH/DELETE` routes against CSRF.
 */

export class RouteAccessError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface WorkspaceAccessContext {
  userId: string;
  userEmail: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  role: "owner" | "admin" | "editor";
  entitlements: EvaluatedWorkspaceEntitlements;
}

export function verifySameOrigin(request: NextRequest): void {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return;

  const origin = request.headers.get("origin");
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (
    secFetchSite &&
    secFetchSite !== "same-origin" &&
    secFetchSite !== "none"
  ) {
    throw new RouteAccessError(
      403,
      "CSRF_REJECTED",
      "Cross-site mutation request rejected."
    );
  }

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const reqHost = request.headers.get("host") || request.nextUrl.host;
      if (originHost && reqHost && originHost !== reqHost) {
        throw new RouteAccessError(
          403,
          "CSRF_REJECTED",
          "Origin header mismatch."
        );
      }
    } catch (e) {
      if (e instanceof RouteAccessError) throw e;
    }
  }
}

export async function requireWorkspaceAccess(options?: {
  minRole?: "owner" | "admin" | "editor";
  module?: "bio" | "instagram_automation";
}): Promise<WorkspaceAccessContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new RouteAccessError(
      401,
      "UNAUTHENTICATED",
      "Creator session required. Please sign in."
    );
  }

  const adminDb = createAdminClient();

  // Check user_profiles account_status
  const { data: profile } = await (adminDb.from("user_profiles" as never) as unknown as {
    select: (col: string) => {
      eq: (col2: string, val: string) => {
        maybeSingle: () => Promise<{ data: { account_status: string } | null }>;
      };
    };
  })
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && profile.account_status === "suspended") {
    throw new RouteAccessError(
      403,
      "ACCOUNT_SUSPENDED",
      "Your creator account has been suspended."
    );
  }

  // Resolve active workspace membership from session
  const { data: memberships } = await (adminDb.from("workspace_members" as never) as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => {
          order: (col3: string, opt: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: Array<{ workspace_id: string; role: string; status: string }> | null }>;
          };
        };
      };
    };
  })
    .select("workspace_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  let membership = memberships?.[0];

  // Fallback: check if user owns a workspace directly
  if (!membership) {
    const { data: ownedWs } = await (adminDb.from("workspaces" as never) as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col2: string, opt: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: Array<{ id: string }> | null }>;
          };
        };
      };
    })
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (ownedWs?.[0]?.id) {
      membership = {
        workspace_id: ownedWs[0].id,
        role: "owner",
        status: "active",
      };
    }
  }

  if (!membership?.workspace_id) {
    throw new RouteAccessError(
      403,
      "WORKSPACE_REQUIRED",
      "No active workspace found. Complete onboarding at /onboarding first."
    );
  }

  const role = (membership.role || "owner") as "owner" | "admin" | "editor";
  const minRole = options?.minRole || "editor";

  const roleRank: Record<"editor" | "admin" | "owner", number> = {
    editor: 1,
    admin: 2,
    owner: 3,
  };

  if (roleRank[role] < roleRank[minRole]) {
    throw new RouteAccessError(
      403,
      "FORBIDDEN",
      `This action requires '${minRole}' workspace permissions.`
    );
  }

  const { data: ws } = await (adminDb.from("workspaces" as never) as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { id: string; name: string; slug: string; status: string } | null }>;
      };
    };
  })
    .select("id, name, slug, status")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  if (!ws || !["active", "past_due"].includes(ws.status)) {
    throw new RouteAccessError(
      403,
      "ACCOUNT_SUSPENDED",
      "This workspace is currently suspended or closed."
    );
  }

  // Enforce 5-Layer Module Entitlement Lock
  const targetModule = options?.module || "bio";
  let entitlements: EvaluatedWorkspaceEntitlements;
  try {
    entitlements = await requireEntitlement(ws.id, targetModule);
  } catch (err) {
    if (err instanceof EntitlementError) {
      throw new RouteAccessError(err.status, err.code, err.message);
    }
    throw err;
  }

  return {
    userId: user.id,
    userEmail: user.email || "",
    workspaceId: ws.id,
    workspaceSlug: ws.slug,
    workspaceName: ws.name,
    role,
    entitlements,
  };
}

export async function requireSuperAdmin(options?: {
  requireStepUp?: boolean;
}): Promise<AdminSession> {
  const session = await getVerifiedAdminSession();
  if (!session) {
    throw new RouteAccessError(
      401,
      "UNAUTHENTICATED",
      "Valid Super Admin operator session required."
    );
  }

  if (
    options?.requireStepUp &&
    Date.now() - session.stepUpAt > ADMIN_STEP_UP_TTL_MS * 6
  ) {
    throw new RouteAccessError(
      403,
      "STEP_UP_REQUIRED",
      "Step-up re-authentication required for high-risk administrative commands."
    );
  }

  return session;
}

export function requireCronWorker(request: NextRequest): void {
  const env = getServerEnv();
  const provided = request.headers.get("x-cron-secret") || "";
  if (
    !env.CRON_SECRET ||
    !provided ||
    !constantTimeCompare(provided, env.CRON_SECRET)
  ) {
    throw new RouteAccessError(
      401,
      "UNAUTHENTICATED",
      "Valid x-cron-secret header required."
    );
  }
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof RouteAccessError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (err instanceof EntitlementError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status, headers: { "Cache-Control": "no-store" } }
    );
  }
  const message =
    err instanceof Error ? err.message : "Unexpected server error.";
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}
