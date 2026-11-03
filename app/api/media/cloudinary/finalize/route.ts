import { NextResponse, type NextRequest } from "next/server";
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
    const {
      workspaceId,
      cloudinaryPublicId,
      secureUrl,
      format,
      bytes,
      width,
      height,
      purpose,
      bioProfileId,
    } = body;

    if (!workspaceId || !cloudinaryPublicId || !secureUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing required asset details" },
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
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Insert into media_assets
    const { data: mediaAsset, error: insertError } = await supabase
      .from("media_assets")
      .insert({
        workspace_id: workspaceId,
        cloudinary_public_id: cloudinaryPublicId,
        secure_url: secureUrl,
        format: format || "webp",
        bytes: bytes || 0,
        width: width || null,
        height: height || null,
        purpose: purpose || "general",
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // If purpose is avatar or cover, link to bio_profiles
    if (bioProfileId) {
      if (purpose === "avatar") {
        await supabase
          .from("bio_profiles")
          .update({ avatar_media_id: mediaAsset.id })
          .eq("id", bioProfileId)
          .eq("workspace_id", workspaceId);
      } else if (purpose === "cover") {
        await supabase
          .from("bio_profiles")
          .update({ cover_media_id: mediaAsset.id })
          .eq("id", bioProfileId)
          .eq("workspace_id", workspaceId);
      } else if (purpose === "gallery") {
        await supabase.from("bio_gallery_items").insert({
          workspace_id: workspaceId,
          bio_profile_id: bioProfileId,
          media_asset_id: mediaAsset.id,
          title: "Gallery Item",
          media_type: "image",
          category: "General",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      mediaAsset,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to finalize media asset";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

