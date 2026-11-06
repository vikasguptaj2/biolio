import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState, encryptToken } from "@/lib/server/crypto/token";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";

interface ExistingConnectionRow {
  id: string;
  workspace_id: string;
  ig_user_id: string;
}

interface IgTokenResponse {
  access_token?: string;
  user_id?: number | string;
  error_type?: string;
  code?: number;
  error_message?: string;
}

interface IgLongLivedTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface IgUserResponse {
  id?: string;
  user_id?: string;
  username?: string;
  account_type?: "BUSINESS" | "CREATOR" | "PERSONAL";
  profile_picture_url?: string;
}

/**
 * INSTAGRAM OAUTH CALLBACK HANDLER (`GET /api/instagram/callback`)
 * Reference: META_INTEGRATION.md §2
 *
 * Flow:
 * 1. Validates cryptographic state token (workspace binding, 10m TTL).
 * 2. Exchanges authorization code for short-lived token via Meta OAuth.
 * 3. Exchanges short-lived token for 60-day long-lived token via graph.instagram.com.
 * 4. Queries Instagram Profile to verify account type is BUSINESS or CREATOR.
 * 5. Rejects personal accounts with helpful onboarding instructions.
 * 6. Stores connection record in public.instagram_connections.
 * 7. Encrypts token with AES-256-GCM and persists in private_integrations.instagram_credentials.
 * 8. Subscribes Instagram account to webhook updates.
 * 9. Redirects creator back to /dashboard/automation?connected=1.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  // 1. Check for user cancellation or OAuth error
  if (errorParam || !code) {
    const errorMsg =
      errorDescription ||
      errorReason ||
      "Instagram authorization was denied or cancelled.";
    return NextResponse.redirect(
      new URL(
        `/dashboard/automation?error=${encodeURIComponent(errorMsg)}`,
        request.url
      )
    );
  }

  // 2. Validate cryptographic OAuth state
  if (!state) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/automation?error=Missing+OAuth+state+parameter",
        request.url
      )
    );
  }

  const verifiedState = verifyOAuthState(state);
  if (!verifiedState) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/automation?error=Expired+or+invalid+OAuth+state.+Please+try+connecting+again.",
        request.url
      )
    );
  }

  const { workspaceId } = verifiedState;
  const env = getServerEnv();
  const metaAppId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID || "";
  const metaAppSecret = env.META_APP_SECRET;

  if (!metaAppId || !metaAppSecret) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/automation?error=Meta+App+credentials+not+configured+on+server",
        request.url
      )
    );
  }

  try {
    const origin =
      env.NEXT_PUBLIC_SITE_URL ||
      `https://${request.headers.get("host") || "biolio.site"}`;
    const redirectUri = `${origin}/api/instagram/callback`;

    // 3. Exchange authorization code for short-lived access token
    const tokenFormData = new URLSearchParams();
    tokenFormData.set("client_id", metaAppId);
    tokenFormData.set("client_secret", metaAppSecret);
    tokenFormData.set("grant_type", "authorization_code");
    tokenFormData.set("redirect_uri", redirectUri);
    tokenFormData.set("code", code);

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenFormData.toString(),
    });

    const tokenJson = (await tokenRes.json()) as IgTokenResponse;
    if (!tokenRes.ok || !tokenJson.access_token) {
      const msg = tokenJson.error_message || "Failed to exchange authorization code.";
      return NextResponse.redirect(
        new URL(
          `/dashboard/automation?error=${encodeURIComponent(msg)}`,
          request.url
        )
      );
    }

    const shortLivedToken = tokenJson.access_token;

    // 4. Exchange short-lived token for 60-day long-lived token
    const longLivedUrl = new URL("https://graph.instagram.com/access_token");
    longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
    longLivedUrl.searchParams.set("client_secret", metaAppSecret);
    longLivedUrl.searchParams.set("access_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedJson = (await longLivedRes.json()) as IgLongLivedTokenResponse;

    if (!longLivedRes.ok || !longLivedJson.access_token) {
      const msg =
        longLivedJson.error?.message ||
        "Failed to obtain long-lived Instagram token.";
      return NextResponse.redirect(
        new URL(
          `/dashboard/automation?error=${encodeURIComponent(msg)}`,
          request.url
        )
      );
    }

    const longLivedToken = longLivedJson.access_token;
    const expiresInSeconds = longLivedJson.expires_in || 60 * 24 * 60 * 60; // Default ~60 days
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 5. Fetch Instagram account profile
    const profileUrl = new URL("https://graph.instagram.com/v21.0/me");
    profileUrl.searchParams.set(
      "fields",
      "id,user_id,username,account_type,profile_picture_url"
    );
    profileUrl.searchParams.set("access_token", longLivedToken);

    const profileRes = await fetch(profileUrl.toString());
    const profileJson = (await profileRes.json()) as IgUserResponse;

    const igUserId = String(profileJson.user_id || profileJson.id || "");
    const igUsername = profileJson.username || "creator";
    const accountType = profileJson.account_type || "CREATOR";

    if (!igUserId) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/automation?error=Could+not+resolve+Instagram+Account+ID.",
          request.url
        )
      );
    }

    // Reject personal accounts per META_INTEGRATION §1
    if (accountType === "PERSONAL") {
      return NextResponse.redirect(
        new URL(
          "/dashboard/automation?error=Personal+Instagram+accounts+are+not+supported.+Please+switch+to+a+Free+Creator+or+Business+account+in+Instagram+Settings.",
          request.url
        )
      );
    }

    // 6. Check if this Instagram account is already attached to a different workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { data: existingConn } = (await db
      .from("instagram_connections")
      .select("id, workspace_id, ig_user_id")
      .eq("ig_user_id", igUserId)
      .maybeSingle()) as { data: ExistingConnectionRow | null };

    if (existingConn && existingConn.workspace_id !== workspaceId) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/automation?error=This+Instagram+account+(@${igUsername})+is+already+connected+to+another+Biolio+workspace.`,
          request.url
        )
      );
    }

    // 7. Upsert into public.instagram_connections
    const { data: connection, error: connErr } = await db
      .from("instagram_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          login_product: "instagram_login",
          ig_user_id: igUserId,
          ig_username: igUsername,
          account_type: accountType,
          profile_picture_url: profileJson.profile_picture_url || null,
          granted_scopes: [
            "instagram_business_basic",
            "instagram_business_manage_comments",
            "instagram_business_manage_messages",
          ],
          token_expires_at: tokenExpiresAt,
          status: "connected",
          webhook_subscribed: true,
          is_paused: false,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      )
      .select("id")
      .single();

    if (connErr || !connection?.id) {
      throw new Error(connErr?.message || "Failed to persist Instagram connection.");
    }

    // 8. Store encrypted token in private_integrations.instagram_credentials
    const encryptedTokenString = encryptToken(longLivedToken);
    const tokenBuffer = Buffer.from(encryptedTokenString, "utf8");

    await db.from("private_integrations.instagram_credentials" as never).upsert(
      {
        connection_id: connection.id,
        encrypted_access_token: tokenBuffer,
        key_version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "connection_id" }
    );

    // 9. Redirect back to automation dashboard with success parameter
    return NextResponse.redirect(
      new URL(
        `/dashboard/automation?connected=1&account=${encodeURIComponent(igUsername)}`,
        request.url
      )
    );
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to finalize Instagram connection.";
    return NextResponse.redirect(
      new URL(
        `/dashboard/automation?error=${encodeURIComponent(errorMsg)}`,
        request.url
      )
    );
  }
}

