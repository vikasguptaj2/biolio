import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, planId, billingInterval = "monthly", couponCode } = body;

    if (!workspaceId || !planId) {
      return NextResponse.json(
        { error: "Missing required parameters: workspaceId and planId" },
        { status: 400 }
      );
    }

    const adminDb = createAdminClient();

    // 1. Try atomic RPC apply_workspace_plan_entitlements
    let rpcSuccess = false;
    try {
      const { error: rpcErr } = await (
        adminDb.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ data: unknown; error: unknown }>
      )("apply_workspace_plan_entitlements", {
        p_workspace_id: workspaceId,
        p_plan_id: planId,
        p_billing_interval: billingInterval,
        p_override_reason: `ACTIVE_PLAN:${planId}:${
          planId.startsWith("bio_")
            ? "bio_only"
            : planId.startsWith("ig_")
            ? "automation_only"
            : planId.startsWith("bundle_")
            ? "bundle"
            : "free"
        }`,
      });
      if (!rpcErr) {
        rpcSuccess = true;
      }
    } catch {
      rpcSuccess = false;
    }

    // 2. Direct fallback update to workspace_entitlements if RPC not yet migrated in Supabase
    if (!rpcSuccess) {
      let bioTier = "free";
      let igTier = "free";
      let bioMaxLinks: number | null = 5;
      let bioMaxGallery: number | null = 3;
      let bioMaxBlog: number | null = 0;
      let canRemoveBranding = false;
      let canExportAnalytics = false;
      let autoMaxRules: number | null = 1;
      let autoQuota = 100;
      let autoPublicReplies = false;
      let scope = "free";

      if (planId === "bio_creator") {
        scope = "bio_only";
        bioTier = "creator";
        bioMaxLinks = 25;
        bioMaxGallery = 24;
        bioMaxBlog = 20;
        autoMaxRules = 0;
        autoQuota = 0;
      } else if (planId === "bio_pro") {
        scope = "bio_only";
        bioTier = "pro";
        bioMaxLinks = null;
        bioMaxGallery = 100;
        bioMaxBlog = null;
        canRemoveBranding = true;
        canExportAnalytics = true;
        autoMaxRules = 0;
        autoQuota = 0;
      } else if (planId === "ig_creator") {
        scope = "automation_only";
        igTier = "creator";
        bioMaxLinks = 0;
        bioMaxGallery = 0;
        bioMaxBlog = 0;
        autoMaxRules = 10;
        autoQuota = 2500;
        autoPublicReplies = true;
      } else if (planId === "ig_pro") {
        scope = "automation_only";
        igTier = "pro";
        bioMaxLinks = 0;
        bioMaxGallery = 0;
        bioMaxBlog = 0;
        autoMaxRules = null;
        autoQuota = 25000;
        autoPublicReplies = true;
      } else if (planId === "bundle_creator" || planId === "creator_bundle") {
        scope = "bundle";
        bioTier = "creator";
        igTier = "creator";
        bioMaxLinks = 25;
        bioMaxGallery = 24;
        bioMaxBlog = 20;
        autoMaxRules = 10;
        autoQuota = 2500;
        autoPublicReplies = true;
      } else if (planId === "bundle_pro" || planId === "enterprise_bundle") {
        scope = "bundle";
        bioTier = "pro";
        igTier = "pro";
        bioMaxLinks = null;
        bioMaxGallery = 100;
        bioMaxBlog = null;
        canRemoveBranding = true;
        canExportAnalytics = true;
        autoMaxRules = null;
        autoQuota = 25000;
        autoPublicReplies = true;
      }

      await (
        adminDb.from("workspace_entitlements" as never) as unknown as {
          upsert: (
            row: Record<string, unknown>,
            opt: { onConflict: string }
          ) => Promise<unknown>;
        }
      ).upsert(
        {
          workspace_id: workspaceId,
          bio_tier: bioTier,
          ig_tier: igTier,
          bio_max_links: bioMaxLinks,
          bio_max_gallery_items: bioMaxGallery,
          bio_max_blog_posts: bioMaxBlog,
          bio_remove_branding: canRemoveBranding,
          bio_export_analytics: canExportAnalytics,
          automation_max_active_rules: autoMaxRules,
          automation_monthly_action_quota: autoQuota,
          automation_public_replies_enabled: autoPublicReplies,
          override_reason: `ACTIVE_PLAN:${planId}:${scope}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );
    }

    // 3. Update intended_modules in workspaces table
    const intendedModules =
      planId.startsWith("bio_")
        ? ["bio"]
        : planId.startsWith("ig_")
        ? ["instagram_automation"]
        : ["bio", "instagram_automation"];

    await (
      adminDb.from("workspaces" as never) as unknown as {
        update: (
          values: Record<string, unknown>
        ) => { eq: (col: string, val: string) => Promise<unknown> };
      }
    )
      .update({ intended_modules: intendedModules })
      .eq("id", workspaceId);

    return NextResponse.json({
      success: true,
      planId,
      billingInterval,
      couponCode: couponCode || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to subscribe to plan";
    console.error("[Billing Subscribe Error]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
