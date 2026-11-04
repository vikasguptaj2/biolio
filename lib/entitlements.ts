export type PlanScope = "free" | "bio_only" | "automation_only" | "bundle";
export type PlanTier = "free" | "creator" | "pro" | "enterprise";

export interface EvaluatedWorkspaceEntitlements {
  activePlanId: string;
  activePlanLabel: string;
  activeScope: PlanScope;
  scope: PlanScope; // alias for activeScope
  
  // Product Lock Flags (Enterprise Matrix)
  isBioProductLocked: boolean;
  isAutomationProductLocked: boolean;
  bioLockReason?: string;
  automationLockReason?: string;

  // Bio Studio Tier & Limits
  bioTier: PlanTier;
  bioMaxLinks: number | null; // null = unlimited
  bioMaxGalleryItems: number | null;
  bioMaxBlogPosts: number | null; // null = unlimited, 0 = locked
  canRemoveBranding: boolean;
  canRemoveBiolioBranding: boolean;
  canUseBlogPublishing: boolean;
  canExportAnalytics: boolean;
  canUseCustomThemes: boolean;

  // Instagram Automation Tier & Limits
  igTier: PlanTier;
  automationMaxActiveRules: number | null; // null = unlimited, 0 = locked
  automationMonthlyActionQuota: number;
  automationMonthlyActionsUsed: number;
  automationQuotaPercent: number;
  canUsePublicCommentReplies: boolean;
  logRetentionDays: number;
}

/**
 * Evaluates workspace entitlements and calculates single-product vs bundle feature locks.
 * 
 * Matrix:
 * - Starter Free (`free_default`): Unlocked for both with Starter caps (5 links, 1 rule, 100 DMs/mo)
 * - Biolio Bio Standalone (`bio_creator`, `bio_pro`): Bio Unlocked (Creator/Pro); IG Automation STRICTLY LOCKED
 * - IG Automation Standalone (`ig_creator`, `ig_pro`): IG Automation Unlocked (Creator/Pro); Bio STRICTLY LOCKED
 * - All-in-One Bundle (`bundle_creator`, `bundle_pro`): BOTH UNLOCKED
 */
