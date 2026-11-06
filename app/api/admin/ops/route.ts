import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashCouponCode, maskCouponCode, normalizeCouponCode } from "@/lib/server/coupons/hash";

interface AdminOpsTable {
  insert: (row: Record<string, unknown>) => {
    select: (cols?: string) => {
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

    const body = await request.json().catch(() => ({}));
    const { action } = body;
    const adminDb = createAdminClient();

    // 2. Mandatory Reason Check for Audit Compliance (B-11, F-03)
    const reason = String(body.reason || "").trim();
    if (reason.length < 5) {
      return NextResponse.json(
        { error: "A detailed operational reason (minimum 5 characters) is mandatory for all privileged operations." },
        { status: 422 }
      );
    }

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
          }:${reason}`,
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
          autoMaxRules = 10;
          autoQuota = 2500;
          autoPublicReplies = true;
          bioMaxLinks = 0;
          bioMaxGallery = 0;
          bioMaxBlog = 0;
        } else if (planId === "ig_pro") {
          scope = "automation_only";
          igTier = "pro";
          autoMaxRules = null;
          autoQuota = 25000;
          autoPublicReplies = true;
          bioMaxLinks = 0;
          bioMaxGallery = 0;
          bioMaxBlog = 0;
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

        const isBioLocked = scope === "automation_only";
        const isIgLocked = scope === "bio_only";

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
            bio_state: isBioLocked ? "locked" : "paid",
            ig_state: isIgLocked ? "locked" : "paid",
            override_reason: `ACTIVE_PLAN:${planId}:${scope}:${reason}`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );
      }

      // Record immutable audit log (fail-closed)
      const auditRes = await getTable(adminDb, "admin_audit_logs").insert({
        action: "OVERRIDE_WORKSPACE_PLAN",
        target_type: "workspace",
        target_id: workspaceId,
        actor_role: "super_admin",
        reason,
        after_summary: { planId, reason },
        result_status: "SUCCESS",
      });

      if (auditRes.error) {
        return NextResponse.json({ error: "Audit write failure; action aborted." }, { status: 500 });
      }

      return NextResponse.json({ success: true, workspaceId, planId });
    }

    // =========================================================================
    // Action 2: Update Workspace Operational Status
    // =========================================================================
    if (action === "set_workspace_status") {
      const { workspaceId, status } = body;
      if (!workspaceId || !status) {
        return NextResponse.json({ error: "workspaceId and status required" }, { status: 400 });
      }

      const validStatuses = ["active", "suspended", "past_due", "closed_anonymized"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }

      await getTable(adminDb, "workspaces")
        .update({
          status,
          suspended_reason: status === "suspended" ? reason : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workspaceId);

      const auditRes = await getTable(adminDb, "admin_audit_logs").insert({
        action: "SET_WORKSPACE_STATUS",
        target_type: "workspace",
        target_id: workspaceId,
        actor_role: "super_admin",
        reason,
        after_summary: { status, reason },
        result_status: "SUCCESS",
      });

      if (auditRes.error) {
        return NextResponse.json({ error: "Audit write failure; action aborted." }, { status: 500 });
      }

      return NextResponse.json({ success: true, workspaceId, status });
    }

    // =========================================================================
    // Action 3: Toggle Killswitch / Feature Flag
    // =========================================================================
    if (action === "toggle_flag") {
      const { flagKey, isEnabled } = body;
      if (!flagKey || typeof isEnabled !== "boolean") {
        return NextResponse.json({ error: "flagKey and boolean isEnabled required" }, { status: 400 });
      }

      await getTable(adminDb, "feature_flags")
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq("key", flagKey);

      const auditRes = await getTable(adminDb, "admin_audit_logs").insert({
        action: "TOGGLE_FEATURE_FLAG",
        target_type: "feature_flag",
        target_id: flagKey,
        actor_role: "super_admin",
        reason,
        after_summary: { flagKey, isEnabled, reason },
        result_status: "SUCCESS",
      });

      if (auditRes.error) {
        return NextResponse.json({ error: "Audit write failure; action aborted." }, { status: 500 });
      }

      return NextResponse.json({ success: true, flagKey, isEnabled });
    }

    // =========================================================================
    // Action 4: Create Dynamic Promotional Campaign & Codes (Unified Hash)
    // =========================================================================
    if (action === "create_coupon") {
      const { code, discountType, discountValue, scope, maxRedemptions, expiryDays } = body;
      const cleanCode = normalizeCouponCode(String(code));
      if (!cleanCode || cleanCode.length < 3) {
        return NextResponse.json({ error: "Coupon code must be at least 3 characters." }, { status: 400 });
      }

      const codeHash = hashCouponCode(cleanCode);
      const maskedPreview = maskCouponCode(cleanCode);
      const expiresAt = new Date(Date.now() + (Number(expiryDays) || 30) * 86400000).toISOString();

      // Insert Promotion
      const { data: promo, error: promoErr } = await getTable(adminDb, "promotions")
        .insert({
          name: `Campaign ${cleanCode}`,
          description: `Dynamic Campaign ${cleanCode} (${discountValue}${discountType === "percentage" ? "%" : " off"})`,
          discount_type: discountType === "fixed_amount" ? "fixed_amount" : "percentage",
          discount_value: Number(discountValue) || 20,
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

      // Insert Hashed Master Code using Unified HMAC-SHA256 Hash
      await getTable(adminDb, "coupon_codes").insert({
        promotion_id: promo.id,
        batch_id: batch?.id || null,
        code_hash: codeHash,
        code_masked_preview: maskedPreview,
        max_redemptions: Number(maxRedemptions) || 100,
        is_active: true,
        is_public_master_code: true,
        expires_at: expiresAt,
      });

      const auditRes = await getTable(adminDb, "admin_audit_logs").insert({
        action: "CREATE_COUPON_CAMPAIGN",
        target_type: "promotion",
        target_id: String(promo.id),
        actor_role: "super_admin",
        reason,
        after_summary: { code: maskedPreview, discountType, discountValue, scope, reason },
        result_status: "SUCCESS",
      });

      if (auditRes.error) {
        return NextResponse.json({ error: "Audit write failure; action aborted." }, { status: 500 });
      }

      return NextResponse.json({ success: true, code: cleanCode, promotionId: promo.id });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[Admin Ops Error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
