import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireWorkspaceAccess,
  verifySameOrigin,
  handleRouteError,
  RouteAccessError,
} from "@/lib/server/http/guard";
import { markdownToSafeHtml } from "@/lib/server/sanitize/html";
import { normalizePublicHttpsUrl, parsePublicVideoLink } from "@/lib/video-links";

const BIO_SECTION_ORDER = [
  "links",
  "featured_work",
  "gallery",
  "collaborations",
  "blog",
  "about",
  "contact",
] as const;

function normalizeSectionOrder(value: unknown, fallback: unknown): string[] {
  const allowed = new Set<string>(BIO_SECTION_ORDER);
  const requested = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
  const valid = requested.filter((item): item is string => typeof item === "string" && allowed.has(item));
  return [...new Set([...valid, ...BIO_SECTION_ORDER])];
}

function normalizeSectionVisibility(value: unknown, fallback: unknown): Record<string, boolean> {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : fallback && typeof fallback === "object" && !Array.isArray(fallback)
      ? fallback as Record<string, unknown>
      : {};
  const result: Record<string, boolean> = {};
  for (const key of BIO_SECTION_ORDER) {
    result[key] = typeof source[key] === "boolean" ? source[key] as boolean : true;
  }
  return result;
}

/**
 * AUTHENTICATED BIO WEBSITE STUDIO API (`GET / POST /api/bio/studio`)
 *
 * Access Level: Creator Session + Workspace Member (`editor | admin | owner`) + `bio` Module Unlocked
 * Enforces:
 * - Layer 2 `requireEntitlement(workspaceId, 'bio')`
 * - Exact schema alignment with `002_v6_tables_and_composite_constraints.sql`
 * - Quota checks on links, gallery items, blog posts, custom themes, and branding removal
 * - Atomic snapshot publishing into `bio_published_versions`
 */

