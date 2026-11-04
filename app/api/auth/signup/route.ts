import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, handle, template } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminDb = createAdminClient();

    // 1. Create or auto-confirm user in Supabase Auth
    const { data: userData, error: createError } =
      await adminDb.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName?.trim() || cleanEmail.split("@")[0],
          preferred_handle: handle?.trim().toLowerCase() || "",
          preferred_template: template || "atelier-editorial",
        },
      });

    if (createError) {
      // If user already exists in auth, return clean descriptive error
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    const userId = userData.user.id;

    // 2. Guarantee public.user_profiles row exists immediately
    const { error: profileError } = await adminDb.from("user_profiles").upsert(
      {
        id: userId,
        email: cleanEmail,
        full_name: fullName?.trim() || cleanEmail.split("@")[0],
        account_status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.warn("Defensive user_profiles upsert note:", profileError.message);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
      },
    });
  } catch (err: unknown) {
    console.error("[Sign-up API Error]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to process sign-up.",
      },
      { status: 500 }
    );
  }
}
