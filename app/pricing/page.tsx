"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  Tag,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Loader2,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

interface PlanItem {
  id: string;
  name: string;
  category: "bundle" | "bio" | "automation";
  monthlyPrice: number; // in INR
  yearlyPrice: number;  // in INR
  description: string;
  badge?: string;
  features: string[];
}

const CANONICAL_PLANS: PlanItem[] = [
  // Bundles (Both Bio + Automation)
  {
    id: "bundle_creator",
    name: "Bundle Creator",
    category: "bundle",
    monthlyPrice: 599,
    yearlyPrice: 5990,
    badge: "Most Popular · Save 25%",
    description: "The complete setup for solo creators: Bio Website Studio and Instagram DM Automation.",
    features: [
      "All 17 Seeded Atelier & Modern Templates",
      "Custom themes & colors on biolio.site/{handle}",
      "30 Gallery Items & 20 Micro-blog essays",
      "5 Active Instagram keyword rules",
      "2,500 Automated comment-to-DM actions/mo",
      "Public comment reply confirmations",
      "Attribution click tracking on /r/{token}",
      "90-Day analytics retention",
    ],
  },
  {
    id: "bundle_pro",
    name: "Bundle Pro",
    category: "bundle",
    monthlyPrice: 1199,
    yearlyPrice: 11990,
    badge: "Best Value for Agencies",
    description: "High-volume creator power for high-growth influencers, busy brands, and agencies.",
    features: [
      "Zero Biolio branding watermark (white-label)",
      "Unlimited Links, Gallery & Micro-blog essays",
      "Unlimited Active Instagram keyword rules",
      "25,000 Automated comment-to-DM actions/mo",
      "Custom CSS and high-DPI media optimization",
      "Exportable CSV visitor analytics",
      "365-Day historical data retention",
      "24/7 Priority SLA & support",
    ],
  },
  // Standalone Bio
  {
    id: "bio_creator",
    name: "Bio Creator",
    category: "bio",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    badge: "Bio Only",
    description: "For writers, artists, and photographers who want a distinct editorial web presence.",
    features: [
      "Personal portfolio on biolio.site/{handle}",
      "All 17 Seeded Templates + Custom Fonts",
      "30 Visual Portfolio Gallery Items",
      "20 Long-form micro-blog essays with Markdown",
      "Direct Visitor Booking & Inquiry Inbox",
      "90-Day visitor telemetry & referrer tracking",
      "Starter IG Automation (100 free DMs/mo)",
    ],
  },
  {
    id: "bio_pro",
    name: "Bio Pro",
    category: "bio",
    monthlyPrice: 599,
    yearlyPrice: 5990,
    badge: "Pro Bio Studio",
    description: "White-label personal website engine with zero watermarks and unlimited content.",
    features: [
      "Zero Biolio Branding badge toggle",
      "Unlimited Link blocks and smart redirects",
      "Unlimited Gallery items and media showcases",
      "Unlimited Micro-blog posts and essays",
      "Exportable CSV visitor analytics",
      "365-Day analytics retention",
      "Custom domain ready",
    ],
  },
  // Standalone Automation
  {
    id: "ig_creator",
    name: "Automation Creator",
    category: "automation",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    badge: "Automation Only",
    description: "Convert Instagram comments into qualified clicks, leads, and sales instantly.",
    features: [
      "1 Connected Instagram Creator or Business account",
      "5 Active Keyword Automation Rules",
      "2,500 Automated DMs per Month",
      "5-Mode deterministic word-boundary matcher",
      "Public comment reply confirmation",
      "7-Day Meta private reply compliance window",
      "Self-comment loop prevention & anti-spam",
      "Starter Bio Site (5 links, 6 gallery items)",
    ],
  },
  {
    id: "ig_pro",
    name: "Automation Pro",
    category: "automation",
    monthlyPrice: 999,
    yearlyPrice: 9990,
    badge: "High-Volume DM",
    description: "High-throughput comment automation for viral product launches and ecommerce stores.",
    features: [
      "Unlimited Active Keyword Rules",
      "25,000 Automated DMs per Month",
      "Hourly rate ceiling protection (up to 750/hr)",
      "Dynamic attribution tracking per interaction",
      "Story mention auto-reply trigger support",
      "365-Day automation audit log retention",
      "Dedicated integration review",
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
    finalAmountMinor?: number;
    message?: string;
  }>({ applied: false });
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const filteredPlans = CANONICAL_PLANS.filter((p) => p.category === category);

  const handlePreviewCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsValidatingCoupon(true);
    try {
      const selectedPlan = filteredPlans[0] || CANONICAL_PLANS[0];
      const res = await fetch("/api/billing/coupon-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          planId: selectedPlan.id,
          planVersion: 1,
          billingInterval: billingCycle === "yearly" ? "annual" : "monthly",
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setCouponStatus({
            applied: true,
            valid: false,
            message: "Sign in to preview and verify coupons for your workspace.",
          });
          return;
        }
        setCouponStatus({
          applied: true,
          valid: false,
          message: "Unable to verify coupon at this time.",
        });
        return;
      }

      const data = await res.json();
      if (data.valid) {
        setCouponStatus({
          applied: true,
          valid: true,
          discountPercent: data.discountValue || 20,
          finalAmountMinor: data.finalAmountMinor,
          message: data.message || `Coupon "${cleanCode}" applied successfully!`,
        });
      } else {
        setCouponStatus({
          applied: true,
          valid: false,
          message: data.message || `Coupon "${cleanCode}" is invalid or expired.`,
        });
      }
    } catch {
      setCouponStatus({
        applied: true,
        valid: false,
        message: "Network error while validating coupon.",
      });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf8f2] text-[#211b29] flex flex-col font-sans">
      <MarketingHeader />

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-8 py-16 sm:py-24">
        {/* Editorial Headline */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3.5 py-1 text-xs font-bold text-[#c45a3a] shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-[#f36b3f]" />
            HONEST CREATOR PRICING IN INR (₹)
          </div>

          <h1 className="font-editorial text-4xl sm:text-6xl font-bold tracking-tight text-[#211b29]">
            Pick your engine. Own your audience.
          </h1>

          <p className="text-sm sm:text-base text-[#7c727e] max-w-xl mx-auto leading-relaxed">
            Choose Bio Website Studio, Instagram DM Automation, or bundle both for maximum growth.
            Transparent monthly or annual plans with zero hidden fees.
          </p>
        </div>

        {/* Product Category Selector */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => setCategory("bundle")}
              className={`flex items-center gap-2 rounded-xl px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                category === "bundle"
                  ? "bg-[#211b29] text-white shadow-xs"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              <Sparkles className="h-4 w-4 text-[#f36b3f]" />
              All-in-One Bundles
            </button>
            <button
              type="button"
              onClick={() => setCategory("bio")}
              className={`flex items-center gap-2 rounded-xl px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                category === "bio"
                  ? "bg-[#211b29] text-white shadow-xs"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              <Globe className="h-4 w-4 text-[#277a67]" />
              Bio Website Studio
            </button>
            <button
              type="button"
              onClick={() => setCategory("automation")}
              className={`flex items-center gap-2 rounded-xl px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                category === "automation"
                  ? "bg-[#211b29] text-white shadow-xs"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              <Zap className="h-4 w-4 text-[#f36b3f]" />
              Instagram Automation
            </button>
          </div>
        </div>

        {/* Billing Interval Toggle */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <span
            className={`text-xs font-bold cursor-pointer ${
              billingCycle === "monthly" ? "text-[#211b29]" : "text-[#7c727e]"
            }`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly billing
          </span>
          <button
            type="button"
            onClick={() =>
              setBillingCycle(billingCycle === "yearly" ? "monthly" : "yearly")
            }
            className="relative h-6 w-12 rounded-full bg-[#211b29] p-0.5 transition-colors"
          >
            <div
              className={`h-5 w-5 rounded-full bg-white transition-transform ${
                billingCycle === "yearly" ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
              billingCycle === "yearly" ? "text-[#211b29]" : "text-[#7c727e]"
            }`}
            onClick={() => setBillingCycle("yearly")}
          >
            Annual billing
            <span className="rounded-full bg-[#277a67]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#277a67]">
              Save 2 Months
            </span>
          </span>
        </div>

        {/* Plan Cards Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {filteredPlans.map((plan) => {
            const rawPrice =
              billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const displayPrice =
              couponStatus.applied && couponStatus.valid && couponStatus.discountPercent
                ? Math.round(rawPrice * (1 - couponStatus.discountPercent / 100))
                : rawPrice;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border p-8 sm:p-10 flex flex-col justify-between transition-all bg-[#fffdf8] shadow-xs ${
                  plan.badge?.includes("Popular") || plan.badge?.includes("Save 25%")
                    ? "border-[#f36b3f] ring-2 ring-[#f36b3f]/20"
                    : "border-[#e5dcd1]"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3.5 left-8 rounded-full bg-[#f36b3f] px-3.5 py-1 text-[11px] font-bold text-white shadow-xs">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#211b29]">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-xs text-[#7c727e] leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="font-editorial text-4xl sm:text-5xl font-bold text-[#211b29]">
                      ₹{displayPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-[#7c727e]">
                      {billingCycle === "yearly" ? "/ year" : "/ month"}
                    </span>
                    {couponStatus.applied && couponStatus.valid && (
                      <span className="line-through text-xs text-[#a99eb5]">
                        ₹{rawPrice.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {billingCycle === "yearly" && (
                    <div className="text-[11px] text-[#277a67] font-semibold mt-1">
                      Equivalent to ₹{Math.round(displayPrice / 12).toLocaleString("en-IN")}/mo (GST inclusive)
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-[#eee6dc] space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7c727e]">
                      What&apos;s Included
                    </div>
                    <ul className="space-y-2.5 text-xs text-[#514754]">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-[#277a67] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6">
                  <Link
                    href={`/signup?plan=${plan.id}&interval=${billingCycle}`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#211b29] px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#3a3040] transition-colors"
                  >
                    Get Started with {plan.name}
                    <ArrowRight className="h-4 w-4 text-[#f36b3f]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Coupon Verification Widget */}
        <div className="mt-16 max-w-xl mx-auto rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#f36b3f]" />
            <h4 className="font-editorial text-lg font-bold text-[#211b29]">
              Have a Promotional or Partner Coupon?
            </h4>
          </div>
          <p className="text-xs text-[#7c727e]">
            Verify any campaign code with our two-phase atomic coupon engine before subscribing.
          </p>

          <form onSubmit={handlePreviewCoupon} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. WELCOME20, LAUNCH50"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] px-4 py-2.5 text-xs font-mono uppercase text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
            />
            <button
              type="submit"
              disabled={isValidatingCoupon || !couponCode.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#211b29] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#3a3040] disabled:opacity-50 transition-colors"
            >
              {isValidatingCoupon ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Verify Code"
              )}
            </button>
          </form>

          {couponStatus.applied && (
            <div
              className={`rounded-xl p-3 text-xs flex items-start gap-2 ${
                couponStatus.valid
                  ? "bg-[#e4f1eb] text-[#277a67] border border-[#277a67]/30"
                  : "bg-[#fde8eb] text-[#a62639] border border-[#a62639]/30"
              }`}
            >
              {couponStatus.valid ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{couponStatus.message}</span>
            </div>
          )}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
