import { NextRequest, NextResponse } from "next/server";
import {
  requireWorkspaceAccess,
  handleRouteError,
  RouteAccessError,
} from "@/lib/server/http/guard";
import { generateOAuthState } from "@/lib/server/crypto/token";
import { getServerEnv } from "@/lib/server/config/env";

/**
 * INSTAGRAM OAUTH CONNECT INITIATOR (`GET /api/instagram/connect`)
 * Reference: META_INTEGRATION.md §2
 *
 * Requirements:
 * 1. Requires authenticated workspace session with minRole 'admin'.
 * 2. Enforces automation module entitlement (Starter / Pro / Bundle).
 * 3. Generates cryptographically signed, single-use, 10-minute state nonce.
 * 4. Redirects to Meta's official Instagram Login dialog.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceAccess({
      minRole: "admin",
      module: "instagram_automation",
    });

    const env = getServerEnv();
    const metaAppId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID;

    if (!metaAppId) {
      throw new RouteAccessError(
        500,
        "META_APP_NOT_CONFIGURED",
        "Meta App ID is not configured on this server."
      );
    }

    const state = generateOAuthState({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
    });

    const origin =
      env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get("origin") ||
      `https://${request.headers.get("host") || "biolio.site"}`;

    const redirectUri = `${origin}/api/instagram/callback`;

    // Permissions needed for automated comment replies and private DMs
    const scopes = [
      "instagram_business_basic",
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
    ].join(",");

    const metaAuthUrl = new URL("https://www.instagram.com/oauth/authorize");
    metaAuthUrl.searchParams.set("enable_fb_login", "0");
    metaAuthUrl.searchParams.set("force_authentication", "1");
    metaAuthUrl.searchParams.set("client_id", metaAppId);
    metaAuthUrl.searchParams.set("redirect_uri", redirectUri);
    metaAuthUrl.searchParams.set("response_type", "code");
    metaAuthUrl.searchParams.set("scope", scopes);
    metaAuthUrl.searchParams.set("state", state);

    return NextResponse.redirect(metaAuthUrl.toString(), 302);
  } catch (error) {
    return handleRouteError(error);
  }
}

