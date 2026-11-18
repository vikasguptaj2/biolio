import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/src/types/database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

export async function createClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return (createServerClient as unknown as (...args: unknown[]) => SupabaseClient<Database>)(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
}

export interface SessionWorkspaceRow {
  id: string;
  name: string;
  slug: string;
  creator_role?: string | null;
  status: string;
  owner_id?: string;
  intended_modules?: string[] | null;
  workspace_entitlements?: Record<string, unknown> | Array<Record<string, unknown>> | null;
}

export interface SessionMembershipRow {
  workspace_id: string;
  role: "owner" | "admin" | "editor";
  status: string;
}

/**
 * Returns current authenticated user, verified account status, and authoritative workspace context.
 * Resolves active membership first, then falls back to owned workspace, ensuring single source of truth (Closes F-12, B-19).
 */
export async function getSessionContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      profile: null,
      workspace: null,
      membership: null,
      entitlements: null,
      isSuspended: false,
    };
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const isSuspended = profile?.account_status === "suspended";

  // 1. Fetch user's active workspace membership
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  let membership: SessionMembershipRow | null =
    (memberships?.[0] as unknown as SessionMembershipRow) || null;

  let workspaceId = membership?.workspace_id;

  // 2. Fallback: check if user owns a workspace directly
  if (!workspaceId) {
    const { data: owned } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (owned?.[0]?.id) {
      workspaceId = owned[0].id;
      membership = {
        workspace_id: workspaceId,
        role: "owner",
        status: "active",
      };
    }
  }

  if (!workspaceId) {
    return {
      user,
      profile,
      workspace: null,
      membership: null,
      entitlements: null,
      isSuspended,
    };
  }

  // 3. Fetch full workspace with entitlements projection
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug, creator_role, status, owner_id, intended_modules, workspace_entitlements(*)")
    .eq("id", workspaceId)
    .maybeSingle();

  const wsTyped = workspace as unknown as SessionWorkspaceRow | null;
  const rawEnt = Array.isArray(wsTyped?.workspace_entitlements)
    ? wsTyped.workspace_entitlements[0]
    : wsTyped?.workspace_entitlements;

  const { evaluateWorkspaceEntitlements } = await import("@/lib/entitlements");
  const entitlements = evaluateWorkspaceEntitlements(
    rawEnt as Record<string, unknown> | undefined,
    wsTyped?.intended_modules
  );

  return {
    user,
    profile,
    workspace: wsTyped,
    membership,
    entitlements,
    isSuspended,
  };
}
