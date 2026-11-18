"use client";

import { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  Globe,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
}

interface EntitlementData {
  bio_tier?: string;
  bio_max_links?: number | null;
  bio_max_gallery_items?: number | null;
  bio_max_blog_posts?: number | null;
  bio_custom_themes?: boolean;
  bio_remove_branding?: boolean;
  bio_export_analytics?: boolean;
  bio_state?: string;
}

interface BillingPlan {
  id: string;
  version: number;
  name: string;
  module: string;
  tier: string;
  currency: string;
  price_monthly_minor: number;
  price_annual_minor: number;
  entitlements: Record<string, unknown>;
}

interface CurrentSubscription {
  status: string;
  current_period_end: string;
  billing_interval: string;
  plan_id: string;
}

interface CouponStatus {
  valid: boolean;
  message: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    email?: string;
  };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color: string;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: "payment.failed", callback: (event: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BillingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementData | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("annual");

  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<CouponStatus | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const idempotencyByPlan = useRef(new Map<string, string>());

  useEffect(() => {
    async function loadBilling() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;
        setUserEmail(user.email || "");

        const { data: member } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .single();

        if (!member?.workspace_id) return;

        const { data: ws } = await supabase
          .from("workspaces")
          .select("id, name, slug")
          .eq("id", member.workspace_id)
          .single();

        if (ws) {
          setWorkspace(ws as unknown as WorkspaceData);
        }

        const { data: ent } = await supabase
          .from("workspace_entitlements")
          .select("*")
          .eq("workspace_id", member.workspace_id)
          .single();

        setEntitlements(ent as unknown as EntitlementData);

        const { data: availablePlans } = await supabase
          .from("billing_plans" as never)
          .select("id, version, name, module, tier, currency, price_monthly_minor, price_annual_minor, entitlements")
          .eq("is_active_for_sale", true)
          .eq("module", "bio")
          .order("sort_order", { ascending: true });
        setPlans((availablePlans || []) as unknown as BillingPlan[]);

        const { data: currentPlan } = await supabase
          .from("subscriptions" as never)
          .select("status, current_period_end, billing_interval, plan_id")
          .eq("workspace_id", member.workspace_id)
          .eq("module", "bio")
          .in("status", ["trialing", "active", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setSubscription(currentPlan as unknown as CurrentSubscription | null);
      } catch (err) {
        console.error("Error loading billing", err);
      } finally {
        setLoading(false);
      }
    }

    loadBilling();
  }, []);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponCode.trim().toUpperCase();
    if (!clean || !workspace) return;

    setValidatingCoupon(true);
    setCouponStatus(null);
    setCheckoutMessage(null);

    try {
      const res = await fetch("/api/billing/coupon-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: clean,
          planId: plans[0]?.id || "bio_creator",
          planVersion: plans[0]?.version || 1,
          billingInterval,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setCouponStatus({
          valid: true,
          message: data.message || `Coupon "${clean}" is valid. The final discount is confirmed for the selected plan at checkout.`,
        });
      } else {
        setCouponStatus({
          valid: false,
          message: data?.message || data?.error?.message || `Coupon "${clean}" is invalid or expired.`,
        });
      }
    } catch {
      setCouponStatus({
        valid: false,
        message: "Failed to connect to coupon verification service.",
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleStartCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    setCheckoutMessage(null);
    const plan = plans.find((candidate) => candidate.id === planId);
    if (!plan) {
      setCheckoutMessage({ type: "error", text: "This plan is no longer available. Reload the page to refresh plan details." });
      setCheckoutLoading(null);
      return;
    }
    let idempotencyKey = idempotencyByPlan.current.get(planId);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      idempotencyByPlan.current.set(planId, idempotencyKey);
    }

    try {
      // 1. Initialize checkout session on server
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          planId,
          planVersion: plan.version,
          billingInterval,
          couponCode: couponStatus?.valid ? couponCode.trim().toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error?.message || "Failed to initialize checkout session.");
      }

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Razorpay SDK could not be loaded. Check your connection.");
      }

      // 3. Open Razorpay Checkout modal
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amountMinor,
        currency: data.currency || "INR",
        name: "Biolio Atelier",
        description: `Plan Upgrade: ${planId}`,
        order_id: data.razorpayOrderId,
        prefill: {
          email: userEmail,
        },
        theme: {
          color: "#f36b3f",
        },
        handler: () => {
          idempotencyByPlan.current.delete(planId);
          setCheckoutMessage({
            type: "success",
            text: "Razorpay confirmed your payment. Biolio is waiting for the signed payment notification before activating your plan.",
          });
          void pollCheckoutStatus(data.checkoutSessionId);
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(null);
          },
        },
      });
      rzp.on("payment.failed", (event) => {
        setCheckoutMessage({
          type: "error",
          text: event.error?.description || "Razorpay could not complete this payment.",
        });
        setCheckoutLoading(null);
      });

      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout error occurred.";
      setCheckoutMessage({ type: "error", text: msg });
      setCheckoutLoading(null);
    }
  };

  async function pollCheckoutStatus(sessionId: string) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      try {
        const response = await fetch(`/api/billing/status?sessionId=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) continue;
        if (data.status === "completed") {
          setCheckoutMessage({ type: "success", text: "Payment verified. Your Biolio Bio plan is active." });
          window.location.reload();
          return;
        }
        if (data.status === "failed" || data.status === "expired") {
          setCheckoutMessage({ type: "error", text: "Payment was not completed. Your plan has not changed." });
          return;
        }
      } catch {
        // Keep polling briefly; the webhook may arrive after the checkout callback.
      }
    }
    setCheckoutMessage({
      type: "success",
      text: "Payment confirmation is still processing. Your plan will update after Razorpay’s signed notification arrives.",
    });
    setCheckoutLoading(null);
  }

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-xs text-[#7c727e]">
        <Loader2 className="h-4 w-4 text-[#f36b3f] animate-spin mr-2" />
        Loading Billing Architecture...
      </div>
    );
  }

  const bioActive = entitlements?.bio_state !== "locked";

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3 py-1 text-xs font-bold text-[#c45a3a] mb-2 shadow-xs">
          <CreditCard className="h-3.5 w-3.5 text-[#f36b3f]" />
          DOMESTIC INR COMMERCIAL CONTRACTS
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#211b29]">
          Plans &amp; Entitlements
        </h1>
        <p className="text-xs text-[#7c727e] max-w-xl">
          Review your current quotas, active product modules, and manage plan upgrades with atomic coupon verification.
        </p>
      </div>

      {checkoutMessage && (
        <div
          className={`rounded-2xl p-4 text-xs flex items-start gap-2.5 ${
            checkoutMessage.type === "success"
              ? "bg-[#e4f1eb] text-[#277a67] border border-[#277a67]/30"
              : "bg-[#fde8eb] text-[#a62639] border border-[#a62639]/30"
          }`}
        >
          {checkoutMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{checkoutMessage.text}</span>
        </div>
      )}

      {/* Current Plan Overview */}
      <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#eee6dc] gap-4 mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7c727e]">
              Workspace
            </span>
            <div className="font-editorial text-2xl font-bold text-[#211b29]">
              {workspace?.name || "Biolio Creator Workspace"}
            </div>
            <div className="text-xs font-mono text-[#7c727e] mt-0.5">
              biolio.site/{workspace?.slug}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f1eb] px-3 py-1 text-xs font-bold text-[#277a67]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Active Workspace
            </span>
          </div>
        </div>

        {/* Product Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-[#211b29]">
                <Globe className="h-4 w-4 text-[#277a67]" />
                Bio Website Studio
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  bioActive
                    ? "bg-[#e4f1eb] text-[#277a67]"
                    : "bg-[#fde8eb] text-[#a62639]"
                }`}
              >
                {bioActive ? (entitlements?.bio_tier || "Active") : "Locked"}
              </span>
            </div>
            <p className="text-[11px] text-[#7c727e]">
              {bioActive
                ? `Max links: ${entitlements?.bio_max_links ?? "Unlimited"} • Gallery: ${entitlements?.bio_max_gallery_items ?? "Unlimited"} • Blog essays: ${entitlements?.bio_max_blog_posts ?? "Unlimited"}`
                : "Bio Studio is locked. Choose a Biolio Bio plan to restore editing and publishing."}
            </p>
          </div>

          <div className="rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] p-5 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#7c727e]">Current subscription</div>
            {subscription ? (
              <>
                <div className="font-editorial text-lg font-bold text-[#211b29]">
                  {plans.find((plan) => plan.id === subscription.plan_id)?.name || subscription.plan_id}
                </div>
                <p className="text-[11px] text-[#7c727e]">
                  {subscription.status === "active" ? "Active" : subscription.status.replaceAll("_", " ")} · Renews or ends {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-[#7c727e]">No paid Biolio Bio subscription is active for this workspace.</p>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Plans & Checkout Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-[#211b29]">
              Upgrade or Switch Plans
            </h2>
            <p className="text-xs text-[#7c727e]">
              Live plan prices from the Biolio billing catalog. Razorpay orders and final coupon amounts are created server-side.
            </p>
          </div>

          {/* Monthly / Annual Toggle */}
          <div className="flex items-center gap-2 rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                billingInterval === "monthly"
                  ? "bg-[#211b29] text-white"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 ${
                billingInterval === "annual"
                  ? "bg-[#211b29] text-white"
                  : "text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              Annual
              {plans[0] && plans[0].price_monthly_minor > 0 && (
                <span className="rounded bg-[#277a67]/20 px-1.5 py-0.2 text-[9px] text-[#277a67] font-extrabold">
                  {Math.max(0, Math.round((1 - plans[0].price_annual_minor / (plans[0].price_monthly_minor * 12)) * 100))}% less
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Upgrade Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const rawPriceMinor = billingInterval === "annual"
              ? plan.price_annual_minor
              : plan.price_monthly_minor;
            const maximumLinks = plan.entitlements["bio.max_links"];
            const maximumGallery = plan.entitlements["bio.max_gallery_items"];
            const maximumPosts = plan.entitlements["bio.max_blog_posts"];
            const featureSummary = [
              `${maximumLinks == null ? "Unlimited" : maximumLinks} links`,
              `${maximumGallery == null ? "Unlimited" : maximumGallery} portfolio items`,
              `${maximumPosts == null ? "Unlimited" : maximumPosts} articles`,
              plan.entitlements["bio.custom_themes"] ? "Custom themes" : null,
              plan.entitlements["bio.export_analytics"] ? "Analytics export" : null,
            ].filter(Boolean).join(" · ");
            const isCurrent = subscription?.plan_id === plan.id && subscription.status === "active";

            return (
              <div
                key={plan.id}
                className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#f36b3f] transition-colors"
              >
                <div>
                  <div className="inline-flex rounded-full bg-[#f3ece2] px-2.5 py-0.5 text-[10px] font-bold text-[#211b29] mb-2">
                    {plan.tier} · from billing catalog
                  </div>
                  <h3 className="font-editorial text-xl font-bold text-[#211b29]">
                    {plan.name}
                  </h3>
                  <p className="text-[11px] text-[#7c727e] mt-1 leading-relaxed">
                    {featureSummary}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-editorial text-3xl font-bold text-[#211b29]">
                      ₹{(rawPriceMinor / 100).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-[#7c727e]">
                      {billingInterval === "annual" ? "/yr" : "/mo"}
                    </span>
                  </div>
                  {couponStatus?.valid && (
                    <div className="mt-1 text-[10px] text-[#277a67]">Coupon will be recalculated for this plan during checkout.</div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={checkoutLoading === plan.id || isCurrent}
                  onClick={() => handleStartCheckout(plan.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#211b29] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#3a3040] disabled:opacity-50 transition-colors shadow-xs"
                >
                  {checkoutLoading === plan.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      {isCurrent ? "Current plan" : `Continue with Razorpay`}
                      <ArrowRight className="h-3.5 w-3.5 text-[#f36b3f]" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Coupon Verification */}
      <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs max-w-xl space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-[#f36b3f]" />
          <h3 className="font-editorial text-lg font-bold text-[#211b29]">
            Apply Dynamic Promotional Coupon
          </h3>
        </div>
        <p className="text-xs text-[#7c727e]">
          Enter your campaign or partner promo code to apply instant discounts to plan checkouts.
        </p>

        <form onSubmit={handleApplyCoupon} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. WELCOME20, FESTIVE25"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            className="flex-1 rounded-xl border border-[#e5dcd1] bg-[#fbf8f2] px-4 py-2.5 text-xs font-mono uppercase text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
          />
          <button
            type="submit"
            disabled={validatingCoupon || !couponCode.trim()}
            className="rounded-xl bg-[#211b29] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#3a3040] disabled:opacity-50 transition-colors"
          >
            {validatingCoupon ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Apply"
            )}
          </button>
        </form>

        {couponStatus && (
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
    </div>
  );
}
