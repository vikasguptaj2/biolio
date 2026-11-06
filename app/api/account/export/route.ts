import { NextResponse } from "next/server";
import {
  requireWorkspaceAccess,
  handleRouteError,
} from "@/lib/server/http/guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DPDP DATA PORTABILITY EXPORT (`POST /api/account/export`)
 * Reference: SECURITY.md §10, ROUTES_AND_ACCESS.md §4
 *
 * Exports all creator personal data, bio content, blog entries, and automation configurations
 * in portable JSON format.
 */
export async function POST() {
  try {
    const ctx = await requireWorkspaceAccess({ minRole: "owner" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const [
      { data: profile },
      { data: bioProfile },
      { data: links },
      { data: gallery },
      { data: blogPosts },
      { data: inquiries },
      { data: rules },
      { data: subscriptions },
    ] = await Promise.all([
      db.from("user_profiles").select("*").eq("id", ctx.userId).maybeSingle(),
      db.from("bio_profiles").select("*").eq("workspace_id", ctx.workspaceId).maybeSingle(),
      db.from("bio_links").select("*").eq("workspace_id", ctx.workspaceId),
      db.from("bio_gallery_items").select("*").eq("workspace_id", ctx.workspaceId),
      db.from("bio_blog_posts").select("*").eq("workspace_id", ctx.workspaceId),
      db.from("bio_contact_submissions").select("*").eq("workspace_id", ctx.workspaceId),
      db.from("automation_rules").select("*").eq("workspace_id", ctx.workspaceId),
      db.from("workspace_subscriptions").select("*").eq("workspace_id", ctx.workspaceId),
    ]);

    const exportBundle = {
      export_version: "1.0",
      generated_at: new Date().toISOString(),
      creator: {
        id: profile?.id,
        email: profile?.email,
        full_name: profile?.full_name,
        created_at: profile?.created_at,
      },
      workspace: {
        id: ctx.workspaceId,
        slug: ctx.workspaceSlug,
        name: ctx.workspaceName,
      },
      bio_studio: {
        profile: bioProfile,
        links: links || [],
        gallery: gallery || [],
        blog_posts: blogPosts || [],
        inquiries: inquiries || [],
      },
      automation: {
        rules: rules || [],
      },
      billing: {
        subscriptions: subscriptions || [],
      },
    };

    return new NextResponse(JSON.stringify(exportBundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="biolio-data-export-${ctx.workspaceSlug}-${Date.now()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

