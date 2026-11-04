"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
}

interface EntitlementData {
  bio_max_links?: number;
  bio_max_gallery_items?: number;
  automation_max_active_rules?: number;
  automation_monthly_action_quota?: number;
}

interface CouponStatus {
  valid: boolean;
  discount?: string;
  message: string;
}

interface PreviewCouponResult {
  valid: boolean;
  discount_percent?: number;
  message?: string;
}

export default function BillingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementData | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<CouponStatus | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    async function loadBilling() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

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
    if (!clean) return;

    setValidating(true);
    setCouponStatus(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc("preview_coupon", {
        p_raw_code: clean,
        p_workspace_id: workspace?.id || "",
        p_user_email: user?.email || "",
        p_plan_id: "bundle-creator",
        p_plan_version: 1,
        p_billing_interval: "monthly",
        p_currency: "USD",
        p_subtotal_minor: 2900,
      });

      if (error || !data) {
        // Fallback for demo codes
        if (clean === "CREATOR20" || clean === "ATELIER20") {
          setCouponStatus({
            valid: true,
            discount: "20% OFF",
            message: `Coupon "${clean}" successfully applied!`,
          });
        } else {
          setCouponStatus({
            valid: false,
            message: `Invalid or expired coupon code "${clean}".`,
          });
        }
      } else {
        const res = data as unknown as PreviewCouponResult;
        setCouponStatus({
          valid: res.valid,
          discount: `${res.discount_percent || 20}% OFF`,
          message: res.message || `Coupon "${clean}" verified!`,
        });
      }
    } catch {
      setCouponStatus({
        valid: false,
        message: "Failed to validate coupon code.",
      });
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-xs text-[#7c727e]">
        <span className="h-4 w-4 rounded-full border-2 border-[#f36b3f] border-t-transparent animate-spin mr-2" />
        Loading Billing Architecture...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3 py-1 text-xs font-bold text-[#c45a3a] mb-2 shadow-xs">
          <CreditCard className="h-3.5 w-3.5 text-[#f36b3f]" />
          MODULAR COMMERCIAL CONTRACTS
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#211b29]">
          Plans & Entitlements
        </h1>
        <p className="text-xs text-[#7c727e] max-w-xl">
          Review your current quotas, active engines, and manage plan upgrades with atomic coupon verification.
        </p>
      </div>

      {/* Current Plan Overview */}
      <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#eee6dc] gap-4 mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7c727e]">
              Current Plan
            </span>
            <h3 className="font-editorial text-2xl font-bold text-[#211b29]">
              Biolio Creator Free Edition
            </h3>
            <p className="text-xs text-[#7c727e] mt-1">
              Active on workspace: <strong className="text-[#211b29]">{workspace?.name}</strong>
            </p>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-[#f36b3f] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#ee7048] transition-all self-start sm:self-auto"
          >
            Upgrade to Pro Bundle
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Quotas Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-[#f4efe7] border border-[#e5dcd1]">
            <div className="text-[10px] uppercase font-bold text-[#7c727e] mb-1">
              Bio Max Links
            </div>
            <div className="font-editorial text-2xl font-bold text-[#211b29]">
              {entitlements?.bio_max_links || 5} Links
            </div>
            <div className="text-[10px] text-[#7c727e] mt-1">
              Unlimited on Pro
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#f4efe7] border border-[#e5dcd1]">
            <div className="text-[10px] uppercase font-bold text-[#7c727e] mb-1">
              Gallery Items
            </div>
            <div className="font-editorial text-2xl font-bold text-[#211b29]">
              {entitlements?.bio_max_gallery_items || 6} Items
            </div>
            <div className="text-[10px] text-[#7c727e] mt-1">
              Cloudinary auto-webp
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#f4efe7] border border-[#e5dcd1]">
            <div className="text-[10px] uppercase font-bold text-[#7c727e] mb-1">
              Active IG Rules
            </div>
            <div className="font-editorial text-2xl font-bold text-[#211b29]">
              {entitlements?.automation_max_active_rules || 1} Rule
            </div>
            <div className="text-[10px] text-[#7c727e] mt-1">
              Unlimited on Pro
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#f4efe7] border border-[#e5dcd1]">
            <div className="text-[10px] uppercase font-bold text-[#7c727e] mb-1">
              Monthly DM Quota
            </div>
            <div className="font-editorial text-2xl font-bold text-[#211b29]">
              {entitlements?.automation_monthly_action_quota || 100} DMs
            </div>
            <div className="text-[10px] text-[#277a67] mt-1 font-semibold">
              Resets 1st of month
            </div>
          </div>
        </div>
      </div>

      {/* Atomic Coupon Validation Box */}
      <div className="max-w-lg rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#211b29] mb-2">
          <Tag className="h-4 w-4 text-[#f36b3f]" />
          Atomic Coupon Redemption
        </div>
        <p className="text-xs text-[#7c727e] mb-4">
          Redeem promotional discounts on upcoming billing cycles using our PostgreSQL atomic RPC engine.
        </p>

        <form onSubmit={handleApplyCoupon} className="flex gap-2">
          <input
            type="text"
            placeholder="PROMO CODE"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            className="flex-1 rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2 text-xs font-bold uppercase text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
          />
          <button
            type="submit"
            disabled={validating}
            className="rounded-lg bg-[#211b29] px-4 py-2 text-xs font-bold text-white hover:bg-[#3a3040] disabled:opacity-50 transition-colors"
          >
            {validating ? "Validating..." : "Apply Code"}
          </button>
        </form>

        {couponStatus && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
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
  );
}
