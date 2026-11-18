import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/server/config/env";
import {
  handleRouteError,
  requireWorkspaceAccess,
  verifySameOrigin,
} from "@/lib/server/http/guard";

const ALLOWED_PURPOSES = new Set(["avatar", "cover", "gallery", "blog_cover", "collab_logo"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const access = await requireWorkspaceAccess({ minRole: "editor", module: "bio" });
    const raw = await request.text();
    if (raw.length > 4_096) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Request is too large." } }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request body." } }, { status: 400 });
    }

    const purposeInput = typeof body.purpose === "string" ? body.purpose.trim().toLowerCase() : "gallery";
    const purpose = purposeInput === "blog" ? "blog_cover" : purposeInput === "collaboration" ? "collab_logo" : purposeInput;
    const resourceType = body.resourceType === "video" ? "video" : "image";
    if (!ALLOWED_PURPOSES.has(purpose)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Unsupported media purpose." } }, { status: 422 });
    }
    if (resourceType !== "image") {
      return NextResponse.json({ error: { code: "VIDEO_LINK_REQUIRED", message: "Upload images to your portfolio. Add a public video link for video work." } }, { status: 422 });
    }

    const env = getServerEnv();
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: { code: "PROVIDER_NOT_READY", message: "Cloudinary is not configured on this server." } }, { status: 503 });
    }

    const allowedFormats = "jpg,jpeg,png,webp,avif";
    const folder = `biolio/workspaces/${access.workspaceId}/${purpose}`;
    const publicId = `asset_${crypto.randomUUID().replace(/-/g, "")}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signedParams = [
      `allowed_formats=${allowedFormats}`,
      `folder=${folder}`,
      "overwrite=false",
      `public_id=${publicId}`,
      `timestamp=${timestamp}`,
    ].join("&");
    const signature = crypto.createHash("sha1")
      .update(`${signedParams}${env.CLOUDINARY_API_SECRET}`)
      .digest("hex");

    return NextResponse.json({
      ok: true,
      timestamp,
      signature,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      folder,
      publicId,
      overwrite: false,
      resourceType,
      allowedFormats,
      maxBytes: MAX_BYTES,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error);
  }
}
