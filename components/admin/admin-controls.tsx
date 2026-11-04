"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Loader2,
  AlertCircle,
  Plus,
  X,
  TicketPercent,
  Lock,
  Unlock,
} from "lucide-react";

/**
 * Super Admin Sign Out Button
 */
export function AdminSignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#ff8f85] hover:bg-[#a62639]/20 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      Sign Out of Ops Console
    </button>
  );
}

/**
 * Live Workspace Plan & Single-Product Lock Override Control
 */
export function WorkspaceEntitlementControl({
  workspaceId,
  currentPlanId = "free_default",
  currentStatus = "active",
}: {
  workspaceId: string;
  currentPlanId?: string;
  currentStatus?: string;
}) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState(currentPlanId);
  const [status, setStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const planOptions = [
    { id: "free_default", label: "Starter Free (Limited Both)" },
    { id: "bio_creator", label: "Bio Creator ONLY (Locks IG)" },
    { id: "bio_pro", label: "Bio Pro ONLY (Locks IG)" },
    { id: "ig_creator", label: "IG Creator ONLY (Locks Bio)" },
    { id: "ig_pro", label: "IG Pro ONLY (Locks Bio)" },
    { id: "bundle_creator", label: "Bundle Creator (Unlocks Both)" },
    { id: "bundle_pro", label: "Bundle Pro (Unlocks Both)" },
  ];

  async function handleApplyOverride(newPlan: string) {
    setSelectedPlan(newPlan);
    setUpdating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override_plan",
          workspaceId,
          planId: newPlan,
        }),
      });

      if (!res.ok) throw new Error("Override failed");
      setFeedback("Saved");
      router.refresh();
    } catch {
      setFeedback("Error");
    } finally {
      setUpdating(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  async function handleToggleSuspension() {
    const nextStatus = status === "suspended" ? "active" : "suspended";
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_status",
          workspaceId,
          status: nextStatus,
        }),
      });

      if (!res.ok) throw new Error("Status change failed");
      setStatus(nextStatus);
      router.refresh();
    } catch {
      setFeedback("Error");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        value={selectedPlan}
        disabled={updating}
        onChange={(e) => handleApplyOverride(e.target.value)}
        className="rounded-lg border border-[#3a3040] bg-[#16121c] px-2.5 py-1.5 text-[11px] font-medium text-white focus:outline-none focus:border-[#f36b3f]"
      >
        {planOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleToggleSuspension}
        disabled={updating}
        className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase transition-colors ${
          status === "suspended"
            ? "bg-[#277a67]/30 text-[#6ac2a2] hover:bg-[#277a67]/50"
            : "bg-[#a62639]/30 text-[#ff8f85] hover:bg-[#a62639]/50"
        }`}
      >
        {status === "suspended" ? "Reactivate" : "Suspend"}
      </button>

      {updating && <Loader2 className="h-3 w-3 animate-spin text-[#f36b3f]" />}
      {feedback && (
        <span className="text-[10px] font-bold text-[#6ac2a2]">
          {feedback}
        </span>
      )}
    </div>
  );
}

/**
 * Super Admin Dynamic Coupon Campaign Creation Modal
 */
export function CreateCouponCampaignModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("25");
  const [scope, setScope] = useState("any");
  const [maxRedemptions, setMaxRedemptions] = useState("100");
  const [expiryDays, setExpiryDays] = useState("30");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_coupon",
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: Number(discountValue),
          scope,
          maxRedemptions: Number(maxRedemptions),
          expiryDays: Number(expiryDays),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create campaign");
      }

      setOpen(false);
      setCode("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create campaign";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[#c9b5f4] px-4 py-2.5 text-xs font-bold text-[#16121c] shadow-sm hover:bg-[#d8c8f8] transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Dynamic Coupon Campaign
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#2e2638] bg-[#1d1824] p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2e2638] pb-4">
              <div className="flex items-center gap-2">
                <TicketPercent className="h-5 w-5 text-[#c9b5f4]" />
                <h3 className="font-display text-lg font-bold">
                  Create Dynamic Promo Campaign
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#9e93a4] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-[#a62639]/40 bg-[#a62639]/20 p-3 text-xs text-[#ff8f85] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e93a4] mb-1">
                  Promotional Code (Uppercase)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LAUNCH25, ATELIER50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-[#2e2638] bg-[#16121c] px-3.5 py-2.5 text-xs text-white uppercase font-mono font-bold focus:outline-none focus:border-[#c9b5f4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e93a4] mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed_amount")}
                    className="w-full rounded-xl border border-[#2e2638] bg-[#16121c] px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#c9b5f4]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Minor ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e93a4] mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="25"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full rounded-xl border border-[#2e2638] bg-[#16121c] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c9b5f4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e93a4] mb-1">
                  Product Module Scope
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full rounded-xl border border-[#2e2638] bg-[#16121c] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c9b5f4]"
                >
                  <option value="any">Any Plan (All Products &amp; Bundles)</option>
                  <option value="bundle_only">All-in-One Bundle Only</option>
                  <option value="bio_only">Biolio Bio Standalone Only</option>
                  <option value="automation_only">IG Automation Standalone Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e93a4] mb-1">
                    Max Redemptions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    className="w-full rounded-xl border border-[#2e2638] bg-[#16121c] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c9b5f4]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e93a4] mb-1">
                    Valid Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    className="w-full rounded-xl border border-[#2e2638] bg-[#16121c] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c9b5f4]"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-[#2e2638] px-4 py-2.5 text-xs font-bold text-[#9e93a4] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9b5f4] py-2.5 text-xs font-bold text-[#16121c] shadow-md hover:bg-[#d8c8f8] disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Deploy Dynamic Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Feature Flag & Operational Killswitch Toggle Button
 */
export function FeatureFlagToggleButton({
  flagKey,
  initialEnabled,
  isEnabled,
}: {
  flagKey: string;
  initialEnabled?: boolean;
  isEnabled?: boolean;
  isKillswitch?: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(Boolean(isEnabled ?? initialEnabled));
  const [updating, setUpdating] = useState(false);

  async function handleToggle() {
    setUpdating(true);
    const nextState = !enabled;
    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_flag",
          flagKey,
          isEnabled: nextState,
        }),
      });

      if (!res.ok) throw new Error("Toggle failed");
      setEnabled(nextState);
      router.refresh();
    } catch {
      // Revert on failure
    } finally {
      setUpdating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={updating}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
        enabled
          ? "bg-[#277a67] text-white shadow-sm hover:bg-[#206857]"
          : "bg-[#2e2638] text-[#9e93a4] hover:bg-[#3d334a]"
      } disabled:opacity-50`}
    >
      {updating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : enabled ? (
        <Unlock className="h-3.5 w-3.5" />
      ) : (
        <Lock className="h-3.5 w-3.5" />
      )}
      {enabled ? "Enabled / Normal" : "Disabled / Circuit Broken"}
    </button>
  );
}
