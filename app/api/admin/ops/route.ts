import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

interface AdminOpsTable {
  insert: (row: Record<string, unknown>) => {
    select: () => {
      single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
    };
  } & Promise<{ error: { message: string } | null }>;
  upsert: (row: Record<string, unknown>, opt?: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
  update: (values: Record<string, unknown>) => {
    eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>;
  };
}

function getTable(client: ReturnType<typeof createAdminClient>, table: string): AdminOpsTable {
  return client.from(table as never) as unknown as AdminOpsTable;
}

type RpcFunction = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

export async function POST(request: NextRequest) {
  try {
    // 1. Strictly verify Super Admin Session
    const adminSession = await getVerifiedAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized Super Admin" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const adminDb = createAdminClient();

    // =========================================================================
    // Action 1: Override Workspace Plan & Feature Locks
    // =========================================================================
    if (action === "override_plan") {
      const { workspaceId, planId } = body;
      if (!workspaceId || !planId) {
        return NextResponse.json({ error: "workspaceId and planId required" }, { status: 400 });
      }

      // Try RPC first
      let rpcSuccess = false;
      try {
        const { error: rpcErr } = await (adminDb.rpc as unknown as RpcFunction)("apply_workspace_plan_entitlements", {
          p_workspace_id: workspaceId,
          p_plan_id: planId,
          p_billing_interval: "monthly",
          p_override_reason: `SUPER_ADMIN_OVERRIDE:${planId}:${
            planId.startsWith("bio_")
              ? "bio_only"
              : planId.startsWith("ig_")
              ? "automation_only"
              : planId.startsWith("bundle_")
              ? "bundle"
              : "free"
          }`,
        });
        if (!rpcErr) rpcSuccess = true;
      } catch {
        rpcSuccess = false;
      }

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
        } else if (planId === "bundle_creator") {
          scope = "bundle";
          bioTier = "creator";
          igTier = "creator";
          bioMaxLinks = 25;
          bioMaxGallery = 24;
          bioMaxBlog = 20;
          autoMaxRules = 10;
          autoQuota = 2500;
          autoPublicReplies = true;
        } else if (planId === "bundle_pro") {
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

        await getTable(adminDb, "workspace_entitlements").upsert(
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
            override_reason: `SUPER_ADMIN_OVERRIDE:${planId}:${scope}`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );
      }

      // Record immutable audit log
      await getTable(adminDb, "admin_audit_logs").insert({
        action: "OVERRIDE_WORKSPACE_PLAN",
        target_type: "workspace",
        target_id: workspaceId,
        actor_role: "super_admin",
        reason: `Super Admin manually changed plan to ${planId}`,
        after_summary: { planId },
        result_status: "SUCCESS",
      });

      return NextResponse.json({ success: true, workspaceId, planId });
    }

    // =========================================================================
    // Action 2: Toggle Workspace Status (Active / Suspended)
    // =========================================================================
    if (action === "toggle_status") {
      const { workspaceId, status } = body;
      await getTable(adminDb, "workspaces")
        .update({ status })
        .eq("id", workspaceId);

      await getTable(adminDb, "admin_audit_logs").insert({
        action: "TOGGLE_WORKSPACE_STATUS",
        target_type: "workspace",
        target_id: workspaceId,
        actor_role: "super_admin",
        reason: `Super Admin updated workspace status to ${status}`,
        after_summary: { status },
        result_status: "SUCCESS",
      });

      return NextResponse.json({ success: true, workspaceId, status });
    }

    // =========================================================================
    // Action 3: Toggle Operational Feature Flag / Killswitch
    // =========================================================================
    if (action === "toggle_flag") {
      const { flagKey, isEnabled } = body;
      await getTable(adminDb, "feature_flags")
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq("key", flagKey);

      await getTable(adminDb, "admin_audit_logs").insert({
        action: "TOGGLE_FEATURE_FLAG",
        target_type: "feature_flag",
        target_id: flagKey,
        actor_role: "super_admin",
        reason: `Super Admin toggled ${flagKey} to ${isEnabled}`,
        after_summary: { flagKey, isEnabled },
        result_status: "SUCCESS",
      });

      return NextResponse.json({ success: true, flagKey, isEnabled });
    }

    // =========================================================================
    // Action 4: Create Dynamic Promotional Campaign & Codes
    // =========================================================================
    if (action === "create_coupon") {
      const { code, discountType, discountValue, scope, maxRedemptions, expiryDays } = body;
      const cleanCode = String(code).trim().toUpperCase();
      const codeHash = crypto.createHash("sha256").update(cleanCode).digest("hex");
      const expiresAt = new Date(Date.now() + (Number(expiryDays) || 30) * 86400000).toISOString();

      // Insert Promotion
      const { data: promo, error: promoErr } = await getTable(adminDb, "promotions")
        .insert({
          name: `Campaign ${cleanCode}`,
          description: `Dynamic Campaign ${cleanCode} (${discountValue}${discountType === "percentage" ? "%" : " USD"})`,
          discount_type: discountType || "percentage",
          discount_value: Number(discountValue) || 25,
          scope_type: scope || "any",
          max_redemptions_total: Number(maxRedemptions) || 100,
          is_active: true,
          starts_at: new Date().toISOString(),
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (promoErr || !promo) {
        return NextResponse.json({ error: promoErr?.message || "Failed to create promo" }, { status: 400 });
      }

      // Insert Coupon Code Batch
      const { data: batch } = await getTable(adminDb, "coupon_code_batches")
        .insert({
          promotion_id: promo.id,
          batch_name: `Batch-${cleanCode}`,
          total_codes_requested: 1,
          total_codes_generated: 1,
        })
        .select()
        .single();

      // Insert Hashed Master Code
      await getTable(adminDb, "coupon_codes").insert({
        promotion_id: promo.id,
        batch_id: batch?.id || null,
        code_hash: codeHash,
        code_masked_preview: `${cleanCode.slice(0, 3)}***`,
        max_redemptions: Number(maxRedemptions) || 100,
        is_active: true,
        is_public_master_code: true,
        expires_at: expiresAt,
      });

      await getTable(adminDb, "admin_audit_logs").insert({
        action: "CREATE_COUPON_CAMPAIGN",
        target_type: "promotion",
        target_id: String(promo.id),
        actor_role: "super_admin",
        reason: `Created dynamic coupon ${cleanCode}`,
        after_summary: { code: cleanCode, discountType, discountValue, scope },
        result_status: "SUCCESS",
      });

      return NextResponse.json({ success: true, code: cleanCode, promotionId: promo.id });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[Admin Ops Error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
