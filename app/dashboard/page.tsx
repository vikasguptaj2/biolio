import Link from "next/link";
import {
  Globe,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  MousePointerClick,
  BookOpen,
  Inbox,
} from "lucide-react";
import { getSessionContext, createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { profile, workspace, entitlements } = await getSessionContext();

  if (!workspace) return null;

  const supabase = await createClient();

  const [
    { data: bioProfile },
    { count: linksCount },
    { count: viewsCount },
    { count: clicksCount },
    { count: mediaAssetsCount },
    { count: blogPostsCount },
    { count: inquiriesCount },
    { data: recentPosts },
    { data: recentInquiries },
  ] = await Promise.all([
    supabase
      .from("bio_profiles")
      .select("*")
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase
      .from("bio_links")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("event_type", "bio.page_view"),
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("event_type", "bio.link_click"),
    supabase
      .from("media_assets")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("lifecycle_state", "finalized"),
    supabase
      .from("bio_blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("bio_contact_submissions")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("bio_blog_posts")
      .select("id, title, slug, status, created_at, published_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("bio_contact_submissions")
      .select("id, sender_name, sender_email, message, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const realViews = viewsCount ?? 0;
  const realClicks = clicksCount ?? 0;
  const realMediaAssets = mediaAssetsCount ?? 0;
  const realLinks = linksCount ?? 0;
  const realArticles = blogPostsCount ?? 0;
  const realInquiries = inquiriesCount ?? 0;

  const ctr =
    realViews > 0
      ? ((realClicks / realViews) * 100).toFixed(1)
      : "0.0";

  // Setup completion items based on REAL database presence
  const setupSteps = [
    {
      title: "Claim unique creator handle",
      done: Boolean(workspace.slug),
      desc: `@${workspace.slug}`,
    },
    {
      title: "Add 3 or more featured links",
      done: realLinks >= 3,
      desc: `${realLinks} of 3 links added`,
    },
    {
      title: "Publish first Bio website version",
      done: Boolean(bioProfile?.is_published),
      desc: bioProfile?.is_published ? "Published live" : "Not yet published",
    },
    {
      title: "Publish first blog story",
      done: realArticles > 0,
      desc: `${realArticles} stories authored`,
    },
  ];

  const completedSteps = setupSteps.filter((s) => s.done).length;

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
            . Showing authoritative live metrics from your audience.
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
              href="/dashboard/content"
              className="inline-flex items-center gap-2 rounded-lg border border-[#3a3040] bg-transparent px-4 py-2.5 text-xs font-bold text-white hover:bg-[#3a3040] transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#ffa27e]" />
              Write Article
            </Link>
            <Link
              href="/dashboard/inquiries"
              className="inline-flex items-center gap-2 rounded-lg border border-[#3a3040] bg-transparent px-4 py-2.5 text-xs font-bold text-white hover:bg-[#3a3040] transition-colors"
            >
              <Inbox className="h-3.5 w-3.5 text-[#e4b5f4]" />
              Inquiries ({realInquiries})
            </Link>
          </div>
        </div>

        {/* Ambient decorative circle */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#f36b3f]/10 blur-3xl pointer-events-none" />
      </div>

      {/* Authoritative Real Metrics Row (Zero fabricated numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2 font-medium">
            <span>Bio Impressions</span>
            <Eye className="h-4 w-4 text-[#f36b3f]" />
          </div>
          <div className="font-editorial text-3xl font-bold text-[#211b29]">
            {realViews.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-[#7c727e]">
            {realViews > 0 ? "Total recorded page visits" : "No visits recorded yet"}
          </div>
        </div>

        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2 font-medium">
            <span>Total Link Clicks</span>
            <MousePointerClick className="h-4 w-4 text-[#8068b0]" />
          </div>
          <div className="font-editorial text-3xl font-bold text-[#211b29]">
            {realClicks.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-[#7c727e]">
            {realViews > 0 ? `${ctr}% click-through rate` : "Calculated after first visit"}
          </div>
        </div>

        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2 font-medium">
            <span>Visitor Inquiries</span>
            <Inbox className="h-4 w-4 text-[#277a67]" />
          </div>
          <div className="font-editorial text-3xl font-bold text-[#211b29]">
            {realInquiries.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-[#7c727e]">
            {realInquiries === 1 ? "Creator inquiry received" : "Creator inquiries received"}
          </div>
        </div>

        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2 font-medium">
            <span>Configured Bio Links</span>
            <Layers className="h-4 w-4 text-[#f36b3f]" />
          </div>
          <div className="font-editorial text-3xl font-bold text-[#211b29]">
            {realLinks.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-[#7c727e]">
            Plan limit: {entitlements?.bioMaxLinks ?? "Unlimited"} links
          </div>
        </div>
      </div>

      {/* Real Setup Checklist & Engine Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Setup Progress */}
        <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-7 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#eee6dc] mb-4">
            <h3 className="font-editorial text-lg font-bold text-[#211b29]">
              Launch Checklist
            </h3>
            <span className="text-xs font-bold text-[#f36b3f]">
              {completedSteps}/4 complete
            </span>
          </div>

          <div className="space-y-3.5">
            {setupSteps.map((s, idx) => (
              <div key={idx} className="flex items-start gap-3">
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 text-[#277a67] shrink-0 mt-0.5" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-[#e5dcd1] shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className={`text-xs font-bold ${s.done ? "text-[#211b29]" : "text-[#7c727e]"}`}>
                    {s.title}
                  </div>
                  <div className="text-[10px] text-[#7c727e]">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[#eee6dc]">
            <Link
              href="/dashboard/bio"
              className="text-xs font-bold text-[#f36b3f] hover:underline inline-flex items-center gap-1"
            >
              Continue website setup &rarr;
            </Link>
          </div>
        </div>

        {/* Engine 1: Bio Studio Details */}
        <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#eee6dc] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#fce8df] text-[#f36b3f] flex items-center justify-center">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-base font-bold text-[#211b29]">
                    Bio Website Studio
                  </h3>
                  <div className="text-[10px] text-[#7c727e]">
                    Template: {bioProfile?.template_id || "atelier-editorial"}
                  </div>
                </div>
              </div>

              {bioProfile?.is_published ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e4f1eb] px-2 py-0.5 text-[9px] font-bold text-[#277a67]">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fce8df] px-2 py-0.5 text-[9px] font-bold text-[#c45a3a]">
                  <AlertCircle className="h-2.5 w-2.5" /> Draft Only
                </span>
              )}
            </div>

            <p className="text-xs text-[#7c727e] leading-relaxed mb-4">
              {realLinks} active links, {realArticles} blog stories, and {bioProfile?.template_id || "sunday-studio"} styling tokens active.
            </p>
          </div>

          <Link
            href="/dashboard/bio"
            className="inline-flex items-center justify-between p-3 rounded-xl bg-[#f4efe7] border border-[#e5dcd1] hover:bg-[#211b29] hover:text-white transition-all text-xs font-bold text-[#211b29]"
          >
            <span>Launch Bio Studio</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Creator Media Library */}
        <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#eee6dc] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#e4f1eb] text-[#277a67] flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-base font-bold text-[#211b29]">
                    Media Library
                  </h3>
                  <div className="text-[10px] text-[#7c727e]">
                    {realMediaAssets} verified {realMediaAssets === 1 ? "asset" : "assets"}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e4f1eb] px-2 py-0.5 text-[9px] font-bold text-[#277a67]">
                <CheckCircle2 className="h-2.5 w-2.5" /> Workspace scoped
              </span>
            </div>

            <p className="text-xs text-[#7c727e] leading-relaxed mb-4">
              Upload portfolio images to Cloudinary and reuse them across your public creator site.
            </p>
          </div>

          <Link
            href="/dashboard/media"
            className="inline-flex items-center justify-between p-3 rounded-xl bg-[#f4efe7] border border-[#e5dcd1] hover:bg-[#211b29] hover:text-white transition-all text-xs font-bold text-[#211b29]"
          >
            <span>Manage creator media</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Recent Content & Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Blog Stories */}
        <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#eee6dc] mb-4">
            <h3 className="font-editorial text-lg font-bold text-[#211b29]">
              Recent Editorial Stories
            </h3>
            <Link
              href="/dashboard/content"
              className="text-xs font-bold text-[#f36b3f] hover:underline"
            >
              All stories &rarr;
            </Link>
          </div>

          {recentPosts && recentPosts.length > 0 ? (
            <div className="divide-y divide-[#eee6dc]">
              {recentPosts.map((post) => (
                <div key={post.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#211b29] truncate">
                      {post.title}
                    </div>
                    <div className="text-[10px] text-[#7c727e] font-mono">
                      /blog/{post.slug}
                    </div>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${
                      post.status === "published"
                        ? "bg-[#e4f1eb] text-[#277a67]"
                        : "bg-[#f4efe7] text-[#7c727e]"
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#7c727e] space-y-2">
              <p>No stories published yet.</p>
              <Link
                href="/dashboard/content"
                className="inline-block text-xs font-bold text-[#f36b3f] hover:underline"
              >
                Write your first story &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Recent Inquiries */}
        <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#eee6dc] mb-4">
            <h3 className="font-editorial text-lg font-bold text-[#211b29]">
              Recent Visitor Inquiries
            </h3>
            <Link
              href="/dashboard/inquiries"
              className="text-xs font-bold text-[#f36b3f] hover:underline"
            >
              Inbox ({realInquiries}) &rarr;
            </Link>
          </div>

          {recentInquiries && recentInquiries.length > 0 ? (
            <div className="divide-y divide-[#eee6dc]">
              {recentInquiries.map((inq) => (
                <div key={inq.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#211b29] truncate">
                      {inq.sender_name}
                    </div>
                    <div className="text-[10px] text-[#7c727e] truncate">
                      {inq.message}
                    </div>
                  </div>
                  <div className="text-[10px] text-[#7c727e] shrink-0">
                    {new Date(inq.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#7c727e] space-y-2">
              <p>No inquiries received yet.</p>
              <p className="text-[11px] text-[#a89bac]">
                Enable the contact form on your Bio page to receive booking inquiries.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
