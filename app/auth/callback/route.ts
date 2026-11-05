import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/server/config/env";

/**
 * HARDENED OAUTH & SESSION CALLBACK (`GET /auth/callback`)
 * Closes Audit Finding: B-05 (Open Redirect & Unchecked Code Exchange)
 *
 * Security Rules (03_AUTH_AND_ACCESS.md §1.4):
 * 1. `next` / `redirectTo` must start with a single `/`, must NOT start with `//` or `/\`,
 *    must contain no `://` or control chars, length <= 200, and must match `/dashboard*` or `/onboarding*`.
 * 2. Checks `exchangeCodeForSession(code)` error and fails closed to `/signin?error=oauth_failed`.
 * 3. Verifies `user_profiles.account_status === 'active'`; if suspended, signs out and redirects to `/signin?error=suspended`.
 * 4. If user has no workspace yet, redirects to `/onboarding`.
 */

function sanitizeNextPath(rawNext: string | null): string {
  if (!rawNext || typeof rawNext !== "string") return "/dashboard";
  const trimmed = rawNext.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > 200 ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://") ||
    /[\x00-\x1f\x7f]/.test(trimmed)
  ) {
    return "/dashboard";
  }

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return "/dashboard";
  }

  if (
    decoded.startsWith("//") ||
    decoded.startsWith("/\\") ||
    decoded.includes("://")
  ) {
    return "/dashboard";
  }

  const allowedPrefixes = [
    "/dashboard",
    "/onboarding",
    "/auth/reset-password",
    "/reset-password",
  ];
  const isAllowed = allowedPrefixes.some(
    (prefix) =>
      trimmed === prefix ||
      trimmed.startsWith(`${prefix}/`) ||
      trimmed.startsWith(`${prefix}?`)
  );

  return isAllowed ? trimmed : "/dashboard";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext =
    requestUrl.searchParams.get("next") ||
    requestUrl.searchParams.get("redirectTo");
  const safeNext = sanitizeNextPath(rawNext);

  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  const baseOrigin =
    process.env.NODE_ENV === "production"
      ? NEXT_PUBLIC_SITE_URL
      : requestUrl.origin;

  const makeRedirect = (path: string) => {
    const res = NextResponse.redirect(`${baseOrigin}${path}`, { status: 302 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  if (!code) {
    return makeRedirect("/signin?error=oauth_failed");
  }

  const supabase = await createClient();
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeErr) {
    return makeRedirect("/signin?error=oauth_failed");
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return makeRedirect("/signin?error=oauth_failed");
  }

  // Defensively ensure user_profiles row exists for OAuth user
  await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      email: user.email || `${user.id}@placeholder.biolio.site`,
      full_name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Creator",
      account_status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  // Check account_status in user_profiles
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && (profile as { account_status: string | null }).account_status === "suspended") {
    await supabase.auth.signOut();
    return makeRedirect("/signin?error=suspended");
  }

  // If redirecting to password reset, bypass workspace check
  if (
    safeNext.startsWith("/auth/reset-password") ||
    safeNext.startsWith("/reset-password")
  ) {
    return makeRedirect(safeNext);
  }

  // Check if user already has an active workspace membership
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  if (!memberships || memberships.length === 0) {
    return makeRedirect("/onboarding");
  }

  return makeRedirect(safeNext);
}
