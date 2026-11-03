import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { workspaceId, purpose = "general" } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN: Not a member of this workspace" },
        { status: 403 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      // Fallback or graceful response if Cloudinary is not yet configured by user
      return NextResponse.json({
        ok: false,
        error: "CLOUDINARY_NOT_CONFIGURED",
        message: "Cloudinary credentials missing in .env.local",
      }, { status: 503 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = `biolio/workspaces/${workspaceId}/${purpose}`;

    // Cloudinary signature calculation:
    // Sort parameters alphabetically: folder=...&timestamp=... + apiSecret
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    return NextResponse.json({
      ok: true,
      timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate signed upload";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

