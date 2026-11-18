import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  Eye,
  Users,
  BookOpen,
  Mail,
  ExternalLink,
  Smartphone,
  Monitor,
  Globe2,
} from "lucide-react";
import { getSessionContext, createClient } from "@/lib/supabase/server";

type DayMetric = {
  date: string;
  page_views: number;
  link_clicks: number;
  blog_views: number;
  inquiries: number;
  visitor_days: number;
};

type AnalyticsSummary = {
  series?: DayMetric[];
  totals?: { page_views?: number; link_clicks?: number; blog_views?: number; inquiries?: number; visitor_days?: number };
  devices?: Record<string, number>;
  referrers?: Array<{ host: string; count: number }>;
  links?: Array<{ link_id: string; count: number }>;
};

const safeCount = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

function PerformanceChart({ series, days }: { series: DayMetric[]; days: number }) {
  const map = new Map(series.map((item) => [item.date.slice(0, 10), item]));
  const points: DayMetric[] = [];
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + 1));
  for (let index = 0; index < days; index++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    points.push(map.get(key) || { date: key, page_views: 0, link_clicks: 0, blog_views: 0, inquiries: 0, visitor_days: 0 });
  }
  const width = 960;
  const height = 260;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 36;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const max = Math.max(1, ...points.map((point) => Math.max(point.page_views, point.link_clicks)));
  const coords = (key: "page_views" | "link_clicks") => points.map((point, index) => {
    const x = left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
    const y = top + plotH - (point[key] / max) * plotH;
    return `${x},${y}`;
  });
  const viewPoints = coords("page_views");
  const clickPoints = coords("link_clicks");
  const labelIndexes = [...new Set([0, Math.floor((days - 1) / 2), days - 1])];

  return (
    <div className="overflow-x-auto">
      <svg className="min-w-[640px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Daily page views and link clicks for the last ${days} days`}>
        {[0, 0.5, 1].map((fraction) => {
          const y = top + plotH * fraction;
          return <line key={fraction} x1={left} x2={width - right} y1={y} y2={y} stroke="#eee6dc" strokeDasharray="4 5" />;
        })}
        <polyline points={viewPoints.join(" ")} fill="none" stroke="#f36b3f" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={clickPoints.join(" ")} fill="none" stroke="#8068b0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          if (days > 14 && index % Math.ceil(days / 14) !== 0 && index !== days - 1) return null;
          const x = left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
          const viewY = top + plotH - (point.page_views / max) * plotH;
          return <circle key={`${point.date}-view`} cx={x} cy={viewY} r="3" fill="#f36b3f"><title>{point.date}: {point.page_views} page views</title></circle>;
        })}
        {labelIndexes.map((index) => {
          const x = left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
          return <text key={points[index].date} x={x} y={height - 8} textAnchor={index === 0 ? "start" : index === days - 1 ? "end" : "middle"} fill="#7c727e" fontSize="11">{new Date(`${points[index].date}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}</text>;
        })}
      </svg>
      <div className="mt-3 flex gap-5 text-[11px] font-semibold text-[#7c727e]">
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#f36b3f]" />Page views</span>
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#8068b0]" />Link clicks</span>
      </div>
    </div>
  );
}

export default async function AnalyticsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const days = params.range === "7d" ? 7 : params.range === "90d" ? 90 : 30;
  const { workspace } = await getSessionContext();
  if (!workspace) return null;

  const supabase = await createClient();
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1));
  const [{ data: profile }, { data: links }, { data: summaryData, error: summaryError }] = await Promise.all([
    supabase.from("bio_profiles").select("id, handle, display_name").eq("workspace_id", workspace.id).maybeSingle(),
    supabase.from("bio_links").select("id, title, url, position, is_visible").eq("workspace_id", workspace.id).order("position", { ascending: true }),
    supabase.rpc("get_bio_analytics", { p_workspace_id: workspace.id, p_from: from.toISOString(), p_to: now.toISOString() }),
  ]);

  const summary = (summaryData || {}) as AnalyticsSummary;
  const totals = summary.totals || {};
  const series = Array.isArray(summary.series) ? summary.series : [];
  const totalViews = safeCount(totals.page_views);
  const totalClicks = safeCount(totals.link_clicks);
  const totalBlogViews = safeCount(totals.blog_views);
  const totalInquiries = safeCount(totals.inquiries);
  const visitorDays = safeCount(totals.visitor_days);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";
  const devices = summary.devices || {};
  const deviceTotal = Object.values(devices).reduce((sum, count) => sum + safeCount(count), 0);
  const deviceCounts = { mobile: safeCount(devices.mobile), desktop: safeCount(devices.desktop), tablet: safeCount(devices.tablet) };
  const devicePercent = (count: number) => deviceTotal ? Math.round(count / deviceTotal * 100) : 0;
  const linkClicks = new Map((summary.links || []).map((item) => [item.link_id, safeCount(item.count)]));
  const topReferrers = (summary.referrers || []).slice(0, 5);
  const hasTelemetry = totalViews + totalClicks + totalBlogViews + totalInquiries > 0;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3 py-1 text-xs font-bold text-[#c45a3a] mb-2 shadow-xs">
            <BarChart3 className="h-3.5 w-3.5 text-[#f36b3f]" /> LIVE DATABASE ANALYTICS
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#211b29]">Analytics &amp; audience insights</h1>
          <p className="text-xs text-[#7c727e] max-w-xl mt-1">Aggregated by Supabase for your workspace. Visitor counts are privacy-preserving visitor-days.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([ ["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"] ] as const).map(([value, label]) => (
            <Link key={value} href={`/dashboard/analytics?range=${value}`} aria-current={params.range === value || (!params.range && value === "30d") ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-xs font-bold ${days === Number.parseInt(value) ? "border-[#211b29] bg-[#211b29] text-white" : "border-[#e5dcd1] bg-white text-[#695f6c] hover:border-[#f36b3f]"}`}>{label}</Link>
          ))}
          {profile?.handle && <Link href={`/${profile.handle}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5dcd1] bg-white px-3.5 py-2 text-xs font-bold text-[#211b29] hover:border-[#f36b3f]"><span>biolio.site/{profile.handle}</span><ExternalLink className="h-3.5 w-3.5 text-[#f36b3f]" /></Link>}
        </div>
      </div>

      {summaryError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Analytics could not be loaded. Refresh the page or contact support if this continues.</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          { label: "Profile impressions", value: totalViews, note: hasTelemetry ? `${days}-day page views` : "No visits recorded yet", Icon: Eye, color: "text-[#f36b3f]" },
          { label: "Link clicks", value: totalClicks, note: hasTelemetry ? "Tracked outbound clicks" : "No clicks recorded yet", Icon: MousePointerClick, color: "text-[#8068b0]" },
          { label: "Visitor-days", value: visitorDays, note: "Privacy-preserving daily audience", Icon: Users, color: "text-[#277a67]" },
          { label: "Click-through rate", value: `${ctr}%`, note: "Clicks divided by profile views", Icon: TrendingUp, color: "text-[#f36b3f]" },
        ].map(({ label, value, note, Icon, color }) => (
          <div key={label} className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#7c727e] mb-2"><span className="font-bold">{label}</span><Icon className={`h-4 w-4 ${color}`} /></div>
            <div className="font-editorial text-3xl sm:text-4xl font-bold text-[#211b29]">{typeof value === "number" ? value.toLocaleString() : value}</div>
            <div className="mt-2 text-[11px] text-[#7c727e]">{note}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-5 sm:p-7 shadow-xs">
        <div className="mb-5"><h2 className="font-editorial text-xl font-bold text-[#211b29]">Audience activity</h2><p className="text-[11px] text-[#7c727e] mt-1">Daily totals for the selected window</p></div>
        {summaryError ? <div className="py-12 text-center text-sm text-[#7c727e]">Chart unavailable until analytics data loads.</div> : <PerformanceChart series={series} days={days} />}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs flex items-center justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-[#fce8df] flex items-center justify-center text-[#f36b3f]"><BookOpen className="h-5 w-5" /></div><div><div className="text-xs font-bold text-[#211b29]">Blog story reads</div><div className="text-[11px] text-[#7c727e]">Articles viewed by your audience</div></div></div><div className="font-editorial text-2xl font-bold text-[#211b29]">{totalBlogViews.toLocaleString()}</div></div>
        <div className="rounded-xl border border-[#e5dcd1] bg-[#fffdf8] p-5 shadow-xs flex items-center justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-[#e4f1eb] flex items-center justify-center text-[#277a67]"><Mail className="h-5 w-5" /></div><div><div className="text-xs font-bold text-[#211b29]">Inquiries received</div><div className="text-[11px] text-[#7c727e]">Contact submissions from visitors</div></div></div><div className="font-editorial text-2xl font-bold text-[#211b29]">{totalInquiries.toLocaleString()}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4"><h2 className="font-editorial text-lg font-bold text-[#211b29]">Link performance</h2><span className="text-xs text-[#7c727e]">{links?.length || 0} links</span></div>
          <div className="divide-y divide-[#eee6dc]">{links?.length ? links.map((link) => {
            const count = linkClicks.get(link.id) || 0;
            const share = totalClicks ? Math.round(count / totalClicks * 100) : 0;
            return <div key={link.id} className="py-3 flex items-center justify-between gap-4"><div className="min-w-0"><div className="text-xs font-bold text-[#211b29] truncate">{link.title}{!link.is_visible && <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[9px] text-gray-600">Hidden</span>}</div><div className="text-[11px] text-[#7c727e] truncate font-mono mt-0.5">{link.url}</div></div><div className="shrink-0 text-right"><div className="text-xs font-bold text-[#211b29]">{count.toLocaleString()} clicks</div><div className="text-[10px] text-[#277a67] font-semibold">{share}% of clicks</div></div></div>;
          }) : <p className="py-8 text-center text-xs text-[#7c727e]">Add links in <Link href="/dashboard/bio" className="font-bold text-[#f36b3f]">Bio Studio</Link> to see click performance.</p>}</div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs"><h2 className="font-editorial text-lg font-bold text-[#211b29] mb-4">Visitor devices</h2>{deviceTotal ? <div className="space-y-4">{([["Mobile", deviceCounts.mobile, Smartphone, "bg-[#f36b3f]"], ["Desktop", deviceCounts.desktop, Monitor, "bg-[#8068b0]"], ["Tablet", deviceCounts.tablet, Globe2, "bg-[#277a67]"]] as const).map(([label, count, Icon, color]) => <div key={label}><div className="flex justify-between text-xs font-semibold text-[#211b29] mb-1"><span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{label}</span><span>{devicePercent(count)}% ({count})</span></div><div className="h-2 w-full rounded-full bg-[#f4efe7] overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${devicePercent(count)}%` }} /></div></div>)}</div> : <p className="text-xs text-[#7c727e]">Device data will appear after your first tracked visit.</p>}</section>
          <section className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs"><h2 className="font-editorial text-lg font-bold text-[#211b29] mb-4">Top referrers</h2>{topReferrers.length ? <div className="divide-y divide-[#eee6dc]">{topReferrers.map((entry) => <div key={entry.host} className="py-2.5 flex justify-between gap-3 text-xs"><span className="truncate text-[#211b29]">{entry.host || "direct"}</span><span className="shrink-0 font-bold text-[#7c727e]">{safeCount(entry.count).toLocaleString()}</span></div>)}</div> : <p className="text-xs text-[#7c727e]">Referrers will appear when visitors arrive from external sites.</p>}</section>
        </div>
      </div>
      <p className="text-[10px] text-[#8c828b]">Visitor-days are daily distinct pseudonymous identifiers. The same person visiting on different days may count more than once.</p>
    </div>
  );
}
