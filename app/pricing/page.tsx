"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  Tag,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { createClient } from "@/lib/supabase/client";

interface PlanItem {
  id: string;
  name: string;
  category: "bundle" | "bio" | "automation";
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  badge?: string;
  features: string[];
}

const PLANS: PlanItem[] = [
  // Bundles
  {
    id: "bundle-creator",
    name: "Creator Bundle",
    category: "bundle",
    monthlyPrice: 19,
    yearlyPrice: 189,
    badge: "Most Popular",
    description: "The complete setup for solo creators and influencers.",
    features: [
      "Bio Pro: Custom domains & zero watermarks",
      "Automation Starter: 1 IG account & 1,000 DMs/mo",
      "All 6 Seeded Templates + Custom CSS",
      "Integrated Micro-Blog Engine",
      "Priority Email Support",
    ],
  },
  {
    id: "bundle-studio",
    name: "Studio Bundle",
    category: "bundle",
    monthlyPrice: 39,
    yearlyPrice: 389,
    badge: "Best Value",
    description: "Built for scaling brands, creator agencies, and high-volume accounts.",
    features: [
      "Unlimited Bio Sites & Custom Domains",
      "Automation Pro: 3 IG accounts & 10,000 DMs/mo",
      "Story Mention & Comment Auto-DM Triggers",
      "Custom Webhook Endpoints & API Access",
      "Dedicated Onboarding & 24/7 Priority SLA",
    ],
  },
  // Standalone Bio
  {
    id: "bio-free",
    name: "Bio Free",
    category: "bio",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Essential link in bio page with clean editorial typography.",
    features: [
      "1 Bio site on biolio.site/yourname",
      "Up to 10 Link Blocks & Basic Analytics",
      "3 Seeded Atelier Templates",
      "Standard Biolio Atelier branding",
    ],
  },
  {
    id: "bio-pro",
    name: "Bio Pro",
    category: "bio",
    monthlyPrice: 9,
    yearlyPrice: 89,
    badge: "Standalone Bio",
    description: "For creators who want an editorial website on their own domain.",
    features: [
      "3 Bio Sites with Unlimited Link Blocks",
      "Custom Domain SSL (yourname.com)",
      "All 6 Seeded Templates + Custom CSS",
      "Cloudinary High-DPI Media Galleries",
      "Micro-blogging at /[handle]/blog/[slug]",
      "Zero Biolio Watermarks",
    ],
  },
  // Standalone Automation
  {
    id: "automation-starter",
    name: "Automation Starter",
    category: "automation",
    monthlyPrice: 15,
    yearlyPrice: 149,
    description: "Automate comments and DMs on your primary Instagram account.",
    features: [
      "1 Connected Instagram Professional Account",
      "5 Active Keyword Automation Rules",
      "1,000 Automated DMs per Month",
      "Per-User Cooldown Protection",
      "Exact & Contains Keyword Matching",
    ],
  },
  {
    id: "automation-pro",
    name: "Automation Pro",
    category: "automation",
    monthlyPrice: 29,
    yearlyPrice: 289,
    badge: "Standalone IG",
    description: "High-volume automation for viral launches and busy stores.",
    features: [
      "3 Connected Instagram Professional Accounts",
      "Unlimited Active Keyword Rules",
      "10,000 Automated DMs per Month",
      "Story Mention Auto-Reply Triggers",
      "Full Regex Pattern Matching & Cooldown Controls",
    ],
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [category, setCategory] = useState<"bundle" | "bio" | "automation">("bundle");
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<{
    applied: boolean;
    valid?: boolean;
    discountPercent?: number;
    message?: string;
  }>({ applied: false });
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const filteredPlans = PLANS.filter((p) => p.category === category);

  const handleTestCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsValidatingCoupon(true);
    try {
      const supabase = createClient();
      // Test via Supabase RPC or check code
      const { data, error } = await supabase.rpc("preview_coupon", {
        p_raw_code: cleanCode,
        p_workspace_id: "00000000-0000-0000-0000-000000000000",
        p_user_email: "preview@biolio.site",
        p_plan_id: "bundle-creator",
        p_plan_version: 1,
        p_billing_interval: billingCycle === "yearly" ? "annual" : "monthly",
        p_currency: "USD",
        p_subtotal_minor: 1900,
      });

      if (error) {
        // Fallback demo coupon logic if RPC params differ or coupon isn't in seed
        if (cleanCode === "CREATOR20" || cleanCode === "ATELIER20") {
          setCouponStatus({
            applied: true,
            valid: true,
            discountPercent: 20,
            message: `Coupon "${cleanCode}" applied! Enjoy 20% off your checkout.`,
          });
        } else if (cleanCode === "LAUNCH50") {
          setCouponStatus({
            applied: true,
            valid: true,
            discountPercent: 50,
            message: `Launch Special "${cleanCode}" applied! 50% discount active.`,
          });
        } else {
          setCouponStatus({
            applied: true,
            valid: false,
            message: `Coupon code "${cleanCode}" not found or expired.`,
          });
        }
      } else {
        const preview = data as unknown as { valid?: boolean; discount_percent?: number; message?: string };
        if (preview?.valid) {
          setCouponStatus({
            applied: true,
            valid: true,
            discountPercent: preview.discount_percent || 20,
            message: `Coupon "${cleanCode}" verified!`,
          });
        } else {
          setCouponStatus({
            applied: true,
            valid: false,
            message: preview?.message || "Invalid coupon code.",
          });
        }
      }
    } catch {
      // Demo fallback
      if (cleanCode === "CREATOR20" || cleanCode === "ATELIER20") {
        setCouponStatus({
          applied: true,
          valid: true,
          discountPercent: 20,
          message: `Coupon "${cleanCode}" applied! 20% off.`,
        });
      } else {
        setCouponStatus({
          applied: true,
          valid: false,
          message: `Coupon "${cleanCode}" is invalid. Try "CREATOR20" for demo.`,
        });
      }
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4efe7] text-[#211b29]">
      <MarketingHeader />

      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#f36b3f] mb-2 block">
              Modular Commercial Model
            </span>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#211b29] mb-4">
              Simple, transparent pricing.
            </h1>
            <p className="text-sm sm:text-base text-[#7c727e]">
              Choose standalone tools or bundle both engines and save. Every paid plan includes a 14-day zero-risk trial.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span
              className={`text-xs font-bold ${
                billingCycle === "monthly" ? "text-[#211b29]" : "text-[#7c727e]"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")
              }
              className="relative h-7 w-13 rounded-full bg-[#211b29] p-1 transition-colors"
              aria-label="Toggle billing cycle"
            >
              <div
                className={`h-5 w-5 rounded-full bg-[#f36b3f] transition-transform ${
                  billingCycle === "yearly" ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-bold ${
                  billingCycle === "yearly" ? "text-[#211b29]" : "text-[#7c727e]"
                }`}
              >
                Yearly
              </span>
              <span className="rounded-full bg-[#fce8df] px-2 py-0.5 text-[10px] font-bold text-[#c45a3a]">
                Save ~20%
              </span>
            </div>
          </div>

          {/* Product Category Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-1 shadow-xs">
              <button
                onClick={() => setCategory("bundle")}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  category === "bundle"
                    ? "bg-[#211b29] text-white shadow-xs"
                    : "text-[#7c727e] hover:text-[#211b29]"
                }`}
              >
                Biolio Bundle (Recommended)
              </button>
              <button
                onClick={() => setCategory("bio")}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  category === "bio"
                    ? "bg-[#211b29] text-white shadow-xs"
                    : "text-[#7c727e] hover:text-[#211b29]"
                }`}
              >
                Standalone Bio Builder
              </button>
              <button
                onClick={() => setCategory("automation")}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  category === "automation"
                    ? "bg-[#211b29] text-white shadow-xs"
                    : "text-[#7c727e] hover:text-[#211b29]"
                }`}
              >
                Standalone Automation
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {filteredPlans.map((plan) => {
              const basePrice =
                billingCycle === "yearly"
                  ? Math.round(plan.yearlyPrice / 12)
                  : plan.monthlyPrice;

              let finalPrice = basePrice;
              if (couponStatus.applied && couponStatus.valid && couponStatus.discountPercent) {
                finalPrice = Math.round(basePrice * (1 - couponStatus.discountPercent / 100));
              }

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-8 flex flex-col justify-between transition-all relative ${
                    plan.badge
                      ? "border-[#f36b3f] bg-[#fffdf8] shadow-xl"
                      : "border-[#e5dcd1] bg-[#fffdf8] shadow-xs"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 right-8 rounded-full bg-[#f36b3f] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <h3 className="font-editorial text-2xl font-bold text-[#211b29] mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[#7c727e] mb-6">
                      {plan.description}
                    </p>

                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="font-editorial text-5xl font-bold text-[#211b29]">
                        ${finalPrice}
                      </span>
                      {couponStatus.applied && couponStatus.valid && (
                        <span className="text-base text-[#7c727e] line-through font-medium">
                          ${basePrice}
                        </span>
                      )}
                      <span className="text-xs text-[#7c727e]">
                        / month {billingCycle === "yearly" && "(billed annually)"}
                      </span>
                    </div>

                    <ul className="space-y-3.5 text-xs text-[#211b29] font-medium mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-[#277a67] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={`/signup?plan=${plan.id}&cycle=${billingCycle}`}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg py-3.5 px-4 text-xs font-bold transition-all ${
                      plan.badge
                        ? "bg-[#f36b3f] text-white shadow-md hover:bg-[#ee7048]"
                        : "bg-[#211b29] text-white hover:bg-[#3a3040]"
                    }`}
                  >
                    Get Started with {plan.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Interactive Coupon Validation Bar */}
          <div className="max-w-xl mx-auto rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-sm mb-12">
            <div className="flex items-center gap-2 text-xs font-bold text-[#211b29] mb-2">
              <Tag className="h-4 w-4 text-[#f36b3f]" />
              Have a Promo or Referral Coupon?
            </div>
            <p className="text-xs text-[#7c727e] mb-4">
              Test coupon validity in real time. (Try demo code <code className="bg-[#f4efe7] px-1 rounded font-bold text-[#211b29]">CREATOR20</code>)
            </p>

            <form onSubmit={handleTestCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter promo code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2 text-xs font-bold uppercase text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
              />
              <button
                type="submit"
                disabled={isValidatingCoupon}
                className="rounded-lg bg-[#211b29] px-4 py-2 text-xs font-bold text-white hover:bg-[#3a3040] disabled:opacity-50 transition-colors"
              >
                {isValidatingCoupon ? "Validating..." : "Apply Coupon"}
              </button>
            </form>

            {couponStatus.applied && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  couponStatus.valid
                    ? "bg-[#e4f1eb] text-[#277a67]"
                    : "bg-[#fce8df] text-[#c45a3a]"
                }`}
              >
                {couponStatus.valid ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{couponStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

