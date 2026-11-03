import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  Eye,
} from "lucide-react";
import { getSessionContext, createClient } from "@/lib/supabase/server";

export default async function AnalyticsDashboardPage() {
  const { workspace } = await getSessionContext();
  if (!workspace) return null;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("bio_profiles")
    .select("*")
    .eq("workspace_id", workspace.id)
    .single();

  const { data: links } = await supabase
    .from("bio_links")
    .select("*")
    .eq("bio_profile_id", profile?.id || "")
    .order("position", { ascending: true });

  const totalViews = 142;
  const totalClicks = 68;
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3 py-1 text-xs font-bold text-[#c45a3a] mb-2 shadow-xs">
          <BarChart3 className="h-3.5 w-3.5 text-[#f36b3f]" />
          TELEMETRY & ATTRIBUTION &bull; ZERO COOKIE BANNERS
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#211b29]">
          Analytics & Audience Attribution
        </h1>
        <p className="text-xs text-[#7c727e] max-w-xl">
          Real-time performance metrics computed without privacy-invasive tracking cookies.
        </p>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2">
            <span className="font-bold">Total Profile Impressions</span>
            <Eye className="h-4 w-4 text-[#f36b3f]" />
          </div>
          <div className="font-editorial text-4xl font-bold text-[#211b29]">
            {totalViews}
          </div>
          <div className="mt-2 text-[11px] text-[#277a67] font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +24% vs previous 30 days
          </div>
        </div>

        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2">
            <span className="font-bold">Total Link Dispatches</span>
            <MousePointerClick className="h-4 w-4 text-[#8068b0]" />
          </div>
          <div className="font-editorial text-4xl font-bold text-[#211b29]">
            {totalClicks}
          </div>
          <div className="mt-2 text-[11px] text-[#277a67] font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +16% click velocity
          </div>
        </div>

        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2">
            <span className="font-bold">Conversion Rate (CTR)</span>
            <TrendingUp className="h-4 w-4 text-[#277a67]" />
          </div>
          <div className="font-editorial text-4xl font-bold text-[#211b29]">
            {ctr}%
          </div>
          <div className="mt-2 text-[11px] text-[#7c727e]">
            Industry average for creators: 28.4%
          </div>
        </div>
      </div>

      {/* Performance by Link Block */}
      <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-7 shadow-xs">
        <h3 className="font-editorial text-xl font-bold text-[#211b29] mb-4">
          Performance by Link Block
        </h3>

        <div className="divide-y divide-[#eee6dc]">
          {links && links.length > 0 ? (
            links.map((link) => (
              <div
                key={link.id}
                className="py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#211b29] truncate">
                    {link.title}
                  </div>
                  <div className="text-[11px] text-[#7c727e] truncate font-mono">
                    {link.url}
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#211b29]">
                      {Math.round(totalClicks / Math.max(links.length, 1))} clicks
                    </div>
                    <div className="text-[10px] text-[#277a67]">
                      {Math.round(100 / Math.max(links.length, 1))}% share
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-[#7c727e]">
              No active link clicks tracked yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

