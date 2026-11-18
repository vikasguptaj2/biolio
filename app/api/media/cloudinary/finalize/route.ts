import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/server/config/env";
import {
  handleRouteError,
  requireWorkspaceAccess,
  verifySameOrigin,
} from "@/lib/server/http/guard";

const PURPOSES = new Set(["avatar", "cover", "gallery", "blog_cover", "collab_logo"]);
const IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const MAX_BYTES = 10 * 1024 * 1024;

interface CloudinaryResource {
  asset_id?: string;
  asset_folder?: string;
  public_id?: string;
  resource_type?: string;
  type?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  secure_url?: string;
}

export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const access = await requireWorkspaceAccess({ minRole: "editor", module: "bio" });
    const raw = await request.text();
    if (raw.length > 8_192) {
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

    const env = getServerEnv();
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: { code: "PROVIDER_NOT_READY", message: "Cloudinary is not configured on this server." } }, { status: 503 });
    }

    const rawPurpose = typeof body.purpose === "string" ? body.purpose.trim().toLowerCase() : "gallery";
    const purpose = rawPurpose === "blog" ? "blog_cover" : rawPurpose === "collaboration" ? "collab_logo" : rawPurpose;
    const resourceType = body.resourceType === "video" ? "video" : "image";
    const publicId = typeof body.cloudinaryPublicId === "string" ? body.cloudinaryPublicId.trim() : "";
    const bioProfileId = typeof body.bioProfileId === "string" ? body.bioProfileId.trim() : "";
    const assetSuffix = publicId.split("/").filter(Boolean).at(-1) || "";

    if (!PURPOSES.has(purpose) || resourceType !== "image") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid media purpose or resource type." } }, { status: 422 });
    }
    if (!/^asset_[a-f0-9]{32}$/i.test(assetSuffix) || publicId.includes("..")) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid Cloudinary asset reference." } }, { status: 422 });
    }
    if (bioProfileId && !/^[0-9a-f-]{36}$/i.test(bioProfileId)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid profile reference." } }, { status: 422 });
    }
    if (bioProfileId && !["avatar", "cover"].includes(purpose)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Only profile and cover uploads can be attached directly to a profile." } }, { status: 422 });
    }

    // media_assets intentionally has no client INSERT policy. This service-role write
    // happens only after the signed-in user's workspace role and asset are verified.
    const supabase = createAdminClient();
    if (bioProfileId) {
      const { data: profile, error: profileError } = await supabase
        .from("bio_profiles")
        .select("id")
        .eq("id", bioProfileId)
        .eq("workspace_id", access.workspaceId)
        .maybeSingle();
      if (profileError || !profile) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "Bio profile not found in this workspace." } }, { status: 404 });
      }
    }

    const expectedFolder = `biolio/workspaces/${access.workspaceId}/${purpose}`;
    const encodedPublicId = publicId.split("/").map((part) => encodeURIComponent(part)).join("/");
    const metadataUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/resources/${resourceType}/upload/${encodedPublicId}`;
    let resource: CloudinaryResource;
    try {
      const response = await fetch(metadataUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString("base64")}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (response.status === 404) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "Cloudinary upload was not found." } }, { status: 404 });
      }
      if (!response.ok) throw new Error("Cloudinary verification failed.");
      resource = await response.json() as CloudinaryResource;
    } catch {
      return NextResponse.json({ error: { code: "PROVIDER_ERROR", message: "Could not verify the Cloudinary upload." } }, { status: 502 });
    }

    const actualFolder = typeof resource.asset_folder === "string" ? resource.asset_folder : "";
    const inExpectedFolder = actualFolder === expectedFolder || actualFolder.startsWith(`${expectedFolder}/`) ||
      (typeof resource.public_id === "string" && resource.public_id.startsWith(`${expectedFolder}/`));
    const format = typeof resource.format === "string" ? resource.format.toLowerCase() : "";
    const allowedFormats = IMAGE_FORMATS;
    const bytes = Number(resource.bytes);
    const secureUrl = typeof resource.secure_url === "string" ? resource.secure_url : "";
    let parsedUrl: URL | null = null;
    try { parsedUrl = new URL(secureUrl); } catch { parsedUrl = null; }

    if (
      resource.resource_type !== resourceType || resource.type !== "upload" ||
      !inExpectedFolder || resource.public_id !== publicId && !resource.public_id?.endsWith(`/${assetSuffix}`) ||
      !allowedFormats.has(format) || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_BYTES ||
      !resource.asset_id || !parsedUrl || parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname !== "res.cloudinary.com" ||
      !parsedUrl.pathname.startsWith(`/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/`)
    ) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Cloudinary asset metadata does not match this workspace upload." } }, { status: 422 });
    }

    const width = Number.isSafeInteger(resource.width) && Number(resource.width) > 0 ? Number(resource.width) : null;
    const height = Number.isSafeInteger(resource.height) && Number(resource.height) > 0 ? Number(resource.height) : null;
    const { data: inserted, error: insertError } = await supabase
      .from("media_assets")
      .insert({
        workspace_id: access.workspaceId,
        uploaded_by: access.userId,
        purpose,
        cloudinary_asset_id: resource.asset_id,
        cloudinary_public_id: resource.public_id || publicId,
        resource_type: resourceType,
        delivery_type: "upload",
        format,
        bytes,
        width,
        height,
        secure_url: secureUrl,
        lifecycle_state: "finalized",
      })
      .select("id, secure_url, purpose, resource_type, format, bytes, width, height")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: { code: "CONFLICT", message: "This media asset is already registered or could not be saved." } }, { status: 409 });
    }

    if (bioProfileId) {
      const column = purpose === "avatar" ? "avatar_media_id" : "cover_media_id";
      const profileUpdate = supabase.from("bio_profiles" as never) as unknown as {
        update: (values: Record<string, unknown>) => {
          eq: (field: string, value: string) => {
            eq: (field2: string, value2: string) => {
              select: (columns: string) => {
                maybeSingle: () => Promise<{ data: { id: string } | null; error: unknown }>;
              };
            };
          };
        };
      };
      const { data: updatedProfile, error: updateError } = await profileUpdate
        .update({ [column]: inserted.id })
        .eq("id", bioProfileId)
        .eq("workspace_id", access.workspaceId)
        .select("id")
        .maybeSingle();
      if (updateError || !updatedProfile) {
        return NextResponse.json({ error: { code: "UPDATE_FAILED", message: "The image was saved, but could not be attached to the profile." } }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, mediaAsset: inserted }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error);
  }
}