export function evaluateWorkspaceEntitlements(
  rawEnt?: Record<string, unknown> | null,
  intendedModules?: string[] | null
): EvaluatedWorkspaceEntitlements {
  const ent = (rawEnt || {}) as Record<string, unknown>;
  const overrideReason = (ent.override_reason || "") as string;

  // Determine active plan ID and scope
  let activePlanId = "free_default";
  let scope: PlanScope = "free";

  if (overrideReason.includes("ACTIVE_PLAN:")) {
    const parts = overrideReason.split(":");
    if (parts[1]) activePlanId = parts[1];
    if (parts[2]) scope = parts[2] as PlanScope;
  } else if (typeof ent.plan_id === "string") {
    activePlanId = ent.plan_id;
    if (activePlanId.startsWith("bio_")) scope = "bio_only";
    else if (activePlanId.startsWith("ig_")) scope = "automation_only";
    else if (activePlanId.startsWith("bundle_") || activePlanId.includes("bundle")) scope = "bundle";
  } else if (intendedModules && intendedModules.length > 0) {
    if (intendedModules.includes("bio") && !intendedModules.includes("instagram_automation")) {
      scope = "bio_only";
    } else if (intendedModules.includes("instagram_automation") && !intendedModules.includes("bio")) {
      scope = "automation_only";
    } else if (intendedModules.includes("bio") && intendedModules.includes("instagram_automation")) {
      scope = "bundle";
    }
  }

  // Fallback heuristic based on raw database quotas
  if (scope === "free") {
    const bioLinks = ent.bio_max_links as number | undefined;
    const autoQuota = ent.automation_monthly_action_quota as number | undefined;
    const autoRules = ent.automation_max_active_rules as number | undefined;
    if (bioLinks === 0 && (autoQuota || 0) > 0) {
      scope = "automation_only";
    } else if ((autoQuota || 0) === 0 && (autoRules || 0) === 0 && (bioLinks || 0) > 0) {
      scope = "bio_only";
    }
  }

  // Derive human-readable plan label
  const planLabels: Record<string, string> = {
    free_default: "Biolio Starter (Free)",
    bio_creator: "Biolio Bio — Creator",
    bio_pro: "Biolio Bio — Pro",
    ig_creator: "IG Automation — Creator",
    ig_pro: "IG Automation — Pro",
    bundle_creator: "All-in-One Bundle — Creator",
    bundle_pro: "All-in-One Bundle — Pro",
    creator_bundle: "All-in-One Bundle — Creator",
    enterprise_bundle: "All-in-One Bundle — Enterprise",
  };
  const activePlanLabel = planLabels[activePlanId] || "Biolio Starter (Free)";

  // Strict single-product locks
  const isBioProductLocked = scope === "automation_only";
  const isAutomationProductLocked = scope === "bio_only";

  const bioLockReason = isBioProductLocked
    ? "Your workspace is subscribed to Instagram Automation Standalone. Upgrade to the All-in-One Bundle or add Biolio Bio to unlock your Bio Website Studio."
    : undefined;

  const automationLockReason = isAutomationProductLocked
    ? "Your workspace is subscribed to Biolio Bio Standalone. Upgrade to the All-in-One Bundle or add Instagram Automation to unlock Comment-to-DM workflows."
    : undefined;

  // Bio tier and limits
  const bioTier: PlanTier = (ent.bio_tier || (activePlanId.includes("pro") ? "pro" : activePlanId.includes("creator") ? "creator" : "free")) as PlanTier;
  const rawBioLinks = ent.bio_max_links as number | null | undefined;
  const rawBioGallery = ent.bio_max_gallery_items as number | null | undefined;
  const rawBioBlog = ent.bio_max_blog_posts as number | null | undefined;

  const bioMaxLinks: number | null = isBioProductLocked ? 0 : rawBioLinks !== undefined ? rawBioLinks : bioTier === "free" ? 5 : bioTier === "creator" ? 25 : null;
  const bioMaxGalleryItems: number | null = isBioProductLocked ? 0 : rawBioGallery !== undefined ? rawBioGallery : bioTier === "free" ? 3 : bioTier === "creator" ? 24 : 100;
  const bioMaxBlogPosts: number | null = isBioProductLocked ? 0 : rawBioBlog !== undefined ? rawBioBlog : bioTier === "free" ? 0 : bioTier === "creator" ? 20 : null;
  const canRemoveBranding = isBioProductLocked ? false : Boolean(ent.bio_remove_branding || bioTier === "pro");
  const canExportAnalytics = isBioProductLocked ? false : Boolean(ent.bio_export_analytics || bioTier === "pro");
  const canUseCustomThemes = isBioProductLocked ? false : Boolean(ent.bio_custom_themes || bioTier !== "free");

  // IG Automation tier and limits
  const igTier: PlanTier = (ent.ig_tier || (activePlanId.includes("pro") ? "pro" : activePlanId.includes("creator") ? "creator" : "free")) as PlanTier;
  const rawAutoRules = ent.automation_max_active_rules as number | null | undefined;
  const rawAutoQuota = ent.automation_monthly_action_quota as number | undefined;

  const automationMaxActiveRules: number | null = isAutomationProductLocked ? 0 : rawAutoRules !== undefined ? rawAutoRules : igTier === "free" ? 1 : igTier === "creator" ? 10 : null;
  const automationMonthlyActionQuota: number = isAutomationProductLocked ? 0 : rawAutoQuota !== undefined ? rawAutoQuota : igTier === "free" ? 100 : igTier === "creator" ? 2500 : 25000;
  const automationMonthlyActionsUsed: number = (ent.automation_monthly_actions_used as number) || 0;
  const quotaDenominator = Math.max(1, automationMonthlyActionQuota);
  const automationQuotaPercent = Math.min(100, Math.round((automationMonthlyActionsUsed / quotaDenominator) * 100));
  const canUsePublicCommentReplies = isAutomationProductLocked ? false : Boolean(ent.automation_public_replies_enabled || igTier !== "free");
  const logRetentionDays: number = (ent.automation_log_retention_days as number) || (igTier === "pro" ? 365 : igTier === "creator" ? 30 : 7);

  return {
    activePlanId,
    activePlanLabel,
    activeScope: scope,
    scope,
    isBioProductLocked,
    isAutomationProductLocked,
    bioLockReason,
    automationLockReason,
    bioTier,
    bioMaxLinks,
    bioMaxGalleryItems,
    bioMaxBlogPosts,
    canRemoveBranding,
    canRemoveBiolioBranding: canRemoveBranding,
    canUseBlogPublishing: !isBioProductLocked && bioMaxBlogPosts !== 0,
    canExportAnalytics,
    canUseCustomThemes,
    igTier,
    automationMaxActiveRules,
    automationMonthlyActionQuota,
    automationMonthlyActionsUsed,
    automationQuotaPercent,
    canUsePublicCommentReplies,
    logRetentionDays,
  };
}
