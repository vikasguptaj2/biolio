import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminCredentials,
  createAdminSessionToken,
  getVerifiedAdminSession,
} from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const isValid = verifyAdminCredentials(email, password);
    if (!isValid) {
      return NextResponse.json(
        {
          error:
            "Invalid Super Admin credentials. Only the configured single admin email and fixed password are permitted.",
        },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken(email);
    const cookieStore = await cookies();

    // Set HTTP-only secure cookie for 12 hours
    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });

    // Record immutable audit log
    try {
      const supabase = createAdminClient();
      await supabase.from("admin_audit_logs").insert({
        action: "SUPER_ADMIN_LOGIN",
        actor_role: "super_admin",
        actor_user_id: null,
        reason: "Successful fixed-credential authentication",
        result_status: "SUCCESS",
        target_type: "auth_session",
        target_id: email.trim().toLowerCase(),
        after_summary: {
          email: email.trim().toLowerCase(),
          ip: request.headers.get("x-forwarded-for") || "local",
        },
      });
    } catch (auditErr) {
      console.warn("Failed to write admin login audit log:", auditErr);
    }

    return NextResponse.json({ ok: true, email: email.trim().toLowerCase() });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getVerifiedAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, session });
}

