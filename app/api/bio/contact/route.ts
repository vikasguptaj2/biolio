import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, handle, senderName, senderEmail, budgetRange, message } = body;

    if (!workspaceId || !senderName || !senderEmail || !message) {
      return NextResponse.json(
        { error: "Missing required contact inquiry fields" },
        { status: 400 }
      );
    }

    const adminDb = createAdminClient();

    // Check feature flag for public contact inquiries if flags table exists
    try {
      const { data: flag } = await adminDb
        .from("feature_flags")
        .select("is_enabled")
        .eq("key", "feature.public_contact_inquiries")
        .maybeSingle();

      if (flag && !flag.is_enabled) {
        return NextResponse.json(
          { error: "Public contact inquiries are temporarily paused by platform operations." },
          { status: 503 }
        );
      }
    } catch {
      // Gracefully continue if flag not initialized
    }

    // Lookup bio_profile_id for workspace
    const { data: profile } = await adminDb
      .from("bio_profiles")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json(
        { error: "Bio profile not found for workspace" },
        { status: 404 }
      );
    }

    const { error: insertError } = await adminDb
      .from("bio_contact_submissions")
      .insert({
        bio_profile_id: profile.id,
        workspace_id: workspaceId,
        sender_name: senderName,
        sender_email: senderEmail,
        budget_range: budgetRange || null,
        message,
        status: "new",
      });

    if (insertError) {
      console.error("[Bio Contact Error]", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to deliver contact inquiry" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deliveredTo: handle,
    });
  } catch (err: unknown) {
    console.error("[Bio Contact Server Error]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
