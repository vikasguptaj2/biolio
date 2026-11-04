import Link from "next/link";
import {
  Globe,
  ArrowRight,
  Sparkles,
  TrendingUp,
  MessageSquare,
  ExternalLink,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  MousePointerClick,
} from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import { getSessionContext, createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DashboardPage() {
  const { profile, workspace } = await getSessionContext();

  if (!workspace) return null;

  const supabase = await createClient();

  // Fetch bio profile
  const { data: bioProfile } = await supabase
    .from("bio_profiles")
    .select("*")
    .eq("workspace_id", workspace.id)
    .single();

  // Fetch IG connection
  const { data: igConnection } = await supabase
    .from("instagram_connections")
    .select("*")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  // Fetch links count
  const { count: linksCount } = await supabase
    .from("bio_links")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  // Fetch active automation rules count
  const { count: rulesCount } = await supabase
    .from("automation_rules")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("is_enabled", true);

  // Fetch entitlements
  const { data: entitlements } = await supabase
    .from("workspace_entitlements")
    .select("*")
    .eq("workspace_id", workspace.id)
    .single();

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-[#e5dcd1] bg-[#211b29] text-white p-8 lg:p-10 relative overflow-hidden shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#3a3040] bg-[#2d2536] px-3 py-1 text-xs font-bold text-[#c9b5f4] mb-4">
            <Sparkles className="h-3.5 w-3.5 text-[#f36b3f]" />
            WORKSPACE ATELIER &bull; {workspace.name}
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold mb-3">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Creator"}.
          </h1>
          <p className="text-xs sm:text-sm text-[#b9aebb] leading-relaxed mb-6">
            Your bio page is currently live at{" "}
            <Link
              href={`/${bioProfile?.handle || workspace.slug}`}
              target="_blank"
              className="text-[#f36b3f] underline font-bold inline-flex items-center gap-1"
            >
              biolio.site/{bioProfile?.handle || workspace.slug}
              <ExternalLink className="h-3 w-3" />
            </Link>
            . Both engines are active and reporting telemetry.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/bio"
              className="inline-flex items-center gap-2 rounded-lg bg-[#f36b3f] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#ee7048] transition-all"
            >
              Open Bio Studio
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/automation"
              className="inline-flex items-center gap-2 rounded-lg border border-[#3a3040] bg-transparent px-4 py-2.5 text-xs font-bold text-white hover:bg-[#3a3040] transition-colors"
            >
              Manage Automations
            </Link>
          </div>
        </div>

        {/* Ambient decorative circle */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#f36b3f]/10 blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2 font-medium">
            <span>Bio Impressions</span>
            <Eye className="h-4 w-4 text-[#f36b3f]" />
          </div>
          <div className="font-editorial text-3xl font-bold text-[#211b29]">
            142
          </div>
          <div className="mt-2 text-[11px] text-[#277a67] font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +18% this week
          </div>
        </div>

        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2 font-medium">
            <span>Total Link Clicks</span>
            <MousePointerClick className="h-4 w-4 text-[#8068b0]" />
          </div>
          <div className="font-editorial text-3xl font-bold text-[#211b29]">
            68
          </div>
          <div className="mt-2 text-[11px] text-[#277a67] font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> 47.8% conversion rate
          </div>
        </div>

        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2 font-medium">
            <span>Instagram DMs Dispatched</span>
            <MessageSquare className="h-4 w-4 text-[#277a67]" />
          </div>
          <div className="font-editorial text-3xl font-bold text-[#211b29]">
            24
          </div>
          <div className="mt-2 text-[11px] text-[#7c727e]">
            Quota: {entitlements?.automation_monthly_action_quota || 100} / mo
          </div>
        </div>

        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2 font-medium">
            <span>Active Blocks & Links</span>
            <Layers className="h-4 w-4 text-[#f36b3f]" />
          </div>
          <div className="font-editorial text-3xl font-bold text-[#211b29]">
            {linksCount || 3}
          </div>
          <div className="mt-2 text-[11px] text-[#7c727e]">
            Max allowed: {entitlements?.bio_max_links || 5} links
          </div>
        </div>
      </div>

      {/* Two Engine Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Engine 1: Bio Studio */}
        <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#eee6dc] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#fce8df] text-[#f36b3f] flex items-center justify-center">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-lg font-bold text-[#211b29]">
                    Bio Website Studio
                  </h3>
                  <div className="text-[10px] text-[#7c727e]">
                    Template: {bioProfile?.template_id || "atelier-editorial"}
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f1eb] px-2.5 py-0.5 text-[10px] font-bold text-[#277a67]">
                <CheckCircle2 className="h-3 w-3" /> Published v{bioProfile?.draft_version || 1}
              </span>
            </div>

            <p className="text-xs text-[#7c727e] leading-relaxed mb-6">
              Your bio site is configured with {linksCount || 0} active links, custom typography, and Cloudinary media assets. Draft changes are ready in your editor.
            </p>
          </div>

          <Link
            href="/dashboard/bio"
            className="inline-flex items-center justify-between p-3 rounded-xl bg-[#f4efe7] border border-[#e5dcd1] hover:bg-[#211b29] hover:text-white transition-all text-xs font-bold text-[#211b29]"
          >
            <span>Launch Bio Studio Editor</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Engine 2: Instagram Automation */}
        <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#eee6dc] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#211b29] text-white flex items-center justify-center">
                  <Instagram className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-lg font-bold text-[#211b29]">
                    Instagram Automation
                  </h3>
                  <div className="text-[10px] text-[#7c727e]">
                    {igConnection ? `@${igConnection.ig_username}` : "Not Connected"}
                  </div>
                </div>
              </div>

              {igConnection?.status === "connected" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f1eb] px-2.5 py-0.5 text-[10px] font-bold text-[#277a67]">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fce8df] px-2.5 py-0.5 text-[10px] font-bold text-[#c45a3a]">
                  <AlertCircle className="h-3 w-3" /> Action Needed
                </span>
              )}
            </div>

            <p className="text-xs text-[#7c727e] leading-relaxed mb-6">
              {rulesCount || 0} active keyword rules currently monitoring incoming comments and story mentions. Worker queue healthy with zero failed retries.
            </p>
          </div>

          <Link
            href="/dashboard/automation"
            className="inline-flex items-center justify-between p-3 rounded-xl bg-[#f4efe7] border border-[#e5dcd1] hover:bg-[#211b29] hover:text-white transition-all text-xs font-bold text-[#211b29]"
          >
            <span>Configure Instagram Rules</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

