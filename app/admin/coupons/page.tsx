import { createAdminClient } from "@/lib/supabase/admin";
import { CreateCouponCampaignModal } from "@/components/admin/admin-controls";
import { TicketPercent, CheckCircle2, Clock } from "lucide-react";

export const instant = false;

interface CampaignItem {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  scope?: string;
  eligible_modules?: string[] | null;
  discount_type: string;
  discount_value: number;
  max_redemptions?: number | null;
  current_redemptions?: number;
  redemption_count?: number;
  coupon_codes?: Array<{ id: string; code_masked_preview: string; is_active: boolean }>;
}

interface RedemptionItem {
  id: string;
  status: string;
  subtotal_minor: number;
  discount_minor: number;
  discount_applied_minor?: number;
  currency: string;
  created_at: string;
  confirmed_at?: string | null;
}

export default async function AdminCouponsPage() {
  const adminDb = createAdminClient();

  const [{ data: campaigns }, { data: redemptions }] = await Promise.all([
    (adminDb.from("promotions" as never) as unknown as {
      select: (q: string) => {
        order: (col: string, opt: { ascending: boolean }) => Promise<{ data: CampaignItem[] | null }>;
      };
    })
      .select("*, coupon_codes(id, code_masked_preview, is_active)")
      .order("created_at", { ascending: false }),
    (adminDb.from("coupon_redemptions" as never) as unknown as {
      select: (q: string) => {
        order: (col: string, opt: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: RedemptionItem[] | null }>;
        };
      };
    })
      .select(
        "id, status, subtotal_minor, discount_minor, currency, created_at, confirmed_at"
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#c9b5f4]/15 border border-[#c9b5f4]/30 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#c9b5f4] mb-3">
            <TicketPercent className="h-3.5 w-3.5" />
            Two-Phase Promotional Engine
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
            Coupon Campaigns &amp; Redemptions
          </h1>
          <p className="text-xs text-[#9e93a4] mt-1">
            SHA-256 hashed promo codes with 30-minute reservation holds, module scoping (Bio Only, IG Automation Only, or Bundle), and atomic concurrency caps.
          </p>
        </div>

        <CreateCouponCampaignModal />
      </div>

      {/* Campaigns List */}
      <div className="rounded-2xl border border-[#2e2638] bg-[#1d1824] p-6">
        <h3 className="font-display text-lg font-bold text-white mb-4">
          Configured Coupon Campaigns
        </h3>

        {campaigns && campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="rounded-xl border border-[#2e2638] bg-[#16121c] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">
                      {camp.name}
                    </span>
                    <span className="rounded-full bg-[#277a67]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#6ac2a2]">
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#9e93a4] mb-4">
                    {camp.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#2e2638] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#c4b8cb]">
                  <span>
                    Discount:{" "}
                    <strong className="text-[#f36b3f]">
                      {camp.discount_type === "percentage"
                        ? `${camp.discount_value / 100}%`
                        : `$${(camp.discount_value / 100).toFixed(2)}`}
                    </strong>
                  </span>
                  <span>
                    Modules:{" "}
                    <strong className="text-white">
                      {Array.isArray(camp.eligible_modules)
                        ? camp.eligible_modules.join(", ")
                        : "all"}
                    </strong>
                  </span>
                  <span>
                    Redeemed:{" "}
                    <strong className="text-white">
                      {camp.current_redemptions} / {camp.max_redemptions ?? "∞"}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#2e2638] p-8 text-center text-xs text-[#9e93a4]">
            No promotional coupon campaigns created yet. Click &ldquo;New Dynamic Coupon Campaign&rdquo; above to launch one.
          </div>
        )}
      </div>

      {/* Recent Redemptions */}
      <div className="rounded-2xl border border-[#2e2638] bg-[#1d1824] p-6">
        <h3 className="font-display text-lg font-bold text-white mb-4">
          Recent Two-Phase Redemptions
        </h3>
        {redemptions && redemptions.length > 0 ? (
          <div className="space-y-2.5">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-[#2e2638] bg-[#16121c] px-4 py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  {r.status === "confirmed" ? (
                    <CheckCircle2 className="h-4 w-4 text-[#6ac2a2]" />
                  ) : (
                    <Clock className="h-4 w-4 text-[#f5b851]" />
                  )}
                  <span className="font-mono text-[#c4b8cb]">
                    {r.id.slice(0, 8)}...
                  </span>
                  <span className="uppercase font-bold text-[10px] text-[#9e93a4]">
                    {r.status}
                  </span>
                </div>
                <div className="text-[#e5dcd1]">
                  Saved{" "}
                  <strong className="text-[#6ac2a2]">
                    ${(((r.discount_minor ?? r.discount_applied_minor) || 0) / 100).toFixed(2)}
                  </strong>{" "}
                  on ${((r.subtotal_minor || 0) / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#9e93a4]">
            No coupon redemptions recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
