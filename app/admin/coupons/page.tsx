import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminCouponsPage() {
  const supabase = createAdminClient();

  const { data: promotions } = await supabase
    .from("promotions")
    .select("*, coupon_codes(*)")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white mb-2">
            Dynamic Coupon &amp; Promotions Engine
          </h1>
          <p className="text-xs text-[#9e94a3]">
            Atomic discount campaigns validated and redeemed via PostgreSQL transactional RPCs.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#26202f] bg-[#18141f] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#26202f]">
          <div className="text-xs font-bold text-white">
            Active Promotional Campaigns ({promotions?.length || 0})
          </div>
        </div>

        <div className="divide-y divide-[#26202f]">
          {promotions && promotions.length > 0 ? (
            promotions.map((promo) => (
              <div
                key={promo.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1f1a28] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-[#f36b3f]">
                      {promo.name}
                    </span>
                    <span className="rounded bg-[#26202f] px-2 py-0.5 text-[11px] font-bold text-[#6ac2a2]">
                      {promo.discount_type === "percentage"
                        ? `${promo.discount_value / 100}% OFF`
                        : `$${(promo.discount_value || 0) / 100} OFF`}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        promo.is_active
                          ? "bg-[#1b332b] text-[#6ac2a2]"
                          : "bg-[#331b20] text-[#ff9e9e]"
                      }`}
                    >
                      {promo.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <div className="text-xs text-[#9e94a3]">
                    Redemptions: {promo.reserved_or_redeemed_total || 0} /{" "}
                    {promo.max_redemptions_total || "Unlimited"} &bull; Scope:{" "}
                    {promo.scope_type}
                  </div>
                </div>

                <div className="text-right text-xs text-[#7c727e]">
                  Expires:{" "}
                  {promo.expires_at
                    ? new Date(promo.expires_at).toLocaleDateString()
                    : "Never"}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-xs text-[#7c727e]">
              No promotional campaigns issued yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