export async function GET() {
  try {
    const ctx = await requireWorkspaceAccess({
      minRole: "editor",
      module: "bio",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    let { data: profile } = await db
      .from("bio_profiles")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    // Auto-seed bio_profiles if missing for this workspace
    if (!profile) {
      const { data: createdProfile } = await db
        .from("bio_profiles")
        .insert({
          workspace_id: ctx.workspaceId,
          handle: ctx.workspaceSlug,
          display_name: ctx.workspaceName,
          template_id: "sunday-studio",
        })
        .select("*")
        .single();
      profile = createdProfile;
    }

    const profileMediaIds = [profile?.avatar_media_id, profile?.cover_media_id]
      .filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
    const { data: profileAssets } = profileMediaIds.length
      ? await db
          .from("media_assets")
          .select("id, purpose, resource_type, secure_url")
          .eq("workspace_id", ctx.workspaceId)
          .eq("resource_type", "image")
          .in("lifecycle_state", ["finalized", "published"])
          .in("id", profileMediaIds)
      : { data: [] };
    const profileAsset = (id: unknown, purpose: "avatar" | "cover") =>
      (profileAssets || []).find((asset: { id: string; purpose: string }) => asset.id === id && asset.purpose === purpose)?.secure_url || null;
    const profileWithMedia = profile
      ? {
          ...profile,
          avatar_url: profileAsset(profile.avatar_media_id, "avatar"),
          cover_url: profileAsset(profile.cover_media_id, "cover"),
        }
      : profile;

    const [
      { data: links },
      { data: gallery },
      { data: collaborations },
      { data: blogPosts },
      { data: inquiries },
      { data: versions },
    ] = await Promise.all([
      db
        .from("bio_links")
        .select("*")
        .eq("workspace_id", ctx.workspaceId)
        .order("position", { ascending: true }),
      db
        .from("bio_gallery_items")
        .select("*")
        .eq("workspace_id", ctx.workspaceId)
        .order("position", { ascending: true }),
      db
        .from("bio_collaborations")
        .select("*")
        .eq("workspace_id", ctx.workspaceId)
        .order("position", { ascending: true }),
      db
        .from("bio_blog_posts")
        .select("*")
        .eq("workspace_id", ctx.workspaceId)
        .order("created_at", { ascending: false }),
      db
        .from("bio_contact_submissions")
        .select("*")
        .eq("workspace_id", ctx.workspaceId)
        .order("created_at", { ascending: false })
        .limit(30),
      db
        .from("bio_published_versions")
        .select("id, version_number, published_at")
        .eq("workspace_id", ctx.workspaceId)
        .order("version_number", { ascending: false })
        .limit(5),
    ]);

    return NextResponse.json(
      {
        ok: true,
        workspace: {
          id: ctx.workspaceId,
          name: ctx.workspaceName,
          slug: ctx.workspaceSlug,
          role: ctx.role,
        },
        entitlements: ctx.entitlements,
        profile: profileWithMedia,
        links: links || [],
        gallery: gallery || [],
        collaborations: collaborations || [],
        blogPosts: blogPosts || [],
        inquiries: inquiries || [],
        versions: versions || [],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifySameOrigin(request);
    const ctx = await requireWorkspaceAccess({
      minRole: "editor",
      module: "bio",
    });

    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) {
      throw new RouteAccessError(413, "REQUEST_TOO_LARGE", "Studio update is too large.");
    }
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rawBody || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
      body = parsed as Record<string, unknown>;
    } catch {
      throw new RouteAccessError(400, "INVALID_BODY", "Studio update must be valid JSON.");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    // Ensure profile exists
    let { data: profile } = await db
      .from("bio_profiles")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    if (!profile) {
      const { data: created } = await db
        .from("bio_profiles")
        .insert({
          workspace_id: ctx.workspaceId,
          handle: ctx.workspaceSlug,
          display_name: ctx.workspaceName,
          template_id: "sunday-studio",
        })
        .select("*")
        .single();
      profile = created;
    }

    const profileId = String(profile?.id || "");

    function readProfileMediaId(key: "avatarMediaId" | "coverMediaId", existing: unknown): string | null {
      if (!Object.prototype.hasOwnProperty.call(body, key)) {
        return typeof existing === "string" && /^[0-9a-f-]{36}$/i.test(existing) ? existing : null;
      }
      const value = body[key];
      if (value === null || value === "") return null;
      if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value.trim())) {
        throw new RouteAccessError(422, "INVALID_MEDIA_REFERENCE", "A profile image reference is invalid.");
      }
      return value.trim();
    }

    const avatarMediaId = readProfileMediaId("avatarMediaId", profile?.avatar_media_id);
    const coverMediaId = readProfileMediaId("coverMediaId", profile?.cover_media_id);
    const requestedProfileMediaIds = [...new Set([avatarMediaId, coverMediaId].filter((id): id is string => Boolean(id)))];
    const { data: requestedProfileAssets, error: profileMediaError } = requestedProfileMediaIds.length
      ? await db
          .from("media_assets")
          .select("id, purpose, secure_url")
          .eq("workspace_id", ctx.workspaceId)
          .eq("resource_type", "image")
          .in("lifecycle_state", ["finalized", "published"])
          .in("purpose", ["avatar", "cover"])
          .in("id", requestedProfileMediaIds)
      : { data: [], error: null };
    if (profileMediaError || (requestedProfileAssets || []).length !== requestedProfileMediaIds.length) {
      throw new RouteAccessError(422, "INVALID_MEDIA_REFERENCE", "A profile image must be a verified image from this workspace.");
    }
    const profileAssetById = new Map<string, { purpose: string; secure_url: string }>(
      (requestedProfileAssets || []).map((asset: { id: string; purpose: string; secure_url: string }) => [asset.id, asset]),
    );
    const avatarAsset = avatarMediaId ? profileAssetById.get(avatarMediaId) : null;
    const coverAsset = coverMediaId ? profileAssetById.get(coverMediaId) : null;
    if (
      (avatarMediaId && avatarAsset?.purpose !== "avatar") ||
      (coverMediaId && coverAsset?.purpose !== "cover")
    ) {
      throw new RouteAccessError(422, "INVALID_MEDIA_REFERENCE", "Choose an image uploaded for the matching profile field.");
    }

    // 1. Validate Quotas & Entitlements
    const incomingLinks = Array.isArray(body.links)
      ? (body.links as Record<string, unknown>[])
      : [];
    const incomingGallery = Array.isArray(body.gallery)
      ? (body.gallery as Record<string, unknown>[])
      : [];
    const incomingCollabs = Array.isArray(body.collaborations)
      ? (body.collaborations as Record<string, unknown>[])
      : [];
    const incomingPosts = Array.isArray(body.blogPosts)
      ? (body.blogPosts as Record<string, unknown>[])
      : [];

    const galleryMediaIds = [...new Set(incomingGallery
      .map((item) => typeof item.media_asset_id === "string" ? item.media_asset_id.trim() : "")
      .filter(Boolean))];
    if (galleryMediaIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
      throw new RouteAccessError(422, "INVALID_MEDIA_REFERENCE", "A gallery image reference is invalid.");
    }
    const galleryMediaTypes = new Map<string, string>();
    if (galleryMediaIds.length) {
      const { data: validGalleryAssets, error: mediaError } = await db
        .from("media_assets")
        .select("id, resource_type")
        .eq("workspace_id", ctx.workspaceId)
        .eq("purpose", "gallery")
        .in("lifecycle_state", ["finalized", "published"])
        .in("id", galleryMediaIds);
      if (mediaError || (validGalleryAssets || []).length !== galleryMediaIds.length) {
        throw new RouteAccessError(422, "INVALID_MEDIA_REFERENCE", "A gallery image does not belong to this workspace or is not finalized.");
      }
      for (const asset of validGalleryAssets || []) galleryMediaTypes.set(asset.id, asset.resource_type);
      if (incomingGallery.some((item) => {
        const id = typeof item.media_asset_id === "string" ? item.media_asset_id : "";
        const requestedType = item.media_type === "video_embed" ? "video" : "image";
        return id && galleryMediaTypes.get(id) !== requestedType;
      })) {
        throw new RouteAccessError(422, "INVALID_MEDIA_REFERENCE", "A gallery media type does not match its verified upload.");
      }
    }

    if (
      ctx.entitlements.bioMaxLinks !== null &&
      incomingLinks.length > ctx.entitlements.bioMaxLinks
    ) {
      throw new RouteAccessError(
        402,
        "QUOTA_EXCEEDED",
        `Your current plan allows up to ${ctx.entitlements.bioMaxLinks} links.`
      );
    }

    if (
      ctx.entitlements.bioMaxGalleryItems !== null &&
      incomingGallery.length > ctx.entitlements.bioMaxGalleryItems
    ) {
      throw new RouteAccessError(
        402,
        "QUOTA_EXCEEDED",
        `Your current plan allows up to ${ctx.entitlements.bioMaxGalleryItems} gallery items.`
      );
    }

    // 2. Update bio_profiles
    const displayName = String(
      body.displayName || profile?.display_name || ctx.workspaceName
    )
      .trim()
      .slice(0, 80);
    const tagline = body.tagline
      ? String(body.tagline).trim().slice(0, 120)
      : null;
    const shortBio = body.shortBio
      ? String(body.shortBio).trim().slice(0, 160)
      : null;
    const aboutStory = body.aboutStory
      ? String(body.aboutStory).trim().slice(0, 2500)
      : shortBio;
    const category = String(
      body.category || profile?.category || "Photography & Travel"
    ).trim();
    const location = body.location
      ? String(body.location).trim().slice(0, 80)
      : null;
    const templateId = String(
      body.templateId || profile?.template_id || "sunday-studio"
    );
    const seoTitle = body.seoTitle
      ? String(body.seoTitle).trim().slice(0, 120)
      : null;
    const seoDescription = body.seoDescription
      ? String(body.seoDescription).trim().slice(0, 300)
      : null;
    const allowIndexing =
      body.allowIndexing !== undefined
        ? Boolean(body.allowIndexing)
        : Boolean(profile?.allow_indexing ?? true);

    const existingTheme = (profile?.theme_config || {}) as Record<
      string,
      unknown
    >;
    const updatedThemeConfig = {
      ...existingTheme,
      ...(body.themeConfig || {}),
      avatar_url: avatarAsset?.secure_url || null,
      cover_url: coverAsset?.secure_url || null,
      show_biolio_branding: ctx.entitlements.canRemoveBiolioBranding
        ? Boolean(body.showBiolioBranding ?? true)
        : true,
    };

    const updatedSectionsVisibility = normalizeSectionVisibility(
      body.sectionsVisibility,
      profile?.sections_visibility,
    );
    const updatedSectionOrder = normalizeSectionOrder(
      body.sectionOrder,
      profile?.section_order,
    );

    const updatedCreatorMetrics = Array.isArray(body.creatorMetrics)
      ? body.creatorMetrics
      : profile?.creator_metrics || [];

    const { error: profErr } = await db
      .from("bio_profiles")
      .update({
        display_name: displayName,
        tagline,
        short_bio: shortBio,
        about_story: aboutStory,
        category,
        location,
        avatar_media_id: avatarMediaId,
        cover_media_id: coverMediaId,
        template_id: templateId,
        theme_config: updatedThemeConfig,
        sections_visibility: updatedSectionsVisibility,
        section_order: updatedSectionOrder,
        creator_metrics: updatedCreatorMetrics,
        seo_title: seoTitle,
        seo_description: seoDescription,
        allow_indexing: allowIndexing,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (profErr) {
      throw new RouteAccessError(422, "VALIDATION_ERROR", profErr.message);
    }

    // 3. Non-destructive sync of bio_links (preserves stable IDs, opaque_tokens, and analytics attribution)
    if (Array.isArray(body.links)) {
      const { data: existingLinks } = await db
        .from("bio_links")
        .select("id, opaque_token, position")
        .eq("bio_profile_id", profileId)
        .eq("workspace_id", ctx.workspaceId);

      const existingMap = new Map<string, { id: string; opaque_token: string }>();
      if (Array.isArray(existingLinks)) {
        for (const el of existingLinks) {
          existingMap.set(String(el.id), el);
        }
      }

      const keptIds = new Set<string>();

      for (let idx = 0; idx < incomingLinks.length; idx++) {
        const l = incomingLinks[idx];
        let rawUrl = String(l.url || "https://biolio.site").trim();
        if (!/^https?:\/\//i.test(rawUrl) && !/^mailto:/i.test(rawUrl) && !/^tel:/i.test(rawUrl)) {
          rawUrl = `https://${rawUrl}`;
        }
        rawUrl = rawUrl.replace(/^http:\/\//i, "https://");

        const linkTitle = String(l.title || l.name || "Featured Link").trim().slice(0, 120);
        const linkIcon = String(l.icon || "↗").slice(0, 8);
        const linkType = ["standard", "social", "featured", "cta"].includes(String(l.link_type))
          ? l.link_type
          : "standard";
        const platform = l.platform ? String(l.platform) : null;
        const isVisible = l.is_visible !== undefined ? Boolean(l.is_visible) : true;
        const isFeatured = Boolean(l.is_featured);

        const existingId = l.id && existingMap.has(String(l.id)) ? String(l.id) : null;

        if (existingId) {
          keptIds.add(existingId);
          await db
            .from("bio_links")
            .update({
              title: linkTitle,
              url: rawUrl,
              icon: linkIcon,
              link_type: linkType,
              platform,
              is_visible: isVisible,
              is_featured: isFeatured,
              position: idx,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingId)
            .eq("workspace_id", ctx.workspaceId);
        } else {
          const { data: inserted, error: insErr } = await db
            .from("bio_links")
            .insert({
              bio_profile_id: profileId,
              workspace_id: ctx.workspaceId,
              title: linkTitle,
              url: rawUrl,
              icon: linkIcon,
              link_type: linkType,
              platform,
              is_visible: isVisible,
              is_featured: isFeatured,
              position: idx,
            })
            .select("id")
            .single();

          if (insErr) {
            throw new RouteAccessError(422, "VALIDATION_ERROR", insErr.message);
          }
          if (inserted?.id) keptIds.add(inserted.id);
        }
      }

      // Delete only IDs that were removed
      for (const [id] of existingMap.entries()) {
        if (!keptIds.has(id)) {
          await db
            .from("bio_links")
            .delete()
            .eq("id", id)
            .eq("workspace_id", ctx.workspaceId);
        }
      }
    }

    // 4. Non-destructive sync of bio_gallery_items
    if (Array.isArray(body.gallery)) {
      const { data: existingGallery } = await db
        .from("bio_gallery_items")
        .select("id")
        .eq("bio_profile_id", profileId)
        .eq("workspace_id", ctx.workspaceId);

      const existingGalMap = new Set<string>();
      if (Array.isArray(existingGallery)) {
        for (const eg of existingGallery) existingGalMap.add(String(eg.id));
      }

      const keptGalIds = new Set<string>();

      for (let idx = 0; idx < incomingGallery.length; idx++) {
        const g = incomingGallery[idx];
        const mediaType = g.media_type === "video_embed" ? "video_embed" : "image";
        const rawUrl = String(g.external_url || g.media_url || "").trim();
        const mediaAssetId = typeof g.media_asset_id === "string" ? g.media_asset_id : null;
        let extUrl = "";
        if (mediaType === "video_embed" && !mediaAssetId) {
          const videoLink = parsePublicVideoLink(rawUrl);
          if (!videoLink) {
            throw new RouteAccessError(422, "INVALID_VIDEO_LINK", "Add a valid HTTPS video link from YouTube, Vimeo, Google Drive, X, or another video site.");
          }
          extUrl = videoLink.canonicalUrl;
        } else if (rawUrl) {
          const safeUrl = normalizePublicHttpsUrl(rawUrl);
          if (!safeUrl) {
            throw new RouteAccessError(422, "INVALID_MEDIA_URL", "Portfolio media must use a valid HTTPS URL.");
          }
          extUrl = safeUrl;
        }
        if (!extUrl) {
          throw new RouteAccessError(422, "MISSING_MEDIA_URL", "Upload an image or add a video link for every portfolio item.");
        }
        const galTitle = String(g.title || "Selected Work").trim().slice(0, 120);
        const galCaption = g.caption ? String(g.caption).slice(0, 500) : null;
        const galCat = String(g.category || "All work").trim().slice(0, 80);
        const isFeatured = Boolean(g.is_featured);
        const existingId = g.id && existingGalMap.has(String(g.id)) ? String(g.id) : null;

        if (existingId) {
          keptGalIds.add(existingId);
          await db
            .from("bio_gallery_items")
            .update({
              title: galTitle,
              caption: galCaption,
              category: galCat,
              media_type: mediaType,
              external_url: extUrl || null,
              media_asset_id: mediaAssetId,
              is_featured: isFeatured,
              position: idx,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingId)
            .eq("workspace_id", ctx.workspaceId);
        } else {
          const { data: inserted, error: galErr } = await db
            .from("bio_gallery_items")
            .insert({
              bio_profile_id: profileId,
              workspace_id: ctx.workspaceId,
              title: galTitle,
              caption: galCaption,
              category: galCat,
              media_type: mediaType,
              external_url: extUrl || null,
              media_asset_id: mediaAssetId,
              is_featured: isFeatured,
              status: "published",
              position: idx,
            })
            .select("id")
            .single();

          if (galErr) {
            throw new RouteAccessError(422, "VALIDATION_ERROR", galErr.message);
          }
          if (inserted?.id) keptGalIds.add(inserted.id);
        }
      }

      for (const id of existingGalMap) {
        if (!keptGalIds.has(id)) {
          await db
            .from("bio_gallery_items")
            .delete()
            .eq("id", id)
            .eq("workspace_id", ctx.workspaceId);
        }
      }
    }

    // 5. Non-destructive sync of bio_collaborations
    if (Array.isArray(body.collaborations)) {
      const { data: existingCollabs } = await db
        .from("bio_collaborations")
        .select("id")
        .eq("bio_profile_id", profileId)
        .eq("workspace_id", ctx.workspaceId);

      const existingCollabMap = new Set<string>();
      if (Array.isArray(existingCollabs)) {
        for (const ec of existingCollabs) existingCollabMap.add(String(ec.id));
      }

      const keptCollabIds = new Set<string>();

      for (let idx = 0; idx < incomingCollabs.length; idx++) {
        const c = incomingCollabs[idx];
        let studyUrl = String(c.case_study_url || "").trim();
        if (studyUrl && !studyUrl.startsWith("https://")) {
          studyUrl = `https://${studyUrl.replace(/^http:\/\//i, "")}`;
        }
        const brandName = String(c.brand_name || "Brand Partner").trim().slice(0, 100);
        const existingId = c.id && existingCollabMap.has(String(c.id)) ? String(c.id) : null;

        if (existingId) {
          keptCollabIds.add(existingId);
          await db
            .from("bio_collaborations")
            .update({
              brand_name: brandName,
              brand_logo_text: brandName.charAt(0).toUpperCase() || "B",
              category: String(c.category || "Campaign").slice(0, 60),
              collab_year: String(c.collab_year || "2026").slice(0, 10),
              campaign_title: String(c.campaign_title || c.role_title || "Creative Partner").slice(0, 120),
              campaign_summary: c.campaign_summary || c.summary || null,
              case_study_url: studyUrl || null,
              position: idx,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingId)
            .eq("workspace_id", ctx.workspaceId);
        } else {
          const { data: inserted, error: colErr } = await db
            .from("bio_collaborations")
            .insert({
              bio_profile_id: profileId,
              workspace_id: ctx.workspaceId,
              brand_name: brandName,
              brand_logo_text: brandName.charAt(0).toUpperCase() || "B",
              category: String(c.category || "Campaign").slice(0, 60),
              collab_year: String(c.collab_year || "2026").slice(0, 10),
              campaign_title: String(c.campaign_title || c.role_title || "Creative Partner").slice(0, 120),
              campaign_summary: c.campaign_summary || c.summary || null,
              case_study_url: studyUrl || null,
              status: "published",
              position: idx,
            })
            .select("id")
            .single();

          if (colErr) {
            throw new RouteAccessError(422, "VALIDATION_ERROR", colErr.message);
          }
          if (inserted?.id) keptCollabIds.add(inserted.id);
        }
      }

      for (const id of existingCollabMap) {
        if (!keptCollabIds.has(id)) {
          await db
            .from("bio_collaborations")
            .delete()
            .eq("id", id)
            .eq("workspace_id", ctx.workspaceId);
        }
      }
    }

    // 6. Non-destructive sync of bio_blog_posts with Tiptap canonical JSON support
    if (ctx.entitlements.canUseBlogPublishing && Array.isArray(body.blogPosts)) {
      const { data: existingPosts } = await db
        .from("bio_blog_posts")
        .select("id, status, published_at")
        .eq("bio_profile_id", profileId)
        .eq("workspace_id", ctx.workspaceId);

      const existingPostMap = new Map<string, { id: string; status: string; published_at: string | null }>();
      if (Array.isArray(existingPosts)) {
        for (const ep of existingPosts) existingPostMap.set(String(ep.id), ep);
      }

      const keptPostIds = new Set<string>();

      for (let idx = 0; idx < incomingPosts.length; idx++) {
        const b = incomingPosts[idx];
        const rawSlug = String(b.slug || b.title || `story-${idx + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80);
        const safeSlug = rawSlug.length >= 2 ? rawSlug : `story-${idx + 1}-${Date.now()}`;
        const md = String(b.content_markdown || b.body_markdown || "");
        const contentText = String(b.content_text || md.replace(/<[^>]+>/g, " ")).trim();
        const contentJson =
          typeof b.content_json === "object" && b.content_json !== null
            ? b.content_json
            : {};
        const wordCount = contentText.split(/\s+/).filter(Boolean).length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));
        const status = b.status === "draft" ? "draft" : "published";

        const existingRecord = b.id ? existingPostMap.get(String(b.id)) : null;

        let publishedAt = existingRecord?.published_at || null;
        if (status === "published" && !publishedAt) {
          publishedAt = new Date().toISOString();
        }

        const postData = {
          bio_profile_id: profileId,
          workspace_id: ctx.workspaceId,
          title: String(b.title || "Untitled Story").trim().slice(0, 180),
          slug: safeSlug,
          category: String(b.category || "CREATIVE NOTES").toUpperCase(),
          excerpt: b.excerpt ? String(b.excerpt).slice(0, 400) : md.slice(0, 180),
          content_markdown: md,
          content_json: contentJson,
          content_text: contentText,
          content_schema_version: 1,
          sanitized_html: markdownToSafeHtml(md),
          reading_time_minutes: readingTime,
          status,
          published_at: publishedAt,
          seo_title: b.seo_title ? String(b.seo_title).slice(0, 120) : null,
          seo_description: b.seo_description ? String(b.seo_description).slice(0, 300) : null,
          updated_at: new Date().toISOString(),
        };

        if (existingRecord) {
          keptPostIds.add(existingRecord.id);
          await db
            .from("bio_blog_posts")
            .update(postData)
            .eq("id", existingRecord.id)
            .eq("workspace_id", ctx.workspaceId);
        } else {
          const { data: inserted, error: postErr } = await db
            .from("bio_blog_posts")
            .insert(postData)
            .select("id")
            .single();

          if (postErr) {
            throw new RouteAccessError(422, "VALIDATION_ERROR", postErr.message);
          }
          if (inserted?.id) keptPostIds.add(inserted.id);
        }
      }

      for (const [id] of existingPostMap.entries()) {
        if (!keptPostIds.has(id)) {
          await db
            .from("bio_blog_posts")
            .delete()
            .eq("id", id)
            .eq("workspace_id", ctx.workspaceId);
        }
      }
    }

    // 7. Publish Immutable Snapshot if requested
    let publishResult: Record<string, unknown> | null = null;
    if (body.publish !== false) {
      // Refresh current draft_version from DB to avoid stale version conflicts
      const { data: freshProfile } = await db
        .from("bio_profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      const { data: rpcPub } = await db.rpc("publish_bio_snapshot", {
        p_workspace_id: ctx.workspaceId,
        p_expected_draft_version: freshProfile?.draft_version ?? 1,
      });

      if (rpcPub?.ok) {
        publishResult = rpcPub as unknown as Record<string, unknown>;
      } else if (freshProfile) {
        // Direct server-side snapshot assembly if called via service_role
        const [
          { data: savedLinks },
          { data: savedGallery },
          { data: savedCollabs },
          { data: savedPosts },
          { data: latestVer },
        ] = await Promise.all([
          db
            .from("bio_links")
            .select("*")
            .eq("bio_profile_id", profileId)
            .order("position", { ascending: true }),
          db
            .from("bio_gallery_items")
            .select("*")
            .eq("bio_profile_id", profileId)
            .order("position", { ascending: true }),
          db
            .from("bio_collaborations")
            .select("*")
            .eq("bio_profile_id", profileId)
            .order("position", { ascending: true }),
          db
            .from("bio_blog_posts")
            .select("*")
            .eq("bio_profile_id", profileId)
            .order("created_at", { ascending: false }),
          db
            .from("bio_published_versions")
            .select("version_number")
            .eq("bio_profile_id", profileId)
            .order("version_number", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const nextVer = Number(latestVer?.version_number || 0) + 1;
        const snapshotPayload = {
          workspace_id: ctx.workspaceId,
          handle: freshProfile.handle,
          display_name: freshProfile.display_name,
          tagline: freshProfile.tagline,
          bio_text: freshProfile.short_bio || freshProfile.about_story,
          location: freshProfile.location,
          template_id: freshProfile.template_id,
          profile: freshProfile,
          links: savedLinks || [],
          gallery: savedGallery || [],
          collaborations: savedCollabs || [],
          blog_posts: savedPosts || [],
        };

        const { data: verRow } = await db
          .from("bio_published_versions")
          .insert({
            bio_profile_id: profileId,
            workspace_id: ctx.workspaceId,
            version_number: nextVer,
            handle_at_publish: freshProfile.handle,
            snapshot_payload: snapshotPayload,
            published_by: ctx.userId,
          })
          .select("id, version_number")
          .single();

        if (verRow?.id) {
          await db
            .from("bio_profiles")
            .update({
              is_published: true,
              current_published_version_id: verRow.id,
              draft_version: Number(freshProfile.draft_version || 1) + 1,
              published_at: new Date().toISOString(),
            })
            .eq("id", profileId);
        }

        publishResult = {
          ok: true,
          version_number: nextVer,
          draft_version: Number(freshProfile.draft_version || 1) + 1,
        };
      }
    }

    return NextResponse.json(
      {
        ok: true,
        published: publishResult,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
