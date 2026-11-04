"use client";

import React from "react";
import Link from "next/link";
import {
  Lock,
  Globe,
  MessageSquareCode,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CreditCard,
  Zap,
} from "lucide-react";

export interface ProductLockPaywallProps {
  lockedProduct: "automation" | "bio";
  currentPlanLabel?: string;
  lockReason?: string;
}

export function ProductLockPaywall({
  lockedProduct,
  currentPlanLabel,
  lockReason,
}: ProductLockPaywallProps) {
  const isAutomation = lockedProduct === "automation";

  return (
    <div className="rounded-3xl border-2 border-[#e5dcd1] bg-[#fffdf8] p-8 md:p-12 shadow-sm text-center max-w-3xl mx-auto my-8">
      {/* Icon Badge */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#a62639]/15 text-[#a62639]">
        <Lock className="h-8 w-8" />
      </div>

      {/* Plan Scoping Pill */}
      <div className="inline-flex items-center gap-2 rounded-full bg-[#f3ece2] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#211b29] mb-4">
        <ShieldAlert className="h-3.5 w-3.5 text-[#f36b3f]" />
        Single-Product Feature Lock &bull; {currentPlanLabel || "Standalone Plan"}
      </div>

      {/* Headline */}
      <h2 className="font-display text-3xl md:text-4xl font-extrabold text-[#211b29] tracking-tight mb-4">
        {isAutomation
          ? "Instagram DM Automation is Locked"
          : "Bio Website Studio is Locked"}
      </h2>

      {/* Explanation */}
      <p className="text-sm md:text-base text-[#7c727e] max-w-xl mx-auto mb-8 leading-relaxed">
        {lockReason ||
          (isAutomation
            ? "Your workspace is subscribed to Biolio Bio Standalone. To execute automated comment-to-DM funnels, upgrade to the All-in-One Bundle or add Instagram Automation to your workspace."
            : "Your workspace is subscribed to Instagram Automation Standalone. To build and publish your atelier link-in-bio website studio, upgrade to the All-in-One Bundle or add Biolio Bio.")}
      </p>

      {/* Product Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-10 max-w-xl mx-auto">
        {isAutomation ? (
          <>
            <div className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4">
              <div className="flex items-center gap-2 font-bold text-xs text-[#211b29] mb-1">
                <MessageSquareCode className="h-4 w-4 text-[#f36b3f]" />
                Comment Keyword Triggers
              </div>
              <p className="text-[11px] text-[#7c727e]">
                Automatically send direct links and resources the moment someone comments on your posts or reels.
              </p>
            </div>
            <div className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4">
              <div className="flex items-center gap-2 font-bold text-xs text-[#211b29] mb-1">
                <Zap className="h-4 w-4 text-[#277a67]" />
                Official Meta Graph API v21.0
              </div>
              <p className="text-[11px] text-[#7c727e]">
                Enterprise-grade token vault with 6-hour per-user cooldowns to protect your account standing.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4">
              <div className="flex items-center gap-2 font-bold text-xs text-[#211b29] mb-1">
                <Globe className="h-4 w-4 text-[#f36b3f]" />
                Editorial Bio Website
              </div>
              <p className="text-[11px] text-[#7c727e]">
                Publish a lightning-fast creator profile with custom design tokens, smart links, and portfolio galleries.
              </p>
            </div>
            <div className="rounded-2xl border border-[#e5dcd1] bg-[#fbf8f2] p-4">
              <div className="flex items-center gap-2 font-bold text-xs text-[#211b29] mb-1">
                <Sparkles className="h-4 w-4 text-[#c9b5f4]" />
                Brand Deals &amp; Micro-Blog
              </div>
              <p className="text-[11px] text-[#7c727e]">
                Showcase verified sponsor collaborations and long-form editorial essays under your custom handle.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/dashboard/billing"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#f36b3f] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#e0562b] transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          Upgrade to All-in-One Bundle ($19/mo)
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard/billing"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5dcd1] bg-[#fffdf8] px-6 py-3.5 text-sm font-bold text-[#211b29] hover:border-[#211b29] transition-colors"
        >
          {isAutomation
            ? "Switch to IG Automation Standalone"
            : "Switch to Biolio Bio Standalone"}
        </Link>
      </div>
    </div>
  );
}

export interface FeatureTierBannerProps {
  title: string;
  description: string;
  requiredTier?: string;
  actionHref?: string;
  actionText?: string;
}

export function FeatureTierBanner({
  title,
  description,
  requiredTier = "Creator or Bundle",
  actionHref = "/dashboard/billing",
  actionText = "Upgrade Plan &rarr;",
}: FeatureTierBannerProps) {
  return (
    <div className="rounded-2xl border border-[#f5b851]/40 bg-[#fff9ed] p-4 text-[#8a570c] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5b851]/30 text-[#8a570c] mt-0.5">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <div className="font-bold text-xs text-[#523304] flex items-center gap-2">
            <span>{title}</span>
            <span className="rounded-full bg-[#f5b851]/30 px-2 py-0.5 text-[10px] font-extrabold uppercase">
              {requiredTier}
            </span>
          </div>
          <p className="text-[11px] text-[#7a4e09] mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <Link
        href={actionHref}
        className="shrink-0 rounded-xl bg-[#211b29] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#3a3040] transition-colors text-center"
      >
        <span dangerouslySetInnerHTML={{ __html: actionText }} />
      </Link>
    </div>
  );
}

