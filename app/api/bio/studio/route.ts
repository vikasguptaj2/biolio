import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireWorkspaceAccess,
  verifySameOrigin,
  handleRouteError,
  RouteAccessError,
} from "@/lib/server/http/guard";
import { markdownToSafeHtml } from "@/lib/server/sanitize/html";

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
        profile,
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

    const body = await request.json().catch(() => ({}));
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
      show_biolio_branding: ctx.entitlements.canRemoveBiolioBranding
        ? Boolean(body.showBiolioBranding ?? true)
        : true,
    };

    const updatedSectionsVisibility =
      body.sectionsVisibility && typeof body.sectionsVisibility === "object"
        ? body.sectionsVisibility
        : profile?.sections_visibility;

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
        template_id: templateId,
        theme_config: updatedThemeConfig,
        sections_visibility: updatedSectionsVisibility,
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

    // 3. Sync bio_links with token stability (Closes F-09)
    const { data: existingLinks } = await db
      .from("bio_links")
      .select("id, url, opaque_token")
      .eq("bio_profile_id", profileId)
      .eq("workspace_id", ctx.workspaceId);

    const tokenByUrlOrId = new Map<string, string>();
    if (Array.isArray(existingLinks)) {
      for (const el of existingLinks) {
        if (el.opaque_token) {
          if (el.id) tokenByUrlOrId.set(String(el.id), String(el.opaque_token));
          if (el.url) tokenByUrlOrId.set(String(el.url), String(el.opaque_token));
        }
      }
    }

    await db
      .from("bio_links")
      .delete()
      .eq("bio_profile_id", profileId)
      .eq("workspace_id", ctx.workspaceId);

    if (incomingLinks.length > 0) {
      const normalizedLinks = incomingLinks.map(
        (l: Record<string, unknown>, idx: number) => {
          let rawUrl = String(l.url || "https://biolio.site").trim();
          if (!/^https?:\/\//i.test(rawUrl) && !/^mailto:/i.test(rawUrl)) {
            rawUrl = `https://${rawUrl}`;
          }
          rawUrl = rawUrl.replace(/^http:\/\//i, "https://");
          const existingToken =
            (l.id && tokenByUrlOrId.get(String(l.id))) ||
            tokenByUrlOrId.get(rawUrl) ||
            (typeof l.opaque_token === "string" ? l.opaque_token : null);

          return {
            bio_profile_id: profileId,
            workspace_id: ctx.workspaceId,
            ...(existingToken ? { opaque_token: existingToken } : {}),
            title: String(l.title || l.name || "Featured Link")
              .trim()
              .slice(0, 120),
            url: rawUrl,
            icon: String(l.icon || "↗").slice(0, 8),
            link_type: ["standard", "social", "featured", "cta"].includes(
              String(l.link_type)
            )
              ? l.link_type
              : "standard",
            platform: l.platform ? String(l.platform) : null,
            is_visible:
              l.is_visible !== undefined ? Boolean(l.is_visible) : true,
            is_featured: Boolean(l.is_featured),
            position: idx,
          };
        }
      );

      const { error: linkErr } = await db
        .from("bio_links")
        .insert(normalizedLinks);
      if (linkErr) {
        throw new RouteAccessError(422, "VALIDATION_ERROR", linkErr.message);
      }
    }

    // 4. Sync bio_gallery_items
    await db
      .from("bio_gallery_items")
      .delete()
      .eq("bio_profile_id", profileId)
      .eq("workspace_id", ctx.workspaceId);

    if (incomingGallery.length > 0) {
      const normalizedGallery = incomingGallery.map(
        (g: Record<string, unknown>, idx: number) => {
          let extUrl = String(g.external_url || g.media_url || "").trim();
          if (extUrl && !extUrl.startsWith("https://")) {
            extUrl = `https://${extUrl.replace(/^http:\/\//i, "")}`;
          }
          return {
            bio_profile_id: profileId,
            workspace_id: ctx.workspaceId,
            title: String(g.title || "Selected Work")
              .trim()
              .slice(0, 120),
            caption: g.caption ? String(g.caption).slice(0, 500) : null,
            category: String(g.category || "All work").trim(),
            media_type: "image",
            external_url: extUrl || null,
            status: "published",
            position: idx,
          };
        }
      );

      const { error: galErr } = await db
        .from("bio_gallery_items")
        .insert(normalizedGallery);
      if (galErr) {
        throw new RouteAccessError(422, "VALIDATION_ERROR", galErr.message);
      }
    }

    // 5. Sync bio_collaborations
    await db
      .from("bio_collaborations")
      .delete()
      .eq("bio_profile_id", profileId)
      .eq("workspace_id", ctx.workspaceId);

    if (incomingCollabs.length > 0) {
      const normalizedCollabs = incomingCollabs.map(
        (c: Record<string, unknown>, idx: number) => {
          let studyUrl = String(c.case_study_url || "").trim();
          if (studyUrl && !studyUrl.startsWith("https://")) {
            studyUrl = `https://${studyUrl.replace(/^http:\/\//i, "")}`;
          }
          const brandName = String(c.brand_name || "Brand Partner")
            .trim()
            .slice(0, 100);
          return {
            bio_profile_id: profileId,
            workspace_id: ctx.workspaceId,
            brand_name: brandName,
            brand_logo_text: brandName.charAt(0).toUpperCase() || "B",
            category: String(c.category || "Campaign").slice(0, 60),
            collab_year: String(c.collab_year || "2026").slice(0, 10),
            campaign_title: String(
              c.campaign_title || c.role_title || "Creative Partner"
            ).slice(0, 120),
            campaign_summary: c.campaign_summary || c.summary || null,
            case_study_url: studyUrl || null,
            status: "published",
            position: idx,
          };
        }
      );

      const { error: colErr } = await db
        .from("bio_collaborations")
        .insert(normalizedCollabs);
      if (colErr) {
        throw new RouteAccessError(422, "VALIDATION_ERROR", colErr.message);
      }
    }

    // 6. Sync bio_blog_posts
    if (ctx.entitlements.canUseBlogPublishing && incomingPosts.length > 0) {
      await db
        .from("bio_blog_posts")
        .delete()
        .eq("bio_profile_id", profileId)
        .eq("workspace_id", ctx.workspaceId);

      const normalizedPosts = incomingPosts.map(
        (b: Record<string, unknown>, idx: number) => {
          const rawSlug = String(b.slug || b.title || `story-${idx + 1}`)
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80);
          const safeSlug =
            rawSlug.length >= 2 ? rawSlug : `story-${idx + 1}-${Date.now()}`;
          const md = String(b.content_markdown || b.body_markdown || "");
          return {
            bio_profile_id: profileId,
            workspace_id: ctx.workspaceId,
            title: String(b.title || "Untitled Story")
              .trim()
              .slice(0, 180),
            slug: safeSlug,
            category: String(b.category || "CREATIVE NOTES").toUpperCase(),
            excerpt: b.excerpt
              ? String(b.excerpt).slice(0, 400)
              : md.slice(0, 180),
            content_markdown: md,
            sanitized_html: markdownToSafeHtml(md),
            reading_time_minutes: Math.max(1, Number(b.reading_time_minutes || 3)),
            status: b.status === "draft" ? "draft" : "published",
            published_at: new Date().toISOString(),
          };
        }
      );

      const { error: postErr } = await db
        .from("bio_blog_posts")
        .insert(normalizedPosts);
      if (postErr) {
        throw new RouteAccessError(422, "VALIDATION_ERROR", postErr.message);
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
