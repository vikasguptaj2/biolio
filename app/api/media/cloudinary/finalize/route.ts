import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/server/config/env";
import {
  requireEntitlement,
  EntitlementError,
} from "@/lib/server/entitlements/guard";

/**
 * HARDENED CLOUDINARY ASSET FINALIZATION (`POST /api/media/cloudinary/finalize`)
 * Closes Audit Finding: B-06
 *
 * Security Rules:
 * 1. Derives workspaceId from the authenticated session (never trusts client workspaceId).
 * 2. Enforces Layer 2 Bio Module Lock (`requireEntitlement(workspaceId, 'bio')`).
 * 3. Validates `purpose` enum, `format` allow-list (`jpg | jpeg | png | webp | avif`), and `bytes` (1..10 MB).
 * 4. Verifies `cloudinaryPublicId` starts with `biolio/workspaces/${workspaceId}/${purpose}/`
 *    so a user can never point at another tenant's asset.
 * 5. Verifies `secureUrl` is strictly hosted on `https://res.cloudinary.com/${cloudName}/image/upload/`
 *    so external tracking pixels or arbitrary URLs can never be injected.
 */

const ALLOWED_PURPOSES = new Set([
  "avatar",
  "cover",
  "gallery",
  "blog",
  "collaboration",
]);
const ALLOWED_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const MAX_ASSET_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const cloudinaryPublicId = String(body.cloudinaryPublicId || "").trim();
    const secureUrl = String(body.secureUrl || "").trim();
    const format = String(body.format || "webp")
      .trim()
      .toLowerCase();
    const purpose = String(body.purpose || "gallery")
      .trim()
      .toLowerCase();
    const bytes = Number(body.bytes || 0);
    const width = body.width ? Number(body.width) : null;
    const height = body.height ? Number(body.height) : null;
    const bioProfileId = body.bioProfileId ? String(body.bioProfileId) : null;

    if (!ALLOWED_PURPOSES.has(purpose)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid purpose." } },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!ALLOWED_FORMATS.has(format)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Unsupported image format.",
          },
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_ASSET_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Asset size must be between 1 byte and 10 MB.",
          },
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Derive workspaceId from session
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    const workspaceId = memberships?.[0]?.workspace_id;
    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active workspace." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Layer 2 Module Lock Check
    await requireEntitlement(workspaceId, "bio");

    // Verify tenant-isolated public_id prefix and official Cloudinary CDN origin
    const expectedPrefix = `biolio/workspaces/${workspaceId}/${purpose}/`;
    if (
      !cloudinaryPublicId.startsWith(expectedPrefix) ||
      cloudinaryPublicId.includes("..")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message:
              "cloudinaryPublicId does not belong to this workspace folder.",
          },
        },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const env = getServerEnv();
    const expectedHostPrefix = env.CLOUDINARY_CLOUD_NAME
      ? `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`
      : "https://res.cloudinary.com/";

    if (
      !secureUrl.startsWith(expectedHostPrefix) ||
      !secureUrl.includes(cloudinaryPublicId)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "secureUrl must be a verified Cloudinary HTTPS delivery URL matching cloudinaryPublicId.",
          },
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { data: mediaAsset, error: insertError } = await (
      supabase.from("media_assets" as never) as unknown as {
        insert: (row: Record<string, unknown>) => {
          select: () => {
            single: () => Promise<{ data: { id: string } | null; error: unknown }>;
          };
        };
      }
    )
      .insert({
        workspace_id: workspaceId,
        cloudinary_public_id: cloudinaryPublicId,
        secure_url: secureUrl,
        format,
        bytes,
        width,
        height,
        purpose,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError || !mediaAsset) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Could not register media asset.",
          },
        },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (bioProfileId) {
      const bioProfiles = supabase.from("bio_profiles" as never) as unknown as {
        update: (vals: Record<string, unknown>) => {
          eq: (c1: string, v1: string) => {
            eq: (c2: string, v2: string) => Promise<unknown>;
          };
        };
      };

      if (purpose === "avatar") {
        await bioProfiles
          .update({ avatar_media_id: mediaAsset.id })
          .eq("id", bioProfileId)
          .eq("workspace_id", workspaceId);
      } else if (purpose === "cover") {
        await bioProfiles
          .update({ cover_media_id: mediaAsset.id })
          .eq("id", bioProfileId)
          .eq("workspace_id", workspaceId);
      }
    }

    return NextResponse.json(
      { ok: true, mediaAsset },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    if (err instanceof EntitlementError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to finalize media asset.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
