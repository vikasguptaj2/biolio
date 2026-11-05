import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/server/config/env";
import {
  requireEntitlement,
  EntitlementError,
} from "@/lib/server/entitlements/guard";

/**
 * HARDENED CLOUDINARY UPLOAD SIGNER (`POST /api/media/cloudinary/sign`)
 * Closes Audit Finding: B-06
 *
 * Security Rules:
 * 1. Derives workspace from the authenticated user's active membership.
 * 2. Strictly validates `purpose` against a fixed allow-list (`avatar | cover | gallery | blog | collaboration`).
 * 3. Enforces Layer 2 Module Lock (`requireEntitlement(workspaceId, 'bio')`).
 * 4. Signs `allowed_formats` (`jpg,jpeg,png,webp,avif`) and `folder` so client uploads are constrained.
 */

const ALLOWED_PURPOSES = new Set([
  "avatar",
  "cover",
  "gallery",
  "blog",
  "collaboration",
]);

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
    const purpose = String(body.purpose || "gallery").trim().toLowerCase();

    if (!ALLOWED_PURPOSES.has(purpose)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "purpose must be one of: avatar, cover, gallery, blog, collaboration.",
          },
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Derive active workspace from session membership
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
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

    // Layer 2 Module Lock Check: Bio must not be locked
    await requireEntitlement(workspaceId, "bio");

    const env = getServerEnv();
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        {
          error: {
            code: "PROVIDER_NOT_READY",
            message: "Cloudinary credentials are not configured.",
          },
        },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const allowedFormats = "jpg,jpeg,png,webp,avif";
    const folder = `biolio/workspaces/${workspaceId}/${purpose}`;

    // Alphabetical parameter signing: allowed_formats, folder, timestamp
    const paramsToSign = `allowed_formats=${allowedFormats}&folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign)
      .digest("hex");

    return NextResponse.json(
      {
        ok: true,
        timestamp,
        signature,
        apiKey: env.CLOUDINARY_API_KEY,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        folder,
        allowedFormats,
        maxBytes: 10 * 1024 * 1024,
      },
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
          message: "Failed to generate signed upload parameters.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
