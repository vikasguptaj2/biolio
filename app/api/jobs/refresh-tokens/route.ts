import { NextRequest, NextResponse } from "next/server";
import { constantTimeCompare } from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/server/crypto/token";

interface ExpiringConnectionRow {
  id: string;
  workspace_id: string;
  ig_user_id: string;
  ig_username: string;
  token_expires_at: string;
}

interface CredentialRow {
  encrypted_access_token: Buffer | { data: number[] } | string;
}

interface IgRefreshResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

function verifyCronAuth(request: NextRequest, envSecret?: string): boolean {
  if (!envSecret) return false;

  const xSecret = request.headers.get("x-cron-secret");
  if (xSecret && constantTimeCompare(xSecret, envSecret)) {
    return true;
  }

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (constantTimeCompare(token, envSecret)) {
      return true;
    }
  }

  return false;
}

/**
 * INSTAGRAM TOKEN REFRESH CRON WORKER (`GET /api/jobs/refresh-tokens`)
 * Reference: META_INTEGRATION.md §3, ROUTES_AND_ACCESS.md §4
 *
 * Runs daily via Vercel Cron or external scheduler.
 * Refreshes long-lived tokens expiring within 10 days to maintain continuous automation.
 */
export async function GET(request: NextRequest) {
  const env = getServerEnv();

  if (!verifyCronAuth(request, env.CRON_SECRET)) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Invalid cron secret." } },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Find all active connections whose tokens expire in <= 10 days
  const { data: expiringConns, error: queryErr } = (await db
    .from("instagram_connections")
    .select("id, workspace_id, ig_user_id, ig_username, token_expires_at")
    .eq("status", "connected")
    .lte("token_expires_at", tenDaysFromNow)
    .limit(50)) as { data: ExpiringConnectionRow[] | null; error: unknown };

  if (queryErr) {
    return NextResponse.json(
      { error: { code: "QUERY_FAILED", message: "Failed to scan expiring tokens." } },
      { status: 500 }
    );
  }

  let refreshedCount = 0;
  let expiredCount = 0;

  for (const conn of expiringConns || []) {
    try {
      // 2. Fetch encrypted token
      const { data: credRow } = (await db
        .from("private_integrations.instagram_credentials" as never)
        .select("encrypted_access_token")
        .eq("connection_id", conn.id)
        .maybeSingle()) as { data: CredentialRow | null };

      if (!credRow?.encrypted_access_token) {
        continue;
      }

      let encryptedString = "";
      if (typeof credRow.encrypted_access_token === "string") {
        encryptedString = credRow.encrypted_access_token;
      } else if (Buffer.isBuffer(credRow.encrypted_access_token)) {
        encryptedString = credRow.encrypted_access_token.toString("utf8");
      } else if (
        typeof credRow.encrypted_access_token === "object" &&
        "data" in credRow.encrypted_access_token
      ) {
        encryptedString = Buffer.from(credRow.encrypted_access_token.data).toString("utf8");
      }

      const rawToken = decryptToken(encryptedString);

      // 3. Request fresh 60-day token from Meta Graph API
      const refreshUrl = new URL("https://graph.instagram.com/refresh_access_token");
      refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
      refreshUrl.searchParams.set("access_token", rawToken);

      const res = await fetch(refreshUrl.toString());
      const json = (await res.json()) as IgRefreshResponse;

      if (!res.ok || !json.access_token) {
        // Token was revoked or expired on Meta side
        await db
          .from("instagram_connections")
          .update({
            status: "expired",
            last_error_category: "token_revoked_by_meta",
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id);

        expiredCount++;
        continue;
      }

      const newExpiresIn = json.expires_in || 60 * 24 * 60 * 60;
      const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

      // 4. Persist updated encrypted token and expiration timestamp
      const newEncryptedString = encryptToken(json.access_token);
      const tokenBuffer = Buffer.from(newEncryptedString, "utf8");

      await db
        .from("private_integrations.instagram_credentials" as never)
        .update({
          encrypted_access_token: tokenBuffer,
          updated_at: new Date().toISOString(),
        })
        .eq("connection_id", conn.id);

      await db
        .from("instagram_connections")
        .update({
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      refreshedCount++;
    } catch {
      // Continue processing remaining connections
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: expiringConns?.length || 0,
    refreshed: refreshedCount,
    expired: expiredCount,
    timestamp: new Date().toISOString(),
  });
}

