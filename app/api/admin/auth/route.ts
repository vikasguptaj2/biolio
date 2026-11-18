import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_ABSOLUTE_TTL_MS,
  verifyAdminCredentials,
  issueAdminSession,
  getVerifiedAdminSession,
  sha256Hex,
} from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/server/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySameOrigin } from "@/lib/server/http/guard";

interface TableWithCount {
  select: (cols: string, opt: { count: string; head: boolean }) => {
    eq: (col: string, val: unknown) => {
      eq: (col2: string, val2: unknown) => {
        gte: (col3: string, val3: unknown) => Promise<{ count: number | null; error: unknown }>;
      };
    };
  };
  insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
  update: (values: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<unknown>;
  };
}

/**
 * HARDENED SUPER ADMIN AUTHENTICATION ENDPOINTS (`/api/admin/auth`)
 * Closes Audit Findings: B-02, B-10 (06_ADMIN_OPERATIONS_AUDIT_LOGS.md §4)
 *
 * Security Requirements:
 * 1. IP rate limiting (brute force mitigation).
 * 2. Mandatory origin verification (CSRF protection on mutation).
 * 3. Constant-time credential checks (no timing side-channel).
 * 4. Immutable audit logging for every login attempt and logout.
 */
export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const env = getServerEnv();
    const xff = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const clientIp = xff.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const ipHash = sha256Hex(clientIp);

    // 1. IP allowlist check (if configured in env)
    if (
      env.ADMIN_IP_ALLOWLIST.length > 0 &&
      !env.ADMIN_IP_ALLOWLIST.includes(clientIp)
    ) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Client IP not allowed." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const rawBody = await request.text();
    if (rawBody.length > 8_192) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Request is too large." } },
        { status: 413, headers: { "Cache-Control": "no-store" } }
      );
    }
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rawBody || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (email.length > 320 || password.length > 512) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid credentials." } },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }
    const emailHash = sha256Hex(email || "empty");

    const adminDb = createAdminClient();
    const loginAttempts = adminDb.from("admin_login_attempts" as never) as unknown as TableWithCount;
    const auditLogs = adminDb.from("admin_audit_logs" as never) as unknown as TableWithCount;

    // 2. Check brute-force rate limit (5 failures in last 15 minutes)
    try {
      const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count, error } = await loginAttempts
        .select("*", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .eq("success", false)
        .gte("attempted_at", windowStart);

      if (error) throw error;
      if ((count ?? 0) >= 5) {
        return NextResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many login attempts. Please try again in 15 minutes.",
            },
          },
          {
            status: 429,
            headers: {
              "Cache-Control": "no-store",
              "Retry-After": "900",
            },
          }
        );
      }
    } catch {
      return NextResponse.json(
        { error: { code: "PROVIDER_NOT_READY", message: "Admin login protection is temporarily unavailable." } },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3. Constant-time credential verification
    const verification = verifyAdminCredentials(email, password);
    if (!verification.configured) {
      return NextResponse.json(
        {
          error: {
            code: "PROVIDER_NOT_READY",
            message:
              "Secure Super Admin credentials are not configured in the server environment.",
          },
        },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!verification.ok) {
      try {
        const { error } = await loginAttempts.insert({
          email_hash: emailHash,
          ip_hash: ipHash,
          success: false,
        });
        if (error) throw error;
      } catch {
        return NextResponse.json(
          { error: { code: "PROVIDER_NOT_READY", message: "Admin login protection is temporarily unavailable." } },
          { status: 503, headers: { "Cache-Control": "no-store" } }
        );
      }

      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials.",
          },
        },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 4. Issue session token & record audit row
    const { token, session } = await issueAdminSession({
      ipAddress: clientIp,
      userAgent,
    });

    try {
      const { error: attemptError } = await loginAttempts.insert({
        email_hash: emailHash,
        ip_hash: ipHash,
        success: true,
      });
      if (attemptError) throw attemptError;

      const { error: auditError } = await auditLogs.insert({
        actor_role: "super_admin",
        actor_user_id: null,
        action: "ADMIN_LOGIN",
        target_type: "admin_session",
        target_id: session.sessionId || emailHash.slice(0, 16),
        after_summary: { ip_hash: ipHash, epoch: session.epoch },
        reason: "Authenticated Super Admin session",
        result_status: "success",
      });
      if (auditError) throw auditError;
    } catch {
      if (session.sessionId) {
        await (adminDb.from("admin_sessions" as never) as unknown as {
          update: (values: Record<string, unknown>) => {
            eq: (column: string, value: string) => Promise<unknown>;
          };
        }).update({ revoked_at: new Date().toISOString() }).eq("id", session.sessionId);
      }
      return NextResponse.json(
        { error: { code: "PROVIDER_NOT_READY", message: "Admin audit storage is temporarily unavailable." } },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const response = NextResponse.json(
      {
        authenticated: true,
        role: "super_admin",
        expiresAt: session.expiresAt,
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(ADMIN_ABSOLUTE_TTL_MS / 1000),
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process admin login.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifySameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Request origin could not be verified." } },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  const adminSession = await getVerifiedAdminSession();
  const adminDb = createAdminClient();

  if (adminSession?.sessionId) {
    try {
      const adminSessions = adminDb.from("admin_sessions" as never) as unknown as TableWithCount;
      const auditLogs = adminDb.from("admin_audit_logs" as never) as unknown as TableWithCount;

      await adminSessions
        .update({
          revoked_at: new Date().toISOString(),
        })
        .eq("id", adminSession.sessionId);

      await auditLogs.insert({
        actor_role: "super_admin",
        actor_user_id: null,
        action: "ADMIN_LOGOUT",
        target_type: "admin_session",
        target_id: adminSession.sessionId,
        reason: "Super Admin signed out and revoked session",
        result_status: "success",
      });
    } catch {
      // Continue cookie deletion
    }
  }

  const response = NextResponse.json(
    { signedOut: true },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.delete(ADMIN_COOKIE_NAME);
  response.cookies.delete("biolio_admin_session");
  return response;
}
